import React, { useEffect, useMemo, useRef, useState } from 'react';
import Upload from 'lucide-react/dist/esm/icons/upload';
import Download from 'lucide-react/dist/esm/icons/download';
import UserCheck from 'lucide-react/dist/esm/icons/user-check';
import X from 'lucide-react/dist/esm/icons/x';
import { cn } from '../../../lib/utils';
import { downloadCsv, exportSubtitle, fileDate } from '../../../lib/xlsx';
import Sheet from '../Sheet';
import { Avatar, Badge, Button } from '../ui';
import { Toggle } from '../uploads/UploadKit';
import { Spinner } from './parts';
import { creatorPhotoOf } from './campaignModel';
import { ROW_STATUS, clientSheetSpec, readShortlistCsv } from './shortlistModel';

/*
 * "Upload shortlist": the client's copy of the client sheet comes back, and
 * the creators they picked are shortlisted in one go.
 *
 *   Choose (or drop) the CSV → every row is matched to an applicant → skip any
 *   row you don't want → "Shortlist N". The welcome (email, WhatsApp and the app,
 *   with the group link) goes out unless you switch it off.
 */
const ShortlistUploadSheet = ({ open, onClose, campaign, applicants, onShortlist }) => {
    const input = useRef(null);
    const [name, setName] = useState('');
    const [parsed, setParsed] = useState(null);
    const [error, setError] = useState(null);
    const [skipped, setSkipped] = useState(() => new Set());
    const [welcome, setWelcome] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!open) return;
        setName(''); setParsed(null); setError(null); setSkipped(new Set()); setWelcome(true); setSaving(false);
    }, [open]);

    const read = async (file) => {
        if (!file) return;
        if (!/\.csv$/i.test(file.name) && file.type !== 'text/csv') { setError('Choose a CSV file. In Excel or Google Sheets: File → Download → CSV.'); return; }
        const result = readShortlistCsv(await file.text(), applicants);
        setName(file.name);
        setError(result.error);
        setParsed(result.error ? null : result);
        setSkipped(new Set());
    };

    const rows = useMemo(() => parsed?.rows || [], [parsed]);
    const toShortlist = rows.filter(r => r.status === 'ready' && !skipped.has(r.row)).map(r => r.entry);
    const counts = rows.reduce((m, r) => ({ ...m, [r.status]: (m[r.status] || 0) + 1 }), {});

    const downloadSheet = () => downloadCsv(clientSheetSpec(campaign, applicants, { fileDate, exportSubtitle }));

    const confirm = async () => {
        if (!toShortlist.length || saving) return;
        setSaving(true);
        try {
            await onShortlist(toShortlist, welcome);
            onClose();
        } finally {
            setSaving(false);
        }
    };

    const footer = (
        <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose} disabled={saving} className="h-11 flex-1 sm:flex-none">Cancel</Button>
            <Button variant="accent" onClick={confirm} disabled={!toShortlist.length || saving} className="h-11 flex-1">
                {saving ? <Spinner /> : <UserCheck size={14} />} Shortlist {toShortlist.length || ''}
            </Button>
        </div>
    );

    return (
        <Sheet
            open={open}
            onClose={saving ? () => {} : onClose}
            title="Upload shortlist"
            subtitle="The client sheet, with “Yes” in the Shortlist column for each pick."
            size="lg"
            footer={footer}
        >
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                    <Button onClick={downloadSheet} className="h-11 sm:justify-start"><Download size={14} /> Client sheet</Button>
                    <Button onClick={() => input.current?.click()} disabled={saving} className="h-11 sm:justify-start"><Upload size={14} /> {name ? 'Choose another' : 'Choose CSV'}</Button>
                    <input ref={input} type="file" accept=".csv,text/csv" className="hidden" onChange={e => { read(e.target.files?.[0]); e.target.value = ''; }} />
                </div>
                <div
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => { e.preventDefault(); read(e.dataTransfer.files?.[0]); }}
                    className="rounded-xl border-black/10 text-[13px] text-gray-500 dark:border-white/10 sm:border-2 sm:border-dashed sm:px-4 sm:py-4 sm:text-center"
                >
                    <span className="hidden sm:inline">Drop the CSV here. </span>
                    Creators are found by Newbi ID, then Instagram, email or phone. No Shortlist column? Every row in the file counts as a pick.
                </div>
                {error && <p role="alert" className="text-[13px] font-semibold text-rose-600 dark:text-rose-300">{error}</p>}

                {rows.length > 0 && (
                    <>
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="truncate text-[13px] font-semibold">{name}</span>
                            {Object.entries(counts).map(([k, n]) => <Badge key={k} tone={ROW_STATUS[k].tone}>{n} {ROW_STATUS[k].label.toLowerCase()}</Badge>)}
                        </div>
                        <ul className="space-y-1.5 sm:max-h-[44dvh] sm:overflow-y-auto">
                            {rows.filter(r => r.status !== 'notPicked').map(r => {
                                const off = r.status !== 'ready' || skipped.has(r.row);
                                return (
                                    <li key={r.row} className={cn('flex min-h-[52px] items-center gap-3 rounded-xl border px-3 py-2', off ? 'border-black/[0.05] bg-black/[0.02] dark:border-white/[0.06] dark:bg-white/[0.02]' : 'border-black/[0.08] dark:border-white/[0.1]')}>
                                        <span className="w-12 shrink-0 text-[11px] font-semibold text-gray-400">Row {r.row}</span>
                                        {r.entry && <Avatar src={creatorPhotoOf(r.entry.creator)} name={r.entry.creator.name} size={30} />}
                                        <span className={cn('min-w-0 flex-1 truncate text-[14px] font-semibold', off && 'text-gray-500')}>{r.label}</span>
                                        <Badge tone={skipped.has(r.row) ? 'gray' : ROW_STATUS[r.status].tone}>{skipped.has(r.row) ? 'Skipped' : ROW_STATUS[r.status].label}</Badge>
                                        {r.status === 'ready' && (
                                            <button
                                                type="button"
                                                onClick={() => setSkipped(s => { const n = new Set(s); if (n.has(r.row)) n.delete(r.row); else n.add(r.row); return n; })}
                                                aria-label={skipped.has(r.row) ? 'Include row' : 'Skip row'}
                                                className="flex h-9 shrink-0 items-center rounded-lg px-2 text-[12px] font-semibold text-gray-500 hover:bg-black/5 dark:hover:bg-white/5"
                                            >
                                                {skipped.has(r.row) ? 'Include' : <><X size={13} /> Skip</>}
                                            </button>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                        {counts.unknown > 0 && (
                            <p className="text-[12px] text-amber-700 dark:text-amber-300">Rows marked “Not an applicant” didn’t match anyone who applied. Check the Newbi ID or handle; creators must apply in the app first.</p>
                        )}
                        <div className="rounded-xl border border-black/[0.06] px-3.5 py-2.5 dark:border-white/[0.08]">
                            <Toggle
                                label="Send the welcome"
                                hint={`Email, WhatsApp and an app notification${campaign?.whatsappLink ? ', with the group link' : '. Add a WhatsApp group link in the editor to include it'}.`}
                                checked={welcome}
                                onChange={setWelcome}
                            />
                        </div>
                    </>
                )}
            </div>
        </Sheet>
    );
};

export default ShortlistUploadSheet;
