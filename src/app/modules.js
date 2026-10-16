import { lazy } from 'react';
import House from 'lucide-react/dist/esm/icons/house';
import Users from 'lucide-react/dist/esm/icons/users';
import Camera from 'lucide-react/dist/esm/icons/camera';
import GraduationCap from 'lucide-react/dist/esm/icons/graduation-cap';
import CircleUserRound from 'lucide-react/dist/esm/icons/circle-user-round';

/*
 * The app's modules. The shell builds its tabs and routes from this list, so a
 * new module (Campus) is added here without touching the shell.
 *
 *   id          stable key
 *   path        mount path inside the app ('/' for Home)
 *   tab         { label, icon, lockedLabel? } for the bottom bar / left rail
 *   capability  users/{uid}.capabilities key needed to use it. Without it the
 *               tab still shows (with lockedLabel) when `showLocked` is set,
 *               so people can discover it; otherwise it's hidden.
 *   launched    false keeps the module out of the shell entirely
 *   routes      [{ path, Component }] relative to `path`
 *   onboarding  profile fields this module's main flow needs (requirements.js)
 *
 * There is no Passes tab: guestlist passes live in Community, campaign tickets
 * inside the creator's campaign.
 */

const HomePage = lazy(() => import('./pages/HomePage'));
const CommunityPage = lazy(() => import('./pages/CommunityPage'));
const CreatorPage = lazy(() => import('./pages/CreatorPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const GuestlistPage = lazy(() => import('./community/GuestlistPage'));
const GiveawayPage = lazy(() => import('./community/GiveawayPage'));
const FormPage = lazy(() => import('./community/FormPage'));
const PassPage = lazy(() => import('./passes/PassPage'));
const TicketLinkPage = lazy(() => import('./passes/TicketLinkPage'));

export const APP_MODULES = [
    {
        id: 'home',
        path: '/',
        tab: { label: 'Home', icon: House },
        capability: null,
        launched: true,
        routes: [{ path: '', Component: HomePage }],
        onboarding: [],
    },
    {
        id: 'community',
        path: '/community',
        tab: { label: 'Community', icon: Users },
        capability: null,
        launched: true,
        routes: [
            { path: '', Component: CommunityPage },
            { path: 'g/:id', Component: GuestlistPage },
            { path: 'giveaways/:slug', Component: GiveawayPage },
        ],
        onboarding: ['name'],
    },
    {
        id: 'creator',
        path: '/creator',
        tab: { label: 'Creator', icon: Camera, lockedLabel: 'Become a creator' },
        capability: 'creator',
        showLocked: true,
        launched: true,
        routes: [{ path: '', Component: CreatorPage }],
        onboarding: ['name', 'email', 'phoneVerified', 'city'],
    },
    {
        id: 'campus',
        path: '/campus',
        tab: { label: 'Campus', icon: GraduationCap },
        capability: 'campus',
        showLocked: false,
        // Hidden until Campus launches (Phase 7 registers its routes).
        launched: false,
        routes: [],
        onboarding: ['name', 'college'],
    },
    {
        id: 'profile',
        path: '/profile',
        tab: { label: 'Profile', icon: CircleUserRound },
        capability: null,
        launched: true,
        routes: [{ path: '', Component: ProfilePage }],
        onboarding: [],
    },
];

export const launchedModules = () => APP_MODULES.filter(m => m.launched);

/*
 * The tabs a user sees. `has(capability)` answers whether they hold it.
 * Each tab is { module, locked, label }.
 */
export function visibleTabs(has) {
    return launchedModules()
        .map((module) => {
            const allowed = !module.capability || has(module.capability);
            if (!allowed && !module.showLocked) return null;
            return { module, locked: !allowed, label: allowed ? module.tab.label : (module.tab.lockedLabel || module.tab.label) };
        })
        .filter(Boolean);
}

/* The module a path belongs to ('/community/g/x' → community). Home matches only '/'. */
export function moduleForPath(pathname = '/') {
    const path = pathname.replace(/\/+$/, '') || '/';
    return launchedModules().find(m => (m.path === '/' ? path === '/' : path === m.path || path.startsWith(`${m.path}/`))) || null;
}

/*
 * Pages that belong to no tab: a pass (opened from Community or a campaign),
 * the signed ticket link from WhatsApp/email, and a single form.
 */
export const STANDALONE_ROUTES = [
    { path: 'p/:ref', Component: PassPage },
    { path: 't/:token', Component: TicketLinkPage },
    { path: 'forms/:id', Component: FormPage },
];

/* Route definitions for the router, relative to the app root. */
export function appRoutes() {
    return [
        ...launchedModules().flatMap(module => module.routes.map(route => {
            const base = module.path === '/' ? '' : module.path.slice(1);
            const path = [base, route.path].filter(Boolean).join('/');
            return { key: `${module.id}:${route.path || 'index'}`, path, index: !path, Component: route.Component };
        })),
        ...STANDALONE_ROUTES.map(route => ({ key: `page:${route.path}`, path: route.path, index: false, Component: route.Component })),
    ];
}
