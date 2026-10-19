/**
 * Passes: the one record both ticket flows produce (Phase 5).
 *
 *   passes/{ref}  { ref (10 chars), eventId, holderUid, holderName, holderPhone, holderEmail,
 *                   source: 'guestlist' | 'campaign', sourceId, entryId?, creatorId?,
 *                   status: 'issued' | 'checked_in' | 'revoked', qty, tier, note,
 *                   qr (a Newbi QR pass that the gate scanner accepts),
 *                   externalTicket? { kind: 'link' | 'pdf', url | storagePath, filename, provider, qty, tier, note },
 *                   event { title, date, time, venue, city, image }, campaignTitle?, mode: 'qr' | 'rsvp',
 *                   delivery { email, whatsapp, push, inApp }, issuedAt, issuedBy }
 *
 * Only this module writes passes (Admin SDK, in transactions). Holders read
 * their own (holderUid == uid); staff read all. One pass per person per
 * guestlist/campaign is enforced with a key doc: pass_keys/{source}_{sourceId}_{uid}.
 *
 * Served as /api/forms?type=passes&action=… (the project is at Vercel's
 * function limit, so this lives inside an existing function):
 *
 *   GET  guestlist                {id}                         public view of a guestlist (+ your place)
 *   POST register-guestlist       {guestlistId, guests, taskSubmission}   signed in
 *   GET  get                      {ref}                        a pass to show (holder/staff get everything)
 *   POST file                     {ref} or {token}             short-lived link to the ticket PDF / link
 *   GET  open-token               {token}                      the ticket behind a signed /t/<token> link
 *   POST issue-campaign           {campaignId, creatorIds, kind?, qty?, tier?, note?}   staff
 *                                 kind 'qr' (default: the campaign's passKind) or 'confirmation' (no QR)
 *   POST issue-campaign-external  {campaignId, uploadId, rows: [...]}                   staff
 *   GET  mine                     {}                     the caller's own passes             user
 *   POST staff-list               {campaignId} | {ids}   a campaign's or event's passes      staff
 *                                 (+ the campaign's send log). The browser reads these through
 *                                 here when Firestore rules don't let it read passes directly.
 *   POST retier                   {ref, tier, qty?}  change a campaign pass's category  staff
 *                                 (an upgrade); the creator is told on every channel
 *   POST upload-start / upload-finish / upload-pdf                                       staff
 *   POST resend                   {ref} | {campaignId, failedOnly}                       staff
 *   POST revoke                   {ref, reason?}                                         staff
 *   POST checkin                  {code, eventId, guestlistIds}                          staff (gate scanner)
 */
import crypto from 'node:crypto';
import { getStorage } from 'firebase-admin/storage';
import { getDb, FieldValue, nowIso } from './db.js';
import { verifyToken } from './auth.js';
import { notify } from './notify.js';
import { isStaffCaller, normalizeEmail } from './mailing.js';
import { makeSignedToken, readSignedToken } from './linkSign.js';
import { toE164 } from './whatsapp.js';

export const APP_ORIGIN = (process.env.PUBLIC_APP_URL || 'https://app.newbi.live').replace(/\/+$/, '');
export const passUrl = (ref) => `${APP_ORIGIN}/p/${encodeURIComponent(ref)}`;
const campaignUrl = (id) => `${APP_ORIGIN}/c/${encodeURIComponent(id)}`;
const ticketLinkUrl = (token) => `${APP_ORIGIN}/t/${token}`;

const TICKET_LINK_TTL = 60 * 60 * 24 * 45; // WhatsApp/email "View ticket" links: 45 days
const FILE_URL_TTL_MS = 10 * 60 * 1000; // a PDF link handed to the browser
const META_FETCH_TTL_MS = 60 * 60 * 1000; // a PDF link Meta fetches for the WhatsApp document header
const MAX_PDF_BYTES = 3 * 1024 * 1024;
const MAX_BATCH = 25;

export class PassError extends Error {
    constructor(code, message, status = 400, extra = {}) {
        super(message);
        this.code = code;
        this.status = status;
        this.extra = extra;
    }
}

/* ---------- refs and small helpers ---------- */

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const makePassRef = () => Array.from({ length: 10 }, () => ALPHABET[crypto.randomInt(ALPHABET.length)]).join('');
// New refs are 10 characters; passes migrated from old orders keep their NB-XXXXX code.
export const isPassRef = (v) => typeof v === 'string' && /^[A-Z0-9-]{5,16}$/.test(v);
const idOk = (v) => typeof v === 'string' && /^[\w-]{1,128}$/.test(v);
const str = (v, n = 300) => (v === undefined || v === null ? '' : String(v).trim().slice(0, n));
const intIn = (v, min, max, fallback) => {
    const n = Math.floor(Number(v));
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};
const present = (v) => v !== undefined && v !== null && String(v).trim() !== '' && !/^(—|-|tbd|tba|n\/a)$/i.test(String(v).trim());
const pick = (...values) => values.find(present) ?? null;
const compact = (obj) => Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined && v !== null && v !== ''));
const firstName = (name) => str(name).split(/\s+/)[0] || '';
const CLOSED = /^(closed|archived|ended|expired|inactive|draft|hidden|cancel+ed|past)$/i;

