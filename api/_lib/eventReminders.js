/**
 * The day-before reminder: every issued pass for an event tomorrow (IST) gets
 * one message (WhatsApp template event_reminder, and a push), with the doors
 * time, the venue and a button to open the pass. Run once a day by the mail
 * worker (api/mail.js, 09:00 IST); each pass is claimed for its date first, so
 * a second run the same day sends nothing.
 *
 * passes/{ref}.event.date is 'YYYY-MM-DD' or 'YYYY-MM-DDTHH:mm' (IST), so a
 * string range on it finds tomorrow's without an extra index.
 */
import { getDb, istDate } from './db.js';
import { notify } from './notify.js';
import { passUrl } from './passes.js';

const MAX_PER_RUN = 400;

export const runEventReminders = async ({ db = getDb(), now = Date.now(), deadline = Date.now() + 30_000, send = notify } = {}) => {
    const tomorrow = istDate(new Date(now + 86_400_000));
    const snap = await db.collection('passes').where('event.date', '>=', tomorrow).where('event.date', '<', `${tomorrow}~`).limit(MAX_PER_RUN).get();
    let sent = 0;
    let skipped = 0;
    for (const doc of snap.docs) {
        if (Date.now() > deadline) break;
        const pass = doc.data();
        if (pass.status !== 'issued' || String(pass.event?.date || '').slice(0, 10) !== tomorrow) { skipped += 1; continue; }
        const claimed = await db.runTransaction(async (tx) => {
            const cur = await tx.get(doc.ref);
            if (cur.data()?.reminderSentFor === tomorrow) return false;
            tx.update(doc.ref, { reminderSentFor: tomorrow });
            return true;
        }).catch(() => false);
        if (!claimed) { skipped += 1; continue; }
        const ref = pass.ref || doc.id;
        const ev = pass.event || {};
        await send('event-reminder', pass.holderUid || null, {
            name: pass.holderName,
            eventName: ev.title || pass.campaignTitle,
            doors: ev.time || '',
            venue: [ev.venue, ev.city].filter(Boolean).join(', '),
            ref,
            passUrl: passUrl(ref),
        }, { to: { phone: pass.holderPhone, name: pass.holderName }, ref: { collection: 'passes', id: doc.id } })
            .then(() => { sent += 1; })
            .catch(err => console.warn('[REMINDERS] pass', doc.id, err.message));
    }
    return { date: tomorrow, sent, skipped };
};
