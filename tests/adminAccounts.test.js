import { describe, it, expect, beforeEach } from 'vitest';
import { FakeFirestore, fakeReq, fakeRes } from './helpers/fakeFirestore.js';
import { handleAdminAccounts, handleAdminAccountMerge, handleAdminCreatorLink, handleAdminAccountEmail } from '../api/_lib/creatorApp.js';
import { phoneVariants } from '../api/_lib/adminAccounts.js';

/*
 * One person split three ways: a creator profile from the old form that no
 * sign-in owns, a phone sign-in with no email, and a Google sign-in.
 */
const GOOGLE = 'u-google';
const PHONE_UID = 'u-phone';
const FORM = 'legacyCreator1';
const PHONE = '+919334676596';
const EMAIL = 'khushi@gmail.com';

const fakeAuth = (users) => {
    const map = new Map(users.map(u => [u.uid, { providerData: [], metadata: {}, ...u }]));
    const notFound = () => Object.assign(new Error('not found'), { code: 'auth/user-not-found' });
    return {
        map,
        getUser: async (uid) => { if (!map.has(uid)) throw notFound(); return map.get(uid); },
        getUserByEmail: async (e) => { const u = [...map.values()].find(x => x.email === e); if (!u) throw notFound(); return u; },
        getUserByPhoneNumber: async (p) => { const u = [...map.values()].find(x => x.phoneNumber === p); if (!u) throw notFound(); return u; },
        deleteUser: async (uid) => { map.delete(uid); },
        updateUser: async (uid, patch) => {
            if (patch.phoneNumber && [...map.values()].some(x => x.phoneNumber === patch.phoneNumber && x.uid !== uid)) throw Object.assign(new Error('taken'), { code: 'auth/phone-number-already-exists' });
            map.set(uid, { ...map.get(uid), ...patch });
        },
    };
};

const FOUNDER = { uid: 'staff-founder', email: 'founder@newbi.live' };
const EDITOR = { uid: 'staff-content', email: 'content@newbi.live' };
const STRANGER = { uid: 'someone', email: 'someone@gmail.com' };

let db;
let adminAuth;
const call = async (handler, body, token = FOUNDER) => {
    const res = fakeRes();
    await handler(fakeReq({ body }), res, { db, adminAuth, token });
    return res;
};

beforeEach(() => {
    db = new FakeFirestore({
        'admins/founder@newbi.live': { email: 'founder@newbi.live', role: 'founder' },
        'admins/content@newbi.live': { email: 'content@newbi.live', role: 'content_admin' },
        [`users/${GOOGLE}`]: { name: 'Khushi', email: EMAIL, phone: '', createdAt: '2026-10-17T18:01:07.000Z' },
        [`users/${PHONE_UID}`]: { name: 'Khushi Verma', email: '', phone: PHONE, phoneNumber: PHONE, city: 'Bengaluru', hasJoinedTribe: true, capabilities: { member: true } },
        [`creators/${FORM}`]: { uid: FORM, creatorId: 'LEGACY1', name: 'Khushi Verma', email: EMAIL, phone: '+91 9334676596', city: 'Bengaluru', profileStatus: 'approved', referredBy: '' },
        'creators/friend': { uid: 'friend', referredBy: FORM },
        'campaigns/c1': { title: 'Launch', tasks: [{ id: 't1', completedBy: [FORM] }] },
        [`campaigns/c1/submissions/${FORM}`]: { uid: FORM, creatorDocId: FORM, status: 'approved' },
        [`passes/NB-9`]: { holderUid: PHONE_UID, source: 'guestlist', sourceId: 'g1' },
    });
    adminAuth = fakeAuth([
        { uid: GOOGLE, email: EMAIL, providerData: [{ providerId: 'google.com', email: EMAIL }], metadata: { creationTime: '2026-10-17T18:01:07Z' } },
        { uid: PHONE_UID, phoneNumber: PHONE, providerData: [{ providerId: 'phone' }], metadata: { creationTime: '2026-10-17T17:53:15Z' } },
        { uid: FOUNDER.uid, email: FOUNDER.email, providerData: [{ providerId: 'google.com' }] },
    ]);
});

describe('phoneVariants', () => {
    it('covers the ways a number was typed into old forms', () => {
        expect(phoneVariants(PHONE)).toEqual(expect.arrayContaining(['+919334676596', '+91 9334676596', '9334676596', '+91 93346 76596']));
        expect(phoneVariants('123')).toEqual([]);
    });
});

describe('admin-accounts', () => {
    it('finds both sign-ins and the creator profile no sign-in owns', async () => {
        const res = await call(handleAdminAccounts, { email: EMAIL, phone: '+91 9334676596', ids: [FORM] });
        expect(res.statusCode).toBe(200);
        expect(res.body.canFix).toBe(true);
        expect(res.body.accounts.map(a => a.uid)).toEqual([PHONE_UID, GOOGLE]);
        expect(res.body.accounts[0]).toMatchObject({ methods: ['phone'], phone: PHONE, profileEmail: null, holds: { passes: 1 } });
        expect(res.body.accounts[1]).toMatchObject({ methods: ['google.com'], signInEmail: EMAIL, creatorProfileId: null });
        expect(res.body.unlinkedCreators).toEqual([expect.objectContaining({ id: FORM, email: EMAIL, status: 'approved' })]);
    });

    it('lets content admins look but not fix, and nobody else', async () => {
        expect((await call(handleAdminAccounts, { email: EMAIL }, EDITOR)).body.canFix).toBe(false);
        expect((await call(handleAdminAccounts, { email: EMAIL }, STRANGER)).statusCode).toBe(403);
        expect((await call(handleAdminAccountMerge, { keepUid: GOOGLE, mergeUid: PHONE_UID, confirm: true }, EDITOR)).statusCode).toBe(403);
        expect((await call(handleAdminCreatorLink, { creatorId: FORM, uid: GOOGLE }, EDITOR)).statusCode).toBe(403);
        expect(adminAuth.map.has(PHONE_UID)).toBe(true);
    });
});

