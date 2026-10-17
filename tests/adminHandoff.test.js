import { describe, it, expect, beforeEach } from 'vitest';
import { FakeFirestore, fakeReq, fakeRes } from './helpers/fakeFirestore.js';
import { handleHandoffAction } from '../api/_lib/adminHandoff.js';

const STAFF = { uid: 'u-staff', email: 'ops@newbi.live', auth_time: 1_000 };
const MEMBER = { uid: 'u-member', email: 'fan@example.com', auth_time: 1_000 };

let db;
let clock;
const adminAuth = { createCustomToken: async (uid) => `custom-token-for-${uid}` };

const call = async (action, { token = null, body = {}, method = 'POST', canSign = true } = {}) => {
    const res = fakeRes();
    await handleHandoffAction(action, fakeReq({ method, body }), res, { decodedToken: token, db, adminAuth, canSign, now: () => clock });
    return res;
};

const createCode = async (token = STAFF) => (await call('admin-handoff-create', { token })).body.code;

beforeEach(() => {
    clock = 2_000_000;
    db = new FakeFirestore({
        'admins/a1': { email: 'ops@newbi.live', role: 'admin' },
        'admins/a2': { email: 'pending@newbi.live', role: 'unauthorized' },
        'users/u-staff': { email: 'ops@newbi.live' },
    });
});

describe('admin sign-in handoff', () => {
    it('lets staff hand their sign-in to the admin host once', async () => {
        const code = await createCode();
        expect(code).toMatch(/^[A-Za-z0-9_-]{40,}$/);
        // Only a hash is stored, never the code itself.
        expect(Object.keys(db.dump('authHandoffs'))).not.toContain(code);

        const first = await call('admin-handoff-redeem', { body: { code } });
        expect(first.statusCode).toBe(200);
        expect(first.body.token).toBe('custom-token-for-u-staff');

        const again = await call('admin-handoff-redeem', { body: { code } });
        expect(again.statusCode).toBe(400);
    });

    it('needs a signed-in staff member to create a code', async () => {
        expect((await call('admin-handoff-create')).statusCode).toBe(401);
        expect((await call('admin-handoff-create', { token: MEMBER })).statusCode).toBe(403);
        expect((await call('admin-handoff-create', { token: { uid: 'u-p', email: 'pending@newbi.live' } })).statusCode).toBe(403);
    });

    it('refuses blocked accounts and sign-ins older than a forced sign-out', async () => {
        db.store.set('users/u-staff', { isBlocked: true });
        expect((await call('admin-handoff-create', { token: STAFF })).statusCode).toBe(403);

        // STAFF signed in at 1,000s; the forced sign-out was at 2,000s.
        db.store.set('users/u-staff', { forceLogoutBefore: new Date(2_000_000).toISOString() });
        expect((await call('admin-handoff-create', { token: STAFF })).statusCode).toBe(403);
        expect((await call('admin-handoff-create', { token: { ...STAFF, auth_time: 3_000 } })).statusCode).toBe(200);
    });

    it('expires codes after a minute', async () => {
        const code = await createCode();
        clock += 61_000;
        expect((await call('admin-handoff-redeem', { body: { code } })).statusCode).toBe(400);
    });

    it('re-checks staff access when the code is used', async () => {
        const code = await createCode();
        db.store.set('admins/a1', { email: 'ops@newbi.live', role: 'unauthorized' });
        expect((await call('admin-handoff-redeem', { body: { code } })).statusCode).toBe(403);
    });

    it('rejects malformed codes, GETs, and servers that cannot sign tokens', async () => {
        expect((await call('admin-handoff-redeem', { body: { code: 'short' } })).statusCode).toBe(400);
        expect((await call('admin-handoff-redeem', { body: { code: 'x'.repeat(43) } })).statusCode).toBe(400);
        expect((await call('admin-handoff-create', { token: STAFF, method: 'GET' })).statusCode).toBe(405);
        const code = await createCode();
        expect((await call('admin-handoff-redeem', { body: { code }, canSign: false })).statusCode).toBe(503);
    });
});
