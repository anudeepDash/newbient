import { describe, it, expect } from 'vitest';
import {
    EMPTY_EVENT, appPathFor, cleanTiers, eventDayKey, eventProblems, eventState, eventTimeOf,
    formatWhen, fromEvent, homeCardSource, toPayload, todayKey,
} from '../src/components/admin/events/eventModel.js';

const form = (patch = {}) => ({ ...EMPTY_EVENT, artists: [], tiers: [], title: 'Sunburn', date: '2030-11-08', location: 'Jayamahal', ...patch });

describe('event dates', () => {
    it('reads the day the way the app does (India time)', () => {
        expect(eventDayKey('2030-11-08T20:00')).toBe('2030-11-08');
        expect(eventDayKey('2030-11-08')).toBe('2030-11-08');
        // 20:30 UTC is 2 a.m. the next day in India.
        expect(eventDayKey('2030-11-08T20:30:00.000Z')).toBe('2030-11-09');
        expect(eventDayKey({ seconds: Date.UTC(2030, 10, 8, 10) / 1000 })).toBe('2030-11-08');
        expect(eventDayKey('')).toBe('');
    });

    it('today in India rolls over at IST midnight', () => {
        expect(todayKey(Date.UTC(2030, 10, 8, 18, 29))).toBe('2030-11-08');
        expect(todayKey(Date.UTC(2030, 10, 8, 18, 31))).toBe('2030-11-09');
    });

    it('takes the start time from `time`, else from a local date string', () => {
        expect(eventTimeOf({ time: '21:00', date: '2030-11-08T20:00' })).toBe('21:00');
        expect(eventTimeOf({ date: '2030-11-08T20:00' })).toBe('20:00');
        expect(eventTimeOf({ date: '2030-11-08T20:00:00.000Z' })).toBe('');
        expect(formatWhen({ date: '2030-11-08', time: '20:00' })).toMatch(/8 Nov,? 2030 · 8:00 pm$/);
        expect(formatWhen({})).toBe('Date to be announced');
    });

    it('states', () => {
        const today = '2030-11-08';
        expect(eventState({ date: '2030-11-08T20:00' }, today)).toBe('today');
        expect(eventState({ date: '2030-11-09' }, today)).toBe('upcoming');
        expect(eventState({ date: '2030-11-07' }, today)).toBe('past');
        expect(eventState({}, today)).toBe('tba');
        expect(eventState({ date: '2030-11-09', status: 'draft' }, today)).toBe('draft');
    });
});

describe('editor form ↔ stored event', () => {
    it('writes `time` next to the date so every card shows the start', () => {
        const p = toPayload(form({ time: '20:30' }));
        expect(p.date).toBe('2030-11-08T20:30');
        expect(p.time).toBe('20:30');
        expect(toPayload(form()).date).toBe('2030-11-08');
    });

    it('keeps tier ids and turns blanks into "no limit"', () => {
        const tiers = cleanTiers([
            { id: 'cat_1', name: ' Early bird ', price: '499', capacity: '' , color: '#fff' },
            { id: 'cat_2', name: '', price: '' },
        ]);
        expect(tiers).toEqual([{ id: 'cat_1', name: 'Early bird', price: 499, capacity: null, color: '#fff' }]);
        const p = toPayload(form({ isTicketed: true, tiers: [{ id: 'a', name: 'GA', price: '999', capacity: '100' }, { id: 'b', name: 'VIP', price: '2499', capacity: '' }] }));
        expect(p.basePrice).toBe(999);
        expect(p.ticketCategories.map(t => t.id)).toEqual(['a', 'b']);
    });

    it('guestlist capacity: blank is no limit (0)', () => {
        expect(toPayload(form({ isGuestlistEnabled: true, maxSpots: '' })).maxSpots).toBe(0);
        expect(toPayload(form({ isGuestlistEnabled: true, maxSpots: '150' })).maxSpots).toBe(150);
    });

    it('only touches status for drafts', () => {
        expect(toPayload(form({ draft: true })).status).toBe('draft');
        expect('status' in toPayload(form(), { status: 'Live' })).toBe(false);
        expect(toPayload(form(), { status: 'draft' }).status).toBe('');
    });

    it('round-trips an older event and keeps where-it-shows defaults on', () => {
        const old = { title: 'Old show', date: '2030-11-08T19:00', location: 'Hall', buttonText: 'LEARN MORE', artists: ['A', { name: 'B' }], perUserLimit: 5 };
        const f = fromEvent(old);
        expect(f).toMatchObject({ date: '2030-11-08', time: '19:00', showOnSite: true, showInApp: true, artists: ['A', 'B'], perUserLimit: '5' });
        expect(fromEvent({ ...old, showOnSite: false }).showOnSite).toBe(false);
        // Fields the editor doesn't show are not written (so they're left as they are).
        expect('buttonText' in toPayload(f, old)).toBe(false);
    });
});

describe('problems', () => {
    it('drafts only need a name', () => {
        expect(eventProblems(form({ draft: true, date: '', location: '' }))).toEqual({});
        expect(Object.keys(eventProblems(form({ date: '', location: '' })))).toEqual(['date', 'location']);
    });

    it('checks the map link, tiers and guestlist numbers', () => {
        expect(eventProblems(form({ locationUrl: 'maps.google.com' })).locationUrl).toBeTruthy();
        expect(eventProblems(form({ isTicketed: true, tiers: [{ id: 'a', name: '', price: '100' }] })).tiers).toMatch(/name/);
        expect(eventProblems(form({ isTicketed: true, tiers: [{ id: 'a', name: 'GA', price: '100', capacity: '10' }] }), { soldByTier: { a: 12 } }).tiers).toMatch(/12 tickets/);
        expect(eventProblems(form({ isGuestlistEnabled: true, maxSpots: '2', perUserLimit: '4' })).guestlist).toBeTruthy();
    });
});

describe('links', () => {
    it('opens tickets, guestlists or the app home', () => {
        expect(appPathFor({ id: 'e1', isTicketed: true })).toBe('/tickets?event=e1');
        expect(appPathFor({ id: 'e1', isGuestlistEnabled: true })).toBe('/community/g/e1');
        expect(appPathFor({ id: 'e1' })).toBe('/');
    });

    it('spots home-page cards made for gigs, forms, giveaways and guestlists', () => {
        expect(homeCardSource({ isVolunteerGig: true, gigId: 'g1' }).to).toBe('/admin/volunteer-gigs?edit=g1');
        expect(homeCardSource({ isForm: true, relatedArtistFormId: 'f1' }).to).toBe('/admin/forms/edit/f1');
        expect(homeCardSource({ isGiveaway: true, giveawayId: 'x' }).kind).toBe('giveaway');
        expect(homeCardSource({ category: 'guestlist', guestlistId: 'gl' }).kind).toBe('guestlist');
        expect(homeCardSource({ title: 'Plain' })).toBeNull();
    });
});
