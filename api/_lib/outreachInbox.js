/**
 * The outreach inbox (Phase 3): every WhatsApp conversation with creators, for
 * the outreach roles. Messages are stored by the webhook (incoming) and the
 * send queue (outgoing); see api/_lib/outreachThreads.js for the data.
 *
 *   POST ?action=inbox-list      { campaignId?, state?: 'open'|'done'|'all' }   threads, newest first
 *   POST ?action=inbox-thread    { threadId }                    messages + who it is; marks it read
 *   POST ?action=inbox-reply     { threadId, text }              free text, only inside the 24-hour window
 *   POST ?action=inbox-template  { threadId, kind: 'deliverables'|'reminder' }   outside the window
 *   POST ?action=inbox-state     { threadId, state: 'open'|'done' }
 *   POST ?action=inbox-media     { threadId, messageId }         a photo or voice note they sent (≤ 5 MB)
 *
 * Replies go through the send queue (rate limit, retries) and are sent at
 * once when there's room. The access token never leaves the server.
 */
import { nowIso } from './db.js';
import { fetchWhatsAppMedia, isWhatsAppConfigured } from './whatsapp.js';
import { enqueueJob, sendSoon, submitUrlFor } from './outreachQueue.js';
import { windowOpen, WINDOW_MS } from './outreachThreads.js';
import { maskPhone } from '../../src/lib/outreach/normalize.js';

const send = (res, status, body) => res.status(status).json(body);
const str = (v, max = 200) => String(v ?? '').trim().slice(0, max);
const ID = /^[\w-]{1,128}$/;
const MAX_THREADS = 200;
const MAX_MESSAGES = 300;

const threadOut = (d) => {
    const t = d.data();
    return {
        id: d.id,
        name: t.name || null,
        phone: t.phone,
        lastMessageAt: t.lastMessageAt,
        lastInboundAt: t.lastInboundAt || null,
        lastText: t.lastText || '',
        lastDirection: t.lastDirection || null,
        unread: Number(t.unread || 0),
        state: t.state || 'open',
        campaignIds: t.campaignIds || [],
        lastCampaignId: t.lastCampaignId || null,
        lastAppId: t.lastAppId || null,
        windowOpen: windowOpen(t),
    };
};

export const handleInboxList = async (req, res, { db }) => {
    const campaignId = str(req.body?.campaignId, 120);
    const state = ['open', 'done'].includes(req.body?.state) ? req.body.state : 'all';
    let q = db.collection('outreach_inbox');
    if (campaignId) q = q.where('campaignIds', 'array-contains', campaignId);
    // Sorted here, not in the query, so no composite index is needed.
    const snap = await q.limit(1000).get();
    const threads = snap.docs.map(threadOut)
        .filter(t => state === 'all' || t.state === state)
        .sort((a, b) => String(b.lastMessageAt || '').localeCompare(String(a.lastMessageAt || '')))
        .slice(0, MAX_THREADS);
    return send(res, 200, { success: true, threads, unread: threads.reduce((n, t) => n + t.unread, 0) });
};

export const handleInboxThread = async (req, res, { db }) => {
    const threadId = str(req.body?.threadId, 128);
    if (!ID.test(threadId)) return send(res, 400, { success: false, error: 'Missing conversation.' });
    const tRef = db.collection('outreach_inbox').doc(threadId);
    const tSnap = await tRef.get();
    if (!tSnap.exists) return send(res, 404, { success: false, error: 'Conversation not found.' });
    const msgs = await tRef.collection('inbox_messages').orderBy('at', 'desc').limit(MAX_MESSAGES).get();
    const messages = msgs.docs.map(d => {
        const m = d.data();
        return {
            id: d.id, direction: m.direction, type: m.type, text: m.text || '', caption: m.caption || '', hasMedia: Boolean(m.mediaId),
            mimeType: m.mimeType || null, status: m.delivery?.whatsapp?.status || m.status || null, error: m.delivery?.whatsapp?.error || m.error || null,
            sentBy: m.sentBy || null, campaignId: m.campaignId || null, at: m.at,
        };
    }).reverse();

    // Who it is: their applications in each campaign (by phone), and the creator profile when linked.
    const thread = tSnap.data();
    const [contactSnap, ...appSnaps] = await Promise.all([
        db.collection('creator_contacts').doc(threadId).get(),
        ...(thread.campaignIds || []).slice(-10).map(async (campaignId) => {
            const key = await db.collection('campaigns').doc(campaignId).collection('application_keys').doc(`p:${thread.phone}`).get();
            if (!key.exists) return null;
            const [app, camp] = await Promise.all([
                db.collection('campaigns').doc(campaignId).collection('applications').doc(key.data().appId).get(),
                db.collection('campaigns').doc(campaignId).get(),
            ]);
            if (!app.exists) return null;
            const a = app.data();
            return { campaignId, campaignTitle: camp.data()?.title || '', appId: app.id, fullName: a.fullName, instagramHandle: a.instagramHandle, status: a.status, tier: a.tier, followerCount: a.followerCount };
        }),
    ]);
    const contact = contactSnap.exists ? contactSnap.data() : null;
    if (Number(thread.unread || 0) > 0) await tRef.set({ unread: 0, readAt: nowIso() }, { merge: true });
    return send(res, 200, {
        success: true,
        thread: { ...threadOut(tSnap), unread: 0, windowClosesAt: thread.lastInboundAt ? new Date(Date.parse(thread.lastInboundAt) + WINDOW_MS).toISOString() : null },
        messages,
        applications: appSnaps.filter(Boolean),
        creatorId: contact?.creatorId || null,
    });
};

