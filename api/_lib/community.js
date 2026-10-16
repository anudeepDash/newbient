/**
 * Community actions that used to write straight from the browser, now on the
 * server so nobody can set their own score or skip a check.
 *
 * Served as /api/forms?type=community&action=…
 *
 *   GET  giveaway         {slug}                                     public view (+ your entry when signed in)
 *   POST giveaway-enter   {giveawayId, answer?, college?, city?, instagram?, referredBy?}
 *   POST giveaway-task    {giveawayId, taskId, instagram?}
 *   POST giveaway-spin    {giveawayId}
 *   POST gig-interest     {gigId, note?}
 *
 * Giveaway scores are worked out here, every time, from what the entry holds:
 *   1 for entering + each completed task's points + 3 per referral + the spin.
 */
import crypto from 'node:crypto';
import { getDb, FieldValue, nowIso } from './db.js';
import { verifyToken } from './auth.js';
import { notify } from './notify.js';
import { normalizeEmail } from './mailing.js';
import { toE164 } from './whatsapp.js';

class CommunityError extends Error {
    constructor(code, message, status = 400, extra = {}) {
        super(message);
        this.code = code;
        this.status = status;
        this.extra = extra;
    }
}

const str = (v, n = 300) => (v === undefined || v === null ? '' : String(v).trim().slice(0, n));
const idOk = (v) => typeof v === 'string' && /^[\w-]{1,128}$/.test(v);
const present = (v) => v !== undefined && v !== null && String(v).trim() !== '';
const pick = (...values) => values.find(present) ?? null;

export const REFERRAL_POINTS = 3;
/* The bonus wheel, same odds as the public page has always shown. */
export const WHEEL = [
    { id: 'points_1', label: '+1 point', points: 1, probability: 0.4 },
    { id: 'points_2', label: '+2 points', points: 2, probability: 0.3 },
    { id: 'points_5', label: '+5 points', points: 5, probability: 0.3 },
];

/* "2026-10-20" + optional "18:30", read in India time. */
export const giveawayEndsAt = (g) => {
    if (!g?.endDate) return null;
    const day = String(g.endDate).slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
        const d = new Date(g.endDate);
        return Number.isNaN(d.getTime()) ? null : d;
    }
    const time = /^\d{2}:\d{2}/.test(g.endTime || '') ? g.endTime.slice(0, 5) : '23:59';
    const d = new Date(`${day}T${time}:00+05:30`);
    return Number.isNaN(d.getTime()) ? null : d;
};
export const giveawayHasEnded = (g, now = new Date()) => {
    if (!g) return true;
    if (String(g.status || '').toLowerCase() === 'closed') return true;
    const end = giveawayEndsAt(g);
    return Boolean(end && end < now);
};

/** The one scoring rule. */
export const scoreFor = (entry = {}, giveaway = {}) => {
    const tasks = Array.isArray(giveaway.tasks) ? giveaway.tasks : [];
    const done = entry.completedTasks || {};
    const taskPoints = tasks.reduce((n, t) => n + (done[t.id] ? Math.max(0, Math.round(Number(t.entryScore) || 0)) : 0), 0);
    return 1 + taskPoints + Math.max(0, Number(entry.referralCount) || 0) * REFERRAL_POINTS + Math.max(0, Number(entry.spinPoints) || 0);
};

const callerFrom = async (req) => {
    const token = await verifyToken(req);
    return token ? { uid: token.uid, email: normalizeEmail(token.email), token } : { uid: null };
};
const requireUser = (caller) => { if (!caller.uid) throw new CommunityError('AUTH', 'Sign in to continue.', 401); };

const loadGiveaway = async (db, { giveawayId, slug }) => {
    if (idOk(giveawayId)) {
        const snap = await db.collection('giveaways').doc(giveawayId).get();
        if (snap.exists) return { id: snap.id, ...snap.data() };
    }
    if (present(slug)) {
        const snap = await db.collection('giveaways').where('slug', '==', str(slug, 120)).limit(1).get();
        if (!snap.empty) return { id: snap.docs[0].id, ...snap.docs[0].data() };
    }
    return null;
};

