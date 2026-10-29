import React from 'react';
import Smartphone from 'lucide-react/dist/esm/icons/smartphone';
import CreditCard from 'lucide-react/dist/esm/icons/credit-card';
import Landmark from 'lucide-react/dist/esm/icons/landmark';
import Wallet from 'lucide-react/dist/esm/icons/wallet';
import { cn } from '../lib/utils';

/*
 * One button per way to pay. Each opens Razorpay straight on that method
 * (see razorpayMethodOptions), so the window is short and focused.
 */
const METHODS = [
    ['upi', Smartphone, 'UPI', 'GPay, PhonePe, Paytm'],
    ['card', CreditCard, 'Card', 'Credit & debit'],
    ['netbanking', Landmark, 'Netbanking', 'All major banks'],
    ['wallet', Wallet, 'Wallet', 'Paytm, Mobikwik…'],
];

const PayMethodButtons = ({ onPick, disabled, label = (s) => s, className }) => (
    <div className={cn('grid grid-cols-2 gap-2', className)}>
        {METHODS.map(([key, Icon, name, hint]) => (
            <button
                key={key}
                type="button"
                onClick={() => onPick(key)}
                disabled={disabled}
                className="group flex min-h-[56px] items-center gap-2.5 rounded-2xl border border-black/[0.08] bg-white px-3 py-2.5 text-left transition active:scale-[0.98] hover:border-black/25 disabled:opacity-50 dark:border-white/[0.1] dark:bg-white/[0.05] dark:hover:border-white/30"
            >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-black/[0.05] text-gray-800 transition-colors group-hover:bg-gray-900 group-hover:text-white dark:bg-white/[0.08] dark:text-zinc-100 dark:group-hover:bg-white dark:group-hover:text-black"><Icon size={17} /></span>
                <span className="min-w-0">
                    <span className="block text-[13.5px] font-bold leading-tight text-gray-900 dark:text-white">{label(name)}</span>
                    <span className="block truncate text-[11.5px] text-gray-500 dark:text-zinc-400">{label(hint)}</span>
                </span>
            </button>
        ))}
    </div>
);

export default PayMethodButtons;
