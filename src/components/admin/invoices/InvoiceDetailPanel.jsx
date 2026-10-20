import React, { useMemo, useState } from 'react';
import { notifyEvent } from '../../../lib/mailApi';
import { Link } from 'react-router-dom';
import ExternalLink from 'lucide-react/dist/esm/icons/external-link';
import Edit from 'lucide-react/dist/esm/icons/edit';
import Wallet from 'lucide-react/dist/esm/icons/wallet';
import Mail from 'lucide-react/dist/esm/icons/mail';
import Share2 from 'lucide-react/dist/esm/icons/share-2';
import CopyPlus from 'lucide-react/dist/esm/icons/copy-plus';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import Ban from 'lucide-react/dist/esm/icons/ban';
import Eye from 'lucide-react/dist/esm/icons/eye';
import { useStore } from '../../../lib/store';
import { cn } from '../../../lib/utils';
import {
    invoiceTotal, invoiceAdvance, invoiceReceived, invoiceBalance, invoiceState, INVOICE_STATE_LABEL, daysOverdue,
} from '../../../lib/invoicing';
import Sheet from '../Sheet';
import { Button, Badge, SegmentedTabs } from '../ui';
import PaymentClaimReview from '../PaymentClaimReview';
import { inr, formatDateTime, toDate } from '../ticketing/format';

const deviceOf = (ua = '') => {
    const os = /iPhone/.test(ua) ? 'iPhone' : /iPad/.test(ua) ? 'iPad' : /Android/.test(ua) ? 'Android' : /Windows/.test(ua) ? 'Windows' : /Mac OS X|Macintosh/.test(ua) ? 'Mac' : /Linux/.test(ua) ? 'Linux' : 'Unknown device';
    const browser = /Edg\//.test(ua) ? 'Edge' : /CriOS|Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : '';
    return [os, browser].filter(Boolean).join(' · ');
};

const viaLabel = (via) => ({ email: 'Email link', whatsapp: 'WhatsApp', share: 'Shared link', link: 'Copied link' }[via] || 'Opened directly');

const formatDay = (value) => {
    if (!value) return '—';
    const d = toDate(String(value).length === 10 ? `${value}T00:00:00` : value);
    return d ? d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : String(value);
};

