/**
 * Admin navigation — the single source of truth for the admin shell
 * (desktop sidebar, mobile bottom tabs, "More" sheet and the quick-jump palette).
 *
 * Each item declares who can see it (`roles`, or `deny`) and which maintenance
 * card hides it (`card`). Keep paths in sync with the routes in App.jsx.
 */
import LayoutDashboard from 'lucide-react/dist/esm/icons/layout-dashboard';
import TrendingUp from 'lucide-react/dist/esm/icons/trending-up';
import FileText from 'lucide-react/dist/esm/icons/file-text';
import FileSpreadsheet from 'lucide-react/dist/esm/icons/file-spreadsheet';
import Scale from 'lucide-react/dist/esm/icons/scale';
import Calendar from 'lucide-react/dist/esm/icons/calendar';
import Radio from 'lucide-react/dist/esm/icons/radio';
import PenSquare from 'lucide-react/dist/esm/icons/pen-square';
import Music from 'lucide-react/dist/esm/icons/music';
import Ticket from 'lucide-react/dist/esm/icons/ticket';
import ScanLine from 'lucide-react/dist/esm/icons/scan-line';
import Users from 'lucide-react/dist/esm/icons/users';
import ClipboardList from 'lucide-react/dist/esm/icons/clipboard-list';
import Gift from 'lucide-react/dist/esm/icons/gift';
import Megaphone from 'lucide-react/dist/esm/icons/megaphone';
import Shield from 'lucide-react/dist/esm/icons/shield';
import Mail from 'lucide-react/dist/esm/icons/mail';
import Settings from 'lucide-react/dist/esm/icons/settings';
import Plus from 'lucide-react/dist/esm/icons/plus';
import Bell from 'lucide-react/dist/esm/icons/bell';
import Globe from 'lucide-react/dist/esm/icons/globe';
import Quote from 'lucide-react/dist/esm/icons/quote';
import Target from 'lucide-react/dist/esm/icons/target';
import Zap from 'lucide-react/dist/esm/icons/zap';
import MessageCircle from 'lucide-react/dist/esm/icons/message-circle';
import SlidersHorizontal from 'lucide-react/dist/esm/icons/sliders-horizontal';
import ListChecks from 'lucide-react/dist/esm/icons/list-checks';
import UserRound from 'lucide-react/dist/esm/icons/user-round';
import Smartphone from 'lucide-react/dist/esm/icons/smartphone';
import Receipt from 'lucide-react/dist/esm/icons/receipt';
import Wallet from 'lucide-react/dist/esm/icons/wallet';
import WhatsAppLogo from '../components/app/WhatsAppLogo';
import { FINANCE_ROLES, FULL_ACCESS_ROLES, SCANNER_ROLES, CONTENT_ROLES } from './roles';

const NOT_SCANNER = { deny: [...SCANNER_ROLES] };
const OPERATIONS = { deny: [...SCANNER_ROLES, 'blog_writer'] };

/*
 * Grouped by what each page controls:
 *   Overview · Landing site (newbi.live) · App (Creators, Community, Events & tickets,
 *   Everyone) · Finance & documents · Team.
 * Item ids are used by quick actions and the dashboard; keep them stable.
 */
