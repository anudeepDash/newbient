/**
 * Invoice email (staff writes the message). data: { subject, headerText, messageBody (editor html),
 * invoiceNumber, clientName, amount, balance, dueDate, invoiceUrl }
 */
export default (data = {}) => ({
    sender: 'finance',
    kind: 'transactional',
    subject: data.subject || `Invoice ${data.invoiceNumber || ''} from Newbi`.replace(/\s+/g, ' ').trim(),
    preheader: [data.invoiceNumber && `Invoice ${data.invoiceNumber}`, data.amount && `₹${data.amount}`, data.dueDate && `due ${data.dueDate}`].filter(Boolean).join(' · '),
    eyebrow: 'Invoice',
    title: data.headerText || 'Your invoice is ready',
    blocks: [
        { html: data.messageBody },
        { document: { kind: 'INVOICE', name: `Invoice${data.invoiceNumber ? ` ${data.invoiceNumber}` : ''}.pdf`, meta: [data.amount ? `₹${data.amount}` : '', data.dueDate ? `Due ${data.dueDate}` : ''], url: data.invoiceUrl, label: 'Open invoice' } },
        { stats: [['Billed to', data.clientName], ['Amount', data.amount ? `₹${data.amount}` : ''], ['Balance due', data.balance ? `₹${data.balance}` : '']] },
    ],
    cta: data.invoiceUrl ? { label: 'View and pay invoice', url: data.invoiceUrl } : null,
    reason: 'Billing email from newbi.live.',
});
