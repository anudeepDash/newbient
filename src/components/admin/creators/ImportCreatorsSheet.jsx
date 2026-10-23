import React, { useMemo, useRef, useState } from 'react';
import Upload from 'lucide-react/dist/esm/icons/upload';
import Download from 'lucide-react/dist/esm/icons/download';
import FileSpreadsheet from 'lucide-react/dist/esm/icons/file-spreadsheet';
import CheckCircle from 'lucide-react/dist/esm/icons/circle-check';
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle';
import Copy from 'lucide-react/dist/esm/icons/copy';
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import { useStore } from '../../../lib/store';
import { cn } from '../../../lib/utils';
import { downloadCsv } from '../../../lib/xlsx';
import GoogleSheetsButton from '../GoogleSheetsButton';
import Sheet from '../Sheet';
import { Button, Badge, SegmentedTabs, StatTile } from '../ui';
import { Choice, Toggle, UploadProgress } from '../uploads/UploadKit';
import { analyseImport, importPayload, IMPORT_TEMPLATE_HEADERS, IMPORT_TEMPLATE_SAMPLE } from './creatorData';

/*
 * Import creators from a spreadsheet: pick a CSV, check every row (required
 * fields, phone/email format, college for campus creators, duplicates against
 * the roster and within the file), then import only the good rows.
 */

const MAX_ROWS = 1000;
const CONCURRENCY = 3;

const templateSpec = () => ({
    filename: 'newbi-creator-import-template',
    columns: IMPORT_TEMPLATE_HEADERS.map((header, i) => ({ header, value: r => r[i] })),
    rows: [IMPORT_TEMPLATE_SAMPLE],
});
const downloadTemplate = () => downloadCsv(templateSpec());

