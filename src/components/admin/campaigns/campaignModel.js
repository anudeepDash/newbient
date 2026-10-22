import Camera from 'lucide-react/dist/esm/icons/camera';
import Eye from 'lucide-react/dist/esm/icons/eye';
import Video from 'lucide-react/dist/esm/icons/video';
import MapPin from 'lucide-react/dist/esm/icons/map-pin';
import Layers from 'lucide-react/dist/esm/icons/layers';
import Instagram from 'lucide-react/dist/esm/icons/instagram';
import Youtube from 'lucide-react/dist/esm/icons/youtube';
import Twitter from 'lucide-react/dist/esm/icons/twitter';
import Globe from 'lucide-react/dist/esm/icons/globe';
import { isCampaignCityMatch, nicheKey } from '../../../lib/constants';
import { toMillis } from '../creatorPortal/creatorUtils';
import { isRequiredTask } from '../../../lib/creator/tasks';

/*
 * Campaign rules shared by the list, the editor and the manage screen.
 *
 * Where things live (unchanged from before, so old records keep working):
 *   campaign doc      title, brand, description, tasks[], status 'Open' | 'Closed' | 'Draft', …
 *   task.submissions  { [creator uid or id]: { status: 'submitted' | 'approved' | 'rejected', contentLink, proofUrl, … } }
 *                     App submissions live in campaigns/{id}/submissions/{uid}; the store merges
 *                     them in here (store: 'app'), so these screens read both.
 *                     Sheet guests (people from an uploaded sheet who aren't on Newbi) are kept there
 *                     too, as submissions/sheet-ig-{handle} or sheet-p-{phone}: staff-only, so their
 *                     contact details never reach the public campaign doc. See guestCreatorFor.
 *   creator doc       joinedCampaigns[] (applied), shortlistedCampaigns[] (shortlisted by the team: sees and
 *                     submits the deliverables; applying never adds to it)
 * New, admin-only, on the creator doc:
 *   campaignStages   { [campaignId]: 'shortlisted' (shown as "Considering") | 'declined' | null }
 *   campaignWelcome  { [campaignId]: { sentAt, channels } }   written by the server's shortlist welcome
 *   campaignPayouts  { [campaignId]: { status: 'paid', amount, paidAt, note } | null }
 */

export const TASK_TYPES = [
    { value: 'story', label: 'Story', icon: Eye },
    { value: 'reel', label: 'Reel', icon: Video },
    { value: 'content_post', label: 'Feed post', icon: Camera },
    { value: 'visit_event', label: 'Event visit', icon: MapPin },
    { value: 'custom', label: 'Custom', icon: Layers },
];

export const PLATFORMS = [
    { value: 'instagram', label: 'Instagram', icon: Instagram },
    { value: 'youtube', label: 'YouTube', icon: Youtube },
    { value: 'twitter', label: 'Twitter / X', icon: Twitter },
    { value: 'other', label: 'Other', icon: Globe },
];

export const taskTypeOf = (type) => TASK_TYPES.find(t => t.value === type) || TASK_TYPES[TASK_TYPES.length - 1];
export const platformOf = (p) => PLATFORMS.find(x => x.value === p) || PLATFORMS[0];

let idSeed = 0;
export const newTaskId = () => `${Date.now()}${(idSeed++ % 1000).toString().padStart(3, '0')}`;

/** A fresh deliverable. `kind` picks sensible titles and button labels. */
export const blankTask = (kind = 'custom', existing = []) => {
    const count = (match) => existing.filter(t => t.taskType === match).length + 1;
    const presets = {
        story: { title: `Instagram story ${count('story')}`, ticketLabel: 'Add this ticket link (story sticker)', referencePostLabel: 'Repost this poster' },
        reel: { title: `Instagram reel ${count('reel')}`, referencePostLabel: 'Audio or reel to remix' },
        content_post: { title: `Instagram feed post ${count('content_post')}`, referencePostLabel: 'Reference post' },
        visit_event: { title: `Visit the event ${count('visit_event') > 1 ? count('visit_event') : ''}`.trim() },
        custom: { title: `Deliverable ${existing.length + 1}` },
    };
    return {
        id: newTaskId(),
        title: '',
        description: '',
        taskType: kind,
        platform: 'instagram',
        priority: 'required',
        // Closed until the team opens it (isTaskOpen): creators see it, but can't submit yet.
        submissionsOpen: false,
        deadline: '',
        googleFormLink: '',
        googleFormLabel: '',
        ticketLink: '',
        ticketLabel: '',
        creativeLink: '',
        creativeLabel: '',
        referencePostUrl: '',
        referencePostLabel: '',
        taskLinks: [],
        creativeAssets: [],
        creativeLinks: [],
        submissions: {},
        ...(presets[kind] || presets.custom),
    };
};

