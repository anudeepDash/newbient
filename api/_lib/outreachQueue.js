/**
 * Outreach over the WhatsApp Cloud API (Phase 2): the send queue, its rate
 * limit, retries, join reminders and what the webhook tells us.
 *
 *   outreach_queue/{campaignId}_{appId}_{kind}   one job per person per message (kind: invite | reminder)
 *       status: queued | sending | sent | failed | cancelled
 *       nextAttemptAt: when it's due (ISO); cleared once it's sent, failed or cancelled
 *   outreach_rate/whatsapp                       { recent: [ms…] (last 60 s), day: 'YYYY-MM-DD' (IST), dayCount }
 *
 * The queue is drained by runQueue(), from three places: right after an admin
 * sends (a self-continuing worker, like /api/mail), every 30 s while an admin
 * has the Outreach tab open, and the daily cron. The rate limit is a
 * transaction on one doc, so no number of workers can go over
 * OUTREACH_WA_PER_MINUTE or OUTREACH_WA_DAILY_CAP. Claiming a job is a
 * transaction too, so a message is never sent twice.
 *
 * A reminder is queued when the invite is sent, due joinReminderHours later
 * (campaign setting, default OUTREACH_JOIN_REMINDER_HOURS or 48). When it
 * comes due it only goes out if the person still hasn't joined.
 */
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { getDb, nowIso, istDate } from './db.js';
import { sendTemplate, isWhatsAppConfigured } from './whatsapp.js';
import { canTransition, canSystemTransition } from '../../src/lib/outreach/status.js';
import { templateParamsFor, WA_TEMPLATES } from '../../src/lib/outreach/whatsappTemplate.js';
import { maskPhone } from '../../src/lib/outreach/normalize.js';

export const BACKOFF_MIN = [1, 5, 30, 120];
export const MAX_ATTEMPTS = BACKOFF_MIN.length + 1;
const STALE_SENDING_MS = 5 * 60 * 1000;
const SYSTEM_ACTOR = { actorUid: null, actorEmail: 'WhatsApp' };

export const perMinute = () => Math.max(1, Number(process.env.OUTREACH_WA_PER_MINUTE) || 20);
export const dailyCap = () => Math.max(1, Number(process.env.OUTREACH_WA_DAILY_CAP) || 250);
export const defaultReminderHours = () => Math.max(1, Number(process.env.OUTREACH_JOIN_REMINDER_HOURS) || 48);

const appsPath = (campaignId) => `campaigns/${campaignId}/applications`;
/** creator_contacts doc id: one per phone, without the number in the id. */
export const contactIdFor = (phone) => `p_${createHash('sha256').update(String(phone)).digest('hex').slice(0, 24)}`;
const jobId = (campaignId, appId, kind) => `${campaignId}_${appId}_${kind}`;
const iso = (ms) => new Date(ms).toISOString();

/* ── The "Joined" button payload ──────────────────────────────────────── */

const secret = () => process.env.LINK_SIGNING_SECRET || process.env.WHATSAPP_APP_SECRET || 'newbi-outreach';
const sig = (campaignId, appId) => createHmac('sha256', secret()).update(`${campaignId}:${appId}`).digest('base64url').slice(0, 16);

/** "j1.<campaignId>.<appId>.<sig>": comes back in the webhook when they tap "Joined". */
export const joinPayload = (campaignId, appId) => `j1.${campaignId}.${appId}.${sig(campaignId, appId)}`;

export const readJoinPayload = (payload) => {
    const m = String(payload || '').match(/^j1\.([A-Za-z0-9_-]{1,120})\.([A-Za-z0-9_-]{1,120})\.([A-Za-z0-9_-]{16})$/);
    if (!m) return null;
    const expected = Buffer.from(sig(m[1], m[2]));
    const given = Buffer.from(m[3]);
    if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
    return { campaignId: m[1], appId: m[2] };
};

/* ── Rate limit ───────────────────────────────────────────────────────── */

/**
 * Takes one send slot, or says how long to wait. → { ok } | { ok: false, waitMs } | { ok: false, capped: true }
 */
