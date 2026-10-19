import { describe, it, expect, beforeEach } from 'vitest';
import { FakeFirestore, fakeReq, fakeRes } from './helpers/fakeFirestore.js';
import { handleProfilePhone } from '../api/_lib/creatorApp.js';

const UID = 'u-riya';
const token = { uid: UID, email: 'riya@example.com' };
let db;

// The Firebase Auth record: the phone on it is the one an OTP proved.
const authWith = (phoneNumber) => ({ getUser: async () => ({ uid: UID, phoneNumber }) });

const run = async (body, adminAuth) => {
    const res = fakeRes();
    await handleProfilePhone(fakeReq({ body }), res, { db, token, adminAuth });
    return res;
};

beforeEach(() => {
    db = new FakeFirestore({ [`users/${UID}`]: { name: 'Riya' } });
});

describe('profile-phone', () => {
    it('marks the number on the sign-in account verified', async () => {
        const res = await run({ phone: '98765 43210' }, authWith('+919876543210'));
        expect(res.statusCode).toBe(200);
        expect(res.body).toMatchObject({ phone: '+919876543210', verified: true });
        expect(db.dump('users')[UID]).toMatchObject({ phone: '+919876543210', phoneNumber: '+919876543210', phoneVerified: true, isPhoneVerified: true });
    });

    it('uses the account number when no phone is sent', async () => {
        const res = await run({}, authWith('+919876543210'));
        expect(res.body).toMatchObject({ phone: '+919876543210', verified: true });
    });

    it('saves any other number as unverified, dropping the old verification', async () => {
        db = new FakeFirestore({ [`users/${UID}`]: { phone: '+919876543210', phoneVerified: true, isPhoneVerified: true } });
        const res = await run({ phone: '+919811111111' }, authWith('+919876543210'));
        expect(res.body).toMatchObject({ phone: '+919811111111', verified: false });
        expect(db.dump('users')[UID]).toMatchObject({ phone: '+919811111111', phoneVerified: false, isPhoneVerified: false });
    });

    it('never verifies a number for an account without one', async () => {
        const res = await run({ phone: '+919876543210' }, authWith(undefined));
        expect(res.body).toMatchObject({ verified: false });
        expect(db.dump('users')[UID].phoneVerified).toBe(false);
    });

    it('keeps a verification the server already recorded (account merge)', async () => {
        db = new FakeFirestore({ [`users/${UID}`]: { phone: '+919811111111', phoneVerified: true, phoneVerifiedAt: 'then' } });
        const res = await run({ phone: '+919811111111' }, authWith('+919876543210'));
        expect(res.body).toMatchObject({ phone: '+919811111111', verified: true, updated: [] });
        expect(db.dump('users')[UID].phoneVerifiedAt).toBe('then');
    });

    it('asks for verification when there is nothing to save', async () => {
        const res = await run({}, authWith(undefined));
        expect(res.statusCode).toBe(409);
    });

    it('turns away a malformed number', async () => {
        const res = await run({ phone: '12' }, authWith('+919876543210'));
        expect(res.statusCode).toBe(400);
    });
});
