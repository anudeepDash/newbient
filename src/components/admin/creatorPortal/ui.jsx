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
 * Plain, readable building blocks for the admin Creator Portal.
 * Sentence-case labels, normal text sizes, neutral surfaces, one accent.
 */

export const Card = ({ className, children, ...rest }) => (
    <div
        className={cn(
            'rounded-xl border border-gray-200 bg-white dark:border-zinc-800 dark:bg-zinc-900',
            className
        )}
        {...rest}
    >
        {children}
    </div>
);

const BUTTON_VARIANTS = {
    primary: 'bg-gray-900 text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-zinc-200',
    secondary: 'border border-gray-300 bg-white text-gray-800 hover:bg-gray-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800',
    ghost: 'text-gray-700 hover:bg-gray-100 dark:text-zinc-300 dark:hover:bg-zinc-800',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700',
};

const BUTTON_SIZES = {
    sm: 'h-8 px-3 text-xs gap-1.5',
    md: 'h-9 px-3.5 text-sm gap-2',
};

export const Button = React.forwardRef(({ variant = 'secondary', size = 'md', className, children, as: Comp = 'button', ...rest }, ref) => (
    <Comp
        ref={ref}
        type={Comp === 'button' ? (rest.type || 'button') : undefined}
        className={cn(
            'inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-lg font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 disabled:pointer-events-none disabled:opacity-50',
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
    gray: 'bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-zinc-300',
    green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400',
    amber: 'bg-amber-50 text-amber-800 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400',
    red: 'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-500/10 dark:text-red-400',
    blue: 'bg-sky-50 text-sky-700 ring-sky-600/20 dark:bg-sky-500/10 dark:text-sky-400',
    violet: 'bg-violet-50 text-violet-700 ring-violet-600/20 dark:bg-violet-500/10 dark:text-violet-400',
};

export const Badge = ({ tone = 'gray', className, children, ...rest }) => (
    <span
        className={cn(
            'inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ring-transparent',
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
    pending: { label: 'Pending review', tone: 'amber' },
    rejected: { label: 'Rejected', tone: 'red' },
    blocked: { label: 'Blocked', tone: 'red' },
};

export const CreatorStatusBadge = ({ status }) => {
    const cfg = CREATOR_STATUS[status] || CREATOR_STATUS.pending;
    return <Badge tone={cfg.tone}>{cfg.label}</Badge>;
};

export const CampaignStatusBadge = ({ status }) => {
    const isOpen = !status || String(status).toLowerCase() === 'open';
    return <Badge tone={isOpen ? 'green' : 'gray'}>{isOpen ? 'Open' : (status || 'Closed')}</Badge>;
};

export const StatTile = ({ label, value, hint, to, tone = 'gray', icon: Icon }) => {
    const toneText = {
        gray: 'text-gray-900 dark:text-white',
        amber: 'text-amber-700 dark:text-amber-400',
        green: 'text-emerald-700 dark:text-emerald-400',
        blue: 'text-sky-700 dark:text-sky-400',
    }[tone];
    const body = (
        <>
            <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-gray-500 dark:text-zinc-400">{label}</p>
                {Icon && <Icon size={16} className="text-gray-400 dark:text-zinc-500" />}
            </div>
            <p className={cn('mt-1 text-2xl font-semibold tabular-nums', toneText)}>{value}</p>
            {hint && <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-zinc-500">{hint}</p>}
        </>
    );
    const cls = 'block rounded-xl border border-gray-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900';
    return to ? (
        <Link to={to} className={cn(cls, 'transition-colors hover:border-gray-300 hover:bg-gray-50 dark:hover:border-zinc-700 dark:hover:bg-zinc-800/60')}>
            {body}
        </Link>
    ) : (
        <div className={cls}>{body}</div>
    );
};

export const SearchInput = ({ value, onChange, placeholder = 'Search', className, children }) => (
    <div className={cn('relative flex min-w-0 items-center', className)}>
        <Search size={16} className="pointer-events-none absolute left-3 text-gray-400" />
        <input
            type="search"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="h-9 w-full rounded-lg border border-gray-300 bg-white pl-9 pr-8 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:placeholder:text-zinc-500 dark:focus:border-zinc-400 dark:focus:ring-zinc-400 [&::-webkit-search-cancel-button]:hidden"
        />
        {value && (
            <button
                type="button"
                onClick={() => onChange('')}
                className="absolute right-2 rounded p-0.5 text-gray-400 hover:text-gray-700 dark:hover:text-zinc-200"
                aria-label="Clear search"
            >
                <X size={14} />
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
            className="h-9 w-full appearance-none rounded-lg border border-gray-300 bg-white pl-3 pr-8 text-sm text-gray-800 focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            {...rest}
        >
            {options.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
        </select>
        <ChevronDown size={14} className="pointer-events-none absolute right-2.5 text-gray-400" />
    </label>
);

export const SegmentedTabs = ({ value, onChange, items, className }) => (
    <div className={cn('inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5 dark:border-zinc-800 dark:bg-zinc-900', className)}>
        {items.map(item => {
            const active = value === item.value;
            return (
                <button
                    key={item.value}
                    type="button"
                    onClick={() => onChange(item.value)}
                    className={cn(
                        'inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-md px-3 text-sm transition-colors',
                        active
                            ? 'bg-white font-medium text-gray-900 shadow-sm dark:bg-zinc-800 dark:text-white'
                            : 'text-gray-600 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white'
                    )}
                >
                    {item.label}
                    {item.count !== undefined && (
                        <span className={cn(
                            'rounded px-1.5 text-xs tabular-nums',
                            item.highlight ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400' : 'text-gray-500 dark:text-zinc-500'
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
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
        {Icon && (
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-500 dark:bg-zinc-800 dark:text-zinc-400">
                <Icon size={18} />
            </div>
        )}
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
        {description && <p className="mt-1 max-w-sm text-sm text-gray-500 dark:text-zinc-400">{description}</p>}
        {action && <div className="mt-4">{action}</div>}
    </div>
);

export const Pagination = ({ page, pageCount, onChange, total, pageSize }) => {
    if (pageCount <= 1) return null;
    const from = (page - 1) * pageSize + 1;
    const to = Math.min(total, page * pageSize);
    return (
        <div className="flex items-center justify-between gap-3 border-t border-gray-200 px-4 py-3 text-sm dark:border-zinc-800">
            <p className="text-gray-500 dark:text-zinc-400">
                {from}–{to} of {total}
            </p>
            <div className="flex items-center gap-2">
                <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Previous page">
                    <ChevronLeft size={14} /> Prev
                </Button>
                <span className="tabular-nums text-gray-600 dark:text-zinc-400">{page} / {pageCount}</span>
                <Button size="sm" variant="secondary" disabled={page >= pageCount} onClick={() => onChange(page + 1)} aria-label="Next page">
                    Next <ChevronRight size={14} />
                </Button>
            </div>
        </div>
    );
};

export const Avatar = ({ src, name, size = 36, className }) => {
    const [failed, setFailed] = useState(false);
    const initials = String(name || '?').trim().split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase() || '?';
    return (
        <div
            className={cn('flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-200 text-xs font-semibold text-gray-600 dark:bg-zinc-700 dark:text-zinc-200', className)}
            style={{ width: size, height: size }}
        >
            {src && !failed ? (
                <img src={src} alt="" className="h-full w-full object-cover" onError={() => setFailed(true)} loading="lazy" />
            ) : (
                initials
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
                    className="z-[200] max-h-[70vh] min-w-[220px] overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 font-sans shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
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
            'flex w-full cursor-pointer items-start gap-2.5 px-3 py-2 text-left text-sm transition-colors hover:bg-gray-50 disabled:opacity-50 dark:hover:bg-zinc-800',
            danger ? 'text-red-600 dark:text-red-400' : 'text-gray-800 dark:text-zinc-100',
            className
        )}
        {...rest}
    >
        {Icon && <Icon size={15} className="mt-0.5 shrink-0 text-gray-400" />}
        <span className="min-w-0 flex-1">
            <span className="block">{children}</span>
            {hint && <span className="block text-xs text-gray-500 dark:text-zinc-400">{hint}</span>}
        </span>
    </Comp>
);
