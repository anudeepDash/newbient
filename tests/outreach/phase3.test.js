import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Tickets go through the passes system; here we only check outreach calls it right.
vi.mock('../../api/_lib/passes.js', () => ({
    releaseApplicationPass: vi.fn(async () => ({ ref: 'PASS123456', outcome: 'issued', channels: { email: 'sent', whatsapp: 'sent', push: 'skipped' } })),
    revokePassForOutreach: vi.fn(async () => ({ success: true })),
    ticketLinkFor: vi.fn((ref) => `https://app.newbi.live/t/token-for-${ref}`),
}));

import { FakeFirestore, fakeReq, fakeRes } from '../helpers/fakeFirestore.js';
import { setDbForTests } from '../../api/_lib/db.js';
import { setWhatsAppFetchForTests } from '../../api/_lib/whatsapp.js';
import { handleOutreachAction } from '../../api/_lib/outreach.js';
import { onOutreachInbound, joinPayload, submitToken, contactIdFor, runQueue } from '../../api/_lib/outreachQueue.js';
import { releaseApplicationPass, revokePassForOutreach } from '../../api/_lib/passes.js';
import { validateSubmission, deliverableSummary, preEventTasks, validatePayout, normalizeUpi } from '../../src/lib/outreach/deliverables.js';
import { renderMessage } from '../../src/lib/outreach/template.js';

const ADMIN = { uid: 'u-admin', email: 'ops@newbi.live', email_verified: true };
const EDITOR = { uid: 'u-ed', email: 'ed@newbi.live', email_verified: true };
const REEL = 'https://www.instagram.com/reel/C9xYz123AbC/';
const SHOT = 'https://res.cloudinary.com/dgtalrz4n/image/upload/v1/story.jpg';
const TASKS = [
    { id: 't_story', title: 'Instagram story 1', taskType: 'story', priority: 'required', deadline: '2026-11-10' },
    { id: 't_reel', title: 'Instagram reel 1', taskType: 'reel', priority: 'required', deadline: '2026-11-20' },
    { id: 't_extra', title: 'Bonus post', taskType: 'content_post', priority: 'optional' },
];

let db;
let sent;
let respond;

const app = (id = 'a1') => db.store.get(`campaigns/c1/applications/${id}`);
const audit = () => Object.values(db.dump('campaigns/c1/audit'));
const call = async (action, body = {}, { token = ADMIN, ip } = {}) => {
    const res = fakeRes();
    await handleOutreachAction(action, fakeReq({ body, ip }), res, { decodedToken: token, db });
    return res;
};
const link = (appId = 'a1') => submitToken('c1', appId);

beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(Date.parse('2026-11-01T06:00:00Z'));
    vi.stubEnv('WHATSAPP_ACCESS_TOKEN', 'test-token');
    vi.stubEnv('WHATSAPP_PHONE_NUMBER_ID', '123');
    ['campaign_shortlist', 'campaign_join_reminder', 'campaign_deliverables', 'campaign_deliverable_changes', 'creator_city_group', 'all_posts_approved', 'campaign_payout_sent'].forEach(t => vi.stubEnv(`WHATSAPP_TEMPLATE_${t.toUpperCase()}`, t));
    vi.stubEnv('LINK_SIGNING_SECRET', 'test-secret');
    vi.stubEnv('OUTREACH_WA_PER_MINUTE', '50');
    vi.stubEnv('CRON_SECRET', '');
    db = new FakeFirestore({
        'campaigns/c1': { title: 'Arijit Singh Live', status: 'Open', eventDate: '2026-11-15', tasks: TASKS, perksByTier: { micro: { cash: 1500 } } },
        'campaigns/c1/private/outreach': { whatsappGroupLink: 'https://chat.whatsapp.com/AbCdEf1234567' },
        'campaigns/c1/applications/a1': { fullName: 'Riya Sharma', phone: '+919876500001', status: 'message_sent', tier: 'micro', instagramHandle: 'riya.s' },
        'campaigns/c1/applications/a2': { fullName: 'Arjun Kapoor', phone: '+919876500002', status: 'removed', tier: 'nano' },
        'campaigns/c1/application_keys/p:+919876500001': { appId: 'a1' },
        [`creator_contacts/${contactIdFor('+919876500001')}`]: { phone: '+919876500001', campaignIds: ['c1'] },
        'admins/x': { email: 'ops@newbi.live', role: 'admin' },
        'admins/y': { email: 'ed@newbi.live', role: 'editor' },
    });
    setDbForTests(db);
    sent = [];
    respond = () => ({ ok: true, status: 200, json: async () => ({ messages: [{ id: `wamid.${sent.length}` }] }) });
    setWhatsAppFetchForTests(async (url, init = {}) => {
        if (String(url).includes('/messages')) {
            sent.push(JSON.parse(init.body));
            return respond();
        }
        if (String(url).endsWith('/MEDIA1')) return { ok: true, json: async () => ({ url: 'https://lookaside.example/m1', mime_type: 'image/jpeg', file_size: 3 }) };
        if (String(url) === 'https://lookaside.example/m1') return { ok: true, arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer };
        return { ok: false, json: async () => ({}) };
    });
    vi.mocked(releaseApplicationPass).mockClear();
    vi.mocked(revokePassForOutreach).mockClear();
});

afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    setDbForTests(null);
    setWhatsAppFetchForTests(null);
});

describe('deliverable rules', () => {
    it('check proof by type: links for reels and posts, screenshots for stories', () => {
        expect(validateSubmission(TASKS[1], { link: REEL }).ok).toBe(true);
        expect(validateSubmission(TASKS[1], { link: 'https://youtube.com/x' }).errors.link).toBeTruthy();
        expect(validateSubmission(TASKS[1], {}).errors.link).toBeTruthy();
        expect(validateSubmission(TASKS[0], { screenshotUrl: SHOT }).ok).toBe(true);
        expect(validateSubmission(TASKS[0], { screenshotUrl: 'https://evil.example/x.jpg' }).errors.screenshotUrl).toBeTruthy();
        expect(validateSubmission({ taskType: 'custom' }, {}).errors.link).toMatch(/link or a screenshot/);
    });

    it('know which deliverables come before the event', () => {
        expect(preEventTasks({ tasks: TASKS, eventDate: '2026-11-15' }).map(t => t.id)).toEqual(['t_story']);
        expect(preEventTasks({ tasks: TASKS }).map(t => t.id)).toEqual(['t_story', 't_reel']);
    });

    it('validate payouts and UPI IDs', () => {
        expect(validatePayout({ amount: '1,500', method: 'upi', paidAt: '2026-11-21', reference: '412345678901' })).toMatchObject({ ok: true, value: { amount: 1500 } });
        expect(Object.keys(validatePayout({ amount: 0, method: 'x', paidAt: 'soon', reference: 'a b!' }).errors).sort()).toEqual(['amount', 'method', 'paidAt', 'reference']);
        expect(normalizeUpi(' Riya.S@OKAXIS ')).toBe('riya.s@okaxis');
        expect(normalizeUpi('9876543210')).toBeNull();
    });

    it('fill {submit_link} in the hand-sent message', () => {
        expect(renderMessage('Send here: {submit_link}', { application: { fullName: 'Riya', submitUrl: 'https://app.newbi.live/d/abc' }, campaign: {} })).toBe('Send here: https://app.newbi.live/d/abc');
    });
});

