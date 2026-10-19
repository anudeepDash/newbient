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
