import { describe, it, expect, vi } from 'vitest';
import { handlePublicFeed, handlePublicArchive } from '../api/_lib/publicFeed.js';
import { FakeFirestore } from './helpers/fakeFirestore.js';

const res = () => {
    const r = { statusCode: 0, headers: {}, body: null };
    r.status = (c) => { r.statusCode = c; return r; };
    r.json = (b) => { r.body = b; return r; };
    r.setHeader = (k, v) => { r.headers[k] = v; };
    return r;
};
const quota = () => Object.assign(new Error('8 RESOURCE_EXHAUSTED: Quota exceeded.'), { code: 8 });
const blocked = {
    collection: () => ({
        limit: () => ({ get: async () => { throw quota(); } }),
        doc: () => ({ get: async () => { throw quota(); } }),
    }),
};

describe('public feed caching', () => {
    it('keeps a complete feed at the edge for five minutes', async () => {
        const r = res();
        await handlePublicFeed(new FakeFirestore({ 'past_clients/p1': { name: 'Brand' } }), { method: 'GET' }, r);
        expect(r.statusCode).toBe(200);
        expect(r.headers['Cache-Control']).toBe('public, max-age=60, s-maxage=300, stale-while-revalidate=600');
        expect(r.body.partial).toBeUndefined();
    });

    it("doesn't cache a feed built from failed reads", async () => {
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        const r = res();
        await handlePublicFeed(blocked, { method: 'GET' }, r);
        expect(r.statusCode).toBe(200);
        expect(r.headers['Cache-Control']).toBe('no-store');
        expect(r.body.partial).toBe(true);
    });

    it("doesn't cache the archive either when its reads fail", async () => {
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        const r = res();
        await handlePublicArchive(blocked, { method: 'GET' }, r);
        expect(r.headers['Cache-Control']).toBe('no-store');
    });
});
