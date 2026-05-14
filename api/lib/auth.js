console.log('[BOOT] 🔐 Auth Library Loading...');
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

let app;

try {
    if (!getApps().length) {
        const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
        const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
        let privateKey = process.env.FIREBASE_PRIVATE_KEY?.trim();

        if (!projectId || !clientEmail || !privateKey) {
            console.error('[AUTH INIT] ❌ Missing Firebase Admin environment variables!');
        } else {
            // Support both literal newlines and escaped \n
            if (privateKey.includes('\\n')) {
                privateKey = privateKey.replace(/\\n/g, '\n');
            }
            
            // Ensure private key starts and ends correctly
            if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
                console.error('[AUTH INIT] ❌ Private Key format appears invalid (missing headers)');
            }

            app = initializeApp({
                credential: cert({
                    projectId,
                    clientEmail,
                    privateKey,
                }),
            });
            console.log('[AUTH INIT] ✅ Firebase Admin initialized successfully');
        }
    } else {
        app = getApps()[0];
    }
} catch (error) {
    console.error('[AUTH INIT] 💥 CRITICAL INITIALIZATION ERROR:', error.message);
}

const auth = app ? getAuth(app) : null;

export { auth };

export const verifyToken = async (req) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }

    const token = authHeader.split('Bearer ')[1];
    try {
        const decodedToken = await auth.verifyIdToken(token);
        return decodedToken;
    } catch (error) {
        console.error('Error verifying Firebase ID token:', error);
        return null;
    }
};
