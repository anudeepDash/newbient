import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FakeFirestore, fakeReq, fakeRes } from './helpers/fakeFirestore.js';

const notified = [];
vi.mock('../api/_lib/notify.js', () => ({ notify: async (event, uid) => { notified.push({ event, uid }); } }));
vi.mock('../api/_lib/mail/send.js', () => ({ sendTransactional: async () => ({ ok: true }) }));

const { handleApply, handleCallback, handleLookup, handleCron } = await import('../api/_lib/creatorApp.js');
const { makeSignedToken } = await import('../api/_lib/linkSign.js');

/*
 * Creators are approved automatically once Instagram Login proves the account
 * and it's over the minimum: at apply time, or the moment a pending creator
 * connects later. Rejected and suspended profiles never change.
 */

const UID = 'u-riya';
const token = { uid: UID, email: 'riya@example.com', email_verified: true };
const IG = { user_id: '17841400000000001', username: 'riya.creates', name: 'Riya', followers_count: 5200, media_count: 40, account_type: 'MEDIA_CREATOR', profile_picture_url: 'https://cdn.example/riya.jpg' };
let db;
let me;
// The public profile page's preview tags, as Instagram serves them to link-preview crawlers.
let publicFollowers = '5,200';
let publicDown = false;

const env = { IG_APP_ID: 'app', IG_APP_SECRET: 'secret', IG_REDIRECT_URI: 'https://app.newbi.live/api/instagram/callback', LINK_SIGNING_SECRET: 'x'.repeat(40) };
const savedEnv = {};

/* Meta and Cloudinary, answered by URL. */
const fakeFetch = async (url) => {
    const u = String(url);
    const json = (body, ok = true) => ({ ok, status: ok ? 200 : 400, json: async () => body });
    if (u.startsWith('https://api.instagram.com/oauth/access_token')) return json({ access_token: 'short' });
    if (u.startsWith('https://graph.instagram.com/access_token')) return json({ access_token: 'long', expires_in: 5184000 });
    if (u.startsWith('https://graph.instagram.com/')) return json(me);
    if (u.includes('cloudinary.com')) return json({ secure_url: 'https://res.cloudinary.com/riya.jpg' });
    if (u.startsWith('https://www.instagram.com/')) {
        if (publicDown) return { ok: false, status: 429, text: async () => '' };
        const html = `<meta property="og:title" content="Riya (@riya.creates) • Instagram photos and videos"><meta property="og:description" content="${publicFollowers} Followers, 300 Following, 40 Posts - See Instagram photos">`;
        return { ok: true, status: 200, text: async () => html };
    }
    throw new Error(`unexpected fetch ${u}`);
};

const seed = (extra = {}) => new FakeFirestore({
    'site_settings/general': { instagramMetaVerification: true, minInstagramFollowersToJoin: 1000 },
    [`users/${UID}`]: { name: 'Riya Sharma', email: 'riya@example.com', city: 'Mumbai', phone: '+919811111111', phoneVerified: true },
    ...extra,
});

const callback = async () => {
    const res = fakeRes();
    res.end = () => res;
    const state = makeSignedToken({ uid: UID, returnTo: '/creator/apply', origin: 'https://app.newbi.live', expect: null, n: 'abc' }, 900);
    await handleCallback(fakeReq({ method: 'GET', query: { code: 'c0de', state } }), res, { db });
    return { res, location: new URL(res.headers.Location) };
};
const run = async (handler, body = {}) => {
    const res = fakeRes();
    await handler(fakeReq({ body }), res, { db, token });
    return res;
};
const storedToken = (over = {}) => ({
    token: 'long', expiresAt: new Date(Date.now() + 864e5 * 50).toISOString(), longLived: true,
    igUserId: IG.user_id, username: IG.username, name: 'Riya', followers: 5200, accountType: 'MEDIA_CREATOR',
    profilePic: 'https://res.cloudinary.com/riya.jpg', verifiedAt: new Date().toISOString(), refreshedAt: new Date().toISOString(), ...over,
});

beforeEach(() => {
    notified.length = 0;
    me = { ...IG };
    publicFollowers = '5,200';
    publicDown = false;
    Object.entries(env).forEach(([k, v]) => { savedEnv[k] = process.env[k]; process.env[k] = v; });
    vi.stubGlobal('fetch', vi.fn(fakeFetch));
});
afterEach(() => {
    Object.entries(savedEnv).forEach(([k, v]) => { if (v === undefined) delete process.env[k]; else process.env[k] = v; });
    vi.unstubAllGlobals();
});

