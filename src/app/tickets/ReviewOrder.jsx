import React from 'react';
import TicketPercent from 'lucide-react/dist/esm/icons/ticket-percent';
import X from 'lucide-react/dist/esm/icons/x';
import CalendarDays from 'lucide-react/dist/esm/icons/calendar-days';
import MapPin from 'lucide-react/dist/esm/icons/map-pin';
import UserRound from 'lucide-react/dist/esm/icons/user-round';
import Pencil from 'lucide-react/dist/esm/icons/pencil';
import ShieldCheck from 'lucide-react/dist/esm/icons/shield-check';
import { Button, TextInput } from '../../components/app';
import { cn } from '../../lib/utils';
import { isPresent } from '../../lib/present';
import { useT } from '../../i18n';
import { dayLabel, termsOf, timeRange, venueName } from './eventDetails';
import { ErrorText, PriceLine, rupees } from './ticketParts';

/*
 * Booking step 2: what you're buying, a coupon, who the tickets are for and
 * the terms. Nothing is charged on top of the ticket price.
 */

const Box = ({ title, action, children, className }) => (
    <section className={cn('rounded-3xl border border-black/[0.07] bg-white/60 p-4 dark:border-white/[0.08] dark:bg-white/[0.03]', className)}>
        {(title || action) && (
            <div className="mb-3 flex items-center justify-between gap-3">
                {title && <h3 className="text-[14px] font-extrabold">{title}</h3>}
                {action}
            </div>
        )}
        {children}
    </section>
);

