/**
 * Server-built notifications for flows that still save from the browser
 * (until Phases 4/5 move them to their own APIs). The browser only says what
 * happened and which record; the server loads the record, checks the caller
 * may trigger it, builds the email itself and sends it once.
 *
 *   POST /api/mail { action: 'event', event: 'pass-confirmed', guestlistId, entryId }
 */
import { getDb, nowIso, istDate, SITE_URL } from '../db.js';
import { notify } from '../notify.js';
import { sendTransactional } from './send.js';
import { render } from './templates/index.js';
import { createCampaign } from './campaigns.js';
import { sendPush } from '../push.js';
import { isCampaignCityMatch } from '../../../src/lib/constants.js';
import { normalizeEmail, isValidEmail } from '../mailing.js';
import { deliverGuestlistPass, ensureOrderPass, passUrl } from '../passes.js';

// The admin has its own host; staff emails link there.
const ADMIN_URL = 'https://admin.newbi.live';

class EventError extends Error {
    constructor(message, status = 400) { super(message); this.status = status; }
}

const FRESH_MS = 20 * 60 * 1000;
const isFresh = (iso) => Date.now() - (Date.parse(iso || '') || 0) < FRESH_MS;
const safePath = (p, fallback) => (typeof p === 'string' && p.startsWith('/') && !p.startsWith('//') ? p.slice(0, 300) : fallback);
const idOk = (v) => typeof v === 'string' && /^[\w-]{1,128}$/.test(v);

/** Marks a record so the same email can't be triggered twice. Returns false if it was already sent. */
const claimOnce = async (ref, field) => {
    const db = getDb();
    return db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (snap.exists && snap.data()?.mail?.[field]) return false;
        tx.set(ref, { mail: { [field]: nowIso() } }, { merge: true });
        return true;
    });
};

/* ---------- Passes ---------- */

const passFromGuestlist = async ({ guestlistId, entryId }, caller) => {
    if (!idOk(guestlistId) || !idOk(entryId)) throw new EventError('Missing guestlist entry.');
    const db = getDb();
    const entryRef = db.collection('guestlists').doc(guestlistId).collection('entries').doc(entryId);
    const entrySnap = await entryRef.get();
    if (!entrySnap.exists) throw new EventError('Entry not found.', 404);
    const entry = entrySnap.data();
    // The person who registered (right after registering) or staff (approving).
    const own = caller.uid && entry.userId && entry.userId === caller.uid;
    if (!caller.staff && !own && !isFresh(entry.createdAt || entry.appliedAt)) throw new EventError('Forbidden', 403);
    if (!['approved', 'confirmed'].includes(String(entry.status || '').toLowerCase())) throw new EventError('This place isn’t confirmed yet.', 409);
    // Issues the pass (passes/{ref}) if it doesn't exist yet, then sends it once.
    const out = await deliverGuestlistPass(db, guestlistId, entryId, { issuedBy: caller.staff ? (caller.email || 'staff') : 'self' });
    return out.duplicate ? { duplicate: true } : { delivery: out.delivery, ref: out.ref };
};

const orderItems = (order) => (Array.isArray(order.items) && order.items.length
    ? order.items.map(i => ({ name: i.name || 'Ticket', count: Number(i.count || 1), price: Number(i.price || 0) }))
    : [{ name: order.tierName || 'Ticket', count: Number(order.quantity || order.count || 1), price: Number(order.totalAmount || 0) / Math.max(1, Number(order.quantity || 1)) }]);