/* ---------- campaign status ---------- */

export const campaignStatus = (c) => {
    const s = String(c?.status || 'Open').toLowerCase();
    if (s === 'open') return 'open';
    if (s === 'draft') return 'draft';
    // Live: the event is running. Applications are closed, the shortlist keeps working.
    if (s === 'live') return 'live';
    return 'closed';
};

export const CAMPAIGN_STATUS = {
    open: { label: 'Open', tone: 'green' },
    draft: { label: 'Draft', tone: 'gray' },
    closed: { label: 'Closed', tone: 'rose' },
    live: { label: 'Live', tone: 'amber' },
};

/* ---------- money and dates ---------- */

export const inr = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;

/** First rupee amount in free text like "₹5,000 + products" → 5000. */
export const amountFromText = (text) => {
    const m = String(text || '').replace(/,/g, '').match(/(\d+(?:\.\d+)?)\s*(k|K)?/);
    if (!m) return 0;
    return Math.round(Number(m[1]) * (m[2] ? 1000 : 1));
};

export const payoutDefault = (campaign) => Number(campaign?.payoutPerCreator) || amountFromText(campaign?.reward) || 0;

/** "2026-10-20" is a calendar day: read it in local time so IST never shifts it. */
export const parseDay = (value) => {
    if (!value) return null;
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(`${value}T00:00:00`);
    const ms = toMillis(value);
    return ms ? new Date(ms) : null;
};

export const formatDay = (value, withYear = false) => {
    const d = parseDay(value);
    if (!d) return '';
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', ...(withYear ? { year: 'numeric' } : {}) });
};

