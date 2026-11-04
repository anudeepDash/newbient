import { referralCounts, tierFor, monthStartIST } from '../../src/lib/creator/referralTiers.js';

/*
 * The creator-referrals answer (api/creator-join.js): the caller's referrals,
 * their tier and rank, and the top 10 for this month and all time. Only public
 * fields leave the server. A referral counts once the invited creator is
 * approved and not voided (src/lib/creator/referralTiers.js); only approved
 * referrers are ranked.
 */

/* Statuses still waiting on a review or the Instagram check. */
const AWAITING = new Set(['pending', 'pending_verification']);

/* ISO string, epoch ms or Firestore Timestamp to epoch ms (0 when missing). */
const toMillis = (v) => {
    if (!v) return 0;
    if (typeof v === 'number') return v;
    if (typeof v.toMillis === 'function') return v.toMillis();
    if (typeof v._seconds === 'number') return v._seconds * 1000;
    const t = Date.parse(v);
    return Number.isNaN(t) ? 0 : t;
};
const joinedAt = (c) => toMillis(c.createdAt || c.joinedAt);

const EMPTY_ME = { approved: 0, pending: 0, month: 0, tier: null, rank: 0, monthRank: 0, row: null, monthRow: null };

const publicCard = (c) => ({
    uid: c.uid,
    name: c.name || c.displayName || '',
    instagram: c.instagram || '',
    profilePicture: c.profilePicture || c.instagramProfilePic || c.profilePic || c.photoURL || '',
    profileStatus: c.profileStatus || '',
});

/* `all`: every creator doc as { ...data, id, uid }. */
export function buildCreatorReferrals(all, callerUid, now = Date.now()) {
    const me = all.find(c => c.id === callerUid || c.uid === callerUid);
    if (!me) return { referrals: [], leaderboard: [], monthLeaderboard: [], me: EMPTY_ME, myRank: 0, referrers: 0 };

    const uidMap = new Map();
    const creatorIdMap = new Map();
    const instagramMap = new Map();
    const linkedinMap = new Map();
    all.forEach(c => {
        uidMap.set(c.uid, c);
        if (c.creatorId) creatorIdMap.set(String(c.creatorId).toUpperCase(), c);
        if (c.instagram) instagramMap.set(String(c.instagram).toLowerCase().replace(/^@/, ''), c);
        if (c.linkedin) linkedinMap.set(String(c.linkedin).toLowerCase(), c);
    });
    const referrerOf = (c) => {
        const ref = String(c.referredBy || '').trim();
        if (!ref) return null;
        return uidMap.get(ref) || creatorIdMap.get(ref.toUpperCase())
            || instagramMap.get(ref.toLowerCase().replace(/^@/, '')) || linkedinMap.get(ref.toLowerCase()) || null;
    };

    const monthStart = monthStartIST(now);
    const tally = new Map();
    const mine = [];
    all.forEach(c => {
        const referrer = referrerOf(c);
        if (!referrer || referrer.uid === c.uid) return; // no self-referrals
        const t = tally.get(referrer.uid) || { approved: 0, pending: 0, month: 0 };
        if (referralCounts(c)) {
            t.approved++;
            if (joinedAt(c) >= monthStart) t.month++;
        } else if (!c.referralVoid && (!c.profileStatus || AWAITING.has(c.profileStatus))) {
            t.pending++;
        }
        tally.set(referrer.uid, t);
        if (referrer.uid === me.uid) mine.push(c);
    });

    // Equal scores share a rank (1, 2, 2, 4…).
    const rank = (key) => {
        const rows = all
            .filter(c => c.profileStatus === 'approved' && tally.get(c.uid)?.[key] > 0)
            .map(c => {
                const t = tally.get(c.uid);
                return { ...publicCard(c), approved: t.approved, pending: t.pending, month: t.month, score: t[key], tier: tierFor(t.approved)?.id || null };
            })
            .sort((a, b) => b.score - a.score || b.approved - a.approved || a.name.localeCompare(b.name));
        rows.forEach((r, i) => { r.rank = i > 0 && rows[i - 1].score === r.score ? rows[i - 1].rank : i + 1; });
        return rows;
    };
    const allTime = rank('approved');
    const thisMonth = rank('month');
    const row = allTime.find(r => r.uid === me.uid) || null;
    const monthRow = thisMonth.find(r => r.uid === me.uid) || null;
    const counts = tally.get(me.uid) || { approved: 0, pending: 0, month: 0 };

    return {
        referrals: mine
            .sort((a, b) => joinedAt(b) - joinedAt(a))
            .map(c => ({ ...publicCard(c), counts: referralCounts(c), voided: Boolean(c.referralVoid) })),
        leaderboard: allTime.slice(0, 10),
        monthLeaderboard: thisMonth.slice(0, 10),
        me: { ...counts, tier: tierFor(counts.approved)?.id || null, rank: row?.rank || 0, monthRank: monthRow?.rank || 0, row, monthRow },
        myRank: row?.rank || 0,
        referrers: allTime.length,
        monthStart: new Date(monthStart).toISOString(),
    };
}

