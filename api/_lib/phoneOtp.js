/**
 * Phone codes on WhatsApp: verifying a number and signing in with it.
 *
 * Firebase Phone Auth (SMS + reCAPTCHA) stays as the fallback; the app tries
 * WhatsApp first and switches to SMS when this answers `whatsapp_unavailable`
 * or `not_on_whatsapp`.
 *
 * 1. otp-send   { phone, purpose: 'login' | 'verify' }
 *    Sends a 6-digit code with the Meta authentication template (newbi_otp,
 *    "Copy code" button). 'verify' needs a signed-in caller.
 * 2. otp-verify { phone, code, purpose }
 *    'login'  → { token }: a Firebase custom token for the account that signs
 *               in with this number (created if there's none).
 *    'verify' → the number becomes the account's Firebase phone, so every
 *               existing check (profile-phone, loadIdentity, tokenPhoneMatches)
 *               accepts it. If it already signs in to another account the
 *               answer is { conflict: true, proofToken }: the app signs in to
 *               that account in its throwaway session and offers the merge,
 *               the same as an SMS code would.
 *
 * Only an HMAC of the code is kept, in otp_codes/{hash of purpose + number},
 * with expiresAt as a Date for the Firestore TTL policy. A code lives 10
 * minutes, allows 5 tries and is used once. Sends are limited per number
 * (30 s apart, 5 an hour) and per IP.
 *
 * Goes live once Meta approves the template and WHATSAPP_TEMPLATE_NEWBI_OTP is
 * set to its approved name (the same rule as every other template).
 */
import { createHash, createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { getDb } from './db.js';
import { auth as defaultAuth, hasAdminCredentials } from './auth.js';
import { isWhatsAppConfigured, sendTemplate, toE164 } from './whatsapp.js';

export const OTP_ACTIONS = new Set(['otp-send', 'otp-verify']);

export const OTP_TEMPLATE = 'newbi_otp';
const CODE_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const RESEND_AFTER_MS = 30 * 1000;
const SENDS_PER_HOUR = 5;
const IP_SENDS_PER_WINDOW = 15;
const IP_WINDOW_MS = 10 * 60 * 1000;
const COLLECTION = 'otp_codes';
const PURPOSES = new Set(['login', 'verify']);
// Meta codes for "this number can't get WhatsApp messages": the app sends an SMS instead.
const NOT_ON_WHATSAPP = new Set([131026, 131030, 131050]);

const secret = () => process.env.LINK_SIGNING_SECRET || process.env.WHATSAPP_APP_SECRET || 'newbi';
const sha = (s) => createHash('sha256').update(s).digest('hex');
const docIdFor = (purpose, phone) => sha(`${secret()}:otp:${purpose}:${phone}`).slice(0, 40);
const codeHashFor = (docId, code) => createHmac('sha256', secret()).update(`${docId}:${code}`).digest('hex');
const sameHash = (a, b) => typeof a === 'string' && typeof b === 'string' && a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

const clientIp = (req) => String(req.headers?.['x-forwarded-for'] || req.headers?.['x-real-ip'] || req.socket?.remoteAddress || 'unknown')
    .split(',')[0].trim();

/** True once the template is approved and set, so the app knows to try WhatsApp. */
export const whatsappOtpReady = () => isWhatsAppConfigured() && Boolean(process.env[`WHATSAPP_TEMPLATE_${OTP_TEMPLATE.toUpperCase()}`]);

const fail = (res, status, code, error) => res.status(status).json({ success: false, code, error });

/* A Firestore counter per IP, so the limit holds across serverless instances. Raw IPs are never stored. */
const ipLimited = async (db, req, now) => {
    const ref = db.collection('rate_limits').doc(sha(`${secret()}:otp-send:${clientIp(req)}`).slice(0, 40));
    return db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const rec = snap.exists ? snap.data() : null;
        const fresh = !rec || now - Number(rec.windowStart || 0) > IP_WINDOW_MS;
        const count = fresh ? 1 : Number(rec.count || 0) + 1;
        if (!fresh && count > IP_SENDS_PER_WINDOW) return true;
        tx.set(ref, { bucket: 'otp-send', count, windowStart: fresh ? now : rec.windowStart, expiresAt: new Date(now + IP_WINDOW_MS * 2) });
        return false;
    });
};

// Blocked or merged-away accounts never get a sign-in.
const accountUsable = async (db, uid) => {
    const snap = await db.collection('users').doc(uid).get();
    const data = snap.exists ? snap.data() || {} : {};
    return !data.isBlocked && !data.mergedInto;
};

const userByPhone = async (adminAuth, phone) => {
    try {
        return await adminAuth.getUserByPhoneNumber(phone);
    } catch (err) {
        if (err?.code === 'auth/user-not-found') return null;
        throw err;
    }
};

const readRequest = (req, decodedToken) => {
    const body = req.body || {};
    const purpose = PURPOSES.has(body.purpose) ? body.purpose : (decodedToken?.uid ? 'verify' : 'login');
    const phone = toE164(body.phone);
    return { purpose, phone, code: String(body.code || '').replace(/\D/g, '') };
};

