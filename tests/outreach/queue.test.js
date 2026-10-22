import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FakeFirestore, fakeReq, fakeRes } from '../helpers/fakeFirestore.js';
import { setDbForTests } from '../../api/_lib/db.js';
import { setWhatsAppFetchForTests, buildComponents, imageHeaderFor } from '../../api/_lib/whatsapp.js';
import {
    enqueueInvites, runQueue, cancelQueued, onOutreachInbound, onOutreachStatus, joinPayload, readJoinPayload, contactIdFor,
} from '../../api/_lib/outreachQueue.js';
import { handleOutreachAction } from '../../api/_lib/outreach.js';
import { templateParamsFor, renderTemplatePreview } from '../../src/lib/outreach/whatsappTemplate.js';
import { canSystemTransition, canTransition } from '../../src/lib/outreach/status.js';

const ADMIN = { actorUid: 'u-admin', actorEmail: 'ops@newbi.live' };
const ADMIN_TOKEN = { uid: 'u-admin', email: 'ops@newbi.live', email_verified: true };
const START = Date.parse('2026-10-20T06:00:00Z'); // 11:30 IST
const PEOPLE = [
    ['a1', 'Riya Sharma', '+919876500001'],
    ['a2', 'Arjun Kapoor', '+919876500002'],
    ['a3', 'rj_99', '+919876500003'],
    ['a4', 'Meera Iyer', '+919876500004'],
    ['a5', 'Kabir Mehta', '+919876500005'],
];

let db;
let sent;
let respond;

const metaOk = (n) => ({ ok: true, status: 200, json: async () => ({ messages: [{ id: `wamid.${n}` }] }) });
const metaError = (status, code, message) => ({ ok: false, status, json: async () => ({ error: { code, message } }) });
const app = (id) => db.store.get(`campaigns/c1/applications/${id}`);
const job = (id, kind = 'invite') => db.store.get(`outreach_queue/c1_${id}_${kind}`);
const audit = () => Object.values(db.dump('campaigns/c1/audit'));
const clock = () => Date.now();
const sleep = async (ms) => { vi.setSystemTime(Date.now() + ms); };
const advance = (ms) => vi.setSystemTime(Date.now() + ms);

beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(START);
    vi.stubEnv('WHATSAPP_ACCESS_TOKEN', 'test-token');
    vi.stubEnv('WHATSAPP_PHONE_NUMBER_ID', '123');
    ['campaign_shortlist', 'campaign_join_reminder', 'campaign_deliverables', 'campaign_deliverable_changes', 'creator_city_group', 'all_posts_approved', 'campaign_payout_sent'].forEach(t => vi.stubEnv(`WHATSAPP_TEMPLATE_${t.toUpperCase()}`, t));
    vi.stubEnv('OUTREACH_WA_PER_MINUTE', '3');
    vi.stubEnv('OUTREACH_WA_DAILY_CAP', '50');
    vi.stubEnv('LINK_SIGNING_SECRET', 'test-secret');
    vi.stubEnv('CRON_SECRET', '');
    const seed = {
        'campaigns/c1': { title: 'Arijit Singh Live', status: 'Open', postingDeadline: '2026-11-02' },
        'campaigns/c1/private/outreach': { whatsappGroupLink: 'https://chat.whatsapp.com/AbCdEf1234567', joinReminderHours: 48 },
        'admins/x': { email: 'ops@newbi.live', role: 'admin' },
    };
    PEOPLE.forEach(([id, fullName, phone]) => {
        seed[`campaigns/c1/applications/${id}`] = { fullName, phone, status: 'shortlisted' };
        seed[`campaigns/c1/application_keys/p:${phone}`] = { appId: id };
        seed[`creator_contacts/${contactIdFor(phone)}`] = { phone, campaignIds: ['c1'] };
    });
    seed['campaigns/c1/applications/a9'] = { fullName: 'Not Shortlisted', phone: '+919876500009', status: 'applied' };
    db = new FakeFirestore(seed);
    setDbForTests(db);
    sent = [];
    respond = () => metaOk(sent.length);
    setWhatsAppFetchForTests(async (url, init) => {
        const body = JSON.parse(init.body);
        sent.push(body);
        return respond(body);
    });
});

afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    setDbForTests(null);
    setWhatsAppFetchForTests(null);
});

describe('template variables', () => {
    it('map the Phase 1 placeholders and never send an empty variable', () => {
        const campaign = { title: 'Arijit Singh Live', postingDeadline: '2026-11-02' };
        expect(templateParamsFor('invite', { application: { fullName: 'riya sharma' }, campaign, groupLink: 'L' }))
            .toEqual(['Riya', 'Arijit Singh Live', 'L', 'Please post by Monday, 2 November.']);
        expect(templateParamsFor('invite', { application: { fullName: 'rj_99' }, campaign: { title: 'X' }, groupLink: 'L' }))
            .toEqual(['there', 'X', 'L', 'Details are in the group.']);
        expect(templateParamsFor('reminder', { application: { fullName: 'Riya' }, campaign, groupLink: 'L' })).toEqual(['Riya', 'Arijit Singh Live', 'L']);
        expect(renderTemplatePreview('reminder', { application: { fullName: 'Riya' }, campaign, groupLink: 'L' }))
            .toBe("⏰ *Quick reminder, Riya*\n\nYou haven't joined the *Arijit Singh Live* creators group yet. Here's the link:\nL\n\nTap *Joined ✅* once you're in.");
    });

    it('give each image template its own card, and none to text-only ones', () => {
        expect(imageHeaderFor('pass_confirmed')).toEqual({ type: 'image', link: 'https://app.newbi.live/og/wa-pass-v1.jpg' });
        expect(imageHeaderFor('creator_city_group').link).toBe('https://app.newbi.live/og/wa-city-v1.jpg');
        const links = ['pass_confirmed', 'campaign_ticket_link', 'creator_approved', 'campaign_invite', 'campaign_shortlisted', 'campaign_shortlist',
            'campaign_join_reminder', 'campaign_deliverables', 'campaign_deliverable_changes', 'campaign_payout_sent', 'creator_city_group'].map(t => imageHeaderFor(t).link);
        expect(new Set(links).size).toBe(links.length);
        expect(imageHeaderFor('creator_verification')).toBeNull();
        expect(imageHeaderFor('campaign_ticket')).toBeNull();
    });

    it('build a quick-reply button with our payload', () => {
        expect(buildComponents({ bodyParams: ['a'], buttons: [{ index: 0, payload: 'j1.x' }] })).toEqual([
            { type: 'body', parameters: [{ type: 'text', text: 'a' }] },
            { type: 'button', sub_type: 'quick_reply', index: '0', parameters: [{ type: 'payload', payload: 'j1.x' }] },
        ]);
    });

    it('sign the Joined payload so it cannot be made up', () => {
        const p = joinPayload('c1', 'a1');
        expect(readJoinPayload(p)).toEqual({ campaignId: 'c1', appId: 'a1' });
        expect(readJoinPayload(p.replace('a1', 'a2'))).toBeNull();
        expect(readJoinPayload('j1.c1.a1.AAAAAAAAAAAAAAAA')).toBeNull();
        expect(readJoinPayload('hello')).toBeNull();
    });

    it('only the system can move a sent message back', () => {
        expect(canTransition('message_sent', 'message_queued')).toBe(false);
        expect(canSystemTransition('message_sent', 'message_queued')).toBe(true);
    });
});

