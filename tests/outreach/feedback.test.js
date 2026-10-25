import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Emails are checked for who they go to, not sent.
vi.mock('../../api/_lib/mail/send.js', () => ({
    sendTransactional: vi.fn(async () => ({ ok: true, status: 'sent' })),
}));

import { FakeFirestore, fakeReq, fakeRes } from '../helpers/fakeFirestore.js';
import { setDbForTests } from '../../api/_lib/db.js';
import { setWhatsAppFetchForTests } from '../../api/_lib/whatsapp.js';
import { sendTransactional } from '../../api/_lib/mail/send.js';
import { handleFeedbackAction, collectRecipients, runCampaignFeedback, FEEDBACK_CARD_URL } from '../../api/_lib/campaignFeedback.js';
import { feedbackToken, runQueue, contactIdFor } from '../../api/_lib/outreachQueue.js';
import { validateFeedback, sendDayFor, addDays } from '../../src/lib/campaignFeedback.js';
import { render } from '../../api/_lib/mail/templates/index.js';

const ADMIN = { uid: 'u-admin', email: 'ops@newbi.live', email_verified: true };
const EDITOR = { uid: 'u-ed', email: 'ed@newbi.live', email_verified: true };
const TASKS = [
    { id: 't1', title: 'Reel', priority: 'required', submissions: { 'uid-meera': { status: 'approved' }, 'uid-test': { status: 'submitted', test: true } } },
];

let db;
let sent;

const call = async (action, body = {}, { token = ADMIN } = {}) => {
    const res = fakeRes();
    await handleFeedbackAction(action, fakeReq({ body }), res, { decodedToken: token, db });
    return res;
};
const requests = () => Object.values(db.dump('campaign_feedback'));

beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(Date.parse('2026-11-16T03:30:00Z')); // 09:00 IST, the day after the event
    vi.stubEnv('WHATSAPP_ACCESS_TOKEN', 'test-token');
    vi.stubEnv('WHATSAPP_PHONE_NUMBER_ID', '123');
    vi.stubEnv('WHATSAPP_TEMPLATE_CAMPAIGN_FEEDBACK', 'campaign_feedback');
    vi.stubEnv('LINK_SIGNING_SECRET', 'test-secret');
    vi.stubEnv('OUTREACH_WA_PER_MINUTE', '50');
    vi.stubEnv('CRON_SECRET', '');
    db = new FakeFirestore({
        'campaigns/c1': { title: 'Arijit Singh Live', status: 'Live', eventDate: '2026-11-15', tasks: TASKS, image: 'https://res.cloudinary.com/demo/image/upload/v1/arijit.jpg' },
        // Outreach form: in the group, posted, removed, only shortlisted (not told), and one with a ticket.
        'campaigns/c1/applications/a1': { fullName: 'Riya Sharma', phone: '+919876500001', email: 'riya@example.com', status: 'joined', instagramHandle: 'riya.s' },
        'campaigns/c1/applications/a2': { fullName: 'Arjun Kapoor', phone: '+919876500002', status: 'removed', deliverables: { t1: { status: 'approved' } } },
        'campaigns/c1/applications/a3': { fullName: 'Kabir Rao', phone: '+919876500003', status: 'shortlisted' },
        'campaigns/c1/applications/a4': { fullName: 'Zoya Khan', phone: '+919876500004', status: 'applied', ticket: { status: 'released', passRef: 'P1' } },
        'campaigns/c1/applications/a5': { fullName: 'Dev Patel', phone: '+919876500005', status: 'applied', deliverables: { t1: { status: 'submitted' } } },
        // App flow: shortlisted creator (same phone as Riya: one person), a submitter who isn't shortlisted, and a sheet guest.
        'creators/cr1': { name: 'Riya Sharma', phone: '9876500001', uid: 'uid-riya', shortlistedCampaigns: ['c1'], instagram: 'riya.s' },
        'creators/cr2': { name: 'Meera Iyer', email: 'meera@example.com', uid: 'uid-meera', city: 'Bengaluru' },
        'creators/cr3': { name: 'Test Dev', email: 'dev@newbi.live', uid: 'uid-test' },
        'campaigns/c1/submissions/sheet-p-9876500006': { guest: { name: 'Sana Ali', phone: '9876500006' }, tasks: { t1: { status: 'approved', via: 'sheet' } } },
        // A pass to someone not otherwise on the list, and a revoked one.
        'passes/P2': { source: 'campaign', sourceId: 'c1', status: 'issued', holderName: 'Ishaan Mehta', holderEmail: 'ishaan@example.com', holderUid: 'uid-ishaan' },
        'passes/P3': { source: 'campaign', sourceId: 'c1', status: 'revoked', holderName: 'Gone Person', holderEmail: 'gone@example.com' },
        'admins/x': { email: 'ops@newbi.live', role: 'admin' },
        'admins/y': { email: 'ed@newbi.live', role: 'editor' },
    });
    setDbForTests(db);
    sent = [];
    setWhatsAppFetchForTests(async (url, init = {}) => {
        sent.push(JSON.parse(init.body));
        return { ok: true, status: 200, json: async () => ({ messages: [{ id: `wamid.${sent.length}` }] }) };
    });
    vi.mocked(sendTransactional).mockClear();
});

afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    setDbForTests(null);
    setWhatsAppFetchForTests(null);
});

describe('who is asked', () => {
    it('includes everyone who sent work, was told they are in, or got a ticket, once each', async () => {
        const people = await collectRecipients(db, 'c1', db.store.get('campaigns/c1'));
        const byName = Object.fromEntries(people.map(p => [p.name, p]));
        expect(Object.keys(byName).sort()).toEqual(['Dev Patel', 'Ishaan Mehta', 'Meera Iyer', 'Riya Sharma', 'Sana Ali', 'Zoya Khan']);
        // Riya is on the outreach form and in the app: one entry, both contacts.
        expect(byName['Riya Sharma']).toMatchObject({ phone: '+919876500001', email: 'riya@example.com', uid: 'uid-riya' });
        expect(byName['Riya Sharma'].reasons.sort()).toEqual(['list']);
        expect(byName['Dev Patel'].reasons).toEqual(['tasks']);
        expect(byName['Zoya Khan'].reasons).toEqual(['ticket']);
        expect(byName['Meera Iyer']).toMatchObject({ email: 'meera@example.com', reasons: ['tasks'] });
        expect(byName['Sana Ali'].phone).toBe('+919876500006');
        expect(byName['Ishaan Mehta'].key).toMatch(/^e/);
    });
});

