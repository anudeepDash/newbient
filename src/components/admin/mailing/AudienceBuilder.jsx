import React, { useMemo, useRef, useState } from 'react';
import Users from 'lucide-react/dist/esm/icons/users';
import UserPlus from 'lucide-react/dist/esm/icons/user-plus';
import Mail from 'lucide-react/dist/esm/icons/mail';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import ShieldCheck from 'lucide-react/dist/esm/icons/shield-check';
import ListChecks from 'lucide-react/dist/esm/icons/list-checks';
import Check from 'lucide-react/dist/esm/icons/check';
import X from 'lucide-react/dist/esm/icons/x';
import FileUp from 'lucide-react/dist/esm/icons/file-up';
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle';
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw';
import { cn } from '../../../lib/utils';
import { accent } from '../theme';
import { Badge, Button, SearchInput, Select, SegmentedTabs, Avatar, EmptyState } from '../ui';
import Sheet from '../Sheet';
import ExportMenu from '../ExportMenu';
import { areaCls } from '../uploads/UploadKit';
import { exportSubtitle, fileDate } from '../../../lib/xlsx';
import { SEGMENTS, CREATOR_STATUSES, normalizeEmail, isValidEmail, parseEmailList, segmentContacts } from './audience';

/*
 * Pick who gets the email: any mix of segments, creators narrowed by city /
 * niche / status, and a custom list (search people, paste, or import a CSV).
 * Shows the live count after duplicates, unsubscribed and invalid addresses
 * are taken out, and lets you see (and export) exactly who is in or out.
 */

const SEGMENT_ICON = { subscribers: Mail, users: Users, creators: Sparkles, team: ShieldCheck, custom: ListChecks };
const fmt = (n) => Number(n || 0).toLocaleString('en-IN');

const SegmentCard = ({ seg, count, selected, onToggle }) => {
    const a = accent(seg.tone);
    const Icon = SEGMENT_ICON[seg.id] || Users;
    return (
        <button
            type="button"
            onClick={onToggle}
            aria-pressed={selected}
            className={cn('relative flex min-h-[72px] w-full items-start gap-3 rounded-2xl border p-3 text-left transition-all',
                selected ? cn(a.border, a.soft) : 'border-black/[0.08] bg-white hover:border-black/20 dark:border-white/[0.08] dark:bg-white/[0.02] dark:hover:border-white/20')}
        >
            <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', a.chip)}><Icon size={18} /></span>
            <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-bold leading-snug">{seg.label}</span>
                <span className="block text-[12px] text-gray-500">{count === null ? seg.hint : `${fmt(count)} ${count === 1 ? 'person' : 'people'}`}</span>
            </span>
            <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors',
                selected ? cn(a.solid, 'border-transparent') : 'border-black/15 dark:border-white/20')}>
                {selected && <Check size={14} />}
            </span>
        </button>
    );
};

/* ---------- Custom list ---------- */