describe('enqueue', () => {
    it('queues shortlisted people, moves them to To send, audits it, and never queues twice', async () => {
        const r = await enqueueInvites(db, { campaignId: 'c1', appIds: ['a1', 'a2', 'a9'], actor: ADMIN });
        expect(r.queued).toEqual(['a1', 'a2']);
        expect(r.skipped).toEqual([{ id: 'a9', reason: 'not_allowed' }]);
        expect(app('a1')).toMatchObject({ status: 'message_queued', delivery: { whatsapp: { status: 'queued' } } });
        expect(job('a1')).toMatchObject({ status: 'queued', attempts: 0, createdBy: 'ops@newbi.live' });
        expect(audit()).toContainEqual(expect.objectContaining({ appId: 'a1', from: 'shortlisted', to: 'message_queued', source: 'whatsapp_api', actorEmail: 'ops@newbi.live' }));
        const again = await enqueueInvites(db, { campaignId: 'c1', appIds: ['a1'], actor: ADMIN });
        expect(again.skipped).toEqual([{ id: 'a1', reason: 'already' }]);
    });
});

describe('the worker', () => {
    it('sends the approved template with the Joined button, and never more than the per-minute limit', async () => {
        await enqueueInvites(db, { campaignId: 'c1', appIds: PEOPLE.map(p => p[0]), actor: ADMIN });
        const sleeps = [];
        const report = await runQueue({ db, clock, sleep: async (ms) => { sleeps.push(ms); await sleep(ms); }, deadline: Date.now() + 5 * 60_000 });
        expect(report).toMatchObject({ sent: 5, failed: 0, more: false });
        // 3 a minute: the 4th send waited for the window.
        expect(sleeps.length).toBeGreaterThan(0);
        const times = Object.values(db.dump('outreach_queue')).filter(j => j.kind === 'invite').map(j => Date.parse(j.sentAt)).sort();
        times.forEach((t, i) => { if (i >= 3) expect(t - times[i - 3]).toBeGreaterThanOrEqual(60_000); });

        const first = sent[0];
        expect(first.to).toBe('919876500001');
        expect(first.template.name).toBe('campaign_shortlist');
        const [header, body, button] = first.template.components;
        expect(header).toEqual({ type: 'header', parameters: [{ type: 'image', image: { link: 'https://app.newbi.live/og/wa-shortlist-v1.jpg' } }] });
        expect(body.parameters.map(p => p.text)).toEqual(['Riya', 'Arijit Singh Live', 'https://chat.whatsapp.com/AbCdEf1234567', 'Please post by Monday, 2 November.']);
        expect(readJoinPayload(button.parameters[0].payload)).toEqual({ campaignId: 'c1', appId: 'a1' });
        expect(sent.find(s => s.to === '919876500003').template.components.find(c => c.type === 'body').parameters[0].text).toBe('there');

        expect(app('a1')).toMatchObject({ status: 'message_sent', messageSentBy: 'WhatsApp API', lastMessageId: 'wamid.1' });
        expect(app('a1').delivery.whatsapp.status).toBe('sent');
        expect(job('a1', 'reminder')).toMatchObject({ status: 'queued', nextAttemptAt: new Date(Date.parse(job('a1').sentAt) + 48 * 3600_000).toISOString() });
        expect(audit()).toContainEqual(expect.objectContaining({ appId: 'a1', from: 'message_queued', to: 'message_sent', source: 'whatsapp_api', actorEmail: 'WhatsApp' }));
        // The daily retry worker must not resend outreach messages on its own.
        expect(Object.values(db.dump('message_log')).every(l => l.status !== 'retry')).toBe(true);
    });

    it('stops and hands over when the next slot is past its deadline', async () => {
        await enqueueInvites(db, { campaignId: 'c1', appIds: PEOPLE.map(p => p[0]), actor: ADMIN });
        const report = await runQueue({ db, clock, sleep, deadline: Date.now() + 20_000 });
        expect(report).toMatchObject({ sent: 3, more: true, dueLeft: 2 });
    });

    it('holds the daily cap across runs', async () => {
        vi.stubEnv('OUTREACH_WA_DAILY_CAP', '2');
        await enqueueInvites(db, { campaignId: 'c1', appIds: PEOPLE.map(p => p[0]), actor: ADMIN });
        const report = await runQueue({ db, clock, sleep, deadline: Date.now() + 5 * 60_000 });
        expect(report).toMatchObject({ sent: 2, capped: true });
        expect(sent).toHaveLength(2);
    });

    it('retries temporary errors with backoff, then sends', async () => {
        respond = () => (sent.length === 1 ? metaError(500, 1, 'Meta is down') : metaOk(sent.length));
        await enqueueInvites(db, { campaignId: 'c1', appIds: ['a1'], actor: ADMIN });
        let report = await runQueue({ db, clock, sleep, deadline: Date.now() + 30_000 });
        expect(report).toMatchObject({ sent: 0, retried: 1 });
        expect(job('a1')).toMatchObject({ status: 'queued', attempts: 1, lastError: 'Meta is down' });
        expect(Date.parse(job('a1').nextAttemptAt) - Date.now()).toBeGreaterThan(55_000);
        expect(app('a1')).toMatchObject({ status: 'message_queued', delivery: { whatsapp: { status: 'retrying' } } });
        advance(61_000);
        report = await runQueue({ db, clock, sleep, deadline: Date.now() + 30_000 });
        expect(report.sent).toBe(1);
        expect(app('a1').status).toBe('message_sent');
    });

    it('fails straight away on a permanent error and keeps them under To message', async () => {
        respond = () => metaError(400, 131026, 'Message undeliverable');
        await enqueueInvites(db, { campaignId: 'c1', appIds: ['a1'], actor: ADMIN });
        const report = await runQueue({ db, clock, sleep, deadline: Date.now() + 30_000 });
        expect(report.failed).toBe(1);
        expect(job('a1')).toMatchObject({ status: 'failed', errorCode: 131026, nextAttemptAt: null });
        expect(app('a1')).toMatchObject({ status: 'message_queued', delivery: { whatsapp: { status: 'failed' } } });
        expect(audit()).toContainEqual(expect.objectContaining({ appId: 'a1', field: 'whatsapp', to: 'failed', note: 'Message undeliverable' }));
        // A failed invite can be queued again.
        expect((await enqueueInvites(db, { campaignId: 'c1', appIds: ['a1'], actor: ADMIN })).queued).toEqual(['a1']);
    });

    it('cancels a queued invite when someone sent it by hand first', async () => {
        await enqueueInvites(db, { campaignId: 'c1', appIds: ['a1'], actor: ADMIN });
        db.store.set('campaigns/c1/applications/a1', { ...app('a1'), status: 'message_sent' });
        const report = await runQueue({ db, clock, sleep, deadline: Date.now() + 30_000 });
        expect(report.cancelled).toBe(1);
        expect(sent).toHaveLength(0);
    });

    it('lets an admin stop queued invites', async () => {
        await enqueueInvites(db, { campaignId: 'c1', appIds: ['a1', 'a2'], actor: ADMIN });
        expect(await cancelQueued(db, { campaignId: 'c1', actor: ADMIN })).toEqual({ cancelled: 2 });
        expect((await runQueue({ db, clock, sleep, deadline: Date.now() + 30_000 })).sent).toBe(0);
    });
});

