import { describe, it, expect, beforeEach } from 'vitest';
import { FakeFirestore, fakeReq, fakeRes } from './helpers/fakeFirestore.js';
import { handleAccountMatches, handleAccountMerge } from '../api/_lib/creatorApp.js';
import { maskEmail, maskPhone } from '../api/_lib/accountMerge.js';

const TO = 'u-google';
const FROM = 'u-phone';
const PHONE = '+919876543210';
const now = () => Math.floor(Date.now() / 1000);

/* Firebase Auth, the bits the merge uses. */
const fakeAuth = (users) => {
    const map = new Map(users.map(u => [u.uid, { providerData: [], ...u }]));
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

let db;
let adminAuth;

const proofFor = (uid, over = {}) => ({ uid, auth_time: now(), firebase: { sign_in_provider: 'phone' }, ...over });

const merge = async (body, proof = proofFor(FROM)) => {
    const res = fakeRes();
    await handleAccountMerge(fakeReq({ body: { proofToken: 'proof', ...body } }), res, {
        db, adminAuth, token: { uid: TO, email: 'riya@gmail.com' },
        verifyProof: async () => { if (proof instanceof Error) throw proof; return proof; },
    });
    return res;
};

beforeEach(() => {
    db = new FakeFirestore({
        [`users/${TO}`]: { name: 'Riya Sen', email: 'riya@gmail.com', createdAt: '2026-09-01T00:00:00.000Z' },
        [`users/${FROM}`]: { name: 'Riya', city: 'Bengaluru', phone: PHONE, phoneVerified: true, interests: ['music'], createdAt: '2026-03-01T00:00:00.000Z', role: undefined },
        'passes/NB-1': { holderUid: FROM, holderName: 'Riya', source: 'guestlist', sourceId: 'g1' },
        [`pass_keys/guestlist_g1_${FROM}`]: { ref: 'NB-1', uid: FROM, source: 'guestlist', sourceId: 'g1' },
        'guestlists/g1': { name: 'Friday' },
        'guestlists/g1/entries/e1': { userId: FROM, name: 'Riya' },
        'ticket_orders/o1': { userId: FROM, customerEmail: '' },
        [`giveaway_entries/gw1_${FROM}`]: { userId: FROM, campaignId: 'gw1', referralCode: 'u-phone' },
        [`giveaway_entries/gw2_${FROM}`]: { userId: FROM, campaignId: 'gw2' },
        [`giveaway_entries/gw2_${TO}`]: { userId: TO, campaignId: 'gw2' },
        'notifications/n1': { userId: FROM, title: 'Hi' },
        [`creators/${FROM}`]: { uid: FROM, creatorId: 'U-PHONE', name: 'Riya', igUserId: 'ig9' },
        'creators/other': { uid: 'someone', referredBy: FROM },
        'instagram_owners/ig9': { uid: FROM },
        [`private/instagram_tokens/users/${FROM}`]: { token: 't', igUserId: 'ig9' },
        'campaigns/c1': { title: 'Launch', tasks: [{ id: 't1', submissions: { [FROM]: { link: 'x' } }, completedBy: [FROM] }] },
        [`campaigns/c1/submissions/${FROM}`]: { uid: FROM, creatorDocId: FROM, status: 'approved' },
    });
    adminAuth = fakeAuth([
        { uid: TO, email: 'riya@gmail.com', providerData: [{ providerId: 'google.com', email: 'riya@gmail.com' }] },
        { uid: FROM, phoneNumber: PHONE, providerData: [{ providerId: 'phone' }] },
    ]);
});

describe('account-matches', () => {
    it('finds the other account by your verified phone and shows only masked hints', async () => {
        await db.collection('users').doc(TO).set({ phone: PHONE, phoneVerified: true }, { merge: true });
        const res = fakeRes();
        await handleAccountMatches(fakeReq({ body: {} }), res, { db, adminAuth, token: { uid: TO, email: 'riya@gmail.com' } });
        expect(res.body.matches).toHaveLength(1);
        expect(res.body.matches[0]).toMatchObject({ uid: FROM, name: 'Riya', matchedBy: ['phone'], phoneIsYours: true, methods: { phone: maskPhone(PHONE), google: null } });
        expect(JSON.stringify(res.body)).not.toContain('9876543210');
    });

    it('finds an account by an email typed into the profile', async () => {
        const res = fakeRes();
        await handleAccountMatches(fakeReq({ body: { email: 'Riya@Gmail.com' } }), res, { db, adminAuth, token: { uid: FROM, phone_number: PHONE } });
        expect(res.body.matches.map(m => m.uid)).toEqual([TO]);
        expect(res.body.matches[0].methods.google).toBe(maskEmail('riya@gmail.com'));
    });

    it('skips merged accounts and accounts nothing signs in to', async () => {
        await db.collection('users').doc(TO).set({ phone: PHONE, phoneVerified: true }, { merge: true });
        adminAuth.map.delete(FROM);
        const res = fakeRes();
        await handleAccountMatches(fakeReq({ body: {} }), res, { db, adminAuth, token: { uid: TO } });
        expect(res.body.matches).toEqual([]);
    });
});

describe('account-merge', () => {
    it('previews what moves without changing anything', async () => {
        const res = await merge({});
        expect(res.statusCode).toBe(200);
        expect(res.body.preview).toMatchObject({ name: 'Riya', phone: PHONE, holds: { passes: 1, ticketOrders: 1, giveawayEntries: 2, creatorProfile: true } });
        expect(db.dump('passes')['NB-1'].holderUid).toBe(FROM);
        expect(adminAuth.map.has(FROM)).toBe(true);
    });

    it('moves everything onto the signed-in account and deletes the other sign-in', async () => {
        const res = await merge({ confirm: true });
        expect(res.statusCode).toBe(200);
        expect(res.body.phoneLinked).toBe(true);

        const users = db.dump('users');
        expect(users[TO]).toMatchObject({ name: 'Riya Sen', city: 'Bengaluru', phone: PHONE, phoneVerified: true, email: 'riya@gmail.com', createdAt: '2026-03-01T00:00:00.000Z', capabilities: { creator: true } });
        expect(users[TO].mergingFrom).toBeUndefined();
        expect(users[TO].mergedAccounts.map(m => m.uid)).toEqual([FROM]);
        expect(users[FROM]).toEqual({ mergedInto: TO, mergedAt: expect.any(String) });

        expect(db.dump('passes')['NB-1'].holderUid).toBe(TO);
        expect(db.dump('pass_keys')).toEqual({ [`guestlist_g1_${TO}`]: expect.objectContaining({ uid: TO, ref: 'NB-1' }) });
        expect(db.dump('guestlists/g1/entries').e1.userId).toBe(TO);
        expect(db.dump('ticket_orders').o1.userId).toBe(TO);
        expect(db.dump('notifications').n1.userId).toBe(TO);

        const entries = db.dump('giveaway_entries');
        expect(entries[`gw1_${TO}`]).toMatchObject({ userId: TO, referralCode: 'u-phone' });
        expect(entries[`gw1_${FROM}`]).toBeUndefined();
        // Both had entered gw2: the signed-in account's stays, the other is kept beside it.
        expect(entries[`gw2_${TO}`].mergedFrom).toBeUndefined();
        expect(entries[`gw2_${FROM}`]).toMatchObject({ userId: TO, mergedFrom: FROM });

        const creators = db.dump('creators');
        expect(creators[TO]).toMatchObject({ uid: TO, creatorId: 'U-PHONE', legacyIds: [FROM] });
        expect(creators[FROM]).toBeUndefined();
        expect(creators.other.referredBy).toBe(TO);
        expect(db.dump('instagram_owners').ig9.uid).toBe(TO);
        expect(db.dump('private/instagram_tokens/users')[TO]).toMatchObject({ token: 't' });
        expect(db.dump('campaigns/c1/submissions')[TO]).toMatchObject({ uid: TO, creatorDocId: TO, status: 'approved' });
        expect(db.dump('campaigns').c1.tasks[0]).toMatchObject({ submissions: { [TO]: { link: 'x' } }, completedBy: [TO] });

        expect(adminAuth.map.has(FROM)).toBe(false);
        expect(adminAuth.map.get(TO).phoneNumber).toBe(PHONE);
    });

    it('never copies a role or a block', async () => {
        await db.collection('users').doc(FROM).set({ forceLogoutBefore: 123 }, { merge: true });
        await merge({ confirm: true });
        const to = db.dump('users')[TO];
        expect(to.role).toBeUndefined();
        expect(to.forceLogoutBefore).toBeUndefined();
    });

    it('refuses a team account, a blocked one, or two creator profiles', async () => {
        await db.collection('users').doc(FROM).set({ role: 'editor' }, { merge: true });
        expect((await merge({ confirm: true })).body.code).toBe('staff');

        await db.collection('users').doc(FROM).set({ role: null, isBlocked: true }, { merge: true });
        expect((await merge({ confirm: true })).body.code).toBe('blocked');

        await db.collection('users').doc(FROM).set({ isBlocked: false }, { merge: true });
        await db.collection('creators').doc(TO).set({ uid: TO, creatorId: 'U-GOOGLE' });
        const res = await merge({ confirm: true });
        expect(res.statusCode).toBe(409);
        expect(res.body.code).toBe('two_creators');
        expect(db.dump('passes')['NB-1'].holderUid).toBe(FROM);
        expect(adminAuth.map.has(FROM)).toBe(true);
    });

    it('refuses an admin by email', async () => {
        await db.collection('admins').doc('a1').set({ email: 'ops@newbi.live' });
        adminAuth.map.set(FROM, { ...adminAuth.map.get(FROM), email: 'ops@newbi.live' });
        expect((await merge({ confirm: true })).body.code).toBe('staff');
    });

    it('needs a fresh sign-in to a different account', async () => {
        expect((await merge({ confirm: true }, proofFor(FROM, { auth_time: now() - 3600 }))).body.code).toBe('proof_expired');
        expect((await merge({ confirm: true }, proofFor(TO))).body.code).toBe('same_account');
        expect((await merge({ confirm: true }, new Error('bad'))).body.code).toBe('proof_expired');
        expect(db.dump('passes')['NB-1'].holderUid).toBe(FROM);
    });

    it('a merged account can’t be merged again', async () => {
        await merge({ confirm: true });
        adminAuth.map.set(FROM, { uid: FROM, providerData: [] });
        expect((await merge({ confirm: true })).body.code).toBe('already_merged');
    });
});
