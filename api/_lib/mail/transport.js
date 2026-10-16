/**
 * The one place mail leaves the building: Gmail SMTP through a pooled
 * nodemailer connection per login. Swapping providers later means changing
 * only send() here.
 *
 * Daily caps: Workspace allows about 2,000 messages a day per login. We count
 * our own sends in `mail_quota/{login}_{IST date}` and stop at MAIL_DAILY_CAP
 * (default 1,800). Bulk mail stops MAIL_TRANSACTIONAL_RESERVE (default 300)
 * earlier, so tickets and account mail always have room.
 */
import nodemailer from 'nodemailer';
import { getDb, FieldValue, istDate, nowIso } from '../db.js';

export const DAILY_CAP = Math.max(1, parseInt(process.env.MAIL_DAILY_CAP || '1800', 10) || 1800);
export const TRANSACTIONAL_RESERVE = Math.max(0, parseInt(process.env.MAIL_TRANSACTIONAL_RESERVE || '300', 10) || 300);

const pools = new Map();
let testTransport = null;

/** Tests pass an object with sendMail(); production never calls this. */
export const setTransportForTests = (t) => { testTransport = t; pools.clear(); };

const transportFor = (account) => {
    if (testTransport) return testTransport;
    if (!account?.smtpUser || !account?.smtpPass) {
        const err = new Error(`Mail login missing for ${account?.serviceKey || 'sender'}`);
        err.code = 'NO_CREDENTIALS';
        err.permanent = true;
        throw err;
    }
    const id = `${account.smtpUser}`;
    let t = pools.get(id);
    if (!t) {
        t = nodemailer.createTransport({
            pool: true,
            maxConnections: 3,
            maxMessages: 100,
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT || '587', 10),
            secure: process.env.SMTP_SECURE === 'true',
            auth: { user: account.smtpUser, pass: account.smtpPass },
            connectionTimeout: 10000,
            greetingTimeout: 8000,
            socketTimeout: 20000,
        });
        pools.set(id, t);
    }
    return t;
};

/** True for Gmail's "you've hit today's limit" answers. */
export const isQuotaError = (err) => {
    const text = `${err?.responseCode || ''} ${err?.response || ''} ${err?.message || ''}`;
    return /5\.4\.5|daily (user )?sending (quota|limit)|sending limit exceeded|4\.7\.0 .*(limit|quota)/i.test(text);
};

/** Worth another try later (network, throttling), as opposed to a bad address. */
export const isTransientError = (err) => {
    if (err?.permanent) return false;
    if (isQuotaError(err)) return true;
    const code = Number(err?.responseCode || 0);
    if (code >= 500 && code < 600) return false;
    return true;
};

/**
 * send({ from, to, subject, html, text, headers, replyTo, cc, bcc, attachments }, { account })
 * Resolves with { messageId, accepted, rejected }.
 */
export const send = async (message, { account } = {}) => {
    const transport = transportFor(account);
    const info = await transport.sendMail({
        from: message.from || account?.from,
        sender: account?.smtpUser || undefined,
        to: message.to,
        cc: message.cc || undefined,
        bcc: message.bcc || undefined,
        replyTo: message.replyTo || account?.replyTo || undefined,
        subject: message.subject,
        html: message.html,
        text: message.text || undefined,
        headers: message.headers && Object.keys(message.headers).length ? message.headers : undefined,
        attachments: message.attachments || [],
        // Content only: never read server files or fetch URLs for attachments.
        disableFileAccess: true,
        disableUrlAccess: true,
    });
    const norm = (list) => (list || []).map(r => String(typeof r === 'string' ? r : r?.address || '').toLowerCase()).filter(Boolean);
    return { messageId: info?.messageId || null, accepted: norm(info?.accepted), rejected: norm(info?.rejected) };
};

/* ---------------- Daily quota ---------------- */

const quotaRef = (db, quotaId, date) => db.collection('mail_quota').doc(`${quotaId}_${date}`);

/**
 * Reserves up to `want` sends for today. Returns how many were granted
 * (0 when the cap is reached). Never throws: if the counter can't be read the
 * send goes ahead, because Gmail enforces the real limit anyway.
 */
export const reserveQuota = async (quotaId, want = 1, kind = 'transactional', db = getDb()) => {
    const date = istDate();
    const limit = kind === 'bulk' ? Math.max(0, DAILY_CAP - TRANSACTIONAL_RESERVE) : DAILY_CAP;
    try {
        return await db.runTransaction(async (tx) => {
            const ref = quotaRef(db, quotaId, date);
            const snap = await tx.get(ref);
            const data = snap.exists ? snap.data() : {};
            if (data.exhausted) return 0;
            const used = Number(data.count || 0);
            const granted = Math.max(0, Math.min(want, limit - used));
            if (granted > 0) {
                tx.set(ref, {
                    quotaId,
                    date,
                    count: used + granted,
                    [kind === 'bulk' ? 'bulk' : 'transactional']: Number(data[kind === 'bulk' ? 'bulk' : 'transactional'] || 0) + granted,
                    cap: DAILY_CAP,
                    updatedAt: nowIso(),
                }, { merge: true });
            }
            return granted;
        });
    } catch (e) {
        console.warn('[MAIL] Quota check failed, sending anyway:', e.message);
        return want;
    }
};

/** Gives back reservations that weren't used (e.g. a batch ended early). */
export const releaseQuota = async (quotaId, count, kind = 'bulk', db = getDb()) => {
    if (!count) return;
    try {
        await quotaRef(db, quotaId, istDate()).set({
            count: FieldValue.increment(-count),
            [kind === 'bulk' ? 'bulk' : 'transactional']: FieldValue.increment(-count),
        }, { merge: true });
    } catch (e) { /* best effort */ }
};

/** Gmail said we're done for today: stop everyone using this login until tomorrow. */
export const markQuotaExhausted = async (quotaId, db = getDb()) => {
    try {
        await quotaRef(db, quotaId, istDate()).set({ quotaId, date: istDate(), exhausted: true, exhaustedAt: nowIso() }, { merge: true });
    } catch (e) { /* best effort */ }
};

export const quotaStatus = async (quotaId, db = getDb()) => {
    try {
        const snap = await quotaRef(db, quotaId, istDate()).get();
        const d = snap.exists ? snap.data() : {};
        return { date: istDate(), used: Number(d.count || 0), cap: DAILY_CAP, reserve: TRANSACTIONAL_RESERVE, exhausted: Boolean(d.exhausted) };
    } catch {
        return { date: istDate(), used: 0, cap: DAILY_CAP, reserve: TRANSACTIONAL_RESERVE, exhausted: false };
    }
};
