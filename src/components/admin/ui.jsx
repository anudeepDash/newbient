import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import Search from 'lucide-react/dist/esm/icons/search';
import X from 'lucide-react/dist/esm/icons/x';
import ChevronLeft from 'lucide-react/dist/esm/icons/chevron-left';
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right';
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down';
import { cn } from '../../../lib/utils';

/*
 * Building blocks for the admin Creator Portal, matching the rest of the admin:
 * #0c0e14 surfaces with hairline borders, rounded-2xl/3xl, black uppercase
 * micro-labels, neon-green primary actions.
 */

export const Card = ({ className, children, ...rest }) => (
    <div
        className={cn(
            'rounded-3xl border border-black/[0.06] bg-white/70 shadow-[0_8px_32px_rgba(0,0,0,0.02)] backdrop-blur-2xl dark:border-white/[0.08] dark:bg-[#0c0e14]/80 dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)]',
            className
        )}
        {...rest}
    >
        {children}
    </div>
);

const BUTTON_VARIANTS = {
    primary: 'bg-neon-green text-black hover:bg-emerald-400 shadow-[0_0_20px_rgba(57,255,20,0.25)]',
    secondary: 'border border-black/10 bg-white text-gray-800 hover:border-black/20 dark:border-white/10 dark:bg-white/5 dark:text-zinc-200 dark:hover:border-white/20',
    ghost: 'text-gray-600 hover:bg-black/5 hover:text-gray-900 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-white',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    success: 'bg-emerald-600 text-white hover:bg-emerald-500',
};

const BUTTON_SIZES = {
    sm: 'h-8 px-3 text-[10px] gap-1.5 rounded-lg',
    md: 'h-10 px-4 text-[11px] gap-2 rounded-xl',
};

export const Button = React.forwardRef(({ variant = 'secondary', size = 'md', className, children, as: Comp = 'button', ...rest }, ref) => (
    <Comp
        ref={ref}
        type={Comp === 'button' ? (rest.type || 'button') : undefined}
        className={cn(
            'inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap font-black uppercase tracking-wider transition-all active:scale-95 focus:outline-none disabled:pointer-events-none disabled:opacity-40',
            BUTTON_VARIANTS[variant],
            BUTTON_SIZES[size],
            className
        )}
        {...rest}
    >
        {children}
    </Comp>
));
Button.displayName = 'Button';

const BADGE_TONES = {
    gray: 'bg-black/5 text-gray-600 border-black/10 dark:bg-white/5 dark:text-zinc-400 dark:border-white/10',
    green: 'bg-neon-green/10 text-emerald-700 border-neon-green/20 dark:text-neon-green',
    amber: 'bg-amber-500/10 text-amber-700 border-amber-500/25 dark:text-amber-400',
    red: 'bg-red-500/10 text-red-600 border-red-500/20 dark:text-red-400',
    blue: 'bg-neon-blue/10 text-sky-700 border-neon-blue/20 dark:text-neon-blue',
    violet: 'bg-purple-500/10 text-purple-700 border-purple-500/20 dark:text-purple-400',
};

export const Badge = ({ tone = 'gray', className, children, ...rest }) => (
    <span
        className={cn(
            'inline-flex items-center gap-1 whitespace-nowrap rounded-lg border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider',
            BADGE_TONES[tone],
            className
        )}
        {...rest}
    >
        {children}
    </span>
);

const CREATOR_STATUS = {
    approved: { label: 'Verified', tone: 'green' },
    pending: { label: 'Pending', tone: 'amber' },
    rejected: { label: 'Rejected', tone: 'red' },
    blocked: { label: 'Blocked', tone: 'red' },
};

export const CreatorStatusBadge = ({ status }) => {
    const cfg = CREATOR_STATUS[status] || CREATOR_STATUS.pending;
    return <Badge tone={cfg.tone}>{cfg.label}</Badge>;
};

export const CampaignStatusBadge = ({ status }) => {
    const isOpen = !status || String(status).toLowerCase() === 'open';
    return <Badge tone={isOpen ? 'green' : 'red'}>{isOpen ? 'Open' : (status || 'Closed')}</Badge>;
};

