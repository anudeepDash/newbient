import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import Bell from 'lucide-react/dist/esm/icons/bell';
import Sun from 'lucide-react/dist/esm/icons/sun';
import Moon from 'lucide-react/dist/esm/icons/moon';
import ShieldCheck from 'lucide-react/dist/esm/icons/shield-check';
import { isAdminRole } from '../constants/roles';
import { cn } from '../lib/utils';
import { useTheme } from '../hooks/useTheme';
import { useSafariChrome } from '../hooks/useSafariChrome';
import { useAppStore, useAppSession, hasCapability } from '../lib/store/appStore';
import { visibleTabs, moduleForPath } from './modules';
import { appPath, stripAppBase } from './host';
import { AuthResumer } from './auth/AuthGate';
import NotificationsSheet from './NotificationsSheet';
import SignInSheet from './auth/SignInSheet';
import NewbiLogo from '../components/brand/NewbiLogo';

/*
 * The app shell (app.newbi.live, or /app on localhost).
 *
 * Every screen size gets the phone layout: a top bar (logo, admin for staff,
 * theme on larger screens, notification bell) and a floating glass pill of
 * tabs, both clear of the notch and home bar; only the active tab shows its
 * label. On desktop the same layout is centred (the owner prefers it to a
 * side rail). Tabs come from the module registry (modules.js). The pill is the one live blur in the shell; the top bar is
 * solid, so iPhone Safari never stacks blur layers.
 */

// The unified newbi.live logo (outlined, so one file works on light and dark).
const Logo = ({ className }) => (
    <NewbiLogo className={cn('w-auto', className)} />
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

const PageFallback = () => (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-6 sm:px-6">
        <div className="h-8 w-40 animate-pulse rounded-xl bg-black/[0.05] dark:bg-white/[0.05]" />
        <div className="aspect-video animate-pulse rounded-3xl bg-black/[0.04] dark:bg-white/[0.04]" />
    </div>
);

const AppLayout = () => {
    const location = useLocation();
    const path = stripAppBase(location.pathname);
    const authUser = useAppStore(s => s.authUser);
    const unreadCount = useAppStore(s => (s.authUser ? s.unreadCount : 0));
    const isCreator = useAppStore(s => hasCapability(s, 'creator'));
    const isCampus = useAppStore(s => hasCapability(s, 'campus'));
    // Staff get a way into the admin (served on this same host, so no second sign-in).
    const isStaff = isAdminRole(authUser?.role);
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

            {/* ── Top bar (every screen size: desktop is the phone layout, centred) ── */}
            <header className="fixed inset-x-0 top-0 z-40 border-b border-black/[0.05] bg-[#f6f7f9]/95 pt-[env(safe-area-inset-top)] dark:border-white/[0.05] dark:bg-[#050608]/95">
                <div className="mx-auto flex h-14 max-w-3xl items-center justify-between pl-4 pr-1.5 sm:px-4">
                    <Link to={appPath('/')} aria-label="Newbi home" className="flex h-11 items-center"><Logo className="h-7" /></Link>
                    <div className="flex items-center">
                        {isStaff && (
                            <Link
                                to="/admin"
                                aria-label="Open admin"
                                className="flex h-11 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold text-gray-700 dark:text-zinc-300"
                            >
                                <ShieldCheck size={17} /> Admin
                            </Link>
                        )}
                        <button
                            type="button"
                            onClick={() => toggleTheme()}
                            aria-label={isDark ? 'Light mode' : 'Dark mode'}
                            className="hidden h-11 w-11 items-center justify-center rounded-xl text-gray-700 transition-colors hover:bg-black/[0.04] dark:text-zinc-300 dark:hover:bg-white/[0.06] sm:flex"
                        >
                            {isDark ? <Sun size={19} /> : <Moon size={19} />}
                        </button>
                        <BellButton count={unreadCount} onClick={() => setBellOpen(true)} />
                    </div>
                </div>
            </header>

            {/* ── Page ── */}
            <main className="min-w-0 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-[calc(3.5rem+env(safe-area-inset-top))]">
                <Suspense fallback={<PageFallback />}>
                    <Outlet />
                </Suspense>
            </main>

            {/* ── Tab bar: a floating glass pill on every screen; only the active tab shows its label ── */}
            <nav
                aria-label="App sections"
                className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:pb-5"
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
                    {tabs.map(({ module, label }) => {
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
