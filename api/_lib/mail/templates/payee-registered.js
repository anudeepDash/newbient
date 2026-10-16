import { firstName } from '../layout.js';

/** data: { name, method, last4 } */
export default (data = {}) => ({
    sender: 'finance',
    kind: 'transactional',
    subject: 'We got your payment details',
    preheader: "Your payment details are with our finance team for review.",
    eyebrow: 'Payments',
    title: 'Payment details received',
    blocks: [
        { p: `Hi ${firstName(data.name)}, thanks for sending your payment details. Our finance team will check them before any payout goes out.` },
        { details: [['Method', data.method], ['Account ending', data.last4]] },
        { note: "If you didn't submit this, reply to this email straight away." },
    ],
    reason: "You're getting this because payment details were submitted to Newbi with this email address.",
});
