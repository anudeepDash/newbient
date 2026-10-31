import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import Bell from 'lucide-react/dist/esm/icons/bell';
import Sun from 'lucide-react/dist/esm/icons/sun';
import Moon from 'lucide-react/dist/esm/icons/moon';
import LayoutDashboard from 'lucide-react/dist/esm/icons/layout-dashboard';
import { isAdminRole } from '../constants/roles';
import { cn } from '../lib/utils';
import { useTheme } from '../hooks/useTheme';
import { useSafariChrome } from '../hooks/useSafariChrome';
import { useAppStore, useAppSession, hasCapability } from '../lib/store/appStore';
import { visibleTabs, moduleForPath } from './modules';
import { visibleUnreadCount } from '../lib/store/notifications';
import { appPath, stripAppBase, landingUrl } from './host';
import { AuthResumer } from './auth/AuthGate';
import NotificationsSheet from './NotificationsSheet';
import SignInSheet from './auth/SignInSheet';
import NewbiLogo from '../components/brand/NewbiLogo';
import SplashHold from '../components/ui/SplashHold';
import ErrorBoundary from '../components/ErrorBoundary';
import AppFooter from './AppFooter';
import LangToggle from '../i18n/LangToggle';
import { useT } from '../i18n';

/*
 * The app shell (app.newbi.live, or /app on localhost).
 *
 * Phones and tablets: a top bar (logo, admin for staff, notification bell)
 * and a floating glass pill of tabs, both clear of the notch and home bar;
 * only the active tab shows its label.
 * Desktop (lg+): one top bar like the landing site's, with the tabs in the
 * middle, and wider pages. Tabs come from the module registry (modules.js).
 */

// The unified newbi.live logo (outlined, so one file works on light and dark).
const Logo = ({ className }) => (
    <NewbiLogo className={cn('w-auto', className)} />
);

const BellButton = ({ count, onClick, className }) => {
    const t = useT();
    return (
    <button
        type="button"
        onClick={onClick}
        aria-label={count ? t('Notifications, {count} unread', { count }) : t('Notifications')}
        className={cn('relative flex h-11 w-11 items-center justify-center rounded-xl text-gray-700 transition-colors hover:bg-black/[0.04] active:bg-black/5 dark:text-zinc-300 dark:hover:bg-white/[0.06] dark:active:bg-white/10', className)}
    >
        <Bell size={20} />
        {count > 0 && (
            <span className="absolute right-1.5 top-1.5 min-w-[18px] rounded-full bg-neon-pink px-1 text-center text-[10px] font-black leading-[18px] text-black ring-2 ring-[#f4f4f1] dark:ring-[#050608]">
                {count > 9 ? '9+' : count}
            </span>
        )}
    </button>
    );
};

// A page still downloading: the N. splash, played to the end of a cycle before the page shows.
const PageFallback = () => <SplashHold color="#39FF14" />;

