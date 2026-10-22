import React from 'react';
import { Link } from 'react-router-dom';
import CalendarDays from 'lucide-react/dist/esm/icons/calendar-days';
import MapPin from 'lucide-react/dist/esm/icons/map-pin';
import CircleCheck from 'lucide-react/dist/esm/icons/circle-check';
import Ban from 'lucide-react/dist/esm/icons/ban';
import { CARD_TYPES, GlassChip, PosterGlow } from '../../components/app';
import { isPresent } from '../../lib/present';
import { cn } from '../../lib/utils';
import { appPath } from '../host';
import { isUpcomingPass } from './passCards';
import { passWhen, venueLine } from './passParts';
import { useT } from '../../i18n';

/*
 * A pass in a list, drawn as a ticket: the poster on top, the show, then a
 * perforated tear line with a notch cut out of each edge, and the stub
 * (admit, tier and the pass code). Tapping it opens the pass, where the
 * QR code for the gate is.
 * Used wherever passes are listed (Tickets, Home, Community).
 */

// Where the tear line sits, measured up from the bottom edge (the stub's height).
const STUB = 96;
const NOTCH = 13;
// Two half-masks, each cutting one notch, so no mask-composite is needed.
const ticketMask = (() => {
    const at = `calc(100% - ${STUB}px)`;
    const half = (side) => `radial-gradient(circle ${NOTCH}px at ${side === 'left' ? '0' : '100%'} ${at}, transparent 98%, #000 100%) ${side} / 51% 100% no-repeat`;
    const value = `${half('left')}, ${half('right')}`;
    return { WebkitMask: value, mask: value };
})();

const kindOf = (pass) => {
    if (pass.source === 'campaign') return { type: 'campaign', label: pass.qr === false && !pass.externalTicket ? 'Confirmation' : 'Creator ticket' };
    if (pass.source === 'order') return { type: 'event', label: 'Ticket' };
    return { type: 'guestlist', label: pass.mode === 'rsvp' ? 'Guestlist' : 'Guestlist pass' };
};

const StubCell = ({ label, value, accent, mono, className }) => (
    <div className={cn('min-w-0', className)}>
        <p className="text-[9px] font-black uppercase tracking-[0.18em] text-gray-500 dark:text-zinc-500">{label}</p>
        <p className={cn('mt-0.5 truncate text-[15px] font-black leading-tight', mono && 'font-mono tracking-[0.12em]', accent ? 'text-emerald-700 dark:text-neon-green' : 'text-gray-900 dark:text-white')}>{value}</p>
    </div>
);

const PassTicket = ({ pass, from = null, className }) => {
    const t = useT();
    const event = pass.event || {};
    const kind = kindOf(pass);
    const KindIcon = CARD_TYPES[kind.type]?.icon || CARD_TYPES.guestlist.icon;
    const revoked = pass.status === 'revoked';
    const checkedIn = pass.status === 'checked_in';
    const past = !revoked && !isUpcomingPass(pass);
    const faded = revoked || past;
    const qty = Math.max(1, Number(pass.qty) || 1);
    const tier = pass.tier || pass.externalTicket?.tier;
    const hasQr = pass.qr !== false && pass.mode !== 'rsvp';
    const title = event.title || pass.campaignTitle || t('Your pass');
    const venue = venueLine(event);
    const when = passWhen(event);

    const status = revoked
        ? <GlassChip icon={Ban} label={t('Cancelled')} />
        : checkedIn
            ? <GlassChip icon={CircleCheck} label={t('Checked in')} tone="accent" />
            : past ? <GlassChip label={t('Ended')} /> : null;

    return (
        <Link
            to={appPath(`/p/${pass.ref}`)}
            state={from ? { backgroundLocation: from } : undefined}
            aria-label={t('Open {title}', { title })}
            style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
            className={cn(
                'group block h-full w-full select-none transition-transform duration-300 active:scale-[0.985] hover:-translate-y-0.5',
                // The shadow follows the notched outline (a box-shadow would be cut off by the mask).
                '[filter:drop-shadow(0_18px_28px_rgba(0,0,0,0.18))] dark:[filter:drop-shadow(0_18px_32px_rgba(0,0,0,0.55))]',
                className
            )}
        >
            <article style={ticketMask} className={cn('relative flex h-full flex-col overflow-hidden rounded-[1.75rem] bg-white dark:bg-[#101219]', faded && 'opacity-60 grayscale')}>
                <PosterGlow image={event.image} height="70%" strength={0.8} />

                {/* The poster, fading into the ticket. */}
                <div className="relative aspect-[2/1] w-full shrink-0 overflow-hidden">
                    {isPresent(event.image) ? (
                        <img
                            src={event.image}
                            alt=""
                            decoding="async"
                            loading="lazy"
                            className="h-full w-full object-cover"
                            style={{ WebkitMaskImage: 'linear-gradient(to bottom, #000 55%, transparent)', maskImage: 'linear-gradient(to bottom, #000 55%, transparent)' }}
                        />
                    ) : (
                        <div className="flex h-full w-full items-center justify-center"><KindIcon size={48} strokeWidth={1.25} className="text-emerald-600/25 dark:text-neon-green/20" /></div>
                    )}
                    <div className="absolute left-3 top-3 flex flex-wrap items-center gap-2">
                        <GlassChip icon={KindIcon} label={t(kind.label)} />
                        {status}
                    </div>
                </div>

                {/* The show */}
                <div className="relative -mt-6 flex-1 space-y-1.5 px-5 pb-4">
                    {when && (
                        <p className="flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-700 dark:text-neon-green">
                            <CalendarDays size={12} className="shrink-0" /> {when}
                        </p>
                    )}
                    <h3 className="line-clamp-2 font-heading text-[19px] font-extrabold leading-[1.15] tracking-[-0.02em] text-gray-900 dark:text-white">{title}</h3>
                    {venue && (
                        <p className="flex items-start gap-1.5 text-[13px] font-semibold leading-snug text-gray-600 dark:text-zinc-400">
                            <MapPin size={13} className="mt-0.5 shrink-0" /> <span className="line-clamp-2">{venue}</span>
                        </p>
                    )}
                </div>

                {/* Tear line, between the two notches */}
                <div className="relative mx-[18px] shrink-0 border-t-2 border-dashed border-black/[0.12] dark:border-white/[0.14]" aria-hidden="true" />

                {/* The stub: admit and tier, and the pass code */}
                <div className="relative flex shrink-0 items-center justify-between gap-4 px-5" style={{ height: STUB - 2 }}>
                    <div className="flex min-w-0 items-end gap-5">
                        <StubCell label={t('Admit')} value={qty} />
                        {tier && <StubCell label={t('Tier')} value={tier} accent className="max-w-[8rem]" />}
                    </div>
                    <div className="flex min-w-0 shrink-0 flex-col items-end gap-0.5 text-right">
                        <p className="text-[9px] font-black uppercase tracking-[0.18em] text-gray-500 dark:text-zinc-500">{hasQr ? t('Pass code') : t('Reference')}</p>
                        <p className="font-mono text-[14px] font-black tracking-[0.18em] text-gray-900 dark:text-white">{pass.ref}</p>
                    </div>
                </div>
            </article>
        </Link>
    );
};

export default PassTicket;
