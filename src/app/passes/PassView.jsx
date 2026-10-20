import React from 'react';
import CalendarDays from 'lucide-react/dist/esm/icons/calendar-days';
import MapPin from 'lucide-react/dist/esm/icons/map-pin';
import Clock from 'lucide-react/dist/esm/icons/clock';
import DoorOpen from 'lucide-react/dist/esm/icons/door-open';
import CircleCheck from 'lucide-react/dist/esm/icons/circle-check';
import Ban from 'lucide-react/dist/esm/icons/ban';
import { AmbientBackdrop, Field, Stat, StatRow } from '../../components/app';
import { isPresent } from '../../lib/present';
import { cn } from '../../lib/utils';
import { ExternalTicketButton, PassQr, entryLine, passWhen } from './passParts';
import { useT } from '../../i18n';

/*
 * One pass, as the holder shows it at the gate: poster, event details, the QR
 * code and the code under it. Every detail is shown only when it exists.
 * Used by /p/:ref and the /t/:token ticket link.
 */

const SOURCE_LABEL = { guestlist: 'Guestlist pass', campaign: 'Creator ticket', order: 'Ticket' };

const PassView = ({ pass, token, offline = false }) => {
    const t = useT();
    const event = pass.event || {};
    const title = event.title || pass.campaignTitle || t('Your pass');
    const when = passWhen(event);
    const revoked = pass.status === 'revoked';
    const checkedIn = pass.status === 'checked_in';
    const pending = pass.status === 'pending';
    const showQr = pass.qr !== false && pass.mode !== 'rsvp' && !revoked && !pending;
    // A confirmation: their place is confirmed, with no QR code to scan.
    const confirmation = pass.mode === 'confirmation' && pass.qr === false && !pass.externalTicket;
    const qty = Number(pass.qty) > 1 ? Number(pass.qty) : null;

    return (
        <article className="relative mx-auto w-full max-w-md overflow-hidden rounded-[2rem] border border-black/[0.06] bg-white shadow-[0_20px_60px_-20px_rgba(0,0,0,0.25)] dark:border-white/[0.08] dark:bg-[#0c0e14]">
            <AmbientBackdrop image={event.image} />
            {isPresent(event.image) && (
                <div className="relative aspect-video w-full overflow-hidden" style={{ WebkitMaskImage: 'linear-gradient(to bottom, #000 55%, transparent)', maskImage: 'linear-gradient(to bottom, #000 55%, transparent)' }}>
                    <img src={event.image} alt="" className="h-full w-full object-cover" decoding="async" />
                </div>
            )}
            <div className={cn('relative space-y-5 px-5 pb-6 sm:px-6', isPresent(event.image) ? '-mt-6' : 'pt-6')}>
                <div className="space-y-1.5 text-center">
                    <p className="text-[12px] font-black uppercase tracking-[0.2em] text-emerald-700 dark:text-neon-green">
                        {pass.mode === 'rsvp' ? 'RSVP' : confirmation ? t('Confirmation') : t(SOURCE_LABEL[pass.source] || 'Pass')}
                    </p>
                    <h1 className="font-heading text-[26px] font-black leading-tight tracking-tight">{title}</h1>
                    {isPresent(pass.campaignTitle) && pass.campaignTitle !== title && (
                        <p className="text-[14px] text-gray-600 dark:text-zinc-400">{pass.campaignTitle}</p>
                    )}
                </div>

                {revoked && (
                    <p className="flex items-center justify-center gap-2 rounded-2xl bg-red-500/10 px-4 py-3 text-[15px] font-bold text-red-700 dark:text-red-300">
                        <Ban size={17} /> {t('This pass was cancelled.')}
                    </p>
                )}
                {pending && (
                    <p className="rounded-2xl bg-amber-500/10 px-4 py-3 text-center text-[15px] font-semibold text-amber-800 dark:text-amber-300">
                        {t('Waiting for approval. We’ll send your pass as soon as you’re in.')}
                    </p>
                )}

                {showQr && (
                    <div className="relative">
                        <PassQr value={pass.ref} dimmed={checkedIn} />
                        {checkedIn && (
                            <span className="absolute inset-0 flex items-center justify-center">
                                <span className="flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-[15px] font-black text-white shadow-lg">
                                    <CircleCheck size={18} /> {t('Checked in')}
                                </span>
                            </span>
                        )}
                        <p className="mt-3 text-center font-mono text-[20px] font-black tracking-[0.25em]">{pass.ref}</p>
                        {!checkedIn && <p className="text-center text-[13px] text-gray-500 dark:text-zinc-400">{t('Show this at the gate. Turn your brightness up.')}</p>}
                    </div>
                )}

                {confirmation && !revoked && (
                    <div className="flex flex-col items-center gap-2 rounded-2xl bg-emerald-500/10 px-4 py-5 text-center dark:bg-neon-green/[0.08]">
                        <CircleCheck size={34} className="text-emerald-600 dark:text-neon-green" />
                        <p className="font-heading text-[20px] font-black">{isPresent(pass.holderName) ? t('You’re confirmed, {name}', { name: String(pass.holderName).split(/\s+/)[0] }) : t('You’re confirmed')}</p>
                        <p className="text-[14px] text-gray-600 dark:text-zinc-400">{t('No QR code needed. Show this if anyone asks at entry.')}</p>
                    </div>
                )}

                <ExternalTicketButton pass={pass} token={token} />

                <div className="divide-y divide-black/[0.05] rounded-2xl border border-black/[0.05] px-4 dark:divide-white/[0.06] dark:border-white/[0.07]">
                    <Field icon={CalendarDays} label={t('When')} value={when} />
                    <Field icon={Clock} label={t('Box office')} value={event.boxOffice} />
                    <Field icon={MapPin} label={t('Venue')} value={[event.venue, event.city && !String(event.venue || '').includes(event.city) ? event.city : null].filter(Boolean).join(', ') || null} />
                    <Field icon={DoorOpen} label={t('Entry')} value={entryLine(event, pass.qr !== false)} />
                </div>

                <StatRow>
                    <Stat label={pass.source === 'guestlist' ? t('Guests') : t('Tickets')} value={qty} />
                    <Stat label={t('Tier')} value={pass.tier || pass.externalTicket?.tier} tone="accent" />
                    <Stat label={t('Name')} value={pass.holderName} />
                </StatRow>

                {isPresent(pass.note || pass.externalTicket?.note) && (
                    <p className="rounded-2xl bg-black/[0.03] px-4 py-3 text-[15px] text-gray-700 dark:bg-white/[0.04] dark:text-zinc-300">{pass.note || pass.externalTicket?.note}</p>
                )}

                {offline && <p className="text-center text-[13px] text-gray-500 dark:text-zinc-500">{t('Offline copy saved on this phone.')}</p>}
            </div>
        </article>
    );
};

export default PassView;