describe('the creator’s personal link', () => {
    it('shows their deliverables, and refuses forged, removed or unknown links', async () => {
        const res = await call('outreach-deliverables', { token: link() }, { token: null });
        expect(res.body).toMatchObject({ success: true, firstName: 'Riya', campaign: { title: 'Arijit Singh Live' } });
        expect(res.body.tasks.map(t => [t.id, t.proof, t.status])).toEqual([['t_story', 'screenshot', 'not_started'], ['t_reel', 'link', 'not_started'], ['t_extra', 'link', 'not_started']]);
        expect(JSON.stringify(res.body)).not.toContain('+9198765');
        expect((await call('outreach-deliverables', { token: `${link()}x` }, { token: null })).statusCode).toBe(404);
        expect((await call('outreach-deliverables', { token: link('a2') }, { token: null })).statusCode).toBe(404);
    });

    it('takes a submission, records it and audits it; an approved one is final', async () => {
        let res = await call('outreach-submit', { token: link(), taskId: 't_reel', link: 'https://instagram.com/riya.s' }, { token: null });
        expect(res.body.errors.link).toBeTruthy();
        res = await call('outreach-submit', { token: link(), taskId: 't_reel', link: REEL, note: 'Posted!' }, { token: null });
        expect(res.body.success).toBe(true);
        expect(app().deliverables.t_reel).toMatchObject({ status: 'submitted', link: REEL, note: 'Posted!' });
        expect(audit()).toContainEqual(expect.objectContaining({ appId: 'a1', field: 'deliverable:Instagram reel 1', to: 'submitted', source: 'creator' }));
        await call('outreach-review', { campaignId: 'c1', appId: 'a1', taskId: 't_reel', decision: 'approve' });
        res = await call('outreach-submit', { token: link(), taskId: 't_reel', link: REEL }, { token: null });
        expect(res.statusCode).toBe(409);
    });

    it('stores a UPI ID for payment without writing it to the audit log', async () => {
        expect((await call('outreach-upi', { token: link(), upiId: 'not-upi' }, { token: null })).body.field).toBe('upiId');
        const res = await call('outreach-upi', { token: link(), upiId: 'riya.s@okaxis', upiName: 'Riya Sharma' }, { token: null });
        expect(res.body).toEqual({ success: true, upi: 'ri••••@okaxis' });
        expect(app().payoutDetails).toMatchObject({ upiId: 'riya.s@okaxis', upiName: 'Riya Sharma' });
        expect(JSON.stringify(audit())).not.toContain('okaxis');
    });
});

describe('review', () => {
    const submitAll = async () => {
        await call('outreach-submit', { token: link(), taskId: 't_story', screenshotUrl: SHOT }, { token: null });
        await call('outreach-submit', { token: link(), taskId: 't_reel', link: REEL }, { token: null });
    };

    it('needs a reason to ask for changes, and messages the creator with it and their link', async () => {
        await submitAll();
        expect((await call('outreach-review', { campaignId: 'c1', appId: 'a1', taskId: 't_reel', decision: 'reject' })).body.field).toBe('reason');
        const res = await call('outreach-review', { campaignId: 'c1', appId: 'a1', taskId: 't_reel', decision: 'reject', reason: 'Tag @newbi.live in the caption.' });
        expect(res.body).toMatchObject({ success: true, status: 'rejected', message: 'sent' });
        expect(app().deliverables.t_reel).toMatchObject({ status: 'rejected', reason: 'Tag @newbi.live in the caption.', reviewedBy: 'ops@newbi.live' });
        const msg = sent.at(-1);
        expect(msg.template.name).toBe('campaign_deliverable_changes');
        expect(msg.template.components.find(c => c.type === 'body').parameters.map(p => p.text)).toEqual(['Riya', 'Instagram reel 1', 'Tag @newbi.live in the caption.']);
        expect(msg.template.components.find(c => c.type === 'button')).toMatchObject({ sub_type: 'url', parameters: [{ text: link() }] });
        // The creator sees the reason and can send it again.
        const view = await call('outreach-deliverables', { token: link() }, { token: null });
        expect(view.body.tasks.find(t => t.id === 't_reel')).toMatchObject({ status: 'rejected', reason: 'Tag @newbi.live in the caption.' });
        expect((await call('outreach-submit', { token: link(), taskId: 't_reel', link: REEL }, { token: null })).body.success).toBe(true);
    });

    it('releases the ticket once pre-event deliverables are approved, and marks them posted when all required are', async () => {
        await submitAll();
        let res = await call('outreach-review', { campaignId: 'c1', appId: 'a1', taskId: 't_story', decision: 'approve' });
        expect(res.body.ticket).toBe('released');
        expect(releaseApplicationPass).toHaveBeenCalledWith(db, expect.objectContaining({ campaignId: 'c1', appId: 'a1', staffEmail: 'ops@newbi.live' }));
        expect(app().ticket).toMatchObject({ status: 'released', passRef: 'PASS123456', rule: 'deliverables' });
        expect(app().status).toBe('message_sent');
        res = await call('outreach-review', { campaignId: 'c1', appId: 'a1', taskId: 't_reel', decision: 'approve' });
        expect(res.body).toMatchObject({ status: 'approved', movedTo: 'posted' });
        expect(app().status).toBe('posted');
        // One "all approved" WhatsApp for the campaign, only after the last required post (the story approval sent none).
        const allApproved = sent.filter(m => m.template?.name === 'all_posts_approved');
        expect(allApproved).toHaveLength(1);
        expect(allApproved[0].template.components.find(c => c.type === 'body').parameters[1].text).toBe('Arijit Singh Live');
        expect(audit()).toContainEqual(expect.objectContaining({ field: 'status', from: 'message_sent', to: 'posted' }));
        expect(releaseApplicationPass).toHaveBeenCalledTimes(1);
        const view = await call('outreach-deliverables', { token: link() }, { token: null });
        expect(view.body.ticket.url).toContain('token-for-PASS123456');
    });

    it('does not release tickets on approval when the rule is manual', async () => {
        db.store.set('campaigns/c1/private/outreach', { ...db.store.get('campaigns/c1/private/outreach'), ticketRule: 'manual' });
        await submitAll();
        await call('outreach-review', { campaignId: 'c1', appId: 'a1', taskId: 't_story', decision: 'approve' });
        expect(releaseApplicationPass).not.toHaveBeenCalled();
        const res = await call('outreach-ticket', { campaignId: 'c1', appIds: ['a1'], action: 'release' });
        expect(res.body.results).toEqual([{ id: 'a1', outcome: 'released' }]);
        expect((await call('outreach-ticket', { campaignId: 'c1', appIds: ['a1'], action: 'release' })).body.results[0].outcome).toBe('already');
        const revoked = await call('outreach-ticket', { campaignId: 'c1', appIds: ['a1'], action: 'revoke', reason: 'Dropped out' });
        expect(revoked.body.results[0].outcome).toBe('revoked');
        expect(revokePassForOutreach).toHaveBeenCalledWith(db, 'PASS123456', { reason: 'Dropped out', staffEmail: 'ops@newbi.live' });
        expect(app().ticket.status).toBe('revoked');
    });

    it('is for outreach admins only', async () => {
        expect((await call('outreach-review', { campaignId: 'c1', appId: 'a1', taskId: 't_reel', decision: 'approve' }, { token: EDITOR })).statusCode).toBe(403);
        expect((await call('outreach-payout', { campaignId: 'c1', appId: 'a1' }, { token: null })).statusCode).toBe(401);
    });
});