/** Shared with the checkout API: the email for a ticket order. */
export const sendOrderEmail = async (orderId, { event: eventDoc = null } = {}) => {
    const db = getDb();
    const orderRef = db.collection('ticket_orders').doc(orderId);
    const snap = await orderRef.get();
    if (!snap.exists) throw new EventError('Order not found.', 404);
    const order = snap.data();
    const status = String(order.status || '').toLowerCase();
    const confirmed = ['confirmed', 'approved', 'dispatched'].includes(status);
    const template = confirmed ? 'pass-confirmed' : status === 'pending' ? 'order-received' : null;
    if (!template) throw new EventError('This order has nothing to send.', 409);
    const email = normalizeEmail(order.customerEmail || order.email);
    if (!isValidEmail(email)) throw new EventError('This order has no email address.', 422);
    if (!(await claimOnce(orderRef, template === 'pass-confirmed' ? 'passConfirmedAt' : 'orderReceivedAt'))) return { duplicate: true };

    let ev = eventDoc;
    if (!ev && order.eventId) {
        const evSnap = await db.collection('upcoming_events').doc(order.eventId).get().catch(() => null);
        ev = evSnap?.exists ? evSnap.data() : {};
    }
    ev = ev || {};
    const ref = String(order.bookingRef || '');
    // Confirmed orders get a pass record too, so the gate scanner and the app show them like any other pass.
    if (template === 'pass-confirmed' && ref) {
        await ensureOrderPass(db, orderId, order, ev).catch(err => console.warn('[MAIL/EVENTS] order pass not issued:', err.message));
    }
    const data = {
        name: order.customerName,
        eventName: ev.title || order.eventTitle,
        date: ev.date,
        venue: ev.location || ev.venue,
        ref,
        items: orderItems(order),
        totalAmount: Number(order.totalAmount || 0),
        paymentRef: order.paymentRef && order.paymentRef !== 'FREE' ? order.paymentRef : '',
        mode: 'qr',
        source: 'order',
        passUrl: ref ? passUrl(ref) : '',
    };
    const delivery = await notify(template, order.userId || null, data, {
        to: { email, phone: order.customerPhone, name: order.customerName },
        ref: { collection: 'ticket_orders', id: orderId },
    });
    return { delivery };
};

const passFromOrder = async ({ orderId }, caller) => {
    if (!idOk(orderId)) throw new EventError('Missing order.');
    if (!caller.staff) throw new EventError('Forbidden', 403);
    return sendOrderEmail(orderId);
};

/* ---------- Creators ---------- */

const loadCreator = async (creatorId) => {
    if (!idOk(creatorId)) throw new EventError('Missing creator.');
    const ref = getDb().collection('creators').doc(creatorId);
    const snap = await ref.get();
    if (!snap.exists) throw new EventError('Creator not found.', 404);
    return { ref, creator: snap.data() };
};

const creatorDecision = (event) => async ({ creatorId, reason }, caller) => {
    if (!caller.staff) throw new EventError('Forbidden', 403);
    const { creator } = await loadCreator(creatorId);
    const want = event === 'creator-approved' ? 'approved' : 'rejected';
    if (String(creator.profileStatus || '').toLowerCase() !== want) throw new EventError(`This creator isn't ${want}.`, 409);
    const uid = creator.uid || creatorId;
    const delivery = await notify(event, uid, {
        name: creator.displayName || creator.name,
        reason: event === 'creator-rejected' ? String(reason || creator.rejectionReason || '').slice(0, 600) : undefined,
        dashboardUrl: `${SITE_URL}/creator-dashboard`,
        reapplyUrl: `${SITE_URL}/creator/join`,
    }, {
        to: { email: creator.email, phone: creator.isPhoneVerified ? creator.phone : '', name: creator.displayName || creator.name },
        // One per creator per day, so a double click can't send two.
        idempotencyKey: `${event}_${creatorId}_${istDate()}`,
    });
    return { delivery };
};

