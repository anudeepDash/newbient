/**
 * Telling everyone with a pass for an event about a change, or that it's
 * cancelled (admin: Ticketing → Settings → Tell pass holders).
 *
 *   await tellPassHolders(db, { eventId, kind: 'changed', change: 'Doors now open at 5 PM (was 4 PM)', staffEmail })
 *   await tellPassHolders(db, { eventId, kind: 'cancelled', refund: 'Nothing to refund', staffEmail })
 *   // → { sent, total, remaining }
 *
 * Each pass is claimed for this message before it's sent (passes/{ref}.notices),
 * so a second call carries on where a timed-out one stopped and nobody gets it
 * twice. Cancelling also cancels the pass and closes the guestlist to new sign-ups;
 * the event page itself is edited or hidden in Events as usual.
 */
import crypto from 'node:crypto';
import { nowIso } from './db.js';
import { notify } from './notify.js';
import { passUrl } from './passes.js';

const MAX_PASSES = 3000;
const PARALLEL = 6;

const clean = (v, n) => String(v || '').replace(/\s+/g, ' ').trim().replace(/[.!]+$/, '').slice(0, n);
const noticeId = (kind, text) => `${kind}_${crypto.createHash('sha256').update(text).digest('hex').slice(0, 12)}`;

/* Issued passes for this event (and its guestlist, when the list has its own id). */
const passesFor = async (db, ids) => {
    const seen = new Map();
    for (const id of ids) {
        for (const field of ['eventId', 'sourceId']) {
            const snap = await db.collection('passes').where(field, '==', id).limit(MAX_PASSES).get();
            snap.docs.forEach(d => seen.set(d.id, d));
        }
    }
    return [...seen.values()];
};

export const tellPassHolders = async (db, { eventId, guestlistIds = [], kind, change = '', refund = '', staffEmail = 'staff', deadline = Date.now() + 40_000, send = notify }) => {
    const text = kind === 'changed' ? clean(change, 300) : clean(refund, 120) || 'Nothing to refund';
    if (kind === 'changed' && text.length < 5) return { error: 'Say what changed (a few words).' };
    const id = noticeId(kind, text);
    const ids = [...new Set([eventId, ...guestlistIds].filter(Boolean))];
    const docs = (await passesFor(db, ids)).filter(d => {
        const p = d.data();
        // A change goes to everyone still holding a pass; a cancellation also to passes cancelled by it before a retry.
        return p.status === 'issued' || (kind === 'cancelled' && p.revokeReason === 'Event cancelled');
    });

    if (kind === 'cancelled') {
        for (const gid of ids) {
            const gl = db.collection('guestlists').doc(gid);
            if ((await gl.get()).exists) await gl.set({ status: 'Closed', cancelledAt: nowIso(), cancelledBy: staffEmail }, { merge: true });
        }
    }

    let sent = 0;
    let remaining = 0;
    let next = 0;
    const work = async () => {
        while (next < docs.length) {
            const doc = docs[next++];
            if (Date.now() > deadline) { remaining += 1; continue; }
            const claimed = await db.runTransaction(async (tx) => {
                const cur = await tx.get(doc.ref);
                const p = cur.data() || {};
                if (p.notices?.[id]) return null;
                const now = nowIso();
                const patch = { notices: { ...(p.notices || {}), [id]: now } };
                if (kind === 'cancelled' && p.status === 'issued') Object.assign(patch, { status: 'revoked', revokedAt: now, revokedBy: staffEmail, revokeReason: 'Event cancelled' });
                tx.set(doc.ref, patch, { merge: true });
                if (kind === 'cancelled' && p.source === 'guestlist' && p.entryId && p.sourceId) {
                    tx.set(db.collection('guestlists').doc(p.sourceId).collection('entries').doc(p.entryId), { passRevoked: true, passRevokedAt: now }, { merge: true });
                }
                return p;
            }).catch((err) => { console.warn('[PASS HOLDERS] claim failed:', doc.id, err.message); return null; });
            if (!claimed) continue;
            const ref = claimed.ref || doc.id;
            const ev = claimed.event || {};
            await send(kind === 'changed' ? 'event-changed' : 'event-cancelled', claimed.holderUid || null, {
                name: claimed.holderName,
                eventName: ev.title || claimed.campaignTitle,
                date: ev.date,
                ref,
                passUrl: passUrl(ref),
                ...(kind === 'changed' ? { change: text } : { refund: text }),
            }, { to: { email: claimed.holderEmail, phone: claimed.holderPhone, name: claimed.holderName }, skip: ['email'] })
                .then(() => { sent += 1; })
                .catch(err => console.warn('[PASS HOLDERS] send failed:', doc.id, err.message));
        }
    };
    await Promise.all(Array.from({ length: Math.min(PARALLEL, docs.length) }, work));
    return { sent, total: docs.length, remaining };
};

/** How many people a message would reach right now (for the confirm sheet). */
export const countPassHolders = async (db, { eventId, guestlistIds = [] }) => {
    const docs = await passesFor(db, [...new Set([eventId, ...guestlistIds].filter(Boolean))]);
    return docs.filter(d => d.data().status === 'issued').length;
};