export const ADMIN_NAV_GROUPS = [
    {
        id: 'overview',
        title: 'Overview',
        items: [
            { id: 'dashboard', accent: 'green', name: 'Dashboard', path: '/admin', icon: LayoutDashboard, exact: true },
            { id: 'inbox', accent: 'blue', name: 'Inbox', path: '/admin/messages', icon: Mail, card: 'messages', ...OPERATIONS, badgeKey: 'inbox' },
            // Same roles the server allows (api/_lib/outreach.js OUTREACH_ROLES).
            { id: 'whatsapp', accent: 'green', name: 'WhatsApp', path: '/admin/whatsapp', icon: WhatsAppLogo, roles: ['founder', 'super_admin', 'developer', 'admin'] },
        ],
    },
    {
        id: 'site',
        title: 'Landing site',
        items: [
            { id: 'site', accent: 'cyan', name: 'Site settings', path: '/admin/site', icon: Globe, ...NOT_SCANNER, match: ['/admin/content'] },
            { id: 'portfolio', accent: 'violet', name: 'Work', path: '/admin/concertzone', icon: Music, card: 'concerts', ...NOT_SCANNER },
            { id: 'brands', accent: 'amber', name: 'Brands & quotes', path: '/admin/brands', icon: Quote, ...NOT_SCANNER },
            { id: 'blog', accent: 'indigo', name: 'ConcertZone', path: '/admin/blog', icon: PenSquare, card: 'blog_announcements', ...NOT_SCANNER, match: ['/admin/concertzone/studio', '/admin/newsletter'] },
        ],
    },
    {
        id: 'app-creators',
        title: 'App · Creators',
        items: [
            { id: 'campaigns', accent: 'pink', name: 'Campaigns', path: '/admin/campaigns', icon: Target, card: 'influencer', ...OPERATIONS },
            { id: 'creators', accent: 'rose', name: 'Creators', path: '/admin/creators', icon: Zap, card: 'influencer', ...OPERATIONS },
            { id: 'creator-groups', accent: 'green', name: 'Groups', path: '/admin/creators/groups', icon: MessageCircle, card: 'influencer', ...OPERATIONS, match: ['/admin/city-groups'] },
            { id: 'creator-settings', accent: 'gray', name: 'Creator settings', path: '/admin/creators/settings', icon: SlidersHorizontal, card: 'influencer', ...OPERATIONS },
        ],
    },
    {
        id: 'app-community',
        title: 'App · Community',
        items: [
            { id: 'gigs', accent: 'orange', name: 'Volunteer gigs', path: '/admin/volunteer-gigs', icon: Users, card: 'community', ...OPERATIONS },
            { id: 'giveaways', accent: 'rose', name: 'Giveaways', path: '/admin/giveaways', icon: Gift, card: 'giveaways', ...OPERATIONS },
            { id: 'forms', accent: 'indigo', name: 'Forms', path: '/admin/forms', icon: ClipboardList, card: 'forms_public', ...OPERATIONS },
        ],
    },
    {
        id: 'events',
        title: 'App · Events & tickets',
        items: [
            { id: 'upcoming', accent: 'green', name: 'Events', path: '/admin/upcoming-events', icon: Calendar, card: 'upcoming_events', ...NOT_SCANNER },
            { id: 'ticketing', accent: 'orange', name: 'Ticket sales', path: '/admin/ticketing', icon: Ticket, card: 'ticketing' },
            { id: 'guestlists', accent: 'fuchsia', name: 'Guestlists', path: '/admin/guestlists', icon: ListChecks, card: 'guestlists', ...OPERATIONS },
            { id: 'scanner', accent: 'teal', name: 'Gate scanner', path: '/admin/scanner', icon: ScanLine, card: 'ticketing' },
        ],
    },
    {
        id: 'app-everyone',
        title: 'App · Everyone',
        items: [
            { id: 'announcements', accent: 'amber', name: 'Announcements', path: '/admin/announcements', icon: Radio, card: 'blog_announcements', ...NOT_SCANNER },
            { id: 'mailing', accent: 'fuchsia', name: 'Mailing', path: '/admin/mailing', icon: Megaphone, card: 'mailing', ...OPERATIONS },
            { id: 'users', accent: 'blue', name: 'App users', path: '/admin/users', icon: UserRound, card: 'admins', deny: [...SCANNER_ROLES, ...CONTENT_ROLES], match: ['/admin/active-users'] },
            { id: 'app-settings', accent: 'gray', name: 'App settings', path: '/admin/app-settings', icon: Smartphone, ...NOT_SCANNER },
        ],
    },
    {
        id: 'finance',
        title: 'Finance & documents',
        items: [
            { id: 'finance', accent: 'teal', name: 'Finance board', path: '/admin/finance', icon: TrendingUp, roles: FINANCE_ROLES, card: 'invoices', match: ['/admin/other-income'] },
            { id: 'invoices', accent: 'blue', name: 'Invoices', path: '/admin/invoices', icon: FileText, roles: FINANCE_ROLES, card: 'invoices', match: ['/admin/create-invoice', '/admin/edit-invoice'] },
            { id: 'proposals', accent: 'violet', name: 'Proposals', path: '/admin/proposals', icon: FileSpreadsheet, card: 'docs', ...OPERATIONS, match: ['/admin/create-proposal', '/admin/edit-proposal', '/admin/ai-studio'] },
            { id: 'contracts', accent: 'amber', name: 'Contracts', path: '/admin/agreements', icon: Scale, card: 'docs', ...OPERATIONS },
            { id: 'spends', accent: 'rose', name: 'Spends', path: '/admin/spends', icon: Receipt, roles: FINANCE_ROLES, card: 'invoices' },
            { id: 'payees', accent: 'green', name: 'Payees', path: '/admin/payees', icon: Wallet, roles: FINANCE_ROLES, card: 'invoices' },
        ],
    },
    {
        id: 'team',
        title: 'Team',
        items: [
            { id: 'members', accent: 'indigo', name: 'Team', path: '/admin/manage-admins', icon: Shield, card: 'admins', deny: [...SCANNER_ROLES, ...CONTENT_ROLES] },
            { id: 'system', accent: 'gray', name: 'System', path: '/admin/system-command', icon: Settings, roles: FULL_ACCESS_ROLES },
        ],
    },
];