/** Emails every matching creator about a new campaign, through the bulk queue. */
const campaignInvite = async ({ campaignId, again = false }, caller) => {
    if (!caller.staff) throw new EventError('Forbidden', 403);
    if (!idOk(campaignId)) throw new EventError('Missing campaign.');
    const db = getDb();
    const campRef = db.collection('campaigns').doc(campaignId);
    const campSnap = await campRef.get();
    if (!campSnap.exists) throw new EventError('Campaign not found.', 404);
    const campaign = { id: campaignId, ...campSnap.data() };
    // Once per campaign, unless staff explicitly announce it again.
    if (again === true) await campRef.set({ mail: { inviteQueuedAt: nowIso() } }, { merge: true });
    else if (!(await claimOnce(campRef, 'inviteQueuedAt'))) return { duplicate: true };

    const creatorsSnap = await db.collection('creators').get();
    const creators = creatorsSnap.docs.map(d => ({ id: d.id, ...d.data() }))
        .filter(c => String(c.profileStatus || 'approved').toLowerCase() !== 'rejected')
        .filter(c => isCampaignCityMatch(campaign.targetCity, c.city));
    const recipients = creators.filter(c => isValidEmail(c.email)).map(c => ({ email: c.email, name: c.displayName || c.name || '', role: 'Creator' }));

    const link = `${SITE_URL}/campaign/${encodeURIComponent(campaignId)}`;
    const data = {
        name: '{{name}}',
        campaignTitle: campaign.title,
        brand: campaign.brandName || campaign.brand,
        reward: campaign.reward,
        city: campaign.targetCity,
        deadline: campaign.deadline || campaign.applicationDeadline,
        description: campaign.description,
        campaignUrl: link,
        image: campaign.image || campaign.coverImage || campaign.thumbnail,
        campaignId,
    };
    let queued = null;
    if (recipients.length) {
        const email = render('campaign-invite', data, { origin: SITE_URL });
        queued = await createCampaign({
            createdBy: caller.email || caller.uid,
            subject: email.subject,
            html: email.html,
            recipients,
            accountType: 'creators',
            meta: { category: 'CREATORS', recipientType: 'campaign-invite', headerText: campaign.title || '' },
        });
        await campRef.set({ mail: { inviteCampaignId: queued.campaignId } }, { merge: true });
    }

    // Push to creators who allowed it (the in-app alert is still created by the admin).
    let pushed = 0;
    const withUid = creators.filter(c => c.uid || c.id).slice(0, 500);
    for (let i = 0; i < withUid.length; i += 20) {
        const res = await Promise.all(withUid.slice(i, i + 20).map(c => sendPush(c.uid || c.id, {
            title: `New campaign: ${String(campaign.title || '').slice(0, 80)}`,
            body: campaign.reward ? `Reward: ${String(campaign.reward).slice(0, 80)}` : 'Tap to see the brief and apply.',
            link: `/campaign/${encodeURIComponent(campaignId)}`,
        })));
        pushed += res.filter(r => r.ok).length;
    }
    return { emailCampaignId: queued?.campaignId || null, emailed: queued?.queued || 0, pushed };
};

// Campaign pages live in the app (app.newbi.live/c/:id); the URL button suffix is the campaign id.
const CAMPAIGN_ORIGIN = (process.env.PUBLIC_APP_URL || 'https://app.newbi.live').replace(/\/+$/, '');

/**
 * The shortlist welcome: email, WhatsApp (template `campaign_shortlisted`), push and the in-app alert,
 * with the campaign's WhatsApp group link. Only for creators who are on the shortlist; once per
 * creator per campaign unless `again` (the admin's "Send the welcome again").
 *   { campaignId, creatorIds: [doc id or uid], message?, again? } → { results: [{ id, delivery | skipped }] }
 */
const campaignShortlisted = async ({ campaignId, creatorIds = [], message = '', again = false }, caller) => {
    if (!caller.staff) throw new EventError('Forbidden', 403);
    if (!idOk(campaignId)) throw new EventError('Missing campaign.');
    const db = getDb();
    const campSnap = await db.collection('campaigns').doc(campaignId).get();
    if (!campSnap.exists) throw new EventError('Campaign not found.', 404);
    const campaign = campSnap.data();
    const ids = Array.from(new Set((Array.isArray(creatorIds) ? creatorIds : []).filter(idOk))).slice(0, 200);
    const campaignUrl = `${CAMPAIGN_ORIGIN}/c/${encodeURIComponent(campaignId)}`;
    const groupLink = /^https:\/\//.test(String(campaign.whatsappLink || '')) ? String(campaign.whatsappLink) : '';
    const note = String(message || '').slice(0, 600);

    const results = [];
    for (let i = 0; i < ids.length; i += 10) {
        const batch = await Promise.all(ids.slice(i, i + 10).map(async (id) => {
            let snap = await db.collection('creators').doc(id).get();
            if (!snap.exists) {
                const q = await db.collection('creators').where('uid', '==', id).limit(1).get();
                snap = q.empty ? null : q.docs[0];
            }
            if (!snap) return { id, skipped: 'Creator not found' };
            const creator = snap.data();
            if (!(creator.shortlistedCampaigns || []).includes(campaignId)) return { id, skipped: 'Not shortlisted' };
            if (!again && creator.campaignWelcome?.[campaignId]?.sentAt) return { id, skipped: 'Already sent' };
            const uid = creator.uid || snap.id;
            const delivery = await notify('campaign-shortlisted', uid, {
                name: creator.displayName || creator.name,
                campaignTitle: campaign.title,
                brand: campaign.brand || campaign.brandName,
                reward: campaign.reward,
                deadline: campaign.deadline || campaign.endDate,
                groupLink,
                campaignUrl,
                campaignId,
                message: note,
            }, {
                // WhatsApp only to a number the creator verified (same rule as the approval message).
                to: { email: creator.email, phone: creator.isPhoneVerified ? (creator.whatsapp || creator.phone) : '', name: creator.displayName || creator.name },
                idempotencyKey: `shortlisted_${campaignId}_${snap.id}${again ? `_${Date.now() - (Date.now() % 60000)}` : ''}`,
            });
            const channels = Object.fromEntries(Object.entries(delivery).map(([k, v]) => [k, v?.status || 'unknown']));
            await snap.ref.set({ campaignWelcome: { [campaignId]: { sentAt: nowIso(), channels } } }, { merge: true }).catch(() => {});
            return { id, delivery: channels };
        }));
        results.push(...batch);
    }
    return { results };
};

