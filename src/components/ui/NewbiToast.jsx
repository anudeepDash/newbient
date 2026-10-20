import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { X, ChevronRight } from 'lucide-react';
import { useStore } from '../../lib/store';
import { TOAST_LABELS, TOAST_EYEBROWS } from '../../lib/toastCopy';
import { useT } from '../../i18n';
import newbiIcon from '../../assets/logo/newbi-icon.svg';
import { cn } from '../../lib/utils';
import { NotificationIcon } from './NotificationIcon';

// Banners in the app's "N." card style: a solid card with the brand's glowing dot,
// a mono eyebrow label, a soft corner glow and dot grid tinted by the tone.
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

// Per tone: the dot, the eyebrow colour and the corner glow (light, dark).
const TONE_STYLES = {
    success: {
        dot: 'bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.16),0_0_10px_rgba(16,185,129,0.55)] dark:bg-neon-green dark:shadow-[0_0_0_3px_rgba(57,255,20,0.14),0_0_12px_rgba(57,255,20,0.7)]',
        ping: 'bg-emerald-500 dark:bg-neon-green',
        label: 'text-emerald-700 dark:text-neon-green',
        glow: ['rgba(57,255,20,0.22)', 'rgba(57,255,20,0.16)'],
    },
    error: {
        dot: 'bg-red-500 shadow-[0_0_0_3px_rgba(239,68,68,0.16),0_0_10px_rgba(239,68,68,0.6)]',
        ping: 'bg-red-500',
        label: 'text-red-600 dark:text-red-400',
        glow: ['rgba(239,68,68,0.16)', 'rgba(239,68,68,0.18)'],
    },
    warning: {
        dot: 'bg-amber-400 shadow-[0_0_0_3px_rgba(251,191,36,0.18),0_0_10px_rgba(251,191,36,0.6)]',
        ping: 'bg-amber-400',
        label: 'text-amber-700 dark:text-amber-300',
        glow: ['rgba(251,191,36,0.20)', 'rgba(251,191,36,0.15)'],
    },
    info: {
        dot: 'bg-sky-500 shadow-[0_0_0_3px_rgba(14,165,233,0.16),0_0_10px_rgba(14,165,233,0.55)] dark:bg-sky-400',
        ping: 'bg-sky-500 dark:bg-sky-400',
        label: 'text-sky-700 dark:text-sky-300',
        glow: ['rgba(14,165,233,0.16)', 'rgba(56,189,248,0.15)'],
    },
};

const DOTS = 'radial-gradient(currentColor 1px, transparent 1.2px)';
const FADE = 'linear-gradient(to left, black 0%, transparent 70%)';
const glowFrom = (c) => `radial-gradient(90% 120% at 100% 0%, ${c} 0%, transparent 65%)`;

// The brand dot: it pings once when the banner lands.
const Dot = ({ tone }) => {
    const reduceMotion = useReducedMotion();
    const s = TONE_STYLES[tone];
    return (
        <span aria-hidden="true" className="relative inline-flex h-2 w-2 shrink-0">
            {!reduceMotion && (
                <motion.span
                    className={cn('absolute inset-0 rounded-full', s.ping)}
                    initial={{ scale: 1, opacity: 0.7 }}
                    animate={{ scale: 3, opacity: 0 }}
                    transition={{ delay: 0.15, duration: 0.9, ease: 'easeOut' }}
                />
            )}
            <span className={cn('relative h-2 w-2 rounded-full', s.dot)} />
        </span>
    );
};

const Count = ({ n }) => (
    <span className="shrink-0 rounded-full bg-black/[0.06] px-1.5 py-px font-mono text-[10.5px] font-bold tabular-nums text-gray-600 dark:bg-white/10 dark:text-zinc-300">×{n}</span>
);

