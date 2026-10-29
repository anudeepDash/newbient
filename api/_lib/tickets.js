/**
 * Public ticket actions, served through /api/creator-join?action=ticket-*
 * (kept inside an existing function so the project stays within Vercel's
 * function limit). Runs with Firebase Admin, so it can see every order for an
 * event — which buyers' browsers cannot — and enforce capacity, sale windows,
 * per-order limits and coupons.
 *
 *   ticket-config         is Razorpay set up on the server
 *   ticket-availability   seats left, the sale state, whether the sale is free
 *   ticket-coupon         validate a code
 *   ticket-check          the cart again, the amount, and a booking reference
 *   ticket-order          free orders only: confirmed at once
 *   ticket-gateway-start  Razorpay is the only way to pay: holds the seats for 15 min
 *                         and opens a Razorpay order (needs RAZORPAY_KEY_ID and
 *                         RAZORPAY_KEY_SECRET in the server env)
 *   ticket-gateway-confirm  checks Razorpay's signature (or, for staff, asks Razorpay,
 *                         or Razorpay's webhook) and confirms the order
 */
import crypto from 'node:crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { sendOrderEmail } from './mail/events.js';
import { razorpay, razorpayConfigured, razorpayKeyId, gatewaySignatureOk, paidPaymentFor } from './razorpay.js';
import {
    computeAvailability, priceCart, applyCoupon, couponProblem, normalizeCouponCode, makeBookingRef,
    cartProblem, eventIsFree, eventSaleState, linesAdmit, AWAITING_PAYMENT, GATEWAY_HOLD_MINUTES,
} from '../../src/lib/ticketing.js';

class TicketError extends Error {
    constructor(code, message, status = 400) {
        super(message);
        this.code = code;
        this.status = status;
    }
}

const BOOKING_REF_RE = /^NB-[A-HJ-NP-Z2-9]{6}$/;

const loadEvent = async (db, eventId) => {
    if (!eventId || typeof eventId !== 'string' || eventId.length > 128) throw new TicketError('VALIDATION', 'Missing event.');
    const snap = await db.collection('upcoming_events').doc(eventId).get();
    if (!snap.exists) throw new TicketError('NOT_FOUND', "We couldn't find this event.", 404);
    return { id: snap.id, ...snap.data() };
};

