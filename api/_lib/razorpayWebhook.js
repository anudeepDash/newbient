/**
 * Razorpay's webhook, served as /api/track?type=razorpay (the project is at
 * Vercel's function limit, so it lives inside an existing function).
 *
 * Confirms a payment even when the buyer closed the tab before checkout told us.
 * In Razorpay Dashboard → Webhooks: URL https://app.newbi.live/api/track?type=razorpay,
 * events payment.captured, order.paid and payment_link.paid (resale links), and the
 * secret in RAZORPAY_WEBHOOK_SECRET.
 */
import { getDb } from './db.js';
import { webhookSignatureOk } from './razorpay.js';
import { settleTicketByGatewayOrder } from './tickets.js';
import { settleInvoicePayment } from './sharedDocs.js';
import { settleResaleFromWebhook } from './ticketResale.js';

const PAID_EVENTS = new Set(['payment.captured', 'order.paid', 'payment_link.paid']);

export const handleRazorpayWebhook = async (req, res, rawBody) => {
    if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });
    const text = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : String(rawBody || '');
    if (!process.env.RAZORPAY_WEBHOOK_SECRET) return res.status(503).json({ success: false, error: 'Webhook secret not set.' });
    if (!webhookSignatureOk(text, req.headers['x-razorpay-signature'])) return res.status(401).json({ success: false, error: 'Bad signature.' });

    let event;
    try { event = JSON.parse(text); } catch { return res.status(400).json({ success: false, error: 'Bad body.' }); }
    if (!PAID_EVENTS.has(event?.event)) return res.status(200).json({ success: true, ignored: true });

    const payment = event?.payload?.payment?.entity;

    // A resale payment link (api/_lib/ticketResale.js) was paid.
    if (event.event === 'payment_link.paid') {
        try {
            const ok = await settleResaleFromWebhook(getDb(), event?.payload?.payment_link?.entity, payment);
            return res.status(200).json({ success: true, ...(ok ? { kind: 'resale' } : { ignored: true }) });
        } catch (err) {
            console.error('[API/RAZORPAY-WEBHOOK] resale failed:', err);
            return res.status(500).json({ success: false, error: 'Try again.' });
        }
    }

    if (!payment?.id || !payment?.order_id || !['captured', 'authorized'].includes(payment.status)) {
        return res.status(200).json({ success: true, ignored: true });
    }
    try {
        const db = getDb();
        if (await settleTicketByGatewayOrder(db, payment.order_id, payment.id)) return res.status(200).json({ success: true, kind: 'ticket' });
        const invoiceId = payment.notes?.invoiceId;
        if (payment.notes?.kind === 'invoice' && invoiceId) {
            await settleInvoicePayment(db, String(invoiceId), { orderId: payment.order_id, paymentId: payment.id, amount: payment.amount / 100 });
            return res.status(200).json({ success: true, kind: 'invoice' });
        }
        return res.status(200).json({ success: true, ignored: true });
    } catch (err) {
        console.error('[API/RAZORPAY-WEBHOOK] failed:', err);
        // A 5xx makes Razorpay retry.
        return res.status(500).json({ success: false, error: 'Try again.' });
    }
};
