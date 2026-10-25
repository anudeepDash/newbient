import React from 'react';
import CircleCheck from 'lucide-react/dist/esm/icons/circle-check';
import Ban from 'lucide-react/dist/esm/icons/ban';
import Hourglass from 'lucide-react/dist/esm/icons/hourglass';
import Navigation from 'lucide-react/dist/esm/icons/navigation';
import { CARD_TYPES, GlassChip, PosterGlow } from '../../components/app';
import { isPresent } from '../../lib/present';
import { cn } from '../../lib/utils';
import { ExternalTicketButton, PassQr, entryLine, passWhen, venueLine } from './passParts';
import { useT } from '../../i18n';

/*
 * One pass, as the holder shows it at the gate, drawn as a ticket: the ticket
 * (poster, the show, the details) and, past a perforated tear with a notch
 * cut from each edge, the stub (the QR code, or the RSVP confirmation, and
 * the code). Every detail is shown only when it exists.
 * Used by /p/:ref (a page, or a sheet over a list) and the /t/:token link.
 */

const SOURCE_LABEL = { guestlist: 'Guestlist pass', campaign: 'Creator ticket', order: 'Ticket' };

// The notches: each half-mask cuts one, at the bottom corners of the ticket and the top corners of the stub.
const NOTCH = 14;
const notched = (edge) => {
    const half = (side) => `radial-gradient(circle ${NOTCH}px at ${side === 'left' ? '0' : '100%'} ${edge === 'bottom' ? '100%' : '0'}, transparent 98%, #000 100%) ${side} / 51% 100% no-repeat`;
    const value = `${half('left')}, ${half('right')}`;
    return { WebkitMask: value, mask: value };
};
const PIECE = 'relative overflow-hidden bg-white dark:bg-[#12151d]';

/* A labelled detail on the ticket: small caps label over a bold value. */
const Detail = ({ label, children, className }) => {
    if (!isPresent(children)) return null;
    return (
        <div className={cn('min-w-0', className)}>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-gray-500 dark:text-zinc-500">{label}</p>
            <div className="mt-0.5 break-words text-[15px] font-bold leading-snug text-gray-900 dark:text-white">{children}</div>
        </div>
    );
};