const eventOrders = async (db, eventId, tx) => {
    const q = db.collection('ticket_orders').where('eventId', '==', eventId);
    const snap = tx ? await tx.get(q) : await q.get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

const findCoupon = async (db, code, eventId) => {
    const normalized = normalizeCouponCode(code);
    if (!normalized) return null;
    const snap = await db.collection('coupons').where('code', '==', normalized).limit(10).get();
    const candidates = snap.docs.map(d => ({ id: d.id, ref: d.ref, ...d.data() }));
    // Prefer a coupon made for this event, then a site-wide one.
    return candidates.find(c => c.eventId === eventId && c.isActive !== false)
        || candidates.find(c => !c.eventId && c.isActive !== false)
        || candidates[0]
        || null;
};

// ── the payment gateway: Razorpay, for every paid booking ──────────────────

export const gatewayConfigured = razorpayConfigured;
export { gatewaySignatureOk };

// ── shared checks ───────────────────────────────────────────────────────────

// What the checkout needs: seats left per tier and overall, the sale state, payment methods.
const publicAvailability = (event, availability) => {
    const sale = eventSaleState(event);
    return {
        tiers: Object.fromEntries(Object.values(availability.tiers).map(t => [t.id, { remaining: t.remaining }])),
        total: { remaining: availability.total.remaining },
        soldOut: availability.total.remaining === 0
            || (Object.values(availability.tiers).length > 0 && Object.values(availability.tiers).every(t => t.remaining === 0)),
        sale: { state: sale.state, opensAt: sale.opensAt?.toISOString?.() || null },
        payments: { gateway: razorpayConfigured(), free: eventIsFree(event) },
    };
};

const cartFromItems = (items) => {
    const cart = {};
    (Array.isArray(items) ? items : []).slice(0, 30).forEach(it => {
        if (!it || typeof it.id !== 'string') return;
        cart[it.id] = (cart[it.id] || 0) + (Math.floor(Number(it.count)) || 0);
    });
    return cart;
};

const shortageMessage = (event, availability, lines) => {
    for (const line of lines) {
        const tier = availability.tiers[line.id];
        if (tier && tier.remaining !== null && line.count > tier.remaining) {
            return tier.remaining === 0
                ? `${tier.name} is sold out.`
                : `Only ${tier.remaining} ${tier.name} ${tier.remaining === 1 ? 'ticket is' : 'tickets are'} left.`;
        }
    }
    const want = lines.reduce((a, l) => a + l.count, 0);
    const left = availability.total.remaining;
    if (left !== null && want > left) {
        return left === 0 ? 'This event is sold out.' : `Only ${left} ${left === 1 ? 'ticket is' : 'tickets are'} left for this event.`;
    }
    return null;
};

/** The event, priced lines and subtotal for a request, or a refusal. */
const readCart = async (db, body) => {
    const event = await loadEvent(db, body.eventId);
    if (!event.isTicketed) throw new TicketError('VALIDATION', "Tickets aren't on sale for this event.");
    const cart = cartFromItems(body.items);
    const problem = cartProblem(event, cart);
    if (problem) throw new TicketError(eventSaleState(event).state === 'open' ? 'VALIDATION' : 'NOT_ON_SALE', problem);
    const { lines, subtotal } = priceCart(event, cart);
    if (!lines.length) throw new TicketError('VALIDATION', 'Choose at least one ticket.');
    return { event, lines, subtotal };
};

const readCustomer = (customer = {}) => {
    const name = String(customer.name || '').trim().slice(0, 120);
    const email = String(customer.email || '').trim().toLowerCase().slice(0, 200);
    const phone = String(customer.phone || '').trim().slice(0, 20);
    if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || phone.replace(/\D/g, '').length < 10) {
        throw new TicketError('VALIDATION', 'Please check your name, email and phone number.');
    }
    return { name, email, phone };
};

/** A reference nobody has: the one reserved at the check step if it's still free, else a new one. */
const freeBookingRef = async (db, wanted, tx) => {
    const taken = async (ref) => {
        const q = db.collection('ticket_orders').where('bookingRef', '==', ref).limit(1);
        const snap = tx ? await tx.get(q) : await q.get();
        if (!snap.empty) return true;
        const pass = tx ? await tx.get(db.collection('passes').doc(ref)) : await db.collection('passes').doc(ref).get();
        return pass.exists;
    };
    if (wanted && BOOKING_REF_RE.test(wanted) && !(await taken(wanted))) return wanted;
    for (let i = 0; i < 6; i++) {
        const ref = makeBookingRef(() => crypto.randomInt(0, 1e9) / 1e9);
        if (!(await taken(ref))) return ref;
    }
    throw new TicketError('SERVER', 'Please try again.', 503);
};

const sendFirstEmail = async (result, orderId, event) => {
    // The pass goes out as soon as the order is confirmed (free, or paid on Razorpay).
    // Awaited, but never fails the order.
    try {
        const sent = await sendOrderEmail(orderId, { event });
        result.emailed = Boolean(sent?.delivery?.email?.status === 'sent' || sent?.duplicate);
    } catch (err) {
        console.warn('[API/TICKETS] Order email not sent:', err.message);
        result.emailed = false;
    }
    return result;
};

// ── actions ──────────────────────────────────────────────────────────────────

const availabilityAction = async (db, body) => {
    const event = await loadEvent(db, body.eventId);
    const availability = computeAvailability(event, await eventOrders(db, event.id));
    return { success: true, availability: publicAvailability(event, availability) };
};