describe('Joined, replies and reminders', () => {
    const sendAll = async (ids = ['a1', 'a2', 'a3']) => {
        await enqueueInvites(db, { campaignId: 'c1', appIds: ids, actor: ADMIN });
        await runQueue({ db, clock, sleep, deadline: Date.now() + 5 * 60_000 });
    };
    const tap = (from, payload) => onOutreachInbound({ from, type: 'button', button: { payload, text: 'Joined ✅' } }, { db });

    it('marks someone joined when they tap the button, and cancels their reminder', async () => {
        await sendAll();
        expect(await tap('919876500001', joinPayload('c1', 'a1'))).toBe('joined');
        expect(app('a1')).toMatchObject({ status: 'joined', joinedVia: 'button' });
        expect(job('a1', 'reminder').status).toBe('cancelled');
        expect(audit()).toContainEqual(expect.objectContaining({ appId: 'a1', from: 'message_sent', to: 'joined', source: 'whatsapp_webhook' }));
        expect(await tap('919876500001', joinPayload('c1', 'a1'))).toBeNull(); // tapping twice changes nothing
    });

    it('ignores a Joined tap from another number or with a forged payload', async () => {
        await sendAll();
        expect(await tap('919999999999', joinPayload('c1', 'a1'))).toBeNull();
        expect(await tap('919876500002', 'j1.c1.a2.AAAAAAAAAAAAAAAA')).toBeNull();
        expect(app('a1').status).toBe('message_sent');
        expect(app('a2').status).toBe('message_sent');
    });

    it('marks any other message as a reply, without storing the text', async () => {
        await sendAll();
        expect(await onOutreachInbound({ from: '919876500002', type: 'text', text: { body: 'what time?' } }, { db })).toBe('replied');
        expect(app('a2').status).toBe('replied');
        expect(JSON.stringify(app('a2'))).not.toContain('what time');
    });

    it('sends the reminder after the delay only to people who have not joined', async () => {
        await sendAll();
        await tap('919876500001', joinPayload('c1', 'a1'));
        sent = [];
        advance(47 * 3600_000);
        expect((await runQueue({ db, clock, sleep, deadline: Date.now() + 60_000 })).sent).toBe(0);
        advance(2 * 3600_000);
        const report = await runQueue({ db, clock, sleep, deadline: Date.now() + 5 * 60_000 });
        expect(report.sent).toBe(2);
        expect(sent.map(s => s.template.name)).toEqual(['campaign_join_reminder', 'campaign_join_reminder']);
        expect(sent.map(s => s.to).sort()).toEqual(['919876500002', '919876500003']);
        expect(app('a2').reminderSentAt).toBeTruthy();
        expect(audit()).toContainEqual(expect.objectContaining({ appId: 'a2', field: 'reminder', to: 'sent', source: 'reminder' }));
        // Joining from the reminder works the same way.
        expect(await tap('919876500002', joinPayload('c1', 'a2'))).toBe('joined');
    });

    it('does not remind when reminders are off for the campaign', async () => {
        db.store.set('campaigns/c1/private/outreach', { ...db.store.get('campaigns/c1/private/outreach'), remindersEnabled: false });
        await sendAll(['a1']);
        expect(job('a1', 'reminder')).toBeUndefined();
    });

    it('puts a failed invite back under To message when Meta reports it undelivered', async () => {
        await sendAll(['a1']);
        const log = Object.values(db.dump('message_log'))[0];
        await onOutreachStatus(log, { id: 'wamid.1', status: 'failed', errors: [{ title: 'Re-engagement message' }] }, { db });
        expect(app('a1').status).toBe('message_queued');
        expect(job('a1')).toMatchObject({ status: 'failed', lastError: 'Re-engagement message' });
        expect(job('a1', 'reminder').status).toBe('cancelled');
        expect(audit()).toContainEqual(expect.objectContaining({ appId: 'a1', from: 'message_sent', to: 'message_queued', source: 'whatsapp_webhook' }));
    });
});