export const handleInboxReply = async (req, res, { db, actor, now = nowIso() }) => {
    if (!isWhatsAppConfigured()) return send(res, 409, { success: false, error: 'The WhatsApp API isn’t set up yet.' });
    const threadId = str(req.body?.threadId, 128);
    const text = String(req.body?.text ?? '').trim().slice(0, 4096);
    if (!ID.test(threadId) || !text) return send(res, 400, { success: false, error: 'Write a message first.' });
    const tRef = db.collection('outreach_inbox').doc(threadId);
    const tSnap = await tRef.get();
    if (!tSnap.exists) return send(res, 404, { success: false, error: 'Conversation not found.' });
    const thread = tSnap.data();
    if (!windowOpen(thread)) {
        return send(res, 409, { success: false, code: 'window_closed', error: 'It’s been more than 24 hours since their last message, so WhatsApp only allows a template. Send one below.' });
    }
    const mRef = tRef.collection('inbox_messages').doc();
    await mRef.set({
        direction: 'out', type: 'text', text, status: 'queued', sentBy: actor.actorEmail || null,
        campaignId: thread.lastCampaignId || null, appId: thread.lastAppId || null, at: now,
        expiresAt: new Date(Date.parse(now) + 365 * 86_400_000),
    });
    await tRef.set({ lastMessageAt: now, lastText: text.slice(0, 140), lastDirection: 'out', unread: 0, updatedAt: now }, { merge: true });
    const id = await enqueueJob(db, { kind: 'inbox_text', data: { threadId, messageId: mRef.id, text }, createdBy: actor.actorEmail });
    const outcome = await sendSoon(db, id);
    return send(res, 200, { success: true, messageId: mRef.id, outcome });
};

export const handleInboxTemplate = async (req, res, { db, actor }) => {
    if (!isWhatsAppConfigured()) return send(res, 409, { success: false, error: 'The WhatsApp API isn’t set up yet.' });
    const threadId = str(req.body?.threadId, 128);
    const kind = ['deliverables', 'reminder'].includes(req.body?.kind) ? req.body.kind : null;
    if (!ID.test(threadId) || !kind) return send(res, 400, { success: false, error: 'Choose a message.' });
    const tSnap = await db.collection('outreach_inbox').doc(threadId).get();
    const t = tSnap.data();
    if (!tSnap.exists || !t.lastCampaignId || !t.lastAppId) return send(res, 409, { success: false, error: 'This conversation isn’t linked to a campaign application.' });
    if (kind === 'deliverables' && !submitUrlFor(t.lastCampaignId, t.lastAppId)) return send(res, 409, { success: false, error: 'LINK_SIGNING_SECRET isn’t set, so personal links can’t be made.' });
    const contact = await db.collection('creator_contacts').doc(threadId).get();
    if (contact.exists && contact.data().whatsappOptOut?.at) return send(res, 409, { success: false, code: 'opted_out', error: 'They asked to stop WhatsApp updates, so templates aren’t sent. Use the Newbi app instead.' });
    const id = await enqueueJob(db, { campaignId: t.lastCampaignId, appId: t.lastAppId, kind, createdBy: actor.actorEmail, again: true });
    if (!id) return send(res, 409, { success: false, error: 'That message is already waiting to go out.' });
    const outcome = await sendSoon(db, id);
    return send(res, 200, { success: true, outcome });
};

export const handleInboxState = async (req, res, { db }) => {
    const threadId = str(req.body?.threadId, 128);
    const state = req.body?.state === 'done' ? 'done' : 'open';
    if (!ID.test(threadId)) return send(res, 400, { success: false, error: 'Missing conversation.' });
    await db.collection('outreach_inbox').doc(threadId).set({ state, unread: 0, updatedAt: nowIso() }, { merge: true });
    return send(res, 200, { success: true, state });
};

export const handleInboxMedia = async (req, res, { db }) => {
    const threadId = str(req.body?.threadId, 128);
    const messageId = str(req.body?.messageId, 128);
    if (!ID.test(threadId) || !ID.test(messageId)) return send(res, 400, { success: false, error: 'Missing message.' });
    const tRef = db.collection('outreach_inbox').doc(threadId);
    const m = await tRef.collection('inbox_messages').doc(messageId).get();
    if (!m.exists || !m.data().mediaId) return send(res, 404, { success: false, error: 'No media on this message.' });
    const media = await fetchWhatsAppMedia(m.data().mediaId);
    if (!media) {
        const t = (await tRef.get()).data();
        console.warn(`[outreach] media not available for ${maskPhone(t?.phone)}`);
        return send(res, 410, { success: false, error: 'WhatsApp no longer has this file (media expires after a while), or it’s over 5 MB.' });
    }
    return send(res, 200, { success: true, mimeType: media.mimeType, dataUrl: `data:${media.mimeType};base64,${media.base64}` });
};
