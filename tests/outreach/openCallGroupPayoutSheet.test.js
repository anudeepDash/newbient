import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FakeFirestore, fakeReq, fakeRes } from '../helpers/fakeFirestore.js';
import { setDbForTests } from '../../api/_lib/db.js';
import { setWhatsAppFetchForTests } from '../../api/_lib/whatsapp.js';
import { runQueue, joinPayload } from '../../api/_lib/outreachQueue.js';
import { handleOutreachAction } from '../../api/_lib/outreach.js';
import { queueCityWelcome } from '../../api/_lib/creatorWelcome.js';
import { WA_TEMPLATES, WELCOME_CITY_BODY, LIVE_BRIEF_BODY, groupCodeOf, STOP_PAYLOAD } from '../../src/lib/outreach/whatsappTemplate.js';
import { activeCriteria, cleanCities, inCities, matchesCriteria, statusOf, needsMessage, hasMessage } from '../../src/lib/outreach/openAudience.js';
import { contactIdFor } from '../../api/_lib/outreachThreads.js';
import { fieldsFor } from '../../src/lib/outreach/waFields.js';
import { defaultPayoutAmount } from '../../src/lib/outreach/deliverables.js';
import { parseAmount, detectColumns, parseDelimited, rowsFromTable } from '../../src/lib/outreach/importSheet.js';
import { TEMPLATES, problemsWith } from '../../scripts/submit-wa-templates.mjs';

/* The group invite with a Join button, the portal welcome, Campaign open to registered creators, and the payout sheet. */

const ADMIN = { uid: 'u-admin', email: 'ops@newbi.live', email_verified: true };
const GROUP = 'https://chat.whatsapp.com/AbCdEf123456?mode=gi_t';
let db;
let sent;
const call = async (action, body) => {
    const res = fakeRes();
    await handleOutreachAction(action, fakeReq({ body }), res, { decodedToken: ADMIN, db });
    return res;
};
const drain = () => runQueue({ db, deadline: Date.now() + 5000, sleep: async () => {} });
const buttonsOf = (msg) => msg.template.components.filter(c => c.type === 'button');

