import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    Check, X, AlertTriangle, Info, ChevronRight,
    Bell, Megaphone, Ticket, MessageSquare, Gift, FileText, Zap, Users, Heart
} from 'lucide-react';
import { useStore } from '../../lib/store';
import { TOAST_LABELS } from '../../lib/toastCopy';
import { cn } from '../../lib/utils';

// Liquid-glass banners in the style of iOS notifications.
// Every banner in the app (action feedback and incoming notifications) renders in this one stack:
// top of the screen on phones, top-right under the navbar on larger screens.
// Several banners collapse into a stack; hover (desktop) or tap (mobile) fans them out.
// Swipe up or sideways to dismiss.

const TYPE_STYLES = {
    success: { icon: Check, tile: 'from-emerald-400 to-emerald-600' },
    error: { icon: X, tile: 'from-rose-500 to-red-600' },
    warning: { icon: AlertTriangle, tile: 'from-amber-400 to-orange-500' },
    info: { icon: Info, tile: 'from-sky-400 to-blue-600' },
};
const NOTIFICATION_TILE = 'from-cyan-400 to-indigo-600';

const CATEGORY_ICONS = [
    [/volunteer/, Heart],
    [/gig|hiring/, Users],
    [/giveaway|winner/, Gift],
    [/campaign|task/, Zap],
    [/ticket|booking/, Ticket],
    [/message/, MessageSquare],
    [/blog|post/, FileText],
    [/announcement/, Megaphone],
];

const getNotificationIcon = (toast) => {
    const text = `${toast.category || ''} ${toast.title || ''}`.toLowerCase();
    const match = CATEGORY_ICONS.find(([pattern]) => pattern.test(text));
    return match ? match[1] : Bell;
};

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

