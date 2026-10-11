import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { X, ChevronRight } from 'lucide-react';
import { useStore } from '../../lib/store';
import { TOAST_LABELS } from '../../lib/toastCopy';
import { cn } from '../../lib/utils';
import { StatusIcon, NotificationIcon } from './NotificationIcon';

// Liquid-glass banners in the style of iOS / Dynamic Island alerts.
// Every banner in the app (action feedback and incoming notifications) drops in at the top centre
// of the screen. Short messages render as a compact pill; longer ones as a full card.
// Several banners collapse into a stack; hover (desktop) or tap (mobile) fans them out.
// Swipe up or sideways to dismiss.

const GAP = 8;               // space between banners when fanned out
const PEEK = 9;              // how much each stacked banner peeks out below the one in front
const MAX_STACKED = 3;       // banners visible in the collapsed stack
const SPRING = { type: 'spring', stiffness: 420, damping: 30, mass: 0.9 };

// Only notifications created in the last couple of minutes pop up; older unread ones wait in the bell.
const FRESH_WINDOW_MS = 2 * 60 * 1000;
const MAX_INDIVIDUAL_NOTIFICATIONS = 2;

const useIncomingNotificationToasts = () => {
    const notifications = useStore(state => state.notifications);
    const showNotificationToast = useStore(state => state.showNotificationToast);
    const seenRef = useRef(new Set());

    useEffect(() => {
        const now = Date.now();
        const fresh = notifications.filter(n => {
            if (seenRef.current.has(n.id) || n.isRead) return false;
            const created = n.createdAt ? new Date(n.createdAt).getTime() : 0;
            return now - created < FRESH_WINDOW_MS;
        });
        notifications.forEach(n => seenRef.current.add(n.id));

        if (fresh.length > MAX_INDIVIDUAL_NOTIFICATIONS) {
            showNotificationToast({
                id: `batch-${now}`,
                title: `You have ${fresh.length} new notifications`,
                content: 'Tap the bell icon to see them all.',
            });
        } else {
            fresh.forEach(n => showNotificationToast(n));
        }
    }, [notifications, showNotificationToast]);
};

// Auto-dismiss that pauses while the stack is in use and restarts when the toast repeats.
const useAutoDismiss = (toast, paused, onDismiss) => {
    const remainingRef = useRef(toast.duration);
    const lastUpdateRef = useRef(toast.updatedAt);

    useEffect(() => {
        if (lastUpdateRef.current !== toast.updatedAt) {
            lastUpdateRef.current = toast.updatedAt;
            remainingRef.current = toast.duration;
        }
        if (paused) return;
        const startedAt = Date.now();
        const timer = setTimeout(onDismiss, Math.max(remainingRef.current, 0));
        return () => {
            clearTimeout(timer);
            remainingRef.current -= Date.now() - startedAt;
        };
    }, [paused, toast.updatedAt, toast.duration, onDismiss]);
};

