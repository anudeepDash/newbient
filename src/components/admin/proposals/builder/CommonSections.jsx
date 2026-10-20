import React, { useRef, useState } from 'react';
import FileText from 'lucide-react/dist/esm/icons/file-text';
import FileSpreadsheet from 'lucide-react/dist/esm/icons/file-spreadsheet';
import ImageIcon from 'lucide-react/dist/esm/icons/image';
import LinkIcon from 'lucide-react/dist/esm/icons/link';
import Upload from 'lucide-react/dist/esm/icons/upload';
import ExternalLink from 'lucide-react/dist/esm/icons/external-link';
import Stamp from 'lucide-react/dist/esm/icons/stamp';
import { cn } from '../../../../lib/utils';
import { useStore } from '../../../../lib/store';
import { useAccent, accent } from '../../theme';
import { Button } from '../../ui';
import Sheet from '../../Sheet';
import { BuilderCard } from '../../events/EditorParts';
import { Toggle, Field, fieldCls, SignatureField, UploadProgress, formatBytes } from '../../uploads/UploadKit';
import DocumentSeal from '../../../ui/DocumentSeal';
import { TextInput, RichField, ListCard, RowActions, AddButton, Chips, moveItem } from './parts';
import { LOGO_OPTIONS, addDaysKey, todayKey, newId } from './model';
import ThemedSelect from '../../ThemedSelect';

/* Builder sections shared by both proposal formats. */

const useSet = (setFormData) => (patch) => setFormData(prev => ({ ...prev, ...patch }));

