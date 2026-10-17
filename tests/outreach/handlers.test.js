import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FakeFirestore, fakeReq, fakeRes } from '../helpers/fakeFirestore.js';
import { handleOutreachAction } from '../../api/_lib/outreach.js';

const CAMPAIGN = {
    title: 'Arijit Singh Live, Bangalore',
    slug: 'arijit-blr',
    status: 'Open',
    publicApplyEnabled: true,
    cities: ['Bangalore'],
    applicationDeadline: '2099-12-31',
};

const applicant = (over = {}) => ({
    slug: 'arijit-blr',
    fullName: 'Riya Sharma',
    email: 'riya@example.com',
    phone: '98765 43210',
    instagram: '@Riya.S',
    followerCount: '12500',
    collegeOrEmployer: 'Christ University',
    city: 'Bangalore',
    category: 'Music & Dance',
    consentWhatsApp: true,
    ...over,
});

const ADMIN = { uid: 'u-admin', email: 'ops@newbi.live', email_verified: true };
const EDITOR = { uid: 'u-editor', email: 'editor@newbi.live', email_verified: true };

let db;
const call = async (action, body, { token = null, method = 'POST', ip } = {}) => {
    const res = fakeRes();
    await handleOutreachAction(action, fakeReq({ method, body, query: method === 'GET' ? body : {}, ip }), res, { decodedToken: token, db });
    return res;
};
const apps = () => Object.entries(db.dump('campaigns/c1/applications')).map(([id, d]) => ({ id, ...d }));
const audit = () => Object.values(db.dump('campaigns/c1/audit'));

beforeEach(() => {
    db = new FakeFirestore({
        'campaigns/c1': CAMPAIGN,
        'admins/a1': { email: 'ops@newbi.live', role: 'admin' },
        'admins/a2': { email: 'editor@newbi.live', role: 'editor' },
        'creators/cr1': { instagram: 'riya.s', name: 'Riya' },
    });
});

describe('public campaign info', () => {
    it('never includes the group link or template', async () => {
        db.store.set('campaigns/c1/private/outreach', { whatsappGroupLink: 'https://chat.whatsapp.com/SECRETabc123' });
        const res = await call('outreach-campaign', { slug: 'arijit-blr' }, { method: 'GET' });
        expect(res.statusCode).toBe(200);
        expect(res.body.open).toBe(true);
        expect(JSON.stringify(res.body)).not.toContain('chat.whatsapp.com');
    });

    it('hides campaigns that have not switched the open form on', async () => {
        db.store.set('campaigns/c1', { ...CAMPAIGN, publicApplyEnabled: false });
        expect((await call('outreach-campaign', { slug: 'arijit-blr' }, { method: 'GET' })).statusCode).toBe(404);
    });
});