const ImportCreatorsSheet = ({ open, onClose, creators }) => {
    const addToast = useStore(s => s.addToast);
    const inputRef = useRef(null);
    const [fileName, setFileName] = useState('');
    const [analysis, setAnalysis] = useState(null); // { rows } | { error }
    const [status, setStatus] = useState('approved');
    const [sendWelcome, setSendWelcome] = useState(false);
    const [tab, setTab] = useState('ready');
    const [dragging, setDragging] = useState(false);
    const [running, setRunning] = useState(false);
    const [progress, setProgress] = useState({ done: 0, total: 0 });
    const [result, setResult] = useState(null); // { imported, failed: [{line, name, error}] }

    const reset = () => {
        setFileName('');
        setAnalysis(null);
        setTab('ready');
        setProgress({ done: 0, total: 0 });
        setResult(null);
    };

    const close = () => {
        if (running) return;
        reset();
        onClose?.();
    };

    const readFile = (file) => {
        if (!file) return;
        if (!/\.csv$/i.test(file.name) && file.type !== 'text/csv') {
            setFileName(file.name);
            setAnalysis({ error: 'Choose a .csv file. In Excel or Google Sheets use File → Download → CSV.' });
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            const res = analyseImport(e.target.result, creators);
            if (!res.error && res.rows.length > MAX_ROWS) {
                setAnalysis({ error: `That file has ${res.rows.length} rows. Import up to ${MAX_ROWS} at a time.` });
            } else {
                setAnalysis(res);
                setTab(res.rows?.some(r => r.ok) ? 'ready' : 'skipped');
            }
            setFileName(file.name);
            setResult(null);
        };
        reader.onerror = () => setAnalysis({ error: "Couldn't read that file. Please try again." });
        reader.readAsText(file);
    };

    const rows = useMemo(() => analysis?.rows || [], [analysis]);
    const ready = rows.filter(r => r.ok);
    const skipped = rows.filter(r => !r.ok);
    const duplicates = skipped.filter(r => r.duplicate).length;
    const shownRows = tab === 'ready' ? ready : skipped;

    const runImport = async () => {
        if (running || !ready.length) return;
        setRunning(true);
        setProgress({ done: 0, total: ready.length });
        const { addCreator } = useStore.getState();
        const failed = [];
        let imported = 0;
        let cursor = 0;
        // A few at a time: fast, without flooding the server.
        const worker = async () => {
            while (cursor < ready.length) {
                const row = ready[cursor++];
                try {
                    await addCreator(importPayload(row, status), sendWelcome);
                    imported++;
                } catch (err) {
                    failed.push({ line: row.line, name: row.data.name, error: err?.message || 'Failed' });
                }
                setProgress(p => ({ ...p, done: p.done + 1 }));
            }
        };
        await Promise.all(Array.from({ length: Math.min(CONCURRENCY, ready.length) }, worker));
        failed.sort((a, b) => a.line - b.line);
        setRunning(false);
        setResult({ imported, failed });
        if (imported) addToast(failed.length ? `${failed.length} couldn't be imported. See the reasons in the list.` : `Imported ${imported} creator${imported === 1 ? '' : 's'}.`, failed.length ? 'warning' : 'success',
            failed.length ? { title: `Imported ${imported} of ${imported + failed.length}` } : undefined);
        else addToast('See the reasons in the list.', 'error', { title: 'No creators imported' });
    };

    const copyFailures = async () => {
        const text = result.failed.map(f => `Row ${f.line} · ${f.name}: ${f.error}`).join('\n');
        try {
            await navigator.clipboard.writeText(text);
            addToast('Failed rows copied.', 'success');
        } catch {
            addToast("Couldn't copy the failed rows. Try again.", 'error');
        }
    };

    const footer = result ? (
        <div className="flex gap-2">
            <Button variant="secondary" onClick={reset} className="h-12"><RefreshCw size={14} /> Import another file</Button>
            <Button variant="primary" onClick={close} className="h-12 flex-1">Done</Button>
        </div>
    ) : (
        <div className="space-y-3">
            {running && <UploadProgress percent={progress.total ? (progress.done / progress.total) * 100 : 0} step={`Importing ${progress.done} of ${progress.total}…`} />}
            <div className="flex gap-2">
                <Button variant="ghost" onClick={close} disabled={running} className="h-12">Cancel</Button>
                <Button variant="primary" onClick={runImport} disabled={running || !ready.length} className="h-12 flex-1">
                    {running ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
                    {running ? 'Importing…' : ready.length ? `Import ${ready.length} creator${ready.length === 1 ? '' : 's'}` : 'Nothing to import yet'}
                </Button>
            </div>
        </div>
    );

    return (
        <Sheet open={open} onClose={close} size="xl" title="Import creators" subtitle="From a CSV file. You'll see every row before anything is saved." footer={footer} bodyClassName="space-y-5">
            {result ? (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <StatTile label="Imported" value={result.imported} icon={CheckCircle} tone="green" />
                        <StatTile label="Failed" value={result.failed.length} icon={AlertTriangle} tone={result.failed.length ? 'red' : 'gray'} />
                    </div>
                    {result.failed.length > 0 && (
                        <div className="rounded-2xl border border-red-500/25 bg-red-500/[0.04] p-4">
                            <div className="flex items-center justify-between gap-2">
                                <p className="text-[14px] font-bold">These rows weren't saved</p>
                                <Button size="sm" variant="ghost" onClick={copyFailures}><Copy size={13} /> Copy</Button>
                            </div>
                            <ul className="mt-2 space-y-1.5 text-[13px]">
                                {result.failed.map(f => (
                                    <li key={f.line}><span className="font-semibold">Row {f.line} · {f.name}</span> <span className="text-gray-500">— {f.error}</span></li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            ) : (
                <>
                    <div
                        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                        onDragLeave={() => setDragging(false)}
                        onDrop={(e) => { e.preventDefault(); setDragging(false); if (!running) readFile(e.dataTransfer.files?.[0]); }}
                        className={cn(
                            'flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed px-4 py-7 text-center transition-colors sm:flex-row sm:text-left',
                            dragging ? 'border-pink-500 bg-pink-500/[0.05]' : 'border-black/10 dark:border-white/10'
                        )}
                    >
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-pink-500/15 text-pink-600 dark:bg-pink-400/10 dark:text-pink-300"><FileSpreadsheet size={22} /></span>
                        <span className="min-w-0 flex-1">
                            <span className="block text-[15px] font-bold">{fileName || 'Drop a CSV here'}</span>
                            <span className="block text-[12px] text-gray-500">Needs name, email, phone, city and niche. College is needed for campus creators and college pages.</span>
                        </span>
                        <span className="flex shrink-0 gap-2">
                            <Button variant="ghost" onClick={downloadTemplate}><Download size={14} /> Template</Button>
                            <GoogleSheetsButton getSpec={templateSpec} format="csv" label="Sheets" />
                            <Button variant="accent" onClick={() => inputRef.current?.click()} disabled={running}><Upload size={14} /> {fileName ? 'Choose another' : 'Choose file'}</Button>
                        </span>
                        <input ref={inputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => { readFile(e.target.files?.[0]); e.target.value = ''; }} />
                    </div>

                    {analysis?.error && (
                        <p role="alert" className="flex items-start gap-2 rounded-xl bg-red-500/[0.07] p-3 text-[13px] font-semibold text-red-600 dark:text-red-300">
                            <AlertTriangle size={15} className="mt-0.5 shrink-0" /> {analysis.error}
                        </p>
                    )}

                    {rows.length > 0 && (
                        <>
                            <div className="grid grid-cols-3 gap-2 sm:gap-3">
                                <StatTile label="Ready" value={ready.length} tone="green" />
                                <StatTile label="Already creators" value={duplicates} tone={duplicates ? 'amber' : 'gray'} />
                                <StatTile label="Need fixing" value={skipped.length - duplicates} tone={skipped.length - duplicates ? 'red' : 'gray'} />
                            </div>

                            <div className="space-y-3 rounded-2xl border border-black/[0.06] p-4 dark:border-white/[0.08]">
                                <div>
                                    <p className="mb-1.5 text-[12px] font-bold text-gray-500">Import them as</p>
                                    <Choice value={status} onChange={setStatus} options={[
                                        { value: 'approved', label: 'Verified', hint: 'Ready for campaigns now' },
                                        { value: 'pending', label: 'Pending review', hint: 'Check each one first' },
                                    ]} />
                                </div>
                                <Toggle
                                    label="Send the welcome email"
                                    hint="Each creator gets the welcome email with their ID pass. Their WhatsApp verification goes out either way."
                                    checked={sendWelcome}
                                    onChange={setSendWelcome}
                                />
                            </div>

                            <div className="space-y-3">
                                <SegmentedTabs value={tab} onChange={setTab} items={[
                                    { value: 'ready', label: 'Ready', count: ready.length },
                                    { value: 'skipped', label: 'Skipped', count: skipped.length, highlight: skipped.length > 0 },
                                ]} />
                                {shownRows.length === 0 ? (
                                    <p className="rounded-xl bg-black/[0.03] p-4 text-center text-[13px] text-gray-500 dark:bg-white/[0.03]">
                                        {tab === 'ready' ? 'No rows are ready. Fix the skipped rows in your sheet and choose the file again.' : 'Every row is good to go.'}
                                    </p>
                                ) : (
                                    <ul className="divide-y divide-black/[0.05] overflow-hidden rounded-2xl border border-black/[0.06] dark:divide-white/[0.05] dark:border-white/[0.08]">
                                        {shownRows.slice(0, 200).map(r => (
                                            <li key={r.line} className="flex items-start gap-3 px-3.5 py-2.5">
                                                <span className="mt-0.5 w-12 shrink-0 text-[11px] font-semibold tabular-nums text-gray-400">Row {r.line}</span>
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-[14px] font-bold">{r.preview.name || 'No name'}</p>
                                                    <p className="truncate text-[12px] text-gray-500">
                                                        {[r.preview.email, r.preview.phone, r.preview.city, r.preview.niche, r.preview.college, r.preview.instagram && `@${r.preview.instagram}`].filter(Boolean).join(' · ') || '—'}
                                                    </p>
                                                    {!r.ok && (
                                                        <div className="mt-1 flex flex-wrap gap-1">
                                                            {r.problems.map(p => <Badge key={p} tone={r.duplicate ? 'amber' : 'red'} className="whitespace-normal">{p}</Badge>)}
                                                        </div>
                                                    )}
                                                </div>
                                            </li>
                                        ))}
                                        {shownRows.length > 200 && (
                                            <li className="px-3.5 py-2.5 text-center text-[12px] text-gray-500">and {shownRows.length - 200} more</li>
                                        )}
                                    </ul>
                                )}
                            </div>
                        </>
                    )}
                </>
            )}
        </Sheet>
    );
};

export default ImportCreatorsSheet;
