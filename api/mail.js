import nodemailer from 'nodemailer';
import { verifyToken } from './_lib/auth.js';
import { signTrackedLinks } from './_lib/linkSign.js';
import { isStaffCaller, findSuppressed, listSuppressed, recordResubscribe, normalizeEmail, isValidEmail } from './_lib/mailing.js';

if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error('CRITICAL: Missing default SMTP credentials. App refuses to start.');
}

const rateLimitCache = new Map();
const RATE_LIMIT_MAX_REQUESTS = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

// Staff sending campaigns make one request per batch (or per person for
// personalised mail), so they get a much larger allowance keyed by account.
const STAFF_RATE_LIMIT_MAX_REQUESTS = 3000;
// Everyone else only triggers their own confirmation mail.
const USER_RATE_LIMIT_MAX_REQUESTS = 5;

function checkRateLimit(ip, max = RATE_LIMIT_MAX_REQUESTS) {
    if (!ip || ip === 'unknown') return true;
    const now = Date.now();
    const userRecord = rateLimitCache.get(ip) || { count: 0, resetTime: now + RATE_LIMIT_WINDOW_MS };

    if (now > userRecord.resetTime) {
        userRecord.count = 1;
        userRecord.resetTime = now + RATE_LIMIT_WINDOW_MS;
    } else {
        userRecord.count++;
    }

    if (rateLimitCache.size > 10000) rateLimitCache.clear();
    
    rateLimitCache.set(ip, userRecord);
    return userRecord.count <= max;
}

// Helper to resolve name and email from "Name <email>" or "email" formats
function parseAlias(fromStr) {
    if (!fromStr) return {};
    const match = fromStr.match(/^(?:"?([^"]*)"?\s)?<?([^>]+)>?$/);
    if (match) {
        return {
            name: match[1]?.trim() || null,
            email: match[2]?.trim() || null
        };
    }
    return { email: fromStr.trim() };
}

// Dynamic helper to resolve SMTP credentials and sender alias by service key
function getEmailConfig(serviceKey, defaultName, defaultEmail) {
    const key = serviceKey.toUpperCase();
    
    // SMTP credentials lookup (e.g. SMTP_USER_TICKETS, SMTP_PASS_TICKETS or CREATORS_SMTP_USER)
    let smtpUser = process.env[`SMTP_USER_${key}`] || process.env[`${key}_SMTP_USER`] || process.env.SMTP_USER;
    let smtpPass = process.env[`SMTP_PASS_${key}`] || process.env[`${key}_SMTP_PASS`] || process.env.SMTP_PASS;
    
    // Backward compatibility for weekly
    if (key === 'WEEKLY') {
        smtpUser = process.env.WEEKLY_SMTP_USER || smtpUser;
        smtpPass = process.env.WEEKLY_SMTP_PASS || smtpPass;
    }
    
    // Resolve from name and email
    let fromDisplayName = defaultName;
    let fromEmailAddress = defaultEmail;
    
    let envFrom = process.env[`SMTP_FROM_${key}`] || process.env[`${key}_SMTP_FROM`];
    if (!envFrom && key === 'OFFICIAL') {
        envFrom = process.env.SMTP_FROM;
    }
    
    if (envFrom) {
        const parsed = parseAlias(envFrom);
        if (parsed.name) fromDisplayName = parsed.name;
        if (parsed.email) fromEmailAddress = parsed.email;
    }
    
    // Clean strings
    let cleanUser = smtpUser?.trim() || '';
    let cleanPass = smtpPass?.trim() || '';
    if ((cleanUser.startsWith('"') && cleanUser.endsWith('"')) || (cleanUser.startsWith("'") && cleanUser.endsWith("'"))) {
        cleanUser = cleanUser.slice(1, -1).trim();
    }
    if ((cleanPass.startsWith('"') && cleanPass.endsWith('"')) || (cleanPass.startsWith("'") && cleanPass.endsWith("'"))) {
        cleanPass = cleanPass.slice(1, -1).trim();
    }
    
    return {
        smtpUser: cleanUser,
        smtpPass: cleanPass,
        fromDisplayName,
        fromEmailAddress
    };
}

