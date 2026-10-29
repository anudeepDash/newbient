/**
 * Ticketing rules shared by the admin, the checkout modal and the ticket API
 * (api/_lib/tickets.js). Pure functions only — no Firebase, no DOM — so the
 * browser and the server always agree on prices, capacity and coupons.
 */

// Orders that hold a seat. Pending orders are awaiting payment verification,
// so they count against capacity until they are rejected.
export const SEAT_HOLDING_STATUSES = ['pending', 'approved', 'dispatched', 'confirmed', 'attended'];
// Orders that count as sold (payment verified, or free).
export const SOLD_STATUSES = ['approved', 'dispatched', 'confirmed', 'attended'];
// A card/UPI gateway order that hasn't been paid yet holds its seats only
// until holdUntil, so abandoned payments release them on their own.
export const AWAITING_PAYMENT = 'awaiting_payment';
export const GATEWAY_HOLD_MINUTES = 15;

/** Does this order hold seats right now? */
export const orderHoldsSeats = (order, now = new Date()) => {
    if (order?.status === AWAITING_PAYMENT) {
        const until = new Date(order.holdUntil || 0);
        return !isNaN(until.getTime()) && until > now;
    }
    return SEAT_HOLDING_STATUSES.includes(order?.status);
};

export const BASE_TIER_ID = 'base';
export const MAX_TICKETS_PER_TIER = 10;
// Older orders may still read this name; checkout limits now come from tierMaxPerOrder.

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

/** Order items as [{ id, name, count, price }], whatever shape the order was saved in. */
export const orderItems = (order) => {
    const raw = order?.items;
    if (Array.isArray(raw)) {
        return raw.map(it => ({ id: it.id ?? it.name, name: it.name || 'Ticket', count: Number(it.count) || 0, price: Number(it.price) || 0 }));
    }
    if (raw && typeof raw === 'object') {
        return Object.entries(raw).map(([name, count]) => ({ id: name, name, count: Number(count) || 0, price: 0 }));
    }
    return [];
};

/** Number of people an order admits. Orders saved without items still admit one. */
export const orderTicketCount = (order) => {
    const n = orderItems(order).reduce((a, it) => a + it.count, 0);
    return n > 0 ? n : 1;
};

/** The scanner sets isScanned, the desk sets attended, older code set status 'attended'. */
export const isOrderCheckedIn = (order) => Boolean(order?.attended || order?.isScanned || order?.status === 'attended');

/** True when a guestlist entry is allowed in (approved, or never needed review). */
export const isGuestAdmissible = (entry) => entry?.status === 'approved' || (!entry?.status && !entry?.hasTask) || entry?.status === 'confirmed';

const numOrNull = (v) => (v === null || v === undefined || v === '' || isNaN(Number(v)) ? null : Number(v));

/**
 * Tiers an event sells. Events without categories sell one implicit tier.
 * Every field past id/name/price/capacity is optional and only set when the
 * admin filled it in (older events have none of them).
 */
const storedTiers = (event) => {
    const cats = Array.isArray(event?.ticketCategories) ? event.ticketCategories : [];
    if (cats.length) {
        return cats.map(c => {
            const price = Number(c.price) || 0;
            const original = numOrNull(c.originalPrice);
            return {
                id: c.id,
                name: c.name || 'Ticket',
                price,
                capacity: numOrNull(c.capacity),
                color: c.color,
                description: c.description || '',
                // A struck-through "was" price only makes sense above the price.
                originalPrice: original !== null && original > price ? original : null,
                maxPerOrder: numOrNull(c.maxPerOrder),
                minPerOrder: numOrNull(c.minPerOrder),
                admits: Math.max(1, Math.floor(Number(c.admits) || 1)),
                salesStart: c.salesStart || null,
                salesEnd: c.salesEnd || null,
                hidden: c.hidden === true,
                badge: c.badge || '',
                mapping: c.mapping,
                coords: c.coords,
            };
        });
    }
    return [{
        id: BASE_TIER_ID, name: 'Standard', price: Number(event?.basePrice) || 0, capacity: null, color: undefined,
        description: '', originalPrice: null, maxPerOrder: null, minPerOrder: null, admits: 1,
        salesStart: null, salesEnd: null, hidden: false, badge: '',
    }];
};