const AppLayout = () => {
    const t = useT();
    const location = useLocation();
    const path = stripAppBase(location.pathname);
    const authUser = useAppStore(s => s.authUser);
    const unreadCount = useAppStore(s => (s.authUser ? visibleUnreadCount(s) : 0));
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
    // A campaign, guestlist, giveaway, form, show (ticket), feedback or payout details page has its own bottom bar; the tab pill steps aside there on phones.
    const ownBottomBar = /^\/(c|community\/g|community\/giveaways|forms|tickets|f|pay|pay\/c)\/[^/]+\/?$/.test(path);

    return (
        <div className="relative isolate min-h-dvh bg-[#f4f4f1] text-gray-900 dark:bg-[#050608] dark:text-white">
            {/* The landing site's soft colour wash (gradients only, no blur filter). */}
            <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 dark:hidden" style={{ background: 'radial-gradient(60% 40% at 100% 0%, rgba(57,255,20,0.22), transparent 70%), radial-gradient(50% 40% at 0% 100%, rgba(56,189,248,0.14), transparent 70%)' }} />
            <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 hidden dark:block" style={{ background: 'radial-gradient(60% 40% at 100% 0%, rgba(57,255,20,0.14), transparent 70%), radial-gradient(50% 40% at 0% 100%, rgba(56,189,248,0.08), transparent 70%)' }} />
            <AuthResumer />

            {/* ── Top bar ── */}
            <header className="fixed inset-x-0 top-0 z-40 border-b border-black/[0.05] bg-[#f4f4f1]/80 pt-[env(safe-area-inset-top)] backdrop-blur-xl dark:border-white/[0.05] dark:bg-[#050608]/80">
                <div className="mx-auto flex h-14 max-w-6xl items-center justify-between pl-4 pr-1.5 sm:px-4 lg:h-[4.5rem] lg:px-8">
                    <a href={landingUrl('/')} aria-label={t('Go to newbi.live')} className="flex h-11 items-center lg:w-48"><Logo className="h-7 lg:h-8" /></a>
                    {/* Desktop: the tabs live in the top bar. */}
                    <nav aria-label={t('App sections')} className="hidden items-center gap-1 rounded-full bg-black/[0.04] p-1 ring-1 ring-inset ring-black/[0.04] dark:bg-white/[0.05] dark:ring-white/[0.06] lg:flex">
                        {tabs.map(({ module, label }) => {
                            const Icon = module.tab.icon;
                            const active = activeModule?.id === module.id;
                            return (
                                <Link
                                    key={module.id}
                                    to={appPath(module.path)}
                                    aria-current={active ? 'page' : undefined}
                                    className={cn(
                                        'relative flex h-10 items-center gap-2 whitespace-nowrap rounded-full px-4 text-[14px] font-bold transition-colors',
                                        active ? 'text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white'
                                    )}
                                >
                                    {active && (
                                        <motion.span
                                            layoutId="app-top-tab"
                                            transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                                            className="absolute inset-0 rounded-full bg-white shadow-[0_2px_10px_rgba(0,0,0,0.1)] dark:bg-white/[0.14] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]"
                                        />
                                    )}
                                    <Icon size={17} strokeWidth={active ? 2.3 : 1.9} className={cn('relative', active && 'text-emerald-600 dark:text-neon-green')} />
                                    <span className="relative">{t(label)}</span>
                                </Link>
                            );
                        })}
                    </nav>
                    <div className="flex items-center lg:w-48 lg:justify-end">
                        {isStaff && (
                            // Staff only: into the admin (admin.newbi.live in production).
                            <Link
                                to="/admin"
                                aria-label={t('Open admin')}
                                className="mr-1 flex h-9 items-center gap-2 rounded-full bg-white/70 pl-1 pr-3.5 font-heading text-[13px] font-bold text-gray-900 ring-1 ring-inset ring-black/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] transition-colors hover:bg-white dark:bg-white/[0.08] dark:text-white dark:ring-white/15 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] dark:hover:bg-white/[0.12]"
                            >
                                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-neon-green text-black"><LayoutDashboard size={14} strokeWidth={2.4} /></span>
                                {t('Admin')}
                            </Link>
                        )}
                        <LangToggle />
                        <button
                            type="button"
                            onClick={() => toggleTheme()}
                            aria-label={isDark ? t('Light mode') : t('Dark mode')}
                            className="hidden h-11 w-11 items-center justify-center rounded-xl text-gray-700 transition-colors hover:bg-black/[0.04] dark:text-zinc-300 dark:hover:bg-white/[0.06] sm:flex"
                        >
                            {isDark ? <Sun size={19} /> : <Moon size={19} />}
                        </button>
                        <BellButton count={unreadCount} onClick={() => setBellOpen(true)} />
                    </div>
                </div>
            </header>

            {/* ── Page ── */}
            <main className="min-w-0 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-[calc(3.5rem+env(safe-area-inset-top))] lg:pb-16 lg:pt-[4.5rem]">
                {/* A page that crashes shows its error here, inside the shell; another tab clears it. */}
                <ErrorBoundary inline resetKey={location.pathname}>
                    <Suspense fallback={<PageFallback />}>
                        <Outlet />
                    </Suspense>
                </ErrorBoundary>
                <AppFooter />
            </main>

            {/* ── Tab bar (phones and tablets): a floating glass pill; only the active tab shows its label ── */}
            <nav
                aria-label={t('App sections')}
                className={cn('pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:pb-5 lg:hidden', ownBottomBar && 'hidden')}
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
                                aria-label={active ? undefined : t(label)}
                                className={cn(
                                    'relative flex h-12 items-center justify-center rounded-full transition-[padding,color] duration-300',
                                    // Under 360px the five tabs plus a label don't fit, so the active tab is icon-only there too.
                                    active ? 'gap-2 pl-4 pr-5 text-gray-900 max-[359px]:w-12 max-[359px]:px-0 dark:text-white' : 'w-12 text-gray-500 active:scale-95 dark:text-zinc-400'
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
                                {active && <span className="relative whitespace-nowrap text-[14px] font-bold max-[359px]:sr-only">{t(module.tab.label)}</span>}
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