// Mirrors the compact StatCard used across admin hubs.
export const StatTile = ({ label, value, hint, to, tone = 'gray', icon: Icon }) => {
    const iconTone = {
        gray: 'bg-black/5 text-gray-700 dark:bg-white/5 dark:text-zinc-300',
        amber: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
        green: 'bg-neon-green/10 text-emerald-700 dark:text-neon-green',
        blue: 'bg-neon-blue/10 text-sky-700 dark:text-neon-blue',
    }[tone];
    const body = (
        <div className="flex items-center gap-4">
            {Icon && (
                <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', iconTone)}>
                    <Icon size={18} />
                </div>
            )}
            <div className="min-w-0 flex-1 space-y-1">
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-500">{label}</p>
                <h3 className="font-heading text-2xl font-black leading-none tracking-tight tabular-nums text-gray-900 dark:text-white">{value}</h3>
                {hint && <p className="line-clamp-1 text-[9px] font-bold uppercase tracking-widest text-gray-500">{hint}</p>}
            </div>
        </div>
    );
    const cls = 'block rounded-2xl border border-black/[0.06] bg-white/70 p-4 shadow-[0_8px_32px_rgba(0,0,0,0.02)] backdrop-blur-2xl transition-all dark:border-white/[0.08] dark:bg-[#0c0e14]/80 dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)]';
    return to ? (
        <Link to={to} className={cn(cls, 'hover:-translate-y-0.5 hover:border-black/20 dark:hover:border-white/[0.15]')}>
            {body}
        </Link>
    ) : (
        <div className={cls}>{body}</div>
    );
};

export const SearchInput = ({ value, onChange, placeholder = 'Search', className, children }) => (
    <div className={cn('group relative flex min-w-0 items-center', className)}>
        <Search size={15} className="pointer-events-none absolute left-3.5 text-gray-400 transition-colors group-focus-within:text-neon-green dark:text-zinc-500" />
        <input
            type="search"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="h-11 w-full rounded-xl border border-black/10 bg-white pl-10 pr-9 text-sm font-semibold text-gray-900 outline-none transition-all placeholder:font-medium placeholder:text-gray-400 hover:border-black/20 focus:!border-neon-green/50 dark:border-white/10 dark:bg-white/[0.03] dark:text-white dark:placeholder:text-zinc-500 dark:hover:border-white/20 [&::-webkit-search-cancel-button]:hidden"
        />
        {value && (
            <button
                type="button"
                onClick={() => onChange('')}
                className="absolute right-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/5 text-gray-400 hover:text-gray-900 dark:bg-white/10 dark:hover:text-white"
                aria-label="Clear search"
            >
                <X size={11} />
            </button>
        )}
        {children}
    </div>
);

