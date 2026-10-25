import React, { useEffect, useRef, useState } from 'react';
import ChevronLeft from 'lucide-react/dist/esm/icons/chevron-left';
import Ticket from 'lucide-react/dist/esm/icons/ticket';
import { Button, Sheet } from '../../components/app';
import { useAppStore } from '../../lib/store/appStore';
import { isPresent } from '../../lib/present';
import { appPath } from '../host';
import CompleteProfileSheet from '../profile/CompleteProfileSheet';
import { missingFields, requirementsFor } from '../profile/requirements';
import { useT } from '../../i18n';
import { useTicketCheckout } from './useTicketCheckout';
import PickTickets from './PickTickets';
import ReviewOrder from './ReviewOrder';
import PayByUpi from './PayByUpi';
import TicketDone from './TicketDone';
import { dayLabel, timeRange, venueName } from './eventDetails';
import { ErrorText, rupees, StepDots } from './ticketParts';

/*
 * Booking tickets for one show, in the app's Sheet, the way BookMyShow and
 * District do it:
 *
 *   tickets → ticket types (or the venue map), within every limit
 *   review  → the order, a coupon, who it's for, the terms. Missing profile
 *             fields (name, verified phone) are asked for in CompleteProfileSheet;
 *             the email comes from the account, or is asked for here.
 *   pay     → a UPI app (or the QR), then the UTR; or Razorpay when it's on
 *             (skipped when the order is free)
 *   done    → the booking reference; the pass lives at /p/{ref}
 *
 * The rules and server calls are in useTicketCheckout.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const eventSubtitle = (e) => (e
    ? [dayLabel(e), timeRange(e), venueName(e), e.city].filter(isPresent).join(' · ') || undefined
    : undefined);

const TicketSheet = ({ event, open, onClose, startTier = null }) => {
    const t = useT();
    const co = useTicketCheckout(event, { open });
    const profile = useAppStore(s => s.profile);
    const needsEmail = !isPresent(profile?.email);
    const [email, setEmail] = useState('');
    const [emailError, setEmailError] = useState('');
    const [profileOpen, setProfileOpen] = useState(false);
    const [editAll, setEditAll] = useState(false);
    const topRef = useRef(null);
    const seeded = useRef(null);

    useEffect(() => { if (open) { setEmail(''); setEmailError(''); } }, [open, event?.id]);
    useEffect(() => { topRef.current?.scrollIntoView({ block: 'start' }); }, [co.step]);

    // Opened from a ticket type on the event page: start with one of it.
    useEffect(() => {
        if (!open) { seeded.current = null; return; }
        if (!startTier || seeded.current === startTier || !co.availability) return;
        seeded.current = startTier;
        if (!co.cart[startTier] && co.step === 'tickets') co.changeTier(startTier, 1);
    }, [open, startTier, co.availability]); // eslint-disable-line react-hooks/exhaustive-deps

    // Read the profile fresh: CompleteProfileSheet may have just saved it.
    const customer = () => {
        const p = useAppStore.getState().profile || {};
        return { name: (p.name || '').trim(), email: (p.email || email).trim(), phone: p.phone || '' };
    };

    const toPayment = () => co.goToPayment(customer());

    const confirmReview = () => {
        co.setError('');
        if (needsEmail && !EMAIL_RE.test(email.trim())) { setEmailError(t('Enter the email to send your ticket to.')); return; }
        setEmailError('');
        if (!co.agreed) { co.setError(t('Tick the box to agree to the terms.')); return; }
        if (missingFields(useAppStore.getState().profile, requirementsFor('tickets')).length) { setEditAll(false); setProfileOpen(true); }
        else toPayment();
    };

    // Free when what's picked costs nothing (or, before picking, when every ticket type is free).
    const free = co.count ? co.total <= 0 : !co.tiers.some(x => x.price > 0);
    const steps = free
        ? [['tickets', t('Tickets')], ['review', t('Review')]]
        : [['tickets', t('Tickets')], ['review', t('Review')], ['pay', t('Pay')]];

    const Summary = () => (
        co.count ? (
            <div className="min-w-0 flex-1">
                <p className="text-[12px] font-semibold text-gray-500 dark:text-zinc-400">
                    {co.count} {co.count === 1 ? t('ticket') : t('tickets')}{co.people > co.count ? ` · ${t('admits {n}', { n: co.people })}` : ''}
                </p>
                <p className="flex items-baseline gap-2 text-[22px] font-black leading-tight tabular-nums">
                    {free ? t('Free') : rupees(co.total)}
                    {co.discount > 0 && <span className="text-[14px] font-bold text-gray-400 line-through">{rupees(co.subtotal)}</span>}
                </p>
            </div>
        ) : (
            <p className="min-w-0 flex-1 text-[15px] font-semibold text-gray-500 dark:text-zinc-400">
                {co.sale.state !== 'open' ? t('Not on sale') : co.soldOut ? t('Sold out') : t('Pick your tickets')}
            </p>
        )
    );

    const footer = (() => {
        if (co.step === 'tickets') {
            return (
                <div className="space-y-3">
                    <ErrorText>{co.error}</ErrorText>
                    <div className="flex items-center gap-4">
                        <Summary />
                        <Button size="lg" className="shrink-0 px-7" onClick={co.goToReview} disabled={co.sale.state !== 'open' || !co.count}>{t('Continue')}</Button>
                    </div>
                </div>
            );
        }
        if (co.step === 'review') {
            return (
                <div className="space-y-3">
                    <ErrorText>{co.error}</ErrorText>
                    <div className="flex items-center gap-4">
                        <Summary />
                        <Button size="lg" className="shrink-0 px-7" onClick={confirmReview} loading={co.busy} disabled={!co.count}>
                            {free ? t('Get tickets') : t('Continue to pay')}
                        </Button>
                    </div>
                </div>
            );
        }
        if (co.step === 'pay') {
            if (!co.payments.upi) return co.error ? <ErrorText>{co.error}</ErrorText> : null;
            return (
                <div className="space-y-2">
                    <ErrorText>{co.error}</ErrorText>
                    <Button size="lg" className="w-full" onClick={() => co.placeOrder(customer())} loading={co.busy} disabled={!co.utrValid || co.proofBusy || (co.payments.requireProof && !co.proof)}>
                        {t('I’ve paid · Confirm booking')}
                    </Button>
                    <p className="text-center text-[12px] text-gray-500 dark:text-zinc-500">{t('Tap this only after the payment goes through.')}</p>
                </div>
            );
        }
        if (co.step === 'done' && co.result) {
            const confirmed = co.result.status !== 'pending';
            return (
                <div className="flex gap-2">
                    <Button variant="secondary" size="lg" className="flex-1" onClick={onClose}>{t('Done')}</Button>
                    <Button size="lg" className="flex-[2]" icon={Ticket} to={appPath(`/p/${co.result.bookingRef}`)}>
                        {confirmed ? t('Open my pass') : t('Track my ticket')}
                    </Button>
                </div>
            );
        }
        return null;
    })();

    const back = { review: 'tickets', pay: 'review' }[co.step];
    const header = co.step === 'done' ? undefined : (
        <div className="flex min-w-0 items-center gap-2">
            {back && (
                <button
                    type="button"
                    onClick={() => { co.setError(''); co.setStep(back); }}
                    disabled={co.busy}
                    aria-label={t('Back')}
                    className="-ml-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-600 hover:bg-black/[0.05] dark:text-zinc-300 dark:hover:bg-white/[0.08]"
                >
                    <ChevronLeft size={20} />
                </button>
            )}
            <div className="min-w-0 space-y-1.5">
                <h2 className="truncate text-[17px] font-extrabold tracking-tight">{event?.title}</h2>
                <StepDots steps={steps} current={co.step} />
            </div>
        </div>
    );

    return (
        <>
            <Sheet
                open={open}
                onClose={onClose}
                dismissible={!co.busy}
                size="full"
                width="lg"
                title={event?.title}
                subtitle={eventSubtitle(event)}
                header={header}
                footer={footer}
            >
                <div ref={topRef} className="scroll-mt-4" />
                {event && co.step === 'tickets' && <PickTickets event={event} co={co} />}
                {event && co.step === 'review' && (
                    <ReviewOrder
                        event={event}
                        co={co}
                        customer={customer()}
                        needsEmail={needsEmail}
                        email={email}
                        onEmail={(v) => { setEmail(v); setEmailError(''); }}
                        emailError={emailError}
                        onEditProfile={() => { setEditAll(true); setProfileOpen(true); }}
                    />
                )}
                {event && co.step === 'pay' && <PayByUpi co={co} onPayOnline={() => co.payOnline(customer())} />}
                {co.step === 'done' && co.result && <TicketDone result={co.result} event={event} />}
            </Sheet>

            <CompleteProfileSheet
                open={profileOpen}
                required={editAll ? ['name', 'phoneVerified'] : requirementsFor('tickets')}
                editAll={editAll}
                title={editAll ? 'Your details' : 'A few details first'}
                reason={t('for your ticket')}
                onClose={() => setProfileOpen(false)}
                onComplete={() => { setProfileOpen(false); if (!editAll) setTimeout(toPayment, 0); }}
            />
        </>
    );
};

export default TicketSheet;