const publicGiveaway = (g) => ({
    id: g.id,
    slug: g.slug,
    name: str(g.name, 200),
    description: str(g.description, 4000),
    posterUrl: g.posterUrl || null,
    prize: pick(g.prize, g.prizes) || null,
    endsAt: giveawayEndsAt(g)?.toISOString() || null,
    ended: giveawayHasEnded(g),
    question: str(g.question || g.entryQuestion, 300) || null,
    askCollege: g.askCollege !== false && g.collectCollege !== false,
    askInstagram: (g.tasks || []).some(t => t.type === 'instagram'),
    showSpinWheel: g.showSpinWheel !== false,
    tasks: (g.tasks || []).map(t => ({ id: t.id, type: t.type, label: str(t.label, 200), points: Math.max(0, Math.round(Number(t.entryScore) || 0)), url: /^https?:\/\//.test(t.config?.url || '') ? t.config.url : null })),
    referralPoints: REFERRAL_POINTS,
    wheel: WHEEL.map(({ id, label, points }) => ({ id, label, points })),
});

const ownEntryView = (e) => (e ? {
    id: e.id,
    entryScore: Number(e.entryScore) || 0,
    completedTasks: e.completedTasks || {},
    referralCode: e.referralCode,
    referralCount: Number(e.referralCount) || 0,
    hasSpunWheel: Boolean(e.hasSpunWheel),
    spinReward: e.spinReward || null,
    isWinner: Boolean(e.isWinner),
    prize: e.prize || null,
} : null);

const findOwnEntry = async (db, giveawayId, uid, tx = null) => {
    const ref = db.collection('giveaway_entries').doc(`${giveawayId}_${uid}`);
    const snap = tx ? await tx.get(ref) : await ref.get();
    if (snap.exists) return { ref, data: { id: snap.id, ...snap.data() } };
    // Entries made before fixed ids were used.
    const q = db.collection('giveaway_entries').where('campaignId', '==', giveawayId).where('userId', '==', uid).limit(1);
    const legacy = tx ? await tx.get(q) : await q.get();
    if (!legacy.empty) return { ref: legacy.docs[0].ref, data: { id: legacy.docs[0].id, ...legacy.docs[0].data() } };
    return { ref, data: null };
};

const giveawayAction = async (db, body, caller) => {
    const g = await loadGiveaway(db, { giveawayId: str(body.id, 128), slug: body.slug });
    if (!g || String(g.status || '').toLowerCase() === 'draft') throw new CommunityError('NOT_FOUND', "We couldn't find this giveaway.", 404);
    const view = publicGiveaway(g);
    if (caller.uid) view.me = ownEntryView((await findOwnEntry(db, g.id, caller.uid)).data);
    return { success: true, giveaway: view };
};

const enterAction = async (db, body, caller) => {
    requireUser(caller);
    const g = await loadGiveaway(db, { giveawayId: str(body.giveawayId, 128) });
    if (!g) throw new CommunityError('NOT_FOUND', "We couldn't find this giveaway.", 404);
    if (giveawayHasEnded(g)) throw new CommunityError('ENDED', 'This giveaway has ended.', 409);

    const userSnap = await db.collection('users').doc(caller.uid).get().catch(() => null);
    const u = userSnap?.exists ? userSnap.data() : {};
    const name = str(pick(u.name, u.displayName, caller.token?.name, body.name), 120);
    const city = str(pick(body.city, u.city), 80);
    const college = str(pick(body.college, u.college, u.collegeName), 160);
    if (!name) throw new CommunityError('PROFILE_INCOMPLETE', 'Add your name first.', 422, { missing: ['name'] });
    if (!city) throw new CommunityError('PROFILE_INCOMPLETE', 'Add your city first.', 422, { missing: ['city'] });
    const question = str(g.question || g.entryQuestion, 300);
    const answer = str(body.answer, 2000);
    if (question && !answer) throw new CommunityError('VALIDATION', 'Answer the question to enter.');

    const ownCode = caller.uid.substring(0, 8);
    const referredBy = str(body.referredBy, 20);
    const entryRef = db.collection('giveaway_entries').doc(`${g.id}_${caller.uid}`);

    const created = await db.runTransaction(async (tx) => {
        const existing = await findOwnEntry(db, g.id, caller.uid, tx);
        if (existing.data) return false;
        const entry = {
            campaignId: g.id,
            userId: caller.uid,
            name,
            email: normalizeEmail(pick(u.email, caller.email)) || null,
            phone: toE164(pick(u.phone, u.phoneNumber, caller.token?.phone_number)) || null,
            city,
            college: college || null,
            instagram: str(body.instagram, 60).replace(/^@+/, '') || null,
            answer: answer || null,
            completedTasks: {},
            hasFollowedInsta: false,
            referralCount: 0,
            hasSpunWheel: false,
            spinPoints: 0,
            referralCode: ownCode,
            referredBy: referredBy && referredBy !== ownCode ? referredBy : null,
            createdAt: nowIso(),
            source: 'app',
        };
        entry.entryScore = scoreFor(entry, g);
        tx.set(entryRef, entry);
        return true;
    });
    if (!created) throw new CommunityError('DUPLICATE', "You've already entered this giveaway.", 409);

    // Credit the friend who shared the link. Their score is recomputed, never just bumped.
    if (referredBy && referredBy !== ownCode) {
        try {
            const refSnap = await db.collection('giveaway_entries').where('campaignId', '==', g.id).where('referralCode', '==', referredBy).limit(1).get();
            if (!refSnap.empty) {
                await db.runTransaction(async (tx) => {
                    const s = await tx.get(refSnap.docs[0].ref);
                    const d = s.data() || {};
                    const next = { ...d, referralCount: (Number(d.referralCount) || 0) + 1 };
                    tx.update(s.ref, { referralCount: next.referralCount, entryScore: scoreFor(next, g) });
                });
            }
        } catch (err) {
            console.warn('[COMMUNITY] referral credit failed:', err.message);
        }
    }

    try {
        const appOrigin = (process.env.PUBLIC_APP_URL || 'https://app.newbi.live').replace(/\/+$/, '');
        await notify('giveaway-entry', caller.uid, {
            giveawayName: g.name,
            name,
            prize: pick(g.prize, g.prizes) || '',
            endsAt: giveawayEndsAt(g)?.toISOString() || '',
            giveawayUrl: `${appOrigin}/community/giveaways/${encodeURIComponent(g.slug || g.id)}`,
        }, { skip: ['whatsapp', 'push'], ref: { collection: 'giveaway_entries', id: entryRef.id }, idempotencyKey: `giveaway_${entryRef.id}` });
    } catch (err) {
        console.warn('[COMMUNITY] giveaway email not sent:', err.message);
    }
    const fresh = await entryRef.get();
    return { success: true, entry: ownEntryView({ id: fresh.id, ...fresh.data() }) };
};

const taskAction = async (db, body, caller) => {
    requireUser(caller);
    const g = await loadGiveaway(db, { giveawayId: str(body.giveawayId, 128) });
    if (!g) throw new CommunityError('NOT_FOUND', "We couldn't find this giveaway.", 404);
    if (giveawayHasEnded(g)) throw new CommunityError('ENDED', 'This giveaway has ended.', 409);
    const task = (g.tasks || []).find(t => t.id === body.taskId);
    if (!task) throw new CommunityError('VALIDATION', 'That task isn’t part of this giveaway.');
    const instagram = str(body.instagram, 60).replace(/^@+/, '');
    if (task.type === 'instagram' && !/^[A-Za-z0-9._]{1,30}$/.test(instagram)) throw new CommunityError('VALIDATION', 'Enter your Instagram username.');

    const entry = await db.runTransaction(async (tx) => {
        const own = await findOwnEntry(db, g.id, caller.uid, tx);
        if (!own.data) throw new CommunityError('NOT_ENTERED', 'Enter the giveaway first.', 409);
        if (own.data.completedTasks?.[task.id]) return own.data;
        const next = { ...own.data, completedTasks: { ...(own.data.completedTasks || {}), [task.id]: nowIso() } };
        const patch = { completedTasks: next.completedTasks, entryScore: scoreFor(next, g) };
        if (task.type === 'instagram') { patch.instagramUsername = instagram; patch.hasFollowedInsta = true; }
        tx.update(own.ref, patch);
        return { ...next, ...patch };
    });
    return { success: true, entry: ownEntryView(entry) };
};

const pickReward = () => {
    const roll = crypto.randomInt(1_000_000) / 1_000_000;
    let acc = 0;
    for (const r of WHEEL) {
        acc += r.probability;
        if (roll < acc) return r;
    }
    return WHEEL[WHEEL.length - 1];
};

const spinAction = async (db, body, caller) => {
    requireUser(caller);
    const g = await loadGiveaway(db, { giveawayId: str(body.giveawayId, 128) });
    if (!g) throw new CommunityError('NOT_FOUND', "We couldn't find this giveaway.", 404);
    if (g.showSpinWheel === false) throw new CommunityError('VALIDATION', 'This giveaway has no bonus spin.');
    if (giveawayHasEnded(g)) throw new CommunityError('ENDED', 'This giveaway has ended.', 409);
    const reward = pickReward();
    const entry = await db.runTransaction(async (tx) => {
        const own = await findOwnEntry(db, g.id, caller.uid, tx);
        if (!own.data) throw new CommunityError('NOT_ENTERED', 'Enter the giveaway first.', 409);
        if (own.data.hasSpunWheel) throw new CommunityError('DUPLICATE', 'You’ve already used your spin.', 409);
        const next = { ...own.data, hasSpunWheel: true, spinPoints: reward.points, spinReward: reward.label };
        const patch = { hasSpunWheel: true, spinPoints: reward.points, spinReward: reward.label, entryScore: scoreFor(next, g) };
        tx.update(own.ref, patch);
        return { ...next, ...patch };
    });
    return { success: true, reward: { id: reward.id, label: reward.label, points: reward.points }, entry: ownEntryView(entry) };
};

/** "I'm interested" on a gig: saved before the person is sent to WhatsApp. */
const gigInterestAction = async (db, body, caller) => {
    requireUser(caller);
    const gigId = str(body.gigId, 128);
    if (!idOk(gigId)) throw new CommunityError('VALIDATION', 'Missing gig.');
    const gigSnap = await db.collection('volunteer_gigs').doc(gigId).get();
    if (!gigSnap.exists) throw new CommunityError('NOT_FOUND', "We couldn't find this gig.", 404);
    const userSnap = await db.collection('users').doc(caller.uid).get().catch(() => null);
    const u = userSnap?.exists ? userSnap.data() : {};
    const ref = db.collection('gig_applications').doc(`${gigId}_${caller.uid}`);
    const existed = (await ref.get()).exists;
    await ref.set({
        gigId,
        gigTitle: str(gigSnap.data().title, 200),
        userId: caller.uid,
        name: str(pick(u.name, u.displayName, caller.token?.name), 120),
        email: normalizeEmail(pick(u.email, caller.email)) || null,
        phone: toE164(pick(u.phone, u.phoneNumber, caller.token?.phone_number)) || null,
        city: str(u.city, 80) || null,
        note: str(body.note, 500) || null,
        status: 'interested',
        updatedAt: nowIso(),
        ...(existed ? {} : { createdAt: nowIso() }),
    }, { merge: true });
    if (!existed) await gigSnap.ref.update({ interestedCount: FieldValue.increment(1) }).catch(() => {});
    return { success: true, alreadyInterested: existed };
};

const ACTIONS = {
    giveaway: giveawayAction,
    'giveaway-enter': enterAction,
    'giveaway-task': taskAction,
    'giveaway-spin': spinAction,
    'gig-interest': gigInterestAction,
};

export const handleCommunity = async (req, res) => {
    const action = str(req.query?.action, 40);
    const fn = ACTIONS[action];
    if (!fn) return res.status(400).json({ success: false, error: 'Unknown action.' });
    if (action !== 'giveaway' && req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });
    const body = { ...(req.query || {}), ...(req.body && typeof req.body === 'object' ? req.body : {}) };
    try {
        const caller = await callerFrom(req);
        const result = await fn(getDb(), body, caller);
        res.setHeader('Cache-Control', 'private, no-store');
        return res.status(200).json(result);
    } catch (err) {
        if (err instanceof CommunityError) return res.status(err.status).json({ success: false, code: err.code, error: err.message, ...err.extra });
        console.error(`[API/COMMUNITY] ${action} failed:`, err);
        return res.status(500).json({ success: false, code: 'SERVER', error: 'Something went wrong. Please try again.' });
    }
};

// For tests.
export const _internal = { actions: ACTIONS };
