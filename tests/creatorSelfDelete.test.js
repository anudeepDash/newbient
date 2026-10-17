import { describe, it, expect, beforeEach } from 'vitest';
import { FakeFirestore, fakeReq, fakeRes } from './helpers/fakeFirestore.js';
import { handleSelfDelete } from '../api/_lib/creatorApp.js';

const UID = 'u-riya';
let db;

const call = async (token = { uid: UID }) => {
    const res = fakeRes();
    await handleSelfDelete(fakeReq({ body: {} }), res, { db, token });
    return res;
};

beforeEach(() => {
    db = new FakeFirestore({
        [`creators/${UID}`]: { uid: UID, name: 'Riya', profileStatus: 'approved', igUserId: '1784' },
        'creators/legacy-1': { uid: UID, name: 'Riya (old)', profileStatus: 'approved' },
        'creators/u-other': { uid: 'u-other', name: 'Someone else', profileStatus: 'approved' },
        [`users/${UID}`]: {
            name: 'Riya',
            capabilities: { creator: true, member: true },
            creatorStatus: 'approved',
            instagram: { handle: 'riya.s', igUserId: '1784', followers: 12000, verifiedVia: 'oauth', verifiedAt: '2026-10-01' },
        },
        'instagram_owners/1784': { uid: UID, username: 'riya.s' },
        [`private/instagram_tokens/users/${UID}`]: { accessToken: 'x' },
    });
});

describe('creator-self-delete', () => {
    it('removes only the caller’s creator docs and Instagram link, and keeps the account', async () => {
        const res = await call();
        expect(res.statusCode).toBe(200);
        expect(Object.keys(db.dump('creators'))).toEqual(['u-other']);
        expect(db.dump('instagram_owners')).toEqual({});
        expect(db.dump('private/instagram_tokens/users')).toEqual({});
        const user = db.dump('users')[UID];
        expect(user.capabilities).toEqual({ creator: false, member: true });
        expect(user.creatorStatus).toBeUndefined();
        expect(user.instagram).toEqual({ handle: 'riya.s' });
        expect(user.name).toBe('Riya');
    });

    it('leaves another person’s Instagram ownership alone', async () => {
        await db.collection('instagram_owners').doc('1784').set({ uid: 'u-other' });
        await call();
        expect(db.dump('instagram_owners')['1784']).toEqual({ uid: 'u-other' });
    });

    it('refuses a suspended profile', async () => {
        await db.collection('creators').doc(UID).set({ profileStatus: 'suspended' }, { merge: true });
        const res = await call();
        expect(res.statusCode).toBe(403);
        expect(db.dump('creators')[UID]).toBeDefined();
        expect(db.dump('users')[UID].capabilities.creator).toBe(true);
    });

    it('works when there is no creator profile left', async () => {
        db = new FakeFirestore({ [`users/${UID}`]: { capabilities: { creator: true } } });
        const res = await call();
        expect(res.statusCode).toBe(200);
        expect(db.dump('users')[UID].capabilities.creator).toBe(false);
    });
});