// Shortcuts shown in the quick-jump palette and on the dashboard.
export const ADMIN_QUICK_ACTIONS = [
    { id: 'new-invoice', name: 'New invoice', path: '/admin/create-invoice', icon: Plus, requires: 'invoices' },
    { id: 'new-proposal', name: 'New proposal', path: '/admin/create-proposal', icon: Plus, requires: 'proposals' },
    { id: 'new-contract', name: 'New contract', path: '/admin/agreements/new', icon: Plus, requires: 'contracts' },
    { id: 'new-event', name: 'New event', path: '/admin/upcoming-events?new=1', icon: Plus, requires: 'upcoming' },
    { id: 'scan', name: 'Scan tickets', path: '/admin/scanner', icon: ScanLine, requires: 'scanner' },
    { id: 'new-post', name: 'New blog post', path: '/admin/blog/create', icon: Plus, requires: 'blog' },
    { id: 'send-notification', name: 'Send notification', path: '/admin/announcements?compose=notification', icon: Bell, requires: 'announcements' },
];

const canSee = (item, role, cards) => {
    if (item.card && cards?.[item.card]) return false;
    if (item.roles && !item.roles.includes(role)) return false;
    if (item.deny && item.deny.includes(role)) return false;
    return true;
};

/** Groups with only the items this role can see; empty groups are dropped. */
export const getAdminNav = (role, cards = {}) =>
    ADMIN_NAV_GROUPS
        .map(group => ({ ...group, items: group.items.filter(item => canSee(item, role, cards)) }))
        .filter(group => group.items.length > 0);

export const getQuickActions = (nav) => {
    const visible = new Set(nav.flatMap(g => g.items.map(i => i.id)));
    return ADMIN_QUICK_ACTIONS.filter(a => visible.has(a.requires));
};

/** True when `pathname` belongs to `item` (its own path, sub-paths, or extra `match` prefixes). */
export const isNavItemActive = (item, pathname) => {
    const path = pathname.replace(/\/$/, '') || '/';
    if (item.exact) return path === item.path;
    const prefixes = [item.path, ...(item.match || [])];
    return prefixes.some(p => path === p || path.startsWith(p + '/'));
};

/** Most specific nav item for the current path (longest matching prefix wins). */
export const findActiveNavItem = (nav, pathname) => {
    let best = null;
    let bestLen = -1;
    nav.forEach(group => group.items.forEach(item => {
        if (!isNavItemActive(item, pathname)) return;
        const len = Math.max(...[item.path, ...(item.match || [])].filter(p => pathname.startsWith(p)).map(p => p.length), 0);
        if (len > bestLen) { best = item; bestLen = len; }
    }));
    return best;
};

// Full-screen tools (editors, the gate scanner) render without the shell.
const IMMERSIVE_PATTERNS = [
    /^\/admin\/create-/,
    /^\/admin\/edit-/,
    /^\/admin\/agreements\/(new|edit)/,
    /^\/admin\/ai-studio/,
    /^\/admin\/blog\/(create|edit)/,
    /^\/admin\/scanner/,
];

export const isImmersiveAdminPath = (pathname) => IMMERSIVE_PATTERNS.some(re => re.test(pathname));

export const isAdminPath = (pathname) => pathname === '/admin' || pathname.startsWith('/admin/');