describe('outreach-apply', () => {
    it('stores a clean application, a contact, the consent time and an audit entry', async () => {
        const res = await call('outreach-apply', applicant());
        expect(res.body).toEqual({ success: true, updated: false });
        const [app] = apps();
        expect(app).toMatchObject({
            status: 'applied', phone: '+919876543210', instagramHandle: 'riya.s', followerCount: 12500,
            creatorId: 'cr1', consentWhatsApp: true, submitCount: 1, campaignId: 'c1',
        });
        expect(app.consentAt).toBeTruthy();
        const contacts = Object.values(db.dump('creator_contacts'));
        expect(contacts).toHaveLength(1);
        expect(contacts[0]).toMatchObject({ phone: '+919876543210', creatorId: 'cr1', campaignIds: ['c1'] });
        expect(contacts[0].whatsappConsent.at).toBe(app.consentAt);
        expect(audit()).toEqual([expect.objectContaining({ field: 'status', from: null, to: 'applied', source: 'public_form' })]);
    });

    it('updates the same application when the phone applies again', async () => {
        await call('outreach-apply', applicant());
        const res = await call('outreach-apply', applicant({ fullName: 'Riya S Sharma', instagram: 'riya.new', followerCount: '15000' }));
        expect(res.body.updated).toBe(true);
        expect(apps()).toHaveLength(1);
        expect(apps()[0]).toMatchObject({ fullName: 'Riya S Sharma', instagramHandle: 'riya.new', followerCount: 15000, submitCount: 2 });
    });

    it('updates the same application when the handle applies again with another phone', async () => {
        await call('outreach-apply', applicant());
        await call('outreach-apply', applicant({ phone: '+91 91234 56789' }));
        expect(apps()).toHaveLength(1);
        expect(apps()[0].phone).toBe('+919123456789');
    });

    it('keeps the status of someone already shortlisted when they reapply', async () => {
        await call('outreach-apply', applicant());
        const id = apps()[0].id;
        await call('outreach-status', { campaignId: 'c1', appIds: [id], to: 'shortlisted' }, { token: ADMIN });
        await call('outreach-apply', applicant({ followerCount: '20000' }));
        expect(apps()[0]).toMatchObject({ status: 'shortlisted', followerCount: 20000 });
    });

    it('flags both applications when the phone is one person and the handle another', async () => {
        await call('outreach-apply', applicant());
        await call('outreach-apply', applicant({ phone: '9000000001', instagram: 'arjun.k', fullName: 'Arjun' }));
        await call('outreach-apply', applicant({ phone: '9000000001', instagram: 'riya.s', fullName: 'Arjun' }));
        const list = apps();
        expect(list).toHaveLength(2);
        const riya = list.find(a => a.fullName === 'Riya Sharma');
        const arjun = list.find(a => a.fullName === 'Arjun');
        expect(arjun.possibleDuplicateOf).toBe(riya.id);
        expect(riya.possibleDuplicateOf).toBe(arjun.id);
    });

    it('returns inline errors and stores nothing for a bad submission', async () => {
        const res = await call('outreach-apply', applicant({ phone: '123', consentWhatsApp: false }));
        expect(res.statusCode).toBe(400);
        expect(Object.keys(res.body.errors).sort()).toEqual(['consentWhatsApp', 'phone']);
        expect(apps()).toHaveLength(0);
    });

    it('refuses after the deadline and when the campaign is Live', async () => {
        db.store.set('campaigns/c1', { ...CAMPAIGN, applicationDeadline: '2020-01-01' });
        expect((await call('outreach-apply', applicant())).body.code).toBe('deadline');
        db.store.set('campaigns/c1', { ...CAMPAIGN, status: 'Live' });
        expect((await call('outreach-apply', applicant())).body.code).toBe('live');
    });

    it('rate-limits by IP and never stores the raw IP', async () => {
        vi.stubEnv('OUTREACH_APPLY_LIMIT', '2');
        const codes = [];
        for (let i = 0; i < 3; i += 1) {
            codes.push((await call('outreach-apply', applicant({ phone: `900000000${i}`, instagram: `user${i}` }), { ip: '198.51.100.9' })).statusCode);
        }
        expect(codes).toEqual([200, 200, 429]);
        expect((await call('outreach-apply', applicant({ phone: '9000000009', instagram: 'other' }), { ip: '198.51.100.10' })).statusCode).toBe(200);
        expect(JSON.stringify([...db.store.entries()])).not.toContain('198.51.100');
        vi.unstubAllEnvs();
    });

    it('accepts and silently drops honeypot submissions', async () => {
        const res = await call('outreach-apply', applicant({ website: 'http://spam' }));
        expect(res.body.success).toBe(true);
        expect(apps()).toHaveLength(0);
    });
});

