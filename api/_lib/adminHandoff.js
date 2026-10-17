/**
 * Carries a staff member's sign-in from app.newbi.live (or newbi.live) to
 * admin.newbi.live. Firebase keeps sign-ins per origin, so without this staff
 * would sign in again on the admin host.
 *
 * 1. admin-handoff-create (signed in, staff only): stores a one-time code that
 *    lives 60 seconds and returns it. The page puts it in the URL fragment of
 *    the admin link, so it never reaches a server log or a Referer header.
 * 2. admin-handoff-redeem (public, the code is the secret): uses the code up
 *    and returns a Firebase custom token for the same account, which the admin
 *    page signs in with.
 *
 * Only a hash of the code is stored. Both steps re-check that the account is
 * staff, not blocked and not signed out by an admin.
 */
import { createHash, randomBytes } from 'node:crypto';
import { getDb } from './db.js';
import { auth as defaultAuth, hasAdminCredentials } from './auth.js';

export const HANDOFF_ACTIONS = new Set(['admin-handoff-create', 'admin-handoff-redeem']);

// Every role that opens the admin (matches the admin check in src/App.jsx).
const ADMIN_ROLES = ['developer', 'super_admin', 'editor', 'admin', 'founder', 'content_admin', 'gate_manager', 'scanner', 'blog_writer'];
const CODE_TTL_MS = 60 * 1000;
const COLLECTION = 'authHandoffs';

const hashCode = (code) => createHash('sha256').update(code).digest('hex');

const adminRoleFor = async (db, email) => {
    if (!email) return null;
    const snap = await db.collection('admins').where('email', '==', email).limit(1).get();
    const role = snap.empty ? null : snap.docs[0].data()?.role;
    return ADMIN_ROLES.includes(role) ? role : null;
};

// Blocked accounts, and sign-ins older than an admin's "sign out everywhere", don't carry over.
const accountAllowed = async (db, uid, authTimeMs) => {
    const snap = await db.collection('users').doc(uid).get();
    const data = snap.exists ? snap.data() || {} : {};
    if (data.isBlocked) return false;
    if (data.forceLogoutBefore && authTimeMs) {
        const cutoff = new Date(data.forceLogoutBefore).getTime();
        if (Number.isFinite(cutoff) && authTimeMs < cutoff) return false;
    }
    return true;
};

export async function handleHandoffAction(action, req, res, {
    decodedToken = null,
    db = getDb(),
    adminAuth = defaultAuth,
    canSign = hasAdminCredentials,
    now = () => Date.now(),
} = {}) {
    if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed.' });

    if (action === 'admin-handoff-create') {
        if (!decodedToken?.uid) return res.status(401).json({ success: false, error: 'Please sign in to continue.' });
        if (!(await adminRoleFor(db, decodedToken.email))) {
            return res.status(403).json({ success: false, error: 'Admin access required.' });
        }
        if (!(await accountAllowed(db, decodedToken.uid, (decodedToken.auth_time || 0) * 1000))) {
            return res.status(403).json({ success: false, error: 'Please sign in again.' });
        }
        const code = randomBytes(32).toString('base64url');
        const createdAt = now();
        await db.collection(COLLECTION).doc(hashCode(code)).set({
            uid: decodedToken.uid,
            email: decodedToken.email,
            authTime: (decodedToken.auth_time || 0) * 1000,
            createdAt,
            expiresAt: createdAt + CODE_TTL_MS,
        });
        return res.status(200).json({ success: true, code });
    }

    if (action === 'admin-handoff-redeem') {
        const code = typeof req.body?.code === 'string' ? req.body.code : '';
        if (!/^[A-Za-z0-9_-]{20,100}$/.test(code)) {
            return res.status(400).json({ success: false, error: 'This sign-in link is not valid.' });
        }
        if (!canSign || !adminAuth) {
            return res.status(503).json({ success: false, error: 'Automatic sign-in is not available. Please sign in.' });
        }

        const ref = db.collection(COLLECTION).doc(hashCode(code));
        const entry = await db.runTransaction(async (tx) => {
            const snap = await tx.get(ref);
            const data = snap.exists ? snap.data() : null;
            if (!data || data.usedAt || !(data.expiresAt > now())) return null;
            tx.update(ref, { usedAt: now() });
            return data;
        });
        if (!entry) return res.status(400).json({ success: false, error: 'This sign-in link has expired. Please sign in.' });

        if (!(await adminRoleFor(db, entry.email)) || !(await accountAllowed(db, entry.uid, entry.authTime))) {
            return res.status(403).json({ success: false, error: 'Admin access required.' });
        }
        const token = await adminAuth.createCustomToken(entry.uid);
        return res.status(200).json({ success: true, token });
    }

    return res.status(400).json({ success: false, error: 'Unknown action.' });
}