/** Reads a pass code from what a scanner sees: a /p/REF link, JSON {ref}, or the code itself. */
export const refFromCode = (raw) => {
    let text = String(raw || '').trim();
    for (let i = 0; i < 2; i++) { try { text = decodeURIComponent(text); } catch { break; } }
    try { const o = JSON.parse(text); if (o?.ref) return String(o.ref).trim().toUpperCase(); } catch { /* not JSON */ }
    const link = text.match(/\/(?:p|ticket)\/([A-Za-z0-9-]{5,16})(?:[/?#]|$)/);
    if (link) return link[1].toUpperCase();
    return text.toUpperCase().replace(/\s+/g, '');
};

/* An event day ("2026-10-20") ends at midnight in India, where the events are. */
const endOfEventDay = (date) => {
    if (!date) return null;
    const raw = typeof date?.toDate === 'function' ? date.toDate().toISOString() : String(date);
    const day = raw.slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(day)) return new Date(`${day}T23:59:59+05:30`);
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
};
const isPastDate = (date) => {
    const end = endOfEventDay(date);
    return Boolean(end && end.getTime() < Date.now());
};

const toIso = (v) => {
    if (!v) return null;
    if (typeof v?.toDate === 'function') return v.toDate().toISOString();
    return String(v);
};

/* ---------- storage (ticket PDFs) ---------- */

let storageOverride = null;
export const setStorageForTests = (s) => { storageOverride = s; };

const bucket = () => {
    if (storageOverride) return storageOverride;
    const projectId = (process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || 'newbi-ent-v2').trim();
    const name = (process.env.FIREBASE_STORAGE_BUCKET || process.env.VITE_FIREBASE_STORAGE_BUCKET || `${projectId}.firebasestorage.app`).trim();
    return getStorage().bucket(name);
};

const signedFileUrl = async (storagePath, ttlMs, filename) => {
    const [url] = await bucket().file(storagePath).getSignedUrl({
        version: 'v4',
        action: 'read',
        expires: Date.now() + ttlMs,
        ...(filename ? { responseDisposition: `inline; filename="${filename.replace(/["\\]/g, '')}"` } : {}),
        responseType: 'application/pdf',
    });
    return url;
};

const safeFileName = (name) => {
    const base = str(name, 120).replace(/\.pdf$/i, '').replace(/[^\w.-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'ticket';
    return `${base}.pdf`;
};

/* ---------- callers ---------- */

const callerFrom = async (req) => {
    const token = await verifyToken(req);
    if (!token) return { uid: null, staff: false, token: null };
    return { uid: token.uid, email: normalizeEmail(token.email), staff: await isStaffCaller(token, getDb()), token };
};

const requireUser = (caller) => { if (!caller.uid) throw new PassError('AUTH', 'Sign in to continue.', 401); };
const requireStaff = (caller) => { if (!caller.staff) throw new PassError('FORBIDDEN', 'Only the Newbi team can do this.', 403); };

/** The signed-in person as the server sees them: users/{uid} plus their verified sign-in details. */
const loadProfile = async (db, caller) => {
    const snap = await db.collection('users').doc(caller.uid).get().catch(() => null);
    const data = snap?.exists ? snap.data() : {};
    const authPhone = toE164(caller.token?.phone_number);
    const phone = toE164(pick(data.phone, data.phoneNumber, authPhone));
    return {
        name: str(pick(data.name, data.displayName, caller.token?.name), 120),
        email: normalizeEmail(pick(data.email, caller.token?.email)) || '',
        phone: phone || '',
        phoneVerified: Boolean(phone && (data.phoneVerified || data.isPhoneVerified || (authPhone && authPhone === phone))),
    };
};

/* ---------- guestlists ---------- */

/** A guestlist, merged with its event (or gig) for the details people see. */
export const resolveGuestlist = async (db, id) => {
    if (!idOk(id)) return null;
    const [glSnap, evSnap, gigSnap] = await Promise.all([
        db.collection('guestlists').doc(id).get(),
        db.collection('upcoming_events').doc(id).get(),
        db.collection('volunteer_gigs').doc(id).get(),
    ]);
    const gl = glSnap.exists ? glSnap.data() : null;
    let ev = evSnap.exists ? { id, ...evSnap.data() } : null;
    if (!ev && gl?.eventId && idOk(gl.eventId) && gl.eventId !== id) {
        const s = await db.collection('upcoming_events').doc(gl.eventId).get();
        if (s.exists) ev = { id: gl.eventId, ...s.data() };
    }
    const gig = gigSnap.exists ? gigSnap.data() : null;
    if (!gl && !ev?.isGuestlistEnabled && !gig?.guestlistEnabled) return null;

    const taskOn = Boolean((gl?.hasGuestlistTask && gl?.guestlistTask) || (!gl && ev?.hasGuestlistTask && ev?.guestlistTask));
    const task = taskOn ? (gl?.guestlistTask || ev?.guestlistTask) : null;
    const date = pick(ev?.date, gl?.date, gig?.date);
    const status = String(pick(gl?.status, ev?.status, gig?.status) || '');
    const maxSpots = Number(gl?.maxSpots ?? ev?.maxSpots) || 0;
    const taken = Math.max(0, Number(gl?.currentSpots) || 0);
    return {
        id,
        exists: Boolean(gl),
        eventId: ev?.id || (idOk(gl?.eventId) ? gl.eventId : null),
        title: str(pick(gl?.title, ev?.title, gig?.title), 200),
        description: str(pick(ev?.description, gl?.description, gig?.description), 4000),
        image: pick(ev?.hubImage, ev?.image, gl?.image, gl?.poster, gl?.thumbnail, gig?.image, gig?.poster),
        date: toIso(date),
        time: pick(ev?.time, gl?.time, gig?.time),
        venue: pick(ev?.location, ev?.venue, gl?.location, gl?.venue, gig?.location),
        city: pick(ev?.city, gl?.city, gig?.city),
        mode: (pick(gl?.guestlistMode, ev?.guestlistMode) || 'qr') === 'rsvp' ? 'rsvp' : 'qr',
        perUserLimit: Math.max(1, Number(gl?.perUserLimit ?? ev?.perUserLimit) || 1),
        maxSpots,
        spotsLeft: maxSpots > 0 ? Math.max(0, maxSpots - taken) : null,
        closed: CLOSED.test(status.trim()) || gl?.isActive === false || ev?.isGuestlistEnabled === false && !gl,
        past: isPastDate(date),
        needsApproval: Boolean((task && task.reviewRequired !== false) || gl?.requiresApproval === true || gl?.approvalRequired === true),
        task: task ? compact({
            title: str(task.title, 200),
            description: str(task.description, 2000),
            allowFileUpload: task.allowFileUpload !== false,
            requireFileUpload: Boolean(task.requireFileUpload),
            fileTypeHint: str(task.fileTypeHint, 120),
            allowLink: task.allowLink !== false,
            requireLink: Boolean(task.requireLink),
            linkPlaceholder: str(task.linkPlaceholder, 200),
            allowText: task.allowText !== false,
            requireText: Boolean(task.requireText),
            textPrompt: str(task.textPrompt, 500),
        }) : null,
        artists: Array.isArray(ev?.artists) ? ev.artists.map(a => (typeof a === 'string' ? a : a?.name)).filter(present).slice(0, 12) : [],
        isTicketed: Boolean(ev?.isTicketed),
        raw: { gl, ev, gig },
    };
};

const eventSnapshot = (g) => compact({ title: g.title, date: g.date, time: g.time, venue: g.venue, city: g.city, image: g.image });

const guestlistView = (g) => {
    const { raw, ...view } = g;
    void raw;
    return {
        ...view,
        full: g.spotsLeft === 0,
        open: !g.closed && !g.past && g.spotsLeft !== 0,
    };
};

const ownPlace = async (db, gid, uid) => {
    const key = await db.collection('pass_keys').doc(`guestlist_${gid}_${uid}`).get();
    if (key.exists && key.data().ref) {
        const pass = await db.collection('passes').doc(key.data().ref).get();
        if (pass.exists && pass.data().status !== 'revoked') return { ref: pass.id, status: pass.data().status };
        if (!pass.exists && key.data().entryId) {
            const entry = await db.collection('guestlists').doc(gid).collection('entries').doc(key.data().entryId).get();
            if (entry.exists && !['rejected', 'cancelled'].includes(String(entry.data().status))) return { ref: null, status: entry.data().status || 'pending' };
        }
    }
    // Registered before passes existed.
    const legacy = await db.collection('guestlists').doc(gid).collection('entries').where('userId', '==', uid).limit(5).get();
    const e = legacy.docs.map(d => d.data()).find(x => !['rejected', 'cancelled'].includes(String(x.status)) && !x.passRevoked);
    if (!e) return null;
    const confirmed = ['approved', 'confirmed', 'attended'].includes(String(e.status)) || e.attended;
    return { ref: e.passRef || e.bookingRef || null, status: confirmed ? 'issued' : (e.status || 'pending'), legacy: true };
};

const guestlistAction = async (db, body, caller) => {
    const g = await resolveGuestlist(db, str(body.id, 128));
    if (!g) throw new PassError('NOT_FOUND', "We couldn't find this guestlist.", 404);
    const view = guestlistView(g);
    if (caller.uid) view.me = await ownPlace(db, g.id, caller.uid);
    return { success: true, guestlist: view };
};

const cleanTaskSubmission = (s) => {
    if (!s || typeof s !== 'object') return null;
    const url = (v) => (/^https:\/\//i.test(str(v, 1000)) ? str(v, 1000) : '');
    const out = compact({
        fileUrl: url(s.fileUrl),
        fileName: str(s.fileName, 200),
        fileType: str(s.fileType, 100),
        fileSize: Number(s.fileSize) || undefined,
        link: url(s.link),
        text: str(s.text, 4000),
    });
    return Object.keys(out).length ? out : null;
};

const passFromGuestlistEntry = (ref, g, gid, entryId, entry, issuedBy) => ({
    ref,
    eventId: g.eventId || gid,
    holderUid: entry.userId || null,
    holderName: str(entry.customerName || entry.name, 120),
    holderPhone: toE164(entry.customerPhone || entry.phone) || '',
    holderEmail: normalizeEmail(entry.customerEmail || entry.email) || '',
    source: 'guestlist',
    sourceId: gid,
    entryId,
    status: entry.attended ? 'checked_in' : 'issued',
    qty: Math.max(1, Number(entry.guestsCount) || 1),
    tier: entry.tier || null,
    qr: g.mode !== 'rsvp',
    mode: g.mode,
    event: eventSnapshot(g),
    issuedAt: nowIso(),
    issuedBy,
});

const registerGuestlist = async (db, body, caller) => {
    requireUser(caller);
    const gid = str(body.guestlistId, 128);
    const g = await resolveGuestlist(db, gid);
    if (!g) throw new PassError('NOT_FOUND', "We couldn't find this guestlist.", 404);
    if (g.closed) throw new PassError('CLOSED', 'This guestlist is closed.', 409);
    if (g.past) throw new PassError('CLOSED', 'This event has already happened.', 409);

    const me = await loadProfile(db, caller);
    const missing = [!present(me.name) && 'name', !me.phoneVerified && 'phoneVerified'].filter(Boolean);
    if (missing.length) throw new PassError('PROFILE_INCOMPLETE', 'Add your name and verify your phone number first.', 422, { missing });

    const taskSubmission = cleanTaskSubmission(body.taskSubmission);
    if (g.task) {
        const t = g.task;
        if (!taskSubmission
            || (t.requireFileUpload && !taskSubmission.fileUrl)
            || (t.requireLink && !taskSubmission.link)
            || (t.requireText && !taskSubmission.text)) {
            throw new PassError('TASK_REQUIRED', 'Complete the task to register.', 422);
        }
    }

    const guests = intIn(body.guests, 1, g.perUserLimit, 1);
    const status = g.needsApproval ? 'pending' : 'confirmed';
    const glRef = db.collection('guestlists').doc(gid);
    const keyRef = db.collection('pass_keys').doc(`guestlist_${gid}_${caller.uid}`);
    const entryRef = glRef.collection('entries').doc();

    const result = await db.runTransaction(async (tx) => {
        const [glSnap, keySnap, legacySnap] = await Promise.all([
            tx.get(glRef),
            tx.get(keyRef),
            tx.get(glRef.collection('entries').where('userId', '==', caller.uid).limit(5)),
        ]);
        if (keySnap.exists && keySnap.data().ref) {
            const passSnap = await tx.get(db.collection('passes').doc(keySnap.data().ref));
            if (passSnap.exists && passSnap.data().status !== 'revoked') {
                return { duplicate: true, ref: passSnap.id, status: passSnap.data().status };
            }
        }
        const live = legacySnap.docs.map(d => d.data()).find(e => !['rejected', 'cancelled'].includes(String(e.status)) && !e.passRevoked);
        if (live) return { duplicate: true, ref: live.passRef || live.bookingRef || null, status: ['approved', 'confirmed', 'attended'].includes(String(live.status)) ? 'issued' : (live.status || 'pending') };

        const gl = glSnap.exists ? glSnap.data() : {};
        if (glSnap.exists && CLOSED.test(String(gl.status || '').trim())) throw new PassError('CLOSED', 'This guestlist is closed.', 409);
        const max = Number(gl.maxSpots ?? g.maxSpots) || 0;
        const taken = Math.max(0, Number(gl.currentSpots) || 0);
        if (max > 0 && taken + guests > max) {
            const left = Math.max(0, max - taken);
            throw new PassError('FULL', left ? `Only ${left} ${left === 1 ? 'spot is' : 'spots are'} left.` : 'This guestlist is full.', 409, { spotsLeft: left });
        }

        let ref = makePassRef();
        const passRef = db.collection('passes').doc(ref);
        if ((await tx.get(passRef)).exists) ref = makePassRef();

        const now = nowIso();
        const entry = {
            userId: caller.uid,
            name: me.name,
            customerName: me.name,
            email: me.email,
            customerEmail: me.email,
            phone: me.phone,
            customerPhone: me.phone,
            guestsCount: guests,
            bookingRef: ref,
            passRef: ref,
            status,
            title: g.title || 'Guestlist',
            attended: false,
            guestlistMode: g.mode,
            eventId: g.eventId || gid,
            guestlistId: gid,
            hasTask: Boolean(g.task),
            taskSubmission,
            appliedAt: now,
            createdAt: now,
            source: 'app',
        };
        if (!glSnap.exists) {
            // An event or gig with its guestlist switched on, but no list doc yet.
            tx.set(glRef, {
                id: gid, title: g.title || 'Guestlist', date: g.date || null, status: 'Open', createdAt: now,
                isEmbedded: true, eventId: g.eventId || gid, guestlistMode: g.mode, perUserLimit: g.perUserLimit,
                isGuestlistEnabled: true, currentSpots: guests,
            });
        } else {
            tx.update(glRef, { currentSpots: FieldValue.increment(guests) });
        }
        tx.set(entryRef, entry);
        if (status === 'confirmed') tx.set(db.collection('passes').doc(ref), passFromGuestlistEntry(ref, g, gid, entryRef.id, entry, 'self'));
        tx.set(keyRef, { ref, entryId: entryRef.id, source: 'guestlist', sourceId: gid, uid: caller.uid, at: now });
        return { ref, status: status === 'confirmed' ? 'issued' : 'pending', entryId: entryRef.id };
    });

    if (result.duplicate) return { success: true, duplicate: true, ref: result.ref, status: result.status };
    let delivery = null;
    if (result.status === 'issued') {
        delivery = await deliverGuestlistPass(db, gid, result.entryId, { g }).catch((err) => {
            console.warn('[PASSES] guestlist delivery failed:', err.message);
            return null;
        });
    }
    return { success: true, ref: result.ref, status: result.status, delivery: delivery?.delivery || null };
};

/**
 * Makes sure an approved guestlist entry has its pass (approvals from the
 * admin guestlist screen land here through the pass-confirmed event).
 */
export const ensureGuestlistPass = async (db, gid, entryId, { issuedBy = 'staff', g: known = null } = {}) => {
    const entryRef = db.collection('guestlists').doc(gid).collection('entries').doc(entryId);
    const g = known || await resolveGuestlist(db, gid);
    return db.runTransaction(async (tx) => {
        const snap = await tx.get(entryRef);
        if (!snap.exists) throw new PassError('NOT_FOUND', 'Entry not found.', 404);
        const entry = snap.data();
        if (!['approved', 'confirmed', 'attended'].includes(String(entry.status || '').toLowerCase()) && !entry.attended) {
            throw new PassError('NOT_CONFIRMED', 'This place isn’t confirmed yet.', 409);
        }
        const candidates = [entry.passRef, entry.bookingRef].map(r => str(r, 16).toUpperCase()).filter(isPassRef);
        for (const r of candidates) {
            const p = await tx.get(db.collection('passes').doc(r));
            if (p.exists && p.data().sourceId === gid) return { ref: r, pass: p.data(), entry };
        }
        let ref = candidates.find(Boolean) || makePassRef();
        if ((await tx.get(db.collection('passes').doc(ref))).exists) ref = makePassRef();
        const pass = passFromGuestlistEntry(ref, g || { mode: entry.guestlistMode === 'rsvp' ? 'rsvp' : 'qr', title: entry.title }, gid, entryId, entry, issuedBy);
        tx.set(db.collection('passes').doc(ref), pass);
        tx.set(entryRef, { passRef: ref, ...(entry.bookingRef ? {} : { bookingRef: ref }) }, { merge: true });
        if (entry.userId) tx.set(db.collection('pass_keys').doc(`guestlist_${gid}_${entry.userId}`), { ref, entryId, source: 'guestlist', sourceId: gid, uid: entry.userId, at: nowIso() }, { merge: true });
        return { ref, pass, entry };
    });
};

/** Issues (if needed) and sends a confirmed guestlist pass once: email, WhatsApp, push, in-app. */
export const deliverGuestlistPass = async (db, gid, entryId, { g = null, issuedBy = 'self', force = false } = {}) => {
    const { ref, pass, entry } = await ensureGuestlistPass(db, gid, entryId, { g, issuedBy });
    const entryRef = db.collection('guestlists').doc(gid).collection('entries').doc(entryId);
    if (!force) {
        const claimed = await db.runTransaction(async (tx) => {
            const s = await tx.get(entryRef);
            if (s.data()?.mail?.passConfirmedAt) return false;
            tx.set(entryRef, { mail: { passConfirmedAt: nowIso() } }, { merge: true });
            return true;
        });
        if (!claimed) return { duplicate: true, ref };
    }
    const data = {
        name: pass.holderName || entry.customerName || entry.name,
        eventName: pass.event?.title || entry.title,
        date: pass.event?.date,
        venue: pass.event?.venue,
        qty: pass.qty,
        tier: pass.tier,
        ref,
        mode: pass.mode === 'rsvp' ? 'rsvp' : 'qr',
        source: 'guestlist',
        passUrl: passUrl(ref),
        image: pass.event?.image || '',
    };
    const delivery = await notify('pass-confirmed', pass.holderUid || null, data, {
        to: { email: pass.holderEmail, phone: pass.holderPhone, name: data.name },
        ref: { collection: 'passes', id: ref },
    });
    return { ref, delivery };
};

/**
 * A paid or free ticket order that's confirmed gets a pass with its booking
 * code as the ref, so old QR codes keep working and the order shows like any
 * other pass. (Paid checkout itself is unchanged.)
 */
export const ensureOrderPass = async (db, orderId, order, ev = {}) => {
    const ref = str(order.bookingRef, 16).toUpperCase();
    if (!isPassRef(ref)) return null;
    const passRef = db.collection('passes').doc(ref);
    const snap = await passRef.get();
    if (snap.exists) return ref;
    const qty = (order.items || []).reduce((n, i) => n + (Number(i.count) || 0), 0) || Number(order.quantity) || 1;
    await passRef.set(compact({
        ref,
        eventId: order.eventId || null,
        holderUid: order.userId || null,
        holderName: str(order.customerName, 120),
        holderEmail: normalizeEmail(order.customerEmail || order.email) || '',
        holderPhone: toE164(order.customerPhone) || '',
        source: 'order',
        sourceId: orderId,
        status: (order.isScanned || order.attended) ? 'checked_in' : 'issued',
        qty,
        tier: (order.items || []).map(i => i.name).filter(Boolean).join(', ') || null,
        qr: true,
        mode: 'qr',
        event: compact({ title: ev.title || order.eventTitle, date: toIso(ev.date), time: ev.time, venue: ev.location || ev.venue, city: ev.city, image: ev.hubImage || ev.image }),
        issuedAt: nowIso(),
        issuedBy: 'order',
    }));
    return ref;
};

/* ---------- reading a pass ---------- */

/** What a pass page shows. Holders and staff see the ticket link; anyone with the code sees the pass. */
const publicPass = (pass, { full = false } = {}) => {
    const ext = pass.externalTicket || null;
    return compact({
        ref: pass.ref,
        source: pass.source,
        sourceId: pass.source === 'campaign' ? pass.sourceId : undefined,
        status: pass.status,
        qty: Number(pass.qty) > 0 ? Number(pass.qty) : undefined,
        tier: pass.tier || undefined,
        note: full ? pass.note || undefined : undefined,
        mode: pass.mode || 'qr',
        qr: pass.qr !== false,
        holderName: full ? pass.holderName || undefined : firstName(pass.holderName) || undefined,
        event: pass.event || {},
        campaignTitle: pass.campaignTitle || undefined,
        externalTicket: ext ? compact({
            kind: ext.kind,
            provider: ext.provider || undefined,
            filename: ext.filename || undefined,
            qty: ext.qty || undefined,
            tier: ext.tier || undefined,
            note: full ? ext.note || undefined : undefined,
            url: full && ext.kind === 'link' ? ext.url : undefined,
        }) : undefined,
        checkedInAt: pass.checkedInAt || undefined,
        isHolder: full || undefined,
    });
};

const legacyPass = async (db, ref) => {
    const orders = await db.collection('ticket_orders').where('bookingRef', '==', ref).limit(1).get();
    let rec = null;
    let eventId = null;
    if (!orders.empty) {
        const o = orders.docs[0].data();
        const sold = ['approved', 'dispatched', 'confirmed', 'attended'].includes(String(o.status));
        rec = {
            ref, source: 'order', holderName: o.customerName, holderUid: o.userId || null, qr: true, mode: 'qr',
            status: o.status === 'rejected' ? 'revoked' : (o.isScanned || o.attended) ? 'checked_in' : sold ? 'issued' : 'pending',
            qty: (o.items || []).reduce((n, i) => n + (Number(i.count) || 0), 0) || Number(o.quantity) || 1,
            tier: (o.items || []).map(i => i.name).filter(Boolean).join(', ') || null,
        };
        eventId = o.eventId;
    } else {
        const entries = await db.collectionGroup('entries').where('bookingRef', '==', ref).limit(1).get().catch(() => ({ empty: true }));
        if (entries.empty) return null;
        const e = entries.docs[0].data();
        const ok = ['approved', 'confirmed', 'attended'].includes(String(e.status)) || e.attended;
        rec = {
            ref, source: 'guestlist', holderName: e.customerName || e.name, holderUid: e.userId || null,
            qr: e.guestlistMode !== 'rsvp', mode: e.guestlistMode === 'rsvp' ? 'rsvp' : 'qr',
            status: e.status === 'rejected' ? 'revoked' : e.attended ? 'checked_in' : ok ? 'issued' : 'pending',
            qty: Number(e.guestsCount) || 1,
        };
        eventId = e.eventId || e.guestlistId || entries.docs[0].ref.parent.parent?.id;
    }
    if (eventId && idOk(eventId)) {
        const g = await resolveGuestlist(db, eventId).catch(() => null);
        if (g) rec.event = eventSnapshot(g);
        else {
            const ev = await db.collection('upcoming_events').doc(eventId).get();
            if (ev.exists) rec.event = compact({ title: ev.data().title, date: toIso(ev.data().date), time: ev.data().time, venue: ev.data().location, image: ev.data().hubImage || ev.data().image });
        }
    }
    return rec;
};

const loadPass = async (db, ref) => {
    if (!isPassRef(ref)) return null;
    const snap = await db.collection('passes').doc(ref).get();
    return snap.exists ? { ...snap.data(), ref: snap.id } : null;
};

const getAction = async (db, body, caller) => {
    const ref = refFromCode(body.ref);
    if (!isPassRef(ref)) throw new PassError('NOT_FOUND', "We couldn't find this pass.", 404);
    const pass = (await loadPass(db, ref)) || (await legacyPass(db, ref));
    if (!pass) throw new PassError('NOT_FOUND', "We couldn't find this pass. Check the code, or ask the Newbi team.", 404);
    const full = Boolean(caller.staff || (caller.uid && pass.holderUid === caller.uid));
    if (full && pass.source !== 'order' && !pass.delivery?.inApp?.seenAt && pass.holderUid === caller.uid) {
        db.collection('passes').doc(ref).set({ delivery: { inApp: { seenAt: nowIso() } } }, { merge: true }).catch(() => {});
    }
    return { success: true, pass: publicPass(pass, { full }) };
};

/** A short-lived URL for the ticket itself: the PDF (signed) or the partner's link. */
const fileAction = async (db, body, caller) => {
    let ref = refFromCode(body.ref);
    let viaToken = false;
    if (body.token) {
        const payload = readSignedToken(body.token);
        if (!payload?.r) throw new PassError('EXPIRED', 'This ticket link has expired. Open the ticket from the Newbi app instead.', 410);
        ref = payload.r;
        viaToken = true;
    }
    const pass = await loadPass(db, ref);
    if (!pass || pass.status === 'revoked') throw new PassError('NOT_FOUND', "This ticket isn't available.", 404);
    if (!viaToken && !caller.staff && !(caller.uid && pass.holderUid === caller.uid)) throw new PassError('FORBIDDEN', 'Sign in with the account this ticket was sent to.', 403);
    const ext = pass.externalTicket;
    if (!ext) throw new PassError('NOT_FOUND', 'This pass has no ticket file.', 404);
    if (ext.kind === 'link') return { success: true, kind: 'link', url: ext.url };
    const url = await signedFileUrl(ext.storagePath, FILE_URL_TTL_MS, ext.filename);
    return { success: true, kind: 'pdf', url, filename: ext.filename || 'ticket.pdf', expiresInSeconds: FILE_URL_TTL_MS / 1000 };
};

/* The /t/<token> link from WhatsApp and email: the ticket, without signing in. */
const openTokenAction = async (db, body) => {
    const payload = readSignedToken(body.token);
    if (!payload?.r) throw new PassError('EXPIRED', 'This ticket link has expired. Open the ticket from the Newbi app instead.', 410);
    const pass = await loadPass(db, payload.r);
    if (!pass || pass.status === 'revoked') throw new PassError('NOT_FOUND', "This ticket isn't available any more.", 404);
    return { success: true, pass: publicPass(pass, { full: true }) };
};

/* ---------- campaign tickets ---------- */

// Where creators go at the venue: the guestlist counter, or the regular ticket holders' entry.
const ENTRY_VIA = ['guestlist', 'tickets'];

const loadCampaignContext = async (db, campaignId) => {
    if (!idOk(campaignId)) throw new PassError('VALIDATION', 'Missing campaign.');
    const snap = await db.collection('campaigns').doc(campaignId).get();
    if (!snap.exists) throw new PassError('NOT_FOUND', 'Campaign not found.', 404);
    const campaign = { id: snap.id, ...snap.data() };
    let event = {};
    if (idOk(campaign.eventId)) {
        const ev = await db.collection('upcoming_events').doc(campaign.eventId).get();
        if (ev.exists) {
            const e = ev.data();
            event = compact({ title: e.title, date: toIso(e.date), time: e.time, venue: e.location || e.venue, city: e.city, image: e.hubImage || e.image });
        }
    }
    // The campaign's own details (editor → Event passes) fill in, or override, the linked event's:
    // name, date, time, venue, when the box office opens, and which counter creators go to.
    event = compact({
        ...event,
        title: str(campaign.eventName, 120) || event.title || campaign.title,
        date: toIso(campaign.eventDate) || event.date || undefined,
        time: str(campaign.eventTime, 40) || event.time || undefined,
        venue: str(campaign.venue, 160) || event.venue || undefined,
        city: event.city || campaign.eventCity || undefined,
        boxOffice: str(campaign.boxOfficeTime, 80) || undefined,
        entry: ENTRY_VIA.includes(campaign.entryVia) ? campaign.entryVia : undefined,
    });
    if (!event.image && campaign.thumbnail) event.image = campaign.thumbnail;
    return { campaign, event };
};

const loadCreator = async (db, creatorId) => {
    if (!idOk(creatorId)) return null;
    const snap = await db.collection('creators').doc(creatorId).get();
    if (snap.exists) return { id: snap.id, ...snap.data() };
    const byUid = await db.collection('creators').where('uid', '==', creatorId).limit(1).get();
    return byUid.empty ? null : { id: byUid.docs[0].id, ...byUid.docs[0].data() };
};

export const isTicketEligible = (campaign, creator) => (creator?.shortlistedCampaigns || []).includes(campaign.id)
    || creator?.campaignStages?.[campaign.id] === 'shortlisted';
const hasApplied = (campaign, creator) => isTicketEligible(campaign, creator) || (creator?.joinedCampaigns || []).includes(campaign.id);

const holderOf = (creator) => ({
    holderUid: creator.uid || creator.id,
    creatorId: creator.id,
    holderName: str(creator.name || creator.displayName, 120),
    holderEmail: normalizeEmail(creator.email) || '',
    // WhatsApp only goes to a verified number (notify falls back to the user's verified phone).
    holderPhone: creator.isPhoneVerified ? (toE164(creator.whatsapp || creator.phone) || '') : '',
});

// Same link (or same PDF name and size), qty, tier and note = nothing to resend.
const ticketSignature = (t) => (t ? [t.kind, t.kind === 'pdf' ? `${t.filename || ''}:${t.size || ''}` : t.url || '', t.qty || '', t.tier || '', t.note || ''].join('|') : '');

/**
 * Creates or updates one creator's campaign pass in a transaction.
 * mode 'qr': a Newbi QR pass. mode 'confirmation': a pass without a QR code,
 * confirming their place. mode 'external': the partner's ticket (link or PDF).
 * A QR pass sent later upgrades a confirmation or a partner ticket in place.
 * Returns { ref, outcome: 'issued' | 'updated' | 'unchanged' | 'exists' }.
 */
const upsertCampaignPass = async (db, { campaign, event, creator, holder: holderIn = null, keyId = null, mode, ticket = null, qty, tier, note, staffEmail, uploadId }) => {
    // Outreach passes come with their own holder (from the application) and key.
    const holder = holderIn || holderOf(creator);
    const keyRef = db.collection('pass_keys').doc(`campaign_${campaign.id}_${keyId || holder.holderUid}`);
    return db.runTransaction(async (tx) => {
        const keySnap = await tx.get(keyRef);
        let existing = null;
        if (keySnap.exists && keySnap.data().ref) {
            const p = await tx.get(db.collection('passes').doc(keySnap.data().ref));
            if (p.exists && p.data().status !== 'revoked') existing = { ...p.data(), ref: p.id };
        }
        const now = nowIso();
        if (existing) {
            if (mode === 'confirmation') return { ref: existing.ref, outcome: 'exists' };
            if (mode === 'qr') {
                if (existing.qr !== false) return { ref: existing.ref, outcome: 'exists' };
                tx.update(db.collection('passes').doc(existing.ref), { qr: true, mode: 'qr', qrIssuedAt: now, updatedAt: now });
                return { ref: existing.ref, outcome: 'updated' };
            }
            if (ticketSignature(existing.externalTicket) === ticketSignature(ticket)) return { ref: existing.ref, outcome: 'unchanged' };
            tx.update(db.collection('passes').doc(existing.ref), {
                externalTicket: { ...ticket, uploadId: uploadId || null, updatedAt: now },
                ...(ticket.qty ? { qty: ticket.qty } : {}),
                ...(ticket.tier ? { tier: ticket.tier } : {}),
                ...(ticket.note ? { note: ticket.note } : {}),
                updatedAt: now,
            });
            return { ref: existing.ref, outcome: 'updated' };
        }
        let ref = makePassRef();
        if ((await tx.get(db.collection('passes').doc(ref))).exists) ref = makePassRef();
        tx.set(db.collection('passes').doc(ref), compact({
            ref,
            eventId: idOk(campaign.eventId) ? campaign.eventId : null,
            ...holder,
            source: 'campaign',
            sourceId: campaign.id,
            status: 'issued',
            qty: Math.max(1, Number(ticket?.qty || qty) || 1),
            tier: ticket?.tier || tier || null,
            note: ticket?.note || note || null,
            qr: mode === 'qr',
            mode: mode === 'confirmation' ? 'confirmation' : 'qr',
            externalTicket: mode === 'external' ? { ...ticket, uploadId: uploadId || null, updatedAt: now } : null,
            event,
            campaignTitle: str(campaign.title, 200),
            issuedAt: now,
            issuedBy: staffEmail || 'staff',
        }));
        tx.set(keyRef, compact({ ref, source: 'campaign', sourceId: campaign.id, uid: holder.holderUid, creatorId: holder.creatorId || creator?.id, at: now }));
        return { ref, outcome: 'issued' };
    });
};

/** Sends a campaign ticket on every channel: in the campaign, email (PDF attached), WhatsApp. */
const deliverCampaignPass = async (db, ref, { skip = [], extra = {} } = {}) => {
    let pass = await loadPass(db, ref);
    if (!pass) throw new PassError('NOT_FOUND', 'Pass not found.', 404);
    // Event details may have changed since the pass was issued (date, time, box office,
    // entry counter): refresh the pass's copy so the app, email and WhatsApp agree.
    if (pass.source === 'campaign' && idOk(pass.sourceId)) {
        const ctx = await loadCampaignContext(db, pass.sourceId).catch(() => null);
        if (ctx?.event && JSON.stringify(ctx.event) !== JSON.stringify(pass.event || {})) {
            await db.collection('passes').doc(ref).update({ event: ctx.event, updatedAt: nowIso() });
            pass = { ...pass, event: ctx.event };
        }
    }
    const ext = pass.externalTicket || null;
    const ticketToken = makeSignedToken({ r: ref }, TICKET_LINK_TTL);
    const data = {
        name: pass.holderName,
        campaignTitle: pass.campaignTitle,
        campaignId: pass.sourceId,
        eventName: pass.event?.title,
        date: pass.event?.date,
        time: pass.event?.time,
        venue: pass.event?.venue,
        boxOffice: pass.event?.boxOffice,
        entry: pass.event?.entry,
        tier: pass.tier,
        qty: pass.qty,
        note: pass.note,
        ref: pass.qr !== false ? ref : '',
        confirmation: pass.mode === 'confirmation' && pass.qr === false && !ext,
        ticketUrl: ticketToken ? ticketLinkUrl(ticketToken) : passUrl(ref),
        campaignUrl: campaignUrl(pass.sourceId),
        ticketToken,
        hasPdf: false,
        image: pass.event?.image || '',
        ...extra,
    };
    const attachments = [];
    if (ext?.kind === 'pdf' && ext.storagePath) {
        try {
            const file = bucket().file(ext.storagePath);
            const [buf] = await file.download();
            if (buf.length <= 8 * 1024 * 1024) {
                attachments.push({ filename: ext.filename || 'ticket.pdf', content: buf.toString('base64'), encoding: 'base64', contentType: 'application/pdf' });
                data.hasPdf = true;
            }
            data.whatsappDocumentUrl = await signedFileUrl(ext.storagePath, META_FETCH_TTL_MS, ext.filename);
            data.pdfFilename = ext.filename || 'ticket.pdf';
        } catch (err) {
            console.warn('[PASSES] ticket PDF not readable:', err.message);
        }
    }
    const version = Number(pass.deliveryVersion || 0) + 1;
    await db.collection('passes').doc(ref).set({ deliveryVersion: version, lastDeliveryAt: nowIso() }, { merge: true });
    return notify('campaign-ticket', pass.holderUid || null, data, {
        to: { email: pass.holderEmail, phone: pass.holderPhone, name: pass.holderName },
        ref: { collection: 'passes', id: ref },
        attachments: attachments.length ? attachments : undefined,
        skip,
        idempotencyKey: `pass_${ref}_v${version}`,
    });
};

const channelSummary = (delivery = {}) => ({
    email: delivery.email?.status || 'skipped',
    whatsapp: delivery.whatsapp?.status || 'skipped',
    push: delivery.push?.status || 'skipped',
});

const bumpUpload = async (db, uploadId, outcomes) => {
    if (!idOk(uploadId) || !outcomes.length) return;
    const inc = {};
    const add = (k) => { inc[k] = (inc[k] || 0) + 1; };
    outcomes.forEach((o) => {
        add(`counts.${o.outcome}`);
        if (o.channels) Object.entries(o.channels).forEach(([ch, st]) => add(`channels.${ch}.${['sent', 'queued', 'duplicate'].includes(st) ? 'sent' : st === 'skipped' ? 'skipped' : 'failed'}`));
    });
    const patch = Object.fromEntries(Object.entries(inc).map(([k, v]) => [k, FieldValue.increment(v)]));
    await db.collection('ticket_uploads').doc(uploadId).update({ ...patch, updatedAt: nowIso() }).catch(e => console.warn('[PASSES] upload log:', e.message));
};

const runLimited = async (items, limit, fn) => {
    const out = new Array(items.length);
    let next = 0;
    const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
        while (next < items.length) {
            const i = next++;
            out[i] = await fn(items[i], i);
        }
    });
    await Promise.all(workers);
    return out;
};

/* 'qr' or 'confirmation': what the send asked for, else the campaign's setting (editor → Event passes). */
export const passModeFor = (campaign, kind) => {
    const k = kind || campaign?.passKind;
    return k === 'confirmation' ? 'confirmation' : 'qr';
};

const issueCampaignAction = async (db, body, caller) => {
    requireStaff(caller);
    const { campaign, event } = await loadCampaignContext(db, str(body.campaignId, 128));
    const ids = [...new Set((Array.isArray(body.creatorIds) ? body.creatorIds : []).map(v => str(v, 128)).filter(idOk))].slice(0, MAX_BATCH);
    if (!ids.length) throw new PassError('VALIDATION', 'Choose at least one creator.');
    const qty = intIn(body.qty ?? campaign.ticketsPerCreator, 1, 20, 1);
    const tier = str(body.tier, 80) || null;
    const note = str(body.note, 500) || null;
    const mode = passModeFor(campaign, body.kind);

    const results = await runLimited(ids, 3, async (creatorId) => {
        try {
            const creator = await loadCreator(db, creatorId);
            if (!creator) return { creatorId, outcome: 'failed', error: 'Creator not found' };
            if (!isTicketEligible(campaign, creator)) return { creatorId, outcome: 'skipped', error: 'Not selected for this campaign' };
            const { ref, outcome } = await upsertCampaignPass(db, { campaign, event, creator, mode, qty, tier, note, staffEmail: caller.email, uploadId: body.uploadId });
            if (outcome === 'exists') return { creatorId, ref, outcome: 'skipped', error: mode === 'confirmation' ? 'Already has a pass' : 'Already has a QR pass' };
            const delivery = await deliverCampaignPass(db, ref);
            return { creatorId, ref, outcome, channels: channelSummary(delivery) };
        } catch (err) {
            console.warn('[PASSES] issue-campaign:', creatorId, err.message);
            return { creatorId, outcome: 'failed', error: err instanceof PassError ? err.message : 'Could not issue' };
        }
    });
    await bumpUpload(db, body.uploadId, results);
    return { success: true, results };
};

const cleanExternalRow = (row, campaignId) => {
    const kind = row?.kind === 'pdf' ? 'pdf' : row?.kind === 'link' ? 'link' : null;
    if (!kind) return { error: 'Add a ticket link or a PDF.' };
    const ticket = compact({
        kind,
        qty: intIn(row.qty, 1, 50, undefined),
        tier: str(row.tier, 80),
        note: str(row.note, 500),
        provider: str(row.provider, 80),
    });
    if (kind === 'link') {
        let url;
        try { url = new URL(str(row.url, 2000)); } catch { return { error: 'The ticket link isn’t a valid web address.' }; }
        if (url.protocol !== 'https:') return { error: 'Ticket links must start with https://' };
        ticket.url = url.toString();
    } else {
        const path = str(row.storagePath, 500);
        if (!path.startsWith(`tickets/${campaignId}/`) || path.includes('..')) return { error: 'The PDF wasn’t uploaded for this campaign.' };
        ticket.storagePath = path;
        ticket.filename = safeFileName(row.filename || path.split('/').pop());
        // The size tells a corrected PDF with the same name apart from the one already sent.
        if (Number(row.size) > 0) ticket.size = Math.floor(Number(row.size));
    }
    return { ticket };
};

const issueExternalAction = async (db, body, caller) => {
    requireStaff(caller);
    const { campaign, event } = await loadCampaignContext(db, str(body.campaignId, 128));
    const rows = (Array.isArray(body.rows) ? body.rows : []).slice(0, MAX_BATCH);
    if (!rows.length) throw new PassError('VALIDATION', 'No tickets to send.');

    const results = await runLimited(rows, 3, async (row) => {
        const creatorId = str(row?.creatorId, 128);
        const base = { creatorId, row: row?.row ?? null };
        try {
            const { ticket, error } = cleanExternalRow(row, campaign.id);
            if (error) return { ...base, outcome: 'failed', error };
            const creator = await loadCreator(db, creatorId);
            if (!creator) return { ...base, outcome: 'failed', error: 'Creator not found' };
            if (!hasApplied(campaign, creator)) return { ...base, outcome: 'failed', error: 'Not an applicant of this campaign' };
            if (ticket.kind === 'pdf') {
                const [exists] = await bucket().file(ticket.storagePath).exists();
                if (!exists) return { ...base, outcome: 'failed', error: 'The PDF is missing. Upload it again.' };
            }
            const { ref, outcome } = await upsertCampaignPass(db, { campaign, event, creator, mode: 'external', ticket, staffEmail: caller.email, uploadId: body.uploadId });
            if (outcome === 'unchanged') return { ...base, ref, outcome };
            const delivery = await deliverCampaignPass(db, ref);
            return { ...base, ref, outcome, channels: channelSummary(delivery) };
        } catch (err) {
            console.warn('[PASSES] issue-external:', creatorId, err.message);
            return { ...base, outcome: 'failed', error: err instanceof PassError ? err.message : 'Could not send' };
        }
    });
    await bumpUpload(db, body.uploadId, results);
    return { success: true, results };
};

const uploadStartAction = async (db, body, caller) => {
    requireStaff(caller);
    const campaignId = str(body.campaignId, 128);
    if (!idOk(campaignId)) throw new PassError('VALIDATION', 'Missing campaign.');
    const totals = body.totals && typeof body.totals === 'object' ? body.totals : {};
    const ref = db.collection('ticket_uploads').doc();
    await ref.set({
        campaignId,
        mode: body.mode === 'qr' ? 'qr' : 'csv',
        fileName: str(body.fileName, 200) || null,
        totals: Object.fromEntries(['rows', 'matched', 'unmatched', 'duplicate', 'problem', 'sending'].map(k => [k, Math.max(0, Number(totals[k]) || 0)])),
        counts: {},
        channels: {},
        by: caller.email || null,
        byUid: caller.uid,
        status: 'sending',
        createdAt: nowIso(),
    });
    return { success: true, uploadId: ref.id };
};

const uploadFinishAction = async (db, body, caller) => {
    requireStaff(caller);
    if (!idOk(body.uploadId)) throw new PassError('VALIDATION', 'Missing upload.');
    await db.collection('ticket_uploads').doc(body.uploadId).update({ status: 'done', finishedAt: nowIso() });
    return { success: true };
};

const uploadPdfAction = async (db, body, caller) => {
    requireStaff(caller);
    const campaignId = str(body.campaignId, 128);
    if (!idOk(campaignId)) throw new PassError('VALIDATION', 'Missing campaign.');
    const creator = await loadCreator(db, str(body.creatorId, 128));
    if (!creator) throw new PassError('NOT_FOUND', 'Creator not found.', 404);
    const b64 = String(body.data || '').replace(/^data:application\/pdf;base64,/, '');
    const buf = Buffer.from(b64, 'base64');
    if (!buf.length) throw new PassError('VALIDATION', 'The PDF is empty.');
    if (buf.length > MAX_PDF_BYTES) throw new PassError('TOO_LARGE', 'Ticket PDFs must be under 3 MB.', 413);
    if (buf.subarray(0, 5).toString('latin1') !== '%PDF-') throw new PassError('VALIDATION', 'That file isn’t a PDF.');
    const filename = safeFileName(body.filename);
    const uid = creator.uid || creator.id;
    const storagePath = `tickets/${campaignId}/${uid}/${Date.now().toString(36)}-${filename}`;
    await bucket().file(storagePath).save(buf, {
        resumable: false,
        contentType: 'application/pdf',
        metadata: { cacheControl: 'private, max-age=0', metadata: { campaignId, uid, uploadedBy: caller.email || caller.uid } },
    });
    return { success: true, storagePath, filename, size: buf.length };
};

const resendAction = async (db, body, caller) => {
    requireStaff(caller);
    let refs = [];
    if (body.ref) refs = [refFromCode(body.ref)].filter(isPassRef);
    else if (idOk(body.campaignId)) {
        const snap = await db.collection('passes').where('sourceId', '==', body.campaignId).get();
        refs = snap.docs.map(d => ({ ...d.data(), ref: d.id }))
            .filter(p => p.source === 'campaign' && p.status !== 'revoked')
            .filter(p => !body.failedOnly || ['failed', 'retry'].includes(p.delivery?.email?.status) || p.delivery?.whatsapp?.status === 'failed')
            .map(p => p.ref)
            .slice(0, MAX_BATCH);
    }
    if (!refs.length) return { success: true, results: [] };
    const results = await runLimited(refs, 3, async (ref) => {
        try {
            const pass = await loadPass(db, ref);
            if (!pass || pass.status === 'revoked') return { ref, outcome: 'skipped', error: 'Revoked or missing' };
            // A resend for "failures only" leaves channels that already worked alone.
            const skip = body.failedOnly ? ['push', 'inApp', ...(pass.delivery?.email?.status === 'sent' ? ['email'] : []), ...(['sent', 'delivered', 'read'].includes(pass.delivery?.whatsapp?.status) ? ['whatsapp'] : [])] : [];
            if (pass.source === 'guestlist') {
                const out = await deliverGuestlistPass(db, pass.sourceId, pass.entryId, { force: true });
                return { ref, outcome: 'resent', channels: channelSummary(out.delivery) };
            }
            const delivery = await deliverCampaignPass(db, ref, { skip });
            return { ref, outcome: 'resent', channels: channelSummary(delivery) };
        } catch (err) {
            return { ref, outcome: 'failed', error: err.message };
        }
    });
    return { success: true, results };
};

/*
 * Moves a campaign pass to another category (tier), usually an upgrade: VIP for
 * someone with a Gold pass. Optionally changes the ticket count too. The pass
 * keeps its code; the creator gets the update on every channel. Partner tickets
 * aren't changed here: upload the partner's new ticket with a CSV instead.
 */
const retierAction = async (db, body, caller) => {
    requireStaff(caller);
    const ref = refFromCode(body.ref);
    if (!isPassRef(ref)) throw new PassError('VALIDATION', 'Missing pass.');
    const tier = str(body.tier, 80);
    if (!tier) throw new PassError('VALIDATION', 'Choose a category.');
    const qty = body.qty === undefined || body.qty === null || body.qty === '' ? null : intIn(body.qty, 1, 20, null);
    const passRef = db.collection('passes').doc(ref);
    const before = await db.runTransaction(async (tx) => {
        const snap = await tx.get(passRef);
        if (!snap.exists) throw new PassError('NOT_FOUND', 'Pass not found.', 404);
        const pass = snap.data();
        if (pass.source !== 'campaign') throw new PassError('VALIDATION', 'Only creator campaign passes have categories.');
        if (pass.status === 'revoked') throw new PassError('VALIDATION', 'This pass was revoked.');
        if (pass.externalTicket) throw new PassError('VALIDATION', 'This is a partner ticket. Upload their new ticket with a CSV instead.');
        if ((pass.tier || '') === tier && (!qty || Number(pass.qty) === qty)) return null;
        tx.update(passRef, compact({
            tier,
            qty: qty || undefined,
            previousTier: pass.tier || '',
            tierChangedAt: nowIso(),
            tierChangedBy: caller.email || caller.uid || 'staff',
            updatedAt: nowIso(),
        }));
        return pass;
    });
    if (!before) return { success: true, ref, outcome: 'unchanged' };
    const delivery = await deliverCampaignPass(db, ref, { extra: { upgradedTo: tier, previousTier: before.tier || '' } });
    return { success: true, ref, outcome: 'updated', channels: channelSummary(delivery) };
};

const revokeAction = async (db, body, caller) => {
    requireStaff(caller);
    const ref = refFromCode(body.ref);
    const passRef = db.collection('passes').doc(ref);
    const out = await db.runTransaction(async (tx) => {
        const snap = await tx.get(passRef);
        if (!snap.exists) throw new PassError('NOT_FOUND', 'Pass not found.', 404);
        const pass = snap.data();
        if (pass.status === 'revoked') return { already: true };
        // Transactions read everything before the first write.
        const keyRef = pass.holderUid ? db.collection('pass_keys').doc(`${pass.source}_${pass.sourceId}_${pass.holderUid}`) : null;
        const key = keyRef ? await tx.get(keyRef) : null;
        const now = nowIso();
        tx.update(passRef, { status: 'revoked', revokedAt: now, revokedBy: caller.email || caller.uid, revokeReason: str(body.reason, 300) || null });
        if (key?.exists && key.data().ref === ref) tx.delete(keyRef);
        if (pass.source === 'guestlist' && pass.entryId) {
            tx.set(db.collection('guestlists').doc(pass.sourceId).collection('entries').doc(pass.entryId), { passRevoked: true, passRevokedAt: now }, { merge: true });
        }
        return { already: false };
    });
    return { success: true, ...out };
};

/** The gate scanner: checks a pass in for this event. Same result shape as store.scanTicket. */
const checkinAction = async (db, body, caller) => {
    requireStaff(caller);
    const ref = refFromCode(body.code);
    if (!isPassRef(ref)) return { success: true, found: false };
    const passRef = db.collection('passes').doc(ref);
    const eventId = str(body.eventId, 128);
    const lists = new Set([eventId, ...(Array.isArray(body.guestlistIds) ? body.guestlistIds : [])].map(v => str(v, 128)).filter(Boolean));
    return db.runTransaction(async (tx) => {
        const snap = await tx.get(passRef);
        if (!snap.exists) return { success: true, found: false };
        const pass = snap.data();
        const data = {
            code: ref,
            id: ref,
            kind: 'pass',
            name: pass.holderName || 'Guest',
            phone: pass.holderPhone || '',
            type: pass.source === 'campaign' ? 'Creator ticket' : pass.source === 'order' ? 'Ticket' : pass.mode === 'rsvp' ? 'RSVP' : 'Guestlist',
            people: Math.max(1, Number(pass.qty) || 1),
            guestsCount: Math.max(1, Number(pass.qty) || 1),
            ...(pass.tier ? { items: [{ name: pass.tier, count: Math.max(1, Number(pass.qty) || 1) }] } : {}),
        };
        const forThisEvent = lists.has(pass.eventId) || lists.has(pass.sourceId);
        if (!forThisEvent) return { success: true, found: true, valid: false, reason: 'wrong_event', message: `This pass is for ${pass.event?.title || 'another event'}.`, data };
        if (pass.status === 'revoked') return { success: true, found: true, valid: false, reason: 'rejected', message: 'This pass was cancelled.', data };
        if (pass.qr === false) {
            const message = pass.externalTicket ? 'This is a partner ticket. Check it with the ticketing partner.' : 'This is a confirmation without a QR code. Check the name on your list.';
            return { success: true, found: true, valid: false, reason: 'rejected', message, data };
        }
        // The linked guestlist entry or order: the check-in desk may have marked it already.
        let linkedRef = null;
        let linked = null;
        if (pass.source === 'guestlist' && pass.entryId) linkedRef = db.collection('guestlists').doc(pass.sourceId).collection('entries').doc(pass.entryId);
        if (pass.source === 'order' && idOk(pass.sourceId)) linkedRef = db.collection('ticket_orders').doc(pass.sourceId);
        if (linkedRef) {
            const l = await tx.get(linkedRef);
            linked = l.exists ? l.data() : null;
        }
        if (pass.source === 'order' && linked && ['pending', 'rejected'].includes(String(linked.status))) {
            return { success: true, found: true, valid: false, reason: linked.status === 'pending' ? 'unpaid' : 'rejected', message: linked.status === 'pending' ? "Payment hasn't been verified yet." : 'This order was cancelled.', data };
        }
        if (pass.status === 'checked_in' || linked?.attended || linked?.isScanned) {
            return { success: true, found: true, valid: true, scanned: true, reason: 'already', message: 'Already checked in.', data: { ...data, previousAt: pass.checkedInAt || linked?.attendedAt || linked?.scannedAt || null } };
        }
        const now = nowIso();
        tx.update(passRef, { status: 'checked_in', checkedInAt: now, checkedInBy: caller.email || caller.uid });
        if (linkedRef && linked) tx.update(linkedRef, pass.source === 'order' ? { isScanned: true, scannedAt: now, attended: true, attendedAt: now } : { attended: true, attendedAt: now });
        return { success: true, found: true, valid: true, scanned: false, reason: 'admitted', message: 'Entry granted.', data };
    });
};

/* ---------- listing (when the browser can't read passes from Firestore) ---------- */

const byIssued = (a, b) => String(b.issuedAt || '').localeCompare(String(a.issuedAt || ''));

/** The signed-in person's own passes: Community → My guestlists and "Your ticket" in a campaign. */
const mineAction = async (db, body, caller) => {
    requireUser(caller);
    const snap = await db.collection('passes').where('holderUid', '==', caller.uid).get();
    return { success: true, passes: snap.docs.map(d => ({ ...d.data(), ref: d.id })).sort(byIssued) };
};

/** Staff: one campaign's passes and send log, or the passes for a set of events/guestlists (gate scanner). */
const staffListAction = async (db, body, caller) => {
    requireStaff(caller);
    if (idOk(body.campaignId)) {
        const [passes, uploads] = await Promise.all([
            db.collection('passes').where('sourceId', '==', body.campaignId).get(),
            db.collection('ticket_uploads').where('campaignId', '==', body.campaignId).get(),
        ]);
        return {
            success: true,
            passes: passes.docs.map(d => ({ ...d.data(), ref: d.id })).filter(p => p.source === 'campaign').sort(byIssued),
            uploads: uploads.docs.map(d => ({ ...d.data(), id: d.id })).sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || ''))).slice(0, 50),
        };
    }
    const ids = [...new Set((Array.isArray(body.ids) ? body.ids : []).map(v => str(v, 128)).filter(idOk))].slice(0, 30);
    if (!ids.length) throw new PassError('VALIDATION', 'Missing campaign or event.');
    const [byEvent, bySource] = await Promise.all([
        db.collection('passes').where('eventId', 'in', ids).get(),
        db.collection('passes').where('sourceId', 'in', ids).get(),
    ]);
    const seen = new Map();
    [...byEvent.docs, ...bySource.docs].forEach(d => seen.set(d.id, { ...d.data(), ref: d.id }));
    return { success: true, passes: [...seen.values()].sort(byIssued) };
};