describe('asking', () => {
    it('queues WhatsApp, emails, and never asks twice', async () => {
        const res = await call('feedback-send', { campaignId: 'c1' });
        expect(res.body.report).toMatchObject({ asked: 6, emailed: 3, whatsappOff: false });
        expect(requests()).toHaveLength(6);
        expect(vi.mocked(sendTransactional).mock.calls.map(c => c[1]).sort()).toEqual(['ishaan@example.com', 'meera@example.com', 'riya@example.com']);
        expect(vi.mocked(sendTransactional).mock.calls[0][2].formUrl).toMatch(/\/f\//);
        // The feedback card, not the campaign's own picture.
        expect(FEEDBACK_CARD_URL).toBe('https://app.newbi.live/og/wa-feedback-v1.jpg');
        expect(vi.mocked(sendTransactional).mock.calls.every(c => c[2].image === FEEDBACK_CARD_URL)).toBe(true);

        await runQueue({ db, deadline: Date.now() + 5000, sleep: async () => {} });
        expect(sent).toHaveLength(4); // the four with phones
        expect(sent[0].template.name).toBe('campaign_feedback');
        expect(sent.every(m => m.template.components.find(c => c.type === 'header').parameters[0].image.link === FEEDBACK_CARD_URL)).toBe(true);
        expect(sent[0].template.components.find(c => c.type === 'button').parameters[0].text).toMatch(/\./);

        const again = await call('feedback-send', { campaignId: 'c1' });
        expect(again.body.report.asked).toBe(0);
        expect(again.body.report.skipped.already).toBe(6);
    });

    it('skips WhatsApp for people who said STOP', async () => {
        db.store.set(`creator_contacts/${contactIdFor('+919876500001')}`, { whatsappOptOut: { at: '2026-11-01' } });
        await call('feedback-send', { campaignId: 'c1' });
        await runQueue({ db, deadline: Date.now() + 5000, sleep: async () => {} });
        expect(sent.map(m => m.to)).not.toContain('919876500001');
    });

    it('is staff-only past the form', async () => {
        expect((await call('feedback-list', { campaignId: 'c1' }, { token: EDITOR })).statusCode).toBe(403);
        expect((await call('feedback-list', { campaignId: 'c1' }, { token: null })).statusCode).toBe(401);
    });
});

describe('the form', () => {
    const tokenFor = (name) => {
        const r = requests().find(x => x.name === name);
        return feedbackToken('c1', r.key);
    };

    it('saves answers and lets the creator take a published quote down', async () => {
        await call('feedback-send', { campaignId: 'c1' });
        const token = tokenFor('Riya Sharma');
        const form = await call('feedback-form', { token }, { token: null });
        expect(form.body).toMatchObject({ success: true, firstName: 'Riya', campaign: { title: 'Arijit Singh Live' }, response: null });

        const bad = await call('feedback-submit', { token, rating: 5, testimonial: 'Loved every bit of this one!' }, { token: null });
        expect(bad.statusCode).toBe(400);
        expect(bad.body.errors.consent).toBeTruthy();

        const ok = await call('feedback-submit', { token, rating: 5, again: 'yes', liked: 'The crowd', testimonial: 'Loved every bit of this one!', consent: 'first_name' }, { token: null });
        expect(ok.body.success).toBe(true);
        const row = requests().find(x => x.name === 'Riya Sharma');
        expect(row.response).toMatchObject({ rating: 5, consent: 'first_name' });

        const pub = await call('feedback-publish', { campaignId: 'c1', id: 'c1_p919876500001', publish: true });
        expect(pub.body.published).toBe(true);
        const t = db.store.get(`creator_testimonials/${pub.body.testimonialId}`);
        // First name only: no surname, handle or photo.
        expect(t).toMatchObject({ name: 'Riya', handle: '', avatarUrl: '', quote: 'Loved every bit of this one!', isActive: true });

        await call('feedback-submit', { token, rating: 4, testimonial: 'Loved every bit of this one!', consent: 'no' }, { token: null });
        expect(db.store.get(`creator_testimonials/${pub.body.testimonialId}`)).toBeUndefined();
        expect(requests().find(x => x.name === 'Riya Sharma').publishedTestimonialId).toBeNull();
    });

    it('never publishes without consent', async () => {
        await call('feedback-send', { campaignId: 'c1' });
        await call('feedback-submit', { token: tokenFor('Dev Patel'), rating: 3, testimonial: 'It was good but chaotic.', consent: 'no' }, { token: null });
        const res = await call('feedback-publish', { campaignId: 'c1', id: 'c1_p919876500005', publish: true });
        expect(res.statusCode).toBe(409);
    });

    it('rejects made-up links', async () => {
        const res = await call('feedback-form', { token: 'abc.def' }, { token: null });
        expect(res.statusCode).toBe(404);
    });
});

describe('the day after', () => {
    it('sends on the day after the event, once, and not for old campaigns', async () => {
        db.store.set('campaigns/old', { title: 'Old', status: 'Closed', eventDate: '2026-09-01', tasks: [] });
        db.store.set('creators/old1', { name: 'Old Timer', email: 'old@example.com', shortlistedCampaigns: ['old'] });
        const first = await runCampaignFeedback({ db, deadline: Date.now() + 5000 });
        expect(first).toMatchObject({ campaigns: 1, asked: 6 });
        expect(requests().some(r => r.campaignId === 'old')).toBe(false);
        const second = await runCampaignFeedback({ db, deadline: Date.now() + 5000 });
        expect(second.campaigns).toBe(0);
    });

    it('waits when auto-send is off or the day is later', async () => {
        await call('feedback-settings', { campaignId: 'c1', autoSend: false });
        expect((await runCampaignFeedback({ db })).campaigns).toBe(0);
        await call('feedback-settings', { campaignId: 'c1', autoSend: true, sendOn: '2026-11-18' });
        expect((await runCampaignFeedback({ db })).campaigns).toBe(0);
    });

    it('works out the send day', () => {
        expect(addDays('2026-12-31')).toBe('2027-01-01');
        expect(sendDayFor({ eventDate: '2026-11-15' })).toBe('2026-11-16');
        expect(sendDayFor({ eventDate: '2026-11-15' }, { sendOn: '2026-11-20' })).toBe('2026-11-20');
        expect(sendDayFor({})).toBe('');
    });
});

describe('rules and email', () => {
    it('validate answers', () => {
        expect(validateFeedback({ rating: 0 }).errors.rating).toBeTruthy();
        expect(validateFeedback({ rating: 4, testimonial: 'short' }).errors.testimonial).toBeTruthy();
        expect(validateFeedback({ rating: 4, consent: 'full' }).value.consent).toBe('');
    });

    it('render the email', () => {
        const out = render('campaign-feedback', { name: 'Riya Sharma', campaignTitle: 'Arijit Singh Live', formUrl: 'https://app.newbi.live/f/x' });
        expect(out.subject).toBe('How was Arijit Singh Live? Tell us in a minute');
        expect(out.html).toContain('https://app.newbi.live/f/x');
        expect(out.kind).toBe('transactional');
    });
});
