import { firstName, formatDate } from '../layout.js';

/**
 * A resale ticket paid through a Razorpay payment link the team sent by hand.
 * Only confirms the money: the tickets themselves go out separately, by hand.
 * data: { name, eventName, eventDate, venue, ticketType, quantity, unitPrice, amount, ref, paymentId, paidAt }
 */
export default (data = {}) => {
    const event = data.eventName || 'your tickets';
    const qty = Math.max(1, Number(data.quantity) || 1);
    return {
        sender: 'tickets',
        kind: 'transactional',
        subject: `Payment received: ${event}`,
        preheader: `We've received your payment${data.amount ? ` of ₹${data.amount}` : ''}. Your tickets come from our team separately.`,
        eyebrow: 'Payment received',
        title: 'We got your payment',
        blocks: [
            { p: `Hi ${firstName(data.name)}, thanks. We've received your payment for ${event}. Our team will send your tickets to you separately, and will reach out on this email or your phone.` },
            { items: [{ name: data.ticketType || 'Tickets', count: qty, price: Number(data.unitPrice) || (Number(data.amount) || 0) / qty }], total: data.amount, totalLabel: 'Total paid' },
            { details: [['Event', data.eventName], ['Date', formatDate(data.eventDate)], ['Venue', data.venue], ['Paid on', formatDate(data.paidAt, { withTime: true })], ['Razorpay payment ID', data.paymentId]] },
            { code: data.ref, label: 'Reference' },
            { note: 'Keep this email. Quote the reference if you contact us about this order.' },
        ],
        reason: "You're getting this because you paid Newbi for tickets.",
    };
};
