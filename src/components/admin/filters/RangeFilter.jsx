import React, { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '../../../lib/utils';
import { useAccent } from '../theme';
import FilterPopover from './FilterPopover';

/*
 * Number range filter (follower counts): a two-handle slider on a stretched
 * scale (so 1K vs 5K is as easy to pick as 100K vs 500K), Min/Max boxes that
 * accept "10k", "1.5m", "2L", and quick presets. Changes are previewed with a
 * live count and applied with the footer button.
 *
 * value: { min: number|null, max: number|null }; onChange(same shape).
 * countFor(min, max) → how many results that range would show.
 */

const STOPS = [0, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000, 250000, 500000, 1000000];
const TOP = STOPS.length - 1; // the last position means "and above" (no upper limit)

const lg = (v) => Math.log10(v + 1);
const toPos = (v) => {
    if (v === null || v === undefined) return null;
    if (v <= 0) return 0;
    if (v >= STOPS[TOP]) return TOP;
    let i = 0;
    while (v > STOPS[i + 1]) i++;
    return i + (lg(v) - lg(STOPS[i])) / (lg(STOPS[i + 1]) - lg(STOPS[i]));
};
const nice = (v) => {
    if (v < 100) return Math.round(v / 10) * 10;
    const p = 10 ** Math.floor(Math.log10(v) - 1);
    return Math.round(v / p) * p; // two significant digits
};
const fromPos = (t) => {
    if (t <= 0) return 0;
    if (t >= TOP) return STOPS[TOP];
    const i = Math.floor(t);
    const f = t - i;
    return nice(10 ** (lg(STOPS[i]) + f * (lg(STOPS[i + 1]) - lg(STOPS[i]))) - 1);
};

export const formatCount = (n) => {
    if (n === null || n === undefined) return '';
    if (n >= 1e6) return `${+(n / 1e6).toFixed(n % 1e6 ? 1 : 0)}M`;
    if (n >= 1e3) return `${+(n / 1e3).toFixed(n % 1e3 && n < 1e5 ? 1 : 0)}K`;
    return String(n);
};

/** "10k" → 10000, "1.5m" → 1500000, "2L"/"2 lakh" → 200000, "1,20,000" → 120000. */
export const parseCount = (text) => {
    const s = String(text || '').trim().toLowerCase().replace(/,/g, '').replace(/\s+/g, '');
    if (!s) return null;
    const m = s.match(/^(\d+(?:\.\d+)?)(k|m|l|lakh|lac|cr|crore)?$/);
    if (!m) return NaN;
    const mult = { k: 1e3, m: 1e6, l: 1e5, lakh: 1e5, lac: 1e5, cr: 1e7, crore: 1e7 }[m[2]] || 1;
    return Math.round(parseFloat(m[1]) * mult);
};

const PRESETS = [
    { label: 'Under 1K', min: null, max: 1000 },
    { label: '1K–10K', min: 1000, max: 10000 },
    { label: '10K–50K', min: 10000, max: 50000 },
    { label: '50K–100K', min: 50000, max: 100000 },
    { label: '100K–500K', min: 100000, max: 500000 },
    { label: '500K+', min: 500000, max: null },
];

export const rangeSummary = ({ min, max }, any = 'Any followers') => {
    if (!min && !max) return any;
    if (min && max) return `${formatCount(min)}–${formatCount(max)}`;
    if (min) return `${formatCount(min)}+`;
    return `Under ${formatCount(max)}`;
};

const DualSlider = ({ lo, hi, onChange, label }) => {
    const a = useAccent();
    const trackRef = useRef(null);
    const drag = useRef(null);

    const posFromEvent = (e) => {
        const r = trackRef.current.getBoundingClientRect();
        const x = Math.min(Math.max(0, e.clientX - r.left), r.width);
        return (x / r.width) * TOP;
    };
    const set = (which, t) => {
        const step = Math.round(t * 20) / 20; // smooth but not jittery
        if (which === 'lo') onChange(Math.min(step, hi), hi);
        else onChange(lo, Math.max(step, lo));
    };
    const down = (e) => {
        const t = posFromEvent(e);
        const which = Math.abs(t - lo) <= Math.abs(t - hi) ? (t > hi ? 'hi' : 'lo') : 'hi';
        drag.current = which;
        e.currentTarget.setPointerCapture?.(e.pointerId);
        set(which, t);
    };
    const move = (e) => { if (drag.current) set(drag.current, posFromEvent(e)); };
    const up = () => { drag.current = null; };

    const key = (which) => (e) => {
        const delta = { ArrowLeft: -0.25, ArrowDown: -0.25, ArrowRight: 0.25, ArrowUp: 0.25, PageDown: -1, PageUp: 1 }[e.key];
        if (e.key === 'Home') { e.preventDefault(); set(which, 0); return; }
        if (e.key === 'End') { e.preventDefault(); set(which, TOP); return; }
        if (delta === undefined) return;
        e.preventDefault();
        set(which, Math.min(TOP, Math.max(0, (which === 'lo' ? lo : hi) + delta)));
    };

    const pct = (t) => `${(t / TOP) * 100}%`;
    const thumb = (which, t) => (
        <span
            role="slider"
            tabIndex={0}
            aria-label={`${which === 'lo' ? 'Minimum' : 'Maximum'} ${label}`}
            aria-valuemin={0}
            aria-valuemax={STOPS[TOP]}
            aria-valuenow={fromPos(t)}
            aria-valuetext={which === 'hi' && t >= TOP ? 'No maximum' : formatCount(fromPos(t))}
            onKeyDown={key(which)}
            className={cn('absolute top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-full border-[3px] border-white bg-white shadow-md outline-none ring-1 ring-black/10 focus-visible:ring-4 active:cursor-grabbing dark:border-[#14161d]', 'focus-visible:ring-emerald-500/40')}
            style={{ left: pct(t) }}
        >
            <span className={cn('absolute inset-1 rounded-full', a.solid)} />
        </span>
    );

    return (
        <div
            ref={trackRef}
            onPointerDown={down}
            onPointerMove={move}
            onPointerUp={up}
            onPointerCancel={up}
            className="relative mx-3.5 h-10 touch-none select-none"
        >
            <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-black/[0.08] dark:bg-white/[0.12]" />
            <div className={cn('absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full', a.dot)} style={{ left: pct(lo), width: `calc(${pct(hi)} - ${pct(lo)})` }} />
            {thumb('lo', lo)}
            {thumb('hi', hi)}
        </div>
    );
};

const RangeFilter = ({ label = 'Followers', value, onChange, countFor, noun = 'creator', anyLabel = 'Any followers', className }) => {
    const a = useAccent();
    const [draft, setDraft] = useState({ min: value.min ?? null, max: value.max ?? null });
    const [minText, setMinText] = useState('');
    const [maxText, setMaxText] = useState('');

    // Reset the draft whenever the applied value changes (or the panel reopens).
    useEffect(() => {
        setDraft({ min: value.min ?? null, max: value.max ?? null });
    }, [value.min, value.max]);
    useEffect(() => {
        setMinText(draft.min ? formatCount(draft.min) : '');
        setMaxText(draft.max ? formatCount(draft.max) : '');
    }, [draft.min, draft.max]);

    const lo = toPos(draft.min) ?? 0;
    const hi = draft.max === null ? TOP : toPos(draft.max);
    const fromSlider = (l, h) => setDraft({ min: l <= 0 ? null : fromPos(l), max: h >= TOP ? null : fromPos(h) });

    const commitText = (which, text) => {
        const n = parseCount(text);
        if (Number.isNaN(n)) { // put back what was there
            setMinText(draft.min ? formatCount(draft.min) : '');
            setMaxText(draft.max ? formatCount(draft.max) : '');
            return;
        }
        setDraft(d => {
            const next = { ...d, [which]: n || null };
            if (next.min && next.max && next.min > next.max) {
                if (which === 'min') next.max = next.min; else next.min = next.max;
            }
            return next;
        });
    };

    const preview = useMemo(() => (countFor ? countFor(draft.min, draft.max) : null), [countFor, draft.min, draft.max]);
    const applied = value.min || value.max;
    const changed = (draft.min ?? null) !== (value.min ?? null) || (draft.max ?? null) !== (value.max ?? null);

    const field = (which, text, setText, placeholder) => (
        <label className="min-w-0 flex-1">
            <span className="mb-1 block text-[12px] font-bold text-gray-500">{which === 'min' ? 'Minimum' : 'Maximum'}</span>
            <input
                inputMode="decimal"
                autoCapitalize="off"
                autoCorrect="off"
                value={text}
                placeholder={placeholder}
                onChange={(e) => setText(e.target.value)}
                onBlur={(e) => commitText(which, e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commitText(which, e.currentTarget.value); } }}
                className="h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-[15px] font-semibold tabular-nums outline-none focus:border-emerald-500/60 dark:border-white/10 dark:bg-white/[0.04]"
            />
        </label>
    );

    return (
        <FilterPopover
            label={label}
            title={label}
            summary={rangeSummary(value, anyLabel)}
            active={Boolean(applied)}
            onClear={() => onChange({ min: null, max: null })}
            onOpen={() => setDraft({ min: value.min ?? null, max: value.max ?? null })}
            width={360}
            className={className}
            footer={({ close }) => (
                <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setDraft({ min: null, max: null })} disabled={!draft.min && !draft.max} className="h-11 rounded-xl px-3 text-[13px] font-semibold text-gray-500 disabled:opacity-40">Reset</button>
                    <button
                        type="button"
                        onClick={() => { onChange(draft); close(); }}
                        className={cn('h-11 flex-1 rounded-xl text-[14px] font-semibold', a.solid)}
                    >
                        {preview === null ? 'Apply' : `Show ${preview.toLocaleString('en-IN')} ${noun}${preview === 1 ? '' : 's'}`}
                    </button>
                </div>
            )}
        >
            <div className="space-y-4">
                <div className="flex items-baseline justify-between gap-2 px-1">
                    <p className="text-[18px] font-extrabold tabular-nums">{rangeSummary(draft, 'Any number')}</p>
                    {changed && <span className="text-[12px] font-semibold text-gray-500">Not applied yet</span>}
                </div>
                <DualSlider lo={lo} hi={hi} onChange={fromSlider} label={label.toLowerCase()} />
                {/* Scale marks sit where those values are on the stretched scale. */}
                <div className="relative -mt-2 mx-3.5 h-4 text-[11px] font-semibold text-gray-400" aria-hidden="true">
                    {[[0, '0'], [1000, '1K'], [10000, '10K'], [100000, '100K'], [STOPS[TOP], '1M+']].map(([v, t]) => (
                        <span key={t} className="absolute -translate-x-1/2" style={{ left: `${(toPos(v) / TOP) * 100}%` }}>{t}</span>
                    ))}
                </div>
                <div className="flex items-end gap-2">
                    {field('min', minText, setMinText, 'No minimum')}
                    <span className="pb-3 text-gray-400">–</span>
                    {field('max', maxText, setMaxText, 'No maximum')}
                </div>
                <p className="-mt-2 px-1 text-[11.5px] text-gray-500">Type 10k, 1.5m or 2L.</p>
                <div className="flex flex-wrap gap-1.5">
                    {PRESETS.map(p => {
                        const on = (draft.min ?? null) === p.min && (draft.max ?? null) === p.max;
                        return (
                            <button key={p.label} type="button" onClick={() => setDraft({ min: p.min, max: p.max })}
                                className={cn('h-9 rounded-full border px-3 text-[12.5px] font-semibold transition-colors',
                                    on ? cn(a.border, a.soft, a.text) : 'border-black/10 text-gray-600 hover:border-black/20 dark:border-white/10 dark:text-zinc-300')}>
                                {p.label}
                            </button>
                        );
                    })}
                </div>
            </div>
        </FilterPopover>
    );
};

export default RangeFilter;
