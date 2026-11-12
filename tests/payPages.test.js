import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import crypto from 'node:crypto';
import { FakeFirestore } from './helpers/fakeFirestore.js';
import {
    PAYPAGE_PUBLIC_ACTIONS, readPayerInput, createPage, updatePage, closePage, settlePagePayment, settlePageFromWebhook, resendPageEmail,
} from '../api/_lib/payPages.js';
import { RESALE_ACTIONS } from '../api/_lib/ticketResale.js';

const fails = async (p, code) => {
    try { await p; } catch (err) { expect(err.code).toBe(code); return err; }
    throw new Error(`expected ${code}`);
};
const sign = (secret, message) => crypto.createHmac('sha256', secret).update(message).digest('hex');
const payer = (over = {}) => ({ amount: 4500, name: 'Riya Sen', email: 'Riya@Example.com', phone: '98765 43210', ...over });

describe('what the buyer types', () => {
    it('tidies a good form', () => {
        expect(readPayerInput(payer({ amount: '4500.505' }))).toEqual({ amount: 4500.51, name: 'Riya Sen', email: 'riya@example.com', phone: '+919876543210' });
    });

    it('says which field is wrong', () => {
        let err;
        try { readPayerInput({ amount: 0, name: 'R', email: 'x', phone: '12' }); } catch (e) { err = e; }
        expect(err.code).toBe('VALIDATION');
        expect(Object.keys(err.errors).sort()).toEqual(['amount', 'email', 'name', 'phone']);
        expect(() => readPayerInput(payer({ amount: 600000 }))).toThrow(/most/);
    });
});

describe('a payment page', () => {
    let db;
    let mail;
    beforeEach(async () => {
        db = new FakeFirestore({});
        mail = vi.fn(async () => ({ ok: true }));
    });

    it('is made with just the event name, and staff can close it', async () => {
        await fails(createPage(db, { eventName: ' ' }), 'VALIDATION');
        const { resale } = await createPage(db, { eventName: 'Coldplay, Mumbai' }, { staffEmail: 'team@newbi.live' });
        expect(resale).toMatchObject({ kind: 'page', status: 'open', eventName: 'Coldplay, Mumbai', paidTotal: 0, paidCount: 0, createdBy: 'team@newbi.live' });
        expect(resale.ref).toMatch(/^NR-/);
        const closed = await closePage(db, resale.id);
        expect(closed.resale.status).toBe('closed');
    });

    it('keeps a picture, lets staff change or remove it, and refuses a bad link', async () => {
        const img = 'https://firebasestorage.googleapis.com/v0/b/x/o/media%2Fa%2Fw1280.webp?alt=media';
        const { resale } = await createPage(db, { eventName: 'Coldplay', image: img });
        expect(resale.image).toBe(img);
        await fails(createPage(db, { eventName: 'Coldplay', image: 'javascript:alert(1)' }), 'VALIDATION');
        await fails(createPage(db, { eventName: 'Coldplay', image: 'http://example.com/a.jpg' }), 'VALIDATION');
        const changed = await updatePage(db, { id: resale.id, image: 'https://example.com/b.jpg' });
        expect(changed.resale.image).toBe('https://example.com/b.jpg');
        expect((await updatePage(db, { id: resale.id, image: '' })).resale.image).toBe('');
        expect(db.dump('ticket_resales')[resale.id].image).toBe('');
    });

    it('puts the picture in the confirmation email', async () => {
        const { resale } = await createPage(db, { eventName: 'Coldplay', image: 'https://example.com/p.jpg' });
        await settlePagePayment(db, resale.id, { paymentId: 'pay_1', amount: 100, email: 'a@b.com' }, { mail });
        expect(mail.mock.calls[0][2].image).toBe('https://example.com/p.jpg');
    });

    it('records each payment once, adds it up, and emails each buyer once', async () => {
        const { resale } = await createPage(db, { eventName: 'Coldplay' });
        await settlePagePayment(db, resale.id, { paymentId: 'pay_1', orderId: 'order_1', amount: 4500, name: 'Riya', email: 'riya@example.com', phone: '+919876543210', method: 'upi' }, { mail });
        await settlePagePayment(db, resale.id, { paymentId: 'pay_1', orderId: 'order_1', amount: 4500, email: 'riya@example.com' }, { mail });
        await settlePagePayment(db, resale.id, { paymentId: 'pay_2', orderId: 'order_2', amount: 3000, name: 'Kabir', email: 'kabir@example.com' }, { mail });
        const page = db.dump('ticket_resales')[resale.id];
        expect(page).toMatchObject({ paidTotal: 7500, paidCount: 2 });
        expect(page.payments.map(p => [p.paymentId, p.emailStatus])).toEqual([['pay_2', 'sent'], ['pay_1', 'sent']]);
        expect(mail).toHaveBeenCalledTimes(2);
        expect(mail.mock.calls[0]).toEqual(expect.arrayContaining(['resale-payment-received', 'riya@example.com']));
        expect(mail.mock.calls[0][2]).toMatchObject({ eventName: 'Coldplay', amount: 4500, paymentId: 'pay_1' });
        expect(mail.mock.calls[0][3].idempotencyKey).toBe('paypage-pay_1');
    });

    it('keeps a failed email visible and lets staff resend it', async () => {
        const { resale } = await createPage(db, { eventName: 'Coldplay' });
        mail.mockResolvedValueOnce({ ok: false, error: 'SMTP down' });
        await settlePagePayment(db, resale.id, { paymentId: 'pay_1', amount: 100, email: 'riya@example.com' }, { mail });
        expect(db.dump('ticket_resales')[resale.id].payments[0].emailStatus).toBe('failed');
        const out = await resendPageEmail(db, resale.id, 'pay_1', { mail });
        expect(out.resale.payments[0].emailStatus).toBe('sent');
    });

    it('is settled from the webhook by the notes', async () => {
        const { resale } = await createPage(db, { eventName: 'Coldplay' });
        const payment = { id: 'pay_9', order_id: 'order_9', amount: 250000, method: 'card', email: 'a@b.com', contact: '+919999999999', notes: {} };
        const order = { notes: { kind: 'paypage', pageId: resale.id, name: 'Asha' } };
        expect(await settlePageFromWebhook(db, payment, order, { mail })).toBe(true);
        expect(db.dump('ticket_resales')[resale.id].payments[0]).toMatchObject({ paymentId: 'pay_9', amount: 2500, name: 'Asha', email: 'a@b.com' });
        expect(await settlePageFromWebhook(db, { id: 'pay_x', notes: {} }, { notes: {} }, { mail })).toBe(false);
    });

    it('is closed through the resale cancel action, without calling Razorpay', async () => {
        const { resale } = await createPage(db, { eventName: 'Coldplay' });
        const out = await RESALE_ACTIONS['ticket-resale-cancel'](db, { id: resale.id }, {});
        expect(out.resale.status).toBe('closed');
    });
});

