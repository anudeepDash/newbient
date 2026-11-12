/**
 * Payment pages: one shareable Newbi page per event (app.newbi.live/pay/t/<id>)
 * where the buyer types the amount and their details, then pays in Razorpay's
 * checkout. Every payment is kept on the page and the buyer gets the same
 * "payment received" email as a resale link. No quantity, no pass, no seats:
 * the tickets are still handed over by the team.
 *
 * Pages live in `ticket_resales` next to the resale links (kind: 'page'), so the
 * admin's Resale links list shows both. Public actions, served through
 * /api/creator-join?action=ticket-paypage-* (see tickets.js):
 *
 *   ticket-paypage-view     the event name, and whether the page takes payments
 *   ticket-paypage-start    checks the buyer's details and opens a Razorpay order
 *   ticket-paypage-confirm  checks Razorpay's signature (or asks Razorpay) and records it
 *
 * Razorpay's webhook (payment.captured / order.paid) records payments too, by the
 * notes on the order and the payment: see razorpayWebhook.js.
 */
import { razorpay, razorpayConfigured, razorpayKeyId, gatewaySignatureOk, paidPaymentFor } from './razorpay.js';
import { sendTransactional } from './mail/send.js';
import { RESALE_COLLECTION, ResaleError, makeResaleRef } from './ticketResale.js';

export const PAGE_KIND = 'page';
const MAX_AMOUNT = 500000;
const MAX_PAYMENTS = 1000; // per page, keeps the document well under Firestore's size limit
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const str = (v, max) => String(v ?? '').trim().slice(0, max);

/** The page's picture: an https link (an upload from the admin, or a pasted link), or ''. */
export const readImage = (value) => {
    const raw = str(value, 1000);
    if (!raw) return '';
    try {
        const u = new URL(raw);
        if (u.protocol !== 'https:') throw new Error('not https');
        return u.toString();
    } catch {
        throw new ResaleError('VALIDATION', 'That image link doesn’t work. Upload the picture instead.');
    }
};
const nowIso = () => new Date().toISOString();

const loadPage = async (db, id) => {
    const pageId = str(id, 64);
    if (!pageId || !/^[\w-]+$/.test(pageId)) throw new ResaleError('NOT_FOUND', 'This payment page doesn’t exist.', 404);
    const ref = db.collection(RESALE_COLLECTION).doc(pageId);
    const snap = await ref.get();
    if (!snap.exists || snap.data().kind !== PAGE_KIND) throw new ResaleError('NOT_FOUND', 'This payment page doesn’t exist.', 404);
    return { ref, page: snap.data() };
};

/** What the buyer types: the amount, their name, email and phone. */
export const readPayerInput = (body = {}) => {
    const amount = Math.round(Number(body.amount) * 100) / 100;
    const name = str(body.name, 120);
    const email = str(body.email, 200).toLowerCase();
    const digits = String(body.phone || '').replace(/\D/g, '');
    const errors = {};
    if (!Number.isFinite(amount) || amount < 1) errors.amount = 'Enter the amount, at least ₹1.';
    else if (amount > MAX_AMOUNT) errors.amount = `The most you can pay here is ₹${MAX_AMOUNT.toLocaleString('en-IN')}.`;
    if (name.length < 2) errors.name = 'Enter your name.';
    if (!EMAIL_RE.test(email)) errors.email = 'Enter your email. The confirmation goes there.';
    if (digits.length < 10 || digits.length > 13) errors.phone = 'Enter your phone number, like 98765 43210.';
    if (Object.keys(errors).length) {
        const err = new ResaleError('VALIDATION', Object.values(errors)[0]);
        err.errors = errors;
        throw err;
    }
    return { amount, name, email, phone: digits.length === 10 ? `+91${digits}` : `+${digits}` };
};

/** Staff: a new page, with the event name and, if they like, a picture. */
export const createPage = async (db, body, ctx = {}) => {
    const eventName = str(body.eventName, 140);
    if (!eventName) throw new ResaleError('VALIDATION', 'Add the event name.');
    const image = readImage(body.image);
    const now = nowIso();
    const docRef = db.collection(RESALE_COLLECTION).doc();
    const record = {
        kind: PAGE_KIND,
        eventName,
        image,
        ref: makeResaleRef(),
        status: 'open',
        gateway: 'razorpay',
        payments: [],
        paidTotal: 0,
        paidCount: 0,
        createdAt: now,
        updatedAt: now,
        createdBy: ctx.staffEmail || null,
    };
    await docRef.set(record);
    return { success: true, resale: { id: docRef.id, ...record } };
};

