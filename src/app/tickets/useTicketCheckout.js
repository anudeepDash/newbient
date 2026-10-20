import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { addDoc, collection, doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { useStore as useLegacyStore } from '../../lib/store.js';
import { callTicketApi } from '../../lib/ticketApi';
import {
    applyCoupon, BASE_TIER_ID, eventTiers, makeBookingRef, MAX_TICKETS_PER_TIER,
    normalizeCouponCode, priceCart, purchasableCount,
} from '../../lib/ticketing';

/*
 * The paid ticket checkout for one event, without any UI: the cart, seats
 * left, the coupon, the server check before paying, and the order.
 *
 * Same rules and calls as the old EventTicketingModal:
 *   ticket-availability  seats left per tier and overall
 *   ticket-coupon        validate a code (falls back to the browser check)
 *   ticket-check         seats and coupon again, and the amount to pay
 *   ticket-order         saves the order in one transaction, emails the buyer
 * When the ticket API can't be reached, the order is saved from the browser
 * as before (source 'checkout-fallback'), so sales never stop.
 *
 * The draft (cart, coupon, step, UTR) is kept in sessionStorage per event, so
 * a phone that reloads the page after switching to the UPI app comes back to
 * the payment screen.
 */

const DRAFT_KEY = (id) => `newbi:tickets:${id}`;
const readDraft = (id) => {
    try { return JSON.parse(window.sessionStorage.getItem(DRAFT_KEY(id)) || 'null'); } catch { return null; }
};
const writeDraft = (id, draft) => {
    try {
        if (draft) window.sessionStorage.setItem(DRAFT_KEY(id), JSON.stringify(draft));
        else window.sessionStorage.removeItem(DRAFT_KEY(id));
    } catch { /* private mode: no draft */ }
};

/* The UPI details: the event's own, else the site's (site_settings/payment_info). */
let paymentInfo = null;
const loadPaymentInfo = () => {
    if (!paymentInfo) {
        const legacy = useLegacyStore.getState().paymentDetails;
        paymentInfo = legacy?.upiId || legacy?.qrCodeUrl || !db
            ? Promise.resolve(legacy || {})
            : getDoc(doc(db, 'site_settings', 'payment_info'))
                .then(s => (s.exists() ? s.data() : {}))
                .catch(() => ({}));
    }
    return paymentInfo;
};

export const upiLink = (upiId, amount) => `upi://pay?pa=${encodeURIComponent(upiId)}&pn=NewBi&am=${amount}`;

export function useTicketCheckout(event, { open }) {
    const eventId = event?.id;
    const hasCategories = Array.isArray(event?.ticketCategories) && event.ticketCategories.length > 0;
    const hasLayout = Boolean(event?.venueLayout) && hasCategories;
    const tiers = useMemo(() => eventTiers(event), [event]);

    const [step, setStep] = useState('pick'); // pick | pay | done
    const [cart, setCart] = useState({});
    const [baseCount, setBaseCount] = useState(1);
    const [availability, setAvailability] = useState(null);
    const [coupon, setCoupon] = useState(null);
    const [couponInput, setCouponInput] = useState('');
    const [couponBusy, setCouponBusy] = useState(false);
    const [couponError, setCouponError] = useState('');
    const [amountDue, setAmountDue] = useState(0);
    const [utr, setUtr] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState(null);
    const [payment, setPayment] = useState({});

    // A fresh checkout each time the sheet opens on an event, picking up a saved draft.
    const initFor = useRef(null);
    useEffect(() => {
        if (!open) { initFor.current = null; return; }
        if (!eventId || initFor.current === eventId) return;
        initFor.current = eventId;
        const draft = readDraft(eventId);
        setCart(draft?.cart || {});
        setBaseCount(draft?.baseCount || 1);
        setCoupon(draft?.coupon || null);
        setCouponInput(draft?.coupon?.code || '');
        setCouponError('');
        setAmountDue(draft?.amountDue || 0);
        setUtr(draft?.utr || '');
        setStep(draft?.step === 'pay' && draft?.amountDue > 0 ? 'pay' : 'pick');
        setResult(null);
        setError('');
        setBusy(false);
    }, [open, eventId]);

    useEffect(() => {
        if (!open || !eventId || initFor.current !== eventId) return;
        if (step === 'done') { writeDraft(eventId, null); return; }
        writeDraft(eventId, { cart, baseCount, coupon, step, amountDue, utr });
    }, [open, eventId, cart, baseCount, coupon, step, amountDue, utr]);

    const refreshAvailability = useCallback(async () => {
        if (!eventId || !event?.isTicketed) return null;
        const res = await callTicketApi('ticket-availability', { eventId });
        if (res.ok) { setAvailability(res.data.availability); return res.data.availability; }
        return null;
    }, [eventId, event?.isTicketed]);

    useEffect(() => {
        if (!open || !eventId) return;
        setAvailability(null);
        refreshAvailability();
        loadPaymentInfo().then(setPayment);
    }, [open, eventId, refreshAvailability]);

    // ── the cart ─────────────────────────────────────────────────────────────

    /* Seats left in a tier (null = no limit, or not known yet). */
    const tierLeft = useCallback((tierId) => {
        const values = [availability?.tiers?.[tierId]?.remaining, availability?.total?.remaining]
            .filter(v => v !== null && v !== undefined);
        return values.length ? Math.min(...values) : null;
    }, [availability]);

    const baseMax = availability
        ? Math.max(1, Math.min(MAX_TICKETS_PER_TIER, purchasableCount(availability, BASE_TIER_ID, 0)))
        : MAX_TICKETS_PER_TIER;
    const soldOut = Boolean(availability?.soldOut);

    const pricingCart = hasCategories ? cart : { [BASE_TIER_ID]: baseCount };
    const { lines, subtotal } = event ? priceCart(event, pricingCart) : { lines: [], subtotal: 0 };
    const { discount, total } = applyCoupon(subtotal, coupon);
    const count = lines.reduce((a, l) => a + l.count, 0);

    /* Can one more of this tier go in the cart? */
    const canAdd = (tierId) => {
        if (!availability) return (cart[tierId] || 0) < MAX_TICKETS_PER_TIER;
        // With a venue map a booking is for one ticket type, so other tiers don't count.
        const elsewhere = hasLayout ? 0 : Object.entries(cart).reduce((a, [id, n]) => a + (id === tierId ? 0 : n), 0);
        const here = cart[tierId] || 0;
        const total = availability.total?.remaining;
        const allowed = Math.min(
            purchasableCount(availability, tierId, here),
            total === null || total === undefined ? Infinity : total - elsewhere - here
        );
        return allowed > 0;
    };

    const changeTier = (tierId, delta) => {
        setError('');
        if (delta > 0 && !canAdd(tierId)) {
            setError(tierLeft(tierId) === 0 ? 'That ticket type is sold out.' : 'You can’t add more of this ticket type.');
            return;
        }
        setCart(prev => {
            // On a venue map, picking a new zone replaces the previous one.
            const next = hasLayout && delta > 0 && !prev[tierId] ? {} : { ...prev };
            const n = Math.max(0, (next[tierId] || 0) + delta);
            if (n === 0) delete next[tierId];
            else next[tierId] = n;
            return next;
        });
    };

    const changeBase = (delta) => {
        setError('');
        setBaseCount(n => Math.max(1, Math.min(baseMax, n + delta)));
    };

    // Keep the plain count inside what's left once availability arrives.
    useEffect(() => {
        if (!hasCategories && baseCount > baseMax) setBaseCount(baseMax);
    }, [hasCategories, baseCount, baseMax]);

    // ── coupon ───────────────────────────────────────────────────────────────

    const applyCode = async () => {
        const code = normalizeCouponCode(couponInput);
        if (!code) return;
        setCouponBusy(true);
        setCouponError('');
        try {
            const res = await callTicketApi('ticket-coupon', { eventId, code });
            let found;
            if (res.ok) found = res.data.coupon;
            else if (res.unavailable) found = await useLegacyStore.getState().validateCoupon(code, eventId);
            else throw new Error(res.error);
            setCoupon(found);
            setCouponInput(found.code || code);
        } catch (err) {
            setCoupon(null);
            setCouponError(err?.message || 'Couldn’t apply that coupon. Check the code and try again.');
        } finally {
            setCouponBusy(false);
        }
    };

    const removeCoupon = () => {
        setCoupon(null);
        setCouponInput('');
        setCouponError('');
    };

    // ── check, pay, order ────────────────────────────────────────────────────

    const itemsForApi = () => (hasCategories
        ? Object.entries(cart).map(([id, n]) => ({ id, count: n }))
        : [{ id: BASE_TIER_ID, count: baseCount }]);

    /* A refusal from the server: back to picking, with the reason. */
    const refused = (res) => {
        setError(res.error || 'Those tickets aren’t available any more.');
        if (res.code === 'COUPON_INVALID') { setCoupon(null); setCouponError(res.error || ''); }
        if (res.code === 'SOLD_OUT') refreshAvailability();
        setStep('pick');
    };

    /* Re-checks seats and the coupon on the server, then shows the payment screen. */
    const goToPayment = async () => {
        setBusy(true);
        setError('');
        try {
            const res = await callTicketApi('ticket-check', { eventId, items: itemsForApi(), couponCode: coupon?.code || null });
            if (!res.ok && !res.unavailable) { refused(res); return false; }
            if (res.ok) setAvailability(res.data.availability);
            setAmountDue(res.ok ? res.data.total : total);
            setStep('pay');
            return true;
        } finally {
            setBusy(false);
        }
    };

    /* Places the order. customer: { name, email, phone } from the profile. */
    const placeOrder = async (customer) => {
        const paid = total > 0;
        const ref = utr.trim();
        if (paid && !ref) { setError('Enter the UTR (transaction reference) from your UPI app.'); return false; }
        setBusy(true);
        setError('');
        try {
            const res = await callTicketApi('ticket-order', {
                eventId,
                items: itemsForApi(),
                couponCode: coupon?.code || null,
                paymentRef: paid ? ref : '',
                customer,
            });

            let done;
            if (res.ok) {
                done = { ...res.data };
            } else if (!res.unavailable) {
                if (res.code === 'SOLD_OUT' || res.code === 'COUPON_INVALID') refused(res);
                else setError(res.error || 'We couldn’t complete your booking.');
                return false;
            } else {
                done = await fallbackOrder({ event, customer, lines, coupon, paid, ref, amount: amountDue || total });
                if (done.error) { setError(done.error); return false; }
            }

            setResult({
                bookingRef: done.bookingRef,
                status: done.status || (paid ? 'pending' : 'confirmed'),
                total: done.totalAmount ?? (paid ? amountDue || total : 0),
                count,
                tier: lines.map(l => l.name).join(', '),
                email: customer.email,
                emailed: done.emailed,
                flagged: Boolean(done.overCapacity || done.couponRejected),
            });
            setStep('done');
            return true;
        } catch (err) {
            console.warn('[app/tickets] order failed:', err);
            setError('We couldn’t complete your booking. If you’ve already paid, don’t worry: contact us with your UTR.');
            return false;
        } finally {
            setBusy(false);
        }
    };

    const upiId = event?.upiId || event?.paymentDetails?.upiId || payment?.upiId || 'newbi@upi';
    const qrCodeUrl = event?.qrCodeUrl || payment?.qrCodeUrl || null;

    return {
        step, setStep,
        tiers, hasCategories, hasLayout,
        cart, baseCount, baseMax, changeTier, changeBase, canAdd, tierLeft,
        availability, soldOut,
        lines, subtotal, discount, total, count,
        coupon, couponInput, setCouponInput, couponBusy, couponError, applyCode, removeCoupon,
        amountDue, utr, setUtr,
        upiId, qrCodeUrl, gatewayUrl: event?.gatewayUrl || null,
        busy, error, setError,
        goToPayment, placeOrder, result,
    };
}

/* The original in-browser order, used only when the ticket API can't be reached. */
async function fallbackOrder({ event, customer, lines, coupon, paid, ref, amount }) {
    if (!db) return { error: 'We couldn’t reach the ticket service. Please try again.' };
    if (paid) {
        const { query, where, getDocs } = await import('firebase/firestore');
        const snap = await getDocs(query(collection(db, 'ticket_orders'), where('paymentRef', '==', ref)));
        if (!snap.empty) return { error: 'This payment reference has already been used. Check your UTR number.' };
    }
    const bookingRef = makeBookingRef();
    const uid = auth?.currentUser?.uid || null;
    await addDoc(collection(db, 'ticket_orders'), {
        eventId: event.id,
        userId: uid,
        customerName: customer.name,
        customerEmail: customer.email,
        customerPhone: customer.phone,
        items: lines.map(l => ({ id: l.id, name: l.name, count: l.count, price: l.price })),
        totalAmount: paid ? amount : 0,
        paymentRef: paid ? ref : 'FREE',
        bookingRef,
        appliedCoupon: coupon ? { id: coupon.id, code: coupon.code, discountValue: coupon.discountValue, discountType: coupon.discountType } : null,
        source: 'checkout-fallback',
        createdAt: new Date().toISOString(),
        status: paid ? 'pending' : 'confirmed',
    });
    if (coupon?.id) {
        try {
            const { increment, updateDoc } = await import('firebase/firestore');
            await updateDoc(doc(db, 'coupons', coupon.id), { usedCount: increment(1) });
        } catch (err) {
            console.warn('[app/tickets] coupon count not updated:', err);
        }
    }
    return { bookingRef, status: paid ? 'pending' : 'confirmed', totalAmount: paid ? amount : 0 };
}
