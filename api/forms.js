import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { verifyToken } from './_lib/auth.js';
import { handleSubscribe } from './_lib/publicMail.js';
import { handlePublicFeed, handlePublicArchive } from './_lib/publicFeed.js';
import { handleEnquiry } from './_lib/enquiry.js';
import { handlePasses } from './_lib/passes.js';
import { handleCommunity } from './_lib/community.js';

// Ticket sends (several creators per call) need more than the default time.
export const maxDuration = 60;

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

    const allowedOrigins = ['https://www.newbi.live', 'https://newbi.live', 'https://app.newbi.live', 'https://newbi-ent.vercel.app', 'http://localhost:5173'];
    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
        res.setHeader('Access-Control-Allow-Origin', '*');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Landing site (newbi.live): the cached public feed and the enquiry form.
    if (req.query?.type === 'public-feed') return handlePublicFeed(adminDb, req, res);
    if (req.query?.type === 'public-archive') return handlePublicArchive(adminDb, req, res);
    if (req.query?.type === 'enquiry') return handleEnquiry(adminDb, req, res);
    if (req.query?.type === 'passes') return handlePasses(req, res);
    if (req.query?.type === 'community') return handleCommunity(req, res);

    // Native (built-in) form responses: submit, and the admin's read/update/delete.
    const action = String(req.query?.action || '');
    if (action) {
        return handleResponseAction(action, req, res);
    }

    // Newsletter sign-up (mail is sent from the server). Enquiries are handled above.
    if (req.method === 'POST' && req.query.type === 'subscribe') {
        try {
            const body = await readBody(req);
            return await handleSubscribe(req, res, body, await verifyToken(req));
        } catch (err) {
            console.error(`[API/FORMS] ${req.query.type} failed:`, err);
            return res.status(500).json({ success: false, error: "Couldn't send that just now. Please try again." });
        }
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    // Payout receipt check for /verify-payout. The caller must already know the reference,
    // amount and payee from the receipt; we confirm all three against the spends record.
    if (req.query.type === 'payout-verify') {
        const ref = String(req.query.ref || '').trim();
        const amt = Number(req.query.amt);
        const payee = normalizeString(req.query.payee);
        if (!ref || !payee || !Number.isFinite(amt) || !adminDb) {
            return res.status(200).json({ success: true, verified: false });
        }
        try {
            const candidates = [];
            const byRef = await adminDb.collection('spends').where('paymentRef', '==', ref).limit(5).get();
            byRef.forEach(d => candidates.push(d));
            if (!candidates.length && !ref.includes('/')) {
                const byId = await adminDb.collection('spends').doc(ref).get();
                if (byId.exists) candidates.push(byId);
            }
            const match = candidates.find(d => {
                const s = d.data() || {};
                const names = [s.receiverName, s.paidTo].map(normalizeString).filter(Boolean);
                return Math.abs(Number(s.amount) - amt) < 0.01
                    && names.includes(payee)
                    && normalizeString(s.status || 'paid') === 'paid';
            });
            if (!match) return res.status(200).json({ success: true, verified: false });
            const s = match.data();
            return res.status(200).json({
                success: true,
                verified: true,
                payout: {
                    reference: s.paymentRef || match.id,
                    amount: Number(s.amount),
                    payee: s.receiverName || s.paidTo || '',
                    date: s.date || s.createdAt || '',
                    paymentMode: s.paymentMode || '',
                    receiptUrl: s.receiptUrl || ''
                }
            });
        } catch (err) {
            console.error('[API/FORMS] payout-verify error:', err);
            return res.status(500).json({ success: false, verified: false, error: 'Verification is unavailable right now.' });
        }
    }

    // Public giveaway summary: top 10 names and scores, entry count and winner name only,
    // so the giveaway page never downloads entrants' phones or colleges.
    if (req.query.type === 'giveaway-board') {
        const giveawayId = String(req.query.id || '').trim();
        if (!giveawayId || !adminDb) {
            return res.status(200).json({ success: true, leaderboard: [], totalEntries: 0, winner: null });
        }
        try {
            const snap = await adminDb.collection('giveaway_entries').where('campaignId', '==', giveawayId).get();
            const entries = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            const leaderboard = entries
                .sort((a, b) => (b.entryScore || 0) - (a.entryScore || 0))
                .slice(0, 10)
                .map(e => ({ id: e.id, name: e.name || 'Participant', entryScore: e.entryScore || 0 }));
            const winnerEntry = entries.find(e => e.isWinner);
            res.setHeader('Cache-Control', 's-maxage=15, stale-while-revalidate=60');
            return res.status(200).json({
                success: true,
                leaderboard,
                totalEntries: entries.length,
                winner: winnerEntry ? { id: winnerEntry.id, name: winnerEntry.name || 'Participant' } : null
            });
        } catch (err) {
            console.error('[API/FORMS] giveaway-board error:', err);
            return res.status(500).json({ success: false, error: 'Leaderboard is unavailable right now.' });
        }
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


// ── Native form responses ────────────────────────────────────────────────
// Forms built in the admin (form.fields) store answers in `form_responses`.
// Submissions come through here so required fields, closed forms, response
// limits and "one response per person" are enforced on the server.

const ADMIN_ROLES = ['founder', 'super_admin', 'developer', 'admin', 'editor', 'content_admin'];
const NO_ANSWER_TYPES = ['heading'];
const MAX_TEXT = 5000;

const readBody = async (req) => {
    if (req.body && typeof req.body === 'object') return req.body;
    if (typeof req.body === 'string') {
        try { return JSON.parse(req.body); } catch { return {}; }
    }
    try {
        const chunks = [];
        for await (const chunk of req) chunks.push(chunk);
        const raw = Buffer.concat(chunks).toString('utf8');
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
};

const isFormClosed = (form, now = new Date()) => {
    if (String(form.activeLabel || '').toLowerCase() === 'closed') return 'This form is closed.';
    if (form.closesAt) {
        const end = new Date(form.closesAt);
        if (!isNaN(end.getTime()) && end < now) return 'This form has stopped taking responses.';
    }
    const limit = Number(form.responseLimit) || 0;
    if (limit > 0 && (Number(form.responseCount) || 0) >= limit) return 'This form has reached its response limit.';
    return '';
};

const isEmpty = (v) => v === undefined || v === null || (typeof v === 'string' && !v.trim()) || (Array.isArray(v) && v.length === 0);

// Returns { answers, errors } with answers cleaned to the form's fields.
export const validateAnswers = (fields, raw) => {
    const answers = {};
    const errors = {};
    (fields || []).forEach(field => {
        if (!field?.id || NO_ANSWER_TYPES.includes(field.type)) return;
        let v = raw?.[field.id];
        if (typeof v === 'string') v = v.trim().slice(0, MAX_TEXT);
        if (isEmpty(v)) {
            if (field.required) errors[field.id] = 'This is required.';
            return;
        }
        const options = (field.options || []).map(String);
        switch (field.type) {
            case 'email':
                if (typeof v !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) errors[field.id] = 'Enter a valid email.';
                break;
            case 'phone': {
                const digits = String(v).replace(/\D/g, '');
                if (digits.length < 7 || digits.length > 15) errors[field.id] = 'Enter a valid phone number.';
                break;
            }
            case 'number': {
                const n = Number(v);
                if (!Number.isFinite(n)) errors[field.id] = 'Enter a number.';
                else if (field.min !== undefined && field.min !== '' && n < Number(field.min)) errors[field.id] = `Must be at least ${field.min}.`;
                else if (field.max !== undefined && field.max !== '' && n > Number(field.max)) errors[field.id] = `Must be at most ${field.max}.`;
                else v = n;
                break;
            }
            case 'url':
                if (typeof v !== 'string' || !/^https?:\/\/\S+\.\S+/i.test(v)) errors[field.id] = 'Enter a link starting with http.';
                break;
            case 'select':
            case 'radio':
                if (!options.includes(String(v))) errors[field.id] = 'Pick one of the options.';
                break;
            case 'checkbox':
                if (!Array.isArray(v) || v.some(x => !options.includes(String(x)))) errors[field.id] = 'Pick from the options.';
                else v = v.map(String);
                break;
            case 'date':
                if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) errors[field.id] = 'Pick a date.';
                break;
            case 'file': {
                const files = (Array.isArray(v) ? v : [v]).filter(Boolean);
                if (!files.length || files.some(f => typeof f?.url !== 'string' || !/^https:\/\//.test(f.url))) errors[field.id] = 'Upload the file again.';
                else v = files.map(f => ({ url: f.url, name: String(f.name || '').slice(0, 200), size: Number(f.size) || 0, type: String(f.type || '').slice(0, 100) }));
                break;
            }
            default:
                if (typeof v !== 'string') v = String(v);
        }
        if (!errors[field.id]) answers[field.id] = v;
    });
    return { answers, errors };
};

const adminCaller = async (req) => {
    const decoded = await verifyToken(req);
    if (!decoded?.email) return null;
    const snap = await adminDb.collection('admins').where('email', '==', decoded.email).limit(1).get();
    const role = snap.empty ? null : snap.docs[0].data()?.role;
    return ADMIN_ROLES.includes(role) ? decoded : null;
};

async function handleResponseAction(action, req, res) {
    if (!adminDb) return res.status(500).json({ success: false, error: 'Database service unavailable' });

    try {
        if (action === 'submit') {
            if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });
            const body = await readBody(req);
            const formId = String(body.formId || '').trim();
            if (!formId) return res.status(400).json({ success: false, error: 'Missing form.' });
            const decoded = await verifyToken(req).catch(() => null);

            const formRef = adminDb.collection('forms').doc(formId);
            const formSnap = await formRef.get();
            if (!formSnap.exists) return res.status(404).json({ success: false, code: 'NOT_FOUND', error: 'This form no longer exists.' });
            const form = formSnap.data();
            if (!Array.isArray(form.fields) || !form.fields.length) return res.status(400).json({ success: false, error: 'This form is not taking responses here.' });
            const closed = isFormClosed(form);
            if (closed) return res.status(409).json({ success: false, code: 'CLOSED', error: closed });
            if ((form.requireSignIn || form.onePerPerson) && !decoded) return res.status(401).json({ success: false, code: 'SIGN_IN', error: 'Please sign in to fill this form.' });

            const { answers, errors } = validateAnswers(form.fields, body.answers || {});
            if (Object.keys(errors).length) return res.status(422).json({ success: false, code: 'INVALID', errors, error: 'Some answers need another look.' });

            const responseRef = form.onePerPerson && decoded
                ? adminDb.collection('form_responses').doc(`${formId}_${decoded.uid}`)
                : adminDb.collection('form_responses').doc();
            const now = new Date().toISOString();
            const emailField = form.fields.find(f => f.type === 'email' && answers[f.id]);
            const nameField = form.fields.find(f => f.type === 'short' && /name/i.test(f.label || '') && answers[f.id]);

            await adminDb.runTransaction(async (tx) => {
                const fresh = await tx.get(formRef);
                if (!fresh.exists) throw Object.assign(new Error('This form no longer exists.'), { status: 404, code: 'NOT_FOUND' });
                const stillClosed = isFormClosed(fresh.data());
                if (stillClosed) throw Object.assign(new Error(stillClosed), { status: 409, code: 'CLOSED' });
                if (form.onePerPerson && decoded) {
                    const existing = await tx.get(responseRef);
                    if (existing.exists) throw Object.assign(new Error("You've already filled this form."), { status: 409, code: 'DUPLICATE' });
                }
                tx.set(responseRef, {
                    formId,
                    formTitle: form.title || '',
                    answers,
                    fields: form.fields.filter(f => !NO_ANSWER_TYPES.includes(f.type)).map(f => ({ id: f.id, label: f.label || '', type: f.type })),
                    userId: decoded?.uid || null,
                    email: (emailField ? answers[emailField.id] : null) || decoded?.email || null,
                    name: (nameField ? answers[nameField.id] : null) || decoded?.name || null,
                    status: 'new',
                    submittedAt: now,
                    source: 'web',
                });
                tx.update(formRef, { responseCount: FieldValue.increment(1), lastResponseAt: now });
            });
            return res.status(200).json({ success: true, id: responseRef.id });
        }

        // Everything below is admin only.
        const caller = await adminCaller(req);
        if (!caller) return res.status(401).json({ success: false, error: 'Unauthorized' });

        if (action === 'responses') {
            const formId = String(req.query.formId || '').trim();
            if (!formId) return res.status(400).json({ success: false, error: 'Missing form.' });
            const snap = await adminDb.collection('form_responses').where('formId', '==', formId).get();
            const responses = snap.docs.map(d => ({ id: d.id, ...d.data() }))
                .sort((a, b) => String(b.submittedAt || '').localeCompare(String(a.submittedAt || '')));
            return res.status(200).json({ success: true, responses });
        }

        if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });
        const body = await readBody(req);
        const ids = (Array.isArray(body.ids) ? body.ids : []).map(String).filter(Boolean).slice(0, 400);
        if (!ids.length) return res.status(400).json({ success: false, error: 'Nothing selected.' });

        if (action === 'response-update') {
            const allowed = ['status', 'adminNote', 'statusUpdatedAt', 'statusUpdatedBy'];
            const updates = Object.fromEntries(Object.entries(body.updates || {}).filter(([k]) => allowed.includes(k)));
            if (!Object.keys(updates).length) return res.status(400).json({ success: false, error: 'Nothing to change.' });
            const batch = adminDb.batch();
            ids.forEach(id => batch.update(adminDb.collection('form_responses').doc(id), updates));
            await batch.commit();
            return res.status(200).json({ success: true });
        }

        if (action === 'response-delete') {
            const refs = ids.map(id => adminDb.collection('form_responses').doc(id));
            const snaps = await adminDb.getAll(...refs);
            const perForm = {};
            const batch = adminDb.batch();
            snaps.forEach(s => {
                if (!s.exists) return;
                const fid = s.data().formId;
                if (fid) perForm[fid] = (perForm[fid] || 0) + 1;
                batch.delete(s.ref);
            });
            const formIds = Object.keys(perForm);
            const formSnaps = formIds.length ? await adminDb.getAll(...formIds.map(fid => adminDb.collection('forms').doc(fid))) : [];
            formSnaps.forEach(fs => {
                if (fs.exists) batch.update(fs.ref, { responseCount: FieldValue.increment(-perForm[fs.id]) });
            });
            await batch.commit();
            return res.status(200).json({ success: true });
        }

        return res.status(400).json({ success: false, error: 'Unknown action' });
    } catch (err) {
        console.error('[API/FORMS] action error:', action, err);
        return res.status(err.status || 500).json({ success: false, code: err.code, error: err.status ? err.message : "Couldn't save. Please try again." });
    }
}
