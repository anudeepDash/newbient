import { firstName } from '../layout.js';

/** A paid order waiting for the team to check the payment. data: { name, eventName, ref, items, totalAmount, paymentRef } */
export default (data = {}) => ({
    sender: 'tickets',
    kind: 'transactional',
    subject: `Order received: ${data.eventName || 'your tickets'}`,
    preheader: "We've got your order and are checking the payment.",
    eyebrow: 'Order received',
    title: "We've got your order",
    blocks: [
        { p: `Hi ${firstName(data.name)}, thanks for booking${data.eventName ? ` ${data.eventName}` : ''}. We're checking your payment now. Your tickets arrive in another email as soon as it's verified, usually within a few hours.` },
        { items: data.items || [], total: data.totalAmount, totalLabel: 'Total' },
        { details: [['Payment ref (UTR)', data.paymentRef]] },
        { code: data.ref, label: 'Booking reference' },
        { note: 'Keep this reference handy if you contact us about the order.' },
    ],
    reason: "You're getting this because you placed an order with Newbi.",
});
