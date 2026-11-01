import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { zipSync, strToU8 } from 'fflate';
import { FakeFirestore, fakeReq, fakeRes } from '../helpers/fakeFirestore.js';
import { setDbForTests } from '../../api/_lib/db.js';
import { setWhatsAppFetchForTests } from '../../api/_lib/whatsapp.js';
import { runQueue, onOutreachInbound, interestPayload, readInterestPayload, contactIdFor } from '../../api/_lib/outreachQueue.js';
import { handleOutreachAction } from '../../api/_lib/outreach.js';
import { parseDelimited, detectColumns, rowsFromTable } from '../../src/lib/outreach/importSheet.js';
import { readXlsx } from '../../src/lib/xlsxRead.js';
import { renderTemplatePreview, WA_TEMPLATES } from '../../src/lib/outreach/whatsappTemplate.js';
import { isBelowMinimum } from '../../src/lib/outreach/application.js';
import { TEMPLATES, problemsWith } from '../../scripts/submit-wa-templates.mjs';

/* Outreach → Import (a sheet of numbers becomes applicants) and the new campaign messages. */

const ADMIN = { uid: 'u-admin', email: 'ops@newbi.live', email_verified: true };
let db;
let sent;
const call = async (action, body) => {
    const res = fakeRes();
    await handleOutreachAction(action, fakeReq({ body }), res, { decodedToken: ADMIN, db });
    return res;
};
const apps = () => Object.entries(db.dump('campaigns/c1/applications'));

