import { sendTransactional } from './_lib/mail/send.js';
import { auth } from './_lib/auth.js';
import { safeSiteOrigin } from './_lib/linkSign.js';

const rateLimitCache = new Map();
const RATE_LIMIT_MAX_REQUESTS = 3;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function checkRateLimit(ip) {
    if (!ip || ip === 'unknown') return true; // Fallback if IP cannot be determined
    const now = Date.now();
    const userRecord = rateLimitCache.get(ip) || { count: 0, resetTime: now + RATE_LIMIT_WINDOW_MS };

    if (now > userRecord.resetTime) {
        userRecord.count = 1;
        userRecord.resetTime = now + RATE_LIMIT_WINDOW_MS;
    } else {
        userRecord.count++;
    }

    // Optional: cleanup old entries to prevent memory leak
    if (rateLimitCache.size > 10000) rateLimitCache.clear();
    
    rateLimitCache.set(ip, userRecord);
    return userRecord.count <= RATE_LIMIT_MAX_REQUESTS;
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
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ error: 'Missing email' });
    }

    const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
    if (!checkRateLimit(clientIp)) {
        return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }

    try {
        if (!auth) {
            throw new Error('Firebase Admin Auth failed to initialize. Check your environment variables.');
        }

        // 1. Generate the Firebase Password Reset Link
        // The reset link carries a one-time code, so it may only point at our own sites.
        const requestOrigin = safeSiteOrigin(req.headers.origin);
        const actionCodeSettings = {
            url: `${requestOrigin}/login`,
        };
        
        const firebaseLink = await auth.generatePasswordResetLink(email, actionCodeSettings);
        
        // Convert the Firebase link into a custom link pointing to our custom ActionHandler page
        const urlObj = new URL(firebaseLink);
        const originUrlObj = new URL(requestOrigin);
        urlObj.protocol = originUrlObj.protocol;
        urlObj.host = originUrlObj.host;
        urlObj.pathname = '/auth/action';
        
        const resetLink = urlObj.toString();

        // 2. Send it from the shared security template (logged in mail_log, retried).
        let displayName = '';
        try { displayName = (await auth.getUserByEmail(email)).displayName || ''; } catch { /* fine */ }
        const sent = await sendTransactional('password-reset', email, { name: displayName, resetUrl: resetLink }, { origin: requestOrigin });
        if (!sent.ok) throw new Error(sent.error || 'Reset email failed');
        return res.status(200).json({ success: true, messageId: sent.id });
    } catch (error) {
        const correlationId = Math.random().toString(36).substring(2, 15);
        console.error(`[RESET] Error [Correlation ID: ${correlationId}]:`, error);
        
        // Return generic error as requested (no internal details)
        return res.status(500).json({ error: 'Internal server error', correlationId });
    }
}

