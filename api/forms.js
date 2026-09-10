import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

let adminDb = null;

try {
    if (!getApps().length) {
        const projectId = (process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || "newbi-ent-v2")?.trim();
        const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
        let privateKey = process.env.FIREBASE_PRIVATE_KEY?.trim();

        if (projectId && clientEmail && privateKey) {
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

            const app = initializeApp({
                credential: cert({
                    projectId,
                    clientEmail,
                    privateKey: formattedKey,
                }),
            });
            adminDb = getFirestore(app);
        } else if (projectId) {
            const app = initializeApp({ projectId });
            adminDb = getFirestore(app);
        }
    } else {
        adminDb = getFirestore(getApps()[0]);
    }
} catch (e) {
    console.warn('[API/FORMS] Firebase Admin init notice:', e.message);
}

const normalizeString = (str) => String(str || '').trim().toLowerCase();
const createSlug = (str) => String(str || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

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

    const allowedOrigins = ['https://www.newbi.live', 'https://newbi.live', 'https://newbi-ent.vercel.app', 'http://localhost:5173'];
    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
        res.setHeader('Access-Control-Allow-Origin', '*');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    const { id, slug, formId } = req.query;
    const targetId = (id || slug || formId || '').trim();

    try {
        if (!adminDb) {
            return res.status(500).json({ success: false, error: 'Database service unavailable' });
        }

        // Case 1: Fetch all forms when no specific ID is requested or when id === 'all'
        if (!targetId || targetId === 'all') {
            const formsSnap = await adminDb.collection('forms').get();
            const forms = [];
            formsSnap.forEach(d => {
                forms.push({ id: d.id, ...d.data() });
            });
            
            // Sort by pinned first, then createdAt desc
            forms.sort((a, b) => {
                if (a.isPinned !== b.isPinned) return b.isPinned ? 1 : -1;
                return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
            });

            res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
            return res.status(200).json({ success: true, forms });
        }

        // Case 2: Fetch latest active form when id === 'latest'
        if (targetId === 'latest') {
            const formsSnap = await adminDb.collection('forms').get();
            const forms = [];
            formsSnap.forEach(d => {
                forms.push({ id: d.id, ...d.data() });
            });
            forms.sort((a, b) => {
                if (a.isPinned !== b.isPinned) return b.isPinned ? 1 : -1;
                return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
            });

            if (forms.length > 0) {
                res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
                return res.status(200).json({ success: true, form: forms[0] });
            }
            return res.status(404).json({ success: false, message: 'No forms available' });
        }

        // Case 3: Fetch specific form across all tiers
        const clean = normalizeString(targetId);
        const cleanSlug = createSlug(targetId);

        // Tier 1: Direct Doc ID in 'forms'
        const formDoc = await adminDb.collection('forms').doc(targetId).get();
        if (formDoc.exists) {
            res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
            return res.status(200).json({ success: true, form: { id: formDoc.id, ...formDoc.data() } });
        }

        // Tier 2: Scan 'forms' for slug, formId, or title
        const allFormsSnap = await adminDb.collection('forms').get();
        let matchedForm = null;
        allFormsSnap.forEach(d => {
            if (matchedForm) return;
            const data = d.data();
            if (
                normalizeString(d.id) === clean ||
                normalizeString(data.slug) === clean ||
                normalizeString(data.formId) === clean ||
                (data.title && createSlug(data.title) === cleanSlug) ||
                (data.link && normalizeString(data.link).endsWith(`/${clean}`))
            ) {
                matchedForm = { id: d.id, ...data };
            }
        });

        if (matchedForm) {
            res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
            return res.status(200).json({ success: true, form: matchedForm });
        }

        // Tier 3: Lookup 'upcoming_events'
        const eventDoc = await adminDb.collection('upcoming_events').doc(targetId).get();
        if (eventDoc.exists) {
            const data = eventDoc.data();
            const refFormId = data.formId || data.relatedArtistFormId;
            if (refFormId) {
                const refDoc = await adminDb.collection('forms').doc(refFormId).get();
                if (refDoc.exists) {
                    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
                    return res.status(200).json({ success: true, form: { id: refDoc.id, ...refDoc.data() } });
                }
            }
            const extractedUrl = data.formUrl || (data.link?.startsWith('http') ? data.link : null);
            if (extractedUrl) {
                res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
                return res.status(200).json({
                    success: true,
                    form: {
                        id: eventDoc.id,
                        title: data.title,
                        description: data.description,
                        formUrl: extractedUrl,
                        activeLabel: data.status || 'Live',
                        image: data.image,
                        highlightColor: data.highlightColor || '#2ebfff',
                        bottomText: data.location || 'Event Form'
                    }
                });
            }
        }

        // Tier 4: Lookup 'volunteer_gigs'
        const gigDoc = await adminDb.collection('volunteer_gigs').doc(targetId).get();
        if (gigDoc.exists) {
            const data = gigDoc.data();
            if (data.formId) {
                const refDoc = await adminDb.collection('forms').doc(data.formId).get();
                if (refDoc.exists) {
                    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
                    return res.status(200).json({ success: true, form: { id: refDoc.id, ...refDoc.data() } });
                }
            }
            const extractedUrl = data.formUrl || data.applyLink || (data.link?.startsWith('http') ? data.link : null);
            if (extractedUrl) {
                res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
                return res.status(200).json({
                    success: true,
                    form: {
                        id: gigDoc.id,
                        title: data.title,
                        description: data.description,
                        formUrl: extractedUrl,
                        activeLabel: data.status || 'Live',
                        image: data.image,
                        highlightColor: data.highlightColor || '#39FF14',
                        bottomText: data.location || 'Gig Form'
                    }
                });
            }
        }

        // Tier 5: Lookup 'guestlists'
        const glDoc = await adminDb.collection('guestlists').doc(targetId).get();
        if (glDoc.exists) {
            const data = glDoc.data();
            const extractedUrl = data.formUrl || (data.link?.startsWith('http') ? data.link : null);
            if (extractedUrl) {
                res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
                return res.status(200).json({
                    success: true,
                    form: {
                        id: glDoc.id,
                        title: data.title,
                        description: data.description,
                        formUrl: extractedUrl,
                        activeLabel: data.status || 'Live',
                        image: data.image,
                        highlightColor: data.highlightColor || '#39FF14',
                        bottomText: data.location || 'Guestlist Form'
                    }
                });
            }
        }

        // Tier 6: Lookup 'campaigns'
        const campDoc = await adminDb.collection('campaigns').doc(targetId).get();
        if (campDoc.exists) {
            const data = campDoc.data();
            const extractedUrl = data.formUrl || data.applyLink || (data.link?.startsWith('http') ? data.link : null);
            if (extractedUrl) {
                res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
                return res.status(200).json({
                    success: true,
                    form: {
                        id: campDoc.id,
                        title: data.title,
                        description: data.description,
                        formUrl: extractedUrl,
                        activeLabel: data.status || 'Live',
                        image: data.image,
                        highlightColor: data.highlightColor || '#BF00FF',
                        bottomText: data.brandName || 'Campaign Form'
                    }
                });
            }
        }

        return res.status(404).json({ success: false, message: 'Form not found' });
    } catch (err) {
        console.error('[API/FORMS] Error:', err);
        return res.status(500).json({ success: false, error: err.message });
    }
}
