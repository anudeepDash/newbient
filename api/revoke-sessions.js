import { getFirestore } from 'firebase-admin/firestore';
import { sendTransactional } from './_lib/mail/send.js';
import { verifyToken, auth } from './_lib/auth.js';
import { safeSiteOrigin } from './_lib/linkSign.js';

const rateLimitCache = new Map();
const RATE_LIMIT_MAX_REQUESTS = 3;
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

    const { targetUid, targetEmail } = req.body;
    const callerUid = decodedToken.uid;
    let uidToRevoke = targetUid;

    try {
        if (!auth) {
            throw new Error('Firebase Admin Auth failed to initialize. Check environment variables.');
        }

        const db = getFirestore();

        // 1. Resolve UID if targetEmail is passed and targetUid is missing/invalid.
        // Admin records are keyed by 20-character Firestore ids; Auth UIDs are longer.
        if (targetEmail && (!uidToRevoke || uidToRevoke.length <= 20 || uidToRevoke === targetEmail)) {
            try {
                const userRecord = await auth.getUserByEmail(targetEmail);
                uidToRevoke = userRecord.uid;
            } catch (err) {
                console.error(`[REVOKE] User with email [REDACTED] not found in Auth:`, err);
                return res.status(404).json({ error: `User with email ${targetEmail} not found` });
            }
        }

        // Default to caller's own uid if no target is specified
        if (!uidToRevoke) {
            uidToRevoke = callerUid;
        }

        // Fetch user record to resolve email and name details
        let userRecord = null;
        try {
            userRecord = await auth.getUser(uidToRevoke);
        } catch (err) {
            // User might not exist or we don't have permissions
        }

        // 2. Perform permission checks if revoking someone else's sessions
        if (uidToRevoke !== callerUid) {
            // Find caller's role in admins collection
            const callerAdminSnap = await db.collection('admins').where('email', '==', decodedToken.email).get();
            if (callerAdminSnap.empty) {
                return res.status(403).json({ error: 'Forbidden: Admin clearance required.' });
            }
            const callerRole = callerAdminSnap.docs[0].data().role;
            if (!callerRole || callerRole === 'pending' || callerRole === 'unauthorized') {
                return res.status(403).json({ error: 'Forbidden: Pending or unauthorized admin.' });
            }

            // Find target email to check if target is an admin
            let targetEmailToCheck = targetEmail || userRecord?.email;

            let targetIsAdmin = false;
            if (targetEmailToCheck) {
                const targetAdminSnap = await db.collection('admins').where('email', '==', targetEmailToCheck).get();
                if (!targetAdminSnap.empty) {
                    const targetRole = targetAdminSnap.docs[0].data().role;
                    if (targetRole && targetRole !== 'pending' && targetRole !== 'unauthorized') {
                        targetIsAdmin = true;
                    }
                }
            }

            // Developer and Founders can log anyone out. Regular admins can only log out members (non-admins).
            if (targetIsAdmin) {
                if (callerRole !== 'developer' && callerRole !== 'founder') {
                    return res.status(403).json({ error: 'Forbidden: Only Developers or Founders can log out admins.' });
                }
            }
        }

        // 3. Revoke the sessions on Firebase Auth
        await auth.revokeRefreshTokens(uidToRevoke);

        // 4. Update the user document to enforce local logout via real-time check
        const userRef = db.collection('users').doc(uidToRevoke);
        await userRef.set({ forceLogoutBefore: new Date().toISOString() }, { merge: true });

        // 5. Tell them (security template, awaited and logged).
        if (userRecord && userRecord.email) {
            const sent = await sendTransactional('sessions-revoked', userRecord.email, {
                name: userRecord.displayName || '',
                when: new Date().toISOString(),
                loginUrl: `${safeSiteOrigin(req.headers.origin)}/login`,
            }, { uid: uidToRevoke });
            if (!sent.ok) console.error('[REVOKE] Failed to send revocation email:', sent.error);
        }

        return res.status(200).json({ success: true, message: 'Sessions successfully revoked.' });

    } catch (error) {
        const correlationId = Math.random().toString(36).substring(2, 15);
        console.error(`[REVOKE] Error revoking sessions [Correlation ID: ${correlationId}]:`, error);
        return res.status(500).json({ error: 'Internal server error', correlationId });
    }
}
