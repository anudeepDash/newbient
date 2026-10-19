/** Payout receipt. data: { company (entertainment|media|marketing), subject, headerText, messageBody, reference, receiverName, amount, date, paymentMode, verifyUrl } */
export default (data = {}) => ({
    sender: 'finance',
    kind: 'transactional',
    subject: data.subject || `Payment receipt${data.reference ? ` ${data.reference}` : ''}`,
    preheader: [data.amount && `₹${data.amount}`, data.paymentMode, data.date].filter(Boolean).join(' · ') || 'Your payment receipt.',
    eyebrow: 'Receipt',
    title: data.headerText || 'Payment sent',
    blocks: [
        { html: data.messageBody },
        { document: { kind: 'RECEIPT', name: `Receipt${data.reference ? ` ${data.reference}` : ''}.pdf`, meta: [data.amount ? `₹${data.amount}` : '', data.date], url: data.verifyUrl, label: 'Open receipt' } },
        { stats: [['Paid to', data.receiverName], ['Amount', data.amount ? `₹${data.amount}` : ''], ['Method', data.paymentMode]] },
    ],
    cta: data.verifyUrl ? { label: 'Verify this payment', url: data.verifyUrl } : null,
    reason: 'Finance email from newbi.live.',
});
