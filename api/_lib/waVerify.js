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
 */
import { createHash, createHmac, randomInt } from 'node:crypto';
import { getDb } from './db.js';
import { auth as defaultAuth, hasAdminCredentials } from './auth.js';
import { businessNumber, sendText, toE164 } from './whatsapp.js';
import { accountUsable, userByPhone } from './phoneOtp.js';

export const WA_VERIFY_ACTIONS = new Set(['wa-verify-start', 'wa-verify-status']);

const COLLECTION = 'wa_verify';
const CODE_TTL_MS = 15 * 60 * 1000;
const STARTS_PER_HOUR = 6;
const START_GAP_MS = 30 * 1000;
// No 0/O or 1/I, so a typed code can't be misread.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_RE = /\bNEWBI-([A-HJ-NP-Z2-9]{6})\b/i;

const secret = () => process.env.LINK_SIGNING_SECRET || process.env.WHATSAPP_APP_SECRET || 'newbi';
const sha = (s) => createHash('sha256').update(s).digest('hex');
const docIdFor = (code) => createHmac('sha256', secret()).update(`wa-verify:${code.toUpperCase()}`).digest('hex').slice(0, 40);
const makeCode = () => `NEWBI-${Array.from({ length: 6 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('')}`;
const millis = (v) => v?.toMillis?.() ?? new Date(v || 0).getTime();

/** The message the app types for them. The code is all the webhook reads. */
export const verifyMessageText = (code) => `Verify my number for Newbi: ${code}`;

export const REPLIES = {
    verified: '✅ Your number is confirmed for your Newbi account. You can go back to Newbi now.',
    conflict: 'This number is already on another Newbi account. Go back to Newbi to choose what to do.',
    taken: 'This number is on another Newbi account that can’t be joined from here. Go back to Newbi to use another number, or reply here for help.',
    expired: 'That code has expired or was already used. In Newbi, tap “Verify on WhatsApp” again to get a new one.',
    failed: 'We couldn’t confirm your number just now. Go back to Newbi and try again, or get a code by SMS.',
};

const fail = (res, status, code, error) => res.status(status).json({ success: false, code, error });

/* 30 s between starts and 6 an hour, per account. */
const startLimited = async (db, uid, now) => {
    const ref = db.collection('rate_limits').doc(sha(`${secret()}:wa-verify:${uid}`).slice(0, 40));
    return db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const rec = snap.exists ? snap.data() : null;
        if (rec && now - Number(rec.lastAt || 0) < START_GAP_MS) return 'cooldown';
        const fresh = !rec || now - Number(rec.windowStart || 0) > 3600_000;
        const count = fresh ? 1 : Number(rec.count || 0) + 1;
        if (count > STARTS_PER_HOUR) return 'hourly';
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
    if (!decodedToken?.uid) return fail(res, 401, 'signin', 'Please sign in to continue.');
    const uid = decodedToken.uid;

    if (action === 'wa-verify-start') {
        const ours = await businessNumber();
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
        if (!rec || rec.uid !== uid) return res.status(200).json({ success: true, state: 'expired' });
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
        if (rec.confirmedPhone) return { state: rec.confirmedPhone === from && rec.outcome ? rec.outcome : 'expired', repeat: true };
        tx.update(ref, { confirmedPhone: from, confirmedAt: now() });
        return { state: 'claimed', uid: rec.uid };
    });

    let outcome = claim.state;
    if (claim.state === 'claimed') {
        outcome = adminAuth
            ? await confirmOnAccount(db, adminAuth, claim.uid, from).catch((err) => {
                console.warn('[WA VERIFY] could not put the number on the account:', err.code || err.message);
                return 'failed';
            })
            : 'failed';
        await ref.update({ outcome, ...(outcome === 'verified' ? { usedAt: now() } : {}) });
    }
    await reply({ to: from, text: REPLIES[outcome] || REPLIES.failed, event: 'wa-verify' })
        .catch(err => console.warn('[WA VERIFY] reply failed:', err.message));
    return true;
};