describe('connecting Instagram verifies a waiting creator', () => {
    it('approves a creator in review and says so on the way back', async () => {
        db = seed({ [`creators/${UID}`]: { uid: UID, name: 'Riya', instagram: 'riya.creates', profileStatus: 'pending', instagramFollowers: '4000' } });
        const { res, location } = await callback();
        expect(res.statusCode).toBe(302);
        expect(location.searchParams.get('ig')).toBe('connected');
        expect(location.searchParams.get('handle')).toBe('riya.creates');
        expect(location.searchParams.get('approved')).toBe('1');
        const creator = db.dump('creators')[UID];
        expect(creator).toMatchObject({ profileStatus: 'approved', isVerified: true, verifiedBy: 'meta_auto_verify', instagramVerifiedVia: 'oauth', instagramFollowers: '5200' });
        expect(db.dump('users')[UID].creatorStatus).toBe('approved');
        expect(notified).toEqual([{ event: 'creator-approved', uid: UID }]);
    });

    it('keeps a creator under the minimum in review', async () => {
        me = { ...IG, followers_count: 600 };
        db = seed({ [`creators/${UID}`]: { uid: UID, name: 'Riya', instagram: 'riya.creates', profileStatus: 'pending' } });
        const { location } = await callback();
        expect(location.searchParams.get('approved')).toBeNull();
        expect(db.dump('creators')[UID].profileStatus).toBe('pending');
        expect(notified).toEqual([]);
    });

    it('never touches a rejected profile', async () => {
        db = seed({ [`creators/${UID}`]: { uid: UID, name: 'Riya', instagram: 'riya.creates', profileStatus: 'rejected' } });
        await callback();
        expect(db.dump('creators')[UID].profileStatus).toBe('rejected');
        expect(notified).toEqual([]);
    });

    it('turns away a personal account', async () => {
        me = { ...IG, account_type: 'PERSONAL' };
        db = seed();
        const { location } = await callback();
        expect(location.searchParams.get('reason')).toBe('personal');
        expect(db.dump('instagram_owners')).toEqual({});
    });
});

describe('applying with a connected account', () => {
    it('approves a new creator straight away', async () => {
        db = seed({ [`private/instagram_tokens/users/${UID}`]: storedToken() });
        const res = await run(handleApply, { handle: 'riya.creates', city: 'Mumbai', niches: ['Tech & Gaming'] });
        expect(res.statusCode).toBe(200);
        expect(res.body.status).toBe('approved');
        expect(db.dump('creators')[UID]).toMatchObject({ profileStatus: 'approved', isVerified: true, verifiedBy: 'meta_auto_verify', instagramVerified: true });
    });

    it('approves a creator who applied first and connected later', async () => {
        db = seed({
            [`private/instagram_tokens/users/${UID}`]: storedToken(),
            [`creators/${UID}`]: { uid: UID, name: 'Riya', city: 'Mumbai', niches: ['Tech & Gaming'], specializations: ['Tech & Gaming'], instagram: 'riya.creates', instagramVerifiedVia: 'oauth', instagramFollowers: '5200', profileStatus: 'pending' },
        });
        const res = await run(handleApply, { city: 'Mumbai' });
        expect(res.body.status).toBe('approved');
        expect(db.dump('creators')[UID]).toMatchObject({ profileStatus: 'approved', verifiedBy: 'meta_auto_verify' });
        expect(notified).toEqual([{ event: 'creator-approved', uid: UID }]);
    });

    it('leaves an unproven applicant in review', async () => {
        db = seed({ [`creators/${UID}`]: { uid: UID, name: 'Riya', city: 'Mumbai', niches: ['Tech & Gaming'], instagram: 'riya.creates', profileStatus: 'pending' } });
        const res = await run(handleApply, { city: 'Mumbai' });
        expect(res.body.status).toBe('pending');
        expect(notified).toEqual([]);
    });
});

