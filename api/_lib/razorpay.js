/**
 * Razorpay, the only way Newbi takes money (tickets and invoices).
 *
 * Server-only. Keys live in Vercel env, never in code or Firestore:
 *   RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET   the API keys
 *   RAZORPAY_WEBHOOK_SECRET                signs webhooks (Dashboard → Webhooks); optional,
 *                                          but without it a buyer who closes the tab after
 *                                          paying is only confirmed by the staff "check" button
 */
import crypto from 'node:crypto';

const keys = () => ({
    id: String(process.env.RAZORPAY_KEY_ID || '').trim(),
    secret: String(process.env.RAZORPAY_KEY_SECRET || '').trim(),
});

export const razorpayKeyId = () => keys().id;
export const razorpayConfigured = () => {
    const { id, secret } = keys();
    return Boolean(id && secret);
};

export const razorpay = async (path, { method = 'GET', body } = {}) => {
    const { id, secret } = keys();
    const res = await fetch(`https://api.razorpay.com/v1${path}`, {
        method,
        headers: {
            Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`,
            ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error?.description || `Razorpay ${res.status}`);
    return data;
};

const hmacOk = (secret, message, signature) => {
    if (!secret || typeof signature !== 'string') return false;
    const expected = crypto.createHmac('sha256', secret).update(message).digest('hex');
    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
};

/** Checkout signature: HMAC-SHA256 of "order_id|payment_id" with the key secret. */
export const gatewaySignatureOk = (orderId, paymentId, signature, secret = keys().secret) => {
    if (!orderId || !paymentId) return false;
    return hmacOk(secret, `${orderId}|${paymentId}`, signature);
};

/** Webhook signature: HMAC-SHA256 of the raw request body with the webhook secret. */
export const webhookSignatureOk = (rawBody, signature, secret = String(process.env.RAZORPAY_WEBHOOK_SECRET || '').trim()) => {
    if (!rawBody) return false;
    return hmacOk(secret, rawBody, signature);
};

/** A captured (or authorized) payment on a Razorpay order, or null. */
export const paidPaymentFor = async (gatewayOrderId) => {
    const payments = await razorpay(`/orders/${encodeURIComponent(gatewayOrderId)}/payments`);
    return (payments?.items || []).find(p => p.status === 'captured' || p.status === 'authorized') || null;
};
