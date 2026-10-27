/**
 * Verifying a phone number by messaging us on WhatsApp. No template is needed,
 * because the person starts the chat (so it works before Meta Business Verification).
 *
 * 1. wa-verify-start  (signed in) → { code: 'NEWBI-7Q4KXM', link: 'https://wa.me/<our number>?text=…', expiresIn }
 *    The app shows an "Open WhatsApp" button with the message already typed.
 * 2. The message arrives on the webhook (api/track.js → onVerifyMessage). The
 *    number it came from is proven to be theirs (Meta signs the webhook), and
 *    the code says which account asked. That number goes on the account as its
 *    Firebase phone, the same as a code would (api/_lib/phoneOtp.js), and we
 *    answer in the chat.
 * 3. wa-verify-status (signed in, polled by the app) → { state: 'waiting' |
 *    'verified' | 'conflict' | 'taken' | 'failed' | 'expired', phone?, proofToken? }
 *    'conflict': the number already signs in to another account. As with a code,
 *    proofToken signs in to that account in the app's throwaway session, so it can offer the merge.
 *
 * The verified number is the one they messaged from, which may differ from what
 * they typed; the app shows the one that was confirmed. Only an HMAC of a code is
 * stored (wa_verify/{hmac}). A code lives 15 minutes, is used once, and
 * starting one is limited per account (30 s apart, 6 an hour).
 *
 * Signing in the same way (signed out), so no SMS has to be paid for:
 * 1. wa-login-start → { code, link, pollKey, expiresIn }. pollKey stays in the
 *    browser that asked; the message carries only the code, so seeing the code
 *    isn't enough to collect the sign-in. Limited per IP. A code lives 10 minutes.
 * 2. The message arrives as above; the number it came from is confirmed.
 * 3. wa-login-status { code, pollKey } → { state: 'waiting' | 'verified' |
 *    'taken' | 'expired', phone?, token? }. 'verified' hands back a Firebase
 *    custom token, once, for the account that signs in with that number
 *    (created if there's none), the same as a WhatsApp code (phoneOtp.js).
 *
 * Off until WHATSAPP_PHONE_VERIFY=on (and VITE_WHATSAPP_PHONE_VERIFY=on for the
 * app's button): numbers are verified by SMS code only until then.
 */
import { createHash, createHmac, randomBytes, randomInt } from 'node:crypto';
import { getDb } from './db.js';
import { auth as defaultAuth, hasAdminCredentials } from './auth.js';
import { businessNumber, sendText, toE164 } from './whatsapp.js';
import { accountUsable, userByPhone } from './phoneOtp.js';

export const WA_VERIFY_ACTIONS = new Set(['wa-verify-start', 'wa-verify-status', 'wa-login-start', 'wa-login-status']);

export const waVerifyOn = () => process.env.WHATSAPP_PHONE_VERIFY === 'on';

const COLLECTION = 'wa_verify';
const CODE_TTL_MS = 15 * 60 * 1000;
const LOGIN_TTL_MS = 10 * 60 * 1000;
const STARTS_PER_HOUR = 6;
const START_GAP_MS = 30 * 1000;
// Per IP, with no gap: a college or office shares one IP.
const LOGIN_STARTS_PER_HOUR = 30;
// No 0/O or 1/I, so a typed code can't be misread.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_RE = /\bNEWBI-([A-HJ-NP-Z2-9]{6})\b/i;

const secret = () => process.env.LINK_SIGNING_SECRET || process.env.WHATSAPP_APP_SECRET || 'newbi';
const sha = (s) => createHash('sha256').update(s).digest('hex');
const docIdFor = (code) => createHmac('sha256', secret()).update(`wa-verify:${code.toUpperCase()}`).digest('hex').slice(0, 40);
const makeCode = () => `NEWBI-${Array.from({ length: 6 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('')}`;
const millis = (v) => v?.toMillis?.() ?? new Date(v || 0).getTime();
const clientIp = (req) => String(req.headers?.['x-forwarded-for'] || req.headers?.['x-real-ip'] || req.socket?.remoteAddress || 'unknown')
    .split(',')[0].trim();

/** The message the app types for them. The code is all the webhook reads. */
export const verifyMessageText = (code) => `Verify my number for Newbi: ${code}`;
export const loginMessageText = (code) => `Sign me in to Newbi: ${code}`;

export const REPLIES = {
    verified: '✅ Your number is confirmed for your Newbi account. You can go back to Newbi now.',
    conflict: 'This number is already on another Newbi account. Go back to Newbi to choose what to do.',
    taken: 'This number is on another Newbi account that can’t be joined from here. Go back to Newbi to use another number, or reply here for help.',
    expired: 'That code has expired or was already used. In Newbi, tap the WhatsApp button again to get a new one.',
    failed: 'We couldn’t confirm your number just now. Go back to Newbi and try again, or get a code by SMS.',
    signedIn: '✅ Number confirmed. Go back to Newbi: you’re being signed in. If you didn’t start this, don’t send codes to anyone and reply here.',
    loginTaken: 'This number’s Newbi account can’t sign in. Reply here for help.',
};