const ToastCard = ({ toast, index, total, expanded, offset, frontSize, paused, onDismiss, onSize, onExpand }) => {
    const navigate = useNavigate();
    const reduceMotion = useReducedMotion();
    const markNotificationRead = useStore(state => state.markNotificationRead);
    const contentRef = useRef(null);
    const cardRef = useRef(null);
    const draggedRef = useRef(false);

    useAutoDismiss(toast, paused, onDismiss);

    // Report natural size so the stack can lay itself out.
    useLayoutEffect(() => {
        const content = contentRef.current;
        const card = cardRef.current;
        if (!content || !card) return;
        const report = () => onSize(toast.id, { h: content.offsetHeight, w: card.offsetWidth });
        report();
        const observer = new ResizeObserver(report);
        observer.observe(content);
        observer.observe(card);
        return () => observer.disconnect();
    }, [toast.id, onSize]);

    const isNotification = toast.kind === 'notification';
    // Short, single-line feedback becomes a compact pill.
    const isPill = !isNotification && !toast.title && !toast.hint && !toast.action && String(toast.message || '').length <= 46;
    const hasLink = isNotification && toast.link && toast.link.trim() !== '';
    const isFront = index === 0;
    const collapsedBehind = !expanded && !isFront;
    const hiddenInStack = !expanded && index >= MAX_STACKED;

    const openNotification = () => {
        if (toast.notificationId && !String(toast.notificationId).startsWith('batch-')) {
            markNotificationRead(toast.notificationId);
        }
        if (hasLink) {
            const link = toast.link.trim();
            if (/^https?:\/\//i.test(link)) window.open(link, '_blank', 'noopener,noreferrer');
            else navigate(link);
        }
        onDismiss();
    };

    const handleTap = () => {
        if (draggedRef.current) return;
        // A tap on a collapsed stack fans it out first, like iOS.
        if (!expanded && total > 1) { onExpand(); return; }
        if (isNotification) openNotification();
        else if (!toast.action) onDismiss();
    };

    const handleAction = () => {
        try { toast.action?.onClick?.(); } finally { onDismiss(); }
    };

    // Position in the stack.
    const stackY = expanded ? offset : Math.min(index, MAX_STACKED - 1) * PEEK;
    const stackScale = expanded ? 1 : 1 - Math.min(index, MAX_STACKED - 1) * 0.05;
    const stackOpacity = hiddenInStack ? 0 : 1;

    return (
        <motion.li
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -72, scale: 0.92 }}
            animate={{ opacity: stackOpacity, y: stackY, scale: stackScale }}
            exit={reduceMotion
                ? { opacity: 0 }
                : { opacity: 0, y: stackY - 48, scale: 0.94, transition: { duration: 0.22, ease: [0.4, 0, 1, 1] } }}
            transition={reduceMotion ? { duration: 0.15 } : SPRING}
            style={{ zIndex: total - index, transformOrigin: 'top center' }}
            className="absolute inset-x-0 top-0 flex justify-center pointer-events-none"
            role={toast.type === 'error' ? 'alert' : 'status'}
            aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
            aria-hidden={hiddenInStack || undefined}
        >
            <motion.div
                drag={expanded || isFront}
                dragDirectionLock
                dragSnapToOrigin
                dragConstraints={{ top: 0, bottom: 0, left: 0, right: 0 }}
                dragElastic={{ top: 0.7, bottom: 0.08, left: 0.7, right: 0.7 }}
                onDragStart={() => { draggedRef.current = true; }}
                onDragEnd={(_, info) => {
                    const swipedUp = info.offset.y < -36 || info.velocity.y < -450;
                    const swipedSide = Math.abs(info.offset.x) > 90 || Math.abs(info.velocity.x) > 650;
                    if (swipedUp || swipedSide) onDismiss();
                    setTimeout(() => { draggedRef.current = false; }, 0);
                }}
                onClick={handleTap}
                whileTap={reduceMotion ? undefined : { scale: 0.985 }}
                className={cn(
                    'liquid-glass group overflow-hidden touch-none select-none cursor-pointer',
                    hiddenInStack ? 'pointer-events-none' : 'pointer-events-auto',
                    isPill ? 'w-fit max-w-full rounded-full' : 'w-full rounded-[24px] md:rounded-[22px]'
                )}
                ref={cardRef}
                style={collapsedBehind && frontSize ? { height: frontSize.h, width: frontSize.w } : undefined}
            >
                <div
                    ref={contentRef}
                    className={cn(
                        'relative z-[2] flex transition-opacity duration-200',
                        isPill ? 'items-center gap-2.5 pl-2 pr-5 py-2' : 'items-start gap-3 px-3.5 py-3 md:pr-2.5',
                        collapsedBehind && 'opacity-0'
                    )}
                >
                    {isNotification
                        ? <NotificationIcon notification={{ type: toast.category, title: toast.title, image: toast.image }} size={36} />
                        : <StatusIcon type={toast.type} size={isPill ? 30 : 36} />}

                    <div className={cn('min-w-0 flex flex-col justify-center', isPill ? 'flex-initial' : 'flex-1 min-h-[36px]')}>
                        <span className="sr-only">{isNotification ? 'New notification: ' : `${TOAST_LABELS[toast.type]}: `}</span>

                        <div className="flex items-baseline gap-2">
                            <p className={cn(
                                'min-w-0 text-[15px] md:text-[14px] leading-[1.3] font-semibold text-gray-950 dark:text-white tracking-[-0.01em]',
                                isPill ? 'truncate' : 'flex-1',
                                !isPill && (toast.title ? 'line-clamp-1' : 'line-clamp-3')
                            )}>
                                {toast.title || toast.message}
                            </p>
                            {toast.count > 1 && (
                                <span className="shrink-0 px-1.5 py-px rounded-full bg-black/[0.07] dark:bg-white/15 text-[11px] font-semibold text-gray-600 dark:text-white/70 tabular-nums">
                                    ×{toast.count}
                                </span>
                            )}
                            {isNotification && (
                                <span className="shrink-0 text-[12px] text-gray-500 dark:text-white/50">now</span>
                            )}
                        </div>

                        {toast.title && toast.message && (
                            <p className="mt-0.5 text-[14px] md:text-[13px] leading-[1.35] text-gray-700 dark:text-white/75 line-clamp-3 break-words">
                                {toast.message}
                            </p>
                        )}

                        {toast.hint && (
                            <p className="mt-1 text-[12.5px] md:text-[12px] text-gray-500 dark:text-white/55">{toast.hint}</p>
                        )}

                        {(toast.action || hasLink) && (
                            <div className="mt-2.5">
                                {toast.action ? (
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); handleAction(); }}
                                        className="inline-flex items-center h-8 px-3.5 rounded-full bg-white/60 dark:bg-white/[0.12] border border-white/70 dark:border-white/15 text-[13px] font-semibold text-gray-900 dark:text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] active:scale-95 transition-transform"
                                    >
                                        {toast.action.label}
                                    </button>
                                ) : (
                                    <span className="inline-flex items-center gap-0.5 text-[13px] font-semibold text-blue-600 dark:text-sky-300">
                                        Open <ChevronRight size={14} aria-hidden="true" />
                                    </span>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Close: desktop cards only — pills and phone banners are tapped or swiped away */}
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onDismiss(); }}
                        className={cn(
                            'hidden shrink-0 w-7 h-7 -mt-0.5 rounded-full items-center justify-center text-gray-500 dark:text-white/60 hover:text-gray-900 dark:hover:text-white hover:bg-black/[0.06] dark:hover:bg-white/10 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity',
                            !isPill && 'md:flex'
                        )}
                        aria-label="Dismiss"
                    >
                        <X size={15} />
                    </button>
                </div>

            </motion.div>
        </motion.li>
    );
};

