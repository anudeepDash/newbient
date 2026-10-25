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
import { createHmac, timingSafeEqual } from 'node:crypto';
import { getDb, nowIso, istDate } from './db.js';
import { sendTemplate, sendText, isWhatsAppConfigured, isTemplateLive, campaignImageOf } from './whatsapp.js';
import { makeSignedToken } from './linkSign.js';
import { contactIdFor, appendThreadMessage, windowOpen } from './outreachThreads.js';
import { canTransition, canSystemTransition } from '../../src/lib/outreach/status.js';
import { templateParamsFor, renderTemplatePreview, WA_TEMPLATES, STOP_PAYLOAD, toldInAppOnly } from '../../src/lib/outreach/whatsappTemplate.js';
import { maskPhone } from '../../src/lib/outreach/normalize.js';

export const BACKOFF_MIN = [1, 5, 30, 120];
export const MAX_ATTEMPTS = BACKOFF_MIN.length + 1;
const STALE_SENDING_MS = 5 * 60 * 1000;
const SYSTEM_ACTOR = { actorUid: null, actorEmail: 'WhatsApp' };

export const perMinute = () => Math.max(1, Number(process.env.OUTREACH_WA_PER_MINUTE) || 20);
export const dailyCap = () => Math.max(1, Number(process.env.OUTREACH_WA_DAILY_CAP) || 250);
export const defaultReminderHours = () => Math.max(1, Number(process.env.OUTREACH_JOIN_REMINDER_HOURS) || 48);

const appsPath = (campaignId) => `campaigns/${campaignId}/applications`;
export { contactIdFor };
const SUBMIT_LINK_TTL = 60 * 24 * 3600; // personal "send your posts" links: 60 days
const APP_URL = (process.env.PUBLIC_APP_URL || 'https://app.newbi.live').replace(/\/+$/, '');
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
 * Queues the invite for these applications. Shortlisted people (and people
 * only told in the app) move to "To send"; people already there (opened by
 * hand, or a failed send) are queued as they are. Someone with an invite
 * already queued or sent is skipped.
 * → { queued: [appId], skipped: [{ id, reason }] }
 */
