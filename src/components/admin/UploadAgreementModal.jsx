import React, { useCallback, useEffect, useState } from 'react';
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down';
import { useStore } from '../../lib/store';
import { cn } from '../../lib/utils';
import { guessFields, nameFromFileName } from '../../lib/pdfInspect';
import { todayKey } from '../../lib/invoicing';
import Sheet from './Sheet';
import { Button } from './ui';
import {
    Choice, DocumentDrop, Field, Section, SignatureField, Toggle, UploadProgress,
    areaCls, fieldCls, formatBytes, useDocumentIntake,
} from './uploads/UploadKit';
import ThemedSelect from './ThemedSelect';

/*
 * Host a contract drafted elsewhere (by a lawyer, or the other side). The other
 * party gets a Newbi link to read and e-sign it; you see when they open it and
 * when it's signed.
 */

const TYPES = [
    'Service Agreement',
    'Influencer Agreement',
    'Non-Disclosure Agreement (NDA)',
    'Memorandum of Understanding (MOU)',
    'Talent Management Agreement',
    'Brand Partnership Contract',
    'Consultancy Agreement',
    'Custom Contract',
];
const TYPE_FROM_TEXT = {
    'non-disclosure': 2, 'non disclosure': 2, nondisclosure: 2, nda: 2,
    'memorandum of understanding': 3, mou: 3,
    influencer: 1, 'talent management': 4, 'brand partnership': 5, consultancy: 6, service: 0,
};

const OUR_COMPANY = { name: 'Newbi Entertainment & Marketing LLP', email: 'legal@newbi.live' };

