import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion, useDragControls } from 'framer-motion';
import Search from 'lucide-react/dist/esm/icons/search';
import Menu from 'lucide-react/dist/esm/icons/menu';
import X from 'lucide-react/dist/esm/icons/x';
import Mail from 'lucide-react/dist/esm/icons/mail';
import Sun from 'lucide-react/dist/esm/icons/sun';
import Moon from 'lucide-react/dist/esm/icons/moon';
import ExternalLink from 'lucide-react/dist/esm/icons/external-link';
import PanelLeftClose from 'lucide-react/dist/esm/icons/panel-left-close';
import PanelLeftOpen from 'lucide-react/dist/esm/icons/panel-left-open';
import LayoutDashboard from 'lucide-react/dist/esm/icons/layout-dashboard';
import { useStore } from '../../../lib/store';
import { cn } from '../../../lib/utils';
import { safeLocalStorage } from '../../../lib/storage';
import { useTheme } from '../../../hooks/useTheme';
import { useBodyScrollLock } from '../../../hooks/useBodyScrollLock';
import { useStoreSubscription } from '../../../hooks/useStoreSubscription';
import { isAdminRole } from '../../../constants/roles';
import {
    getAdminNav, getQuickActions, isNavItemActive, findActiveNavItem, isImmersiveAdminPath,
} from '../../../constants/adminNavigation';
import CommandPalette from './CommandPalette';
import { AccentContext, accent } from '../theme';
import newbiLogo from '../../../assets/logo/newbi-logo.svg';
import newbiIcon from '../../../assets/logo/newbi-icon.svg';

const COLLAPSE_KEY = 'nb_admin_sidebar_collapsed';

// Bottom-tab candidates on phones, in priority order. Dashboard is always first
// and "More" always last, so three of these make it in.
const MOBILE_TAB_PRIORITY = ['proposals', 'invoices', 'upcoming', 'ticketing', 'creators', 'scanner', 'blog', 'inbox'];

const roleLabel = (role) => String(role || '').replace(/_/g, ' ');

// White letters with a black outline, so one file reads on light and dark.
const Logo = ({ className }) => (
    <img src={newbiLogo} alt="Newbi" className={cn('w-auto', className)} />
);