const CustomList = ({ value, onChange, knownPeople }) => {
    const [query, setQuery] = useState('');
    const [paste, setPaste] = useState('');
    const [showPaste, setShowPaste] = useState(false);
    const [note, setNote] = useState(null);
    const fileRef = useRef(null);
    const inList = useMemo(() => new Set(value.map(v => v.email)), [value]);

    const add = (contacts, invalid = []) => {
        const fresh = contacts.filter(c => !inList.has(c.email));
        if (fresh.length) onChange([...value, ...fresh]);
        const bits = [];
        bits.push(fresh.length ? `Added ${fmt(fresh.length)} ${fresh.length === 1 ? 'person' : 'people'}.` : 'No new addresses to add.');
        if (contacts.length - fresh.length > 0) bits.push(`${fmt(contacts.length - fresh.length)} already on the list.`);
        if (invalid.length) bits.push(`${fmt(invalid.length)} didn't look like email addresses (${invalid.slice(0, 2).join(', ')}${invalid.length > 2 ? '…' : ''}).`);
        setNote({ tone: invalid.length ? 'amber' : 'green', text: bits.join(' ') });
    };

    const q = query.trim().toLowerCase();
    const matches = useMemo(() => {
        if (!q) return [];
        return knownPeople.filter(p => !inList.has(p.email) && (p.email.includes(q) || p.name.toLowerCase().includes(q))).slice(0, 8);
    }, [q, knownPeople, inList]);
    const typedEmail = isValidEmail(q) && !inList.has(normalizeEmail(q)) && !matches.some(m => m.email === normalizeEmail(q));

    const onFile = async (file) => {
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { setNote({ tone: 'red', text: 'That file is over 5 MB. Split it and import the parts.' }); return; }
        const text = await file.text();
        const { contacts, invalid } = parseEmailList(text);
        if (!contacts.length) { setNote({ tone: 'red', text: `No email addresses found in ${file.name}.` }); return; }
        add(contacts, invalid);
    };

    return (
        <div className="space-y-3 rounded-2xl border border-black/[0.06] p-3 dark:border-white/[0.08]">
            <SearchInput value={query} onChange={setQuery} placeholder="Search people or type an email" />
            {(matches.length > 0 || typedEmail) && (
                <div className="max-h-64 overflow-y-auto rounded-xl border border-black/[0.08] bg-white p-1 dark:border-white/[0.08] dark:bg-[#0d0f15]">
                    {typedEmail && (
                        <button type="button" onClick={() => { add([{ email: normalizeEmail(q), name: '' }]); setQuery(''); }} className="flex min-h-11 w-full items-center gap-3 rounded-lg px-2.5 text-left text-[13px] font-semibold hover:bg-black/5 dark:hover:bg-white/5">
                            <UserPlus size={15} className="text-teal-600 dark:text-teal-300" /> Add {normalizeEmail(q)}
                        </button>
                    )}
                    {matches.map(p => (
                        <button key={p.email} type="button" onClick={() => { add([{ email: p.email, name: p.name }]); setQuery(''); }} className="flex min-h-11 w-full items-center gap-3 rounded-lg px-2.5 py-1.5 text-left hover:bg-black/5 dark:hover:bg-white/5">
                            <Avatar name={p.name || p.email} size={28} />
                            <span className="min-w-0 flex-1">
                                <span className="block truncate text-[13px] font-semibold">{p.name || p.email}</span>
                                <span className="block truncate text-[12px] text-gray-500">{p.email}</span>
                            </span>
                            <Badge tone="gray">{p.sourceLabel}</Badge>
                        </button>
                    ))}
                </div>
            )}

            <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" className="h-10" onClick={() => setShowPaste(v => !v)}>Paste emails</Button>
                <Button size="sm" variant="secondary" className="h-10" onClick={() => fileRef.current?.click()}><FileUp size={14} /> Import CSV</Button>
                <input ref={fileRef} type="file" accept=".csv,.txt,text/csv,text/plain" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; onFile(f); }} />
                {value.length > 0 && <Button size="sm" variant="ghost" className="ml-auto h-10 text-red-600 dark:text-red-400" onClick={() => { onChange([]); setNote(null); }}>Clear list</Button>}
            </div>

            {showPaste && (
                <div className="space-y-2">
                    <textarea value={paste} onChange={(e) => setPaste(e.target.value)} rows={4} className={areaCls} placeholder="One per line, or separated by commas. A CSV with an 'email' column works too." />
                    <div className="flex justify-end gap-2">
                        <Button size="sm" variant="ghost" className="h-10" onClick={() => { setPaste(''); setShowPaste(false); }}>Cancel</Button>
                        <Button size="sm" variant="accent" className="h-10" disabled={!paste.trim()} onClick={() => {
                            const { contacts, invalid } = parseEmailList(paste);
                            if (!contacts.length) { setNote({ tone: 'red', text: 'No email addresses found in that text.' }); return; }
                            add(contacts, invalid);
                            setPaste('');
                            setShowPaste(false);
                        }}>Add to list</Button>
                    </div>
                </div>
            )}

            {note && <p className={cn('text-[12px] font-semibold', accent(note.tone).text)}>{note.text}</p>}

            {value.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                    {value.slice(0, 40).map(c => (
                        <span key={c.email} className="inline-flex max-w-full items-center gap-1 rounded-lg bg-teal-500/10 py-1 pl-2.5 pr-1 text-[12.5px] font-semibold text-teal-800 dark:bg-teal-400/10 dark:text-teal-200">
                            <span className="truncate">{c.name ? `${c.name} · ${c.email}` : c.email}</span>
                            <button type="button" onClick={() => onChange(value.filter(v => v.email !== c.email))} aria-label={`Remove ${c.email}`} className="-my-1 -mr-1 flex h-8 w-8 items-center justify-center rounded-lg hover:bg-black/10 dark:hover:bg-white/10"><X size={14} /></button>
                        </span>
                    ))}
                    {value.length > 40 && <span className="self-center text-[12px] font-semibold text-gray-500">and {fmt(value.length - 40)} more</span>}
                </div>
            ) : (
                <p className="text-[12px] text-gray-500">No one on the custom list yet.</p>
            )}
        </div>
    );
};

