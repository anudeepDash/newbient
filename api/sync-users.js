import { getFirestore } from 'firebase-admin/firestore';
import { verifyToken, auth } from './lib/auth.js';

export default async function handler(req, res) {
    if (!res.status) {
        res.status = function (code) {
            this.statusCode = code;
            return this;
        };
    }
    if (!res.json) {
        res.json = function (data) {
            this.setHeader('Content-Type', 'application/json');
            this.end(JSON.stringify(data));
            return this;
        };
    }

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

    try {
        if (!auth) {
            throw new Error('Firebase Admin Auth failed to initialize. Check environment variables.');
        }

        const db = getFirestore();

        // Check if caller has admin permissions
        let isAuthorized = false;
        if (decodedToken.email) {
            const adminSnap = await db.collection('admins').where('email', '==', decodedToken.email).get();
            if (!adminSnap.empty) {
                isAuthorized = true;
            }
        }

        if (!isAuthorized && decodedToken.uid) {
            const userDoc = await db.collection('users').doc(decodedToken.uid).get();
            if (userDoc.exists) {
                const role = userDoc.data()?.role;
                if (['super_admin', 'developer', 'founder', 'content_admin'].includes(role)) {
                    isAuthorized = true;
                }
            }
        }

        if (!isAuthorized) {
            return res.status(403).json({ error: 'Forbidden: Administrative clearance required to perform user sync.' });
        }

        console.log(`[SYNC-USERS] Initiating Auth-to-Firestore synchronization by admin: ${decodedToken.email || decodedToken.uid}`);

        // Fetch all users from Firebase Auth in batches of 1000
        let allAuthUsers = [];
        let nextPageToken;

        do {
            const listUsersResult = await auth.listUsers(1000, nextPageToken);
            allAuthUsers = allAuthUsers.concat(listUsersResult.users);
            nextPageToken = listUsersResult.pageToken;
        } while (nextPageToken);

        console.log(`[SYNC-USERS] Total users retrieved from Firebase Authentication: ${allAuthUsers.length}`);

        // Write users to Firestore using batch operations (max 400 per batch)
        const batchSize = 400;
        let syncedCount = 0;

        for (let i = 0; i < allAuthUsers.length; i += batchSize) {
            const chunk = allAuthUsers.slice(i, i + batchSize);
            const batch = db.batch();

            chunk.forEach(authUser => {
                const userRef = db.collection('users').doc(authUser.uid);
                
                const payload = {
                    uid: authUser.uid,
                    id: authUser.uid,
                    email: authUser.email || '',
                    displayName: authUser.displayName || (authUser.email ? authUser.email.split('@')[0] : 'Member'),
                    phone: authUser.phoneNumber || '',
                    phoneNumber: authUser.phoneNumber || '',
                    photoURL: authUser.photoURL || '',
                    isBlocked: !!authUser.disabled,
                    createdAt: authUser.metadata?.creationTime || new Date().toISOString(),
                    lastActive: authUser.metadata?.lastSignInTime || authUser.metadata?.creationTime || new Date().toISOString(),
                    authProvider: authUser.providerData?.[0]?.providerId || 'password'
                };

                // Remove undefined values
                Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);

                batch.set(userRef, payload, { merge: true });
            });

            await batch.commit();
            syncedCount += chunk.length;
            console.log(`[SYNC-USERS] Committed batch: ${syncedCount}/${allAuthUsers.length}`);
        }

        return res.status(200).json({
            success: true,
            totalAuthUsers: allAuthUsers.length,
            syncedCount: syncedCount,
            message: `Successfully synchronized ${syncedCount} members from Firebase Authentication into Firestore.`
        });

    } catch (error) {
        console.error('[SYNC-USERS] Synchronization error:', error);
        return res.status(500).json({
            error: error.message || 'Internal server error during user synchronization.'
        });
    }
}
