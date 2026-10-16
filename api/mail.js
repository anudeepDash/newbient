import { verifyToken } from './_lib/auth.js';
import { signTrackedLinks } from './_lib/linkSign.js';
import { isStaffCaller, findSuppressed, listSuppressed, recordResubscribe, normalizeEmail, isValidEmail } from './_lib/mailing.js';
import { getEmailConfig, resolveSender, quotaIdFor } from './_lib/mail/accounts.js';
import { send as transportSend, reserveQuota, quotaStatus } from './_lib/mail/transport.js';
import { previewCampaign, createCampaign, retryCampaign, cancelCampaign, sendCampaignTest, runCampaignWorker } from './_lib/mail/campaigns.js';
import { sendTransactional, retryDeferredMail } from './_lib/mail/send.js';
import { retryFailedWhatsApp } from './_lib/whatsapp.js';
import { handleEvent, isEvent } from './_lib/mail/events.js';
import { STAFF_TEMPLATES, hasTemplate } from './_lib/mail/templates/index.js';

/*
 * /api/mail — the mail service's one Vercel function (the project is at the
 * Hobby plan's 12-function limit, so everything mail-related routes here).
 *
 *   GET  (Vercel Cron, Bearer CRON_SECRET)   run the mail worker
 *   POST { action: 'event', event, ...ids }  server-built notification for a record
 *   POST { action: 'campaign-…' }            bulk queue (staff)
 *   POST { action: 'send-template', … }      staff document emails (invoice, proposal…)
 *   POST { to, subject, html }               staff free-form mail (legacy composer screens)
 */

export const maxDuration = 60;

if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error('CRITICAL: Missing default SMTP credentials. App refuses to start.');
}

const rateLimitCache = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const STAFF_RATE_LIMIT_MAX_REQUESTS = 3000;
const USER_RATE_LIMIT_MAX_REQUESTS = 30;
const IP_RATE_LIMIT_MAX_REQUESTS = 60;
const MAX_CHAIN_DEPTH = 40;

function checkRateLimit(key, max) {
    if (!key || key === 'unknown') return true;
    const now = Date.now();
    const rec = rateLimitCache.get(key) || { count: 0, resetTime: now + RATE_LIMIT_WINDOW_MS };
    if (now > rec.resetTime) { rec.count = 1; rec.resetTime = now + RATE_LIMIT_WINDOW_MS; } else { rec.count++; }
    if (rateLimitCache.size > 10000) rateLimitCache.clear();
    rateLimitCache.set(key, rec);
    return rec.count <= max;
}

const ALLOWED_ORIGINS = ['https://www.newbi.live', 'https://newbi.live', 'https://app.newbi.live', 'https://newbi-ent.vercel.app', 'http://localhost:5173'];

/* ---------- Worker ---------- */

const isCronRequest = (req) => {
    const secret = process.env.CRON_SECRET;
    const auth = String(req.headers.authorization || '');
    if (secret) return auth === `Bearer ${secret}`;
    // Without a secret only Vercel's own cron may run it (set CRON_SECRET!).
    return /vercel-cron/i.test(String(req.headers['user-agent'] || ''));
};

/**
 * Starts another worker run without waiting for it (the request is dropped
 * after a moment; the new invocation keeps going on its own).
 */
const chainWorker = async (req, depth) => {
    const secret = process.env.CRON_SECRET;
    const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
    if (!secret || !host || depth >= MAX_CHAIN_DEPTH) return false;
    const proto = /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host) ? 'http' : 'https';
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 2500);
    try {
        await fetch(`${proto}://${host}/api/mail`, { headers: { Authorization: `Bearer ${secret}`, 'x-mail-chain': String(depth + 1) }, signal: ctrl.signal });
    } catch { /* aborted on purpose */ } finally {
        clearTimeout(timer);
    }
    return true;
};

/** One pass: transactional retries first, then campaigns until the deadline. */
const runWorker = async (req, { budgetMs = 48000, depth = 0 } = {}) => {
    const started = Date.now();
    const retried = await retryDeferredMail({ deadline: started + 8000 }).catch(e => { console.error('[MAIL] retry pass failed:', e.message); return 0; });
    const waRetried = await retryFailedWhatsApp({ deadline: started + 12000 }).catch(e => { console.error('[MAIL] WhatsApp retry failed:', e.message); return 0; });
    const campaigns = await runCampaignWorker({ deadline: started + budgetMs }).catch(e => { console.error('[MAIL] campaign worker failed:', e); return { campaigns: 0, sent: 0, more: false }; });
    let chained = false;
    if (campaigns.more) chained = await chainWorker(req, depth);
    return { retried, waRetried, ...campaigns, chained, ms: Date.now() - started };
};

