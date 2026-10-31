/**
 * "Posting opens" for campaign creators (WhatsApp template campaign_posts_open),
 * so the campaign start reaches them without anyone messaging each one.
 *
 * A deliverable that isn't open yet can carry an "Opens on" date (task.opensOn,
 * set in the campaign editor). The mail worker (api/mail.js, 09:00 IST) then:
 *   - the day before, tells the creators group "your post can go up from tomorrow, Thursday, 12 November";
 *   - on the day, opens it (submissionsOpen) and tells anyone not told yet.
 * When the team opens a deliverable by hand (Deliverables tab or the editor), the
 * posts-opened event tells them straight away ("…can go up from today").
 *
 * Once campaign_task_live is approved, a task opening today sends its brief
 * instead (task, what to do, links, due date, "Open my task"), to every approved
 * creator (shortlisted onwards) who hasn't sent it in, once per task.
 *
 * Creators group = outreach applications that got the shortlist message (message
 * sent, replied or joined), as for the deadline reminders. One message per person
 * per opening day (the job id), through the outreach queue (rate limit, STOP
 * opt-outs; it skips itself if their posts are already in).
 */
import { APP_URL, getDb, istDate } from './db.js';
import { enqueueJob, kickWorker, runQueue, kindLive } from './outreachQueue.js';
import { formatDeadline } from '../../src/lib/outreach/template.js';
import { approvedSummary } from '../../src/lib/outreach/whatsappTemplate.js';
import { taskWindow, taskWindowFields } from '../../src/lib/creator/tasks.js';
import { WAITING_ON_POSTS, IN, dayOf } from './postReminders.js';
import { isOnShortlist } from '../../src/lib/outreach/status.js';
import { briefLine, linksLine, taskLinksOf } from '../../src/lib/outreach/taskBrief.js';

const DAY = 86_400_000;
const MAX_CAMPAIGNS = 300;
export const NO_DUE_DATE = 'No fixed date';

/* The earliest due date among these posts (their own deadline, else the campaign's). */
const dueLine = (tasks, campaign) => {
    const days = tasks.map(t => dayOf(t.deadline) || dayOf(campaign.postingDeadline)).filter(Boolean).sort();
    return days.length ? formatDeadline(days[0]) || days[0] : NO_DUE_DATE;
};

/* Approved creators (shortlisted onwards) still owing a post: who hears that a task is live. Paid means they're done. */
export const getsTaskLive = (a) => isOnShortlist(a.status) && a.status !== 'paid' && Boolean(a.phone);

/** The campaign_task_live variables for one task (its brief and links on one line each). */
export const taskLiveData = (task, campaign) => ({
    taskIds: [String(task.id)],
    taskTitle: String(task.title || 'Deliverable').trim().slice(0, 80),
    details: briefLine(task),
    links: linksLine(taskLinksOf(task)),
    dueAt: dueLine([task], campaign),
});

/*
 * Queues "this task is live" (the brief itself) for each task, to every approved
 * creator who hasn't sent that post in. One job per person per task (its id), so
 * opening, closing and reopening doesn't send it twice; `again` sends it anyway
 * (the team asked from Outreach → Send on WhatsApp). appIds narrows it to some people.
 * → { queued, skipped: [{ id, reason }] }
 */
export const queueTaskLive = async ({ db = getDb(), campaignId, campaign, tasks, appIds = null, again = false, createdBy = 'Newbi app' }) => {
    const out = { queued: 0, skipped: [] };
    if (!tasks.length) return out;
    const coll = db.collection('campaigns').doc(campaignId).collection('applications');
    const docs = appIds
        ? (await Promise.all(appIds.map(id => coll.doc(id).get()))).filter(d => d.exists)
        : (await coll.get()).docs;
    for (const app of docs) {
        const a = app.data();
        if (!getsTaskLive(a)) {
            if (appIds) out.skipped.push({ id: app.id, reason: !a.phone ? 'no_phone' : 'not_approved' });
            continue;
        }
        for (const t of tasks) {
            if (IN.has(a.deliverables?.[String(t.id)]?.status)) { if (appIds) out.skipped.push({ id: app.id, reason: 'posts_in' }); continue; }
            const jobKey = `task_live_${campaignId}_${app.id}_${t.id}`.slice(0, 140);
            const id = await enqueueJob(db, { id: jobKey, campaignId, appId: app.id, kind: 'task_live', createdBy, again, data: taskLiveData(t, campaign) });
            if (id) out.queued += 1;
            else if (appIds) out.skipped.push({ id: app.id, reason: 'already_sent' });
        }
    }
    return out;
};