export default async function handler(req, res) {
    // Enable CORS
    const allowedOrigins = ['https://www.newbi.live', 'https://newbi.live', 'https://newbi-ent.vercel.app', 'http://localhost:5173'];
    const origin = req.headers.origin;
    
    if (allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const decodedToken = await verifyToken(req);
    if (!decodedToken) {
        return res.status(401).json({ error: 'Unauthorized: Valid Firebase ID Token required' });
    }

    const isStaff = await isStaffCaller(decodedToken);
    const body = req.body || {};

    // Mailing admin helpers: the unsubscribe list, and letting an address back in.
    if (body.action === 'suppression-list' || body.action === 'resubscribe') {
        if (!isStaff) return res.status(403).json({ error: 'Forbidden' });
        try {
            if (body.action === 'suppression-list') {
                return res.status(200).json({ success: true, entries: await listSuppressed() });
            }
            if (!isValidEmail(body.email)) return res.status(400).json({ error: 'Invalid email' });
            const email = await recordResubscribe(body.email);
            return res.status(200).json({ success: true, email });
        } catch (error) {
            console.error('[MAIL] Mailing action failed:', error.message);
            return res.status(500).json({ error: 'Mailing action failed' });
        }
    }

    const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
    const allowed = isStaff
        ? checkRateLimit(`uid:${decodedToken.uid || decodedToken.email}`, STAFF_RATE_LIMIT_MAX_REQUESTS)
        : checkRateLimit(clientIp) && checkRateLimit(`user:${decodedToken.uid}`, USER_RATE_LIMIT_MAX_REQUESTS);
    if (!allowed) {
        return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }

    let { to, cc, bcc } = body;
    const { subject, text, html, attachments, accountType = 'official', fromEmail, bulk = false, campaignId = '' } = body;
    let { fromName } = body;

    if (!to || !subject || (!text && !html)) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    // Non-staff only trigger their own confirmation mail (ticket, guestlist, creator
    // welcome): one recipient, a fixed Newbi sender, no copies, no files.
    // Phase 6 moves these to server-built templates.
    if (!isStaff) {
        const recipients = (Array.isArray(to) ? to : String(to).split(',')).map(normalizeEmail).filter(Boolean);
        if (recipients.length !== 1 || !isValidEmail(recipients[0]) || cc || bcc || bulk || (attachments && attachments.length)) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        const allowedAccounts = ['official', 'creators', 'creator'];
        if (!allowedAccounts.includes(accountType) || (fromEmail && !/^(booking|tickets|creators|noreply)@newbi\.live$/i.test(String(fromEmail).trim()))) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        fromName = null; // the server picks the display name for these senders
    }

    // Attachments are inline content only: never a server file path or a URL to fetch.
    const safeAttachments = (Array.isArray(attachments) ? attachments : [])
        .filter(a => a && typeof a === 'object' && typeof a.content === 'string')
        .map(({ filename, content, contentType, encoding, cid }) => ({ filename, content, contentType, encoding, cid }));

    // Campaign mail never goes to people who unsubscribed. Transactional mail
    // (tickets, invoices) doesn't set `bulk` and is unaffected.
    let suppressed = [];
    if (bulk) {
        const splitList = (v) => (Array.isArray(v) ? v : String(v || '').split(','))
            .map(normalizeEmail).filter(Boolean);
        const bccList = splitList(bcc);
        const toList = splitList(to);
        const candidates = bccList.length ? bccList : toList;
        const check = await findSuppressed(candidates);
        suppressed = check.suppressed;
        if (suppressed.length) {
            const blocked = new Set(suppressed);
            if (bccList.length) {
                bcc = bccList.filter(e => !blocked.has(e));
                if (!bcc.length) return res.status(200).json({ success: true, skipped: true, suppressed, rejected: [] });
            } else {
                to = toList.filter(e => !blocked.has(e));
                if (!to.length) return res.status(200).json({ success: true, skipped: true, suppressed, rejected: [] });
            }
        }
    }

    // Only list headers are passed through, never arbitrary ones.
    const extraHeaders = {};
    const ALLOWED_HEADERS = ['List-Unsubscribe', 'List-Unsubscribe-Post', 'List-Id', 'X-Campaign-Id'];
    if (body.headers && typeof body.headers === 'object') {
        ALLOWED_HEADERS.forEach(name => {
            const value = body.headers[name];
            if (typeof value === 'string' && value.length < 1000 && !/[\r\n]/.test(value)) extraHeaders[name] = value;
        });
    }
    if (bulk && campaignId && !extraHeaders['X-Campaign-Id'] && /^[\w-]{1,80}$/.test(String(campaignId))) {
        extraHeaders['X-Campaign-Id'] = String(campaignId);
    }

    // Resolve serviceKey based on accountType or fromEmail
    let serviceKey = 'OFFICIAL';
    let defaultName = fromName || 'Newbi Entertainment';
    let defaultEmail = fromEmail || 'partnership@newbi.live';

    if (accountType === 'weekly') {
        serviceKey = 'WEEKLY';
        defaultName = fromName || 'Weekly by Concert Zone';
        defaultEmail = fromEmail || 'weekly@newbi.live';
    } else if (accountType === 'creators' || accountType === 'creator') {
        serviceKey = 'CREATORS';
        defaultName = fromName || 'Newbi Creators';
        defaultEmail = fromEmail || 'creators@newbi.live';
    } else if (fromEmail) {
        const emailLower = fromEmail.toLowerCase().trim();
        if (emailLower.includes('creator')) {
            serviceKey = 'CREATORS';
            defaultName = fromName || 'Newbi Creators';
            defaultEmail = fromEmail || 'creators@newbi.live';
        } else if (emailLower.includes('tickets')) {
            serviceKey = 'TICKETS';
            defaultName = fromName || 'Newbi Tickets';
            defaultEmail = 'noreply@newbi.live';
        } else if (emailLower.includes('support')) {
            serviceKey = 'SUPPORT';
            defaultName = fromName || 'Newbi Support';
            defaultEmail = 'noreply@newbi.live';
        } else if (emailLower.includes('billing')) {
            serviceKey = 'BILLING';
            defaultName = fromName || 'Newbi Finance';
            defaultEmail = 'partnership@newbi.live';
        } else if (emailLower.includes('booking')) {
            serviceKey = 'BOOKING';
            defaultName = fromName || 'Newbi Bookings';
            defaultEmail = 'booking@newbi.live';
        } else if (emailLower.includes('legal')) {
            serviceKey = 'LEGAL';
            defaultName = fromName || 'Newbi Legal';
            defaultEmail = 'partnership@newbi.live';
        } else if (emailLower.includes('partnership')) {
            serviceKey = 'PARTNERSHIP';
            defaultName = fromName || 'Newbi Partnerships';
            defaultEmail = 'partnership@newbi.live';
        } else if (emailLower.includes('collaborations')) {
            serviceKey = 'COLLABORATIONS';
            defaultName = fromName || 'Newbi Collaborations';
            defaultEmail = 'collaborations@newbi.live';
        } else if (emailLower.includes('security')) {
            serviceKey = 'SECURITY';
            defaultName = fromName || 'Newbi Security';
            defaultEmail = 'noreply@newbi.live';
        } else if (emailLower.includes('noreply')) {
            serviceKey = 'NOREPLY';
            defaultName = fromName || 'Newbi Notifications';
            defaultEmail = 'noreply@newbi.live';
        } else {
            // Use the username prefix of custom emails as service keys for custom overrides
            const customKeyMatch = emailLower.split('@')[0];
            serviceKey = customKeyMatch.toUpperCase();
        }
    }

    const { smtpUser, smtpPass, fromDisplayName, fromEmailAddress } = getEmailConfig(serviceKey, defaultName, defaultEmail);

    const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
    const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
    
    if (!smtpUser || !smtpPass) {
        throw new Error(`CRITICAL: Missing credentials for service: ${serviceKey}`);
    }

    const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: smtpUser,
            pass: smtpPass,
        },
    });

    try {
        const fromAddress = `"${fromDisplayName}" <${fromEmailAddress}>`;
        const mailOptions = {
            from: fromAddress,
            to,
            subject,
            text,
            // Staff mail: sign tracked links so /api/track redirects them directly.
            html: isStaff ? signTrackedLinks(html) : html,
            attachments: safeAttachments,
            disableFileAccess: true,
            disableUrlAccess: true,
        };
        if (Object.keys(extraHeaders).length) mailOptions.headers = extraHeaders;

        if (cc) {
            if (typeof cc === 'string' && cc.trim()) {
                mailOptions.cc = cc.trim();
            } else if (Array.isArray(cc) && cc.length > 0) {
                mailOptions.cc = cc;
            }
        }

        if (bcc) {
            if (typeof bcc === 'string' && bcc.trim()) {
                mailOptions.bcc = bcc.trim();
            } else if (Array.isArray(bcc) && bcc.length > 0) {
                mailOptions.bcc = bcc;
            }
        }

        const info = await transporter.sendMail(mailOptions);

        // Addresses the mail server refused outright (the rest of the batch still went).
        const rejected = (info.rejected || []).map(r => normalizeEmail(typeof r === 'string' ? r : r?.address)).filter(Boolean);
        return res.status(200).json({ success: true, messageId: info.messageId, suppressed, rejected });
    } catch (error) {
        const correlationId = Math.random().toString(36).substring(2, 15);
        console.error(`[MAIL] 💥 ${serviceKey} mail failed [Correlation ID: ${correlationId}]:`, error);
        return res.status(500).json({ error: 'Failed to send email', correlationId });
    }
}
