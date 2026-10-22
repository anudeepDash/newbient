/**
 * Account security alerts on WhatsApp (templates new_sign_in,
 * phone_number_changed, accounts_merged). Each goes out only once its
 * WHATSAPP_TEMPLATE_* setting is on, and only to a verified number: a typed,
 * unverified number could belong to someone else.
 *
 *   sign-in-seen (the app, right after a sign-in) → handleSignInSeen
 *     The browser sends a random id it keeps for this device. A sign-in from a
 *     device the account hasn't used before gets new_sign_in. The first device
 *     an account reports is just remembered, so existing accounts aren't all
 *     alerted when this starts. Only a hash of the id, a label ("Chrome on
 *     Android") and dates are kept, on users/{uid}.knownDevices (the latest 20).
 *   tellPhoneChanged (profile-phone) → the OLD number hears its replacement.
 *   tellAccountsMerged (mergeAccounts) → the kept account's number.
 *
 * None of these ever throws into the flow that called it.
 */
import { createHmac } from 'node:crypto';
import { getDb, nowIso } from './db.js';
import { notify } from './notify.js';
import { isTemplateLive, toE164 } from './whatsapp.js';

export const SIGN_IN_ACTIONS = new Set(['sign-in-seen']);

const MAX_DEVICES = 20;
// A token signed in longer ago than this is a session coming back, not a sign-in.
const FRESH_SIGN_IN_S = 10 * 60;

const secret = () => process.env.LINK_SIGNING_SECRET || process.env.WHATSAPP_APP_SECRET || 'newbi';
const deviceHash = (uid, device) => createHmac('sha256', secret()).update(`device:${uid}:${device}`).digest('hex').slice(0, 32);

/** "23 Oct, 9:42 PM" in IST. */
export const whenText = (ms = Date.now()) => new Date(ms).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
}).replace(/\b(am|pm)\b/, (m) => m.toUpperCase());

/** "Chrome on Android, Pune" from the browser's user agent and Vercel's city header. */
export const deviceLabel = (ua = '', city = '') => {
    const u = String(ua);
    const browser = /SamsungBrowser/i.test(u) ? 'Samsung Internet'
        : /Edg\//i.test(u) ? 'Edge'
            : /OPR\/|Opera/i.test(u) ? 'Opera'
                : /Firefox|FxiOS/i.test(u) ? 'Firefox'
                    : /Chrome|CriOS/i.test(u) ? 'Chrome'
                        : /Safari/i.test(u) ? 'Safari' : 'A browser';
    const os = /iPad/i.test(u) ? 'iPad'
        : /iPhone|iPod/i.test(u) ? 'iPhone'
            : /Android/i.test(u) ? 'Android'
                : /Mac OS X|Macintosh/i.test(u) ? 'Mac'
                    : /Windows/i.test(u) ? 'Windows'
                        : /Linux/i.test(u) ? 'Linux' : '';
    let place = '';
    try { place = decodeURIComponent(String(city || '')).trim().slice(0, 40); } catch { place = ''; }
    return [os ? `${browser} on ${os}` : browser, place].filter(Boolean).join(', ');
};

/* The account's verified number: the one on its Firebase sign-in, else one the server recorded as verified. */
const verifiedPhoneOf = async (db, adminAuth, uid, user = null) => {
    const authUser = adminAuth ? await adminAuth.getUser(uid).catch(() => null) : null;
    const fromAuth = toE164(authUser?.phoneNumber || '');
    if (fromAuth) return fromAuth;
    const u = user || ((await db.collection('users').doc(uid).get().catch(() => null))?.data() || {});
    return (u.phoneVerified || u.isPhoneVerified) ? toE164(u.phone || u.phoneNumber || '') : null;
};

const nameOf = (u) => String(u?.name || u?.displayName || '').trim();

const TEMPLATE = { 'new-sign-in': 'new_sign_in', 'phone-number-changed': 'phone_number_changed', 'accounts-merged': 'accounts_merged' };
// Nothing is looked up or sent while a template is off.
const live = (event) => isTemplateLive(TEMPLATE[event]);

const send = (event, uid, data, phone, sendFn) => sendFn(event, uid, data, { to: { phone, name: data.name }, skip: ['email', 'push', 'inApp'] })
    .catch(err => console.warn(`[SECURITY] ${event} not sent:`, err.message));

