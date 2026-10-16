import React from 'react';
import Minus from 'lucide-react/dist/esm/icons/minus';
import Plus from 'lucide-react/dist/esm/icons/plus';
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down';
import { cn } from '../../lib/utils';
import { isPresent } from '../../lib/present';

/* Small pieces shared by the ticket sheet's steps. Each renders nothing when empty. */

/* ₹1,499 (no decimals unless the price has paise). */
export const rupees = (n) => {
    const v = Number(n) || 0;
    return `₹${v.toLocaleString('en-IN', { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
};

/* − 2 + with 44px targets. */
export const Stepper = ({ value, onMinus, onPlus, minusDisabled, plusDisabled, label, size = 'md' }) => {
    const btn = size === 'lg' ? 'h-12 w-12' : 'h-11 w-11';
    return (
        <div className="flex shrink-0 items-center gap-1 rounded-2xl border border-black/[0.08] bg-black/[0.02] p-1 dark:border-white/[0.1] dark:bg-white/[0.04]">
            <button
                type="button"
                onClick={onMinus}
                disabled={minusDisabled}
                aria-label={label ? `One less ${label}` : 'One less'}
                className={cn(btn, 'flex items-center justify-center rounded-xl text-gray-700 transition-colors hover:bg-black/[0.05] disabled:opacity-30 dark:text-zinc-300 dark:hover:bg-white/[0.08]')}
            >
                <Minus size={18} />
            </button>
            <span className={cn('min-w-[2ch] text-center font-black tabular-nums', size === 'lg' ? 'text-[22px]' : 'text-[17px]')} aria-live="polite">{value}</span>
            <button
                type="button"
                onClick={onPlus}
                disabled={plusDisabled}
                aria-label={label ? `One more ${label}` : 'One more'}
                className={cn(btn, 'flex items-center justify-center rounded-xl bg-gray-900 text-white transition-colors hover:bg-gray-800 disabled:opacity-30 dark:bg-neon-green dark:text-black dark:hover:bg-neon-green/90')}
            >
                <Plus size={18} />
            </button>
        </div>
    );
};

/* A collapsible block of plain text (ticket info, rules). */
export const Collapsible = ({ title, icon: Icon, text }) => {
    if (!isPresent(text)) return null;
    return (
        <details className="group rounded-2xl border border-black/[0.06] dark:border-white/[0.08]">
            <summary className="flex min-h-[48px] cursor-pointer list-none items-center gap-3 px-4 py-2 [&::-webkit-details-marker]:hidden">
                {Icon && <Icon size={16} className="shrink-0 text-gray-500 dark:text-zinc-400" />}
                <span className="min-w-0 flex-1 text-[15px] font-bold">{title}</span>
                <ChevronDown size={18} className="shrink-0 text-gray-400 transition-transform group-open:rotate-180" />
            </summary>
            <p className="whitespace-pre-line px-4 pb-4 text-[14px] leading-relaxed text-gray-600 dark:text-zinc-400">{text}</p>
        </details>
    );
};

/* "Silver × 2 ……… ₹1,000" */
export const PriceLine = ({ label, value, tone, className }) => {
    if (!isPresent(label)) return null;
    return (
        <div className={cn('flex items-baseline justify-between gap-3 text-[14px]', className)}>
            <span className="min-w-0 truncate text-gray-600 dark:text-zinc-400">{label}</span>
            <span className={cn('shrink-0 font-bold tabular-nums', tone === 'accent' ? 'text-emerald-600 dark:text-neon-green' : 'text-gray-900 dark:text-white')}>{value}</span>
        </div>
    );
};

export const ErrorText = ({ children, className }) => (isPresent(children)
    ? <p role="alert" className={cn('text-[14px] font-medium text-red-600 dark:text-red-400', className)}>{children}</p>
    : null);
