import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { FakeFirestore, fakeRes, fakeReq } from './helpers/fakeFirestore.js';
import { appCampaigns, communityCollections, handleAppFeed, isListable, plain } from '../api/_lib/publicFeed.js';

// The store modules import the browser Firebase app; the feed logic under test needs none of it.
vi.mock('../src/lib/firebase.js', () => ({ db: null }));
vi.mock('../src/app/creator/api.js', () => ({ callCreatorApi: async () => ({ ok: false }) }));
const { buildFeed } = await import('../src/lib/store/community.js');
const { isCampaignOpen } = await import('../src/lib/store/creator.js');

const NOW = new Date('2026-10-20T06:30:00.000Z');
const DAY = 24 * 3600 * 1000;
const day = (offset) => new Date(NOW.getTime() + offset * DAY).toISOString().slice(0, 10);

// What the browser SDK hands back for a Timestamp field.
class Ts {
    constructor(iso) { this.iso = iso; }
    toDate() { return new Date(this.iso); }
}

// Raw documents as the app read them from Firestore (with fields the feed never uses).
const raw = () => ({
    events: [
        { id: 'e1', title: 'Open night', isGuestlistEnabled: true, date: day(12), hubImage: 'https://img/e1.jpg', venue: 'Hall', internalNotes: 'not for the app', budget: 90000 },
        { id: 'e2', title: 'Old show', date: day(-30), image: 'https://img/e2.jpg' },
        { id: 'e3', title: 'Shut', isGuestlistEnabled: true, status: 'closed', date: day(5) },
        { id: 'e4', title: 'Pinned', isGuestlistEnabled: true, isPinned: true, date: new Ts(`${day(3)}T13:30:00.000Z`), dates: [{ date: new Ts(`${day(3)}T13:30:00.000Z`) }] },
        { id: 'e5', title: 'No date', isGuestlistEnabled: true, showInApp: true },
    ],
    gigs: [
        { id: 'g1', title: 'Volunteer', formId: 'f9', date: day(8), slots: '12', interestedCount: 4 },
        { id: 'g2', title: 'Closed gig', status: 'Closed', date: day(2), image: 'https://img/g2.jpg' },
        { id: 'g3', title: 'Gig list', guestlistEnabled: true, date: day(9) },
        { id: 'g4', title: 'Link gig', applyLink: 'https://forms.example/x' },
    ],
    giveaways: [
        { id: 'gv1', title: 'Win passes', slug: 'win', endDate: day(4), image: 'https://img/gv1.jpg' },
        { id: 'gv2', title: 'Long gone', endDate: day(-10) },
        { id: 'gv3', title: 'Off', isActive: false, endDate: day(4) },
        { id: 'gv4', title: 'Ended yesterday', endDate: day(-1) },
        { id: 'gv5', title: '  ', endDate: day(4) },
        { id: 'gv6', name: 'Named only', closesAt: new Ts(`${day(6)}T18:00:00.000Z`) },
    ],
    forms: [
        { id: 'f1', title: 'Join the crew', createdAt: '2026-10-01T10:00:00.000Z', fields: Array.from({ length: 30 }, (_, i) => ({ id: `q${i}`, label: 'Question' })) },
        { id: 'f2', title: 'Closed form', status: 'Closed' },
        { id: 'f3', title: 'Deadline soon', deadline: new Ts(`${day(2)}T12:00:00.000Z`), isPinned: true },
        { id: 'f4', title: 'Hidden', hidden: true },
        { id: 'f5', title: 'Labelled', activeLabel: 'Few spots left', description: '<p>Hi</p>' },
        { id: 'f6', title: 'Expired label', activeLabel: 'Expired' },
    ],
});

// Signed-in users' guestlists, read in the browser; some lean on events and gigs the feed itself hides.
const guestlists = [
    { id: 'gl-e2', eventId: 'e2', title: 'Old show list', endDate: day(3) },
    { id: 'g2', title: 'List for a closed gig' },
    { id: 'gl-gone', eventId: 'archived-event', title: 'Archived', isEmbedded: true },
    { id: 'solo', title: 'Standalone', date: day(6), image: 'https://img/solo.jpg' },
    { id: 'e1', eventId: 'e1', title: 'Duplicate of e1' },
];

// What the app receives: the server's output after the JSON round trip.
const fromServer = (input) => JSON.parse(JSON.stringify(communityCollections(input, NOW.getTime())));
const link = (p) => `/app${p}`;

beforeAll(() => { vi.useFakeTimers(); vi.setSystemTime(NOW); });
afterAll(() => { vi.useRealTimers(); });

