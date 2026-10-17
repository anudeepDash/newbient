/**
 * WhatsApp through the Meta Cloud API (moved out of api/creator-join.js).
 *
 * Business-initiated messages must use an approved template, so there is no
 * free-text fallback: Meta drops those outside the 24-hour window anyway.
 *
 * Env: WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID, optional
 * WHATSAPP_API_VERSION (default v23.0), WHATSAPP_TEMPLATE_LANG (default en).
 *
 * Every send is logged to `message_log/{id}`; delivery and read receipts
 * arrive later through the webhook (api/track.js?type=whatsapp) and update
 * the same doc and, when the send had a `ref`, `{collection}/{id}.delivery.whatsapp`.
 */
import { getDb, FieldValue, nowIso } from './db.js';

const API_VERSION = () => process.env.WHATSAPP_API_VERSION || 'v23.0';
const RETRY_DELAYS_MIN = [5, 30, 120];

export const isWhatsAppConfigured = () => Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);

/**
 * Normalises a phone number to E.164 ("+919876543210"). Ten-digit numbers
 * are taken as Indian. Returns null when it can't be a real number.
 */
export const toE164 = (phone, defaultCountry = '91') => {
    if (!phone) return null;
    const raw = String(phone).trim();
    let digits = raw.replace(/\D/g, '');
    if (!digits) return null;
    if (raw.startsWith('+')) {
        // already international
    } else if (digits.startsWith('00')) {
        digits = digits.slice(2);
    } else if (digits.length === 11 && digits.startsWith('0')) {
        digits = `${defaultCountry}${digits.slice(1)}`;
    } else if (digits.length === 10) {
        digits = `${defaultCountry}${digits}`;
    }
    if (digits.length < 8 || digits.length > 15) return null;
    return `+${digits}`;
};

/** Template names can be renamed per env without a deploy: WHATSAPP_TEMPLATE_CAMPAIGN_TICKET etc. */
export const templateName = (name) => process.env[`WHATSAPP_TEMPLATE_${String(name).toUpperCase()}`] || name;

const text = (value) => ({ type: 'text', text: String(value ?? '').replace(/[\r\n\t]+/g, ' ').replace(/ {4,}/g, '   ').slice(0, 1000) || '-' });

/**
 * Builds the template components:
 *   header: { type: 'document', link, filename } | { type: 'image', link } | { type: 'text', text }
 *   bodyParams: ['Ann', 'Campaign', ...]
 *   buttons: [{ index: 0, param: 'token' }]   (URL buttons with a dynamic suffix)
 *            [{ index: 0, payload: 'j1.…' }]  (quick-reply buttons; the payload comes back in the webhook)
 */
export const buildComponents = ({ header, bodyParams = [], buttons = [] }) => {
    const components = [];
    if (header?.type === 'document' && header.link) {
        components.push({ type: 'header', parameters: [{ type: 'document', document: { link: header.link, filename: header.filename || 'ticket.pdf' } }] });
    } else if (header?.type === 'image' && header.link) {
        components.push({ type: 'header', parameters: [{ type: 'image', image: { link: header.link } }] });
    } else if (header?.type === 'text' && header.text) {
        components.push({ type: 'header', parameters: [text(header.text)] });
    }
    if (bodyParams.length) components.push({ type: 'body', parameters: bodyParams.map(text) });
    buttons.forEach((b) => {
        if (b && typeof b.payload === 'string' && b.payload) {
            components.push({ type: 'button', sub_type: 'quick_reply', index: String(b.index ?? 0), parameters: [{ type: 'payload', payload: b.payload }] });
        } else if (b && b.param !== undefined && b.param !== null && b.param !== '') {
            components.push({ type: 'button', sub_type: 'url', index: String(b.index ?? 0), parameters: [{ type: 'text', text: String(b.param) }] });
        }
    });
    return components;
};

let testFetch = null;
export const setWhatsAppFetchForTests = (f) => { testFetch = f; };

