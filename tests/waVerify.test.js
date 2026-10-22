import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FakeFirestore, fakeReq, fakeRes } from './helpers/fakeFirestore.js';
import { handleWaVerifyAction, onVerifyMessage, REPLIES } from '../api/_lib/waVerify.js';
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