/**
 * Free bookings (payments.free): the admin takes bookings without payment, so
 * every ticket is priced at 0 for buyers. The stored prices stay on the event,
 * so turning it off brings them back.
 */
export const eventIsFree = (event) => event?.payments?.free === true;

export const eventTiers = (event) => {
    const tiers = storedTiers(event);
    return eventIsFree(event) ? tiers.map(t => ({ ...t, price: 0, originalPrice: null })) : tiers;
};

const capacityOrNull = numOrNull;

/**
 * Capacity per tier and overall, from the event and every order for it.
 * `remaining` is null when there is no limit.
 */
export const computeAvailability = (event, orders, now = new Date()) => {
    const tiers = eventTiers(event);
    const byTier = {};
    tiers.forEach(t => { byTier[t.id] = { ...t, held: 0, sold: 0, checkedIn: 0, revenue: 0 }; });

    let totalHeld = 0;
    let totalSold = 0;
    (orders || []).forEach(order => {
        if (!orderHoldsSeats(order, now)) return;
        const sold = SOLD_STATUSES.includes(order.status);
        const items = orderItems(order);
        const lines = items.length ? items : [{ id: BASE_TIER_ID, count: 1, price: 0 }];
        lines.forEach(it => {
            // Orders from before categories existed fall under the first tier.
            const tier = byTier[it.id] || byTier[tiers.find(t => t.name === it.name)?.id] || byTier[tiers[0].id];
            tier.held += it.count;
            if (sold) tier.sold += it.count;
            if (sold && isOrderCheckedIn(order)) tier.checkedIn += it.count;
        });
        const count = lines.reduce((a, it) => a + it.count, 0);
        totalHeld += count;
        if (sold) totalSold += count;
        if (sold) {
            // Spread the order total across its lines so coupons are reflected per tier.
            const gross = lines.reduce((a, it) => a + it.count * (Number(it.price) || 0), 0);
            const paid = Number(order.totalAmount) || 0;
            lines.forEach(it => {
                const tier = byTier[it.id] || byTier[tiers[0].id];
                const share = gross > 0 ? (it.count * (Number(it.price) || 0)) / gross : 1 / lines.length;
                tier.revenue += paid * share;
            });
        }
    });

    Object.values(byTier).forEach(t => {
        t.remaining = t.capacity === null ? null : Math.max(0, t.capacity - t.held);
        t.revenue = round2(t.revenue);
    });

    const totalCapacity = capacityOrNull(event?.ticketCapacity);
    return {
        tiers: byTier,
        total: {
            capacity: totalCapacity,
            held: totalHeld,
            sold: totalSold,
            remaining: totalCapacity === null ? null : Math.max(0, totalCapacity - totalHeld),
        },
    };
};

/** How many more of a tier can be bought now (null = unlimited, capped per order). */
export const purchasableCount = (availability, tierId, alreadyInCart = 0) => {
    const tier = availability?.tiers?.[tierId];
    const limits = [MAX_TICKETS_PER_TIER - alreadyInCart];
    if (tier && tier.remaining !== null && tier.remaining !== undefined) limits.push(tier.remaining - alreadyInCart);
    const total = availability?.total?.remaining;
    if (total !== null && total !== undefined) limits.push(total);
    return Math.max(0, Math.min(...limits));
};

/**
 * Price a cart ({ tierId: count }) against the event's own prices.
 * Unknown tiers and bad counts are dropped, never trusted.
 */
