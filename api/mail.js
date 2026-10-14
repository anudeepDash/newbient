import nodemailer from 'nodemailer';
import { verifyToken } from './_lib/auth.js';

const rateLimitCache = new Map();
const RATE_LIMIT_MAX_REQUESTS = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function checkRateLimit(ip) {
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
    return userRecord.count <= RATE_LIMIT_MAX_REQUESTS;
}

const MAX_RECIPIENTS = 50;
const ALLOWED_ATTACHMENT_KEYS = ['filename', 'content', 'contentType', 'encoding', 'cid'];

// Count addresses across string ("a@x, b@y") or array recipient fields
function countRecipients(field) {
    if (!field) return 0;
    if (Array.isArray(field)) return field.reduce((n, f) => n + countRecipients(f), 0);
    if (typeof field === 'string') return field.split(/[,;]/).filter(s => s.trim()).length;
    return 1;
}

// Only allow inline content attachments — never `path`/`href` (local file read / SSRF)
function sanitizeAttachments(attachments) {
    if (!Array.isArray(attachments)) return [];
    return attachments
        .filter(a => a && typeof a === 'object')
        .map(a => {
            const clean = {};
            ALLOWED_ATTACHMENT_KEYS.forEach(k => {
                if (a[k] !== undefined) clean[k] = a[k];
            });
            return clean;
        })
        .filter(a => typeof a.content === 'string');
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

    const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
    if (!checkRateLimit(clientIp)) {
        return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }

    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.error('[MAIL] CRITICAL: Missing default SMTP credentials (SMTP_USER / SMTP_PASS).');
        return res.status(500).json({ error: 'Mail service is not configured' });
    }

    if (!req.body || typeof req.body !== 'object') {
        return res.status(400).json({ error: 'Invalid request body' });
    }

    const { to, cc, bcc, subject, text, html, attachments, accountType = 'official', fromName } = req.body;
    let { fromEmail } = req.body;

    if (!to || !subject || (!text && !html)) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    if ((text && typeof text !== 'string') || (html && typeof html !== 'string')) {
        return res.status(400).json({ error: 'Invalid message body' });
    }

    if (countRecipients(to) + countRecipients(cc) + countRecipients(bcc) > MAX_RECIPIENTS) {
        return res.status(400).json({ error: `Too many recipients (max ${MAX_RECIPIENTS} per request)` });
    }

    // Only allow sending as a newbi.live address; ignore anything else and fall back to the default alias
    if (typeof fromEmail !== 'string' || !/^[a-z0-9._+-]+@newbi\.live$/i.test(fromEmail.trim())) {
        fromEmail = null;
    } else {
        fromEmail = fromEmail.trim();
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
            const customKeyMatch = emailLower.split('@')[0].replace(/[^a-z0-9_]/g, '_');
            serviceKey = customKeyMatch.toUpperCase();
        }
    }

    const { smtpUser, smtpPass, fromDisplayName, fromEmailAddress } = getEmailConfig(serviceKey, defaultName, defaultEmail);

    const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
    const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
    
    if (!smtpUser || !smtpPass) {
        console.error(`[MAIL] CRITICAL: Missing credentials for service: ${serviceKey}`);
        return res.status(500).json({ error: 'Mail service is not configured' });
    }

    try {
        const transporter = nodemailer.createTransport({
            host: smtpHost,
            port: smtpPort,
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: smtpUser,
                pass: smtpPass,
            },
            // Never let message content make the server read local files or fetch URLs
            disableFileAccess: true,
            disableUrlAccess: true,
        });

        const mailOptions = {
            from: { name: String(fromDisplayName || ''), address: fromEmailAddress },
            to,
            subject,
            text,
            html,
            attachments: sanitizeAttachments(attachments),
        };

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

        return res.status(200).json({ success: true, messageId: info.messageId });
    } catch (error) {
        const correlationId = Math.random().toString(36).substring(2, 15);
        console.error(`[MAIL] 💥 ${serviceKey} mail failed [Correlation ID: ${correlationId}]:`, error);
        return res.status(500).json({ error: 'Failed to send email', correlationId });
    }
}
