import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FakeFirestore } from './helpers/fakeFirestore.js';
import { setDbForTests } from '../api/_lib/db.js';
import { setWhatsAppFetchForTests } from '../api/_lib/whatsapp.js';
import { setTransportForTests } from '../api/_lib/mail/transport.js';
import { handleEvent, sendOrderEmail } from '../api/_lib/mail/events.js';
import { runEventReminders } from '../api/_lib/eventReminders.js';
import { approvedSummary } from '../src/lib/outreach/whatsappTemplate.js';

const STAFF = { uid: 'u-admin', email: 'ops@newbi.live', staff: true };
const LIVE = ['SUBMISSION_CHANGES', 'ALL_POSTS_APPROVED', 'PAYMENT_DECLINED', 'TEAM_ORDER_ALERT', 'GIG_SELECTED', 'EVENT_REMINDER'];

let db;
let sent;
const templates = () => sent.map(m => m.template.name);
const bodyOf = (m) => m.template.components.find(c => c.type === 'body').parameters.map(p => p.text);

beforeEach(() => {
    vi.stubEnv('WHATSAPP_ACCESS_TOKEN', 'test-token');
    vi.stubEnv('WHATSAPP_PHONE_NUMBER_ID', '123');
    LIVE.forEach(n => vi.stubEnv(`WHATSAPP_TEMPLATE_${n}`, n.toLowerCase()));
    db = new FakeFirestore({
        'users/u1': { email: 'riya@example.com', displayName: 'Riya Sharma', phoneNumber: '+919876500001' },
        'campaigns/c1': {
            title: 'Bacardi NH7 Hype',
            tasks: [{ id: 't1', title: 'Reel' }, { id: 't2', title: 'Story' }, { id: 't3', title: 'Bonus post', priority: 'optional' }],
        },
        'campaigns/c1/submissions/u1': { tasks: { t1: { status: 'approved' }, t2: { status: 'submitted' } } },
        'admins/gm': { email: 'gate@newbi.live', role: 'gate_manager', displayName: 'Gate Lead', phone: '+919876500020' },
        'admins/ed': { email: 'editor@newbi.live', role: 'editor', phone: '+919876500021' },
        'ticket_orders/o1': { status: 'rejected', customerName: 'Riya Sharma', customerPhone: '9876500001', paymentRef: '412345678901', totalAmount: 1499, eventTitle: 'NH7 Weekender' },
        'ticket_orders/o2': { status: 'pending', customerName: 'Arjun K', customerEmail: 'arjun@example.com', customerPhone: '9876500002', paymentRef: '512345678901', totalAmount: 999, eventTitle: 'Sunburn Arena', bookingRef: 'NB-2' },
        'volunteer_gigs/g1': { formId: 'f1', title: 'NH7 registrations desk', dates: ['2026-12-05'], time: '2:00 PM', location: 'Gate 2' },
        'form_responses/r1': { formId: 'f1', name: 'Meera Iyer', status: 'confirmed', fields: [{ id: 'ph', type: 'phone' }], answers: { ph: '9876500009' } },
    });
    setDbForTests(db);
    sent = [];
    setWhatsAppFetchForTests(async (url, init) => {
        sent.push(JSON.parse(init.body));
        return { ok: true, status: 200, json: async () => ({ messages: [{ id: `wamid.${sent.length}` }] }) };
    });
    setTransportForTests({ sendMail: async () => ({ messageId: 'mail-1' }) });
});

afterEach(() => {
    vi.unstubAllEnvs();
    setDbForTests(null);
    setWhatsAppFetchForTests(null);
    setTransportForTests(null);
});

