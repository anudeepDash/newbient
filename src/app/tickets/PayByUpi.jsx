import React, { useEffect, useMemo, useState } from 'react';
import Copy from 'lucide-react/dist/esm/icons/copy';
import Check from 'lucide-react/dist/esm/icons/check';
import CircleCheck from 'lucide-react/dist/esm/icons/circle-check';
import CreditCard from 'lucide-react/dist/esm/icons/credit-card';
import Smartphone from 'lucide-react/dist/esm/icons/smartphone';
import QrCode from 'lucide-react/dist/esm/icons/qr-code';
import HelpCircle from 'lucide-react/dist/esm/icons/circle-help';
import ImagePlus from 'lucide-react/dist/esm/icons/image-plus';
import X from 'lucide-react/dist/esm/icons/x';
import ShieldCheck from 'lucide-react/dist/esm/icons/shield-check';
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down';
import { Button, TextInput } from '../../components/app';
import { copyToClipboard } from '../../lib/clipboard';
import { cn } from '../../lib/utils';
import { UPI_APPS, upiLink } from '../../lib/ticketing';
import { Notice } from '../creator/ui';
import { useT } from '../../i18n';
import { platform } from './eventDetails';
import { rupees } from './ticketParts';

/*
 * Booking step 3, paying. The amount is the one the server confirmed
 * (ticket-check), and the UPI note carries the booking reference so the team
 * can find the payment in the bank statement.
 *
 *   Phones   a button per UPI app (Google Pay, PhonePe, Paytm, BHIM, CRED);
 *            on Android also "any UPI app", which opens the phone's own list.
 *            The QR is there for paying from another phone.
 *   Desktop  the QR first (scan with your phone), and the UPI ID.
 *   Then     the 12-digit UTR from the app (and a screenshot, optional). The
 *            order goes to the team to verify; the ticket follows.
 *   Razorpay a "Card, netbanking or UPI" option when the event has it on.
 */

// App tiles: the name on a colour that reads as the app (no logos).
const APP_TILE = {
    gpay: 'bg-white text-[#1a73e8] ring-1 ring-black/10',
    phonepe: 'bg-[#5f259f] text-white',
    paytm: 'bg-[#00baf2] text-white',
    bhim: 'bg-[#f47b20] text-white',
    cred: 'bg-[#121212] text-white ring-1 ring-white/10',
};
const APP_INITIAL = { gpay: 'G', phonepe: 'पे', paytm: 'P', bhim: 'B', cred: 'C' };

const WHERE_UTR = [
    ['Google Pay', 'Tap the payment in your history → “UPI transaction ID”'],
    ['PhonePe', 'History → the payment → “UTR”'],
    ['Paytm', 'Balance & History → the payment → “UPI Ref. No.”'],
    ['BHIM / bank apps', 'Transactions → the payment → “UPI Ref No / RRN”'],
];

const CopyRow = ({ label, value, mono = true }) => {
    const t = useT();
    const [copied, setCopied] = useState(false);
    const copy = async () => {
        if (await copyToClipboard(value)) { setCopied(true); setTimeout(() => setCopied(false), 1800); }
    };
    return (
        <button type="button" onClick={copy} className="flex min-h-[48px] w-full items-center justify-between gap-3 rounded-2xl bg-black/[0.035] px-4 py-2 text-left dark:bg-white/[0.05]">
            <span className="min-w-0">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-500">{label}</span>
                <span className={cn('block truncate text-[15px] font-bold', mono && 'font-mono')}>{value}</span>
            </span>
            <span className="flex shrink-0 items-center gap-1 text-[12px] font-bold text-gray-500">
                {copied ? <><Check size={15} className="text-emerald-600 dark:text-neon-green" /> {t('Copied')}</> : <><Copy size={15} /> {t('Copy')}</>}
            </span>
        </button>
    );
};

