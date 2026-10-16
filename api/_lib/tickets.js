/**
 * Public ticket actions, served through /api/creator-join?action=ticket-*
 * (kept inside an existing function so the project stays within Vercel's
 * function limit). Runs with Firebase Admin, so it can see every order for an
 * event — which buyers' browsers cannot — and enforce capacity and coupons.
 */
import { FieldValue } from 'firebase-admin/firestore';
import { sendOrderEmail } from './mail/events.js';
import {
    computeAvailability, priceCart, applyCoupon, couponProblem, normalizeCouponCode, makeBookingRef,
} from '../../src/lib/ticketing.js';

class TicketError extends Error {
    constructor(code, message, status = 400) {
        super(message);
        this.code = code;
        this.status = status;
    }
}

const loadEvent = async (db, eventId) => {
    if (!eventId || typeof eventId !== 'string') throw new TicketError('VALIDATION', 'Missing event.');
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

// What the checkout needs: remaining seats per tier and overall.
const publicAvailability = (event, availability) => ({
    tiers: Object.fromEntries(Object.values(availability.tiers).map(t => [t.id, { remaining: t.remaining }])),
    total: { remaining: availability.total.remaining },
    soldOut: availability.total.remaining === 0
        || (Object.values(availability.tiers).length > 0 && Object.values(availability.tiers).every(t => t.remaining === 0)),
});

const cartFromItems = (items) => {
    const cart = {};
    (Array.isArray(items) ? items : []).forEach(it => {
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
// for seats that are already gone.
const checkAction = async (db, body) => {
    const event = await loadEvent(db, body.eventId);
    if (!event.isTicketed) throw new TicketError('VALIDATION', "Tickets aren't on sale for this event.");
    const availability = computeAvailability(event, await eventOrders(db, event.id));
    const { lines, subtotal } = priceCart(event, cartFromItems(body.items));
    if (!lines.length) throw new TicketError('VALIDATION', 'Choose at least one ticket.');
    const shortage = shortageMessage(event, availability, lines);
    if (shortage) throw new TicketError('SOLD_OUT', shortage, 409);
    let coupon = null;
    if (body.couponCode) {
        coupon = await findCoupon(db, body.couponCode, event.id);
        const problem = couponProblem(coupon, event.id);
        if (problem) throw new TicketError('COUPON_INVALID', problem);
    }
    const { discount, total } = applyCoupon(subtotal, coupon);
    return { success: true, subtotal, discount, total, availability: publicAvailability(event, availability) };
};

const orderAction = async (db, body, decodedToken) => {
    const customer = body.customer || {};
    const name = String(customer.name || '').trim();
    const email = String(customer.email || '').trim();
    const phone = String(customer.phone || '').trim();
    if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || phone.replace(/\D/g, '').length < 7) {
        throw new TicketError('VALIDATION', 'Please check your name, email and phone number.');
    }
    const paymentRef = String(body.paymentRef || '').trim();

    const event = await loadEvent(db, body.eventId);
    if (!event.isTicketed) throw new TicketError('VALIDATION', "Tickets aren't on sale for this event.");
    const { lines, subtotal } = priceCart(event, cartFromItems(body.items));
    if (!lines.length) throw new TicketError('VALIDATION', 'Choose at least one ticket.');

    // Coupon documents are looked up by code outside the transaction, then
    // re-read inside it so the usage count is checked and bumped atomically.
    const couponCandidate = body.couponCode ? await findCoupon(db, body.couponCode, event.id) : null;
    if (body.couponCode && !couponCandidate) throw new TicketError('COUPON_INVALID', "That coupon code doesn't exist.");

    const eventRef = db.collection('upcoming_events').doc(event.id);
    // Every purchase for an event writes this lock document, so concurrent
    // purchases conflict and Firestore retries them one at a time.
    const lockRef = db.collection('ticket_locks').doc(event.id);
    const orderRef = db.collection('ticket_orders').doc();

    const result = await db.runTransaction(async (tx) => {
        const [eventSnap, lockSnap, orders, couponSnap, duplicateSnap] = await Promise.all([
            tx.get(eventRef),
            tx.get(lockRef),
            eventOrders(db, event.id, tx),
            couponCandidate ? tx.get(couponCandidate.ref) : Promise.resolve(null),
            paymentRef && paymentRef.toUpperCase() !== 'FREE'
                ? tx.get(db.collection('ticket_orders').where('paymentRef', '==', paymentRef).limit(1))
                : Promise.resolve(null),
        ]);
        void lockSnap;
        const freshEvent = { id: eventSnap.id, ...eventSnap.data() };
        const availability = computeAvailability(freshEvent, orders);
        const coupon = couponSnap?.exists ? { id: couponSnap.id, ...couponSnap.data() } : null;
        const couponIssue = couponCandidate ? couponProblem(coupon, event.id) : null;
        const { discount, total } = applyCoupon(subtotal, couponIssue ? null : coupon);
        const isPaid = total > 0;

        if (isPaid && !paymentRef) throw new TicketError('VALIDATION', 'Please enter your payment reference (UTR) number.');
        if (duplicateSnap && !duplicateSnap.empty) {
            throw new TicketError('DUPLICATE_PAYMENT', 'This payment reference has already been used. Please check your UTR number.', 409);
        }

        const shortage = shortageMessage(freshEvent, availability, lines);
        // A free booking can simply be refused. A paid buyer has usually paid
        // already, so keep the order and flag it for the team to sort out.
        if (shortage && !isPaid) throw new TicketError('SOLD_OUT', shortage, 409);
        if (couponIssue && !isPaid && couponCandidate) throw new TicketError('COUPON_INVALID', couponIssue);

        const used = new Set(orders.map(o => o.bookingRef));
        let bookingRef = makeBookingRef();
        while (used.has(bookingRef)) bookingRef = makeBookingRef();

        const now = new Date().toISOString();
        const order = {
            eventId: event.id,
            userId: decodedToken?.uid || null,
            customerName: name,
            customerEmail: email,
            customerPhone: phone,
            items: lines.map(l => ({ id: l.id, name: l.name, count: l.count, price: l.price })),
            subtotal,
            discount,
            totalAmount: total,
            paymentRef: isPaid ? paymentRef : 'FREE',
            bookingRef,
            appliedCoupon: coupon && !couponIssue
                ? { id: coupon.id, code: coupon.code, discountValue: Number(coupon.discountValue) || 0, discountType: coupon.discountType }
                : null,
            status: isPaid ? 'pending' : 'confirmed',
            source: 'checkout-api',
            createdAt: now,
            ...(shortage ? { overCapacity: true, overCapacityNote: shortage } : {}),
            ...(couponIssue && couponCandidate ? { couponRejected: true, couponRejectedNote: couponIssue, requestedCoupon: normalizeCouponCode(body.couponCode) } : {}),
        };

        tx.set(orderRef, order);
        tx.set(lockRef, { lastOrderAt: now, eventId: event.id }, { merge: true });
        if (coupon && !couponIssue) tx.update(couponSnap.ref, { usedCount: FieldValue.increment(1) });

        return {
            success: true,
            orderId: orderRef.id,
            bookingRef,
            status: order.status,
            totalAmount: total,
            overCapacity: Boolean(shortage),
            couponRejected: Boolean(couponIssue && couponCandidate),
        };
    });

    // Free tickets get their pass straight away; paid orders get "order received"
    // until the team verifies the payment. Awaited, but never fails the order.
    try {
        const sent = await sendOrderEmail(result.orderId, { event });
        result.emailed = Boolean(sent?.delivery?.email?.status === 'sent' || sent?.duplicate);
    } catch (err) {
        console.warn('[API/TICKETS] Order email not sent:', err.message);
        result.emailed = false;
    }
    return result;
};

const ACTIONS = {
    'ticket-availability': availabilityAction,
    'ticket-coupon': couponAction,
    'ticket-check': checkAction,
    'ticket-order': orderAction,
};

export const isTicketAction = (action) => Object.prototype.hasOwnProperty.call(ACTIONS, action);

export const handleTicketAction = async (action, req, res, db, decodedToken) => {
    const body = { ...(req.query || {}), ...(req.body && typeof req.body === 'object' ? req.body : {}) };
    try {
        const result = await ACTIONS[action](db, body, decodedToken);
        return res.status(200).json(result);
    } catch (err) {
        if (err instanceof TicketError) {
            return res.status(err.status).json({ success: false, code: err.code, error: err.message });
        }
        console.error(`[API/TICKETS] ${action} failed:`, err);
        return res.status(500).json({ success: false, code: 'SERVER', error: 'Ticketing is temporarily unavailable.' });
    }
};
