import React, { useEffect, useState } from 'react';
import CircleCheck from 'lucide-react/dist/esm/icons/circle-check';
import Hourglass from 'lucide-react/dist/esm/icons/hourglass';
import Copy from 'lucide-react/dist/esm/icons/copy';
import Check from 'lucide-react/dist/esm/icons/check';
import CalendarPlus from 'lucide-react/dist/esm/icons/calendar-plus';
import Navigation from 'lucide-react/dist/esm/icons/navigation';
import Circle from 'lucide-react/dist/esm/icons/circle';
import { Stat, StatRow } from '../../components/app';
import { copyToClipboard } from '../../lib/clipboard';
import { cn } from '../../lib/utils';
import { Notice } from '../creator/ui';
import { useT } from '../../i18n';
import { directionsUrl, googleCalendarUrl, icsDataUrl, platform } from './eventDetails';
import { rupees } from './ticketParts';
import { PassQr } from '../passes/passParts';

/*
 * Booking done. A free or card-paid order has its pass at /p/{ref} already;
 * a UPI order waits for the team to check the UTR ("on verification"), then
 * the pass appears there and is sent by email and WhatsApp.
 */

const Timeline = ({ steps }) => (
    <ol className="space-y-0">
        {steps.map((s, i) => (
            <li key={s.label} className="relative flex gap-3 pb-4 last:pb-0">
                {i < steps.length - 1 && <span className={cn('absolute left-[11px] top-6 h-[calc(100%-16px)] w-0.5', s.done ? 'bg-emerald-500/50 dark:bg-neon-green/40' : 'bg-black/10 dark:bg-white/10')} aria-hidden="true" />}
                <span className={cn('relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
                    s.done ? 'bg-emerald-500 text-white dark:bg-neon-green dark:text-black' : s.now ? 'bg-amber-400 text-white' : 'bg-black/[0.06] text-gray-400 dark:bg-white/[0.08]')}>
                    {s.done ? <Check size={14} strokeWidth={3} /> : s.now ? <Hourglass size={12} /> : <Circle size={8} />}
                </span>
                <div className="min-w-0 pt-0.5">
                    <p className={cn('text-[14px] font-bold', !s.done && !s.now && 'text-gray-500 dark:text-zinc-500')}>{s.label}</p>
                    {s.hint && <p className="text-[12.5px] text-gray-600 dark:text-zinc-400">{s.hint}</p>}
                </div>
            </li>
        ))}
    </ol>
);

const TicketDone = ({ result, event }) => {
    const t = useT();
    const [copied, setCopied] = useState(false);
    const confirmed = result.status !== 'pending';
    const Icon = confirmed ? CircleCheck : Hourglass;
    const directions = event ? directionsUrl(event) : '';
    const gcal = event ? googleCalendarUrl(event, { ref: result.bookingRef }) : '';
    const ics = event ? icsDataUrl(event, { ref: result.bookingRef, url: typeof window !== 'undefined' ? window.location.origin : '' }) : '';
    const apple = platform() === 'ios';

    // A little celebration when the pass is ready (skipped for reduced motion).
    useEffect(() => {
        if (!confirmed || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
        import('canvas-confetti').then(m => m.default({ particleCount: 90, spread: 70, origin: { y: 0.3 }, colors: ['#39FF14', '#22c55e', '#ffffff', '#facc15'] })).catch(() => {});
    }, [confirmed]);

    const copy = async () => {
        if (await copyToClipboard(result.bookingRef)) { setCopied(true); setTimeout(() => setCopied(false), 1800); }
    };

    return (
        <div className="space-y-5 pt-2">
            <div className="flex flex-col items-center text-center">
                <span className={confirmed
                    ? 'flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:bg-neon-green/10 dark:text-neon-green'
                    : 'flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400'}>
                    <Icon size={30} />
                </span>
                <h3 className="mt-3 font-heading text-[26px] font-black tracking-tight">{confirmed ? t('You’re in!') : t('Payment under verification')}</h3>
                <p className="mt-1 max-w-sm text-[15px] text-gray-600 dark:text-zinc-400">
                    {confirmed
                        ? (result.emailed && result.email ? t('Your pass is ready. We’ve also emailed it to {email}.', { email: result.email }) : t('Your pass is ready.'))
                        : t('We’re checking your UPI payment. Your ticket comes to the app, email and WhatsApp as soon as it’s verified.')}
                </p>
            </div>

            {confirmed && result.bookingRef && (
                <section className="space-y-2 text-center">
                    <PassQr value={result.bookingRef} size={208} />
                    <p className="text-[13px] text-gray-600 dark:text-zinc-400">{t('Show this QR code at the entrance.')}</p>
                </section>
            )}

            <button type="button" onClick={copy} className="flex w-full items-center justify-between gap-3 rounded-2xl border border-dashed border-black/[0.12] px-4 py-3 text-left dark:border-white/[0.14]">
                <span className="min-w-0">
                    <span className="block text-[12px] font-semibold text-gray-500 dark:text-zinc-500">{t('Booking reference')}</span>
                    <span className="block truncate font-mono text-[20px] font-black tracking-wider">{result.bookingRef}</span>
                </span>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black/[0.04] text-gray-500 dark:bg-white/[0.06]">
                    {copied ? <Check size={17} className="text-emerald-600 dark:text-neon-green" /> : <Copy size={17} />}
                </span>
                <span className="sr-only">{copied ? t('Copied') : t('Copy booking reference')}</span>
            </button>

            {!confirmed && (
                <section className="rounded-3xl border border-black/[0.07] p-4 dark:border-white/[0.08]">
                    <Timeline steps={[
                        { label: t('Booking placed'), done: true },
                        { label: t('Payment check'), now: true, hint: result.utr ? t('UTR {utr}. Usually within a few hours.', { utr: result.utr }) : t('Usually within a few hours.') },
                        { label: t('Ticket issued'), hint: t('Your QR pass, in the app') },
                    ]} />
                </section>
            )}

            <StatRow>
                <Stat label={t('Tickets')} value={result.count} />
                <Stat label={t('People')} value={result.people > result.count ? result.people : null} />
                <Stat label={confirmed ? t('Paid') : t('Amount')} value={result.total > 0 ? rupees(result.total) : t('Free')} tone="accent" />
            </StatRow>

            {(gcal || directions) && (
                <div className="grid grid-cols-2 gap-2">
                    {(apple ? ics : gcal) && (
                        <a href={apple ? ics : gcal} {...(apple ? { download: 'newbi-event.ics' } : { target: '_blank', rel: 'noopener noreferrer' })}
                            className="flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-black/[0.04] px-3 text-[14px] font-bold dark:bg-white/[0.06]">
                            <CalendarPlus size={16} /> {t('Add to calendar')}
                        </a>
                    )}
                    {directions && (
                        <a href={directions} target="_blank" rel="noopener noreferrer" className="flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-black/[0.04] px-3 text-[14px] font-bold dark:bg-white/[0.06]">
                            <Navigation size={16} /> {t('Directions')}
                        </a>
                    )}
                </div>
            )}

            {result.flagged && <Notice tone="warn">{t('The team will look at this order before confirming it, and will contact you if anything needs sorting out.')}</Notice>}
        </div>
    );
};

export default TicketDone;
