/**
 * The outreach inbox's storage (Phase 3): one thread per phone number, with
 * every message in and out.
 *
 *   outreach_inbox/{contactId}                  phone, name, lastMessageAt, lastInboundAt, lastText, unread,
 *                                               state: 'open' | 'done', campaignIds[], lastCampaignId, lastAppId
 *   outreach_inbox/{contactId}/inbox_messages/{id}
 *       direction: 'in' | 'out', type, text, caption, mediaId, mimeType, wamid, status, sentBy,
 *       campaignId, appId, at, expiresAt (a Firestore TTL policy deletes it after RETENTION_DAYS)
 *
 * contactId is the same hash creator_contacts uses, so a thread links to the
 * creator record without the number being an id. Admin-only, read through
 * api/_lib/outreachInbox.js.
 */
import { createHash } from 'node:crypto';
import { nowIso } from './db.js';

export const RETENTION_DAYS = 365;

/** creator_contacts and inbox thread id: one per phone, without the number in the id. */
export const contactIdFor = (phone) => `p_${createHash('sha256').update(String(phone)).digest('hex').slice(0, 24)}`;

export const threadRef = (db, phone) => db.collection('outreach_inbox').doc(contactIdFor(phone));

const messageIdFor = (wamid) => `w${createHash('sha256').update(String(wamid)).digest('hex').slice(0, 30)}`;

const preview = (m) => {
    if (m.text) return String(m.text).slice(0, 140);
    if (m.caption) return `[${m.type}] ${String(m.caption).slice(0, 120)}`;
    return `[${m.type || 'message'}]`;
};

/**
 * Adds one message to the person's thread and updates the thread. An
 * incoming message we've already stored (Meta retries webhooks) is skipped.
 * → the message id
 */
export const appendThreadMessage = async (db, message) => {
    const {
        phone, name = null, direction, type = 'text', text = '', caption = '', mediaId = null, mimeType = null,
        wamid = null, status = direction === 'in' ? 'received' : 'sent', sentBy = null, campaignId = null, appId = null,
        at = nowIso(), id = null,
    } = message;
    if (!phone) return null;
    const tRef = threadRef(db, phone);
    const mRef = tRef.collection('inbox_messages').doc(id || (wamid ? messageIdFor(wamid) : undefined));
    const expiresAt = new Date(Date.parse(at) + RETENTION_DAYS * 86_400_000);
    await db.runTransaction(async (tx) => {
        const [t, m] = await Promise.all([tx.get(tRef), tx.get(mRef)]);
        if (m.exists && direction === 'in') return;
        const cur = t.exists ? t.data() : {};
        const doc = { direction, type, text: String(text || '').slice(0, 4096), caption: String(caption || '').slice(0, 1024), mediaId, mimeType, wamid, status, sentBy, campaignId, appId, at, expiresAt };
        tx.set(mRef, doc, { merge: true });
        const campaignIds = [...new Set([...(cur.campaignIds || []), campaignId].filter(Boolean))];
        tx.set(tRef, {
            phone,
            contactId: tRef.id,
            name: name || cur.name || null,
            lastMessageAt: at,
            lastText: preview(doc),
            lastDirection: direction,
            campaignIds,
            ...(campaignId ? { lastCampaignId: campaignId, lastAppId: appId || cur.lastAppId || null } : {}),
            ...(direction === 'in' ? { lastInboundAt: at, unread: Number(cur.unread || 0) + 1, state: 'open' } : {}),
            createdAt: cur.createdAt || at,
            updatedAt: at,
        }, { merge: true });
    });
    return mRef.id;
};

/** Meta's customer-service window: free text only within 24 h of their last message. */
export const WINDOW_MS = 24 * 3600_000;
export const windowOpen = (thread, now = Date.now()) => Boolean(thread?.lastInboundAt) && now - Date.parse(thread.lastInboundAt) < WINDOW_MS;