const PayByUpi = ({ co, onPayOnline }) => {
    const t = useT();
    const device = useMemo(platform, []);
    const phone = device !== 'desktop';
    const amount = co.amountDue || co.total;
    const ref = co.bookingRef;
    const opts = { upiId: co.upi.upiId, payeeName: co.upi.payeeName, amount, ref, merchant: co.upi.merchant };
    const anyApp = co.upi.upiId ? upiLink(opts) : '';
    const qr = co.upi.upiId ? `/api/qr?size=320&margin=1&text=${encodeURIComponent(anyApp)}` : co.upi.qrCodeUrl;
    const [method, setMethod] = useState(co.payments.upi ? 'upi' : 'gateway');
    const [showQr, setShowQr] = useState(!phone);
    const [showHelp, setShowHelp] = useState(false);

    // Coming back from the UPI app: bring the UTR box into view.
    useEffect(() => {
        if (!co.launched) return undefined;
        const onShow = () => {
            if (document.visibilityState === 'visible') setTimeout(() => document.getElementById('utr-box')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 250);
        };
        document.addEventListener('visibilitychange', onShow);
        return () => document.removeEventListener('visibilitychange', onShow);
    }, [co.launched]);

    const launch = () => co.setLaunched(true);

    if (!co.upi.upiId && !co.upi.qrCodeUrl && !co.payments.gateway) {
        return <Notice tone="error" title={t('Payments aren’t set up for this show yet')}>{t('Please try again later, or contact us on WhatsApp.')}</Notice>;
    }

    return (
        <div className="space-y-5">
            <section className="rounded-3xl border border-black/[0.07] bg-white/70 px-5 py-4 dark:border-white/[0.08] dark:bg-white/[0.04]">
                <p className="text-[13px] font-semibold text-gray-500 dark:text-zinc-400">{t('Amount to pay')}</p>
                <p className="font-heading text-[36px] font-black leading-tight tracking-tight tabular-nums">{rupees(amount)}</p>
                <p className="mt-1 text-[13px] text-gray-600 dark:text-zinc-400">
                    {t('Pay exactly this amount.')} {ref && <>{t('Booking')} <span className="font-mono font-bold text-gray-900 dark:text-white">{ref}</span></>}
                </p>
            </section>

            {co.payments.gateway && co.payments.upi && (
                <div role="tablist" aria-label={t('How to pay')} className="grid grid-cols-2 gap-1 rounded-2xl bg-black/[0.04] p-1 dark:bg-white/[0.06]">
                    {[['upi', t('UPI app'), Smartphone], ['gateway', t('Card · netbanking'), CreditCard]].map(([key, label, Icon]) => (
                        <button key={key} type="button" role="tab" aria-selected={method === key} onClick={() => setMethod(key)}
                            className={cn('flex h-11 items-center justify-center gap-2 rounded-xl text-[14px] font-bold transition-colors',
                                method === key ? 'bg-white text-gray-900 shadow-sm dark:bg-white/[0.12] dark:text-white' : 'text-gray-500 dark:text-zinc-400')}>
                            <Icon size={16} /> {label}
                        </button>
                    ))}
                </div>
            )}

            {method === 'gateway' ? (
                <section className="space-y-3">
                    <p className="text-[14px] text-gray-600 dark:text-zinc-400">{t('Pay by card, netbanking or UPI in Razorpay’s secure checkout. Your ticket is confirmed straight away.')}</p>
                    <Button size="lg" icon={CreditCard} className="w-full" onClick={onPayOnline} loading={co.busy}>{t('Pay {amount}', { amount: rupees(amount) })}</Button>
                    <p className="flex items-center gap-1.5 text-[12px] text-gray-500"><ShieldCheck size={13} /> {t('Card details go to Razorpay, never to Newbi.')}</p>
                </section>
            ) : (
                <>
                    {phone && co.upi.upiId && (
                        <section className="space-y-2.5">
                            <h3 className="text-[14px] font-extrabold">{t('Pay with')}</h3>
                            {device === 'android' && (
                                <Button href={anyApp} size="lg" icon={Smartphone} className="w-full" onClick={launch}>{t('Any UPI app')}</Button>
                            )}
                            <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                                {UPI_APPS.filter(a => !(device === 'android' && a.id === 'bhim')).map(app => (
                                    <a key={app.id} href={upiLink(opts, { appId: app.id, platform: device })} onClick={launch}
                                        className="flex min-h-[84px] flex-col items-center justify-center gap-1.5 rounded-2xl border border-black/[0.07] bg-white/70 px-1 py-3 text-center transition-colors active:scale-[0.98] dark:border-white/[0.08] dark:bg-white/[0.04]">
                                        <span className={cn('flex h-9 w-9 items-center justify-center rounded-xl text-[15px] font-black', APP_TILE[app.id])} aria-hidden="true">{APP_INITIAL[app.id]}</span>
                                        <span className="text-[11.5px] font-bold leading-tight">{app.name}</span>
                                    </a>
                                ))}
                            </div>
                            <p className="text-[12px] text-gray-500 dark:text-zinc-500">{t('Your UPI app opens with the amount filled in. Pay, then come back here.')}</p>
                        </section>
                    )}

                    <section className="space-y-3">
                        {phone && (
                            <button type="button" onClick={() => setShowQr(v => !v)} className="flex h-11 items-center gap-2 text-[14px] font-bold text-gray-700 dark:text-zinc-300">
                                <QrCode size={17} /> {t('Pay from another phone (QR)')} <ChevronDown size={16} className={cn('transition-transform', showQr && 'rotate-180')} />
                            </button>
                        )}
                        {showQr && qr && (
                            <div className="flex flex-col items-center gap-3 rounded-3xl border border-black/[0.07] px-5 py-5 dark:border-white/[0.08] sm:flex-row sm:gap-5">
                                <div className="shrink-0 rounded-2xl bg-white p-2.5 shadow-sm ring-1 ring-black/[0.06]">
                                    <img src={qr} alt={t('UPI QR code for {amount}', { amount: rupees(amount) })} className="h-48 w-48" width="192" height="192" />
                                </div>
                                <div className="space-y-1.5 text-center sm:text-left">
                                    <p className="text-[15px] font-bold">{t('Scan with any UPI app')}</p>
                                    <p className="text-[13px] text-gray-600 dark:text-zinc-400">{co.upi.upiId ? t('Google Pay, PhonePe, Paytm or your bank’s app. The amount fills in by itself.') : t('Enter {amount} when your app asks.', { amount: rupees(amount) })}</p>
                                </div>
                            </div>
                        )}
                        {co.upi.upiId && (
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                <CopyRow label={t('Or pay to UPI ID')} value={co.upi.upiId} />
                                {ref && <CopyRow label={t('Add this note')} value={ref} />}
                            </div>
                        )}
                    </section>

                    <section id="utr-box" className={cn('scroll-mt-24 space-y-3 rounded-3xl border p-4 transition-colors',
                        co.launched ? 'border-emerald-500/40 bg-emerald-500/[0.04] dark:border-neon-green/30 dark:bg-neon-green/[0.04]' : 'border-black/[0.07] dark:border-white/[0.08]')}>
                        <div>
                            <h3 className="text-[15px] font-extrabold">{co.launched ? t('Paid? Enter the UTR') : t('After paying, enter the UTR')}</h3>
                            <p className="mt-0.5 text-[13px] text-gray-600 dark:text-zinc-400">{t('The 12-digit reference your UPI app shows for the payment.')}</p>
                        </div>
                        <TextInput
                            label={t('UTR / UPI reference')}
                            inputMode="numeric"
                            autoComplete="off"
                            autoCorrect="off"
                            spellCheck={false}
                            placeholder="e.g. 431256789012"
                            value={co.utr}
                            onChange={(e) => co.setUtr(e.target.value)}
                            inputClassName="font-mono text-[18px] tracking-[0.12em]"
                            hint={co.utr && !co.utrValid ? t('{n} of 12 digits', { n: co.utr.replace(/\D/g, '').length }) : undefined}
                        />
                        {co.utrValid && <p className="flex items-center gap-1.5 text-[13px] font-bold text-emerald-700 dark:text-neon-green"><CircleCheck size={15} /> {t('Looks right')}</p>}

                        <div className="flex flex-wrap items-center gap-2">
                            {co.proof ? (
                                <span className="inline-flex items-center gap-2 rounded-2xl bg-black/[0.04] py-1.5 pl-1.5 pr-2 dark:bg-white/[0.06]">
                                    <img src={co.proof} alt={t('Payment screenshot')} className="h-10 w-10 rounded-xl object-cover" />
                                    <span className="text-[13px] font-semibold">{t('Screenshot added')}</span>
                                    <button type="button" onClick={() => co.setProof('')} aria-label={t('Remove screenshot')} className="flex h-9 w-9 items-center justify-center rounded-full text-gray-500 hover:bg-black/[0.05]"><X size={15} /></button>
                                </span>
                            ) : (
                                <label className={cn('inline-flex h-11 cursor-pointer items-center gap-2 rounded-2xl border border-dashed border-black/15 px-3 text-[13px] font-bold text-gray-700 dark:border-white/20 dark:text-zinc-300', co.proofBusy && 'opacity-60')}>
                                    <ImagePlus size={16} /> {co.proofBusy ? t('Uploading…') : co.payments.requireProof ? t('Add payment screenshot') : t('Add payment screenshot (optional)')}
                                    <input type="file" accept="image/*" className="sr-only" disabled={co.proofBusy} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; co.attachProof(f); }} />
                                </label>
                            )}
                            <button type="button" onClick={() => setShowHelp(v => !v)} className="inline-flex h-11 items-center gap-1.5 px-1 text-[13px] font-semibold text-gray-600 dark:text-zinc-400">
                                <HelpCircle size={15} /> {t('Where do I find it?')}
                            </button>
                        </div>
                        {showHelp && (
                            <ul className="space-y-1.5 rounded-2xl bg-black/[0.03] px-4 py-3 text-[13px] text-gray-600 dark:bg-white/[0.04] dark:text-zinc-400">
                                {WHERE_UTR.map(([app, path]) => <li key={app}><span className="font-bold text-gray-900 dark:text-white">{app}:</span> {t(path)}</li>)}
                                <li>{t('It’s always 12 digits. Some apps call it the RRN.')}</li>
                            </ul>
                        )}
                    </section>

                    <p className="text-[12px] leading-relaxed text-gray-500 dark:text-zinc-500">
                        {t('After you confirm, the team checks your payment and your ticket follows in the app, by email and on WhatsApp. Don’t pay twice: if something looks wrong, message us with your booking reference.')}
                    </p>
                </>
            )}
        </div>
    );
};

export default PayByUpi;