const InvoiceDetailPanel = ({ invoiceId, onClose, canManage, onRecordPayment, onEmail, onShare, onDuplicate, onDelete }) => {
    const invoice = useStore(s => (s.invoices || []).find(i => i.id === invoiceId)) || null;
    const addToast = useStore(s => s.addToast);
    const [tab, setTab] = useState('payments');

    const views = useMemo(() => [...(invoice?.accessLogs || [])].reverse(), [invoice?.accessLogs]);
    if (!invoiceId) return null;

    const state = invoice ? invoiceState(invoice) : 'unpaid';
    const stateCfg = INVOICE_STATE_LABEL[state];
    const balance = invoice ? invoiceBalance(invoice) : 0;
    const logs = invoice?.paymentLogs || [];
    const overdueDays = invoice ? daysOverdue(invoice) : 0;

    const voidPayment = async (index) => {
        if (!window.confirm('Void this payment? It stays in the history, crossed out, and the balance goes back up.')) return;
        try {
            await useStore.getState().voidInvoicePayment(invoice.id, index);
            addToast('Payment voided.', 'success');
        } catch {
            addToast('Check your connection and try again.', 'error', { title: "Couldn't void the payment", action: { label: 'Try again', onClick: () => voidPayment(index) } });
        }
    };

    return (
        <Sheet
            open={Boolean(invoiceId)}
            onClose={onClose}
            size="md"
            title={invoice ? (invoice.clientName || 'Untitled invoice') : 'Invoice'}
            subtitle={invoice ? `${invoice.invoiceNumber || 'No number'} · issued ${formatDay(invoice.issueDate || invoice.invoiceDate || invoice.createdAt)}` : 'This invoice was deleted.'}
        >
            {!invoice ? (
                <p className="text-sm text-gray-500">It may have been deleted by someone else.</p>
            ) : (
                <div className="space-y-6">
                    <div className="rounded-2xl border border-black/[0.06] p-4 dark:border-white/[0.08]">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-[12px] font-bold text-gray-500">{balance > 0 ? 'Balance due' : 'Total'}</p>
                                <p className="text-3xl font-extrabold tracking-tight tabular-nums">{inr(balance > 0 ? balance : invoiceTotal(invoice))}</p>
                            </div>
                            <Badge tone={stateCfg.tone}>{stateCfg.label}{overdueDays ? ` · ${overdueDays}d` : ''}</Badge>
                        </div>
                        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-[13px]">
                            <div><dt className="text-gray-500">Invoice total</dt><dd className="font-semibold tabular-nums">{inr(invoiceTotal(invoice))}</dd></div>
                            <div><dt className="text-gray-500">Due date</dt><dd className={cn('font-semibold', overdueDays && 'text-red-600 dark:text-red-400')}>{formatDay(invoice.dueDate)}</dd></div>
                            {invoiceAdvance(invoice) > 0 && <div><dt className="text-gray-500">Advance</dt><dd className="font-semibold tabular-nums">{inr(invoiceAdvance(invoice))}</dd></div>}
                            {invoiceReceived(invoice) > 0 && <div><dt className="text-gray-500">Received</dt><dd className="font-semibold tabular-nums">{inr(invoiceReceived(invoice))}</dd></div>}
                            {invoice.lastOpened && <div className="col-span-2"><dt className="text-gray-500">Last opened by client</dt><dd className="font-semibold">{formatDateTime(invoice.lastOpened)}</dd></div>}
                        </dl>
                    </div>

                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {canManage && balance > 0 && (
                            <Button variant="primary" onClick={() => onRecordPayment(invoice)} className="col-span-2 sm:col-span-1"><Wallet size={14} /> Record payment</Button>
                        )}
                        <Button as="a" href={`/invoice/${invoice.id}`} target="_blank" rel="noopener noreferrer" variant="secondary"><ExternalLink size={14} /> Open</Button>
                        {canManage && invoice.type !== 'upload' && <Button as={Link} to={`/admin/edit-invoice/${invoice.id}`} variant="secondary"><Edit size={14} /> Edit</Button>}
                        <Button variant="secondary" onClick={() => onEmail(invoice)}><Mail size={14} /> Email</Button>
                        <Button variant="secondary" onClick={() => onShare(invoice)}><Share2 size={14} /> Share</Button>
                        {canManage && <Button variant="secondary" onClick={() => onDuplicate(invoice)}><CopyPlus size={14} /> Duplicate</Button>}
                        {canManage && <Button variant="ghost" onClick={() => onDelete(invoice)} className="text-red-500 hover:text-red-600"><Trash2 size={14} /> Delete</Button>}
                    </div>

                    {invoice.paymentClaim && (
                        <PaymentClaimReview
                            invoice={invoice}
                            onApprove={async () => {
                                await useStore.getState().approveInvoiceClaim(invoice.id);
                                if (invoice.paymentClaim?.email) await notifyEvent('payment-approved', { invoiceId: invoice.id });
                                addToast('The invoice is now marked as paid.', 'success', { title: 'Payment confirmed' });
                            }}
                            onDecline={async () => {
                                await useStore.getState().declineInvoiceClaim(invoice.id);
                                if (invoice.paymentClaim?.email) await notifyEvent('payment-declined', { invoiceId: invoice.id });
                                addToast('The invoice is back to unpaid.', 'info', { title: 'Payment claim declined' });
                            }}
                        />
                    )}

                    <div>
                        <SegmentedTabs value={tab} onChange={setTab} items={[
                            { value: 'payments', label: 'Payments', count: logs.filter(l => !l.voided).length },
                            { value: 'views', label: 'Views', count: views.length },
                        ]} />
                        <div className="mt-3">
                            {tab === 'payments' ? (
                                logs.length === 0 ? (
                                    <p className="rounded-2xl bg-black/[0.03] p-4 text-[13px] text-gray-500 dark:bg-white/[0.04]">No payments recorded yet.</p>
                                ) : (
                                    <ul className="divide-y divide-black/[0.05] rounded-2xl border border-black/[0.06] dark:divide-white/[0.05] dark:border-white/[0.08]">
                                        {logs.map((log, i) => (
                                            <li key={i} className={cn('flex items-center gap-3 px-4 py-3', log.voided && 'opacity-50')}>
                                                <div className="min-w-0 flex-1">
                                                    <p className={cn('text-[14px] font-bold tabular-nums', log.voided && 'line-through')}>{inr(log.amount)} <span className="font-medium text-gray-500">· {log.type || 'Payment'}</span></p>
                                                    <p className="truncate text-[12px] text-gray-500">
                                                        {formatDay(log.timestamp)}
                                                        {log.transactionId ? ` · ${log.transactionId}` : ''}
                                                        {log.verifiedBy ? ` · by ${log.verifiedBy}` : ''}
                                                        {log.voided ? ' · voided' : ''}
                                                    </p>
                                                    {log.note && <p className="truncate text-[12px] text-gray-500">{log.note}</p>}
                                                </div>
                                                {canManage && !log.voided && (
                                                    <button type="button" onClick={() => voidPayment(i)} aria-label="Void payment" title="Void payment" className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 hover:bg-red-500/10 hover:text-red-500">
                                                        <Ban size={15} />
                                                    </button>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                )
                            ) : views.length === 0 ? (
                                <p className="rounded-2xl bg-black/[0.03] p-4 text-[13px] text-gray-500 dark:bg-white/[0.04]">The client hasn't opened this invoice yet.</p>
                            ) : (
                                <ul className="divide-y divide-black/[0.05] rounded-2xl border border-black/[0.06] dark:divide-white/[0.05] dark:border-white/[0.08]">
                                    {views.slice(0, 50).map((log, i) => (
                                        <li key={i} className="flex items-center gap-3 px-4 py-3">
                                            <Eye size={15} className="shrink-0 text-gray-400" />
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-[13px] font-semibold">{log.shareName || log.userName || viaLabel(log.via)}</p>
                                                <p className="truncate text-[12px] text-gray-500">{[viaLabel(log.via), deviceOf(log.userAgent), log.shareEmail].filter(Boolean).join(' · ')}</p>
                                            </div>
                                            <span className="shrink-0 text-[12px] text-gray-500">{formatDateTime(log.timestamp)}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </Sheet>
    );
};

export default InvoiceDetailPanel;
