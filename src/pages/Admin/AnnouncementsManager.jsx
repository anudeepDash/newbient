import React, { useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Plus from 'lucide-react/dist/esm/icons/plus';
import Radio from 'lucide-react/dist/esm/icons/radio';
import Pin from 'lucide-react/dist/esm/icons/pin';
import PinOff from 'lucide-react/dist/esm/icons/pin-off';
import Edit from 'lucide-react/dist/esm/icons/edit-3';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import Copy from 'lucide-react/dist/esm/icons/copy';
import Bell from 'lucide-react/dist/esm/icons/bell';
import Mail from 'lucide-react/dist/esm/icons/mail';
import ArrowUp from 'lucide-react/dist/esm/icons/arrow-up';
import ArrowDown from 'lucide-react/dist/esm/icons/arrow-down';
import CalendarClock from 'lucide-react/dist/esm/icons/calendar-clock';
import CircleOff from 'lucide-react/dist/esm/icons/circle-off';
import Play from 'lucide-react/dist/esm/icons/play';
import Megaphone from 'lucide-react/dist/esm/icons/megaphone';
import MoreHorizontal from 'lucide-react/dist/esm/icons/more-horizontal';
import Archive from 'lucide-react/dist/esm/icons/archive';
import { useStore } from '../../lib/store';
import { useStoreSubscription } from '../../hooks/useStoreSubscription';
import { cn } from '../../lib/utils';
import AdminCommunityHubLayout from '../../components/admin/AdminCommunityHubLayout';
import { Card, Button, Badge, StatTile, SearchInput, SegmentedTabs, EmptyState, Menu, MenuItem, ViewToggle, useViewMode } from '../../components/admin/ui';
import ExportMenu from '../../components/admin/ExportMenu';
import { CONTENT_TABS, ConfirmSheet, framedBackground } from '../../components/admin/content/ContentKit';
import AnnouncementComposer, { sendAnnouncementNotification } from '../../components/admin/content/AnnouncementComposer';
import {
    announcementCategory, announcementState, announcementWindow, ANNOUNCEMENT_STATE_LABEL, ANNOUNCEMENT_PRIORITIES,
    formatDay, formatDayTime, relativeTime, stripHtml,
} from '../../components/admin/content/contentRules';

const FILTERS = [
    { value: 'all', label: 'All' },
    { value: 'live', label: 'Live' },
    { value: 'pinned', label: 'In the banner' },
    { value: 'scheduled', label: 'Scheduled' },
    { value: 'ended', label: 'Ended' },
];

const windowText = (a) => {
    const { start, end } = announcementWindow(a);
    const state = announcementState(a);
    if (state === 'scheduled') return `Starts ${formatDayTime(start)}${end ? ` · ends ${formatDay(end)}` : ''}`;
    if (state === 'ended') return `Ended ${formatDay(end)}`;
    return end ? `Live until ${formatDay(end)}` : 'Live, no end date';
};

const AnnouncementsManager = () => {
    useStoreSubscription(['announcements']);
    const { announcements, updateAnnouncement, togglePinAnnouncement, deleteAnnouncement, reorderAnnouncements, addToast } = useStore();
    const navigate = useNavigate();
    const [params, setParams] = useSearchParams();
    const [search, setSearch] = useState('');
    const [view, setView] = useViewMode('announcements', 'cards');
    const [composer, setComposer] = useState(null); // { record } | { copyOf } | {}
    const [confirm, setConfirm] = useState(null); // { kind, item }
    const [busy, setBusy] = useState(false);
    const busyRef = useRef(false);

    const filter = FILTERS.some(f => f.value === params.get('filter')) ? params.get('filter') : 'all';
    const setFilter = (v) => { const next = new URLSearchParams(params); if (v === 'all') next.delete('filter'); else next.set('filter', v); setParams(next, { replace: true }); };

    // Deep links: ?new=1 opens the composer, ?id= opens one announcement.
    const deepId = params.get('id');
    const deepNew = params.get('new');
    const deepRecord = deepId ? announcements.find(a => a.id === deepId) : null;
    const composerOpen = Boolean(composer) || Boolean(deepRecord) || deepNew === '1';
    const composerRecord = composer ? (composer.record || (composer.copyOf ? composer : null)) : deepRecord || null;
    const closeComposer = () => {
        setComposer(null);
        if (deepId || deepNew) { const next = new URLSearchParams(params); next.delete('id'); next.delete('new'); setParams(next, { replace: true }); }
    };

    const rows = useMemo(() => {
        let bannerFound = false;
        return announcements.map(a => {
            const state = announcementState(a);
            const inBanner = !bannerFound && a.isPinned && state === 'live';
            if (inBanner) bannerFound = true;
            return { a, state, inBanner };
        });
    }, [announcements]);

    const counts = useMemo(() => ({
        all: rows.length,
        live: rows.filter(r => r.state === 'live').length,
        pinned: rows.filter(r => r.a.isPinned && r.state !== 'ended').length,
        scheduled: rows.filter(r => r.state === 'scheduled').length,
        ended: rows.filter(r => r.state === 'ended').length,
    }), [rows]);
    const banner = rows.find(r => r.inBanner);

    const shown = useMemo(() => {
        const q = search.trim().toLowerCase();
        return rows.filter(({ a, state }) => {
            if (filter === 'live' && state !== 'live') return false;
            if (filter === 'scheduled' && state !== 'scheduled') return false;
            if (filter === 'ended' && state !== 'ended') return false;
            if (filter === 'pinned' && !(a.isPinned && state !== 'ended')) return false;
            if (!q) return true;
            return [a.title, a.tagline, a.content, a.category].some(v => String(v || '').toLowerCase().includes(q));
        });
    }, [rows, filter, search]);
    const canReorder = !search.trim();

    const guard = async (fn) => {
        if (busyRef.current) return;
        busyRef.current = true;
        setBusy(true);
        try { await fn(); } finally { busyRef.current = false; setBusy(false); }
    };

    const togglePin = (a) => guard(async () => {
        try {
            await togglePinAnnouncement(a.id);
            addToast(a.isPinned ? 'Removed from the website banner.' : 'Pinned to the website banner.', 'success');
        } catch (err) {
            console.error(err);
            addToast("Couldn't update the banner. Please try again.", 'error');
        }
    });

    // Move within its group (pinned ones always sort first).
    const move = (a, dir) => guard(async () => {
        const list = [...announcements];
        const i = list.findIndex(x => x.id === a.id);
        let j = i + dir;
        while (j >= 0 && j < list.length && !!list[j].isPinned !== !!a.isPinned) j += dir;
        if (j < 0 || j >= list.length) return;
        [list[i], list[j]] = [list[j], list[i]];
        try {
            await reorderAnnouncements(list);
        } catch (err) {
            console.error(err);
            addToast("Couldn't save the new order. Please try again.", 'error');
        }
    });

    const endNow = (a) => guard(async () => {
        try {
            const { start } = announcementWindow(a);
            await updateAnnouncement(a.id, { endsAt: new Date().toISOString(), startsAt: start ? start.toISOString() : '', updatedAt: new Date().toISOString() });
            addToast('Ended. It no longer shows on the site.', 'success');
        } catch (err) {
            console.error(err);
            addToast("Couldn't end it. Please try again.", 'error');
        }
    });

    const showAgain = (a) => guard(async () => {
        try {
            await updateAnnouncement(a.id, { endsAt: '', startsAt: '', updatedAt: new Date().toISOString() });
            addToast('Live again.', 'success');
        } catch (err) {
            console.error(err);
            addToast("Couldn't update it. Please try again.", 'error');
        }
    });

    const runConfirm = () => guard(async () => {
        const { kind, item } = confirm || {};
        if (!item) return;
        try {
            if (kind === 'delete') {
                await deleteAnnouncement(item.id);
                addToast('Announcement deleted.', 'success');
            } else if (kind === 'notify') {
                const claimed = await useStore.getState().claimContentNotification('announcements', item.id, { force: !!item.notifiedAt });
                if (!claimed) { addToast('It was already sent a moment ago.', 'info'); }
                else {
                    await sendAnnouncementNotification(item, !!confirm.email);
                    addToast(confirm.email ? 'Notification sent. Opening Mailing for the email…' : 'Notification sent to everyone.', 'success');
                }
            }
            setConfirm(null);
        } catch (err) {
            console.error(err);
            addToast(kind === 'delete' ? "Couldn't delete it. Please try again." : "Couldn't send the notification. Please try again.", 'error');
        }
    });

    const emailViaMailing = (a) => {
        const qs = new URLSearchParams({
            subject: a.title || 'Announcement',
            header: a.title || '',
            body: stripHtml(a.content),
            heroImage: a.image || '',
            ctaText: a.buttonText || 'Read more',
            ctaUrl: a.link ? (a.link.startsWith('/') ? `${window.location.origin}${a.link}` : a.link) : window.location.origin,
        });
        navigate(`/admin/mailing?${qs.toString()}`);
    };

    const exportSpec = () => ({
        filename: `announcements_${filter}`,
        sheetName: 'Announcements',
        title: 'Announcements',
        subtitle: `${shown.length} announcement${shown.length === 1 ? '' : 's'}`,
        rows: shown,
        columns: [
            { header: 'Headline', value: r => r.a.title || '' },
            { header: 'Message', value: r => stripHtml(r.a.content) },
            { header: 'Category', value: r => announcementCategory(r.a.category).label },
            { header: 'Priority', value: r => r.a.priority || 'Normal' },
            { header: 'Status', value: r => ANNOUNCEMENT_STATE_LABEL[r.state].label },
            { header: 'In banner', value: r => (r.inBanner ? 'Showing now' : r.a.isPinned ? 'Pinned' : 'No') },
            { header: 'Starts', type: 'datetime', value: r => announcementWindow(r.a).start || null },
            { header: 'Ends', type: 'datetime', value: r => announcementWindow(r.a).end || null },
            { header: 'Notified', type: 'datetime', value: r => r.a.notifiedAt || null },
            { header: 'Link', value: r => r.a.link || '' },
        ],
    });

    const actions = (a, state) => (
        <Menu trigger={({ toggle }) => (
            <Button size="sm" variant="ghost" onClick={toggle} aria-label="More actions" className="h-10 w-10 px-0"><MoreHorizontal size={16} /></Button>
        )}>
            <MenuItem icon={Edit} onClick={() => setComposer({ record: a })}>Edit</MenuItem>
            <MenuItem icon={a.isPinned ? PinOff : Pin} onClick={() => togglePin(a)} hint={a.isPinned ? 'Take it out of the website banner' : 'Show it at the top of every page'}>{a.isPinned ? 'Unpin from banner' : 'Pin to banner'}</MenuItem>
            {state === 'live' && (
                <MenuItem icon={Bell} onClick={() => setConfirm({ kind: 'notify', item: a, email: false })} hint={a.notifiedAt ? `Already sent ${relativeTime(a.notifiedAt)}` : 'In-app and phone notification'}>
                    {a.notifiedAt ? 'Send notification again' : 'Send notification'}
                </MenuItem>
            )}
            <MenuItem icon={Mail} onClick={() => emailViaMailing(a)} hint="Opens Mailing with this filled in">Email as a campaign</MenuItem>
            <MenuItem icon={Copy} onClick={() => setComposer({ copyOf: a })}>Duplicate</MenuItem>
            {canReorder && <MenuItem icon={ArrowUp} onClick={() => move(a, -1)}>Move up</MenuItem>}
            {canReorder && <MenuItem icon={ArrowDown} onClick={() => move(a, 1)}>Move down</MenuItem>}
            {state === 'ended'
                ? <MenuItem icon={Play} onClick={() => showAgain(a)} hint="Removes the end date">Show again</MenuItem>
                : <MenuItem icon={CircleOff} onClick={() => endNow(a)} hint="Hides it from the site, keeps it here">End now</MenuItem>}
            <MenuItem icon={Trash2} danger onClick={() => setConfirm({ kind: 'delete', item: a })}>Delete</MenuItem>
        </Menu>
    );

    const badges = (a, state, inBanner) => {
        const cat = announcementCategory(a.category);
        const pr = ANNOUNCEMENT_PRIORITIES.find(p => p.value === a.priority);
        return (
            <div className="flex flex-wrap items-center gap-1.5">
                <Badge tone={ANNOUNCEMENT_STATE_LABEL[state].tone}>{ANNOUNCEMENT_STATE_LABEL[state].label}</Badge>
                {inBanner && <Badge tone="amber"><Megaphone size={10} /> In the banner now</Badge>}
                {!inBanner && a.isPinned && state !== 'ended' && <Badge tone="amber"><Pin size={10} /> Pinned</Badge>}
                <Badge tone={cat.tone}>{cat.label}</Badge>
                {pr && pr.value !== 'Normal' && <Badge tone={pr.tone}>{pr.label}</Badge>}
                {a.linkedEventId && <Badge tone="green">From an event</Badge>}
                {a.linkedGiveawayId && <Badge tone="rose">From a giveaway</Badge>}
            </div>
        );
    };

    const notifiedText = (a) => a.notifiedAt ? `Notified ${relativeTime(a.notifiedAt)}` : 'Not notified';

    return (
        <AdminCommunityHubLayout
            studioHeader={{ title: 'Announcements', icon: Radio, description: 'The website banner and notifications to everyone' }}
            tabs={CONTENT_TABS}
            action={<Button variant="accent" onClick={() => setComposer({})} className="w-full sm:w-auto"><Plus size={15} /> New announcement</Button>}
        >
            <div className="space-y-5">
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <StatTile icon={Radio} tone="green" label="Live" value={counts.live} hint={counts.live ? 'Inside their show dates' : 'Nothing live'} active={filter === 'live'} onClick={() => setFilter(filter === 'live' ? 'all' : 'live')} />
                    <StatTile icon={Megaphone} tone="amber" label="Website banner" value={banner ? 'On' : 'Off'} hint={banner ? banner.a.title : 'Pin one to show it'} active={filter === 'pinned'} onClick={() => setFilter(filter === 'pinned' ? 'all' : 'pinned')} />
                    <StatTile icon={CalendarClock} tone="blue" label="Scheduled" value={counts.scheduled} hint={counts.scheduled ? 'Start on their own' : 'None waiting'} active={filter === 'scheduled'} onClick={() => setFilter(filter === 'scheduled' ? 'all' : 'scheduled')} />
                    <StatTile icon={Archive} tone="gray" label="Ended" value={counts.ended} hint="Hidden from the site" active={filter === 'ended'} onClick={() => setFilter(filter === 'ended' ? 'all' : 'ended')} />
                </div>

                <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                    <SearchInput value={search} onChange={setSearch} placeholder="Search headlines and messages" className="lg:w-80" />
                    <div className="flex flex-1 items-center justify-end gap-2">
                        <ExportMenu getSpec={exportSpec} />
                        <ViewToggle value={view} onChange={setView} />
                    </div>
                </div>

                <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
                    <SegmentedTabs value={filter} onChange={setFilter} items={FILTERS.map(f => ({ ...f, count: counts[f.value] }))} />
                </div>

                {shown.length === 0 ? (
                    <Card className="rounded-2xl">
                        <EmptyState
                            icon={Megaphone}
                            title={rows.length ? 'Nothing matches' : 'No announcements yet'}
                            description={rows.length ? 'Try another filter or search.' : 'Post news, pin it to the website banner, and notify everyone in one go.'}
                            action={!rows.length && <Button variant="accent" onClick={() => setComposer({})}><Plus size={14} /> New announcement</Button>}
                        />
                    </Card>
                ) : view === 'cards' ? (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {shown.map(({ a, state, inBanner }) => (
                            <Card key={a.id} className={cn('relative flex flex-col overflow-hidden rounded-2xl transition-colors hover:border-black/15 dark:hover:border-white/15', inBanner && 'border-amber-500/40 dark:border-amber-300/40', state === 'ended' && 'opacity-75')}>
                                <div className="relative aspect-[16/7] overflow-hidden bg-amber-500/[0.07] dark:bg-amber-400/[0.06]">
                                    {a.image
                                        ? <div className="absolute inset-0" style={framedBackground(a.image, a.imageTransform)} />
                                        : <div className="absolute inset-0 flex items-center justify-center text-amber-600/60 dark:text-amber-300/50"><Megaphone size={30} /></div>}
                                </div>
                                <div className="flex flex-1 flex-col p-4">
                                    {badges(a, state, inBanner)}
                                    <button type="button" onClick={() => setComposer({ record: a })} className="mt-2.5 min-w-0 text-left">
                                        <p className="line-clamp-2 text-[16px] font-extrabold leading-snug">{a.title || 'Untitled'}</p>
                                        <p className="mt-1 line-clamp-2 text-[13px] text-gray-500 dark:text-zinc-400">{stripHtml(a.content) || a.tagline || ' '}</p>
                                    </button>
                                    <div className="mt-3 space-y-0.5 text-[12px] text-gray-500">
                                        <p className={cn(state === 'scheduled' && 'font-semibold text-sky-600 dark:text-neon-blue')}>{windowText(a)}</p>
                                        <p>{notifiedText(a)}</p>
                                    </div>
                                    <div className="flex-1" />
                                    <div className="mt-4 flex items-center gap-2 border-t border-black/[0.06] pt-3 dark:border-white/[0.06]">
                                        <Button size="sm" variant="secondary" onClick={() => setComposer({ record: a })} className="h-10 flex-1"><Edit size={13} /> Edit</Button>
                                        <Button size="sm" variant={a.isPinned ? 'accent' : 'secondary'} onClick={() => togglePin(a)} disabled={busy} aria-pressed={!!a.isPinned} className="h-10 flex-1">
                                            {a.isPinned ? <><PinOff size={13} /> Unpin</> : <><Pin size={13} /> Pin</>}
                                        </Button>
                                        {actions(a, state)}
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <Card className="overflow-hidden rounded-2xl">
                        <ul className="divide-y divide-black/[0.05] dark:divide-white/[0.05]">
                            {shown.map(({ a, state, inBanner }) => (
                                <li key={a.id} className={cn('flex items-center gap-3 px-4 py-3 sm:px-5', state === 'ended' && 'opacity-75')}>
                                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-amber-500/[0.08] dark:bg-amber-400/[0.08]">
                                        {a.image ? <div className="absolute inset-0" style={framedBackground(a.image, a.imageTransform)} /> : <div className="flex h-full w-full items-center justify-center text-amber-600 dark:text-amber-300"><Megaphone size={18} /></div>}
                                    </div>
                                    <button type="button" onClick={() => setComposer({ record: a })} className="min-w-0 flex-1 text-left">
                                        <span className="flex flex-wrap items-center gap-2">
                                            <span className="truncate text-[15px] font-bold">{a.title || 'Untitled'}</span>
                                            <Badge tone={ANNOUNCEMENT_STATE_LABEL[state].tone}>{ANNOUNCEMENT_STATE_LABEL[state].label}</Badge>
                                            {inBanner && <Badge tone="amber"><Megaphone size={10} /> Banner</Badge>}
                                            {!inBanner && a.isPinned && state !== 'ended' && <Badge tone="amber"><Pin size={10} /> Pinned</Badge>}
                                        </span>
                                        <span className="mt-0.5 block truncate text-[12px] text-gray-500">{[announcementCategory(a.category).label, windowText(a), notifiedText(a)].join(' · ')}</span>
                                    </button>
                                    <div className="flex shrink-0 items-center gap-1">
                                        <Button size="sm" variant="ghost" onClick={() => togglePin(a)} disabled={busy} aria-label={a.isPinned ? 'Unpin from banner' : 'Pin to banner'} className={cn('hidden h-10 w-10 px-0 sm:inline-flex', a.isPinned && 'text-amber-600 dark:text-amber-300')}>
                                            {a.isPinned ? <Pin size={15} className="fill-current" /> : <Pin size={15} />}
                                        </Button>
                                        {actions(a, state)}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </Card>
                )}
                {rows.some(r => r.a.isPinned && r.state === 'live' && !r.inBanner) && (
                    <p className="text-[12px] text-gray-500">More than one announcement is pinned. The website shows only the top one; use Move up to change which.</p>
                )}
            </div>

            <AnnouncementComposer open={composerOpen} onClose={closeComposer} record={composerRecord} />

            <ConfirmSheet
                open={confirm?.kind === 'delete'}
                onClose={() => setConfirm(null)}
                title="Delete this announcement?"
                confirmLabel="Delete"
                busy={busy}
                onConfirm={runConfirm}
            >
                <p><span className="font-semibold text-gray-900 dark:text-white">{confirm?.item?.title}</span> will be removed{confirm?.item?.isPinned ? ' and taken out of the website banner' : ''}. This can't be undone.</p>
                {confirm?.item?.linkedEventId && <p>It was made from an event. The event itself stays as it is.</p>}
                <p>To hide it but keep it here, use <span className="font-semibold">End now</span> instead.</p>
            </ConfirmSheet>

            <ConfirmSheet
                open={confirm?.kind === 'notify'}
                onClose={() => setConfirm(null)}
                title={confirm?.item?.notifiedAt ? 'Notify everyone again?' : 'Notify everyone?'}
                confirmLabel={confirm?.email ? 'Send and write email' : 'Send notification'}
                tone="accent"
                busy={busy}
                onConfirm={runConfirm}
            >
                <p>Everyone gets <span className="font-semibold text-gray-900 dark:text-white">{confirm?.item?.title}</span> as an in-app and phone notification.</p>
                {confirm?.item?.notifiedAt && <p className="font-semibold text-amber-600 dark:text-amber-400">It was already sent {formatDayTime(confirm.item.notifiedAt)}. People will get it twice.</p>}
                <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-black/10 px-3 dark:border-white/10">
                    <input type="checkbox" className="h-5 w-5 accent-amber-500" checked={!!confirm?.email} onChange={(e) => setConfirm(c => ({ ...c, email: e.target.checked }))} />
                    <span className="text-[13px] font-semibold text-gray-800 dark:text-zinc-200">Also write an email (opens Mailing to pick who gets it)</span>
                </label>
            </ConfirmSheet>
        </AdminCommunityHubLayout>
    );
};

export default AnnouncementsManager;
