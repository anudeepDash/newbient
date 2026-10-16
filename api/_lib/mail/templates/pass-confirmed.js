import { firstName, formatDate } from '../layout.js';

/**
 * A confirmed place: guestlist spot, RSVP, free ticket or a paid order the
 * team has dispatched. Merges the old guestlist, free ticket and booking emails.
 * data: { name, eventName, date, venue, qty, tier, ref, passUrl, mode: 'qr'|'rsvp',
 *         source: 'guestlist'|'order', items, totalAmount, paymentRef }
 */
export default (data = {}) => {
    const rsvp = data.mode === 'rsvp';
    const paid = Number(data.totalAmount) > 0;
    const event = data.eventName || 'your event';
    return {
        sender: 'tickets',
        kind: 'transactional',
        subject: rsvp ? `RSVP confirmed: ${event}` : `You're in: ${event}`,
        preheader: rsvp ? `Your RSVP for ${event} is confirmed.` : `Your pass for ${event} is ready. Show the QR code at the gate.`,
        eyebrow: rsvp ? 'RSVP' : data.source === 'order' ? 'Tickets' : 'Guestlist',
        title: rsvp ? 'Your RSVP is confirmed' : "You're on the list",
        blocks: [
            { p: `Hi ${firstName(data.name)}, ${rsvp ? `your RSVP for ${event} is confirmed.` : paid ? `your payment for ${event} is verified and your tickets are ready.` : `your place at ${event} is confirmed.`}` },
            { details: [['Event', data.eventName], ['Date', formatDate(data.date, { withTime: /T\d\d:/.test(String(data.date || '')) })], ['Venue', data.venue], ['Tier', data.tier], ['Guests', Number(data.qty) > 1 ? data.qty : ''], ['Payment ref', paid ? data.paymentRef : '']] },
            data.items && data.items.length ? { items: data.items, total: paid ? data.totalAmount : null, totalLabel: 'Total paid' } : null,
            !rsvp ? { qr: { value: data.ref, caption: 'Show this at the gate.' } } : null,
            { code: data.ref, label: rsvp ? 'Reference' : 'Pass code' },
            rsvp ? { note: "We'll let you know if anything about entry changes." } : null,
        ],
        cta: !rsvp && data.passUrl ? { label: 'Open my pass', url: data.passUrl } : null,
        reason: "You're getting this because you booked or registered with Newbi.",
    };
};
