/*
 * Referral tiers. A referral counts once the creator you invited is approved
 * (by an admin, or by the Instagram check) and an admin hasn't voided it.
 * The server (creator-referrals in api/creator-join.js) works the counts out
 * on every read; the browser never writes them. Tier rewards are ones Newbi
 * can always give (badges and shortlisting priority); Newbi points for vouchers
 * come later and will be credited by the server too.
 */

export const REFERRAL_TIERS = [
    { id: 'scout', label: 'Scout', min: 1, tone: 'blue', reward: 'Scout badge on your creator profile' },
    { id: 'connector', label: 'Connector', min: 3, tone: 'violet', reward: 'Priority when we shortlist creators for campaigns' },
    { id: 'ambassador', label: 'Ambassador', min: 5, tone: 'amber', reward: 'Top priority when brands pick creators' },
    { id: 'partner', label: 'Partner', min: 10, tone: 'pink', reward: 'First call when a paid brief opens' },
];

const BY_ID = new Map(REFERRAL_TIERS.map(t => [t.id, t]));
export const tierById = (id) => BY_ID.get(id) || null;

/* Whether a referred creator counts towards their referrer's tier. */
export const referralCounts = (referred) => referred?.profileStatus === 'approved' && !referred?.referralVoid;

/* The highest tier reached with `approved` counted referrals, or null. */
export const tierFor = (approved) => {
    let tier = null;
    for (const t of REFERRAL_TIERS) if (approved >= t.min) tier = t;
    return tier;
};

export const nextTierFor = (approved) => REFERRAL_TIERS.find(t => approved < t.min) || null;

/* The tier now, the next one and how far along the way there you are (0–1). */
export const tierProgress = (approved) => {
    const n = Math.max(0, Number(approved) || 0);
    const tier = tierFor(n);
    const next = nextTierFor(n);
    const from = tier?.min || 0;
    return {
        tier,
        next,
        toNext: next ? next.min - n : 0,
        ratio: next ? (n - from) / (next.min - from) : 1,
    };
};

/* Start of the current calendar month in India, as epoch ms. Monthly boards reset then. */
export const monthStartIST = (now = Date.now()) => {
    const IST = 330 * 60000;
    const d = new Date(now + IST);
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1) - IST;
};