const submissionReviewed = async ({ campaignId, reviews = [], campaignPath }, caller) => {
    if (!caller.staff) throw new EventError('Forbidden', 403);
    if (!idOk(campaignId)) throw new EventError('Missing campaign.');
    const campSnap = await getDb().collection('campaigns').doc(campaignId).get();
    if (!campSnap.exists) throw new EventError('Campaign not found.', 404);
    const campaign = campSnap.data();
    const tasks = Array.isArray(campaign.tasks) ? campaign.tasks : [];
    const list = (Array.isArray(reviews) ? reviews : []).slice(0, 100);
    const results = [];
    for (const r of list) {
        if (!idOk(r.uid)) continue;
        const status = ['approved', 'rejected', 'changes'].includes(r.status) ? r.status : 'changes';
        const task = tasks.find(t => String(t.id) === String(r.taskId)) || {};
        const delivery = await notify('submission-reviewed', r.uid, {
            campaignTitle: campaign.title,
            taskTitle: task.title || r.taskTitle,
            status,
            feedback: String(r.reason || '').slice(0, 800),
            campaignUrl: `${SITE_URL}${safePath(campaignPath, `/creator-dashboard?campaignId=${encodeURIComponent(campaignId)}`)}`,
        }, { idempotencyKey: `review_${campaignId}_${r.taskId}_${r.uid}_${status}_${Date.now() - (Date.now() % 60000)}` });
        results.push({ uid: r.uid, delivery });
    }
    return { results };
};

/* ---------- Everything else ---------- */

const giveawayEntry = async ({ giveawayId }, caller) => {
    if (!caller.uid) throw new EventError('Sign in first.', 401);
    if (!idOk(giveawayId)) throw new EventError('Missing giveaway.');
    const db = getDb();
    const entryRef = db.collection('giveaway_entries').doc(`${giveawayId}_${caller.uid}`);
    const [entrySnap, gSnap] = await Promise.all([entryRef.get(), db.collection('giveaways').doc(giveawayId).get()]);
    if (!entrySnap.exists || !gSnap.exists) throw new EventError('Entry not found.', 404);
    if (!(await claimOnce(entryRef, 'entryEmailAt'))) return { duplicate: true };
    const g = gSnap.data();
    const entry = entrySnap.data();
    const endsAt = g.endDate ? `${g.endDate}${g.endTime ? `T${g.endTime}` : ''}` : '';
    const result = await sendTransactional('giveaway-entry', entry.email || caller.email, {
        name: entry.name || entry.fullName || caller.name,
        giveawayName: g.name || g.title,
        prize: g.prize || g.reward,
        endsAt,
        giveawayUrl: g.slug ? `${SITE_URL}/giveaway/${encodeURIComponent(g.slug)}` : SITE_URL,
    }, { uid: caller.uid, ref: { collection: 'giveaway_entries', id: entryRef.id } });
    return { email: result.status };
};