/* bare: no outer frame or width cap, for inside a sheet (which supplies them). */
const PassView = ({ pass, token, offline = false, bare = false }) => {
    const t = useT();
    const event = pass.event || {};
    const title = event.title || pass.campaignTitle || t('Your pass');
    const when = passWhen(event);
    const venue = venueLine(event);
    const map = /^https:\/\//i.test(String(event.mapUrl || '')) ? event.mapUrl : null;
    const revoked = pass.status === 'revoked';
    const checkedIn = pass.status === 'checked_in';
    const pending = pass.status === 'pending';
    const showQr = pass.qr !== false && pass.mode !== 'rsvp' && !revoked && !pending;
    // An RSVP or a confirmation: their place is confirmed, with no QR code to scan.
    const confirmation = ['confirmation', 'guestlist'].includes(pass.mode) && pass.qr === false && !pass.externalTicket;
    const onList = pass.mode === 'rsvp' || (confirmation && pass.mode === 'guestlist');
    const confirmed = !showQr && !revoked && !pending && (confirmation || pass.mode === 'rsvp');
    const qty = Math.max(1, Number(pass.qty) || 1);
    const tier = pass.tier || pass.externalTicket?.tier;
    const guests = Array.isArray(pass.plusOneNames) ? pass.plusOneNames.filter(Boolean).join(', ') : '';
    const note = pass.note || pass.externalTicket?.note;
    const kindLabel = onList ? t('Guestlist') : confirmation ? t('Confirmation') : t(SOURCE_LABEL[pass.source] || 'Pass');
    const KindIcon = CARD_TYPES[pass.source === 'campaign' ? 'campaign' : pass.source === 'order' ? 'event' : 'guestlist'].icon;
    const firstName = isPresent(pass.holderName) ? String(pass.holderName).split(/\s+/)[0] : '';

    return (
        <article
            className={cn('relative mx-auto w-full', !bare && 'max-w-md')}
            // The shadow follows the notched outline (a box-shadow would be cut by the masks).
            style={{ filter: 'drop-shadow(0 18px 40px rgba(0,0,0,0.28))' }}
        >
            {/* ── The ticket ── */}
            <div className={cn(PIECE, 'rounded-t-[1.75rem] rounded-b-xl')} style={notched('bottom')}>
                <PosterGlow image={event.image} color={event.ambientColor} height="80%" strength={0.8} />
                {isPresent(event.image) ? (
                    <div className="relative aspect-video w-full overflow-hidden" style={{ WebkitMaskImage: 'linear-gradient(to bottom, #000 60%, transparent)', maskImage: 'linear-gradient(to bottom, #000 60%, transparent)' }}>
                        <img src={event.image} alt="" className="h-full w-full object-cover" decoding="async" />
                    </div>
                ) : <div className="h-14" aria-hidden="true" />}
                <div className="absolute left-4 top-4 z-10 flex flex-wrap items-center gap-2">
                    <GlassChip icon={KindIcon} label={kindLabel} />
                    {checkedIn && <GlassChip icon={CircleCheck} label={t('Checked in')} tone="accent" />}
                </div>

                <div className={cn('relative space-y-4 px-5 pb-6', isPresent(event.image) && '-mt-8')}>
                    <div className="space-y-1">
                        <h1 className="font-heading text-[24px] font-black leading-[1.1] tracking-[-0.02em]">{title}</h1>
                        {isPresent(pass.campaignTitle) && pass.campaignTitle !== title && (
                            <p className="text-[14px] text-gray-600 dark:text-zinc-400">{pass.campaignTitle}</p>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-3.5">
                        <Detail label={t('When')} className="col-span-2">{when}</Detail>
                        <Detail label={t('Venue')} className="col-span-2">
                            {(venue || map) && (
                                <>
                                    {venue && <span className="block">{venue}</span>}
                                    {map && (
                                        <a href={map} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex min-h-[32px] items-center gap-1.5 text-[14px] font-bold text-emerald-700 dark:text-neon-green">
                                            <Navigation size={14} /> {t('Get directions')}
                                        </a>
                                    )}
                                </>
                            )}
                        </Detail>
                        <Detail label={t('Box office')}>{event.boxOffice}</Detail>
                        <Detail label={t('Entry')} className="col-span-2">{entryLine(event, pass.qr !== false)}</Detail>
                        <Detail label={t('Name')}>{pass.holderName}</Detail>
                        <Detail label={t('Tier')}>{tier && <span className="text-emerald-700 dark:text-neon-green">{tier}</span>}</Detail>
                        <Detail label={t('Coming with you')} className="col-span-2">{guests}</Detail>
                    </div>

                    {isPresent(note) && (
                        <p className="rounded-2xl bg-black/[0.03] px-4 py-3 text-[14px] text-gray-700 dark:bg-white/[0.04] dark:text-zinc-300">{note}</p>
                    )}
                </div>
            </div>

            {/* ── The tear ── */}
            <div className="relative h-0" aria-hidden="true">
                <div className="absolute inset-x-[18px] -top-px border-t-2 border-dashed border-black/[0.14] dark:border-white/[0.16]" />
            </div>

            {/* ── The stub ── */}
            <div className={cn(PIECE, 'rounded-b-[1.75rem] rounded-t-xl px-5 pb-6 pt-5')} style={notched('top')}>
                {revoked ? (
                    <p className="flex items-center justify-center gap-2 py-3 text-[15px] font-bold text-red-700 dark:text-red-300">
                        <Ban size={17} /> {t('This pass was cancelled.')}
                    </p>
                ) : pending ? (
                    <p className="flex items-center justify-center gap-2 py-3 text-center text-[15px] font-semibold text-amber-800 dark:text-amber-300">
                        <Hourglass size={17} className="shrink-0" /> {t('Waiting for approval. We’ll send your pass as soon as you’re in.')}
                    </p>
                ) : showQr ? (
                    <div className="relative">
                        <PassQr value={pass.ref} size={208} dimmed={checkedIn} />
                        {checkedIn && (
                            <span className="absolute inset-x-0 top-0 flex h-[232px] items-center justify-center">
                                <span className="flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-[15px] font-black text-white shadow-lg">
                                    <CircleCheck size={18} /> {t('Checked in')}
                                </span>
                            </span>
                        )}
                        {!checkedIn && <p className="mt-3 text-center text-[13px] text-gray-500 dark:text-zinc-400">{t('Show this at the gate. Turn your brightness up.')}</p>}
                    </div>
                ) : confirmed ? (
                    <div className="flex items-center gap-3">
                        <CircleCheck size={30} className="shrink-0 text-emerald-600 dark:text-neon-green" />
                        <div className="min-w-0">
                            <p className="font-heading text-[18px] font-black leading-tight">
                                {onList
                                    ? (firstName ? t('You’re on the list, {name}', { name: firstName }) : t('You’re on the list'))
                                    : (firstName ? t('You’re confirmed, {name}', { name: firstName }) : t('You’re confirmed'))}
                            </p>
                            <p className="text-[13px] text-gray-600 dark:text-zinc-400">{checkedIn ? t('Checked in. Enjoy the night.') : t('No QR code needed. Show this if anyone asks at entry.')}</p>
                        </div>
                    </div>
                ) : null}

                <ExternalTicketButton pass={pass} token={token} className="mt-4" />

                {!revoked && (
                    <div className="mt-4 flex items-end justify-between gap-4">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-gray-500 dark:text-zinc-500">{t('Admit')}</p>
                            <p className="font-heading text-[22px] font-black leading-none">{qty}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-gray-500 dark:text-zinc-500">{showQr ? t('Pass code') : t('Reference')}</p>
                            <p className="font-mono text-[18px] font-black tracking-[0.2em]">{pass.ref}</p>
                        </div>
                    </div>
                )}

                {offline && <p className="mt-3 text-center text-[13px] text-gray-500 dark:text-zinc-500">{t('Offline copy saved on this phone.')}</p>}
            </div>
        </article>
    );
};

export default PassView;
