import { getFirestore } from 'firebase-admin/firestore';
import { verifyToken, auth } from './_lib/auth.js';

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

// Same staff roles as api/creator-join.js, from the caller's admins entry or user doc.
const STAFF_ROLES = ['founder', 'super_admin', 'developer', 'admin', 'editor', 'content_admin'];
const isStaff = async (db, decoded) => {
    const email = decoded.email ? decoded.email.toLowerCase().trim() : null;
    if (email) {
        const snap = await db.collection('admins').where('email', '==', email).limit(1).get();
        if (!snap.empty && STAFF_ROLES.includes(snap.docs[0].data()?.role)) return true;
    }
    if (decoded.uid) {
        const userDoc = await db.collection('users').doc(decoded.uid).get();
        if (STAFF_ROLES.includes(userDoc.data()?.role)) return true;
    }
    return false;
};

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

    // Parse body if not pre-parsed (e.g. in Vite dev server middleware)
    let body = req.body;
    if (!body && req.method === 'POST') {
        try {
            const chunks = [];
            for await (const chunk of req) {
                chunks.push(chunk);
            }
            const raw = Buffer.concat(chunks).toString('utf8');
            if (raw) body = JSON.parse(raw);
        } catch (e) {
            body = {};
        }
    }

    // Member data (emails, phones) is for staff only, not any signed-in user.
    let staff = false;
    try { staff = await isStaff(getFirestore(), decodedToken); } catch (e) { console.error('[get-members] Staff check failed:', e); }
    if (!staff) return res.status(403).json({ error: 'Forbidden' });

    try {
        const db = getFirestore();
        const { pageSize = 24, startAfterDocId = null, countOnly = false } = body || {};

        // Count-only mode: the live number of Firebase Auth accounts. Counted at
        // most once a minute and kept in system_stats so every admin sees the same.
        if (countOnly) {
            const statsRef = db.collection('system_stats').doc('auth_users');
            const stats = (await statsRef.get().catch(() => null))?.data() || {};
            const fresh = stats.countedAt && Date.now() - new Date(stats.countedAt).getTime() < 60 * 1000;
            if (fresh && Number.isFinite(stats.totalCount)) {
                return res.status(200).json({ success: true, count: stats.totalCount, countedAt: stats.countedAt });
            }
            try {
                if (!auth) throw new Error('Admin auth unavailable');
                let count = 0;
                let pageToken;
                do {
                    const page = await auth.listUsers(1000, pageToken);
                    count += page.users.length;
                    pageToken = page.pageToken;
                } while (pageToken);
                const countedAt = new Date().toISOString();
                await statsRef.set({ totalCount: count, countedAt }, { merge: true }).catch(() => {});
                return res.status(200).json({ success: true, count, countedAt });
            } catch (e) {
                console.error('[get-members] Auth count failed:', e);
                // Last known number, else the synced users collection.
                if (Number.isFinite(stats.totalCount)) return res.status(200).json({ success: true, count: stats.totalCount, countedAt: stats.countedAt || stats.lastSyncedAt || null, stale: true });
                const snapshot = await db.collection('users').count().get();
                return res.status(200).json({ success: true, count: snapshot.data().count, stale: true });
            }
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
            const { pageSize = 24, startAfterDocId = null, countOnly = false } = body || {};

            if (countOnly) {
                const snap = await db.collection('users').count().get();
                return res.status(200).json({ success: true, count: snap.data().count, stale: true });
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
