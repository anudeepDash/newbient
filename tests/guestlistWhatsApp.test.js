import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FakeFirestore } from './helpers/fakeFirestore.js';
import { setDbForTests } from '../api/_lib/db.js';
import { setWhatsAppFetchForTests } from '../api/_lib/whatsapp.js';
import { setTransportForTests } from '../api/_lib/mail/transport.js';
import { handleEvent } from '../api/_lib/mail/events.js';
import { runEventReminders } from '../api/_lib/eventReminders.js';
import { _internal } from '../api/_lib/passes.js';

/*
 * The guestlist WhatsApp templates (docs/whatsapp-template-drafts.md #11–19):
 * each goes out only once its WHATSAPP_TEMPLATE_* setting is on.
 */

const STAFF = { uid: 'u-admin', email: 'ops@newbi.live', staff: true };
const GUESTLIST = ['GUESTLIST_PENDING', 'GUESTLIST_RSVP_CONFIRMED', 'GUESTLIST_TASK_CHANGES', 'GUESTLIST_NOT_CONFIRMED',
    'GUESTLIST_ENTRY_CUTOFF', 'EVENT_CHANGED', 'EVENT_CANCELLED', 'PASS_CHECKED_IN', 'PASS_CONFIRMED', 'EVENT_REMINDER'];
const TASK = { title: 'Post a story', description: 'Tag @newbi.live', allowText: true, requireText: true };

const register = (db, body, uid = 'u1') => _internal.actions['register-guestlist'](db, body, { uid });
const place = (db, id, uid = 'u1') => _internal.actions.guestlist(db, { id }, { uid }).then(r => r.guestlist.me);
const checkin = (db, code, eventId) => _internal.actions.checkin(db, { code, eventId }, STAFF);

let db;
let sent;
const templates = () => sent.map(m => m.template.name);
const bodyOf = (m) => m.template.components.find(c => c.type === 'body').parameters.map(p => p.text);
const buttonOf = (m) => m.template.components.find(c => c.type === 'button')?.parameters[0].text;
const live = (names) => names.forEach(n => vi.stubEnv(`WHATSAPP_TEMPLATE_${n}`, n.toLowerCase()));
const onlyEntry = (gid) => Object.entries(db.dump(`guestlists/${gid}/entries`))[0];

beforeEach(() => {
    vi.stubEnv('WHATSAPP_ACCESS_TOKEN', 'test-token');
    vi.stubEnv('WHATSAPP_PHONE_NUMBER_ID', '123');
    vi.stubEnv('LINK_SIGNING_SECRET', 'test-secret');
    db = new FakeFirestore({
        'users/u1': { name: 'Riya Sharma', email: 'riya@example.com', phone: '+919876500001', phoneNumber: '+919876500001', phoneVerified: true },
        'guestlists/tt': { title: 'Techno Tuesdays', date: '2030-11-12', location: 'Kitty Su', maxSpots: 50, perUserLimit: 3, status: 'Open', hasGuestlistTask: true, guestlistTask: TASK },
        'guestlists/rs': { title: 'Rooftop RSVP', date: '2030-11-12', location: 'Skyline', maxSpots: 50, perUserLimit: 3, status: 'Open', guestlistMode: 'rsvp' },
        'guestlists/qr': { title: 'Skyline', date: '2030-11-12', location: 'Skyline', maxSpots: 50, perUserLimit: 3, status: 'Open' },
    });
    setDbForTests(db);
    sent = [];
    setWhatsAppFetchForTests(async (url, init) => {
        sent.push(JSON.parse(init.body));
        return { ok: true, status: 200, json: async () => ({ messages: [{ id: `wamid.${sent.length}` }] }) };
    });
    setTransportForTests({ sendMail: async () => ({ messageId: 'mail-1' }) });
});

afterEach(() => {
    vi.unstubAllEnvs();
    setDbForTests(null);
    setWhatsAppFetchForTests(null);
    setTransportForTests(null);
});

describe('signing up', () => {
    it('sends nothing until the template is switched on', async () => {
        const out = await register(db, { guestlistId: 'tt', guests: 2, taskSubmission: { text: 'Posted it' } });
        expect(out.status).toBe('pending');
        expect(sent).toHaveLength(0);
    });

    it('tells someone waiting for review that we have their sign-up', async () => {
        live(GUESTLIST);
        await register(db, { guestlistId: 'tt', guests: 2, taskSubmission: { text: 'Posted it' } });
        expect(templates()).toEqual(['guestlist_pending']);
        expect(bodyOf(sent[0])).toEqual(['Riya', 'Techno Tuesdays', 'Tue, 12 Nov, 2030', 'You + 1 guest']);
    });

    it('confirms an RSVP list with the name at the door, not a QR pass', async () => {
        live(GUESTLIST);
        await register(db, { guestlistId: 'rs', guests: 2 });
        expect(templates()).toEqual(['guestlist_rsvp_confirmed']);
        expect(bodyOf(sent[0])).toEqual(['Riya', 'Rooftop RSVP', 'Tue, 12 Nov, 2030', 'Riya Sharma + 1']);
    });

    it('keeps sending pass_confirmed on RSVP lists until the RSVP template is approved', async () => {
        live(['PASS_CONFIRMED']);
        await register(db, { guestlistId: 'rs', guests: 1 });
        expect(templates()).toEqual(['pass_confirmed']);
    });
});

