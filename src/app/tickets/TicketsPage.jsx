import React, { useMemo, useState } from 'react';
import { Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import MapPin from 'lucide-react/dist/esm/icons/map-pin';
import CalendarDays from 'lucide-react/dist/esm/icons/calendar-days';
import Clock from 'lucide-react/dist/esm/icons/clock';
import Ticket from 'lucide-react/dist/esm/icons/ticket';
import IndianRupee from 'lucide-react/dist/esm/icons/indian-rupee';
import { Card } from '../../components/app';
import { isPresent } from '../../lib/present';
import { useAppStore } from '../../lib/store/appStore';
import PageHeader, { PageBody } from '../pages/PageHeader';
import { CardGrid, CardSkeleton, EmptyState, Rail, SectionHeader } from '../pages/parts';
import { bySoonest, isUpcomingPass } from '../passes/passCards';
import PassTicket from '../passes/PassTicket';
import { fromPrice, isListed, useTicketedEvents } from './useTicketedEvents';
import { cn } from '../../lib/utils';
import { eventSaleState } from '../../lib/ticketing';
import { appPath } from '../host';
import { clock, venueName } from './eventDetails';
import useDynamicMeta from '../../hooks/useDynamicMeta';
import { useT, t as tNow } from '../../i18n';

/*
 * /tickets: upcoming shows that sell tickets (unlisted sales are left out),
 * with a city filter when there's more than one city. Tapping one opens its
 * card, /tickets/:id (EventPage), as a sheet over the list like every other
 * card; booking happens there. Old ?event=ID links redirect there. Every pass you hold (tickets, guestlist passes, RSVPs,
 * creator tickets) is listed here as a ticket, upcoming first and past ones
 * at the end.
 */

const dayLabel = (day) => {
    if (!day) return null;
    const d = new Date(`${day}T00:00:00`);
    return Number.isNaN(d.getTime()) ? null : format(d, 'EEE d MMM');
};
const rupees = (n) => (n ? tNow('From ₹{amount}', { amount: Number(n).toLocaleString('en-IN') }) : null);

export const ticketCard = (e, from) => {
    const sale = eventSaleState(e);
    return {
        type: 'event',
        image: e.image || e.poster || null,
        ambientColor: e.ambientColor,
        title: e.title,
        eyebrow: e.category || e.performanceType || null,
        description: e.description,
        chips: [{ icon: MapPin, label: e.city }],
        meta: [
            { icon: CalendarDays, label: dayLabel(e.day) },
            { icon: Clock, label: isPresent(e.time) ? clock(e.time) : null },
        ],
        stats: [
            { label: tNow('Tickets'), value: sale.state === 'open' ? rupees(fromPrice(e)) : sale.state === 'upcoming' ? tNow('Soon') : tNow('Closed'), icon: IndianRupee, tone: 'accent' },
            { label: tNow('Venue'), value: venueName(e) || null, icon: MapPin },
        ],
        cta: { label: sale.state === 'open' ? tNow('Book tickets') : tNow('See details') },
        // Opens like every other card: a sheet over the list.
        to: appPath(`/tickets/${encodeURIComponent(e.id)}`),
        linkState: from ? { backgroundLocation: from } : undefined,
    };
};

const TicketsPage = () => {
    const location = useLocation();
    const t = useT();
    useDynamicMeta({ page: 'tickets' });
    const { events: all, loaded } = useTicketedEvents();
    const events = useMemo(() => all.filter(isListed), [all]);
    const [params] = useSearchParams();
    const legacyId = params.get('event');
    const cities = useMemo(() => [...new Set(events.map(e => String(e.city || '').trim()).filter(Boolean))], [events]);
    const [city, setCity] = useState('');
    const shown = city ? events.filter(e => String(e.city || '').trim() === city) : events;

    const passes = useAppStore(s => s.passes);
    // Every pass you hold: bought tickets, guestlist passes and RSVPs, creator tickets.
    const mine = useMemo(() => (passes || []).filter(isUpcomingPass).sort(bySoonest), [passes]);
    const past = useMemo(() => (passes || []).filter(p => p.status !== 'revoked' && !isUpcomingPass(p)).sort((a, b) => bySoonest(b, a)).slice(0, 12), [passes]);

    // Old links (/tickets?event=ID) open the show's own page.
    if (legacyId) return <Navigate to={appPath(`/tickets/${encodeURIComponent(legacyId)}`)} replace />;

    return (
        <PageBody>
            <PageHeader eyebrow={t('Tickets')} title={t('Get your')} highlight={t('tickets.')} subtitle={t('Pick a show, pay in your UPI app, and your ticket shows up here.')} />

            {mine.length > 0 && (
                <section className="space-y-3">
                    <SectionHeader title={mine.length === 1 ? t('Your ticket') : t('Your tickets')} />
                    <Rail>{mine.map(p => <PassTicket key={p.ref} pass={p} from={location} />)}</Rail>
                </section>
            )}

            {cities.length > 1 && (
                <div className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden" role="tablist" aria-label={t('City')}>
                    {['', ...cities].map(c => (
                        <button key={c || 'all'} type="button" role="tab" aria-selected={city === c} onClick={() => setCity(c)}
                            className={cn('h-10 shrink-0 rounded-full px-4 text-[14px] font-bold transition-colors',
                                city === c ? 'bg-gray-900 text-white dark:bg-white dark:text-black' : 'bg-black/[0.05] text-gray-700 dark:bg-white/[0.07] dark:text-zinc-300')}>
                            {c || t('All cities')}
                        </button>
                    ))}
                </div>
            )}

            {!loaded ? (
                <CardGrid><CardSkeleton /><CardSkeleton /></CardGrid>
            ) : shown.length ? (
                <CardGrid>
                    {shown.map(e => <Card key={e.id} {...ticketCard(e, location)} />)}
                </CardGrid>
            ) : (
                <EmptyState icon={Ticket} title={t('No ticket sales right now')} message={t('Shows with tickets on sale appear here first.')} />
            )}

            {past.length > 0 && (
                <section className="space-y-3">
                    <SectionHeader title={t('Past tickets')} />
                    <Rail>{past.map(p => <PassTicket key={p.ref} pass={p} from={location} />)}</Rail>
                </section>
            )}
        </PageBody>
    );
};

export default TicketsPage;