describe('admin actions', () => {
    const call = async (action, body, { token = ADMIN_TOKEN, headers = {} } = {}) => {
        const res = fakeRes();
        const req = fakeReq({ body });
        Object.assign(req.headers, headers);
        await handleOutreachAction(action, req, res, { decodedToken: token, db });
        return res;
    };

    it('send queues and (without CRON_SECRET) sends the first batch in the same request', async () => {
        const res = await call('outreach-send', { campaignId: 'c1', appIds: ['a1', 'a2'] });
        expect(res.body).toMatchObject({ success: true, queued: ['a1', 'a2'], worker: { started: false, report: { sent: 2 } } });
        const list = await call('outreach-list', { campaignId: 'c1' });
        expect(list.body.whatsappApi).toMatchObject({ configured: true, queue: { sent: 2, reminders: 2 }, rate: { perMinute: 3, sentToday: 2 } });
    });

    it('refuses without a group link or when the API is not set up', async () => {
        db.store.set('campaigns/c1/private/outreach', {});
        expect((await call('outreach-send', { campaignId: 'c1', appIds: ['a1'] })).statusCode).toBe(409);
        vi.stubEnv('WHATSAPP_ACCESS_TOKEN', '');
        expect((await call('outreach-send', { campaignId: 'c1', appIds: ['a1'] })).body.error).toMatch(/isn’t set up/);
    });

    it('waits for each template’s switch: nothing is queued until it is on, and a queued one is stopped if it goes off', async () => {
        vi.stubEnv('WHATSAPP_TEMPLATE_CAMPAIGN_SHORTLIST', '');
        const off = await call('outreach-send', { campaignId: 'c1', appIds: ['a1'] });
        expect(off.statusCode).toBe(409);
        expect(off.body.error).toMatch(/WHATSAPP_TEMPLATE_CAMPAIGN_SHORTLIST/);
        expect((await enqueueInvites(db, { campaignId: 'c1', appIds: ['a1'], actor: ADMIN })).skipped).toEqual([{ id: 'a1', reason: 'template_off' }]);
        expect(job('a1')).toBeUndefined();
        const list = await call('outreach-list', { campaignId: 'c1' });
        expect(list.body.whatsappApi.templates).toMatchObject({ invite: false, reminder: true });

        vi.stubEnv('WHATSAPP_TEMPLATE_CAMPAIGN_SHORTLIST', 'campaign_shortlist');
        await enqueueInvites(db, { campaignId: 'c1', appIds: ['a1'], actor: ADMIN });
        vi.stubEnv('WHATSAPP_TEMPLATE_CAMPAIGN_SHORTLIST', '');
        await runQueue({ db, clock, sleep });
        expect(job('a1')).toMatchObject({ status: 'cancelled', lastError: expect.stringMatching(/switched on/) });
        expect(sent).toHaveLength(0);
    });

    it('runs the worker for the cron secret, and admins only otherwise', async () => {
        vi.stubEnv('CRON_SECRET', 'cron-secret');
        await enqueueInvites(db, { campaignId: 'c1', appIds: ['a1'], actor: ADMIN });
        const viaCron = await call('outreach-queue-run', {}, { token: null, headers: { authorization: 'Bearer cron-secret' } });
        expect(viaCron.body).toMatchObject({ success: true, sent: 1 });
        expect((await call('outreach-queue-run', {}, { token: null, headers: { authorization: 'Bearer wrong' } })).statusCode).toBe(401);
        expect((await call('outreach-queue-run', {}, { token: { uid: 'x', email: 'e@x.com', email_verified: true } })).statusCode).toBe(403);
    });

    it('saves reminder settings and validates the hours', async () => {
        const base = { campaignId: 'c1', whatsappGroupLink: 'https://chat.whatsapp.com/AbCdEf1234567', messageTemplate: '' };
        expect((await call('outreach-settings', { ...base, joinReminderHours: 0 })).body.field).toBe('joinReminderHours');
        expect((await call('outreach-settings', { ...base, joinReminderHours: 24, remindersEnabled: true })).body.success).toBe(true);
        expect(db.store.get('campaigns/c1/private/outreach')).toMatchObject({ joinReminderHours: 24, remindersEnabled: true });
        expect(audit()).toContainEqual(expect.objectContaining({ field: 'reminders', to: 'after 24 h' }));
    });
});