const couponAction = async (db, body) => {
    const event = await loadEvent(db, body.eventId);
    const coupon = await findCoupon(db, body.code, event.id);
    const problem = couponProblem(coupon, event.id);
    if (problem) throw new TicketError('COUPON_INVALID', problem);
    return {
        success: true,
        coupon: { id: coupon.id, code: coupon.code, discountType: coupon.discountType, discountValue: Number(coupon.discountValue) || 0 },
    };
};

// Checkout calls this right before showing the payment screen, so nobody pays
// for seats that are already gone. The booking reference it returns goes in the
// UPI payment note and is kept for the order if it's still free then.
const checkAction = async (db, body) => {
    const { event, lines, subtotal } = await readCart(db, body);
    const availability = computeAvailability(event, await eventOrders(db, event.id));
    const shortage = shortageMessage(event, availability, lines);
    if (shortage) throw new TicketError('SOLD_OUT', shortage, 409);
    let coupon = null;
    if (body.couponCode) {
        coupon = await findCoupon(db, body.couponCode, event.id);
        const problem = couponProblem(coupon, event.id);
        if (problem) throw new TicketError('COUPON_INVALID', problem);
    }
    const { discount, total } = applyCoupon(subtotal, coupon);
    const keep = typeof body.bookingRef === 'string' ? body.bookingRef.toUpperCase() : null;
    const bookingRef = await freeBookingRef(db, keep);
    return { success: true, subtotal, discount, total, bookingRef, availability: publicAvailability(event, availability) };
};

/**
 * Saves an order in one transaction (capacity, the coupon count, a unique
 * reference). method 'gateway' (Razorpay) holds the seats until paid; 'free'
 * is for orders that cost nothing.
 */
const placeOrder = async (db, body, decodedToken, method) => {
    const customer = readCustomer(body.customer);
    const { event, lines, subtotal } = await readCart(db, body);
    if (method === 'gateway' && !razorpayConfigured()) throw new TicketError('GATEWAY', 'Online payment isn’t set up yet. Please try again later.', 503);

    // Coupon documents are looked up by code outside the transaction, then
    // re-read inside it so the usage count is checked and bumped atomically.
    const couponCandidate = body.couponCode ? await findCoupon(db, body.couponCode, event.id) : null;
    if (body.couponCode && !couponCandidate) throw new TicketError('COUPON_INVALID', "That coupon code doesn't exist.");

    const eventRef = db.collection('upcoming_events').doc(event.id);
    // Every purchase for an event writes this lock document, so concurrent
    // purchases conflict and Firestore retries them one at a time.
    const lockRef = db.collection('ticket_locks').doc(event.id);
    const orderRef = db.collection('ticket_orders').doc();
    const wantedRef = typeof body.bookingRef === 'string' ? body.bookingRef.toUpperCase() : null;

    return db.runTransaction(async (tx) => {
        const [eventSnap, lockSnap, orders, couponSnap] = await Promise.all([
            tx.get(eventRef),
            tx.get(lockRef),
            eventOrders(db, event.id, tx),
            couponCandidate ? tx.get(couponCandidate.ref) : Promise.resolve(null),
        ]);
        void lockSnap;
        const freshEvent = { id: eventSnap.id, ...eventSnap.data() };
        const availability = computeAvailability(freshEvent, orders);
        const coupon = couponSnap?.exists ? { id: couponSnap.id, ...couponSnap.data() } : null;
        const couponIssue = couponCandidate ? couponProblem(coupon, event.id) : null;
        const { discount, total } = applyCoupon(subtotal, couponIssue ? null : coupon);
        const isPaid = total > 0;

        if (method === 'gateway' && !isPaid) throw new TicketError('VALIDATION', 'These tickets are free. No payment needed.');
        if (method === 'free' && isPaid) throw new TicketError('VALIDATION', 'These tickets need to be paid for online.');

        const shortage = shortageMessage(freshEvent, availability, lines);
        // Nothing is paid yet, so a sold-out event or a bad coupon simply refuses the order.
        if (shortage) throw new TicketError('SOLD_OUT', shortage, 409);
        if (couponIssue && couponCandidate) throw new TicketError('COUPON_INVALID', couponIssue);

        const bookingRef = await freeBookingRef(db, wantedRef, tx);
        const now = new Date();
        const nowIso = now.toISOString();
        const status = !isPaid ? 'confirmed' : AWAITING_PAYMENT;
        const order = {
            eventId: event.id,
            eventTitle: freshEvent.title || '',
            userId: decodedToken?.uid || null,
            customerName: customer.name,
            customerEmail: customer.email,
            customerPhone: customer.phone,
            items: lines.map(l => ({ id: l.id, name: l.name, count: l.count, price: l.price, ...(l.admits > 1 ? { admits: l.admits } : {}) })),
            people: linesAdmit(lines),
            subtotal,
            discount,
            totalAmount: total,
            paymentMethod: !isPaid ? 'free' : method,
            paymentRef: !isPaid ? 'FREE' : '',
            ...(status === AWAITING_PAYMENT ? { holdUntil: new Date(now.getTime() + GATEWAY_HOLD_MINUTES * 60000).toISOString() } : {}),
            bookingRef,
            appliedCoupon: coupon && !couponIssue
                ? { id: coupon.id, code: coupon.code, discountValue: Number(coupon.discountValue) || 0, discountType: coupon.discountType }
                : null,
            status,
            source: 'checkout-api',
            createdAt: nowIso,
            ...(shortage ? { overCapacity: true, overCapacityNote: shortage } : {}),
            ...(couponIssue && couponCandidate ? { couponRejected: true, couponRejectedNote: couponIssue, requestedCoupon: normalizeCouponCode(body.couponCode) } : {}),
        };

        tx.set(orderRef, order);
        tx.set(lockRef, { lastOrderAt: nowIso, eventId: event.id }, { merge: true });
        if (coupon && !couponIssue) tx.update(couponSnap.ref, { usedCount: FieldValue.increment(1) });

        return {
            event: freshEvent,
            result: {
                success: true,
                orderId: orderRef.id,
                bookingRef,
                status,
                totalAmount: total,
                overCapacity: Boolean(shortage),
                couponRejected: Boolean(couponIssue && couponCandidate),
            },
        };
    });
};