/* ---------- Free-form staff mail (the composer screens) ---------- */

const pickStaffSender = (accountType, fromEmail, fromName) => {
    let serviceKey = 'OFFICIAL';
    let defaultName = fromName || 'Newbi Entertainment';
    let defaultEmail = fromEmail || 'partnership@newbi.live';
    const e = String(fromEmail || '').toLowerCase().trim();
    if (accountType === 'weekly') { serviceKey = 'WEEKLY'; defaultName = fromName || 'Weekly by Concert Zone'; defaultEmail = fromEmail || 'weekly@newbi.live'; }
    else if (accountType === 'creators' || accountType === 'creator' || e.includes('creator')) { serviceKey = 'CREATORS'; defaultName = fromName || 'Newbi Creators'; defaultEmail = fromEmail || 'creators@newbi.live'; }
    else if (e.includes('tickets')) { serviceKey = 'TICKETS'; defaultName = fromName || 'Newbi Tickets'; defaultEmail = 'noreply@newbi.live'; }
    else if (e.includes('support')) { serviceKey = 'SUPPORT'; defaultName = fromName || 'Newbi Support'; defaultEmail = 'noreply@newbi.live'; }
    else if (e.includes('billing')) { serviceKey = 'BILLING'; defaultName = fromName || 'Newbi Finance'; defaultEmail = 'partnership@newbi.live'; }
    else if (e.includes('booking')) { serviceKey = 'BOOKING'; defaultName = fromName || 'Newbi Bookings'; defaultEmail = 'booking@newbi.live'; }
    else if (e.includes('legal')) { serviceKey = 'LEGAL'; defaultName = fromName || 'Newbi Legal'; defaultEmail = 'partnership@newbi.live'; }
    else if (e.includes('partnership')) { serviceKey = 'PARTNERSHIP'; defaultName = fromName || 'Newbi Partnerships'; defaultEmail = 'partnership@newbi.live'; }
    else if (e.includes('collaborations')) { serviceKey = 'COLLABORATIONS'; defaultName = fromName || 'Newbi Collaborations'; defaultEmail = 'collaborations@newbi.live'; }
    else if (e.includes('security')) { serviceKey = 'SECURITY'; defaultName = fromName || 'Newbi Security'; defaultEmail = 'noreply@newbi.live'; }
    else if (e.includes('noreply')) { serviceKey = 'NOREPLY'; defaultName = fromName || 'Newbi Notifications'; defaultEmail = 'noreply@newbi.live'; }
    else if (e) { serviceKey = e.split('@')[0].toUpperCase().replace(/[^A-Z0-9_]/g, '_'); }
    const cfg = getEmailConfig(serviceKey, defaultName, defaultEmail);
    return { serviceKey, ...cfg };
};

const safeAttachments = (attachments) => (Array.isArray(attachments) ? attachments : [])
    .filter(a => a && typeof a === 'object' && typeof a.content === 'string')
    .slice(0, 10)
    .map(({ filename, content, contentType, encoding, cid }) => ({ filename: String(filename || 'attachment').slice(0, 120), content, contentType, encoding, cid }));

const splitList = (v) => (Array.isArray(v) ? v : String(v || '').split(',')).map(normalizeEmail).filter(Boolean);