describe('asking for a fix on the task', () => {
    it('sends the note with the guestlist button once, and takes the task again', async () => {
        live(GUESTLIST);
        await register(db, { guestlistId: 'tt', guests: 1, taskSubmission: { text: 'Posted it' } });
        const [entryId] = onlyEntry('tt');
        await db.collection('guestlists').doc('tt').collection('entries').doc(entryId)
            .set({ status: 'changes', taskFix: { note: 'Your story didn’t tag @newbi.live', at: '2030-11-01T10:00:00Z' } }, { merge: true });
        sent = [];

        const res = await handleEvent('guestlist-task-changes', { guestlistId: 'tt', entryId }, STAFF);
        expect(res.status).toBe(200);
        expect(templates()).toEqual(['guestlist_task_changes']);
        expect(bodyOf(sent[0])).toEqual(['Riya', 'Techno Tuesdays', 'Your story didn’t tag @newbi.live']);
        expect(buttonOf(sent[0])).toBe('tt');
        await handleEvent('guestlist-task-changes', { guestlistId: 'tt', entryId }, STAFF);
        expect(sent).toHaveLength(1);

        expect(await place(db, 'tt')).toMatchObject({ status: 'changes', fix: 'Your story didn’t tag @newbi.live' });
        const again = await register(db, { guestlistId: 'tt', guests: 1, taskSubmission: { text: 'Tagged now' } });
        expect(again).toMatchObject({ success: true, resubmitted: true, status: 'pending' });
        expect(onlyEntry('tt')[1]).toMatchObject({ status: 'pending', taskSubmission: { text: 'Tagged now' } });
        expect(Object.keys(db.dump('guestlists/tt/entries'))).toHaveLength(1);
    });

    it('is staff only', async () => {
        const res = await handleEvent('guestlist-task-changes', { guestlistId: 'tt', entryId: 'x' }, { uid: 'u1' });
        expect(res.status).toBe(403);
    });
});

describe('declining', () => {
    it('tells them once, with the reason picked', async () => {
        live(GUESTLIST);
        db.store.set('guestlists/tt/entries/e1', { status: 'rejected', customerName: 'Riya Sharma', customerPhone: '+919876500001', title: 'Techno Tuesdays' });
        await handleEvent('guestlist-declined', { guestlistId: 'tt', entryId: 'e1', reason: 'This list is for invited guests only this time' }, STAFF);
        await handleEvent('guestlist-declined', { guestlistId: 'tt', entryId: 'e1' }, STAFF);
        expect(templates()).toEqual(['guestlist_not_confirmed']);
        expect(bodyOf(sent[0])).toEqual(['Riya', 'Techno Tuesdays', 'This list is for invited guests only this time']);
    });

    it('refuses a sign-up that isn’t declined', async () => {
        db.store.set('guestlists/tt/entries/e2', { status: 'approved', customerPhone: '+919876500001' });
        expect((await handleEvent('guestlist-declined', { guestlistId: 'tt', entryId: 'e2' }, STAFF)).status).toBe(409);
    });
});

describe('at the gate', () => {
    it('tells the holder their pass was scanned, only on the first scan', async () => {
        const out = await register(db, { guestlistId: 'qr', guests: 1 });
        live(GUESTLIST);
        const first = await checkin(db, out.ref, 'qr');
        expect(first).toMatchObject({ valid: true, reason: 'admitted' });
        expect(first.pass).toBeUndefined();
        expect(templates()).toEqual(['pass_checked_in']);
        expect(bodyOf(sent[0]).slice(0, 2)).toEqual(['Riya', 'Skyline']);
        expect((await checkin(db, out.ref, 'qr')).reason).toBe('already');
        expect(sent).toHaveLength(1);
    });
});

