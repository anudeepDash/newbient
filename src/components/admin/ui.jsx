import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import Search from 'lucide-react/dist/esm/icons/search';
import X from 'lucide-react/dist/esm/icons/x';
import ChevronLeft from 'lucide-react/dist/esm/icons/chevron-left';
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right';
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down';
import { cn } from '../../lib/utils';
import { accent, useAccent } from './theme';
import ThemedSelect from './ThemedSelect';
import MobileActionSheet, { isPhone } from './MobileActionSheet';

export { MobileActionSheet };

/*
 * Shared building blocks for every admin screen: hairline-bordered surfaces,
 * sentence-case labels, neon-green primary actions, and colour from the
 * current module's accent (see ./theme.js). Use these instead of one-off styles
 * so every module looks the same.
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
    primary: 'bg-neon-green text-black hover:bg-[#5dff3f] shadow-sm shadow-emerald-500/20',
    secondary: 'border border-black/10 bg-white text-gray-800 hover:border-black/20 dark:border-white/10 dark:bg-white/5 dark:text-zinc-200 dark:hover:border-white/20',
    ghost: 'text-gray-600 hover:bg-black/5 hover:text-gray-900 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-white',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    success: 'bg-emerald-600 text-white hover:bg-emerald-500',
};

const BUTTON_SIZES = {
    sm: 'h-9 px-3 text-[12.5px] gap-1.5 rounded-lg',
    md: 'h-10 px-4 text-[13.5px] gap-2 rounded-xl',
};

/** variant: primary (brand green) | accent (this module's colour) | secondary | ghost | danger | success */
export const Button = React.forwardRef(({ variant = 'secondary', size = 'md', className, children, as: Comp = 'button', ...rest }, ref) => {
    const moduleAccent = useAccent();
    return (
        <Comp
            ref={ref}
            type={Comp === 'button' ? (rest.type || 'button') : undefined}
            className={cn(
                'inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap font-semibold transition-all active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 disabled:pointer-events-none disabled:opacity-40',
                variant === 'accent' ? cn(moduleAccent.solid, 'hover:opacity-90') : BUTTON_VARIANTS[variant],
                BUTTON_SIZES[size],
                className
            )}
            {...rest}
        >
            {children}
        </Comp>
    );
});
Button.displayName = 'Button';