beforeEach(() => {
    vi.stubEnv('WHATSAPP_ACCESS_TOKEN', 'test-token');
    vi.stubEnv('WHATSAPP_PHONE_NUMBER_ID', '123');
    vi.stubEnv('LINK_SIGNING_SECRET', 'test-secret');
    vi.stubEnv('OUTREACH_WA_PER_MINUTE', '50');
    vi.stubEnv('CRON_SECRET', '');
    ['CAMPAIGN_GROUP_INVITE', 'CAMPAIGN_INVITE', 'CREATOR_WELCOME_CITY'].forEach(n => vi.stubEnv(`WHATSAPP_TEMPLATE_${n}`, n.toLowerCase()));
    db = new FakeFirestore({
        'campaigns/c1': { title: 'Pinnaca 2026', status: 'Open', targetCity: 'Lucknow', perksByTier: { nano: { minFollowers: 5000 } } },
        'campaigns/c1/private/outreach': { whatsappGroupLink: GROUP },
        'campaigns/c1/applications/a1': { fullName: 'Riya Sharma', phone: '+919876500001', status: 'applied', uid: 'u-riya' },
        'campaigns/c1/applications/a2': { fullName: 'Kabir', phone: '+919876500002', status: 'shortlisted' },
        'campaigns/c1/application_keys/p:+919876500001': { appId: 'a1' },
        'campaigns/c1/application_keys/p:+919876500002': { appId: 'a2' },
        'admins/x': { email: 'ops@newbi.live', role: 'admin' },
        // Registered creators.
        'creators/cr1': { uid: 'u1', displayName: 'Meera Joshi', city: 'Lucknow', instagramFollowers: '12000', phone: '+919876500011', isPhoneVerified: true, profileStatus: 'approved' },
        'creators/cr2': { uid: 'u2', displayName: 'Dev', city: 'Delhi', instagramFollowers: '9000', phone: '+919876500012', isPhoneVerified: true, profileStatus: 'approved' },
        'creators/cr3': { uid: 'u3', displayName: 'Tara', city: 'Lucknow', instagramFollowers: '7000', phone: '+919876500013', isPhoneVerified: false, profileStatus: 'pending' },
        'creators/cr4': { uid: 'u-riya', displayName: 'Riya Sharma', city: 'Lucknow', instagramFollowers: '8000', phone: '+919876500001', isPhoneVerified: true },
        'creators/cr5': { uid: 'u5', displayName: 'Rejected', city: 'Lucknow', instagramFollowers: '8000', phone: '+919876500015', isPhoneVerified: true, profileStatus: 'rejected' },
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

describe('the group invite with a Join button', () => {
    it('reads a group link’s invite code', () => {
        expect(groupCodeOf(GROUP)).toBe('AbCdEf123456');
        expect(groupCodeOf('https://chat.whatsapp.com/invite/AbCdEf123456/')).toBe('AbCdEf123456');
        expect(groupCodeOf('https://example.com/AbCdEf123456')).toBe('');
    });

    it('sends the code in the URL button, then Joined and Stop updates, with no link in the text', async () => {
        const res = await call('outreach-wa-send', { campaignId: 'c1', kind: 'group_invite', joinBy: 'Sat, 14 Nov', appIds: ['a1', 'a2'] });
        expect(res.body.queued).toBe(1);
        expect(res.body.skipped).toEqual([{ id: 'a1', reason: 'not_approved' }]);
        await drain();
        expect(sent[0].template.name).toBe('campaign_group_invite');
        expect(sent[0].template.components.find(c => c.type === 'body').parameters.map(p => p.text)).toEqual(['Kabir', 'Pinnaca 2026', 'Sat, 14 Nov']);
        expect(buttonsOf(sent[0])).toEqual([
            { type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: 'AbCdEf123456' }] },
            { type: 'button', sub_type: 'quick_reply', index: '1', parameters: [{ type: 'payload', payload: joinPayload('c1', 'a2') }] },
            { type: 'button', sub_type: 'quick_reply', index: '2', parameters: [{ type: 'payload', payload: STOP_PAYLOAD }] },
        ]);
    });

    it('refuses a link that isn’t a WhatsApp group invite', async () => {
        const res = await call('outreach-wa-send', { campaignId: 'c1', kind: 'group_invite', link: 'https://example.com/group', appIds: ['a2'] });
        expect(res.statusCode).toBe(400);
    });

    it('both new templates pass Meta’s pre-checks and match the code', () => {
        const invite = TEMPLATES.find(t => t.name === 'campaign_group_invite');
        const welcome = TEMPLATES.find(t => t.name === 'creator_welcome_city');
        expect(problemsWith(invite)).toEqual([]);
        expect(problemsWith(welcome)).toEqual([]);
        expect(invite.body).toBe(WA_TEMPLATES.group_invite.body);
        expect(welcome.body).toBe(WELCOME_CITY_BODY);
        expect(invite.buttons.map(b => b.type)).toEqual(['URL', 'QUICK_REPLY', 'QUICK_REPLY']);
        expect(invite.buttons[0].url).toBe('https://app.newbi.live/wa/g/{{1}}');
    });
});

describe('the welcome with the city community', () => {
    const creator = { displayName: 'Meera Joshi', phone: '98765 00011', city: 'Lucknow' };
    const cityGroup = { city: 'Lucknow', groupUrl: GROUP };

    it('goes once, with the community as a Join button', async () => {
        expect(await queueCityWelcome({ db, uid: 'u1', creator, cityGroup })).toBe('sent');
        expect(sent).toHaveLength(1);
        expect(sent[0].to).toBe('919876500011');
        expect(sent[0].template.name).toBe('creator_welcome_city');
        expect(sent[0].template.components.find(c => c.type === 'body').parameters.map(p => p.text)).toEqual(['Meera', 'Lucknow']);
        expect(buttonsOf(sent[0])[0].parameters[0].text).toBe('AbCdEf123456');
        expect(await queueCityWelcome({ db, uid: 'u1', creator, cityGroup })).toBe('already');
        expect(sent).toHaveLength(1);
    });

    it('stays off until its template is switched on, and skips people who turned WhatsApp off', async () => {
        db.store.set('users/u2', { channelPrefs: { whatsapp: false } });
        expect(await queueCityWelcome({ db, uid: 'u2', creator, cityGroup })).toBe('whatsapp_off');
        expect(await queueCityWelcome({ db, uid: 'u3', creator, cityGroup: { city: 'Lucknow', groupUrl: 'https://example.com' } })).toBe('no_group');
        vi.stubEnv('WHATSAPP_TEMPLATE_CREATOR_WELCOME_CITY', '');
        expect(await queueCityWelcome({ db, uid: 'u4', creator, cityGroup })).toBe('off');
        expect(sent).toHaveLength(0);
    });
});

describe('Campaign open to registered creators', () => {
    const CITY = { city: 'campaign', min: 0, niche: 'any', mode: 'all' };

    it('lists creators with whether they match, applied or were told', async () => {
        const res = await call('outreach-open-audience', { campaignId: 'c1' });
        expect(res.statusCode).toBe(200);
        expect(res.body.criteria).toEqual({ cities: ['Lucknow'], minFollowers: 5000, niches: [] });
        expect(res.body.template).toBe('campaign_invite');
        expect(res.body.open).toBe(true);
        const by = Object.fromEntries(res.body.creators.map(c => [c.id, c]));
        expect(Object.keys(by).sort()).toEqual(['cr1', 'cr2', 'cr3', 'cr4']);
        expect(by.cr1).toMatchObject({ cityMatch: true, verified: true, applied: false, told: null, followers: 12000, phone: '+919876500011' });
        expect(by.cr2.cityMatch).toBe(false);
        expect(by.cr3.verified).toBe(false);
        expect(by.cr4.applied).toBe(true);
    });

    it('sends to verified numbers only unless asked, never to people who applied, and once each', async () => {
        let res = await call('outreach-open-send', { campaignId: 'c1', creatorIds: ['cr1', 'cr3', 'cr4'], criteria: CITY });
        expect(res.statusCode).toBe(200);
        expect(res.body.queued).toBe(1);
        expect(res.body.skipped).toMatchObject({ noNumber: 1, notEligible: 1 });
        await drain();
        expect(sent.map(m => m.to)).toEqual(['919876500011']);
        expect(sent[0].template.name).toBe('campaign_invite');
        expect(buttonsOf(sent[0])[0].parameters[0].text).toBe('c1');

        res = await call('outreach-open-send', { campaignId: 'c1', creatorIds: ['cr1', 'cr3'], includeUnverified: true, criteria: CITY });
        expect(res.body.queued).toBe(1);
        expect(res.body.skipped.already).toBe(1);

        const audience = await call('outreach-open-audience', { campaignId: 'c1' });
        expect(audience.body.creators.find(c => c.id === 'cr1').told).toBe('sent');
    });

    it('needs the campaign to be taking applications', async () => {
        db.store.set('campaigns/c1', { ...db.store.get('campaigns/c1'), status: 'Closed' });
        expect((await call('outreach-open-send', { campaignId: 'c1', creatorIds: ['cr1'], criteria: CITY })).statusCode).toBe(409);
    });
});

describe('the campaign-live message with a View the brief button', () => {
    const CITY = { city: 'campaign', min: 0, niche: 'any', mode: 'all' };

    it('passes Meta’s pre-checks, matches the code, and opens the campaign page in the app', () => {
        const t = TEMPLATES.find(x => x.name === 'campaign_live_brief');
        expect(problemsWith(t)).toEqual([]);
        expect(t.body).toBe(LIVE_BRIEF_BODY);
        expect(t.category).toBe('MARKETING');
        expect(t.buttons.map(b => [b.type, b.text])).toEqual([['URL', 'View the brief'], ['QUICK_REPLY', 'Stop updates']]);
        expect(t.buttons[0].url).toBe('https://app.newbi.live/c/{{1}}');
        expect(fieldsFor({ name: 'campaign_live_brief', bodyVars: 2 })).toEqual({ body: ['first_name', 'campaign_title'], button: 'campaign_id' });
    });

    it('goes out instead of campaign_invite once it’s switched on, with the campaign id and Stop updates', async () => {
        vi.stubEnv('WHATSAPP_TEMPLATE_CAMPAIGN_LIVE_BRIEF', 'campaign_live_brief');
        expect((await call('outreach-open-audience', { campaignId: 'c1' })).body.template).toBe('campaign_live_brief');
        const res = await call('outreach-open-send', { campaignId: 'c1', creatorIds: ['cr1'], criteria: CITY });
        expect(res.body.queued).toBe(1);
        await drain();
        expect(sent[0].template.name).toBe('campaign_live_brief');
        expect(sent[0].template.components.find(c => c.type === 'body').parameters.map(p => p.text)).toEqual(['Meera', 'Pinnaca 2026']);
        expect(buttonsOf(sent[0])).toEqual([
            { type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: 'c1' }] },
            { type: 'button', sub_type: 'quick_reply', index: '1', parameters: [{ type: 'payload', payload: STOP_PAYLOAD }] },
        ]);
    });

    it('refuses to send with no criteria set, so it never goes to every registered creator', async () => {
        const res = await call('outreach-open-send', { campaignId: 'c1', creatorIds: ['cr1', 'cr2'], criteria: { city: 'any', min: 0, niche: 'any' } });
        expect(res.statusCode).toBe(400);
        // Asking for the campaign's niches when it has none sets nothing either.
        expect((await call('outreach-open-send', { campaignId: 'c1', creatorIds: ['cr1'], criteria: { city: 'any', niche: 'campaign' } })).statusCode).toBe(400);
        await drain();
        expect(sent).toHaveLength(0);
        // Sent with no criteria at all (an older page): the campaign's own cities, not everyone.
        const res2 = await call('outreach-open-send', { campaignId: 'c1', creatorIds: ['cr1', 'cr2'] });
        expect(res2.body).toMatchObject({ queued: 1, skipped: { notMatching: 1 } });
    });

    it('leaves out anyone picked who doesn’t fit, and “any” takes people who meet one criterion', async () => {
        // Delhi with 9,000 followers: not in the campaign's city.
        let res = await call('outreach-open-send', { campaignId: 'c1', creatorIds: ['cr1', 'cr2'], criteria: CITY });
        expect(res.body).toMatchObject({ queued: 1, skipped: { notMatching: 1 } });
        // In Lucknow OR at least 9,000 followers: Dev fits now.
        res = await call('outreach-open-send', { campaignId: 'c1', creatorIds: ['cr2'], criteria: { city: 'campaign', min: 9000, mode: 'any' } });
        expect(res.body).toMatchObject({ queued: 1, skipped: { notMatching: 0 } });
        await drain();
        expect(sent.map(m => m.to).sort()).toEqual(['919876500011', '919876500012']);
    });

    it('matches the campaign’s preferred niches', async () => {
        db.store.set('campaigns/c1', { ...db.store.get('campaigns/c1'), preferredNiches: ['Fashion & Luxury'] });
        db.store.set('creators/cr2', { ...db.store.get('creators/cr2'), niches: ['Fashion & Luxury'] });
        const audience = await call('outreach-open-audience', { campaignId: 'c1' });
        expect(audience.body.criteria.niches).toEqual(['Fashion & Luxury']);
        const by = Object.fromEntries(audience.body.creators.map(c => [c.id, c]));
        expect([by.cr1.nicheMatch, by.cr2.nicheMatch]).toEqual([false, true]);
        const res = await call('outreach-open-send', { campaignId: 'c1', creatorIds: ['cr1', 'cr2'], criteria: { city: 'any', niche: 'campaign' } });
        expect(res.body).toMatchObject({ queued: 1, skipped: { notMatching: 1 } });
    });

    it('sends to the cities picked, like the creator admin’s city filter', async () => {
        // Delhi only: Meera (Lucknow) is left out, Dev (Delhi) gets it.
        let res = await call('outreach-open-send', { campaignId: 'c1', creatorIds: ['cr1', 'cr2'], criteria: { cities: ['Delhi'], min: 0 } });
        expect(res.body).toMatchObject({ queued: 1, skipped: { notMatching: 1 } });
        await drain();
        expect(sent.map(m => m.to)).toEqual(['919876500012']);
        // All cities (none picked) with nothing else set is no criterion, and so is a word that means everywhere.
        expect((await call('outreach-open-send', { campaignId: 'c1', creatorIds: ['cr1'], criteria: { cities: [], min: 0 } })).statusCode).toBe(400);
        expect((await call('outreach-open-send', { campaignId: 'c1', creatorIds: ['cr1'], criteria: { cities: ['Others', 'Pan-India'] } })).statusCode).toBe(400);
        // All cities but a follower minimum: fine.
        res = await call('outreach-open-send', { campaignId: 'c1', creatorIds: ['cr1'], criteria: { cities: [], min: 10000 } });
        expect(res.body.queued).toBe(1);
    });

    it('matches city spellings the way the creator admin does', () => {
        expect(inCities(['Bengaluru'], 'Bangalore')).toBe(true);
        expect(inCities(['Delhi NCR'], 'New Delhi')).toBe(true);
        expect(inCities(['Lucknow', 'Pune'], 'Mumbai')).toBe(false);
        expect(inCities(['Lucknow'], '')).toBe(false);
        expect(cleanCities([' Pune ', 'Pune', 'Others', '', null])).toEqual(['Pune']);
        const crit = activeCriteria({ cities: ['Pune'], city: 'any' }, { cities: ['Lucknow'] });
        expect(matchesCriteria({ city: 'Pune', cityMatch: false }, crit)).toBe(true);
        expect(matchesCriteria({ city: 'Lucknow', cityMatch: true }, crit)).toBe(false);
    });

    it('reads all or any of the criteria that are set', () => {
        const campaign = { cities: ['Lucknow'], niches: ['Fashion & Luxury'] };
        const a = { cityMatch: true, followers: 3000, nicheMatch: false };
        const crit = activeCriteria({ city: 'campaign', min: 5000, niche: 'campaign' }, campaign);
        expect(crit).toHaveLength(3);
        expect(matchesCriteria(a, crit, 'all')).toBe(false);
        expect(matchesCriteria(a, crit, 'any')).toBe(true);
        expect(activeCriteria({ city: 'campaign', min: 0, niche: 'campaign' }, { cities: [], niches: [] })).toEqual([]);
        expect(matchesCriteria(a, [], 'all')).toBe(true);
    });
});

