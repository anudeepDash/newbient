import React, { useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
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
import { bySoonest, isUpcomingPass, passCard } from '../passes/passCards';
import { fromPrice, useTicketedEvents } from './useTicketedEvents';
import { useAuthGate, useResumeIntent } from '../auth/AuthGate';
import TicketSheet from './TicketSheet';

/*
 * /tickets: upcoming shows that sell tickets. Tapping one opens the ticket
 * flow in a sheet over the list (?event=ID, so the link can be shared and
 * Back closes it). The flow (tiers, coupons, UPI payment, the booking
 * reference) is TicketSheet; a confirmed order becomes a pass at /p/{ref},
 * listed here under Your tickets.
 */

const TICKET_INTENT = 'tickets-buy';

const dayLabel = (day) => {
    if (!day) return null;
    const d = new Date(`${day}T00:00:00`);
    return Number.isNaN(d.getTime()) ? null : format(d, 'EEE d MMM');
};
const rupees = (n) => (n ? `From ₹${Number(n).toLocaleString('en-IN')}` : null);

export const ticketCard = (e, onOpen) => ({
    type: 'event',
    image: e.image || e.poster || null,
    title: e.title,
    eyebrow: e.category || e.performanceType || null,
    description: e.description,
    chips: [{ icon: MapPin, label: e.city }],
    meta: [
        { icon: CalendarDays, label: dayLabel(e.day) },
        { icon: Clock, label: isPresent(e.time) ? e.time : null },
    ],
    stats: [
        { label: 'Tickets', value: rupees(fromPrice(e)), icon: IndianRupee, tone: 'accent' },
        { label: 'Venue', value: e.venue || e.location, icon: MapPin },
    ],
    cta: { label: 'Get tickets' },
    onClick: () => onOpen(e.id),
});

const TicketsPage = () => {
    const { events, loaded } = useTicketedEvents();
    const [params, setParams] = useSearchParams();
    const openId = params.get('event');
    const open = openId ? events.find(e => e.id === openId) : null;
    // Keep the last event while the sheet animates closed.
    const shown = useRef(null);
    if (open) shown.current = open;

    const gate = useAuthGate();
    const showEvent = (id) => {
        const next = new URLSearchParams(params);
        next.set('event', id);
        setParams(next);
    };
    // Buying needs an account: sign in first, then the sheet opens where you left off.
    const openEvent = (id) => gate.run({ type: TICKET_INTENT, payload: { id } }, () => showEvent(id));
    useResumeIntent(TICKET_INTENT, (payload) => payload?.id && showEvent(payload.id));
    const passes = useAppStore(s => s.passes);
    const mine = useMemo(() => passes.filter(p => p.source === 'order' && isUpcomingPass(p)).sort(bySoonest), [passes]);

    const close = () => {
        const next = new URLSearchParams(params);
        next.delete('event');
        setParams(next, { replace: true });
    };

    return (
        <PageBody>
            <PageHeader eyebrow="Tickets" title="Upcoming shows" subtitle="Pick your tickets and pay by UPI. Your ticket shows up in the app." />

            {mine.length > 0 && (
                <section className="space-y-3">
                    <SectionHeader title={mine.length === 1 ? 'Your ticket' : 'Your tickets'} />
                    <Rail>{mine.map(p => <Card key={p.ref} {...passCard(p)} />)}</Rail>
                </section>
            )}

            {!loaded ? (
                <CardGrid><CardSkeleton /><CardSkeleton /></CardGrid>
            ) : events.length ? (
                <CardGrid>
                    {events.map(e => <Card key={e.id} {...ticketCard(e, openEvent)} />)}
                </CardGrid>
            ) : (
                <EmptyState icon={Ticket} title="No ticket sales right now" message="Shows with tickets on sale appear here first." />
            )}

            {/* The ticket flow, over the list. An unknown or past event just closes. */}
            <TicketSheet event={open || shown.current} open={Boolean(open)} onClose={close} />
            {openId && loaded && !open && <CloseUnknown onClose={close} />}
        </PageBody>
    );
};

/* A link to an event that isn't on sale any more: drop the parameter. */
const CloseUnknown = ({ onClose }) => {
    React.useEffect(() => { onClose(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
    return null;
};

export default TicketsPage;
