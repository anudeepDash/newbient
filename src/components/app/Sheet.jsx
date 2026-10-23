import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useDragControls } from 'framer-motion';
import X from 'lucide-react/dist/esm/icons/x';
import { cn } from '../../lib/utils';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import BrandLayers from './BrandLayers';

/*
 * The app's one modal primitive.
 *
 * Phones: a bottom sheet sized in dvh (so Safari's toolbars never cover it),
 * page scroll locked, padded clear of the home bar, and dragged down to close
 * by its handle only, so scrolling the content never fights the gesture.
 * Desktop: a centred dialog.
 *
 *   <Sheet open={open} onClose={close} title="Complete your profile" footer={<Button/>}>
 *     ...
 *   </Sheet>
 *
 * size: 'auto' (fits content, up to 92dvh) or 'full' (full height on phones).
 * bleed: no header row; the body starts at the very top (for a full-width
 * image) and the close button (and the phone drag handle) float over it.
 * Every sheet sits on the Newbi surface (BrandLayers: corner glow and dot
 * grid; the N. mark stays on the Home notice panels only). backdrop: an element painted instead, behind the header and body.
 */

const MOBILE_QUERY = '(max-width: 767px)';
const stack = [];

export const useIsPhone = () => {
    const [phone, setPhone] = useState(() => typeof window !== 'undefined' && window.matchMedia?.(MOBILE_QUERY).matches);
    useEffect(() => {
        const mq = window.matchMedia?.(MOBILE_QUERY);
        if (!mq) return undefined;
        const onChange = (e) => setPhone(e.matches);
        mq.addEventListener('change', onChange);
        return () => mq.removeEventListener('change', onChange);
    }, []);
    return phone;
};

const Sheet = ({
    open,
    onClose,
    title,
    subtitle,
    header,
    children,
    footer,
    size = 'auto',
    width = 'md',
    dismissible = true,
    className,
    bodyClassName,
    zIndex,
    backdrop,
    bleed = false,
}) => {
    const phone = useIsPhone();
    const drag = useDragControls();
    useBodyScrollLock(open);

    const closeRef = useRef(onClose);
    closeRef.current = onClose;
    useEffect(() => {
        if (!open) return undefined;
        const token = {};
        stack.push(token);
        const onKey = (e) => {
            if (e.key === 'Escape' && dismissible && stack[stack.length - 1] === token) closeRef.current?.();
        };
        window.addEventListener('keydown', onKey);
        return () => {
            window.removeEventListener('keydown', onKey);
            stack.splice(stack.indexOf(token), 1);
        };
    }, [open, dismissible]);

    const requestClose = () => { if (dismissible) onClose?.(); };
    const widths = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl', '2xl': 'max-w-5xl' };

    if (typeof document === 'undefined') return null;

    return createPortal(
        <AnimatePresence>
            {open && (
                <div
                    style={zIndex ? { zIndex } : undefined}
                    className={cn('fixed inset-0 z-[400] flex', phone ? 'items-end' : 'items-center justify-center p-6')}
                >
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        onClick={requestClose}
                        className="absolute inset-0 bg-black/45 dark:bg-black/75"
                    />
                    <motion.div
                        role="dialog"
                        aria-modal="true"
                        aria-label={typeof title === 'string' ? title : undefined}
                        initial={phone ? { y: '100%' } : { opacity: 0, scale: 0.97, y: 8 }}
                        animate={phone ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
                        exit={phone ? { y: '100%' } : { opacity: 0, scale: 0.97, y: 8 }}
                        transition={{ type: 'spring', stiffness: 380, damping: 38 }}
                        drag={phone && dismissible ? 'y' : false}
                        dragControls={drag}
                        dragListener={false}
                        dragConstraints={{ top: 0, bottom: 0 }}
                        dragElastic={{ top: 0, bottom: 0.5 }}
                        onDragEnd={(_, info) => { if (info.offset.y > 120 || info.velocity.y > 600) requestClose(); }}
                        className={cn(
                            'relative isolate flex w-full flex-col overflow-hidden border-black/[0.08] bg-[#f7f7f3] text-gray-900 shadow-2xl dark:border-white/[0.1] dark:bg-[#0b0d12] dark:text-white',
                            phone
                                ? cn('rounded-t-[1.75rem] border-t', size === 'full' ? 'h-[calc(100dvh-env(safe-area-inset-top)-0.75rem)]' : 'max-h-[92dvh]')
                                : cn('max-h-[88dvh] rounded-[2rem] border shadow-[0_40px_120px_-30px_rgba(0,0,0,0.6)]', widths[width] || widths.md),
                            className
                        )}
                    >
                        {backdrop ? <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">{backdrop}</div> : <BrandLayers soft mark={false} />}
                        {phone && (
                            // The handle is the only drag target.
                            <div
                                className={cn('flex h-6 shrink-0 cursor-grab touch-none items-center justify-center active:cursor-grabbing', bleed ? 'absolute inset-x-0 top-0 z-30' : 'relative')}
                                onPointerDown={(e) => dismissible && drag.start(e)}
                            >
                                <span className={cn('h-1 w-10 rounded-full', bleed ? 'bg-white/80 shadow-[0_1px_4px_rgba(0,0,0,0.4)]' : 'bg-black/15 dark:bg-white/20')} />
                            </div>
                        )}
                        {bleed && dismissible && (
                            <button
                                type="button"
                                onClick={onClose}
                                aria-label="Close"
                                className="absolute right-3 top-3 z-30 flex h-10 w-10 items-center justify-center rounded-full bg-black/55 text-white ring-1 ring-inset ring-white/20 backdrop-blur-md transition-colors hover:bg-black/75"
                            >
                                <X size={18} />
                            </button>
                        )}
                        {!bleed && (header || title || dismissible) && (
                            <div className={cn('relative flex shrink-0 items-start justify-between gap-4 px-5 pb-3', phone ? 'pt-1' : 'px-7 pt-6')}>
                                {header ? <div className="min-w-0 flex-1">{header}</div> : (
                                    <div className="min-w-0">
                                        {title && <h2 className="font-heading text-[20px] font-extrabold tracking-[-0.02em]">{title}</h2>}
                                        {subtitle && <p className="mt-0.5 text-[13px] text-gray-500 dark:text-zinc-400">{subtitle}</p>}
                                    </div>
                                )}
                                {dismissible && (
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        aria-label="Close"
                                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/70 text-gray-600 ring-1 ring-inset ring-black/[0.08] transition-colors hover:text-gray-900 dark:bg-white/[0.08] dark:text-zinc-300 dark:ring-white/[0.12] dark:hover:text-white"
                                    >
                                        <X size={18} />
                                    </button>
                                )}
                            </div>
                        )}
                        <div className={cn('relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5 pt-1 [-webkit-overflow-scrolling:touch]', !phone && 'px-7 pb-7', bodyClassName)}>
                            {children}
                        </div>
                        {footer ? (
                            // Phones: a solid bar, since a live blur on a sliding sheet stutters on iPhone Safari.
                            <div className={cn('relative shrink-0 border-t border-black/[0.06] px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 dark:border-white/[0.08]', phone ? 'bg-[#f7f7f3] dark:bg-[#0b0d12]' : 'bg-[#f7f7f3]/85 px-7 pb-5 backdrop-blur-xl dark:bg-[#0b0d12]/85')}>
                                {footer}
                            </div>
                        ) : phone && <div className="h-[env(safe-area-inset-bottom)] shrink-0" />}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
};

export default Sheet;