describe('telling pass holders', () => {
    beforeEach(() => {
        const ev = { title: 'NH7 Weekender', date: '2030-12-05' };
        db.store.set('guestlists/nh7', { title: 'NH7 Weekender', status: 'Open' });
        db.store.set('passes/AAA111', { ref: 'AAA111', eventId: 'nh7', sourceId: 'nh7', source: 'guestlist', entryId: 'e1', status: 'issued', holderName: 'Riya Sharma', holderPhone: '+919876500001', event: ev });
        db.store.set('passes/BBB222', { ref: 'BBB222', eventId: 'nh7', source: 'order', sourceId: 'o9', status: 'issued', holderName: 'Arjun K', holderPhone: '+919876500002', event: ev });
        db.store.set('passes/CCC333', { ref: 'CCC333', eventId: 'nh7', status: 'revoked', holderPhone: '+919876500003', event: ev });
        db.store.set('guestlists/nh7/entries/e1', { status: 'approved' });
    });

    it('counts and tells everyone holding a pass about a change, once', async () => {
        live(GUESTLIST);
        expect((await handleEvent('event-changed', { eventId: 'nh7', countOnly: true }, STAFF)).body.count).toBe(2);
        const res = await handleEvent('event-changed', { eventId: 'nh7', change: 'Doors now open at 5:00 PM (was 4:00 PM).' }, STAFF);
        expect(res.body).toMatchObject({ sent: 2, remaining: 0 });
        expect(templates().sort()).toEqual(['event_changed', 'event_changed']);
        expect(bodyOf(sent[0])[2]).toBe('Doors now open at 5:00 PM (was 4:00 PM)');
        await handleEvent('event-changed', { eventId: 'nh7', change: 'Doors now open at 5:00 PM (was 4:00 PM)' }, STAFF);
        expect(sent).toHaveLength(2);
    });

    it('cancels every pass, closes the list and tells each holder the refund', async () => {
        live(GUESTLIST);
        const res = await handleEvent('event-cancelled', { eventId: 'nh7', refund: '' }, STAFF);
        expect(res.body).toMatchObject({ sent: 2 });
        expect(bodyOf(sent[0])).toEqual([expect.any(String), 'NH7 Weekender', 'Thu, 5 Dec, 2030', 'Nothing to refund']);
        expect(db.store.get('passes/AAA111')).toMatchObject({ status: 'revoked', revokeReason: 'Event cancelled' });
        expect(db.store.get('guestlists/nh7/entries/e1')).toMatchObject({ passRevoked: true });
        expect(db.store.get('guestlists/nh7').status).toBe('Closed');
        await handleEvent('event-cancelled', { eventId: 'nh7', refund: '' }, STAFF);
        expect(sent).toHaveLength(2);
    });

    it('needs to know what changed', async () => {
        expect((await handleEvent('event-changed', { eventId: 'nh7', change: 'x' }, STAFF)).status).toBe(400);
    });
});

describe('guestlist entry cutoff', () => {
    beforeEach(() => {
        db.store.set('guestlists/club', { title: 'Techno Tuesdays', entryUntil: '11:00 PM', status: 'Open' });
        db.store.set('passes/TODAY1', { ref: 'TODAY1', source: 'guestlist', sourceId: 'club', status: 'issued', holderName: 'Riya Sharma', holderPhone: '+919876500001', event: { title: 'Techno Tuesdays', date: '2026-12-04', venue: 'Kitty Su', city: 'Delhi' } });
        db.store.set('passes/TMRW01', { ref: 'TMRW01', source: 'guestlist', sourceId: 'club', status: 'issued', holderName: 'Riya Sharma', holderPhone: '+919876500001', event: { title: 'Techno Tuesdays', date: '2026-12-05', venue: 'Kitty Su' } });
    });

    it('tells today’s guests when entry closes, and skips their day-before reminder', async () => {
        live(GUESTLIST);
        const now = Date.parse('2026-12-04T03:30:00Z'); // 09:00 IST on the 4th
        const out = await runEventReminders({ db, now });
        expect(out).toMatchObject({ sent: 0, cutoffSent: 1 });
        expect(templates()).toEqual(['guestlist_entry_cutoff']);
        expect(bodyOf(sent[0])).toEqual(['Riya', 'Techno Tuesdays', '11:00 PM', 'Kitty Su, Delhi']);
        expect(buttonOf(sent[0])).toBe('TODAY1');
        expect((await runEventReminders({ db, now })).cutoffSent).toBe(0);
    });

    it('keeps the day-before reminder while the cutoff template isn’t approved', async () => {
        live(['EVENT_REMINDER']);
        const out = await runEventReminders({ db, now: Date.parse('2026-12-04T03:30:00Z') });
        expect(out).toMatchObject({ sent: 1, cutoffSent: 0 });
        expect(templates()).toEqual(['event_reminder']);
    });

    it('never sends the same-day message at night', async () => {
        live(GUESTLIST);
        const out = await runEventReminders({ db, now: Date.parse('2026-12-03T20:00:00Z') }); // 01:30 IST on the 4th
        expect(out.cutoffSent).toBe(0);
    });
});