beforeEach(() => {
    vi.stubEnv('WHATSAPP_ACCESS_TOKEN', 'test-token');
    vi.stubEnv('WHATSAPP_PHONE_NUMBER_ID', '123');
    vi.stubEnv('LINK_SIGNING_SECRET', 'test-secret');
    vi.stubEnv('OUTREACH_WA_PER_MINUTE', '50');
    vi.stubEnv('CRON_SECRET', '');
    ['CAMPAIGN_CREATOR_INVITE', 'CAMPAIGN_GROUP_JOIN', 'CAMPAIGN_EVENT_DAY', 'CAMPAIGN_NOT_SELECTED'].forEach(n => vi.stubEnv(`WHATSAPP_TEMPLATE_${n}`, n.toLowerCase()));
    db = new FakeFirestore({
        'campaigns/c1': { title: 'Pinnaca 2026', status: 'Open', targetCity: 'Lucknow', reward: 'Free passes', minInstagramFollowers: 5000 },
        'campaigns/c1/applications/a1': { fullName: 'Riya Sharma', phone: '+919876500001', status: 'applied' },
        'campaigns/c1/application_keys/p:+919876500001': { appId: 'a1' },
        'creator_contacts/x': {},
        'admins/x': { email: 'ops@newbi.live', role: 'admin' },
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

describe('reading a sheet', () => {
    it('reads a Google Sheets paste by its headers', () => {
        const table = parseDelimited('Name\tWhatsApp number\tInsta\tFollowers\tCity\nRiya\t98765 00009\t@riya.c\t12.4k\tLucknow\nNo phone\t\t@x\t\t\nArjun\t098765 00009\t\t\t');
        const { columns, hasHeader } = detectColumns(table);
        expect(hasHeader).toBe(true);
        expect(columns).toEqual({ 0: 'fullName', 1: 'phone', 2: 'instagramHandle', 3: 'followerCount', 4: 'city' });
        const rows = rowsFromTable(table, columns, hasHeader);
        expect(rows[0]).toMatchObject({ line: 2, problem: null, value: { fullName: 'Riya', phone: '+919876500009', instagramHandle: 'riya.c', followerCount: 12400, city: 'Lucknow' } });
        expect(rows[1].problem).toBe('No phone number');
        expect(rows[2].problem).toBe('Same number twice in the sheet');
    });

    it('reads a CSV with quotes, and a sheet with no header by what is in each column', () => {
        expect(parseDelimited('name,city\n"Sharma, Riya","New ""Delhi"""')).toEqual([['name', 'city'], ['Sharma, Riya', 'New "Delhi"']]);
        const table = parseDelimited('Riya,9876500011,@riya\nArjun,+91 98765 00012,arjun.k');
        const { columns, hasHeader } = detectColumns(table);
        expect(hasHeader).toBe(false);
        expect(columns[1]).toBe('phone');
        expect(columns[0]).toBe('fullName');
        expect(rowsFromTable(table, columns, hasHeader).map(r => r.value.phone)).toEqual(['+919876500011', '+919876500012']);
    });

    it('reads the first sheet of an .xlsx, with phone numbers saved as numbers', () => {
        const sheet = '<worksheet><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c></row>'
            + '<row r="2"><c r="A2" t="inlineStr"><is><t>Riya &amp; Co</t></is></c><c r="C2"><v>9.19876500013E11</v></c></row></sheetData></worksheet>';
        const file = zipSync({
            'xl/sharedStrings.xml': strToU8('<sst><si><t>Name</t></si><si><r><t>Pho</t></r><r><t>ne</t></r></si></sst>'),
            'xl/worksheets/sheet1.xml': strToU8(sheet),
        });
        expect(readXlsx(file.buffer)).toEqual([['Name', 'Phone'], ['Riya & Co', '', '919876500013']]);
    });
});

describe('importing (outreach-import)', () => {
    const rows = [
        { line: 2, fullName: 'Arjun Kapoor', phone: '98765 00002', instagramHandle: '@arjun.k' },
        { line: 3, fullName: 'Riya again', phone: '+919876500001' },
        { line: 4, fullName: 'Bad', phone: '12345' },
    ];

    it('needs a note on where the numbers came from', async () => {
        const res = await call('outreach-import', { campaignId: 'c1', rows, consentNote: '' });
        expect(res.statusCode).toBe(400);
        expect(res.body.field).toBe('consentNote');
    });

    it('adds new numbers as applicants, skips ones already here, and keeps a consent record', async () => {
        const res = await call('outreach-import', { campaignId: 'c1', rows, consentNote: 'Our creator Google Form' });
        expect(res.statusCode).toBe(200);
        expect(res.body.added).toHaveLength(1);
        expect(res.body.existing).toEqual([{ line: 3, appId: 'a1' }]);
        expect(res.body.invalid).toEqual([{ line: 4, problem: 'Not a mobile number' }]);
        const [id, app] = apps().find(([k]) => k !== 'a1');
        expect(app).toMatchObject({ fullName: 'Arjun Kapoor', phone: '+919876500002', instagramHandle: 'arjun.k', status: 'applied', source: 'import', uid: null });
        expect(app.consentText).toContain('Our creator Google Form');
        expect(db.store.get('campaigns/c1/application_keys/p:+919876500002')).toEqual({ appId: id });
        expect(db.store.get(`creator_contacts/${contactIdFor('+919876500002')}`)).toMatchObject({ campaignIds: ['c1'], importConsent: { note: 'Our creator Google Form' } });

        // Imported without a follower count, they can still go on the shortlist.
        expect(isBelowMinimum(app, { minInstagramFollowers: 5000 })).toBe(false);
        expect((await call('outreach-status', { campaignId: 'c1', appIds: [id], to: 'shortlisted' })).body.updated).toHaveLength(1);

        // Importing the same sheet again adds no one.
        expect((await call('outreach-import', { campaignId: 'c1', rows, consentNote: 'Our creator Google Form' })).body.added).toEqual([]);
    });
});

describe('the first reach-out and "I’m interested"', () => {
    it('sends campaign_creator_invite with a signed button, and the tap marks them interested', async () => {
        const imp = await call('outreach-import', { campaignId: 'c1', rows: [{ fullName: 'Arjun Kapoor', phone: '9876500002' }], consentNote: 'Booth sign-ups' });
        const id = imp.body.added[0];
        const res = await call('outreach-wa-send', { campaignId: 'c1', kind: 'reach_out', appIds: [id, 'a1'], reward: 'Passes and ₹2,000' });
        expect(res.body.queued).toBe(2);
        await runQueue({ db, deadline: Date.now() + 5000, sleep: async () => {} });
        const msg = sent.find(m => m.to === '919876500002' || m.to === '+919876500002');
        expect(msg.template.name).toBe('campaign_creator_invite');
        const quick = msg.template.components.filter(c => c.type === 'button');
        const payload = quick[0].parameters[0].payload;
        expect(readInterestPayload(payload)).toEqual({ campaignId: 'c1', appId: id });
        expect(readInterestPayload(payload.replace(/.$/, payload.endsWith('A') ? 'B' : 'A'))).toBeNull();
        expect(db.store.get(`campaigns/c1/applications/${id}`).reachedOutAt).toBeTruthy();

        // A second send to the same person is skipped.
        expect((await call('outreach-wa-send', { campaignId: 'c1', kind: 'reach_out', appIds: [id] })).body.skipped).toEqual([{ id, reason: 'already_sent' }]);

        const out = await onOutreachInbound({ from: '919876500002', id: 'wamid.in1', type: 'button', button: { payload: interestPayload('c1', id), text: "I'm interested" } }, { db });
        expect(out).toBe('interested');
        expect(db.store.get(`campaigns/c1/applications/${id}`).interestedAt).toBeTruthy();

        // From another number, the tap does nothing.
        expect(await onOutreachInbound({ from: '919876500003', type: 'button', button: { payload: interestPayload('c1', 'a1') } }, { db })).toBeNull();
    });
});

describe('campaign messages sent by the team', () => {
    beforeEach(() => {
        db.store.set('campaigns/c1/applications/a2', { fullName: 'Kabir', phone: '+919876500002', status: 'shortlisted' });
    });

    it('group invite needs a link and goes only to approved creators', async () => {
        const res = await call('outreach-wa-send', { campaignId: 'c1', kind: 'group_join', link: 'https://chat.whatsapp.com/AbCdEf123456', joinBy: 'Sat, 14 Nov', appIds: ['a1', 'a2'] });
        expect(res.body.queued).toBe(1);
        expect(res.body.skipped).toEqual([{ id: 'a1', reason: 'not_approved' }]);
        await runQueue({ db, deadline: Date.now() + 5000, sleep: async () => {} });
        expect(sent[0].template.name).toBe('campaign_group_join');
        expect(sent[0].template.components.find(c => c.type === 'body').parameters.map(p => p.text)).toEqual(['Kabir', 'Pinnaca 2026', 'https://chat.whatsapp.com/AbCdEf123456', 'Sat, 14 Nov']);
    });

    it('event day needs when and where; not picked goes only to applicants', async () => {
        expect((await call('outreach-wa-send', { campaignId: 'c1', kind: 'event_day', when: 'Sat 2 PM', appIds: ['a2'] })).statusCode).toBe(400);
        expect((await call('outreach-wa-send', { campaignId: 'c1', kind: 'event_day', when: 'Sat 2 PM', where: 'Gate 3', appIds: ['a2'] })).body.queued).toBe(1);
        const res = await call('outreach-wa-send', { campaignId: 'c1', kind: 'not_selected', appIds: ['a1', 'a2'] });
        expect(res.body.queued).toBe(1);
        expect(res.body.skipped).toEqual([{ id: 'a2', reason: 'not_applicant' }]);
    });

    it('stays off until its template is switched on', async () => {
        vi.stubEnv('WHATSAPP_TEMPLATE_CAMPAIGN_EVENT_DAY', '');
        const res = await call('outreach-wa-send', { campaignId: 'c1', kind: 'event_day', when: 'Sat', where: 'Gate 3', appIds: ['a2'] });
        expect(res.statusCode).toBe(409);
    });
});

describe('the new templates', () => {
    it('pass the pre-checks and match what the code renders', () => {
        for (const kind of ['reach_out', 'group_join', 'event_day', 'brief_changed', 'not_selected']) {
            const t = TEMPLATES.find(x => x.name === WA_TEMPLATES[kind].name);
            expect(t, kind).toBeTruthy();
            expect(problemsWith(t), kind).toEqual([]);
            expect(t.body).toBe(WA_TEMPLATES[kind].body);
        }
        expect(TEMPLATES.find(t => t.name === 'campaign_creator_invite').category).toBe('MARKETING');
        expect(renderTemplatePreview('reach_out', { application: { fullName: 'riya' }, campaign: { title: 'Pinnaca', targetCity: 'Lucknow' }, data: {} }))
            .toContain('*What you get:* Details in the next message');
    });
});
