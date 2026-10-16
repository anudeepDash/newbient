/**
 * Sending one email from a server template, the way every API should:
 *
 *   const result = await sendTransactional('pass-confirmed', 'a@b.com', data, { uid, ref });
 *
 * - Renders the template (escaped, branded layout).
 * - Writes `mail_log/{id}`: event, recipient, status, provider message id, error.
 * - Retries transient failures with backoff (3 tries here; the mail worker
 *   picks up what's left later).
 * - Is always awaited by callers, so serverless functions don't freeze it.
 *
 * Never throws; returns { ok, id, messageId, error, status }.
 */
import { render } from './templates/index.js';
import { resolveSender } from './accounts.js';
import { send, reserveQuota, isQuotaError, isTransientError, markQuotaExhausted } from './transport.js';
import { getDb, FieldValue, nowIso, SITE_URL, APP_URL } from '../db.js';
import { normalizeEmail, isValidEmail, findSuppressed } from '../mailing.js';
import { unsubscribeUrl, listUnsubscribeHeaders } from './tracking.js';

const wait = (ms) => new Promise(r => setTimeout(r, ms));
const BACKOFF_MS = [0, 800, 2500];
// Later retries by the worker: 5 min, 30 min, 3 h.
export const WORKER_RETRY_DELAYS_MIN = [5, 30, 180];
const MAX_LOG_DATA_CHARS = 20000;

const compactData = (data) => {
    try {
        const json = JSON.stringify(data || {});
        return json.length <= MAX_LOG_DATA_CHARS ? JSON.parse(json) : null;
    } catch {
        return null;
    }
};

/**
 * sendTransactional(event, to, data, opts)
 * opts: { uid, ref: {collection, id}, cc, bcc, attachments, replyTo, sender, fromName, fromEmail,
 *         idempotencyKey, origin, retries }
 */