export const acquireSlot = async (db, now = Date.now()) => {
    const ref = db.collection('outreach_rate').doc('whatsapp');
    return db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const cur = snap.exists ? snap.data() : {};
        const recent = (cur.recent || []).filter(t => t > now - 60_000).sort((a, b) => a - b);
        const today = istDate(new Date(now));
        const dayCount = cur.day === today ? Number(cur.dayCount || 0) : 0;
        if (dayCount >= dailyCap()) return { ok: false, capped: true };
        if (recent.length >= perMinute()) return { ok: false, waitMs: Math.max(250, recent[recent.length - perMinute()] + 60_000 - now) };
        tx.set(ref, { recent: [...recent, now], day: today, dayCount: dayCount + 1, updatedAt: iso(now) });
        return { ok: true };
    });
};

export const rateStatus = async (db, now = Date.now()) => {
    const snap = await db.collection('outreach_rate').doc('whatsapp').get();
    const cur = snap.exists ? snap.data() : {};
    const today = istDate(new Date(now));
    return {
        perMinute: perMinute(),
        dailyCap: dailyCap(),
        sentToday: cur.day === today ? Number(cur.dayCount || 0) : 0,
        lastMinute: (cur.recent || []).filter(t => t > now - 60_000).length,
    };
};

/* ── Audit and status helpers ─────────────────────────────────────────── */

const auditRef = (db, campaignId) => db.collection('campaigns').doc(campaignId).collection('audit').doc();

/** Moves one application in a transaction, with an audit entry. Returns the new status or null. */
const moveApplication = async (db, campaignId, appId, to, { source, note = null, patch = {}, actor = SYSTEM_ACTOR, system = true, now = nowIso(), when = () => true }) => {
    const ref = db.collection(appsPath(campaignId)).doc(appId);
    return db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists) return null;
        const app = snap.data();
        const from = app.status || 'applied';
        if (!when(app)) return null;
        const allowed = system ? canSystemTransition(from, to) : canTransition(from, to);
        if (from === to || !allowed) return null;
        tx.update(ref, { status: to, statusUpdatedAt: now, statusUpdatedBy: actor.actorEmail, updatedAt: now, ...patch });
        tx.set(auditRef(db, campaignId), { appId, field: 'status', from, to, source, note, ...actor, at: now });
        return to;
    });
};

/* ── Enqueue ──────────────────────────────────────────────────────────── */

const ACTIVE = new Set(['queued', 'sending', 'sent']);

/**
 * Queues the invite for these applications. Shortlisted people move to
 * "To send"; people already there (opened by hand, or a failed send) are
 * queued as they are. Someone with an invite already queued or sent is skipped.
 * → { queued: [appId], skipped: [{ id, reason }] }
 */
export const enqueueInvites = async (db, { campaignId, appIds, actor, now = Date.now() }) => {
    const at = iso(now);
    const queued = [];
    const skipped = [];
    for (const appId of appIds) {
        const appRef = db.collection(appsPath(campaignId)).doc(appId);
        const jobRef = db.collection('outreach_queue').doc(jobId(campaignId, appId, 'invite'));
        const result = await db.runTransaction(async (tx) => {
            const [appSnap, jobSnap] = await Promise.all([tx.get(appRef), tx.get(jobRef)]);
            if (!appSnap.exists) return { reason: 'not_found' };
            const app = appSnap.data();
            const from = app.status || 'applied';
            if (!['shortlisted', 'message_queued'].includes(from)) return { reason: 'not_allowed' };
            if (!app.phone) return { reason: 'no_phone' };
            if (jobSnap.exists && ACTIVE.has(jobSnap.data().status)) return { reason: 'already' };
            tx.set(jobRef, {
                campaignId, appId, kind: 'invite', status: 'queued', attempts: 0,
                nextAttemptAt: at, createdAt: at, createdBy: actor.actorEmail || null, lastError: null, errorCode: null,
            });
            const patch = { updatedAt: at, delivery: { ...(app.delivery || {}), whatsapp: { status: 'queued', at, error: null } } };
            if (from === 'shortlisted') {
                tx.update(appRef, { ...patch, status: 'message_queued', statusUpdatedAt: at, statusUpdatedBy: actor.actorEmail, messageQueuedAt: at, messageQueuedBy: actor.actorEmail });
                tx.set(auditRef(db, campaignId), { appId, field: 'status', from, to: 'message_queued', source: 'whatsapp_api', note: 'Queued to send with the WhatsApp API', ...actor, at });
            } else {
                tx.update(appRef, patch);
                tx.set(auditRef(db, campaignId), { appId, field: 'whatsapp', from: null, to: 'queued', source: 'whatsapp_api', note: 'Queued to send with the WhatsApp API', ...actor, at });
            }
            return { ok: true };
        });
        if (result.ok) queued.push(appId);
        else skipped.push({ id: appId, reason: result.reason });
    }
    return { queued, skipped };
};

