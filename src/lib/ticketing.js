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

export const BASE_TIER_ID = 'base';
export const MAX_TICKETS_PER_TIER = 10;

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

/** Tiers an event sells. Events without categories sell one implicit tier. */
export const eventTiers = (event) => {
    const cats = Array.isArray(event?.ticketCategories) ? event.ticketCategories : [];
    if (cats.length) {
        return cats.map(c => ({
            id: c.id,
            name: c.name || 'Ticket',
            price: Number(c.price) || 0,
            capacity: c.capacity === null || c.capacity === undefined || c.capacity === '' ? null : Number(c.capacity),
            color: c.color,
        }));
    }
    return [{ id: BASE_TIER_ID, name: 'Standard', price: Number(event?.basePrice) || 0, capacity: null, color: undefined }];
};

const capacityOrNull = (v) => (v === null || v === undefined || v === '' || isNaN(Number(v)) ? null : Number(v));

/**
 * Capacity per tier and overall, from the event and every order for it.
 * `remaining` is null when there is no limit.
 */
export const computeAvailability = (event, orders) => {
    const tiers = eventTiers(event);
    const byTier = {};
    tiers.forEach(t => { byTier[t.id] = { ...t, held: 0, sold: 0, checkedIn: 0, revenue: 0 }; });

    let totalHeld = 0;
    let totalSold = 0;
    (orders || []).forEach(order => {
        if (!SEAT_HOLDING_STATUSES.includes(order.status)) return;
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
            return { id: tier.id, name: tier.name, count: Math.min(n, MAX_TICKETS_PER_TIER), price: tier.price };
        })
        .filter(Boolean);
    const subtotal = round2(lines.reduce((a, l) => a + l.count * l.price, 0));
    return { lines, subtotal };
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
