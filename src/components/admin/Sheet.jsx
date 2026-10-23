import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import X from 'lucide-react/dist/esm/icons/x';
import { cn } from '../../lib/utils';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';

/*
 * Admin panel overlay: a bottom sheet on phones, a right-hand drawer on larger
 * screens (or a centred dialog with variant="dialog"). Locks page scroll,
 * closes on Escape and backdrop tap, and keeps clear of the iPhone home bar.
 */
const openSheets = [];
// zIndex: raise above a full-screen overlay it opens from (e.g. the creator campaign modal).
const Sheet = ({ open, onClose, title, subtitle, header, children, footer, variant = 'drawer', size = 'md', className, bodyClassName, zIndex }) => {
    // Checked synchronously on render so phones never flash the desktop drawer.
    const isMobile = typeof window !== 'undefined' && window.matchMedia?.('(max-width: 767px)').matches;
    useBodyScrollLock(open);

    // Escape closes only the sheet on top (a confirm over a drawer, say).
    const closeRef = useRef(onClose);
    closeRef.current = onClose;
    useEffect(() => {
        if (!open) return undefined;
        const token = {};
        openSheets.push(token);
        const onKey = (e) => {
            if (e.key === 'Escape' && openSheets[openSheets.length - 1] === token) closeRef.current?.();
        };
        window.addEventListener('keydown', onKey);
        return () => {
            window.removeEventListener('keydown', onKey);
            openSheets.splice(openSheets.indexOf(token), 1);
        };
    }, [open]);

    const asBottomSheet = isMobile;
    const widths = { sm: 'sm:max-w-md', md: 'sm:max-w-xl', lg: 'sm:max-w-2xl', xl: 'sm:max-w-3xl', full: 'sm:max-w-[min(1240px,100vw)]' };

    const panelMotion = asBottomSheet
        ? { initial: { y: '100%' }, animate: { y: 0 }, exit: { y: '100%' } }
        : variant === 'dialog'
            ? { initial: { opacity: 0, scale: 0.97, y: 8 }, animate: { opacity: 1, scale: 1, y: 0 }, exit: { opacity: 0, scale: 0.97, y: 8 } }
            : { initial: { x: '100%' }, animate: { x: 0 }, exit: { x: '100%' } };

    return createPortal(
        <AnimatePresence>
            {open && (
                <div style={zIndex ? { zIndex } : undefined} className={cn('fixed inset-0 z-[300] flex',
                    asBottomSheet ? 'items-end' : variant === 'dialog' ? 'items-center justify-center p-6' : 'justify-end')}>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/40 dark:bg-black/70"
                    />
                    <motion.div
                        role="dialog"
                        aria-modal="true"
                        aria-label={typeof title === 'string' ? title : undefined}
                        {...panelMotion}
                        transition={{ type: 'spring', stiffness: 380, damping: 38 }}
                        className={cn(
                            'relative flex w-full flex-col overflow-hidden border-black/[0.08] bg-white shadow-2xl dark:border-white/[0.08] dark:bg-[#0d0f15]',
                            asBottomSheet
                                ? 'max-h-[92dvh] rounded-t-[1.75rem] border-t'
                                : variant === 'dialog'
                                    ? cn('max-h-[85dvh] rounded-3xl border', widths[size])
                                    : cn('h-dvh border-l', widths[size]),
                            className
                        )}
                    >
                        {asBottomSheet && <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-black/15 dark:bg-white/15" />}
                        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-black/[0.06] px-5 pb-4 pt-4 dark:border-white/[0.06]">
                            {header ? <div className="min-w-0 flex-1">{header}</div> : (
                                <div className="min-w-0">
                                    {title && <h2 className="truncate text-lg font-extrabold tracking-tight">{title}</h2>}
                                    {subtitle && <p className="mt-0.5 line-clamp-2 text-[13px] text-gray-500">{subtitle}</p>}
                                </div>
                            )}
                            <button type="button" onClick={onClose} aria-label="Close" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black/5 text-gray-500 hover:text-gray-900 dark:bg-white/10 dark:hover:text-white">
                                <X size={18} />
                            </button>
                        </div>
                        <div className={cn('flex-1 overflow-y-auto overscroll-contain px-5 py-5', bodyClassName)}>{children}</div>
                        {footer && (
                            <div className="shrink-0 border-t border-black/[0.06] px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 dark:border-white/[0.06]">
                                {footer}
                            </div>
                        )}
                        {!footer && asBottomSheet && <div className="h-[env(safe-area-inset-bottom)] shrink-0" />}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
};

export default Sheet;
