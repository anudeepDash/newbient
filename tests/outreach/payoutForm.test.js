import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FakeFirestore, fakeReq, fakeRes } from '../helpers/fakeFirestore.js';
import { setDbForTests } from '../../api/_lib/db.js';
import { handleOutreachAction } from '../../api/_lib/outreach.js';
import { payoutFormToken } from '../../api/_lib/outreachPayoutForm.js';

const ADMIN = { uid: 'u-admin', email: 'ops@newbi.live', email_verified: true };
const EDITOR = { uid: 'u-ed', email: 'ed@newbi.live', email_verified: true };
const UPI = { fullName: 'Kabir Rao', phone: '98765 00009', instagramHandle: '@kabir.films', mode: 'upi', upiId: 'kabir@okhdfc' };

let db;
const app = (id) => db.store.get(`campaigns/c1/applications/${id}`);
const sub = (id = 'p_919876500009') => db.store.get(`campaigns/c1/payout_submissions/${id}`);
const call = async (action, body = {}, { token = ADMIN } = {}) => {
    const res = fakeRes();
    await handleOutreachAction(action, fakeReq({ body }), res, { decodedToken: token, db });
    return res;
};
const admin = (op, extra = {}) => call('outreach-payout-form-admin', { campaignId: 'c1', op, ...extra });
const tokenOf = (url) => url.split('/pay/c/')[1];

beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(Date.parse('2026-11-01T06:00:00Z'));
    vi.stubEnv('LINK_SIGNING_SECRET', 'test-secret');
    db = new FakeFirestore({
        'campaigns/c1': { title: 'Arijit Singh Live', status: 'Open', eventDate: '2026-11-15' },
        'campaigns/c1/private/outreach': { whatsappGroupLink: 'https://chat.whatsapp.com/AbCdEf1234567' },
        'campaigns/c1/applications/a1': { fullName: 'Riya Sharma', phone: '+919876500001', status: 'applied', tier: 'micro', instagramHandle: 'riya.s' },
        'campaigns/c1/application_keys/p:+919876500001': { appId: 'a1' },
        'admins/x': { email: 'ops@newbi.live', role: 'admin' },
        'admins/y': { email: 'ed@newbi.live', role: 'editor' },
    });
    setDbForTests(db);
});

afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    setDbForTests(null);
});

describe('the open payout form', () => {
    it('is off until an admin turns it on, and a reset link stops the old one', async () => {
        expect((await call('outreach-payout-form', { token: payoutFormToken('c1') }, { token: null })).statusCode).toBe(404);
        expect((await call('outreach-payout-form-admin', { campaignId: 'c1', op: 'enable' }, { token: EDITOR })).statusCode).toBe(403);
        const on = await admin('enable');
        expect(on.body.form).toMatchObject({ enabled: true, version: 1 });
        const first = tokenOf(on.body.form.url);
        expect((await call('outreach-payout-form', { token: first }, { token: null })).body).toMatchObject({ success: true, campaign: { title: 'Arijit Singh Live' } });
        const reset = await admin('reset');
        expect(reset.body.form.version).toBe(2);
        expect((await call('outreach-payout-form', { token: first }, { token: null })).statusCode).toBe(404);
        expect((await call('outreach-payout-form', { token: tokenOf(reset.body.form.url) }, { token: null })).statusCode).toBe(200);
        await admin('disable');
        expect((await call('outreach-payout-form', { token: tokenOf(reset.body.form.url) }, { token: null })).statusCode).toBe(404);
    });

    it('takes anyone’s details but touches no application or Finance until the team adds them', async () => {
        const token = tokenOf((await admin('enable')).body.form.url);
        const bad = await call('outreach-payout-form-submit', { token, ...UPI, upiId: 'nope' }, { token: null });
        expect(bad.body).toMatchObject({ success: false, field: 'upiId' });
        const res = await call('outreach-payout-form-submit', { token, ...UPI }, { token: null });
        expect(res.body).toMatchObject({ success: true, updated: false });
        expect(sub()).toMatchObject({ fullName: 'Kabir Rao', phone: '+919876500009', instagramHandle: 'kabir.films', status: 'new', matchedAppId: null, details: { mode: 'upi', upiId: 'kabir@okhdfc' } });
        expect(db.dump('finance_payees')).toEqual({});
        // Sending again replaces it rather than piling up.
        await call('outreach-payout-form-submit', { token, ...UPI, upiId: 'kabir.rao@okicici' }, { token: null });
        const list = await admin('get');
        expect(list.body.submissions).toHaveLength(1);
        expect(list.body.submissions[0]).toMatchObject({ count: 2, details: { upiId: 'kabir.rao@okicici' }, match: null });
    });

    it('adds a new creator as approved, with a Vendor payee, ready to pay', async () => {
        const token = tokenOf((await admin('enable')).body.form.url);
        await call('outreach-payout-form-submit', { token, ...UPI }, { token: null });
        const res = await admin('accept', { submissionId: 'p_919876500009' });
        expect(res.body.success).toBe(true);
        const appId = sub().appId;
        expect(app(appId)).toMatchObject({ fullName: 'Kabir Rao', status: 'shortlisted', addedVia: 'payout_form', payoutDetails: { mode: 'upi', upiId: 'kabir@okhdfc' } });
        expect(db.store.get('campaigns/c1/application_keys/p:+919876500009')).toEqual({ appId });
        expect(db.store.get(`finance_payees/${app(appId).payoutDetails.payeeId}`)).toMatchObject({ name: 'Kabir Rao', type: 'Vendor', category: 'Creator', status: 'Pending', upiId: 'kabir@okhdfc' });
        expect(sub()).toMatchObject({ status: 'added', addedBy: 'ops@newbi.live' });
        // Recording the payout works like any other creator (with a reason, as their posts weren't tracked here).
        const paid = await call('outreach-payout', { campaignId: 'c1', appId, action: 'paid', amount: '1200', method: 'upi', paidAt: '2026-11-20' });
        expect(paid.body.success).toBe(true);
    });

    it('matches someone already on the campaign by phone, and puts them on the shortlist when the team adds it', async () => {
        const token = tokenOf((await admin('enable')).body.form.url);
        await call('outreach-payout-form-submit', { token, ...UPI, fullName: 'Riya S', phone: '+91 98765 00001' }, { token: null });
        const list = await admin('get');
        expect(list.body.submissions[0]).toMatchObject({ matchedAppId: 'a1', matchedBy: 'phone', match: { fullName: 'Riya Sharma', status: 'applied', hasDetails: false } });
        expect(app('a1').payoutDetails).toBeUndefined();
        await admin('accept', { submissionId: 'p_919876500001' });
        expect(app('a1')).toMatchObject({ status: 'shortlisted', payoutDetails: { upiId: 'kabir@okhdfc' }, payoutDetailsVia: 'payout_form' });
    });

    it('can be dismissed', async () => {
        const token = tokenOf((await admin('enable')).body.form.url);
        await call('outreach-payout-form-submit', { token, ...UPI }, { token: null });
        expect((await admin('dismiss', { submissionId: 'p_919876500009' })).body.submissions[0].status).toBe('dismissed');
        expect(sub().appId).toBeNull();
    });
});