/** Cancels queued invites for a campaign (the admin's "Stop sending"). Already-sent ones stay. */
export const cancelQueued = async (db, { campaignId, actor, now = Date.now() }) => {
    const snap = await db.collection('outreach_queue').where('campaignId', '==', campaignId).get();
    let cancelled = 0;
    for (const d of snap.docs) {
        const job = d.data();
        if (job.kind !== 'invite' || job.status !== 'queued') continue;
        const done = await db.runTransaction(async (tx) => {
            const fresh = await tx.get(d.ref);
            if (fresh.data()?.status !== 'queued') return false;
            tx.update(d.ref, { status: 'cancelled', nextAttemptAt: null, cancelledAt: iso(now), cancelledBy: actor.actorEmail || null });
            tx.set(db.collection(appsPath(campaignId)).doc(job.appId), { delivery: { whatsapp: { status: 'cancelled', at: iso(now), error: null } } }, { merge: true });
            return true;
        });
        if (done) cancelled += 1;
    }
    return { cancelled };
};

/* ── Claim and send one job ───────────────────────────────────────────── */

const claimJob = async (db, ref, now) => db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return null;
    const job = snap.data();
    const due = Date.parse(job.nextAttemptAt || '') <= now;
    if (!due || !['queued', 'sending'].includes(job.status)) return null;
    // A 'sending' job that's due again is one whose worker died mid-send.
    tx.update(ref, { status: 'sending', sendingAt: iso(now), nextAttemptAt: iso(now + STALE_SENDING_MS) });
    return { id: snap.id, ...job };
});

const finishJob = (ref, patch) => ref.set({ ...patch, nextAttemptAt: patch.nextAttemptAt ?? null }, { merge: true });

/** Loads what the message needs; null (with a reason) when it shouldn't go out any more. */
const loadContext = async (db, job) => {
    const campRef = db.collection('campaigns').doc(job.campaignId);
    const [campSnap, privSnap, appSnap] = await Promise.all([
        campRef.get(),
        campRef.collection('private').doc('outreach').get(),
        campRef.collection('applications').doc(job.appId).get(),
    ]);
    if (!campSnap.exists || !appSnap.exists) return { skip: 'not_found' };
    const campaign = campSnap.data();
    const settings = privSnap.exists ? privSnap.data() : {};
    const app = appSnap.data();
    if (!settings.whatsappGroupLink) return { skip: 'no_group_link' };
    if (job.kind === 'invite' && app.status !== 'message_queued') return { skip: 'status_changed' };
    if (job.kind === 'reminder') {
        if (settings.remindersEnabled === false) return { skip: 'reminders_off' };
        if (!['message_sent', 'replied'].includes(app.status) || app.joinedAt) return { skip: 'already_joined' };
    }
    return { campaign, settings, app };
};

const SKIP_NOTE = {
    not_found: 'The application or campaign no longer exists.',
    no_group_link: 'No WhatsApp group link is set for this campaign.',
    status_changed: 'Their status changed before it was sent.',
    reminders_off: 'Reminders are off for this campaign.',
    already_joined: 'They joined (or moved on) before the reminder was due.',
};

