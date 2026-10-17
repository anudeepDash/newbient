import { isRequiredTask } from '../creator/tasks.js';

/*
 * Outreach deliverables (Phase 3): what each creator posts, checked against
 * the campaign's own deliverables list (campaign.tasks, set in the editor).
 * Their submissions live on the application:
 *
 *   application.deliverables[taskId] = {
 *       status: 'submitted' | 'approved' | 'rejected',
 *       link, screenshotUrl, note, submittedAt, reviewedAt, reviewedBy, reason,
 *       history: [{ status, at, by, reason? }]   (newest last, capped)
 *   }
 *
 * Shared by the creator's page, the admin review and the server, which has the
 * final say.
 */

export const DELIVERABLE_STATUS = {
    not_started: { label: 'Not sent yet', tone: 'gray' },
    submitted: { label: 'To review', tone: 'amber' },
    approved: { label: 'Approved', tone: 'green' },
    rejected: { label: 'Changes asked', tone: 'rose' },
};

/* What proof a task takes: a post link, a screenshot (stories vanish), or either. */
export const proofKind = (task) => {
    const t = String(task?.taskType || '').toLowerCase();
    if (t === 'reel' || t === 'content_post') return 'link';
    if (t === 'story') return 'screenshot';
    return 'either';
};

export const deliverablesFor = (campaign) => (Array.isArray(campaign?.tasks) ? campaign.tasks : [])
    .filter(t => t && t.id !== undefined && t.id !== null)
    .map(t => ({
        id: String(t.id),
        title: String(t.title || 'Deliverable').trim(),
        description: String(t.description || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 500),
        taskType: t.taskType || 'custom',
        required: isRequiredTask(t),
        deadline: t.deadline || '',
        proof: proofKind(t),
    }));

const POST_LINK = /^https:\/\/(?:www\.|m\.)?instagram\.com\/(?:[a-z0-9._]{1,30}\/)?(?:reel|reels|p|tv)\/[A-Za-z0-9_-]{5,}\/?(?:\?.*)?$/i;
const SCREENSHOT = /^https:\/\/res\.cloudinary\.com\/[a-z0-9_-]+\/image\/upload\/\S+$/i;

export const isPostLink = (url) => POST_LINK.test(String(url || '').trim());
export const isScreenshotUrl = (url) => SCREENSHOT.test(String(url || '').trim());

/** → { ok, value: { link, screenshotUrl, note }, errors } */
export const validateSubmission = (task, input = {}) => {
    const errors = {};
    const link = String(input.link || '').trim().slice(0, 500);
    const screenshotUrl = String(input.screenshotUrl || '').trim().slice(0, 500);
    const note = String(input.note || '').replace(/\s+/g, ' ').trim().slice(0, 500);
    const kind = proofKind(task);
    if (link && !isPostLink(link)) errors.link = 'Paste the Instagram post or reel link, like https://www.instagram.com/reel/…';
    if (screenshotUrl && !isScreenshotUrl(screenshotUrl)) errors.screenshotUrl = 'The screenshot didn’t upload. Try again.';
    if (kind === 'link' && !link && !errors.link) errors.link = 'Paste the link to your post.';
    if (kind === 'screenshot' && !screenshotUrl && !errors.screenshotUrl) errors.screenshotUrl = 'Add a screenshot of your story.';
    if (kind === 'either' && !link && !screenshotUrl) errors.link = 'Add a link or a screenshot.';
    return { ok: Object.keys(errors).length === 0, value: { link, screenshotUrl, note }, errors };
};

/** Where one application stands on the campaign's deliverables. */
export const deliverableSummary = (campaign, application) => {
    const tasks = deliverablesFor(campaign);
    const subs = application?.deliverables || {};
    const items = tasks.map(task => ({ task, sub: subs[task.id] || null, status: subs[task.id]?.status || 'not_started' }));
    const required = items.filter(i => i.task.required);
    return {
        items,
        total: items.length,
        toReview: items.filter(i => i.status === 'submitted').length,
        approved: items.filter(i => i.status === 'approved').length,
        requiredCount: required.length,
        requiredApproved: required.filter(i => i.status === 'approved').length,
        allRequiredApproved: required.length > 0 && required.every(i => i.status === 'approved'),
    };
};

