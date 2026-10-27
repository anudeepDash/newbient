import React, { useCallback, useEffect, useMemo, useState } from 'react';
import History from 'lucide-react/dist/esm/icons/history';
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw';
import Search from 'lucide-react/dist/esm/icons/search';
import Check from 'lucide-react/dist/esm/icons/check';
import CheckCheck from 'lucide-react/dist/esm/icons/check-check';
import Clock from 'lucide-react/dist/esm/icons/clock';
import AlertCircle from 'lucide-react/dist/esm/icons/alert-circle';
import { cn } from '../../../lib/utils';
import { Button, EmptyState } from '../ui';
import { accent } from '../theme';
import { callOutreach } from '../campaigns/outreach/outreachApi';
import { MUTED } from '../campaigns/outreach/InboxPanel';
import { PaneHeader, Pills, SEND_TONE, eventLabel, templateTitle } from './centerParts';

/*
 * Every WhatsApp send, automatic and by hand, newest first (wa-log). Delivered
 * and read update as WhatsApp reports them.
 */

const ICON = { read: CheckCheck, delivered: CheckCheck, sent: Check, failed: AlertCircle, retry: Clock, held: Clock, skipped: AlertCircle };
const LABEL = { held: 'Waiting', retry: 'Retrying', skipped: 'Skipped' };
const GROUPS = {
    all: () => true,
    failed: (r) => r.status === 'failed' || r.status === 'skipped',
    waiting: (r) => r.status === 'held' || r.status === 'retry',
    sent: (r) => r.status === 'sent',
    delivered: (r) => r.status === 'delivered',
    read: (r) => r.status === 'read',
};

const dayOf = (iso) => {
    const d = new Date(Date.parse(iso || '') || 0);
    const days = Math.round((new Date(new Date().toDateString()) - new Date(d.toDateString())) / 86_400_000);
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
};
const timeOf = (iso) => (Date.parse(iso || '') ? new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }) : '');

const SentPane = ({ refreshKey, onClose }) => {
    const [state, setState] = useState({ loading: true, rows: [] });
    const [filter, setFilter] = useState('all');
    const [query, setQuery] = useState('');
    const load = useCallback(async () => {
        setState(s => ({ ...s, loading: true }));
        const r = await callOutreach('wa-log', { limit: 150 });
        setState({ loading: false, rows: r.ok ? r.data.rows : [], error: r.ok ? '' : r.error });
    }, []);
    useEffect(() => { load(); }, [load, refreshKey]);

    const q = query.trim().toLowerCase();
    const rows = state.rows.filter(r => GROUPS[filter](r) && (!q || [r.to, r.template, r.event, r.error].some(v => String(v || '').toLowerCase().includes(q))));
    const counts = useMemo(() => Object.fromEntries(Object.keys(GROUPS).map(k => [k, state.rows.filter(GROUPS[k]).length])), [state.rows]);
    const days = [];
    rows.forEach(r => {
        const d = dayOf(r.at);
        if (!days.length || days[days.length - 1].day !== d) days.push({ day: d, rows: [] });
        days[days.length - 1].rows.push(r);
    });

    return (
        <div className="flex h-full min-h-0 flex-col">
            <PaneHeader icon={History} title="Sent messages" subtitle="The latest 150 sends, automatic and by hand" onClose={onClose}>
                <Button size="sm" variant="ghost" onClick={load} disabled={state.loading} aria-label="Refresh"><RefreshCw size={14} className={state.loading ? 'animate-spin' : undefined} /></Button>
            </PaneHeader>
            <div className="shrink-0 space-y-2.5 border-b border-black/[0.06] px-4 py-3 dark:border-white/[0.07]">
                <label className="flex h-10 items-center gap-2.5 rounded-xl bg-black/[0.04] px-3 dark:bg-white/[0.05]">
                    <Search size={16} className="shrink-0 text-gray-400" />
                    <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search number, template or error" className="min-w-0 flex-1 border-0 bg-transparent p-0 text-[14px] outline-none placeholder:text-gray-400 focus:ring-0 dark:text-white dark:placeholder:text-zinc-500" aria-label="Search sent messages" />
                </label>
                <Pills
                    value={filter}
                    onChange={setFilter}
                    items={[
                        { value: 'all', label: 'All', count: counts.all },
                        { value: 'failed', label: 'Failed', count: counts.failed },
                        { value: 'waiting', label: 'Waiting', count: counts.waiting },
                        { value: 'sent', label: 'Sent', count: counts.sent },
                        { value: 'delivered', label: 'Delivered', count: counts.delivered },
                        { value: 'read', label: 'Read', count: counts.read },
                    ]}
                />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4 sm:px-4">
                {state.loading && !state.rows.length && <p className={cn('p-6 text-[13px]', MUTED)}>Loading…</p>}
                {state.error && <p className="p-6 text-[13px] text-rose-600">{state.error}</p>}
                {!state.loading && !state.error && !rows.length && (
                    <EmptyState icon={History} title={state.rows.length ? 'Nothing matches' : 'Nothing sent yet'} description={state.rows.length ? 'Try another filter or search.' : 'Tickets, passes, shortlists and payouts appear here as they go out.'} />
                )}
                {days.map(g => (
                    <section key={g.day}>
                        <p className={cn('sticky top-0 z-10 bg-white/90 px-2 pb-1.5 pt-4 text-[12px] font-bold backdrop-blur dark:bg-[#0c0e13]/90', MUTED)}>{g.day}</p>
                        <ul className="space-y-1">
                            {g.rows.map(r => {
                                const tone = accent(SEND_TONE[r.status] || 'gray');
                                const Icon = ICON[r.status] || Check;
                                return (
                                    <li key={r.id} className="flex items-start gap-3 rounded-2xl px-2 py-2.5 hover:bg-black/[0.02] dark:hover:bg-white/[0.02]">
                                        <span className={cn('mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', tone.chip)}><Icon size={16} /></span>
                                        <span className="min-w-0 flex-1">
                                            <span className="flex items-baseline justify-between gap-2">
                                                <span className="truncate font-heading text-[14.5px] font-bold text-gray-900 dark:text-white">{r.template ? templateTitle(r.template) : 'Text reply'}</span>
                                                <span className={cn('shrink-0 text-[11.5px] tabular-nums', MUTED)}>{timeOf(r.at)}</span>
                                            </span>
                                            <span className={cn('flex flex-wrap items-center gap-x-2 text-[12.5px]', MUTED)}>
                                                <span className="font-mono text-[12px]">{r.to}</span>
                                                <span aria-hidden="true">·</span>
                                                <span>{eventLabel(r.event)}</span>
                                                <span aria-hidden="true">·</span>
                                                <span className={cn('font-semibold', tone.text)}>{LABEL[r.status] || (r.status ? r.status.charAt(0).toUpperCase() + r.status.slice(1) : '—')}</span>
                                            </span>
                                            {r.error && <span className="mt-1 block rounded-lg bg-rose-500/[0.07] px-2 py-1 text-[12px] text-rose-700 dark:text-rose-300">{r.error}</span>}
                                        </span>
                                    </li>
                                );
                            })}
                        </ul>
                    </section>
                ))}
            </div>
        </div>
    );
};

export default SentPane;
