import React, { useCallback, useMemo } from 'react';
import { invoiceTotal, invoiceBalance } from '../../lib/invoicing';
import EmailComposer from './EmailComposer';

const money = (n) => Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

/** Email an invoice link to the client. */
const InvoiceEmailModal = ({ isOpen, onClose, invoice, onSend }) => {
    const total = invoice ? invoiceTotal(invoice) : 0;
    const balance = invoice ? invoiceBalance(invoice) : 0;
    const partlyPaid = balance > 0 && balance < total;

    const initial = useMemo(() => invoice && ({
        to: invoice.clientEmail || '',
        subject: `Invoice ${invoice.invoiceNumber || ''} from Newbi`.replace(/\s+/g, ' '),
        headerText: partlyPaid ? 'Balance due on your invoice' : 'Your invoice is ready',
        messageBody: `<p>Hi${invoice.clientName ? ` <strong>${invoice.clientName}</strong>` : ''},</p>
<p>Here's invoice <strong>${invoice.invoiceNumber || ''}</strong> for <strong>₹${money(total)}</strong>${partlyPaid ? `, with <strong>₹${money(balance)}</strong> still to pay` : ''}${invoice.dueDate ? `, due ${new Date(invoice.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}.</p>
<p>You can view it, download the PDF and pay using the button below.</p>
<p>Thank you for your business!<br/>Newbi Entertainment</p>`,
        theme: 'light',
    }), [invoice, total, balance, partlyPaid]);

    // The server template (api/_lib/mail/templates/invoice.js) renders this; the preview uses the same one.
    const buildData = useCallback(({ headerText, messageBody }) => ({
        headerText,
        messageBody,
        invoiceNumber: invoice?.invoiceNumber || '',
        clientName: invoice?.clientName || '',
        amount: money(total),
        balance: partlyPaid ? money(balance) : '',
        dueDate: invoice?.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '',
        invoiceUrl: `${window.location.origin}/invoice/${invoice?.id}`,
    }), [invoice, total, balance, partlyPaid]);

    return (
        <EmailComposer
            open={isOpen && Boolean(invoice)}
            onClose={onClose}
            title="Email invoice"
            subtitle={[invoice?.invoiceNumber, invoice?.clientName, invoice ? `₹${money(total)}` : null].filter(Boolean).join(' · ')}
            initial={initial}
            resetKey={invoice?.id}
            template="invoice"
            buildData={buildData}
            onSend={onSend}
            successText="Invoice sent."
        />
    );
};

export default InvoiceEmailModal;
