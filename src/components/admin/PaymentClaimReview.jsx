import { useState } from 'react';
import ShieldCheck from 'lucide-react/dist/esm/icons/shield-check';
import ShieldX from 'lucide-react/dist/esm/icons/shield-x';
import Clock from 'lucide-react/dist/esm/icons/clock';
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle';
import XCircle from 'lucide-react/dist/esm/icons/x-circle';
import Copy from 'lucide-react/dist/esm/icons/copy';
import { cn } from '../../lib/utils';
import { useStore } from '../../lib/store';
import { Badge, Button } from './ui';
import { accent } from './theme';
import { inr } from './ticketing/format';
import { invoiceBalance, INVOICE_STATUS } from '../../lib/invoicing';
import ConfirmDialog from './finance/ConfirmDialog';

/*
 * A client said they paid an invoice. Shows who claimed it and lets an admin
 * confirm (records the remaining balance as paid) or decline (back to unpaid).
 * Props are unchanged: { invoice, onApprove, onDecline }.
 */

const STATUS = {
    pending: { label: 'Waiting for you', tone: 'amber', icon: Clock },
    approved: { label: 'Confirmed', tone: 'green', icon: ShieldCheck },
    declined: { label: 'Declined', tone: 'red', icon: ShieldX },
};

const when = (value) => {
    if (!value) return '';
    const d = new Date(typeof value?.toDate === 'function' ? value.toDate() : value);
    return isNaN(d.getTime()) ? '' : d.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' });
};

// "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 …) … Safari" → "iPhone · Safari"
const device = (ua = '') => {
    if (!ua) return '';
    const os = /iPhone/.test(ua) ? 'iPhone' : /iPad/.test(ua) ? 'iPad' : /Android/.test(ua) ? 'Android' : /Mac OS X/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows' : /Linux/.test(ua) ? 'Linux' : '';
    const browser = /Edg\//.test(ua) ? 'Edge' : /CriOS|Chrome\//.test(ua) ? 'Chrome' : /FxiOS|Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : '';
    return [os, browser].filter(Boolean).join(' · ') || ua.slice(0, 60);
};

const Row = ({ label, value, copy }) => (value ? (
    <div className="flex items-center justify-between gap-4 py-2">
        <span className="shrink-0 text-[13px] text-gray-500">{label}</span>
        <span className="flex min-w-0 items-center gap-1">
            <span className="min-w-0 break-words text-right text-[13px] font-semibold">{value}</span>
            {copy && (
                <button
                    type="button"
                    aria-label={`Copy ${label}`}
                    onClick={() => navigator.clipboard?.writeText(String(value)).then(() => useStore.getState().addToast?.(`${label} copied.`, 'success')).catch(() => {})}
                    className="-mr-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-gray-400 hover:bg-black/5 hover:text-gray-900 dark:hover:bg-white/10 dark:hover:text-white"
                >
                    <Copy size={13} />
                </button>
            )}
        </span>
    </div>
) : null);

export default function PaymentClaimReview({ invoice, onApprove, onDecline }) {
    const [confirm, setConfirm] = useState(null); // 'approve' | 'decline' | null

    const claim = invoice?.paymentClaim;
    if (!claim) return null;

    const status = STATUS[claim.status] ? claim.status : 'pending';
    const cfg = STATUS[status];
    const StatusIcon = cfg.icon;
    const resolved = status !== 'pending';
    const balance = invoiceBalance({ ...invoice, status: INVOICE_STATUS.PENDING });
    const alreadyPaid = invoice.status === INVOICE_STATUS.PAID;

    return (
        <section className={cn('rounded-2xl border p-4', accent(cfg.tone).border, accent(cfg.tone).soft)}>
            <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                    <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', accent(cfg.tone).chip)}>
                        <StatusIcon size={18} />
                    </span>
                    <div className="min-w-0">
                        <h3 className="text-[15px] font-bold">Client says they paid</h3>
                        <p className="text-[12.5px] text-gray-500 dark:text-zinc-400">{when(claim.claimedAt) || 'Date not recorded'}</p>
                    </div>
                </div>
                <Badge tone={cfg.tone}>{cfg.label}</Badge>
            </div>

            <div className="mt-3 divide-y divide-black/[0.06] rounded-xl bg-white px-3.5 dark:divide-white/[0.06] dark:bg-black/20">
                <Row label="Name" value={claim.name || '—'} />
                <Row label="Email" value={claim.email} copy />
                {Number(claim.amount) > 0 && <Row label="Amount" value={`₹${Number(claim.amount).toLocaleString('en-IN')}`} />}
                <Row label="Method" value={{ gateway: 'Online payment page', upi: 'UPI', bank: 'Bank transfer', other: 'Other' }[claim.method] || claim.method} />
                <Row label="Reference" value={claim.transactionId} copy />
                <Row label="Device" value={device(claim.userAgent)} />
                <Row label="IP address" value={claim.ip} />
                {resolved && <Row label={status === 'approved' ? 'Confirmed' : 'Declined'} value={[when(claim.reviewedAt), claim.reviewedBy].filter(Boolean).join(' · ')} />}
            </div>

            {resolved ? (
                <p className={cn('mt-3 flex items-center gap-2 text-[13px] font-semibold', accent(cfg.tone).text)}>
                    {status === 'approved' ? <CheckCircle size={15} /> : <XCircle size={15} />}
                    {status === 'approved' ? 'Payment confirmed. The invoice is marked paid.' : 'Claim declined. The client was told to check their payment.'}
                </p>
            ) : (
                <>
                    <p className="mt-3 text-[12.5px] text-gray-600 dark:text-zinc-400">
                        {alreadyPaid
                            ? 'This invoice is already paid. Confirming just closes the claim.'
                            : `Check your bank for ${inr(balance)} before confirming. Confirming records it as paid.`}
                    </p>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                        <Button variant="ghost" className="h-11 text-red-500 hover:text-red-600" onClick={() => setConfirm('decline')}><XCircle size={15} /> Decline</Button>
                        <Button variant="success" className="h-11" onClick={() => setConfirm('approve')}><CheckCircle size={15} /> Confirm payment</Button>
                    </div>
                </>
            )}

            <ConfirmDialog
                open={confirm === 'approve'}
                onClose={() => setConfirm(null)}
                title="Confirm this payment?"
                confirmLabel="Confirm payment"
                tone="success"
                body={alreadyPaid
                    ? <p>The invoice is already paid, so nothing new is recorded. The client gets a confirmation email.</p>
                    : <p>We record <b>{inr(balance)}</b> as received for {invoice.invoiceNumber || 'this invoice'}, mark it paid and email the client.</p>}
                onConfirm={onApprove}
            />
            <ConfirmDialog
                open={confirm === 'decline'}
                onClose={() => setConfirm(null)}
                title="Decline this claim?"
                confirmLabel="Decline claim"
                body={<p>{alreadyPaid ? 'The invoice stays paid, since it was paid another way.' : 'The invoice goes back to unpaid.'} The client gets an email asking them to check their payment.</p>}
                onConfirm={onDecline}
            />
        </section>
    );
}
