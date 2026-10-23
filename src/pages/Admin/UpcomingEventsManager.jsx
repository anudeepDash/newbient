import React, { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Calendar from 'lucide-react/dist/esm/icons/calendar';
import CalendarDays from 'lucide-react/dist/esm/icons/calendar-days';
import Plus from 'lucide-react/dist/esm/icons/plus';
import Edit from 'lucide-react/dist/esm/icons/edit';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import Ticket from 'lucide-react/dist/esm/icons/ticket';
import Users from 'lucide-react/dist/esm/icons/users';
import Pin from 'lucide-react/dist/esm/icons/pin';
import Eye from 'lucide-react/dist/esm/icons/eye';
import EyeOff from 'lucide-react/dist/esm/icons/eye-off';
import Clock from 'lucide-react/dist/esm/icons/clock';
import MapPin from 'lucide-react/dist/esm/icons/map-pin';
import Bell from 'lucide-react/dist/esm/icons/bell';
import Mail from 'lucide-react/dist/esm/icons/mail';
import Link2 from 'lucide-react/dist/esm/icons/link-2';
import CopyPlus from 'lucide-react/dist/esm/icons/copy-plus';
import ArrowUp from 'lucide-react/dist/esm/icons/arrow-up';
import ArrowDown from 'lucide-react/dist/esm/icons/arrow-down';
import ExternalLink from 'lucide-react/dist/esm/icons/external-link';
import FileEdit from 'lucide-react/dist/esm/icons/file-pen-line';
import MoreHorizontal from 'lucide-react/dist/esm/icons/more-horizontal';
import Globe from 'lucide-react/dist/esm/icons/globe';
import { useStore } from '../../lib/store';
import { useStoreSubscription } from '../../hooks/useStoreSubscription';
import { notifyAllUsers } from '../../lib/notificationTriggers';
import { computeAvailability } from '../../lib/ticketing';
import { copyToClipboard } from '../../lib/clipboard';
import { appUrl } from '../../app/host';
import { cn } from '../../lib/utils';
import { exportSubtitle, fileDate } from '../../lib/xlsx';
import AdminCommunityHubLayout from '../../components/admin/AdminCommunityHubLayout';
import ExportMenu from '../../components/admin/ExportMenu';
import { Badge, Button, EmptyState, Menu, MenuItem, SearchInput, SegmentedTabs, Select, StatTile, ViewToggle, useViewMode } from '../../components/admin/ui';
import { useConfirm } from '../../components/admin/forms/kit';
import EventEditor from '../../components/admin/events/EventEditor';
import {
    STATE_BADGE, appPathFor, eventDayKey, eventState, eventTimeOf, formatWhen,
    homeCardSource, to12h, todayKey,
} from '../../components/admin/events/eventModel';

const FILTERS = ['upcoming', 'draft', 'past', 'all'];
const FILTER_LABEL = { upcoming: 'Upcoming', draft: 'Drafts', past: 'Past', all: 'All' };
const inFilter = (state, filter) => filter === 'all'
    || (filter === 'upcoming' && ['upcoming', 'today', 'tba'].includes(state))
    || state === filter;

const inr = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;

const UpcomingEventsManager = () => {
    useStoreSubscription(['upcomingEvents', 'portfolioCategories', 'ticketOrders']);
    const upcomingEvents = useStore(s => s.upcomingEvents) || [];
    const ticketOrders = useStore(s => s.ticketOrders) || [];
    const categories = useStore(s => s.portfolioCategories) || [];
    const siteSettings = useStore(s => s.siteSettings);
    const loaded = useStore(s => s.subscriptionsLoaded?.upcomingEvents);
    const addToast = useStore(s => s.addToast);
    const [params, setParams] = useSearchParams();
    const [view, setView] = useViewMode('events', 'cards');
    const [search, setSearch] = useState('');
    const [sort, setSort] = useState('date');
    const [busyId, setBusyId] = useState(null);
    const [confirm, confirmEl] = useConfirm();

    const filter = FILTERS.includes(params.get('filter')) ? params.get('filter') : 'upcoming';
    const editId = params.get('edit');
    const isNew = params.get('new') === '1';
    const setParam = (updates, replace = false) => {
        const next = new URLSearchParams(params);
        Object.entries(updates).forEach(([k, v]) => { if (v) next.set(k, v); else next.delete(k); });
        setParams(next, { replace });
    };

    const today = todayKey();
    const ordersByEvent = useMemo(() => {
        const map = {};
        ticketOrders.forEach(o => { (map[o.eventId] ||= []).push(o); });
        return map;
    }, [ticketOrders]);

    // Ticket sales made in Ticket sales are managed there.
    const own = useMemo(() => upcomingEvents.filter(e => e.createdIn !== 'ticketing'), [upcomingEvents]);
    const salesElsewhere = upcomingEvents.length - own.length;

    const enriched = useMemo(() => own.map(e => {
        const orders = ordersByEvent[e.id] || [];
        const availability = e.isTicketed ? computeAvailability(e, orders) : null;
        const revenue = availability ? Object.values(availability.tiers).reduce((a, t) => a + (t.revenue || 0), 0) : 0;
        return {
            e,
            index: upcomingEvents.findIndex(x => x.id === e.id),
            day: eventDayKey(e.date),
            state: eventState(e, today),
            source: homeCardSource(e),
            availability,
            revenue,
            toVerify: orders.filter(o => o.status === 'pending').length,
            orders: orders.filter(o => o.status !== 'rejected').length,
        };
    }), [own, upcomingEvents, ordersByEvent, today]);

    const tally = useMemo(() => {
        const c = { upcoming: 0, draft: 0, past: 0, all: enriched.length, sold: 0, toVerify: 0 };
        enriched.forEach(x => {
            FILTERS.slice(0, 3).forEach(f => { if (inFilter(x.state, f)) c[f] += 1; });
            if (x.state !== 'past') {
                c.sold += x.availability?.total.sold || 0;
                c.toVerify += x.toVerify;
            }
        });
        return c;
    }, [enriched]);
    const nextUp = useMemo(() => enriched.filter(x => x.day && (x.state === 'upcoming' || x.state === 'today')).sort((a, b) => a.day.localeCompare(b.day))[0], [enriched]);

    const canReorder = sort === 'order' && filter !== 'past' && !search.trim();
    const rows = useMemo(() => {
        const q = search.trim().toLowerCase();
        const list = enriched.filter(x => inFilter(x.state, filter)
            && (!q || [x.e.title, x.e.location, x.e.city, x.e.description, ...(x.e.artists || [])].some(v => String(v || '').toLowerCase().includes(q))));
        const by = {
            date: (a, b) => (filter === 'past' ? -1 : 1) * String(a.day || '9999').localeCompare(String(b.day || '9999')),
            order: (a, b) => a.index - b.index,
            newest: (a, b) => String(b.e.createdAt || '').localeCompare(String(a.e.createdAt || '')),
            title: (a, b) => String(a.e.title || '').localeCompare(String(b.e.title || '')),
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
            addToast('Check your connection and try again.', 'error', { title: 'Change not saved' });
        } finally {
            setBusyId(null);
        }
    };

    const store = () => useStore.getState();
    const linkFor = (e) => appUrl(appPathFor(e));

    const move = (x, dir) => {
        const list = [...upcomingEvents];
        const i = x.index;
        const j = i + dir;
        if (i < 0 || j < 0 || j >= list.length) return;
        [list[i], list[j]] = [list[j], list[i]];
        run(x.e.id, () => store().updateUpcomingEventOrder(list));
    };

    const hide = async (e) => {
        if (!(await confirm({ title: `Hide “${e.title || 'this event'}”?`, body: 'It moves to Drafts and comes off the website and the app until you publish it again. Tickets already sold stay valid.', confirmLabel: 'Hide', tone: 'accent' }))) return;
        run(e.id, async () => {
            await store().updateUpcomingEvent(e.id, { status: 'draft', updatedAt: new Date().toISOString() });
            if (e.isGuestlistEnabled) await store().updateGuestlist(e.id, { status: 'draft' }).catch(err => console.warn(err));
        }, 'Moved to drafts.');
    };

    const notify = async (e) => {
        if (!(await confirm({ title: 'Notify everyone?', body: `Every app user gets an in-app and push notification about “${e.title}”.`, confirmLabel: 'Send', tone: 'accent' }))) return;
        run(e.id, () => notifyAllUsers(`New event: ${e.title}`, `${formatWhen(e, { year: false })}${e.location ? ` at ${e.location}` : ''}.`, appPathFor(e), e.image || e.hubImage || ''), 'Notification sent.');
    };

    const email = (e) => {
        const q = new URLSearchParams({
            subject: e.title || 'Upcoming event',
            header: e.title || '',
            body: e.description || '',
            heroImage: e.image || e.hubImage || '',
            ctaText: e.isTicketed ? 'Get tickets' : e.isGuestlistEnabled ? 'Join the guestlist' : 'See details',
            ctaUrl: linkFor(e),
        });
        window.location.assign(`/admin/mailing?${q.toString()}`);
    };

    const copyLink = async (e) => {
        const ok = await copyToClipboard(linkFor(e));
        addToast(ok ? 'Event link copied.' : "Couldn't copy the link.", ok ? 'success' : 'error');
    };

    const duplicate = (e) => run(e.id, async () => {
        // eslint-disable-next-line no-unused-vars
        const { id, order, createdAt, updatedAt, isPinned, ...rest } = e;
        const copy = { ...JSON.parse(JSON.stringify(rest)), title: `${e.title || 'Event'} (copy)`, status: 'draft', isPinned: false, createdAt: new Date().toISOString() };
        const newId = await store().addUpcomingEvent(copy, false);
        if (newId && copy.isGuestlistEnabled) await store().updateGuestlist(newId, { status: 'draft' }).catch(err => console.warn(err));
        if (newId) setParam({ edit: newId, new: null });
    }, 'Copy saved as a draft. Change its date and publish.');

    const remove = async (x) => {
        const e = x.e;
        const parts = [];
        if (x.orders) parts.push(`Its ${x.orders} ticket ${x.orders === 1 ? 'order stays' : 'orders stay'} in Ticket sales, but the event page goes away.`);
        if (e.isGuestlistEnabled) parts.push('Guestlist sign-ups stay in Guestlists.');
        if (x.source) parts.push(`The ${x.source.label.toLowerCase()} itself is not deleted.`);
        const ok = await confirm({
            title: `Delete “${e.title || 'this event'}”?`,
            body: `${parts.join(' ')} This can’t be undone.`.trim(),
            confirmLabel: 'Delete event',
        });
        if (!ok) return;
        run(e.id, () => store().deleteUpcomingEvent(e.id), 'Event deleted.');
    };

    const exportSpec = () => ({
        filename: `events_${filter}_${fileDate()}`,
        sheetName: 'Events',
        title: 'Events',
        subtitle: exportSubtitle(rows.length, 'event', filter !== 'all' ? FILTER_LABEL[filter] : null),
        rows,
        totals: { sold: true, revenue: true },
        columns: [
            { header: 'Event', value: x => x.e.title || '' },
            { header: 'Status', value: x => STATE_BADGE[x.state].label },
            { header: 'Date', value: x => x.day },
            { header: 'Starts', value: x => to12h(eventTimeOf(x.e)) },
            { header: 'Venue', value: x => x.e.location || '' },
            { header: 'City', value: x => x.e.city || '' },
            { header: 'Tickets', value: x => (x.e.isTicketed ? 'Yes' : '') },
            { header: 'Sold', key: 'sold', type: 'number', value: x => x.availability?.total.sold ?? null },
            { header: 'Revenue', key: 'revenue', type: 'number', value: x => (x.availability ? Math.round(x.revenue) : null) },
            { header: 'Guestlist', value: x => (x.e.isGuestlistEnabled ? (x.e.guestlistMode === 'rsvp' ? 'RSVP' : 'QR passes') : '') },
            { header: 'On newbi.live', value: x => (x.e.showOnSite !== false ? 'Yes' : '') },
            { header: 'On app home', value: x => (x.e.showInApp !== false ? 'Yes' : '') },
            { header: 'Link', value: x => (x.e.isTicketed || x.e.isGuestlistEnabled ? linkFor(x.e) : '') },
        ],
    });

    // ── editor ──
    const editing = editId ? upcomingEvents.find(e => e.id === editId) : null;
    if (isNew || editing) {
        return (
            <AdminCommunityHubLayout studioHeader={{ title: isNew ? 'New event' : 'Edit event', icon: Calendar, description: 'On the website and in the app, with tickets and guestlists' }} hideTabs>
                <EventEditor
                    key={editId || 'new'}
                    event={editing}
                    orders={editing ? ordersByEvent[editing.id] || [] : []}
                    categories={categories}
                    onDone={(saved, id, info) => setParam({ edit: null, new: null, filter: saved && info?.draft ? 'draft' : filter === 'upcoming' ? null : filter })}
                />
            </AdminCommunityHubLayout>
        );
    }
    if (editId && !loaded) {
        return (
            <AdminCommunityHubLayout studioHeader={{ title: 'Edit event', icon: Calendar }} hideTabs>
                <div className="h-96 rounded-2xl bg-black/[0.04] dark:bg-white/[0.04]" />
            </AdminCommunityHubLayout>
        );
    }

    const menu = (x) => {
        const e = x.e;
        const live = x.state !== 'draft';
        const hasPage = e.isTicketed || e.isGuestlistEnabled;
        return (
            <Menu trigger={({ toggle }) => (
                <Button size="sm" variant="ghost" onClick={toggle} aria-label="More actions" className="h-10 w-10 px-0"><MoreHorizontal size={16} /></Button>
            )}>
                <MenuItem icon={Edit} onClick={() => setParam({ edit: e.id })}>{live ? 'Edit' : 'Edit and publish'}</MenuItem>
                {hasPage && <MenuItem icon={Ticket} as={Link} to={`/admin/ticketing?eventId=${encodeURIComponent(e.id)}`}>{e.isTicketed ? 'Orders and check-in' : 'Guestlist and check-in'}</MenuItem>}
                {x.source && <MenuItem icon={ExternalLink} as={Link} to={x.source.to}>Open the {x.source.label.toLowerCase()}</MenuItem>}
                {live && hasPage && <MenuItem as="a" href={linkFor(e)} target="_blank" rel="noopener noreferrer" icon={ExternalLink}>Open in the app</MenuItem>}
                {hasPage && <MenuItem icon={Link2} onClick={() => copyLink(e)}>Copy link</MenuItem>}
                <MenuItem icon={Pin} onClick={() => run(e.id, () => store().togglePinUpcomingEvent(e.id), e.isPinned ? 'Unpinned.' : 'Pinned to the top.')}>{e.isPinned ? 'Unpin' : 'Pin to the top'}</MenuItem>
                {live && <MenuItem icon={Bell} hint="In-app and push" onClick={() => notify(e)}>Notify everyone</MenuItem>}
                {live && <MenuItem icon={Mail} hint="Opens the mailing composer" onClick={() => email(e)}>Email subscribers</MenuItem>}
                {canReorder && <MenuItem icon={ArrowUp} disabled={x.index <= 0} onClick={() => move(x, -1)}>Move up</MenuItem>}
                {canReorder && <MenuItem icon={ArrowDown} disabled={x.index >= upcomingEvents.length - 1} onClick={() => move(x, 1)}>Move down</MenuItem>}
                <MenuItem icon={CopyPlus} onClick={() => duplicate(e)}>Duplicate as a draft</MenuItem>
                {live && x.state !== 'past' && <MenuItem icon={EyeOff} onClick={() => hide(e)}>Hide (move to drafts)</MenuItem>}
                <MenuItem icon={Trash2} danger onClick={() => remove(x)}>Delete</MenuItem>
            </Menu>
        );
    };

    const badges = (x) => (
        <>
            <Badge tone={STATE_BADGE[x.state].tone}>{STATE_BADGE[x.state].label}</Badge>
            {x.e.isPinned && <Badge tone="blue"><Pin size={10} /> Pinned</Badge>}
            {x.source && <Badge tone="teal">{x.source.label} card</Badge>}
        </>
    );

    const access = (x) => {
        const e = x.e;
        const a = x.availability;
        return (
            <div className="flex flex-wrap gap-1.5">
                {a && (
                    <Badge tone={a.total.remaining === 0 ? 'red' : 'green'}>
                        <Ticket size={10} /> {a.total.remaining === 0 ? 'Sold out' : `${a.total.sold}${a.total.capacity ? ` / ${a.total.capacity}` : ''} sold`}
                    </Badge>
                )}
                {x.toVerify > 0 && <Badge tone="amber">{x.toVerify} to verify</Badge>}
                {e.isGuestlistEnabled && <Badge tone="violet"><Users size={10} /> {e.guestlistMode === 'rsvp' ? 'RSVP' : 'Guestlist'}{Number(e.maxSpots) > 0 ? ` · ${e.maxSpots}` : ''}</Badge>}
                {e.showOnSite === false && <Badge tone="gray"><Globe size={10} /> Not on website</Badge>}
                {e.showInApp === false && <Badge tone="gray">Not on app home</Badge>}
            </div>
        );
    };

    const primary = (x) => ((x.e.isTicketed || x.e.isGuestlistEnabled) && x.state !== 'draft' ? (
        <Button size="sm" variant="accent" as={Link} to={`/admin/ticketing?eventId=${encodeURIComponent(x.e.id)}`} className="h-10 flex-1">
            {x.e.isTicketed ? <Ticket size={14} /> : <Users size={14} />} {x.e.isTicketed ? 'Sales' : 'Guestlist'}
        </Button>
    ) : (
        <Button size="sm" variant={x.state === 'draft' ? 'accent' : 'secondary'} onClick={() => setParam({ edit: x.e.id })} className="h-10 flex-1">
            {x.state === 'draft' ? <><FileEdit size={14} /> Finish and publish</> : <><Edit size={14} /> Edit</>}
        </Button>
    ));

    const thumb = (e) => e.hubImage || e.image;
    const sectionHidden = siteSettings?.showUpcomingEvents === false;

    return (
        <AdminCommunityHubLayout
            studioHeader={{ title: 'Events', icon: Calendar, description: 'On the website and in the app, with tickets and guestlists' }}
            action={<Button variant="primary" onClick={() => setParam({ new: '1' })} className="h-11 w-full sm:w-auto"><Plus size={15} /> New event</Button>}
        >
            <div className="space-y-5">
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <StatTile icon={Calendar} tone="green" label="Upcoming" value={tally.upcoming} hint="Live on the site and app" active={filter === 'upcoming'} onClick={() => setParam({ filter: null }, true)} />
                    <StatTile icon={FileEdit} tone="gray" label="Drafts" value={tally.draft} hint="Hidden until published" active={filter === 'draft'} onClick={() => setParam({ filter: filter === 'draft' ? null : 'draft' }, true)} />
                    <StatTile icon={Ticket} tone="orange" label="Tickets sold" value={tally.sold} hint={tally.toVerify ? `${tally.toVerify} payments to verify` : 'Across upcoming events'} to={tally.toVerify ? '/admin/ticketing' : undefined} />
                    <StatTile icon={CalendarDays} tone="violet" label="Next up" value={nextUp ? formatWhen({ date: nextUp.day }, { year: false }).replace(/^\w+, /, '') : '—'} hint={nextUp ? nextUp.e.title : 'Nothing scheduled'} onClick={nextUp ? () => setParam({ edit: nextUp.e.id }) : undefined} />
                </div>

                {sectionHidden && (
                    <div className="flex flex-col gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/[0.06] p-4 sm:flex-row sm:items-center">
                        <div className="min-w-0 flex-1">
                            <p className="text-[14px] font-bold">The Upcoming section is hidden on newbi.live</p>
                            <p className="mt-0.5 text-[13px] text-gray-600 dark:text-zinc-300">No events show on the website’s home page. The app still lists them.</p>
                        </div>
                        <Button variant="primary" onClick={() => run('section', () => store().toggleUpcomingSectionVisibility(false), 'Upcoming is showing on the website again.')} className="h-11 shrink-0"><Eye size={15} /> Show it</Button>
                    </div>
                )}

                <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                    <SearchInput value={search} onChange={setSearch} placeholder="Search events, venues or artists" className="lg:w-80" />
                    <div className="flex flex-1 items-center gap-2">
                        <Select value={sort} onChange={setSort} label="Sort" className="flex-1 lg:w-52 lg:flex-none" options={[
                            { value: 'date', label: filter === 'past' ? 'Most recent first' : 'Soonest first' },
                            { value: 'order', label: 'Pinned, then list order' },
                            { value: 'newest', label: 'Newest added' },
                            { value: 'title', label: 'Name A–Z' },
                        ]} />
                        <ExportMenu getSpec={exportSpec} />
                        <ViewToggle value={view} onChange={setView} />
                    </div>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
                        <SegmentedTabs value={filter} onChange={(v) => setParam({ filter: v === 'upcoming' ? null : v }, true)} items={FILTERS.map(f => ({ value: f, label: FILTER_LABEL[f], count: tally[f] }))} />
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-gray-500">
                        {salesElsewhere > 0 && <Link to="/admin/ticketing" className="font-semibold underline underline-offset-2">{salesElsewhere} more in Ticket sales</Link>}
                        {!sectionHidden && (
                            <button type="button" onClick={() => run('section', () => store().toggleUpcomingSectionVisibility(true), 'Upcoming is hidden on the website.')} className="inline-flex h-9 items-center gap-1.5 font-semibold hover:text-gray-900 dark:hover:text-white">
                                <EyeOff size={13} /> Hide Upcoming on newbi.live
                            </button>
                        )}
                    </div>
                </div>

                {!loaded && own.length === 0 ? (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map(i => <div key={i} className="h-80 rounded-2xl bg-black/[0.04] dark:bg-white/[0.04]" />)}</div>
                ) : rows.length === 0 ? (
                    <div className="rounded-2xl border border-black/[0.06] bg-white dark:border-white/[0.08] dark:bg-white/[0.03]">
                        <EmptyState
                            icon={Calendar}
                            title={own.length ? (filter === 'draft' ? 'No drafts' : filter === 'past' ? 'No past events here' : 'No matching events') : 'No events yet'}
                            description={own.length
                                ? (filter === 'past' ? 'Past events move to Work automatically.' : 'Try another filter or search.')
                                : 'Add one and it shows on newbi.live and in the app. Turn on tickets or a guestlist to let people in.'}
                            action={(!own.length || filter === 'upcoming') && <Button variant="primary" onClick={() => setParam({ new: '1' })}><Plus size={14} /> New event</Button>}
                        />
                    </div>
                ) : view === 'cards' ? (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {rows.map(x => (
                            <article key={x.e.id} className={cn('flex flex-col overflow-hidden rounded-2xl border border-black/[0.06] bg-white transition-colors hover:border-black/15 dark:border-white/[0.08] dark:bg-white/[0.03] dark:hover:border-white/15', busyId === x.e.id && 'opacity-60', x.state === 'draft' && 'border-dashed')}>
                                <button type="button" onClick={() => setParam({ edit: x.e.id })} className="relative block aspect-video w-full overflow-hidden bg-black/5 text-left dark:bg-white/5" aria-label={`Edit ${x.e.title}`}>
                                    {thumb(x.e)
                                        ? <img src={thumb(x.e)} alt="" loading="lazy" className={cn('h-full w-full object-cover', x.state === 'past' && 'grayscale')} />
                                        : <Calendar size={28} className="absolute inset-0 m-auto text-gray-400" />}
                                    <span className="absolute left-3 top-3 flex flex-wrap gap-1.5 [&>*]:bg-white/90 dark:[&>*]:bg-black/70">{badges(x)}</span>
                                </button>
                                <div className="flex flex-1 flex-col p-4">
                                    <h3 className="line-clamp-2 text-[16px] font-extrabold leading-snug">{x.e.title || 'Untitled event'}</h3>
                                    <div className="mt-2 space-y-1 text-[13px] text-gray-600 dark:text-zinc-300">
                                        <p className="flex items-center gap-2"><Clock size={13} className="shrink-0 text-emerald-600 dark:text-neon-green" /> <span className="truncate">{formatWhen(x.e)}</span></p>
                                        <p className="flex items-center gap-2"><MapPin size={13} className="shrink-0 text-sky-500" /> <span className="truncate">{[x.e.location, x.e.city].filter(Boolean).join(', ') || 'Venue to be announced'}</span></p>
                                    </div>
                                    <div className="mb-4 mt-3">{access(x)}</div>
                                    <div className="mt-auto flex items-center gap-2 border-t border-black/[0.06] pt-3 dark:border-white/[0.06]">
                                        {primary(x)}
                                        {(x.e.isTicketed || x.e.isGuestlistEnabled) && x.state !== 'draft' && <Button size="sm" variant="secondary" onClick={() => setParam({ edit: x.e.id })} className="h-10"><Edit size={14} /> Edit</Button>}
                                        {menu(x)}
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>
                ) : (
                    <div className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white dark:border-white/[0.08] dark:bg-white/[0.03]">
                        <ul className="divide-y divide-black/[0.05] dark:divide-white/[0.05]">
                            {rows.map(x => (
                                <li key={x.e.id} className={cn('flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:px-5', busyId === x.e.id && 'opacity-60')}>
                                    {canReorder && (
                                        <div className="hidden shrink-0 flex-col sm:flex">
                                            <button type="button" onClick={() => move(x, -1)} disabled={x.index <= 0 || Boolean(busyId)} aria-label="Move up" className="flex h-7 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-black/5 disabled:opacity-20 dark:hover:bg-white/5"><ArrowUp size={14} /></button>
                                            <button type="button" onClick={() => move(x, 1)} disabled={x.index >= upcomingEvents.length - 1 || Boolean(busyId)} aria-label="Move down" className="flex h-7 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-black/5 disabled:opacity-20 dark:hover:bg-white/5"><ArrowDown size={14} /></button>
                                        </div>
                                    )}
                                    <button type="button" onClick={() => setParam({ edit: x.e.id })} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                                        <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-black/5 text-gray-400 dark:bg-white/5">
                                            {thumb(x.e) ? <img src={thumb(x.e)} alt="" className="h-full w-full object-cover" loading="lazy" /> : <Calendar size={18} />}
                                        </span>
                                        <span className="min-w-0">
                                            <span className="flex flex-wrap items-center gap-1.5">
                                                <span className="truncate text-[15px] font-bold">{x.e.title || 'Untitled event'}</span>
                                                {badges(x)}
                                            </span>
                                            <span className="mt-0.5 block truncate text-[12px] text-gray-500">
                                                {formatWhen(x.e, { year: false })}{x.e.location ? ` · ${x.e.location}` : ''}
                                                {x.availability ? ` · ${x.availability.total.sold} sold` : ''}{x.availability && x.revenue ? ` · ${inr(x.revenue)}` : ''}
                                                {x.toVerify ? ` · ${x.toVerify} to verify` : ''}
                                            </span>
                                        </span>
                                    </button>
                                    <div className="flex items-center gap-2 sm:w-[240px] sm:justify-end">
                                        {primary(x)}
                                        {menu(x)}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
                {canReorder && rows.length > 1 && <p className="text-center text-[12px] text-gray-500">Pinned events come first; use Move up / down to set the order after that.</p>}
            </div>
            {confirmEl}
        </AdminCommunityHubLayout>
    );
};

export default UpcomingEventsManager;
