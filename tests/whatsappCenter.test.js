import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FakeFirestore, fakeReq, fakeRes } from './helpers/fakeFirestore.js';
import { setDbForTests } from '../api/_lib/db.js';
import { setWhatsAppFetchForTests } from '../api/_lib/whatsapp.js';
import { setCenterFetchForTests, describeTemplate } from '../api/_lib/whatsappCenter.js';
import { handleOutreachAction } from '../api/_lib/outreach.js';
import { contactIdFor } from '../api/_lib/outreachThreads.js';

const ADMIN_TOKEN = { uid: 'u-admin', email: 'ops@newbi.live', email_verified: true };

// Two templates as Meta returns them: one approved with an image header and a link button, one still in review.
const META_TEMPLATES = [
    {
        name: 'team_update', language: 'en', status: 'APPROVED', category: 'UTILITY',
        components: [
            { type: 'HEADER', format: 'IMAGE' },
            { type: 'BODY', text: '📢 *Team update*\n\n{{1}}\n\nSent by {{2}}.', example: { body_text: [['Gate opens at 6', 'Ops']] } },
            { type: 'FOOTER', text: 'Newbi team' },
            { type: 'BUTTONS', buttons: [{ type: 'URL', text: 'Open admin', url: 'https://admin.newbi.live/{{1}}' }, { type: 'QUICK_REPLY', text: 'Stop updates' }] },
        ],
    },
    { name: 'pass_ready', language: 'en', status: 'PENDING', category: 'MARKETING', components: [{ type: 'BODY', text: 'Hi {{1}}.' }] },
    {
        name: 'campaign_shortlist', language: 'en', status: 'APPROVED', category: 'UTILITY',
        components: [
            { type: 'BODY', text: "You're shortlisted, {{1}}! {{2}} {{3}} {{4}}" },
            { type: 'BUTTONS', buttons: [{ type: 'QUICK_REPLY', text: 'Joined' }, { type: 'QUICK_REPLY', text: 'Stop updates' }] },
        ],
    },
];

let db;
let sent;

const call = async (action, body = {}) => {
    const res = fakeRes();
    await handleOutreachAction(action, fakeReq({ body }), res, { decodedToken: ADMIN_TOKEN, db });
    return res;
};

beforeEach(() => {
    vi.stubEnv('WHATSAPP_ACCESS_TOKEN', 'test-token');
    vi.stubEnv('WHATSAPP_PHONE_NUMBER_ID', '123');
    vi.stubEnv('WHATSAPP_WABA_ID', '999');
    vi.stubEnv('OUTREACH_WA_PER_MINUTE', '20');
    vi.stubEnv('OUTREACH_WA_DAILY_CAP', '50');
    db = new FakeFirestore({
        'admins/a1': { email: 'ops@newbi.live', role: 'admin', displayName: 'Ops Lead', phone: '+919876500001' },
        'admins/a2': { email: 'dev@newbi.live', role: 'developer' },
        'admins/a3': { email: 'new@newbi.live', role: 'pending' },
        'admins/a4': { email: 'quiet@newbi.live', role: 'admin', displayName: 'Quiet One', phone: '+919876500004' },
        'users/u2': { email: 'dev@newbi.live', displayName: 'Dev', phone: '+919876500002', phoneVerified: true },
        [`creator_contacts/${contactIdFor('+919876500004')}`]: { whatsappOptOut: { at: '2026-10-01T00:00:00Z' } },
        'campaigns/c1': { title: 'Arijit Singh Live' },
        'campaigns/c1/private/outreach': { whatsappGroupLink: 'https://chat.whatsapp.com/AbC' },
        'campaigns/c1/applications/p1': { fullName: 'riya sharma', phone: '+919876500011', city: 'Bengaluru', status: 'shortlisted' },
        'campaigns/c1/applications/p2': { fullName: 'rj_kabir', phone: '+919876500012', status: 'message_sent' },
    });
    setDbForTests(db);
    sent = [];
    setCenterFetchForTests(async (url) => {
        expect(url).toContain('/999/message_templates');
        return { ok: true, status: 200, json: async () => ({ data: META_TEMPLATES }) };
    });
    setWhatsAppFetchForTests(async (url, init) => {
        sent.push(JSON.parse(init.body));
        return { ok: true, status: 200, json: async () => ({ messages: [{ id: `wamid.${sent.length}` }] }) };
    });
});

afterEach(() => {
    vi.unstubAllEnvs();
    setDbForTests(null);
    setWhatsAppFetchForTests(null);
    setCenterFetchForTests(null);
});

