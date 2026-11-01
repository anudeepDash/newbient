import React, { useMemo, useRef, useState } from 'react';
import FileSpreadsheet from 'lucide-react/dist/esm/icons/file-spreadsheet';
import ClipboardPaste from 'lucide-react/dist/esm/icons/clipboard-paste';
import Upload from 'lucide-react/dist/esm/icons/upload';
import ShieldCheck from 'lucide-react/dist/esm/icons/shield-check';
import TriangleAlert from 'lucide-react/dist/esm/icons/triangle-alert';
import Sheet from '../../Sheet';
import { Button, Badge, Select } from '../../ui';
import { Choice, Field, fieldCls, areaCls } from '../../uploads/UploadKit';
import { Spinner } from '../parts';
import { cn } from '../../../../lib/utils';
import { useStore } from '../../../../lib/store';
import { IMPORT_FIELDS, MAX_IMPORT_ROWS, parseDelimited, detectColumns, rowsFromTable } from '../../../../lib/outreach/importSheet';
import { callOutreach } from './outreachApi';
import { followers } from './parts';

/*
 * Outreach → Import: a list of creators (pasted from Google Sheets, or a .csv
 * or .xlsx file) becomes applicants on this campaign, so the team can message
 * numbers that never filled the form. Only a phone number is needed; columns
 * are matched by their headers and can be changed before importing.
 * The server (api/_lib/outreachImport.js) skips numbers already on the campaign.
 */

const ORIGINS = [
    'Our creator Google Form',
    'Applied for an earlier campaign',
    'College or event sign-up sheet',
    'They messaged us on Instagram or WhatsApp',
];

const colName = (i) => String.fromCharCode(65 + (i % 26)) + (i >= 26 ? String(Math.floor(i / 26)) : '');