const payeeRegistered = async ({ payeeId }, caller) => {
    if (!caller.uid) throw new EventError('Sign in first.', 401);
    const db = getDb();
    let snap = null;
    if (idOk(payeeId)) {
        snap = await db.collection('finance_payees').doc(payeeId).get();
    } else {
        const q = await db.collection('finance_payees').where('submittedByUid', '==', caller.uid).limit(20).get();
        snap = q.docs.sort((a, b) => String(b.data().createdAt).localeCompare(String(a.data().createdAt)))[0] || null;
    }
    if (!snap?.exists) throw new EventError('Not found.', 404);
    const payee = snap.data();
    if (payee.submittedByUid !== caller.uid) throw new EventError('Forbidden', 403);
    if (!(await claimOnce(snap.ref, 'registeredEmailAt'))) return { duplicate: true };
    const acct = payee.paymentMode === 'UPI' ? payee.upiId : payee.bankDetails?.accountNumber;
    const result = await sendTransactional('payee-registered', payee.email || caller.email, {
        name: payee.name,
        method: payee.paymentMode,
        last4: acct ? String(acct).replace(/\s/g, '').slice(-4) : '',
    }, { uid: caller.uid, ref: { collection: 'finance_payees', id: snap.id } });
    return { email: result.status };
};

const staffAuthorized = async ({ email, role }, caller) => {
    if (!caller.staff) throw new EventError('Forbidden', 403);
    const to = normalizeEmail(email);
    if (!isValidEmail(to)) throw new EventError('Invalid email.');
    const admins = await getDb().collection('admins').where('email', '==', to).limit(1).get();
    if (admins.empty) throw new EventError('That person isn’t on the team yet.', 409);
    const result = await sendTransactional('staff-authorized', to, { role: String(role || admins.docs[0].data().role || '').slice(0, 40), adminUrl: `${ADMIN_URL}/admin` }, { idempotencyKey: `staff_${to}_${role}_${istDate()}` });
    return { email: result.status, ok: result.ok };
};

const invoicePayment = (event) => async ({ invoiceId }, caller) => {
    if (!caller.staff) throw new EventError('Forbidden', 403);
    if (!idOk(invoiceId)) throw new EventError('Missing invoice.');
    const snap = await getDb().collection('invoices').doc(invoiceId).get();
    if (!snap.exists) throw new EventError('Invoice not found.', 404);
    const inv = snap.data();
    const to = normalizeEmail(inv.paymentClaim?.email || inv.clientEmail);
    if (!isValidEmail(to)) return { email: 'skipped' };
    const result = await sendTransactional(event, to, {
        clientName: inv.paymentClaim?.name || inv.clientName,
        invoiceNumber: inv.invoiceNumber,
        invoiceUrl: `${SITE_URL}/invoice/${encodeURIComponent(invoiceId)}`,
    }, { ref: { collection: 'invoices', id: invoiceId }, idempotencyKey: `${event}_${invoiceId}_${istDate()}` });
    return { email: result.status, ok: result.ok };
};

const HANDLERS = {
    'pass-confirmed': (body, caller) => (body.orderId ? passFromOrder(body, caller) : passFromGuestlist(body, caller)),
    'creator-approved': creatorDecision('creator-approved'),
    'creator-rejected': creatorDecision('creator-rejected'),
    'campaign-invite': campaignInvite,
    'campaign-shortlisted': campaignShortlisted,
    'submission-reviewed': submissionReviewed,
    'giveaway-entry': giveawayEntry,
    'payee-registered': payeeRegistered,
    'staff-authorized': staffAuthorized,
    'payment-approved': invoicePayment('payment-approved'),
    'payment-declined': invoicePayment('payment-declined'),
};

export const isEvent = (name) => Object.prototype.hasOwnProperty.call(HANDLERS, name);

/** caller: { uid, email, name, staff } → { status, body } */
export const handleEvent = async (name, body, caller) => {
    if (!isEvent(name)) return { status: 400, body: { success: false, error: 'Unknown event' } };
    try {
        const result = await HANDLERS[name](body || {}, caller);
        return { status: 200, body: { success: true, ...result } };
    } catch (err) {
        if (err instanceof EventError) return { status: err.status, body: { success: false, error: err.message } };
        console.error(`[MAIL] Event ${name} failed:`, err);
        return { status: 500, body: { success: false, error: 'Something went wrong sending that.' } };
    }
};
