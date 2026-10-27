import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FakeFirestore, fakeReq, fakeRes } from './helpers/fakeFirestore.js';
import { handleWaVerifyAction, onVerifyMessage, REPLIES, loginMessageText } from '../api/_lib/waVerify.js';
import { resetBusinessNumberForTests } from '../api/_lib/whatsapp.js';

const ME = { uid: 'u-me' };
const FROM = '919876543210';
const PHONE = `+${FROM}`;

let db;
let clock;
let replies;
let authUsers; // phone → uid

const adminAuth = {
    getUserByPhoneNumber: async (phone) => {
        if (!authUsers[phone]) throw Object.assign(new Error('nope'), { code: 'auth/user-not-found' });
        return { uid: authUsers[phone], phoneNumber: phone };
    },
    updateUser: async (uid, { phoneNumber }) => { authUsers[phoneNumber] = uid; },
    createCustomToken: async (uid) => `token-for-${uid}`,
    createUser: async ({ phoneNumber }) => { authUsers[phoneNumber] = 'u-new'; return { uid: 'u-new', phoneNumber }; },
};

const call = async (action, { token = ME, body = {}, canSign = true } = {}) => {
    const res = fakeRes();
    await handleWaVerifyAction(action, fakeReq({ body }), res, { decodedToken: token, db, adminAuth, canSign, now: () => clock });
    return res;
};

const message = (text, from = FROM) => onVerifyMessage({ type: 'text', from, text: { body: text } }, {
    db, adminAuth, now: () => clock, reply: async (r) => { replies.push(r); return { ok: true }; },
});

const start = async () => (await call('wa-verify-start')).body;

const ENV = { WHATSAPP_ACCESS_TOKEN: 't', WHATSAPP_PHONE_NUMBER_ID: '1', WHATSAPP_DISPLAY_NUMBER: '+91 80000 12345', LINK_SIGNING_SECRET: 'test-secret', WHATSAPP_PHONE_VERIFY: 'on' };
const saved = {};

beforeEach(() => {
    clock = 5_000_000;
    replies = [];
    authUsers = {};
    db = new FakeFirestore({});
    Object.entries(ENV).forEach(([k, v]) => { saved[k] = process.env[k]; process.env[k] = v; });
    resetBusinessNumberForTests();
});

afterEach(() => {
    Object.keys(ENV).forEach((k) => { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; });
});

describe('verify by messaging us', () => {
    it('stays off until WHATSAPP_PHONE_VERIFY is on', async () => {
        process.env.WHATSAPP_PHONE_VERIFY = '';
        const res = fakeRes();
        await handleWaVerifyAction('wa-verify-start', fakeReq({ body: {} }), res, { db, decodedToken: { uid: 'u1' }, adminAuth: {}, canSign: () => true });
        expect(res.statusCode).toBe(503);
        expect(db.dump('wa_verify')).toEqual({});
    });

    it('gives a one-use code and a wa.me link to our number with the message typed, keeping only a hash', async () => {
        const out = await start();
        expect(out.code).toMatch(/^NEWBI-[A-HJ-NP-Z2-9]{6}$/);
        expect(out.link).toBe(`https://wa.me/918000012345?text=${encodeURIComponent(`Verify my number for Newbi: ${out.code}`)}`);
        expect(JSON.stringify(db.dump('wa_verify'))).not.toContain(out.code);
        expect((await call('wa-verify-status', { body: { code: out.code } })).body.state).toBe('waiting');
    });

    it('needs a signed-in account', async () => {
        expect((await call('wa-verify-start', { token: null })).statusCode).toBe(401);
    });

    it('confirms the number the message came from, puts it on the account and answers in the chat', async () => {
        const { code } = await start();
        expect(await message(`Verify my number for Newbi: ${code}`)).toBe(true);
        expect(authUsers[PHONE]).toBe('u-me');
        expect(replies).toEqual([{ to: PHONE, text: REPLIES.verified, event: 'wa-verify' }]);
        const status = await call('wa-verify-status', { body: { code } });
        expect(status.body).toMatchObject({ state: 'verified', phone: PHONE });
    });

    it('reads the code even if they edit the message or change its case', async () => {
        const { code } = await start();
        await message(`hi! ${code.toLowerCase()} thanks`);
        expect(authUsers[PHONE]).toBe('u-me');
    });

    it('uses a code once: a second number gets "expired" and nothing changes', async () => {
        const { code } = await start();
        await message(code);
        await message(code, '919999900000');
        expect(authUsers['+919999900000']).toBeUndefined();
        expect(replies.at(-1).text).toBe(REPLIES.expired);
    });

    it('lets the code run out', async () => {
        const { code } = await start();
        clock += 16 * 60 * 1000;
        await message(code);
        expect(authUsers[PHONE]).toBeUndefined();
        expect(replies[0].text).toBe(REPLIES.expired);
        expect((await call('wa-verify-status', { body: { code } })).body.state).toBe('expired');
    });

    it('hands back a sign-in to the other account when the number is already on one, for the merge offer', async () => {
        authUsers[PHONE] = 'u-other';
        const { code } = await start();
        await message(code);
        expect(replies[0].text).toBe(REPLIES.conflict);
        expect(authUsers[PHONE]).toBe('u-other');
        const status = await call('wa-verify-status', { body: { code } });
        expect(status.body).toMatchObject({ state: 'conflict', phone: PHONE, proofToken: 'token-for-u-other' });
    });

    it('won’t offer to merge an account that can’t sign in', async () => {
        authUsers[PHONE] = 'u-blocked';
        db.store.set('users/u-blocked', { isBlocked: true });
        const { code } = await start();
        await message(code);
        expect(replies[0].text).toBe(REPLIES.taken);
        expect((await call('wa-verify-status', { body: { code } })).body.state).toBe('taken');
    });

    it('never shows someone else’s code result', async () => {
        const { code } = await start();
        await message(code);
        expect((await call('wa-verify-status', { token: { uid: 'u-snoop' }, body: { code } })).body).toEqual({ success: true, state: 'expired' });
    });

    it('ignores messages without a code, so they reach the inbox as usual', async () => {
        expect(await message('Hi, is the guestlist open?')).toBe(false);
        expect(await onVerifyMessage({ type: 'image', from: FROM }, { db, adminAuth })).toBe(false);
        expect(replies).toHaveLength(0);
    });

    it('limits how often an account can start', async () => {
        await start();
        expect((await call('wa-verify-start')).body.code).toBe('cooldown');
        for (let i = 0; i < 5; i++) { clock += 31_000; await start(); }
        clock += 31_000;
        expect((await call('wa-verify-start')).body.code).toBe('rate_limited');
    });

    it('says WhatsApp is unavailable when we have no number to send them to', async () => {
        delete process.env.WHATSAPP_DISPLAY_NUMBER;
        delete process.env.WHATSAPP_ACCESS_TOKEN;
        const res = await call('wa-verify-start');
        expect(res.statusCode).toBe(503);
        expect(res.body.code).toBe('whatsapp_unavailable');
    });
});