describe('admin-account-merge', () => {
    it('previews, then folds the phone account into the Google one and moves the phone sign-in', async () => {
        const preview = await call(handleAdminAccountMerge, { keepUid: GOOGLE, mergeUid: PHONE_UID });
        expect(preview.body.preview).toMatchObject({ phone: PHONE, holds: { passes: 1 } });
        expect(adminAuth.map.has(PHONE_UID)).toBe(true);

        const res = await call(handleAdminAccountMerge, { keepUid: GOOGLE, mergeUid: PHONE_UID, confirm: true });
        expect(res.statusCode).toBe(200);
        expect(res.body.phoneLinked).toBe(true);
        expect(adminAuth.map.has(PHONE_UID)).toBe(false);
        expect(adminAuth.map.get(GOOGLE).phoneNumber).toBe(PHONE);
        const users = db.dump('users');
        expect(users[GOOGLE]).toMatchObject({ email: EMAIL, phone: PHONE, phoneVerified: true, city: 'Bengaluru', hasJoinedTribe: true });
        expect(users[PHONE_UID]).toMatchObject({ mergedInto: GOOGLE, mergedBy: FOUNDER.email });
        expect(db.dump('passes')['NB-9'].holderUid).toBe(GOOGLE);
    });

    it('refuses to fold in the Google account, whose sign-in can’t move', async () => {
        const res = await call(handleAdminAccountMerge, { keepUid: PHONE_UID, mergeUid: GOOGLE, confirm: true });
        expect(res.statusCode).toBe(409);
        expect(res.body.code).toBe('keep_other');
        expect(adminAuth.map.has(GOOGLE)).toBe(true);
    });

    it('refuses when both have their own phone sign-in', async () => {
        adminAuth.map.set(GOOGLE, { ...adminAuth.map.get(GOOGLE), phoneNumber: '+919999999999' });
        const res = await call(handleAdminAccountMerge, { keepUid: GOOGLE, mergeUid: PHONE_UID, confirm: true });
        expect(res.body.code).toBe('two_phones');
    });
});

describe('admin-creator-link', () => {
    it('gives the old form profile to the account, with everything that points at it', async () => {
        const res = await call(handleAdminCreatorLink, { creatorId: FORM, uid: PHONE_UID });
        expect(res.statusCode).toBe(200);
        expect(res.body).toMatchObject({ linked: true, filled: ['email'] });
        const creators = db.dump('creators');
        expect(creators[FORM]).toBeUndefined();
        expect(creators[PHONE_UID]).toMatchObject({ uid: PHONE_UID, creatorId: 'LEGACY1', legacyIds: [FORM], linkedBy: FOUNDER.email });
        expect(creators.friend.referredBy).toBe(PHONE_UID);
        expect(db.dump('campaigns/c1/submissions')[PHONE_UID]).toMatchObject({ status: 'approved' });
        expect(db.dump('campaigns').c1.tasks[0].completedBy).toEqual([PHONE_UID]);
        expect(db.dump('users')[PHONE_UID]).toMatchObject({ email: EMAIL, capabilities: { creator: true, member: true }, creatorStatus: 'approved' });
    });

    it('then merges cleanly into the Google account, creator profile and all', async () => {
        await call(handleAdminCreatorLink, { creatorId: FORM, uid: PHONE_UID });
        const res = await call(handleAdminAccountMerge, { keepUid: GOOGLE, mergeUid: PHONE_UID, confirm: true });
        expect(res.statusCode).toBe(200);
        expect(db.dump('creators')[GOOGLE]).toMatchObject({ uid: GOOGLE, creatorId: 'LEGACY1' });
    });

    it('refuses a profile another sign-in owns, or an account that already has one', async () => {
        await db.collection('creators').doc('owned').set({ uid: GOOGLE, name: 'x' });
        expect((await call(handleAdminCreatorLink, { creatorId: 'owned', uid: PHONE_UID })).body.code).toBe('owned');
        await db.collection('creators').doc(PHONE_UID).set({ uid: PHONE_UID });
        expect((await call(handleAdminCreatorLink, { creatorId: FORM, uid: PHONE_UID })).body.code).toBe('two_creators');
        expect(db.dump('creators')[FORM]).toBeTruthy();
    });
});

describe('admin-account-email', () => {
    it('puts an email on a phone account’s profile', async () => {
        const res = await call(handleAdminAccountEmail, { uid: PHONE_UID, email: 'New.One@Gmail.com' }, EDITOR);
        expect(res.statusCode).toBe(200);
        expect(db.dump('users')[PHONE_UID].email).toBe('new.one@gmail.com');
    });

    it('sends an email that’s on another account to the merge instead', async () => {
        const res = await call(handleAdminAccountEmail, { uid: PHONE_UID, email: EMAIL });
        expect(res.statusCode).toBe(409);
        expect(res.body).toMatchObject({ code: 'email_taken', otherUid: GOOGLE });
        expect(db.dump('users')[PHONE_UID].email).toBe('');
    });

    it('never changes a sign-in email', async () => {
        const res = await call(handleAdminAccountEmail, { uid: GOOGLE, email: 'other@gmail.com' });
        expect(res.body.code).toBe('sign_in_email');
    });
});
