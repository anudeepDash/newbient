/** Payout receipt. data: { company (entertainment|media|marketing), subject, headerText, messageBody, reference, receiverName, amount, date, paymentMode, verifyUrl } */
export default (data = {}) => ({
    sender: 'finance',
    kind: 'transactional',
    // The logo with the company name the document is issued under.
    brand: 'company',
    company: data.company,
    subject: data.subject || `Payment receipt${data.reference ? ` ${data.reference}` : ''}`,
    preheader: [data.amount && `₹${data.amount}`, data.paymentMode, data.date].filter(Boolean).join(' · ') || 'Your payment receipt.',
    eyebrow: 'Receipt',
    title: data.headerText || 'Payment sent',
    blocks: [
        { html: data.messageBody },
        { details: [['Reference', data.reference], ['Paid to', data.receiverName], ['Amount', data.amount ? `₹${data.amount}` : ''], ['Date', data.date], ['Method', data.paymentMode]] },
    ],
    cta: data.verifyUrl ? { label: 'Verify this payment', url: data.verifyUrl } : null,
    reason: 'Finance email from Newbi Entertainment & Marketing LLP.',
});