/** Sends one claimed job. → 'sent' | 'retry' | 'failed' | 'cancelled' */
export const sendJob = async (db, job, { now = Date.now() } = {}) => {
    const ref = db.collection('outreach_queue').doc(job.id);
    const ctx = await loadContext(db, job);
    if (ctx.skip) {
        await finishJob(ref, { status: 'cancelled', lastError: SKIP_NOTE[ctx.skip] });
        if (job.kind === 'invite') {
            await db.collection(appsPath(job.campaignId)).doc(job.appId)
                .set({ delivery: { whatsapp: { status: 'cancelled', at: iso(now), error: SKIP_NOTE[ctx.skip] } } }, { merge: true }).catch(() => {});
        }
        return 'cancelled';
    }
    const { campaign, settings, app } = ctx;
    const attempts = Number(job.attempts || 0) + 1;
    const result = await sendTemplate({
        to: app.phone,
        template: WA_TEMPLATES[job.kind].name,
        bodyParams: templateParamsFor(job.kind, { application: app, campaign, groupLink: settings.whatsappGroupLink }),
        buttons: [{ index: 0, payload: joinPayload(job.campaignId, job.appId) }],
        event: `outreach-${job.kind}`,
        ref: { collection: appsPath(job.campaignId), id: job.appId },
        autoRetry: false,
    });
    const at = iso(Date.now());

    if (result.ok) {
        await finishJob(ref, { status: 'sent', attempts, sentAt: at, messageId: result.messageId, lastError: null, errorCode: null });
        if (job.kind === 'invite') {
            await moveApplication(db, job.campaignId, job.appId, 'message_sent', {
                source: 'whatsapp_api',
                note: 'Sent with the WhatsApp API',
                patch: { messageSentAt: at, messageSentBy: 'WhatsApp API', lastMessageText: null, lastMessageId: result.messageId },
                now: at,
            });
            // The reminder waits in the queue; when it's due it checks they still haven't joined.
            if (settings.remindersEnabled !== false) {
                const hours = Number(settings.joinReminderHours) || defaultReminderHours();
                await db.collection('outreach_queue').doc(jobId(job.campaignId, job.appId, 'reminder')).set({
                    campaignId: job.campaignId, appId: job.appId, kind: 'reminder', status: 'queued', attempts: 0,
                    nextAttemptAt: iso(Date.now() + hours * 3600_000), createdAt: at, createdBy: 'WhatsApp API', lastError: null, errorCode: null,
                });
            }
        } else {
            await db.collection(appsPath(job.campaignId)).doc(job.appId).set({ reminderSentAt: at, updatedAt: at }, { merge: true });
            await auditRef(db, job.campaignId).set({ appId: job.appId, field: 'reminder', from: null, to: 'sent', source: 'reminder', note: 'Join reminder sent', ...SYSTEM_ACTOR, at });
        }
        return 'sent';
    }

    if (result.retriable && attempts < MAX_ATTEMPTS) {
        const next = iso(Date.now() + BACKOFF_MIN[attempts - 1] * 60_000);
        await finishJob(ref, { status: 'queued', attempts, nextAttemptAt: next, lastError: result.error || null, errorCode: result.errorCode || null });
        await db.collection(appsPath(job.campaignId)).doc(job.appId)
            .set({ delivery: { whatsapp: { status: 'retrying', at, error: result.error || null, nextAttemptAt: next } } }, { merge: true }).catch(() => {});
        return 'retry';
    }

    await finishJob(ref, { status: 'failed', attempts, failedAt: at, lastError: result.error || 'Not sent', errorCode: result.errorCode || null });
    await auditRef(db, job.campaignId).set({
        appId: job.appId, field: 'whatsapp', from: null, to: 'failed', source: job.kind === 'reminder' ? 'reminder' : 'whatsapp_api',
        note: String(result.error || 'Not sent').slice(0, 300), ...SYSTEM_ACTOR, at,
    });
    if (result.status === 'skipped') console.warn(`[outreach] ${job.kind} not sent to ${maskPhone(app.phone)}: ${result.error}`);
    return 'failed';
};

/* ── The worker ───────────────────────────────────────────────────────── */

const sleepFor = (ms) => new Promise(r => setTimeout(r, ms));

/**
 * Sends due jobs until the deadline, never faster than the rate limit.
 * → { sent, retried, failed, cancelled, capped, more, dueLeft }
 */