const Badge = ({ count, compact }) => {
    if (!count) return null;
    return compact ? (
        <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-neon-pink ring-2 ring-white dark:ring-[#0b0c11]" />
    ) : (
        <span className="ml-auto min-w-[20px] rounded-full bg-pink-500/15 px-1.5 py-0.5 text-center text-[11px] font-bold tabular-nums text-pink-600 dark:bg-neon-pink/15 dark:text-neon-pink">
            {count > 99 ? '99+' : count}
        </span>
    );
};

const NavLinkRow = ({ item, active, collapsed, badge, onNavigate }) => {
    const Icon = item.icon;
    const a = accent(item.accent);
    return (
        <Link
            to={item.path}
            onClick={onNavigate}
            title={collapsed ? item.name : undefined}
            aria-current={active ? 'page' : undefined}
            className={cn(
                'group relative flex h-10 items-center gap-3 rounded-xl text-[13px] font-semibold transition-colors',
                collapsed ? 'justify-center px-0' : 'px-3',
                active
                    ? cn(a.soft, 'text-gray-900 dark:text-white')
                    : 'text-gray-600 hover:bg-black/[0.04] hover:text-gray-900 dark:text-zinc-400 dark:hover:bg-white/[0.05] dark:hover:text-white'
            )}
        >
            {active && !collapsed && <span className={cn('absolute -left-3 top-2 bottom-2 w-1 rounded-r-full', a.dot)} />}
            <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors', active ? a.chip : cn(a.text, 'opacity-80 group-hover:opacity-100'))}>
                <Icon size={16} strokeWidth={active ? 2.25 : 1.9} />
            </span>
            {!collapsed && <span className="truncate">{item.name}</span>}
            {!collapsed ? <Badge count={badge} /> : <Badge count={badge} compact />}
        </Link>
    );
};

const ThemeButton = ({ compact }) => {
    const { isDark, toggleTheme } = useTheme();
    return (
        <button
            type="button"
            onClick={() => toggleTheme()}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            title={isDark ? 'Light mode' : 'Dark mode'}
            className={cn(
                'flex h-10 items-center justify-center gap-2 rounded-xl border border-black/[0.08] text-[12px] font-semibold text-gray-600 transition-colors hover:text-gray-900 dark:border-white/[0.08] dark:text-zinc-400 dark:hover:text-white',
                compact ? 'w-10' : 'flex-1'
            )}
        >
            {isDark ? <Sun size={15} /> : <Moon size={15} />}
            {!compact && <span>{isDark ? 'Light' : 'Dark'}</span>}
        </button>
    );
};

const AdminShell = () => {
    const location = useLocation();
    const user = useStore(s => s.user);
    const maintenanceState = useStore(s => s.maintenanceState);
    const messages = useStore(s => s.messages);
    const cards = maintenanceState?.features || {};
    const role = user?.role;
    const isAdmin = isAdminRole(role);
    const immersive = isImmersiveAdminPath(location.pathname);

    const nav = useMemo(() => getAdminNav(role, cards), [role, cards]);
    const quickActions = useMemo(() => getQuickActions(nav), [nav]);
    const navIds = useMemo(() => new Set(nav.flatMap(g => g.items.map(i => i.id))), [nav]);
    const activeItem = findActiveNavItem(nav, location.pathname);

    useStoreSubscription(isAdmin && navIds.has('inbox') ? ['messages'] : []);
    const unread = useMemo(() => (messages || []).filter(m => m.status === 'new').length, [messages]);
    const badges = { inbox: unread };

    const [collapsed, setCollapsed] = useState(() => safeLocalStorage.getItem(COLLAPSE_KEY) === 'true');
    const [sheetOpen, setSheetOpen] = useState(false);
    const [paletteOpen, setPaletteOpen] = useState(false);
    const sheetDrag = useDragControls();
    useBodyScrollLock(sheetOpen);

    const toggleCollapsed = () => setCollapsed(prev => {
        safeLocalStorage.setItem(COLLAPSE_KEY, String(!prev));
        return !prev;
    });

    // Close overlays whenever the route changes.
    useEffect(() => { setSheetOpen(false); setPaletteOpen(false); }, [location.pathname]);

    const openPalette = useCallback(() => { setSheetOpen(false); setPaletteOpen(true); }, []);

    useEffect(() => {
        if (!isAdmin || immersive) return;
        const onKey = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                setPaletteOpen(open => !open);
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isAdmin, immersive]);

    // Signed-out visitors get the guard's sign-in screen; editors and the scanner run full screen.
    const accentName = activeItem?.accent || 'green';
    if (!isAdmin || immersive) return <AccentContext.Provider value={accentName}><Outlet /></AccentContext.Provider>;

    const mobileTabs = (() => {
        const all = nav.flatMap(g => g.items);
        const picked = MOBILE_TAB_PRIORITY.map(id => all.find(i => i.id === id)).filter(Boolean).slice(0, 3);
        const dashboard = all.find(i => i.id === 'dashboard');
        return [dashboard, ...picked].filter(Boolean);
    })();
    const activeInTabs = mobileTabs.some(t => t === activeItem);

    return (
        <div className="min-h-dvh bg-[#f6f7f9] text-gray-900 dark:bg-[#07080b] dark:text-white">
            {/* ── Desktop sidebar ── */}
            <aside
                className={cn(
                    'fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-black/[0.06] bg-white transition-[width] duration-200 dark:border-white/[0.06] dark:bg-[#0b0c11] lg:flex',
                    collapsed ? 'w-[76px]' : 'w-[260px]'
                )}
            >
                <div className={cn('flex shrink-0 items-center', collapsed ? 'flex-col justify-center gap-1 px-2 py-3' : 'h-16 justify-between px-5')}>
                    {collapsed ? (
                        <Link to="/admin" aria-label="Newbi admin home" className="flex h-9 w-9 items-center justify-center">
                            <img src={newbiIcon} alt="" className="h-6 w-auto" />
                        </Link>
                    ) : (
                        <Link to="/admin" className="flex items-center gap-2.5">
                            <Logo className="h-9" />
                            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-neon-green/10 dark:text-neon-green">Admin</span>
                        </Link>
                    )}
                    <button
                        type="button"
                        onClick={toggleCollapsed}
                        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-black/[0.04] hover:text-gray-900 dark:hover:bg-white/[0.05] dark:hover:text-white"
                    >
                        {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
                    </button>
                </div>

                <div className={cn('shrink-0 pb-3', collapsed ? 'px-3' : 'px-4')}>
                    <button
                        type="button"
                        onClick={openPalette}
                        title="Search (⌘K)"
                        className={cn(
                            'flex h-10 w-full items-center gap-2.5 rounded-xl border border-black/[0.08] bg-black/[0.02] text-[13px] font-medium text-gray-500 transition-colors hover:border-black/15 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-zinc-500 dark:hover:border-white/15',
                            collapsed ? 'justify-center' : 'px-3'
                        )}
                    >
                        <Search size={15} className="shrink-0" />
                        {!collapsed && (
                            <>
                                <span className="flex-1 text-left">Search</span>
                                <kbd className="rounded-md border border-black/10 px-1.5 font-sans text-[10px] font-bold dark:border-white/10">⌘K</kbd>
                            </>
                        )}
                    </button>
                </div>

                <nav aria-label="Admin" className={cn('flex-1 space-y-5 overflow-y-auto overscroll-contain pb-6', collapsed ? 'px-3' : 'px-4')}>
                    {nav.map(group => (
                        <div key={group.id} className="space-y-1">
                            {!collapsed ? (
                                <p className="px-3 pb-1 text-[11.5px] font-bold text-gray-400 dark:text-zinc-500">{group.title}</p>
                            ) : (
                                group.id !== 'overview' && <div className="mx-auto mb-2 h-px w-6 bg-black/[0.08] dark:bg-white/[0.08]" />
                            )}
                            {group.items.map(item => (
                                <NavLinkRow
                                    key={item.id}
                                    item={item}
                                    collapsed={collapsed}
                                    active={activeItem === item}
                                    badge={badges[item.badgeKey]}
                                />
                            ))}
                        </div>
                    ))}
                </nav>

                <div className={cn('shrink-0 space-y-2 border-t border-black/[0.06] py-4 dark:border-white/[0.06]', collapsed ? 'px-3' : 'px-4')}>
                    <div className={cn('flex gap-2', collapsed && 'flex-col items-center')}>
                        <ThemeButton compact={collapsed} />
                        <a
                            href="/"
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Open the website"
                            className={cn(
                                'flex h-10 items-center justify-center gap-2 rounded-xl border border-black/[0.08] text-[12px] font-semibold text-gray-600 transition-colors hover:text-gray-900 dark:border-white/[0.08] dark:text-zinc-400 dark:hover:text-white',
                                collapsed ? 'w-10' : 'flex-1'
                            )}
                        >
                            <ExternalLink size={15} />
                            {!collapsed && <span>Website</span>}
                        </a>
                    </div>
                    {!collapsed && (
                        <div className="flex items-center gap-3 rounded-xl px-1 pt-1">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-neon-green/15 text-sm font-bold uppercase text-emerald-700 dark:text-neon-green">
                                {user?.photoURL ? <img src={user.photoURL} alt="" className="h-full w-full object-cover" /> : (user?.displayName || user?.email || '?').charAt(0)}
                            </div>
                            <div className="min-w-0">
                                <p className="truncate text-[13px] font-bold">{user?.displayName || user?.email}</p>
                                <p className="truncate text-[12px] font-semibold capitalize text-gray-500">{roleLabel(role)}</p>
                            </div>
                        </div>
                    )}
                </div>
            </aside>

            {/* ── Mobile top bar ── */}
            <header className="fixed inset-x-0 top-0 z-40 border-b border-black/[0.05] bg-[#f6f7f9]/90 pt-[env(safe-area-inset-top)] backdrop-blur-xl backdrop-saturate-150 dark:border-white/[0.05] dark:bg-[#07080b]/90 lg:hidden">
                <div className="flex h-14 items-center gap-2 px-2">
                    <button
                        type="button"
                        onClick={() => setSheetOpen(true)}
                        aria-label="Open menu"
                        className="flex h-11 w-11 items-center justify-center rounded-xl text-gray-700 active:bg-black/5 dark:text-zinc-300 dark:active:bg-white/10"
                    >
                        <Menu size={20} />
                    </button>
                    <div className="min-w-0 flex-1 text-center">
                        <p className="truncate text-[15px] font-bold tracking-tight">{activeItem?.name || 'Admin'}</p>
                    </div>
                    <button
                        type="button"
                        onClick={openPalette}
                        aria-label="Search"
                        className="flex h-11 w-11 items-center justify-center rounded-xl text-gray-700 active:bg-black/5 dark:text-zinc-300 dark:active:bg-white/10"
                    >
                        <Search size={19} />
                    </button>
                    {navIds.has('inbox') && (
                        <Link
                            to="/admin/messages"
                            aria-label={unread ? `Inbox, ${unread} unread` : 'Inbox'}
                            className="relative flex h-11 w-11 items-center justify-center rounded-xl text-gray-700 active:bg-black/5 dark:text-zinc-300 dark:active:bg-white/10"
                        >
                            <Mail size={19} />
                            <Badge count={unread} compact />
                        </Link>
                    )}
                </div>
            </header>

            {/* ── Page ── */}
            <main
                className={cn(
                    'min-w-0 pb-[calc(4.75rem+env(safe-area-inset-bottom))] pt-[calc(3.5rem+env(safe-area-inset-top))] transition-[padding] duration-200 lg:pb-0 lg:pt-0',
                    collapsed ? 'lg:pl-[76px]' : 'lg:pl-[260px]'
                )}
            >
                <AccentContext.Provider value={accentName}>
                    <Outlet />
                </AccentContext.Provider>
            </main>

            {/* ── Mobile bottom tabs ── */}
            <nav
                aria-label="Admin sections"
                className="fixed inset-x-0 bottom-0 z-40 border-t border-black/[0.05] bg-[#f6f7f9]/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl backdrop-saturate-150 dark:border-white/[0.05] dark:bg-[#07080b]/90 lg:hidden"
            >
                <div className="mx-auto flex h-16 max-w-lg items-stretch">
                    {mobileTabs.map(item => {
                        const Icon = item.id === 'dashboard' ? LayoutDashboard : item.icon;
                        const active = activeItem === item;
                        return (
                            <Link
                                key={item.id}
                                to={item.path}
                                aria-current={active ? 'page' : undefined}
                                className={cn(
                                    'relative flex flex-1 flex-col items-center justify-center gap-1 text-[10px] font-bold transition-colors',
                                    active ? accent(item.accent).text : 'text-gray-400 dark:text-zinc-500'
                                )}
                            >
                                {active && <span className={cn('absolute top-0 h-0.5 w-8 rounded-full', accent(item.accent).dot)} />}
                                <span className="relative">
                                    <Icon size={20} strokeWidth={active ? 2.3 : 1.9} />
                                    {item.badgeKey && badges[item.badgeKey] > 0 && <span className="absolute -right-1 -top-0.5 h-2 w-2 rounded-full bg-neon-pink" />}
                                </span>
                                <span className="max-w-full truncate px-1">{item.id === 'dashboard' ? 'Home' : item.name}</span>
                            </Link>
                        );
                    })}
                    <button
                        type="button"
                        onClick={() => setSheetOpen(true)}
                        className={cn(
                            'relative flex flex-1 flex-col items-center justify-center gap-1 text-[10px] font-bold',
                            !activeInTabs || sheetOpen ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-zinc-500'
                        )}
                    >
                        {!activeInTabs && !sheetOpen && <span className="absolute top-0 h-0.5 w-8 rounded-full bg-neon-green" />}
                        <Menu size={20} />
                        <span>More</span>
                    </button>
                </div>
            </nav>

            {/* ── Mobile "More" sheet ── */}
            <AnimatePresence>
                {sheetOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.18 }}
                            onClick={() => setSheetOpen(false)}
                            className="fixed inset-0 z-50 bg-black/40 dark:bg-black/70 lg:hidden"
                        />
                        <motion.div
                            role="dialog"
                            aria-modal="true"
                            aria-label="All admin sections"
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', stiffness: 380, damping: 38 }}
                            drag="y"
                            dragControls={sheetDrag}
                            dragListener={false}
                            dragConstraints={{ top: 0, bottom: 0 }}
                            dragElastic={{ top: 0, bottom: 0.4 }}
                            onDragEnd={(_, info) => { if (info.offset.y > 120 || info.velocity.y > 600) setSheetOpen(false); }}
                            className="fixed inset-x-0 bottom-0 z-50 flex max-h-[88dvh] flex-col rounded-t-[1.75rem] border-t border-black/[0.08] bg-white shadow-2xl dark:border-white/[0.08] dark:bg-[#0d0f15] lg:hidden"
                        >
                            <div
                                className="flex shrink-0 touch-none items-center justify-between px-5 pb-2 pt-3"
                                onPointerDown={(e) => sheetDrag.start(e)}
                            >
                                <div className="absolute left-1/2 top-2 h-1 w-10 -translate-x-1/2 rounded-full bg-black/15 dark:bg-white/15" />
                                <Logo className="mt-3 h-8" />
                                <button
                                    type="button"
                                    onClick={() => setSheetOpen(false)}
                                    aria-label="Close menu"
                                    className="mt-2 flex h-10 w-10 items-center justify-center rounded-full bg-black/5 text-gray-600 dark:bg-white/10 dark:text-zinc-300"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="flex-1 space-y-6 overflow-y-auto overscroll-contain px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-2">
                                <button
                                    type="button"
                                    onClick={openPalette}
                                    className="flex h-12 w-full items-center gap-3 rounded-2xl border border-black/[0.08] bg-black/[0.02] px-4 text-[15px] font-medium text-gray-500 dark:border-white/[0.08] dark:bg-white/[0.03]"
                                >
                                    <Search size={17} /> Search or jump to…
                                </button>

                                {quickActions.length > 0 && (
                                    <div className="flex gap-2 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                                        {quickActions.map(action => (
                                            <Link
                                                key={action.id}
                                                to={action.path}
                                                className="flex h-10 shrink-0 items-center gap-2 rounded-full border border-neon-green/30 bg-neon-green/10 px-4 text-[13px] font-bold text-emerald-700 dark:text-neon-green"
                                            >
                                                <action.icon size={15} /> {action.name}
                                            </Link>
                                        ))}
                                    </div>
                                )}

                                {nav.map(group => (
                                    <div key={group.id} className="space-y-2">
                                        <p className="px-1 text-[12px] font-bold text-gray-400 dark:text-zinc-500">{group.title}</p>
                                        <div className="grid grid-cols-2 gap-2">
                                            {group.items.map(item => {
                                                const Icon = item.icon;
                                                const active = isNavItemActive(item, location.pathname) && activeItem === item;
                                                return (
                                                    <Link
                                                        key={item.id}
                                                        to={item.path}
                                                        className={cn(
                                                            'relative flex min-h-[52px] items-center gap-3 rounded-2xl border px-3.5 text-[14px] font-semibold transition-colors',
                                                            active
                                                                ? 'border-transparent bg-gray-900 text-white dark:bg-white dark:text-black'
                                                                : 'border-black/[0.06] bg-black/[0.02] text-gray-800 active:bg-black/5 dark:border-white/[0.06] dark:bg-white/[0.03] dark:text-zinc-200'
                                                        )}
                                                    >
                                                        <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', active ? 'bg-white/15 dark:bg-black/10' : accent(item.accent).chip)}>
                                                            <Icon size={17} />
                                                        </span>
                                                        <span className="truncate">{item.name}</span>
                                                        {item.badgeKey && badges[item.badgeKey] > 0 && (
                                                            <span className="ml-auto rounded-full bg-pink-500 px-1.5 text-[11px] font-bold text-white dark:bg-neon-pink dark:text-black">{badges[item.badgeKey]}</span>
                                                        )}
                                                    </Link>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}

                                <div className="flex items-center gap-3 border-t border-black/[0.06] pt-5 dark:border-white/[0.06]">
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-[14px] font-bold">{user?.displayName || user?.email}</p>
                                        <p className="truncate text-[12px] font-semibold capitalize text-gray-500">{roleLabel(role)}</p>
                                    </div>
                                    <ThemeButton compact />
                                    <a
                                        href="/"
                                        className="flex h-10 w-10 items-center justify-center rounded-xl border border-black/[0.08] text-gray-600 dark:border-white/[0.08] dark:text-zinc-400"
                                        aria-label="Go to the website"
                                    >
                                        <ExternalLink size={15} />
                                    </a>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} nav={nav} actions={quickActions} />
        </div>
    );
};

export default AdminShell;