const ReviewOrder = ({ event, co, customer, needsEmail, email, onEmail, emailError, onEditProfile }) => {
    const t = useT();
    const terms = termsOf(event);
    const when = [dayLabel(event), timeRange(event)].filter(isPresent).join(' · ');
    const where = [venueName(event), event.city].filter(isPresent).join(', ');
    const image = event.hubImage || event.image || event.poster;

    return (
        <div className="space-y-4">
            <Box>
                <div className="flex gap-3">
                    {image && <img src={image} alt="" className="aspect-video w-28 shrink-0 self-start rounded-xl object-cover" />}
                    <div className="min-w-0 space-y-1">
                        <p className="line-clamp-2 text-[16px] font-extrabold leading-tight">{event.title}</p>
                        {when && <p className="flex items-center gap-1.5 text-[13px] text-gray-600 dark:text-zinc-400"><CalendarDays size={13} className="shrink-0" /> {when}</p>}
                        {where && <p className="flex items-center gap-1.5 text-[13px] text-gray-600 dark:text-zinc-400"><MapPin size={13} className="shrink-0" /> <span className="truncate">{where}</span></p>}
                    </div>
                </div>
            </Box>

            <Box title={t('Your tickets')} action={<button type="button" onClick={() => co.setStep('tickets')} className="flex h-9 items-center gap-1 rounded-full px-2 text-[13px] font-bold text-emerald-700 dark:text-neon-green"><Pencil size={13} /> {t('Change')}</button>}>
                <div className="space-y-2">
                    {co.lines.map(l => (
                        <PriceLine key={l.id} label={`${l.name} × ${l.count}${l.admits > 1 ? ` (${t('admits {n}', { n: l.count * l.admits })})` : ''}`} value={l.price > 0 ? rupees(l.count * l.price) : t('Free')} />
                    ))}
                </div>

                {co.subtotal > 0 && (
                    <div className="mt-4 border-t border-black/[0.06] pt-4 dark:border-white/[0.08]">
                        {co.coupon ? (
                            <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.06] px-4 py-3 dark:border-neon-green/30 dark:bg-neon-green/[0.06]">
                                <TicketPercent size={18} className="shrink-0 text-emerald-600 dark:text-neon-green" />
                                <div className="min-w-0 flex-1">
                                    <p className="truncate font-mono text-[15px] font-bold">{co.coupon.code}</p>
                                    <p className="text-[13px] text-emerald-700 dark:text-neon-green">{t('{amount} off', { amount: rupees(co.discount) })}</p>
                                </div>
                                <button type="button" onClick={co.removeCoupon} aria-label={t('Remove coupon')}
                                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-500 hover:bg-black/[0.05] dark:text-zinc-400 dark:hover:bg-white/[0.08]">
                                    <X size={17} />
                                </button>
                            </div>
                        ) : (
                            <form className="flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); co.applyCode(); }}>
                                <TextInput
                                    label={t('Coupon code')}
                                    className="flex-1"
                                    value={co.couponInput}
                                    onChange={(e) => co.setCouponInput(e.target.value.toUpperCase())}
                                    placeholder={t('Optional')}
                                    autoCapitalize="characters"
                                    autoComplete="off"
                                    autoCorrect="off"
                                    spellCheck={false}
                                    inputClassName="font-mono uppercase placeholder:font-sans placeholder:normal-case"
                                />
                                <Button type="submit" variant="secondary" loading={co.couponBusy} disabled={!co.couponInput.trim()}>{t('Apply')}</Button>
                            </form>
                        )}
                        <ErrorText className="mt-2">{co.couponError}</ErrorText>
                    </div>
                )}

                <div className="mt-4 space-y-1.5 border-t border-black/[0.06] pt-4 dark:border-white/[0.08]">
                    {co.discount > 0 && <PriceLine label={t('Tickets')} value={rupees(co.subtotal)} />}
                    {co.discount > 0 && <PriceLine label={t('Coupon {code}', { code: co.coupon?.code || '' })} value={`− ${rupees(co.discount)}`} tone="accent" />}
                    <div className="flex items-baseline justify-between gap-3">
                        <span className="text-[15px] font-extrabold">{t('Total')}</span>
                        <span className="text-[22px] font-black tabular-nums">{co.total > 0 ? rupees(co.total) : t('Free')}</span>
                    </div>
                    {co.total > 0 && <p className="text-[12px] text-gray-500 dark:text-zinc-500">{t('No booking fee. This is all you pay.')}</p>}
                </div>
            </Box>

            <Box title={t('Tickets for')} action={onEditProfile && <button type="button" onClick={onEditProfile} className="flex h-9 items-center gap-1 rounded-full px-2 text-[13px] font-bold text-emerald-700 dark:text-neon-green"><Pencil size={13} /> {t('Edit')}</button>}>
                <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black/[0.05] text-gray-500 dark:bg-white/[0.06] dark:text-zinc-400"><UserRound size={18} /></span>
                    <div className="min-w-0 text-[14px]">
                        <p className="truncate font-bold">{customer.name || t('Your name')}</p>
                        {customer.phone && <p className="truncate text-gray-600 dark:text-zinc-400">{customer.phone}</p>}
                        {!needsEmail && customer.email && <p className="truncate text-gray-600 dark:text-zinc-400">{customer.email}</p>}
                    </div>
                </div>
                {needsEmail && (
                    <TextInput
                        className="mt-3"
                        label={t('Email for your ticket')}
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => onEmail(e.target.value)}
                        error={emailError}
                        hint={t('Your account has no email, so we’ll send the ticket here.')}
                    />
                )}
                <p className="mt-3 text-[12px] text-gray-500 dark:text-zinc-500">{t('Your ticket is in the app, by email and on WhatsApp. Only the event team sees these details.')}</p>
            </Box>

            {terms.length > 0 && (
                <Box>
                    <details className="group">
                        <summary className="flex min-h-[44px] cursor-pointer list-none items-center gap-2 text-[14px] font-extrabold [&::-webkit-details-marker]:hidden">
                            <ShieldCheck size={16} className="shrink-0 text-gray-500" /> {t('Terms and conditions')}
                            <span className="ml-auto text-[12px] font-semibold text-gray-500 group-open:hidden">{t('Read')}</span>
                        </summary>
                        <ul className="mt-2 list-disc space-y-1 pl-5 text-[13px] text-gray-600 dark:text-zinc-400">
                            {terms.map((line, i) => <li key={i}>{line}</li>)}
                        </ul>
                    </details>
                </Box>
            )}

            <label className="flex cursor-pointer items-start gap-3 rounded-2xl px-1 py-1">
                <input type="checkbox" checked={co.agreed} onChange={(e) => { co.setAgreed(e.target.checked); co.setError(''); }}
                    className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer rounded accent-emerald-600" />
                <span className="text-[13.5px] text-gray-700 dark:text-zinc-300">
                    {terms.length ? t('I agree to the terms above and that entry needs a valid ticket.') : t('I understand entry needs a valid ticket and the venue’s entry rules apply.')}
                </span>
            </label>
        </div>
    );
};

export default ReviewOrder;