export const runQueue = async ({ db = getDb(), deadline = Date.now() + 45_000, sleep = sleepFor, clock = () => Date.now(), maxJobs = 500 } = {}) => {
    const report = { sent: 0, retried: 0, failed: 0, cancelled: 0, capped: false, more: false, dueLeft: 0 };
    if (!isWhatsAppConfigured()) return { ...report, notConfigured: true };
    let handled = 0;
    while (clock() < deadline && handled < maxJobs) {
        const now = clock();
        const snap = await db.collection('outreach_queue').where('nextAttemptAt', '<=', iso(now)).orderBy('nextAttemptAt').limit(25).get();
        const due = snap.docs.filter(d => ['queued', 'sending'].includes(d.data().status));
        if (!due.length) break;
        let progressed = false;
        for (const d of due) {
            if (clock() >= deadline) break;
            const slot = await acquireSlot(db, clock());
            if (slot.capped) { report.capped = true; break; }
            if (!slot.ok) {
                // Wait for the next free slot if there's time for it; otherwise stop and let the next run pick up.
                if (clock() + slot.waitMs > deadline - 2_000) { report.more = true; break; }
                await sleep(slot.waitMs);
                const again = await acquireSlot(db, clock());
                if (!again.ok) { report.more = true; break; }
            }
            const job = await claimJob(db, d.ref, clock());
            if (!job) continue; // another worker took it; the slot is spent, which only slows us down
            const outcome = await sendJob(db, job, { now: clock() });
            report[{ sent: 'sent', retry: 'retried', failed: 'failed', cancelled: 'cancelled' }[outcome]] += 1;
            handled += 1;
            progressed = true;
        }
        if (report.capped || report.more || !progressed) break;
    }
    const left = await db.collection('outreach_queue').where('nextAttemptAt', '<=', iso(clock())).get();
    report.dueLeft = left.docs.filter(d => d.data().status === 'queued').length;
    if (report.dueLeft && !report.capped) report.more = true;
    return report;
};

/** Queue numbers for one campaign, for the admin. */
export const queueStatus = async (db, campaignId) => {
    const snap = await db.collection('outreach_queue').where('campaignId', '==', campaignId).get();
    const counts = { queued: 0, sending: 0, sent: 0, failed: 0, cancelled: 0, reminders: 0 };
    let nextAt = null;
    snap.docs.forEach(d => {
        const j = d.data();
        if (j.kind === 'reminder') {
            if (j.status === 'queued') counts.reminders += 1;
            return;
        }
        counts[j.status] = (counts[j.status] || 0) + 1;
        if (j.status === 'queued' && (!nextAt || j.nextAttemptAt < nextAt)) nextAt = j.nextAttemptAt;
    });
    return { ...counts, nextAt };
};

/* ── Starting the worker from a request ───────────────────────────────── */

export const MAX_CHAIN_DEPTH = 30;

/**
 * Starts (or continues) the worker in a new invocation, the way /api/mail
 * chains itself: fire the request, don't wait for it. Needs CRON_SECRET.
 */