/*
 * The deliverables that come before the event, for releasing tickets: required
 * ones due on or before the event date. Without dates, every required one
 * except "visit the event" (which can only happen at the event).
 */
export const preEventTasks = (campaign) => {
    const required = deliverablesFor(campaign).filter(t => t.required && t.taskType !== 'visit_event');
    const event = String(campaign?.eventDate || '').slice(0, 10);
    const dated = event ? required.filter(t => t.deadline && String(t.deadline).slice(0, 10) <= event) : [];
    return dated.length ? dated : required;
};

export const preEventApproved = (campaign, application) => {
    const tasks = preEventTasks(campaign);
    const subs = application?.deliverables || {};
    return tasks.length > 0 && tasks.every(t => subs[t.id]?.status === 'approved');
};

/* ── Tickets ──────────────────────────────────────────────────────────── */

export const TICKET_RULES = [
    { value: 'deliverables', label: 'When their pre-event deliverables are approved' },
    { value: 'joined', label: 'When they tap Joined' },
    { value: 'manual', label: 'Only when I release them' },
];
export const ticketRuleOf = (settings) => (TICKET_RULES.some(r => r.value === settings?.ticketRule) ? settings.ticketRule : 'deliverables');

export const TICKET_STATUS = {
    pending: { label: 'Ticket not sent', tone: 'gray' },
    released: { label: 'Ticket sent', tone: 'green' },
    revoked: { label: 'Ticket revoked', tone: 'rose' },
};

/* ── Payouts ──────────────────────────────────────────────────────────── */

export const PAYOUT_METHODS = [
    { value: 'upi', label: 'UPI' },
    { value: 'bank', label: 'Bank transfer' },
    { value: 'cash', label: 'Cash' },
    { value: 'other', label: 'Other' },
];

export const PAYOUT_STATUS = {
    due: { label: 'Payout due', tone: 'amber' },
    paid: { label: 'Paid', tone: 'teal' },
    cancelled: { label: 'Payout cancelled', tone: 'gray' },
};

const UPI = /^[a-z0-9._-]{2,256}@[a-z][a-z0-9.-]{1,64}$/i;
export const normalizeUpi = (v) => {
    const s = String(v || '').trim().toLowerCase();
    return UPI.test(s) ? s : null;
};

/** The tier's cash amount for this person, the default for "Mark paid". */
export const defaultPayoutAmount = (campaign, application) => {
    const cash = Number(campaign?.perksByTier?.[application?.tier]?.cash);
    return Number.isFinite(cash) && cash > 0 ? Math.round(cash) : 0;
};

/** → { ok, value, errors }. Paid needs an amount above 0 and a date; the reference (UTR) is optional but recommended. */
export const validatePayout = (input = {}) => {
    const errors = {};
    const amount = Math.round(Number(String(input.amount ?? '').replace(/[,₹\s]/g, '')));
    if (!Number.isFinite(amount) || amount <= 0 || amount > 10_000_000) errors.amount = 'Enter the amount paid, in rupees.';
    const method = PAYOUT_METHODS.some(m => m.value === input.method) ? input.method : null;
    if (!method) errors.method = 'Choose how it was paid.';
    const paidAt = /^\d{4}-\d{2}-\d{2}$/.test(String(input.paidAt || '')) ? input.paidAt : null;
    if (!paidAt) errors.paidAt = 'Choose the date it was paid.';
    const reference = String(input.reference || '').replace(/\s+/g, '').slice(0, 40);
    if (reference && !/^[A-Za-z0-9-]{4,40}$/.test(reference)) errors.reference = 'Use the UTR or reference as shown in your bank app.';
    const accountType = input.accountType === 'personal' ? 'personal' : 'newbi';
    const note = String(input.note || '').replace(/\s+/g, ' ').trim().slice(0, 300);
    return { ok: Object.keys(errors).length === 0, value: { amount, method, paidAt, reference, accountType, note }, errors };
};