describe('WhatsApp center', () => {
    it('lists templates with their variables and buttons', async () => {
        const res = await call('wa-templates');
        expect(res.statusCode).toBe(200);
        const t = res.body.templates.find(x => x.name === 'team_update');
        expect(t).toMatchObject({ status: 'APPROVED', bodyVars: 2, header: { format: 'IMAGE' }, examples: ['Gate opens at 6', 'Ops'] });
        expect(t.buttons).toEqual([
            { index: 0, type: 'URL', text: 'Open admin', url: 'https://admin.newbi.live/{{1}}', dynamic: true },
            { index: 1, type: 'QUICK_REPLY', text: 'Stop updates', url: '', dynamic: false },
        ]);
    });

    it('lists team admins (not pending requests) with masked numbers', async () => {
        const res = await call('wa-team');
        expect(res.body.team.map(m => m.name).sort()).toEqual(['Dev', 'Ops Lead', 'Quiet One']);
        expect(res.body.team.find(m => m.name === 'Dev').phone).not.toContain('500002');
    });

    it('sends an approved template to the team, skipping anyone who opted out', async () => {
        const res = await call('wa-send', {
            template: 'team_update', language: 'en',
            recipients: [{ type: 'team', id: 'a1' }, { type: 'team', id: 'a2' }, { type: 'team', id: 'a4' }, { type: 'phone', phone: '98765 00002' }],
            params: { body: ['Gate opens at 6', 'Ops'], buttons: { 0: 'guestlists' } },
        });
        expect(res.statusCode).toBe(200);
        expect(res.body.sent).toBe(2);
        expect(res.body.results.find(r => r.label === 'Quiet One')).toMatchObject({ status: 'skipped' });
        expect(sent.map(m => m.to).sort()).toEqual(['919876500001', '919876500002']);
        const [header, body, link, stop] = sent[0].template.components;
        expect(header.parameters[0].image.link).toBe('https://app.newbi.live/og/app-v1.jpg');
        expect(body.parameters.map(p => p.text)).toEqual(['Gate opens at 6', 'Ops']);
        expect(link).toMatchObject({ sub_type: 'url', parameters: [{ text: 'guestlists' }] });
        expect(stop).toMatchObject({ sub_type: 'quick_reply', parameters: [{ payload: 'stop' }] });
        // The send shows in their inbox thread.
        const thread = db.store.get(`outreach_inbox/${contactIdFor('+919876500001')}`);
        expect(thread.lastText).toContain('Gate opens at 6');
    });

    it('fills {first_name} and the campaign for each applicant, sends their Joined payload and moves them on', async () => {
        const res = await call('wa-send', {
            template: 'campaign_shortlist', language: 'en',
            recipients: [{ type: 'applicant', campaignId: 'c1', appId: 'p1' }, { type: 'applicant', campaignId: 'c1', appId: 'p2' }, { type: 'team', id: 'a1' }],
            params: { body: ['{first_name}', '{campaign_title}', '{group_link}', 'Post by {city}'] },
        });
        expect(res.body.sent).toBe(1);
        expect(res.body.results.find(r => r.key === 'app:c1:p2')).toMatchObject({ status: 'skipped', error: 'No city for them' });
        expect(res.body.results.find(r => r.key === 'team:a1')).toMatchObject({ status: 'skipped', error: expect.stringMatching(/campaign/) });
        const [, body, joined, stop] = sent[0].template.components; // its Newbi card header first
        expect(body.parameters.map(p => p.text)).toEqual(['Riya', 'Arijit Singh Live', 'https://chat.whatsapp.com/AbC', 'Post by Bengaluru']);
        expect(joined.parameters[0].payload).toMatch(/^j1\.c1\.p1\./);
        expect(stop.parameters[0].payload).toBe('stop');
        expect(db.store.get('campaigns/c1/applications/p1')).toMatchObject({ status: 'message_sent' });
    });

    it('fills the campaign for team members when one is chosen, and greets unclear names as “there”', async () => {
        const res = await call('wa-send', {
            template: 'team_update', language: 'en',
            recipients: [{ type: 'team', id: 'a1' }, { type: 'phone', phone: '+919876500099' }],
            params: { body: ['{first_name}: {campaign_title} is live', 'Ops'], buttons: { 0: 'x' }, campaignId: 'c1' },
        });
        expect(res.body.sent).toBe(2);
        expect(sent.map(m => m.template.components[1].parameters[0].text).sort()).toEqual(['Ops: Arijit Singh Live is live', 'there: Arijit Singh Live is live']);
    });

    it('refuses templates that aren’t approved and missing variables', async () => {
        expect((await call('wa-send', { template: 'pass_ready', recipients: [{ type: 'phone', phone: '+919876500001' }], params: { body: ['x'] } })).statusCode).toBe(409);
        expect((await call('wa-send', { template: 'team_update', recipients: [{ type: 'phone', phone: '+919876500001' }], params: { body: ['only one'], buttons: { 0: 'x' } } })).body.field).toBe('body');
        expect(sent).toHaveLength(0);
    });

    it('shows the latest WhatsApp sends from the log', async () => {
        await call('wa-send', { template: 'team_update', recipients: [{ type: 'team', id: 'a1' }], params: { body: ['a', 'b'], buttons: { 0: 'x' } } });
        const res = await call('wa-log');
        expect(res.body.rows[0]).toMatchObject({ template: 'team_update', event: 'admin-manual', status: 'sent' });
        expect(res.body.rows[0].to).not.toContain('500001');
    });

    it('keeps non-admins out', async () => {
        const res = fakeRes();
        await handleOutreachAction('wa-templates', fakeReq({ body: {} }), res, { decodedToken: { uid: 'u-x', email: 'x@y.z', email_verified: true }, db });
        expect(res.statusCode).toBe(403);
    });
});

describe('describeTemplate', () => {
    it('handles templates without a header or buttons', () => {
        expect(describeTemplate(META_TEMPLATES[1])).toMatchObject({ header: null, bodyVars: 1, buttons: [] });
    });
});