export const kickWorker = async (req, depth = 0) => {
    const secretKey = process.env.CRON_SECRET;
    const host = String(req?.headers?.['x-forwarded-host'] || req?.headers?.host || '').split(',')[0].trim();
    if (!secretKey || !host || depth >= MAX_CHAIN_DEPTH) return false;
    const proto = /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host) ? 'http' : 'https';
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 2500);
    try {
        await fetch(`${proto}://${host}/api/creator-join?action=outreach-queue-run`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${secretKey}`, 'x-outreach-chain': String(depth + 1), 'Content-Type': 'application/json' },
            body: '{}',
            signal: ctrl.signal,
        });
    } catch { /* aborted on purpose: the new invocation keeps going on its own */ } finally {
        clearTimeout(timer);
    }
    return true;
};

/* ── Webhook ──────────────────────────────────────────────────────────── */

const refOfLog = (log) => {
    const m = String(log?.ref?.collection || '').match(/^campaigns\/([^/]+)\/applications$/);
    return m && log.ref.id ? { campaignId: m[1], appId: log.ref.id } : null;
};

/**
 * A delivery status for an outreach message (after recordWhatsAppStatus has
 * stored it). Delivered and read only update the badge, which the sender
 * already did. Failed puts an invite back under "To message".
 */
export const onOutreachStatus = async (log, status, { db = getDb() } = {}) => {
    if (!String(log?.event || '').startsWith('outreach-')) return false;
    if (status?.status !== 'failed') return false;
    const target = refOfLog(log);
    if (!target) return false;
    const error = String(status.errors?.[0]?.error_data?.details || status.errors?.[0]?.title || 'WhatsApp couldn’t deliver it').slice(0, 300);
    if (log.event === 'outreach-invite') {
        await moveApplication(db, target.campaignId, target.appId, 'message_queued', {
            source: 'whatsapp_webhook',
            note: `Not delivered: ${error}`,
            when: (app) => app.lastMessageId === log.messageId,
        });
        await db.collection('outreach_queue').doc(jobId(target.campaignId, target.appId, 'invite'))
            .set({ status: 'failed', lastError: error, nextAttemptAt: null }, { merge: true });
        await db.collection('outreach_queue').doc(jobId(target.campaignId, target.appId, 'reminder'))
            .set({ status: 'cancelled', nextAttemptAt: null, lastError: 'The invite wasn’t delivered.' }, { merge: true });
    } else {
        await auditRef(db, target.campaignId).set({ appId: target.appId, field: 'whatsapp', from: null, to: 'failed', source: 'whatsapp_webhook', note: `Reminder not delivered: ${error}`, ...SYSTEM_ACTOR, at: nowIso() });
    }
    return true;
};

const phoneOf = (waId) => (waId ? `+${String(waId).replace(/\D/g, '')}` : '');

/**
 * An incoming message. "Joined ✅" (a quick-reply with our payload) marks the
 * person joined; any other message marks them replied. The text itself isn't
 * stored yet (the Phase 3 inbox will).
 * → 'joined' | 'replied' | null
 */
export const onOutreachInbound = async (msg, { db = getDb(), now = nowIso() } = {}) => {
    const from = phoneOf(msg?.from);
    if (!from) return null;
    const payload = msg.type === 'button' ? msg.button?.payload
        : msg.type === 'interactive' ? (msg.interactive?.button_reply?.id || '') : '';

    if (payload) {
        const target = readJoinPayload(payload);
        if (!target) return null;
        const appRef = db.collection(appsPath(target.campaignId)).doc(target.appId);
        const appSnap = await appRef.get();
        // The tap must come from the number we sent it to.
        if (!appSnap.exists || appSnap.data().phone !== from) {
            console.warn(`[outreach] "Joined" from ${maskPhone(from)} doesn't match the application; ignored.`);
            return null;
        }
        const moved = await moveApplication(db, target.campaignId, target.appId, 'joined', {
            source: 'whatsapp_webhook',
            note: 'Tapped “Joined” in WhatsApp',
            patch: { joinedAt: now, joinedVia: 'button', lastReplyAt: now },
            now,
        });
        await db.collection('outreach_queue').doc(jobId(target.campaignId, target.appId, 'reminder'))
            .set({ status: 'cancelled', nextAttemptAt: null, lastError: 'They joined.' }, { merge: true });
        if (!moved) await appRef.set({ lastReplyAt: now }, { merge: true });
        return moved ? 'joined' : null;
    }

    // Any other message: the most recent outreach application on this number that's waiting on them.
    const contact = await db.collection('creator_contacts').doc(contactIdFor(from)).get();
    const campaigns = contact.exists ? [...(contact.data().campaignIds || [])].reverse() : [];
    for (const campaignId of campaigns) {
        const key = await db.collection('campaigns').doc(campaignId).collection('application_keys').doc(`p:${from}`).get();
        if (!key.exists) continue;
        const appId = key.data().appId;
        const moved = await moveApplication(db, campaignId, appId, 'replied', {
            source: 'whatsapp_webhook',
            note: 'Replied in WhatsApp',
            patch: { lastReplyAt: now },
            now,
        });
        if (!moved) await db.collection(appsPath(campaignId)).doc(appId).set({ lastReplyAt: now }, { merge: true }).catch(() => {});
        // Only their latest campaign: an old one shouldn't flip to "replied" because of a new chat.
        return moved ? 'replied' : null;
    }
    return null;
};