const fail = (res, status, code, error) => res.status(status).json({ success: false, code, error });

/* 30 s between starts and 6 an hour, per account (or `perHour` with no gap, per IP for signing in). */
const startLimited = async (db, key, now, { gapMs = START_GAP_MS, perHour = STARTS_PER_HOUR } = {}) => {
    const ref = db.collection('rate_limits').doc(sha(`${secret()}:wa-verify:${key}`).slice(0, 40));
    return db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const rec = snap.exists ? snap.data() : null;
        if (rec && gapMs && now - Number(rec.lastAt || 0) < gapMs) return 'cooldown';
        const fresh = !rec || now - Number(rec.windowStart || 0) > 3600_000;
        const count = fresh ? 1 : Number(rec.count || 0) + 1;
        if (count > perHour) return 'hourly';
        tx.set(ref, { bucket: 'wa-verify', count, lastAt: now, windowStart: fresh ? now : rec.windowStart, expiresAt: new Date(now + 2 * 3600_000) });
        return null;
    });
};

export async function handleWaVerifyAction(action, req, res, {
    decodedToken = null,
    db = getDb(),
    adminAuth = defaultAuth,
    canSign = hasAdminCredentials,
    now = () => Date.now(),
} = {}) {
    if (req.method !== 'POST') return fail(res, 405, 'method', 'Method not allowed.');

    if (action === 'wa-login-start') {
        const ours = waVerifyOn() ? await businessNumber() : null;
        if (!ours || !canSign || !adminAuth) return fail(res, 503, 'whatsapp_unavailable', 'WhatsApp sign-in isn’t available right now.');
        const at = now();
        const limited = await startLimited(db, `login-ip:${clientIp(req)}`, at, { gapMs: 0, perHour: LOGIN_STARTS_PER_HOUR });
        if (limited) return fail(res, 429, 'rate_limited', 'Too many tries. Wait a while, or sign in another way.');
        const code = makeCode();
        const pollKey = randomBytes(24).toString('base64url');
        await db.collection(COLLECTION).doc(docIdFor(code)).set({
            purpose: 'login', uid: null, pollKeyHash: sha(pollKey), createdAt: at,
            confirmedPhone: null, confirmedAt: null, outcome: null, usedAt: null,
            expiresAt: new Date(at + LOGIN_TTL_MS),
        });
        return res.status(200).json({
            success: true,
            code,
            pollKey,
            link: `https://wa.me/${ours}?text=${encodeURIComponent(loginMessageText(code))}`,
            expiresIn: LOGIN_TTL_MS / 1000,
        });
    }

    if (action === 'wa-login-status') {
        const code = String(req.body?.code || '').trim().toUpperCase();
        const pollKey = String(req.body?.pollKey || '');
        if (!CODE_RE.test(code) || !pollKey) return fail(res, 400, 'invalid_code', 'Start again.');
        const ref = db.collection(COLLECTION).doc(docIdFor(code));
        // Hand out the sign-in once, and only to the browser holding pollKey.
        const read = await db.runTransaction(async (tx) => {
            const snap = await tx.get(ref);
            const rec = snap.exists ? snap.data() : null;
            if (!rec || rec.purpose !== 'login' || rec.pollKeyHash !== sha(pollKey) || rec.usedAt) return { state: 'expired' };
            if (!(millis(rec.expiresAt) > now())) return { state: 'expired' };
            if (!rec.outcome) return { state: 'waiting' };
            if (rec.outcome !== 'verified') return { state: rec.outcome };
            tx.update(ref, { usedAt: now() });
            return { state: 'verified', phone: rec.confirmedPhone };
        });
        if (read.state !== 'verified') return res.status(200).json({ success: true, state: read.state });
        const user = (await userByPhone(adminAuth, read.phone)) || await adminAuth.createUser({ phoneNumber: read.phone });
        if (!(await accountUsable(db, user.uid))) return res.status(200).json({ success: true, state: 'taken' });
        return res.status(200).json({ success: true, state: 'verified', phone: read.phone, token: await adminAuth.createCustomToken(user.uid) });
    }

    if (!decodedToken?.uid) return fail(res, 401, 'signin', 'Please sign in to continue.');
    const uid = decodedToken.uid;

    if (action === 'wa-verify-start') {
        const ours = waVerifyOn() ? await businessNumber() : null;
        if (!ours || !canSign || !adminAuth) return fail(res, 503, 'whatsapp_unavailable', 'WhatsApp verification isn’t available right now.');
        const at = now();
        const limited = await startLimited(db, uid, at);
        if (limited === 'cooldown') return fail(res, 429, 'cooldown', 'Wait 30 seconds before trying again.');
        if (limited === 'hourly') return fail(res, 429, 'rate_limited', 'Too many tries. Wait an hour, or get a code by SMS.');
        const code = makeCode();
        await db.collection(COLLECTION).doc(docIdFor(code)).set({
            uid, createdAt: at, confirmedPhone: null, confirmedAt: null, outcome: null, usedAt: null,
            // A Firestore TTL policy on expiresAt clears these.
            expiresAt: new Date(at + CODE_TTL_MS),
        });
        return res.status(200).json({
            success: true,
            code,
            link: `https://wa.me/${ours}?text=${encodeURIComponent(verifyMessageText(code))}`,
            expiresIn: CODE_TTL_MS / 1000,
        });
    }

    if (action === 'wa-verify-status') {
        const code = String(req.body?.code || '').trim().toUpperCase();
        if (!CODE_RE.test(code)) return fail(res, 400, 'invalid_code', 'Start again.');
        const snap = await db.collection(COLLECTION).doc(docIdFor(code)).get();
        const rec = snap.exists ? snap.data() : null;
        // Someone else's code reads as expired: it says nothing about whose it is.
        if (!rec || !rec.uid || rec.uid !== uid) return res.status(200).json({ success: true, state: 'expired' });
        if (!rec.outcome) return res.status(200).json({ success: true, state: millis(rec.expiresAt) > now() ? 'waiting' : 'expired' });
        if (rec.outcome === 'conflict') {
            // The number signs in to another account: a sign-in there, for the app's merge offer (as with a code).
            const other = await userByPhone(adminAuth, rec.confirmedPhone);
            if (!other || other.uid === uid) return res.status(200).json({ success: true, state: 'failed' });
            if (!(await accountUsable(db, other.uid))) return res.status(200).json({ success: true, state: 'taken' });
            return res.status(200).json({ success: true, state: 'conflict', phone: rec.confirmedPhone, proofToken: await adminAuth.createCustomToken(other.uid) });
        }
        return res.status(200).json({ success: true, state: rec.outcome, ...(rec.outcome === 'verified' ? { phone: rec.confirmedPhone } : {}) });
    }

    return fail(res, 400, 'unknown', 'Unknown action.');
}

