import React, { useEffect, useMemo, useRef, useState } from 'react';
import Upload from 'lucide-react/dist/esm/icons/upload';
import Download from 'lucide-react/dist/esm/icons/download';
import CheckCheck from 'lucide-react/dist/esm/icons/check-check';
import X from 'lucide-react/dist/esm/icons/x';
import { cn } from '../../../lib/utils';
import { downloadCsv } from '../../../lib/xlsx';
import Sheet from '../Sheet';
import { Avatar, Badge, Button, SearchInput, SegmentedTabs } from '../ui';
import { Toggle, fieldCls } from '../uploads/UploadKit';
import { CheckBox, Spinner } from './parts';
import { creatorHandle, creatorKeys, creatorPhotoOf, isSelected } from './campaignModel';
import { DONE_ROW_STATUS, creatorEntriesFor, newbiIdOf, readDeliverablesCsv } from './shortlistModel';

/*
 * "Add completed work": creators who already did a deliverable (the client sent
 * a sheet, or someone posted without submitting in the app).
 *
 *   Upload sheet: a CSV with Instagram handles. Columns named after a deliverable
 *   ("Reel", or the deliverables sheet as downloaded) say which ones are done;
 *   a plain list of handles marks the deliverables picked here.
 *   One person: find a creator, tick what they did, add a link if there is one.
 *
 * Anyone not in the campaign yet is added to it. The welcome is off by default
 * here, since the work is already done.
 */
