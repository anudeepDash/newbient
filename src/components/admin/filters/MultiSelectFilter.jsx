import React, { useMemo, useState } from 'react';
import Check from 'lucide-react/dist/esm/icons/check';
import Search from 'lucide-react/dist/esm/icons/search';
import { cn } from '../../../lib/utils';
import { useAccent } from '../theme';
import FilterPopover from './FilterPopover';

/*
 * Pick several values (e.g. cities). Ticking applies straight away.
 * options: [{ value, label, count? }]; value: string[]; onChange(string[]).
 */
const MultiSelectFilter = ({ label, allLabel = 'All', options, value = [], onChange, noun = 'item', nounPlural, className, searchPlaceholder }) => {
    const many = nounPlural || `${noun}s`;
    const a = useAccent();
    const [q, setQ] = useState('');
    const selected = useMemo(() => new Set(value), [value]);

    const shown = useMemo(() => {
        const s = q.trim().toLowerCase();
        const list = s ? options.filter(o => o.label.toLowerCase().includes(s)) : options;
        // Ticked first, then by how many creators, then A–Z.
        return [...list].sort((x, y) => Number(selected.has(y.value)) - Number(selected.has(x.value)) || (y.count || 0) - (x.count || 0) || x.label.localeCompare(y.label));
    }, [options, q, selected]);

    const toggle = (v) => {
        const next = new Set(selected);
        if (next.has(v)) next.delete(v); else next.add(v);
        onChange([...next]);
    };

    const names = options.filter(o => selected.has(o.value)).map(o => o.label);
    const summary = !names.length ? allLabel : names.length === 1 ? names[0] : `${names[0]} +${names.length - 1}`;

    return (
        <FilterPopover
            label={label}
            title={label}
            summary={summary}
            active={names.length > 0}
            onClear={() => onChange([])}
            className={className}
            footer={({ close }) => (
                <div className="flex items-center gap-2">
                    <button type="button" onClick={() => onChange([])} disabled={!names.length} className="h-10 rounded-xl px-3 text-[13px] font-semibold text-gray-500 disabled:opacity-40">Clear</button>
                    <span className="flex-1 text-[12px] text-gray-500">{names.length ? `${names.length} ${names.length === 1 ? noun : many} picked` : `Showing all ${many}`}</span>
                    <button type="button" onClick={close} className="h-10 rounded-xl bg-gray-900 px-4 text-[13px] font-semibold text-white dark:bg-white dark:text-black">Done</button>
                </div>
            )}
        >
            <div className="space-y-2">
                {options.length > 7 && (
                    <label className="relative flex items-center">
                        <Search size={15} className="pointer-events-none absolute left-3 text-gray-400" />
                        <input
                            type="search"
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder={searchPlaceholder || `Search ${many}`}
                            className="nb-glass-well h-10 w-full rounded-xl pl-9 pr-3 text-[14px] outline-none focus:border-emerald-500/60 dark:focus:border-neon-green/40"
                        />
                    </label>
                )}
                <ul className="space-y-0.5" role="listbox" aria-multiselectable="true" aria-label={label}>
                    {shown.map(o => {
                        const on = selected.has(o.value);
                        return (
                            <li key={o.value}>
                                <button
                                    type="button"
                                    role="option"
                                    aria-selected={on}
                                    onClick={() => toggle(o.value)}
                                    className={cn('nb-glass-option flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-[14px]',
                                        on && cn(a.soft, 'font-semibold'))}
                                >
                                    <span className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors',
                                        on ? cn(a.solid, 'border-transparent') : 'border-gray-300 dark:border-white/25')}>
                                        {on && <Check size={13} strokeWidth={3} />}
                                    </span>
                                    <span className="min-w-0 flex-1 truncate">{o.label}</span>
                                    {o.count !== undefined && <span className="shrink-0 text-[12px] tabular-nums text-gray-400">{o.count.toLocaleString('en-IN')}</span>}
                                </button>
                            </li>
                        );
                    })}
                    {!shown.length && <li className="px-3 py-4 text-center text-[13px] text-gray-500">No {many} match “{q}”.</li>}
                </ul>
            </div>
        </FilterPopover>
    );
};

export default MultiSelectFilter;