/* Signing in: the number is proven; the account is found or made when the browser collects it. → outcome */
const confirmForLogin = async (db, adminAuth, phone) => {
    const existing = await userByPhone(adminAuth, phone);
    return existing && !(await accountUsable(db, existing.uid)) ? 'taken' : 'verified';
};

/* Puts a messaged-from number on the account that asked, like phoneOtp's verify. → outcome */
const confirmOnAccount = async (db, adminAuth, uid, phone) => {
    const existing = await userByPhone(adminAuth, phone);
    if (existing && existing.uid !== uid) return (await accountUsable(db, existing.uid)) ? 'conflict' : 'taken';
    if (!existing) await adminAuth.updateUser(uid, { phoneNumber: phone });
    return 'verified';
};

/**
 * Webhook: an incoming WhatsApp message. Returns true when it was a Newbi
 * verification code (handled and answered here), false for anything else.
 */
export const onVerifyMessage = async (msg, { db = getDb(), adminAuth = defaultAuth, now = () => Date.now(), reply = sendText } = {}) => {
    const text = msg?.type === 'text' ? String(msg.text?.body || '') : '';
    const match = text.match(CODE_RE);
    if (!match) return false;
    const from = toE164(`+${String(msg.from || '').replace(/\D/g, '')}`);
    if (!from) return false;
    const ref = db.collection(COLLECTION).doc(docIdFor(`NEWBI-${match[1]}`));

    // Claim the code for this number: once, before it expires.
    const claim = await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const rec = snap.exists ? snap.data() : null;
        if (!rec || !(millis(rec.expiresAt) > now())) return { state: 'expired' };
        if (rec.confirmedPhone) return { state: rec.confirmedPhone === from && rec.outcome ? rec.outcome : 'expired', repeat: true, login: rec.purpose === 'login' };
        tx.update(ref, { confirmedPhone: from, confirmedAt: now() });
        return { state: 'claimed', uid: rec.uid, login: rec.purpose === 'login' };
    });

    let outcome = claim.state;
    const { login } = claim;
    if (claim.state === 'claimed') {
        outcome = adminAuth
            ? await (login ? confirmForLogin(db, adminAuth, from) : confirmOnAccount(db, adminAuth, claim.uid, from)).catch((err) => {
                console.warn('[WA VERIFY] could not confirm the number:', err.code || err.message);
                return 'failed';
            })
            : 'failed';
        // A sign-in is used when the browser collects it (wa-login-status), not here.
        await ref.update({ outcome, ...(outcome === 'verified' && !login ? { usedAt: now() } : {}) });
    }
    const answer = login && outcome === 'verified' ? REPLIES.signedIn
        : login && outcome === 'taken' ? REPLIES.loginTaken
            : REPLIES[outcome] || REPLIES.failed;
    await reply({ to: from, text: answer, event: login ? 'wa-login' : 'wa-verify' })
        .catch(err => console.warn('[WA VERIFY] reply failed:', err.message));
    return true;
};
