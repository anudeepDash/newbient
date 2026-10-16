/*
 * Enquiries from the landing site's "Work with us" form and /contact.
 *
 * The browser never writes to Firestore: this handler validates the input,
 * drops obvious bots (a hidden honeypot field and a minimum fill time), and
 * writes one `messages` document with the Admin SDK, plus an in-app
 * notification for each admin, then sends the auto-reply through the mail module.
 *
 * Served by api/forms.js as POST /api/forms?type=enquiry (the project is at
 * Vercel's function limit, so this is a handler, not its own function).
 */

import { sendTransactional } from './mail/send.js';

export const AUDIENCES = {
    brand: 'Brand',
    college: 'College',
    creator: 'Creator',
    artist: 'Artist / manager',
    other: 'Something else',
};

export const BUDGETS = {
    'under-1l': 'Under ₹1 lakh',
    '1-5l': '₹1–5 lakh',
    '5-15l': '₹5–15 lakh',
    '15l-plus': '₹15 lakh+',
    unsure: 'Not sure yet',
};

export const TIMELINES = {
    asap: 'Within 2 weeks',
    month: 'Within a month',
    quarter: 'In 1–3 months',
    later: 'Later / exploring',
};

const EMAIL_RE = /^[^\s@<>()[\]\\,;:]+@[^\s@<>()[\]\\,;:]+\.[a-z]{2,}$/i;
const MIN_FILL_MS = 2500;

// Best-effort limit per warm instance: 5 enquiries per IP per 10 minutes.
const recent = new Map();
const tooMany = (ip) => {
    if (!ip) return false;
    const now = Date.now();
    const hits = (recent.get(ip) || []).filter((t) => now - t < 10 * 60 * 1000);
    hits.push(now);
    recent.set(ip, hits);
    if (recent.size > 5000) recent.clear();
    return hits.length > 5;
};

const clean = (v, max) => String(v ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, max);

export function validateEnquiry(body = {}) {
    const data = {
        name: clean(body.name, 80),
        email: clean(body.email, 120).toLowerCase(),
        phone: clean(body.phone, 20),
        company: clean(body.company, 100),
        audience: clean(body.audience, 20),
        budget: clean(body.budget, 20),
        timeline: clean(body.timeline, 20),
        message: clean(body.message, 2000),
        page: clean(body.page, 40),
    };
    const errors = {};
    if (!AUDIENCES[data.audience]) errors.audience = 'Please choose who you are.';
    if (data.name.length < 2) errors.name = 'Please tell us your name.';
    if (!EMAIL_RE.test(data.email)) errors.email = 'Please enter a valid email.';
    if (data.phone && !/^\+?[\d\s()-]{7,20}$/.test(data.phone)) errors.phone = 'Please enter a valid phone number.';
    if (data.budget && !BUDGETS[data.budget]) errors.budget = 'Please choose a budget.';
    if (data.timeline && !TIMELINES[data.timeline]) errors.timeline = 'Please choose a timeline.';
    if (data.message.length < 10) errors.message = 'Please add a few words about what you need.';
    return { data, errors, ok: Object.keys(errors).length === 0 };
}

const looksLikeBot = (body) => {
    if (clean(body.website, 200)) return true; // honeypot: hidden from people, filled by bots
    const started = Number(body.startedAt);
    return Number.isFinite(started) && started > 0 && Date.now() - started < MIN_FILL_MS;
};

function summary(d) {
    const lines = [
        `I'm a: ${AUDIENCES[d.audience]}`,
        d.company && `Organisation: ${d.company}`,
        d.budget && `Budget: ${BUDGETS[d.budget]}`,
        d.timeline && `Timeline: ${TIMELINES[d.timeline]}`,
    ].filter(Boolean);
    return `${d.message}\n\n—\n${lines.join('\n')}`;
}

async function notifyAdmins(db, d) {
    try {
        const admins = await db.collection('admins').get();
        const now = new Date().toISOString();
        const batch = db.batch();
        let count = 0;
        admins.forEach((a) => {
            const uid = a.data()?.uid;
            if (!uid) return;
            batch.set(db.collection('notifications').doc(), {
                userId: uid,
                type: 'message',
                title: 'New enquiry',
                content: `${d.name} (${AUDIENCES[d.audience]}) sent an enquiry.`,
                link: '/admin/messages',
                image: '',
                isRead: false,
                createdAt: now,
            });
            count += 1;
        });
        if (count) await batch.commit();
    } catch (err) {
        console.warn('[enquiry] admin notification skipped:', err.message);
    }
}

export async function handleEnquiry(db, req, res) {
    if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });
    res.setHeader('Cache-Control', 'no-store');

    let body = req.body;
    if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch { body = {}; }
    }
    body = body && typeof body === 'object' ? body : {};

    // Bots get the same success reply as people, so they learn nothing.
    if (looksLikeBot(body)) return res.status(200).json({ success: true });

    const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress || '';
    if (tooMany(ip)) {
        return res.status(429).json({ success: false, error: 'Too many messages. Please try again in a few minutes.' });
    }

    const { data, errors, ok } = validateEnquiry(body);
    if (!ok) return res.status(400).json({ success: false, errors });

    // Local dev server: validate only, never write to the real database.
    if (req.devDryRun) return res.status(200).json({ success: true, dryRun: true });

    if (!db) return res.status(503).json({ success: false, error: 'We could not send your message right now. Please email us instead.' });

    try {
        const doc = {
            name: data.name,
            email: data.email,
            phone: data.phone,
            message: summary(data),
            enquiry: {
                audience: data.audience,
                company: data.company,
                budget: data.budget,
                timeline: data.timeline,
                text: data.message,
            },
            source: data.page === 'contact' ? 'contact' : 'landing',
            status: 'new',
            createdAt: new Date().toISOString(),
        };
        const ref = await db.collection('messages').add(doc);
        await notifyAdmins(db, data);
        const reply = await sendTransactional('enquiry-autoreply', data.email, { name: data.name, message: data.message },
            { ref: { collection: 'messages', id: ref.id }, idempotencyKey: `enquiry_${ref.id}` })
            .catch(err => ({ status: 'failed', error: err.message }));
        await ref.set({ autoReply: { status: reply?.status || 'unknown', at: new Date().toISOString() } }, { merge: true }).catch(() => {});
        return res.status(200).json({ success: true });
    } catch (err) {
        console.error('[enquiry] write failed:', err);
        return res.status(500).json({ success: false, error: 'We could not send your message right now. Please email us instead.' });
    }
}
