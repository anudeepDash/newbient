import admin from 'firebase-admin';

try {
    if (!admin.apps.length) {
        const projectId = process.env.FIREBASE_PROJECT_ID;
        const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
        let privateKey = process.env.FIREBASE_PRIVATE_KEY;

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

            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId,
                    clientEmail,
                    privateKey,
                }),
            });
            console.log('[AUTH INIT] ✅ Firebase Admin initialized successfully');
        }
    }
} catch (error) {
    console.error('[AUTH INIT] 💥 CRITICAL INITIALIZATION ERROR:', error.message);
}

export const verifyToken = async (req) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }

    const token = authHeader.split('Bearer ')[1];
    try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        return decodedToken;
    } catch (error) {
        console.error('Error verifying Firebase ID token:', error);
        return null;
    }
};