export const toDayInput = (value) => {
    const d = parseDay(value);
    if (!d) return '';
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const daysUntil = (value) => {
    const d = parseDay(value);
    if (!d) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.round((d.getTime() - today.getTime()) / 86400000);
};

export const formatCount = (n) => {
    const num = Number(n) || 0;
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
    return num.toLocaleString('en-IN');
};

/* ---------- creators ---------- */

export const creatorKeys = (c) => Array.from(new Set([c?.uid, c?.id].filter(Boolean)));
export const creatorRef = (c) => c?.uid || c?.id || '';
export const creatorHandle = (c) => String(c?.instagram || '').replace(/^@/, '').trim();
export const creatorPhotoOf = (c) => c?.profilePicture || c?.instagramProfilePic || c?.profilePic || c?.photoURL || c?.avatar || c?.profile_pic_url || '';
export const creatorNiches = (c) => {
    const list = Array.isArray(c?.specializations) ? c.specializations : (Array.isArray(c?.niches) ? c.niches : []);
    return [...list, c?.category, c?.niche].filter(Boolean);
};

export const isUniversalCity = (city) => isCampaignCityMatch(city, '');

export const criteriaFor = (campaign, creator) => {
    const min = Number(campaign?.minInstagramFollowers || 0);
    const followers = Number(creator?.instagramFollowers || 0);
    const meetsFollowers = min <= 0 || followers >= min;
    const meetsCity = isCampaignCityMatch(campaign?.targetCity, creator?.city);
    const wanted = (campaign?.preferredNiches || []).map(nicheKey);
    const nicheMatch = wanted.length > 0 && creatorNiches(creator).some(n => wanted.includes(nicheKey(n)));
    return { followers, min, meetsFollowers, meetsCity, eligible: meetsFollowers && meetsCity, nicheMatch, cityTargeted: !isUniversalCity(campaign?.targetCity) };
};

/** The submission for a creator on a task (submissions may be keyed by uid or profile id). */
export const submissionOf = (task, creator) => {
    // Some submissions were saved under both the creator's login uid and profile
    // id, and older reviews only updated one of them. Use the newest.
    const found = creatorKeys(creator)
        .map(key => (task?.submissions?.[key]?.status ? { ...task.submissions[key], key } : null))
        .filter(Boolean)
        .sort((a, b) => toMillis(b.reviewedAt || b.submittedAt) - toMillis(a.reviewedAt || a.submittedAt));
    if (found.length) return found[0];
    for (const key of creatorKeys(creator)) {
        if ((task?.verifiedBy || []).includes(key)) return { status: 'approved', key, legacy: true };
        if ((task?.completedBy || []).includes(key)) return { status: 'submitted', key, legacy: true };
    }
    return null;
};

export const progressFor = (campaign, creator) => {
    const tasks = campaign?.tasks || [];
    const items = tasks.map(task => {
        const sub = submissionOf(task, creator);
        return { task, sub, status: sub?.status || 'not_started' };
    });
    const required = items.filter(i => isRequiredTask(i.task));
    return {
        items,
        // Test submissions (developers trying the flow) are reviewable but never counted as work waiting.
        toReview: items.filter(i => i.status === 'submitted' && !i.sub?.test).length,
        approved: items.filter(i => i.status === 'approved').length,
        changes: items.filter(i => i.status === 'rejected').length,
        total: items.length,
        requiredDone: required.length > 0 && required.every(i => i.status === 'approved'),
    };
};

export const isSelected = (campaign, creator) => (creator?.shortlistedCampaigns || []).includes(campaign?.id);
export const hasApplied = (campaign, creator) => (creator?.joinedCampaigns || []).includes(campaign?.id) || isSelected(campaign, creator);
export const payoutOf = (campaign, creator) => creator?.campaignPayouts?.[campaign?.id] || null;
export const isPaid = (campaign, creator) => payoutOf(campaign, creator)?.status === 'paid';

export const STAGES = [
    { value: 'applied', label: 'Applied', tone: 'blue', hint: 'Waiting for a decision' },
    // 'shortlisted' is the team's private pick list (campaignStages); 'selected' is the real shortlist
    // (creator.shortlistedCampaigns): told, sees the deliverables, the only ones who can submit.
    { value: 'shortlisted', label: 'Considering', tone: 'violet', hint: 'Your private list, not told yet' },
    { value: 'selected', label: 'Shortlisted', tone: 'pink', hint: 'Told, working on the deliverables' },
    { value: 'review', label: 'To review', tone: 'amber', hint: 'Sent content for review' },
    { value: 'approved', label: 'Approved', tone: 'green', hint: 'All required tasks approved' },
    { value: 'paid', label: 'Paid', tone: 'teal', hint: 'Payment recorded' },
    { value: 'declined', label: 'Not selected', tone: 'gray', hint: 'Passed on this time' },
];
export const stageMeta = (v) => STAGES.find(s => s.value === v) || STAGES[0];

export const stageOf = (campaign, creator, progress = progressFor(campaign, creator)) => {
    if (isPaid(campaign, creator)) return 'paid';
    if (isSelected(campaign, creator)) {
        if (progress.toReview > 0) return 'review';
        if (progress.requiredDone) return 'approved';
        return 'selected';
    }
    // Content waiting for review counts even from someone who wasn't shortlisted
    // (the old flow let anyone who joined submit).
    if (progress.toReview > 0) return 'review';
    const stage = creator?.campaignStages?.[campaign?.id];
    if (stage === 'declined') return 'declined';
    if (stage === 'shortlisted') return 'shortlisted';
    return 'applied';
};

/**
 * Every key (login uid or profile id) with a submission on any of the campaign's
 * deliverables. Submissions are kept even when the person never joined or was
 * never shortlisted, so they must count wherever applicants are listed.
 */
export const submitterKeys = (campaign) => {
    const keys = new Set();
    (campaign?.tasks || []).forEach(t => {
        Object.entries(t?.submissions || {}).forEach(([k, s]) => { if (s?.status) keys.add(k); });
        [...(t?.completedBy || []), ...(t?.verifiedBy || [])].forEach(k => { if (k) keys.add(k); });
    });
    return keys;
};

/** Every applicant of a campaign, plus anyone who submitted work, with stage, progress and criteria worked out once. */
export const applicantsFor = (campaign, creators) => {
    const submitted = submitterKeys(campaign);
    return (creators || [])
        .filter(c => hasApplied(campaign, c) || creatorKeys(c).some(k => submitted.has(k)))
        .map(creator => {
            const progress = progressFor(campaign, creator);
            return { creator, key: creatorRef(creator), progress, stage: stageOf(campaign, creator, progress), criteria: criteriaFor(campaign, creator), payout: payoutOf(campaign, creator) };
        });
};

/* ---------- sheet guests ---------- */

export const isGuestKey = (key) => /^sheet-(ig|p)-/.test(String(key || ''));
/** A sheet guest's key: their handle (dots as dashes, since IG handles never have a dash), or their phone. */
export const guestKeyFor = ({ handle, phone } = {}) => {
    const h = String(handle || '').toLowerCase();
    if (/^[a-z0-9._]{1,30}$/.test(h)) return `sheet-ig-${h.replace(/\./g, '-')}`;
    const p = String(phone || '').replace(/\D/g, '').slice(-10);
    return p.length === 10 ? `sheet-p-${p}` : null;
};
/** A stand-in creator for a sheet guest, from what their sheet records carry ({ name, instagram }). */
export const guestCreatorFor = (campaign, key) => {
    const info = (campaign?.tasks || []).map(t => t?.submissions?.[key]?.guest).find(Boolean) || {};
    const handle = info.instagram || (String(key).startsWith('sheet-ig-') ? String(key).slice(9).replace(/-/g, '.') : '');
    return { id: key, uid: key, name: info.name || '', instagram: handle, orphan: true, guest: true };
};

/**
 * Submissions whose key matches no creator profile: an old profile that was never
 * linked to the person's login (scripts/migrate-creators-to-uid.mjs fixes those).
 * Shown in Deliverables so the work can still be reviewed; never treated as a
 * creator profile (no applicant actions on them).
 */
export const orphanSubmitters = (campaign, creators) => {
    const known = new Set();
    (creators || []).forEach(c => creatorKeys(c).forEach(k => known.add(k)));
    return [...submitterKeys(campaign)].filter(k => !known.has(k)).map(key => {
        const creator = isGuestKey(key) ? guestCreatorFor(campaign, key) : { id: key, uid: key, name: '', orphan: true };
        const progress = progressFor(campaign, creator);
        return { creator, key, progress, stage: progress.toReview > 0 ? 'review' : 'applied', criteria: { eligible: false }, payout: null, orphan: true };
    });
};

/**
 * campaignId → creators who applied or were selected, in one pass. With
 * `campaigns`, also anyone who submitted work to one, including submissions
 * that match no creator profile (as a stand-in, so counts like "to review" are right).
 */
export const indexApplicants = (creators, campaigns = []) => {
    const map = new Map();
    const add = (id, c) => {
        if (!map.has(id)) map.set(id, []);
        if (!map.get(id).includes(c)) map.get(id).push(c);
    };
    (creators || []).forEach(c => {
        new Set([...(c.joinedCampaigns || []), ...(c.shortlistedCampaigns || [])]).forEach(id => add(id, c));
    });
    if (campaigns?.length) {
        const byKey = new Map();
        (creators || []).forEach(c => creatorKeys(c).forEach(k => byKey.set(k, c)));
        campaigns.forEach(campaign => submitterKeys(campaign).forEach(k => {
            add(campaign.id, byKey.get(k) || (isGuestKey(k) ? guestCreatorFor(campaign, k) : { id: k, uid: k, name: '', orphan: true }));
        }));
    }
    return map;
};

export const summarize = (campaign, applicantCreators) => {
    const counts = Object.fromEntries(STAGES.map(s => [s.value, 0]));
    let toReview = 0;
    let paidOut = 0;
    let selected = 0;
    let undecided = 0;
    (applicantCreators || []).forEach(creator => {
        const progress = progressFor(campaign, creator);
        const stage = stageOf(campaign, creator, progress);
        counts[stage] += 1;
        toReview += progress.toReview;
        const payout = payoutOf(campaign, creator);
        if (payout?.status === 'paid') paidOut += Number(payout.amount) || 0;
        // Shortlisted means actually shortlisted, not just "has work to review".
        if (isSelected(campaign, creator) || stage === 'paid') selected += 1;
        else if (!creator.orphan && stage !== 'declined') undecided += 1;
    });
    return {
        counts,
        applicants: (applicantCreators || []).filter(c => !c.orphan).length,
        undecided,
        selected,
        toReview,
        paidOut,
        committed: selected * (Number(campaign?.payoutPerCreator) || 0),
        created: toMillis(campaign?.createdAt || campaign?.dateAdded || campaign?.updatedAt),
    };
};

/** WhatsApp number in international form, or ''. */
export const waNumber = (phone) => {
    const digits = String(phone || '').replace(/\D/g, '');
    if (!digits) return '';
    if (digits.length === 10) return `91${digits}`;
    if (digits.length === 11 && digits.startsWith('0')) return `91${digits.slice(1)}`;
    return digits;
};

export const stripHtml = (html) => String(html || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