const handleFreeForm = async (req, res, body, decodedToken) => {
    let { to, cc, bcc } = body;
    const { subject, text, html, attachments, accountType = 'official', fromEmail, fromName, bulk = false, campaignId = '' } = body;
    if (!to || !subject || (!text && !html)) return res.status(400).json({ error: 'Missing required fields' });

    let suppressed = [];
    if (bulk) {
        const bccList = splitList(bcc);
        const toList = splitList(to);
        const check = await findSuppressed(bccList.length ? bccList : toList);
        suppressed = check.suppressed;
        if (suppressed.length) {
            const blocked = new Set(suppressed);
            if (bccList.length) { bcc = bccList.filter(e => !blocked.has(e)); if (!bcc.length) return res.status(200).json({ success: true, skipped: true, suppressed, rejected: [] }); }
            else { to = toList.filter(e => !blocked.has(e)); if (!to.length) return res.status(200).json({ success: true, skipped: true, suppressed, rejected: [] }); }
        }
    }

    const headers = {};
    ['List-Unsubscribe', 'List-Unsubscribe-Post', 'List-Id', 'X-Campaign-Id'].forEach((name) => {
        const value = body.headers?.[name];
        if (typeof value === 'string' && value.length < 1000 && !/[\r\n]/.test(value)) headers[name] = value;
    });
    if (bulk && campaignId && !headers['X-Campaign-Id'] && /^[\w-]{1,80}$/.test(String(campaignId))) headers['X-Campaign-Id'] = String(campaignId);

    const cfg = pickStaffSender(accountType, fromEmail, fromName);
    if (!cfg.smtpUser || !cfg.smtpPass) {
        console.error(`[MAIL] Missing credentials for service: ${cfg.serviceKey}`);
        return res.status(500).json({ error: 'Mail is not set up for this sender' });
    }
    const account = { serviceKey: cfg.serviceKey, smtpUser: cfg.smtpUser, smtpPass: cfg.smtpPass, from: `"${String(cfg.fromDisplayName || '').replace(/["\r\n]/g, '')}" <${cfg.fromEmailAddress}>`, quotaId: quotaIdFor(cfg.smtpUser) };
    const count = splitList(to).length + splitList(cc).length + splitList(bcc).length;
    if (!(await reserveQuota(account.quotaId, Math.max(1, count), bulk ? 'bulk' : 'transactional'))) {
        return res.status(429).json({ error: "Today's sending limit for this address is used up. Try again tomorrow." });
    }
    try {
        const info = await transportSend({
            to, cc: cc && (Array.isArray(cc) ? cc.length : String(cc).trim()) ? cc : undefined, bcc: bcc && (Array.isArray(bcc) ? bcc.length : String(bcc).trim()) ? bcc : undefined,
            subject: String(subject).replace(/[\r\n]+/g, ' '), text, html: signTrackedLinks(html), headers, attachments: safeAttachments(attachments),
        }, { account });
        return res.status(200).json({ success: true, messageId: info.messageId, suppressed, rejected: info.rejected });
    } catch (error) {
        const correlationId = Math.random().toString(36).substring(2, 15);
        console.error(`[MAIL] ${cfg.serviceKey} mail failed [Correlation ID: ${correlationId}] by ${decodedToken.email}:`, error.message);
        return res.status(500).json({ error: 'Failed to send email', correlationId });
    }
};

/* ---------- Staff template sends (documents etc.) ---------- */

const handleSendTemplate = async (res, body, decodedToken) => {
    const { template, data = {}, to, cc, bcc, attachments } = body;
    if (!hasTemplate(template) || !STAFF_TEMPLATES.has(template)) return res.status(400).json({ success: false, error: 'Unknown email' });
    const recipients = [...new Set(splitList(to))].filter(isValidEmail).slice(0, 20);
    if (!recipients.length) return res.status(400).json({ success: false, error: 'Add at least one valid email address.' });
    const files = safeAttachments(attachments);
    const results = [];
    // One email per address so each person gets their own copy; CC/BCC ride with the first.
    for (let i = 0; i < recipients.length; i++) {
        const r = await sendTransactional(template, recipients[i], data, {
            cc: i === 0 ? splitList(cc).filter(isValidEmail) : undefined,
            bcc: i === 0 ? splitList(bcc).filter(isValidEmail) : undefined,
            attachments: files,
            uid: null,
            ref: body.ref && typeof body.ref === 'object' && /^[\w-]{1,60}$/.test(body.ref.collection || '') && /^[\w-]{1,128}$/.test(body.ref.id || '') ? { collection: body.ref.collection, id: body.ref.id } : null,
        });
        results.push({ email: recipients[i], ok: r.ok, status: r.status, error: r.error });
    }
    const failed = results.filter(r => !r.ok);
    if (failed.length) console.warn(`[MAIL] ${template} by ${decodedToken.email}: ${failed.length} failed`);
    return res.status(failed.length === results.length ? 502 : 200).json({ success: failed.length === 0, results, failed: failed.map(f => f.email) });
};

/* ---------- Handler ---------- */