describe('payouts', () => {
    const PAY = { campaignId: 'c1', appId: 'a1', action: 'paid', amount: 1500, method: 'upi', paidAt: '2026-11-21', reference: '412345678901' };
    const approveAll = async () => {
        await call('outreach-submit', { token: link(), taskId: 't_story', screenshotUrl: SHOT }, { token: null });
        await call('outreach-submit', { token: link(), taskId: 't_reel', link: REEL }, { token: null });
        await call('outreach-review', { campaignId: 'c1', appId: 'a1', taskId: 't_story', decision: 'approve' });
        await call('outreach-review', { campaignId: 'c1', appId: 'a1', taskId: 't_reel', decision: 'approve' });
    };

    it('waits for approved deliverables unless an admin overrides with a reason', async () => {
        let res = await call('outreach-payout', PAY);
        expect(res.body).toMatchObject({ success: false, code: 'deliverables' });
        res = await call('outreach-payout', { ...PAY, override: true, overrideReason: '' });
        expect(res.body.field).toBe('overrideReason');
        res = await call('outreach-payout', { ...PAY, override: true, overrideReason: 'Agreed advance for travel' });
        expect(res.body.success).toBe(true);
        expect(app()).toMatchObject({ status: 'paid', payout: { status: 'paid', override: true, overrideReason: 'Agreed advance for travel' } });
    });

    it('records the payout, writes a Spend for Finance, moves them to paid and tells them', async () => {
        await approveAll();
        await call('outreach-upi', { token: link(), upiId: 'riya.s@okaxis' }, { token: null });
        const res = await call('outreach-payout', PAY);
        expect(res.body).toMatchObject({ success: true, status: 'paid', notice: 'sent' });
        const spend = db.store.get(`spends/${res.body.spendId}`);
        expect(spend).toMatchObject({
            title: 'Creator payout: Arijit Singh Live', amount: 1500, payoutType: 'Creator Payout', date: '2026-11-21', status: 'Paid',
            paymentMode: 'UPI', paymentRef: '412345678901', receiverName: 'Riya Sharma', destinationDetails: 'UPI: riya.s@okaxis',
            source: 'outreach', linkedCampaignId: 'c1', linkedApplicationId: 'a1', createdByEmail: 'ops@newbi.live', accountType: 'newbi',
        });
        expect(app()).toMatchObject({ status: 'paid', payout: { status: 'paid', amount: 1500, spendId: res.body.spendId, paidBy: 'ops@newbi.live' } });
        expect(app().payout.noticeSentAt).toBeTruthy();
        const notice = sent.at(-1);
        expect(notice.template.name).toBe('campaign_payout_sent');
        expect(notice.template.components.find(c => c.type === 'body').parameters.map(p => p.text)).toEqual(['Riya', '1,500', 'Arijit Singh Live', '412345678901']);
        expect(audit()).toContainEqual(expect.objectContaining({ field: 'payout', to: 'paid', note: '₹1,500 by UPI, ref 412345678901' }));
        expect((await call('outreach-payout', PAY)).statusCode).toBe(409);
    });

    it('cancels a payout: the Spend is marked Cancelled and they go back to posted', async () => {
        await approveAll();
        const { body } = await call('outreach-payout', PAY);
        const res = await call('outreach-payout', { campaignId: 'c1', appId: 'a1', action: 'cancel', reason: 'Wrong amount' });
        expect(res.body.success).toBe(true);
        expect(db.store.get(`spends/${body.spendId}`).status).toBe('Cancelled');
        expect(app()).toMatchObject({ status: 'posted', payout: { status: 'cancelled', cancelReason: 'Wrong amount' } });
        // And it can be paid again.
        expect((await call('outreach-payout', { ...PAY, amount: 2000 })).body.success).toBe(true);
    });
});

