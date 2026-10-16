import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useDragControls } from 'framer-motion';
import X from 'lucide-react/dist/esm/icons/x';
import { cn } from '../../lib/utils';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import newbiIcon from '../../assets/logo/newbi-icon.svg';

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
 * backdrop: an element painted behind the header and body (e.g. <AmbientBackdrop/>).
 * floatingHeader: the close button (and header) float over the top of the
 *   body instead of taking a row, for sheets that open on a full-bleed image.
 * watermark: the faded "N." mark off the bottom-right corner (default on).
 */

const MOBILE_QUERY = '(max-width: 767px)';
const stack = [];

const useIsPhone = () => {
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
    floatingHeader = false,
    watermark = true,
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
    const widths = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };

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
                            'relative flex w-full flex-col overflow-hidden border-black/[0.08] bg-white text-gray-900 shadow-2xl dark:border-white/[0.08] dark:bg-[#0d0f15] dark:text-white',
                            phone
                                ? cn('rounded-t-[1.75rem] border-t', size === 'full' ? 'h-[calc(100dvh-env(safe-area-inset-top)-0.75rem)]' : 'max-h-[92dvh]')
                                : cn('max-h-[85dvh] rounded-3xl border', widths[width] || widths.md),
                            className
                        )}
                    >
                        {watermark && (
                            <img
                                aria-hidden="true"
                                src={newbiIcon}
                                alt=""
                                className="pointer-events-none absolute -right-10 bottom-16 w-56 rotate-[-8deg] select-none opacity-[0.05] sm:w-64 dark:opacity-[0.07]"
                            />
                        )}
                        {backdrop && <div aria-hidden="true" className="pointer-events-none absolute inset-0">{backdrop}</div>}
                        {phone && (
                            // The handle is the only drag target.
                            <div
                                className={cn(
                                    'flex h-6 shrink-0 cursor-grab touch-none items-center justify-center active:cursor-grabbing',
                                    floatingHeader ? 'absolute inset-x-0 top-0 z-20' : 'relative'
                                )}
                                onPointerDown={(e) => dismissible && drag.start(e)}
                            >
                                <span className={cn('h-1 w-10 rounded-full', floatingHeader ? 'bg-white/70 shadow-sm' : 'bg-black/15 dark:bg-white/20')} />
                            </div>
                        )}
                        {(header || title || dismissible) && (
                            <div className={cn(
                                'flex shrink-0 items-start justify-between gap-4 px-5 pb-3',
                                floatingHeader ? 'pointer-events-none absolute inset-x-0 top-0 z-10 pt-6 sm:pt-4 [&>*]:pointer-events-auto' : cn('relative', phone ? 'pt-1' : 'pt-5')
                            )}>
                                {header ? <div className="min-w-0 flex-1">{header}</div> : (
                                    <div className="min-w-0">
                                        {title && <h2 className="text-lg font-extrabold tracking-tight">{title}</h2>}
                                        {subtitle && <p className="mt-0.5 text-[13px] text-gray-500 dark:text-zinc-400">{subtitle}</p>}
                                    </div>
                                )}
                                {dismissible && (
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        aria-label="Close"
                                        className={cn(
                                            'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                                            floatingHeader
                                                ? 'bg-black/55 text-white shadow-md ring-1 ring-white/20 hover:bg-black/70'
                                                : 'bg-black/5 text-gray-500 hover:text-gray-900 dark:bg-white/10 dark:text-zinc-400 dark:hover:text-white'
                                        )}
                                    >
                                        <X size={18} />
                                    </button>
                                )}
                            </div>
                        )}
                        <div className={cn('relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5 pt-1 [-webkit-overflow-scrolling:touch]', bodyClassName)}>
                            {children}
                        </div>
                        {footer ? (
                            <div className="relative shrink-0 border-t border-black/[0.06] bg-white px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 dark:border-white/[0.06] dark:bg-[#0d0f15]">
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
