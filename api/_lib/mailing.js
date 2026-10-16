import { getFirestore, FieldValue } from 'firebase-admin/firestore';

/*
 * Mailing helpers shared by api/mail.js (bulk sends, suppression list) and
 * api/track.js (the unsubscribe page). Lives in _lib so it doesn't count as a
 * Vercel function.
 *
 * Unsubscribes are kept in `email_unsubscribes/{email}`:
 *   { email, unsubscribedAt, campaignId, source, resubscribedAt? }
 * An address is suppressed when it has unsubscribedAt and no later
 * resubscribedAt. Matching `subscribers` docs also get `unsubscribed: true`.
 */

const EMAIL_RE = /^[^\s@,;<>"]+@[^\s@,;<>"]+\.[^\s@,;<>"]{2,}$/;

export const normalizeEmail = (value) => String(value || '').trim().toLowerCase();
export const isValidEmail = (value) => EMAIL_RE.test(normalizeEmail(value));

// Firestore doc ids can't contain "/".
export const unsubscribeDocId = (email) => normalizeEmail(email).replace(/\//g, '_');

let cachedDb = null;
export const getAdminDb = (db) => {
    if (db) return db;
    if (cachedDb) return cachedDb;
    try {
        cachedDb = getFirestore();
    } catch (e) {
        console.warn('[MAILING] Firestore unavailable:', e.message);
        cachedDb = null;
    }
    return cachedDb;
};

const toMillis = (value) => {
    if (!value) return 0;
    if (typeof value === 'string') return Date.parse(value) || 0;
    if (typeof value.toMillis === 'function') return value.toMillis();
    if (typeof value.seconds === 'number') return value.seconds * 1000;
    return 0;
};

export const isSuppressedRecord = (data) => {
    if (!data || !data.unsubscribedAt) return false;
    return toMillis(data.unsubscribedAt) > toMillis(data.resubscribedAt);
};

// Staff = anyone with a real role in `admins`. Cached briefly per uid.
const staffCache = new Map();
export const isStaffCaller = async (decodedToken, db) => {
    if (!decodedToken) return false;
    const key = decodedToken.uid || decodedToken.email;
    const hit = staffCache.get(key);
    if (hit && hit.expires > Date.now()) return hit.staff;
    let staff = false;
    try {
        const database = getAdminDb(db);
        const email = normalizeEmail(decodedToken.email);
        if (database && email) {
            const snap = await database.collection('admins').where('email', '==', email).limit(1).get();
            if (!snap.empty) {
                const role = String(snap.docs[0].data()?.role || '').toLowerCase();
                staff = !!role && !['pending', 'unauthorized', 'blocked'].includes(role);
            }
        }
    } catch (e) {
        console.warn('[MAILING] Staff check failed:', e.message);
    }
    if (staffCache.size > 2000) staffCache.clear();
    staffCache.set(key, { staff, expires: Date.now() + 10 * 60 * 1000 });
    return staff;
};

/** Returns the subset of `emails` that have unsubscribed. Never throws. */
export const findSuppressed = async (emails, db) => {
    const database = getAdminDb(db);
    const list = [...new Set((emails || []).map(normalizeEmail).filter(Boolean))];
    if (!database || list.length === 0) return { suppressed: [], checked: !!database };
    try {
        const refs = list.map(e => database.collection('email_unsubscribes').doc(unsubscribeDocId(e)));
        const suppressed = [];
        for (let i = 0; i < refs.length; i += 300) {
            const snaps = await database.getAll(...refs.slice(i, i + 300));
            snaps.forEach(s => { if (s.exists && isSuppressedRecord(s.data())) suppressed.push(normalizeEmail(s.data().email || s.id)); });
        }
        return { suppressed, checked: true };
    } catch (e) {
        console.warn('[MAILING] Suppression check failed:', e.message);
        return { suppressed: [], checked: false };
    }
};

/** Every suppressed address, for the admin audience builder. */
export const listSuppressed = async (db) => {
    const database = getAdminDb(db);
    if (!database) throw new Error('Database unavailable');
    const snap = await database.collection('email_unsubscribes').get();
    return snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(isSuppressedRecord)
        .map(d => ({ email: normalizeEmail(d.email || d.id), unsubscribedAt: d.unsubscribedAt || null, campaignId: d.campaignId || null, source: d.source || null }));
};

export const recordUnsubscribe = async ({ email, campaignId = '', source = 'email_link', userAgent = '' }, db) => {
    const database = getAdminDb(db);
    if (!database) throw new Error('Database unavailable');
    const clean = normalizeEmail(email);
    if (!isValidEmail(clean)) throw new Error('Invalid email');
    const now = new Date().toISOString();
    await database.collection('email_unsubscribes').doc(unsubscribeDocId(clean)).set({
        email: clean,
        unsubscribedAt: now,
        campaignId: campaignId || null,
        source,
        userAgent: String(userAgent || '').slice(0, 300),
    }, { merge: true });

    // Best effort: flag matching newsletter subscribers and count it on the campaign.
    const extras = [];
    extras.push(database.collection('subscribers').where('email', '==', clean).get().then(snap => Promise.all(
        snap.docs.map(d => d.ref.update({ unsubscribed: true, unsubscribedAt: now }))
    )));
    if (campaignId) {
        const ref = database.collection('email_campaigns').doc(String(campaignId));
        extras.push(ref.get().then(s => s.exists && ref.update({
            unsubscribesCount: FieldValue.increment(1),
            unsubscribedEmails: FieldValue.arrayUnion(clean),
        })));
    }
    extras.push(database.collection('email_events').add({
        eventType: 'unsubscribe',
        email: clean,
        campaignId: campaignId || null,
        trackingId: campaignId || null,
        timestamp: now,
        createdAt: FieldValue.serverTimestamp(),
    }));
    await Promise.allSettled(extras);
    return clean;
};

export const recordResubscribe = async (email, db) => {
    const database = getAdminDb(db);
    if (!database) throw new Error('Database unavailable');
    const clean = normalizeEmail(email);
    const now = new Date().toISOString();
    await database.collection('email_unsubscribes').doc(unsubscribeDocId(clean)).set({ email: clean, resubscribedAt: now }, { merge: true });
    const snap = await database.collection('subscribers').where('email', '==', clean).get();
    await Promise.allSettled(snap.docs.map(d => d.ref.update({ unsubscribed: false, resubscribedAt: now })));
    return clean;
};

const escapeHtml = (s) => String(s || '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

/** The small public page behind every unsubscribe link. */
export const unsubscribePage = ({ state, email = '', campaignId = '', message = '' }) => {
    const action = `/api/track?type=unsubscribe${campaignId ? `&cid=${encodeURIComponent(campaignId)}` : ''}`;
    const body = state === 'done'
        ? `<h1>You're unsubscribed</h1><p>${escapeHtml(email)} won't get Newbi campaign emails any more. You'll still get receipts and messages about things you booked.</p><p><a href="https://newbi.live">Back to newbi.live</a></p>`
        : `<h1>Unsubscribe from Newbi emails</h1>
           <p>Confirm the address you'd like to remove from our campaign emails.</p>
           ${message ? `<p class="err">${escapeHtml(message)}</p>` : ''}
           <form method="POST" action="${action}">
             <label for="email">Email address</label>
             <input id="email" name="email" type="email" required autocomplete="email" value="${escapeHtml(email)}" />
             <button type="submit">Unsubscribe</button>
           </form>`;
    return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>Unsubscribe · Newbi</title>
<style>
:root{color-scheme:light dark}
body{margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background:#f6f6f7;color:#111;display:flex;min-height:100dvh;align-items:center;justify-content:center;padding:16px;box-sizing:border-box}
.card{width:100%;max-width:420px;background:#fff;border:1px solid #e7e7ea;border-radius:20px;padding:28px}
h1{font-size:22px;margin:0 0 10px}p{font-size:15px;line-height:1.55;color:#555;margin:0 0 16px}
label{display:block;font-size:12px;font-weight:700;color:#666;margin-bottom:6px}
input{width:100%;box-sizing:border-box;height:48px;border:1px solid #ddd;border-radius:12px;padding:0 14px;font-size:16px;margin-bottom:14px;background:transparent;color:inherit}
button{width:100%;height:48px;border:0;border-radius:12px;background:#111;color:#fff;font-size:15px;font-weight:700;cursor:pointer}
a{color:#0a7d3b;font-weight:600}.err{color:#c62828;font-weight:600}
@media (prefers-color-scheme:dark){body{background:#0a0a0b;color:#f2f2f2}.card{background:#141416;border-color:#26262a}p{color:#aaa}input{border-color:#333}button{background:#39FF14;color:#000}a{color:#39FF14}}
</style></head><body><div class="card">${body}</div></body></html>`;
};
