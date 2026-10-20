import { describe, it, expect, vi } from 'vitest';
import { FakeFirestore } from './helpers/fakeFirestore.js';
import { getHinglish, looksFaithful } from '../api/_lib/hinglish.js';

const campaign = (extra = {}) => ({
    title: 'Diwali Reel Challenge',
    reward: '2 Event Passes',
    description: '<p>Post a reel about the show. Details: https://newbi.live/brief</p>',
    status: 'open',
    tasks: [
        { id: 't1', title: 'Post a reel', description: '<p>Tag @newbi.live by <b>Friday</b>.</p>', captionScript: 'Copy me exactly' },
    ],
    ...extra,
});

const hi = (units) => Object.fromEntries(Object.entries(units).map(([k, v]) => [k, v.replace('Post a reel', 'Ek reel post karo').replace('Post', 'Post karo')]));

describe('looksFaithful', () => {
    it('needs the same links and tags', () => {
        expect(looksFaithful('<p>See https://a.com</p>', '<p>Dekho https://a.com</p>')).toBe(true);
        expect(looksFaithful('<p>See https://a.com</p>', '<p>Dekho https://b.com</p>')).toBe(false);
        expect(looksFaithful('<p>Hi <b>you</b></p>', '<p>Hi you</p>')).toBe(false);
        expect(looksFaithful('Hi {name}', 'Namaste')).toBe(false);
        expect(looksFaithful('Hi', '')).toBe(false);
    });
});

describe('getHinglish', () => {
    it('translates once, caches, and leaves caption scripts out', async () => {
        const db = new FakeFirestore({ 'campaigns/c1': campaign() });
        const generate = vi.fn(async (units) => hi(units));
        const a = await getHinglish(db, 'campaign', 'c1', { generate });
        expect(a.units.title).toBe('Diwali Reel Challenge'.replace('Post', 'Post karo'));
        expect(Object.keys(generate.mock.calls[0][0])).toEqual(['title', 'reward', 'description', 'task:t1:title', 'task:t1:description']);
        const b = await getHinglish(db, 'campaign', 'c1', { generate });
        expect(b.cached).toBe(true);
        expect(generate).toHaveBeenCalledTimes(1);
    });

    it('regenerates when the English changes', async () => {
        const db = new FakeFirestore({ 'campaigns/c2': campaign() });
        const generate = vi.fn(async (units) => hi(units));
        await getHinglish(db, 'campaign', 'c2', { generate });
        await db.collection('campaigns').doc('c2').set(campaign({ title: 'Navratri Reel Challenge' }));
        await getHinglish(db, 'campaign', 'c2', { generate });
        expect(generate).toHaveBeenCalledTimes(2);
    });

    it('drops units whose links or tags were mangled', async () => {
        const db = new FakeFirestore({ 'campaigns/c3': campaign() });
        const generate = async (units) => ({ ...units, description: '<p>Reel post karo https://evil.example</p>', title: 'Diwali Reel Challenge (hi)' });
        const { units } = await getHinglish(db, 'campaign', 'c3', { generate });
        expect(units.title).toBe('Diwali Reel Challenge (hi)');
        expect(units.description).toBeUndefined();
    });

    it('never touches hidden, missing or unknown things', async () => {
        const db = new FakeFirestore({ 'campaigns/h1': campaign({ status: 'draft' }) });
        const generate = vi.fn();
        expect((await getHinglish(db, 'campaign', 'h1', { generate })).reason).toBe('not-public');
        expect((await getHinglish(db, 'campaign', 'nope', { generate })).reason).toBe('not-found');
        expect((await getHinglish(db, 'users', 'x', { generate })).reason).toBe('bad-request');
        expect((await getHinglish(db, 'campaign', '../x', { generate })).reason).toBe('bad-request');
        expect(generate).not.toHaveBeenCalled();
    });

    it('falls back quietly when the AI fails, then cools down', async () => {
        const db = new FakeFirestore({ 'campaigns/f1': campaign() });
        const generate = vi.fn(async () => { throw new Error('boom'); });
        expect((await getHinglish(db, 'campaign', 'f1', { generate })).reason).toBe('unavailable');
        expect((await getHinglish(db, 'campaign', 'f1', { generate })).reason).toBe('cooling-down');
        expect(generate).toHaveBeenCalledTimes(1);
    });

    it('rewrites only descriptions for guestlists, merging collections like the feed does', async () => {
        const db = new FakeFirestore({
            'upcoming_events/e1': { title: 'Garba Night', city: 'Pune', description: 'Join us for Garba.' },
            'guestlists/e1': { title: 'Garba Night list', description: 'Free entry before 9 PM if you are on the list.' },
        });
        const generate = vi.fn(async (units) => ({ description: 'List mein ho toh 9 PM se pehle free entry.' , ...Object.fromEntries(Object.keys(units).filter((k) => k !== 'description').map((k) => [k, units[k]])) }));
        const { units } = await getHinglish(db, 'guestlist', 'e1', { generate });
        expect(Object.keys(generate.mock.calls[0][0])).toEqual(['description']);
        expect(generate.mock.calls[0][0].description).toMatch(/Free entry/);
        expect(units.description).toMatch(/free entry/);
    });

    it('handles giveaways and gigs, and skips ones with no description', async () => {
        const db = new FakeFirestore({
            'giveaways/g1': { name: 'Concert pair', description: 'Win two passes.' },
            'volunteer_gigs/v1': { title: 'Gate crew' },
        });
        const generate = vi.fn(async () => ({ description: 'Do passes jeeto.' }));
        expect((await getHinglish(db, 'giveaway', 'g1', { generate })).units.description).toBe('Do passes jeeto.');
        expect((await getHinglish(db, 'gig', 'v1', { generate })).units).toEqual({});
        expect(generate).toHaveBeenCalledTimes(1);
    });
});
