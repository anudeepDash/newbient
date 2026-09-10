/**
 * Standalone CLI Script to sync all Firebase Authentication users into Firestore.
 * Usage: node scripts/sync-users.js
 */
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';

dotenv.config();

const projectId = (process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || "newbi-ent-v2")?.trim();
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
let privateKey = process.env.FIREBASE_PRIVATE_KEY?.trim();

if (!projectId) {
    console.error("❌ FIREBASE_PROJECT_ID missing.");
    process.exit(1);
}

let app;
if (clientEmail && privateKey) {
    let formattedKey = privateKey.trim();
    if ((formattedKey.startsWith('"') && formattedKey.endsWith('"')) || 
        (formattedKey.startsWith("'") && formattedKey.endsWith("'"))) {
        formattedKey = formattedKey.slice(1, -1).trim();
    }
    const header = '-----BEGIN PRIVATE KEY-----';
    const footer = '-----END PRIVATE KEY-----';
    let rawBase64 = formattedKey;
    if (rawBase64.includes(header)) rawBase64 = rawBase64.replace(header, '');
    if (rawBase64.includes(footer)) rawBase64 = rawBase64.replace(footer, '');
    rawBase64 = rawBase64.replace(/\\n/g, '').replace(/\s+/g, '');
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
} else {
    app = initializeApp({ projectId });
}

const auth = getAuth(app);
const db = getFirestore(app);

async function runSync() {
    console.log("🚀 Starting Firebase Auth -> Firestore Sync...");
    let allAuthUsers = [];
    let nextPageToken;

    do {
        const listUsersResult = await auth.listUsers(1000, nextPageToken);
        allAuthUsers = allAuthUsers.concat(listUsersResult.users);
        nextPageToken = listUsersResult.pageToken;
    } while (nextPageToken);

    console.log(`📊 Found ${allAuthUsers.length} total users in Firebase Authentication.`);

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

            Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);

            batch.set(userRef, payload, { merge: true });
        });

        await batch.commit();
        syncedCount += chunk.length;
        console.log(`✅ Synced batch: ${syncedCount}/${allAuthUsers.length} users.`);
    }

    console.log(`🎉 Complete! Synchronized ${syncedCount} users into Firestore.`);
}

runSync().catch(err => {
    console.error("❌ Sync failed:", err);
    process.exit(1);
});
