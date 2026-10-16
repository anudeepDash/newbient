import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import Bell from 'lucide-react/dist/esm/icons/bell';
import Sun from 'lucide-react/dist/esm/icons/sun';
import Moon from 'lucide-react/dist/esm/icons/moon';
import { cn } from '../lib/utils';
import { useTheme } from '../hooks/useTheme';
import { useSafariChrome } from '../hooks/useSafariChrome';
import { useAppStore, useAppSession, hasCapability } from '../lib/store/appStore';
import { visibleTabs, moduleForPath } from './modules';
import { appPath, stripAppBase } from './host';
import { AuthResumer } from './auth/AuthGate';
import NotificationsSheet from './NotificationsSheet';
import SignInSheet from './auth/SignInSheet';
import newbiLogo from '../assets/logo/newbi-logo.svg';

/*
 * The app shell (app.newbi.live, or /app on localhost).
 *
 * Phones: a top bar (logo, notification bell) and a floating glass pill of
 * tabs, both clear of the notch and home bar; only the active tab shows its
 * label. Desktop: a left rail. Tabs come from the module registry
 * (modules.js). The pill is the one live blur in the shell; the top bar is
 * solid, so iPhone Safari never stacks blur layers.
 */

// The unified newbi.live logo (outlined, so one file works on light and dark).
const Logo = ({ className }) => (
    <img src={newbiLogo} alt="Newbi" width="1433" height="697" className={cn('w-auto', className)} />
);

const BellButton = ({ count, onClick, className }) => (
    <button
        type="button"
        onClick={onClick}
        aria-label={count ? `Notifications, ${count} unread` : 'Notifications'}
        className={cn('relative flex h-11 w-11 items-center justify-center rounded-xl text-gray-700 transition-colors hover:bg-black/[0.04] active:bg-black/5 dark:text-zinc-300 dark:hover:bg-white/[0.06] dark:active:bg-white/10', className)}
    >
        <Bell size={20} />
        {count > 0 && (
            <span className="absolute right-1.5 top-1.5 min-w-[18px] rounded-full bg-neon-pink px-1 text-center text-[10px] font-black leading-[18px] text-black ring-2 ring-[#f6f7f9] dark:ring-[#050608]">
                {count > 9 ? '9+' : count}
            </span>
        )}
    </button>
);

