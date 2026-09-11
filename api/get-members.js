import { getFirestore } from 'firebase-admin/firestore';
import { verifyToken } from './lib/auth.js';

const CORS_HEADERS = {
    'Access-Control-Allow-Methods': 'GET,OPTIONS,POST',
    'Access-Control-Allow-Headers': 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization',
    'Access-Control-Allow-Credentials': 'true',
};

const allowedOrigins = [
    'https://www.newbi.live',
    'https://newbi.live',
    'https://newbi-ent.vercel.app',
    'http://localhost:5173',
];

export default async function handler(req, res) {
    // Shim for Vercel edge
    if (!res.status) res.status = (c) => { res.statusCode = c; return res; };
    if (!res.json) res.json = (d) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(d)); return res; };

    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin)) res.setHeader('Access-Control-Allow-Origin', origin);
    Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    // Verify the caller is an authenticated admin
    const decodedToken = await verifyToken(req);
    if (!decodedToken) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const db = getFirestore();
        const { pageSize = 24, startAfterDocId = null, countOnly = false } = req.body || {};

        // Count-only mode — return total docs in users collection
        if (countOnly) {
            const snapshot = await db.collection('users').count().get();
            const count = snapshot.data().count;
            return res.status(200).json({ success: true, count });
        }

        // Paginated fetch
        let query = db.collection('users').orderBy('createdAt', 'desc').limit(pageSize);

        if (startAfterDocId) {
            const cursorDoc = await db.collection('users').doc(startAfterDocId).get();
            if (cursorDoc.exists) {
                query = query.startAfter(cursorDoc);
            }
        }

        const snapshot = await query.get();
        const data = snapshot.docs.map(d => ({ ...d.data(), id: d.id }));
        const hasMore = snapshot.docs.length === pageSize;
        const lastDocId = snapshot.docs[snapshot.docs.length - 1]?.id || null;

        return res.status(200).json({ success: true, data, hasMore, lastDocId });

    } catch (error) {
        console.error('[get-members] Error:', error);
        // Fallback: if orderBy createdAt fails (missing index or field), retry without ordering
        try {
            const db = getFirestore();
            const { pageSize = 24, startAfterDocId = null, countOnly = false } = req.body || {};

            if (countOnly) {
                const snap = await db.collection('users').get();
                return res.status(200).json({ success: true, count: snap.size });
            }

            let query = db.collection('users').limit(pageSize);
            if (startAfterDocId) {
                const cursorDoc = await db.collection('users').doc(startAfterDocId).get();
                if (cursorDoc.exists) query = query.startAfter(cursorDoc);
            }
            const snapshot = await query.get();
            const data = snapshot.docs.map(d => ({ ...d.data(), id: d.id }));
            return res.status(200).json({ success: true, data, hasMore: snapshot.docs.length === pageSize, lastDocId: snapshot.docs[snapshot.docs.length - 1]?.id || null });
        } catch (fallbackError) {
            console.error('[get-members] Fallback also failed:', fallbackError);
            return res.status(500).json({ error: 'Failed to fetch members', details: error.message });
        }
    }
}
