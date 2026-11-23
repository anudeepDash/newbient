/**
 * Task reminders: WhatsApp reminders to approved creators who haven't sent a
 * live task in (campaign_task_reminder, "Quick reminder … we haven't got your
 * Instagram story 1 for Pinnaca yet", with their "Open my task" link).
 *
 * The team sets, per task, the times they go out (Outreach → Send on WhatsApp →
 * Task reminder): up to MAX_TIMES date-and-times. Each time is a doc in
 * task_reminders ({ campaignId, taskId, at }); the mail worker
 * (runTaskReminders, on every run) picks up the ones whose time has come, queues
 * a reminder for everyone who still owes that task (outreach shortlist and
 * creators shortlisted in the app), and removes the doc, logging the result on
 * the campaign (private/outreach.taskReminderLog and the audit). The queue skips
 * anyone whose post comes in before it goes, or who replied STOP, and nothing goes
 * once the task is closed.
 *
 * Until Meta approves campaign_task_reminder, a reminder goes as the task's own
 * message again (the brief, with the same link), so setting times works today.
 *
 * Each reminder goes once per person per time (the job id). The team can also send
 * one now (outreach-wa-send, kind task_reminder): once per person per day.
 *
 * Action: outreach-task-reminders { campaignId, taskId, times: [ISO] } replaces that task's times.
 */
import { getDb, istDate } from './db.js';
import { enqueueJob, kindLive } from './outreachQueue.js';
import { IN } from './postReminders.js';
import { appCreatorsFor, appTaskJobData, dueLine, getsTaskLive, taskLiveData, taskLiveKind } from './postsOpen.js';
import { taskWindow } from '../../src/lib/creator/tasks.js';

export const MAX_TIMES = 5;
const COLL = 'task_reminders';
const HOUR = 3_600_000;
// A time the worker reaches more than this late (it was down) is dropped rather than sent hours off.
const STALE_MS = 26 * HOUR;
const MAX_AHEAD_MS = 90 * 24 * HOUR;
const PER_RUN = 25;

const send = (res, status, body) => res.status(status).json(body);
const str = (v, max = 200) => String(v ?? '').trim().slice(0, max);

/*
 * The template a reminder goes out on: the reminder once Meta approved it, else the task's own message
 * (the shorter brief or the long one; never the "post date is set" fallback, which would read wrong). null when off.
 */
export const reminderKind = () => {
    if (kindLive('task_reminder')) return 'task_reminder';
    const k = taskLiveKind();
    return k === 'task_brief' || k === 'task_live' ? k : null;
};

const reminderData = (kind, task, campaign, slot) => (kind === 'task_reminder'
    ? { taskIds: [String(task.id)], taskTitle: String(task.title || 'Deliverable').trim().slice(0, 80), dueAt: dueLine([task], campaign), slot, reminder: true }
    : { ...taskLiveData(task, campaign), slot, reminder: true });

/*
 * Queues a reminder for one task to everyone approved who still owes it (or only appIds / creatorIds).
 * `slot` makes the job id: one reminder per person per slot. → { queued, skipped: [{ id, reason }], kind }
 */
