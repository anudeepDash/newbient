import React, { useEffect, useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import Info from 'lucide-react/dist/esm/icons/info';
import CircleCheck from 'lucide-react/dist/esm/icons/circle-check';
import TriangleAlert from 'lucide-react/dist/esm/icons/triangle-alert';
import { cn } from '../../lib/utils';
import { isPresent } from '../../lib/present';
import { CREATOR_STATUS, TONES } from './format';

/* UI pieces shared by the creator pages. Every one renders nothing when empty. */

/*
 * A sticky action dock for pages (apply, campaign page): solid down to the
 * screen edge, so the app's floating tab pill sits over its lower part and
 * nothing scrolls between the button and the tabs. Safe-area padded.
 */
export const STICKY_DOCK = 'sticky bottom-0 z-30 -mx-4 space-y-2 border-t border-black/[0.06] bg-[#f6f7f9] px-4 pt-3 pb-[calc(6.5rem+env(safe-area-inset-bottom))] dark:border-white/[0.06] dark:bg-[#050608] sm:-mx-6 sm:px-6';

export const StatusChip = ({ status, className }) => {
    const meta = CREATOR_STATUS[status];
    if (!meta) return null;
    return <span className={cn('inline-flex h-7 items-center rounded-full px-3 text-[13px] font-bold', TONES[meta.tone], className)}>{meta.label}</span>;
};

export const ToneChip = ({ tone = 'gray', icon: Icon, children, className }) => {
    if (!isPresent(children)) return null;
    return (
        <span className={cn('inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-[12px] font-bold', TONES[tone] || TONES.gray, className)}>
            {Icon && <Icon size={13} />}{children}
        </span>
    );
};

const NOTICE = {
    info: { icon: Info, cls: 'bg-sky-500/[0.08] text-sky-900 dark:text-sky-200' },
    warn: { icon: TriangleAlert, cls: 'bg-amber-500/10 text-amber-900 dark:text-amber-200' },
    error: { icon: TriangleAlert, cls: 'bg-red-500/10 text-red-800 dark:text-red-300' },
    success: { icon: CircleCheck, cls: 'bg-emerald-500/10 text-emerald-900 dark:text-neon-green' },
};

export const Notice = ({ tone = 'info', title, children, action, className }) => {
    if (!isPresent(title) && !isPresent(children)) return null;
    const { icon: Icon, cls } = NOTICE[tone] || NOTICE.info;
    return (
        <div role={tone === 'error' ? 'alert' : undefined} className={cn('flex gap-3 rounded-2xl px-4 py-3', cls, className)}>
            <Icon size={18} className="mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1 space-y-1 text-[14px] leading-snug">
                {title && <p className="font-bold">{title}</p>}
                {children && <div className="opacity-90">{children}</div>}
                {action && <div className="pt-1">{action}</div>}
            </div>
        </div>
    );
};

/* A big tappable option (niche, collaboration, rate). */
export const ChoiceChip = ({ selected, onClick, children, hint, className }) => (
    <button
        type="button"
        onClick={onClick}
        aria-pressed={selected}
        className={cn(
            'min-h-[44px] rounded-2xl border px-4 py-2.5 text-left text-[14px] font-semibold transition-colors active:scale-[0.98]',
            selected
                ? 'border-gray-900 bg-gray-900 text-white dark:border-neon-green dark:bg-neon-green/15 dark:text-neon-green'
                : 'border-black/[0.08] bg-white text-gray-800 hover:border-black/20 dark:border-white/[0.1] dark:bg-white/[0.03] dark:text-zinc-200 dark:hover:border-white/25',
            className
        )}
    >
        <span className="block">{children}</span>
        {hint && <span className={cn('block text-[12px] font-medium', selected ? 'opacity-80' : 'text-gray-500 dark:text-zinc-500')}>{hint}</span>}
    </button>
);

/* Step progress for the application: "Step 1 of 2" plus two bars. */
export const StepBars = ({ step, total = 2, labels = [] }) => (
    <div className="space-y-2">
        <div className="flex gap-1.5">
            {Array.from({ length: total }, (_, i) => (
                <span key={i} className={cn('h-1.5 flex-1 rounded-full', i < step ? 'bg-gray-900 dark:bg-neon-green' : 'bg-black/[0.08] dark:bg-white/[0.1]')} />
            ))}
        </div>
        <p className="text-[12px] font-bold uppercase tracking-widest text-gray-500 dark:text-zinc-500">
            Step {step} of {total}{labels[step - 1] ? ` · ${labels[step - 1]}` : ''}
        </p>
    </div>
);

/* The creator home's sections, as a segmented row of links (the shell's tab bar stays the only bottom bar). */
export const SubTabs = ({ tabs }) => {
    const ref = useRef(null);
    const { pathname } = useLocation();
    // Keep the current section in view on narrow screens.
    useEffect(() => {
        const nav = ref.current;
        const active = nav?.querySelector('[aria-current="page"]');
        if (!nav || !active) return;
        const left = active.offsetLeft - (nav.clientWidth - active.offsetWidth) / 2;
        nav.scrollTo({ left: Math.max(0, left), behavior: 'smooth' });
    }, [pathname]);
    return (
    <nav ref={ref} aria-label="Creator sections" className="relative -mx-4 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:px-0">
        <div className="inline-flex gap-1 rounded-2xl bg-black/[0.04] p-1 dark:bg-white/[0.05]">
            {tabs.map(t => (
                <NavLink
                    key={t.to}
                    to={t.to}
                    end={t.end}
                    replace
                    className={({ isActive }) => cn(
                        'flex h-10 items-center gap-1.5 whitespace-nowrap rounded-xl px-4 text-[14px] font-bold transition-colors',
                        isActive ? 'bg-white text-gray-900 shadow-sm dark:bg-white/[0.12] dark:text-white' : 'text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white'
                    )}
                >
                    {t.label}
                    {isPresent(t.count) && <span className="rounded-full bg-black/[0.06] px-1.5 text-[11px] font-black dark:bg-white/[0.1]">{t.count}</span>}
                </NavLink>
            ))}
        </div>
    </nav>
    );
};

/* A label + control block for forms. */
export const FormBlock = ({ label, hint, children, className }) => (
    <div className={cn('space-y-2', className)}>
        {label && <p className="text-[13px] font-bold text-gray-700 dark:text-zinc-300">{label}</p>}
        {children}
        {hint && <p className="text-[12px] text-gray-500 dark:text-zinc-500">{hint}</p>}
    </div>
);

export const TextArea = ({ value, onChange, maxLength, placeholder, rows = 4, id }) => (
    <div className="space-y-1">
        <textarea
            id={id}
            value={value}
            onChange={onChange}
            maxLength={maxLength}
            rows={rows}
            placeholder={placeholder}
            className="w-full resize-none rounded-2xl border border-black/[0.1] bg-white px-4 py-3 text-[16px] text-gray-900 outline-none placeholder:text-gray-400 focus:border-gray-900 dark:border-white/[0.1] dark:bg-white/[0.04] dark:text-white dark:placeholder:text-zinc-600 dark:focus:border-neon-green/60"
        />
        {maxLength && <p className="text-right text-[12px] text-gray-400 dark:text-zinc-600">{String(value || '').length}/{maxLength}</p>}
    </div>
);
