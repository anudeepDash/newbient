import React, { useCallback, useEffect, useState } from 'react';
import { useStore } from '../../../lib/store';
import { nextInvoiceNumber, todayKey } from '../../../lib/invoicing';
import { guessFields, nameFromFileName, isPdfFile } from '../../../lib/pdfInspect';
import Sheet from '../Sheet';
import { Button } from '../ui';
import { DocumentDrop, Field, Section, Toggle, UploadProgress, fieldCls, useDocumentIntake } from '../uploads/UploadKit';

/*
 * Track an invoice made outside Newbi (Tally, Zoho, Word…). Drop the PDF and
 * the details are read from it; the file goes to storage and the invoice
 * keeps a link, so it counts in Outstanding / Collected like any other.
 */

const blank = (invoices) => ({
    clientName: '', clientEmail: '', clientGst: '', amount: '',
    invoiceNumber: nextInvoiceNumber(invoices), issueDate: todayKey(), dueDate: '',
    paid: false, paidOn: todayKey(),
});

const QuickUploadModal = ({ open, onClose, invoices, onCreated }) => {
    const addToast = useStore(s => s.addToast);
    const [form, setForm] = useState(() => blank(invoices));
    const [auto, setAuto] = useState({});
    const [progress, setProgress] = useState(null);
    const [error, setError] = useState('');

    const set = (patch) => {
        setForm(f => ({ ...f, ...patch }));
        // Anything typed by hand is no longer "from PDF".
        setAuto(a => { const next = { ...a }; Object.keys(patch).forEach(k => delete next[k]); return next; });
    };

    const onRead = useCallback((info, file) => {
        const g = guessFields(info.lines, 'invoice');
        setForm(f => {
            const patch = {};
            const filled = {};
            const put = (k, v) => { if (v && !String(f[k] || '').trim()) { patch[k] = v; filled[k] = true; } };
            put('clientName', g.name || nameFromFileName(file.name));
            put('clientEmail', g.email);
            put('clientGst', g.gst);
            put('amount', g.amount ? String(g.amount) : '');
            put('dueDate', g.dueDate);
            if (g.number && f.invoiceNumber === nextInvoiceNumber(invoices)) { patch.invoiceNumber = g.number; filled.invoiceNumber = true; }
            if (g.issueDate && f.issueDate === todayKey()) { patch.issueDate = g.issueDate; filled.issueDate = true; }
            setAuto(filled);
            return { ...f, ...patch };
        });
    }, [invoices]);

    const intake = useDocumentIntake({ onRead });

    useEffect(() => {
        if (!open) return;
        setForm(blank(invoices));
        setAuto({});
        setProgress(null);
        setError('');
        intake.clear();
    }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

    const duplicate = form.invoiceNumber.trim() && invoices.some(i => String(i.invoiceNumber || '').trim().toUpperCase() === form.invoiceNumber.trim().toUpperCase());

    const submit = async (e) => {
        e.preventDefault();
        setError('');
        if (!intake.file) return setError('Add the invoice PDF first.');
        if (!isPdfFile(intake.file)) return setError('Only PDF invoices are supported.');
        if (!form.clientName.trim()) return setError('Enter the client name.');
        if (!(Number(form.amount) > 0)) return setError('Enter the invoice total so it counts in your numbers.');
        if (!form.invoiceNumber.trim()) return setError('Enter the invoice number.');
        if (duplicate) return setError(`${form.invoiceNumber} is already used by another invoice.`);
        if (form.dueDate && form.dueDate < form.issueDate) return setError('The due date is before the issue date.');

        setProgress(0);
        try {
            const uploaded = await useStore.getState().uploadProposalFile(intake.file, setProgress);
            if (!uploaded?.url) throw new Error('Upload failed');
            const amount = Math.round(Number(form.amount) * 100) / 100;
            const now = new Date().toISOString();
            const ref = await useStore.getState().addInvoice({
                type: 'upload',
                clientName: form.clientName.trim(),
                clientEmail: form.clientEmail.trim(),
                clientGst: form.clientGst.trim().toUpperCase(),
                invoiceNumber: form.invoiceNumber.trim(),
                issueDate: form.issueDate,
                invoiceDate: form.issueDate,
                dueDate: form.dueDate || '',
                amount,
                total: amount,
                status: form.paid ? 'Paid' : 'Pending',
                ...(form.paid ? { paidAt: new Date(`${form.paidOn}T12:00:00`).toISOString() } : {}),
                pdfUrl: uploaded.url,
                fileName: intake.file.name,
                pageCount: intake.info?.pages || null,
                createdAt: now,
            });
            addToast(form.paid ? 'Invoice added as paid.' : 'Invoice added.', 'success');
            onCreated?.(ref?.id);
            onClose();
        } catch (err) {
            console.error(err);
            setError(err.message || "Couldn't upload the file. Please try again.");
            setProgress(null);
        }
    };

    const busy = progress !== null;

    return (
        <Sheet
            open={open}
            onClose={busy ? () => {} : onClose}
            size="lg"
            title="Add an existing invoice"
            subtitle="Made in another tool? Drop the PDF and it's tracked here."
            footer={(
                <div className="space-y-3">
                    {busy && <UploadProgress percent={progress} step="Uploading the PDF" />}
                    {error && <p role="alert" className="text-[13px] font-semibold text-red-600 dark:text-red-400">{error}</p>}
                    <div className="flex gap-2">
                        <Button variant="ghost" onClick={onClose} disabled={busy} className="h-12">Cancel</Button>
                        <Button variant="primary" type="submit" form="quick-upload-form" disabled={busy || intake.reading} className="h-12 flex-1">
                            {busy ? 'Uploading…' : form.paid ? 'Add as paid' : 'Add invoice'}
                        </Button>
                    </div>
                </div>
            )}
        >
            <form id="quick-upload-form" onSubmit={submit} className="space-y-6" noValidate>
                <DocumentDrop intake={intake} disabled={busy} label="Drop the invoice PDF" sub="We'll read the client, amount and dates from it" />

                <Section title="Client">
                    <Field label="Client name" auto={auto.clientName}>
                        <input className={fieldCls} value={form.clientName} onChange={e => set({ clientName: e.target.value })} placeholder="e.g. Red Bull India" />
                    </Field>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <Field label="Email" optional auto={auto.clientEmail} hint="Used when you send reminders">
                            <input className={fieldCls} type="email" inputMode="email" autoCapitalize="off" value={form.clientEmail} onChange={e => set({ clientEmail: e.target.value })} />
                        </Field>
                        <Field label="GSTIN" optional auto={auto.clientGst}>
                            <input className={fieldCls} value={form.clientGst} onChange={e => set({ clientGst: e.target.value.toUpperCase() })} autoCapitalize="characters" maxLength={15} />
                        </Field>
                    </div>
                </Section>

                <Section title="Invoice">
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Total (₹, incl. GST)" auto={auto.amount}>
                            <input className={fieldCls} type="number" inputMode="decimal" step="0.01" min="0" value={form.amount} onChange={e => set({ amount: e.target.value })} placeholder="0" />
                        </Field>
                        <Field label="Invoice no." auto={auto.invoiceNumber}>
                            <input className={fieldCls} value={form.invoiceNumber} onChange={e => set({ invoiceNumber: e.target.value })} autoCapitalize="characters" />
                        </Field>
                    </div>
                    {duplicate && <p className="text-[12px] font-semibold text-amber-600">{form.invoiceNumber} already exists. Use the number printed on this PDF.</p>}
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Issued" auto={auto.issueDate}>
                            <input className={fieldCls} type="date" value={form.issueDate} onChange={e => set({ issueDate: e.target.value })} />
                        </Field>
                        <Field label="Due" optional auto={auto.dueDate}>
                            <input className={fieldCls} type="date" min={form.issueDate} value={form.dueDate} onChange={e => set({ dueDate: e.target.value })} />
                        </Field>
                    </div>
                </Section>

                <Section>
                    <div className="rounded-2xl border border-black/[0.06] p-4 dark:border-white/[0.06]">
                        <Toggle label="Already paid" hint="Counts it as collected instead of outstanding" checked={form.paid} onChange={(v) => set({ paid: v })} />
                        {form.paid && (
                            <Field label="Paid on" className="mt-3">
                                <input className={fieldCls} type="date" max={todayKey()} value={form.paidOn} onChange={e => set({ paidOn: e.target.value })} />
                            </Field>
                        )}
                    </div>
                </Section>
            </form>
        </Sheet>
    );
};

export default QuickUploadModal;
