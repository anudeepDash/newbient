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
