/**
 * Resale payment links: staff type in the ticket details and the buyer, Newbi
 * sends a Razorpay payment link, and when it's paid the buyer gets a "payment
 * received" email. Nothing else is automatic: no seats are held, no pass is
 * issued, and the tickets themselves are handed over by the team.
 *
 * Served through /api/creator-join?action=ticket-resale-* (see tickets.js), staff only.
 *
 *   ticket-resale-list     recent links; refreshes a few unpaid ones with Razorpay
 *   ticket-resale-create   save the details and open the Razorpay payment link
 *   ticket-resale-sync     ask Razorpay about one link (paid, expired, cancelled)
 *   ticket-resale-cancel   cancel an unpaid link
 *
 * Razorpay's webhook (event payment_link.paid) settles links too: see razorpayWebhook.js.
 * Records live in `ticket_resales`, apart from `ticket_orders`, so they never
 * count against an event's capacity or show up as checkout orders.
 */
import crypto from 'node:crypto';
import { razorpay, razorpayConfigured } from './razorpay.js';
import { sendTransactional } from './mail/send.js';

export const RESALE_COLLECTION = 'ticket_resales';
export const RESALE_STATUSES = ['awaiting', 'paid', 'cancelled', 'expired'];
const REF_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const MAX_AMOUNT = 500000; // ₹5 lakh per link, a guard against a typo'd price
const MAX_EXPIRY_DAYS = 30;
const LIST_LIMIT = 200;
const REFRESH_ON_LIST = 10;

export class ResaleError extends Error {
    constructor(code, message, status = 400) {
        super(message);
        this.code = code;
        this.status = status;
    }
}

const str = (v, max) => String(v ?? '').trim().slice(0, max);

export const makeResaleRef = (rand = () => crypto.randomInt(0, REF_ALPHABET.length)) =>
    `NR-${Array.from({ length: 6 }, () => REF_ALPHABET[rand()]).join('')}`;

/** Razorpay wants +<country><number>. Ten Indian digits get +91. */
export const normalizeContact = (phone) => {
    const raw = String(phone || '').trim();
    const digits = raw.replace(/\D/g, '');
    if (!digits) return '';
    if (digits.length === 10) return `+91${digits}`;
    if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
    if (raw.startsWith('+') && digits.length >= 8 && digits.length <= 15) return `+${digits}`;
    return '';
};

/** The form, checked and tidied. Throws ResaleError on anything we can't send. */
export const readResaleInput = (body = {}, now = Date.now()) => {
    const eventName = str(body.eventName, 140);
    const ticketType = str(body.ticketType, 80) || 'Ticket';
    const quantity = Math.floor(Number(body.quantity));
    const unitPrice = Math.round(Number(body.unitPrice) * 100) / 100;
    const buyerName = str(body.buyerName, 120);
    const buyerEmail = str(body.buyerEmail, 200).toLowerCase();
    const buyerPhoneRaw = str(body.buyerPhone, 20);
    const buyerPhone = normalizeContact(buyerPhoneRaw);

    if (!eventName) throw new ResaleError('VALIDATION', 'Add the event name.');
    if (!Number.isFinite(quantity) || quantity < 1 || quantity > 100) throw new ResaleError('VALIDATION', 'Quantity should be between 1 and 100.');
    if (!Number.isFinite(unitPrice) || unitPrice < 1) throw new ResaleError('VALIDATION', 'Price per ticket should be at least ₹1.');
    const amount = Math.round(unitPrice * quantity * 100) / 100;
    if (amount > MAX_AMOUNT) throw new ResaleError('VALIDATION', `A single link can be at most ₹${MAX_AMOUNT.toLocaleString('en-IN')}.`);
    if (!buyerName) throw new ResaleError('VALIDATION', "Add the buyer's name.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyerEmail)) throw new ResaleError('VALIDATION', "Check the buyer's email. The payment confirmation goes there.");
    if (buyerPhoneRaw && !buyerPhone) throw new ResaleError('VALIDATION', "Check the buyer's phone number, or leave it empty.");

    const days = Math.floor(Number(body.expiresInDays ?? 7));
    const expiresInDays = Number.isFinite(days) ? Math.min(MAX_EXPIRY_DAYS, Math.max(1, days)) : 7;

    return {
        eventName,
        eventDate: /^\d{4}-\d{2}-\d{2}$/.test(str(body.eventDate, 10)) ? str(body.eventDate, 10) : '',
        venue: str(body.venue, 140),
        ticketType,
        quantity,
        unitPrice,
        amount,
        buyerName,
        buyerEmail,
        buyerPhone,
        note: str(body.note, 500),
        notify: { email: body.notifyEmail !== false, sms: body.notifySms !== false && Boolean(buyerPhone) },
        expiresAt: new Date(now + expiresInDays * 86400000).toISOString(),
    };
};

const linkDescription = (r) => [
    `${r.quantity} × ${r.ticketType}`,
    r.eventName,
    r.eventDate,
    r.venue,
].filter(Boolean).join(' · ').slice(0, 250);

/** Razorpay link statuses → ours. partially_paid can't happen (partial payments are off). */
const fromRazorpayStatus = (status) => ({ paid: 'paid', cancelled: 'cancelled', expired: 'expired' }[status] || 'awaiting');

const publicRow = (id, d) => ({ id, ...d });

/**
 * Marks a resale link paid and sends the "payment received" email. Safe to call
 * from the webhook and the staff "check" button for the same payment.
 */
export const settleResale = async (db, resaleId, { linkId, paymentId, amount, method } = {}, { mail = sendTransactional, now = new Date().toISOString() } = {}) => {
    const ref = db.collection(RESALE_COLLECTION).doc(String(resaleId));
    const result = await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists) return null;
        const r = snap.data();
        if (linkId && r.linkId && r.linkId !== linkId) throw new ResaleError('VALIDATION', 'That payment isn’t for this link.');
        if (r.status === 'paid') return { resale: r, fresh: false };
        const patch = {
            status: 'paid',
            paidAt: now,
            paymentId: String(paymentId || ''),
            paidAmount: Number.isFinite(Number(amount)) ? Number(amount) : r.amount,
            ...(method ? { paymentMethod: String(method) } : {}),
            updatedAt: now,
        };
        tx.update(ref, patch);
        return { resale: { ...r, ...patch }, fresh: true };
    });
    if (!result) return { found: false };

    const { resale } = result;
    // Sends once per link (the idempotency key), so a retry or a second report won't email twice.
    if (resale.emailStatus !== 'sent') {
        const sent = await mail('resale-payment-received', resale.buyerEmail, {
            name: resale.buyerName,
            eventName: resale.eventName,
            eventDate: resale.eventDate,
            venue: resale.venue,
            ticketType: resale.ticketType,
            quantity: resale.quantity,
            unitPrice: resale.unitPrice,
            amount: resale.paidAmount ?? resale.amount,
            ref: resale.ref,
            paymentId: resale.paymentId,
            paidAt: resale.paidAt,
        }, { ref: { collection: RESALE_COLLECTION, id: ref.id }, idempotencyKey: `resale-paid-${ref.id}` }).catch(err => ({ ok: false, error: err.message }));
        const ok = Boolean(sent?.ok);
        await ref.update({
            emailStatus: ok ? 'sent' : 'failed',
            ...(ok ? { emailedAt: now } : { emailError: String(sent?.error || 'Not sent').slice(0, 200) }),
        }).catch(() => {});
        resale.emailStatus = ok ? 'sent' : 'failed';
    }
    return { found: true, fresh: result.fresh, resale: publicRow(ref.id, resale) };
};

