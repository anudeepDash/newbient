import { describe, it, expect, beforeEach } from 'vitest';
import crypto from 'node:crypto';
import { FakeFirestore } from './helpers/fakeFirestore.js';
import { gatewaySignatureOk, webhookSignatureOk } from '../api/_lib/razorpay.js';
import { settleInvoicePayment } from '../api/_lib/sharedDocs.js';

const sign = (secret, message) => crypto.createHmac('sha256', secret).update(message).digest('hex');
const fails = async (p, code) => {
    try { await p; } catch (err) { expect(err.code).toBe(code); return; }
    throw new Error(`expected ${code}`);
};

describe('Razorpay signatures', () => {
    it('accepts the checkout signature for the same order and payment only', () => {
        const sig = sign('sek', 'order_1|pay_1');
        expect(gatewaySignatureOk('order_1', 'pay_1', sig, 'sek')).toBe(true);
        expect(gatewaySignatureOk('order_1', 'pay_2', sig, 'sek')).toBe(false);
        expect(gatewaySignatureOk('order_2', 'pay_1', sig, 'sek')).toBe(false);
        expect(gatewaySignatureOk('order_1', 'pay_1', sig, 'other')).toBe(false);
        expect(gatewaySignatureOk('order_1', 'pay_1', undefined, 'sek')).toBe(false);
        expect(gatewaySignatureOk('order_1', 'pay_1', sig, '')).toBe(false);
    });

    it('checks the webhook signature against the raw body', () => {
        const body = '{"event":"payment.captured"}';
        const sig = sign('hook', body);
        expect(webhookSignatureOk(body, sig, 'hook')).toBe(true);
        expect(webhookSignatureOk(`${body} `, sig, 'hook')).toBe(false);
        expect(webhookSignatureOk(body, sig, '')).toBe(false);
        expect(webhookSignatureOk('', sig, 'hook')).toBe(false);
    });
});

describe('invoice payments through Razorpay', () => {
    let db;
    beforeEach(() => {
        db = new FakeFirestore({
            'invoices/i1': { invoiceNumber: 'NB-1', total: 5000, status: 'Pending', razorpayOrderIds: ['order_a', 'order_b'] },
            'admins/f@newbi.live': { email: 'f@newbi.live', role: 'founder', uid: 'u_founder' },
        });
    });

    it('logs a part payment and leaves the invoice open', async () => {
        const out = await settleInvoicePayment(db, 'i1', { orderId: 'order_a', paymentId: 'pay_1', amount: 2000 }, '2026-10-29T10:00:00.000Z');
        expect(out.paid).toBe(false);
        const inv = db.dump('invoices').i1;
        expect(inv.status).toBe('Pending');
        expect(inv.paymentLogs).toHaveLength(1);
        expect(inv.paymentLogs[0]).toMatchObject({ kind: 'payment', type: 'Razorpay', amount: 2000, transactionId: 'pay_1' });
    });

    it('marks the invoice paid once the balance is cleared, and clears a pending claim', async () => {
        db.collection('invoices').doc('i1').update({ status: 'Verification Pending', paymentClaim: { status: 'pending' } });
        await settleInvoicePayment(db, 'i1', { orderId: 'order_a', paymentId: 'pay_1', amount: 2000 });
        const out = await settleInvoicePayment(db, 'i1', { orderId: 'order_b', paymentId: 'pay_2', amount: 3000 });
        expect(out.paid).toBe(true);
        const inv = db.dump('invoices').i1;
        expect(inv.status).toBe('Paid');
        expect(inv.paidAt).toBeTruthy();
        expect(inv.paymentClaim.status).toBe('approved');
    });

    it('records one payment id once (checkout and the webhook both report it)', async () => {
        await settleInvoicePayment(db, 'i1', { orderId: 'order_a', paymentId: 'pay_1', amount: 5000 });
        const again = await settleInvoicePayment(db, 'i1', { orderId: 'order_a', paymentId: 'pay_1', amount: 5000 });
        expect(again.duplicate).toBe(true);
        expect(db.dump('invoices').i1.paymentLogs).toHaveLength(1);
    });

    it('refuses a payment for an order that was not opened on this invoice', async () => {
        await fails(settleInvoicePayment(db, 'i1', { orderId: 'order_x', paymentId: 'pay_9', amount: 5000 }), 'VALIDATION');
        expect(db.dump('invoices').i1.paymentLogs).toBeUndefined();
    });
});