describe('ig-lookup for connect-first', () => {
    it('with no handle, says Instagram Login is on and returns the connected account', async () => {
        db = seed({ [`private/instagram_tokens/users/${UID}`]: storedToken() });
        const res = await run(handleLookup, {});
        expect(res.body).toMatchObject({ oauthReady: true, ok: false, reason: 'idle', account: { username: 'riya.creates', followers: 5200 } });
    });

    it('answers the connected handle from the login, without Business Discovery', async () => {
        db = seed({ [`private/instagram_tokens/users/${UID}`]: storedToken() });
        const res = await run(handleLookup, { handle: '@Riya.Creates' });
        expect(res.body).toMatchObject({ ok: true, connected: true, meetsMinimum: true, profile: { username: 'riya.creates' } });
        expect(fetch).not.toHaveBeenCalled();
    });

    it('is off while the Meta switch is off', async () => {
        db = seed({ 'site_settings/general': { instagramMetaVerification: false } });
        const res = await run(handleLookup, {});
        expect(res.body).toMatchObject({ oauthReady: false, account: null });
    });
});

describe('the automatic check without Instagram Login (Meta switch off)', () => {
    const metaOff = (extra = {}) => seed({ 'site_settings/general': { instagramMetaVerification: false, minInstagramFollowersToJoin: 1000 }, ...extra });
    const apply = { handle: 'riya.creates', city: 'Mumbai', niches: ['Tech & Gaming'] };

    it('approves a creator whose followers were read from their public profile', async () => {
        db = metaOff();
        const res = await run(handleApply, apply);
        expect(res.body.status).toBe('approved');
        expect(db.dump('creators')[UID]).toMatchObject({
            profileStatus: 'approved', isVerified: true, verifiedBy: 'meta_auto_verify',
            instagramVerified: true, instagramVerifiedVia: 'public', instagramFollowers: '5200',
            manualFollowerEntry: false, requiresManualVerification: false,
        });
    });

    it('sends a public profile under the minimum to review', async () => {
        publicFollowers = '640';
        db = metaOff();
        const res = await run(handleApply, apply);
        expect(res.body.status).toBe('pending');
    });

    it('sends a typed follower count to review, never approves it', async () => {
        publicDown = true;
        db = metaOff();
        const res = await run(handleApply, { ...apply, manualFollowers: 25000 });
        expect(res.body.status).toBe('pending');
        expect(db.dump('creators')[UID]).toMatchObject({ instagramVerified: false, instagramVerifiedVia: 'self_reported', manualFollowerEntry: true, requiresManualVerification: true, isVerified: false });
    });

    it('approves a Business Discovery hit when Instagram Login isn’t set up', async () => {
        ['IG_APP_ID', 'IG_APP_SECRET', 'IG_REDIRECT_URI'].forEach(k => delete process.env[k]);
        db = seed();
        const res = await run(handleApply, apply);
        // No META_GRAPH_TOKEN here either, so this is the public profile again: still automatic.
        expect(res.body.status).toBe('approved');
    });
});

describe('the daily check for profiles nothing could read yet', () => {
    const cron = async () => {
        const res = fakeRes();
        process.env.CRON_SECRET = 'cron';
        await handleCron({ method: 'GET', query: {}, body: {}, headers: { authorization: 'Bearer cron' } }, res, { db });
        delete process.env.CRON_SECRET;
        return res;
    };

    it('approves one it can read now, even with the Meta switch off', async () => {
        db = seed({
            'site_settings/general': { instagramMetaVerification: false, minInstagramFollowersToJoin: 1000 },
            [`creators/${UID}`]: { uid: UID, name: 'Riya', instagram: 'riya.creates', profileStatus: 'pending_verification', instagramPending: { handle: 'riya.creates', since: new Date().toISOString() } },
        });
        const res = await cron();
        expect(res.body.pending.settled).toBe(1);
        expect(db.dump('creators')[UID]).toMatchObject({ profileStatus: 'approved', instagramVerified: true, instagramVerifiedVia: 'public' });
    });

    it('hands a typed count to review instead of checking it', async () => {
        db = seed({
            'site_settings/general': { instagramMetaVerification: false },
            [`creators/${UID}`]: { uid: UID, name: 'Riya', instagram: 'riya.creates', profileStatus: 'pending_verification', instagramVerifiedVia: 'self_reported', instagramFollowers: '25000' },
        });
        await cron();
        expect(db.dump('creators')[UID].profileStatus).toBe('pending');
        expect(fetch).not.toHaveBeenCalled();
    });
});
