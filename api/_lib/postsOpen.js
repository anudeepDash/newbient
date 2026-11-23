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
 * A task opened by hand goes to every approved creator (shortlisted onwards) who
 * hasn't sent it in, once per person per task: as its brief (campaign_task_live:
 * task, what to do, links, due date, "Open my task") once Meta approved that, and
 * until then as the short "Your post date is set" (campaign_posts_open), so
 * opening a task always tells someone while either template is on.
 *
 * Creators shortlisted in the app (creators.shortlistedCampaigns, the
 * Deliverables tab) get the same message too, unless they're also on the
 * outreach list with the same number. They have no outreach application, so it
 * goes as a ready-made template job (kind 'template', data.creatorId) and its
 * button opens /d/c-<campaignId>, which takes them to the campaign in the app.
 *
 * Creators group = outreach applications that got the shortlist message (message
 * sent, replied or joined), as for the deadline reminders. One message per person
 * per opening day (the job id), through the outreach queue (rate limit, STOP
 * opt-outs; it skips itself if their posts are already in).
 */
import { APP_URL, getDb, istDate } from './db.js';
import { enqueueJob, kickWorker, runQueue, kindLive } from './outreachQueue.js';
import { formatDeadline } from '../../src/lib/outreach/template.js';
import { approvedSummary, renderTemplatePreview, templateParamsFor, WA_TEMPLATES } from '../../src/lib/outreach/whatsappTemplate.js';
import { campaignImageOf, imageHeaderFor, toE164 } from './whatsapp.js';
import { taskWindow, taskWindowFields } from '../../src/lib/creator/tasks.js';
import { WAITING_ON_POSTS, IN, dayOf } from './postReminders.js';
import { isOnShortlist } from '../../src/lib/outreach/status.js';
import { briefSummary, linksLine, taskLinksOf } from '../../src/lib/outreach/taskBrief.js';

const DAY = 86_400_000;
const MAX_CAMPAIGNS = 300;
export const NO_DUE_DATE = 'No fixed date';

/* The earliest due date among these posts (their own deadline, else the campaign's). */
export const dueLine = (tasks, campaign) => {
    const days = tasks.map(t => dayOf(t.deadline) || dayOf(campaign.postingDeadline)).filter(Boolean).sort();
    return days.length ? formatDeadline(days[0]) || days[0] : NO_DUE_DATE;
};

/* Approved creators (shortlisted onwards) still owing a post: who hears that a task is live. Paid means they're done. */
export const getsTaskLive = (a) => isOnShortlist(a.status) && a.status !== 'paid' && Boolean(a.phone);

/*
 * Which template a live task goes out on: the shorter brief (campaign_task_brief) once
 * it's switched on, else the long one (campaign_task_live), else the short
 * campaign_posts_open. null when none is on, so nothing can go.
 */
export const taskLiveKind = () => (kindLive('task_brief') ? 'task_brief' : kindLive('task_live') ? 'task_live' : kindLive('posts_open') ? 'posts_open' : null);
const BRIEF_KINDS = new Set(['task_brief', 'task_live']);

/*
 * The task message's variables for one task. Kept short: the brief's first lines (whole lines, up to
 * 160 characters) and at most two links; the full brief and every link are on their task page.
 */
export const taskLiveData = (task, campaign) => ({
    taskIds: [String(task.id)],
    taskTitle: String(task.title || 'Deliverable').trim().slice(0, 80),
    details: briefSummary(task, 160),
    links: linksLine(taskLinksOf(task).slice(0, 2), 200),
    dueAt: dueLine([task], campaign),
});
/** What a task message carries for this template (the brief, or the short "post date is set"). */
const taskDataFor = (kind, task, campaign) => (BRIEF_KINDS.has(kind) ? taskLiveData(task, campaign) : postsOpenData(task, campaign));

/* The campaign_posts_open variables for one task opened today (the fallback while campaign_task_live waits for Meta). */
const postsOpenData = (task, campaign) => ({
    opensAt: 'today',
    whatToPost: String(task.title || 'Deliverable').trim().slice(0, 80),
    dueAt: dueLine([task], campaign),
    taskIds: [String(task.id)],
});

/*
 * Queues "this task is live" for each task, to every approved creator who hasn't
 * sent that post in, on whichever template is on (taskLiveKind). One job per person
 * per task (its id, whichever template), so opening, closing and reopening doesn't
 * send it twice; `again` sends it anyway (the team asked from Outreach → Send on
 * WhatsApp). appIds narrows it to some people.
 * → { queued, skipped: [{ id, reason }], kind, off }
 */
export const queueTaskLive = async ({ db = getDb(), campaignId, campaign, tasks, appIds = null, again = false, createdBy = 'Newbi app' }) => {
    const kind = taskLiveKind();
    const out = { queued: 0, skipped: [], kind, off: !kind };
    if (!tasks.length || !kind) return out;
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
            const data = taskDataFor(kind, t, campaign);
            const id = await enqueueJob(db, { id: jobKey, campaignId, appId: app.id, kind, createdBy, again, data });
            if (id) out.queued += 1;
            else if (appIds) out.skipped.push({ id: app.id, reason: 'already_sent' });
        }
    }
    return out;
};

/* ── Creators shortlisted in the app ─────────────────────────────────── */

const last10 = (phone) => String(phone || '').replace(/\D/g, '').slice(-10);
const creatorPhoneOf = (c) => c.whatsapp || c.phone || c.phoneNumber || '';
/** The /d/ button value for app creators: the page sends them on to the campaign in the app (DeliverablesPage). */
export const appTaskParam = (campaignId) => `c-${campaignId}`;

