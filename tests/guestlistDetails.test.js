import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Delivery (email, WhatsApp, push) is checked only for what it's handed.
vi.mock('../api/_lib/notify.js', () => ({
    notify: vi.fn(async () => ({ email: { status: 'sent' } })),
}));

import { FakeFirestore } from './helpers/fakeFirestore.js';
import { setDbForTests } from '../api/_lib/db.js';
import { notify } from '../api/_lib/notify.js';
import { resolveGuestlist, ensureGuestlistPass, _internal } from '../api/_lib/passes.js';

const register = (db, body, uid = 'u1') => _internal.actions['register-guestlist'](db, body, { uid });
const getPass = (db, ref, uid = 'u1') => _internal.actions.get(db, { ref }, { uid });

let db;
beforeEach(() => {
    vi.stubEnv('LINK_SIGNING_SECRET', 'test-secret');
    db = new FakeFirestore({
        'guestlists/gl1': { title: 'Skyline', date: '2030-11-07', time: '8 PM onwards', location: 'Rooftop lounge, Bandra', locationUrl: 'https://maps.app.goo.gl/abc', maxSpots: 50, perUserLimit: 3, status: 'Open' },
        'guestlists/gl2': { title: 'No map', date: '2030-11-07', location: 'Somewhere', locationUrl: 'javascript:alert(1)', maxSpots: 50, perUserLimit: 2, status: 'Open', eventId: 'ev1' },
        'upcoming_events/ev1': { title: 'Big night', date: '2030-11-07', location: 'Jayamahal Palace', locationUrl: 'https://maps.app.goo.gl/event' },
        'users/u1': { name: 'Asha Rao', email: 'asha@example.com', phone: '+919876500001', phoneVerified: true },
    });
    setDbForTests(db);
    vi.mocked(notify).mockClear();
});
afterEach(() => { vi.unstubAllEnvs(); setDbForTests(null); });

