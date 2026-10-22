/**
 * The morning team digest (WhatsApp template team_daily_brief): one message a
 * day to the full-access team and admins with what's waiting, instead of an
 * alert per item. Run by the mail worker (api/mail.js, 09:00 IST); claimed per
 * day so a second run sends nothing, and not sent at all when nothing waits.
 *
 *   Ticket orders to check     ticket_orders with status pending
 *   Guestlist sign-ups         guestlist entries waiting for review (pending, or a fix sent back)
 *   Creator posts to review    submitted posts, outreach applications and app campaigns
 *   Payouts to send            outreach creators whose posts are all approved but not paid
 */
import { getDb, istDate, nowIso } from './db.js';
import { isTemplateLive } from './whatsapp.js';
import { sendTeamAlert, LEADS_TEAM } from './teamAlerts.js';

export const DIGEST_TEMPLATE = 'team_daily_brief';
const MAX_DOCS = 300;

/* What's waiting right now. → { orders, signUps, posts, payouts } */
export const digestCounts = async (db) => {
    const counts = { orders: 0, signUps: 0, posts: 0, payouts: 0 };
    counts.orders = (await db.collection('ticket_orders').where('status', '==', 'pending').get()).size;

    const lists = await db.collection('guestlists').limit(MAX_DOCS).get();
    for (const gl of lists.docs) {
        if (/^(closed|archived|ended|cancel+ed)$/i.test(String(gl.data().status || ''))) continue;
        const entries = await gl.ref.collection('entries').where('status', '==', 'pending').get();
        counts.signUps += entries.size;
    }

    const camps = await db.collection('campaigns').limit(MAX_DOCS).get();
    for (const c of camps.docs) {
        if (String(c.data().status || '').toLowerCase() === 'draft') continue;
        const [apps, subs] = await Promise.all([c.ref.collection('applications').get(), c.ref.collection('submissions').get()]);
        for (const a of apps.docs) {
            const d = a.data();
            counts.posts += Object.values(d.deliverables || {}).filter(x => x?.status === 'submitted').length;
            if (d.status === 'posted') counts.payouts += 1;
        }
        for (const s of subs.docs) counts.posts += Object.values(s.data().tasks || {}).filter(x => x?.status === 'submitted').length;
    }
    return counts;
};

export const runTeamDigest = async ({ db = getDb(), now = Date.now(), send = sendTeamAlert } = {}) => {
    if (!isTemplateLive(DIGEST_TEMPLATE)) return { skipped: 'template off' };
    const day = istDate(new Date(now));
    const claim = db.collection('rate_limits').doc(`team-digest-${day}`);
    const fresh = await db.runTransaction(async (tx) => {
        if ((await tx.get(claim)).exists) return false;
        tx.set(claim, { bucket: 'team-digest', at: nowIso(), expiresAt: new Date(now + 3 * 86_400_000) });
        return true;
    });
    if (!fresh) return { skipped: 'already sent today' };
    const c = await digestCounts(db);
    if (!c.orders && !c.signUps && !c.posts && !c.payouts) return { skipped: 'nothing waiting', counts: c };
    const result = await send(db, {
        roles: LEADS_TEAM, template: DIGEST_TEMPLATE, event: 'team-digest',
        bodyParams: [String(c.orders), String(c.signUps), String(c.posts), String(c.payouts)],
    });
    return { ...result, counts: c };
};
