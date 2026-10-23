import React, { useMemo, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import Ticket from 'lucide-react/dist/esm/icons/ticket';
import ArrowLeft from 'lucide-react/dist/esm/icons/arrow-left';
import Calendar from 'lucide-react/dist/esm/icons/calendar';
import MapPin from 'lucide-react/dist/esm/icons/map-pin';
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right';
import LayoutDashboard from 'lucide-react/dist/esm/icons/layout-dashboard';
import Receipt from 'lucide-react/dist/esm/icons/receipt';
import Users from 'lucide-react/dist/esm/icons/users';
import UserCheck from 'lucide-react/dist/esm/icons/user-check';
import Tag from 'lucide-react/dist/esm/icons/tag';
import Settings from 'lucide-react/dist/esm/icons/settings';
import ScanLine from 'lucide-react/dist/esm/icons/scan-line';
import Plus from 'lucide-react/dist/esm/icons/plus';
import Clock from 'lucide-react/dist/esm/icons/clock';
import IndianRupee from 'lucide-react/dist/esm/icons/indian-rupee';
import ListChecks from 'lucide-react/dist/esm/icons/list-checks';
import Pencil from 'lucide-react/dist/esm/icons/pencil';
import Share2 from 'lucide-react/dist/esm/icons/share-2';
import ShareDraftsSheet from '../../components/admin/share/ShareDraftsSheet';
import { APP_ORIGIN } from '../../app/host';
import TicketSaleEditor from '../../components/admin/ticketing/TicketSaleEditor';
import AdminCommunityHubLayout from '../../components/admin/AdminCommunityHubLayout';
import { Button, Badge, SearchInput, Select, SegmentedTabs, EmptyState, StatTile, ViewToggle, useViewMode } from '../../components/admin/ui';
import ExportMenu from '../../components/admin/ExportMenu';
import { useAccent } from '../../components/admin/theme';
import EventOverview from '../../components/admin/ticketing/EventOverview';
import OrdersPanel from '../../components/admin/ticketing/OrdersPanel';
import GuestlistPanel from '../../components/admin/ticketing/GuestlistPanel';
import CheckInDesk from '../../components/admin/ticketing/CheckInDesk';
import CouponsPanel from '../../components/admin/ticketing/CouponsPanel';
import SettingsPanel from '../../components/admin/ticketing/SettingsPanel';
import { Panel, Meter } from '../../components/admin/ticketing/kit';
import { attendeeSpec, ordersSpec } from '../../components/admin/ticketing/exports';
import { formatEventDate, inr } from '../../components/admin/ticketing/format';
import { useOperationalEvents, useGuestEntries, hasGuestlist } from '../../components/admin/ticketing/events';
import GuestlistEditor from '../../components/admin/events/GuestlistEditor';
import { useStore } from '../../lib/store';
import { useStoreSubscription } from '../../hooks/useStoreSubscription';
import { cn } from '../../lib/utils';
import { FINANCE_ROLES } from '../../constants/roles';
import { computeAvailability, SOLD_STATUSES } from '../../lib/ticketing';

/*
 * Ticketing: every event that sells tickets or runs a guestlist, and for each
 * one the work around it (orders, guestlist, check-in, coupons, payments).
 * Events are created in Events; the door is the gate scanner.
 */

// Old deep links used these tab names.
const LEGACY_TABS = { buyers: 'orders', dispatch: 'orders', attendance: 'checkin', sheets: 'overview', payments: 'settings', rsvps: 'guestlist' };

const isPast = (e, now) => (e.when ? e.when.getTime() < now : false);

const EventThumb = ({ event, className }) => {
    const image = event.hubImage || event.image;
    return (
        <div className={cn('relative shrink-0 overflow-hidden bg-black/5 dark:bg-white/5', className)}>
            {image ? <img src={image} alt="" loading="lazy" className="h-full w-full object-cover" />
                : <span className="absolute inset-0 flex items-center justify-center text-gray-400">{event.isTicketed ? <Ticket size={22} /> : <ListChecks size={22} />}</span>}
        </div>
    );
};

const EventBadges = ({ event, availability, pending }) => (
    <div className="flex flex-wrap items-center gap-1.5">
        {availability && (
            <Badge tone={availability.total.remaining === 0 ? 'red' : 'orange'}>
                {availability.total.remaining === 0 ? 'Sold out' : `${availability.total.sold}${availability.total.capacity ? ` / ${availability.total.capacity}` : ''} sold`}
            </Badge>
        )}
        {pending > 0 && <Badge tone="amber"><Clock size={10} /> {pending} to verify</Badge>}
        {hasGuestlist(event) && <Badge tone="fuchsia">{event.guestlistMode === 'rsvp' ? 'RSVP' : 'Guestlist'}</Badge>}
        {event.source === 'guestlist' && event.status === 'Closed' && <Badge tone="gray">Closed</Badge>}
        {event.source === 'archive' && <Badge tone="gray">Archived</Badge>}
    </div>
);

const EventList = ({ events, ordersByEvent, onOpen, canSeeMoney, onNewGuestlist, onNewSale, isScanner, fixedKind }) => {
    const [params, setParams] = useSearchParams();
    const [search, setSearch] = useState('');
    const [view, setView] = useViewMode('ticketing_events', 'cards');
    const when = params.get('when') || 'upcoming';
    // Ticket sales and Guestlists are two sidebar entries over this one list, each fixed to its kind.
    const kind = fixedKind || params.get('kind') || 'all';
    const now = Date.now() - 12 * 3600000; // tonight's event stays under "upcoming"

    const setParam = (key, value, fallback) => {
        const next = new URLSearchParams(params);
        if (value === fallback) next.delete(key); else next.set(key, value);
        setParams(next, { replace: true });
    };

    const byKind = useMemo(() => events.filter(e => {
        if (kind === 'tickets') return e.isTicketed;
        if (kind === 'guestlist') return hasGuestlist(e);
        return true;
    }), [events, kind]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return byKind
            .filter(e => {
                if (q && ![e.title, e.location].some(v => String(v || '').toLowerCase().includes(q))) return false;
                if (when === 'upcoming') return !isPast(e, now);
                if (when === 'past') return isPast(e, now);
                return true;
            })
            .sort((a, b) => {
                const ta = a.when?.getTime() ?? Infinity;
                const tb = b.when?.getTime() ?? Infinity;
                return when === 'past' ? tb - ta : ta - tb;
            });
    }, [byKind, search, when, now]);

    const counts = useMemo(() => ({
        upcoming: byKind.filter(e => !isPast(e, now)).length,
        past: byKind.filter(e => isPast(e, now)).length,
        all: byKind.length,
    }), [byKind, now]);

    const stats = useMemo(() => {
        const live = events.filter(e => !isPast(e, now));
        const liveIds = new Set(live.map(e => e.id));
        const all = Object.entries(ordersByEvent).flatMap(([id, list]) => (liveIds.has(id) ? list : []));
        const sold = all.filter(o => SOLD_STATUSES.includes(o.status));
        return {
            live: live.length,
            ticketed: live.filter(e => e.isTicketed).length,
            guestlists: live.filter(hasGuestlist).length,
            pending: Object.values(ordersByEvent).flat().filter(o => o.status === 'pending' && events.some(e => e.id === o.eventId)).length,
            sold: live.filter(e => e.isTicketed).reduce((a, e) => a + computeAvailability(e, ordersByEvent[e.id] || []).total.sold, 0),
            revenue: sold.reduce((a, o) => a + (Number(o.totalAmount) || 0), 0),
        };
    }, [events, ordersByEvent, now]);

    const pendingFirst = () => {
        const target = events.find(e => (ordersByEvent[e.id] || []).some(o => o.status === 'pending'));
        if (target) onOpen(target.id, 'orders', 'pending');
    };

    return (
        <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatTile icon={Calendar} tone="orange" label="Coming up" value={stats.live} hint={`${stats.ticketed} ticketed · ${stats.guestlists} with a guestlist`} />
                {!isScanner && (
                    <StatTile icon={Clock} tone="amber" label="Payments to verify" value={stats.pending}
                        hint={stats.pending ? 'Tap to start with the first' : 'All caught up'} onClick={stats.pending ? pendingFirst : undefined} />
                )}
                <StatTile icon={Ticket} tone="green" label="Tickets sold" value={stats.sold.toLocaleString('en-IN')} hint="Upcoming events" />
                {canSeeMoney && !isScanner
                    ? <StatTile icon={IndianRupee} tone="blue" label="Ticket revenue" value={inr(stats.revenue)} hint="Verified, upcoming events" />
                    : <StatTile icon={ListChecks} tone="fuchsia" label="Guestlists" value={stats.guestlists} hint="Open and upcoming" onClick={fixedKind ? undefined : () => setParam('kind', 'guestlist', 'all')} active={kind === 'guestlist'} />}
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <SearchInput value={search} onChange={setSearch} placeholder="Search events or venues" className="lg:w-80" />
                <div className="flex flex-1 items-center gap-2">
                    {!fixedKind && (
                        <Select value={kind} onChange={(v) => setParam('kind', v, 'all')} label="Kind" className="min-w-0 flex-1 lg:w-52 lg:flex-none" options={[
                            { value: 'all', label: 'Tickets and guestlists' },
                            { value: 'tickets', label: 'Ticketed' },
                            { value: 'guestlist', label: 'Guestlists' },
                        ]} />
                    )}
                    {fixedKind && <span className="flex-1" />}
                    {!isScanner && (
                        <ExportMenu label="Export" getSpec={() => ordersSpec(filtered, Object.values(ordersByEvent).flat(), 'Ticket orders')} hint="Every order for the events shown" />
                    )}
                    <ViewToggle value={view} onChange={setView} />
                </div>
            </div>

            <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
                <SegmentedTabs value={when} onChange={(v) => setParam('when', v, 'upcoming')} items={[
                    { value: 'upcoming', label: 'Upcoming', count: counts.upcoming },
                    { value: 'past', label: 'Past', count: counts.past },
                    { value: 'all', label: 'All', count: counts.all },
                ]} />
            </div>

            {filtered.length === 0 ? (
                <Panel>
                    <EmptyState
                        icon={kind === 'guestlist' ? ListChecks : Ticket}
                        title={byKind.length ? 'Nothing here' : kind === 'guestlist' ? 'No guestlists yet' : 'No ticket sales yet'}
                        description={byKind.length
                            ? 'Try another filter or search.'
                            : kind === 'guestlist'
                                ? 'Start a guestlist here, or turn one on for an event in Events.'
                                : 'Start a ticket sale here, or turn on tickets for an event in Events.'}
                        action={!isScanner && (
                            <div className="flex flex-wrap justify-center gap-2">
                                <Button as={Link} to="/admin/upcoming-events?new=1" variant="secondary" className="h-11"><Calendar size={14} /> New event</Button>
                                {kind === 'guestlist'
                                    ? <Button variant="accent" className="h-11" onClick={onNewGuestlist}><Plus size={14} /> New guestlist</Button>
                                    : <Button variant="accent" className="h-11" onClick={onNewSale}><Plus size={14} /> New ticket sale</Button>}
                            </div>
                        )}
                    />
                </Panel>
            ) : view === 'cards' ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {filtered.map(event => {
                        const orders = ordersByEvent[event.id] || [];
                        const pending = orders.filter(o => o.status === 'pending').length;
                        const availability = event.isTicketed ? computeAvailability(event, orders) : null;
                        const cap = availability?.total.capacity;
                        return (
                            <button key={event.id} type="button" onClick={() => onOpen(event.id)}
                                className="group flex flex-col overflow-hidden rounded-2xl border border-black/[0.06] bg-white text-left transition-all hover:-translate-y-0.5 hover:border-black/15 dark:border-white/[0.08] dark:bg-white/[0.03] dark:hover:border-white/20">
                                <EventThumb event={event} className="aspect-[16/8] w-full" />
                                <div className="flex flex-1 flex-col gap-2 p-4">
                                    <p className="line-clamp-2 text-[15px] font-bold leading-snug">{event.title || 'Untitled event'}</p>
                                    <p className="flex items-center gap-1.5 truncate text-[12px] text-gray-500 dark:text-zinc-400">
                                        <Calendar size={12} className="shrink-0" /> {formatEventDate(event.when)}
                                        {event.location && <><span aria-hidden>·</span><MapPin size={12} className="shrink-0" /><span className="truncate">{event.location}</span></>}
                                    </p>
                                    <EventBadges event={event} availability={availability} pending={pending} />
                                    {cap ? (
                                        <Meter className="mt-auto" max={cap} label="Seats sold and held" segments={[
                                            { value: availability.total.sold, tone: 'orange' },
                                            { value: availability.total.held - availability.total.sold, tone: 'amber' },
                                        ]} />
                                    ) : null}
                                </div>
                            </button>
                        );
                    })}
                </div>
            ) : (
                <Panel className="overflow-hidden">
                    <ul className="divide-y divide-black/[0.05] dark:divide-white/[0.05]">
                        {filtered.map(event => {
                            const orders = ordersByEvent[event.id] || [];
                            const pending = orders.filter(o => o.status === 'pending').length;
                            const availability = event.isTicketed ? computeAvailability(event, orders) : null;
                            return (
                                <li key={event.id}>
                                    <button type="button" onClick={() => onOpen(event.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.02] sm:px-5">
                                        <EventThumb event={event} className="h-14 w-14 rounded-xl" />
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-[15px] font-bold">{event.title || 'Untitled event'}</p>
                                            <p className="truncate text-[12px] text-gray-500 dark:text-zinc-400">{[formatEventDate(event.when), event.location].filter(Boolean).join(' · ')}</p>
                                            <EventBadges event={event} availability={availability} pending={pending} />
                                        </div>
                                        <ChevronRight size={16} className="shrink-0 text-gray-300 dark:text-zinc-600" />
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </Panel>
            )}
        </div>
    );
};

const EventTabs = ({ tabs, active, onChange }) => {
    const a = useAccent();
    return (
        <div className="-mx-4 overflow-x-auto border-b border-black/[0.07] px-4 [scrollbar-width:none] dark:border-white/[0.07] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
            <div className="flex gap-1" role="tablist">
                {tabs.map(tab => {
                    const Icon = tab.icon;
                    const on = active === tab.value;
                    return (
                        <button
                            key={tab.value}
                            type="button"
                            role="tab"
                            aria-selected={on}
                            onClick={() => onChange(tab.value)}
                            className={cn('relative flex h-11 shrink-0 items-center gap-2 px-3 text-[13px] font-semibold transition-colors',
                                on ? 'text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-900 dark:text-zinc-500 dark:hover:text-white')}
                        >
                            <Icon size={15} className={on ? a.text : undefined} />
                            {tab.label}
                            {tab.count ? <Badge tone="amber" className="tabular-nums">{tab.count}</Badge> : null}
                            {on && <span className={cn('absolute inset-x-2 -bottom-px h-0.5 rounded-full', a.dot)} />}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

/*
 * mode: 'tickets' (App · Events & tickets → Ticket sales) or 'guestlists' (App · Community →
 * Guestlists). Same screens; the list is fixed to that kind and the header matches the sidebar.
 */
const TicketingManagement = ({ mode = 'tickets' }) => {
    useStoreSubscription(['upcomingEvents', 'portfolio', 'ticketOrders', 'guestlists', 'coupons', 'volunteerGigs']);
    const user = useStore(s => s.user);
    const ticketOrders = useStore(s => s.ticketOrders);
    const coupons = useStore(s => s.coupons);
    // Only the scanner role is limited here (gate managers could always review orders).
    const isScanner = user?.role === 'scanner';
    const canSeeMoney = FINANCE_ROLES.includes(user?.role);

    const [params, setParams] = useSearchParams();
    const selectedEventId = params.get('eventId');
    const rawTab = params.get('tab');
    const [editor, setEditor] = useState(null); // { guestlist } | { guestlist: null } for new
    const [sharing, setSharing] = useState(false);
    const [saleEditor, setSaleEditor] = useState(null); // { event } | { event: null } for a new ticket sale

    const events = useOperationalEvents();
    // A standalone list posted to the home page merges into that event; old links still land.
    const event = events.find(e => e.id === selectedEventId)
        || events.find(e => e.guestlistIds?.includes(selectedEventId))
        || null;

    const ordersByEvent = useMemo(() => {
        const map = {};
        (ticketOrders || []).forEach(o => { (map[o.eventId] ||= []).push(o); });
        return map;
    }, [ticketOrders]);
    const orders = useMemo(() => (event ? ordersByEvent[event.id] || [] : []), [ordersByEvent, event]);

    const { entries: guestEntries, loading: guestLoading, error: guestError } = useGuestEntries(event?.guestlistIds, Boolean(event && hasGuestlist(event)));

    const tabs = useMemo(() => {
        if (!event) return [];
        const list = [{ value: 'overview', label: 'Overview', icon: LayoutDashboard }];
        if (event.isTicketed && !isScanner) list.push({ value: 'orders', label: 'Orders', icon: Receipt, count: orders.filter(o => o.status === 'pending').length || undefined });
        if (hasGuestlist(event) && !isScanner) list.push({ value: 'guestlist', label: event.guestlistMode === 'rsvp' ? 'RSVPs' : 'Guestlist', icon: Users, count: guestEntries.filter(e => e.status === 'pending' || (!e.status && e.hasTask)).length || undefined });
        list.push({ value: 'checkin', label: 'Check-in', icon: UserCheck });
        if (event.isTicketed && !isScanner) list.push({ value: 'coupons', label: 'Coupons', icon: Tag });
        if (!isScanner) list.push({ value: 'settings', label: 'Settings', icon: Settings });
        return list;
    }, [event, isScanner, orders, guestEntries]);

    const requestedTab = LEGACY_TABS[rawTab] || rawTab;
    const activeTab = tabs.some(t => t.value === requestedTab) ? requestedTab : (isScanner ? 'checkin' : 'overview');
    const listFilter = params.get('filter') || undefined;

    // ?edit=map (or any editor section) opens the sale editor there, once.
    const editParam = params.get('edit');
    React.useEffect(() => {
        if (!editParam || !event?.isTicketed || event.source !== 'event' || isScanner) return;
        setSaleEditor({ event, section: editParam });
        const next = new URLSearchParams(params);
        next.delete('edit');
        setParams(next, { replace: true });
    }, [editParam, event?.id]); // eslint-disable-line react-hooks/exhaustive-deps

    const setTab = (tab, filter) => {
        const next = new URLSearchParams(params);
        next.set('tab', tab);
        if (filter) next.set('filter', filter); else next.delete('filter');
        setParams(next, { replace: true });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    const openEvent = (id, tab, filter) => {
        const next = { eventId: id };
        if (tab) next.tab = tab;
        if (filter) next.filter = filter;
        setParams(next);
        window.scrollTo({ top: 0 });
    };
    const closeEvent = () => {
        const next = new URLSearchParams();
        ['when', 'kind'].forEach(k => params.get(k) && next.set(k, params.get(k)));
        setParams(next);
    };

    const guestlists = mode === 'guestlists';
    const header = guestlists
        ? { title: 'Guestlists', icon: ListChecks, description: 'Requests, tasks, capacity and check-in for community guestlists' }
        : { title: 'Ticket sales', icon: Ticket, description: 'Orders, payments, check-in and coupons for ticketed events' };

    const saleSheet = (
        <TicketSaleEditor
            open={Boolean(saleEditor)}
            event={saleEditor?.event || null}
            initialSection={saleEditor?.section}
            onClose={() => setSaleEditor(null)}
            onSaved={(id, { created } = {}) => { if (created && id) openEvent(id, 'overview'); }}
        />
    );

    const editorSheet = (
        <GuestlistEditor
            open={Boolean(editor)}
            guestlist={editor?.guestlist || null}
            onClose={() => setEditor(null)}
            onSaved={(id) => { if (!editor?.guestlist && id) openEvent(id, 'guestlist'); }}
        />
    );

    // Old links to the guestlist filter on the Ticket sales page open the Guestlists page.
    if (!guestlists && !selectedEventId && params.get('kind') === 'guestlist') {
        const next = new URLSearchParams(params); next.delete('kind');
        return <Navigate to={`/admin/guestlists${next.toString() ? `?${next}` : ''}`} replace />;
    }

    if (!selectedEventId) {
        return (
            <AdminCommunityHubLayout
                studioHeader={header}
                hideTabs
                action={(
                    <div className="flex w-full gap-2 sm:w-auto">
                        <Button as={Link} to="/admin/scanner" variant="secondary" className="h-11 flex-1 sm:flex-none"><ScanLine size={15} /> Gate scanner</Button>
                        {guestlists && !isScanner && <Button variant="accent" className="h-11 flex-1 sm:flex-none" onClick={() => setEditor({ guestlist: null })}><Plus size={15} /> New guestlist</Button>}
                        {!guestlists && !isScanner && <Button variant="accent" className="h-11 flex-1 sm:flex-none" onClick={() => setSaleEditor({ event: null })}><Plus size={15} /> New ticket sale</Button>}
                    </div>
                )}
            >
                <EventList
                    events={events}
                    ordersByEvent={ordersByEvent}
                    onOpen={openEvent}
                    canSeeMoney={canSeeMoney}
                    isScanner={isScanner}
                    onNewGuestlist={() => setEditor({ guestlist: null })}
                    onNewSale={() => setSaleEditor({ event: null })}
                    fixedKind={guestlists ? 'guestlist' : 'tickets'}
                />
                {editorSheet}
                {saleSheet}
            </AdminCommunityHubLayout>
        );
    }

    if (!event) {
        return (
            <AdminCommunityHubLayout studioHeader={header} hideTabs>
                <Panel>
                    <EmptyState icon={Ticket} title="Loading event…" description="If this doesn't load, the event may have been deleted or had tickets and guestlist turned off."
                        action={<Button variant="secondary" className="h-11" onClick={closeEvent}><ArrowLeft size={14} /> All events</Button>} />
                </Panel>
            </AdminCommunityHubLayout>
        );
    }

    return (
        <AdminCommunityHubLayout
            studioHeader={{
                title: event.title || 'Event',
                icon: event.isTicketed ? Ticket : ListChecks,
                description: [formatEventDate(event.when), event.location].filter(Boolean).join(' · '),
            }}
            hideTabs
        >
            <div className="mb-5 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                    <Button variant="ghost" onClick={closeEvent} className="-ml-2 h-10"><ArrowLeft size={15} /> All events</Button>
                    <div className="ml-auto flex items-center gap-2">
                        {/* Every ticketed event's sale (details, ticket types, venue map, payments) is edited here. */}
                        {!isScanner && event.isTicketed && event.source === 'event' && (
                            <Button variant="secondary" className="h-11" onClick={() => setSaleEditor({ event })}><Pencil size={14} /> Edit sale</Button>
                        )}
                        {!isScanner && (
                            <Button variant="secondary" className="h-11" onClick={() => setSharing(true)}><Share2 size={14} /> Share</Button>
                        )}
                        {!isScanner && (
                            <ExportMenu
                                label="Export"
                                size="md"
                                hint="Every order and guest, with payment refs and check-in"
                                getSpec={() => attendeeSpec(event, orders, guestEntries)}
                            />
                        )}
                        <Button as={Link} to={`/admin/scanner?eventId=${encodeURIComponent(event.id)}`} variant="accent" className="h-11"><ScanLine size={15} /> Scan</Button>
                    </div>
                </div>
                <EventTabs tabs={tabs} active={activeTab} onChange={(t) => setTab(t)} />
            </div>

            {activeTab === 'overview' && (
                <EventOverview
                    event={event}
                    orders={orders}
                    guestEntries={guestEntries}
                    coupons={(coupons || []).filter(c => c.eventId === event.id)}
                    canSeeMoney={canSeeMoney && !isScanner}
                    onJump={isScanner ? () => setTab('checkin') : setTab}
                />
            )}
            {activeTab === 'orders' && <OrdersPanel key={`orders-${listFilter}`} event={event} orders={orders} initialFilter={listFilter} />}
            {activeTab === 'guestlist' && <GuestlistPanel key={`gl-${listFilter}`} event={event} entries={guestEntries} loading={guestLoading} error={guestError} initialFilter={listFilter} />}
            {activeTab === 'checkin' && <CheckInDesk eventId={event.id} orders={orders} guestEntries={guestEntries} />}
            {activeTab === 'coupons' && <CouponsPanel eventId={event.id} coupons={coupons || []} orders={orders} canSeeMoney={canSeeMoney} />}
            {activeTab === 'settings' && <SettingsPanel event={event} onEditGuestlist={(gl) => setEditor({ guestlist: gl })} onDeleted={closeEvent} onEditSale={(section) => setSaleEditor({ event, section })} />}
            <ShareDraftsSheet
                open={sharing}
                onClose={() => setSharing(false)}
                item={sharing ? {
                    ...event,
                    date: event.when || event.date,
                    // A guestlist links to its sign-up page; a ticket sale to Tickets.
                    guestlist: hasGuestlist(event) && !event.isTicketed,
                    link: hasGuestlist(event) && !event.isTicketed
                        ? `${APP_ORIGIN}/community/g/${encodeURIComponent(event.guestlistId || event.id)}`
                        : `${APP_ORIGIN}/tickets/${encodeURIComponent(event.id)}`,
                } : null}
            />
            {editorSheet}
            {saleSheet}
        </AdminCommunityHubLayout>
    );
};

export default TicketingManagement;