/*
 * Only creators that take part in referrals matter to the answer: whoever names a
 * referrer, and whoever is named. The pool keeps just those, with just the fields
 * buildCreatorReferrals reads, so it can be cached instead of reading every
 * creator per request. A caller outside the pool is added back from their own doc.
 */
const POOL_FIELDS = ['id', 'uid', 'creatorId', 'instagram', 'linkedin', 'referredBy', 'referralVoid', 'profileStatus',
    'createdAt', 'joinedAt', 'name', 'displayName', 'profilePicture', 'instagramProfilePic', 'profilePic', 'photoURL'];

const slim = (c) => {
    const out = {};
    POOL_FIELDS.forEach(k => {
        let v = c[k];
        if (v === undefined || v === null || v === '') return;
        if (k === 'createdAt' || k === 'joinedAt') v = toMillis(v) || undefined;
        if (v !== undefined) out[k] = v;
    });
    return out;
};

export function referralPool(all) {
    const uidMap = new Map();
    const creatorIdMap = new Map();
    const instagramMap = new Map();
    const linkedinMap = new Map();
    all.forEach(c => {
        uidMap.set(c.uid, c);
        if (c.creatorId) creatorIdMap.set(String(c.creatorId).toUpperCase(), c);
        if (c.instagram) instagramMap.set(String(c.instagram).toLowerCase().replace(/^@/, ''), c);
        if (c.linkedin) linkedinMap.set(String(c.linkedin).toLowerCase(), c);
    });
    const keep = new Map();
    all.forEach(c => {
        const ref = String(c.referredBy || '').trim();
        if (!ref) return;
        keep.set(c.id, c);
        const referrer = uidMap.get(ref) || creatorIdMap.get(ref.toUpperCase())
            || instagramMap.get(ref.toLowerCase().replace(/^@/, '')) || linkedinMap.get(ref.toLowerCase());
        if (referrer) keep.set(referrer.id, referrer);
    });
    return [...keep.values()].map(slim);
}

const POOL_TTL_MS = 10 * 60 * 1000;
const POOL_MAX_BYTES = 900 * 1024;
let memoryPool = { at: 0, pool: null };

/*
 * The referral pool, built from every creator at most once per ten minutes:
 * kept in this instance's memory and in system_stats/creator_referrals for the
 * others.
 */
export async function loadReferralPool(db, { now = Date.now() } = {}) {
    const ttl = POOL_TTL_MS;
    if (memoryPool.pool && now - memoryPool.at < ttl) return memoryPool.pool;
    const ref = db.collection('system_stats').doc('creator_referrals');
    try {
        const snap = await ref.get();
        const d = snap.exists ? snap.data() : null;
        if (d?.pool && now - (d.builtAt || 0) < ttl) {
            const pool = JSON.parse(d.pool);
            memoryPool = { at: d.builtAt, pool };
            return pool;
        }
    } catch (e) {
        console.warn('[referrals] cached pool:', e.message);
    }
    const creatorsSnap = await db.collection('creators').get();
    const pool = referralPool(creatorsSnap.docs.map(d => ({ ...d.data(), id: d.id, uid: d.data().uid || d.id })));
    memoryPool = { at: now, pool };
    const json = JSON.stringify(pool);
    if (json.length < POOL_MAX_BYTES) await ref.set({ builtAt: now, pool: json }).catch(e => console.warn('[referrals] save pool:', e.message));
    return pool;
}

export const resetReferralPoolForTests = () => { memoryPool = { at: 0, pool: null }; };

/* The caller's creator doc, in the shape the pool keeps (null when they aren't a creator). */
export async function callerForReferrals(db, uid) {
    const own = await db.collection('creators').doc(uid).get();
    if (own.exists) return slim({ ...own.data(), id: own.id, uid: own.data().uid || own.id });
    const q = await db.collection('creators').where('uid', '==', uid).limit(1).get();
    if (q.empty) return null;
    const d = q.docs[0];
    return slim({ ...d.data(), id: d.id, uid: d.data().uid || d.id });
}
