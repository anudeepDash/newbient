import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FakeFirestore, fakeReq, fakeRes } from './helpers/fakeFirestore.js';
import { handleOtpAction } from '../api/_lib/phoneOtp.js';

const PHONE = '+919876543210';
const ME = { uid: 'u-me' };

let db;
let clock;
let sent;
let sendResult;
let authUsers; // phone → uid

const adminAuth = {
    getUserByPhoneNumber: async (phone) => {
        if (!authUsers[phone]) throw Object.assign(new Error('nope'), { code: 'auth/user-not-found' });
        return { uid: authUsers[phone], phoneNumber: phone };
    },
    createUser: async ({ phoneNumber }) => { authUsers[phoneNumber] = 'u-new'; return { uid: 'u-new' }; },
    updateUser: async (uid, { phoneNumber }) => { authUsers[phoneNumber] = uid; },
    createCustomToken: async (uid) => `token-for-${uid}`,
};

const call = async (action, { token = null, body = {}, canSign = true, ip } = {}) => {
    const res = fakeRes();
    await handleOtpAction(action, fakeReq({ body, ip }), res, {
        decodedToken: token, db, adminAuth, canSign, now: () => clock,
        send: async (args) => { sent.push(args); return sendResult; },
    });
    return res;
};

const lastCode = () => sent.at(-1).bodyParams[0];

const ENV = { WHATSAPP_ACCESS_TOKEN: 't', WHATSAPP_PHONE_NUMBER_ID: '1', WHATSAPP_TEMPLATE_NEWBI_OTP: 'newbi_otp', LINK_SIGNING_SECRET: 'test-secret' };
const saved = {};

beforeEach(() => {
    clock = 5_000_000;
    sent = [];
    sendResult = { ok: true, status: 'sent', messageId: 'wamid.1' };
    authUsers = {};
    db = new FakeFirestore({});
    Object.entries(ENV).forEach(([k, v]) => { saved[k] = process.env[k]; process.env[k] = v; });
});

afterEach(() => {
    Object.keys(ENV).forEach((k) => { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; });
});