/* POST sign-in-seen { device } (signed in). → { success, alerted } */
export const handleSignInSeen = async (req, res, { db = getDb(), token, adminAuth = null, now = () => Date.now(), sendFn = notify }) => {
    const reply = (status, body) => res.status(status).json(body);
    if (req.method !== 'POST') return reply(405, { success: false, error: 'Method not allowed' });
    if (!token?.uid) return reply(401, { success: false, error: 'Please sign in to continue.' });
    const device = String(req.body?.device || '');
    if (!/^[A-Za-z0-9-]{8,64}$/.test(device)) return reply(400, { success: false, error: 'Missing device.' });
    // Nothing is stored while the alert is off. Once it's on, a first sign-in only records the device (no alert).
    if (!live('new-sign-in')) return reply(200, { success: true, alerted: false });
    const authTime = Number(token.auth_time || 0);
    if (!authTime || now() / 1000 - authTime > FRESH_SIGN_IN_S) return reply(200, { success: true, alerted: false, fresh: false });

    const uid = token.uid;
    const h = deviceHash(uid, device);
    const label = deviceLabel(req.headers?.['user-agent'], req.headers?.['x-vercel-ip-city']);
    const ref = db.collection('users').doc(uid);
    const at = nowIso();
    const outcome = await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const u = snap.exists ? snap.data() : {};
        const devices = Array.isArray(u.knownDevices) ? u.knownDevices : [];
        const known = devices.find(d => d.h === h);
        const others = devices.filter(d => d.h !== h);
        const entry = { h, label, firstAt: known?.firstAt || at, lastAt: at };
        const list = [entry, ...others].sort((a, b) => String(b.lastAt).localeCompare(String(a.lastAt))).slice(0, MAX_DEVICES);
        // One alert per sign-in, however often the app reports it.
        const alert = !known && devices.length > 0 && u.lastSignInAlertFor !== authTime;
        tx.set(ref, { knownDevices: list, ...(alert ? { lastSignInAlertFor: authTime } : {}) }, { merge: true });
        return { alert, user: u };
    });
    if (!outcome.alert) return reply(200, { success: true, alerted: false });
    const phone = await verifiedPhoneOf(db, adminAuth, uid, outcome.user);
    if (phone) await send('new-sign-in', uid, { name: nameOf(outcome.user), device: label, when: whenText(now()) }, phone, sendFn);
    return reply(200, { success: true, alerted: Boolean(phone) });
};

/** profile-phone replaced a verified number: tell the old one. */
export const tellPhoneChanged = async ({ uid, user, oldPhone, newPhone, now = () => Date.now(), sendFn = notify }) => {
    const old = toE164(oldPhone || '');
    if (!live('phone-number-changed') || !old || old === toE164(newPhone || '')) return null;
    const last4 = String(newPhone || '').replace(/\D/g, '').slice(-4) || 'none';
    return send('phone-number-changed', uid, { name: nameOf(user), last4, when: whenText(now()) }, old, sendFn);
};

/* "3 passes and your creator profile" from what mergeAccounts moved. */
export const movedSummary = (moved = {}) => {
    const n = (v) => Number(v) || 0;
    const parts = [
        n(moved.passes) && `${n(moved.passes)} ${n(moved.passes) === 1 ? 'pass' : 'passes'}`,
        n(moved.ticketOrders) && `${n(moved.ticketOrders)} ticket ${n(moved.ticketOrders) === 1 ? 'order' : 'orders'}`,
        n(moved.guestlistEntries) && `${n(moved.guestlistEntries)} guestlist ${n(moved.guestlistEntries) === 1 ? 'sign-up' : 'sign-ups'}`,
        moved.creator && 'your creator profile',
    ].filter(Boolean);
    if (!parts.length) return 'Your sign-in details';
    return parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
};

/** mergeAccounts finished: tell the kept account's verified number what came in. */
export const tellAccountsMerged = async ({ db = getDb(), adminAuth, toUid, mergedIn, moved, sendFn = notify }) => {
    if (!live('accounts-merged')) return null;
    const user = (await db.collection('users').doc(toUid).get().catch(() => null))?.data() || {};
    const phone = await verifiedPhoneOf(db, adminAuth, toUid, user);
    if (!phone) return null;
    return send('accounts-merged', toUid, { name: nameOf(user), mergedIn: mergedIn || 'Another account', summary: movedSummary(moved) }, phone, sendFn);
};