const NewbiToast = () => {
    const toasts = useStore(state => state.toasts);
    const removeToast = useStore(state => state.removeToast);
    const [hovered, setHovered] = useState(false);
    const [focused, setFocused] = useState(false);
    const [tappedOpen, setTappedOpen] = useState(false);
    const [pageHidden, setPageHidden] = useState(typeof document !== 'undefined' && document.hidden);
    const [sizes, setSizes] = useState({});
    const stackRef = useRef(null);

    useIncomingNotificationToasts();

    useEffect(() => {
        const onVisibility = () => setPageHidden(document.hidden);
        document.addEventListener('visibilitychange', onVisibility);
        return () => document.removeEventListener('visibilitychange', onVisibility);
    }, []);

    // Tapping anywhere outside a fanned-out stack collapses it again.
    useEffect(() => {
        if (!tappedOpen) return;
        const onPointerDown = (e) => {
            if (stackRef.current && !stackRef.current.contains(e.target)) setTappedOpen(false);
        };
        document.addEventListener('pointerdown', onPointerDown);
        return () => document.removeEventListener('pointerdown', onPointerDown);
    }, [tappedOpen]);

    useEffect(() => {
        if (toasts.length <= 1) setTappedOpen(false);
    }, [toasts.length]);

    const onSize = useCallback((id, size) => {
        setSizes(prev => (prev[id]?.h === size.h && prev[id]?.w === size.w ? prev : { ...prev, [id]: size }));
    }, []);

    // Stable per-id dismiss callbacks so timers aren't reset on every render.
    const dismissersRef = useRef(new Map());
    const getDismiss = (id) => {
        if (!dismissersRef.current.has(id)) {
            dismissersRef.current.set(id, () => {
                dismissersRef.current.delete(id);
                setSizes(prev => {
                    const next = { ...prev };
                    delete next[id];
                    return next;
                });
                removeToast(id);
            });
        }
        return dismissersRef.current.get(id);
    };

    const expanded = toasts.length > 1 && (hovered || focused || tappedOpen);
    const paused = hovered || focused || tappedOpen || pageHidden;

    // Layout: fanned-out offsets and total stack height.
    const offsets = [];
    let running = 0;
    toasts.forEach((t, i) => {
        offsets[i] = running;
        running += (sizes[t.id]?.h || 56) + GAP;
    });
    const frontSize = toasts[0] ? sizes[toasts[0].id] : null;
    const frontHeight = frontSize?.h || 56;
    const stackHeight = toasts.length === 0
        ? 0
        : expanded
            ? running - GAP
            : frontHeight + Math.min(toasts.length - 1, MAX_STACKED - 1) * PEEK;

    return (
        <section
            aria-label="Notifications"
            className="pointer-events-none fixed z-[9999] inset-x-0 top-0 px-3 pt-[calc(env(safe-area-inset-top)+0.625rem)] md:pt-4"
        >
            <motion.ol
                ref={stackRef}
                animate={{ height: stackHeight }}
                transition={SPRING}
                className="relative mx-auto w-full max-w-[420px]"
                onPointerEnter={(e) => { if (e.pointerType === 'mouse') setHovered(true); }}
                onPointerLeave={(e) => { if (e.pointerType === 'mouse') setHovered(false); }}
                onFocus={() => setFocused(true)}
                onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false); }}
                onKeyDown={(e) => { if (e.key === 'Escape' && toasts[0]) getDismiss(toasts[0].id)(); }}
            >
                <AnimatePresence initial={false}>
                    {toasts.map((toast, index) => (
                        <ToastCard
                            key={toast.id}
                            toast={toast}
                            index={index}
                            total={toasts.length}
                            expanded={expanded}
                            offset={offsets[index]}
                            frontSize={frontSize}
                            paused={paused}
                            onDismiss={getDismiss(toast.id)}
                            onSize={onSize}
                            onExpand={() => setTappedOpen(true)}
                        />
                    ))}
                </AnimatePresence>
            </motion.ol>
        </section>
    );
};

export default NewbiToast;