describe('Joined, inbox and replies', () => {
    const tap = () => onOutreachInbound({ from: '919876500001', id: 'wamid.in1', type: 'button', button: { payload: joinPayload('c1', 'a1'), text: 'Joined ✅' } }, { db, name: 'Riya S' });
    const thread = () => db.store.get(`outreach_inbox/${contactIdFor('+919876500001')}`);
    const threadId = () => contactIdFor('+919876500001');

    it('after Joined sends their personal link, and never releases a ticket just for joining', async () => {
        // An old campaign set to "when they tap Joined" now waits for deliverables instead.
        db.store.set('campaigns/c1/private/outreach', { ...db.store.get('campaigns/c1/private/outreach'), ticketRule: 'joined' });
        expect(await tap()).toBe('joined');
        const linkMsg = sent.find(m => m.template?.name === 'campaign_deliverables');
        expect(linkMsg.template.components.find(c => c.type === 'button').parameters[0].text).toBe(link());
        expect(app().submitLinkSentAt).toBeTruthy();
        expect(releaseApplicationPass).not.toHaveBeenCalled();
        expect((await call('outreach-list', { campaignId: 'c1' })).body.settings.ticketRule).toBe('deliverables');
    });

    it('keeps every message in the person’s thread, once, with their WhatsApp name', async () => {
        await tap();
        await tap(); // Meta retried the webhook
        await onOutreachInbound({ from: '919876500001', id: 'wamid.in2', type: 'text', text: { body: 'What time is soundcheck?' } }, { db, name: 'Riya S' });
        const msgs = Object.values(db.dump(`outreach_inbox/${threadId()}/inbox_messages`));
        const incoming = msgs.filter(m => m.direction === 'in');
        expect(incoming.map(m => m.text)).toEqual(['Joined ✅', 'What time is soundcheck?']);
        expect(msgs.some(m => m.direction === 'out' && m.text.includes('personal link'))).toBe(true);
        expect(thread()).toMatchObject({ name: 'Riya S', unread: 2, state: 'open', campaignIds: ['c1'], lastAppId: 'a1' });
        expect(incoming[0].expiresAt).toBeInstanceOf(Date);
    });

    it('lists threads and opens one with the person’s applications, marking it read', async () => {
        await onOutreachInbound({ from: '919876500001', id: 'wamid.in2', type: 'text', text: { body: 'Hi!' } }, { db });
        const list = await call('inbox-list', { campaignId: 'c1' });
        expect(list.body).toMatchObject({ unread: 1, threads: [{ id: threadId(), lastText: 'Hi!', windowOpen: true }] });
        const open = await call('inbox-thread', { threadId: threadId() });
        expect(open.body.applications).toEqual([expect.objectContaining({ campaignId: 'c1', appId: 'a1', fullName: 'Riya Sharma', status: 'replied' })]);
        expect(open.body.messages.map(m => m.text)).toEqual(['Hi!']);
        expect(thread().unread).toBe(0);
        expect((await call('inbox-list', {}, { token: EDITOR })).statusCode).toBe(403);
    });

    it('replies with free text inside 24 hours, and only a template after that', async () => {
        await onOutreachInbound({ from: '919876500001', id: 'wamid.in2', type: 'text', text: { body: 'Hi!' } }, { db });
        let res = await call('inbox-reply', { threadId: threadId(), text: '6 pm at the venue gate.' });
        expect(res.body).toMatchObject({ success: true, outcome: 'sent' });
        expect(sent.at(-1)).toMatchObject({ type: 'text', to: '919876500001', text: { body: '6 pm at the venue gate.' } });
        const out = db.store.get(`outreach_inbox/${threadId()}/inbox_messages/${res.body.messageId}`);
        expect(out).toMatchObject({ direction: 'out', sentBy: 'ops@newbi.live', delivery: { whatsapp: { status: 'sent' } } });

        vi.setSystemTime(Date.now() + 25 * 3600_000);
        res = await call('inbox-reply', { threadId: threadId(), text: 'Still there?' });
        expect(res.body.code).toBe('window_closed');
        res = await call('inbox-template', { threadId: threadId(), kind: 'deliverables' });
        expect(res.body).toMatchObject({ success: true, outcome: 'sent' });
        expect(sent.at(-1).template.name).toBe('campaign_deliverables');
    });

    it('fetches a photo they sent through the server, and can close a thread', async () => {
        await onOutreachInbound({ from: '919876500001', id: 'wamid.in3', type: 'image', image: { id: 'MEDIA1', mime_type: 'image/jpeg', caption: 'My story' } }, { db });
        const msgs = db.dump(`outreach_inbox/${threadId()}/inbox_messages`);
        const [id, msg] = Object.entries(msgs)[0];
        expect(msg).toMatchObject({ type: 'image', caption: 'My story', mediaId: 'MEDIA1' });
        const media = await call('inbox-media', { threadId: threadId(), messageId: id });
        expect(media.body).toEqual({ success: true, mimeType: 'image/jpeg', dataUrl: 'data:image/jpeg;base64,AQID' });
        await call('inbox-state', { threadId: threadId(), state: 'done' });
        expect(thread().state).toBe('done');
        expect((await call('inbox-list', { state: 'open' })).body.threads).toHaveLength(0);
    });

    it('keeps their reaction with the message it’s on, and lets us react and quote-reply', async () => {
        await onOutreachInbound({ from: '919876500001', id: 'wamid.in2', type: 'text', text: { body: 'Hi!' } }, { db });
        const reply = await call('inbox-reply', { threadId: threadId(), text: 'Hey Riya' });
        const ourWamid = `wamid.${sent.length}`; // the fake Meta numbers its answers
        await onOutreachInbound({ from: '919876500001', id: 'wamid.in3', type: 'reaction', reaction: { message_id: ourWamid, emoji: '❤️' } }, { db });
        await onOutreachInbound({ from: '919876500001', id: 'wamid.in4', type: 'text', text: { body: 'See you there' }, context: { id: ourWamid } }, { db });
        let open = await call('inbox-thread', { threadId: threadId() });
        const byText = Object.fromEntries(open.body.messages.map(m => [m.text, m]));
        expect(byText['Hey Riya'].wamid).toBe(ourWamid);
        expect(byText['❤️']).toMatchObject({ type: 'reaction', direction: 'in', reactTo: ourWamid });
        expect(byText['See you there'].replyTo).toBe(ourWamid);
        expect(thread().lastText).toBe('See you there');

        const hiId = byText['Hi!'].id;
        let res = await call('inbox-react', { threadId: threadId(), messageId: hiId, emoji: '👍' });
        expect(res.body).toMatchObject({ success: true, emoji: '👍' });
        expect(sent.at(-1)).toMatchObject({ type: 'reaction', to: '919876500001', reaction: { message_id: 'wamid.in2', emoji: '👍' } });
        await call('inbox-react', { threadId: threadId(), messageId: hiId, emoji: '😂' });
        open = await call('inbox-thread', { threadId: threadId() });
        expect(open.body.messages.filter(m => m.type === 'reaction' && m.direction === 'out').map(m => m.text)).toEqual(['😂']);
        expect((await call('inbox-react', { threadId: threadId(), messageId: hiId, emoji: 'lol' })).statusCode).toBe(400);

        res = await call('inbox-reply', { threadId: threadId(), text: 'Gate 2', replyToId: hiId });
        expect(sent.at(-1)).toMatchObject({ type: 'text', context: { message_id: 'wamid.in2' } });
        expect(db.store.get(`outreach_inbox/${threadId()}/inbox_messages/${res.body.messageId}`).replyTo).toBe('wamid.in2');
        expect(reply.body.success).toBe(true);

        vi.setSystemTime(Date.now() + 25 * 3600_000);
        expect((await call('inbox-react', { threadId: threadId(), messageId: hiId, emoji: '👍' })).body.code).toBe('window_closed');
    });

    it('a queued reply that misses the window is cancelled, not sent', async () => {
        await onOutreachInbound({ from: '919876500001', id: 'wamid.in2', type: 'text', text: { body: 'Hi!' } }, { db });
        vi.stubEnv('OUTREACH_WA_PER_MINUTE', '1');
        await call('inbox-reply', { threadId: threadId(), text: 'one' });
        const res = await call('inbox-reply', { threadId: threadId(), text: 'two' });
        expect(res.body.outcome).toBe('queued');
        vi.setSystemTime(Date.now() + 25 * 3600_000);
        const report = await runQueue({ db, clock: () => Date.now(), sleep: async () => {}, deadline: Date.now() + 10_000 });
        expect(report.cancelled).toBe(1);
        expect(db.store.get(`outreach_inbox/${threadId()}/inbox_messages/${res.body.messageId}`).status).toBe('failed');
    });
});