/* ---------- Who's in / who's out ---------- */

const RecipientsSheet = ({ open, onClose, result, exclude, onExcludeChange }) => {
    const [tab, setTab] = useState('in');
    const [query, setQuery] = useState('');
    const lists = {
        in: result.recipients,
        unsubscribed: result.skipped.unsubscribed,
        invalid: result.skipped.invalid,
        excluded: result.skipped.excluded,
    };
    const q = query.trim().toLowerCase();
    const rows = (lists[tab] || []).filter(c => !q || (c.email || '').includes(q) || (c.name || '').toLowerCase().includes(q));
    const shown = rows.slice(0, 300);
    const label = { in: 'Will get it', unsubscribed: 'Unsubscribed', invalid: 'Invalid', excluded: 'Excluded' };

    return (
        <Sheet open={open} onClose={onClose} size="lg" title="Recipients" subtitle="Everyone this email will go to, and who's left out" bodyClassName="space-y-4">
            <div className="-mx-1 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <SegmentedTabs value={tab} onChange={setTab} items={[
                    { value: 'in', label: label.in, count: lists.in.length },
                    { value: 'unsubscribed', label: label.unsubscribed, count: lists.unsubscribed.length },
                    { value: 'invalid', label: label.invalid, count: lists.invalid.length, highlight: lists.invalid.length > 0 },
                    { value: 'excluded', label: label.excluded, count: lists.excluded.length },
                ]} />
            </div>
            <div className="flex gap-2">
                <SearchInput value={query} onChange={setQuery} placeholder="Name or email" className="flex-1" />
                <ExportMenu getSpec={() => ({
                    filename: `recipients_${tab}_${fileDate()}`,
                    sheetName: label[tab],
                    title: `Recipients · ${label[tab]}`,
                    subtitle: exportSubtitle(rows.length, 'person'),
                    rows,
                    columns: [
                        { header: 'Email', value: r => r.email || '' },
                        { header: 'Name', value: r => r.name || '' },
                        { header: 'From', value: r => r.source || '' },
                    ],
                })} />
            </div>
            {rows.length === 0 ? (
                <EmptyState icon={Users} title={q ? 'No one matches' : 'No one here'} description={tab === 'in' ? 'Pick a group above to add people.' : undefined} />
            ) : (
                <ul className="divide-y divide-black/[0.05] rounded-2xl border border-black/[0.06] dark:divide-white/[0.05] dark:border-white/[0.08]">
                    {shown.map((c, i) => (
                        <li key={`${c.email}-${i}`} className="flex items-center gap-3 px-3 py-2.5">
                            <Avatar name={c.name || c.email} size={32} />
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-[13px] font-semibold">{c.name || c.email || '(no email)'}</p>
                                <p className="truncate text-[12px] text-gray-500">{c.email || 'Missing address'}</p>
                            </div>
                            {tab === 'in' && (
                                <Button size="sm" variant="ghost" className="h-10" onClick={() => onExcludeChange([...exclude, c.email])}>Leave out</Button>
                            )}
                            {tab === 'excluded' && (
                                <Button size="sm" variant="ghost" className="h-10" onClick={() => onExcludeChange(exclude.filter(e => e !== c.email))}>Add back</Button>
                            )}
                        </li>
                    ))}
                </ul>
            )}
            {rows.length > shown.length && <p className="text-center text-[12px] text-gray-500">Showing 300 of {fmt(rows.length)}. Search or export to see everyone.</p>}
        </Sheet>
    );
};

/* ---------- Builder ---------- */

