import React, { useCallback, useEffect, useState } from 'react';
import Check from 'lucide-react/dist/esm/icons/check';
import { useStore } from '../../lib/store';
import { cn } from '../../lib/utils';
import { generateNextProposalNumber, embedProposalNumberInPdf } from '../../lib/pdfStampUtils';
import { guessFields, nameFromFileName, isPdfFile } from '../../lib/pdfInspect';
import { todayKey } from '../../lib/invoicing';
import Sheet from './Sheet';
import { Button } from './ui';
import {
    Choice, DocumentDrop, Field, Section, SignatureField, Toggle, UploadProgress,
    areaCls, fieldCls, formatBytes, useDocumentIntake,
} from './uploads/UploadKit';

/*
 * Host a proposal or deck made elsewhere. The client gets a Newbi link where
 * they can read it, accept or decline, and you see when they open it. The
 * proposal number (and our signature, if drawn) is stamped onto every page.
 */

const BRANDS = [
    { id: 'entertainment', label: 'Entertainment', path: '/logo_document.png' },
    { id: 'media', label: 'Media', path: '/logo_media.png' },
    { id: 'marketing', label: 'Marketing', path: '/logo_marketing.png' },
];

const plusDays = (days) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return todayKey(d);
};

const emptyForm = () => ({
    clientName: '', clientEmail: '', campaignName: '', dealValue: '',
    proposalNumber: generateNextProposalNumber(useStore.getState().proposals),
    validUntil: plusDays(30), selectedLogo: 'entertainment', status: 'Draft',
    showSignatures: true, showSeal: true, ourSignature: null, coverDescription: '',
});

const fromProposal = (p) => ({
    clientName: p.clientName || '',
    clientEmail: p.clientEmail || '',
    campaignName: p.campaignName || '',
    dealValue: p.dealValue || p.totalOverride || '',
    proposalNumber: p.proposalNumber || '',
    validUntil: p.validUntil || '',
    selectedLogo: p.selectedLogo || 'entertainment',
    status: p.status || 'Draft',
    showSignatures: p.showSignatures !== false,
    showSeal: p.showSeal !== false,
    ourSignature: p.ourSignature || null,
    coverDescription: p.coverDescription || '',
});