describe('the creator’s campaign page: groups and “I’ve joined”', () => {
    beforeEach(() => {
        db.store.set('campaigns/c1/applications/a1', { ...app(), uid: 'u-riya', contactId: contactIdFor('+919876500001'), cityGroup: { city: 'Bengaluru', title: 'Bengaluru Creators Community', url: 'https://chat.whatsapp.com/BlrGroup123456' } });
        db.store.set('outreach_members/u-riya', { apps: { c1_a1: { campaignId: 'c1', appId: 'a1', at: '2026-10-30T00:00:00Z' } } });
    });

    it('shows both groups once shortlisted, and hides the campaign group before', async () => {
        let view = await call('outreach-deliverables', { token: link() }, { token: null });
        expect(view.body.groups).toEqual({
            campaign: { url: 'https://chat.whatsapp.com/AbCdEf1234567', joined: false },
            city: { city: 'Bengaluru', title: 'Bengaluru Creators Community', url: 'https://chat.whatsapp.com/BlrGroup123456', joined: false },
        });
        db.store.set('campaigns/c1/applications/a1', { ...app(), status: 'applied' });
        view = await call('outreach-deliverables', { token: link() }, { token: null });
        expect(view.body.groups.campaign).toBeNull();
        expect(view.body.groups.city).not.toBeNull();
    });

    it('marks them joined when they tap I’ve joined, and stops the reminder', async () => {
        db.store.set('outreach_queue/c1_a1_reminder', { campaignId: 'c1', appId: 'a1', kind: 'reminder', status: 'queued', nextAttemptAt: '2026-11-03T00:00:00Z' });
        const res = await call('outreach-joined', { token: link(), which: 'campaign' }, { token: null });
        expect(res.body).toMatchObject({ success: true, status: 'joined' });
        expect(app()).toMatchObject({ status: 'joined', joinedVia: 'app' });
        expect(db.store.get('outreach_queue/c1_a1_reminder').status).toBe('cancelled');
        expect(audit()).toContainEqual(expect.objectContaining({ appId: 'a1', from: 'message_sent', to: 'joined', source: 'creator' }));
        await call('outreach-joined', { token: link(), which: 'city' }, { token: null });
        expect(app().cityGroupJoinedAt).toBeTruthy();
        const view = await call('outreach-deliverables', { token: link() }, { token: null });
        expect(view.body.groups.campaign.joined && view.body.groups.city.joined).toBe(true);
    });

    it('lets them join from the app before the WhatsApp message lands, but not before the shortlist', async () => {
        db.store.set('campaigns/c1/applications/a1', { ...app(), status: 'message_queued' });
        expect((await call('outreach-joined', { token: link(), which: 'campaign' }, { token: null })).body.status).toBe('joined');
        db.store.set('campaigns/c1/applications/a1', { ...app(), status: 'applied' });
        expect((await call('outreach-joined', { token: link(), which: 'campaign' }, { token: null })).statusCode).toBe(409);
    });

    it('lists the signed-in creator’s own campaigns, and nobody else’s', async () => {
        const mine = await call('outreach-mine', {}, { token: { uid: 'u-riya' } });
        expect(mine.body.items).toEqual([expect.objectContaining({ campaignId: 'c1', appId: 'a1', title: 'Arijit Singh Live', status: 'message_sent', hubUrl: `https://app.newbi.live/d/${link()}` })]);
        db.store.set('outreach_members/u-other', { apps: { c1_a1: { campaignId: 'c1', appId: 'a1' } } });
        expect((await call('outreach-mine', {}, { token: { uid: 'u-other' } })).body.items).toEqual([]);
        expect((await call('outreach-mine', {}, { token: null })).statusCode).toBe(401);
    });
});

