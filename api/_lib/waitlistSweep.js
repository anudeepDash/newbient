/**
 * The daily waitlist sweep (api/mail.js): every guestlist with a waitlist moves
 * along, so an offer nobody confirmed passes on even if nobody opens the list.
 */
import { getDb } from './db.js';
import { advanceWaitlist } from './passes.js';

export const runWaitlists = async ({ db = getDb(), now = Date.now() } = {}) => {
    const lists = await db.collection('guestlists').where('hasWaitlist', '==', true).limit(200).get();
    const report = { lists: 0, expired: 0, offered: 0 };
    for (const doc of lists.docs) {
        const out = await advanceWaitlist(db, doc.id, { now }).catch(() => null);
        if (!out) continue;
        report.lists += 1;
        report.expired += out.expired;
        report.offered += out.offered;
    }
    return report;
};