/* Whether a creator in the app already sent this task in (on the campaign doc, or in the submissions subcollection). */
const appSentIn = (task, keys, subs) => keys.some(k => IN.has(task?.submissions?.[k]?.status)
    || (task?.completedBy || []).includes(k) || (task?.verifiedBy || []).includes(k)
    || IN.has(subs.get(k)?.tasks?.[String(task.id)]?.status));

/**
 * Creators shortlisted in the app who should hear about these tasks: not paid, with a number,
 * and not also on the outreach shortlist with that number (they hear from there).
 * → [{ id, name, phone, owes: Set<taskId> }]
 */
export const appCreatorsFor = async ({ db, campaignId, campaign, tasks, creatorIds = null }) => {
    const campRef = db.collection('campaigns').doc(campaignId);
    const [creators, subsSnap, apps] = await Promise.all([
        creatorIds
            ? Promise.all(creatorIds.map(id => db.collection('creators').doc(id).get())).then(ds => ds.filter(d => d.exists))
            : db.collection('creators').where('shortlistedCampaigns', 'array-contains', campaignId).get().then(q => q.docs),
        campRef.collection('submissions').get(),
        campRef.collection('applications').get(),
    ]);
    const subs = new Map(subsSnap.docs.map(d => [d.id, d.data()]));
    const outreachPhones = new Set(apps.docs.map(d => d.data()).filter(a => isOnShortlist(a.status)).map(a => last10(a.phone)).filter(Boolean));
    return creators.map(d => {
        const c = d.data();
        const phone = creatorPhoneOf(c);
        const keys = [...new Set([c.uid, d.id].filter(Boolean))];
        const skip = !(c.shortlistedCampaigns || []).includes(campaignId) ? 'not_approved'
            : c.campaignPayouts?.[campaignId]?.status === 'paid' ? 'paid'
                : !toE164(phone) ? 'no_phone'
                    : outreachPhones.has(last10(phone)) ? 'on_outreach' : null;
        const owes = new Set(tasks.filter(t => !appSentIn(t, keys, subs)).map(t => String(t.id)));
        return { id: d.id, name: c.name || c.displayName || c.fullName || '', phone, skip, owes };
    });
};

/* One app creator's message for one task, ready for the queue's 'template' kind (the same text and variables as the outreach one). */
export const appTaskJobData = (kind, creator, task, campaign, campaignId, data = taskDataFor(kind, task, campaign)) => {
    const ctx = { application: { fullName: creator.name }, campaign, data };
    const name = WA_TEMPLATES[kind].name;
    return {
        phone: toE164(creator.phone), name: creator.name, template: name,
        header: imageHeaderFor(name, campaignImageOf(campaign)),
        bodyParams: templateParamsFor(kind, ctx),
        buttons: [{ index: 0, param: appTaskParam(campaignId) }],
        text: renderTemplatePreview(kind, ctx),
        taskIds: [String(task.id)], creatorId: creator.id, ...(kind === 'task_reminder' ? { reminder: true } : {}),
    };
};

/*
 * Queues the task's message for creators shortlisted in the app (all of them, or creatorIds).
 * One job per person per task, as for outreach. → { queued, skipped: [{ id, reason }] }
 */
export const queueTaskLiveApp = async ({ db = getDb(), campaignId, campaign, tasks, creatorIds = null, again = false, createdBy = 'Newbi app' }) => {
    const kind = taskLiveKind();
    const out = { queued: 0, skipped: [] };
    if (!tasks.length || !kind) return out;
    for (const c of await appCreatorsFor({ db, campaignId, campaign, tasks, creatorIds })) {
        if (c.skip) { if (creatorIds) out.skipped.push({ id: c.id, reason: c.skip }); continue; }
        for (const t of tasks) {
            if (!c.owes.has(String(t.id))) { if (creatorIds) out.skipped.push({ id: c.id, reason: 'posts_in' }); continue; }
            const id = await enqueueJob(db, {
                id: `task_live_${campaignId}_cr_${c.id}_${t.id}`.slice(0, 140),
                campaignId, kind: 'template', createdBy, again, data: appTaskJobData(kind, c, t, campaign, campaignId),
            });
            if (id) out.queued += 1;
            else if (creatorIds) out.skipped.push({ id: c.id, reason: 'already_sent' });
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
    if (opensAt === 'today' && BRIEF_KINDS.has(taskLiveKind())) return (await queueTaskLive({ db, campaignId, campaign, tasks })).queued;
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

/*
 * The team just opened these deliverables by hand: tell every approved creator now
 * (queueTaskLive picks the template). → { queued, kind, off } so the admin can say
 * whether anyone was told.
 */
export const tellPostsOpened = async ({ db = getDb(), campaignId, taskIds = [], start = true }) => {
    const snap = await db.collection('campaigns').doc(campaignId).get();
    if (!snap.exists) return { queued: 0 };
    const campaign = snap.data();
    const wanted = new Set(taskIds.map(String));
    const tasks = (campaign.tasks || []).filter(t => wanted.has(String(t.id)) && taskWindow(t) === 'open');
    const { queued: fromOutreach, kind, off } = await queueTaskLive({ db, campaignId, campaign, tasks });
    const { queued: fromApp } = await queueTaskLiveApp({ db, campaignId, campaign, tasks });
    const queued = fromOutreach + fromApp;
    if (queued && start) {
        const req = { headers: { host: new URL(APP_URL).host } };
        if (!(await kickWorker(req, 0).catch(() => false))) await runQueue({ db, deadline: Date.now() + 15_000 }).catch(() => null);
    }
    return { queued, kind, off };
};