describe('paying on a page', () => {
    let db;
    let pageId;
    let orders;
    beforeEach(async () => {
        process.env.RAZORPAY_KEY_ID = 'rzp_test_x';
        process.env.RAZORPAY_KEY_SECRET = 'sek';
        db = new FakeFirestore({});
        ({ resale: { id: pageId } } = await createPage(db, { eventName: 'Coldplay, Mumbai' }));
        orders = {};
        vi.stubGlobal('fetch', vi.fn(async (url, init = {}) => {
            const ok = (data) => ({ ok: true, json: async () => data });
            const body = init.body ? JSON.parse(init.body) : null;
            if (url.endsWith('/orders') && init.method === 'POST') {
                const id = `order_${Object.keys(orders).length + 1}`;
                orders[id] = { id, amount: body.amount, amount_paid: body.amount, currency: 'INR', notes: body.notes };
                return ok(orders[id]);
            }
            const m = url.match(/\/orders\/([^/]+)$/);
            if (m) return ok(orders[m[1]]);
            if (url.match(/\/payments\/pay_1$/)) return ok({ id: 'pay_1', order_id: 'order_1', amount: orders.order_1.amount, method: 'upi' });
            throw new Error(`unexpected fetch ${url}`);
        }));
    });
    afterEach(() => {
        vi.unstubAllGlobals();
        delete process.env.RAZORPAY_KEY_ID;
        delete process.env.RAZORPAY_KEY_SECRET;
    });

    it('shows the page, opens an order for the typed amount, and confirms by signature', async () => {
        const view = await PAYPAGE_PUBLIC_ACTIONS['ticket-paypage-view'](db, { id: pageId });
        expect(view.page).toEqual({ id: pageId, eventName: 'Coldplay, Mumbai', image: '', open: true });

        const start = await PAYPAGE_PUBLIC_ACTIONS['ticket-paypage-start'](db, { id: pageId, ...payer() });
        expect(start).toMatchObject({ keyId: 'rzp_test_x', gatewayOrderId: 'order_1', amount: 450000 });
        expect(orders.order_1.notes).toMatchObject({ kind: 'paypage', pageId, email: 'riya@example.com', phone: '+919876543210' });

        const mail = vi.fn(async () => ({ ok: true }));
        await fails(PAYPAGE_PUBLIC_ACTIONS['ticket-paypage-confirm'](db, { id: pageId, razorpay_order_id: 'order_1', razorpay_payment_id: 'pay_1', razorpay_signature: 'nope' }), 'SIGNATURE');
        const conf = await PAYPAGE_PUBLIC_ACTIONS['ticket-paypage-confirm'](db, {
            id: pageId, razorpay_order_id: 'order_1', razorpay_payment_id: 'pay_1', razorpay_signature: sign('sek', 'order_1|pay_1'),
        }, { mailOpts: { mail } });
        expect(conf).toMatchObject({ paid: true, paymentId: 'pay_1', amount: 4500, emailed: true });
        expect(db.dump('ticket_resales')[pageId]).toMatchObject({ paidTotal: 4500, paidCount: 1 });
        expect(mail.mock.calls[0][1]).toBe('riya@example.com');
    });

    it('refuses a closed page and a bad form', async () => {
        await fails(PAYPAGE_PUBLIC_ACTIONS['ticket-paypage-start'](db, { id: pageId, ...payer({ email: 'bad' }) }), 'VALIDATION');
        await closePage(db, pageId);
        await fails(PAYPAGE_PUBLIC_ACTIONS['ticket-paypage-start'](db, { id: pageId, ...payer() }), 'CLOSED');
        expect((await PAYPAGE_PUBLIC_ACTIONS['ticket-paypage-view'](db, { id: pageId })).page.open).toBe(false);
        await fails(PAYPAGE_PUBLIC_ACTIONS['ticket-paypage-view'](db, { id: 'nope' }), 'NOT_FOUND');
    });

    it('won’t record another page’s order here', async () => {
        const other = await createPage(db, { eventName: 'Other' });
        await PAYPAGE_PUBLIC_ACTIONS['ticket-paypage-start'](db, { id: other.resale.id, ...payer() });
        await fails(PAYPAGE_PUBLIC_ACTIONS['ticket-paypage-confirm'](db, {
            id: pageId, razorpay_order_id: 'order_1', razorpay_payment_id: 'pay_1', razorpay_signature: sign('sek', 'order_1|pay_1'),
        }), 'VALIDATION');
        expect(db.dump('ticket_resales')[pageId].paidCount).toBe(0);
    });
});
