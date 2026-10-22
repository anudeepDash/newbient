/*
 * Campaign deliverables: the one rule for "required", and where a creator's
 * submission lives. Shared by the app, the admin and the server.
 *
 * A task is optional only when it says so (priority 'optional', or the older
 * required: false). Anything else, including no priority at all, is required.
 * This replaces three checks that disagreed (the old dashboard used
 * `required !== false`, the card `priority !== 'optional'`, and the modal's
 * badge `priority === 'required'`, which labelled unset tasks "Optional").
 */
export const isRequiredTask = (task = {}) => {
    const priority = String(task?.priority || '').trim().toLowerCase();
    if (priority === 'optional') return false;
    if (task?.required === false) return false;
    return true;
};

export const requiredTasks = (tasks = []) => (tasks || []).filter(isRequiredTask);

/*
 * Whether creators can submit a deliverable yet. The team opens deliverables one
 * at a time (campaign editor, or the Deliverables tab); until then creators see
 * it with "Opens soon" and the server refuses submissions. New deliverables start
 * closed (submissionsOpen: false); older ones, saved before this existed, stay open.
 */
export const isTaskOpen = (task = {}) => task?.submissionsOpen !== false;

/*
 * When a deliverable is done, the team closes it (submissionsClosed): creators see
 * "Closed", the brief goes, and those who sent something see it and its status.
 * The deadline alone never closes it. So a deliverable is in one of three states:
 * 'upcoming' (not opened yet: "Opens soon"), 'open', or 'closed'.
 */
export const isTaskClosed = (task = {}) => task?.submissionsClosed === true;
export const taskWindow = (task = {}) => {
    if (isTaskClosed(task)) return 'closed';
    return isTaskOpen(task) ? 'open' : 'upcoming';
};
/* The fields that put a deliverable in that state (campaign editor, Deliverables tab). */
export const taskWindowFields = (phase) => ({ submissionsOpen: phase !== 'upcoming', submissionsClosed: phase === 'closed' });

/*
 * Deliverables that just opened between two versions of a campaign's tasks: from
 * "Opens soon" to open, or added already open. Reopening a closed one doesn't
 * count. Their creators get the campaign_posts_open message (api/_lib/postsOpen.js).
 */
export const openedTaskIds = (before = [], after = []) => {
    const was = new Map((before || []).map(t => [String(t?.id), taskWindow(t)]));
    return (after || [])
        .filter(t => t && taskWindow(t) === 'open' && !['open', 'closed'].includes(was.get(String(t.id))))
        .map(t => String(t.id));
};

/*
 * Whether a creator can send (or resend) this deliverable now: while it's open, or
 * once it's closed only when the team asked for changes on what they'd already sent.
 */
export const canSubmitTask = (task = {}, status = 'not_started') => {
    const phase = taskWindow(task);
    return phase === 'open' || (phase === 'closed' && status === 'rejected');
};

export const optionalTasks = (tasks = []) => (tasks || []).filter(t => !isRequiredTask(t));

/*
 * Submissions now live in campaigns/{id}/submissions/{uid}:
 *   { uid, campaignId, tasks: { [taskId]: { status, contentLink, proofUrl, note, submittedAt, reviewedAt, rejectionReason } } }
 * Older ones sit on the campaign doc (task.submissions[key], verifiedBy[],
 * completedBy[]) and stay readable. The new record wins when both exist.
 */
export const SUBMISSION_STATUSES = ['not_started', 'submitted', 'approved', 'rejected'];

export function submissionFor(task, { uid, keys = [], record = null } = {}) {
    const fromRecord = record?.tasks?.[String(task?.id)];
    if (fromRecord?.status) return { ...fromRecord, source: 'app' };
    const candidates = Array.from(new Set([uid, ...keys].filter(Boolean)));
    for (const key of candidates) {
        const legacy = task?.submissions?.[key];
        if (legacy?.status) return { ...legacy, source: 'legacy', key };
    }
    for (const key of candidates) {
        if ((task?.verifiedBy || []).includes(key)) return { status: 'approved', source: 'legacy', key };
        if ((task?.completedBy || []).includes(key)) return { status: 'submitted', source: 'legacy', key };
    }
    return null;
}

export const statusFor = (task, who) => submissionFor(task, who)?.status || 'not_started';

/* Progress over a campaign's tasks for one creator. */
export function taskProgress(campaign, who) {
    const items = (campaign?.tasks || []).map(task => ({ task, required: isRequiredTask(task), status: statusFor(task, who) }));
    const required = items.filter(i => i.required);
    return {
        items,
        total: items.length,
        approved: items.filter(i => i.status === 'approved').length,
        submitted: items.filter(i => i.status === 'submitted').length,
        changes: items.filter(i => i.status === 'rejected').length,
        todo: items.filter(i => i.status === 'not_started' || i.status === 'rejected').length,
        requiredCount: required.length,
        requiredDone: required.length > 0 && required.every(i => i.status === 'approved'),
    };
}