export const priceCart = (event, cart) => {
    const tiers = eventTiers(event);
    const lines = Object.entries(cart || {})
        .map(([id, count]) => {
            const tier = tiers.find(t => t.id === id);
            const n = Math.floor(Number(count));
            if (!tier || !(n > 0)) return null;
            const line = { id: tier.id, name: tier.name, count: Math.min(n, MAX_PER_ORDER_CAP), price: tier.price };
            if (tier.admits > 1) line.admits = tier.admits;
            return line;
        })
        .filter(Boolean);
    const subtotal = round2(lines.reduce((a, l) => a + l.count * l.price, 0));
    return { lines, subtotal };
};

// ── sale windows and per-order limits ───────────────────────────────────────

/** The most tickets one order can ever hold, whatever the admin sets. */
export const MAX_PER_ORDER_CAP = 20;
export const DEFAULT_MAX_PER_ORDER = MAX_TICKETS_PER_TIER;

/**
 * A moment from what the admin typed. "2026-11-01T18:00" and "2026-11-01"
 * are India time; a date alone means the start (or, with endOfDay, the end)
 * of that day. Strings with their own offset are kept as they are.
 */
export const istMoment = (value, { endOfDay = false } = {}) => {
    if (!value) return null;
    if (typeof value?.toDate === 'function') return value.toDate();
    const raw = String(value).trim();
    let d;
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) d = new Date(`${raw}T${endOfDay ? '23:59:59' : '00:00:00'}+05:30`);
    else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(raw)) d = new Date(`${raw}${raw.length === 16 ? ':00' : ''}+05:30`);
    else d = new Date(raw);
    return isNaN(d.getTime()) ? null : d;
};