/** Staff: change a page's picture (or name). */
export const updatePage = async (db, body) => {
    const { ref, page } = await loadPage(db, body.id);
    const patch = {};
    if (body.image !== undefined) patch.image = readImage(body.image);
    if (body.eventName !== undefined) {
        const eventName = str(body.eventName, 140);
        if (!eventName) throw new ResaleError('VALIDATION', 'Add the event name.');
        patch.eventName = eventName;
    }
    if (!Object.keys(patch).length) return { success: true, resale: { id: ref.id, ...page } };
    patch.updatedAt = nowIso();
    await ref.update(patch);
    return { success: true, resale: { id: ref.id, ...page, ...patch } };
};

/** Staff: stop a page taking payments. What was paid stays. */
export const closePage = async (db, id) => {
    const { ref, page } = await loadPage(db, id);
    if (page.status === 'closed') return { success: true, resale: { id: ref.id, ...page } };
    const now = nowIso();
    await ref.update({ status: 'closed', closedAt: now, updatedAt: now });
    return { success: true, resale: { id: ref.id, ...page, status: 'closed', closedAt: now, updatedAt: now } };
};

const sendPaymentEmail = async (ref, page, entry, mail) => {
    const sent = await mail('resale-payment-received', entry.email, {
        name: entry.name,
        eventName: page.eventName,
        image: page.image || '',
        amount: entry.amount,
        ref: page.ref,
        paymentId: entry.paymentId,
        paidAt: entry.paidAt,
    }, { ref: { collection: RESALE_COLLECTION, id: ref.id }, idempotencyKey: `paypage-${entry.paymentId}` }).catch(err => ({ ok: false, error: err.message }));
    return Boolean(sent?.ok);
};

const setEmailStatus = (db, ref, paymentId, status) => db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return;
    const payments = (snap.data().payments || []).map(p => (p.paymentId === paymentId ? { ...p, emailStatus: status } : p));
    tx.update(ref, { payments });
});

/**
 * Records one Razorpay payment on a page and emails the buyer. Safe to call from
 * the checkout, the "check" fallback and the webhook for the same payment.
 */
export const settlePagePayment = async (db, pageId, payment, { mail = sendTransactional, now = nowIso() } = {}) => {
    const ref = db.collection(RESALE_COLLECTION).doc(String(pageId));
    const paymentId = String(payment.paymentId || '');
    if (!paymentId) throw new ResaleError('VALIDATION', 'Missing payment.');
    const result = await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists || snap.data().kind !== PAGE_KIND) return null;
        const page = snap.data();
        const payments = page.payments || [];
        const existing = payments.find(p => p.paymentId === paymentId);
        if (existing) return { page, entry: existing, fresh: false };
        const entry = {
            paymentId,
            orderId: String(payment.orderId || ''),
            amount: Number(payment.amount) || 0,
            name: str(payment.name, 120),
            email: str(payment.email, 200).toLowerCase(),
            phone: str(payment.phone, 20),
            method: str(payment.method, 30),
            paidAt: now,
            emailStatus: 'pending',
        };
        // Paid is paid, even on a page closed in the meantime: it's kept and counted.
        tx.update(ref, {
            payments: [entry, ...payments].slice(0, MAX_PAYMENTS),
            paidTotal: Math.round(((Number(page.paidTotal) || 0) + entry.amount) * 100) / 100,
            paidCount: (Number(page.paidCount) || 0) + 1,
            lastPaidAt: now,
            updatedAt: now,
        });
        return { page, entry, fresh: true };
    });
    if (!result) return { found: false };

    const { page, entry } = result;
    if (entry.emailStatus !== 'sent') {
        const status = !entry.email ? 'no_email' : (await sendPaymentEmail(ref, page, entry, mail)) ? 'sent' : 'failed';
        await setEmailStatus(db, ref, paymentId, status).catch(() => {});
        entry.emailStatus = status;
    }
    return { found: true, fresh: result.fresh, entry };
};

/** Staff: try the confirmation email again for one payment on a page. */
export const resendPageEmail = async (db, id, paymentId, opts = {}) => {
    const { ref, page } = await loadPage(db, id);
    const entry = (page.payments || []).find(p => p.paymentId === paymentId);
    if (!entry) throw new ResaleError('NOT_FOUND', 'That payment isn’t on this page.', 404);
    if (entry.emailStatus !== 'sent' && entry.email) {
        const ok = await sendPaymentEmail(ref, page, entry, opts.mail || sendTransactional);
        await setEmailStatus(db, ref, paymentId, ok ? 'sent' : 'failed');
    }
    const fresh = await ref.get();
    return { success: true, resale: { id: ref.id, ...fresh.data() } };
};

