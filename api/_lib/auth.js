import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

let app;
// True when the service-account key is set (needed to read/write Firestore and check revoked sign-ins).
export const hasAdminCredentials = Boolean(process.env.FIREBASE_CLIENT_EMAIL?.trim() && process.env.FIREBASE_PRIVATE_KEY?.trim());

try {
    if (!getApps().length) {
        const projectId = (process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || "newbi-ent-v2")?.trim();
        const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
        let privateKey = process.env.FIREBASE_PRIVATE_KEY?.trim();

        if (projectId && clientEmail && privateKey) {
            // Bulletproof format helper to fix any copy-paste/Vercel formatting issues
            let formattedKey = privateKey.trim();
            
            // Remove outer quotes if they exist
            if ((formattedKey.startsWith('"') && formattedKey.endsWith('"')) || 
                (formattedKey.startsWith("'") && formattedKey.endsWith("'"))) {
                formattedKey = formattedKey.slice(1, -1).trim();
            }
            
            const header = '-----BEGIN PRIVATE KEY-----';
            const footer = '-----END PRIVATE KEY-----';
            
            let rawBase64 = formattedKey;
            if (rawBase64.includes(header)) rawBase64 = rawBase64.replace(header, '');
            if (rawBase64.includes(footer)) rawBase64 = rawBase64.replace(footer, '');
            
            // Remove all whitespace, literal newlines, escaped newlines, and carriage returns
            rawBase64 = rawBase64.replace(/\\n/g, '').replace(/\s+/g, '');
            
            // Re-wrap the base64 key into standard 64-character PEM lines
            const pemLines = [];
            for (let i = 0; i < rawBase64.length; i += 64) {
                pemLines.push(rawBase64.substring(i, i + 64));
            }
            formattedKey = `${header}\n${pemLines.join('\n')}\n${footer}`;

            app = initializeApp({
                credential: cert({
                    projectId,
                    clientEmail,
                    privateKey: formattedKey,
                }),
            });
        } else if (projectId) {
            // Initialize with just projectId (sufficient for token verification)
            app = initializeApp({
                projectId
            });
        } else {
            throw new Error('CRITICAL: Missing Firebase Admin environment variables. App refuses to start.');
        }
    } else {
        app = getApps()[0];
    }
} catch (error) {
    console.error('[AUTH INIT] CRITICAL INITIALIZATION ERROR:', error.message);
    throw error; // Rethrow to refuse startup
}

const auth = app ? getAuth(app) : null;

export { auth };

export const verifyToken = async (req) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }

    if (!auth) {
        console.error('verifyToken failed: Firebase Admin Auth not initialized');
        return null;
    }

    const token = authHeader.split('Bearer ')[1];
    try {
        return await verifyIdTokenSafe(auth, token);
    } catch (error) {
        console.error('Error verifying Firebase ID token:', error.message);
        return null;
    }
};

/*
 * Verifies a Firebase ID token. With the service-account key, revoked sign-ins
 * are rejected too. Without it (local dev, an environment missing the key) the
 * revocation check can't run, so the signature alone is checked (public keys,
 * project ID only) instead of treating every signed-in person as signed out.
 */
export const verifyIdTokenSafe = async (adminAuth, token) => {
    if (!hasAdminCredentials) return adminAuth.verifyIdToken(token, false);
    try {
        return await adminAuth.verifyIdToken(token, true);
    } catch (error) {
        const code = String(error?.code || '');
        if (['auth/id-token-revoked', 'auth/user-disabled', 'auth/id-token-expired', 'auth/argument-error'].includes(code)) throw error;
        // The revocation lookup itself failed (credentials or network): fall back to the signature check.
        return adminAuth.verifyIdToken(token, false);
    }
};
