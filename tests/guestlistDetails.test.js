import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Delivery (email, WhatsApp, push) is checked only for what it's handed.
vi.mock('../api/_lib/notify.js', () => ({
    notify: vi.fn(async () => ({ email: { status: 'sent' } })),
}));

import { FakeFirestore } from './helpers/fakeFirestore.js';
import { setDbForTests } from '../api/_lib/db.js';
import { notify } from '../api/_lib/notify.js';
import { resolveGuestlist, _internal } from '../api/_lib/passes.js';

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
});