const callMeta = async (payload) => {
    const doFetch = testFetch || fetch;
    const res = await doFetch(`https://graph.facebook.com/${API_VERSION()}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    let data = {};
    try { data = await res.json(); } catch { data = {}; }
    return { ok: res.ok, status: res.status, data };
};

// Meta error codes that won't succeed on retry: bad number, template missing/paused, not on WhatsApp.
const PERMANENT_CODES = new Set([100, 131008, 131009, 131026, 131030, 131047, 131051, 132000, 132001, 132005, 132007, 132012, 132015, 132016, 133010]);

/**
 * sendTemplate({ to, template, language, header, bodyParams, buttons, event, uid, ref })
 * → { ok, status: 'sent'|'failed'|'retry'|'skipped', messageId, error, errorCode, retriable, logId }
 * Never throws.
 *
 * autoRetry: false leaves retries to the caller (the outreach queue, which has
 * its own rate limit): a failure is logged as 'failed' and the daily worker
 * won't resend it. `retriable` says whether trying again could work.
 */
export const sendTemplate = async ({ to, template, language, header, bodyParams = [], buttons = [], event = '', uid = null, ref = null, logId = null, autoRetry = true }) => {
    if (!isWhatsAppConfigured()) return { ok: false, status: 'skipped', error: 'WhatsApp is not set up' };
    const phone = toE164(to);
    if (!phone) return { ok: false, status: 'skipped', error: 'No valid WhatsApp number' };

    const name = templateName(template);
    const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: phone.slice(1),
        type: 'template',
        template: { name, language: { code: language || process.env.WHATSAPP_TEMPLATE_LANG || 'en' }, components: buildComponents({ header, bodyParams, buttons }) },
    };

    const db = getDb();
    const logRef = logId ? db.collection('message_log').doc(logId) : db.collection('message_log').doc();
    const base = { channel: 'whatsapp', to: phone, template: name, event, uid, ref, updatedAt: nowIso() };
    if (!logId) base.createdAt = nowIso();

    let result;
    try {
        result = await callMeta(payload);
    } catch (err) {
        result = { ok: false, status: 0, data: { error: { message: err.message } } };
    }

    if (result.ok && result.data?.messages?.[0]?.id) {
        const messageId = result.data.messages[0].id;
        await logRef.set({ ...base, status: 'sent', messageId, error: FieldValue.delete(), payload: FieldValue.delete() }, { merge: true }).catch(() => {});
        await writeDelivery(ref, { status: 'sent', messageId, at: nowIso(), error: null });
        return { ok: true, status: 'sent', messageId, logId: logRef.id };
    }

    const err = result.data?.error || {};
    const code = Number(err.code || 0);
    const message = String(err.error_data?.details || err.message || `HTTP ${result.status}`).slice(0, 300);
    const permanent = PERMANENT_CODES.has(code) || (result.status >= 400 && result.status < 500 && result.status !== 429 && code !== 130429 && code !== 131056);
    let attempts = 0;
    try { attempts = Number((await logRef.get()).data()?.attempts || 0); } catch { attempts = 0; }
    attempts += 1;
    const retry = autoRetry && !permanent && attempts <= RETRY_DELAYS_MIN.length;
    await logRef.set({
        ...base,
        status: retry ? 'retry' : 'failed',
        error: message,
        errorCode: code || null,
        attempts,
        ...(retry ? { nextAttemptAt: new Date(Date.now() + RETRY_DELAYS_MIN[attempts - 1] * 60 * 1000).toISOString(), payload: { to: phone, template, language: language || null, header: header || null, bodyParams, buttons, event, uid, ref } } : { payload: FieldValue.delete() }),
    }, { merge: true }).catch(() => {});
    await writeDelivery(ref, { status: retry ? 'retrying' : 'failed', at: nowIso(), error: message });
    return { ok: false, status: retry ? 'retry' : 'failed', error: message, errorCode: code || null, retriable: !permanent, logId: logRef.id };
};

/**
 * A free-text message (inbox replies). Meta only delivers these within 24
 * hours of the person's last message; the caller checks that window.
 * → { ok, status, messageId, error, errorCode, retriable }. Never throws, never auto-retries.
 */
export const sendText = async ({ to, text, event = 'inbox-reply', ref = null }) => {
    if (!isWhatsAppConfigured()) return { ok: false, status: 'skipped', error: 'WhatsApp is not set up' };
    const phone = toE164(to);
    if (!phone) return { ok: false, status: 'skipped', error: 'No valid WhatsApp number' };
    const body = String(text || '').slice(0, 4096);
    const db = getDb();
    const logRef = db.collection('message_log').doc();
    const base = { channel: 'whatsapp', to: phone, template: null, event, ref, createdAt: nowIso(), updatedAt: nowIso() };
    let result;
    try {
        result = await callMeta({ messaging_product: 'whatsapp', recipient_type: 'individual', to: phone.slice(1), type: 'text', text: { body, preview_url: true } });
    } catch (err) {
        result = { ok: false, status: 0, data: { error: { message: err.message } } };
    }
    if (result.ok && result.data?.messages?.[0]?.id) {
        const messageId = result.data.messages[0].id;
        await logRef.set({ ...base, status: 'sent', messageId }).catch(() => {});
        await writeDelivery(ref, { status: 'sent', messageId, at: nowIso(), error: null });
        return { ok: true, status: 'sent', messageId, logId: logRef.id };
    }
    const err = result.data?.error || {};
    const code = Number(err.code || 0);
    const message = String(err.error_data?.details || err.message || `HTTP ${result.status}`).slice(0, 300);
    const permanent = PERMANENT_CODES.has(code) || (result.status >= 400 && result.status < 500 && result.status !== 429 && code !== 130429 && code !== 131056);
    await logRef.set({ ...base, status: 'failed', error: message, errorCode: code || null }).catch(() => {});
    await writeDelivery(ref, { status: 'failed', at: nowIso(), error: message });
    return { ok: false, status: 'failed', error: message, errorCode: code || null, retriable: !permanent, logId: logRef.id };
};

/** Downloads media someone sent us (inbox). → { mimeType, base64 } or null. The token never leaves the server. */
export const fetchWhatsAppMedia = async (mediaId, { maxBytes = 5 * 1024 * 1024 } = {}) => {
    if (!isWhatsAppConfigured() || !/^[A-Za-z0-9_-]{4,128}$/.test(String(mediaId || ''))) return null;
    const doFetch = testFetch || fetch;
    const auth = { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}` };
    const meta = await doFetch(`https://graph.facebook.com/${API_VERSION()}/${mediaId}`, { headers: auth });
    if (!meta.ok) return null;
    const info = await meta.json().catch(() => ({}));
    if (!info.url || Number(info.file_size || 0) > maxBytes) return null;
    const file = await doFetch(info.url, { headers: auth });
    if (!file.ok) return null;
    const buf = Buffer.from(await file.arrayBuffer());
    if (buf.length > maxBytes) return null;
    return { mimeType: info.mime_type || 'application/octet-stream', base64: buf.toString('base64') };
};