const ImportSheet = ({ open, onClose, campaign, applications, onImported, onShortlist }) => {
    const addToast = useStore(s => s.addToast);
    const fileRef = useRef(null);
    const [mode, setMode] = useState('paste');
    const [text, setText] = useState('');
    const [table, setTable] = useState([]);
    const [fileName, setFileName] = useState('');
    const [columns, setColumns] = useState({});
    const [hasHeader, setHasHeader] = useState(false);
    const [origin, setOrigin] = useState(ORIGINS[0]);
    const [originOther, setOriginOther] = useState('');
    const [agreed, setAgreed] = useState(false);
    const [then, setThen] = useState('applied');
    const [busy, setBusy] = useState(false);

    const load = (rows, name = '') => {
        const t = rows.slice(0, MAX_IMPORT_ROWS + 1);
        const d = detectColumns(t);
        setTable(t);
        setColumns(d.columns);
        setHasHeader(d.hasHeader);
        setFileName(name);
    };
    const onPaste = (v) => { setText(v); load(parseDelimited(v)); };
    const onFile = async (file) => {
        if (!file) return;
        try {
            if (/\.xlsx$/i.test(file.name)) {
                const { readXlsx } = await import('../../../../lib/xlsxRead');
                load(readXlsx(await file.arrayBuffer()), file.name);
            } else {
                load(parseDelimited(await file.text()), file.name);
            }
        } catch {
            addToast('Save it as .xlsx or .csv and try again.', 'error', { title: 'Couldn’t read that file' });
        }
    };

    const existingPhones = useMemo(() => new Set(applications.map(a => a.phone).filter(Boolean)), [applications]);
    const rows = useMemo(() => (table.length ? rowsFromTable(table, columns, hasHeader) : []), [table, columns, hasHeader]);
    const ready = rows.filter(r => !r.problem && !existingPhones.has(r.value.phone));
    const already = rows.filter(r => !r.problem && existingPhones.has(r.value.phone));
    const broken = rows.filter(r => r.problem);
    const width = Math.max(0, ...table.map(r => r.length));
    const hasPhoneCol = Object.values(columns).includes('phone');
    const tooMany = table.length - (hasHeader ? 1 : 0) > MAX_IMPORT_ROWS;
    const consentNote = (origin === 'other' ? originOther : origin).trim();
    const canImport = ready.length > 0 && agreed && consentNote.length >= 3 && !busy && !tooMany;

    const reset = () => {
        setText(''); setTable([]); setFileName(''); setColumns({}); setAgreed(false); setThen('applied'); setOriginOther('');
    };
    const close = () => { reset(); onClose(); };

    const submit = async () => {
        setBusy(true);
        const r = await callOutreach('outreach-import', {
            campaignId: campaign.id,
            consentNote,
            rows: ready.map(x => ({ line: x.line, ...x.value })),
        });
        if (!r.ok) {
            setBusy(false);
            addToast(r.error || 'Please try again.', 'error', { title: 'Not imported' });
            return;
        }
        const { added, existing, invalid } = r.data;
        const extra = [existing.length && `${existing.length} already on this campaign`, invalid.length && `${invalid.length} couldn’t be used`].filter(Boolean).join(', ');
        addToast(`${added.length} added${extra ? `; ${extra}` : ''}.`, added.length ? 'success' : 'info', { title: 'Sheet imported' });
        await onImported?.();
        if (then === 'shortlisted' && added.length) await onShortlist?.(added);
        setBusy(false);
        close();
    };

    const footer = (
        <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[12.5px] text-gray-500">{rows.length ? `${ready.length} ready${already.length ? ` · ${already.length} already here` : ''}${broken.length ? ` · ${broken.length} with problems` : ''}` : 'Nothing loaded yet'}</p>
            <div className="flex gap-2">
                <Button variant="ghost" onClick={close}>Cancel</Button>
                <Button variant="accent" disabled={!canImport} onClick={submit}>
                    {busy ? <Spinner /> : <FileSpreadsheet size={14} />} {ready.length ? `Import ${ready.length}` : 'Import'}
                </Button>
            </div>
        </div>
    );

    return (
        <Sheet open={open} onClose={close} title="Import a sheet" subtitle="Add creators who never filled the form: paste from Google Sheets or upload a file. Only a phone number is needed." size="lg" footer={footer}>
            <div className="space-y-5">
                <Choice
                    value={mode}
                    onChange={setMode}
                    options={[
                        { value: 'paste', label: 'Paste from a sheet', hint: 'Select the cells, copy, paste' },
                        { value: 'file', label: 'Upload a file', hint: '.xlsx or .csv' },
                    ]}
                />

                {mode === 'paste' ? (
                    <Field label="Rows from your sheet" hint="Include the header row (Name, Phone, Instagram…) if there is one. Up to 1,000 rows.">
                        <textarea className={cn(areaCls, 'min-h-[9rem] font-mono text-[13px]')} value={text} onChange={(e) => onPaste(e.target.value)} placeholder={'Name\tPhone\tInstagram\tFollowers\tCity\nRiya Sharma\t98765 43210\t@riya.creates\t12.4k\tLucknow'} spellCheck={false} />
                    </Field>
                ) : (
                    <div>
                        <input ref={fileRef} type="file" accept=".xlsx,.csv,text/csv" className="hidden" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ''; }} />
                        <button type="button" onClick={() => fileRef.current?.click()} className="flex w-full flex-col items-center gap-2 rounded-2xl border border-dashed border-black/15 px-4 py-8 text-center transition-colors hover:border-emerald-500/50 hover:bg-emerald-500/[0.03] dark:border-white/15">
                            <Upload size={20} className="text-gray-400" />
                            <span className="text-[14px] font-bold">{fileName || 'Choose a file'}</span>
                            <span className="text-[12px] text-gray-500">Excel (.xlsx) or CSV. The first sheet is read.</span>
                        </button>
                    </div>
                )}

                {table.length > 0 && (
                    <>
                        <section className="space-y-2">
                            <div className="flex items-center justify-between gap-2">
                                <h4 className="text-[13px] font-bold">Columns</h4>
                                <label className="flex items-center gap-2 text-[12px] font-semibold text-gray-500">
                                    <input type="checkbox" checked={hasHeader} onChange={(e) => setHasHeader(e.target.checked)} className="h-4 w-4 accent-emerald-600" /> First row is a header
                                </label>
                            </div>
                            <div className="grid gap-2 sm:grid-cols-2">
                                {Array.from({ length: width }, (_, i) => (
                                    <div key={i} className="flex items-center gap-2 rounded-xl border border-black/[0.06] px-3 py-2 dark:border-white/[0.08]">
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-[12.5px] font-bold">{hasHeader && table[0][i] ? table[0][i] : `Column ${colName(i)}`}</span>
                                            <span className="block truncate text-[11.5px] text-gray-500">{table[hasHeader ? 1 : 0]?.[i] || '—'}</span>
                                        </span>
                                        <Select
                                            label={`Column ${colName(i)}`}
                                            value={columns[i] || ''}
                                            onChange={(key) => setColumns(c => {
                                                const next = Object.fromEntries(Object.entries(c).filter(([, k]) => !key || k !== key));
                                                if (key) next[i] = key; else delete next[i];
                                                return next;
                                            })}
                                            options={[{ value: '', label: 'Skip' }, ...IMPORT_FIELDS.map(f => ({ value: f.key, label: f.label }))]}
                                        />
                                    </div>
                                ))}
                            </div>
                            {!hasPhoneCol && <p className="flex items-center gap-2 text-[12.5px] font-semibold text-amber-600 dark:text-amber-300"><TriangleAlert size={14} /> Pick which column has the phone numbers.</p>}
                            {tooMany && <p className="flex items-center gap-2 text-[12.5px] font-semibold text-rose-600"><TriangleAlert size={14} /> Up to {MAX_IMPORT_ROWS.toLocaleString('en-IN')} rows at a time. Split the sheet and import it in parts.</p>}
                        </section>

                        <section className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                                <h4 className="mr-auto text-[13px] font-bold">Preview</h4>
                                <Badge tone="green">{ready.length} ready</Badge>
                                {already.length > 0 && <Badge tone="gray">{already.length} already here</Badge>}
                                {broken.length > 0 && <Badge tone="rose">{broken.length} with problems</Badge>}
                            </div>
                            <div className="max-h-72 overflow-auto rounded-2xl border border-black/[0.06] dark:border-white/[0.08]">
                                <table className="w-full min-w-[560px] text-left text-[12.5px]">
                                    <thead className="sticky top-0 bg-white text-[11.5px] text-gray-500 dark:bg-[#14161d]">
                                        <tr>{['Row', 'Name', 'Phone', 'Instagram', 'Followers', 'City', ''].map(h => <th key={h} className="px-3 py-2 font-semibold">{h}</th>)}</tr>
                                    </thead>
                                    <tbody className="divide-y divide-black/[0.05] dark:divide-white/[0.06]">
                                        {rows.slice(0, 200).map(r => {
                                            const here = !r.problem && existingPhones.has(r.value.phone);
                                            return (
                                                <tr key={r.line} className={cn(r.problem && 'bg-rose-500/[0.04]', here && 'opacity-60')}>
                                                    <td className="px-3 py-1.5 tabular-nums text-gray-400">{r.line}</td>
                                                    <td className="max-w-[160px] truncate px-3 py-1.5 font-semibold">{r.value.fullName || '—'}</td>
                                                    <td className="whitespace-nowrap px-3 py-1.5 tabular-nums">{r.value.phone || '—'}</td>
                                                    <td className="max-w-[140px] truncate px-3 py-1.5">{r.value.instagramHandle ? `@${r.value.instagramHandle}` : '—'}</td>
                                                    <td className="px-3 py-1.5 tabular-nums">{r.value.followerCount !== null ? followers(r.value.followerCount) : '—'}</td>
                                                    <td className="max-w-[110px] truncate px-3 py-1.5">{r.value.city || '—'}</td>
                                                    <td className="whitespace-nowrap px-3 py-1.5">
                                                        {r.problem ? <Badge tone="rose">{r.problem}</Badge> : here ? <Badge tone="gray">Already here</Badge> : null}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            {rows.length > 200 && <p className="text-[11.5px] text-gray-500">Showing the first 200 of {rows.length.toLocaleString('en-IN')} rows; all of them are imported.</p>}
                        </section>

                        <section className="space-y-3 rounded-2xl bg-black/[0.02] p-4 dark:bg-white/[0.03]">
                            <p className="flex items-center gap-2 text-[13px] font-bold"><ShieldCheck size={15} className="text-emerald-600 dark:text-neon-green" /> Where did these numbers come from?</p>
                            <p className="text-[12px] leading-snug text-gray-500">WhatsApp only allows messages to people who agreed to hear from Newbi. Cold lists (bought, scraped, or numbers nobody gave us) get the number restricted. This note is saved as their consent record.</p>
                            <Select
                                label="Where the numbers came from"
                                value={origin}
                                onChange={setOrigin}
                                className="w-full"
                                options={[...ORIGINS.map(o => ({ value: o, label: o })), { value: 'other', label: 'Somewhere else…' }]}
                            />
                            {origin === 'other' && <input className={fieldCls} value={originOther} onChange={(e) => setOriginOther(e.target.value)} maxLength={200} placeholder="e.g. Signed up at our booth at Pinnaca 2025" />}
                            <label className="flex items-start gap-2.5 text-[13px] font-medium">
                                <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-emerald-600" />
                                These people gave their number to Newbi and expect to hear about creator campaigns.
                            </label>
                        </section>

                        <Field label="After importing">
                            <Choice
                                value={then}
                                onChange={setThen}
                                options={[
                                    { value: 'applied', label: 'Add as applicants', hint: 'Pick who to shortlist later' },
                                    { value: 'shortlisted', label: 'Shortlist them all', hint: 'Invite goes out like any shortlist' },
                                ]}
                            />
                        </Field>
                    </>
                )}

                {!table.length && (
                    <p className="flex items-start gap-2 rounded-xl bg-black/[0.02] p-3 text-[12.5px] leading-snug text-gray-500 dark:bg-white/[0.03]">
                        <ClipboardPaste size={14} className="mt-0.5 shrink-0" />
                        Columns are matched by their names (Name, Phone or WhatsApp, Instagram, Followers, City, Email, College, Category). Numbers already on this campaign are skipped, and anyone who replied STOP stays opted out.
                    </p>
                )}
            </div>
        </Sheet>
    );
};

export default ImportSheet;
