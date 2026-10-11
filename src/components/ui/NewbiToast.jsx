import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    CheckCircle2, XCircle, AlertTriangle, Info, X, ChevronRight,
    Bell, Megaphone, Ticket, MessageSquare, Gift, FileText, Zap, Users, Heart
} from 'lucide-react';
import { useStore } from '../../lib/store';
import { TOAST_LABELS } from '../../lib/toastCopy';
import { cn } from '../../lib/utils';

// One place, one look: every banner in the app (action feedback and incoming notifications)
// renders in this stack — top-centre on phones, top-right under the navbar on larger screens.

const TYPE_STYLES = {
    success: { icon: CheckCircle2, accent: 'bg-emerald-500', chip: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
    error: { icon: XCircle, accent: 'bg-red-500', chip: 'bg-red-500/10 text-red-600 dark:text-red-400' },
    warning: { icon: AlertTriangle, accent: 'bg-amber-500', chip: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
    info: { icon: Info, accent: 'bg-sky-500', chip: 'bg-sky-500/10 text-sky-600 dark:text-sky-400' },
};

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
            fresh.forEach(showNotificationToast);
        }
    }, [notifications, showNotificationToast]);
};

const ToastCard = ({ toast, paused, onDismiss }) => {
    const navigate = useNavigate();
    const reduceMotion = useReducedMotion();
    const markNotificationRead = useStore(state => state.markNotificationRead);
    const [imgError, setImgError] = useState(false);

    const remainingRef = useRef(toast.duration);
    const lastUpdateRef = useRef(toast.updatedAt);

    // Auto-dismiss that pauses while the stack is hovered/focused and restarts when the toast repeats.
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

    const isNotification = toast.kind === 'notification';
    const style = TYPE_STYLES[toast.type] || TYPE_STYLES.info;
    const Icon = isNotification ? getNotificationIcon(toast) : style.icon;
    const hasLink = isNotification && toast.link && toast.link.trim() !== '';

    const openNotification = () => {
        if (!isNotification) return;
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

    const handleAction = () => {
        try { toast.action?.onClick?.(); } finally { onDismiss(); }
    };

    return (
        <motion.li
            layout={!reduceMotion}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.94, transition: { duration: 0.15 } }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            drag="x"
            dragSnapToOrigin
            dragElastic={0.6}
            onDragEnd={(_, info) => {
                if (Math.abs(info.offset.x) > 90 || Math.abs(info.velocity.x) > 600) onDismiss();
            }}
            role={toast.type === 'error' ? 'alert' : 'status'}
            aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
            className={cn(
                'pointer-events-auto relative w-full overflow-hidden rounded-2xl touch-pan-y',
                'bg-white dark:bg-zinc-900 border border-black/[0.08] dark:border-white/[0.08]',
                'shadow-[0_12px_32px_-8px_rgba(0,0,0,0.25)] dark:shadow-[0_16px_40px_-8px_rgba(0,0,0,0.8)]',
                isNotification && 'cursor-pointer'
            )}
            onClick={isNotification ? openNotification : undefined}
        >
            {/* Type accent */}
            <span className={cn('absolute left-0 top-0 bottom-0 w-1', isNotification ? 'bg-neon-blue' : style.accent)} aria-hidden="true" />

            <div className="flex items-start gap-3 pl-4 pr-2 py-3">
                <div className={cn(
                    'mt-0.5 w-9 h-9 rounded-full flex items-center justify-center shrink-0 overflow-hidden',
                    isNotification ? 'bg-neon-blue/10 text-sky-600 dark:text-neon-blue' : style.chip
                )}>
                    {isNotification && toast.image && !imgError ? (
                        <img src={toast.image} alt="" className="w-full h-full object-cover" onError={() => setImgError(true)} />
                    ) : (
                        <Icon size={20} strokeWidth={2.25} aria-hidden="true" />
                    )}
                </div>

                <div className="flex-1 min-w-0 py-0.5">
                    <span className="sr-only">{isNotification ? 'New notification: ' : `${TOAST_LABELS[toast.type]}: `}</span>
                    {toast.title && (
                        <p className="text-[14px] font-semibold leading-snug text-gray-900 dark:text-white line-clamp-2">
                            {toast.title}
                        </p>
                    )}
                    {toast.message && (
                        <p className={cn(
                            'leading-snug break-words',
                            toast.title
                                ? 'mt-0.5 text-[13px] text-gray-600 dark:text-gray-400 line-clamp-3'
                                : 'text-[14px] font-medium text-gray-900 dark:text-gray-100'
                        )}>
                            {toast.message}
                            {toast.count > 1 && (
                                <span className="ml-1.5 inline-flex items-center px-1.5 rounded-full bg-black/[0.06] dark:bg-white/10 text-[11px] font-semibold text-gray-500 dark:text-gray-400 align-middle">
                                    ×{toast.count}
                                </span>
                            )}
                        </p>
                    )}
                    {toast.hint && (
                        <p className="mt-1 text-[12px] text-gray-500 dark:text-gray-400">{toast.hint}</p>
                    )}
                    {(toast.action || hasLink) && (
                        <div className="mt-2">
                            {toast.action ? (
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); handleAction(); }}
                                    className="text-[13px] font-semibold text-gray-900 dark:text-white underline underline-offset-4 decoration-gray-300 dark:decoration-white/30 hover:decoration-current"
                                >
                                    {toast.action.label}
                                </button>
                            ) : (
                                <span className="inline-flex items-center gap-0.5 text-[13px] font-semibold text-sky-600 dark:text-neon-blue">
                                    View <ChevronRight size={14} aria-hidden="true" />
                                </span>
                            )}
                        </div>
                    )}
                </div>

                <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onDismiss(); }}
                    className="shrink-0 w-8 h-8 -mt-0.5 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                    aria-label="Dismiss"
                >
                    <X size={16} />
                </button>
            </div>

            {/* Time remaining */}
            <span
                key={toast.updatedAt}
                aria-hidden="true"
                className={cn('absolute left-0 bottom-0 h-[2px] w-full origin-left opacity-60 animate-toast-progress', isNotification ? 'bg-neon-blue' : style.accent)}
                style={{ animationDuration: `${toast.duration}ms`, animationPlayState: paused ? 'paused' : 'running' }}
            />
        </motion.li>
    );
};

