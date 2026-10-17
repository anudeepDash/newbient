import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Delivery (email, WhatsApp, push) is the passes system's own job; here we only check it's asked once.
vi.mock('../../api/_lib/notify.js', () => ({
    notify: vi.fn(async () => ({ email: { status: 'sent' }, whatsapp: { status: 'sent' }, push: { status: 'skipped' } })),
}));

import { FakeFirestore } from '../helpers/fakeFirestore.js';
import { setDbForTests } from '../../api/_lib/db.js';
import { notify } from '../../api/_lib/notify.js';
import { releaseApplicationPass, revokePassForOutreach, ticketLinkFor } from '../../api/_lib/passes.js';

let db;
beforeEach(() => {
    vi.stubEnv('LINK_SIGNING_SECRET', 'test-secret');
    db = new FakeFirestore({
        'campaigns/c1': { title: 'Arijit Singh Live', ticketsPerCreator: 2 },
        'campaigns/c1/applications/a1': { fullName: 'Riya Sharma', email: 'riya@example.com', phone: '+919876500001', status: 'posted' },
        'campaigns/c1/applications/a2': { fullName: 'Kabir Mehta', email: 'kabir@example.com', phone: '+919876500005', status: 'posted', creatorId: 'cr1' },
        'creators/cr1': { uid: 'u-kabir', name: 'Kabir', email: 'kabir@example.com' },
    });
    setDbForTests(db);
    vi.mocked(notify).mockClear();
});
afterEach(() => { vi.unstubAllEnvs(); setDbForTests(null); });

const passes = () => Object.values(db.dump('passes'));

describe('passes for outreach applicants', () => {
    it('issues a QR pass held by the application, once, and delivers it', async () => {
        const out = await releaseApplicationPass(db, { campaignId: 'c1', appId: 'a1', staffEmail: 'ops@newbi.live' });
        expect(out).toMatchObject({ outcome: 'issued', channels: { email: 'sent', whatsapp: 'sent' } });
        const [pass] = passes();
        expect(pass).toMatchObject({
            source: 'campaign', sourceId: 'c1', status: 'issued', qr: true, qty: 2, applicationId: 'a1',
            holderName: 'Riya Sharma', holderEmail: 'riya@example.com', holderPhone: '+919876500001', issuedBy: 'ops@newbi.live',
        });
        expect(pass.holderUid).toBeUndefined();
        expect(db.store.get('pass_keys/campaign_c1_app_a1')).toMatchObject({ ref: out.ref });
        expect(notify).toHaveBeenCalledWith('campaign-ticket', null, expect.objectContaining({ name: 'Riya Sharma' }), expect.objectContaining({ to: { email: 'riya@example.com', phone: '+919876500001', name: 'Riya Sharma' } }));

        const again = await releaseApplicationPass(db, { campaignId: 'c1', appId: 'a1', staffEmail: 'ops@newbi.live' });
        expect(again).toMatchObject({ ref: out.ref, outcome: 'exists', channels: null });
        expect(passes()).toHaveLength(1);
        expect(notify).toHaveBeenCalledTimes(1);
    });

    it('keys a registered creator’s pass to their login, so they never get two', async () => {
        const out = await releaseApplicationPass(db, { campaignId: 'c1', appId: 'a2', staffEmail: 'ops@newbi.live' });
        expect(passes()[0]).toMatchObject({ holderUid: 'u-kabir', creatorId: 'cr1', applicationId: 'a2' });
        expect(db.store.get('pass_keys/campaign_c1_u-kabir').ref).toBe(out.ref);
    });

    it('can be revoked and released again as a new pass', async () => {
        const first = await releaseApplicationPass(db, { campaignId: 'c1', appId: 'a1', staffEmail: 'ops@newbi.live' });
        await revokePassForOutreach(db, first.ref, { reason: 'Dropped out', staffEmail: 'ops@newbi.live' });
        expect(db.store.get(`passes/${first.ref}`)).toMatchObject({ status: 'revoked', revokeReason: 'Dropped out', revokedBy: 'ops@newbi.live' });
        const second = await releaseApplicationPass(db, { campaignId: 'c1', appId: 'a1', staffEmail: 'ops@newbi.live' });
        expect(second.outcome).toBe('issued');
        expect(second.ref).not.toBe(first.ref);
    });

    it('gives the creator a signed ticket link', () => {
        expect(ticketLinkFor('ABCDEFGHJK')).toMatch(/^https:\/\/app\.newbi\.live\/t\/[\w-]+\.[\w-]+$/);
    });
});