export const Select = ({ value, onChange, options, className, label, ...rest }) => (
    <label className={cn('relative inline-flex items-center', className)}>
        {label && <span className="sr-only">{label}</span>}
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="h-11 w-full cursor-pointer appearance-none rounded-xl border border-black/10 bg-white pl-3.5 pr-8 text-xs font-bold text-gray-800 outline-none transition-all hover:border-black/20 focus:border-neon-green/50 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-200 dark:hover:border-white/20 [&>option]:bg-white dark:[&>option]:bg-[#0c0e14]"
            {...rest}
        >
            {options.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
        </select>
        <ChevronDown size={13} className="pointer-events-none absolute right-3 text-gray-400" />
    </label>
);

// Same segmented control as the status tabs elsewhere in admin.
export const SegmentedTabs = ({ value, onChange, items, className }) => (
    <div className={cn('inline-flex items-center gap-1 rounded-2xl border border-black/5 bg-black/5 p-1 dark:border-white/5 dark:bg-white/5', className)}>
        {items.map(item => {
            const active = value === item.value;
            return (
                <button
                    key={item.value}
                    type="button"
                    onClick={() => onChange(item.value)}
                    className={cn(
                        'flex h-9 shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-3.5 text-[10px] uppercase tracking-widest transition-all',
                        active
                            ? 'border border-black/10 bg-white font-black text-black shadow-sm dark:border-white/10 dark:bg-[#1a1c23] dark:text-white'
                            : 'font-bold text-gray-600 hover:text-black dark:text-zinc-400 dark:hover:text-white'
                    )}
                >
                    {item.label}
                    {item.count !== undefined && (
                        <span className={cn(
                            'rounded px-1 py-0.5 font-mono text-[9px] tabular-nums',
                            item.highlight ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400' : 'bg-black/5 opacity-70 dark:bg-white/10'
                        )}>
                            {item.count}
                        </span>
                    )}
                </button>
            );
        })}
    </div>
);

export const EmptyState = ({ icon: Icon, title, description, action }) => (
    <div className="flex flex-col items-center justify-center gap-4 px-6 py-20 text-center">
        {Icon && (
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-black/10 bg-black/[0.03] text-gray-400 dark:border-white/10 dark:bg-white/[0.04]">
                <Icon size={26} />
            </div>
        )}
        <div className="space-y-1.5">
            <h3 className="text-base font-black uppercase tracking-tight text-gray-900 dark:text-white">{title}</h3>
            {description && <p className="mx-auto max-w-sm text-xs text-gray-500 dark:text-zinc-400">{description}</p>}
        </div>
        {action && <div className="pt-1">{action}</div>}
    </div>
);

export const Pagination = ({ page, pageCount, onChange, total, pageSize }) => {
    if (pageCount <= 1) return null;
    const from = (page - 1) * pageSize + 1;
    const to = Math.min(total, page * pageSize);
    const square = 'flex h-10 w-10 items-center justify-center rounded-xl border border-black/[0.08] bg-white text-gray-900 transition-all hover:border-black/20 disabled:opacity-20 dark:border-white/[0.08] dark:bg-[#0c0e14] dark:text-white dark:hover:border-white/20';
    return (
        <div className="flex items-center justify-between gap-3 border-t border-black/[0.06] px-4 py-4 dark:border-white/[0.06]">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                {from}–{to} of {total}
            </p>
            <div className="flex items-center gap-2">
                <button type="button" className={square} disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Previous page">
                    <ChevronLeft size={16} />
                </button>
                <span className="min-w-[3.5rem] text-center font-mono text-xs font-black tabular-nums text-gray-600 dark:text-zinc-400">{page} / {pageCount}</span>
                <button type="button" className={square} disabled={page >= pageCount} onClick={() => onChange(page + 1)} aria-label="Next page">
                    <ChevronRight size={16} />
                </button>
            </div>
        </div>
    );
};

export const Avatar = ({ src, name, size = 40, className }) => {
    const [failed, setFailed] = useState(false);
    const initial = String(name || '?').trim().charAt(0).toUpperCase() || '?';
    return (
        <div
            className={cn('flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-black/10 bg-black/5 font-black italic text-gray-900 dark:border-white/10 dark:bg-white/5 dark:text-white/40', className)}
            style={{ width: size, height: size }}
        >
            {src && !failed ? (
                <img src={src} alt="" className="h-full w-full object-cover" onError={() => setFailed(true)} loading="lazy" />
            ) : (
                initial
            )}
        </div>
    );
};

// Small click-away dropdown menu. Rendered in a portal with fixed positioning so
// it isn't clipped by scrollable tables or cards.
export const Menu = ({ trigger, children, align = 'right', className }) => {
    const [pos, setPos] = useState(null);
    const anchorRef = useRef(null);
    const menuRef = useRef(null);
    const open = Boolean(pos);

    const close = () => setPos(null);
    // Triggers pass their click event; position the menu against that element.
    const toggle = (e) => {
        if (open) { close(); return; }
        const rect = e?.currentTarget?.getBoundingClientRect?.();
        if (!rect) return;
        setPos({
            top: rect.bottom + 4,
            bottomSpace: window.innerHeight - rect.bottom,
            anchorTop: rect.top,
            left: rect.left,
            right: window.innerWidth - rect.right,
        });
    };

    useEffect(() => {
        if (!open) return;
        const onDown = (e) => {
            if (anchorRef.current?.contains(e.target) || menuRef.current?.contains(e.target)) return;
            close();
        };
        const onKey = (e) => { if (e.key === 'Escape') close(); };
        document.addEventListener('mousedown', onDown);
        document.addEventListener('keydown', onKey);
        window.addEventListener('resize', close);
        window.addEventListener('scroll', close, true);
        return () => {
            document.removeEventListener('mousedown', onDown);
            document.removeEventListener('keydown', onKey);
            window.removeEventListener('resize', close);
            window.removeEventListener('scroll', close, true);
        };
    }, [open]);

    // Flip above the trigger when there isn't room below.
    const style = pos ? {
        position: 'fixed',
        ...(pos.bottomSpace < 280 ? { bottom: window.innerHeight - pos.anchorTop + 4 } : { top: pos.top }),
        ...(align === 'right' ? { right: Math.max(8, pos.right) } : { left: Math.max(8, pos.left) }),
    } : undefined;

    return (
        <div className={cn('relative inline-flex', className)} ref={anchorRef}>
            {trigger({ open, toggle })}
            {open && createPortal(
                <div
                    ref={menuRef}
                    style={style}
                    className="z-[200] max-h-[70vh] min-w-[240px] overflow-y-auto rounded-2xl border border-black/10 bg-white p-1.5 font-heading shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-zinc-950"
                    onClick={(e) => { e.stopPropagation(); close(); }}
                    role="menu"
                >
                    {children}
                </div>,
                document.body
            )}
        </div>
    );
};

export const MenuItem = ({ icon: Icon, children, hint, danger, as: Comp = 'button', className, ...rest }) => (
    <Comp
        type={Comp === 'button' ? 'button' : undefined}
        className={cn(
            'flex w-full cursor-pointer items-start gap-3 rounded-xl px-3 py-2.5 text-left text-[11px] font-bold transition-colors disabled:opacity-50',
            danger ? 'text-red-500 hover:bg-red-500/10' : 'text-gray-900 hover:bg-black/5 dark:text-white dark:hover:bg-white/5',
            className
        )}
        {...rest}
    >
        {Icon && <Icon size={14} className={cn('mt-0.5 shrink-0', danger ? 'text-red-500' : 'text-gray-400')} />}
        <span className="min-w-0 flex-1">
            <span className="block">{children}</span>
            {hint && <span className="mt-0.5 block truncate text-[10px] font-medium text-gray-500 dark:text-zinc-400">{hint}</span>}
        </span>
    </Comp>
);
