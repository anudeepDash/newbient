import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Gift from 'lucide-react/dist/esm/icons/gift';
import Plus from 'lucide-react/dist/esm/icons/plus';
import Edit from 'lucide-react/dist/esm/icons/edit';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import Users from 'lucide-react/dist/esm/icons/users';
import Trophy from 'lucide-react/dist/esm/icons/trophy';
import Lock from 'lucide-react/dist/esm/icons/lock';
import Unlock from 'lucide-react/dist/esm/icons/unlock';
import Bell from 'lucide-react/dist/esm/icons/bell';
import Clock from 'lucide-react/dist/esm/icons/clock';
import ExternalLink from 'lucide-react/dist/esm/icons/external-link';
import MoreHorizontal from 'lucide-react/dist/esm/icons/more-horizontal';
import Link2 from 'lucide-react/dist/esm/icons/link-2';
import CopyPlus from 'lucide-react/dist/esm/icons/copy-plus';
import Shuffle from 'lucide-react/dist/esm/icons/shuffle';
import Radio from 'lucide-react/dist/esm/icons/radio';
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle';
import { useStore } from '../../lib/store';
import { useStoreSubscription } from '../../hooks/useStoreSubscription';
import { notifyAllUsers } from '../../lib/notificationTriggers';
import { copyToClipboard } from '../../lib/clipboard';
import { cn } from '../../lib/utils';
import { exportSubtitle, fileDate } from '../../lib/xlsx';
import AdminCommunityHubLayout from '../../components/admin/AdminCommunityHubLayout';
import ExportMenu from '../../components/admin/ExportMenu';
import { Badge, Button, EmptyState, Menu, MenuItem, SearchInput, SegmentedTabs, Select, StatTile, ViewToggle, useViewMode } from '../../components/admin/ui';
import GiveawayEditor from '../../components/admin/giveaways/GiveawayEditor';
import WinnerDrawSheet from '../../components/admin/giveaways/WinnerDrawSheet';
import { GIVEAWAY_STATE, entryPoints, giveawayEndsAt, giveawayState } from '../../components/admin/giveaways/giveawayUtils';
import { formatDateTime, formatDay, slugify, toDate, useConfirm } from '../../components/admin/forms/kit';

const FILTERS = ['all', 'open', 'ended', 'closed'];
const FILTER_LABEL = { all: 'All', open: 'Open', ended: 'Ended, still open', closed: 'Closed' };

const endsText = (g, state) => {
    const end = giveawayEndsAt(g);
    if (state === 'closed') return g.closedAt ? `Closed ${formatDay(g.closedAt)}` : end ? `Ended ${formatDay(end)}` : 'Closed';
    if (!end) return 'No end date';
    const ms = end - Date.now();
    if (ms <= 0) return `Ended ${formatDateTime(end)}`;
    const days = Math.floor(ms / 86400000);
    if (days >= 1) return `Ends in ${days} day${days === 1 ? '' : 's'} · ${formatDay(end, false)}`;
    const hours = Math.max(1, Math.floor(ms / 3600000));
    return `Ends in ${hours} hour${hours === 1 ? '' : 's'}`;
};