describe('app feed: community collections', () => {
    it('drops giveaways and forms nobody would see, and keeps the ones the app decides on', () => {
        const out = communityCollections(raw(), NOW.getTime());
        expect(out.giveaways.map(g => g.id)).toEqual(['gv1', 'gv4', 'gv6']);
        expect(out.forms.map(f => f.id)).toEqual(['f1', 'f3', 'f5']);
        // Events and gigs stay whole: they also stand behind guestlists.
        expect(out.events.map(e => e.id)).toEqual(['e1', 'e2', 'e3', 'e4', 'e5']);
        expect(out.gigs.map(g => g.id)).toEqual(['g1', 'g2', 'g3', 'g4']);
    });

    it('sends only the fields the feed reads, with Timestamps as ISO strings', () => {
        const out = communityCollections(raw(), NOW.getTime());
        const e1 = out.events.find(e => e.id === 'e1');
        expect(e1).not.toHaveProperty('internalNotes');
        expect(e1).not.toHaveProperty('budget');
        expect(out.forms.find(f => f.id === 'f1')).not.toHaveProperty('fields');
        const e4 = out.events.find(e => e.id === 'e4');
        expect(e4.date).toBe(`${day(3)}T13:30:00.000Z`);
        expect(e4.dates).toEqual([{ date: `${day(3)}T13:30:00.000Z` }]);
    });

    it('keeps an item that closed within two days (time zones), drops older ones', () => {
        const now = NOW.getTime();
        expect(isListable({ title: 'x', endDate: day(-1) }, now)).toBe(true);
        expect(isListable({ title: 'x', endDate: day(-3) }, now)).toBe(false);
        expect(isListable({ title: 'x' }, now)).toBe(true);
        expect(isListable({ title: 'x', status: 'archived' }, now)).toBe(false);
        expect(isListable({ name: 'N/A' }, now)).toBe(false);
    });

    it('builds the same feed as reading Firestore directly, signed out', () => {
        const before = buildFeed(raw(), link);
        const after = buildFeed(fromServer(raw()), link);
        expect(after).toEqual(before);
        // Pinned first, then by date, undated last; closed and expired items are gone.
        expect(before.map(i => i.key)).toEqual([
            'guestlist:e4', 'form:f3', 'gig:g1', 'guestlist:g3', 'guestlist:e1',
            'guestlist:e5', 'gig:g4', 'giveaway:gv1', 'giveaway:gv6', 'form:f1', 'form:f5',
        ]);
    });

    it('builds the same feed as reading Firestore directly, signed in with guestlists', () => {
        const before = buildFeed({ ...raw(), guestlists }, link);
        const after = buildFeed({ ...fromServer(raw()), guestlists }, link);
        expect(after).toEqual(before);
        // The list for a past event borrows its poster; the closed gig's list still shows.
        expect(after.find(i => i.key === 'guestlist:gl-e2')).toMatchObject({ image: 'https://img/e2.jpg', to: '/app/community/g/gl-e2' });
        expect(after.find(i => i.key === 'guestlist:g2')).toMatchObject({ image: 'https://img/g2.jpg' });
        expect(after.some(i => i.id === 'gl-gone')).toBe(false);
    });
});

describe('app feed: campaigns', () => {
    const campaigns = [
        { id: 'c1', title: 'Open', status: 'Open', createdAt: '2026-10-01T00:00:00.000Z', tasks: [{ id: 't1' }] },
        { id: 'c2', title: 'No status' },
        { id: 'c3', title: 'Live', status: 'Live' },
        { id: 'c4', title: 'Full', status: 'open', spotsLeft: 0 },
        { id: 'c5', title: 'Published', status: 'published', spotsLeft: '3', announcedAt: new Ts('2026-10-02T00:00:00.000Z') },
        { id: 'c6', title: 'Closed', status: 'closed' },
    ];

    it('lists the campaigns the app shows to everyone, whole', () => {
        const out = appCampaigns(campaigns);
        expect(out.map(c => c.id)).toEqual(campaigns.filter(c => isCampaignOpen(c)).map(c => c.id));
        expect(out.map(c => c.id)).toEqual(['c1', 'c2', 'c5']);
        expect(out[0].tasks).toEqual([{ id: 't1' }]);
        expect(out[2].announcedAt).toBe('2026-10-02T00:00:00.000Z');
    });

    it('turns other Firestore values into JSON', () => {
        class DocumentReference { constructor(path) { this.path = path; this.firestore = {}; } }
        class GeoPoint { constructor(latitude, longitude) { Object.assign(this, { latitude, longitude }); } }
        expect(plain({ ref: new DocumentReference('campaigns/c1'), at: new GeoPoint(1, 2), n: null, list: [new Ts('2026-10-02T00:00:00.000Z')] }))
            .toEqual({ ref: 'campaigns/c1', at: { latitude: 1, longitude: 2 }, n: null, list: ['2026-10-02T00:00:00.000Z'] });
    });
});

describe('handleAppFeed', () => {
    it('serves the feed with a short edge cache', async () => {
        const db = new FakeFirestore({
            'forms/f1': { title: 'Join the crew' },
            'forms/f2': { title: 'Closed form', status: 'Closed' },
            'campaigns/c1': { title: 'Open', status: 'Open' },
            'campaigns/c3': { title: 'Live', status: 'Live' },
            'upcoming_events/e1': { title: 'Open night', isGuestlistEnabled: true, date: day(12) },
        });
        const res = fakeRes();
        await handleAppFeed(db, fakeReq({ method: 'GET', query: { type: 'app-feed' } }), res);
        expect(res.statusCode).toBe(200);
        expect(res.headers['Cache-Control']).toBe('public, max-age=0, s-maxage=60, stale-while-revalidate=300');
        expect(res.body.success).toBe(true);
        expect(res.body.community.forms.map(f => f.id)).toEqual(['f1']);
        expect(res.body.community.events.map(e => e.id)).toEqual(['e1']);
        expect(res.body.campaigns.map(c => c.id)).toEqual(['c1']);
    });

    it('fails (uncached) when a read fails, so the app falls back to Firestore', async () => {
        const db = { collection: () => ({ limit: () => ({ get: async () => { throw new Error('unavailable'); } }) }) };
        const res = fakeRes();
        vi.spyOn(console, 'error').mockImplementation(() => {});
        await handleAppFeed(db, fakeReq({ method: 'GET' }), res);
        expect(res.statusCode).toBe(500);
        expect(res.headers['Cache-Control']).toBe('no-store');
        expect(res.body.success).toBe(false);
    });

    it('accepts only GET', async () => {
        const res = fakeRes();
        await handleAppFeed(new FakeFirestore(), fakeReq({ method: 'POST' }), res);
        expect(res.statusCode).toBe(405);
    });
});