/** Razorpay's webhook: a payment link was paid. Returns true when it was one of ours. */
export const settleResaleFromWebhook = async (db, link, payment, opts) => {
    if (!link?.id) return false;
    let resaleId = link.notes?.kind === 'resale' ? link.notes?.resaleId : null;
    if (!resaleId) {
        const q = await db.collection(RESALE_COLLECTION).where('linkId', '==', link.id).limit(1).get();
        if (q.empty) return false;
        resaleId = q.docs[0].id;
    }
    const out = await settleResale(db, resaleId, {
        linkId: link.id,
        paymentId: payment?.id,
        amount: Number(payment?.amount ?? link.amount_paid) / 100,
        method: payment?.method,
    }, opts);
    return out.found;
};

/** Asks Razorpay about one link and brings our record in line. */
const refreshFromRazorpay = async (db, id, r, opts) => {
    if (!r.linkId) return publicRow(id, r);
    const link = await razorpay(`/payment_links/${encodeURIComponent(r.linkId)}`);
    const status = fromRazorpayStatus(link.status);
    if (status === 'paid') {
        const payment = (link.payments || []).find(p => p.status === 'captured' || p.status === 'authorized') || (link.payments || [])[0] || {};
        const out = await settleResale(db, id, {
            linkId: r.linkId,
            paymentId: payment.payment_id || payment.id,
            amount: Number(payment.amount ?? link.amount_paid) / 100,
            method: payment.method,
        }, opts);
        return out.resale;
    }
    if (status !== r.status) {
        const now = new Date().toISOString();
        await db.collection(RESALE_COLLECTION).doc(id).update({ status, updatedAt: now });
        return publicRow(id, { ...r, status, updatedAt: now });
    }
    return publicRow(id, r);
};

// ── actions ──────────────────────────────────────────────────────────────────

const listAction = async (db, body, ctx) => {
    const snap = await db.collection(RESALE_COLLECTION).orderBy('createdAt', 'desc').limit(LIST_LIMIT).get();
    let rows = snap.docs.map(d => publicRow(d.id, d.data()));
    // Without the webhook, a paid link is still caught here: check the newest unpaid ones.
    if (razorpayConfigured() && body.refresh !== false) {
        const stale = rows.filter(r => r.status === 'awaiting' && r.linkId).slice(0, REFRESH_ON_LIST);
        const fresh = await Promise.all(stale.map(r => refreshFromRazorpay(db, r.id, r, ctx.mailOpts).catch(() => r)));
        const byId = new Map(fresh.map(r => [r.id, r]));
        rows = rows.map(r => byId.get(r.id) || r);
    }
    return { success: true, gatewayReady: razorpayConfigured(), resales: rows };
};

