import React, { useState } from 'react';
import CircleCheck from 'lucide-react/dist/esm/icons/circle-check';
import Hourglass from 'lucide-react/dist/esm/icons/hourglass';
import Copy from 'lucide-react/dist/esm/icons/copy';
import Check from 'lucide-react/dist/esm/icons/check';
import { Stat, StatRow } from '../../components/app';
import { copyToClipboard } from '../../lib/clipboard';
import { Notice } from '../creator/ui';
import { rupees } from './ticketParts';

/*
 * Step 3: the booking reference. A free (confirmed) order already has its
 * pass at /p/{bookingRef}; a paid one waits for the team to check the UTR,
 * then the pass appears there and is emailed.
 */
const TicketDone = ({ result }) => {
    const [copied, setCopied] = useState(false);
    const confirmed = result.status !== 'pending';
    const Icon = confirmed ? CircleCheck : Hourglass;

    const copy = async () => {
        if (await copyToClipboard(result.bookingRef)) {
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
        }
    };

    return (
        <div className="space-y-5 pt-2">
            <div className="flex flex-col items-center text-center">
                <span className={confirmed
                    ? 'flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:bg-neon-green/10 dark:text-neon-green'
                    : 'flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400'}
                >
                    <Icon size={30} />
                </span>
                <h3 className="mt-3 font-heading text-[26px] font-black tracking-tight">{confirmed ? 'You’re in' : 'Payment sent for checking'}</h3>
                <p className="mt-1 max-w-sm text-[15px] text-gray-600 dark:text-zinc-400">
                    {confirmed
                        ? (result.emailed && result.email ? `Your pass is ready. We’ve also emailed it to ${result.email}.` : 'Your pass is ready. Show its QR code at the entrance.')
                        : `We’ll check your UTR and send your ticket${result.email ? ` to ${result.email}` : ''}. It shows up in the app as soon as it’s confirmed.`}
                </p>
            </div>

            <button
                type="button"
                onClick={copy}
                className="flex w-full items-center justify-between gap-3 rounded-2xl border border-dashed border-black/[0.12] px-4 py-3 text-left dark:border-white/[0.14]"
            >
                <span className="min-w-0">
                    <span className="block text-[12px] font-semibold text-gray-500 dark:text-zinc-500">Booking reference</span>
                    <span className="block truncate font-mono text-[20px] font-black tracking-wider">{result.bookingRef}</span>
                </span>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black/[0.04] text-gray-500 dark:bg-white/[0.06]">
                    {copied ? <Check size={17} className="text-emerald-600 dark:text-neon-green" /> : <Copy size={17} />}
                </span>
                <span className="sr-only">{copied ? 'Copied' : 'Copy booking reference'}</span>
            </button>

            <StatRow>
                <Stat label="Tickets" value={result.count} />
                <Stat label="Type" value={result.tier && result.tier !== 'Standard' ? result.tier : null} tone="accent" />
                <Stat label={confirmed ? 'Paid' : 'Amount'} value={result.total > 0 ? rupees(result.total) : null} />
            </StatRow>

            {result.flagged && (
                <Notice tone="warn">The team will look at this order before confirming it, and will contact you if anything needs sorting out.</Notice>
            )}
        </div>
    );
};

export default TicketDone;
