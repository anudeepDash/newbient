import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Emails are checked for who they go to and what they carry, not sent.
vi.mock('../../api/_lib/mail/send.js', () => ({
    sendTransactional: vi.fn(async () => ({ ok: true, status: 'sent' })),
}));

import { FakeFirestore, fakeReq, fakeRes } from '../helpers/fakeFirestore.js';
import { setDbForTests } from '../../api/_lib/db.js';
import { sendTransactional } from '../../api/_lib/mail/send.js';
import { handleOutreachAction } from '../../api/_lib/outreach.js';
import { render } from '../../api/_lib/mail/templates/index.js';
import { campaignDetailsData } from '../../src/lib/outreach/campaignDetails.js';

/* Outreach → Message → Email details: one creator gets the campaign's details by email. */

const ADMIN = { uid: 'u-admin', email: 'ops@newbi.live', email_verified: true };
const CAMPAIGN = {
    title: 'Pinnaca 2026', brand: 'Pinnaca', targetCity: 'Lucknow', reward: 'Two passes', payoutPerCreator: 3000,
    eventName: 'Pinnaca Fest', eventDate: '2026-12-19', eventTime: '4 PM', venue: 'Ekana Stadium', ticketsPerCreator: 2, passKind: 'qr',
    postingDeadline: '2026-12-15', whatsappLink: 'https://chat.whatsapp.com/BMFfOyhb',
    tasks: [
        { id: 's1', title: 'Instagram story 1', description: '<div>Task 1 is Live 🎉</div><div>Repost the poster</div><div>Visible Tag:</div><div>@pinnaca.in</div>', deadline: '2026-12-10' },
        { id: 'r1', title: 'Reel', description: 'One reel at the venue' },
    ],
};

let db;
const call = async (action, body) => {
    const res = fakeRes();
    await handleOutreachAction(action, fakeReq({ body }), res, { decodedToken: ADMIN, db });
    return res;
};

beforeEach(() => {
    sendTransactional.mockClear();
    db = new FakeFirestore({
        'campaigns/c1': CAMPAIGN,
        'campaigns/c1/applications/a1': { fullName: 'Riya Sharma', email: 'riya@example.com', phone: '+919876500001', status: 'joined' },
        'admins/x': { email: 'ops@newbi.live', role: 'admin' },
    });
    setDbForTests(db);
});

afterEach(() => setDbForTests(null));

describe('campaign details email', () => {
    it('lists the event, what they get and each post with its due date', () => {
        const data = campaignDetailsData(CAMPAIGN, { name: 'Riya', groupLink: CAMPAIGN.whatsappLink, note: 'One reel and one story, as agreed.' });
        expect(data.rewards).toEqual({ reward: 'Two passes', payout: '₹3,000', passes: '2 entry passes' });
        expect(data.deliverables).toEqual([
            { title: 'Instagram story 1', due: '2026-12-10', summary: 'Repost the poster · Visible Tag: @pinnaca.in' },
            { title: 'Reel', due: '2026-12-15', summary: 'One reel at the venue' },
        ]);
        const { subject, html, text, sender } = render('campaign-details', data);
        expect(subject).toBe('Your campaign details: Pinnaca 2026');
        expect(sender).toBe('creators');
        expect(html).toContain('Ekana Stadium');
        expect(text).toContain('Due Thu, 10 Dec. Repost the poster');
        expect(text).toContain('One reel and one story, as agreed.');
    });

    it('leaves out what the team unticks', () => {
        const data = campaignDetailsData(CAMPAIGN, { include: { event: false, rewards: false, group: false }, groupLink: CAMPAIGN.whatsappLink });
        expect(data).toMatchObject({ event: null, rewards: null, groupLink: '' });
        const { html } = render('campaign-details', data);
        expect(html).not.toContain('Ekana Stadium');
        expect(html).not.toContain('chat.whatsapp.com');
    });
});

describe('outreach-email-details', () => {
    it('emails any address pasted, with the name from the list when it matches', async () => {
        const res = await call('outreach-email-details', { campaignId: 'c1', email: ' Riya@Example.com ', reward: 'Two passes and ₹3,000' });
        expect(res.statusCode).toBe(200);
        expect(res.body).toMatchObject({ sent: true, to: 'riya@example.com' });
        const [event, to, data, opts] = sendTransactional.mock.calls[0];
        expect([event, to]).toEqual(['campaign-details', 'riya@example.com']);
        expect(data).toMatchObject({ name: 'Riya Sharma', campaignTitle: 'Pinnaca 2026', rewards: { reward: 'Two passes and ₹3,000' }, groupLink: 'https://chat.whatsapp.com/BMFfOyhb' });
        expect(data.campaignUrl).toMatch(/\/c\/c1$/);
        expect(opts.ref).toEqual({ collection: 'campaigns', id: 'c1' });
        expect(Object.values(db.dump('campaigns/c1/audit')).some(a => a.field === 'details_email' && a.to === 'riya@example.com')).toBe(true);

        // Someone not on the list: any address works.
        expect((await call('outreach-email-details', { campaignId: 'c1', email: 'new.creator@gmail.com', name: 'Aman' })).statusCode).toBe(200);
        expect(sendTransactional.mock.calls[1][2].name).toBe('Aman');
    });

    it('refuses a bad address or an unknown campaign', async () => {
        expect((await call('outreach-email-details', { campaignId: 'c1', email: 'not-an-email' })).statusCode).toBe(400);
        expect((await call('outreach-email-details', { campaignId: 'nope', email: 'a@b.co' })).statusCode).toBe(404);
        expect(sendTransactional).not.toHaveBeenCalled();
    });

    it('says so when the email didn’t go', async () => {
        sendTransactional.mockResolvedValueOnce({ ok: false, status: 'failed' });
        const res = await call('outreach-email-details', { campaignId: 'c1', email: 'riya@example.com' });
        expect(res.statusCode).toBe(502);
    });
});
