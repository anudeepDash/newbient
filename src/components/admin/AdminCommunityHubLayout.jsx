import React, { useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Users from 'lucide-react/dist/esm/icons/users';
import ClipboardList from 'lucide-react/dist/esm/icons/clipboard-list';
import ListChecks from 'lucide-react/dist/esm/icons/list-checks';
import LayoutGrid from 'lucide-react/dist/esm/icons/layout-grid';
import { cn } from '../../lib/utils';
import { accent, useAccent } from './theme';
import { ADMIN_NAV_GROUPS, findActiveNavItem } from '../../constants/adminNavigation';

const NAV_PATHS = new Set(ADMIN_NAV_GROUPS.flatMap(g => g.items.map(i => i.path)));

/*
 * Page frame for admin screens. Navigation (sidebar, mobile tabs, quick jump)
 * lives in AdminShell; this renders the page header, section tabs and content.
 * The props are unchanged from the old layout so every page keeps working.
 */

const DEFAULT_TABS = [
    { name: 'Gigs', path: '/admin/volunteer-gigs', icon: Users },
    { name: 'Forms', path: '/admin/forms', icon: ClipboardList },
];

// Older pages pass titles in capitals ("CREATOR", "PORTAL"); show them as words.
const humanize = (text) => {
    if (typeof text !== 'string') return text;
    if (text !== text.toUpperCase() || !/[A-Z]/.test(text)) return text;
    return text.toLowerCase().replace(/(^|\s|-)([a-z])/g, (m, sep, ch) => sep + ch.toUpperCase());
};

const sentence = (text) => {
    if (typeof text !== 'string' || text !== text.toUpperCase() || !/[A-Z]/.test(text)) return text;
    const lower = text.toLowerCase();
    return lower.charAt(0).toUpperCase() + lower.slice(1);
};

const isTabActive = (tab, tabs, location) => {
    if (tab.path.includes('?')) return location.pathname + location.search === tab.path;
    if (location.pathname === tab.path) return true;
    if (tab.path === '/admin' || !location.pathname.startsWith(tab.path + '/')) return false;
    // A deeper tab owns its own sub-paths.
    return !tabs.some(t => t.path !== tab.path && t.path.startsWith(tab.path) && (location.pathname === t.path || location.pathname.startsWith(t.path + '/')));
};

const SectionTabs = ({ tabs }) => {
    const location = useLocation();
    const a = useAccent();
    const scrollerRef = useRef(null);

    // Keep the active tab visible on narrow screens.
    useEffect(() => {
        const el = scrollerRef.current?.querySelector('[aria-current="page"]');
        el?.scrollIntoView({ block: 'nearest', inline: 'center' });
    }, [location.pathname, location.search]);

    return (
        <div className="relative -mx-4 sm:mx-0">
            <div
                ref={scrollerRef}
                className="flex gap-1 overflow-x-auto border-b border-black/[0.07] px-4 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] dark:border-white/[0.07] sm:px-0 [&::-webkit-scrollbar]:hidden"
            >
                {tabs.map(tab => {
                    const Icon = tab.icon;
                    const active = isTabActive(tab, tabs, location);
                    return (
                        <Link
                            key={tab.name}
                            to={tab.comingSoon ? '#' : tab.path}
                            aria-current={active ? 'page' : undefined}
                            className={cn(
                                'relative flex h-11 shrink-0 items-center gap-2 px-3 text-[13px] font-semibold transition-colors',
                                active ? 'text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-900 dark:text-zinc-500 dark:hover:text-white',
                                tab.comingSoon && 'pointer-events-none opacity-40'
                            )}
                        >
                            {Icon && <Icon size={15} className={active ? a.text : ''} />}
                            <span className="whitespace-nowrap">{humanize(tab.name)}</span>
                            {tab.badge !== undefined && tab.badge !== null && (
                                <span className={cn('rounded-full px-1.5 py-0.5 text-[11px] font-bold tabular-nums', accent('amber').chip)}>
                                    {tab.badge}
                                </span>
                            )}
                            {tab.comingSoon && <span className="rounded-full bg-black/5 px-1.5 py-0.5 text-[11px] font-semibold text-gray-500 dark:bg-white/5">Soon</span>}
                            {active && <span className={cn('absolute inset-x-2 -bottom-px h-0.5 rounded-full', a.dot)} />}
                        </Link>
                    );
                })}
            </div>
        </div>
    );
};

const AdminCommunityHubLayout = ({ children, title, description, action, studioHeader, hideTabs = false, tabs: customTabs }) => {
    const moduleAccent = useAccent();
    const location = useLocation();
    // Tabs that only repeat another sidebar entry (Invoices on the Proposals page, Blog on
    // the Events page…) are dropped; real sub-pages (Spends under Finance) stay.
    const currentItem = findActiveNavItem(ADMIN_NAV_GROUPS, location.pathname);
    const tabs = (customTabs || DEFAULT_TABS).filter(tab => {
        const tabPath = tab.path.split('?')[0];
        return !NAV_PATHS.has(tabPath) || tabPath === currentItem?.path;
    });
    const header = studioHeader || { title: 'Community', subtitle: 'Hub', icon: LayoutGrid };
    const HeaderIcon = header.icon;
    const heading = [humanize(header.title), humanize(header.subtitle)].filter(Boolean).join(' ');

    return (
        <div className="mx-auto w-full max-w-[1600px] px-4 pb-10 pt-5 font-heading sm:px-6 lg:px-10 lg:pt-8">
            <header className="mb-5 flex items-center gap-3 sm:gap-3.5 lg:mb-6">
                {header.logo ? (
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-black/[0.06] bg-black p-0.5 dark:border-white/[0.08] dark:bg-white/5">
                        <img src={header.logo} alt="" className="h-full w-full object-contain" />
                    </div>
                ) : HeaderIcon ? (
                    // The module colour, so every page header matches its sidebar entry.
                    <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl sm:h-12 sm:w-12', header.tone ? accent(header.tone).chip : moduleAccent.chip)}>
                        <HeaderIcon size={21} />
                    </div>
                ) : null}
                <div className="min-w-0">
                    <h1 className="truncate text-xl font-extrabold tracking-tight text-gray-950 dark:text-white sm:text-2xl lg:text-[28px] lg:leading-tight">{heading}</h1>
                    {/* Phones wrap the line rather than cut it off mid-word. */}
                    {header.description && <p className="mt-0.5 line-clamp-2 text-[13px] font-medium leading-snug text-gray-500 dark:text-zinc-400 sm:line-clamp-1 sm:text-sm">{header.description}</p>}
                </div>
            </header>

            {!hideTabs && tabs.length > 1 && (
                <div className="mb-6">
                    <SectionTabs tabs={tabs} />
                </div>
            )}

            <div className="relative min-h-[50dvh]">
                {(title || description || action) && (
                    <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                        {(title || description) && (
                            <div className="min-w-0 flex-1">
                                {title && <h2 className="text-lg font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-xl">{humanize(title)}</h2>}
                                {description && <p className="mt-1 text-[13px] font-medium text-gray-500 dark:text-zinc-400">{sentence(description)}</p>}
                            </div>
                        )}
                        {action && <div className="relative z-20 w-full shrink-0 sm:w-auto">{action}</div>}
                    </div>
                )}
                {children}
            </div>
        </div>
    );
};

export default AdminCommunityHubLayout;
