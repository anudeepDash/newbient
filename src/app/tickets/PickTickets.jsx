import React, { useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import Users from 'lucide-react/dist/esm/icons/users';
import ZoomIn from 'lucide-react/dist/esm/icons/zoom-in';
import ZoomOut from 'lucide-react/dist/esm/icons/zoom-out';
import Clock from 'lucide-react/dist/esm/icons/clock';
import { cn } from '../../lib/utils';
import { isPresent } from '../../lib/present';
import { eventVenueMap, mapHasPickableZones, tierColor } from '../../lib/venueMap';
import { tierMinPerOrder } from '../../lib/ticketing';
import VenueMapView from '../../components/venue/VenueMapView';
import { Notice } from '../creator/ui';
import { useT } from '../../i18n';
import { rupees, Stepper } from './ticketParts';

/*
 * Booking step 1: the ticket types (and, when the event has one, the venue
 * map: tap a zone to add its ticket type). Each card says what it costs,
 * what's included, how many are left and whether it's on sale yet.
 */

const when = (d) => (d ? format(d, 'EEE d MMM, h:mm a') : '');

export const useDarkMode = () => (typeof document !== 'undefined' && document.documentElement.classList.contains('dark'));

/* The map with zoom buttons; on phones it scrolls sideways when zoomed. */
export const ZoomableMap = ({ children, label }) => {
    const [zoom, setZoom] = useState(1);
    return (
        <div className="relative overflow-hidden rounded-3xl border border-black/[0.06] dark:border-white/[0.08]">
            {/* Only a scroll area of its own when zoomed in, so a swipe over the map still scrolls the page. */}
            <div className={zoom > 1 ? 'max-h-[56dvh] overflow-auto overscroll-contain [-webkit-overflow-scrolling:touch]' : 'overflow-hidden'} aria-label={label}>
                <div style={{ width: `${zoom * 100}%` }} className="transition-[width] duration-200">{children}</div>
            </div>
            <div className="absolute right-2 top-2 flex flex-col gap-1.5">
                {[['in', ZoomIn, () => setZoom(z => Math.min(3, z + 0.5)), zoom >= 3], ['out', ZoomOut, () => setZoom(z => Math.max(1, z - 0.5)), zoom <= 1]].map(([k, Icon, onClick, disabled]) => (
                    <button key={k} type="button" aria-label={k === 'in' ? 'Zoom in' : 'Zoom out'} onClick={onClick} disabled={disabled}
                        className="flex h-10 w-10 items-center justify-center rounded-xl border border-black/[0.08] bg-white/90 text-gray-700 shadow-sm backdrop-blur disabled:opacity-40 dark:border-white/[0.12] dark:bg-[#0d0f15]/90 dark:text-zinc-200">
                        <Icon size={17} />
                    </button>
                ))}
            </div>
        </div>
    );
};

const StateLine = ({ state, left }) => {
    const t = useT();
    if (state.state === 'sold_out') return <span className="text-[12px] font-bold text-red-600 dark:text-red-400">{t('Sold out')}</span>;
    if (state.state === 'upcoming') return <span className="inline-flex items-center gap-1 text-[12px] font-bold text-sky-700 dark:text-sky-300"><Clock size={12} /> {t('On sale {when}', { when: when(state.opensAt) })}</span>;
    if (state.state === 'closed') return <span className="text-[12px] font-bold text-gray-500">{t('Sale ended')}</span>;
    if (left !== null && left !== undefined && left <= 20) return <span className="text-[12px] font-bold text-amber-600 dark:text-amber-400">{t('Only {count} left', { count: left })}</span>;
    return null;
};

export const TierCard = ({ tier, index, co, highlight }) => {
    const t = useT();
    const n = co.cart[tier.id] || 0;
    const state = co.tierState(tier);
    const left = co.tierLeft(tier.id);
    const onSale = state.state === 'on_sale';
    const min = tierMinPerOrder(tier);
    return (
        <div
            id={`tier-${tier.id}`}
            className={cn(
                'scroll-mt-24 rounded-3xl border p-4 transition-all',
                n > 0 ? 'border-emerald-500/50 bg-emerald-500/[0.05] shadow-[0_0_0_1px_rgba(16,185,129,0.25)] dark:border-neon-green/40 dark:bg-neon-green/[0.05]' : 'border-black/[0.07] bg-white/60 dark:border-white/[0.08] dark:bg-white/[0.03]',
                !onSale && n === 0 && 'opacity-70',
                highlight && 'ring-2 ring-emerald-500/50 dark:ring-neon-green/50',
            )}
        >
            <div className="flex items-start gap-3">
                <span className="mt-1.5 h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: tierColor(tier, index) }} aria-hidden="true" />
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                        <p className="text-[16px] font-extrabold leading-tight">{tier.name}</p>
                        {isPresent(tier.badge) && onSale && (
                            <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-[11px] font-bold text-amber-700 dark:text-amber-300">{t(tier.badge)}</span>
                        )}
                    </div>
                    <p className="mt-1 flex flex-wrap items-baseline gap-x-2 text-[17px] font-black tabular-nums text-gray-900 dark:text-white">
                        {tier.price > 0 ? rupees(tier.price) : t('Free')}
                        {tier.originalPrice && <span className="text-[13px] font-bold text-gray-400 line-through">{rupees(tier.originalPrice)}</span>}
                        {tier.admits > 1 && <span className="inline-flex items-center gap-1 text-[12px] font-bold text-gray-500 dark:text-zinc-400"><Users size={12} /> {t('Admits {n}', { n: tier.admits })}</span>}
                    </p>
                    {isPresent(tier.description) && <p className="mt-1.5 text-[13.5px] leading-snug text-gray-600 dark:text-zinc-400">{tier.description}</p>}
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <StateLine state={state} left={left} />
                        {min > 1 && onSale && <span className="text-[12px] font-semibold text-gray-500">{t('Sold in sets of {n}+', { n: min })}</span>}
                    </div>
                </div>
                {onSale || n > 0 ? (
                    <Stepper
                        value={n}
                        label={tier.name}
                        onMinus={() => co.changeTier(tier.id, -1)}
                        onPlus={() => co.changeTier(tier.id, 1)}
                        minusDisabled={n === 0}
                        plusDisabled={!co.canAdd(tier)}
                        addLabel={n === 0 ? t('Add') : null}
                    />
                ) : null}
            </div>
        </div>
    );
};

const PickTickets = ({ event, co }) => {
    const t = useT();
    const map = useMemo(() => eventVenueMap(event), [event]);
    const pickable = map && mapHasPickableZones(map, co.tiers);
    const [flash, setFlash] = useState(null);
    const timer = useRef(null);
    const dark = useDarkMode();

    const pickZone = (tierId) => {
        if (!co.cart[tierId]) co.changeTier(tierId, 1);
        setFlash(tierId);
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setFlash(null), 1600);
        document.getElementById(`tier-${tierId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    return (
        <div className="space-y-5">
            {co.sale.state === 'upcoming' && <Notice tone="info" title={t('Sales open soon')}>{t('Tickets go on sale {when}.', { when: when(co.sale.opensAt) })}</Notice>}
            {co.sale.state === 'paused' && <Notice tone="warn" title={t('Sales are paused')}>{t('Check back soon.')}</Notice>}
            {co.sale.state === 'closed' && <Notice tone="warn" title={t('Sales have ended')}>{t('Tickets for this show aren’t on sale any more.')}</Notice>}
            {co.sale.state === 'open' && co.soldOut && <Notice tone="warn" title={t('Sold out')}>{t('Every ticket for this show has gone. Check back in case more are released.')}</Notice>}
            {isPresent(event.ticketingDescription) && <Notice tone="info">{event.ticketingDescription}</Notice>}

            {map && (
                <section className="space-y-2">
                    <ZoomableMap label={t('Venue map')}>
                        <VenueMapView map={map} tiers={co.tiers} picked={co.cart} tierLeft={co.tierLeft} onPick={pickable && co.sale.state === 'open' ? pickZone : undefined} dark={dark} />
                    </ZoomableMap>
                    {pickable && co.sale.state === 'open' && <p className="px-1 text-[13px] text-gray-500 dark:text-zinc-400">{t('Tap a zone to add it, then choose how many below.')}</p>}
                </section>
            )}

            <section className="space-y-2.5" aria-label={t('Ticket types')}>
                {co.visibleTiers.map((tier) => (
                    <TierCard key={tier.id} tier={tier} index={co.tiers.indexOf(tier)} co={co} highlight={flash === tier.id} />
                ))}
            </section>

            {co.count > 0 && co.orderMax < 20 && (
                <p className="px-1 text-[12px] text-gray-500 dark:text-zinc-500">{t('Up to {max} tickets per booking.', { max: co.orderMax })}</p>
            )}
        </div>
    );
};

export default PickTickets;