export async function handleOtpAction(action, req, res, {
    decodedToken = null,
    db = getDb(),
    adminAuth = defaultAuth,
    canSign = hasAdminCredentials,
    now = () => Date.now(),
    send = sendTemplate,
} = {}) {
    if (req.method !== 'POST') return fail(res, 405, 'method', 'Method not allowed.');
    const { purpose, phone, code } = readRequest(req, decodedToken);
    if (!phone) return fail(res, 400, 'invalid_phone', 'Enter a valid mobile number.');
    if (purpose === 'verify' && !decodedToken?.uid) return fail(res, 401, 'signin', 'Please sign in to continue.');
    if (!whatsappOtpReady() || !canSign || !adminAuth) {
        return fail(res, 503, 'whatsapp_unavailable', 'WhatsApp codes aren’t available right now.');
    }
    const id = docIdFor(purpose, phone);
    const ref = db.collection(COLLECTION).doc(id);

    if (action === 'otp-send') {
        const at = now();
        if (await ipLimited(db, req, at)) return fail(res, 429, 'rate_limited', 'Too many codes requested. Wait a few minutes and try again.');
        const otp = String(randomInt(0, 1_000_000)).padStart(6, '0');
        const allowed = await db.runTransaction(async (tx) => {
            const snap = await tx.get(ref);
            const prev = snap.exists ? snap.data() : null;
            if (prev && at - Number(prev.sentAt || 0) < RESEND_AFTER_MS) return 'cooldown';
            const freshWindow = !prev || at - Number(prev.windowStart || 0) > 3600_000;
            const sends = freshWindow ? 1 : Number(prev.sends || 0) + 1;
            if (sends > SENDS_PER_HOUR) return 'hourly';
            tx.set(ref, {
                purpose,
                uid: purpose === 'verify' ? decodedToken.uid : null,
                codeHash: codeHashFor(id, otp),
                attempts: 0,
                sentAt: at,
                sends,
                windowStart: freshWindow ? at : prev.windowStart,
                usedAt: null,
                // A Firestore TTL policy on expiresAt clears these.
                expiresAt: new Date(at + CODE_TTL_MS),
            });
            return 'ok';
        });
        if (allowed === 'cooldown') return fail(res, 429, 'cooldown', 'Wait 30 seconds before asking for another code.');
        if (allowed === 'hourly') return fail(res, 429, 'rate_limited', 'Too many codes for this number. Try again in an hour.');

        const result = await send({
            to: phone,
            template: OTP_TEMPLATE,
            language: process.env.WHATSAPP_TEMPLATE_LANG_OTP || 'en',
            bodyParams: [otp],
            buttons: [{ index: 0, param: otp }],
            event: `otp-${purpose}`,
            uid: decodedToken?.uid || null,
            autoRetry: false,
        });
        if (!result?.ok) {
            await ref.delete().catch(() => {});
            if (NOT_ON_WHATSAPP.has(Number(result?.errorCode))) return fail(res, 422, 'not_on_whatsapp', 'This number isn’t on WhatsApp.');
            return fail(res, 502, 'whatsapp_unavailable', 'We couldn’t send the code on WhatsApp.');
        }
        return res.status(200).json({ success: true, channel: 'whatsapp', expiresIn: CODE_TTL_MS / 1000, resendIn: RESEND_AFTER_MS / 1000 });
    }

    if (action === 'otp-verify') {
        if (code.length !== 6) return fail(res, 400, 'invalid_code', 'Enter the 6-digit code.');
        const outcome = await db.runTransaction(async (tx) => {
            const snap = await tx.get(ref);
            const rec = snap.exists ? snap.data() : null;
            const expiresAt = rec?.expiresAt?.toMillis?.() ?? new Date(rec?.expiresAt || 0).getTime();
            if (!rec || rec.usedAt || !(expiresAt > now())) return 'expired';
            if (purpose === 'verify' && rec.uid !== decodedToken.uid) return 'expired';
            if (Number(rec.attempts || 0) >= MAX_ATTEMPTS) return 'locked';
            if (!sameHash(rec.codeHash, codeHashFor(id, code))) {
                tx.update(ref, { attempts: Number(rec.attempts || 0) + 1 });
                return Number(rec.attempts || 0) + 1 >= MAX_ATTEMPTS ? 'locked' : 'wrong';
            }
            tx.update(ref, { usedAt: now() });
            return 'ok';
        });
        if (outcome === 'expired') return fail(res, 400, 'code_expired', 'That code has expired. Send a new one.');
        if (outcome === 'locked') return fail(res, 429, 'too_many_attempts', 'Too many wrong codes. Send a new one.');
        if (outcome === 'wrong') return fail(res, 400, 'wrong_code', 'That code isn’t right. Check it and try again.');

        const existing = await userByPhone(adminAuth, phone);

        if (purpose === 'login') {
            const user = existing || await adminAuth.createUser({ phoneNumber: phone });
            if (!(await accountUsable(db, user.uid))) return fail(res, 403, 'blocked', 'This account can’t sign in. Contact support.');
            return res.status(200).json({ success: true, token: await adminAuth.createCustomToken(user.uid) });
        }

        // verify
        if (existing && existing.uid !== decodedToken.uid) {
            // The number signs in to another account. Proving the number is what signing in with it means,
            // so hand back a sign-in to that account for the app's merge offer (MergeConfirm).
            if (!(await accountUsable(db, existing.uid))) return fail(res, 409, 'number_taken', 'This number is on another Newbi account that can’t be merged from here.');
            return res.status(200).json({ success: true, conflict: true, proofToken: await adminAuth.createCustomToken(existing.uid) });
        }
        if (!existing) await adminAuth.updateUser(decodedToken.uid, { phoneNumber: phone });
        return res.status(200).json({ success: true, verified: true, phone });
    }

    return fail(res, 400, 'unknown', 'Unknown action.');
}