/** Razorpay's webhook: a payment whose order or payment notes name one of our pages. */
export const settlePageFromWebhook = async (db, payment, order, opts) => {
    const notes = (payment?.notes?.kind === 'paypage' ? payment.notes : null) || (order?.notes?.kind === 'paypage' ? order.notes : null);
    if (!notes?.pageId || !payment?.id) return false;
    const out = await settlePagePayment(db, notes.pageId, {
        paymentId: payment.id,
        orderId: payment.order_id,
        amount: Number(payment.amount) / 100,
        name: notes.name,
        email: payment.email || notes.email,
        phone: payment.contact || notes.phone,
        method: payment.method,
    }, opts);
    return out.found;
};

// ── public actions ───────────────────────────────────────────────────────────

const viewAction = async (db, body) => {
    const { ref, page } = await loadPage(db, body.id);
    return {
        success: true,
        page: { id: ref.id, eventName: page.eventName, image: page.image || '', open: page.status === 'open' && razorpayConfigured() },
    };
};

const startAction = async (db, body) => {
    if (!razorpayConfigured()) throw new ResaleError('GATEWAY', 'Online payment isn’t set up yet. Please try again later.', 503);
    const { ref, page } = await loadPage(db, body.id);
    if (page.status !== 'open') throw new ResaleError('CLOSED', 'This payment page is closed. Ask the Newbi team for a new link.', 409);
    const payer = readPayerInput(body);
    const notes = {
        kind: 'paypage',
        pageId: ref.id,
        name: payer.name.slice(0, 120),
        email: payer.email,
        phone: payer.phone,
        event: page.eventName.slice(0, 200),
    };
    let order;
    try {
        order = await razorpay('/orders', {
            method: 'POST',
            body: { amount: Math.round(payer.amount * 100), currency: 'INR', receipt: `${page.ref}-${Date.now().toString(36)}`.slice(0, 40), notes },
        });
    } catch (err) {
        console.error('[API/PAYPAGE] order failed:', err.message);
        throw new ResaleError('GATEWAY', 'Online payment isn’t working right now. Please try again in a moment.', 503);
    }
    return {
        success: true,
        keyId: razorpayKeyId(),
        gatewayOrderId: order.id,
        amount: order.amount,
        currency: order.currency || 'INR',
        name: 'Newbi Entertainment',
        description: `Tickets: ${page.eventName}`.slice(0, 80),
        notes,
        prefill: { name: payer.name, email: payer.email, contact: payer.phone },
    };
};

const confirmAction = async (db, body, ctx = {}) => {
    if (!razorpayConfigured()) throw new ResaleError('GATEWAY', 'Online payment isn’t set up.', 503);
    const { ref } = await loadPage(db, body.id);
    const orderId = str(body.razorpay_order_id || body.orderId, 80);
    if (!orderId) throw new ResaleError('VALIDATION', 'Missing payment.');

    let paymentId;
    if (body.sync) {
        // Asks Razorpay itself, so a UPI app payment or a closed window still lands.
        const paid = await paidPaymentFor(orderId);
        if (!paid) return { success: true, paid: false };
        paymentId = paid.id;
    } else {
        paymentId = str(body.razorpay_payment_id, 80);
        if (!gatewaySignatureOk(orderId, paymentId, str(body.razorpay_signature, 200))) {
            throw new ResaleError('SIGNATURE', 'We couldn’t confirm that payment. If money left your account, contact us with the payment ID.', 400);
        }
    }

    // The order says which page and who paid; the caller only says which order.
    const [order, payment] = await Promise.all([
        razorpay(`/orders/${encodeURIComponent(orderId)}`),
        razorpay(`/payments/${encodeURIComponent(paymentId)}`).catch(() => null),
    ]);
    if (order?.notes?.kind !== 'paypage' || order.notes.pageId !== ref.id) throw new ResaleError('VALIDATION', 'That payment isn’t for this page.');
    if (payment && payment.order_id && payment.order_id !== orderId) throw new ResaleError('VALIDATION', 'That payment isn’t for this order.');

    const out = await settlePagePayment(db, ref.id, {
        paymentId,
        orderId,
        amount: Number(payment?.amount ?? order.amount_paid ?? order.amount) / 100,
        name: order.notes.name,
        email: order.notes.email || payment?.email,
        phone: order.notes.phone || payment?.contact,
        method: payment?.method,
    }, ctx.mailOpts);
    return {
        success: true,
        paid: true,
        paymentId,
        amount: out.entry?.amount,
        method: out.entry?.method || '',
        paidAt: out.entry?.paidAt || null,
        emailed: out.entry?.emailStatus === 'sent',
    };
};

export const PAYPAGE_PUBLIC_ACTIONS = {
    'ticket-paypage-view': viewAction,
    'ticket-paypage-start': startAction,
    'ticket-paypage-confirm': confirmAction,
};
