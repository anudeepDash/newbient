import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FakeFirestore } from './helpers/fakeFirestore.js';
import { setDbForTests } from '../api/_lib/db.js';
import { setWhatsAppFetchForTests } from '../api/_lib/whatsapp.js';
import { setTransportForTests } from '../api/_lib/mail/transport.js';
import { render } from '../api/_lib/mail/templates/index.js';
import { _internal } from '../api/_lib/passes.js';
import { canGetTicket, ticketAudience } from '../src/components/admin/campaigns/ticketModel.js';

// ticketModel's live-passes hook imports the browser Firebase client; these tests only use its pure helpers.
vi.mock('../src/lib/firebase', () => ({ db: null, auth: null, storage: null }));

/*
 * Campaign tickets: only shortlisted creators get them, "Who gets them" narrows
 * to those who finished the deliverables, and "Guestlist" adds the name to the
 * list (no QR) and tells them by email and WhatsApp.
 */

const STAFF = { uid: 'u-admin', email: 'ops@newbi.live', staff: true };
const issue = (db, body) => _internal.actions['issue-campaign'](db, { campaignId: 'c1', ...body }, STAFF);
const bodyOf = (m) => m.template.components.find(c => c.type === 'body').parameters.map(p => p.text);

let db;
let sent;
let mails;

beforeEach(() => {
    vi.stubEnv('WHATSAPP_ACCESS_TOKEN', 'test-token');
    vi.stubEnv('WHATSAPP_PHONE_NUMBER_ID', '123');
    vi.stubEnv('LINK_SIGNING_SECRET', 'test-secret');
    vi.stubEnv('WHATSAPP_TEMPLATE_GUESTLIST_RSVP_CONFIRMED', 'guestlist_rsvp_confirmed');
    db = new FakeFirestore({
        'campaigns/c1': { title: 'Bacardi NH7 Hype', eventName: 'NH7 Weekender', eventDate: '2030-12-05', venue: 'Pune', passKind: 'qr', ticketsPerCreator: 1 },
        'users/u1': { name: 'Riya Sharma', email: 'riya@example.com', phone: '+919876500001', phoneNumber: '+919876500001', phoneVerified: true },
        'creators/u1': { uid: 'u1', name: 'Riya Sharma', email: 'riya@example.com', phone: '9876500001', isPhoneVerified: true, shortlistedCampaigns: ['c1'] },
        'creators/u2': { uid: 'u2', name: 'Kabir', email: 'kabir@example.com', joinedCampaigns: ['c1'], campaignStages: { c1: 'shortlisted' } },
    });
    setDbForTests(db);
    sent = [];
    mails = [];
    setWhatsAppFetchForTests(async (url, init) => {
        sent.push(JSON.parse(init.body));
        return { ok: true, status: 200, json: async () => ({ messages: [{ id: `wamid.${sent.length}` }] }) };
    });
    setTransportForTests({ sendMail: async (m) => { mails.push(m); return { messageId: `mail-${mails.length}` }; } });
});

afterEach(() => {
    vi.unstubAllEnvs();
    setDbForTests(null);
    setWhatsAppFetchForTests(null);
    setTransportForTests(null);
});

describe('guestlist from a campaign', () => {
    it('adds a shortlisted creator to the guestlist and tells them on WhatsApp and by email', async () => {
        const out = await issue(db, { creatorIds: ['u1'], kind: 'guestlist', qty: 2 });
        expect(out.results[0]).toMatchObject({ creatorId: 'u1', outcome: 'issued' });
        const pass = Object.values(db.dump('passes'))[0];
        expect(pass).toMatchObject({ mode: 'guestlist', qr: false, qty: 2, source: 'campaign', sourceId: 'c1' });
        expect(sent.map(m => m.template.name)).toEqual(['guestlist_rsvp_confirmed']);
        expect(bodyOf(sent[0])).toEqual(['Riya', 'NH7 Weekender', 'Thu, 5 Dec, 2030', 'Riya Sharma + 1']);
        expect(mails[0].subject).toMatch(/You're on the guestlist for NH7 Weekender/);
    });

    it("doesn't send to someone only on the private Considering list", async () => {
        const out = await issue(db, { creatorIds: ['u2'], kind: 'guestlist' });
        expect(out.results[0]).toMatchObject({ outcome: 'skipped', error: 'Not selected for this campaign' });
        expect(db.dump('passes')).toEqual({});
    });

    it('skips someone already on the list, and a QR pass later upgrades the place', async () => {
        await issue(db, { creatorIds: ['u1'], kind: 'guestlist' });
        const again = await issue(db, { creatorIds: ['u1'], kind: 'guestlist' });
        expect(again.results[0]).toMatchObject({ outcome: 'skipped', error: 'Already has a pass' });
        const qr = await issue(db, { creatorIds: ['u1'], kind: 'qr' });
        expect(qr.results[0].outcome).toBe('updated');
        expect(Object.values(db.dump('passes'))[0]).toMatchObject({ qr: true, mode: 'qr' });
    });
});

describe('guestlist email', () => {
    it('thanks them for completing the campaign and gives the name on the list', () => {
        const mail = render('campaign-ticket', { name: 'Riya Sharma', campaignTitle: 'Bacardi NH7 Hype', eventName: 'NH7 Weekender', qty: 3, guestlist: true });
        expect(mail.subject).toBe("You're on the guestlist for NH7 Weekender · Bacardi NH7 Hype");
        expect(mail.text).toContain('thank you for completing the Bacardi NH7 Hype campaign');
        expect(mail.text).toContain('Name on the list: Riya Sharma + 2');
        expect(mail.text).not.toContain('Pass code');
    });
});

describe('who can get tickets', () => {
    const entry = (key, extra) => ({ key, creator: { id: key }, progress: { items: [] }, ...extra });
    const done = (...ids) => ({ items: ids.map(([id, status]) => ({ task: { id }, status })) });

    it('only the real shortlist, or anyone already paid', () => {
        expect(canGetTicket(entry('a', { selected: true, stage: 'selected' }))).toBe(true);
        expect(canGetTicket(entry('b', { selected: false, stage: 'paid' }))).toBe(true);
        expect(canGetTicket(entry('c', { selected: false, stage: 'shortlisted' }))).toBe(false); // Considering
        expect(canGetTicket(entry('d', { selected: false, stage: 'review' }))).toBe(false); // sent work, never shortlisted
        expect(canGetTicket(entry('e', { selected: true, stage: 'review', orphan: true }))).toBe(false);
    });

    it('narrows to those who finished every required deliverable, or one of them', () => {
        const campaign = { tasks: [{ id: 'reel' }, { id: 'story' }, { id: 'extra', priority: 'optional' }] };
        const list = [
            entry('all', { progress: done(['reel', 'approved'], ['story', 'approved']) }),
            entry('reel', { progress: done(['reel', 'approved'], ['story', 'submitted']) }),
            entry('none', { progress: done(['reel', 'not_started']) }),
        ];
        const keys = (opts) => ticketAudience(list, campaign, opts).map(e => e.key);
        expect(keys({ who: 'all' })).toEqual(['all', 'reel', 'none']);
        expect(keys({ who: 'done-all' })).toEqual(['all']);
        expect(keys({ who: 'done-all', inReview: true })).toEqual(['all', 'reel']);
        expect(keys({ who: 'task:reel' })).toEqual(['all', 'reel']);
        expect(keys({ who: 'task:story' })).toEqual(['all']);
    });
});
