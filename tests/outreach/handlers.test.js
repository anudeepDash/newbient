import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FakeFirestore, fakeReq, fakeRes } from '../helpers/fakeFirestore.js';
import { handleOutreachAction } from '../../api/_lib/outreach.js';
import { setDbForTests } from '../../api/_lib/db.js';

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
// Applying needs a signed-in account; by default each phone number is its own account.
const accountFor = (body) => ({ uid: `u-${String(body.phone || '').replace(/\D/g, '')}`, email: body.email });
const call = async (action, body, { token, method = 'POST', ip } = {}) => {
    const res = fakeRes();
    const decodedToken = token !== undefined ? token : action === 'outreach-apply' ? accountFor(body) : null;
    await handleOutreachAction(action, fakeReq({ method, body, query: method === 'GET' ? body : {}, ip }), res, { decodedToken, db });
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
    setDbForTests(db);
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
    it('needs a signed-in account, and links the application to it', async () => {
        expect((await call('outreach-apply', applicant(), { token: null })).body.code).toBe('sign_in');
        await call('outreach-apply', applicant(), { token: { uid: 'u-riya', email: 'riya@gmail.com', phone_number: '+919876543210' } });
        expect(apps()[0]).toMatchObject({ uid: 'u-riya', accountEmail: 'riya@gmail.com', phoneVerified: true });
        expect(db.store.get('outreach_members/u-riya').apps).toEqual({ [`c1_${apps()[0].id}`]: expect.objectContaining({ campaignId: 'c1', appId: apps()[0].id }) });
        expect(db.store.get('campaigns/c1/application_keys/u:u-riya')).toEqual({ appId: apps()[0].id });
    });

    it('updates the same application when the same account applies with a new phone and handle', async () => {
        const me = { uid: 'u-riya', email: 'riya@example.com' };
        await call('outreach-apply', applicant(), { token: me });
        await call('outreach-apply', applicant({ phone: '9123456789', instagram: 'riya.new' }), { token: me });
        expect(apps()).toHaveLength(1);
        expect(apps()[0]).toMatchObject({ phone: '+919123456789', instagramHandle: 'riya.new', submitCount: 2 });
    });

    it('gives their city’s creator community straight away, in the response and in the app', async () => {
        db.store.set('creator_groups/g1', { city: 'Bengaluru', title: 'Bengaluru Creators Community', groupUrl: 'https://chat.whatsapp.com/BlrGroup123456', isActive: true });
        const res = await call('outreach-apply', applicant(), { token: { uid: 'u-riya', email: 'riya@example.com' } });
        expect(res.body.cityGroup).toEqual({ city: 'Bengaluru', title: 'Bengaluru Creators Community', url: 'https://chat.whatsapp.com/BlrGroup123456' });
        expect(apps()[0].cityGroup).toMatchObject({ url: 'https://chat.whatsapp.com/BlrGroup123456' });
        const notes = Object.values(db.dump('notifications'));
        expect(notes).toEqual([expect.objectContaining({ userId: 'u-riya', link: 'https://chat.whatsapp.com/BlrGroup123456', type: 'creator' })]);
        // Applying again (same city) doesn't notify twice.
        await call('outreach-apply', applicant({ followerCount: '13000' }), { token: { uid: 'u-riya', email: 'riya@example.com' } });
        expect(Object.values(db.dump('notifications'))).toHaveLength(1);
    });

    it('stores a clean application, a contact, the consent time and an audit entry', async () => {
        const res = await call('outreach-apply', applicant());
        expect(res.body).toMatchObject({ success: true, updated: false });
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
        // Shortlisting told them in the app, so they're at message_sent; reapplying keeps that.
        expect(apps()[0]).toMatchObject({ status: 'message_sent', followerCount: 20000 });
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
        // Applicants from before sign-in was required: no account, so they're messaged by hand.
        [a, b].forEach(id => { const d = db.store.get(`campaigns/c1/applications/${id}`); delete d.uid; });
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

    it('never shortlists anyone under the Nano "from" count', async () => {
        const [a, b] = apps().map(x => x.id);
        db.store.set('campaigns/c1', { ...CAMPAIGN, perksByTier: { nano: { minFollowers: 5000 } } });
        db.store.get(`campaigns/c1/applications/${b}`).followerCount = 4999;
        const res = await call('outreach-status', { campaignId: 'c1', appIds: [a, b], to: 'shortlisted', source: 'bulk_paste' }, { token: ADMIN });
        expect(res.body.updated.map(u => u.id)).toEqual([a]);
        expect(res.body.skipped).toEqual([{ id: b, from: 'applied', reason: 'below_min' }]);
        expect(apps().find(x => x.id === b).status).toBe('applied');
    });

    it('tells shortlisted people in the app, and leaves people without an account for the fallback', async () => {
        const [a, b] = apps().map(x => x.id);
        db.store.set('campaigns/c1/private/outreach', { whatsappGroupLink: 'https://chat.whatsapp.com/AbCdEf1234567' });
        delete db.store.get(`campaigns/c1/applications/${b}`).uid;
        const res = await call('outreach-status', { campaignId: 'c1', appIds: [a, b], to: 'shortlisted' }, { token: ADMIN });
        expect(res.body.followUps).toEqual({ inApp: 1, api: 0, byHand: 1 });
        expect(apps().find(x => x.id === a)).toMatchObject({ status: 'message_sent', messageSentBy: 'Newbi app' });
        expect(apps().find(x => x.id === b).status).toBe('shortlisted');
        const note = Object.values(db.dump('notifications')).find(n => n.title.startsWith('Shortlisted'));
        expect(note).toMatchObject({ userId: apps().find(x => x.id === a).uid, type: 'campaign' });
        expect(note.message).toContain('I’ve joined');
    });

    it('caps chats opened by hand per day for the whole team', async () => {
        vi.stubEnv('OUTREACH_WAME_DAILY_CAP', '1');
        const [a, b] = apps().map(x => x.id);
        [a, b].forEach(id => { const d = db.store.get(`campaigns/c1/applications/${id}`); delete d.uid; });
        await call('outreach-status', { campaignId: 'c1', appIds: [a, b], to: 'shortlisted' }, { token: ADMIN });
        expect((await call('outreach-status', { campaignId: 'c1', appIds: [a], to: 'message_queued', source: 'wame' }, { token: ADMIN })).body.success).toBe(true);
        const over = await call('outreach-status', { campaignId: 'c1', appIds: [b], to: 'message_queued', source: 'wame' }, { token: ADMIN });
        expect(over.statusCode).toBe(429);
        expect(over.body).toMatchObject({ code: 'wame_cap', wame: { cap: 1, usedToday: 1 } });
        expect(apps().find(x => x.id === b).status).toBe('shortlisted');
        expect((await call('outreach-list', { campaignId: 'c1' }, { token: ADMIN })).body.wame).toEqual({ cap: 1, usedToday: 1 });
        vi.unstubAllEnvs();
    });

    it('sends existing creators their city community in the app, not WhatsApp', async () => {
        db.store.set('creators/cr2', { uid: 'u-cr2', name: 'Meera', city: 'Bangalore' });
        db.store.set('creators/cr3', { name: 'No Login', city: 'Bangalore' });
        const res = await call('outreach-city-notify', { creatorIds: ['cr2', 'cr3', 'missing'] }, { token: ADMIN });
        expect(res.body.results).toEqual([{ id: 'cr2', outcome: 'sent' }, { id: 'cr3', outcome: 'no_account' }, { id: 'missing', outcome: 'not_found' }]);
        expect(Object.values(db.dump('notifications')).some(n => n.userId === 'u-cr2' && n.link.startsWith('https://chat.whatsapp.com/'))).toBe(true);
    });

    it('shares the by-hand cap with the city invite screen', async () => {
        vi.stubEnv('OUTREACH_WAME_DAILY_CAP', '2');
        expect((await call('outreach-wame', {}, { token: ADMIN })).body).toMatchObject({ cap: 2, usedToday: 0 });
        expect((await call('outreach-wame', { use: 2 }, { token: ADMIN })).body).toMatchObject({ success: true, usedToday: 2 });
        expect((await call('outreach-wame', { use: 1 }, { token: ADMIN })).statusCode).toBe(429);
        vi.unstubAllEnvs();
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
        expect(res.body.entries.map(e => e.to).sort()).toEqual(['applied', 'message_sent', 'shortlisted']);
        expect(res.body.entries.find(e => e.to === 'message_sent')).toMatchObject({ source: 'in_app' });
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