/* ---------- routing ---------- */

const ACTIONS = {
    guestlist: guestlistAction,
    'register-guestlist': registerGuestlist,
    get: getAction,
    file: fileAction,
    'open-token': openTokenAction,
    'issue-campaign': issueCampaignAction,
    'issue-campaign-external': issueExternalAction,
    retier: retierAction,
    mine: mineAction,
    'staff-list': staffListAction,
    'upload-start': uploadStartAction,
    'upload-finish': uploadFinishAction,
    'upload-pdf': uploadPdfAction,
    resend: resendAction,
    revoke: revokeAction,
    checkin: checkinAction,
};
const POST_ONLY = new Set(['register-guestlist', 'file', 'issue-campaign', 'issue-campaign-external', 'upload-start', 'upload-finish', 'upload-pdf', 'resend', 'retier', 'revoke', 'checkin', 'staff-list']);

export const handlePasses = async (req, res) => {
    const action = str(req.query?.action, 40);
    const fn = ACTIONS[action];
    if (!fn) return res.status(400).json({ success: false, code: 'UNKNOWN', error: 'Unknown action.' });
    if (POST_ONLY.has(action) && req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });
    const body = { ...(req.query || {}), ...(req.body && typeof req.body === 'object' ? req.body : {}) };
    try {
        const db = getDb();
        const caller = await callerFrom(req);
        const result = await fn(db, body, caller);
        res.setHeader('Cache-Control', 'private, no-store');
        return res.status(200).json(result);
    } catch (err) {
        if (err instanceof PassError) {
            return res.status(err.status).json({ success: false, code: err.code, error: err.message, ...err.extra });
        }
        console.error(`[API/PASSES] ${action} failed:`, err);
        return res.status(500).json({ success: false, code: 'SERVER', error: 'Something went wrong. Please try again.' });
    }
};