describe('guestlist time, map link and guest names', () => {
    it('serves the time and an https map link, preferring the event’s', async () => {
        expect(await resolveGuestlist(db, 'gl1')).toMatchObject({ time: '8 PM onwards', mapUrl: 'https://maps.app.goo.gl/abc' });
        expect((await resolveGuestlist(db, 'gl2')).mapUrl).toBe('https://maps.app.goo.gl/event');
    });

    it('never serves a non-https map link', async () => {
        await db.collection('upcoming_events').doc('ev1').set({ locationUrl: '' }, { merge: true });
        expect((await resolveGuestlist(db, 'gl2')).mapUrl).toBeNull();
    });

    it('saves +1 names on the entry and the pass, capped at the extra spots', async () => {
        const out = await register(db, { guestlistId: 'gl1', guests: 2, guestNames: ['  Priya Shah ', 'Too Many', ''] });
        expect(out).toMatchObject({ success: true, status: 'issued' });
        const [entry] = Object.values(db.dump('guestlists/gl1/entries'));
        expect(entry).toMatchObject({ guestsCount: 2, plusOneNames: ['Priya Shah'] });
        const pass = db.store.get(`passes/${out.ref}`);
        expect(pass).toMatchObject({ qty: 2, plusOneNames: ['Priya Shah'], event: { time: '8 PM onwards', mapUrl: 'https://maps.app.goo.gl/abc' } });
        expect(notify).toHaveBeenCalledWith('pass-confirmed', 'u1', expect.objectContaining({ time: '8 PM onwards', mapUrl: 'https://maps.app.goo.gl/abc', guestNames: ['Priya Shah'] }), expect.anything());
    });

    it('works without names', async () => {
        const out = await register(db, { guestlistId: 'gl1', guests: 3 });
        expect(db.store.get(`passes/${out.ref}`).plusOneNames).toEqual([]);
    });

    it('shows a pass the list’s current details, and names only to its holder', async () => {
        const out = await register(db, { guestlistId: 'gl1', guests: 2, guestNames: ['Priya Shah'] });
        await db.collection('guestlists').doc('gl1').set({ time: '9 PM', locationUrl: 'https://maps.app.goo.gl/new' }, { merge: true });
        const mine = await getPass(db, out.ref);
        expect(mine.pass).toMatchObject({ plusOneNames: ['Priya Shah'], event: { time: '9 PM', mapUrl: 'https://maps.app.goo.gl/new' } });
        const stranger = await getPass(db, out.ref, 'someone-else');
        expect(stranger.pass.plusOneNames).toBeUndefined();
    });

    it('signs people up on the guestlist an event card was made from', async () => {
        await db.collection('upcoming_events').doc('ev2').set({ title: 'Copy', date: '2030-11-07', isGuestlistEnabled: true, guestlistId: 'gl1' });
        expect((await resolveGuestlist(db, 'ev2')).id).toBe('gl1');
        const out = await register(db, { guestlistId: 'ev2', guests: 1 });
        expect(db.store.get(`passes/${out.ref}`)).toMatchObject({ sourceId: 'gl1' });
        expect(Object.values(db.dump('guestlists/gl1/entries'))).toHaveLength(1);
        expect(db.store.get('guestlists/ev2')).toBeUndefined();
    });

    it('signs up with a name and a phone or an email, no SMS check', async () => {
        await db.collection('users').doc('u2').set({ name: 'Ira', phone: '9876500002' });
        const byPhone = await register(db, { guestlistId: 'gl1', guests: 1 }, 'u2');
        expect(db.store.get(`passes/${byPhone.ref}`)).toMatchObject({ holderPhone: '+919876500002' });

        // A Google sign-in: name and email, no phone.
        await db.collection('users').doc('u3').set({ name: 'Gia', email: 'gia@example.com' });
        const byEmail = await register(db, { guestlistId: 'gl1', guests: 1 }, 'u3');
        expect(db.store.get(`passes/${byEmail.ref}`)).toMatchObject({ holderEmail: 'gia@example.com', holderPhone: '' });

        await db.collection('users').doc('u4').set({ name: 'No Contact' });
        await expect(register(db, { guestlistId: 'gl1', guests: 1 }, 'u4')).rejects.toMatchObject({ code: 'PROFILE_INCOMPLETE' });
    });

    describe('without an account', () => {
        const guest = (body, ip = '1.2.3.4') => _internal.actions['register-guestlist-guest'](db, { guestlistId: 'gl1', guests: 1, ...body }, { ip });
        const details = { name: 'Neha Kapoor', email: 'Neha@Example.com', phone: '98765 00009' };

        it('reserves a spot from the form and sends the pass', async () => {
            const out = await guest({ ...details, guests: 2, guestNames: ['Rohan'] });
            expect(out).toMatchObject({ success: true, status: 'issued' });
            expect(db.store.get(`passes/${out.ref}`)).toMatchObject({ holderUid: null, holderName: 'Neha Kapoor', holderEmail: 'neha@example.com', holderPhone: '+919876500009', qty: 2, plusOneNames: ['Rohan'] });
            expect(notify).toHaveBeenCalledWith('pass-confirmed', null, expect.anything(), expect.objectContaining({ to: expect.objectContaining({ email: 'neha@example.com', phone: '+919876500009' }) }));
        });

        it('gives one place per phone or email', async () => {
            const first = await guest(details);
            expect(await guest(details)).toMatchObject({ duplicate: true, ref: first.ref });
            expect(await guest({ ...details, phone: '9000000000' })).toMatchObject({ duplicate: true, ref: first.ref });
        });

        it('needs a name, a valid email and a phone number', async () => {
            await expect(guest({ ...details, name: '' })).rejects.toMatchObject({ code: 'VALIDATION' });
            await expect(guest({ ...details, email: 'nope' })).rejects.toMatchObject({ code: 'VALIDATION' });
            await expect(guest({ ...details, phone: '123' })).rejects.toMatchObject({ code: 'VALIDATION' });
        });

        it('limits sign-ups from one place', async () => {
            for (let i = 0; i < 8; i++) await guest({ ...details, email: `p${i}@example.com`, phone: `98765100${String(i).padStart(2, '0')}` }, '9.9.9.9');
            await expect(guest({ ...details, email: 'p9@example.com', phone: '9876510099' }, '9.9.9.9')).rejects.toMatchObject({ code: 'RATE_LIMITED' });
        });
    });

    describe('a pass follows its sign-up', () => {
        const staff = { uid: 'staff', staff: true, email: 'ops@newbi.live' };
        const place = async (uid = 'u1') => (await _internal.actions.guestlist(db, { id: 'gl1' }, { uid })).guestlist.me;
        const scan = (ref) => _internal.actions.checkin(db, { code: ref, eventId: 'gl1', guestlistIds: ['gl1'] }, staff);
        const entryRef = () => db.collection('guestlists').doc('gl1').collection('entries').doc(Object.keys(db.dump('guestlists/gl1/entries'))[0]);

        it('removed in the admin: the pass stops working and they can sign up again', async () => {
            const out = await register(db, { guestlistId: 'gl1', guests: 3 });
            await entryRef().delete();
            expect(await place()).toBeNull();
            expect(await scan(out.ref)).toMatchObject({ valid: false, reason: 'rejected' });
            const again = await register(db, { guestlistId: 'gl1', guests: 1 });
            expect(again.duplicate).toBeUndefined();
            expect(again.ref).not.toBe(out.ref);
        });

        it('declined: no entry at the gate, no signing up again, and approving brings the pass back', async () => {
            const out = await register(db, { guestlistId: 'gl1', guests: 1 });
            const ref = entryRef();
            await ref.set({ status: 'rejected' }, { merge: true });
            await _internal.actions.revoke(db, { ref: out.ref, reason: 'Declined' }, staff);
            expect(await place()).toMatchObject({ status: 'declined' });
            expect(await scan(out.ref)).toMatchObject({ valid: false });
            await expect(register(db, { guestlistId: 'gl1', guests: 1 })).rejects.toMatchObject({ code: 'DECLINED' });

            await ref.set({ status: 'approved' }, { merge: true });
            await ensureGuestlistPass(db, 'gl1', ref.path.split('/').pop());
            expect(db.store.get(`passes/${out.ref}`)).toMatchObject({ status: 'issued' });
            expect(await place()).toMatchObject({ ref: out.ref, status: 'issued' });
        });
    });
});