const orderAction = async (db, body, decodedToken) => {
    const { event, result } = await placeOrder(db, body, decodedToken, 'free');
    return sendFirstEmail(result, result.orderId, event);
};

const gatewayStartAction = async (db, body, decodedToken) => {
    const { event, result } = await placeOrder(db, body, decodedToken, 'gateway');
    const orderRef = db.collection('ticket_orders').doc(result.orderId);
    try {
        const gw = await razorpay('/orders', {
            method: 'POST',
            body: {
                amount: Math.round(result.totalAmount * 100),
                currency: 'INR',
                receipt: result.bookingRef,
                notes: { orderId: result.orderId, eventId: event.id, bookingRef: result.bookingRef },
            },
        });
        await orderRef.update({ gateway: 'razorpay', gatewayOrderId: gw.id });
        return {
            success: true,
            orderId: result.orderId,
            bookingRef: result.bookingRef,
            keyId: razorpayKeyId(),
            gatewayOrderId: gw.id,
            amount: gw.amount,
            currency: gw.currency || 'INR',
            name: 'Newbi Entertainment',
            description: String(event.title || 'Tickets').slice(0, 80),
        };
    } catch (err) {
        // Couldn't open the payment: give the seats straight back.
        await orderRef.update({ status: 'rejected', rejectedAt: new Date().toISOString(), rejectReason: 'gateway_unavailable', holdUntil: null }).catch(() => {});
        console.error('[API/TICKETS] gateway order failed:', err.message);
        throw new TicketError('GATEWAY', 'Online payment isn’t working right now. Please try again in a moment.', 503);
    }
};

