/**
 * Bulk email runs on the server now, so the admin can close the tab.
 *
 *   mail_campaigns/{id}                  the job: html, subject, sender, schedule, status, lease
 *   mail_campaigns/{id}/recipients/{email}  { email, name, role, status, attempts, error, sentAt }
 *   email_campaigns/{id}                 the report the Mailing history shows (opens, clicks…)
 *
 * The mail worker (api/mail.js, run by Vercel Cron and kicked after each
 * queue) sends in small batches within the daily cap of the bulk login
 * (SMTP_USER_NEWSLETTER, else the sender's own), one personal email per
 * person with a signed unsubscribe link and List-Unsubscribe headers.
 */
import { getDb, FieldValue, nowIso, istDate, SITE_URL } from '../db.js';
import { normalizeEmail, isValidEmail, findSuppressed, unsubscribeDocId } from '../mailing.js';
import { resolveSender, senderForStaffChoice } from './accounts.js';
import { send, reserveQuota, releaseQuota, markQuotaExhausted, isQuotaError, isTransientError, quotaStatus } from './transport.js';
import { personalise } from './tracking.js';

export const BATCH_SIZE = 25;
const CONCURRENCY = 3;
const MAX_ATTEMPTS = 3;
const LEASE_MS = 90 * 1000;
const MAX_HTML_CHARS = 800000;
const MAX_STORED_EMAILS = 2000;
const BULK_CREDENTIALS = 'NEWSLETTER';

const STATUS_DONE = ['completed', 'partially_failed', 'failed', 'cancelled'];

/* ---------- Building the list ---------- */

/** Cleans a recipient list: valid, unique, not excluded. */
export const cleanRecipients = (list = [], exclude = []) => {
    let invalid = 0;
    const byEmail = new Map();
    let total = 0;
    (Array.isArray(list) ? list : []).forEach((item) => {
        total++;
        const raw = typeof item === 'string' ? item : item?.email;
        const email = normalizeEmail(raw);
        if (!isValidEmail(email)) { invalid++; return; }
        if (byEmail.has(email)) return;
        byEmail.set(email, {
            email,
            name: typeof item === 'string' ? '' : String(item.name || item.displayName || item.fullName || '').slice(0, 120),
            role: typeof item === 'string' ? '' : String(item.role || item.category || '').slice(0, 60),
        });
    });
    const excludeSet = new Set((exclude || []).map(normalizeEmail).filter(Boolean));
    let excluded = 0;
    const recipients = [];
    byEmail.forEach((r) => { if (excludeSet.has(r.email)) excluded++; else recipients.push(r); });
    return { recipients, invalid, duplicates: total - invalid - byEmail.size, excluded };
};