const GiveawayManager = () => {
    useStoreSubscription(['giveaways', 'giveawayEntries']);
    const navigate = useNavigate();
    const giveaways = useStore(s => s.giveaways) || [];
    const entries = useStore(s => s.giveawayEntries) || [];
    const loaded = useStore(s => s.subscriptionsLoaded?.giveaways);
    const addToast = useStore(s => s.addToast);
    const [params, setParams] = useSearchParams();
    const [view, setView] = useViewMode('giveaways', 'cards');
    const [search, setSearch] = useState('');
    const [sort, setSort] = useState('newest');
    const [drawId, setDrawId] = useState(null);
    const [busyId, setBusyId] = useState(null);
    const [confirm, confirmEl] = useConfirm();

    const filter = FILTERS.includes(params.get('filter')) ? params.get('filter') : 'all';
    const editId = params.get('edit');
    const isNew = params.get('new') === '1';
    const setParam = (updates, replace = false) => {
        const next = new URLSearchParams(params);
        Object.entries(updates).forEach(([k, v]) => { if (v) next.set(k, v); else next.delete(k); });
        setParams(next, { replace });
    };

    const byCampaign = useMemo(() => {
        const map = {};
        entries.forEach(e => {
            const m = map[e.campaignId] || (map[e.campaignId] = { entries: [], points: 0, winners: [] });
            m.entries.push(e);
            m.points += entryPoints(e);
            if (e.isWinner) m.winners.push(e);
        });
        return map;
    }, [entries]);

    const enriched = useMemo(() => giveaways.map(g => {
        const m = byCampaign[g.id] || { entries: [], points: 0, winners: [] };
        return { g, state: giveawayState(g), count: m.entries.length, points: m.points, winners: m.winners, end: giveawayEndsAt(g) };
    }), [giveaways, byCampaign]);

    const tally = useMemo(() => {
        const c = { all: 0, open: 0, ended: 0, closed: 0, entries: 0, winners: 0 };
        enriched.forEach(e => { c.all += 1; c[e.state] += 1; c.entries += e.count; c.winners += e.winners.length; });
        return c;
    }, [enriched]);

    const latestWinner = useMemo(() => [...entries].filter(e => e.isWinner)
        .sort((a, b) => String(b.winnerSelectedAt || b.createdAt || '').localeCompare(String(a.winnerSelectedAt || a.createdAt || '')))[0], [entries]);

    const rows = useMemo(() => {
        const q = search.trim().toLowerCase();
        const list = enriched.filter(e => (filter === 'all' || e.state === filter)
            && (!q || [e.g.name, e.g.slug, e.g.description].some(v => String(v || '').toLowerCase().includes(q))));
        const by = {
            newest: (a, b) => (toDate(b.g.createdAt)?.getTime() || 0) - (toDate(a.g.createdAt)?.getTime() || 0),
            ending: (a, b) => (a.end?.getTime() || Infinity) - (b.end?.getTime() || Infinity),
            entries: (a, b) => b.count - a.count,
            name: (a, b) => String(a.g.name || '').localeCompare(String(b.g.name || '')),
        }[sort];
        return list.sort(by);
    }, [enriched, filter, search, sort]);

    // ── actions ──
    const run = async (id, fn, success) => {
        if (busyId) return;
        setBusyId(id);
        try {
            await fn();
            if (success) addToast(success, 'success');
        } catch (err) {
            console.error(err);
            addToast('Check your connection and try again.', 'error', {
                title: 'Change not saved',
                action: { label: 'Try again', onClick: () => run(id, fn, success) },
            });
        } finally {
            setBusyId(null);
        }
    };

    const linkOf = (g) => `${window.location.origin}/giveaway/${g.slug}`;
    const copyLink = async (g) => {
        const ok = await copyToClipboard(linkOf(g));
        addToast(ok ? 'Giveaway link copied.' : "Couldn't copy the link.", ok ? 'success' : 'error');
    };

    const close = async (e) => {
        const ok = await confirm({
            title: `Close "${e.g.name}"?`,
            body: e.winners.length ? 'No one else can enter, and the winner is shown on the giveaway page.' : 'No one else can enter. You can still draw winners afterwards.',
            confirmLabel: 'Close giveaway',
            tone: 'accent',
        });
        if (ok) run(e.g.id, () => useStore.getState().closeGiveaways([e.g.id]), 'Giveaway closed.');
    };
    const reopen = (e) => {
        if (e.end && e.end < new Date()) {
            addToast('Set a new end date in the editor to reopen it.', 'warning', { title: 'Its end date has passed' });
            setParam({ edit: e.g.id });
            return;
        }
        run(e.g.id, () => useStore.getState().updateGiveaway(e.g.id, { status: 'Open', closedAt: null }), 'Giveaway reopened.');
    };
    const closeEnded = async () => {
        const ended = enriched.filter(e => e.state === 'ended');
        const ok = await confirm({
            title: `Close ${ended.length} ended giveaway${ended.length === 1 ? '' : 's'}?`,
            body: `${ended.map(e => e.g.name).join(', ')}. Their end dates have passed.`,
            confirmLabel: 'Close them',
            tone: 'accent',
        });
        if (ok) run('bulk', () => useStore.getState().closeGiveaways(ended.map(e => e.g.id)), 'Ended giveaways closed.');
    };

    const notify = async (g) => {
        if (!(await confirm({ title: 'Notify everyone?', body: `Every user gets a notification about "${g.name}".`, confirmLabel: 'Send', tone: 'accent' }))) return;
        run(g.id, () => notifyAllUsers(`New giveaway: ${g.name}`, g.description || '', `/giveaway/${g.slug}`, g.posterUrl || ''), 'Notification sent.');
    };

    const duplicate = (g) => run(g.id, async () => {
        const { id, createdAt, updatedAt, drawHistory, lastDrawAt, closedAt, ...copy } = g;
        let slug = slugify(`${g.slug || g.name}-copy`);
        let n = 2;
        while (giveaways.some(x => x.slug === slug)) { slug = slugify(`${g.slug || g.name}-copy-${n}`); n += 1; }
        const ref = await useStore.getState().addGiveaway({
            ...JSON.parse(JSON.stringify(copy)),
            name: `${g.name || 'Giveaway'} (copy)`,
            slug,
            status: 'Open',
            endDate: '',
            endTime: '',
            winnerAnnouncementDate: '',
            alsoPostToUpcomingEvents: false,
            alsoPostToAnnouncements: false,
        });
        if (ref?.id) setParam({ edit: ref.id });
    }, 'Copy made. Set its dates and publish.');

    const remove = async (e) => {
        const ok = await confirm({
            title: `Delete "${e.g.name || 'this giveaway'}"?`,
            body: `The page /giveaway/${e.g.slug} stops working and its home page card and announcement are removed.${e.count ? ` Its ${e.count} entries are kept in the database but won't be listed anywhere.` : ''} This can't be undone.`,
            confirmLabel: 'Delete giveaway',
        });
        if (ok) run(e.g.id, () => useStore.getState().deleteGiveaway(e.g.id), 'Giveaway deleted.');
    };

    const exportSpec = () => ({
        filename: `giveaways_${filter}_${fileDate()}`,
        sheetName: 'Giveaways',
        title: 'Giveaways',
        subtitle: exportSubtitle(rows.length, 'giveaway', filter !== 'all' ? FILTER_LABEL[filter] : null),
        rows,
        totals: { entries: true, points: true },
        columns: [
            { header: 'Name', value: e => e.g.name || '' },
            { header: 'Status', value: e => GIVEAWAY_STATE[e.state].label },
            { header: 'Entries close', type: 'datetime', value: e => e.end },
            { header: 'Winners announced', type: 'date', value: e => e.g.winnerAnnouncementDate || null },
            { header: 'Prize', value: e => e.g.prize || '' },
            { header: 'Available', type: 'number', value: e => Number(e.g.ticketsAvailable) || 0 },
            { header: 'Entries', key: 'entries', type: 'number', value: e => e.count },
            { header: 'Points', key: 'points', type: 'number', value: e => e.points },
            { header: 'Winners', value: e => e.winners.map(w => w.name).join(', ') },
            { header: 'Tasks', type: 'number', value: e => (e.g.tasks || []).length },
            { header: 'Link', value: e => linkOf(e.g) },
        ],
    });

    // ── editor ──
    const editing = editId ? giveaways.find(g => g.id === editId) : null;
    if (isNew || editing) {
        return (
            <AdminCommunityHubLayout studioHeader={{ title: isNew ? 'New giveaway' : 'Edit giveaway', icon: Gift, description: 'Entries, tasks and the winner draw' }} hideTabs>
                <GiveawayEditor key={editId || 'new'} giveaway={editing} giveaways={giveaways} onDone={() => setParam({ edit: null, new: null })} />
            </AdminCommunityHubLayout>
        );
    }

    const participantsPath = (g) => `/admin/giveaways/${g.id}/participants`;

    const menu = (e) => (
        <Menu trigger={({ toggle }) => (
            <Button size="sm" variant="ghost" onClick={toggle} aria-label="More actions" className="h-10 w-10 px-0"><MoreHorizontal size={16} /></Button>
        )}>
            <MenuItem icon={Users} onClick={() => navigate(participantsPath(e.g))}>Participants</MenuItem>
            <MenuItem icon={Edit} onClick={() => setParam({ edit: e.g.id })}>Edit</MenuItem>
            <MenuItem icon={Shuffle} onClick={() => setDrawId(e.g.id)} disabled={!e.count}>Draw winners</MenuItem>
            <MenuItem as="a" href={`/giveaway/${e.g.slug}`} target="_blank" rel="noopener noreferrer" icon={ExternalLink}>Open giveaway page</MenuItem>
            <MenuItem icon={Link2} onClick={() => copyLink(e.g)}>Copy link</MenuItem>
            {e.state !== 'closed' ? <MenuItem icon={Lock} onClick={() => close(e)}>Close giveaway</MenuItem> : <MenuItem icon={Unlock} onClick={() => reopen(e)}>Reopen</MenuItem>}
            <MenuItem icon={Bell} onClick={() => notify(e.g)} hint="Push and in-app">Notify everyone</MenuItem>
            <MenuItem icon={CopyPlus} onClick={() => duplicate(e.g)}>Duplicate</MenuItem>
            <MenuItem icon={Trash2} danger onClick={() => remove(e)}>Delete</MenuItem>
        </Menu>
    );

    const drawGiveaway = giveaways.find(g => g.id === drawId);

    return (
        <AdminCommunityHubLayout
            studioHeader={{ title: 'Giveaways', icon: Gift, description: 'Entries, tasks and fair winner draws' }}
            hideTabs
            action={<Button variant="primary" onClick={() => setParam({ new: '1' })} className="h-11 w-full sm:w-auto"><Plus size={15} /> New giveaway</Button>}
        >
            <div className="space-y-5">
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <StatTile icon={Radio} tone="green" label="Open" value={tally.open} hint="Taking entries" active={filter === 'open'} onClick={() => setParam({ filter: filter === 'open' ? null : 'open' }, true)} />
                    <StatTile icon={Users} tone="blue" label="Entries" value={tally.entries.toLocaleString('en-IN')} hint={`Across ${tally.all} giveaway${tally.all === 1 ? '' : 's'}`} />
                    <StatTile icon={Trophy} tone="amber" label="Winners" value={tally.winners} hint={latestWinner ? `Latest: ${latestWinner.name}` : 'None picked yet'} />
                    <StatTile icon={Clock} tone={tally.ended ? 'red' : 'gray'} label="Ended, still open" value={tally.ended} hint={tally.ended ? 'Close them to stop entries' : 'Nothing to close'} active={filter === 'ended'} onClick={() => setParam({ filter: filter === 'ended' ? null : 'ended' }, true)} />
                </div>

                {tally.ended > 0 && (
                    <div className="flex flex-col gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/[0.07] p-4 sm:flex-row sm:items-center">
                        <AlertTriangle size={18} className="shrink-0 text-amber-600 dark:text-amber-400" />
                        <p className="flex-1 text-[14px]"><span className="font-bold">{tally.ended} giveaway{tally.ended === 1 ? ' has' : 's have'} passed the end date.</span> New entries are already blocked; close {tally.ended === 1 ? 'it' : 'them'} to show the result on the page.</p>
                        <Button variant="secondary" onClick={closeEnded} disabled={busyId === 'bulk'} className="h-11">Close {tally.ended === 1 ? 'it' : 'them'}</Button>
                    </div>
                )}

                <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                    <SearchInput value={search} onChange={setSearch} placeholder="Search giveaways" className="lg:w-80" />
                    <div className="flex flex-1 items-center gap-2">
                        <Select value={sort} onChange={setSort} label="Sort" className="flex-1 lg:w-48 lg:flex-none" options={[
                            { value: 'newest', label: 'Newest first' },
                            { value: 'ending', label: 'Ending soonest' },
                            { value: 'entries', label: 'Most entries' },
                            { value: 'name', label: 'Name A–Z' },
                        ]} />
                        <ExportMenu getSpec={exportSpec} />
                        <ViewToggle value={view} onChange={setView} />
                    </div>
                </div>

                <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
                    <SegmentedTabs value={filter} onChange={(v) => setParam({ filter: v === 'all' ? null : v }, true)} items={FILTERS.map(f => ({ value: f, label: FILTER_LABEL[f], count: tally[f], highlight: f === 'ended' && tally.ended > 0 }))} />
                </div>

                {!loaded && giveaways.length === 0 ? (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map(i => <div key={i} className="h-72 rounded-2xl bg-black/[0.04] dark:bg-white/[0.04]" />)}</div>
                ) : rows.length === 0 ? (
                    <div className="rounded-2xl border border-black/[0.06] bg-white dark:border-white/[0.08] dark:bg-white/[0.03]">
                        <EmptyState
                            icon={Gift}
                            title={giveaways.length ? 'No matching giveaways' : 'No giveaways yet'}
                            description={giveaways.length ? 'Try another filter or search.' : 'Set a prize, add tasks that earn extra chances, share the link and draw a winner.'}
                            action={!giveaways.length && <Button variant="primary" onClick={() => setParam({ new: '1' })}><Plus size={14} /> New giveaway</Button>}
                        />
                    </div>
                ) : view === 'cards' ? (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {rows.map(e => (
                            <article key={e.g.id} className={cn('flex flex-col overflow-hidden rounded-2xl border border-black/[0.06] bg-white transition-colors hover:border-black/15 dark:border-white/[0.08] dark:bg-white/[0.03] dark:hover:border-white/15', busyId === e.g.id && 'opacity-60')}>
                                <Link to={participantsPath(e.g)} className="relative flex h-40 items-center justify-center overflow-hidden bg-rose-500/10 text-rose-500">
                                    {e.g.posterUrl ? <img src={e.g.posterUrl} alt="" loading="lazy" className="h-full w-full object-cover" /> : <Gift size={34} />}
                                    <span className="absolute left-3 top-3"><Badge tone={GIVEAWAY_STATE[e.state].tone} className="bg-white/90 dark:bg-black/70">{GIVEAWAY_STATE[e.state].label}</Badge></span>
                                </Link>
                                <div className="flex flex-1 flex-col p-4">
                                    <h3 className="line-clamp-2 text-[16px] font-extrabold leading-snug">{e.g.name || 'Untitled giveaway'}</h3>
                                    <p className="mt-0.5 truncate font-mono text-[12px] text-gray-500">/giveaway/{e.g.slug}</p>
                                    <p className={cn('mt-2 flex items-center gap-1.5 text-[13px] font-semibold', e.state === 'ended' ? 'text-amber-600 dark:text-amber-400' : 'text-gray-600 dark:text-zinc-300')}><Clock size={13} /> {endsText(e.g, e.state)}</p>
                                    <div className="mb-4 mt-3 grid grid-cols-3 gap-2 text-center">
                                        <div className="rounded-xl bg-sky-500/[0.08] py-2"><p className="text-[16px] font-extrabold tabular-nums">{e.count}</p><p className="text-[11px] font-semibold text-gray-500">entries</p></div>
                                        <div className="rounded-xl bg-violet-500/[0.08] py-2"><p className="text-[16px] font-extrabold tabular-nums">{e.points}</p><p className="text-[11px] font-semibold text-gray-500">points</p></div>
                                        <div className="rounded-xl bg-amber-500/[0.1] py-2"><p className="text-[16px] font-extrabold tabular-nums">{e.winners.length}</p><p className="text-[11px] font-semibold text-gray-500">winners</p></div>
                                    </div>
                                    {e.winners.length > 0 && <p className="-mt-2 mb-3 truncate text-[12px] text-gray-500"><Trophy size={12} className="mr-1 inline text-amber-500" />{e.winners.map(w => w.name).join(', ')}</p>}
                                    <div className="mt-auto flex items-center gap-2 border-t border-black/[0.06] pt-3 dark:border-white/[0.06]">
                                        <Button size="sm" variant="accent" as={Link} to={participantsPath(e.g)} className="h-10 flex-1"><Users size={14} /> Participants</Button>
                                        {e.state !== 'closed' && e.count > 0 && <Button size="sm" variant="secondary" onClick={() => setDrawId(e.g.id)} className="h-10"><Shuffle size={14} /> Draw</Button>}
                                        {menu(e)}
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>
                ) : (
                    <div className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white dark:border-white/[0.08] dark:bg-white/[0.03]">
                        <ul className="divide-y divide-black/[0.05] dark:divide-white/[0.05]">
                            {rows.map(e => (
                                <li key={e.g.id} className={cn('flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:px-5', busyId === e.g.id && 'opacity-60')}>
                                    <Link to={participantsPath(e.g)} className="flex min-w-0 flex-1 items-center gap-3">
                                        <span className="flex h-12 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-rose-500/10 text-rose-500">
                                            {e.g.posterUrl ? <img src={e.g.posterUrl} alt="" className="h-full w-full object-cover" loading="lazy" /> : <Gift size={16} />}
                                        </span>
                                        <span className="min-w-0">
                                            <span className="flex flex-wrap items-center gap-1.5">
                                                <span className="truncate text-[15px] font-bold">{e.g.name || 'Untitled giveaway'}</span>
                                                <Badge tone={GIVEAWAY_STATE[e.state].tone}>{GIVEAWAY_STATE[e.state].label}</Badge>
                                                {e.winners.length > 0 && <Badge tone="amber"><Trophy size={10} /> {e.winners.length}</Badge>}
                                            </span>
                                            <span className="mt-0.5 block truncate text-[12px] text-gray-500">{endsText(e.g, e.state)} · {e.count} entries · {e.points} points</span>
                                        </span>
                                    </Link>
                                    <div className="flex items-center gap-2 sm:justify-end">
                                        {e.state !== 'closed' && e.count > 0 && <Button size="sm" variant="secondary" onClick={() => setDrawId(e.g.id)} className="h-10 flex-1 sm:flex-none"><Shuffle size={14} /> Draw</Button>}
                                        <Button size="sm" variant="secondary" onClick={() => setParam({ edit: e.g.id })} className="h-10 flex-1 sm:flex-none"><Edit size={14} /> Edit</Button>
                                        {menu(e)}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>

            <WinnerDrawSheet open={Boolean(drawGiveaway)} onClose={() => setDrawId(null)} giveaway={drawGiveaway} entries={drawGiveaway ? byCampaign[drawGiveaway.id]?.entries || [] : []} />
            {confirmEl}
        </AdminCommunityHubLayout>
    );
};

export default GiveawayManager;