const ToastCard = ({ toast, index, total, expanded, offset, frontHeight, paused, onDismiss, onHeight, onExpand }) => {
    const navigate = useNavigate();
    const reduceMotion = useReducedMotion();
    const markNotificationRead = useStore(state => state.markNotificationRead);
    const [imgError, setImgError] = useState(false);
    const contentRef = useRef(null);
    const draggedRef = useRef(false);

    useAutoDismiss(toast, paused, onDismiss);

    // Report natural height so the stack can lay itself out.
    useLayoutEffect(() => {
        const el = contentRef.current;
        if (!el) return;
        const report = () => onHeight(toast.id, el.offsetHeight);
        report();
        const observer = new ResizeObserver(report);
        observer.observe(el);
        return () => observer.disconnect();
    }, [toast.id, onHeight]);

    const isNotification = toast.kind === 'notification';
    const style = TYPE_STYLES[toast.type] || TYPE_STYLES.info;
    const Icon = isNotification ? getNotificationIcon(toast) : style.icon;
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
            className={cn('absolute inset-x-0 top-0', hiddenInStack ? 'pointer-events-none' : 'pointer-events-auto')}
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
                    'liquid-glass group rounded-[24px] md:rounded-[22px] overflow-hidden touch-none select-none',
                    (isNotification || (!expanded && total > 1)) && 'cursor-pointer'
                )}
                style={collapsedBehind && frontHeight ? { height: frontHeight } : undefined}
            >
                <div
                    ref={contentRef}
                    className={cn(
                        'relative z-[2] flex items-start gap-3 px-3.5 pt-3 pb-4 md:pb-3 md:pr-2.5 transition-opacity duration-200',
                        collapsedBehind && 'opacity-0'
                    )}
                >
                    {/* Icon tile */}
                    <div className={cn(
                        'liquid-glass-icon shrink-0 w-[38px] h-[38px] rounded-[11px] overflow-hidden flex items-center justify-center text-white bg-gradient-to-br',
                        isNotification ? NOTIFICATION_TILE : style.tile
                    )}>
                        {isNotification && toast.image && !imgError ? (
                            <img src={toast.image} alt="" className="w-full h-full object-cover" onError={() => setImgError(true)} draggable={false} />
                        ) : (
                            <Icon size={20} strokeWidth={2.6} aria-hidden="true" />
                        )}
                    </div>

                    <div className="flex-1 min-w-0 min-h-[38px] flex flex-col justify-center">
                        <span className="sr-only">{isNotification ? 'New notification: ' : `${TOAST_LABELS[toast.type]}: `}</span>

                        <div className="flex items-baseline gap-2">
                            <p className={cn(
                                'flex-1 min-w-0 text-[15px] md:text-[14px] leading-[1.3] font-semibold text-gray-950 dark:text-white tracking-[-0.01em]',
                                toast.title ? 'line-clamp-1' : 'line-clamp-3'
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

                    {/* Close: desktop only — on phones banners are swiped away */}
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onDismiss(); }}
                        className="hidden md:flex shrink-0 w-7 h-7 -mt-0.5 rounded-full items-center justify-center text-gray-500 dark:text-white/60 hover:text-gray-900 dark:hover:text-white hover:bg-black/[0.06] dark:hover:bg-white/10 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
                        aria-label="Dismiss"
                    >
                        <X size={15} />
                    </button>
                </div>

                {/* Grabber hint for swipe-to-dismiss on touch screens */}
                {isFront && (
                    <span className="md:hidden absolute z-[2] bottom-[5px] left-1/2 -translate-x-1/2 w-9 h-[4px] rounded-full bg-black/15 dark:bg-white/25" aria-hidden="true" />
                )}
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
    const [heights, setHeights] = useState({});
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

    const onHeight = useCallback((id, h) => {
        setHeights(prev => (prev[id] === h ? prev : { ...prev, [id]: h }));
    }, []);

    // Stable per-id dismiss callbacks so timers aren't reset on every render.
    const dismissersRef = useRef(new Map());
    const getDismiss = (id) => {
        if (!dismissersRef.current.has(id)) {
            dismissersRef.current.set(id, () => {
                dismissersRef.current.delete(id);
                setHeights(prev => {
                    const next = { ...prev };
                    delete next[id];
                    return next;
                });
                removeToast(id);
            });
        }
        return dismissersRef.current.get(id);
    };

    // Sit just under the floating navbar, which drops lower when a top banner is showing.
    const hasTopBanner = useStore(state =>
        (state.maintenanceState?.global && state.user?.role === 'developer') ||
        Boolean(state.announcements?.some(a => a.isPinned && a.id !== state.dismissedAnnouncementId))
    );

    const expanded = toasts.length > 1 && (hovered || focused || tappedOpen);
    const paused = hovered || focused || tappedOpen || pageHidden;

    // Layout: fanned-out offsets and total stack height.
    const offsets = [];
    let running = 0;
    toasts.forEach((t, i) => {
        offsets[i] = running;
        running += (heights[t.id] || 72) + GAP;
    });
    const frontHeight = toasts[0] ? heights[toasts[0].id] || 72 : 0;
    const stackHeight = toasts.length === 0
        ? 0
        : expanded
            ? running - GAP
            : frontHeight + Math.min(toasts.length - 1, MAX_STACKED - 1) * PEEK;

    return (
        <section
            aria-label="Notifications"
            className={cn(
                'pointer-events-none fixed z-[9999] inset-x-0 top-0 px-2 pt-[calc(env(safe-area-inset-top)+0.5rem)] md:inset-x-auto md:right-6 md:px-0 md:pt-0',
                hasTopBanner ? 'md:top-[8rem]' : 'md:top-[6rem]'
            )}
        >
            <motion.ol
                ref={stackRef}
                animate={{ height: stackHeight }}
                transition={SPRING}
                className="relative mx-auto w-full max-w-[440px] md:w-[372px]"
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
                            frontHeight={frontHeight}
                            paused={paused}
                            onDismiss={getDismiss(toast.id)}
                            onHeight={onHeight}
                            onExpand={() => setTappedOpen(true)}
                        />
                    ))}
                </AnimatePresence>
            </motion.ol>
        </section>
    );
};

export default NewbiToast;