const UploadProposalModal = ({ isOpen, onClose, editingProposal = null, onSuccess }) => {
    const [form, setForm] = useState(emptyForm);
    const [auto, setAuto] = useState({});
    const [saving, setSaving] = useState(null); // { percent, step }
    const [error, setError] = useState('');

    const set = (patch) => {
        setForm(f => ({ ...f, ...patch }));
        setAuto(a => { const next = { ...a }; Object.keys(patch).forEach(k => delete next[k]); return next; });
    };

    const onRead = useCallback((info, file) => {
        const g = guessFields(info.lines, 'proposal');
        setForm(f => {
            const patch = {};
            const filled = {};
            const put = (k, v) => { if (v && !String(f[k] || '').trim()) { patch[k] = v; filled[k] = true; } };
            put('clientName', g.name || nameFromFileName(file.name));
            put('clientEmail', g.email);
            put('dealValue', g.amount ? String(g.amount) : '');
            if (g.validUntil && g.validUntil >= todayKey()) { patch.validUntil = g.validUntil; filled.validUntil = true; }
            setAuto(filled);
            return { ...f, ...patch };
        });
    }, []);

    const intake = useDocumentIntake({ onRead });
    const existing = editingProposal?.fileUrl ? { name: editingProposal.fileName || 'Proposal document', size: editingProposal.fileSize, url: editingProposal.fileUrl } : null;

    useEffect(() => {
        if (!isOpen) return;
        setForm(editingProposal ? fromProposal(editingProposal) : emptyForm());
        setAuto({});
        setSaving(null);
        setError('');
        intake.clear();
    }, [isOpen, editingProposal]); // eslint-disable-line react-hooks/exhaustive-deps

    const submit = async (e) => {
        e.preventDefault();
        setError('');
        if (!intake.file && !existing) return setError('Add the proposal file first.');
        if (!form.clientName.trim()) return setError('Enter who the proposal is for.');
        if (form.dealValue && !(Number(form.dealValue) >= 0)) return setError('The value should be a number.');

        const { uploadProposalFile, addProposal, updateProposal, addToast, proposals } = useStore.getState();
        const number = form.proposalNumber.trim() || generateNextProposalNumber(proposals);
        const stamp = { ourSignature: form.ourSignature, senderName: 'Newbi Entertainment & Marketing LLP' };

        try {
            let fileUrl = editingProposal?.fileUrl || '';
            let fileName = editingProposal?.fileName || '';
            let fileSize = editingProposal?.fileSize || '';
            let fileType = editingProposal?.fileType || 'pdf';

            const upload = async (blob, label) => {
                const result = await uploadProposalFile(blob, (p) => setSaving({ percent: 15 + p * 0.8, step: label }));
                if (!result?.url) throw new Error("Couldn't upload the file.");
                return result;
            };

            if (intake.file) {
                let toUpload = intake.file;
                if (isPdfFile(intake.file)) {
                    setSaving({ percent: 5, step: 'Stamping the proposal number' });
                    try {
                        const bytes = await embedProposalNumberInPdf(await intake.file.arrayBuffer(), number, stamp);
                        toUpload = new File([bytes], intake.file.name, { type: 'application/pdf' });
                    } catch (stampErr) {
                        console.warn('Could not stamp the proposal number; uploading the original.', stampErr);
                    }
                }
                const result = await upload(toUpload, 'Uploading');
                fileUrl = result.url;
                fileName = result.fileName || intake.file.name;
                fileSize = formatBytes(result.fileSize || intake.file.size);
                fileType = result.fileType || 'pdf';
            } else if (editingProposal?.fileUrl && (number !== editingProposal.proposalNumber || form.ourSignature !== (editingProposal.ourSignature || null))) {
                // Number or signature changed on a saved PDF: restamp it.
                try {
                    setSaving({ percent: 10, step: 'Updating the stamped PDF' });
                    const resp = await fetch(editingProposal.fileUrl);
                    if (resp.ok) {
                        const bytes = await embedProposalNumberInPdf(await resp.arrayBuffer(), number, stamp);
                        const result = await upload(new File([bytes], fileName || 'proposal.pdf', { type: 'application/pdf' }), 'Uploading the updated PDF');
                        fileUrl = result.url;
                    }
                } catch (restampErr) {
                    console.warn('Could not restamp the saved PDF.', restampErr);
                }
            }

            setSaving({ percent: 98, step: 'Saving' });
            const value = form.dealValue === '' ? '' : String(form.dealValue).trim();
            const data = {
                clientName: form.clientName.trim(),
                clientEmail: form.clientEmail.trim(),
                campaignName: form.campaignName.trim(),
                proposalNumber: number,
                dealValue: value,
                totalOverride: value ? Number(value) : null,
                validUntil: form.validUntil || '',
                selectedLogo: form.selectedLogo,
                status: form.status,
                showSignatures: form.showSignatures,
                showSeal: form.showSeal,
                ourSignature: form.ourSignature,
                coverDescription: form.coverDescription.trim(),
                isUploaded: true,
                fileUrl,
                fileName,
                fileSize,
                fileType,
                pageCount: intake.info?.pages || editingProposal?.pageCount || null,
                items: editingProposal?.items || [],
                updatedAt: new Date().toISOString(),
            };

            let id = editingProposal?.id;
            if (id) {
                await updateProposal(id, data);
                addToast('Proposal updated.', 'success');
            } else {
                id = await addProposal(data);
                addToast('Proposal added. Share the link from its details.', 'success');
            }
            onSuccess?.(id);
            onClose();
        } catch (err) {
            console.error('Error saving uploaded proposal:', err);
            setError(err.message || "Couldn't save the proposal. Please try again.");
        } finally {
            setSaving(null);
        }
    };

    const busy = Boolean(saving);

    return (
        <Sheet
            open={isOpen}
            onClose={busy ? () => {} : onClose}
            size="lg"
            title={editingProposal ? 'Edit uploaded proposal' : 'Add a proposal PDF'}
            subtitle="The client gets a link to read it and accept online, and you see when they open it"
            footer={(
                <div className="space-y-3">
                    {busy && <UploadProgress percent={saving.percent} step={saving.step} />}
                    {error && <p role="alert" className="text-[13px] font-semibold text-red-600 dark:text-red-400">{error}</p>}
                    <div className="flex gap-2">
                        <Button variant="ghost" onClick={onClose} disabled={busy} className="h-12">Cancel</Button>
                        <Button variant="primary" type="submit" form="upload-proposal-form" disabled={busy || intake.reading} className="h-12 flex-1">
                            {busy ? 'Saving…' : editingProposal ? 'Save changes' : 'Add proposal'}
                        </Button>
                    </div>
                </div>
            )}
        >
            <form id="upload-proposal-form" onSubmit={submit} className="space-y-7" noValidate>
                <DocumentDrop
                    intake={intake}
                    existing={existing}
                    disabled={busy}
                    accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/*"
                    label="Drop the proposal or deck"
                    sub="PDF works best: we read the client and value from it and stamp the proposal number on every page"
                />

                <Section title="Who it's for">
                    <Field label="Client" auto={auto.clientName}>
                        <input className={fieldCls} value={form.clientName} onChange={e => set({ clientName: e.target.value })} placeholder="e.g. boAt Lifestyle" />
                    </Field>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <Field label="Client email" optional auto={auto.clientEmail} hint="Pre-fills the email when you share it">
                            <input className={fieldCls} type="email" inputMode="email" autoCapitalize="off" value={form.clientEmail} onChange={e => set({ clientEmail: e.target.value })} />
                        </Field>
                        <Field label="Campaign" optional>
                            <input className={fieldCls} value={form.campaignName} onChange={e => set({ campaignName: e.target.value })} placeholder="e.g. Diwali creator push" />
                        </Field>
                    </div>
                </Section>

                <Section title="Deal">
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Value (₹)" optional auto={auto.dealValue} hint="Counts in your pipeline">
                            <input className={fieldCls} type="number" inputMode="decimal" min="0" value={form.dealValue} onChange={e => set({ dealValue: e.target.value })} placeholder="0" />
                        </Field>
                        <Field label="Proposal no.">
                            <input className={cn(fieldCls, 'font-mono')} value={form.proposalNumber} onChange={e => set({ proposalNumber: e.target.value.toUpperCase() })} autoCapitalize="characters" />
                        </Field>
                    </div>
                    <Field label="Valid until" optional auto={auto.validUntil} hint="After this the link shows the offer as expired">
                        <input className={fieldCls} type="date" min={todayKey()} value={form.validUntil} onChange={e => set({ validUntil: e.target.value })} />
                    </Field>
                    <div className="flex flex-wrap gap-2">
                        {[15, 30, 60, 90].map(d => (
                            <button key={d} type="button" onClick={() => set({ validUntil: plusDays(d) })} className={cn('h-9 rounded-lg border px-3 text-[12px] font-bold', form.validUntil === plusDays(d) ? 'border-emerald-500/60 bg-neon-green/[0.08]' : 'border-black/10 dark:border-white/10')}>
                                {d} days
                            </button>
                        ))}
                        <button type="button" onClick={() => set({ validUntil: '' })} className={cn('h-9 rounded-lg border px-3 text-[12px] font-bold', !form.validUntil ? 'border-emerald-500/60 bg-neon-green/[0.08]' : 'border-black/10 dark:border-white/10')}>No expiry</button>
                    </div>
                </Section>

                <Section title="Where it stands">
                    <Choice value={form.status} onChange={(v) => set({ status: v })} options={[
                        { value: 'Draft', label: 'Draft', hint: 'Not shared yet' },
                        { value: 'Sent', label: 'Sent', hint: 'Client has it' },
                        { value: 'Accepted', label: 'Accepted', hint: 'Already agreed' },
                    ]} />
                </Section>

                <Section title="Page the client sees">
                    <div className="grid grid-cols-3 gap-2">
                        {BRANDS.map(b => (
                            <button
                                key={b.id}
                                type="button"
                                onClick={() => set({ selectedLogo: b.id })}
                                className={cn('relative flex h-16 flex-col items-center justify-center gap-1 rounded-xl border bg-zinc-950 px-2 transition-colors',
                                    form.selectedLogo === b.id ? 'border-emerald-500 ring-2 ring-neon-green/30' : 'border-black/10 dark:border-white/10')}
                            >
                                <img src={b.path} alt="" className="h-5 w-auto max-w-full object-contain" />
                                <span className="text-[10px] font-bold text-zinc-300">{b.label}</span>
                                {form.selectedLogo === b.id && <Check size={12} className="absolute right-1.5 top-1.5 text-neon-green" />}
                            </button>
                        ))}
                    </div>
                    <Field label="Note above the document" optional>
                        <textarea className={areaCls} rows={3} value={form.coverDescription} onChange={e => set({ coverDescription: e.target.value })} placeholder="A line or two for the client, e.g. what this covers and what you need from them." />
                    </Field>
                </Section>

                <Section title="Sign-off">
                    <div className="divide-y divide-black/[0.06] rounded-2xl border border-black/[0.06] px-4 py-2 dark:divide-white/[0.06] dark:border-white/[0.06]">
                        <div className="py-2"><Toggle label="Client can accept online" hint="Shows Accept and Decline on the link" checked={form.showSignatures} onChange={(v) => set({ showSignatures: v })} /></div>
                        <div className="py-2"><Toggle label="Newbi seal on acceptance" checked={form.showSeal} onChange={(v) => set({ showSeal: v })} /></div>
                    </div>
                    <SignatureField value={form.ourSignature} onChange={(v) => set({ ourSignature: v })} hint="Stamped on the PDF as signed by Newbi" />
                </Section>
            </form>
        </Sheet>
    );
};

export default UploadProposalModal;