/** When the show starts, from date (and time, if set). */
export const eventStartMoment = (event) => {
    const day = String(event?.date || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return istMoment(event?.date);
    const time = /^\d{2}:\d{2}$/.test(String(event?.time || '')) ? event.time : String(event?.date || '').slice(11, 16);
    return istMoment(/^\d{2}:\d{2}$/.test(time) ? `${day}T${time}` : day);
};

/**
 * Whether the event is selling right now:
 *   open      selling
 *   upcoming  sales open later (opensAt)
 *   paused    the team paused sales
 *   closed    sales ended (salesEnd passed, or the show day is over)
 */
export const eventSaleState = (event, now = new Date()) => {
    if (!event?.isTicketed) return { state: 'closed' };
    if (event.salesPaused === true) return { state: 'paused' };
    const opens = istMoment(event.salesStart);
    if (opens && opens > now) return { state: 'upcoming', opensAt: opens };
    const closes = istMoment(event.salesEnd, { endOfDay: true })
        || istMoment(String(event.date || '').slice(0, 10), { endOfDay: true });
    if (closes && closes < now) return { state: 'closed', closedAt: closes };
    return { state: 'open', closesAt: istMoment(event.salesEnd, { endOfDay: true }) };
};

/**
 * One tier's state: on_sale, upcoming (opensAt), closed, sold_out or hidden.
 * `left` is how many are left (null = no limit, or not known yet).
 */
export const tierSaleState = (tier, { left = null, now = new Date() } = {}) => {
    if (!tier || tier.hidden) return { state: 'hidden' };
    const opens = istMoment(tier.salesStart);
    if (opens && opens > now) return { state: 'upcoming', opensAt: opens };
    const closes = istMoment(tier.salesEnd, { endOfDay: true });
    if (closes && closes < now) return { state: 'closed', closedAt: closes };
    if (left === 0) return { state: 'sold_out' };
    return { state: 'on_sale' };
};

/** Tickets one order may hold overall (event setting, default 10, never above the cap). */
export const eventMaxPerOrder = (event) => {
    const n = numOrNull(event?.maxPerOrder);
    return Math.max(1, Math.min(MAX_PER_ORDER_CAP, n === null ? DEFAULT_MAX_PER_ORDER : Math.floor(n)));
};

/** Tickets of one tier one order may hold. */
export const tierMaxPerOrder = (event, tier) => {
    const n = numOrNull(tier?.maxPerOrder);
    return Math.max(1, Math.min(eventMaxPerOrder(event), n === null ? MAX_PER_ORDER_CAP : Math.floor(n)));
};

/** Smallest count of a tier you can buy (a "group of 4" pass), at least 1. */
export const tierMinPerOrder = (tier) => Math.max(1, Math.floor(numOrNull(tier?.minPerOrder) || 1));

/**
 * Why this cart can't be bought right now, or null. Used by the checkout
 * (to explain) and the ticket API (to refuse). Seats left are checked
 * separately (shortageMessage on the server, availability in the browser).
 */
export const cartProblem = (event, cart, now = new Date()) => {
    const sale = eventSaleState(event, now);
    if (sale.state === 'paused') return 'Ticket sales are paused for now.';
    if (sale.state === 'upcoming') return 'Tickets aren’t on sale yet.';
    if (sale.state === 'closed') return 'Ticket sales have ended for this event.';
    const tiers = eventTiers(event);
    let total = 0;
    for (const [id, raw] of Object.entries(cart || {})) {
        const n = Math.floor(Number(raw)) || 0;
        if (n <= 0) continue;
        const tier = tiers.find(t => t.id === id);
        if (!tier) return 'One of those ticket types isn’t available any more.';
        const st = tierSaleState(tier, { now }).state;
        if (st === 'hidden') return `${tier.name} isn’t available any more.`;
        if (st === 'upcoming') return `${tier.name} isn’t on sale yet.`;
        if (st === 'closed') return `${tier.name} is no longer on sale.`;
        const min = tierMinPerOrder(tier);
        if (n < min) return `${tier.name} is sold in sets of at least ${min}.`;
        const max = tierMaxPerOrder(event, tier);
        if (n > max) return `You can book up to ${max} ${tier.name} ${max === 1 ? 'ticket' : 'tickets'} at a time.`;
        total += n;
    }
    if (!total) return 'Choose at least one ticket.';
    const max = eventMaxPerOrder(event);
    if (total > max) return `You can book up to ${max} tickets at a time.`;
    return null;
};

/** People a set of order lines lets in (a couple pass counts as 2). */
export const linesAdmit = (lines) => (lines || []).reduce((a, l) => a + (Number(l.count) || 0) * Math.max(1, Number(l.admits) || 1), 0);

// ── UPI ──────────────────────────────────────────────────────────────────────

/** A UPI UTR / RRN is 12 digits. People paste it with spaces or a label. */
export const normalizeUtr = (value) => {
    const s = String(value || '').toUpperCase().replace(/[^0-9A-Z]/g, '');
    const digits = s.match(/\d{12}/);
    return digits && s.replace(/\D/g, '').length === 12 ? digits[0] : s;
};
export const isValidUtr = (value) => /^\d{12}$/.test(normalizeUtr(value));

export const isValidUpiId = (value) => /^[\w.-]{2,256}@[a-zA-Z][\w.-]{1,63}$/.test(String(value || '').trim());

/**
 * The query part of a UPI payment link: who to pay (pa, pn), how much (am,
 * exact to the paisa), and a note (tn) carrying the booking reference so the
 * payment can be matched in the bank statement. tr (the same reference) and
 * mc (merchant category) are only sent for business UPI IDs: Google Pay and
 * PhonePe refuse links that carry them for a personal UPI ID.
 */
export const upiQuery = ({ upiId, payeeName, amount, ref, note, merchant = null }) => {
    const params = [
        ['pa', String(upiId || '').trim()],
        ['pn', String(payeeName || 'Newbi').trim().slice(0, 50)],
        ['am', (Math.round((Number(amount) || 0) * 100) / 100).toFixed(2)],
        ['cu', 'INR'],
        ['tn', String(note || (ref ? `Newbi ${ref}` : 'Newbi tickets')).replace(/[^\w\s.-]/g, ' ').trim().slice(0, 50)],
    ];
    if (merchant && ref) params.push(['tr', String(ref).replace(/[^\w-]/g, '').slice(0, 35)]);
    if (merchant?.code && /^\d{4}$/.test(String(merchant.code))) params.push(['mc', String(merchant.code)]);
    return params.filter(([, v]) => v).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
};

/**
 * Pay buttons for UPI apps. On Android, upi://pay opens the phone's own
 * "pay with" list; the app links open one app directly (they work on
 * iPhone too, where upi:// isn't handled).
 */
export const UPI_APPS = [
    { id: 'gpay', name: 'Google Pay', scheme: { ios: 'gpay://upi/pay', android: 'tez://upi/pay' } },
    { id: 'phonepe', name: 'PhonePe', scheme: { ios: 'phonepe://pay', android: 'phonepe://pay' } },
    { id: 'paytm', name: 'Paytm', scheme: { ios: 'paytmmp://upi/pay', android: 'paytmmp://upi/pay' } },
    { id: 'bhim', name: 'BHIM', scheme: { ios: 'bhim://upi/pay', android: 'upi://pay' } },
    { id: 'cred', name: 'CRED', scheme: { ios: 'credpay://upi/pay', android: 'credpay://upi/pay' } },
];

export const upiLink = (opts, { appId = null, platform = 'android' } = {}) => {
    const app = appId ? UPI_APPS.find(a => a.id === appId) : null;
    const base = app ? app.scheme[platform === 'ios' ? 'ios' : 'android'] : 'upi://pay';
    return `${base}?${upiQuery(opts)}`;
};

/** Discount for a coupon on a subtotal; the total never goes below zero. */
export const applyCoupon = (subtotal, coupon) => {
    if (!coupon || !(subtotal > 0)) return { discount: 0, total: round2(subtotal) };
    const value = Number(coupon.discountValue) || 0;
    const raw = coupon.discountType === 'percentage' ? (subtotal * Math.min(100, value)) / 100 : value;
    const discount = round2(Math.min(subtotal, Math.max(0, raw)));
    return { discount, total: round2(subtotal - discount) };
};

/** Coupon codes are stored upper-case with no spaces. */
export const normalizeCouponCode = (code) => String(code || '').trim().toUpperCase().replace(/\s+/g, '');

/** Expiry dates are calendar days; a coupon works until the end of that day in India. */
export const couponExpiryMoment = (expiryDate) => {
    if (!expiryDate) return null;
    const day = String(expiryDate).slice(0, 10);
    const d = new Date(`${day}T23:59:59+05:30`);
    return isNaN(d.getTime()) ? null : d;
};

/** Why a coupon can't be used right now, or null if it can. */
export const couponProblem = (coupon, eventId, now = new Date()) => {
    if (!coupon) return "That coupon code doesn't exist.";
    if (coupon.isActive === false) return 'This coupon is no longer active.';
    if (coupon.eventId && eventId && coupon.eventId !== eventId) return "This coupon isn't valid for this event.";
    const expiry = couponExpiryMoment(coupon.expiryDate);
    if (expiry && expiry < now) return 'This coupon has expired.';
    if (coupon.usageLimit && (Number(coupon.usedCount) || 0) >= Number(coupon.usageLimit)) return 'This coupon has been fully used.';
    return null;
};

/** Short booking reference without look-alike characters (no 0/O, 1/I). */
export const makeBookingRef = (random = Math.random) => {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let out = '';
    for (let i = 0; i < 6; i++) out += alphabet[Math.floor(random() * alphabet.length)];
    return `NB-${out}`;
};

/** CSV text with proper quoting, prefixed with a BOM so Excel reads UTF-8 (₹, names). */
export const toCsv = (headers, rows) => {
    const cell = (v) => {
        const s = v === null || v === undefined ? '' : String(v);
        // Neutralise spreadsheet formulas in user-entered text, but leave phone
        // numbers and plain numbers ("+91 98…", "-50") alone.
        const isFormula = /^[=@]/.test(s) || /^[+-](?![\d\s().-]+$)/.test(s);
        const safe = isFormula ? `'${s}` : s;
        return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
    };
    return '﻿' + [headers, ...rows].map(r => r.map(cell).join(',')).join('\r\n');
};
