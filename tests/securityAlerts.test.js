import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FakeFirestore, fakeReq, fakeRes } from './helpers/fakeFirestore.js';
import { setDbForTests } from '../api/_lib/db.js';
import { setWhatsAppFetchForTests } from '../api/_lib/whatsapp.js';
import { handleSignInSeen, tellPhoneChanged, tellAccountsMerged, deviceLabel, movedSummary } from '../api/_lib/securityAlerts.js';

const ANDROID_CHROME = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36';
const IPHONE_SAFARI = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const NOW = Date.parse('2026-10-23T16:12:00Z'); // 9:42 PM IST

let db;
let sent;
const templates = () => sent.map(m => m.template.name);
const bodyOf = (m) => m.template.components.find(c => c.type === 'body').parameters.map(p => p.text);
const adminAuth = { getUser: async (uid) => ({ uid, phoneNumber: uid === 'u1' ? '+919876500001' : null }) };

const seen = async ({ device = 'device-aaaa-1111', authTime = NOW / 1000 - 30, ua = ANDROID_CHROME, uid = 'u1' } = {}) => {
    const res = fakeRes();
    const req = fakeReq({ body: { device } });
    Object.assign(req.headers, { 'user-agent': ua, 'x-vercel-ip-city': 'Pune' });
    await handleSignInSeen(req, res, {
        db, token: { uid, auth_time: authTime }, adminAuth, now: () => NOW,
    });
    return res;
};

beforeEach(() => {
    vi.stubEnv('WHATSAPP_ACCESS_TOKEN', 'test-token');
    vi.stubEnv('WHATSAPP_PHONE_NUMBER_ID', '123');
    vi.stubEnv('LINK_SIGNING_SECRET', 'test-secret');
    ['NEW_SIGN_IN', 'PHONE_NUMBER_CHANGED', 'ACCOUNTS_MERGED'].forEach(n => vi.stubEnv(`WHATSAPP_TEMPLATE_${n}`, n.toLowerCase()));
    db = new FakeFirestore({
        'users/u1': { name: 'Riya Sharma', phone: '+919876500001', phoneVerified: true },
        'users/u2': { name: 'Arjun K', phone: '+919876500002', phoneVerified: false },
    });
    setDbForTests(db);
    sent = [];
    setWhatsAppFetchForTests(async (url, init) => {
        sent.push(JSON.parse(init.body));
        return { ok: true, status: 200, json: async () => ({ messages: [{ id: `wamid.${sent.length}` }] }) };
    });
});

afterEach(() => {
    vi.unstubAllEnvs();
    setDbForTests(null);
    setWhatsAppFetchForTests(null);
});

describe('new sign-in', () => {
    it('remembers the first device quietly, then alerts a new one once', async () => {
        expect((await seen()).body).toMatchObject({ alerted: false });
        expect(sent).toHaveLength(0);
        expect((await seen()).body).toMatchObject({ alerted: false });

        const res = await seen({ device: 'device-bbbb-2222', ua: IPHONE_SAFARI });
        expect(res.body).toMatchObject({ alerted: true });
        expect(templates()).toEqual(['new_sign_in']);
        expect(bodyOf(sent[0])).toEqual(['Riya', 'Safari on iPhone, Pune', '23 Oct, 9:42 PM']);

        // The same sign-in reported again, or the device signing in later, stays quiet.
        await seen({ device: 'device-bbbb-2222', ua: IPHONE_SAFARI });
        await seen({ device: 'device-bbbb-2222', ua: IPHONE_SAFARI, authTime: NOW / 1000 - 10 });
        expect(sent).toHaveLength(1);
        // Only a hash of the device id is kept.
        expect(JSON.stringify(db.store.get('users/u1'))).not.toContain('device-bbbb-2222');
    });

    it('ignores a session coming back (an old sign-in time)', async () => {
        await seen();
        const res = await seen({ device: 'device-cccc-3333', authTime: NOW / 1000 - 3600 });
        expect(res.body).toMatchObject({ fresh: false });
        expect(sent).toHaveLength(0);
    });

    it('never alerts an unverified number', async () => {
        await seen({ uid: 'u2' });
        const res = await seen({ uid: 'u2', device: 'device-dddd-4444' });
        expect(res.body).toMatchObject({ alerted: false });
        expect(sent).toHaveLength(0);
    });

    it('stays quiet until the template is approved', async () => {
        vi.stubEnv('WHATSAPP_TEMPLATE_NEW_SIGN_IN', '');
        await seen();
        await seen({ device: 'device-eeee-5555' });
        expect(sent).toHaveLength(0);
    });

    it('needs a device id and a signed-in account', async () => {
        expect((await seen({ device: 'x' })).statusCode).toBe(400);
        const res = fakeRes();
        await handleSignInSeen(fakeReq({ body: { device: 'device-aaaa-1111' } }), res, { db, token: null });
        expect(res.statusCode).toBe(401);
    });
});

describe('phone number changed', () => {
    it('tells the old number, with the last digits of the new one', async () => {
        await tellPhoneChanged({ uid: 'u1', user: { name: 'Riya Sharma' }, oldPhone: '+919876500001', newPhone: '+919811114321', now: () => NOW });
        expect(templates()).toEqual(['phone_number_changed']);
        expect(sent[0].to).toBe('919876500001');
        expect(bodyOf(sent[0])).toEqual(['Riya', '4321', '23 Oct, 9:42 PM']);
    });

    it('does nothing when the number didn’t change', async () => {
        await tellPhoneChanged({ uid: 'u1', user: {}, oldPhone: '+919876500001', newPhone: '9876500001' });
        expect(sent).toHaveLength(0);
    });
});

describe('accounts merged', () => {
    it('tells the kept account’s verified number what came in', async () => {
        await tellAccountsMerged({ db, adminAuth, toUid: 'u1', mergedIn: 'r•••••@example.com', moved: { passes: 3, creator: true, ticketOrders: 0 } });
        expect(templates()).toEqual(['accounts_merged']);
        expect(bodyOf(sent[0])).toEqual(['Riya', 'r•••••@example.com', '3 passes and your creator profile']);
    });

    it('skips an account with no verified number', async () => {
        await tellAccountsMerged({ db, adminAuth, toUid: 'u2', mergedIn: 'x', moved: {} });
        expect(sent).toHaveLength(0);
    });
});

describe('labels', () => {
    it('names the browser and system, plus the city when known', () => {
        expect(deviceLabel(ANDROID_CHROME, 'Navi%20Mumbai')).toBe('Chrome on Android, Navi Mumbai');
        expect(deviceLabel('curl/8.0')).toBe('A browser');
    });

    it('summarises what moved', () => {
        expect(movedSummary({})).toBe('Your sign-in details');
        expect(movedSummary({ passes: 1, ticketOrders: 2, guestlistEntries: 1 })).toBe('1 pass, 2 ticket orders and 1 guestlist sign-up');
    });
});