export default async function handler(req, res) {
    const origin = req.headers.origin;
    if (ALLOWED_ORIGINS.includes(origin)) res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, Accept, Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();

    // Vercel Cron (and the worker starting its next run).
    if (req.method === 'GET') {
        if (!isCronRequest(req)) return res.status(401).json({ error: 'Unauthorized' });
        const depth = Math.max(0, parseInt(req.headers['x-mail-chain'] || '0', 10) || 0);
        const result = await runWorker(req, { depth });
        console.log('[MAIL] worker', JSON.stringify(result));
        return res.status(200).json({ success: true, ...result });
    }

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const action = String(body.action || '');
    const clientIp = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();

    const decodedToken = await verifyToken(req);
    const isStaff = decodedToken ? await isStaffCaller(decodedToken) : false;

    // Notifications built from a record. Some may come from guests without
    // an account (right after registering), so a token is optional here and
    // each event checks who may trigger it.
    if (action === 'event') {
        if (!checkRateLimit(`ip:${clientIp}`, isStaff ? STAFF_RATE_LIMIT_MAX_REQUESTS : IP_RATE_LIMIT_MAX_REQUESTS)
            || (decodedToken && !isStaff && !checkRateLimit(`user:${decodedToken.uid}`, USER_RATE_LIMIT_MAX_REQUESTS))) {
            return res.status(429).json({ success: false, error: 'Too many requests. Please try again later.' });
        }
        if (!isEvent(body.event)) return res.status(400).json({ success: false, error: 'Unknown event' });
        const caller = { uid: decodedToken?.uid || null, email: decodedToken?.email || null, name: decodedToken?.name || '', staff: isStaff };
        const out = await handleEvent(body.event, body, caller);
        return res.status(out.status).json(out.body);
    }

    if (!decodedToken) return res.status(401).json({ error: 'Unauthorized: Valid Firebase ID Token required' });
    // Everything below is staff-only: non-staff confirmation mail now goes through events.
    if (!isStaff) return res.status(403).json({ error: 'Forbidden' });
    if (!checkRateLimit(`uid:${decodedToken.uid || decodedToken.email}`, STAFF_RATE_LIMIT_MAX_REQUESTS)) {
        return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }

    try {
        switch (action) {
        case 'suppression-list':
            return res.status(200).json({ success: true, entries: await listSuppressed() });
        case 'resubscribe': {
            if (!isValidEmail(body.email)) return res.status(400).json({ error: 'Invalid email' });
            const email = await recordResubscribe(body.email, undefined, { source: `admin:${decodedToken.email || decodedToken.uid}` });
            return res.status(200).json({ success: true, email });
        }
        case 'campaign-preview':
            return res.status(200).json({ success: true, ...(await previewCampaign(body)) });
        case 'campaign-create': {
            const created = await createCampaign({ ...body, createdBy: decodedToken.email || decodedToken.uid });
            // Small sends go out right away; the rest continues in the background.
            let worker = null;
            if (created.status === 'queued') worker = await runWorker(req, { budgetMs: 20000 });
            return res.status(200).json({ success: true, ...created, worker });
        }
        case 'campaign-retry': {
            const retried = await retryCampaign(body.campaignId);
            if (!retried) {
                // Sent from the browser before the queue existed: queue the people given.
                if (!body.html || !Array.isArray(body.recipients)) return res.status(409).json({ success: false, error: 'This campaign can only be retried from the composer.' });
                const created = await createCampaign({ ...body, campaignId: String(body.campaignId), createdBy: decodedToken.email || decodedToken.uid });
                const worker = await runWorker(req, { budgetMs: 20000 });
                return res.status(200).json({ success: true, ...created, worker });
            }
            const worker = await runWorker(req, { budgetMs: 20000 });
            return res.status(200).json({ success: true, ...retried, worker });
        }
        case 'campaign-cancel':
            return res.status(200).json({ success: true, ...(await cancelCampaign(body.campaignId)) });
        case 'campaign-test': {
            // Only ever to the signed-in staff member's own address.
            const to = normalizeEmail(decodedToken.email);
            if (!isValidEmail(to) || decodedToken.email_verified === false) return res.status(400).json({ success: false, error: 'Your account has no verified email address to send a test to.' });
            const sent = await sendCampaignTest({ ...body, to, name: decodedToken.name || '' });
            return res.status(200).json({ success: true, to, ...sent });
        }
        case 'worker': {
            const result = await runWorker(req, { budgetMs: 25000 });
            return res.status(200).json({ success: true, ...result });
        }
        case 'quota-status': {
            const account = resolveSender(body.accountType === 'weekly' ? 'weekly' : 'official', { credentialKey: 'NEWSLETTER' });
            return res.status(200).json({ success: true, ...(await quotaStatus(account.quotaId)), account: account.fromEmail });
        }
        case 'send-template':
            return handleSendTemplate(res, body, decodedToken);
        case '':
            return handleFreeForm(req, res, body, decodedToken);
        default:
            return res.status(400).json({ success: false, error: 'Unknown action' });
        }
    } catch (err) {
        const status = Number(err.status) || 500;
        if (status >= 500) console.error(`[MAIL] ${action || 'send'} failed:`, err);
        return res.status(status).json({ success: false, error: status >= 500 ? 'Mail action failed' : err.message });
    }
}