describe('STOP and START', () => {
    const contact = () => db.store.get(`creator_contacts/${contactIdFor('+919876500001')}`);
    const from = '919876500001';

    it('stops every template to that number, cancels what’s queued and confirms once', async () => {
        db.store.set('outreach_queue/c1_a1_reminder', { campaignId: 'c1', appId: 'a1', kind: 'reminder', status: 'queued', nextAttemptAt: '2026-11-03T00:00:00Z' });
        const out = await onOutreachInbound({ from, id: 'wamid.s1', type: 'button', button: { payload: 'stop', text: 'Stop updates' } }, { db });
        expect(out).toBe('stopped');
        expect(contact().whatsappOptOut).toMatchObject({ via: '“Stop updates”' });
        expect(app().whatsappOptOut).toBe(true);
        expect(db.store.get('outreach_queue/c1_a1_reminder').status).toBe('cancelled');
        expect(sent.at(-1)).toMatchObject({ type: 'text', to: from });
        expect(sent.at(-1).text.body).toMatch(/won’t get campaign updates/);
        expect(audit()).toContainEqual(expect.objectContaining({ appId: 'a1', field: 'whatsapp_opt_out', to: 'stopped' }));

        // Nothing template-based goes out any more: queued sends are cancelled, the inbox refuses templates.
        const before = sent.length;
        await call('outreach-resend-link', { campaignId: 'c1', appIds: ['a1'] });
        expect(sent.length).toBe(before);
        const threadId = contactIdFor('+919876500001');
        expect((await call('inbox-template', { threadId, kind: 'deliverables' })).body.code).toBe('opted_out');
    });

    it('takes plain replies like “stop.” but not sentences that only contain the word', async () => {
        expect(await onOutreachInbound({ from, id: 'wamid.s2', type: 'text', text: { body: 'please stop sending the brief twice' } }, { db })).toBe('replied');
        expect(contact()?.whatsappOptOut?.at).toBeFalsy();
        expect(await onOutreachInbound({ from, id: 'wamid.s3', type: 'text', text: { body: ' Stop. ' } }, { db })).toBe('stopped');
    });

    it('turns updates back on with START', async () => {
        await onOutreachInbound({ from, id: 'wamid.s4', type: 'text', text: { body: 'STOP' } }, { db });
        expect(await onOutreachInbound({ from, id: 'wamid.s5', type: 'text', text: { body: 'start' } }, { db })).toBe('started');
        expect(contact().whatsappOptOut).toBeNull();
        expect(app().whatsappOptOut).toBe(false);
        const before = sent.length;
        await call('outreach-resend-link', { campaignId: 'c1', appIds: ['a1'] });
        expect(sent.length).toBe(before + 1);
    });
});

describe('admin list', () => {
    it('includes each person’s personal link when the campaign has deliverables', async () => {
        const res = await call('outreach-list', { campaignId: 'c1' });
        const a1 = res.body.applications.find(a => a.id === 'a1');
        expect(a1.submitUrl).toBe(`https://app.newbi.live/d/${link()}`);
        expect(res.body.settings.ticketRule).toBe('deliverables');
        expect(deliverableSummary(db.store.get('campaigns/c1'), a1)).toMatchObject({ total: 3, requiredCount: 2, allRequiredApproved: false });
    });
});
