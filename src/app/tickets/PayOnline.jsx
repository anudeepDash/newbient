import React from 'react';
import CalendarDays from 'lucide-react/dist/esm/icons/calendar-days';
import MapPin from 'lucide-react/dist/esm/icons/map-pin';
import Smartphone from 'lucide-react/dist/esm/icons/smartphone';
import CreditCard from 'lucide-react/dist/esm/icons/credit-card';
import Landmark from 'lucide-react/dist/esm/icons/landmark';
import Wallet from 'lucide-react/dist/esm/icons/wallet';
import ShieldCheck from 'lucide-react/dist/esm/icons/shield-check';
import Lock from 'lucide-react/dist/esm/icons/lock';
import Zap from 'lucide-react/dist/esm/icons/zap';
import Ticket from 'lucide-react/dist/esm/icons/ticket';
import { Notice } from '../creator/ui';
import { cn } from '../../lib/utils';
import { isPresent } from '../../lib/present';
import { useT } from '../../i18n';
import { dayLabel, timeRange, venueName } from './eventDetails';
import { PriceLine, rupees } from './ticketParts';

/*
 * Booking step 3, paying. Razorpay is the only way to pay: UPI, cards,
 * netbanking and wallets all happen inside its checkout, and the order
 * confirms itself. The Pay button lives in the sheet's footer (TicketSheet),
 * so it is always in view; this is the order summary above it.
 */

const Box = ({ children, className }) => (
    <section className={cn('rounded-3xl border border-black/[0.07] bg-white/70 p-4 dark:border-white/[0.08] dark:bg-white/[0.04]', className)}>{children}</section>
);

const METHODS = [
    [Smartphone, 'UPI', 'GPay, PhonePe, Paytm'],
    [CreditCard, 'Cards', 'Credit and debit'],
    [Landmark, 'Netbanking', 'All major banks'],
    [Wallet, 'Wallets', 'Paytm, Mobikwik & more'],
];

const NEXT = [
    ['Pay in Razorpay’s secure window', Lock],
    ['Your booking confirms instantly', Zap],
    ['Your pass arrives in the app, email and WhatsApp', Ticket],
];

const PayOnline = ({ event, co }) => {
    const t = useT();
    const amount = co.amountDue || co.total;
    const when = [dayLabel(event), timeRange(event)].filter(isPresent).join(' · ');
    const where = [venueName(event), event?.city].filter(isPresent).join(', ');
    const image = event?.hubImage || event?.image || event?.poster;

    if (co.availability && !co.payments.gateway) {
        return <Notice tone="error" title={t('Payments aren’t set up for this show yet')}>{t('Please try again later, or contact us on WhatsApp.')}</Notice>;
    }

    return (
        <div className="space-y-4">
            <Box className="overflow-hidden p-0">
                <div className="flex gap-3 p-4">
                    {image && <img src={image} alt="" className="aspect-video w-24 shrink-0 self-start rounded-xl object-cover" />}
                    <div className="min-w-0 space-y-1">
                        <p className="line-clamp-2 text-[16px] font-extrabold leading-tight">{event?.title}</p>
                        {when && <p className="flex items-center gap-1.5 text-[13px] text-gray-600 dark:text-zinc-400"><CalendarDays size={13} className="shrink-0" /> {when}</p>}
                        {where && <p className="flex items-center gap-1.5 text-[13px] text-gray-600 dark:text-zinc-400"><MapPin size={13} className="shrink-0" /> <span className="truncate">{where}</span></p>}
                    </div>
                </div>
                <div className="space-y-2 border-t border-black/[0.06] bg-black/[0.02] px-4 py-3.5 dark:border-white/[0.08] dark:bg-white/[0.02]">
                    {co.lines.map(l => (
                        <PriceLine key={l.id} label={`${l.name} × ${l.count}`} value={l.price > 0 ? rupees(l.count * l.price) : t('Free')} />
                    ))}
                    {co.discount > 0 && <PriceLine label={t('Coupon {code}', { code: co.coupon?.code || '' })} value={`− ${rupees(co.discount)}`} tone="accent" />}
                    <div className="flex items-baseline justify-between gap-3 border-t border-dashed border-black/10 pt-3 dark:border-white/15">
                        <span className="text-[14px] font-extrabold">{t('Amount to pay')}</span>
                        <span className="font-heading text-[28px] font-black leading-none tracking-tight tabular-nums">{rupees(amount)}</span>
                    </div>
                    <p className="text-[12px] text-gray-500 dark:text-zinc-500">
                        {t('No booking fee. This is all you pay.')}{co.bookingRef && <> · {t('Booking')} <span className="font-mono font-bold text-gray-700 dark:text-zinc-300">{co.bookingRef}</span></>}
                    </p>
                </div>
            </Box>

            <Box>
                <h3 className="text-[14px] font-extrabold">{t('Pay with')}</h3>
                <div className="mt-3 grid grid-cols-2 gap-2">
                    {METHODS.map(([Icon, name, hint]) => (
                        <div key={name} className="flex items-center gap-2.5 rounded-2xl bg-black/[0.035] px-3 py-2.5 dark:bg-white/[0.05]">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-gray-700 shadow-sm ring-1 ring-black/[0.06] dark:bg-white/[0.08] dark:text-zinc-200 dark:ring-white/10"><Icon size={17} /></span>
                            <span className="min-w-0">
                                <span className="block text-[13.5px] font-bold leading-tight">{t(name)}</span>
                                <span className="block truncate text-[11.5px] text-gray-500 dark:text-zinc-500">{t(hint)}</span>
                            </span>
                        </div>
                    ))}
                </div>
            </Box>

            <Box>
                <h3 className="text-[14px] font-extrabold">{t('What happens next')}</h3>
                <ol className="mt-3 space-y-3">
                    {NEXT.map(([text, Icon], i) => (
                        <li key={text} className="flex items-center gap-3 text-[13.5px] text-gray-700 dark:text-zinc-300">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-700 dark:bg-neon-green/15 dark:text-neon-green"><Icon size={14} /></span>
                            <span><span className="font-black text-gray-400 dark:text-zinc-600">{i + 1}.</span> {t(text)}</span>
                        </li>
                    ))}
                </ol>
            </Box>

            <p className="flex items-center justify-center gap-1.5 pb-1 text-[12px] text-gray-500 dark:text-zinc-500">
                <ShieldCheck size={14} /> {t('Secured by Razorpay. Your payment details never reach Newbi.')}
            </p>
        </div>
    );
};

export default PayOnline;