const createAction = async (db, body, ctx) => {
    if (!razorpayConfigured()) throw new ResaleError('GATEWAY', 'Razorpay isn’t set up on the server yet.', 503);
    const input = readResaleInput(body);
    const docRef = db.collection(RESALE_COLLECTION).doc();
    const now = new Date().toISOString();

    let refCode = makeResaleRef();
    for (let i = 0; i < 4; i++) {
        const taken = await db.collection(RESALE_COLLECTION).where('ref', '==', refCode).limit(1).get();
        if (taken.empty) break;
        refCode = makeResaleRef();
    }

    const { notify, ...fields } = input;
    const record = {
        ...fields,
        ref: refCode,
        status: 'awaiting',
        gateway: 'razorpay',
        linkId: '',
        shortUrl: '',
        notifiedBy: notify,
        createdAt: now,
        updatedAt: now,
        createdBy: ctx.staffEmail || null,
    };
    await docRef.set(record);

    try {
        const link = await razorpay('/payment_links', {
            method: 'POST',
            body: {
                amount: Math.round(input.amount * 100),
                currency: 'INR',
                accept_partial: false,
                reference_id: refCode,
                description: linkDescription(input),
                expire_by: Math.floor(new Date(input.expiresAt).getTime() / 1000),
                customer: {
                    name: input.buyerName,
                    email: input.buyerEmail,
                    ...(input.buyerPhone ? { contact: input.buyerPhone } : {}),
                },
                notify,
                reminder_enable: notify.email || notify.sms,
                notes: { kind: 'resale', resaleId: docRef.id, ref: refCode, event: input.eventName.slice(0, 200) },
            },
        });
        const patch = { linkId: link.id, shortUrl: link.short_url || '', updatedAt: new Date().toISOString() };
        await docRef.update(patch);
        return { success: true, resale: publicRow(docRef.id, { ...record, ...patch }) };
    } catch (err) {
        console.error('[API/RESALE] payment link failed:', err.message);
        await docRef.update({ status: 'cancelled', linkError: String(err.message || '').slice(0, 200), updatedAt: new Date().toISOString() }).catch(() => {});
        throw new ResaleError('GATEWAY', `Razorpay didn’t create the link: ${String(err.message || 'try again').slice(0, 140)}`, 502);
    }
};

const loadResale = async (db, body) => {
    const id = str(body.id, 64);
    if (!id) throw new ResaleError('VALIDATION', 'Missing link.');
    const snap = await db.collection(RESALE_COLLECTION).doc(id).get();
    if (!snap.exists) throw new ResaleError('NOT_FOUND', 'That link no longer exists.', 404);
    return { id, r: snap.data() };
};

const syncAction = async (db, body, ctx) => {
    if (!razorpayConfigured()) throw new ResaleError('GATEWAY', 'Razorpay isn’t set up on the server yet.', 503);
    const { id, r } = await loadResale(db, body);
    // Paid but the email didn't go: this tries it again.
    if (r.status === 'paid') {
        const out = await settleResale(db, id, { linkId: r.linkId, paymentId: r.paymentId, amount: r.paidAmount }, ctx.mailOpts);
        return { success: true, resale: out.resale };
    }
    return { success: true, resale: await refreshFromRazorpay(db, id, r, ctx.mailOpts) };
};

const cancelAction = async (db, body) => {
    const { id, r } = await loadResale(db, body);
    if (r.status === 'paid') throw new ResaleError('VALIDATION', 'This link is already paid. Refunds are done in the Razorpay dashboard.');
    if (r.status !== 'awaiting') return { success: true, resale: publicRow(id, r) };
    if (r.linkId) {
        try {
            await razorpay(`/payment_links/${encodeURIComponent(r.linkId)}/cancel`, { method: 'POST' });
        } catch (err) {
            // It may have been paid a moment ago: look before giving up.
            const fresh = await refreshFromRazorpay(db, id, r).catch(() => null);
            if (fresh && fresh.status !== 'awaiting') return { success: true, resale: fresh };
            throw new ResaleError('GATEWAY', `Razorpay didn’t cancel it: ${String(err.message || '').slice(0, 140)}`, 502);
        }
    }
    const now = new Date().toISOString();
    await db.collection(RESALE_COLLECTION).doc(id).update({ status: 'cancelled', cancelledAt: now, updatedAt: now });
    return { success: true, resale: publicRow(id, { ...r, status: 'cancelled', cancelledAt: now, updatedAt: now }) };
};

export const RESALE_ACTIONS = {
    'ticket-resale-list': listAction,
    'ticket-resale-create': createAction,
    'ticket-resale-sync': syncAction,
    'ticket-resale-cancel': cancelAction,
};