/** tone: any accent name (green, blue, violet, amber, pink, orange, cyan, rose, indigo, teal, fuchsia, red, gray). */
export const Badge = ({ tone = 'gray', className, children, ...rest }) => (
    <span
        className={cn(
            'inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold leading-4',
            accent(tone).chip,
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
/**
 * A number with a label. tone defaults to the module accent. Pass `to` (link),
 * `onClick` (filter) and `active` for clickable tiles.
 */
export const StatTile = ({ label, value, hint, to, onClick, active, tone, icon: Icon, className }) => {
    const moduleAccent = useAccent();
    const a = tone ? accent(tone) : moduleAccent;
    const body = (
        <div className="flex items-start gap-3">
            {Icon && (
                <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', a.chip)}>
                    <Icon size={18} />
                </div>
            )}
            <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-semibold text-gray-500 dark:text-zinc-400">{label}</p>
                <p className="mt-0.5 truncate font-heading text-[22px] font-extrabold leading-tight tabular-nums text-gray-900 dark:text-white" title={typeof value === 'string' || typeof value === 'number' ? String(value) : undefined}>{value}</p>
                {hint && <p className="mt-0.5 line-clamp-1 text-[12px] text-gray-500 dark:text-zinc-400">{hint}</p>}
            </div>
        </div>
    );
    const cls = cn(
        'block w-full rounded-2xl border bg-white p-4 text-left transition-all dark:bg-white/[0.03]',
        active ? cn(a.border, a.soft) : 'border-black/[0.06] dark:border-white/[0.08]',
        (to || onClick) && 'hover:-translate-y-0.5 hover:border-black/15 dark:hover:border-white/20',
        className
    );
    if (to) return <Link to={to} className={cls}>{body}</Link>;
    if (onClick) return <button type="button" onClick={onClick} aria-pressed={active} className={cls}>{body}</button>;
    return <div className={cls}>{body}</div>;
};

export const SearchInput = ({ value, onChange, placeholder = 'Search', className, children }) => (
    <div className={cn('group relative flex min-w-0 items-center', className)}>
        <Search size={15} className="pointer-events-none absolute left-3.5 text-gray-400 transition-colors group-focus-within:text-emerald-500 dark:text-zinc-500" />
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
    <div className={cn('relative inline-flex min-w-0 items-center', className)}>
        <ThemedSelect
            value={value}
            onChange={(e) => onChange(e.target.value)}
            aria-label={label}
            className="h-11 w-full rounded-xl border border-black/10 bg-white pl-3.5 text-[13px] font-semibold text-gray-800 outline-none transition-all hover:border-black/20 focus-visible:border-emerald-500/60 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-200 dark:hover:border-white/20"
            {...rest}
        >
            {options.map(opt => (
                <option key={opt.value} value={opt.value} disabled={opt.disabled}>{opt.label}</option>
            ))}
        </ThemedSelect>
    </div>
);

// Segmented control for status filters and in-page tabs. The selected pill
// takes the module colour.
export const SegmentedTabs = ({ value, onChange, items, className }) => {
    const a = useAccent();
    return (
        <div className={cn('inline-flex items-center gap-1 rounded-2xl bg-black/[0.04] p-1 dark:bg-white/[0.05]', className)} role="tablist">
            {items.map(item => {
                const active = value === item.value;
                return (
                    <button
                        key={item.value}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => onChange(item.value)}
                        className={cn(
                            'flex h-9 shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-3.5 text-[13px] font-semibold transition-all',
                            active
                                ? 'bg-white text-gray-900 shadow-sm dark:bg-white/[0.12] dark:text-white'
                                : 'text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white'
                        )}
                    >
                        {item.icon && <item.icon size={14} className={active ? a.text : undefined} />}
                        {item.label}
                        {item.count !== undefined && (
                            <span className={cn(
                                'min-w-[20px] rounded-full px-1.5 text-center text-[11px] font-bold tabular-nums',
                                item.highlight ? accent('amber').chip : active ? a.chip : 'bg-black/[0.06] text-gray-500 dark:bg-white/10 dark:text-zinc-400'
                            )}>
                                {item.count}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
};

export const EmptyState = ({ icon: Icon, title, description, action, tone }) => {
    const moduleAccent = useAccent();
    const a = tone ? accent(tone) : moduleAccent;
    return (
        <div className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
            {Icon && (
                <div className={cn('flex h-14 w-14 items-center justify-center rounded-2xl', a.chip)}>
                    <Icon size={24} />
                </div>
            )}
            <div className="space-y-1">
                <h3 className="text-[16px] font-bold text-gray-900 dark:text-white">{title}</h3>
                {description && <p className="mx-auto max-w-sm text-[13px] text-gray-500 dark:text-zinc-400">{description}</p>}
            </div>
            {action && <div className="pt-1">{action}</div>}
        </div>
    );
};

export const Pagination = ({ page, pageCount, onChange, total, pageSize }) => {
    if (pageCount <= 1) return null;
    const from = (page - 1) * pageSize + 1;
    const to = Math.min(total, page * pageSize);
    const square = 'flex h-10 w-10 items-center justify-center rounded-xl border border-black/[0.08] bg-white text-gray-900 transition-all hover:border-black/20 disabled:opacity-20 dark:border-white/[0.08] dark:bg-[#0c0e14] dark:text-white dark:hover:border-white/20';
    return (
        <div className="flex items-center justify-between gap-3 border-t border-black/[0.06] px-4 py-4 dark:border-white/[0.06]">
            <p className="text-[12px] font-semibold text-gray-500">
                {from}–{to} of {total}
            </p>
            <div className="flex items-center gap-2">
                <button type="button" className={square} disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Previous page">
                    <ChevronLeft size={16} />
                </button>
                <span className="min-w-[3.5rem] text-center text-[13px] font-semibold tabular-nums text-gray-600 dark:text-zinc-400">{page} / {pageCount}</span>
                <button type="button" className={square} disabled={page >= pageCount} onClick={() => onChange(page + 1)} aria-label="Next page">
                    <ChevronRight size={16} />
                </button>
            </div>
        </div>
    );
};

// Initials get a steady colour per name, so lists of people aren't a wall of grey.
const AVATAR_TONES = ['pink', 'violet', 'blue', 'teal', 'amber', 'orange', 'indigo', 'rose', 'cyan', 'fuchsia', 'green'];
const toneFor = (name) => {
    let h = 0;
    for (const ch of String(name || '')) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return AVATAR_TONES[h % AVATAR_TONES.length];
};

export const Avatar = ({ src, name, size = 40, className }) => {
    const [failed, setFailed] = useState(false);
    const initial = String(name || '?').trim().charAt(0).toUpperCase() || '?';
    const showImage = src && !failed;
    return (
        <div
            className={cn('flex shrink-0 items-center justify-center overflow-hidden rounded-xl font-bold', showImage ? 'bg-black/5 dark:bg-white/5' : accent(toneFor(name)).chip, className)}
            style={{ width: size, height: size, fontSize: Math.max(12, Math.round(size * 0.4)) }}
        >
            {showImage ? (
                <img src={src} alt="" className="h-full w-full object-cover" onError={() => setFailed(true)} loading="lazy" />
            ) : (
                initial
            )}
        </div>
    );
};

// Small click-away menu. Desktop: a popover next to its trigger (portal +
// fixed position, so scrollable tables and sheets don't clip it). Phones: an
// action sheet from the bottom with big rows and a Cancel button.
export const Menu = ({ trigger, children, align = 'right', className, title }) => {
    const [pos, setPos] = useState(null);
    const anchorRef = useRef(null);
    const menuRef = useRef(null);
    const open = Boolean(pos);
    const phone = open && pos.phone;

    const close = () => setPos(null);
    // Triggers pass their click event; position the menu against that element.
    const toggle = (e) => {
        if (open) { close(); return; }
        const rect = e?.currentTarget?.getBoundingClientRect?.();
        if (!rect) return;
        setPos({
            phone: isPhone(),
            top: rect.bottom + 4,
            bottomSpace: window.innerHeight - rect.bottom,
            anchorTop: rect.top,
            left: rect.left,
            right: window.innerWidth - rect.right,
        });
    };

    useEffect(() => {
        if (!open) return undefined;
        const onDown = (e) => {
            if (anchorRef.current?.contains(e.target) || menuRef.current?.contains(e.target)) return;
            if (!phone) close();
        };
        // Capture + stop, so Escape closes only the menu, not the sheet it sits in.
        const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
        const onScroll = (e) => { if (!menuRef.current?.contains(e.target)) close(); };
        document.addEventListener('mousedown', onDown);
        window.addEventListener('keydown', onKey, true);
        if (!phone) {
            window.addEventListener('resize', close);
            window.addEventListener('scroll', onScroll, true);
        }
        const prevOverflow = document.body.style.overflow;
        if (phone) document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('mousedown', onDown);
            window.removeEventListener('keydown', onKey, true);
            window.removeEventListener('resize', close);
            window.removeEventListener('scroll', onScroll, true);
            if (phone) document.body.style.overflow = prevOverflow;
        };
    }, [open, phone]);

    // Flip above the trigger when there isn't room below.
    const style = pos && !phone ? {
        position: 'fixed',
        ...(pos.bottomSpace < 280 ? { bottom: window.innerHeight - pos.anchorTop + 4 } : { top: pos.top }),
        ...(align === 'right' ? { right: Math.max(8, pos.right) } : { left: Math.max(8, pos.left) }),
    } : undefined;

    const closeOnPick = (e) => { e.stopPropagation(); close(); };

    return (
        <div className={cn('relative inline-flex', className)} ref={anchorRef}>
            {trigger({ open, toggle })}
            {open && createPortal(
                phone ? (
                    <MobileActionSheet onClose={close} title={title} panelRef={menuRef}>
                        <div role="menu" onClick={closeOnPick} className="space-y-0.5 [&>a]:min-h-12 [&>a]:items-center [&>a]:text-[15px] [&>button]:min-h-12 [&>button]:items-center [&>button]:text-[15px]">
                            {children}
                        </div>
                    </MobileActionSheet>
                ) : (
                    <div
                        ref={menuRef}
                        style={style}
                        data-side={style.bottom !== undefined ? 'top' : 'bottom'}
                        className="nb-glass-menu z-[10001] max-h-[70dvh] min-w-[240px] overflow-y-auto rounded-[1.1rem] p-1.5 font-heading"
                        onClick={closeOnPick}
                        role="menu"
                    >
                        {children}
                    </div>
                ),
                document.body
            )}
        </div>
    );
};

export const MenuItem = ({ icon: Icon, children, hint, danger, as: Comp = 'button', className, ...rest }) => (
    <Comp
        type={Comp === 'button' ? 'button' : undefined}
        className={cn(
            'flex w-full cursor-pointer items-start gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-semibold transition-colors disabled:opacity-50',
            danger ? 'text-red-500 hover:bg-red-500/10' : 'nb-glass-option text-gray-900 dark:text-white',
            className
        )}
        {...rest}
    >
        {Icon && <Icon size={14} className={cn('mt-0.5 shrink-0', danger ? 'text-red-500' : 'text-gray-400')} />}
        <span className="min-w-0 flex-1">
            <span className="block">{children}</span>
            {hint && <span className="mt-0.5 block truncate text-[11.5px] font-medium text-gray-500 dark:text-zinc-400">{hint}</span>}
        </span>
    </Comp>
);

// Card / list switch. Remembers the choice per page in this browser.
export const useViewMode = (key, fallback = 'list') => {
    const storageKey = `nb_view_${key}`;
    const [mode, setMode] = useState(() => {
        try { return window.localStorage.getItem(storageKey) || fallback; } catch { return fallback; }
    });
    const update = (next) => {
        setMode(next);
        try { window.localStorage.setItem(storageKey, next); } catch { /* private mode */ }
    };
    return [mode, update];
};

export const ViewToggle = ({ value, onChange, className }) => (
    <div className={cn('inline-flex h-11 shrink-0 items-center gap-1 rounded-xl border border-black/10 p-1 dark:border-white/10', className)} role="group" aria-label="Layout">
        {[
            { v: 'cards', label: 'Cards', d: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z' },
            { v: 'list', label: 'List', d: 'M4 6h16M4 12h16M4 18h16' },
        ].map(opt => (
            <button
                key={opt.v}
                type="button"
                onClick={() => onChange(opt.v)}
                aria-pressed={value === opt.v}
                aria-label={`${opt.label} view`}
                title={`${opt.label} view`}
                className={cn('flex h-9 w-9 items-center justify-center rounded-lg transition-colors',
                    value === opt.v ? 'bg-gray-900 text-white dark:bg-white dark:text-black' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white')}
            >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d={opt.d} />
                </svg>
            </button>
        ))}
    </div>
);
