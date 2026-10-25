import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FakeFirestore } from './helpers/fakeFirestore.js';
import { setDbForTests } from '../api/_lib/db.js';
import { setWhatsAppFetchForTests } from '../api/_lib/whatsapp.js';
import { queueCampaignInvites } from '../api/_lib/campaignInvites.js';
import { runPostReminders } from '../api/_lib/postReminders.js';
import { runPostsOpen, tellPostsOpened } from '../api/_lib/postsOpen.js';
import { openedTaskIds } from '../src/lib/creator/tasks.js';
import { TEMPLATES, problemsWith } from '../scripts/submit-wa-templates.mjs';
import { WA_TEMPLATES, renderTemplatePreview } from '../src/lib/outreach/whatsappTemplate.js';
import { advanceWaitlist, _internal } from '../api/_lib/passes.js';

/* Messages that go out by themselves on site actions and the daily worker. */

const LIVE = ['CAMPAIGN_INVITE', 'CAMPAIGN_POSTS_OPEN', 'CAMPAIGN_POST_DUE', 'CAMPAIGN_POST_OVERDUE', 'GUESTLIST_SPOT_OPENED', 'GUESTLIST_PENDING'];
const NOW = Date.parse('2026-11-11T03:30:00Z'); // 09:00 IST, 11 Nov

let db;
let sent;
const jobs = () => Object.entries(db.dump('outreach_queue'));

