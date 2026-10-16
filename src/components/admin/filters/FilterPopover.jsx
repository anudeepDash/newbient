import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down';
import X from 'lucide-react/dist/esm/icons/x';
import { cn } from '../../../lib/utils';
import { useAccent } from '../theme';
import { isPhone } from '../MobileActionSheet';

/*
 * Shared shell for rich filters (city multi-select, follower range…): a
 * trigger that looks like the kit's Select, opening a popover on desktop and a
 * bottom sheet on phones. Content is a render prop so it can use `close`.
 */
const FilterPopover = ({ label, summary, active, onClear, onOpen, width = 320, title, className, children, footer }) => {
    const a = useAccent();
    const [open, setOpen] = useState(false);
    const [phone, setPhone] = useState(false);
    const [pos, setPos] = useState(null);
    const buttonRef = useRef(null);
    const panelRef = useRef(null);
    const openedAt = useRef(0);

    const place = useCallback(() => {
        const r = buttonRef.current?.getBoundingClientRect();
        if (!r) return;
        const w = Math.min(width, window.innerWidth - 16);
        const left = Math.min(Math.max(8, r.left), window.innerWidth - w - 8);
        const below = window.innerHeight - r.bottom;
        const up = below < 380 && r.top > below;
        setPos({ left, width: w, ...(up ? { bottom: window.innerHeight - r.top + 6 } : { top: r.bottom + 6 }), maxHeight: (up ? r.top : below) - 16 });
    }, [width]);

    const show = () => { onOpen?.(); setPhone(isPhone()); place(); openedAt.current = Date.now(); setOpen(true); };
    const close = useCallback(() => setOpen(false), []);

    useLayoutEffect(() => { if (open && !phone) place(); }, [open, phone, place]);

    useEffect(() => {
        if (!open) return undefined;
        const onDown = (e) => {
            if (phone) return;
            if (buttonRef.current?.contains(e.target) || panelRef.current?.contains(e.target)) return;
            close();
        };
        // Capture + stop so Escape closes only this, not a sheet behind it.
        const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); buttonRef.current?.focus(); } };
        const onScroll = (e) => { if (!phone && !panelRef.current?.contains(e.target)) place(); };
        document.addEventListener('mousedown', onDown);
        window.addEventListener('keydown', onKey, true);
        window.addEventListener('resize', place);
        window.addEventListener('scroll', onScroll, true);
        const prev = document.body.style.overflow;
        if (phone) document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('mousedown', onDown);
            window.removeEventListener('keydown', onKey, true);
            window.removeEventListener('resize', place);
            window.removeEventListener('scroll', onScroll, true);
            if (phone) document.body.style.overflow = prev;
        };
    }, [open, phone, close, place]);

    // The sheet opens under the finger; ignore the rest of that tap.
    const guard = (e) => { if (Date.now() - openedAt.current < 400) { e.preventDefault(); e.stopPropagation(); } };

    const body = typeof children === 'function' ? children({ close }) : children;
    const foot = typeof footer === 'function' ? footer({ close }) : footer;

    return (
        <div className={cn('relative min-w-0', className)}>
            <button
                ref={buttonRef}
                type="button"
                aria-haspopup="dialog"
                aria-expanded={open}
                aria-label={label}
                onClick={() => (open ? close() : show())}
                className={cn(
                    'relative flex h-11 w-full items-center gap-2 rounded-xl border bg-white pl-3.5 pr-9 text-left text-[13px] font-semibold transition-colors dark:bg-white/[0.03]',
                    active ? cn(a.border, a.text) : 'border-black/10 text-gray-800 hover:border-black/20 dark:border-white/10 dark:text-zinc-200 dark:hover:border-white/20',
                    open && 'border-emerald-500/60 dark:border-neon-green/50'
                )}
            >
                <span className="min-w-0 flex-1 truncate">{summary}</span>
                {active && onClear ? (
                    <span
                        role="button"
                        tabIndex={0}
                        aria-label={`Clear ${label}`}
                        onClick={(e) => { e.stopPropagation(); onClear(); }}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onClear(); } }}
                        className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-gray-500 hover:bg-black/5 dark:hover:bg-white/10"
                    >
                        <X size={14} />
                    </span>
                ) : (
                    <ChevronDown size={15} className={cn('pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition-transform', open && 'rotate-180')} />
                )}
            </button>

            {open && createPortal(
                phone ? (
                    <>
                        <div className="fixed inset-0 z-[10000] bg-black/40 dark:bg-black/60" onClickCapture={guard} onClick={close} aria-hidden="true" />
                        <div ref={panelRef} role="dialog" aria-label={title || label} onClickCapture={guard}
                            className="fixed inset-x-0 bottom-0 z-[10001] flex max-h-[85dvh] flex-col rounded-t-[1.75rem] border-t border-black/[0.08] bg-white font-heading shadow-2xl dark:border-white/[0.08] dark:bg-[#14161d]">
                            <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-black/15 dark:bg-white/15" />
                            <p className="shrink-0 px-5 pb-1 pt-3 text-[16px] font-bold">{title || label}</p>
                            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-2">{body}</div>
                            {foot && <div className="shrink-0 border-t border-black/[0.06] px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 dark:border-white/[0.06]">{foot}</div>}
                        </div>
                    </>
                ) : pos && (
                    <div ref={panelRef} role="dialog" aria-label={title || label}
                        style={{ position: 'fixed', left: pos.left, width: pos.width, top: pos.top, bottom: pos.bottom, maxHeight: Math.min(520, pos.maxHeight) }}
                        className="z-[10001] flex flex-col overflow-hidden rounded-2xl border border-black/10 bg-white font-heading shadow-2xl shadow-black/10 dark:border-white/10 dark:bg-[#14161d] dark:shadow-black/50">
                        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3">{body}</div>
                        {foot && <div className="shrink-0 border-t border-black/[0.06] p-3 dark:border-white/[0.06]">{foot}</div>}
                    </div>
                ),
                document.body
            )}
        </div>
    );
};

export default FilterPopover;
