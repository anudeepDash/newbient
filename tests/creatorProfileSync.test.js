import { describe, it, expect, beforeEach } from 'vitest';
import { FakeFirestore, fakeReq, fakeRes } from './helpers/fakeFirestore.js';
import { handleCampaignApply, handleSyncProfile } from '../api/_lib/creatorApp.js';

const UID = 'u-riya';
const token = { uid: UID, email: 'riya@example.com' };
let db;

const run = async (handler, body = {}) => {
    const res = fakeRes();
    await handler(fakeReq({ body }), res, { db, token });
    return res;
};

beforeEach(() => {
    db = new FakeFirestore({
        // Applied as a creator in Pune; has since moved to Mumbai and changed it on the profile.
        [`creators/${UID}`]: { uid: UID, name: 'Riya', city: 'Pune', profileStatus: 'approved', instagramFollowers: '5000', phone: '+919876543210', isPhoneVerified: false },
        [`users/${UID}`]: { name: 'Riya Sharma', city: 'Mumbai', college: 'St. Xavier’s College', phone: '+919811111111', phoneVerified: true },
        'campaigns/mumbai': { title: 'Mumbai show', status: 'Open', targetCity: 'Mumbai' },
        'campaigns/pune': { title: 'Pune show', status: 'Open', targetCity: 'Pune' },
        'campaigns/xaviers': { title: 'Campus', status: 'Open', targetCity: 'Mumbai', targetCollege: 'Xavier' },
    });
});

describe('campaign apply uses the current profile', () => {
    it('lets a creator apply in the city on their profile, and updates the creator doc', async () => {
        const res = await run(handleCampaignApply, { campaignId: 'mumbai' });
        expect(res.statusCode).toBe(200);
        const creator = db.dump('creators')[UID];
        // (The fake Firestore drops arrayUnion, so joinedCampaigns isn't checked here.)
        expect(creator.city).toBe('Mumbai');
    });

    it('turns away a campaign in the old city', async () => {
        const res = await run(handleCampaignApply, { campaignId: 'pune' });
        expect(res.statusCode).toBe(409);
        expect(res.body.code).toBe('city');
    });

    it('matches a college target against the profile college', async () => {
        const res = await run(handleCampaignApply, { campaignId: 'xaviers' });
        expect(res.statusCode).toBe(200);
    });
});

describe('creator-sync-profile', () => {
    it('copies name, city and a verified phone onto the creator doc', async () => {
        const res = await run(handleSyncProfile);
        expect(res.statusCode).toBe(200);
        expect(res.body.updated.sort()).toEqual(['displayName', 'isPhoneVerified', 'name', 'needsPhoneVerificationNotice', 'phone', 'phoneVerificationPending', 'phoneVerifiedAt', 'city'].sort());
        const creator = db.dump('creators')[UID];
        expect(creator).toMatchObject({ name: 'Riya Sharma', city: 'Mumbai', phone: '+919811111111', isPhoneVerified: true, profileStatus: 'approved' });
    });

    it('does nothing for someone without a creator profile', async () => {
        db = new FakeFirestore({ [`users/${UID}`]: { name: 'Riya', city: 'Mumbai' } });
        const res = await run(handleSyncProfile);
        expect(res.body.updated).toEqual([]);
        expect(db.dump('creators')).toEqual({});
    });
});