const newNumber = () => `NB-AGR-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

const emptyForm = () => ({
    agreementNumber: newNumber(), template: 'Service Agreement', projectName: '', effectiveDate: todayKey(), status: 'Draft',
    clientName: '', clientEmail: '', clientAddress: '',
    providerName: OUR_COMPANY.name, providerEmail: OUR_COMPANY.email,
    providerSignatoryName: 'Authorized Signatory', providerDesignation: 'Director of Operations',
    currency: 'INR', totalValue: '',
    showSignatures: true, showSeal: true, providerSignature: null, coverDescription: '',
});

const fromAgreement = (a) => ({
    agreementNumber: a.agreementNumber || '',
    template: a.template || a.type || 'Service Agreement',
    projectName: a.details?.projectName || '',
    effectiveDate: a.effectiveDate ? String(a.effectiveDate).split('T')[0] : todayKey(),
    status: a.status || 'Draft',
    clientName: a.parties?.secondParty?.name || a.clientName || '',
    clientEmail: a.parties?.secondParty?.email || a.clientEmail || '',
    clientAddress: a.parties?.secondParty?.address || '',
    providerName: a.parties?.firstParty?.name || OUR_COMPANY.name,
    providerEmail: a.parties?.firstParty?.email || OUR_COMPANY.email,
    providerSignatoryName: a.providerName || 'Authorized Signatory',
    providerDesignation: a.providerDesignation || 'Director of Operations',
    currency: a.commercials?.currency || 'INR',
    totalValue: a.commercials?.totalValue || a.amount || '',
    showSignatures: a.showSignatures !== false,
    showSeal: a.showSeal !== false,
    providerSignature: a.providerSignature || a.ourSignature || null,
    coverDescription: a.coverDescription || a.details?.purpose || '',
});

const UploadAgreementModal = ({ isOpen, onClose, editingAgreement = null, onSuccess }) => {
    const [form, setForm] = useState(emptyForm);
    const [auto, setAuto] = useState({});
    const [saving, setSaving] = useState(null);
    const [error, setError] = useState('');
    const [showCompany, setShowCompany] = useState(false);

    const set = (patch) => {
        setForm(f => ({ ...f, ...patch }));
        setAuto(a => { const next = { ...a }; Object.keys(patch).forEach(k => delete next[k]); return next; });
    };

    const onRead = useCallback((info, file) => {
        const g = guessFields(info.lines, 'contract');
        setForm(f => {
            const patch = {};
            const filled = {};
            const put = (k, v) => { if (v && !String(f[k] || '').trim()) { patch[k] = v; filled[k] = true; } };
            put('clientName', g.name || nameFromFileName(file.name));
            put('clientEmail', g.email);
            put('totalValue', g.amount ? String(g.amount) : '');
            if (g.effectiveDate && f.effectiveDate === todayKey()) { patch.effectiveDate = g.effectiveDate; filled.effectiveDate = true; }
            const typeIndex = g.type ? TYPE_FROM_TEXT[g.type] : undefined;
            if (typeIndex !== undefined && f.template === 'Service Agreement') { patch.template = TYPES[typeIndex]; filled.template = true; }
            setAuto(filled);
            return { ...f, ...patch };
        });
    }, []);

    const intake = useDocumentIntake({ onRead });
    const existing = editingAgreement?.fileUrl ? { name: editingAgreement.fileName || 'Contract document', size: editingAgreement.fileSize, url: editingAgreement.fileUrl } : null;

    useEffect(() => {
        if (!isOpen) return;
        setForm(editingAgreement ? fromAgreement(editingAgreement) : emptyForm());
        setAuto({});
        setSaving(null);
        setError('');
        setShowCompany(false);
        intake.clear();
    }, [isOpen, editingAgreement]); // eslint-disable-line react-hooks/exhaustive-deps

    const submit = async (e) => {
        e.preventDefault();
        setError('');
        if (!intake.file && !existing) return setError('Add the contract file first.');
        if (!form.clientName.trim()) return setError('Enter the other party.');

        const { uploadAgreementFile, addAgreement, updateAgreement, addToast } = useStore.getState();
        // Never move a signed contract back to an earlier stage by re-saving.
        const status = editingAgreement?.status === 'Executed' ? 'Executed' : form.status;

        try {
            let fileUrl = editingAgreement?.fileUrl || '';
            let fileName = editingAgreement?.fileName || '';
            let fileSize = editingAgreement?.fileSize || '';
            let fileType = editingAgreement?.fileType || 'pdf';

            if (intake.file) {
                setSaving({ percent: 5, step: 'Uploading' });
                const result = await uploadAgreementFile(intake.file, (p) => setSaving({ percent: Math.max(5, p * 0.95), step: 'Uploading' }));
                if (!result?.url) throw new Error("Couldn't upload the file.");
                fileUrl = result.url;
                fileName = result.fileName || intake.file.name;
                fileSize = formatBytes(result.fileSize || intake.file.size);
                fileType = result.fileType || 'pdf';
            }

            setSaving({ percent: 98, step: 'Saving' });
            const client = form.clientName.trim();
            const data = {
                agreementNumber: form.agreementNumber.trim() || newNumber(),
                type: form.template,
                template: form.template,
                status,
                effectiveDate: form.effectiveDate || todayKey(),
                parties: {
                    firstParty: {
                        name: form.providerName.trim() || OUR_COMPANY.name,
                        email: form.providerEmail.trim() || OUR_COMPANY.email,
                        role: 'Service Provider',
                        address: editingAgreement?.parties?.firstParty?.address || 'Bangalore, India',
                    },
                    secondParty: {
                        name: client,
                        email: form.clientEmail.trim(),
                        address: form.clientAddress.trim(),
                        role: 'Client',
                    },
                },
                details: {
                    ...(editingAgreement?.details || {}),
                    projectName: form.projectName.trim() || `${form.template} - ${client}`,
                    purpose: form.coverDescription.trim(),
                    territory: editingAgreement?.details?.territory || 'India',
                },
                commercials: {
                    ...(editingAgreement?.commercials || {}),
                    totalValue: form.totalValue ? String(form.totalValue).trim() : '',
                    currency: form.currency || 'INR',
                    paymentSchedule: editingAgreement?.commercials?.paymentSchedule || 'As per mutually executed instrument schedule.',
                    gstIncluded: editingAgreement?.commercials?.gstIncluded ?? true,
                },
                clauses: editingAgreement?.clauses || [],
                showSignatures: form.showSignatures,
                showSeal: form.showSeal,
                providerSignature: form.providerSignature,
                providerName: form.providerSignatoryName.trim() || 'Authorized Signatory',
                providerDesignation: form.providerDesignation.trim() || 'Director of Operations',
                ourSignature: form.providerSignature,
                coverDescription: form.coverDescription.trim(),
                isUploaded: true,
                fileUrl,
                fileName,
                fileSize,
                fileType,
                pageCount: intake.info?.pages || editingAgreement?.pageCount || null,
                updatedAt: new Date().toISOString(),
            };

            let id = editingAgreement?.id;
            if (id) {
                await updateAgreement(id, data);
                addToast('Contract updated.', 'success');
            } else {
                id = await addAgreement(data);
                addToast('Contract added. Share the signing link from its details.', 'success');
            }
            onSuccess?.(id);
            onClose();
        } catch (err) {
            console.error('Error saving uploaded contract:', err);
            setError(err.message || "Couldn't save the contract. Please try again.");
        } finally {
            setSaving(null);
        }
    };

    const busy = Boolean(saving);
    const signed = editingAgreement?.status === 'Executed';

    return (
        <Sheet
            open={isOpen}
            onClose={busy ? () => {} : onClose}
            size="lg"
            title={editingAgreement ? 'Edit uploaded contract' : 'Add a contract'}
            subtitle="The other party gets a link to read and e-sign it, and you see when they open it"
            footer={(
                <div className="space-y-3">
                    {busy && <UploadProgress percent={saving.percent} step={saving.step} />}
                    {error && <p role="alert" className="text-[13px] font-semibold text-red-600 dark:text-red-400">{error}</p>}
                    <div className="flex gap-2">
                        <Button variant="ghost" onClick={onClose} disabled={busy} className="h-12">Cancel</Button>
                        <Button variant="primary" type="submit" form="upload-contract-form" disabled={busy || intake.reading} className="h-12 flex-1">
                            {busy ? 'Saving…' : editingAgreement ? 'Save changes' : 'Add contract'}
                        </Button>
                    </div>
                </div>
            )}
        >
            <form id="upload-contract-form" onSubmit={submit} className="space-y-7" noValidate>
                <DocumentDrop
                    intake={intake}
                    existing={existing}
                    disabled={busy}
                    accept=".pdf,.doc,.docx,application/pdf"
                    label="Drop the contract"
                    sub="PDF works best: we read the parties, value and date from it"
                />

                <Section title="Other party">
                    <Field label="Name" auto={auto.clientName}>
                        <input className={fieldCls} value={form.clientName} onChange={e => set({ clientName: e.target.value })} placeholder="Company or person signing with us" />
                    </Field>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <Field label="Email" optional auto={auto.clientEmail} hint="Where the signing link goes">
                            <input className={fieldCls} type="email" inputMode="email" autoCapitalize="off" value={form.clientEmail} onChange={e => set({ clientEmail: e.target.value })} />
                        </Field>
                        <Field label="Address" optional>
                            <input className={fieldCls} value={form.clientAddress} onChange={e => set({ clientAddress: e.target.value })} />
                        </Field>
                    </div>
                </Section>

                <Section title="Contract">
                    <div className="grid gap-3 sm:grid-cols-2">
                        <Field label="Type" auto={auto.template}>
                            <ThemedSelect className={fieldCls} value={form.template} onChange={e => set({ template: e.target.value })}>
                                {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                            </ThemedSelect>
                        </Field>
                        <Field label="Title" optional>
                            <input className={fieldCls} value={form.projectName} onChange={e => set({ projectName: e.target.value })} placeholder={`${form.template} - ${form.clientName || 'Client'}`} />
                        </Field>
                    </div>
                    <div className="grid grid-cols-[1fr_96px] gap-3 sm:grid-cols-[1fr_110px_1fr]">
                        <Field label="Value" optional auto={auto.totalValue}>
                            <input className={fieldCls} type="number" inputMode="decimal" min="0" value={form.totalValue} onChange={e => set({ totalValue: e.target.value })} placeholder="0" />
                        </Field>
                        <Field label="Currency">
                            <ThemedSelect className={fieldCls} value={form.currency} onChange={e => set({ currency: e.target.value })}>
                                {['INR', 'USD', 'EUR', 'GBP', 'AED'].map(c => <option key={c} value={c}>{c}</option>)}
                            </ThemedSelect>
                        </Field>
                        <Field label="Effective from" auto={auto.effectiveDate} className="col-span-2 sm:col-span-1">
                            <input className={fieldCls} type="date" value={form.effectiveDate} onChange={e => set({ effectiveDate: e.target.value })} />
                        </Field>
                    </div>
                    <Field label="Contract no.">
                        <input className={cn(fieldCls, 'font-mono')} value={form.agreementNumber} onChange={e => set({ agreementNumber: e.target.value.toUpperCase() })} autoCapitalize="characters" />
                    </Field>
                </Section>

                <Section title="Where it stands">
                    {signed ? (
                        <p className="rounded-xl bg-neon-green/[0.08] p-3 text-[13px] font-semibold text-emerald-700 dark:text-neon-green">Signed. This stays executed whatever you edit here.</p>
                    ) : (
                        <Choice value={form.status} onChange={(v) => set({ status: v })} options={[
                            { value: 'Draft', label: 'Draft', hint: 'Still being agreed' },
                            { value: 'Final', label: 'Ready to sign', hint: 'Send the link' },
                            { value: 'Executed', label: 'Signed', hint: 'Signed on paper' },
                        ]} />
                    )}
                </Section>

                <Section title="Signing">
                    <div className="divide-y divide-black/[0.06] rounded-2xl border border-black/[0.06] px-4 py-2 dark:divide-white/[0.06] dark:border-white/[0.06]">
                        <div className="py-2"><Toggle label="Other party signs online" hint="Adds signature blocks to the link" checked={form.showSignatures} onChange={(v) => set({ showSignatures: v })} /></div>
                        <div className="py-2"><Toggle label="Newbi seal on signing" checked={form.showSeal} onChange={(v) => set({ showSeal: v })} /></div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <Field label="Signing for Newbi">
                            <input className={fieldCls} value={form.providerSignatoryName} onChange={e => set({ providerSignatoryName: e.target.value })} />
                        </Field>
                        <Field label="Designation">
                            <input className={fieldCls} value={form.providerDesignation} onChange={e => set({ providerDesignation: e.target.value })} />
                        </Field>
                    </div>
                    <SignatureField value={form.providerSignature} onChange={(v) => set({ providerSignature: v })} hint="Shown as already signed by Newbi" />
                    <button type="button" onClick={() => setShowCompany(v => !v)} className="flex items-center gap-1.5 text-[12px] font-semibold text-gray-500">
                        Our company details <ChevronDown size={13} className={cn('transition-transform', showCompany && 'rotate-180')} />
                    </button>
                    {showCompany && (
                        <div className="grid gap-3 sm:grid-cols-2">
                            <Field label="Company name"><input className={fieldCls} value={form.providerName} onChange={e => set({ providerName: e.target.value })} /></Field>
                            <Field label="Company email"><input className={fieldCls} type="email" value={form.providerEmail} onChange={e => set({ providerEmail: e.target.value })} /></Field>
                        </div>
                    )}
                </Section>

                <Section>
                    <Field label="Note above the contract" optional>
                        <textarea className={areaCls} rows={3} value={form.coverDescription} onChange={e => set({ coverDescription: e.target.value })} placeholder="e.g. Please review clause 4 on usage rights before signing." />
                    </Field>
                </Section>
            </form>
        </Sheet>
    );
};

export default UploadAgreementModal;