// For tests and the migration script.
/* ---------- Outreach (open-form applicants) ---------- */

/*
 * Campaign outreach applicants mostly have no creator profile, so their pass
 * holder comes from the application: the phone and email they applied with
 * (they agreed to WhatsApp updates on the form). When the application is
 * linked to a registered creator, the pass is keyed to their login as usual,
 * so they never get two, and it shows in their app.
 */
export const releaseApplicationPass = async (db, { campaignId, appId, staffEmail, qty, tier, note }) => {
    const { campaign, event } = await loadCampaignContext(db, campaignId);
    const appSnap = await db.collection('campaigns').doc(campaignId).collection('applications').doc(String(appId)).get();
    if (!appSnap.exists) throw new PassError('NOT_FOUND', 'Application not found.', 404);
    const app = appSnap.data();
    const creator = app.creatorId ? await loadCreator(db, app.creatorId) : null;
    const holder = {
        holderUid: creator?.uid || null,
        creatorId: creator?.id || null,
        holderName: str(app.fullName, 120),
        holderEmail: normalizeEmail(app.email) || '',
        holderPhone: toE164(app.phone) || '',
        applicationId: appSnap.id,
    };
    const { ref, outcome } = await upsertCampaignPass(db, {
        campaign, event, holder, keyId: holder.holderUid || `app_${appSnap.id}`, mode: passModeFor(campaign),
        qty: qty || campaign.ticketsPerCreator, tier, note, staffEmail,
    });
    const delivery = outcome === 'exists' ? null : await deliverCampaignPass(db, ref);
    return { ref, outcome, channels: delivery ? channelSummary(delivery) : null };
};

export const revokePassForOutreach = (db, ref, { reason, staffEmail }) => revokeAction(db, { ref, reason }, { staff: true, email: staffEmail });

/** The signed /t/<token> link to a pass, for the creator's deliverables page. */
export const ticketLinkFor = (ref) => {
    const token = makeSignedToken({ r: ref }, TICKET_LINK_TTL);
    return token ? ticketLinkUrl(token) : passUrl(ref);
};

export const _internal = { actions: ACTIONS, upsertCampaignPass, deliverCampaignPass, publicPass, cleanExternalRow, passFromGuestlistEntry };
