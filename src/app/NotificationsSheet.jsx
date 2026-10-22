import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import CheckCheck from 'lucide-react/dist/esm/icons/check-check';
import Bell from 'lucide-react/dist/esm/icons/bell';
import { cn } from '../lib/utils';
import { isPresent } from '../lib/present';
import { isNotificationForViewer } from '../lib/store/notifications';
import { useAppStore } from '../lib/store/appStore';
import { Sheet, Button } from '../components/app';
import { appPath, isAppHost, landingUrl } from './host';
import { legacyAppPath } from './redirects';
import AuthGate from './auth/AuthGate';
import { requestNotificationPermission } from '../lib/notifications';
import { useT } from '../i18n';

/* The bell's list: your notifications plus global announcements. */

// Push on this device: offered here, and the browser asks only after a tap on "Turn on".
const PushOffer = () => {
    const t = useT();
    const supported = typeof window !== 'undefined' && 'Notification' in window;
    const [permission, setPermission] = useState(() => (supported ? window.Notification.permission : 'unsupported'));
    const [busy, setBusy] = useState(false);
    if (permission !== 'default') return null;
    const turnOn = async () => {
        setBusy(true);
        await requestNotificationPermission();
        setBusy(false);
        setPermission(window.Notification.permission);
    };
    return (
        <div className="mb-4 flex items-center gap-3 rounded-2xl bg-black/[0.03] p-4 dark:bg-white/[0.04]">
            <Bell size={20} className="shrink-0 text-gray-500 dark:text-zinc-400" />
            <p className="min-w-0 flex-1 text-[14px] leading-snug text-gray-600 dark:text-zinc-400">{t('Get updates about your passes and campaigns on this device. You can turn them off any time.')}</p>
            <Button size="sm" onClick={turnOn} loading={busy}>{t('Turn on')}</Button>
        </div>
    );
};

const timeAgo = (value) => {
    const date = value ? new Date(value) : null;
    if (!date || Number.isNaN(date.getTime())) return null;
    return formatDistanceToNow(date, { addSuffix: true });
};

const NotificationsSheet = ({ open, onClose }) => {
    const t = useT();
    const navigate = useNavigate();
    const allNotifications = useAppStore(s => s.notifications);
    const isCreator = useAppStore(s => Boolean(s.profile?.capabilities?.creator || s.creatorProfile));
    // Creators-only notifications are hidden from everyone else.
    const notifications = useMemo(() => (allNotifications || []).filter(n => isNotificationForViewer(n, isCreator)), [allNotifications, isCreator]);
    const unreadCount = notifications.filter(n => !n.isRead).length;
    const markRead = useAppStore(s => s.markNotificationRead);
    const markAllRead = useAppStore(s => s.markAllNotificationsRead);

    const openItem = (n) => {
        if (!n.isRead) markRead(n.id);
        const link = n.link || n.url;
        if (!isPresent(link)) return;
        onClose();
        const [linkPath, linkQuery = ''] = link.split('#')[0].split('?');
        const legacy = legacyAppPath(linkPath, linkQuery ? `?${linkQuery}` : '');
        // Links to app.newbi.live (passes, tickets, campaigns) open inside this app, also on previews.
        const appLink = link.match(/^https?:\/\/app\.newbi\.live(\/[^#]*)?/i);
        if (appLink) navigate(appPath(appLink[1] || '/'));
        else if (/^https?:\/\//.test(link)) window.location.href = link;
        // In-app links stay in the app; everything else still lives on the landing site.
        else if (link.startsWith('/app/') || link === '/app') navigate(appPath(link.replace(/^\/app/, '') || '/'));
        // Old creator links (/creator-dashboard?campaignId=…, /campaign/:id) open their app page.
        else if (legacy) navigate(appPath(legacy));
        else if (/^\/(p|t|c|forms|community)(\/|$)/.test(link)) navigate(appPath(link));
        else if (isAppHost()) window.location.href = landingUrl(link);
        else navigate(link);
    };

    return (
        <Sheet
            open={open}
            onClose={onClose}
            title={t('Notifications')}
            header={(
                <div className="flex items-center justify-between gap-3 pr-1">
                    <h2 className="text-lg font-extrabold tracking-tight">{t('Notifications')}</h2>
                    {unreadCount > 0 && (
                        <Button size="sm" variant="ghost" icon={CheckCheck} onClick={() => markAllRead()}>{t('Mark all read')}</Button>
                    )}
                </div>
            )}
        >
            <AuthGate title={t('Your notifications')} message={t('Sign in to see updates about your passes, campaigns and giveaways.')}>
                <PushOffer />
                {notifications.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 py-12 text-center text-gray-500 dark:text-zinc-500">
                        <Bell size={28} />
                        <p className="text-[15px] font-semibold">{t('You’re all caught up.')}</p>
                    </div>
                ) : (
                    <ul className="-mx-2 space-y-1">
                        {notifications.map(n => (
                            <li key={n.id}>
                                <button
                                    type="button"
                                    onClick={() => openItem(n)}
                                    className={cn(
                                        'flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left transition-colors hover:bg-black/[0.03] dark:hover:bg-white/[0.04]',
                                        !n.isRead && 'bg-emerald-500/[0.06] dark:bg-neon-green/[0.05]'
                                    )}
                                >
                                    <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', n.isRead ? 'bg-transparent' : 'bg-neon-green')} />
                                    <span className="min-w-0 flex-1">
                                        {isPresent(n.title) && <span className="block text-[15px] font-bold leading-snug">{n.title}</span>}
                                        {isPresent(n.content || n.message) && <span className="mt-0.5 block text-[14px] leading-snug text-gray-600 dark:text-zinc-400">{n.content || n.message}</span>}
                                        {timeAgo(n.createdAt) && <span className="mt-1 block text-[12px] text-gray-400 dark:text-zinc-500">{timeAgo(n.createdAt)}</span>}
                                    </span>
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </AuthGate>
        </Sheet>
    );
};

export default NotificationsSheet;
