import React from 'react';
import CreditCard from 'lucide-react/dist/esm/icons/credit-card';
import ShieldCheck from 'lucide-react/dist/esm/icons/shield-check';
import { Button } from '../../components/app';
import { Notice } from '../creator/ui';
import { useT } from '../../i18n';
import { rupees } from './ticketParts';

/*
 * Booking step 3, paying. Razorpay is the only way to pay: card, netbanking,
 * UPI and wallets all happen inside its checkout, and the order confirms
 * itself (checkout calls ticket-gateway-confirm, and Razorpay's webhook is
 * the backstop). The amount is the one the server confirmed (ticket-check).
 */
const PayOnline = ({ co, onPayOnline }) => {
    const t = useT();
    const amount = co.amountDue || co.total;

    if (co.availability && !co.payments.gateway) {
        return <Notice tone="error" title={t('Payments aren’t set up for this show yet')}>{t('Please try again later, or contact us on WhatsApp.')}</Notice>;
    }

    return (
        <div className="space-y-5">
            <section className="rounded-3xl border border-black/[0.07] bg-white/70 px-5 py-4 dark:border-white/[0.08] dark:bg-white/[0.04]">
                <p className="text-[13px] font-semibold text-gray-500 dark:text-zinc-400">{t('Amount to pay')}</p>
                <p className="font-heading text-[36px] font-black leading-tight tracking-tight tabular-nums">{rupees(amount)}</p>
                {co.bookingRef && (
                    <p className="mt-1 text-[13px] text-gray-600 dark:text-zinc-400">
                        {t('Booking')} <span className="font-mono font-bold text-gray-900 dark:text-white">{co.bookingRef}</span>
                    </p>
                )}
            </section>

            <section className="space-y-3">
                <p className="text-[14px] text-gray-600 dark:text-zinc-400">{t('Pay by UPI, card or netbanking in Razorpay’s secure checkout. Your ticket is confirmed straight away.')}</p>
                <Button size="lg" icon={CreditCard} className="w-full" onClick={onPayOnline} loading={co.busy}>{t('Pay {amount}', { amount: rupees(amount) })}</Button>
                <p className="flex items-center gap-1.5 text-[12px] text-gray-500"><ShieldCheck size={13} /> {t('Payment details go to Razorpay, never to Newbi.')}</p>
            </section>
        </div>
    );
};

export default PayOnline;
