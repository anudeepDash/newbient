import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('../api/_lib/mailing.js', () => ({
    normalizeEmail: (e) => String(e || '').trim().toLowerCase(),
    staffRoleOf: vi.fn(async (token) => (token?.email === 'team@newbi.live' ? 'admin' : '')),
}));
vi.mock('../api/_lib/notify.js', () => ({ notify: vi.fn(async () => ({})) }));

import { FakeFirestore } from './helpers/fakeFirestore.js';
import { setDbForTests } from '../api/_lib/db.js';
import { _internal, setUpGigForm } from '../api/_lib/community.js';
import { GIG_FIELD_IDS, gigFormFields } from '../src/lib/gigApplications.js';

const act = (name, body, caller) => _internal.actions[name](db, body, caller);
const team = { uid: 'admin1', email: 'team@newbi.live', token: { email: 'team@newbi.live' } };
const asha = { uid: 'u1', email: 'asha@example.com', token: { email: 'asha@example.com' } };

let db;
beforeEach(() => {
    db = new FakeFirestore({
        'volunteer_gigs/g1': { title: 'Sunburn crew', dates: ['2030-11-07', '2030-11-08'], status: 'Open', applyType: 'link', applyLink: 'https://forms.gle/old', whatsappLink: 'https://chat.whatsapp.com/crew' },
        'volunteer_gigs/g2': { title: 'One-day crew', date: '2030-12-01', status: 'Closed' },
        'gig_applications/g1_u1': { gigId: 'g1', userId: 'u1', name: 'Asha Rao', phone: '+919876500001', email: 'asha@example.com', city: 'Bengaluru', createdAt: '2030-10-01T10:00:00.000Z' },
        'gig_applications/g1_u2': { gigId: 'g1', userId: 'u2', name: 'Ravi', phone: null, email: 'ravi@example.com' },
    });
    setDbForTests(db);
});
afterEach(() => setDbForTests(null));

describe('gig application form', () => {
    it('asks which days only when the gig runs over several', () => {
        expect(gigFormFields({ dates: ['2030-11-07', '2030-11-08'] }).some(f => f.id === GIG_FIELD_IDS.days)).toBe(true);
        expect(gigFormFields({ date: '2030-12-01' }).some(f => f.id === GIG_FIELD_IDS.days)).toBe(false);
    });

    it('only lets the team set one up', async () => {
        await expect(act('gig-form', { gigId: 'g1' }, asha)).rejects.toMatchObject({ code: 'FORBIDDEN' });
    });

    it('replaces the outside link and brings interested people over as applications', async () => {
        const out = await act('gig-form', { gigId: 'g1' }, team);
        expect(out).toMatchObject({ success: true, created: true, imported: 2 });
        const gig = db.store.get('volunteer_gigs/g1');
        expect(gig).toMatchObject({ formId: out.formId, applyType: 'form', applyLink: `/forms/${out.formId}` });
        const form = db.store.get(`forms/${out.formId}`);
        expect(form).toMatchObject({ gigId: 'g1', onePerPerson: true, requireSignIn: true, hidden: true, responseCount: 2, activeLabel: 'Live' });
        const r = db.store.get(`form_responses/${out.formId}_u1`);
        expect(r).toMatchObject({ status: 'new', source: 'interest', userId: 'u1', submittedAt: '2030-10-01T10:00:00.000Z' });
        expect(r.answers).toMatchObject({ [GIG_FIELD_IDS.name]: 'Asha Rao', [GIG_FIELD_IDS.phone]: '+919876500001', [GIG_FIELD_IDS.city]: 'Bengaluru' });
    });

    it('keeps an existing built-in form when run again', async () => {
        const first = await setUpGigForm(db, 'g1');
        const again = await setUpGigForm(db, 'g1');
        expect(again).toMatchObject({ formId: first.formId, created: false });
    });

    it('starts closed for a closed gig', async () => {
        const out = await setUpGigForm(db, 'g2');
        expect(db.store.get(`forms/${out.formId}`).activeLabel).toBe('Closed');
    });
});

describe('your own application', () => {
    it('shows the status, and the crew link only once confirmed', async () => {
        const { formId } = await setUpGigForm(db, 'g1');
        expect((await act('gig-application', { gigId: 'g1' }, asha)).application).toMatchObject({ status: 'new', crewLink: null });
        await db.collection('form_responses').doc(`${formId}_u1`).update({ status: 'confirmed' });
        expect((await act('gig-application', { gigId: 'g1' }, asha)).application).toMatchObject({ status: 'confirmed', crewLink: 'https://chat.whatsapp.com/crew' });
    });

    it('is empty before applying', async () => {
        await setUpGigForm(db, 'g1');
        expect((await act('gig-application', { gigId: 'g1' }, { uid: 'u9', token: {} })).application).toBeNull();
    });

    it('can be withdrawn until the team decides', async () => {
        const { formId } = await setUpGigForm(db, 'g1');
        await act('gig-withdraw', { gigId: 'g1' }, asha);
        expect(db.store.has(`form_responses/${formId}_u1`)).toBe(false);
        expect(db.store.get(`forms/${formId}`).responseCount).toBe(1);

        await db.collection('form_responses').doc(`${formId}_u2`).update({ status: 'confirmed' });
        await expect(act('gig-withdraw', { gigId: 'g1' }, { uid: 'u2', token: {} })).rejects.toMatchObject({ code: 'LOCKED' });
    });

    it('needs sign-in', async () => {
        await expect(act('gig-application', { gigId: 'g1' }, { uid: null })).rejects.toMatchObject({ code: 'AUTH' });
    });
});

describe('the days question follows the gig', () => {
    it('updates, adds and drops the question as dates change', async () => {
        const { syncGigFormDays } = await import('../src/lib/gigApplications.js');
        const two = gigFormFields({ dates: ['2030-11-07', '2030-11-08'] });
        expect(syncGigFormDays(two, { dates: ['2030-11-07', '2030-11-08'] })).toBeNull();
        const three = syncGigFormDays(two, { dates: ['2030-11-07', '2030-11-08', '2030-11-09'] });
        expect(three.find(f => f.id === GIG_FIELD_IDS.days).options).toHaveLength(3);
        expect(syncGigFormDays(two, { dates: ['2030-11-07'] }).some(f => f.id === GIG_FIELD_IDS.days)).toBe(false);
        const one = gigFormFields({ date: '2030-11-07' });
        const added = syncGigFormDays(one, { dates: ['2030-11-07', '2030-11-08'] });
        expect(added.findIndex(f => f.id === GIG_FIELD_IDS.days)).toBe(added.findIndex(f => f.id === GIG_FIELD_IDS.instagram) + 1);
    });
});