// Background: tinted corner glow, a faint dot grid and the small faded N. mark, as on the app's notice cards.
const ToastLayers = ({ tone }) => {
    const [light, dark] = TONE_STYLES[tone].glow;
    return (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[inherit]">
            <div className="absolute inset-0 dark:hidden" style={{ background: glowFrom(light) }} />
            <div className="absolute inset-0 hidden dark:block" style={{ background: glowFrom(dark) }} />
            <div
                className="absolute inset-0 text-emerald-900/[0.10] dark:text-white/[0.06]"
                style={{ backgroundImage: DOTS, backgroundSize: '14px 14px', WebkitMaskImage: FADE, maskImage: FADE }}
            />
            <img src={newbiIcon} alt="" className="absolute -bottom-5 -right-3 w-20 rotate-[-8deg] opacity-[0.06] dark:opacity-[0.08]" />
        </div>
    );
};

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
    const t = useT();
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
    const tone = isNotification ? 'success' : (TONE_STYLES[toast.type] ? toast.type : 'info');
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
                    'group relative isolate overflow-hidden touch-none select-none cursor-pointer ring-1 ring-inset backdrop-blur-xl backdrop-saturate-150',
                    'bg-white/[0.92] text-gray-900 ring-black/[0.07] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_18px_44px_-18px_rgba(15,23,42,0.35)]',
                    'dark:bg-[#0c0e11]/[0.92] dark:text-white dark:ring-white/[0.1] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_22px_50px_-18px_rgba(0,0,0,0.9)]',
                    hiddenInStack ? 'pointer-events-none' : 'pointer-events-auto',
                    isPill ? 'w-fit max-w-full rounded-full' : 'w-full rounded-[22px]'
                )}
                ref={cardRef}
                style={collapsedBehind && frontSize ? { height: frontSize.h, width: frontSize.w } : undefined}
            >
                {!isPill && <ToastLayers tone={tone} />}

                {isPill ? (
                    <div ref={contentRef} className={cn('flex items-center gap-2.5 py-2.5 pl-4 pr-5 transition-opacity duration-200', collapsedBehind && 'opacity-0')}>
                        <span className="sr-only">{`${TOAST_LABELS[toast.type]}: `}</span>
                        <Dot tone={tone} />
                        <p className="min-w-0 truncate text-[14px] font-bold leading-tight tracking-[-0.01em]">{toast.message}</p>
                        {toast.count > 1 && <Count n={toast.count} />}
                    </div>
                ) : (
                    <div ref={contentRef} className={cn('flex items-start gap-3 px-4 pb-3.5 pt-3 transition-opacity duration-200', collapsedBehind && 'opacity-0')}>
                        {isNotification && (
                            <NotificationIcon notification={{ type: toast.category, title: toast.title, image: toast.image }} size={38} />
                        )}

                        <div className="min-w-0 flex-1">
                            <span className="sr-only">{isNotification ? 'New notification: ' : `${TOAST_LABELS[toast.type]}: `}</span>

                            {/* Eyebrow: the brand dot and a short label, like the app's section headers */}
                            <div className="flex h-6 items-center gap-2">
                                <Dot tone={tone} />
                                <span aria-hidden="true" className={cn('font-mono text-[10.5px] font-bold uppercase tracking-[0.2em]', TONE_STYLES[tone].label)}>
                                    {isNotification ? t('New') : TOAST_EYEBROWS[toast.type]}
                                </span>
                                {isNotification && <span className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-gray-400 dark:text-zinc-500">· {t('now')}</span>}
                                {toast.count > 1 && <Count n={toast.count} />}
                                {/* Close: desktop only — on phones banners are tapped or swiped away */}
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); onDismiss(); }}
                                    className="ml-auto -mr-1.5 hidden h-6 w-6 shrink-0 items-center justify-center rounded-full text-gray-400 opacity-0 transition-opacity hover:bg-black/[0.06] hover:text-gray-900 focus-visible:opacity-100 group-hover:opacity-100 dark:text-zinc-500 dark:hover:bg-white/10 dark:hover:text-white md:flex"
                                    aria-label="Dismiss"
                                >
                                    <X size={14} />
                                </button>
                            </div>

                            <p className={cn(
                                'mt-1 text-[15px] font-bold leading-snug tracking-[-0.01em] text-gray-950 dark:text-white break-words',
                                toast.title ? 'line-clamp-2' : 'line-clamp-3'
                            )}>
                                {toast.title || toast.message}
                            </p>

                            {toast.title && toast.message && (
                                <p className="mt-0.5 text-[14px] leading-snug text-gray-600 dark:text-zinc-300 line-clamp-3 break-words">
                                    {toast.message}
                                </p>
                            )}

                            {toast.hint && (
                                <p className="mt-1.5 text-[12.5px] leading-snug text-gray-500 dark:text-zinc-400 break-words">{toast.hint}</p>
                            )}

                            {(toast.action || hasLink) && (
                                <div className="mt-3">
                                    {toast.action ? (
                                        <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); handleAction(); }}
                                            className="inline-flex h-8 items-center rounded-full bg-gray-900 px-4 text-[13px] font-bold text-white transition-transform active:scale-95 dark:bg-white dark:text-black"
                                        >
                                            {toast.action.label}
                                        </button>
                                    ) : (
                                        <span className="inline-flex items-center gap-0.5 text-[13px] font-bold text-emerald-700 dark:text-neon-green">
                                            {t('Open')} <ChevronRight size={14} aria-hidden="true" />
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
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