const NewbiToast = () => {
    const toasts = useStore(state => state.toasts);
    const removeToast = useStore(state => state.removeToast);
    const [hovered, setHovered] = useState(false);
    const [focused, setFocused] = useState(false);
    const [pageHidden, setPageHidden] = useState(typeof document !== 'undefined' && document.hidden);

    useIncomingNotificationToasts();

    useEffect(() => {
        const onVisibility = () => setPageHidden(document.hidden);
        document.addEventListener('visibilitychange', onVisibility);
        return () => document.removeEventListener('visibilitychange', onVisibility);
    }, []);

    // Stable per-id dismiss callbacks so timers aren't reset on every render.
    const dismissersRef = useRef(new Map());
    const getDismiss = (id) => {
        if (!dismissersRef.current.has(id)) {
            dismissersRef.current.set(id, () => {
                dismissersRef.current.delete(id);
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

    const paused = hovered || focused || pageHidden;

    return (
        <section
            aria-label="Notifications"
            className={cn(
                'pointer-events-none fixed z-[9999] inset-x-0 top-0 px-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] md:inset-x-auto md:right-6 md:px-0 md:pt-0',
                hasTopBanner ? 'md:top-[8rem]' : 'md:top-[6rem]'
            )}
        >
            <ol
                className="flex flex-col items-center gap-2 mx-auto w-full max-w-[420px] md:w-[380px]"
                onPointerEnter={(e) => { if (e.pointerType === 'mouse') setHovered(true); }}
                onPointerLeave={(e) => { if (e.pointerType === 'mouse') setHovered(false); }}
                onFocus={() => setFocused(true)}
                onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false); }}
            >
                <AnimatePresence initial={false}>
                    {toasts.map(toast => (
                        <ToastCard key={toast.id} toast={toast} paused={paused} onDismiss={getDismiss(toast.id)} />
                    ))}
                </AnimatePresence>
            </ol>
        </section>
    );
};

export default NewbiToast;