export const enqueueInvites = async (db, { campaignId, appIds, actor, now = Date.now() }) => {
    const at = iso(now);
    const queued = [];
    const skipped = [];
    if (!kindLive('invite')) return { queued, skipped: appIds.map(id => ({ id, reason: 'template_off' })) };
    for (const appId of appIds) {
        const appRef = db.collection(appsPath(campaignId)).doc(appId);
        const jobRef = db.collection('outreach_queue').doc(jobId(campaignId, appId, 'invite'));
        const result = await db.runTransaction(async (tx) => {
            const [appSnap, jobSnap] = await Promise.all([tx.get(appRef), tx.get(jobRef)]);
            if (!appSnap.exists) return { reason: 'not_found' };
            const app = appSnap.data();
            const from = app.status || 'applied';
            const inAppOnly = toldInAppOnly(app);
            if (!['shortlisted', 'message_queued'].includes(from) && !inAppOnly) return { reason: 'not_allowed' };
            if (!app.phone) return { reason: 'no_phone' };
            if (jobSnap.exists && ACTIVE.has(jobSnap.data().status)) return { reason: 'already' };
            tx.set(jobRef, {
                campaignId, appId, kind: 'invite', status: 'queued', attempts: 0,
                nextAttemptAt: at, createdAt: at, createdBy: actor.actorEmail || null, lastError: null, errorCode: null,
            });
            const patch = { updatedAt: at, delivery: { ...(app.delivery || {}), whatsapp: { status: 'queued', at, error: null } } };
            if (from === 'shortlisted' || inAppOnly) {
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

/*
 * What each kind of message is. Templates are approved in Meta (see
 * src/lib/outreach/whatsappTemplate.js); inbox_text is a free-text reply.
 *   button  'join': the signed "Joined" quick reply, then "Stop updates" · 'link': URL button with
 *           their submit link · 'stop': only "Stop updates"
 *   badge   writes the delivery status onto the application (the main message only)
 * Every template checks the number hasn't opted out (STOP) first.
 */
const KINDS = {
    invite: { button: 'join', badge: true, groupLink: true },
    reminder: { button: 'join', badge: true, groupLink: true },
    deliverables: { button: 'link' },
    changes: { button: 'link' },
    city_group: { button: 'stop' },
    payout: {},
    all_approved: {},
    post_due: { button: 'link' },
    post_overdue: { button: 'link' },
    posts_open: { button: 'link' },
    // After the campaign (api/_lib/campaignFeedback.js): data { feedbackId }. URL button: their feedback form.
    feedback: { feedback: true },
    inbox_text: { text: true },
    // Any approved template, ready to send (WhatsApp center bulk sends): data { phone, name, template, language, header, bodyParams, buttons, text }.
    template: { custom: true },
};

/*
 * Meta answers that mean "not now" rather than "never": the message waits and
 * tries again, without using up its attempts, for up to MAX_HOLD_MS. The first
 * two block the whole number (display name not approved, payment problem), so
 * the worker stops for that run instead of trying everyone.
 */
const HOLD_MIN = { 131037: 60, 131042: 60, 131048: 30, 131056: 10, 130429: 5 };
const NUMBER_BLOCKED = new Set([131037, 131042]);
export const MAX_HOLD_MS = 72 * 3600 * 1000;

/*
 * A kind goes out only once the API is set up and, for a template, once the
 * owner marked it approved in Meta with WHATSAPP_TEMPLATE_<NAME> (as in
 * notify.js). Until then nothing is queued and the in-app path is used.
 */
export const kindLive = (kind) => isWhatsAppConfigured() && Boolean(KINDS[kind] && (KINDS[kind].text || KINDS[kind].custom || isTemplateLive(WA_TEMPLATES[kind]?.name)));

/** { invite: true, reminder: false, … } for the admin, so it can show which templates are on. */
export const liveKinds = () => Object.fromEntries(Object.keys(KINDS).filter(k => !KINDS[k].text && !KINDS[k].custom).map(k => [k, kindLive(k)]));

/** The env var that switches a kind's template on: WHATSAPP_TEMPLATE_CAMPAIGN_SHORTLIST etc. */
export const switchFor = (kind) => `WHATSAPP_TEMPLATE_${String(WA_TEMPLATES[kind]?.name || kind).toUpperCase()}`;

/** Their personal "send your posts" token (linkSign, 60 days). '' when no signing key is set. */
export const submitToken = (campaignId, appId) => makeSignedToken({ k: 'd', c: campaignId, a: appId }, SUBMIT_LINK_TTL);
export const submitUrlFor = (campaignId, appId) => {
    const token = submitToken(campaignId, appId);
    return token ? `${APP_URL}/d/${token}` : '';
};

/* Their feedback form after a campaign (/f/<token>, 60 days). `key` is the person's key in campaign_feedback. */
export const feedbackToken = (campaignId, key) => makeSignedToken({ k: 'fb', c: campaignId, r: key }, SUBMIT_LINK_TTL);
export const feedbackUrlFor = (campaignId, key) => {
    const token = feedbackToken(campaignId, key);
    return token ? `${APP_URL}/f/${token}` : '';
};

/** Loads what the message needs, or { skip } when it shouldn't go out any more. */
const loadContext = async (db, job) => {
    if (!kindLive(job.kind)) return { skip: 'template_off' };
    const spec = KINDS[job.kind];
    if (!spec) return { skip: 'unknown_kind' };
    if (spec.custom) {
        const contact = await db.collection('creator_contacts').doc(contactIdFor(job.data?.phone)).get();
        if (contact.exists && contact.data().whatsappOptOut?.at) return { skip: 'opted_out' };
        return { custom: true };
    }
    if (spec.feedback) {
        const fRef = db.collection('campaign_feedback').doc(String(job.data?.feedbackId || 'x'));
        const [fSnap, campSnap] = await Promise.all([fRef.get(), db.collection('campaigns').doc(String(job.campaignId || 'x')).get()]);
        if (!fSnap.exists || !campSnap.exists) return { skip: 'not_found' };
        const feedback = fSnap.data();
        if (feedback.respondedAt) return { skip: 'answered' };
        if (!feedback.phone) return { skip: 'no_phone' };
        const contact = await db.collection('creator_contacts').doc(contactIdFor(feedback.phone)).get();
        if (contact.exists && contact.data().whatsappOptOut?.at) return { skip: 'opted_out' };
        if (!feedbackToken(job.campaignId, feedback.key)) return { skip: 'no_link_secret' };
        return { feedback, fRef, campaign: campSnap.data() };
    }
    if (spec.text) {
        const tRef = db.collection('outreach_inbox').doc(String(job.data?.threadId || ''));
        const thread = await tRef.get();
        if (!thread.exists) return { skip: 'not_found' };
        if (!windowOpen(thread.data())) return { skip: 'window_closed' };
        return { thread: thread.data(), tRef };
    }
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
    if (spec.groupLink && !settings.whatsappGroupLink) return { skip: 'no_group_link' };
    const contact = await db.collection('creator_contacts').doc(contactIdFor(app.phone)).get();
    if (contact.exists && contact.data().whatsappOptOut?.at) return { skip: 'opted_out' };
    if (app.status === 'removed') return { skip: 'removed' };
    if (job.kind === 'invite' && app.status !== 'message_queued') return { skip: 'status_changed' };
    if (job.kind === 'reminder') {
        if (settings.remindersEnabled === false) return { skip: 'reminders_off' };
        if (!['message_sent', 'replied'].includes(app.status) || app.joinedAt) return { skip: 'already_joined' };
    }
    if (job.kind === 'deliverables' && !(campaign.tasks || []).length) return { skip: 'no_deliverables' };
    if (spec.button === 'link' && !submitToken(job.campaignId, job.appId)) return { skip: 'no_link_secret' };
    // A deadline reminder (or posting-opens notice) is pointless once the posts it was about are in.
    if (['post_due', 'post_overdue', 'posts_open'].includes(job.kind)
        && (job.data?.taskIds || []).every(id => ['submitted', 'approved'].includes(app.deliverables?.[id]?.status))) return { skip: 'posts_in' };
    return { campaign, settings, app };
};

const SKIP_NOTE = {
    not_found: 'The application or campaign no longer exists.',
    no_group_link: 'No WhatsApp group link is set for this campaign.',
    status_changed: 'Their status changed before it was sent.',
    reminders_off: 'Reminders are off for this campaign.',
    already_joined: 'They joined (or moved on) before the reminder was due.',
    removed: 'They were removed from the shortlist.',
    no_deliverables: 'The campaign has no deliverables to send.',
    no_link_secret: 'LINK_SIGNING_SECRET isn’t set, so personal links can’t be made.',
    window_closed: 'More than 24 hours since their last message: WhatsApp only allows a template now.',
    opted_out: 'They asked to stop WhatsApp updates.',
    posts_in: 'Their posts came in before the reminder went out.',
    answered: 'They answered the feedback form before it went out.',
    no_phone: 'No WhatsApp number on file.',
    unknown_kind: 'Unknown message type.',
    template_off: 'Its WhatsApp template isn’t switched on yet (WHATSAPP_TEMPLATE_<NAME> in Vercel).',
};

const appRefOf = (db, job) => db.collection(appsPath(job.campaignId)).doc(job.appId);

/** Sends one claimed job. → 'sent' | 'retry' | 'failed' | 'cancelled' */
export const sendJob = async (db, job, { now = Date.now() } = {}) => {
    const ref = db.collection('outreach_queue').doc(job.id);
    const spec = KINDS[job.kind] || {};
    const ctx = await loadContext(db, job);
    if (ctx.skip) {
        await finishJob(ref, { status: 'cancelled', lastError: SKIP_NOTE[ctx.skip] });
        if (spec.badge && job.kind === 'invite') {
            await appRefOf(db, job).set({ delivery: { whatsapp: { status: 'cancelled', at: iso(now), error: SKIP_NOTE[ctx.skip] } } }, { merge: true }).catch(() => {});
        }
        if (spec.text) {
            await db.collection('outreach_inbox').doc(String(job.data?.threadId || '')).collection('inbox_messages').doc(String(job.data?.messageId || 'x'))
                .set({ status: 'failed', error: SKIP_NOTE[ctx.skip] }, { merge: true }).catch(() => {});
        }
        if (spec.feedback && ctx.skip !== 'not_found') {
            await db.collection('campaign_feedback').doc(String(job.data?.feedbackId || 'x'))
                .set({ delivery: { whatsapp: { status: 'cancelled', at: iso(now), error: SKIP_NOTE[ctx.skip] } } }, { merge: true }).catch(() => {});
        }
        return 'cancelled';
    }
    const attempts = Number(job.attempts || 0) + 1;
    let result;
    let phone;
    let text;
    if (spec.text) {
        phone = ctx.thread.phone;
        result = await sendText({
            to: phone,
            text: job.data.text,
            ref: { collection: `outreach_inbox/${job.data.threadId}/inbox_messages`, id: job.data.messageId },
        });
    } else if (spec.feedback) {
        const { feedback, campaign } = ctx;
        phone = feedback.phone;
        const tplCtx = { application: { fullName: feedback.name }, campaign };
        text = renderTemplatePreview('feedback', tplCtx);
        result = await sendTemplate({
            to: phone,
            template: WA_TEMPLATES.feedback.name,
            image: campaignImageOf(campaign),
            bodyParams: templateParamsFor('feedback', tplCtx),
            buttons: [{ index: 0, param: feedbackToken(job.campaignId, feedback.key) }],
            event: 'outreach-feedback',
            ref: { collection: 'campaign_feedback', id: String(job.data.feedbackId) },
            autoRetry: false,
            logId: logIdOf(job),
        });
    } else if (spec.custom) {
        ({ phone, text } = job.data);
        result = await sendTemplate({
            to: phone,
            template: job.data.template,
            language: job.data.language || undefined,
            header: job.data.header || undefined,
            bodyParams: job.data.bodyParams || [],
            buttons: job.data.buttons || [],
            event: 'admin-bulk',
            autoRetry: false,
            logId: logIdOf(job),
        });
    } else {
        const { campaign, settings, app } = ctx;
        phone = app.phone;
        const stop = (index) => ({ index, payload: STOP_PAYLOAD });
        const buttons = spec.button === 'join' ? [{ index: 0, payload: joinPayload(job.campaignId, job.appId) }, stop(1)]
            : spec.button === 'link' ? [{ index: 0, param: submitToken(job.campaignId, job.appId) }]
                : spec.button === 'stop' ? [stop(0)] : [];
        const tplCtx = { application: app, campaign, groupLink: settings.whatsappGroupLink, data: job.data || {} };
        text = renderTemplatePreview(job.kind, tplCtx);
        result = await sendTemplate({
            to: app.phone,
            template: WA_TEMPLATES[job.kind].name,
            // The campaign's own picture on every campaign message (its card when it has none).
            image: campaignImageOf(campaign),
            bodyParams: templateParamsFor(job.kind, tplCtx),
            buttons,
            event: `outreach-${job.kind}`,
            ref: spec.badge ? { collection: appsPath(job.campaignId), id: job.appId } : null,
            autoRetry: false,
            logId: logIdOf(job),
        });
    }
    const at = iso(Date.now());

    if (result.ok) {
        await finishJob(ref, { status: 'sent', attempts, sentAt: at, messageId: result.messageId, lastError: null, errorCode: null });
        if (!spec.text) {
            // A copy in their inbox thread, so the conversation shows what we sent.
            await appendThreadMessage(db, {
                phone, direction: 'out', type: 'template', text, wamid: result.messageId, status: 'sent',
                sentBy: job.createdBy || 'WhatsApp API', campaignId: job.campaignId, appId: job.appId, at, id: `j_${job.id}`.slice(0, 120),
            }).catch(e => console.warn('[outreach] inbox copy not saved:', e.message));
        }
        await afterSent(db, job, ctx, { at, messageId: result.messageId });
        return 'sent';
    }

    // Meta says "not now" (the number is blocked for a while, or too many sends): wait without using up an attempt.
    const holdMin = HOLD_MIN[Number(result.errorCode)];
    const queuedFor = Date.now() - (Date.parse(job.createdAt || '') || Date.now());
    if (holdMin && queuedFor < MAX_HOLD_MS) {
        const next = iso(Date.now() + holdMin * 60_000);
        await finishJob(ref, { status: 'queued', attempts: Number(job.attempts || 0), nextAttemptAt: next, heldAt: at, lastError: result.error || null, errorCode: result.errorCode || null });
        if (!spec.text) await db.collection('message_log').doc(logIdOf(job)).set({ status: 'held', nextAttemptAt: next }, { merge: true }).catch(() => {});
        if (spec.badge) {
            await appRefOf(db, job).set({ delivery: { whatsapp: { status: 'retrying', at, error: result.error || null, nextAttemptAt: next } } }, { merge: true }).catch(() => {});
        }
        return NUMBER_BLOCKED.has(Number(result.errorCode)) ? 'blocked' : 'held';
    }

    if (result.retriable && attempts < MAX_ATTEMPTS) {
        const next = iso(Date.now() + BACKOFF_MIN[attempts - 1] * 60_000);
        await finishJob(ref, { status: 'queued', attempts, nextAttemptAt: next, lastError: result.error || null, errorCode: result.errorCode || null });
        if (spec.badge) {
            await appRefOf(db, job).set({ delivery: { whatsapp: { status: 'retrying', at, error: result.error || null, nextAttemptAt: next } } }, { merge: true }).catch(() => {});
        }
        return 'retry';
    }

    await finishJob(ref, { status: 'failed', attempts, failedAt: at, lastError: result.error || 'Not sent', errorCode: result.errorCode || null });
    if (job.campaignId) {
        await auditRef(db, job.campaignId).set({
            appId: job.appId, field: 'whatsapp', from: null, to: 'failed', source: job.kind === 'reminder' ? 'reminder' : 'whatsapp_api',
            note: `${job.kind === 'invite' ? '' : `${job.kind}: `}${String(result.error || 'Not sent').slice(0, 280)}`, ...SYSTEM_ACTOR, at,
        });
    }
    if (result.status === 'skipped') console.warn(`[outreach] ${job.kind} not sent to ${maskPhone(phone)}: ${result.error}`);
    return 'failed';
};

/* One message_log row per queued message, however many times it's tried. */
const logIdOf = (job) => `q_${job.id}_${Date.parse(job.createdAt || '') || 0}`.slice(0, 400);

/* What happens on the application once a message has gone out. */
const afterSent = async (db, job, ctx, { at, messageId }) => {
    if (job.kind === 'invite') {
        await moveApplication(db, job.campaignId, job.appId, 'message_sent', {
            source: 'whatsapp_api',
            note: 'Sent with the WhatsApp API',
            patch: { messageSentAt: at, messageSentBy: 'WhatsApp API', lastMessageText: null, lastMessageId: messageId },
            now: at,
        });
        // The reminder waits in the queue; when it's due it checks they still haven't joined.
        if (ctx.settings.remindersEnabled !== false) {
            const hours = Number(ctx.settings.joinReminderHours) || defaultReminderHours();
            await enqueueJob(db, { campaignId: job.campaignId, appId: job.appId, kind: 'reminder', createdBy: 'WhatsApp API', dueAt: Date.now() + hours * 3600_000 });
        }
    } else if (job.kind === 'reminder') {
        await appRefOf(db, job).set({ reminderSentAt: at, updatedAt: at }, { merge: true });
        await auditRef(db, job.campaignId).set({ appId: job.appId, field: 'reminder', from: null, to: 'sent', source: 'reminder', note: 'Join reminder sent', ...SYSTEM_ACTOR, at });
    } else if (job.kind === 'deliverables') {
        await appRefOf(db, job).set({ submitLinkSentAt: at, updatedAt: at }, { merge: true });
        await auditRef(db, job.campaignId).set({ appId: job.appId, field: 'submit_link', from: null, to: 'sent', source: 'whatsapp_api', note: 'Personal link to send their posts', ...SYSTEM_ACTOR, at });
    } else if (job.kind === 'payout') {
        await appRefOf(db, job).update({ 'payout.noticeSentAt': at, updatedAt: at }).catch(() => {});
    } else if (job.kind === 'feedback') {
        await ctx.fRef.set({ whatsappSentAt: at, updatedAt: at }, { merge: true }).catch(() => {});
    }
};

/* ── Queue any message ────────────────────────────────────────────────── */

const ONCE = new Set(['invite', 'reminder', 'deliverables', 'payout', 'city_group', 'all_approved']);

/**
 * Queues one message. Kinds that go once per person (invite, reminder,
 * deliverables, payout) use a fixed id, so a second call while one is
 * waiting does nothing; a sent one is replaced only with `again`.
 * → the job id, or null when one is already waiting
 */
export const enqueueJob = async (db, { campaignId = null, appId = null, kind, data = {}, createdBy = null, dueAt = Date.now(), again = false, id = null }) => {
    if (!kindLive(kind)) return null;
    const jobKey = id || (ONCE.has(kind) ? jobId(campaignId, appId, kind) : `${campaignId || 'inbox'}_${appId || data.threadId || 'x'}_${kind}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`);
    const ref = db.collection('outreach_queue').doc(jobKey);
    return db.runTransaction(async (tx) => {
        const cur = await tx.get(ref);
        const status = cur.exists ? cur.data().status : null;
        if (status === 'queued' || status === 'sending') return null;
        if (status === 'sent' && !again) return null;
        tx.set(ref, {
            campaignId, appId, kind, data, status: 'queued', attempts: 0, nextAttemptAt: iso(dueAt),
            createdAt: nowIso(), createdBy, lastError: null, errorCode: null,
        });
        return jobKey;
    });
};

/**
 * Sends a queued job now if the rate limit has room (an admin is waiting on
 * it); otherwise it stays queued for the worker. → the outcome or 'queued'
 */
export const sendSoon = async (db, id) => {
    if (!id || !isWhatsAppConfigured()) return 'queued';
    const slot = await acquireSlot(db, Date.now());
    if (!slot.ok) return 'queued';
    const job = await claimJob(db, db.collection('outreach_queue').doc(id), Date.now());
    if (!job) return 'queued';
    return sendJob(db, job);
};

/* ── The worker ───────────────────────────────────────────────────────── */

const sleepFor = (ms) => new Promise(r => setTimeout(r, ms));

/**
 * Sends due jobs until the deadline, never faster than the rate limit.
 * → { sent, retried, failed, cancelled, capped, more, dueLeft }
 */
export const runQueue = async ({ db = getDb(), deadline = Date.now() + 45_000, sleep = sleepFor, clock = () => Date.now(), maxJobs = 500 } = {}) => {
    const report = { sent: 0, retried: 0, failed: 0, cancelled: 0, held: 0, capped: false, blocked: false, more: false, dueLeft: 0 };
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
            report[{ sent: 'sent', retry: 'retried', failed: 'failed', cancelled: 'cancelled', held: 'held', blocked: 'held' }[outcome]] += 1;
            handled += 1;
            progressed = true;
            // Meta is refusing the whole number: everyone else would get the same answer, so wait.
            if (outcome === 'blocked') { report.blocked = true; break; }
        }
        if (report.capped || report.more || report.blocked || !progressed) break;
    }
    if (report.blocked) return report;
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
        // Feedback requests have their own tab and counts.
        if (j.kind === 'feedback') return;
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

/* What an incoming message holds, for the inbox. */
const inboundParts = (msg) => {
    const type = String(msg?.type || 'unknown');
    const media = msg?.[type] && typeof msg[type] === 'object' ? msg[type] : {};
    if (type === 'text') return { type, text: msg.text?.body || '' };
    if (type === 'button') return { type, text: msg.button?.text || '' };
    if (type === 'interactive') return { type, text: msg.interactive?.button_reply?.title || msg.interactive?.list_reply?.title || '' };
    return { type, caption: media.caption || '', mediaId: media.id || null, mimeType: media.mime_type || null, text: type === 'location' ? `${media.name || ''} ${media.address || ''}`.trim() : '' };
};

/* ── STOP / START ─────────────────────────────────────────────────────── */

const STOP_TEXT = /^\s*(stop|stop updates|stop all|unsubscribe|opt ?out)\s*[.!]*\s*$/i;
const START_TEXT = /^\s*(start|resume|subscribe|opt ?in)\s*[.!]*\s*$/i;

/* A free-text reply into their thread (they just wrote, so the 24-hour window is open). */
const replyInThread = async (db, phone, text) => {
    const tRef = db.collection('outreach_inbox').doc(contactIdFor(phone));
    const now = nowIso();
    const mRef = tRef.collection('inbox_messages').doc();
    await mRef.set({ direction: 'out', type: 'text', text, status: 'queued', sentBy: 'Newbi (automatic)', at: now, expiresAt: new Date(Date.parse(now) + 365 * 86_400_000) });
    await tRef.set({ lastMessageAt: now, lastText: text.slice(0, 140), lastDirection: 'out', updatedAt: now }, { merge: true });
    const id = await enqueueJob(db, { kind: 'inbox_text', data: { threadId: tRef.id, messageId: mRef.id, text }, createdBy: 'Newbi (automatic)' });
    return sendSoon(db, id);
};

/*
 * Opts a number out of (or back into) every outreach template, across all
 * their campaigns: the contact, each application (so admins see it), and
 * anything already queued for them. Replies in the inbox still work: those
 * are answers to their own messages.
 */
export const setWhatsAppOptOut = async (db, phone, { optOut, via, now = nowIso() }) => {
    const contactRef = db.collection('creator_contacts').doc(contactIdFor(phone));
    const contact = await contactRef.get();
    await contactRef.set({ whatsappOptOut: optOut ? { at: now, via } : null, updatedAt: now }, { merge: true });
    for (const campaignId of contact.exists ? contact.data().campaignIds || [] : []) {
        const key = await db.collection('campaigns').doc(campaignId).collection('application_keys').doc(`p:${phone}`).get();
        if (!key.exists) continue;
        const appId = key.data().appId;
        await db.collection(appsPath(campaignId)).doc(appId).set({ whatsappOptOut: optOut, updatedAt: now }, { merge: true }).catch(() => {});
        await auditRef(db, campaignId).set({ appId, field: 'whatsapp_opt_out', from: null, to: optOut ? 'stopped' : 'resumed', source: 'whatsapp_webhook', note: `They replied ${via}`, ...SYSTEM_ACTOR, at: now });
        if (optOut) {
            const jobs = await db.collection('outreach_queue').where('campaignId', '==', campaignId).where('appId', '==', appId).get();
            for (const j of jobs.docs) {
                if (j.data().status === 'queued') await j.ref.set({ status: 'cancelled', nextAttemptAt: null, lastError: SKIP_NOTE.opted_out }, { merge: true });
            }
        }
    }
};

/* The application a number's message is about: their latest campaign's. */
const latestApplicationFor = async (db, from) => {
    const contact = await db.collection('creator_contacts').doc(contactIdFor(from)).get();
    const campaigns = contact.exists ? [...(contact.data().campaignIds || [])].reverse() : [];
    for (const campaignId of campaigns) {
        const key = await db.collection('campaigns').doc(campaignId).collection('application_keys').doc(`p:${from}`).get();
        if (key.exists) return { campaignId, appId: key.data().appId };
    }
    return null;
};

/**
 * An incoming message. Every message goes into the person's inbox thread.
 * "Joined ✅" (a quick-reply with our payload) marks them joined, sends their
 * personal link to submit posts and, if the campaign releases tickets on
 * joining, their ticket. Any other message marks them replied.
 * → 'joined' | 'replied' | null
 */
export const onOutreachInbound = async (msg, { db = getDb(), now = nowIso(), name = null } = {}) => {
    const from = phoneOf(msg?.from);
    if (!from) return null;
    const at = msg.timestamp ? new Date(Number(msg.timestamp) * 1000).toISOString() : now;
    const payload = msg.type === 'button' ? msg.button?.payload
        : msg.type === 'interactive' ? (msg.interactive?.button_reply?.id || '') : '';
    const store = (target) => appendThreadMessage(db, {
        phone: from, name, direction: 'in', wamid: msg.id || null, at, campaignId: target?.campaignId || null, appId: target?.appId || null, ...inboundParts(msg),
    }).catch(e => console.warn('[outreach] inbox message not saved:', e.message));

    // STOP (the "Stop updates" button, or a reply like STOP) and START, before anything else.
    const text = msg.type === 'text' ? String(msg.text?.body || '') : '';
    if (payload === STOP_PAYLOAD || STOP_TEXT.test(text) || START_TEXT.test(text)) {
        const optOut = !START_TEXT.test(text);
        await store(await latestApplicationFor(db, from));
        await setWhatsAppOptOut(db, from, { optOut, via: payload === STOP_PAYLOAD ? '“Stop updates”' : `“${text.trim().slice(0, 30)}”`, now });
        await replyInThread(db, from, optOut
            ? 'Done. You won’t get campaign updates from Newbi on WhatsApp any more. You’ll still see them in the Newbi app. Reply START to turn WhatsApp updates back on.'
            : 'Welcome back! You’ll get campaign updates from Newbi on WhatsApp again. Reply STOP any time.').catch(() => null);
        return optOut ? 'stopped' : 'started';
    }

    const joinTarget = payload ? readJoinPayload(payload) : null;
    if (payload && !joinTarget) {
        // A button we didn't sign (or one from another system): keep the message, change nothing.
        await store(null);
        return null;
    }
    if (joinTarget) {
        const appRef = db.collection(appsPath(joinTarget.campaignId)).doc(joinTarget.appId);
        const appSnap = await appRef.get();
        // The tap must come from the number we sent it to.
        if (!appSnap.exists || appSnap.data().phone !== from) {
            console.warn(`[outreach] "Joined" from ${maskPhone(from)} doesn't match the application; ignored.`);
            await store(null);
            return null;
        }
        await store(joinTarget);
        const moved = await moveApplication(db, joinTarget.campaignId, joinTarget.appId, 'joined', {
            source: 'whatsapp_webhook',
            note: 'Tapped “Joined” in WhatsApp',
            patch: { joinedAt: now, joinedVia: 'button', lastReplyAt: now },
            now,
        });
        await db.collection('outreach_queue').doc(jobId(joinTarget.campaignId, joinTarget.appId, 'reminder'))
            .set({ status: 'cancelled', nextAttemptAt: null, lastError: 'They joined.' }, { merge: true });
        if (!moved) {
            await appRef.set({ lastReplyAt: now }, { merge: true });
            return null;
        }
        // Loaded here, not at the top: that module imports this one.
        const { afterJoined } = await import('./outreachDeliver.js');
        await afterJoined(db, joinTarget).catch(e => console.warn('[outreach] after-joined steps failed:', e.message));
        return 'joined';
    }

    // Any other message: their latest outreach application, if they have one.
    const target = await latestApplicationFor(db, from);
    await store(target);
    if (!target) return null;
    const moved = await moveApplication(db, target.campaignId, target.appId, 'replied', {
        source: 'whatsapp_webhook',
        note: 'Replied in WhatsApp',
        patch: { lastReplyAt: now },
        now,
    });
    if (!moved) await db.collection(appsPath(target.campaignId)).doc(target.appId).set({ lastReplyAt: now }, { merge: true }).catch(() => {});
    return moved ? 'replied' : null;
};
