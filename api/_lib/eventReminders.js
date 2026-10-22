/**
 * The day-before reminder: every issued pass for an event tomorrow (IST) gets
 * one message (WhatsApp template event_reminder, and a push), with the doors
 * time, the venue and a button to open the pass. Run once a day by the mail
 * worker (api/mail.js, 09:00 IST); each pass is claimed for its date first, so
 * a second run the same day sends nothing.
 *
 * Guestlists with an entry cutoff ("Guestlist entry until 11:00 PM") get the
 * guestlist_entry_cutoff message the morning of the event instead, once that
 * template is approved; until then they keep the day-before reminder.
 *
 * passes/{ref}.event.date is 'YYYY-MM-DD' or 'YYYY-MM-DDTHH:mm' (IST), so a
 * string range on it finds tomorrow's without an extra index.
 */
import { getDb, istDate } from './db.js';
import { notify } from './notify.js';
import { passUrl, resolveGuestlist } from './passes.js';
import { isTemplateLive } from './whatsapp.js';

const MAX_PER_RUN = 400;
// The same-day message never goes out at night, whenever the worker happens to run.
const EARLIEST_IST_HOUR = 8;

const istHour = (now) => Number(new Date(now).toLocaleString('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', hour12: false }));

/* The entry cutoff of a guestlist pass's list (looked up once per list per run). */
const cutoffLookup = (db) => {
    const cache = new Map();
    return (pass) => {
        if (pass.source !== 'guestlist' || !pass.sourceId) return Promise.resolve(null);
        if (!cache.has(pass.sourceId)) cache.set(pass.sourceId, resolveGuestlist(db, pass.sourceId).then(g => g?.entryUntil || null, () => null));
        return cache.get(pass.sourceId);
    };
};

/* Issued passes dated `day`, each claimed once under `field` before `fn` sends to it. */
const forPassesOn = async (db, day, field, deadline, fn) => {
    const snap = await db.collection('passes').where('event.date', '>=', day).where('event.date', '<', `${day}~`).limit(MAX_PER_RUN).get();
    let sent = 0;
    let skipped = 0;
    for (const doc of snap.docs) {
        if (Date.now() > deadline) break;
        const pass = doc.data();
        if (pass.status !== 'issued' || String(pass.event?.date || '').slice(0, 10) !== day) { skipped += 1; continue; }
        const go = await fn.wants(pass);
        if (!go) { skipped += 1; continue; }
        const claimed = await db.runTransaction(async (tx) => {
            const cur = await tx.get(doc.ref);
            if (cur.data()?.[field] === day) return false;
            tx.update(doc.ref, { [field]: day });
            return true;
        }).catch(() => false);
        if (!claimed) { skipped += 1; continue; }
        await fn.send(pass, doc, go)
            .then(() => { sent += 1; })
            .catch(err => console.warn('[REMINDERS] pass', doc.id, err.message));
    }
    return { sent, skipped };
};

const basics = (pass, doc) => {
    const ref = pass.ref || doc.id;
    const ev = pass.event || {};
    return {
        data: { name: pass.holderName, eventName: ev.title || pass.campaignTitle, venue: [ev.venue, ev.city].filter(Boolean).join(', '), ref, passUrl: passUrl(ref), image: ev.image },
        opts: { to: { phone: pass.holderPhone, name: pass.holderName }, ref: { collection: 'passes', id: doc.id } },
    };
};

export const runEventReminders = async ({ db = getDb(), now = Date.now(), deadline = Date.now() + 30_000, send = notify } = {}) => {
    const cutoffOf = cutoffLookup(db);
    const cutoffLive = isTemplateLive('guestlist_entry_cutoff');

    const tomorrow = istDate(new Date(now + 86_400_000));
    const dayBefore = await forPassesOn(db, tomorrow, 'reminderSentFor', deadline, {
        // Lists with a cutoff hear on the day instead (once that template is approved).
        wants: async (pass) => !(cutoffLive && await cutoffOf(pass)),
        send: (pass, doc) => {
            const { data, opts } = basics(pass, doc);
            return send('event-reminder', pass.holderUid || null, { ...data, doors: pass.event?.time || '' }, opts);
        },
    });

    let today = { sent: 0, skipped: 0 };
    if (cutoffLive && istHour(now) >= EARLIEST_IST_HOUR) {
        today = await forPassesOn(db, istDate(new Date(now)), 'cutoffSentFor', deadline, {
            wants: (pass) => cutoffOf(pass),
            send: (pass, doc, entryUntil) => {
                const { data, opts } = basics(pass, doc);
                return send('guestlist-entry-cutoff', pass.holderUid || null, { ...data, entryUntil }, opts);
            },
        });
    }
    return { date: tomorrow, sent: dayBefore.sent, skipped: dayBefore.skipped, cutoffSent: today.sent };
};