describe('Campaign open shows where each creator stands', () => {
    const CITY = { cities: ['Lucknow', 'Delhi'], min: 0 };

    it('reports queued, sent, delivered, read, replied and didn’t go from the queue, receipts and replies', async () => {
        // Four creators get it; then WhatsApp's receipts and a reply come in.
        db.store.set('creators/cr6', { uid: 'u6', displayName: 'Isha', city: 'Lucknow', instagramFollowers: '6000', phone: '+919876500016', isPhoneVerified: true });
        db.store.set('creators/cr7', { uid: 'u7', displayName: 'Kiran', city: 'Lucknow', instagramFollowers: '6000', phone: '+919876500017', isPhoneVerified: true });
        const res = await call('outreach-open-send', { campaignId: 'c1', creatorIds: ['cr1', 'cr2', 'cr6', 'cr7'], criteria: CITY });
        expect(res.body.queued).toBe(4);
        await drain();
        const jobOf = (uid) => db.store.get(`outreach_queue/invite_c1_${uid}`);
        const logFor = (uid, status, extra = {}) => db.store.set(`message_log/${uid}`, { channel: 'whatsapp', messageId: jobOf(uid).messageId, status, statusTimes: { [status]: '2026-11-05T10:00:00.000Z' }, ...extra });
        logFor('u1', 'read');
        logFor('u2', 'delivered');
        logFor('u6', 'failed', { error: 'Number not on WhatsApp' });
        db.store.set(`outreach_inbox/${contactIdFor('+919876500017')}`, { lastInboundAt: new Date(Date.now() + 60_000).toISOString() });
        // Someone else's message is still waiting.
        db.store.set('creators/cr8', { uid: 'u8', displayName: 'Noor', city: 'Lucknow', instagramFollowers: '6000', phone: '+919876500018', isPhoneVerified: true });
        db.store.set('outreach_queue/invite_c1_u8', { campaignId: 'c1', kind: 'template', status: 'queued', data: { phone: '+919876500018' }, createdAt: new Date().toISOString() });
        // And a cancelled one was never sent.
        db.store.set('creators/cr9', { uid: 'u9', displayName: 'Om', city: 'Lucknow', instagramFollowers: '6000', phone: '+919876500019', isPhoneVerified: true });
        db.store.set('outreach_queue/invite_c1_u9', { campaignId: 'c1', kind: 'template', status: 'cancelled', data: { phone: '+919876500019' } });

        const by = Object.fromEntries((await call('outreach-open-audience', { campaignId: 'c1' })).body.creators.map(c => [c.id, c]));
        expect(by.cr1.message).toMatchObject({ status: 'read', at: '2026-11-05T10:00:00.000Z', replied: false });
        expect(by.cr2.message.status).toBe('delivered');
        expect(by.cr6.message).toMatchObject({ status: 'failed', error: 'Number not on WhatsApp' });
        expect(by.cr6.told).toBe('failed');
        expect(by.cr7.message).toMatchObject({ status: 'sent', replied: true });
        expect(by.cr8.message.status).toBe('queued');
        expect(by.cr9.message).toBeNull();
        expect(Object.fromEntries(Object.entries(by).map(([id, c]) => [id, statusOf(c)]))).toMatchObject({
            cr1: 'read', cr2: 'delivered', cr6: 'failed', cr7: 'replied', cr8: 'queued', cr9: 'new', cr4: 'applied',
        });

        // A message that went but wasn't delivered can be sent again (only to the people picked).
        const again = await call('outreach-open-send', { campaignId: 'c1', creatorIds: ['cr6'], criteria: CITY, again: true });
        expect(again.body.queued).toBe(1);
    });

    it('ticks only people who still need it', () => {
        expect(statusOf({ applied: true, phone: '+91…' })).toBe('applied');
        expect(statusOf({ phone: '' })).toBe('blocked');
        expect(statusOf({ phone: '+91…', optedOut: true, message: { status: 'read' } })).toBe('blocked');
        expect(statusOf({ phone: '+91…', message: { status: 'failed', replied: true } })).toBe('failed');
        expect(['new', 'failed'].every(needsMessage)).toBe(true);
        expect(['queued', 'sent', 'read', 'replied', 'applied', 'blocked'].some(needsMessage)).toBe(false);
        expect(hasMessage('queued')).toBe(false);
        expect(['sent', 'delivered', 'read', 'replied'].every(hasMessage)).toBe(true);
    });
});

