import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FakeFirestore } from './helpers/fakeFirestore.js';
import {
    RESALE_ACTIONS, readResaleInput, normalizeContact, makeResaleRef, settleResale, settleResaleFromWebhook,
} from '../api/_lib/ticketResale.js';
import { render } from '../api/_lib/mail/templates/index.js';

const fails = async (p, code) => {
    try { await p; } catch (err) { expect(err.code).toBe(code); return err; }
    throw new Error(`expected ${code}`);
};

const form = (over = {}) => ({
    eventName: 'Coldplay, Mumbai', eventDate: '2026-12-20', venue: 'DY Patil', ticketType: 'Silver',
    quantity: 2, unitPrice: 4500, buyerName: 'Riya Sen', buyerEmail: 'Riya@Example.com', buyerPhone: '98765 43210', ...over,
});

describe('resale form checks', () => {
    it('tidies a good form and works out the total', () => {
        const r = readResaleInput(form(), Date.parse('2026-11-10T00:00:00Z'));
        expect(r).toMatchObject({ amount: 9000, quantity: 2, buyerEmail: 'riya@example.com', buyerPhone: '+919876543210' });
        expect(r.notify).toEqual({ email: true, sms: true });
        expect(r.expiresAt).toBe('2026-11-17T00:00:00.000Z');
    });

    it('refuses what Razorpay or the confirmation email cannot use', () => {
        expect(() => readResaleInput(form({ eventName: ' ' }))).toThrow(/event name/);
        expect(() => readResaleInput(form({ buyerEmail: 'nope' }))).toThrow(/email/);
        expect(() => readResaleInput(form({ unitPrice: 0 }))).toThrow(/at least/);
        expect(() => readResaleInput(form({ quantity: 0 }))).toThrow(/Quantity/);
        expect(() => readResaleInput(form({ unitPrice: 300000 }))).toThrow(/at most/);
        expect(() => readResaleInput(form({ buyerPhone: '12' }))).toThrow(/phone/);
    });

    it('lets the phone be empty, and then sends no SMS', () => {
        const r = readResaleInput(form({ buyerPhone: '' }));
        expect(r.buyerPhone).toBe('');
        expect(r.notify.sms).toBe(false);
    });

    it('formats phone numbers the way Razorpay wants', () => {
        expect(normalizeContact('9876543210')).toBe('+919876543210');
        expect(normalizeContact('+91 98765-43210')).toBe('+919876543210');
        expect(normalizeContact('919876543210')).toBe('+919876543210');
        expect(normalizeContact('+44 7700 900123')).toBe('+447700900123');
        expect(normalizeContact('123')).toBe('');
    });

    it('makes NR- references', () => {
        expect(makeResaleRef()).toMatch(/^NR-[A-HJ-NP-Z2-9]{6}$/);
    });
});

describe('settling a resale link', () => {
    let db;
    let mail;
    beforeEach(() => {
        db = new FakeFirestore({
            'ticket_resales/r1': {
                ref: 'NR-ABCDEF', status: 'awaiting', linkId: 'plink_1', amount: 9000, unitPrice: 4500, quantity: 2,
                ticketType: 'Silver', eventName: 'Coldplay', buyerName: 'Riya Sen', buyerEmail: 'riya@example.com', createdAt: '2026-11-10T00:00:00.000Z',
            },
        });
        mail = vi.fn(async () => ({ ok: true }));
    });

    it('marks it paid and emails the buyer once, however many times it is reported', async () => {
        const first = await settleResale(db, 'r1', { linkId: 'plink_1', paymentId: 'pay_1', amount: 9000, method: 'upi' }, { mail, now: '2026-11-10T10:00:00.000Z' });
        expect(first.fresh).toBe(true);
        const again = await settleResale(db, 'r1', { linkId: 'plink_1', paymentId: 'pay_1', amount: 9000 }, { mail });
        expect(again.fresh).toBe(false);
        expect(mail).toHaveBeenCalledTimes(1);
        const [event, to, data, opts] = mail.mock.calls[0];
        expect(event).toBe('resale-payment-received');
        expect(to).toBe('riya@example.com');
        expect(data).toMatchObject({ ref: 'NR-ABCDEF', paymentId: 'pay_1', amount: 9000 });
        expect(opts.idempotencyKey).toBe('resale-paid-r1');
        expect(db.dump('ticket_resales').r1).toMatchObject({ status: 'paid', paymentId: 'pay_1', paymentMethod: 'upi', emailStatus: 'sent' });
    });

    it('keeps it paid when the email fails, and a later check retries the email', async () => {
        mail.mockResolvedValueOnce({ ok: false, error: 'SMTP down' });
        await settleResale(db, 'r1', { linkId: 'plink_1', paymentId: 'pay_1', amount: 9000 }, { mail });
        expect(db.dump('ticket_resales').r1).toMatchObject({ status: 'paid', emailStatus: 'failed' });
        await settleResale(db, 'r1', { linkId: 'plink_1', paymentId: 'pay_1' }, { mail });
        expect(mail).toHaveBeenCalledTimes(2);
        expect(db.dump('ticket_resales').r1.emailStatus).toBe('sent');
    });

    it('refuses a payment from a different link', async () => {
        await fails(settleResale(db, 'r1', { linkId: 'plink_other', paymentId: 'pay_9' }, { mail }), 'VALIDATION');
        expect(db.dump('ticket_resales').r1.status).toBe('awaiting');
    });

    it('settles from the webhook by the link notes, or by the link id', async () => {
        expect(await settleResaleFromWebhook(db, { id: 'plink_1', notes: { kind: 'resale', resaleId: 'r1' } }, { id: 'pay_1', amount: 900000 }, { mail })).toBe(true);
        expect(db.dump('ticket_resales').r1.paidAmount).toBe(9000);
        expect(await settleResaleFromWebhook(db, { id: 'plink_unknown', notes: {} }, { id: 'pay_2' }, { mail })).toBe(false);
    });
});