describe('admin actions', () => {
    beforeEach(async () => {
        await call('outreach-apply', applicant());
        await call('outreach-apply', applicant({ phone: '9000000001', instagram: 'arjun.k', fullName: 'Arjun' }));
    });

    it('need an outreach role: signed-out is 401, editors are 403', async () => {
        expect((await call('outreach-list', { campaignId: 'c1' })).statusCode).toBe(401);
        expect((await call('outreach-list', { campaignId: 'c1' }, { token: EDITOR })).statusCode).toBe(403);
        const ok = await call('outreach-list', { campaignId: 'c1' }, { token: ADMIN });
        expect(ok.statusCode).toBe(200);
        expect(ok.body.applications).toHaveLength(2);
        expect(ok.body.settings.messageTemplate).toContain('{first_name}');
    });

    it('applies allowed status changes, skips the rest, and audits each change with the actor', async () => {
        const [a, b] = apps().map(x => x.id);
        let res = await call('outreach-status', { campaignId: 'c1', appIds: [a, b], to: 'shortlisted', source: 'bulk_paste' }, { token: ADMIN });
        expect(res.body.updated).toHaveLength(2);
        res = await call('outreach-status', { campaignId: 'c1', appIds: [a], to: 'message_sent' }, { token: ADMIN });
        expect(res.body.updated).toHaveLength(0);
        expect(res.body.skipped).toEqual([{ id: a, from: 'shortlisted', reason: 'not_allowed' }]);
        await call('outreach-status', { campaignId: 'c1', appIds: [a], to: 'message_queued' }, { token: ADMIN });
        res = await call('outreach-status', { campaignId: 'c1', appIds: [a], to: 'message_sent', messageText: 'Hey Riya!' }, { token: ADMIN });
        expect(res.body.updated).toEqual([{ id: a, from: 'message_queued', to: 'message_sent' }]);
        const app = apps().find(x => x.id === a);
        expect(app).toMatchObject({ status: 'message_sent', messageSentBy: 'ops@newbi.live', lastMessageText: 'Hey Riya!' });

        const changes = audit().filter(e => e.field === 'status' && e.source !== 'public_form');
        expect(changes.map(e => `${e.from}>${e.to}`)).toEqual(['applied>shortlisted', 'applied>shortlisted', 'shortlisted>message_queued', 'message_queued>message_sent']);
        changes.forEach(e => expect(e).toMatchObject({ actorEmail: 'ops@newbi.live', actorUid: 'u-admin' }));
        expect(changes[0].source).toBe('bulk_paste');
    });

    it('rejects unknown statuses and setting someone back to applied', async () => {
        const [a] = apps().map(x => x.id);
        expect((await call('outreach-status', { campaignId: 'c1', appIds: [a], to: 'applied' }, { token: ADMIN })).statusCode).toBe(400);
        expect((await call('outreach-status', { campaignId: 'c1', appIds: [a], to: 'vip' }, { token: ADMIN })).statusCode).toBe(400);
    });

    it('saves the group link and template privately, and validates both', async () => {
        let res = await call('outreach-settings', { campaignId: 'c1', whatsappGroupLink: 'https://example.com/x', messageTemplate: 'Hi' }, { token: ADMIN });
        expect(res.body.field).toBe('whatsappGroupLink');
        res = await call('outreach-settings', { campaignId: 'c1', whatsappGroupLink: '', messageTemplate: 'Hi {name}' }, { token: ADMIN });
        expect(res.body.field).toBe('messageTemplate');
        res = await call('outreach-settings', { campaignId: 'c1', whatsappGroupLink: 'https://chat.whatsapp.com/AbCdEf1234567', messageTemplate: 'Hey {first_name}! {group_link}' }, { token: ADMIN });
        expect(res.body.success).toBe(true);
        expect(db.store.get('campaigns/c1').whatsappGroupLink).toBeUndefined();
        expect(db.store.get('campaigns/c1/private/outreach').whatsappGroupLink).toBe('https://chat.whatsapp.com/AbCdEf1234567');
        expect(audit().some(e => e.field === 'whatsappGroupLink' && e.actorEmail === 'ops@newbi.live')).toBe(true);
    });

    it('returns the audit log for one applicant', async () => {
        const [a] = apps().map(x => x.id);
        await call('outreach-status', { campaignId: 'c1', appIds: [a], to: 'shortlisted' }, { token: ADMIN });
        const res = await call('outreach-audit', { campaignId: 'c1', appId: a }, { token: ADMIN });
        expect(res.body.entries.map(e => e.to).sort()).toEqual(['applied', 'shortlisted']);
    });
});

describe('logging', () => {
    it('masks phones when something fails', async () => {
        const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
        db.runTransaction = async () => { throw new Error('boom'); };
        const res = await call('outreach-apply', applicant());
        expect(res.statusCode).toBe(500);
        const logged = spy.mock.calls.flat().join(' ');
        expect(logged).not.toContain('9876543210');
        expect(logged).toContain('3210');
        spy.mockRestore();
    });
});