const shortDate = (v) => {
    if (!v) return '';
    const d = typeof v?.toDate === 'function' ? v.toDate() : new Date(v);
    return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const ClientSection = ({ formData, setFormData, isV2 }) => {
    const set = useSet(setFormData);
    const hidden = formData.hiddenFields || [];
    const addressShown = !hidden.includes('clientAddress');
    return (
        <div className="space-y-5">
            <BuilderCard title="Client" hint="Who the proposal is for, as printed on the cover">
                <div className="space-y-3">
                    <TextInput label="Client name" value={formData.clientName} onChange={v => set({ clientName: v })} placeholder="Company or person" autoComplete="organization" />
                    {isV2 && <TextInput label="Line under the name" optional value={formData.clientSubtitle} onChange={v => set({ clientSubtitle: v })} placeholder="e.g. In association with Playworx" />}
                    <TextInput label="Address" optional value={formData.clientAddress} onChange={v => set({ clientAddress: v })} placeholder="Business address" />
                    {!isV2 && (
                        <Toggle
                            label="Show the address on the cover"
                            checked={addressShown}
                            onChange={v => setFormData(prev => {
                                const list = prev.hiddenFields || [];
                                return { ...prev, hiddenFields: v ? list.filter(f => f !== 'clientAddress') : [...list.filter(f => f !== 'clientAddress'), 'clientAddress'] };
                            })}
                        />
                    )}
                </div>
            </BuilderCard>
            <BuilderCard title="Contact" hint="Used to send the proposal. Not printed on it.">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <TextInput label="Contact person" optional value={formData.clientContactName} onChange={v => set({ clientContactName: v })} placeholder="Who you're dealing with" autoComplete="name" />
                    <TextInput label="Email" optional type="email" inputMode="email" autoCapitalize="off" value={formData.clientEmail} onChange={v => set({ clientEmail: v.trim() })} placeholder="name@company.com" />
                    <TextInput label="Phone or WhatsApp" optional type="tel" inputMode="tel" value={formData.clientPhone} onChange={v => set({ clientPhone: v })} placeholder="+91 98765 43210" hint="WhatsApp sharing opens a chat with this number." />
                </div>
            </BuilderCard>
        </div>
    );
};

export const DetailsSection = ({ formData, setFormData }) => {
    const set = useSet(setFormData);
    const a = useAccent();
    const validDays = [7, 15, 30, 45];
    return (
        <div className="space-y-5">
            <BuilderCard title="Proposal" hint="Number and how long the offer stands">
                <div className="space-y-3">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <TextInput label="Proposal number" value={formData.proposalNumber} onChange={v => set({ proposalNumber: v.toUpperCase() })} autoCapitalize="characters" placeholder="NBQ-1001" hint="The next number in the series is filled in for you." />
                        <div className="min-w-0">
                            <Field label="Valid until" optional hint="After this day the client can't accept it.">
                                <input type="date" className={fieldCls} value={formData.validUntil ? String(formData.validUntil).slice(0, 10) : ''} min={todayKey()} onChange={e => set({ validUntil: e.target.value || '' })} />
                            </Field>
                        </div>
                    </div>
                    <Chips
                        options={[...validDays.map(n => ({ label: `${n} days`, value: addDaysKey(n) })), { label: 'No expiry', value: '' }]}
                        value={formData.validUntil ? String(formData.validUntil).slice(0, 10) : ''}
                        onPick={v => set({ validUntil: v })}
                    />
                    {formData.createdAt && <p className="text-[12px] text-gray-500">Created {shortDate(formData.createdAt)}</p>}
                </div>
            </BuilderCard>
            <BuilderCard title="Brand" hint="Logo printed at the top of every page">
                <div className="grid grid-cols-3 gap-2">
                    {LOGO_OPTIONS.map(logo => {
                        const on = (formData.selectedLogo || 'entertainment') === logo.id;
                        return (
                            <button key={logo.id} type="button" onClick={() => set({ selectedLogo: logo.id })} aria-pressed={on}
                                className={cn('flex flex-col items-center gap-2 rounded-xl border p-2 text-[12px] font-bold transition-colors', on ? cn(a.border, a.soft) : 'border-black/10 hover:border-black/20 dark:border-white/10 dark:hover:border-white/20')}>
                                <span className="flex aspect-[4/3] w-full items-center justify-center rounded-lg bg-white p-2"><img src={logo.path} alt="" className="h-full w-full object-contain" /></span>
                                <span className="line-clamp-1">{logo.label.replace('Newbi ', '')}</span>
                            </button>
                        );
                    })}
                </div>
            </BuilderCard>
        </div>
    );
};

const PLACEMENTS = [
    ['default', 'Before the commercial terms'],
    ['cover', 'After the cover'],
    ['strategy', 'After the strategy'],
    ['scope', 'After the scope of work'],
    ['proposal', 'After the deliverables'],
    ['table', 'After the price table'],
    ['commercials', 'At the end'],
];

const TERMS_TEMPLATE = '<ul><li>50% advance on signing; balance on delivery.</li><li>GST extra as applicable.</li><li>Prices are valid until the date on this proposal.</li><li>Any change in scope will be quoted separately.</li><li>Payments are due within 15 days of each invoice.</li></ul>';

/** Extra pages: terms and conditions, timelines, anything else. */
export const CustomPagesSection = ({ formData, setFormData, isV2, onRefine }) => {
    const pages = formData.customPages || [];
    const setPages = (fn) => setFormData(prev => ({ ...prev, customPages: fn(prev.customPages || []) }));
    const update = (idx, patch) => setPages(l => l.map((p, i) => (i === idx ? { ...p, ...patch } : p)));
    const hidden = (formData.hiddenFields || []).includes('customPages');
    const hasTerms = pages.some(p => /terms/i.test(p.title || ''));
    return (
        <BuilderCard title="Terms and extra pages" hint={isV2 ? 'Added after the closing page' : 'Extra pages placed where you choose'}>
            {!isV2 && (
                <div className="mb-4 rounded-xl bg-black/[0.025] px-3 py-2 dark:bg-white/[0.03]">
                    <Toggle label="Show extra pages" checked={!hidden} onChange={v => setFormData(prev => { const l = prev.hiddenFields || []; return { ...prev, hiddenFields: v ? l.filter(f => f !== 'customPages') : [...l, 'customPages'] }; })} />
                </div>
            )}
            <div className="space-y-3">
                {pages.map((cp, idx) => (
                    <ListCard
                        key={cp.id || idx}
                        badge={idx + 1}
                        title={cp.title || 'Untitled page'}
                        actions={<RowActions index={idx} count={pages.length} onMove={(i, d) => setPages(l => moveItem(l, i, d))} onDuplicate={(i) => setPages(l => { const copy = { ...l[i], id: newId(), title: `${l[i].title || 'Page'} (copy)` }; return [...l.slice(0, i + 1), copy, ...l.slice(i + 1)]; })} onRemove={(i) => { if (window.confirm(`Remove the page "${pages[i].title || 'Untitled page'}"?`)) setPages(l => l.filter((_, j) => j !== i)); }} removeLabel="Remove page" />}
                    >
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <TextInput label="Page title" value={cp.title} onChange={v => update(idx, { title: v })} placeholder="e.g. Terms and conditions" />
                            <TextInput label="Small heading" optional value={cp.subtitle} onChange={v => update(idx, { subtitle: v })} />
                        </div>
                        {!isV2 && (
                            <Field label="Where it goes">
                                <ThemedSelect className={fieldCls} value={cp.insertAfter || 'default'} onChange={e => update(idx, { insertAfter: e.target.value })}>
                                    {PLACEMENTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                                </ThemedSelect>
                            </Field>
                        )}
                        <RichField label="Page text" minHeight={200} value={cp.content} onChange={v => update(idx, { content: v })} onRefine={() => onRefine?.({ label: cp.title || `Page ${idx + 1}`, value: cp.content, apply: (t) => update(idx, { content: t }) })} />
                    </ListCard>
                ))}
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {!hasTerms && <AddButton onClick={() => setPages(l => [...l, { id: newId(), title: 'Terms and conditions', subtitle: 'TERMS', content: TERMS_TEMPLATE, insertAfter: 'commercials' }])}>Add terms and conditions</AddButton>}
                    <AddButton onClick={() => setPages(l => [...l, { id: newId(), title: '', subtitle: '', content: '', insertAfter: 'default' }])}>Add a blank page</AddButton>
                </div>
            </div>
        </BuilderCard>
    );
};

export const SignaturesSection = ({ formData, setFormData, isV2 }) => {
    const set = useSet(setFormData);
    const hidden = (formData.hiddenFields || []).includes('signatures');
    const acceptOn = Boolean(formData.showSignatures);
    return (
        <div className="space-y-5">
            <BuilderCard title="Client acceptance" hint="How the client says yes">
                <Toggle
                    label="Let the client accept and sign online"
                    hint="They type their name, sign and confirm their email on the proposal page. Turn off to share it for reading only."
                    checked={acceptOn}
                    onChange={v => set({ showSignatures: v })}
                />
                {!isV2 && (
                    <div className="mt-3">
                        <Toggle label="Show the signature area on the document" checked={!hidden} onChange={v => setFormData(prev => { const l = prev.hiddenFields || []; return { ...prev, hiddenFields: v ? l.filter(f => f !== 'signatures') : [...l, 'signatures'] }; })} />
                    </div>
                )}
            </BuilderCard>
            <BuilderCard title="Our signature" hint={isV2 ? 'Kept with the proposal record.' : 'Printed on the commercial terms page.'}>
                <div className="space-y-3">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <TextInput label="Signed by" value={formData.senderName} onChange={v => set({ senderName: v })} placeholder="Authorised signatory" autoComplete="name" />
                        <TextInput label="Designation" value={formData.senderDesignation} onChange={v => set({ senderDesignation: v })} placeholder="e.g. Director" />
                    </div>
                    <SignatureField value={formData.providerSignature || null} onChange={v => set({ providerSignature: v || '' })} label="Signature" hint="Draw, type or upload. A clear signature on a white background works best." />
                </div>
            </BuilderCard>
            <BuilderCard title="Company seal" action={<span className={cn('flex h-9 w-9 items-center justify-center rounded-xl', accent('amber').chip)}><Stamp size={16} /></span>}>
                <Toggle label="Add the Newbi seal" hint={isV2 ? 'Kept with the proposal record.' : 'Stamped near the signatures.'} checked={Boolean(formData.showSeal)} onChange={v => set({ showSeal: v })} />
                {formData.showSeal && <div className="mt-3 flex justify-center overflow-hidden rounded-xl bg-white p-4"><DocumentSeal className="h-32 w-32" /></div>}
            </BuilderCard>
        </div>
    );
};

const ATTACH_TYPES = {
    pdf: { icon: FileText, tone: 'red', label: 'PDF' },
    spreadsheet: { icon: FileSpreadsheet, tone: 'green', label: 'Sheet' },
    image: { icon: ImageIcon, tone: 'violet', label: 'Image' },
    other: { icon: LinkIcon, tone: 'blue', label: 'Link' },
};
const fileTypeOf = (name = '') => {
    const ext = String(name).split('.').pop()?.toLowerCase() || '';
    if (ext === 'pdf') return 'pdf';
    if (['csv', 'xlsx', 'xls', 'tsv'].includes(ext)) return 'spreadsheet';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'image';
    return 'other';
};
const linkTypeOf = (url) => {
    const u = url.toLowerCase();
    if (/\.pdf(\?|#|$)/.test(u)) return 'pdf';
    if (u.includes('docs.google.com/spreadsheets') || /\.(csv|xlsx?)(\?|#|$)/.test(u) || u.includes('airtable.com')) return 'spreadsheet';
    if (/\.(png|jpe?g|webp|gif)(\?|#|$)/.test(u)) return 'image';
    return 'other';
};

const LinkSheet = ({ open, onClose, onAdd }) => {
    const [name, setName] = useState('');
    const [url, setUrl] = useState('');
    const [error, setError] = useState('');
    const submit = () => {
        let clean = url.trim();
        if (clean && !/^https?:\/\//i.test(clean)) clean = `https://${clean}`;
        try { new URL(clean); } catch { setError("That doesn't look like a web link."); return; }
        onAdd({ id: newId(), name: name.trim() || clean.replace(/^https?:\/\//, '').slice(0, 60), url: clean, type: 'link', fileType: linkTypeOf(clean) });
        setName(''); setUrl(''); setError('');
        onClose();
    };
    return (
        <Sheet open={open} onClose={onClose} variant="dialog" size="sm" title="Add a link" subtitle="Google Sheets, a Drive file, a deck, anything online"
            footer={<div className="flex gap-2"><Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button><Button variant="accent" className="flex-1" onClick={submit} disabled={!url.trim()}>Add link</Button></div>}>
            <div className="space-y-3">
                <TextInput label="Link" type="url" inputMode="url" autoCapitalize="off" value={url} onChange={v => { setUrl(v); setError(''); }} placeholder="https://docs.google.com/…" autoFocus />
                <TextInput label="Name" optional value={name} onChange={setName} placeholder="e.g. Budget sheet" />
                {error && <p role="alert" className="text-[13px] font-semibold text-red-600 dark:text-red-400">{error}</p>}
            </div>
        </Sheet>
    );
};

export const AttachmentsSection = ({ formData, setFormData }) => {
    const list = formData.attachments || [];
    const setList = (fn) => setFormData(prev => ({ ...prev, attachments: fn(prev.attachments || []) }));
    const inputRef = useRef(null);
    const [progress, setProgress] = useState(null);
    const [linkOpen, setLinkOpen] = useState(false);
    const addToast = useStore(s => s.addToast);

    const upload = async (file) => {
        if (!file || progress !== null) return;
        if (file.size > 35 * 1024 * 1024) { addToast(`That file is ${formatBytes(file.size)}. The limit is 35 MB.`, 'warning', { title: 'File too large' }); return; }
        setProgress(0);
        try {
            const res = await useStore.getState().uploadProposalFile(file, (p) => setProgress(p));
            if (!res?.url) throw new Error('No link came back');
            setList(l => [...l, { id: newId(), name: file.name, url: res.url, type: 'file', fileType: fileTypeOf(file.name), size: file.size }]);
            addToast('File attached.', 'success');
        } catch (err) {
            console.error('Attachment upload failed', err);
            addToast(err?.message?.includes('large') ? err.message : 'Check your connection and try again.', 'error', { title: 'File not attached', action: { label: 'Try again', onClick: () => upload(file) } });
        } finally {
            setProgress(null);
        }
    };

    return (
        <BuilderCard title="Attachments" hint="Files and links the client can open from the proposal">
            <div className="space-y-3">
                {list.length === 0 && <p className="rounded-xl bg-black/[0.03] p-4 text-center text-[13px] text-gray-500 dark:bg-white/[0.03]">Nothing attached yet. Add a budget sheet, a deck or a reference PDF.</p>}
                {list.map((att, idx) => {
                    const t = ATTACH_TYPES[att.fileType] || ATTACH_TYPES.other;
                    return (
                        <div key={att.id || idx} className="flex items-center gap-2 rounded-2xl border border-black/[0.08] p-2 dark:border-white/[0.08]">
                            <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', accent(t.tone).chip)}><t.icon size={18} /></span>
                            <div className="min-w-0 flex-1">
                                <input aria-label="Attachment name" className="h-9 w-full rounded-lg bg-transparent px-1 text-[14px] font-semibold outline-none focus:bg-black/[0.03] dark:focus:bg-white/[0.05]" value={att.name || ''} onChange={e => setList(l => l.map((x, i) => (i === idx ? { ...x, name: e.target.value } : x)))} />
                                <p className="px-1 text-[11.5px] text-gray-500">{att.type === 'file' ? `${t.label} file${att.size ? ` · ${formatBytes(att.size)}` : ''}` : `${t.label} · link`}</p>
                            </div>
                            <a href={att.url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${att.name}`} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-gray-500 hover:bg-black/5 dark:hover:bg-white/10"><ExternalLink size={15} /></a>
                            <RowActions index={idx} count={list.length} onMove={(i, d) => setList(l => moveItem(l, i, d))} onRemove={(i) => { if (window.confirm(`Remove ${list[i].name || 'this attachment'}?`)) setList(l => l.filter((_, j) => j !== i)); }} removeLabel="Remove attachment" />
                        </div>
                    );
                })}
                {progress !== null && <UploadProgress percent={progress} step="Uploading…" />}
                <div className="grid grid-cols-2 gap-2">
                    <Button variant="secondary" className="h-12" onClick={() => inputRef.current?.click()} disabled={progress !== null}><Upload size={15} /> Upload file</Button>
                    <Button variant="secondary" className="h-12" onClick={() => setLinkOpen(true)}><LinkIcon size={15} /> Add link</Button>
                </div>
                <p className="text-[11.5px] text-gray-500">PDF, Excel, CSV or images, up to 35 MB.</p>
                <input ref={inputRef} type="file" className="hidden" accept=".pdf,.csv,.xlsx,.xls,.tsv,.jpg,.jpeg,.png,.webp,.gif" onChange={e => { upload(e.target.files?.[0]); e.target.value = ''; }} />
            </div>
            <LinkSheet open={linkOpen} onClose={() => setLinkOpen(false)} onAdd={(att) => setList(l => [...l, att])} />
        </BuilderCard>
    );
};