describe('WhatsApp phone codes', () => {
    it('sends a 6-digit code with a copy button and keeps only a hash of it', async () => {
        const res = await call('otp-send', { body: { phone: '98765 43210', purpose: 'login' } });
        expect(res.statusCode).toBe(200);
        expect(res.body).toMatchObject({ success: true, channel: 'whatsapp' });
        const msg = sent[0];
        expect(msg).toMatchObject({ to: PHONE, template: 'newbi_otp', autoRetry: false });
        expect(lastCode()).toMatch(/^\d{6}$/);
        expect(msg.buttons).toEqual([{ index: 0, param: lastCode() }]);
        expect(JSON.stringify(db.dump('otp_codes'))).not.toContain(lastCode());
    });

    it('signs in with the number, creating the account the first time', async () => {
        await call('otp-send', { body: { phone: PHONE, purpose: 'login' } });
        const res = await call('otp-verify', { body: { phone: PHONE, code: lastCode(), purpose: 'login' } });
        expect(res.statusCode).toBe(200);
        expect(res.body.token).toBe('token-for-u-new');

        // An existing account signs in as itself; a code works only once.
        authUsers[PHONE] = 'u-old';
        clock += 31_000;
        await call('otp-send', { body: { phone: PHONE, purpose: 'login' } });
        const code = lastCode();
        expect((await call('otp-verify', { body: { phone: PHONE, code, purpose: 'login' } })).body.token).toBe('token-for-u-old');
        expect((await call('otp-verify', { body: { phone: PHONE, code, purpose: 'login' } })).body.code).toBe('code_expired');
    });

    it('locks the code after 5 wrong tries and expires it after 10 minutes', async () => {
        await call('otp-send', { body: { phone: PHONE, purpose: 'login' } });
        const right = lastCode();
        const wrong = right === '000000' ? '111111' : '000000';
        for (let i = 0; i < 4; i += 1) expect((await call('otp-verify', { body: { phone: PHONE, code: wrong, purpose: 'login' } })).body.code).toBe('wrong_code');
        expect((await call('otp-verify', { body: { phone: PHONE, code: wrong, purpose: 'login' } })).body.code).toBe('too_many_attempts');
        expect((await call('otp-verify', { body: { phone: PHONE, code: right, purpose: 'login' } })).statusCode).toBe(429);

        clock += 31_000;
        await call('otp-send', { body: { phone: PHONE, purpose: 'login' } });
        const later = lastCode();
        clock += 10 * 60_000 + 1;
        expect((await call('otp-verify', { body: { phone: PHONE, code: later, purpose: 'login' } })).body.code).toBe('code_expired');
    });

    it('limits resends per number and per IP', async () => {
        expect((await call('otp-send', { body: { phone: PHONE, purpose: 'login' } })).statusCode).toBe(200);
        expect((await call('otp-send', { body: { phone: PHONE, purpose: 'login' } })).body.code).toBe('cooldown');
        for (let i = 0; i < 4; i += 1) { clock += 31_000; await call('otp-send', { body: { phone: PHONE, purpose: 'login' } }); }
        clock += 31_000;
        expect((await call('otp-send', { body: { phone: PHONE, purpose: 'login' } })).body.code).toBe('rate_limited');

        const many = [];
        for (let i = 0; i < 16; i += 1) many.push((await call('otp-send', { body: { phone: `+9198765000${String(i).padStart(2, '0')}`, purpose: 'login' }, ip: '198.51.100.9' })).statusCode);
        expect(many.slice(0, 15).every(s => s === 200)).toBe(true);
        expect(many[15]).toBe(429);
    });

    it('puts a verified number on the signed-in account', async () => {
        expect((await call('otp-send', { body: { phone: PHONE, purpose: 'verify' } })).statusCode).toBe(401);
        await call('otp-send', { token: ME, body: { phone: PHONE, purpose: 'verify' } });
        // Someone else's code session can't be used.
        expect((await call('otp-verify', { token: { uid: 'u-other' }, body: { phone: PHONE, code: lastCode(), purpose: 'verify' } })).body.code).toBe('code_expired');
        const res = await call('otp-verify', { token: ME, body: { phone: PHONE, code: lastCode(), purpose: 'verify' } });
        expect(res.body).toMatchObject({ success: true, verified: true, phone: PHONE });
        expect(authUsers[PHONE]).toBe('u-me');
    });

    it('offers the merge when the number signs in to another account', async () => {
        authUsers[PHONE] = 'u-other';
        await call('otp-send', { token: ME, body: { phone: PHONE, purpose: 'verify' } });
        const res = await call('otp-verify', { token: ME, body: { phone: PHONE, code: lastCode(), purpose: 'verify' } });
        expect(res.body).toMatchObject({ success: true, conflict: true, proofToken: 'token-for-u-other' });
        expect(authUsers[PHONE]).toBe('u-other');
    });

    it('never signs in to a blocked or merged-away account', async () => {
        authUsers[PHONE] = 'u-blocked';
        db.store.set('users/u-blocked', { isBlocked: true });
        await call('otp-send', { body: { phone: PHONE, purpose: 'login' } });
        expect((await call('otp-verify', { body: { phone: PHONE, code: lastCode(), purpose: 'login' } })).statusCode).toBe(403);
    });

    it('tells the app to use SMS when WhatsApp can’t carry the code', async () => {
        delete process.env.WHATSAPP_TEMPLATE_NEWBI_OTP;
        expect((await call('otp-send', { body: { phone: PHONE, purpose: 'login' } })).body.code).toBe('whatsapp_unavailable');
        process.env.WHATSAPP_TEMPLATE_NEWBI_OTP = 'newbi_otp';
        expect((await call('otp-send', { body: { phone: PHONE }, canSign: false })).body.code).toBe('whatsapp_unavailable');

        sendResult = { ok: false, status: 'failed', errorCode: 131026 };
        const res = await call('otp-send', { body: { phone: PHONE, purpose: 'login' } });
        expect(res.body.code).toBe('not_on_whatsapp');
        // The failed code is gone, so the SMS fallback isn't blocked by a cooldown here.
        expect(Object.keys(db.dump('otp_codes'))).toHaveLength(0);
    });
});