/** Marks a Razorpay-paid order confirmed and sends the pass. Safe to call twice (checkout and webhook both do). */
const settleOrder = async (db, orderRef, order, paymentId) => {
    if (order.status !== AWAITING_PAYMENT && order.paymentRef === paymentId) {
        return { success: true, paid: true, status: order.status, bookingRef: order.bookingRef, orderId: orderRef.id };
    }
    const now = new Date().toISOString();
    // Paid after the hold ran out: they keep the order, the team sees the flag.
    const late = order.status !== AWAITING_PAYMENT;
    await orderRef.update({
        status: 'dispatched',
        paymentRef: paymentId,
        approvedAt: now,
        dispatchedAt: now,
        holdUntil: null,
        ...(late ? { overCapacity: true, overCapacityNote: 'Paid online after the seat hold expired. Check capacity.' } : {}),
    });
    const result = { success: true, paid: true, status: 'dispatched', bookingRef: order.bookingRef, orderId: orderRef.id };
    return sendFirstEmail(result, orderRef.id, null);
};

/** Razorpay's webhook says this gateway order was paid. Returns true when it was one of our ticket orders. */
export const settleTicketByGatewayOrder = async (db, gatewayOrderId, paymentId) => {
    const q = await db.collection('ticket_orders').where('gatewayOrderId', '==', gatewayOrderId).limit(1).get();
    if (q.empty) return false;
    const doc = q.docs[0];
    await settleOrder(db, doc.ref, doc.data(), String(paymentId));
    return true;
};

const gatewayConfirmAction = async (db, body, decodedToken, { isStaff } = {}) => {
    if (!razorpayConfigured()) throw new TicketError('GATEWAY', 'Online payment isn’t set up.', 503);
    const orderId = String(body.orderId || '');
    if (!orderId || orderId.length > 64) throw new TicketError('VALIDATION', 'Missing order.');
    const orderRef = db.collection('ticket_orders').doc(orderId);
    const snap = await orderRef.get();
    if (!snap.exists) throw new TicketError('NOT_FOUND', 'Order not found.', 404);
    const order = snap.data();
    if (!order.gatewayOrderId) throw new TicketError('VALIDATION', 'This order wasn’t paid online.');

    let paymentId = null;
    if (body.sync) {
        // Staff "check with Razorpay": ask the gateway whether it was paid.
        if (!(await isStaff?.())) throw new TicketError('FORBIDDEN', 'Forbidden', 403);
        const paid = await paidPaymentFor(order.gatewayOrderId);
        if (!paid) return { success: true, paid: false, status: order.status };
        paymentId = paid.id;
    } else {
        if (body.razorpay_order_id !== order.gatewayOrderId || !gatewaySignatureOk(order.gatewayOrderId, body.razorpay_payment_id, body.razorpay_signature)) {
            throw new TicketError('SIGNATURE', 'We couldn’t confirm that payment. If money left your account, contact us with your booking reference.', 400);
        }
        paymentId = String(body.razorpay_payment_id);
    }

    return settleOrder(db, orderRef, order, paymentId);
};

// What the admin's payment settings need to know: is the gateway set up on the server?
const configAction = async () => ({ success: true, gatewayReady: razorpayConfigured() });

const ACTIONS = {
    'ticket-config': configAction,
    'ticket-availability': availabilityAction,
    'ticket-coupon': couponAction,
    'ticket-check': checkAction,
    'ticket-order': orderAction,
    'ticket-gateway-start': gatewayStartAction,
    'ticket-gateway-confirm': gatewayConfirmAction,
};

export const isTicketAction = (action) => Object.prototype.hasOwnProperty.call(ACTIONS, action);

export const handleTicketAction = async (action, req, res, db, decodedToken, ctx = {}) => {
    const body = { ...(req.query || {}), ...(req.body && typeof req.body === 'object' ? req.body : {}) };
    try {
        const result = await ACTIONS[action](db, body, decodedToken, ctx);
        return res.status(200).json(result);
    } catch (err) {
        if (err instanceof TicketError) {
            return res.status(err.status).json({ success: false, code: err.code, error: err.message });
        }
        console.error(`[API/TICKETS] ${action} failed:`, err);
        return res.status(500).json({ success: false, code: 'SERVER', error: 'Ticketing is temporarily unavailable.' });
    }
};