describe('resale actions against Razorpay', () => {
    let db;
    let calls;
    let linkState;
    beforeEach(() => {
        process.env.RAZORPAY_KEY_ID = 'rzp_test_x';
        process.env.RAZORPAY_KEY_SECRET = 'sek';
        db = new FakeFirestore({});
        calls = [];
        linkState = { status: 'created', payments: null };
        vi.stubGlobal('fetch', vi.fn(async (url, init = {}) => {
            const body = init.body ? JSON.parse(init.body) : null;
            calls.push({ url, method: init.method || 'GET', body });
            const ok = (data) => ({ ok: true, json: async () => data });
            if (url.endsWith('/payment_links') && init.method === 'POST') return ok({ id: 'plink_new', short_url: 'https://rzp.io/i/abc', status: 'created' });
            if (url.endsWith('/payment_links/plink_new/cancel')) { linkState.status = 'cancelled'; return ok({ id: 'plink_new', status: 'cancelled' }); }
            if (url.endsWith('/payment_links/plink_new')) return ok({ id: 'plink_new', ...linkState });
            throw new Error(`unexpected fetch ${url}`);
        }));
    });
    afterEach(() => {
        vi.unstubAllGlobals();
        delete process.env.RAZORPAY_KEY_ID;
        delete process.env.RAZORPAY_KEY_SECRET;
    });

    it('creates a link in paise with our notes, and saves it', async () => {
        const out = await RESALE_ACTIONS['ticket-resale-create'](db, form(), { staffEmail: 'team@newbi.live' });
        expect(out.resale).toMatchObject({ status: 'awaiting', linkId: 'plink_new', shortUrl: 'https://rzp.io/i/abc', amount: 9000, createdBy: 'team@newbi.live' });
        const sent = calls[calls.length - 1].body;
        expect(sent).toMatchObject({ amount: 900000, currency: 'INR', accept_partial: false, reference_id: out.resale.ref });
        expect(sent.customer).toEqual({ name: 'Riya Sen', email: 'riya@example.com', contact: '+919876543210' });
        expect(sent.notes).toMatchObject({ kind: 'resale', resaleId: out.resale.id });
    });

    it('picks up a payment when listing, without the webhook', async () => {
        const mail = vi.fn(async () => ({ ok: true }));
        await RESALE_ACTIONS['ticket-resale-create'](db, form(), {});
        linkState = { status: 'paid', amount_paid: 900000, payments: [{ payment_id: 'pay_77', amount: 900000, status: 'captured', method: 'card' }] };
        const out = await RESALE_ACTIONS['ticket-resale-list'](db, {}, { mailOpts: { mail } });
        expect(out.resales[0]).toMatchObject({ status: 'paid', paymentId: 'pay_77', paidAmount: 9000 });
        expect(mail).toHaveBeenCalledTimes(1);
    });

    it('cancels an unpaid link on Razorpay too', async () => {
        const { resale } = await RESALE_ACTIONS['ticket-resale-create'](db, form(), {});
        const out = await RESALE_ACTIONS['ticket-resale-cancel'](db, { id: resale.id }, {});
        expect(out.resale.status).toBe('cancelled');
        expect(calls.some(c => c.url.endsWith('/plink_new/cancel'))).toBe(true);
    });
});

describe('the payment received email', () => {
    it('confirms the money and says tickets come separately', () => {
        const out = render('resale-payment-received', { name: 'Riya Sen', eventName: 'Coldplay', ticketType: 'Silver', quantity: 2, unitPrice: 4500, amount: 9000, ref: 'NR-ABCDEF', paymentId: 'pay_1' });
        expect(out.subject).toBe('Payment received: Coldplay');
        expect(out.html).toContain('NR-ABCDEF');
        expect(out.html).toContain('pay_1');
        expect(out.text).toMatch(/send your tickets to you separately/);
    });
});

