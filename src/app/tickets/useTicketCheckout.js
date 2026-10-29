import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { callTicketApi } from '../../lib/ticketApi';
import { loadRazorpay } from '../../lib/razorpayCheckout';
import {
    applyCoupon, cartProblem, eventMaxPerOrder, eventSaleState, eventTiers, linesAdmit,
    normalizeCouponCode, priceCart, tierMaxPerOrder, tierMinPerOrder, tierSaleState,
} from '../../lib/ticketing';

/*
 * The ticket checkout for one event, without any UI.
 *
 *   tickets  pick ticket types (list or venue map), within each type's
 *            limits, the order limit, seats left and sale windows
 *   review   the order, a coupon, the buyer's details, the terms
 *   pay      Razorpay is the only way to pay: its checkout takes UPI, cards
 *            and netbanking, and the order confirms itself. Free orders skip
 *            this step and are confirmed at once.
 *   done     the booking reference; the pass lives at /p/{ref}
 *
 * Server calls (api/_lib/tickets.js): ticket-availability, ticket-coupon,
 * ticket-check (seats, coupon and the amount, plus a booking reference),
 * ticket-order (free orders), ticket-gateway-start / -confirm.
 *
 * The draft (cart, coupon, step, reference) is kept in sessionStorage per
 * event, so a reload comes back to the payment screen.
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

const UNREACHABLE = 'We couldn’t reach the ticket service. Check your connection and try again.';

export function useTicketCheckout(event, { open }) {
    const eventId = event?.id;
    const tiers = useMemo(() => eventTiers(event), [event]);
    const visibleTiers = useMemo(() => tiers.filter(t => !t.hidden), [tiers]);
    const hasCategories = Array.isArray(event?.ticketCategories) && event.ticketCategories.length > 0;

    const [step, setStep] = useState('tickets');
    const [cart, setCart] = useState({});
    const [availability, setAvailability] = useState(null);
    const [coupon, setCoupon] = useState(null);
    const [couponInput, setCouponInput] = useState('');
    const [couponBusy, setCouponBusy] = useState(false);
    const [couponError, setCouponError] = useState('');
    const [amountDue, setAmountDue] = useState(0);
    const [bookingRef, setBookingRef] = useState('');
    const [agreed, setAgreed] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState(null);
    const [now, setNow] = useState(() => new Date());

    // A fresh checkout each time the sheet opens on an event, picking up a saved draft.
    const initFor = useRef(null);
    useEffect(() => {
        if (!open) { initFor.current = null; return; }
        if (!eventId || initFor.current === eventId) return;
        initFor.current = eventId;
        const draft = readDraft(eventId);
        // Older drafts said 'pick'.
        const draftStep = draft?.step === 'pick' ? 'tickets' : draft?.step;
        setCart(draft?.cart || {});
        setCoupon(draft?.coupon || null);
        setCouponInput(draft?.coupon?.code || '');
        setCouponError('');
        setAmountDue(draft?.amountDue || 0);
        setBookingRef(draft?.bookingRef || '');
        setAgreed(Boolean(draft?.agreed));
        setStep(draftStep === 'pay' && draft?.amountDue > 0 ? 'pay' : draftStep === 'review' ? 'review' : 'tickets');
        setResult(null);
        setError('');
        setBusy(false);
    }, [open, eventId]);

    useEffect(() => {
        if (!open || !eventId || initFor.current !== eventId) return;
        if (step === 'done') { writeDraft(eventId, null); return; }
        writeDraft(eventId, { cart, coupon, step, amountDue, bookingRef, agreed });
    }, [open, eventId, cart, coupon, step, amountDue, bookingRef, agreed]);

    const refreshAvailability = useCallback(async () => {
        if (!eventId || !event?.isTicketed) return null;
        const res = await callTicketApi('ticket-availability', { eventId });
        if (res.ok) { setAvailability(res.data.availability); return res.data.availability; }
        return null;
    }, [eventId, event?.isTicketed]);

    useEffect(() => {
        if (!open || !eventId) return undefined;
        setAvailability(null);
        refreshAvailability();
        // Sale windows open and close while the page is open.
        const timer = setInterval(() => setNow(new Date()), 30000);
        return () => clearInterval(timer);
    }, [open, eventId, refreshAvailability]);

    // ── the cart ─────────────────────────────────────────────────────────────

    const sale = event ? eventSaleState(event, now) : { state: 'closed' };
    const soldOut = Boolean(availability?.soldOut);

    /* Seats left in a tier (null = no limit, or not known yet). */
    const tierLeft = useCallback((tierId) => {
        const values = [availability?.tiers?.[tierId]?.remaining, availability?.total?.remaining]
            .filter(v => v !== null && v !== undefined);
        return values.length ? Math.min(...values) : null;
    }, [availability]);

    /* One tier's state for the buyer: on_sale, upcoming, closed, sold_out, hidden. */
    const tierState = useCallback((tier) => tierSaleState(tier, { left: tierLeft(tier.id), now }), [tierLeft, now]);

    const { lines, subtotal } = event ? priceCart(event, cart) : { lines: [], subtotal: 0 };
    const { discount, total } = applyCoupon(subtotal, coupon);
    const count = lines.reduce((a, l) => a + l.count, 0);
    const people = linesAdmit(lines);
    const orderMax = event ? eventMaxPerOrder(event) : 10;

    /* How this sale takes money: the server's word once availability loads. Razorpay is the only way to pay. */
    const payments = {
        gateway: Boolean(availability?.payments?.gateway),
        free: Boolean(availability?.payments?.free),
    };

    /* The most of this tier the cart can hold right now. */
    const tierCap = (tier) => {
        const elsewhere = Object.entries(cart).reduce((a, [id, n]) => a + (id === tier.id ? 0 : n), 0);
        const left = tierLeft(tier.id);
        const totalLeft = availability?.total?.remaining;
        return Math.max(0, Math.min(
            tierMaxPerOrder(event, tier),
            orderMax - elsewhere,
            left === null ? Infinity : left,
            totalLeft === null || totalLeft === undefined ? Infinity : totalLeft - elsewhere,
        ));
    };

    const changeTier = (tierId, delta) => {
        setError('');
        const tier = tiers.find(t => t.id === tierId);
        if (!tier) return;
        const st = tierState(tier).state;
        const here = cart[tierId] || 0;
        if (delta > 0) {
            if (st !== 'on_sale') { setError(st === 'sold_out' ? `${tier.name} is sold out.` : `${tier.name} isn’t on sale right now.`); return; }
            const min = tierMinPerOrder(tier);
            const next = here === 0 ? min : here + delta;
            const cap = tierCap(tier);
            if (next > cap) {
                setError(cap < min && here === 0
                    ? (tierLeft(tier.id) === 0 ? `${tier.name} is sold out.` : `Not enough ${tier.name} tickets left for a set of ${min}.`)
                    : `You can book up to ${cap} ${tier.name} ${cap === 1 ? 'ticket' : 'tickets'} in this order.`);
                return;
            }
            setCart(prev => ({ ...prev, [tierId]: next }));
            return;
        }
        setCart(prev => {
            const next = { ...prev };
            const n = (next[tierId] || 0) + delta;
            if (n < tierMinPerOrder(tier)) delete next[tierId];
            else next[tierId] = n;
            return next;
        });
    };

    const canAdd = (tier) => tierState(tier).state === 'on_sale' && (cart[tier.id] || 0) < tierCap(tier)
        && ((cart[tier.id] || 0) > 0 || tierCap(tier) >= tierMinPerOrder(tier));

    // Drop anything from a restored cart that can't be bought any more.
    useEffect(() => {
        if (!availability || !event) return;
        setCart(prev => {
            const next = {};
            let changed = false;
            Object.entries(prev).forEach(([id, n]) => {
                const tier = tiers.find(t => t.id === id);
                if (tier && tierSaleState(tier, { left: tierLeft(id), now }).state === 'on_sale') next[id] = n;
                else changed = true;
            });
            return changed ? next : prev;
        });
    }, [availability]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── coupon ───────────────────────────────────────────────────────────────

    const applyCode = async () => {
        const code = normalizeCouponCode(couponInput);
        if (!code) return;
        setCouponBusy(true);
        setCouponError('');
        try {
            const res = await callTicketApi('ticket-coupon', { eventId, code });
            if (!res.ok) throw new Error(res.unavailable ? UNREACHABLE : res.error);
            setCoupon(res.data.coupon);
            setCouponInput(res.data.coupon.code || code);
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

    // ── steps ────────────────────────────────────────────────────────────────

    const itemsForApi = () => Object.entries(cart).map(([id, n]) => ({ id, count: n }));

    /* A refusal from the server: back to the step that can fix it, with the reason. */
    const refused = (res) => {
        setError(res.error || 'Those tickets aren’t available any more.');
        if (res.code === 'COUPON_INVALID') { setCoupon(null); setCouponError(res.error || ''); setStep('review'); return; }
        if (res.code === 'SOLD_OUT' || res.code === 'NOT_ON_SALE' || res.code === 'VALIDATION') { refreshAvailability(); setStep('tickets'); }
    };

    const goToReview = () => {
        setError('');
        if (!count) { setError('Pick at least one ticket.'); return false; }
        const problem = cartProblem(event, cart, now);
        if (problem) { setError(problem); return false; }
        setStep('review');
        return true;
    };

    /* Re-checks seats and the coupon on the server; free orders are placed, paid ones go to payment. */
    const goToPayment = async (customer) => {
        setBusy(true);
        setError('');
        try {
            const res = await callTicketApi('ticket-check', { eventId, items: itemsForApi(), couponCode: coupon?.code || null, bookingRef: bookingRef || null });
            if (!res.ok) {
                if (res.unavailable) setError(UNREACHABLE);
                else refused(res);
                return false;
            }
            setAvailability(res.data.availability);
            setBookingRef(res.data.bookingRef || '');
            setAmountDue(res.data.total);
            if (res.data.total <= 0) return placeOrder(customer, { ref: res.data.bookingRef });
            setStep('pay');
            return true;
        } finally {
            setBusy(false);
        }
    };

    const finish = (done, customer, paidAmount) => {
        setResult({
            bookingRef: done.bookingRef,
            status: done.status,
            total: done.totalAmount ?? paidAmount,
            count,
            people,
            lines,
            email: customer.email,
            emailed: done.emailed,
            flagged: Boolean(done.overCapacity || done.couponRejected),
        });
        setStep('done');
    };

    /* Places a free order (nothing to pay). customer: { name, email, phone } from the profile. */
    const placeOrder = async (customer, { ref = null } = {}) => {
        setBusy(true);
        setError('');
        try {
            const res = await callTicketApi('ticket-order', {
                eventId,
                items: itemsForApi(),
                couponCode: coupon?.code || null,
                bookingRef: ref || bookingRef || null,
                customer,
            }, { timeoutMs: 25000 });
            if (!res.ok) {
                if (res.unavailable) setError(UNREACHABLE);
                else if (['SOLD_OUT', 'COUPON_INVALID', 'NOT_ON_SALE'].includes(res.code)) refused(res);
                else setError(res.error || 'We couldn’t complete your booking.');
                return false;
            }
            finish(res.data, customer, 0);
            return true;
        } catch (err) {
            console.warn('[app/tickets] order failed:', err);
            setError('We couldn’t complete your booking. Please try again.');
            return false;
        } finally {
            setBusy(false);
        }
    };

    /* UPI, card or netbanking through Razorpay. */
    const payOnline = async (customer) => {
        setBusy(true);
        setError('');
        try {
            const [Razorpay, res] = await Promise.all([
                loadRazorpay().catch(() => null),
                callTicketApi('ticket-gateway-start', { eventId, items: itemsForApi(), couponCode: coupon?.code || null, bookingRef: bookingRef || null, customer }),
            ]);
            if (!res.ok) {
                if (res.unavailable) setError(UNREACHABLE);
                else if (['SOLD_OUT', 'COUPON_INVALID', 'NOT_ON_SALE'].includes(res.code)) refused(res);
                else setError(res.error || 'Online payment isn’t working right now. Please try again in a moment.');
                return false;
            }
            if (!Razorpay) { setError('The payment window didn’t load. Check your connection and try again.'); return false; }
            const start = res.data;
            setBookingRef(start.bookingRef);
            return await new Promise((resolve) => {
                const rzp = new Razorpay({
                    key: start.keyId,
                    order_id: start.gatewayOrderId,
                    amount: start.amount,
                    currency: start.currency,
                    name: start.name,
                    description: start.description,
                    prefill: { name: customer.name, email: customer.email, contact: customer.phone },
                    notes: { bookingRef: start.bookingRef },
                    theme: { color: '#16a34a' },
                    handler: async (resp) => {
                        setBusy(true);
                        const conf = await callTicketApi('ticket-gateway-confirm', { orderId: start.orderId, ...resp }, { timeoutMs: 25000 });
                        setBusy(false);
                        if (conf.ok) { finish({ ...conf.data, totalAmount: start.amount / 100 }, customer, start.amount / 100); resolve(true); }
                        else { setError(conf.error || `Payment received, but we couldn’t confirm it yet. Keep your booking reference ${start.bookingRef}; your ticket will follow.`); resolve(false); }
                    },
                    modal: { ondismiss: () => { setBusy(false); resolve(false); } },
                });
                rzp.on('payment.failed', (e) => setError(e?.error?.description || 'The payment didn’t go through. Please try again.'));
                setBusy(false);
                rzp.open();
            });
        } finally {
            setBusy(false);
        }
    };

    return {
        step, setStep,
        tiers, visibleTiers, hasCategories,
        cart, changeTier, canAdd, tierLeft, tierState, tierCap,
        availability, soldOut, sale, now,
        lines, subtotal, discount, total, count, people, orderMax,
        coupon, couponInput, setCouponInput, couponBusy, couponError, applyCode, removeCoupon,
        amountDue, bookingRef,
        agreed, setAgreed,
        payments,
        busy, error, setError,
        goToReview, goToPayment, placeOrder, payOnline, result,
    };
}