describe('sign in by messaging us', () => {
    const login = async (body = {}, ip) => {
        const res = fakeRes();
        await handleWaVerifyAction('wa-login-start', fakeReq({ body, ip }), res, { decodedToken: null, db, adminAuth, canSign: true, now: () => clock });
        return res;
    };
    const status = (body) => call('wa-login-status', { token: null, body });

    it('works signed out and types a sign-in message', async () => {
        const res = await login();
        expect(res.statusCode).toBe(200);
        expect(res.body.pollKey).toBeTruthy();
        expect(decodeURIComponent(res.body.link)).toContain(loginMessageText(res.body.code));
    });

    it('signs in to the account with the number messaged from, once', async () => {
        authUsers[PHONE] = 'u-existing';
        const { code, pollKey } = (await login()).body;
        expect((await status({ code, pollKey })).body.state).toBe('waiting');
        await message(loginMessageText(code));
        expect(replies[0].text).toBe(REPLIES.signedIn);
        const done = (await status({ code, pollKey })).body;
        expect(done).toMatchObject({ state: 'verified', phone: PHONE, token: 'token-for-u-existing' });
        expect((await status({ code, pollKey })).body.state).toBe('expired');
    });

    it('creates the account when the number has none', async () => {
        const { code, pollKey } = (await login()).body;
        await message(loginMessageText(code));
        expect((await status({ code, pollKey })).body.token).toBe('token-for-u-new');
    });

    it('never hands the sign-in to someone with only the code', async () => {
        const { code } = (await login()).body;
        await message(loginMessageText(code));
        expect((await status({ code, pollKey: 'guess' })).body.state).toBe('expired');
        expect((await status({ code })).statusCode).toBe(400);
    });

    it('a blocked account can’t sign in this way', async () => {
        authUsers[PHONE] = 'u-blocked';
        db.store.set('users/u-blocked', { isBlocked: true });
        const { code, pollKey } = (await login()).body;
        await message(loginMessageText(code));
        expect(replies[0].text).toBe(REPLIES.loginTaken);
        expect((await status({ code, pollKey })).body).toMatchObject({ state: 'taken' });
    });

    it('expires after 10 minutes, even once confirmed', async () => {
        const { code, pollKey } = (await login()).body;
        await message(loginMessageText(code));
        clock += 10 * 60 * 1000 + 1;
        expect((await status({ code, pollKey })).body.state).toBe('expired');
    });

    it('a sign-in code can’t be read as a verify code, or the other way round', async () => {
        const { code } = (await login()).body;
        expect((await call('wa-verify-status', { body: { code } })).body.state).toBe('expired');
        const verify = await start();
        expect((await status({ code: verify.code, pollKey: 'x' })).body.state).toBe('expired');
    });

    it('limits starts per IP', async () => {
        for (let i = 0; i < 30; i += 1) expect((await login({}, '198.51.100.9')).statusCode).toBe(200);
        expect((await login({}, '198.51.100.9')).statusCode).toBe(429);
        expect((await login({}, '198.51.100.10')).statusCode).toBe(200);
    });

    it('stays off until WHATSAPP_PHONE_VERIFY is on', async () => {
        process.env.WHATSAPP_PHONE_VERIFY = '';
        expect((await login()).statusCode).toBe(503);
    });
});