export const queueTaskReminder = async ({ db = getDb(), campaignId, campaign, task, slot, appIds = null, creatorIds = null, createdBy = 'Newbi app' }) => {
    const kind = reminderKind();
    const out = { queued: 0, skipped: [], kind };
    if (!kind || !task || taskWindow(task) !== 'open') return out;
    const tid = String(task.id);
    // No ids: everyone. Otherwise only the people picked (outreach applications and app creators).
    const all = appIds === null && creatorIds === null;
    const picked = !all;
    const data = reminderData(kind, task, campaign, slot);

    const coll = db.collection('campaigns').doc(campaignId).collection('applications');
    const docs = all ? (await coll.get()).docs
        : (appIds || []).length ? (await Promise.all(appIds.map(id => coll.doc(id).get()))).filter(d => d.exists) : [];
    for (const app of docs) {
        const a = app.data();
        if (!getsTaskLive(a)) { if (picked) out.skipped.push({ id: app.id, reason: !a.phone ? 'no_phone' : 'not_approved' }); continue; }
        if (IN.has(a.deliverables?.[tid]?.status)) { if (picked) out.skipped.push({ id: app.id, reason: 'posts_in' }); continue; }
        const id = await enqueueJob(db, { id: `task_reminder_${campaignId}_${app.id}_${tid}_${slot}`.slice(0, 160), campaignId, appId: app.id, kind, createdBy, data });
        if (id) out.queued += 1;
        else if (picked) out.skipped.push({ id: app.id, reason: 'reminded' });
    }
    const creators = all || (creatorIds || []).length ? await appCreatorsFor({ db, campaignId, campaign, tasks: [task], creatorIds: all ? null : creatorIds }) : [];
    for (const c of creators) {
        if (c.skip) { if (picked) out.skipped.push({ id: c.id, reason: c.skip }); continue; }
        if (!c.owes.has(tid)) { if (picked) out.skipped.push({ id: c.id, reason: 'posts_in' }); continue; }
        const id = await enqueueJob(db, {
            id: `task_reminder_${campaignId}_cr_${c.id}_${tid}_${slot}`.slice(0, 160),
            campaignId, kind: 'template', createdBy, data: { ...appTaskJobData(kind, c, task, campaign, campaignId, data), reminder: true },
        });
        if (id) out.queued += 1;
        else if (picked) out.skipped.push({ id: c.id, reason: 'reminded' });
    }
    return out;
};

/* "2026-11-23T13:30:00.000Z" → "202611231330": a time's key in doc and job ids. */
const slotOf = (iso) => iso.replace(/[^0-9]/g, '').slice(0, 12);
const docId = (campaignId, taskId, iso) => `${campaignId}__${taskId}__${slotOf(iso)}`.slice(0, 300);

/** The times still to go for a campaign: [{ taskId, at }], soonest first. */
export const remindersOf = async (db, campaignId) => {
    const snap = await db.collection(COLL).where('campaignId', '==', campaignId).get();
    return snap.docs.map(d => ({ taskId: d.data().taskId, at: d.data().at })).sort((a, b) => a.at.localeCompare(b.at));
};

/* Admin: set (replace) the reminder times for one task. An empty list turns its reminders off. */
export const handleTaskReminders = async (req, res, { db, actor }) => {
    const b = req.body || {};
    const campaignId = str(b.campaignId, 120);
    const taskId = str(b.taskId, 60);
    const campRef = db.collection('campaigns').doc(campaignId);
    const campSnap = campaignId ? await campRef.get() : null;
    if (!campSnap?.exists) return send(res, 404, { success: false, error: 'Campaign not found.' });
    const task = (campSnap.data().tasks || []).find(t => String(t.id) === taskId);
    if (!task) return send(res, 400, { success: false, error: 'Choose a task.' });
    if (taskWindow(task) === 'closed') return send(res, 409, { success: false, error: 'This task is closed, so there’s nobody to remind.' });

    const now = Date.now();
    const raw = Array.isArray(b.times) ? b.times : [];
    if (raw.length > MAX_TIMES) return send(res, 400, { success: false, error: `Up to ${MAX_TIMES} reminders per task.` });
    const times = [];
    for (const t of raw) {
        const ms = Date.parse(String(t || ''));
        if (!Number.isFinite(ms)) return send(res, 400, { success: false, error: 'One of the times isn’t a date and time.' });
        if (ms < now + 60_000) return send(res, 400, { success: false, error: 'Pick times from a minute from now onwards.' });
        if (ms > now + MAX_AHEAD_MS) return send(res, 400, { success: false, error: 'Pick times within the next 90 days.' });
        const iso = new Date(Math.floor(ms / 60_000) * 60_000).toISOString();
        if (!times.includes(iso)) times.push(iso);
    }
    times.sort();

    const existing = await db.collection(COLL).where('campaignId', '==', campaignId).get();
    const batch = db.batch();
    existing.docs.filter(d => d.data().taskId === taskId).forEach(d => batch.delete(d.ref));
    const createdBy = actor.actorEmail || 'Newbi team';
    const createdAt = new Date(now).toISOString();
    times.forEach(at => batch.set(db.collection(COLL).doc(docId(campaignId, taskId, at)), { campaignId, taskId, taskTitle: str(task.title, 80), at, createdBy, createdAt }));
    batch.set(campRef.collection('audit').doc(), {
        appId: null, field: 'task_reminders', from: null, to: times.length ? times.join(', ') : 'off', source: 'admin',
        note: `Task reminders for ${str(task.title, 80) || 'a task'}: ${times.length ? `${times.length} set` : 'off'}`, ...actor, at: createdAt,
    });
    await batch.commit();
    return send(res, 200, { success: true, reminders: await remindersOf(db, campaignId), kind: reminderKind() });
};