/**
 * Queues the notice for everyone in the creators group still owing one of these posts. → how many
 * When a task opens today and campaign_task_live is approved, approved creators get the brief itself instead.
 */
export const queuePostsOpen = async ({ db = getDb(), campaignId, campaign, tasks, day, opensAt }) => {
    if (!tasks.length) return 0;
    if (opensAt === 'today' && kindLive('task_live')) return (await queueTaskLive({ db, campaignId, campaign, tasks })).queued;
    const apps = await db.collection('campaigns').doc(campaignId).collection('applications').get();
    let queued = 0;
    for (const app of apps.docs) {
        const a = app.data();
        if (!WAITING_ON_POSTS.has(a.status) || !a.phone) continue;
        const todo = tasks.filter(t => !IN.has(a.deliverables?.[String(t.id)]?.status));
        if (!todo.length) continue;
        const id = await enqueueJob(db, {
            id: `posts_open_${campaignId}_${app.id}_${day}`.slice(0, 140),
            campaignId, appId: app.id, kind: 'posts_open', createdBy: 'Newbi app',
            data: {
                opensAt,
                whatToPost: approvedSummary(todo.map(t => t.title || 'Deliverable')),
                dueAt: dueLine(todo, campaign),
                taskIds: todo.map(t => String(t.id)),
            },
        });
        if (id) queued += 1;
    }
    return queued;
};

/* The mail worker's daily run: heads-up for tomorrow's openings, and opens today's. */
export const runPostsOpen = async ({ db = getDb(), now = Date.now() } = {}) => {
    const today = istDate(new Date(now));
    const tomorrow = istDate(new Date(now + DAY));
    const report = { opened: 0, told: 0 };
    const camps = await db.collection('campaigns').limit(MAX_CAMPAIGNS).get();
    for (const doc of camps.docs) {
        const campaign = doc.data();
        if (String(campaign.status || '').toLowerCase() === 'draft') continue;
        const scheduled = (campaign.tasks || []).filter(t => taskWindow(t) === 'upcoming' && dayOf(t.opensOn));
        if (!scheduled.length) continue;

        const soon = scheduled.filter(t => dayOf(t.opensOn) === tomorrow);
        report.told += await queuePostsOpen({ db, campaignId: doc.id, campaign, tasks: soon, day: tomorrow, opensAt: `tomorrow, ${formatDeadline(tomorrow) || tomorrow}` });

        const due = scheduled.filter(t => dayOf(t.opensOn) <= today);
        if (!due.length) continue;
        const ids = new Set(due.map(t => String(t.id)));
        await db.runTransaction(async (tx) => {
            const snap = await tx.get(doc.ref);
            const tasks = (snap.data()?.tasks || []).map(t => (ids.has(String(t.id)) && taskWindow(t) === 'upcoming' ? { ...t, ...taskWindowFields('open') } : t));
            tx.update(doc.ref, { tasks });
        });
        report.opened += due.length;
        // Keyed by the "Opens on" day, so whoever got yesterday's heads-up isn't told twice.
        for (const day of new Set(due.map(t => dayOf(t.opensOn)))) {
            report.told += await queuePostsOpen({ db, campaignId: doc.id, campaign, tasks: due.filter(t => dayOf(t.opensOn) === day), day, opensAt: 'today' });
        }
    }
    return report;
};

/** The team just opened these deliverables by hand: tell the creators group now. */
export const tellPostsOpened = async ({ db = getDb(), campaignId, taskIds = [], now = Date.now(), start = true }) => {
    const snap = await db.collection('campaigns').doc(campaignId).get();
    if (!snap.exists) return { queued: 0 };
    const campaign = snap.data();
    const wanted = new Set(taskIds.map(String));
    const tasks = (campaign.tasks || []).filter(t => wanted.has(String(t.id)) && taskWindow(t) === 'open');
    const queued = await queuePostsOpen({ db, campaignId, campaign, tasks, day: istDate(new Date(now)), opensAt: 'today' });
    if (queued && start) {
        const req = { headers: { host: new URL(APP_URL).host } };
        if (!(await kickWorker(req, 0).catch(() => false))) await runQueue({ db, deadline: Date.now() + 15_000 }).catch(() => null);
    }
    return { queued };
};
