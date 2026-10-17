import { describe, it, expect, beforeEach } from 'vitest';
import { FakeFirestore, fakeReq, fakeRes } from './helpers/fakeFirestore.js';
import { handlePhoneProof } from '../api/_lib/creatorApp.js';

const UID = 'u-email-account';
const now = () => Math.floor(Date.now() / 1000);
const phoneToken = (over = {}) => ({ uid: 'u-phone-account', phone_number: '+919876543210', auth_time: now(), firebase: { sign_in_provider: 'phone' }, ...over });
let db;

const call = async (proof, body = { proofToken: 'proof' }) => {
    const res = fakeRes();
    await handlePhoneProof(fakeReq({ body }), res, { db, token: { uid: UID }, verifyProof: async () => { if (proof instanceof Error) throw proof; return proof; } });
    return res;
};

beforeEach(() => { db = new FakeFirestore({ [`users/${UID}`]: { name: 'Riya', email: 'riya@example.com' } }); });

describe('phone-proof', () => {
    it('marks the proven number verified on the caller’s own profile', async () => {
        const res = await call(phoneToken());
        expect(res.statusCode).toBe(200);
        expect(db.dump('users')[UID]).toMatchObject({ name: 'Riya', phone: '+919876543210', phoneVerified: true, isPhoneVerified: true, phoneSignInAccount: 'u-phone-account' });
    });

    it('refuses a proof that isn’t a phone sign-in', async () => {
        const res = await call(phoneToken({ firebase: { sign_in_provider: 'password' } }));
        expect(res.statusCode).toBe(400);
        expect(db.dump('users')[UID].phoneVerified).toBeUndefined();
    });

    it('refuses an old proof', async () => {
        const res = await call(phoneToken({ auth_time: now() - 3600 }));
        expect(res.statusCode).toBe(400);
    });

    it('refuses a token that doesn’t verify, or none', async () => {
        expect((await call(new Error('bad'))).statusCode).toBe(400);
        expect((await call(phoneToken(), {})).statusCode).toBe(400);
    });
});