const taskTitle = (task, idx) => task.title || `Deliverable ${idx + 1}`;
// "instagram.com/reel/…" typed without https:// still counts; anything else that isn't a link is dropped.
const cleanLink = (value) => {
    const s = String(value || '').trim();
    if (/^https?:\/\//i.test(s)) return s;
    return /^[\w-]+(\.[\w-]+)+\//.test(s) ? `https://${s}` : '';
};

const CompletedWorkSheet = ({ open, onClose, campaign, creators, applicants, onSave }) => {
    const tasks = useMemo(() => campaign?.tasks || [], [campaign]);
    const input = useRef(null);
    const [mode, setMode] = useState('upload');
    const [name, setName] = useState('');
    const [text, setText] = useState('');
    const [error, setError] = useState(null);
    const [picked, setPicked] = useState([]);
    const [skipped, setSkipped] = useState(() => new Set());
    const [query, setQuery] = useState('');
    const [person, setPerson] = useState(null);
    const [ticks, setTicks] = useState({}); // taskId → link ('' when ticked without one)
    const [welcome, setWelcome] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!open) return;
        setMode('upload'); setName(''); setText(''); setError(null); setSkipped(new Set());
        setPicked(tasks.length === 1 ? [String(tasks[0].id)] : []);
        setQuery(''); setPerson(null); setTicks({}); setWelcome(false); setSaving(false);
    }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

    const entries = useMemo(() => (open ? creatorEntriesFor(campaign, creators, applicants) : []), [open, campaign, creators, applicants]);

    /* ---------- upload ---------- */

    const read = async (file) => {
        if (!file) return;
        if (!/\.csv$/i.test(file.name) && file.type !== 'text/csv') { setError('Choose a CSV file. In Excel or Google Sheets: File → Download → CSV.'); return; }
        setName(file.name);
        setText(await file.text());
        setSkipped(new Set());
    };
    const parsed = useMemo(() => (text ? readDeliverablesCsv(text, entries, campaign, picked) : null), [text, entries, campaign, picked]);
    useEffect(() => { if (parsed) setError(parsed.error); }, [parsed]);
    const rows = useMemo(() => parsed?.rows || [], [parsed]);
    const ready = rows.filter(r => r.status === 'ready' && !skipped.has(r.row));
    const counts = rows.reduce((m, r) => ({ ...m, [r.status]: (m[r.status] || 0) + 1 }), {});
    const needsPick = parsed && !parsed.error && !parsed.byColumn;

    const downloadTemplate = () => downloadCsv({
        filename: `${(campaign.title || 'campaign').replace(/[^\w-]+/g, '_').slice(0, 40)}_deliverables_template`,
        rows: [{}],
        columns: [
            { header: 'Instagram', value: () => '@handle' },
            ...tasks.map((t, idx) => ({ header: taskTitle(t, idx), value: () => (idx === 0 ? 'Done' : '') })),
            ...tasks.map((t, idx) => ({ header: `${taskTitle(t, idx)} · link`, value: () => '' })),
        ],
    });

    /* ---------- one person ---------- */

    const matches = useMemo(() => {
        const q = query.trim().toLowerCase().replace(/^@/, '');
        if (q.length < 2 || person) return [];
        const digits = q.replace(/\D/g, '');
        return entries.filter(e => {
            const c = e.creator;
            return String(c.name || '').toLowerCase().includes(q)
                || creatorHandle(c).toLowerCase().includes(q)
                || newbiIdOf(c).toLowerCase() === q
                || (digits.length >= 5 && String(c.phone || '').replace(/\D/g, '').includes(digits));
        }).slice(0, 8);
    }, [entries, query, person]);
    const statusFor = (entry, task) => entry?.progress?.items?.find(i => String(i.task.id) === String(task.id))?.status || 'not_started';
    const personDone = person ? tasks.filter(t => String(t.id) in ticks && statusFor(person, t) !== 'approved') : [];
    const personAdds = person ? !isSelected(campaign, person.creator) : false;

    /* ---------- save ---------- */

    const itemsFor = (entry, done) => done.map(({ task, link }) => ({
        taskId: task.id, creatorUid: entry.key, keys: creatorKeys(entry.creator), link: cleanLink(link),
    }));

    const save = async () => {
        if (saving) return;
        const batch = mode === 'upload'
            ? ready.map(r => ({ entry: r.entry, adds: r.adds, items: itemsFor(r.entry, r.done) }))
            : person ? [{ entry: person, adds: personAdds, items: itemsFor(person, personDone.map(t => ({ task: t, link: ticks[String(t.id)] }))) }] : [];
        if (!batch.some(b => b.adds || b.items.length)) return;
        setSaving(true);
        try {
            await onSave({ adds: batch.filter(b => b.adds).map(b => b.entry), items: batch.flatMap(b => b.items), welcome });
            onClose();
        } catch {
            // onSave shows the error; keep the sheet open to try again.
        } finally {
            setSaving(false);
        }
    };

    const uploadCount = ready.reduce((n, r) => n + r.done.length, 0);
    const label = mode === 'upload'
        ? (ready.length ? `Save ${ready.length} creator${ready.length === 1 ? '' : 's'}` : 'Save')
        : personDone.length ? `Mark ${personDone.length} done` : personAdds ? 'Add to campaign' : 'Save';
    const canSave = mode === 'upload' ? ready.length > 0 : Boolean(person) && (personDone.length > 0 || personAdds);

    const footer = (
        <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose} disabled={saving} className="h-11 flex-1 sm:flex-none">Cancel</Button>
            <Button variant="accent" onClick={save} disabled={!canSave || saving} className="h-11 flex-1">
                {saving ? <Spinner /> : <CheckCheck size={14} />} {label}
            </Button>
        </div>
    );

    const welcomeToggle = (
        <div className="rounded-xl border border-black/[0.06] px-3.5 py-2.5 dark:border-white/[0.08]">
            <Toggle
                label="Send the welcome to anyone new"
                hint={`Email, WhatsApp and an app notification${campaign?.whatsappLink ? ', with the group link' : ''}. Off, since their work is already done.`}
                checked={welcome}
                onChange={setWelcome}
            />
        </div>
    );

    return (
        <Sheet
            open={open}
            onClose={saving ? () => {} : onClose}
            title="Add completed work"
            subtitle="Creators who already did a deliverable. Anyone new is added to the campaign."
            size="lg"
            footer={footer}
        >
            <div className="space-y-4">
                <SegmentedTabs value={mode} onChange={setMode} items={[{ value: 'upload', label: 'Upload sheet' }, { value: 'one', label: 'One person' }]} />

                {mode === 'upload' ? (
                    <>
                        <div className="grid grid-cols-2 gap-2">
                            <Button onClick={downloadTemplate} className="h-11 sm:justify-start"><Download size={14} /> Template</Button>
                            <Button onClick={() => input.current?.click()} disabled={saving} className="h-11 sm:justify-start"><Upload size={14} /> {name ? 'Choose another' : 'Choose CSV'}</Button>
                            <input ref={input} type="file" accept=".csv,text/csv" className="hidden" onChange={e => { read(e.target.files?.[0]); e.target.value = ''; }} />
                        </div>
                        <div
                            onDragOver={e => e.preventDefault()}
                            onDrop={e => { e.preventDefault(); read(e.dataTransfer.files?.[0]); }}
                            className="rounded-xl border-black/10 text-[13px] text-gray-500 dark:border-white/10 sm:border-2 sm:border-dashed sm:px-4 sm:py-4 sm:text-center"
                        >
                            <span className="hidden sm:inline">Drop the CSV here. </span>
                            One row per creator with their Instagram handle. Add a column per deliverable (write Done or the post link), or just list the handles and pick the deliverables below.
                        </div>
                        {error && <p role="alert" className="text-[13px] font-semibold text-rose-600 dark:text-rose-300">{error}</p>}

                        {needsPick && (
                            <div className="space-y-1.5">
                                <p className="text-[12px] font-bold text-gray-500">No deliverable columns found. Everyone in the file did:</p>
                                {tasks.map((t, idx) => {
                                    const on = picked.includes(String(t.id));
                                    return (
                                        <div key={t.id} className="flex items-center gap-1 rounded-xl border border-black/[0.08] pr-3 dark:border-white/[0.1]">
                                            <CheckBox checked={on} label={taskTitle(t, idx)} onChange={v => setPicked(p => (v ? [...p, String(t.id)] : p.filter(x => x !== String(t.id))))} />
                                            <span className="text-[14px] font-semibold">{taskTitle(t, idx)}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {rows.length > 0 && (
                            <>
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="truncate text-[13px] font-semibold">{name}</span>
                                    {Object.entries(counts).map(([k, n]) => <Badge key={k} tone={DONE_ROW_STATUS[k].tone}>{n} {DONE_ROW_STATUS[k].label.toLowerCase()}</Badge>)}
                                </div>
                                <ul className="space-y-1.5 sm:max-h-[40dvh] sm:overflow-y-auto">
                                    {rows.map(r => {
                                        const off = r.status !== 'ready' || skipped.has(r.row);
                                        return (
                                            <li key={r.row} className={cn('flex min-h-[52px] items-center gap-3 rounded-xl border px-3 py-2', off ? 'border-black/[0.05] bg-black/[0.02] dark:border-white/[0.06] dark:bg-white/[0.02]' : 'border-black/[0.08] dark:border-white/[0.1]')}>
                                                <span className="w-12 shrink-0 text-[11px] font-semibold text-gray-400">Row {r.row}</span>
                                                {r.entry && <Avatar src={creatorPhotoOf(r.entry.creator)} name={r.entry.creator.name} size={30} />}
                                                <span className="min-w-0 flex-1">
                                                    <span className={cn('block truncate text-[14px] font-semibold', off && 'text-gray-500')}>{r.label}</span>
                                                    {r.status === 'ready' && (
                                                        <span className="block truncate text-[12px] text-gray-500">
                                                            {[r.adds && 'Added to campaign', r.done.map(d => d.task.title).join(', ')].filter(Boolean).join(' · ')}
                                                        </span>
                                                    )}
                                                </span>
                                                <Badge tone={skipped.has(r.row) ? 'gray' : DONE_ROW_STATUS[r.status].tone}>{skipped.has(r.row) ? 'Skipped' : DONE_ROW_STATUS[r.status].label}</Badge>
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
                                    <p className="text-[12px] text-amber-700 dark:text-amber-300">Rows marked “Not on Newbi” didn’t match any creator profile. Check the handle, or ask them to sign up as a creator first.</p>
                                )}
                                {ready.length > 0 && <p className="text-[12px] text-gray-500">{uploadCount} deliverable{uploadCount === 1 ? '' : 's'} marked done for {ready.length} creator{ready.length === 1 ? '' : 's'}.</p>}
                                {welcomeToggle}
                            </>
                        )}
                    </>
                ) : (
                    <>
                        {person ? (
                            <div className="flex items-center gap-3 rounded-xl border border-black/[0.08] px-3 py-2 dark:border-white/[0.1]">
                                <Avatar src={creatorPhotoOf(person.creator)} name={person.creator.name} size={36} />
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-[14px] font-semibold">{person.creator.name || 'Creator'}</span>
                                    <span className="block truncate text-[12px] text-gray-500">
                                        {[creatorHandle(person.creator) && `@${creatorHandle(person.creator)}`, newbiIdOf(person.creator), personAdds ? 'Not in the campaign yet' : 'In the campaign'].filter(Boolean).join(' · ')}
                                    </span>
                                </span>
                                <Button size="sm" variant="ghost" onClick={() => { setPerson(null); setTicks({}); }} className="h-10">Change</Button>
                            </div>
                        ) : (
                            <>
                                <SearchInput value={query} onChange={setQuery} placeholder="Name, @handle, Newbi ID or phone" />
                                {matches.length > 0 && (
                                    <ul className="space-y-1.5">
                                        {matches.map(e => (
                                            <li key={e.key}>
                                                <button type="button" onClick={() => { setPerson(e); setQuery(''); }} className="flex min-h-[52px] w-full items-center gap-3 rounded-xl border border-black/[0.08] px-3 py-2 text-left hover:bg-black/[0.03] dark:border-white/[0.1] dark:hover:bg-white/[0.03]">
                                                    <Avatar src={creatorPhotoOf(e.creator)} name={e.creator.name} size={30} />
                                                    <span className="min-w-0 flex-1">
                                                        <span className="block truncate text-[14px] font-semibold">{e.creator.name || 'Creator'}</span>
                                                        <span className="block truncate text-[12px] text-gray-500">{[creatorHandle(e.creator) && `@${creatorHandle(e.creator)}`, e.creator.city].filter(Boolean).join(' · ')}</span>
                                                    </span>
                                                    {isSelected(campaign, e.creator) && <Badge tone="blue">In campaign</Badge>}
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                                {query.trim().length >= 2 && matches.length === 0 && (
                                    <p className="text-[13px] text-gray-500">No creator matches. They need a Newbi creator profile first.</p>
                                )}
                            </>
                        )}

                        {person && (
                            <div className="space-y-1.5">
                                <p className="text-[12px] font-bold text-gray-500">What they did</p>
                                {tasks.map((t, idx) => {
                                    const id = String(t.id);
                                    const already = statusFor(person, t) === 'approved';
                                    const on = already || id in ticks;
                                    return (
                                        <div key={id} className="rounded-xl border border-black/[0.08] pr-3 dark:border-white/[0.1]">
                                            <div className="flex items-center gap-1">
                                                <CheckBox
                                                    checked={on}
                                                    label={taskTitle(t, idx)}
                                                    onChange={v => { if (already) return; setTicks(m => { const n = { ...m }; if (v) n[id] = ''; else delete n[id]; return n; }); }}
                                                />
                                                <span className="min-w-0 flex-1 truncate text-[14px] font-semibold">{taskTitle(t, idx)}</span>
                                                {already && <Badge tone="green">Done already</Badge>}
                                            </div>
                                            {!already && id in ticks && (
                                                <div className="px-3 pb-3">
                                                    <input className={fieldCls} value={ticks[id]} onChange={e => setTicks(m => ({ ...m, [id]: e.target.value }))} placeholder="Post link (optional)" inputMode="url" />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                        {person && personAdds && welcomeToggle}
                    </>
                )}
            </div>
        </Sheet>
    );
};

export default CompletedWorkSheet;