export const sendTransactional = async (event, to, data = {}, opts = {}) => {
    const db = getDb();
    const recipient = normalizeEmail(to);
    if (!isValidEmail(recipient)) return { ok: false, status: 'skipped', error: 'No valid email address' };

    let rendered;
    try {
        rendered = render(event, data, { origin: opts.origin || SITE_URL, appOrigin: APP_URL });
    } catch (err) {
        console.error(`[MAIL] Template ${event} failed:`, err.message);
        return { ok: false, status: 'failed', error: 'Template error' };
    }

    // Marketing-type templates (campaign invites) respect the unsubscribe list.
    const marketing = rendered.kind === 'marketing';
    if (marketing) {
        const { suppressed } = await findSuppressed([recipient], db);
        if (suppressed.length) return { ok: false, status: 'suppressed', error: 'Unsubscribed' };
    }

    const account = resolveSender(opts.sender || rendered.sender, { fromName: opts.fromName, fromEmail: opts.fromEmail });
    const logRef = opts.idempotencyKey
        ? db.collection('mail_log').doc(String(opts.idempotencyKey).replace(/\//g, '_').slice(0, 300))
        : db.collection('mail_log').doc();

    // Same key already sent: don't send twice (double clicks, retried requests).
    if (opts.idempotencyKey) {
        try {
            const existing = await logRef.get();
            if (existing.exists && ['sent', 'sending'].includes(existing.data().status)) {
                return { ok: true, id: logRef.id, status: 'duplicate', messageId: existing.data().messageId || null };
            }
        } catch (e) { /* carry on */ }
    }

    const base = {
        event,
        to: recipient,
        uid: opts.uid || null,
        ref: opts.ref || null,
        kind: rendered.kind,
        account: account.quotaId,
        from: account.fromEmail,
        subject: rendered.subject,
        createdAt: nowIso(),
        status: 'sending',
        attempts: 0,
    };
    try { await logRef.set(base, { merge: true }); } catch (e) { console.warn('[MAIL] mail_log write failed:', e.message); }

    const granted = await reserveQuota(account.quotaId, 1, 'transactional', db);
    if (!granted) {
        await logRef.set({ status: 'retry', error: 'Daily sending limit reached', nextAttemptAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(), payload: opts.attachments?.length ? null : { event, to: recipient, data: compactData(data), opts: { uid: opts.uid || null, ref: opts.ref || null, sender: opts.sender || null } } }, { merge: true }).catch(() => {});
        return { ok: false, id: logRef.id, status: 'deferred', error: 'Daily sending limit reached' };
    }

    const headers = {};
    if (marketing) {
        const unsub = unsubscribeUrl({ email: recipient, campaignId: event, origin: opts.origin || SITE_URL });
        rendered = { ...rendered, ...render(event, data, { origin: opts.origin || SITE_URL, appOrigin: APP_URL, unsubscribeUrl: unsub }) };
        Object.assign(headers, listUnsubscribeHeaders(unsub));
    }

    const message = {
        from: account.from,
        to: recipient,
        cc: opts.cc,
        bcc: opts.bcc,
        replyTo: opts.replyTo,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
        headers,
        attachments: opts.attachments || [],
    };

    const tries = Math.max(1, Math.min(opts.retries || BACKOFF_MS.length, BACKOFF_MS.length));
    let lastError = null;
    for (let attempt = 0; attempt < tries; attempt++) {
        if (BACKOFF_MS[attempt]) await wait(BACKOFF_MS[attempt]);
        try {
            const info = await send(message, { account });
            if (info.rejected.includes(recipient)) {
                lastError = Object.assign(new Error('Rejected by mail server'), { permanent: true });
                break;
            }
            await logRef.set({ status: 'sent', messageId: info.messageId, attempts: attempt + 1, sentAt: nowIso(), error: FieldValue.delete() }, { merge: true }).catch(() => {});
            return { ok: true, id: logRef.id, status: 'sent', messageId: info.messageId };
        } catch (err) {
            lastError = err;
            if (isQuotaError(err)) { await markQuotaExhausted(account.quotaId, db); break; }
            if (!isTransientError(err)) break;
        }
    }

    const retryable = lastError && isTransientError(lastError) && !(opts.attachments && opts.attachments.length);
    const error = String(lastError?.message || 'Send failed').slice(0, 300);
    await logRef.set({
        status: retryable ? 'retry' : 'failed',
        error,
        attempts: tries,
        failedAt: nowIso(),
        ...(retryable ? {
            nextAttemptAt: new Date(Date.now() + WORKER_RETRY_DELAYS_MIN[0] * 60 * 1000).toISOString(),
            workerAttempts: 0,
            payload: { event, to: recipient, data: compactData(data), opts: { uid: opts.uid || null, ref: opts.ref || null, sender: opts.sender || null } },
        } : {}),
    }, { merge: true }).catch(() => {});
    console.error(`[MAIL] ${event} to ${recipient} failed: ${error}`);
    return { ok: false, id: logRef.id, status: retryable ? 'retry' : 'failed', error };
};

/**
 * Retries mail_log entries the worker owns (status 'retry', due now).
 * Called from the mail worker. Returns how many it tried.
 */
export const retryDeferredMail = async ({ limit = 20, deadline = Date.now() + 15000 } = {}) => {
    const db = getDb();
    let snap;
    try {
        snap = await db.collection('mail_log').where('status', '==', 'retry').limit(100).get();
    } catch (e) {
        console.warn('[MAIL] Retry scan failed:', e.message);
        return 0;
    }
    const now = Date.now();
    const due = snap.docs
        .map(d => ({ ...d.data(), docRef: d.ref }))
        .filter(d => d.payload && Date.parse(d.nextAttemptAt || 0) <= now)
        .slice(0, limit);
    let tried = 0;
    for (const item of due) {
        if (Date.now() > deadline) break;
        tried++;
        const { event, to, data, opts = {} } = item.payload;
        const attempts = Number(item.workerAttempts || 0) + 1;
        // Mark it so a parallel worker doesn't take the same one.
        await item.docRef.set({ status: 'retrying', workerAttempts: attempts }, { merge: true }).catch(() => {});
        const res = await sendTransactional(event, to, data, { ...opts, retries: 1 });
        const final = res.ok || attempts >= WORKER_RETRY_DELAYS_MIN.length;
        await item.docRef.set({
            status: res.ok ? 'retried' : final ? 'failed' : 'retry',
            retriedAs: res.id || null,
            lastRetryAt: nowIso(),
            ...(final ? {} : { nextAttemptAt: new Date(Date.now() + WORKER_RETRY_DELAYS_MIN[attempts] * 60 * 1000).toISOString() }),
        }, { merge: true }).catch(() => {});
        // The retry wrote its own log entry; drop its payload copy so it isn't retried twice.
        if (res.id && res.id !== item.docRef.id) await db.collection('mail_log').doc(res.id).set({ status: res.ok ? 'sent' : 'failed', payload: FieldValue.delete(), retryOf: item.docRef.id }, { merge: true }).catch(() => {});
    }
    return tried;
};