const Avatar = ({ profile, authUser, size = 'h-9 w-9' }) => {
    const photo = profile?.photoURL || authUser?.photoURL;
    const initial = (profile?.name || authUser?.displayName || authUser?.email || '?').charAt(0).toUpperCase();
    return (
        <span className={cn('flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-neon-green/15 text-sm font-black text-emerald-700 dark:text-neon-green', size)}>
            {photo ? <img src={photo} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" /> : initial}
        </span>
    );
};

const PageFallback = () => (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-6 lg:px-8">
        <div className="h-8 w-40 animate-pulse rounded-xl bg-black/[0.05] dark:bg-white/[0.05]" />
        <div className="aspect-video animate-pulse rounded-3xl bg-black/[0.04] dark:bg-white/[0.04]" />
    </div>
);

const AppLayout = () => {
    const location = useLocation();
    const path = stripAppBase(location.pathname);
    const authUser = useAppStore(s => s.authUser);
    const profile = useAppStore(s => s.profile);
    const unreadCount = useAppStore(s => (s.authUser ? s.unreadCount : 0));
    const isCreator = useAppStore(s => hasCapability(s, 'creator'));
    const isCampus = useAppStore(s => hasCapability(s, 'campus'));
    const { isDark, toggleTheme } = useTheme();
    const [bellOpen, setBellOpen] = useState(false);

    useAppSession();
    useSafariChrome(location.pathname);

    // Page colour behind everything (Safari overscroll, the status bar), and the
    // app's manifest and home-screen icon, so "Add to Home Screen" installs the app.
    useEffect(() => {
        const root = document.documentElement;
        root.classList.add('app-route');
        const swaps = [
            ['meta[name="apple-mobile-web-app-title"]', 'content', 'Newbi'],
            ['link[rel="manifest"]', 'href', '/app.webmanifest'],
            ['link[rel="apple-touch-icon"]', 'href', '/brand/newbi-icon-app-180.png'],
        ].map(([selector, attr, value]) => {
            const el = document.querySelector(selector);
            const previous = el?.getAttribute(attr);
            if (el) el.setAttribute(attr, value);
            return () => { if (el && previous != null) el.setAttribute(attr, previous); };
        });
        return () => {
            root.classList.remove('app-route');
            swaps.forEach(restore => restore());
        };
    }, []);

    useEffect(() => { setBellOpen(false); }, [location.pathname]);

    const tabs = useMemo(() => visibleTabs(c => ({ creator: isCreator, campus: isCampus })[c] || false), [isCreator, isCampus]);
    const activeModule = moduleForPath(path);

    return (
        <div className="min-h-dvh bg-[#f6f7f9] text-gray-900 dark:bg-[#050608] dark:text-white">
            <AuthResumer />

            {/* ── Desktop left rail ── */}
            <aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] flex-col border-r border-black/[0.06] bg-white dark:border-white/[0.06] dark:bg-[#0a0b10] lg:flex">
                <div className="flex h-16 shrink-0 items-center justify-between px-5">
                    <Link to={appPath('/')} aria-label="Newbi home"><Logo className="h-8" /></Link>
                    <BellButton count={unreadCount} onClick={() => setBellOpen(true)} className="h-10 w-10" />
                </div>
                <nav aria-label="App" className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
                    {tabs.map(({ module, locked, label }) => {
                        const Icon = module.tab.icon;
                        const active = activeModule?.id === module.id;
                        return (
                            <Link
                                key={module.id}
                                to={appPath(module.path)}
                                aria-current={active ? 'page' : undefined}
                                className={cn(
                                    'relative flex h-11 items-center gap-3 rounded-xl px-3 text-[14px] font-semibold transition-colors',
                                    active
                                        ? 'bg-black/[0.05] text-gray-900 dark:bg-white/[0.07] dark:text-white'
                                        : 'text-gray-600 hover:bg-black/[0.03] hover:text-gray-900 dark:text-zinc-400 dark:hover:bg-white/[0.04] dark:hover:text-white'
                                )}
                            >
                                {active && <span className="absolute -left-3 bottom-2 top-2 w-1 rounded-r-full bg-neon-green" />}
                                <Icon size={18} strokeWidth={active ? 2.3 : 1.9} className={active ? 'text-emerald-600 dark:text-neon-green' : undefined} />
                                <span className="truncate">{label}</span>
                                {locked && <span className="ml-auto rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-neon-green/10 dark:text-neon-green">New</span>}
                            </Link>
                        );
                    })}
                </nav>
                <div className="shrink-0 space-y-2 border-t border-black/[0.06] p-3 dark:border-white/[0.06]">
                    <button
                        type="button"
                        onClick={() => toggleTheme()}
                        className="flex h-10 w-full items-center gap-3 rounded-xl px-3 text-[13px] font-semibold text-gray-600 hover:bg-black/[0.03] dark:text-zinc-400 dark:hover:bg-white/[0.04]"
                    >
                        {isDark ? <Sun size={16} /> : <Moon size={16} />} {isDark ? 'Light mode' : 'Dark mode'}
                    </button>
                    {authUser && (
                        <Link to={appPath('/profile')} className="flex items-center gap-3 rounded-xl p-2 hover:bg-black/[0.03] dark:hover:bg-white/[0.04]">
                            <Avatar profile={profile} authUser={authUser} />
                            <div className="min-w-0">
                                <p className="truncate text-[13px] font-bold">{profile?.name || authUser.displayName || 'Your profile'}</p>
                                {(profile?.email || authUser.email) && <p className="truncate text-[12px] text-gray-500">{profile?.email || authUser.email}</p>}
                            </div>
                        </Link>
                    )}
                </div>
            </aside>

            {/* ── Phone top bar ── */}
            <header className="fixed inset-x-0 top-0 z-40 border-b border-black/[0.05] bg-[#f6f7f9]/95 pt-[env(safe-area-inset-top)] dark:border-white/[0.05] dark:bg-[#050608]/95 lg:hidden">
                <div className="flex h-14 items-center justify-between pl-4 pr-1.5">
                    <Link to={appPath('/')} aria-label="Newbi home" className="flex h-11 items-center"><Logo className="h-7" /></Link>
                    <BellButton count={unreadCount} onClick={() => setBellOpen(true)} />
                </div>
            </header>

            {/* ── Page ── */}
            <main className="min-w-0 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-[calc(3.5rem+env(safe-area-inset-top))] lg:pb-0 lg:pl-[248px] lg:pt-0">
                <Suspense fallback={<PageFallback />}>
                    <Outlet />
                </Suspense>
            </main>

            {/* ── Phone tab bar: a floating glass pill; only the active tab shows its label ── */}
            <nav
                aria-label="App sections"
                className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] lg:hidden"
            >
                <div
                    className={cn(
                        'pointer-events-auto relative flex items-center gap-1 rounded-full p-1.5',
                        // Liquid glass: translucent fill, one backdrop blur, a bright top edge and a soft drop shadow.
                        'border border-white/60 bg-white/80 shadow-[0_10px_40px_-8px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.9)]',
                        'supports-[backdrop-filter]:bg-white/55 supports-[backdrop-filter]:backdrop-blur-2xl supports-[backdrop-filter]:backdrop-saturate-[1.8]',
                        'dark:border-white/[0.12] dark:bg-[#15171d]/90 dark:shadow-[0_10px_40px_-8px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.12)]',
                        'dark:supports-[backdrop-filter]:bg-[#15171d]/55'
                    )}
                >
                    {tabs.map(({ module, locked, label }) => {
                        const Icon = module.tab.icon;
                        const active = activeModule?.id === module.id;
                        return (
                            <Link
                                key={module.id}
                                to={appPath(module.path)}
                                aria-current={active ? 'page' : undefined}
                                aria-label={active ? undefined : label}
                                className={cn(
                                    'relative flex h-12 items-center justify-center rounded-full transition-[padding,color] duration-300',
                                    active ? 'gap-2 pl-4 pr-5 text-gray-900 dark:text-white' : 'w-12 text-gray-500 active:scale-95 dark:text-zinc-400'
                                )}
                                style={{ WebkitTapHighlightColor: 'transparent' }}
                            >
                                {active && (
                                    <motion.span
                                        layoutId="app-tab-pill"
                                        transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                                        className="absolute inset-0 rounded-full bg-white shadow-[0_2px_10px_rgba(0,0,0,0.12)] dark:bg-white/[0.14] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]"
                                    />
                                )}
                                <span className="relative">
                                    <Icon size={21} strokeWidth={active ? 2.3 : 1.9} className={active ? 'text-emerald-600 dark:text-neon-green' : undefined} />
                                    {locked && !active && <span className="absolute -right-1 -top-0.5 h-2 w-2 rounded-full bg-neon-green ring-2 ring-white dark:ring-[#15171d]" />}
                                </span>
                                {active && <span className="relative whitespace-nowrap text-[14px] font-bold">{module.tab.label}</span>}
                            </Link>
                        );
                    })}
                </div>
            </nav>

            <NotificationsSheet open={bellOpen} onClose={() => setBellOpen(false)} />
            <SignInSheet />
        </div>
    );
};

export default AppLayout;
