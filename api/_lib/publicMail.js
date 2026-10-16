/**
 * Public mail endpoints served from /api/forms (no new Vercel function):
 *
 *   POST /api/forms?type=enquiry    contact form: saves the message, tells the team, auto-replies
 *   POST /api/forms?type=subscribe  newsletter sign-up, with double opt-in for people who unsubscribed
 */
import { getDb, nowIso, SITE_URL } from './db.js';
import { sendTransactional } from './mail/send.js';
import { normalizeEmail, isValidEmail, findSuppressed, recordResubscribe } from './mailing.js';
import { makeSignedToken } from './linkSign.js';

const hits = new Map();
const limited = (key, max, windowMs = 60 * 60 * 1000) => {
    const now = Date.now();
    const rec = hits.get(key) || { count: 0, reset: now + windowMs };
    if (now > rec.reset) { rec.count = 0; rec.reset = now + windowMs; }
    rec.count++;
    if (hits.size > 5000) hits.clear();
    hits.set(key, rec);
    return rec.count > max;
};

const ipOf = (req) => String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
const clean = (v, max) => String(v ?? '').replace(/\u0000/g, '').trim().slice(0, max);

const ADMIN_ROLES_SKIP = ['pending', 'unauthorized', 'blocked'];

export const handleEnquiry = async (req, res, body) => {
    // Bots fill the hidden field; tell them it worked and do nothing.
    if (body.website || body.company_url) return res.status(200).json({ success: true });
    const name = clean(body.name, 120);
    const email = normalizeEmail(body.email);
    const message = clean(body.message, 5000);
    if (!name || !isValidEmail(email) || message.length < 2) {
        return res.status(400).json({ success: false, error: 'Please add your name, a valid email and a message.' });
    }
    if (limited(`enquiry:${ipOf(req)}`, 5) || limited(`enquiry:${email}`, 3)) {
        return res.status(429).json({ success: false, error: 'Too many messages. Please try again later.' });
    }
    const db = getDb();
    const createdAt = nowIso();
    const ref = await db.collection('messages').add({ name, email, message, createdAt, status: 'new', source: 'contact_form' });

    // The team's in-app alert (what the browser used to do), then the auto-reply.
    const adminsSnap = await db.collection('admins').get().catch(() => null);
    const alerts = (adminsSnap?.docs || [])
        .map(d => d.data())
        .filter(a => a.uid && !ADMIN_ROLES_SKIP.includes(String(a.role || '').toLowerCase()))
        .map(a => db.collection('notifications').add({
            userId: a.uid, type: 'message', title: 'New contact message', content: `${name} sent a message through the contact form.`,
            message: `${name} sent a message through the contact form.`, link: '/admin/messages', isRead: false, createdAt,
        }).catch(() => null));
    const [reply] = await Promise.all([
        sendTransactional('enquiry-autoreply', email, { name, message }, { ref: { collection: 'messages', id: ref.id }, idempotencyKey: `enquiry_${ref.id}` }),
        Promise.all(alerts),
    ]);
    await ref.set({ autoReply: { status: reply.status, at: nowIso() } }, { merge: true }).catch(() => {});
    return res.status(200).json({ success: true, id: ref.id });
};

export const handleSubscribe = async (req, res, body, decodedToken) => {
    if (body.website) return res.status(200).json({ success: true });
    const email = normalizeEmail(body.email);
    const name = clean(body.name, 120);
    if (!isValidEmail(email)) return res.status(400).json({ success: false, error: 'Enter a valid email address.' });
    if (limited(`subscribe:${ipOf(req)}`, 10) || limited(`subscribe:${email}`, 3)) {
        return res.status(429).json({ success: false, error: 'Too many tries. Please try again later.' });
    }
    const db = getDb();
    const existing = await db.collection('subscribers').where('email', '==', email).limit(1).get();
    const { suppressed } = await findSuppressed([email], db);
    const now = nowIso();

    if (suppressed.length) {
        // They unsubscribed before. Signed in with this exact (verified) address: that's them.
        const sameUser = decodedToken && decodedToken.email_verified !== false && normalizeEmail(decodedToken.email) === email;
        if (sameUser) {
            if (existing.empty) await db.collection('subscribers').add({ email, name, createdAt: now, source: 'resubscribe' });
            await recordResubscribe(email, db, { source: 'signed_in_signup' });
            return res.status(200).json({ success: true, message: "You're subscribed again." });
        }
        // Otherwise prove they own the inbox before anything is sent to it again.
        if (existing.empty) await db.collection('subscribers').add({ email, name, createdAt: now, unsubscribed: true, pendingConfirmation: true, source: 'resubscribe' });
        const token = makeSignedToken({ purpose: 'resubscribe', email }, 3 * 24 * 3600);
        const confirmUrl = `${SITE_URL}/api/track?type=resubscribe&token=${encodeURIComponent(token)}`;
        await sendTransactional('subscribe-confirm', email, { confirmUrl }, { idempotencyKey: `resub_${email}_${now.slice(0, 13)}` });
        return res.status(200).json({ success: true, confirmRequired: true, message: 'Check your inbox to confirm.' });
    }

    if (existing.empty) {
        await db.collection('subscribers').add({ email, name, createdAt: now });
        return res.status(200).json({ success: true, message: 'Successfully subscribed!' });
    }
    const doc = existing.docs[0];
    if (doc.data().unsubscribed) await doc.ref.set({ unsubscribed: false, resubscribedAt: now }, { merge: true });
    return res.status(200).json({ success: true, message: 'Already subscribed!' });
};
