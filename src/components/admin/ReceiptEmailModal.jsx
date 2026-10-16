import React, { useCallback, useMemo } from 'react';
import { generateReceiptEmailHTML } from '../../lib/email';
import EmailComposer from './EmailComposer';

/** Email a payout receipt (with its verification link) to the payee. */
const ReceiptEmailModal = ({ isOpen, onClose, receipt, onSend }) => {
    const amount = Number(receipt?.amount || 0).toLocaleString('en-IN');
    const payee = receipt?.receiverName || 'Payee';
    const proof = receipt?.receiptUrl || receipt?.proofUrl;
    const verifyUrl = `${window.location.origin}/verify-payout?ref=${encodeURIComponent(receipt?.reference || 'N/A')}&amt=${receipt?.amount || 0}&payee=${encodeURIComponent(receipt?.receiverName || '')}${proof ? `&proof=${encodeURIComponent(proof)}` : ''}`;

    const initial = useMemo(() => receipt && ({
        to: receipt.email || receipt.payeeEmail || '',
        subject: `Payment receipt: ₹${amount} to ${payee}`,
        headerText: 'Payment sent',
        messageBody: `<p>Hi,</p>
<p>We've paid <strong>₹${amount}</strong> to <strong>${payee}</strong>.</p>
<p>The receipt is below. You can check the payment online by scanning its QR code or using the button.</p>
<p>Thank you!<br/>Newbi Entertainment</p>`,
        theme: 'dark',
    }), [receipt, amount, payee]);

    const buildHtml = useCallback(({ headerText, messageBody, theme, preview }) => generateReceiptEmailHTML({
        headerText,
        messageBody,
        reference: receipt?.reference || 'N/A',
        receiverName: payee,
        amount,
        date: receipt?.date || '',
        paymentMode: receipt?.paymentMode || 'UPI',
        verifyUrl,
        theme,
        ...(preview ? { isPreview: true } : {}),
    }), [receipt, payee, amount, verifyUrl]);

    return (
        <EmailComposer
            open={isOpen && Boolean(receipt)}
            onClose={onClose}
            title="Email receipt"
            subtitle={`₹${amount} · ${payee}`}
            initial={initial}
            resetKey={`${receipt?.reference}-${receipt?.amount}`}
            buildHtml={buildHtml}
            onSend={onSend}
            successText="Receipt sent."
        />
    );
};

export default ReceiptEmailModal;