beforeEach(() => {
    vi.stubEnv('WHATSAPP_ACCESS_TOKEN', 'test-token');
    vi.stubEnv('WHATSAPP_PHONE_NUMBER_ID', '123');
    vi.stubEnv('LINK_SIGNING_SECRET', 'test-secret');
    LIVE.forEach(n => vi.stubEnv(`WHATSAPP_TEMPLATE_${n}`, n.toLowerCase()));
    db = new FakeFirestore({});
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

describe('new-campaign invites on WhatsApp', () => {
    const campaign = { id: 'c1', title: 'Bacardi NH7 Hype', image: 'https://res.cloudinary.com/n/image/upload/v1/c.png' };
    const creators = [
        { id: 'u1', name: 'Riya Sharma', isPhoneVerified: true, phone: '+919876500001' },
        { id: 'u2', name: 'Arjun K', isPhoneVerified: false, phone: '+919876500002' },
        { id: 'u3', name: 'Meera', isPhoneVerified: true, phone: '+919876500003' },
    ];

    it('queues one invite per verified creator, with the campaign picture and apply button', async () => {
        db.store.set('users/u3', { channelPrefs: { whatsapp: false } });
        const out = await queueCampaignInvites({ db, campaign, creators, start: false });
        expect(out).toMatchObject({ queued: 1, skipped: { noNumber: 1, whatsappOff: 1 } });
        const [[, job]] = jobs();
        expect(job).toMatchObject({ kind: 'template', campaignId: 'c1', status: 'queued' });
        expect(job.data).toMatchObject({ phone: '+919876500001', template: 'campaign_invite', bodyParams: ['Riya', 'Bacardi NH7 Hype'], buttons: [{ index: 0, param: 'c1' }] });
        expect(job.data.header.link).toMatch(/f_jpg/);
        // Announcing it again doesn't queue twice.
        expect((await queueCampaignInvites({ db, campaign, creators, start: false })).queued).toBe(0);
    });

    it('queues nothing until the template is switched on', async () => {
        vi.stubEnv('WHATSAPP_TEMPLATE_CAMPAIGN_INVITE', '');
        expect((await queueCampaignInvites({ db, campaign, creators, start: false })).off).toBe(true);
        expect(jobs()).toHaveLength(0);
    });
});

describe('posting deadline reminders', () => {
    beforeEach(() => {
        db.store.set('campaigns/c1', {
            title: 'Bacardi NH7 Hype', postingDeadline: '2026-11-12',
            tasks: [{ id: 'reel', title: 'Reel' }, { id: 'story', title: 'Story', deadline: '2026-11-10' }, { id: 'extra', title: 'Bonus', priority: 'optional' }],
        });
        db.store.set('campaigns/c1/applications/a1', { status: 'joined', phone: '+919876500001', fullName: 'Riya Sharma', deliverables: {} });
        db.store.set('campaigns/c1/applications/a2', { status: 'joined', phone: '+919876500002', deliverables: { reel: { status: 'submitted' }, story: { status: 'approved' } } });
        db.store.set('campaigns/c1/applications/a3', { status: 'applied', phone: '+919876500003' });
    });

    it('reminds the day before and the day after, only people still owing posts', async () => {
        const out = await runPostReminders({ db, now: NOW });
        expect(out).toMatchObject({ due: 1, overdue: 1 });
        const byKind = Object.fromEntries(jobs().map(([id, j]) => [j.kind, { id, ...j }]));
        expect(byKind.post_due).toMatchObject({ appId: 'a1', data: { dueAt: 'Thursday, 12 November', stillToSend: 'Reel', taskIds: ['reel'] } });
        expect(byKind.post_overdue).toMatchObject({ appId: 'a1', data: { dueAt: 'Tuesday, 10 November', taskIds: ['story'] } });
        // Once per day.
        expect(await runPostReminders({ db, now: NOW })).toMatchObject({ due: 0, overdue: 0 });
    });
});

describe('posting opens', () => {
    beforeEach(() => {
        db.store.set('campaigns/c1', {
            title: 'Bacardi NH7 Hype', postingDeadline: '2026-11-15',
            tasks: [
                { id: 'reel', title: 'Reel', submissionsOpen: false, opensOn: '2026-11-12' },
                { id: 'story', title: 'Story', submissionsOpen: false, opensOn: '2026-11-12', deadline: '2026-11-14' },
                { id: 'later', title: 'Recap', submissionsOpen: false, opensOn: '2026-11-20' },
                { id: 'manual', title: 'Carousel', submissionsOpen: false },
            ],
        });
        db.store.set('campaigns/c1/applications/a1', { status: 'joined', phone: '+919876500001', fullName: 'Riya Sharma', deliverables: {} });
        db.store.set('campaigns/c1/applications/a2', { status: 'applied', phone: '+919876500002' });
    });
    const open = () => Object.fromEntries((db.store.get('campaigns/c1').tasks).map(t => [t.id, t.submissionsOpen]));

    it('gives the creators group a heads-up the day before, then opens it that morning without telling them twice', async () => {
        expect(await runPostsOpen({ db, now: NOW })).toEqual({ opened: 0, told: 1 });
        const [[id, job]] = jobs();
        expect(id).toBe('posts_open_c1_a1_2026-11-12');
        expect(job).toMatchObject({ kind: 'posts_open', appId: 'a1', data: { opensAt: 'tomorrow, Thursday, 12 November', whatToPost: 'Reel and Story', dueAt: 'Saturday, 14 November', taskIds: ['reel', 'story'] } });
        expect(open()).toMatchObject({ reel: false, story: false });

        const next = NOW + 86_400_000;
        expect(await runPostsOpen({ db, now: next })).toEqual({ opened: 2, told: 0 });
        expect(open()).toEqual({ reel: true, story: true, later: false, manual: false });
        expect(jobs()).toHaveLength(1);
    });

    it('tells them straight away when the team opens one by hand', async () => {
        const c = db.store.get('campaigns/c1');
        db.store.set('campaigns/c1', { ...c, tasks: c.tasks.map(t => (t.id === 'manual' ? { ...t, submissionsOpen: true } : t)) });
        expect(await tellPostsOpened({ db, campaignId: 'c1', taskIds: ['manual', 'later'], now: NOW, start: false })).toEqual({ queued: 1 });
        const [[, job]] = jobs();
        expect(job.data).toMatchObject({ opensAt: 'today', whatToPost: 'Carousel', dueAt: 'Sunday, 15 November', taskIds: ['manual'] });
    });

    it('spots which deliverables just opened', () => {
        const before = [{ id: 1, submissionsOpen: false }, { id: 2, submissionsOpen: true, submissionsClosed: true }, { id: 3, submissionsOpen: true }];
        const after = [{ id: 1, submissionsOpen: true }, { id: 2, submissionsOpen: true }, { id: 3, submissionsOpen: true }, { id: 4, submissionsOpen: true }, { id: 5, submissionsOpen: false }];
        expect(openedTaskIds(before, after)).toEqual(['1', '4']);
    });

    it('matches the template submitted to Meta', () => {
        const t = TEMPLATES.find(x => x.name === 'campaign_posts_open');
        expect(t.body).toBe(WA_TEMPLATES.posts_open.body);
        expect(problemsWith(t)).toEqual([]);
        const preview = renderTemplatePreview('posts_open', { application: { fullName: 'Riya Sharma' }, campaign: { title: 'Bacardi NH7 Hype' }, data: { opensAt: 'today', whatToPost: 'Reel', dueAt: 'Sunday, 15 November' } });
        expect(preview).toContain('Your post for *Bacardi NH7 Hype* can go up from today.');
    });
});

describe('waitlist', () => {
    const register = (uid, extra = {}) => _internal.actions['register-guestlist'](db, { guestlistId: 'tt', guests: 1, ...extra }, { uid });
    const confirm = (body, caller = {}) => _internal.actions['confirm-waitlist'](db, { guestlistId: 'tt', ...body }, caller);
    let notices;
    const send = async (event, uid, data) => { notices.push({ event, uid, data }); return {}; };

    beforeEach(() => {
        notices = [];
        db.store.set('guestlists/tt', { title: 'Techno Tuesdays', date: '2030-11-12', maxSpots: 1, currentSpots: 0, perUserLimit: 2, status: 'Open' });
        ['u1', 'u2', 'u3'].forEach((u, i) => db.store.set(`users/${u}`, { name: `Person ${i + 1}`, phone: `+91987650000${i + 1}`, phoneVerified: true }));
    });

    it('takes waitlist sign-ups when full, offers a freed place in order, and confirms it from the link', async () => {
        expect((await register('u1')).status).toBe('issued');
        await expect(register('u2')).rejects.toMatchObject({ code: 'FULL' });
        expect(await register('u2', { waitlist: true })).toMatchObject({ status: 'waitlisted', position: 1 });
        expect(await register('u3', { waitlist: true })).toMatchObject({ status: 'waitlisted', position: 2 });
        expect(db.store.get('guestlists/tt').currentSpots).toBe(1);

        // u1's place frees up: u2 is offered it (held for them), u3 waits.
        const [first] = Object.entries(db.dump('guestlists/tt/entries')).find(([, e]) => e.userId === 'u1');
        db.store.set(`guestlists/tt/entries/${first}`, { ...db.store.get(`guestlists/tt/entries/${first}`), status: 'rejected' });
        db.store.set('guestlists/tt', { ...db.store.get('guestlists/tt'), currentSpots: 0 });
        expect(await advanceWaitlist(db, 'tt', { now: Date.now(), send })).toEqual({ expired: 0, offered: 1 });
        expect(notices).toHaveLength(1);
        expect(notices[0]).toMatchObject({ event: 'guestlist-spot-opened', uid: 'u2', data: { eventName: 'Techno Tuesdays' } });
        expect(notices[0].data.claimParam).toMatch(/^tt\?claim=/);
        expect(db.store.get('guestlists/tt').currentSpots).toBe(1);

        // The link confirms it without signing in, and the pass is issued.
        const claim = notices[0].data.claimParam.split('claim=')[1];
        expect(await confirm({ claim })).toMatchObject({ success: true, status: 'issued' });
        await expect(confirm({ claim })).rejects.toMatchObject({ code: 'NO_OFFER' });
    });

    it('passes an offer nobody confirmed to the next person', async () => {
        await register('u1');
        await register('u2', { waitlist: true });
        await register('u3', { waitlist: true });
        db.store.set('guestlists/tt', { ...db.store.get('guestlists/tt'), maxSpots: 2 });
        const t0 = Date.now();
        await advanceWaitlist(db, 'tt', { now: t0, send });
        expect(notices.map(n => n.uid)).toEqual(['u2']);
        // Seven hours later the offer has run out.
        const out = await advanceWaitlist(db, 'tt', { now: t0 + 7 * 3600_000, send });
        expect(out).toEqual({ expired: 1, offered: 1 });
        expect(notices.map(n => n.uid)).toEqual(['u2', 'u3']);
        const statuses = Object.values(db.dump('guestlists/tt/entries')).map(e => [e.userId, e.status]).sort();
        expect(statuses).toEqual([['u1', 'confirmed'], ['u2', 'waitlist_expired'], ['u3', 'offered']]);
    });
});