/** Mirrors a WhatsApp status onto the record it was about (e.g. a pass). */
const writeDelivery = async (ref, value) => {
    if (!ref?.collection || !ref?.id) return;
    try {
        await getDb().collection(ref.collection).doc(ref.id).set({ delivery: { whatsapp: value } }, { merge: true });
    } catch (e) {
        console.warn('[WHATSAPP] Delivery status not saved:', e.message);
    }
};

/** For the mail worker: resend failed WhatsApp messages that are due. */
export const retryFailedWhatsApp = async ({ limit = 20, deadline = Date.now() + 10000 } = {}) => {
    if (!isWhatsAppConfigured()) return 0;
    let snap;
    try {
        snap = await getDb().collection('message_log').where('status', '==', 'retry').limit(100).get();
    } catch (e) {
        console.warn('[WHATSAPP] Retry scan failed:', e.message);
        return 0;
    }
    const now = Date.now();
    const due = snap.docs.filter(d => d.data().payload && Date.parse(d.data().nextAttemptAt || 0) <= now).slice(0, limit);
    let tried = 0;
    for (const d of due) {
        if (Date.now() > deadline) break;
        tried++;
        await d.ref.set({ status: 'retrying' }, { merge: true }).catch(() => {});
        await sendTemplate({ ...d.data().payload, logId: d.id });
    }
    return tried;
};

const STATUS_RANK = { sent: 1, delivered: 2, read: 3, failed: 4 };

/** One status from the webhook: sent / delivered / read / failed. Resolves to { log } (the message_log doc) when it matched one. */
export const recordWhatsAppStatus = async (status) => {
    const messageId = status?.id;
    if (!messageId) return false;
    const db = getDb();
    const snap = await db.collection('message_log').where('messageId', '==', messageId).limit(1).get();
    const at = status.timestamp ? new Date(Number(status.timestamp) * 1000).toISOString() : nowIso();
    const error = status.errors?.[0] ? String(status.errors[0].error_data?.details || status.errors[0].title || status.errors[0].message || '').slice(0, 300) : null;
    if (snap.empty) {
        await db.collection('message_log').add({ channel: 'whatsapp', messageId, status: status.status, statusAt: at, error, orphan: true, createdAt: nowIso() }).catch(() => {});
        return false;
    }
    const docSnap = snap.docs[0];
    const current = docSnap.data();
    // Receipts can arrive out of order; never move "read" back to "delivered".
    const keep = (STATUS_RANK[current.status] || 0) > (STATUS_RANK[status.status] || 0) && status.status !== 'failed';
    await docSnap.ref.set({
        ...(keep ? {} : { status: status.status }),
        statusTimes: { [status.status]: at },
        ...(error ? { error } : {}),
        updatedAt: nowIso(),
    }, { merge: true });
    if (!keep) await writeDelivery(current.ref, { status: status.status, messageId, at, error });
    return { log: { id: docSnap.id, ...current }, kept: keep, error };
};

/** Phone verification link for new creators (template `creator_verification`, en_US). */
export const sendCreatorVerification = (phone, creatorName, verificationUrl, { uid = null } = {}) => sendTemplate({
    to: phone,
    template: 'creator_verification',
    language: process.env.WHATSAPP_TEMPLATE_LANG_CREATOR_VERIFICATION || 'en_US',
    bodyParams: [creatorName || 'Creator', verificationUrl],
    event: 'creator-verification',
    uid,
});
