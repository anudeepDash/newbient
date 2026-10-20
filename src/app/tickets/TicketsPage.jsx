import React, { Suspense, lazy } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import MapPin from 'lucide-react/dist/esm/icons/map-pin';
import CalendarDays from 'lucide-react/dist/esm/icons/calendar-days';
import Clock from 'lucide-react/dist/esm/icons/clock';
import Ticket from 'lucide-react/dist/esm/icons/ticket';
import IndianRupee from 'lucide-react/dist/esm/icons/indian-rupee';
import { Card, Sheet } from '../../components/app';
import { isPresent } from '../../lib/present';
import PageHeader, { PageBody } from '../pages/PageHeader';
import { CardGrid, CardSkeleton, EmptyState } from '../pages/parts';
import { fromPrice, useTicketedEvents } from './useTicketedEvents';
import { useAuthGate, useResumeIntent } from '../auth/AuthGate';
import useDynamicMeta from '../../hooks/useDynamicMeta';
import { useT, t as tNow } from '../../i18n';

/*
 * /tickets: upcoming shows that sell tickets. Tapping one opens the ticket
 * flow in a sheet over the list (?event=ID, so the link can be shared and
 * Back closes it). The flow itself (tiers, coupons, UPI payment, the booking
 * reference) is the existing EventTicketingModal, embedded in the sheet; the
 * confirmed order becomes a pass in the app.
 */

const TICKET_INTENT = 'tickets-buy';

const EventTicketingModal = lazy(() => import('../../components/tickets/EventTicketingModal'));

const dayLabel = (day) => {
    if (!day) return null;
    const d = new Date(`${day}T00:00:00`);
    return Number.isNaN(d.getTime()) ? null : format(d, 'EEE d MMM');
};
const rupees = (n) => (n ? tNow('From ₹{amount}', { amount: Number(n).toLocaleString('en-IN') }) : null);

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
        { label: tNow('Tickets'), value: rupees(fromPrice(e)), icon: IndianRupee, tone: 'accent' },
        { label: tNow('Venue'), value: e.venue || e.location, icon: MapPin },
    ],
    cta: { label: tNow('Get tickets') },
    onClick: () => onOpen(e.id),
});

const TicketsPage = () => {
    const t = useT();
    useDynamicMeta({ page: 'tickets' });
    const { events, loaded } = useTicketedEvents();
    const [params, setParams] = useSearchParams();
    const openId = params.get('event');
    const open = openId ? events.find(e => e.id === openId) : null;

    const gate = useAuthGate();
    const showEvent = (id) => {
        const next = new URLSearchParams(params);
        next.set('event', id);
        setParams(next);
    };
    // Buying needs an account: sign in first, then the sheet opens where you left off.
    const openEvent = (id) => gate.run({ type: TICKET_INTENT, payload: { id } }, () => showEvent(id), { require: ['name'] });
    useResumeIntent(TICKET_INTENT, (payload) => payload?.id && showEvent(payload.id));
    const close = () => {
        const next = new URLSearchParams(params);
        next.delete('event');
        setParams(next, { replace: true });
    };

    return (
        <PageBody>
            <PageHeader eyebrow={t('Tickets')} title={t('Get your')} highlight={t('tickets.')} subtitle={t('Pick a show, pay by UPI, and your ticket shows up in the app.')} />

            {!loaded ? (
                <CardGrid><CardSkeleton /><CardSkeleton /></CardGrid>
            ) : events.length ? (
                <CardGrid>
                    {events.map(e => <Card key={e.id} {...ticketCard(e, openEvent)} />)}
                </CardGrid>
            ) : (
                <EmptyState icon={Ticket} title={t('No ticket sales right now')} message={t('Shows with tickets on sale appear here first.')} />
            )}

            {/* The ticket flow, over the list. An unknown or past event just closes. */}
            <Sheet
                open={Boolean(open)}
                onClose={close}
                size="full"
                width="lg"
                title={open?.title}
                subtitle={[dayLabel(open?.day), open?.venue || open?.location, open?.city].filter(isPresent).join(' · ') || undefined}
                bodyClassName="px-0 pb-0"
            >
                {open && (
                    <Suspense fallback={<div className="mx-5 h-64 animate-pulse rounded-3xl bg-black/[0.04] dark:bg-white/[0.04]" />}>
                        <EventTicketingModal event={open} isOpen onClose={close} isEmbedded chrome={false} />
                    </Suspense>
                )}
            </Sheet>
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
