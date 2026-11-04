import { describe, it, expect } from 'vitest';
import { handleOutreachAction, isOutreachAdmin } from '../../api/_lib/outreach.js';
import { isQuotaError } from '../../api/_lib/quota.js';

const quota = Object.assign(new Error('8 RESOURCE_EXHAUSTED: Quota exceeded.'), { code: 8 });
const failing = (err) => {
    const q = { where: () => q, limit: () => q, doc: () => q, get: () => Promise.reject(err) };
    return { collection: () => q };
};
const resStub = () => {
    const r = { code: 0, body: null };
    r.status = (c) => { r.code = c; return r; };
    r.json = (b) => { r.body = b; return r; };
    return r;
};
const token = { uid: 'u1', email: 'team@newbi.live', email_verified: true };

describe('database over its quota', () => {
    it('recognises the quota error', () => {
        expect(isQuotaError(quota)).toBe(true);
        expect(isQuotaError(new Error('8 RESOURCE_EXHAUSTED: Quota exceeded.'))).toBe(true);
        expect(isQuotaError(new Error('permission denied'))).toBe(false);
    });

    it('the admin check passes it up instead of saying "not an admin"', async () => {
        await expect(isOutreachAdmin(failing(quota), token)).rejects.toBe(quota);
        expect(await isOutreachAdmin(failing(new Error('other')), token)).toBe(false);
    });

    it('admin actions answer 503 with a clear message, not 403', async () => {
        const res = resStub();
        await handleOutreachAction('outreach-list', { method: 'POST', body: {} }, res, { decodedToken: token, db: failing(quota) });
        expect(res.code).toBe(503);
        expect(res.body.error).toMatch(/usage limit/);
    });
});
