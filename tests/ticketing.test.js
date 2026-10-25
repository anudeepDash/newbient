import { describe, it, expect } from 'vitest';
import {
    eventTiers, priceCart, cartProblem, eventSaleState, tierSaleState, eventMaxPerOrder, tierMaxPerOrder,
    normalizeUtr, isValidUtr, upiLink, upiQuery, linesAdmit, computeAvailability, orderHoldsSeats, istMoment,
} from '../src/lib/ticketing.js';
import { matchStatement, readStatement } from '../src/lib/paymentMatch.js';
import { eventVenueMap, mapFromTemplate, normalizeVenueMap, legacyVenueMap } from '../src/lib/venueMap.js';
import { gatewaySignatureOk } from '../api/_lib/tickets.js';
import crypto from 'node:crypto';

const NOW = new Date('2026-10-25T12:00:00+05:30');
const event = (extra = {}) => ({
    isTicketed: true,
    date: '2026-10-31',
    time: '20:00',
    ticketCategories: [
        { id: 'ga', name: 'GA', price: 500, capacity: 100 },
        { id: 'vip', name: 'VIP', price: 1500, capacity: 10, maxPerOrder: 2 },
        { id: 'couple', name: 'Couple', price: 900, admits: 2 },
    ],
    ...extra,
});

describe('ticket rules', () => {
    it('reads new tier fields and keeps old events working', () => {
        const tiers = eventTiers(event());
        expect(tiers[2].admits).toBe(2);
        expect(tiers[0].admits).toBe(1);
        expect(eventTiers({ basePrice: 300 })[0]).toMatchObject({ id: 'base', price: 300, admits: 1 });
        expect(eventTiers({ ticketCategories: [{ id: 'a', price: 500, originalPrice: 400 }] })[0].originalPrice).toBeNull();
    });

    it('prices couple passes per ticket and counts the people they admit', () => {
        const { lines, subtotal } = priceCart(event(), { couple: 2, ga: 1 });
        expect(subtotal).toBe(2300);
        expect(linesAdmit(lines)).toBe(5);
    });

    it('enforces per-order limits', () => {
        expect(cartProblem(event(), { vip: 3 }, NOW)).toMatch(/up to 2 VIP/);
        expect(cartProblem(event({ maxPerOrder: 4 }), { ga: 3, couple: 2 }, NOW)).toMatch(/up to 4 tickets/);
        expect(cartProblem(event(), { ga: 2 }, NOW)).toBeNull();
        expect(cartProblem(event(), {}, NOW)).toMatch(/at least one/);
        expect(eventMaxPerOrder({ maxPerOrder: 99 })).toBe(20);
        expect(tierMaxPerOrder(event({ maxPerOrder: 6 }), { maxPerOrder: 8 })).toBe(6);
    });

    it('follows sale windows in India time', () => {
        expect(eventSaleState(event({ salesStart: '2026-10-26T10:00' }), NOW).state).toBe('upcoming');
        expect(eventSaleState(event({ salesEnd: '2026-10-24' }), NOW).state).toBe('closed');
        expect(eventSaleState(event({ salesPaused: true }), NOW).state).toBe('paused');
        expect(eventSaleState(event({ date: '2026-10-20' }), NOW).state).toBe('closed');
        expect(eventSaleState(event(), NOW).state).toBe('open');
        expect(tierSaleState({ salesEnd: '2026-10-25' }, { now: NOW }).state).toBe('on_sale');
        expect(tierSaleState({ salesEnd: '2026-10-24' }, { now: NOW }).state).toBe('closed');
        expect(tierSaleState({ hidden: true }, { now: NOW }).state).toBe('hidden');
        expect(cartProblem(event({ ticketCategories: [{ id: 'eb', name: 'Early bird', price: 300, salesEnd: '2026-10-20' }] }), { eb: 1 }, NOW)).toMatch(/no longer on sale/);
        expect(istMoment('2026-10-26T10:00').toISOString()).toBe('2026-10-26T04:30:00.000Z');
    });

    it('lets an unpaid gateway hold go after it expires', () => {
        const ev = event();
        const hold = { status: 'awaiting_payment', holdUntil: '2026-10-25T06:40:00.000Z', items: [{ id: 'vip', count: 2, price: 1500 }] };
        expect(orderHoldsSeats(hold, new Date('2026-10-25T06:30:00Z'))).toBe(true);
        expect(orderHoldsSeats(hold, new Date('2026-10-25T06:50:00Z'))).toBe(false);
        expect(computeAvailability(ev, [hold], new Date('2026-10-25T06:30:00Z')).tiers.vip.remaining).toBe(8);
        expect(computeAvailability(ev, [hold], new Date('2026-10-25T06:50:00Z')).tiers.vip.remaining).toBe(10);
    });
});

describe('UPI', () => {
    it('cleans up pasted UTRs', () => {
        expect(normalizeUtr('UTR: 4321 5678 9012')).toBe('432156789012');
        expect(isValidUtr('432156789012')).toBe(true);
        expect(isValidUtr('43215678901')).toBe(false);
        expect(isValidUtr('T2310251234567890123')).toBe(false);
    });

    it('builds exact-amount links with the booking ref in the note', () => {
        const q = upiQuery({ upiId: 'newbi@okaxis', payeeName: 'Newbi', amount: 499.5, ref: 'NB-ABC234' });
        expect(q).toContain('am=499.50');
        expect(q).toContain('tn=Newbi%20NB-ABC234');
        expect(q).not.toContain('tr=');
        expect(upiQuery({ upiId: 'shop@ybl', amount: 1, ref: 'NB-ABC234', merchant: { code: '7929' } })).toContain('mc=7929');
        expect(upiLink({ upiId: 'a@b', amount: 1 }, { appId: 'gpay', platform: 'ios' })).toMatch(/^gpay:\/\/upi\/pay\?/);
        expect(upiLink({ upiId: 'a@b', amount: 1 })).toMatch(/^upi:\/\/pay\?/);
    });
});

