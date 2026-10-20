import React, { useState } from 'react';
import Copy from 'lucide-react/dist/esm/icons/copy';
import Check from 'lucide-react/dist/esm/icons/check';
import Smartphone from 'lucide-react/dist/esm/icons/smartphone';
import CreditCard from 'lucide-react/dist/esm/icons/credit-card';
import HelpCircle from 'lucide-react/dist/esm/icons/circle-help';
import { Button, TextInput } from '../../components/app';
import { copyToClipboard } from '../../lib/clipboard';
import { upiLink } from './useTicketCheckout';
import { PriceLine, rupees } from './ticketParts';

/*
 * Step 2: pay by UPI, then enter the UTR. The amount is the one the server
 * confirmed (ticket-check). On phones the UPI app button comes first; the QR
 * is for paying from another phone.
 */

const WHERE_UTR = [
    ['Google Pay', 'History → tap the payment → UPI transaction ID'],
    ['PhonePe', 'History → tap the payment → UTR number'],
    ['Paytm', 'Balance & History → tap the payment → UPI Ref. No.'],
];

const PayByUpi = ({ co }) => {
    const [copied, setCopied] = useState(false);
    const amount = co.amountDue || co.total;
    const link = upiLink(co.upiId, amount);
    const qr = co.qrCodeUrl || `/api/qr?size=300&text=${encodeURIComponent(link)}`;

    const copy = async () => {
        if (await copyToClipboard(co.upiId)) {
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
        }
    };

    return (
        <div className="space-y-5">
            <div className="rounded-3xl border border-black/[0.06] bg-black/[0.02] px-5 py-4 dark:border-white/[0.08] dark:bg-white/[0.03]">
                <p className="text-[13px] font-semibold text-gray-500 dark:text-zinc-400">Amount to pay</p>
                <p className="font-heading text-[34px] font-black leading-tight tracking-tight tabular-nums">{rupees(amount)}</p>
                <div className="mt-2 space-y-1 border-t border-black/[0.06] pt-2 dark:border-white/[0.08]">
                    {co.lines.map(l => <PriceLine key={l.id} label={`${l.name} × ${l.count}`} value={rupees(l.count * l.price)} />)}
                    {co.discount > 0 && <PriceLine label={co.coupon?.code ? `Coupon ${co.coupon.code}` : 'Coupon'} value={`− ${rupees(co.discount)}`} tone="accent" />}
                </div>
            </div>

            {co.gatewayUrl && (
                <Button href={co.gatewayUrl} target="_blank" rel="noopener noreferrer" variant="secondary" icon={CreditCard} className="w-full">
                    Pay by card or netbanking
                </Button>
            )}

            <div className="space-y-3">
                <Button href={link} size="lg" icon={Smartphone} className="w-full md:hidden">Pay {rupees(amount)} in a UPI app</Button>

                <div className="flex flex-col items-center gap-3 rounded-3xl border border-black/[0.06] px-5 py-5 dark:border-white/[0.08] md:flex-row md:items-center md:gap-5">
                    <div className="shrink-0 rounded-2xl bg-white p-2.5 shadow-sm ring-1 ring-black/[0.06]">
                        <img src={qr} alt={`UPI QR code for ${rupees(amount)}`} className="h-40 w-40 md:h-44 md:w-44" width="176" height="176" />
                    </div>
                    <div className="w-full min-w-0 space-y-2 text-center md:text-left">
                        <p className="text-[14px] text-gray-600 dark:text-zinc-400">
                            <span className="md:hidden">Or scan from another phone, or pay this UPI ID:</span>
                            <span className="hidden md:inline">Scan with any UPI app (GPay, PhonePe, Paytm), or pay this UPI ID:</span>
                        </p>
                        <button
                            type="button"
                            onClick={copy}
                            className="inline-flex h-11 max-w-full items-center gap-2 rounded-xl bg-black/[0.04] px-3 font-mono text-[15px] font-bold dark:bg-white/[0.06]"
                        >
                            <span className="truncate">{co.upiId}</span>
                            {copied ? <Check size={16} className="shrink-0 text-emerald-600 dark:text-neon-green" /> : <Copy size={16} className="shrink-0 text-gray-500" />}
                            <span className="sr-only">{copied ? 'Copied' : 'Copy UPI ID'}</span>
                        </button>
                    </div>
                </div>
            </div>

            <div className="space-y-2">
                <TextInput
                    label="UTR / transaction reference"
                    inputMode="numeric"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    placeholder="12-digit number"
                    value={co.utr}
                    onChange={(e) => { co.setUtr(e.target.value.replace(/\s+/g, '')); co.setError(''); }}
                    inputClassName="font-mono tracking-wider"
                    hint="After paying, copy it from your UPI app and paste it here."
                />
                <details className="group">
                    <summary className="inline-flex h-10 cursor-pointer list-none items-center gap-1.5 text-[13px] font-semibold text-gray-600 dark:text-zinc-400 [&::-webkit-details-marker]:hidden">
                        <HelpCircle size={15} /> Where do I find it?
                    </summary>
                    <ul className="space-y-1.5 rounded-2xl bg-black/[0.03] px-4 py-3 text-[13px] text-gray-600 dark:bg-white/[0.04] dark:text-zinc-400">
                        {WHERE_UTR.map(([app, path]) => (
                            <li key={app}><span className="font-bold text-gray-900 dark:text-white">{app}:</span> {path}</li>
                        ))}
                        <li>It’s always a 12-digit number.</li>
                    </ul>
                </details>
            </div>
        </div>
    );
};

export default PayByUpi;
