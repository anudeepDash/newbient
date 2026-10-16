import { firstName } from '../layout.js';

/** data: { clientName, invoiceNumber, invoiceUrl } */
export default (data = {}) => ({
    sender: 'finance',
    kind: 'transactional',
    subject: `Payment confirmed: invoice ${data.invoiceNumber || ''}`.trim(),
    preheader: 'Your payment is verified and the invoice is marked paid.',
    eyebrow: 'Payment confirmed',
    title: 'Payment verified',
    blocks: [
        { p: `Hi ${firstName(data.clientName)}, your payment for invoice ${data.invoiceNumber || ''} has been verified by our finance team. The invoice is now marked paid.`.replace(/\s+/g, ' ') },
    ],
    cta: data.invoiceUrl ? { label: 'View invoice', url: data.invoiceUrl } : null,
    reason: 'Billing email from Newbi.',
});