const senderFor = ({ accountType, fromName, fromEmail }) => {
    // A From address outside our domains would be rewritten by Gmail anyway.
    const safeFrom = /@(newbi\.live|artistant\.in)$/i.test(String(fromEmail || '').trim()) ? String(fromEmail).trim() : '';
    const name = senderForStaffChoice({ accountType, fromEmail: safeFrom });
    return resolveSender(name, { fromName: fromName ? String(fromName).replace(/[\r\n"]/g, '').slice(0, 80) : undefined, fromEmail: safeFrom || undefined, credentialKey: BULK_CREDENTIALS });
};

/** Counts without writing anything: for the "who gets this" preview. */
export const previewCampaign = async ({ recipients, exclude, accountType, fromEmail }) => {
    const cleaned = cleanRecipients(recipients, exclude);
    const { suppressed, checked } = await findSuppressed(cleaned.recipients.map(r => r.email));
    const account = senderFor({ accountType, fromEmail });
    const quota = await quotaStatus(account.quotaId);
    const willSend = cleaned.recipients.length - suppressed.length;
    const bulkRoom = Math.max(0, quota.cap - quota.reserve - quota.used);
    return {
        total: Array.isArray(recipients) ? recipients.length : 0,
        invalid: cleaned.invalid,
        duplicates: cleaned.duplicates,
        excluded: cleaned.excluded,
        suppressed: suppressed.length,
        suppressionChecked: checked,
        willSend,
        quota: { ...quota, bulkRoom, account: account.fromEmail },
        // Rough: whatever is over today's room goes out on later days.
        days: willSend <= bulkRoom ? 1 : 1 + Math.ceil((willSend - bulkRoom) / Math.max(1, quota.cap - quota.reserve)),
    };
};

/* ---------- Queueing ---------- */

const chunk = (arr, n) => { const out = []; for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n)); return out; };

const writeRecipients = async (db, campaignRef, recipients, extra = {}) => {
    const batches = chunk(recipients, 450);
    // A few commits at a time keeps big lists inside the function's time limit.
    for (const group of chunk(batches, 4)) {
        await Promise.all(group.map((part) => {
            const batch = db.batch();
            part.forEach(r => batch.set(campaignRef.collection('recipients').doc(unsubscribeDocId(r.email)), { ...r, attempts: 0, ...extra, queuedAt: nowIso() }));
            return batch.commit();
        }));
    }
};

/**
 * Queues a campaign. `campaignId` re-uses an existing report (retrying an old
 * browser-sent campaign); otherwise a new one is made.
 */
export const createCampaign = async ({
    createdBy, subject, html, recipients, exclude = [], accountType = 'official', fromName, fromEmail,
    meta = {}, scheduledAt = null, campaignId = null,
}) => {
    const db = getDb();
    const cleanSubject = String(subject || '').replace(/[\r\n]+/g, ' ').trim().slice(0, 250);
    if (!cleanSubject) throw Object.assign(new Error('Add a subject.'), { status: 400 });
    if (!html || typeof html !== 'string') throw Object.assign(new Error('The email is empty.'), { status: 400 });
    if (html.length > MAX_HTML_CHARS) throw Object.assign(new Error('The email is too large. Host images instead of pasting them.'), { status: 413 });
    if (/data:image\/[a-z]+;base64,/i.test(html)) throw Object.assign(new Error('Pasted images must be uploaded before sending.'), { status: 400 });

    const cleaned = cleanRecipients(recipients, exclude);
    if (!cleaned.recipients.length) throw Object.assign(new Error('No valid recipients'), { status: 400 });
    const { suppressed } = await findSuppressed(cleaned.recipients.map(r => r.email), db);
    const blocked = new Set(suppressed);
    const queue = cleaned.recipients.filter(r => !blocked.has(r.email));
    const skipped = cleaned.recipients.filter(r => blocked.has(r.email));

    const when = scheduledAt ? Date.parse(scheduledAt) : NaN;
    if (scheduledAt && (!Number.isFinite(when) || when > Date.now() + 90 * 24 * 3600 * 1000)) throw Object.assign(new Error('Pick a send time within the next 90 days.'), { status: 400 });
    const isScheduled = Number.isFinite(when) && when > Date.now() + 60 * 1000;

    const account = senderFor({ accountType, fromName, fromEmail });
    const id = campaignId || `camp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const now = nowIso();
    const jobRef = db.collection('mail_campaigns').doc(id);
    const reportRef = db.collection('email_campaigns').doc(id);
    const existingJob = campaignId ? await jobRef.get() : null;
    if (existingJob?.exists && !STATUS_DONE.includes(existingJob.data().status)) {
        throw Object.assign(new Error('This campaign is still sending.'), { status: 409 });
    }

    const status = isScheduled ? 'scheduled' : 'queued';
    await jobRef.set({
        id,
        subject: cleanSubject,
        html,
        accountType,
        sender: { name: account.senderName, fromName: account.fromName, fromEmail: account.fromEmail },
        status,
        scheduledAt: isScheduled ? new Date(when).toISOString() : null,
        createdAt: existingJob?.exists ? existingJob.data().createdAt : now,
        createdBy: createdBy || null,
        total: queue.length,
        sent: existingJob?.exists ? Number(existingJob.data().sent || 0) : 0,
        failed: 0,
        suppressed: skipped.length,
        leaseUntil: null,
        pausedReason: null,
        updatedAt: now,
    }, { merge: true });

    // Retrying: only the people in this list get it again.
    await writeRecipients(db, jobRef, queue, { status: 'pending' });
    if (skipped.length) await writeRecipients(db, jobRef, skipped, { status: 'suppressed' });

    const report = {
        id,
        queue: true,
        status,
        scheduledAt: isScheduled ? new Date(when).toISOString() : null,
        lastProgressAt: now,
        deliveryMode: 'individual',
    };
    if (campaignId) {
        Object.assign(report, { lastRetryAt: now, retryRecipients: queue.length, failedEmails: [], unsentEmails: [], failedCount: 0 });
    } else {
        Object.assign(report, {
            subject: cleanSubject,
            category: String(meta.category || (accountType === 'weekly' ? 'NEWSLETTER' : accountType === 'creators' ? 'CREATORS' : 'OFFICIAL')).slice(0, 40),
            senderName: account.fromName,
            senderEmail: account.fromEmail,
            accountType,
            recipientType: String(meta.recipientType || (accountType === 'weekly' ? 'subscribers' : 'custom')).slice(0, 120),
            audience: meta.audience || null,
            totalRecipients: queue.length,
            recipients: queue.slice(0, MAX_STORED_EMAILS).map(r => ({ email: r.email, name: r.name || '' })),
            recipientsTruncated: queue.length > MAX_STORED_EMAILS,
            invalidCount: cleaned.invalid,
            duplicateCount: cleaned.duplicates,
            excludedCount: cleaned.excluded,
            sentAt: isScheduled ? new Date(when).toISOString() : now,
            createdAt: now,
            sentCount: 0,
            failedCount: 0,
            suppressedCount: skipped.length,
            suppressedEmails: skipped.slice(0, MAX_STORED_EMAILS).map(r => r.email),
            opensCount: 0, uniqueOpens: 0, openedEmails: [],
            clicksCount: 0, uniqueClicks: 0, clickedEmails: [], clickedUrls: [],
            headerText: String(meta.headerText || '').slice(0, 500),
            messageBody: String(meta.messageBody || '').length <= 200000 ? String(meta.messageBody || '') : '',
            preheader: String(meta.preheader || '').slice(0, 300),
            heroImage: String(meta.heroImage || '').slice(0, 1000),
            ctaText: String(meta.ctaText || '').slice(0, 120),
            ctaUrl: String(meta.ctaUrl || '').slice(0, 1000),
            theme: meta.theme === 'dark' ? 'dark' : 'light',
            html: html.length <= 200000 ? html : '',
        });
    }
    await reportRef.set(report, { merge: true });

    return {
        campaignId: id,
        status,
        scheduledAt: report.scheduledAt,
        queued: queue.length,
        suppressed: skipped.map(r => r.email),
        invalid: cleaned.invalid,
        duplicates: cleaned.duplicates,
        excluded: cleaned.excluded,
    };
};

/** Puts failed (and, after a stop, unsent) people back in the queue. */
export const retryCampaign = async (campaignId) => {
    const db = getDb();
    const jobRef = db.collection('mail_campaigns').doc(String(campaignId));
    const job = await jobRef.get();
    if (!job.exists) return null; // sent from the browser before the queue existed
    if (!STATUS_DONE.includes(job.data().status)) throw Object.assign(new Error('This campaign is still sending.'), { status: 409 });
    const snap = await jobRef.collection('recipients').where('status', 'in', ['failed', 'unsent']).get();
    if (snap.empty) return { campaignId, queued: 0 };
    for (const part of chunk(snap.docs, 450)) {
        const batch = db.batch();
        part.forEach(d => batch.set(d.ref, { status: 'pending', attempts: 0, error: FieldValue.delete(), nextAttemptAt: FieldValue.delete() }, { merge: true }));
        await batch.commit();
    }
    const now = nowIso();
    await jobRef.set({ status: 'queued', failed: 0, leaseUntil: null, pausedReason: null, updatedAt: now }, { merge: true });
    await db.collection('email_campaigns').doc(String(campaignId)).set({ status: 'queued', lastRetryAt: now, retryRecipients: snap.size, failedEmails: [], unsentEmails: [], failedCount: 0, lastProgressAt: now }, { merge: true });
    return { campaignId, queued: snap.size };
};

export const cancelCampaign = async (campaignId) => {
    const db = getDb();
    const jobRef = db.collection('mail_campaigns').doc(String(campaignId));
    const job = await jobRef.get();
    if (!job.exists) throw Object.assign(new Error('Campaign not found'), { status: 404 });
    if (STATUS_DONE.includes(job.data().status)) return { campaignId, status: job.data().status };
    await jobRef.set({ status: 'cancelling', updatedAt: nowIso() }, { merge: true });
    // If no worker holds it, wrap it up now; otherwise the worker does when it sees the flag.
    if (!(Number(job.data().leaseUntil || 0) > Date.now())) await finalizeCampaign(db, jobRef, { cancelled: true });
    return { campaignId, status: 'cancelled' };
};

/** One copy to the person asking, through the same path (no tracking, no record). */
export const sendCampaignTest = async ({ to, name, subject, html, accountType, fromName, fromEmail }) => {
    const account = senderFor({ accountType, fromName, fromEmail });
    const person = { email: normalizeEmail(to), name: name || '', role: 'Admin' };
    const p = personalise({ html, subject, person, campaignId: 'test', origin: SITE_URL, track: false });
    const granted = await reserveQuota(account.quotaId, 1, 'transactional');
    if (!granted) throw Object.assign(new Error("Today's sending limit is used up. Try again tomorrow."), { status: 429 });
    const info = await send({ from: account.from, to: person.email, subject: `[Test] ${p.subject || 'Untitled'}`, html: p.html, headers: p.headers }, { account });
    return { messageId: info.messageId, from: account.fromEmail };
};

/* ---------- The worker ---------- */

const takeLease = async (db, ref) => db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return null;
    const job = snap.data();
    if (Number(job.leaseUntil || 0) > Date.now()) return null;
    if (!['queued', 'sending', 'scheduled', 'cancelling'].includes(job.status)) return null;
    tx.set(ref, { leaseUntil: Date.now() + LEASE_MS, ...(job.status === 'cancelling' ? {} : { status: 'sending' }), startedAt: job.startedAt || nowIso() }, { merge: true });
    return job;
});

const nextIstMidnightIso = () => {
    const today = istDate();
    return new Date(Date.parse(`${today}T00:00:00+05:30`) + 24 * 3600 * 1000).toISOString();
};

const sendOne = async (job, account, r) => {
    const p = personalise({ html: job.html, subject: job.subject, person: r, campaignId: job.id, origin: SITE_URL });
    try {
        const info = await send({ from: account.from, to: r.email, subject: p.subject, html: p.html, headers: p.headers }, { account });
        if (info.rejected.includes(r.email)) return { status: 'failed', error: 'Rejected by mail server' };
        return { status: 'sent', messageId: info.messageId };
    } catch (err) {
        if (isQuotaError(err)) return { status: 'quota', error: 'Daily sending limit reached' };
        const attempts = Number(r.attempts || 0) + 1;
        const retry = isTransientError(err) && attempts < MAX_ATTEMPTS;
        return { status: retry ? 'pending' : 'failed', attempts, error: String(err.message || 'Send failed').slice(0, 200), nextAttemptAt: retry ? new Date(Date.now() + attempts * 30 * 1000).toISOString() : null };
    }
};

/** Runs one leased campaign until it's done, time runs out or the cap is hit. */
const runCampaign = async (db, jobRef, job, deadline, exhausted) => {
    const account = resolveSender(job.sender?.name || 'official', { fromName: job.sender?.fromName, fromEmail: job.sender?.fromEmail, credentialKey: BULK_CREDENTIALS });
    const reportRef = db.collection('email_campaigns').doc(job.id);
    let progressed = 0;
    let stopReason = null;

    while (Date.now() < deadline) {
        const fresh = (await jobRef.get()).data() || {};
        if (fresh.status === 'cancelling') { stopReason = 'cancelled'; break; }
        if (exhausted.has(account.quotaId)) { stopReason = 'quota'; break; }

        const snap = await jobRef.collection('recipients').where('status', '==', 'pending').limit(BATCH_SIZE * 2).get();
        const now = Date.now();
        const ready = snap.docs.filter(d => !d.data().nextAttemptAt || Date.parse(d.data().nextAttemptAt) <= now).slice(0, BATCH_SIZE);
        if (!ready.length) {
            if (snap.empty) { stopReason = 'done'; break; }
            // Only retries waiting a few seconds: wait here if there's time, else leave it for the next run.
            const soonest = Math.min(...snap.docs.map(d => Date.parse(d.data().nextAttemptAt) || now));
            if (soonest - now < deadline - Date.now() - 5000) { await new Promise(r => setTimeout(r, Math.max(0, soonest - now) + 50)); continue; }
            stopReason = 'waiting';
            break;
        }

        const granted = await reserveQuota(account.quotaId, ready.length, 'bulk', db);
        if (!granted) { exhausted.add(account.quotaId); stopReason = 'quota'; break; }
        const batchDocs = ready.slice(0, granted);

        // Someone may have unsubscribed since this was queued.
        const { suppressed } = await findSuppressed(batchDocs.map(d => d.data().email), db);
        const blocked = new Set(suppressed);

        const results = new Map();
        const queue = batchDocs.filter(d => !blocked.has(d.data().email));
        let hitQuota = false;
        const workers = Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
            while (queue.length && !hitQuota && Date.now() < deadline) {
                const d = queue.shift();
                const res = await sendOne(job, account, { ...d.data(), id: d.id });
                if (res.status === 'quota') hitQuota = true;
                results.set(d.id, res);
            }
        });
        await Promise.all(workers);

        const batch = db.batch();
        let sent = 0; let failed = 0; let unsubscribed = 0; let unused = 0;
        batchDocs.forEach((d) => {
            const email = d.data().email;
            if (blocked.has(email)) { unsubscribed++; unused++; batch.set(d.ref, { status: 'suppressed', updatedAt: nowIso() }, { merge: true }); return; }
            const res = results.get(d.id);
            if (!res || res.status === 'quota') { unused++; return; } // still pending
            if (res.status === 'sent') { sent++; batch.set(d.ref, { status: 'sent', sentAt: nowIso(), messageId: res.messageId || null }, { merge: true }); return; }
            if (res.status === 'failed') failed++;
            batch.set(d.ref, { status: res.status, attempts: res.attempts || Number(d.data().attempts || 0) + 1, error: res.error || null, nextAttemptAt: res.nextAttemptAt || null, updatedAt: nowIso() }, { merge: true });
        });
        await batch.commit();
        if (unused) await releaseQuota(account.quotaId, unused, 'bulk', db);
        if (hitQuota) { await markQuotaExhausted(account.quotaId, db); exhausted.add(account.quotaId); }

        progressed += sent + failed + unsubscribed;
        const now2 = nowIso();
        await jobRef.set({ sent: FieldValue.increment(sent), failed: FieldValue.increment(failed), suppressed: FieldValue.increment(unsubscribed), leaseUntil: Date.now() + LEASE_MS, pausedReason: null, updatedAt: now2 }, { merge: true });
        await reportRef.set({
            status: 'sending', sentCount: FieldValue.increment(sent), failedCount: FieldValue.increment(failed), suppressedCount: FieldValue.increment(unsubscribed),
            lastProgressAt: now2, pausedReason: null,
        }, { merge: true });
        if (hitQuota) { stopReason = 'quota'; break; }
    }

    if (stopReason === 'done' || stopReason === 'cancelled') {
        await finalizeCampaign(db, jobRef, { cancelled: stopReason === 'cancelled' });
    } else {
        const paused = stopReason === 'quota' ? { pausedReason: 'daily_limit', resumesAt: nextIstMidnightIso() } : {};
        await jobRef.set({ leaseUntil: null, ...paused, updatedAt: nowIso() }, { merge: true });
        if (stopReason === 'quota') await reportRef.set({ pausedReason: 'daily_limit', resumesAt: paused.resumesAt, lastProgressAt: nowIso() }, { merge: true });
    }
    return { progressed, stopReason };
};

const listEmails = async (jobRef, status) => {
    const snap = await jobRef.collection('recipients').where('status', '==', status).limit(MAX_STORED_EMAILS).get();
    return snap.docs.map(d => d.data().email);
};

/** Works out the final state and writes it to both records. */
export const finalizeCampaign = async (db, jobRef, { cancelled = false } = {}) => {
    if (cancelled) {
        // Whoever was still waiting won't get it.
        const pending = await jobRef.collection('recipients').where('status', '==', 'pending').get();
        for (const part of chunk(pending.docs, 450)) {
            const batch = db.batch();
            part.forEach(d => batch.set(d.ref, { status: 'unsent' }, { merge: true }));
            await batch.commit();
        }
    }
    const job = (await jobRef.get()).data() || {};
    const [failedEmails, unsentEmails, suppressedEmails] = await Promise.all([listEmails(jobRef, 'failed'), listEmails(jobRef, 'unsent'), listEmails(jobRef, 'suppressed')]);
    const sent = Number(job.sent || 0);
    const status = cancelled ? 'cancelled' : failedEmails.length === 0 ? 'completed' : sent > 0 ? 'partially_failed' : 'failed';
    const now = nowIso();
    await jobRef.set({ status, leaseUntil: null, pausedReason: null, completedAt: now, updatedAt: now }, { merge: true });
    await db.collection('email_campaigns').doc(job.id || jobRef.id).set({
        status, failedEmails, unsentEmails, suppressedEmails, failedCount: failedEmails.length, completedAt: now, lastProgressAt: now, pausedReason: null,
    }, { merge: true });
    return status;
};

/**
 * One worker run. Picks due campaigns oldest first and sends until
 * `deadline`. Returns { campaigns, sent, more } — `more` means work is left
 * that could go now (not just scheduled or blocked by the cap).
 */
export const runCampaignWorker = async ({ deadline = Date.now() + 45000 } = {}) => {
    const db = getDb();
    const snap = await db.collection('mail_campaigns').where('status', 'in', ['queued', 'sending', 'scheduled', 'cancelling']).limit(50).get();
    const now = Date.now();
    const due = snap.docs
        .map(d => ({ ref: d.ref, data: d.data() }))
        .filter(({ data }) => data.status !== 'scheduled' || Date.parse(data.scheduledAt || 0) <= now)
        .filter(({ data }) => !data.resumesAt || Date.parse(data.resumesAt) <= now || data.status === 'cancelling')
        .sort((a, b) => String(a.data.createdAt).localeCompare(String(b.data.createdAt)));

    const exhausted = new Set();
    let progressed = 0;
    let more = false;
    let touched = 0;
    for (const { ref } of due) {
        if (Date.now() > deadline) { more = true; break; }
        const job = await takeLease(db, ref);
        if (!job) continue;
        touched++;
        if (job.status === 'cancelling') { await finalizeCampaign(db, ref, { cancelled: true }); continue; }
        if (job.status === 'scheduled') {
            await db.collection('email_campaigns').doc(job.id || ref.id).set({ status: 'sending', sentAt: nowIso() }, { merge: true });
        }
        const res = await runCampaign(db, ref, { ...job, id: job.id || ref.id }, deadline, exhausted);
        progressed += res.progressed;
        if (!['done', 'cancelled', 'quota'].includes(res.stopReason)) more = true;
    }
    return { campaigns: touched, sent: progressed, more };
};
