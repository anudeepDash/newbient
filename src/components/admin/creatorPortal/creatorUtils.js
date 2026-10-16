import { summarize } from '../campaigns/campaignModel';

// Small helpers shared by the admin Creator Portal screens.

// Creators are keyed inconsistently across the app: some documents use the auth
// uid as the doc id, imported/manual ones only have a doc id. Always use this.
export const creatorKey = (c) => (c ? (c.id || c.uid) : '');

export const creatorPhoto = (c) =>
    c?.profilePicture || c?.instagramProfilePic || c?.profilePic || c?.photoURL || '';

export const creatorReach = (c) => Math.max(
    Number(c?.instagramFollowers || 0),
    Number(c?.youtubeSubscribers || 0),
    Number(c?.linkedinFollowers || 0)
);

export const creatorNiche = (c) => {
    const list = Array.isArray(c?.specializations) ? c.specializations : (Array.isArray(c?.niches) ? c.niches : []);
    const first = list[0] || c?.category || c?.niche || '';
    return first === 'Student Creator/ Campus Creator' ? 'Student/ Campus Creator' : first;
};

export const isPendingCreator = (c) => !c?.profileStatus || c.profileStatus === 'pending';

export const isManualFollowerEntry = (c) =>
    Boolean(c?.manualFollowerEntry || c?.isManualFollowerEntry || c?.requiresManualVerification);

export const isBangaloreVariant = (city) => /^bang[al]*o?re$/i.test(String(city || '').trim());

export const isOpenCampaign = (c) => !c?.status || String(c.status).toLowerCase() === 'open';

/**
 * Task submissions waiting for review on a campaign, counted the same way as
 * the campaigns screens (campaigns/campaignModel.js): one per applicant per
 * task, even when a submission was saved under both the creator's uid and
 * profile id. Pass the creators who applied to (or were selected for) it;
 * use campaignModel's indexApplicants to get them for many campaigns.
 */
export const countPendingSubmissions = (campaign, applicantCreators = []) =>
    summarize(campaign, applicantCreators).toReview;

export const toMillis = (raw) => {
    if (!raw) return 0;
    if (typeof raw === 'number') return raw;
    if (typeof raw === 'string') {
        const p = Date.parse(raw);
        return Number.isNaN(p) ? 0 : p;
    }
    if (typeof raw === 'object') {
        if (typeof raw.toDate === 'function') return raw.toDate().getTime();
        if (typeof raw.seconds === 'number') return raw.seconds * 1000;
    }
    return 0;
};

export const formatDate = (raw) => {
    const ms = toMillis(raw);
    if (!ms) return '';
    return new Date(ms).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

export const formatCount = (n) => {
    const num = Number(n) || 0;
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
    return num.toLocaleString();
};
