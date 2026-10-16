import { firstName } from '../layout.js';

/** data: { clientName, invoiceNumber, invoiceUrl } */
export default (data = {}) => ({
    sender: 'finance',
    kind: 'transactional',
    subject: `Payment update: invoice ${data.invoiceNumber || ''}`.trim(),
    preheader: "We couldn't verify your payment yet.",
    eyebrow: 'Action needed',
    title: "We couldn't verify the payment",
    blocks: [
        { p: `Hi ${firstName(data.clientName)}, we couldn't match the payment you reported for invoice ${data.invoiceNumber || ''} with our records, so the invoice is still unpaid.`.replace(/\s+/g, ' ') },
        { p: 'If you have already paid, reply to this email with the transaction details and we will sort it out quickly. You can also pay from the invoice page.' },
    ],
    cta: data.invoiceUrl ? { label: 'View invoice', url: data.invoiceUrl } : null,
    reason: 'Billing email from Newbi.',
});
