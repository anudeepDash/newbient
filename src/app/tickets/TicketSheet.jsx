import React, { useEffect, useRef, useState } from 'react';
import { format } from 'date-fns';
import ChevronLeft from 'lucide-react/dist/esm/icons/chevron-left';
import Ticket from 'lucide-react/dist/esm/icons/ticket';
import { AmbientBackdrop, Button, Sheet } from '../../components/app';
import { useAppStore } from '../../lib/store/appStore';
import { isPresent } from '../../lib/present';
import { appPath } from '../host';
import CompleteProfileSheet from '../profile/CompleteProfileSheet';
import { missingFields, requirementsFor } from '../profile/requirements';
import { useTicketCheckout } from './useTicketCheckout';
import PickTickets from './PickTickets';
import PayByUpi from './PayByUpi';
import TicketDone from './TicketDone';
import { ErrorText, rupees } from './ticketParts';

/*
 * Buying tickets for one show, in the app's Sheet (replaces the old
 * EventTicketingModal on /tickets).
 *
 *   pick  → tiers (or the venue map), coupon
 *         → only the missing profile fields (name, verified phone) in
 *           CompleteProfileSheet; the email comes from the account, or is
 *           asked for here when the account has none
 *   pay   → UPI (QR, UPI app link, UPI ID) and the UTR   (skipped when free)
 *   done  → the booking reference; the pass lives at /p/{bookingRef}
 *
 * The rules and server calls are in useTicketCheckout.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const dayLabel = (day) => {
    if (!day) return null;
    const d = new Date(`${day}T00:00:00`);
    return Number.isNaN(d.getTime()) ? null : format(d, 'EEE d MMM');
};

export const eventSubtitle = (e) => (e
    ? [dayLabel(e.day), isPresent(e.time) ? e.time : null, e.venue || e.location, e.city].filter(isPresent).join(' · ') || undefined
    : undefined);

const TicketSheet = ({ event, open, onClose }) => {
    const co = useTicketCheckout(event, { open });
    const profile = useAppStore(s => s.profile);
    const needsEmail = !isPresent(profile?.email);
    const [email, setEmail] = useState('');
    const [emailError, setEmailError] = useState('');
    const [profileOpen, setProfileOpen] = useState(false);
    const topRef = useRef(null);

    useEffect(() => { if (open) { setEmail(''); setEmailError(''); } }, [open, event?.id]);
    useEffect(() => { topRef.current?.scrollIntoView({ block: 'start' }); }, [co.step]);

    // Read the profile fresh: CompleteProfileSheet may have just saved it.
    const customer = () => {
        const p = useAppStore.getState().profile || {};
        return { name: (p.name || '').trim(), email: (p.email || email).trim(), phone: p.phone || '' };
    };

    const proceed = () => (co.total > 0 ? co.goToPayment() : co.placeOrder(customer()));

    const next = () => {
        co.setError('');
        if (!co.count) { co.setError('Pick at least one ticket.'); return; }
        if (needsEmail && !EMAIL_RE.test(email.trim())) { setEmailError('Enter the email to send your ticket to.'); return; }
        setEmailError('');
        if (missingFields(useAppStore.getState().profile, requirementsFor('tickets')).length) setProfileOpen(true);
        else proceed();
    };

    const free = co.total <= 0;
    const footer = (() => {
        if (co.step === 'pick') {
            return (
                <div className="space-y-3">
                    <ErrorText>{co.error}</ErrorText>
                    <div className="flex items-center gap-4">
                        {co.count ? (
                            <div className="min-w-0 flex-1">
                                <p className="text-[12px] font-semibold text-gray-500 dark:text-zinc-400">{co.count} {co.count === 1 ? 'ticket' : 'tickets'}</p>
                                <p className="flex items-baseline gap-2 text-[22px] font-black leading-tight tabular-nums">
                                    {free ? 'Free' : rupees(co.total)}
                                    {co.discount > 0 && <span className="text-[14px] font-bold text-gray-400 line-through">{rupees(co.subtotal)}</span>}
                                </p>
                            </div>
                        ) : (
                            <p className="min-w-0 flex-1 text-[15px] font-semibold text-gray-500 dark:text-zinc-400">{co.soldOut ? 'Sold out' : 'Pick your tickets'}</p>
                        )}
                        <Button size="lg" className="shrink-0 px-7" onClick={next} loading={co.busy} disabled={co.soldOut || !co.count}>
                            {free && co.count ? 'Get tickets' : 'Continue'}
                        </Button>
                    </div>
                </div>
            );
        }
        if (co.step === 'pay') {
            return (
                <div className="space-y-2">
                    <ErrorText>{co.error}</ErrorText>
                    <Button size="lg" className="w-full" onClick={() => co.placeOrder(customer())} loading={co.busy} disabled={!co.utr.trim()}>
                        I’ve paid · Confirm
                    </Button>
                    <p className="text-center text-[12px] text-gray-500 dark:text-zinc-500">Tap this only after the payment goes through.</p>
                </div>
            );
        }
        if (co.step === 'done' && co.result) {
            const confirmed = co.result.status !== 'pending';
            return (
                <div className="flex gap-2">
                    <Button variant="secondary" size="lg" className="flex-1" onClick={onClose}>Done</Button>
                    <Button size="lg" className="flex-[2]" icon={Ticket} to={appPath(`/p/${co.result.bookingRef}`)}>
                        {confirmed ? 'Open my pass' : 'Track my ticket'}
                    </Button>
                </div>
            );
        }
        return null;
    })();

    const header = co.step === 'pay' ? (
        <div className="flex items-center gap-2">
            <button
                type="button"
                onClick={() => { co.setError(''); co.setStep('pick'); }}
                disabled={co.busy}
                aria-label="Back to tickets"
                className="-ml-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-600 hover:bg-black/[0.05] dark:text-zinc-300 dark:hover:bg-white/[0.08]"
            >
                <ChevronLeft size={20} />
            </button>
            <div className="min-w-0">
                <h2 className="text-lg font-extrabold tracking-tight">Pay by UPI</h2>
                <p className="mt-0.5 truncate text-[13px] text-gray-500 dark:text-zinc-400">{event?.title}</p>
            </div>
        </div>
    ) : undefined;

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
                backdrop={co.step === 'pick' ? <AmbientBackdrop image={event?.image || event?.poster} className="bottom-auto h-[360px]" intensity={0.35} /> : undefined}
            >
                <div ref={topRef} className="scroll-mt-4" />
                {event && co.step === 'pick' && (
                    <PickTickets event={event} co={co} needsEmail={needsEmail} email={email} onEmail={(v) => { setEmail(v); setEmailError(''); }} emailError={emailError} />
                )}
                {event && co.step === 'pay' && <PayByUpi co={co} />}
                {co.step === 'done' && co.result && <TicketDone result={co.result} />}
            </Sheet>

            <CompleteProfileSheet
                open={profileOpen}
                required={requirementsFor('tickets')}
                reason="for your ticket"
                onClose={() => setProfileOpen(false)}
                onComplete={() => setTimeout(proceed, 0)}
            />
        </>
    );
};

export default TicketSheet;