describe('the payout sheet', () => {
    it('reads an Amount column', () => {
        expect(parseAmount('₹2,000')).toBe(2000);
        expect(parseAmount('2k')).toBe(2000);
        expect(parseAmount('Rs. 1500/-')).toBe(1500);
        expect(parseAmount('free')).toBeNull();
        const table = parseDelimited('Name\tPhone\tAmount\nNeha\t9876500021\t₹1,500');
        const { columns } = detectColumns(table);
        expect(columns).toEqual({ 0: 'fullName', 1: 'phone', 2: 'agreedAmount' });
        expect(rowsFromTable(table, columns, true)[0].value.agreedAmount).toBe(1500);
    });

    it('adds new people to the shortlist and matches people already here, with their amount', async () => {
        const res = await call('outreach-import', {
            campaignId: 'c1', purpose: 'payout',
            rows: [
                { line: 2, fullName: 'Neha', phone: '9876500021', agreedAmount: '1500' },
                { line: 3, fullName: 'Riya', phone: '+919876500001', agreedAmount: '2000' },
            ],
        });
        expect(res.statusCode).toBe(200);
        expect(res.body.added).toHaveLength(1);
        expect(res.body.matched).toEqual(['a1']);
        const neha = db.store.get(`campaigns/c1/applications/${res.body.added[0]}`);
        expect(neha).toMatchObject({ status: 'shortlisted', addedVia: 'payout_sheet', agreedAmount: 1500, source: 'import' });
        const riya = db.store.get('campaigns/c1/applications/a1');
        expect(riya).toMatchObject({ status: 'shortlisted', agreedAmount: 2000 });
        expect(defaultPayoutAmount({ perksByTier: { nano: { cash: 500 } } }, { ...riya, tier: 'nano' })).toBe(2000);

        // Now they can be asked for payout details like anyone approved.
        const ask = await call('outreach-ask-payout', { campaignId: 'c1', appIds: [...res.body.added, ...res.body.matched] });
        expect(ask.body.results.map(r => r.outcome)).not.toContain('not_shortlisted');
    });

    it('leaves out people removed from the campaign', async () => {
        db.store.set('campaigns/c1/applications/a1', { ...db.store.get('campaigns/c1/applications/a1'), status: 'removed' });
        const res = await call('outreach-import', { campaignId: 'c1', purpose: 'payout', rows: [{ line: 2, phone: '+919876500001' }] });
        expect(res.body.matched).toEqual([]);
        expect(res.body.invalid).toEqual([{ line: 2, problem: 'Removed from this campaign' }]);
    });
});