const AudienceBuilder = ({
    sources, audience, onChange, result, suppression,
    allowed = SEGMENTS.map(s => s.id), cityOptions = [], nicheOptions = [], knownPeople = [],
}) => {
    const [listOpen, setListOpen] = useState(false);
    const set = (patch) => onChange({ ...audience, ...patch });
    const segments = SEGMENTS.filter(s => allowed.includes(s.id));
    const selected = new Set(audience.segments);
    const toggle = (id) => set({ segments: selected.has(id) ? audience.segments.filter(s => s !== id) : [...audience.segments, id] });
    const everyoneIds = segments.filter(s => s.id !== 'custom').map(s => s.id);
    const isEveryone = everyoneIds.every(id => selected.has(id));

    const countFor = (id) => {
        if (id === 'custom') return audience.custom.length;
        return segmentContacts(id, sources, audience.creatorFilters).length;
    };
    const filters = audience.creatorFilters;
    const setFilter = (k, v) => set({ creatorFilters: { ...filters, [k]: v } });
    const { stats } = result;
    const removed = [
        stats.duplicates && { tone: 'gray', text: `${fmt(stats.duplicates)} duplicate${stats.duplicates === 1 ? '' : 's'} merged` },
        stats.unsubscribed && { tone: 'amber', text: `${fmt(stats.unsubscribed)} unsubscribed` },
        stats.invalid && { tone: 'red', text: `${fmt(stats.invalid)} invalid` },
        stats.excluded && { tone: 'violet', text: `${fmt(stats.excluded)} left out` },
    ].filter(Boolean);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
                <p className="text-[12px] font-bold text-gray-500">Send to</p>
                <button type="button" onClick={() => set({ segments: isEveryone ? audience.segments.filter(id => id === 'custom') : [...new Set([...audience.segments, ...everyoneIds])] })} className="h-9 rounded-lg px-2 text-[12px] font-semibold text-gray-500 hover:text-gray-900 dark:hover:text-white">
                    {isEveryone ? 'Clear groups' : 'Everyone'}
                </button>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {segments.map(seg => (
                    <SegmentCard key={seg.id} seg={seg} count={countFor(seg.id)} selected={selected.has(seg.id)} onToggle={() => toggle(seg.id)} />
                ))}
            </div>

            {selected.has('creators') && (
                <div className={cn('space-y-2 rounded-2xl border p-3', accent('pink').border, accent('pink').soft)}>
                    <p className="text-[12px] font-bold text-gray-500">Which creators</p>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                        <Select label="City" value={filters.city} onChange={(v) => setFilter('city', v)} options={[{ value: 'all', label: 'Any city' }, ...cityOptions.map(c => ({ value: c, label: c }))]} />
                        <Select label="Niche" value={filters.niche} onChange={(v) => setFilter('niche', v)} options={[{ value: 'all', label: 'Any niche' }, ...nicheOptions.map(n => ({ value: n, label: n }))]} />
                        <Select label="Status" value={filters.status} onChange={(v) => setFilter('status', v)} options={CREATOR_STATUSES} />
                    </div>
                </div>
            )}

            {selected.has('custom') && (
                <CustomList value={audience.custom} onChange={(custom) => set({ custom })} knownPeople={knownPeople} />
            )}

            {/* Live count */}
            <div className="rounded-2xl border border-black/[0.06] bg-black/[0.02] p-4 dark:border-white/[0.08] dark:bg-white/[0.03]">
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <p className="text-[12px] font-bold text-gray-500">Will get this email</p>
                        <p className="font-heading text-[30px] font-extrabold leading-none tabular-nums">{fmt(stats.final)}</p>
                    </div>
                    <Button size="sm" variant="secondary" className="h-10" onClick={() => setListOpen(true)} disabled={!stats.matched}>See who</Button>
                </div>
                {removed.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                        {removed.map(r => <Badge key={r.text} tone={r.tone}>{r.text}</Badge>)}
                    </div>
                )}
                {suppression?.status === 'loading' && <p className="mt-2 text-[12px] text-gray-500">Checking the unsubscribe list…</p>}
                {suppression?.status === 'error' && (
                    <p className="mt-2 flex flex-wrap items-center gap-x-2 text-[12px] font-semibold text-amber-700 dark:text-amber-300">
                        <AlertTriangle size={13} /> Couldn't load the unsubscribe list. Unsubscribed people are still skipped when sending.
                        <button type="button" onClick={suppression.onRetry} className="inline-flex h-8 items-center gap-1 underline"><RefreshCw size={12} /> Try again</button>
                    </p>
                )}
                {audience.segments.length === 0 && <p className="mt-2 text-[12px] text-gray-500">Pick at least one group above.</p>}
            </div>

            <RecipientsSheet
                open={listOpen}
                onClose={() => setListOpen(false)}
                result={result}
                exclude={audience.exclude}
                onExcludeChange={(exclude) => set({ exclude })}
            />
        </div>
    );
};

export default AudienceBuilder;
