import React from 'react';
import { cn } from '../../../lib/utils';
import { accent } from '../theme';
import { inr } from '../ticketing/format';

/*
 * Small, labelled charts for the Finance board, built with plain CSS so they
 * follow light/dark mode and stay readable on a phone. One axis each.
 *
 * Colours used everywhere in finance: money in = teal, money out = rose,
 * still owed = amber.
 */
export const IN_TONE = 'teal';
export const OUT_TONE = 'rose';

/** ₹1.2L / ₹45k / ₹900, for axis labels and tight spaces. */
export const shortInr = (n) => {
    const v = Math.abs(Number(n) || 0);
    const sign = n < 0 ? '−' : '';
    const fmt = (x) => String(Number(x.toFixed(2)));
    if (v >= 1e7) return `${sign}₹${fmt(v / 1e7)}Cr`;
    if (v >= 1e5) return `${sign}₹${fmt(v / 1e5)}L`;
    if (v >= 1e3) return `${sign}₹${fmt(v / 1e3)}k`;
    return `${sign}₹${Math.round(v)}`;
};

// A round number just above the max, so the gridlines land on tidy values.
const niceMax = (max) => {
    if (!(max > 0)) return 1000;
    const pow = 10 ** Math.floor(Math.log10(max));
    const steps = [1, 2, 2.5, 5, 10];
    for (const s of steps) if (s * pow >= max) return s * pow;
    return 10 * pow;
};

export const Legend = ({ items, className }) => (
    <div className={cn('flex flex-wrap items-center gap-x-4 gap-y-1', className)}>
        {items.map(it => (
            <span key={it.label} className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-gray-500 dark:text-zinc-400">
                <span className={cn('h-2.5 w-2.5 rounded-[3px]', accent(it.tone).dot)} />
                {it.label}
            </span>
        ))}
    </div>
);

/**
 * Money in vs money out per month. `months`: [{ key, label, income, out, net }].
 * Tap a month to select it.
 */
export const CashflowBars = ({ months, selected, onSelect }) => {
    const max = niceMax(Math.max(0, ...months.map(m => Math.max(m.income, m.out))));
    const ticks = [max, max / 2, 0];
    return (
        <div className="flex gap-2">
            {/* Axis labels */}
            <div className="flex h-48 shrink-0 flex-col justify-between pb-0 text-right text-[11px] font-semibold tabular-nums text-gray-400 sm:h-56">
                {ticks.map(t => <span key={t} className="-translate-y-1/2 leading-none first:translate-y-0 last:translate-y-0">{shortInr(t)}</span>)}
            </div>
            <div className="min-w-0 flex-1">
                <div className="relative h-48 sm:h-56">
                    {ticks.map((t, i) => (
                        <div key={t} className="absolute inset-x-0 border-t border-dashed border-black/[0.07] dark:border-white/[0.08]" style={{ top: `${(i / (ticks.length - 1)) * 100}%` }} />
                    ))}
                    <div className="absolute inset-0 flex items-end">
                        {months.map(m => {
                            const active = selected === m.key;
                            return (
                                <button
                                    key={m.key}
                                    type="button"
                                    onClick={() => onSelect?.(m.key)}
                                    aria-pressed={active}
                                    aria-label={`${m.label}: in ${inr(m.income)}, out ${inr(m.out)}`}
                                    title={`${m.label}\nIn ${inr(m.income)}\nOut ${inr(m.out)}\nNet ${inr(m.net)}`}
                                    className={cn('group flex h-full flex-1 items-end justify-center gap-1 rounded-xl px-0.5 pt-2 transition-colors sm:gap-1.5',
                                        active ? 'bg-teal-500/[0.07] dark:bg-teal-400/[0.07]' : 'hover:bg-black/[0.03] dark:hover:bg-white/[0.03]')}
                                >
                                    <span className={cn('w-3 rounded-t-md transition-opacity sm:w-5', accent(IN_TONE).dot, !active && 'opacity-80 group-hover:opacity-100')} style={{ height: `${Math.max(m.income > 0 ? 2 : 0, (m.income / max) * 100)}%` }} />
                                    <span className={cn('w-3 rounded-t-md transition-opacity sm:w-5', accent(OUT_TONE).dot, !active && 'opacity-80 group-hover:opacity-100')} style={{ height: `${Math.max(m.out > 0 ? 2 : 0, (m.out / max) * 100)}%` }} />
                                </button>
                            );
                        })}
                    </div>
                </div>
                <div className="mt-2 flex">
                    {months.map(m => (
                        <button key={m.key} type="button" onClick={() => onSelect?.(m.key)} className="min-w-0 flex-1 text-center">
                            <span className={cn('block truncate text-[12px] font-bold', selected === m.key ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-zinc-400')}>{m.short}</span>
                            <span className={cn('block truncate text-[11px] font-semibold tabular-nums',
                                m.net > 0 ? accent('green').text : m.net < 0 ? accent('red').text : 'text-gray-400')}>
                                {m.net === 0 ? '—' : `${m.net > 0 ? '+' : ''}${shortInr(m.net)}`}
                            </span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

/** Horizontal bars for a breakdown. items: [{ label, amount, tone, hint, to? }]. */
export const BreakdownBars = ({ items, total, empty = 'Nothing in this period.' }) => {
    if (!items.length) return <p className="py-6 text-center text-[13px] text-gray-500">{empty}</p>;
    const sum = total ?? items.reduce((a, it) => a + it.amount, 0);
    return (
        <ul className="space-y-3.5">
            {items.map(it => {
                const pct = sum > 0 ? (it.amount / sum) * 100 : 0;
                return (
                    <li key={it.label}>
                        <div className="flex items-baseline justify-between gap-3">
                            <span className="flex min-w-0 items-center gap-2 text-[13px] font-semibold text-gray-800 dark:text-zinc-200">
                                <span className={cn('h-2.5 w-2.5 shrink-0 rounded-[3px]', accent(it.tone).dot)} />
                                <span className="truncate">{it.label}</span>
                                {it.hint && <span className="hidden shrink-0 text-[12px] font-medium text-gray-400 sm:inline">{it.hint}</span>}
                            </span>
                            <span className="shrink-0 text-[13px] font-bold tabular-nums">
                                {inr(it.amount)} <span className="ml-1 text-[12px] font-semibold text-gray-400">{Math.round(pct)}%</span>
                            </span>
                        </div>
                        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-black/[0.05] dark:bg-white/[0.06]">
                            <div className={cn('h-full rounded-full', accent(it.tone).dot)} style={{ width: `${Math.max(pct > 0 ? 1.5 : 0, pct)}%` }} />
                        </div>
                    </li>
                );
            })}
        </ul>
    );
};

/** One stacked bar showing how a total splits (e.g. invoices vs other income). */
export const SplitBar = ({ parts }) => {
    const sum = parts.reduce((a, p) => a + p.amount, 0);
    if (!(sum > 0)) return <div className="h-2.5 rounded-full bg-black/[0.05] dark:bg-white/[0.06]" />;
    return (
        <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full">
            {parts.filter(p => p.amount > 0).map(p => (
                <div key={p.label} className={cn('h-full first:rounded-l-full last:rounded-r-full', accent(p.tone).dot)} style={{ width: `${(p.amount / sum) * 100}%` }} title={`${p.label}: ${inr(p.amount)}`} />
            ))}
        </div>
    );
};