describe('submission reviews', () => {
    it('sends nothing on WhatsApp for one approved post, and one message when the last required post is approved', async () => {
        await handleEvent('submission-reviewed', { campaignId: 'c1', reviews: [{ uid: 'u1', taskId: 't1', status: 'approved' }] }, STAFF);
        expect(sent).toHaveLength(0);

        db.store.set('campaigns/c1/submissions/u1', { tasks: { t1: { status: 'approved' }, t2: { status: 'approved' } } });
        await handleEvent('submission-reviewed', { campaignId: 'c1', reviews: [{ uid: 'u1', taskId: 't2', status: 'approved' }] }, STAFF);
        expect(templates()).toEqual(['all_posts_approved']);
        // The optional task doesn't count; the summary names the required ones.
        expect(bodyOf(sent[0])).toEqual(['Riya', 'Bacardi NH7 Hype', 'Reel and Story']);

        // Re-approving later never sends it again.
        await handleEvent('submission-reviewed', { campaignId: 'c1', reviews: [{ uid: 'u1', taskId: 't2', status: 'approved' }] }, STAFF);
        expect(templates()).toEqual(['all_posts_approved']);
    });

    it('sends the change request with the reason and the campaign button', async () => {
        await handleEvent('submission-reviewed', { campaignId: 'c1', reviews: [{ uid: 'u1', taskId: 't2', status: 'changes', reason: 'Tag the brand in the caption' }] }, STAFF);
        expect(templates()).toEqual(['submission_changes']);
        expect(bodyOf(sent[0])).toEqual(['Riya', 'Bacardi NH7 Hype', 'Tag the brand in the caption']);
        expect(sent[0].template.components.find(c => c.type === 'button').parameters[0].text).toBe('c1');
    });
});

describe('ticket orders', () => {
    it('tells the buyer once when a paid order is rejected', async () => {
        const res = await handleEvent('order-declined', { orderId: 'o1' }, STAFF);
        expect(res.status).toBe(200);
        expect(templates()).toEqual(['payment_declined']);
        expect(sent[0].to).toBe('919876500001');
        expect(bodyOf(sent[0])).toEqual(['Riya', 'NH7 Weekender', '412345678901']);
        expect((await handleEvent('order-declined', { orderId: 'o1' }, STAFF)).body.duplicate).toBe(true);
        expect((await handleEvent('order-declined', { orderId: 'o1' }, { uid: 'x' })).status).toBe(403);
    });

    it('alerts the ticketing team (not other roles) about a new order', async () => {
        await sendOrderEmail('o2');
        const alerts = sent.filter(m => m.template.name === 'team_order_alert');
        expect(alerts.map(m => m.to)).toEqual(['919876500020']);
        expect(bodyOf(alerts[0])).toEqual(['Sunburn Arena', 'Arjun K', '999', '512345678901']);
    });
});

describe('volunteer gigs', () => {
    it('sends the gig details to confirmed volunteers once', async () => {
        await handleEvent('gig-selected', { responseIds: ['r1'] }, STAFF);
        expect(templates()).toEqual(['gig_selected']);
        expect(sent[0].to).toBe('919876500009');
        expect(bodyOf(sent[0])).toEqual(['Meera', 'NH7 registrations desk', 'Sat, 5 Dec, 2:00 PM', 'Gate 2']);
        await handleEvent('gig-selected', { responseIds: ['r1'] }, STAFF);
        expect(sent).toHaveLength(1);
    });
});

describe('event reminders', () => {
    it('reminds every issued pass for tomorrow, once', async () => {
        const now = Date.parse('2026-12-04T03:30:00Z'); // 09:00 IST on the 4th
        db.store.set('passes/NB7K2Q', { ref: 'NB7K2Q', status: 'issued', holderName: 'Riya Sharma', holderPhone: '+919876500001', event: { title: 'NH7 Weekender', date: '2026-12-05T16:00', time: '4:00 PM', venue: 'Mahalaxmi Lawns', city: 'Pune' } });
        db.store.set('passes/OLD', { ref: 'OLD', status: 'revoked', holderPhone: '+919876500003', event: { title: 'NH7', date: '2026-12-05' } });
        db.store.set('passes/LATER', { ref: 'LATER', status: 'issued', holderPhone: '+919876500004', event: { title: 'Other', date: '2026-12-09' } });
        const first = await runEventReminders({ db, now });
        expect(first).toMatchObject({ date: '2026-12-05', sent: 1 });
        expect(templates()).toEqual(['event_reminder']);
        expect(bodyOf(sent[0])).toEqual(['Riya', 'NH7 Weekender', '4:00 PM', 'Mahalaxmi Lawns, Pune']);
        expect(sent[0].template.components.find(c => c.type === 'button').parameters[0].text).toBe('NB7K2Q');
        expect((await runEventReminders({ db, now })).sent).toBe(0);
    });
});

describe('approvedSummary', () => {
    it('names a few posts and counts many', () => {
        expect(approvedSummary(['Reel'])).toBe('Reel');
        expect(approvedSummary(['Reel', 'Story 1', 'Story 2'])).toBe('Reel, Story 1 and Story 2');
        expect(approvedSummary(['a', 'b', 'c', 'd', 'e'])).toBe('All 5 posts');
        expect(approvedSummary([])).toBe('All your posts');
    });
});
