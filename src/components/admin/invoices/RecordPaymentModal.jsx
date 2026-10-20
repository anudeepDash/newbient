import React, { useEffect, useState } from 'react';
import { useStore } from '../../../lib/store';
import { invoiceTotal, invoiceAdvance, invoiceReceived, invoiceBalance, todayKey } from '../../../lib/invoicing';
import Sheet from '../Sheet';
import { Button } from '../ui';
import { inr } from '../ticketing/format';
import ThemedSelect from '../ThemedSelect';

const METHODS = ['UPI', 'Bank transfer', 'Cash', 'Cheque', 'Card', 'Other'];
const field = 'h-12 w-full rounded-xl border border-black/10 bg-white px-3.5 text-[15px] font-semibold text-gray-900 outline-none transition-colors focus:border-neon-green/60 dark:border-white/10 dark:bg-white/[0.03] dark:text-white';

const RecordPaymentModal = ({ invoice, open, onClose }) => {
    const addToast = useStore(s => s.addToast);
    const balance = invoice ? invoiceBalance({ ...invoice, status: 'Pending' }) : 0;
    const [form, setForm] = useState({ amount: '', method: 'UPI', reference: '', date: todayKey(), note: '' });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (open) {
            setForm({ amount: balance ? String(balance) : '', method: 'UPI', reference: '', date: todayKey(), note: '' });
            setError('');
        }
    }, [open, invoice?.id]); // eslint-disable-line react-hooks/exhaustive-deps

    if (!invoice) return null;

    const amount = Number(form.amount);
    const overpay = amount > balance + 0.009;

    const submit = async (e) => {
        e.preventDefault();
        setError('');
        if (!(amount > 0)) { setError('Enter the amount you received.'); return; }
        if (overpay && !window.confirm(`That's ${inr(amount - balance)} more than the balance of ${inr(balance)}. Record it anyway?`)) return;
        setSaving(true);
        try {
            const left = await useStore.getState().recordInvoicePayment(invoice.id, {
                amount, method: form.method, reference: form.reference.trim(), date: form.date, note: form.note.trim(),
            });
            addToast(left > 0 ? `${inr(left)} is still due on this invoice.` : 'The invoice is now paid in full.', 'success', { title: 'Payment recorded' });
            onClose();
        } catch (err) {
            console.error(err);
            setError(err.message || "Couldn't record the payment. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Sheet
            open={open}
            onClose={onClose}
            variant="dialog"
            size="sm"
            title="Record a payment"
            subtitle={`${invoice.clientName || 'Invoice'} · ${invoice.invoiceNumber || ''}`}
            footer={(
                <div className="flex gap-2">
                    <Button variant="ghost" onClick={onClose} className="flex-1 sm:flex-none">Cancel</Button>
                    <Button variant="primary" type="submit" form="record-payment-form" disabled={saving} className="flex-1">
                        {saving ? 'Saving…' : `Record ${amount > 0 ? inr(amount) : 'payment'}`}
                    </Button>
                </div>
            )}
        >
            <dl className="mb-5 grid grid-cols-2 gap-3 rounded-2xl bg-black/[0.03] p-4 text-[13px] dark:bg-white/[0.04]">
                <div><dt className="text-gray-500">Invoice total</dt><dd className="font-bold tabular-nums">{inr(invoiceTotal(invoice))}</dd></div>
                <div><dt className="text-gray-500">Balance due</dt><dd className="font-bold tabular-nums text-amber-600 dark:text-amber-400">{inr(balance)}</dd></div>
                {invoiceAdvance(invoice) > 0 && <div><dt className="text-gray-500">Advance</dt><dd className="font-bold tabular-nums">{inr(invoiceAdvance(invoice))}</dd></div>}
                {invoiceReceived(invoice) > 0 && <div><dt className="text-gray-500">Received so far</dt><dd className="font-bold tabular-nums">{inr(invoiceReceived(invoice))}</dd></div>}
            </dl>

            <form id="record-payment-form" onSubmit={submit} className="space-y-4" noValidate>
                <label className="block">
                    <span className="mb-1 block text-[12px] font-bold text-gray-500">Amount received (₹)</span>
                    <input className={field} type="number" inputMode="decimal" step="0.01" min="0" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} autoFocus />
                    {balance > 0 && amount > 0 && amount < balance && (
                        <span className="mt-1 block text-[12px] text-gray-500">Part payment · {inr(balance - amount)} will still be due.</span>
                    )}
                </label>
                <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                        <span className="mb-1 block text-[12px] font-bold text-gray-500">Method</span>
                        <ThemedSelect className={field} value={form.method} onChange={e => setForm({ ...form, method: e.target.value })}>
                            {METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                        </ThemedSelect>
                    </label>
                    <label className="block">
                        <span className="mb-1 block text-[12px] font-bold text-gray-500">Date received</span>
                        <input className={field} type="date" max={todayKey()} value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                    </label>
                </div>
                <label className="block">
                    <span className="mb-1 block text-[12px] font-bold text-gray-500">UTR / reference <span className="font-medium">(optional)</span></span>
                    <input className={field} value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })} autoCapitalize="characters" autoCorrect="off" spellCheck={false} />
                </label>
                <label className="block">
                    <span className="mb-1 block text-[12px] font-bold text-gray-500">Note <span className="font-medium">(optional)</span></span>
                    <input className={field} value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} />
                </label>
                {error && <p role="alert" className="text-[13px] font-semibold text-red-600 dark:text-red-400">{error}</p>}
            </form>
        </Sheet>
    );
};

export default RecordPaymentModal;