describe('statement matching', () => {
    const orders = [
        { id: '1', status: 'pending', totalAmount: 500, paymentRef: '432156789012', bookingRef: 'NB-AAAAAA' },
        { id: '2', status: 'pending', totalAmount: 1500, paymentRef: '111122223333', bookingRef: 'NB-BBBBBB' },
        { id: '3', status: 'pending', totalAmount: 900, paymentRef: '999988887777', bookingRef: 'NB-CCCCCC' },
        { id: '4', status: 'pending', totalAmount: 700, paymentRef: '555566667777', bookingRef: 'NB-DDDDDD' },
        { id: '5', status: 'approved', totalAmount: 500, paymentRef: '123412341234' },
    ];
    const statement = [
        'Date,Narration,Ref No,Withdrawal,Deposit,Balance',
        '25/10/26,UPI/432156789012/Newbi NB-AAAAAA/asha@okaxis,432156789012,,500.00,10500.00',
        '25/10/26,UPI/111122223333/paid/ravi@ybl,111122223333,,1000.00,11500.00',
        '25/10/26,UPI/444455556666/Newbi NB-CCCCCC/meera@paytm,444455556666,,₹900,12400.00',
        '25/10/26,UPI/777700001111/random/x@ybl,777700001111,,250.00,12650.00',
    ].join('\n');

    it('finds payments by UTR or booking ref and checks the amount', () => {
        const m = matchStatement(statement, orders);
        expect(m.matched.map(r => r.order.id).sort()).toEqual(['1', '3']);
        expect(m.matched.find(r => r.order.id === '3').by).toBe('ref');
        expect(m.wrongAmount.map(r => r.order.id)).toEqual(['2']);
        expect(m.notFound.map(r => r.order.id)).toEqual(['4']);
        expect(m.unmatched).toHaveLength(1);
        expect(m.results.some(r => r.order.id === '5')).toBe(false);
    });

    it('ignores lines with no reference', () => {
        expect(readStatement('hello\n\n12/10 opening balance 500.00')).toHaveLength(0);
    });
});

describe('venue maps', () => {
    const tiers = eventTiers(event());
    it('links template zones to ticket types by name, then in order', () => {
        const map = mapFromTemplate('concert', [{ id: 'x', name: 'VIP' }, { id: 'y', name: 'General admission' }, { id: 'z', name: 'Fan pit' }]);
        const zones = map.elements.filter(e => e.type === 'zone');
        expect(zones.find(z => z.label === 'Fan pit').tierId).toBe('z');
        expect(zones.find(z => z.label === 'General admission').tierId).toBe('y');
        expect(zones.filter(z => z.label === 'VIP').map(z => z.tierId)).toContain('x');
    });

    it('keeps elements inside the canvas and drops junk', () => {
        const map = normalizeVenueMap({ h: 500, elements: [{ type: 'zone', x: 990, y: -5, w: 200, h: 50 }, { type: 'nope' }] });
        expect(map.elements).toHaveLength(1);
        expect(map.elements[0].x).toBe(800);
        expect(map.elements[0].y).toBe(0);
        expect(normalizeVenueMap({ elements: [] })).toBeNull();
    });

    it('turns the old image layout into a map', () => {
        const ev = { venueLayout: 'https://x.test/l.png', ticketCategories: [{ id: 'ga', name: 'GA', mapping: { x: 10, y: 20, width: 30, height: 10 } }] };
        expect(legacyVenueMap(ev).elements[0]).toMatchObject({ tierId: 'ga', x: 100, y: 140, w: 300, h: 70 });
        expect(eventVenueMap({ ...ev, venueMap: { elements: [{ type: 'stage' }] } }).elements[0].type).toBe('stage');
        expect(eventVenueMap({})).toBeNull();
        expect(eventVenueMap({ ...ev, hideVenueMap: true, venueMap: { elements: [{ type: 'stage' }] } })).toBeNull();
        void tiers;
    });
});

describe('gateway signature', () => {
    it('accepts only the HMAC of order|payment with the secret', () => {
        const sig = crypto.createHmac('sha256', 's3cret').update('order_1|pay_1').digest('hex');
        expect(gatewaySignatureOk('order_1', 'pay_1', sig, 's3cret')).toBe(true);
        expect(gatewaySignatureOk('order_1', 'pay_2', sig, 's3cret')).toBe(false);
        expect(gatewaySignatureOk('order_1', 'pay_1', sig, '')).toBe(false);
    });
});

describe('sale settings', () => {
    it('keeps the payment screenshot rule (off for old sales)', async () => {
        const { fromEvent, toPayload } = await import('../src/components/admin/ticketing/saleModel.js');
        expect(fromEvent({ payments: { upi: true } }).payments.requireProof).toBe(false);
        const form = fromEvent({ payments: { upi: true, requireProof: true } });
        expect(form.payments.requireProof).toBe(true);
        expect(toPayload(form).payments).toMatchObject({ upi: true, requireProof: true });
    });
});