/*
 * The mail worker: queues the reminders whose time has come (then the same run's queue pass sends them).
 * → { sent: slots handled, queued: messages queued }
 */
export const runTaskReminders = async ({ db = getDb(), now = Date.now() } = {}) => {
    const snap = await db.collection(COLL).where('at', '<=', new Date(now).toISOString()).limit(PER_RUN).get();
    const report = { slots: 0, queued: 0 };
    const camps = new Map();
    for (const doc of snap.docs) {
        const r = doc.data();
        // Claim it first, so two overlapping runs don't both queue it (the job ids would stop doubles anyway).
        const claimed = await db.runTransaction(async (tx) => {
            const fresh = await tx.get(doc.ref);
            if (!fresh.exists) return false;
            tx.delete(doc.ref);
            return true;
        });
        if (!claimed) continue;
        report.slots += 1;
        const campRef = db.collection('campaigns').doc(r.campaignId);
        if (!camps.has(r.campaignId)) camps.set(r.campaignId, await campRef.get());
        const campSnap = camps.get(r.campaignId);
        const campaign = campSnap.exists ? campSnap.data() : null;
        const task = (campaign?.tasks || []).find(t => String(t.id) === String(r.taskId));
        const late = now - Date.parse(r.at) > STALE_MS;
        let result = { queued: 0, kind: null };
        let note;
        if (!campaign || !task) note = 'the task no longer exists';
        else if (taskWindow(task) !== 'open') note = 'the task was closed';
        else if (late) note = 'missed (the worker didn’t run in time)';
        else {
            result = await queueTaskReminder({ db, campaignId: r.campaignId, campaign, task, slot: slotOf(r.at), createdBy: 'Task reminder' });
            note = !result.kind ? 'its WhatsApp template isn’t switched on' : `${result.queued} queued`;
        }
        report.queued += result.queued;
        if (!campaign) continue;
        const entry = { at: r.at, ranAt: new Date(now).toISOString(), queued: result.queued, note };
        await db.runTransaction(async (tx) => {
            const privRef = campRef.collection('private').doc('outreach');
            const priv = await tx.get(privRef);
            const log = { ...(priv.data()?.taskReminderLog || {}) };
            log[String(r.taskId)] = [...(log[String(r.taskId)] || []), entry].slice(-10);
            tx.set(privRef, { taskReminderLog: log }, { merge: true });
        }).catch(e => console.warn('[TASK REMINDERS] log', e.message));
        await campRef.collection('audit').doc().set({
            appId: null, field: 'task_reminder', from: null, to: 'sent', source: 'system',
            note: `Task reminder for ${task?.title || r.taskTitle || 'a task'}: ${note}`, actorUid: null, actorEmail: 'Newbi app', at: entry.ranAt,
        }).catch(() => {});
    }
    return report;
};

/* One reminder now, by hand: once per person per day (IST). */
export const manualSlot = (now = Date.now()) => `m${istDate(new Date(now)).replace(/-/g, '')}`;
