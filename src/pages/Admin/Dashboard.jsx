import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import IndianRupee from 'lucide-react/dist/esm/icons/indian-rupee';
import Users from 'lucide-react/dist/esm/icons/users';
import UserCheck from 'lucide-react/dist/esm/icons/user-check';
import Shield from 'lucide-react/dist/esm/icons/shield';
import ShieldAlert from 'lucide-react/dist/esm/icons/shield-alert';
import Clock from 'lucide-react/dist/esm/icons/clock';
import Star from 'lucide-react/dist/esm/icons/star';
import CheckCircle2 from 'lucide-react/dist/esm/icons/check-circle-2';
import Layers from 'lucide-react/dist/esm/icons/layers';
import Target from 'lucide-react/dist/esm/icons/target';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import TrendingUp from 'lucide-react/dist/esm/icons/trending-up';
import FileText from 'lucide-react/dist/esm/icons/file-text';
import Briefcase from 'lucide-react/dist/esm/icons/briefcase';
import Ticket from 'lucide-react/dist/esm/icons/ticket';
import Calendar from 'lucide-react/dist/esm/icons/calendar';
import ClipboardList from 'lucide-react/dist/esm/icons/clipboard-list';
import Tag from 'lucide-react/dist/esm/icons/tag';
import Megaphone from 'lucide-react/dist/esm/icons/megaphone';
import Gift from 'lucide-react/dist/esm/icons/gift';
import ListChecks from 'lucide-react/dist/esm/icons/list-checks';
import MessageSquare from 'lucide-react/dist/esm/icons/message-square';
import Radio from 'lucide-react/dist/esm/icons/radio';
import Music from 'lucide-react/dist/esm/icons/music';
import FileSpreadsheet from 'lucide-react/dist/esm/icons/file-spreadsheet';
import Scale from 'lucide-react/dist/esm/icons/scale';
import Folder from 'lucide-react/dist/esm/icons/folder';
import Pencil from 'lucide-react/dist/esm/icons/pencil';
import Check from 'lucide-react/dist/esm/icons/check';
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right';
import AlertCircle from 'lucide-react/dist/esm/icons/alert-circle';
import Wallet from 'lucide-react/dist/esm/icons/wallet';
import MapPin from 'lucide-react/dist/esm/icons/map-pin';
import Globe from 'lucide-react/dist/esm/icons/globe';
import Smartphone from 'lucide-react/dist/esm/icons/smartphone';

import { buildAttention, attentionNeeds } from '../../components/admin/dashboard/attention';
import { useStore } from '../../lib/store';
import { cn } from '../../lib/utils';
import { useStoreSubscription } from '../../hooks/useStoreSubscription';
import { useConsolidatedMembers } from '../../hooks/useConsolidatedMembers';
import { FINANCE_ROLES, FULL_ACCESS_ROLES } from '../../constants/roles';
import { getAdminNav, getQuickActions } from '../../constants/adminNavigation';
import { Card, Button, Badge } from '../../components/admin/ui';
import Sheet from '../../components/admin/Sheet';
import { accent } from '../../components/admin/theme';
import { RoleBadge } from '../../components/admin/workspace/roles';
import { invoiceTotal, invoiceBalance, isInvoiceOverdue, invoiceState, invoiceCollectedSince } from '../../lib/invoicing';
import { proposalState } from '../../lib/proposals';
import { campaignStatus } from '../../components/admin/campaigns/campaignModel';
import { giveawayState } from '../../components/admin/giveaways/giveawayUtils';

// ─── helpers ────────────────────────────────────────────────────────────────

const DEFAULT_WIDGETS = ['total_members', 'active_users', 'administrators', 'ticket_sales'];
const MEMBER_METRICS = new Set(['total_members', 'active_users', 'suspended_accounts']);

const inr = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;
const compact = (num) => {
    if (!num || isNaN(num)) return '0';
    if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
    return num.toLocaleString();
};

// Firestore timestamps, ISO strings and "YYYY-MM-DDTHH:mm" local strings all show up.
const toDate = (value) => {
    if (!value) return null;
    if (typeof value?.toDate === 'function') return value.toDate();
    if (typeof value === 'object' && typeof value.seconds === 'number') return new Date(value.seconds * 1000);
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
};

const todayKey = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const relative = (date) => {
    if (!date) return '';
    const diff = Date.now() - date.getTime();
    const mins = Math.round(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.round(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.round(hours / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

const daysUntil = (date) => {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const target = new Date(date); target.setHours(0, 0, 0, 0);
    return Math.round((target - start) / 86400000);
};

const greeting = () => {
    const h = new Date().getHours();
    if (h < 5) return 'Working late';
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
};


// Icon tiles take the shared accent colours (purple maps to violet).
const chip = (tone) => accent(tone).chip;

// Status badges on the "recently edited" list.
const statusTone = (status) => (['Paid', 'Accepted', 'Executed'].includes(status) ? 'green'
    : ['Rejected'].includes(status) ? 'red'
        : ['Sent', 'Final', 'Verification Pending'].includes(status) ? 'amber' : 'gray');

// Pinned metric: big number first (money values can be long, so it truncates).
const MetricTile = ({ link, tone, icon: Icon, label, value, detail }) => {
    const a = accent(tone);
    return (
        <Link to={link} title={`${label}: ${value}`} className="group block h-full rounded-2xl border border-black/[0.06] bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-black/15 dark:border-white/[0.08] dark:bg-white/[0.03] dark:hover:border-white/20 sm:p-5">
            <div className="flex items-center justify-between gap-2">
                <span className={cn('flex h-10 w-10 items-center justify-center rounded-xl', a.chip)}><Icon size={18} /></span>
                <span className={cn('h-1.5 w-8 rounded-full opacity-70 transition-opacity group-hover:opacity-100', a.dot)} aria-hidden="true" />
            </div>
            <p className="mt-4 truncate text-[22px] font-extrabold leading-none tracking-tight tabular-nums sm:text-[26px]">{value}</p>
            <p className="mt-2 truncate text-[13px] font-bold text-gray-700 dark:text-zinc-300">{label}</p>
            <p className="truncate text-[12px] text-gray-500">{detail}</p>
        </Link>
    );
};

const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/* One part of the admin (Landing site, App, Money): its key numbers, each opening its page, then extras. */
const AreaCard = ({ title, subtitle, icon: Icon, tone, to, rows = [], children }) => (
    <Card className="space-y-4 rounded-2xl p-4 sm:p-5">
        <Link to={to} className="group flex items-center gap-3">
            <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', accent(tone).chip)}><Icon size={18} /></span>
            <span className="min-w-0 flex-1">
                <span className="block text-[16px] font-extrabold tracking-tight">{title}</span>
                <span className="block text-[12px] text-gray-500">{subtitle}</span>
            </span>
            <ChevronRight size={16} className="shrink-0 text-gray-300 transition-transform group-hover:translate-x-0.5 dark:text-zinc-600" />
        </Link>
        {rows.length > 0 && (
            <ul className="divide-y divide-black/[0.05] rounded-xl border border-black/[0.05] dark:divide-white/[0.05] dark:border-white/[0.06]">
                {rows.map(r => (
                    <li key={r.label}>
                        <Link to={r.to} className="flex min-h-[52px] items-center gap-3 px-3.5 py-2 transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.02]">
                            <span className="min-w-0 flex-1">
                                <span className="block truncate text-[13px] font-bold">{r.label}</span>
                                {r.hint && <span className="block truncate text-[11px] text-gray-500">{r.hint}</span>}
                            </span>
                            <span className={cn('shrink-0 text-[15px] font-extrabold tabular-nums', r.tone && accent(r.tone).text)}>{r.value}</span>
                        </Link>
                    </li>
                ))}
            </ul>
        )}
        {children}
    </Card>
);

const SectionTitle = ({ children, action }) => (
    <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-[15px] font-bold text-gray-900 dark:text-white">{children}</h2>
        {action}
    </div>
);

// Mounted only when a members metric is visible: the hook opens eight listeners.
const MemberCounts = ({ onChange }) => {
    const { totalCount, activeCount, suspendedCount } = useConsolidatedMembers();
    useEffect(() => { onChange({ total: totalCount, active: activeCount, suspended: suspendedCount }); }, [totalCount, activeCount, suspendedCount, onChange]);
    return null;
};

// ─── metric registry ───────────────────────────────────────────────────────

// `needs` lists the store collections a metric reads, so the dashboard only
// subscribes to what is on screen. `finance` metrics are hidden from other roles.
const buildRegistry = (s, members) => {
    const paidRevenue = (s.invoices || []).filter(i => i.status === 'Paid').reduce((a, i) => a + invoiceTotal(i), 0)
        + (s.otherIncomes || []).filter(i => i.status === 'Paid').reduce((a, i) => a + Number(i.amount || 0), 0);
    const paidExpenses = (s.spends || []).filter(sp => sp.status === 'Paid' || sp.status === 'Cleared').reduce((a, sp) => a + Number(sp.amount || 0), 0);
    const net = paidRevenue - paidExpenses;
    const soldOrders = (s.ticketOrders || []).filter(o => ['approved', 'dispatched', 'confirmed', 'attended'].includes(o.status));
    const ticketCount = soldOrders.reduce((a, o) => a + ((o.items || []).reduce((n, it) => n + Number(it.count || 0), 0) || 1), 0);
    const ticketRevenue = soldOrders.reduce((a, o) => a + Number(o.totalAmount || 0), 0);
    const creators = s.creators || [];
    const approvedCreators = creators.filter(c => c.profileStatus === 'approved').length;
    const pendingCreators = creators.filter(c => !c.profileStatus || c.profileStatus === 'pending').length;
    const reach = creators.reduce((a, c) => a + Math.max(Number(c.instagramFollowers || 0), Number(c.youtubeSubscribers || 0), Number(c.linkedinFollowers || 0)), 0);
    const admins = s.admins || [];
    const activeAdmins = admins.filter(a => a.role !== 'pending').length;
    const pendingAdmins = admins.filter(a => a.role === 'pending').length;
    const unread = (s.messages || []).filter(m => m.status === 'new').length;
    const len = (k) => (s[k] || []).length.toLocaleString();

    return {
        total_members: { category: 'People', label: 'Total members', value: members ? members.total.toLocaleString() : '—', icon: Users, tone: 'blue', detail: 'All platform accounts', link: '/admin/manage-admins?tab=members', needs: [] },
        active_users: { category: 'People', label: 'Active users', value: members ? members.active.toLocaleString() : '—', icon: UserCheck, tone: 'green', detail: members?.total ? `${Math.round((members.active / members.total) * 100)}% of members` : 'Active accounts', link: '/admin/manage-admins?tab=active', needs: [] },
        administrators: { category: 'People', label: 'Administrators', value: activeAdmins, icon: Shield, tone: 'pink', detail: pendingAdmins ? `${pendingAdmins} awaiting approval` : 'No pending requests', link: '/admin/manage-admins?tab=admins', needs: ['admins'] },
        pending_clearances: { category: 'People', label: 'Access requests', value: pendingAdmins, icon: Clock, tone: 'amber', detail: 'Staff waiting for approval', link: '/admin/manage-admins?tab=requests', needs: ['admins'] },
        suspended_accounts: { category: 'People', label: 'Suspended', value: members ? members.suspended : '—', icon: ShieldAlert, tone: 'red', detail: 'Restricted accounts', link: '/admin/manage-admins?tab=members&filter=suspended', needs: [] },

        creators_total: { category: 'Creators', label: 'Creators', value: creators.length.toLocaleString(), icon: Star, tone: 'blue', detail: `${approvedCreators} verified`, link: '/admin/creators', needs: ['creators'] },
        creators_approved: { category: 'Creators', label: 'Verified creators', value: approvedCreators.toLocaleString(), icon: CheckCircle2, tone: 'green', detail: `${pendingCreators} awaiting review`, link: '/admin/creators', needs: ['creators'] },
        creators_pending: { category: 'Creators', label: 'Pending creators', value: pendingCreators.toLocaleString(), icon: Clock, tone: 'amber', detail: 'Applications to review', link: '/admin/creators?status=pending', needs: ['creators'] },
        creator_groups: { category: 'Creators', label: 'Creator hubs', value: len('creatorGroups'), icon: Layers, tone: 'purple', detail: 'City & college groups', link: '/admin/creators/settings?tab=groups', needs: ['creatorGroups'] },
        campaigns_count: { category: 'Creators', label: 'Campaigns', value: len('campaigns'), icon: Target, tone: 'pink', detail: 'Brand campaigns', link: '/admin/campaigns', needs: ['campaigns'] },
        creator_reach: { category: 'Creators', label: 'Creator reach', value: compact(reach), icon: Sparkles, tone: 'green', detail: 'Combined audience', link: '/admin/creators', needs: ['creators'] },

        total_revenue: { category: 'Finance', finance: true, label: 'Revenue received', value: inr(paidRevenue), icon: IndianRupee, tone: 'green', detail: `Net ${inr(net)}`, link: '/admin/finance', needs: ['invoices', 'otherIncomes', 'spends'] },
        total_expenses: { category: 'Finance', finance: true, label: 'Expenses paid', value: inr(paidExpenses), icon: IndianRupee, tone: 'pink', detail: `${len('spends')} entries`, link: '/admin/spends', needs: ['spends'] },
        net_cashflow: { category: 'Finance', finance: true, label: 'Net cash flow', value: inr(net), icon: TrendingUp, tone: net >= 0 ? 'green' : 'red', detail: 'Revenue minus expenses', link: '/admin/finance', needs: ['invoices', 'otherIncomes', 'spends'] },
        invoices_count: { category: 'Finance', finance: true, label: 'Invoices', value: len('invoices'), icon: FileText, tone: 'blue', detail: `${(s.invoices || []).filter(i => i.status === 'Paid').length} paid`, link: '/admin/invoices', needs: ['invoices'] },
        payees_count: { category: 'Finance', finance: true, label: 'Payees', value: len('financePayees'), icon: Briefcase, tone: 'amber', detail: 'Vendors & payees', link: '/admin/payees', needs: ['financePayees'] },

        ticket_sales: { category: 'Events', label: 'Tickets sold', value: ticketCount.toLocaleString(), icon: Ticket, tone: 'pink', detail: `${soldOrders.length} orders`, link: '/admin/ticketing', needs: ['ticketOrders'] },
        ticket_revenue: { category: 'Events', finance: true, label: 'Ticket revenue', value: inr(ticketRevenue), icon: Ticket, tone: 'green', detail: `${ticketCount} tickets`, link: '/admin/ticketing', needs: ['ticketOrders'] },
        upcoming_events: { category: 'Events', label: 'Events listed', value: len('upcomingEvents'), icon: Calendar, tone: 'green', detail: 'On the website', link: '/admin/upcoming-events', needs: ['upcomingEvents'] },
        guestlists_count: { category: 'Events', label: 'Guestlists', value: len('guestlists'), icon: ClipboardList, tone: 'blue', detail: 'Event RSVP lists', link: '/admin/ticketing?kind=guestlist', needs: ['guestlists'] },
        coupons_count: { category: 'Events', label: 'Coupons', value: len('coupons'), icon: Tag, tone: 'purple', detail: 'Discount codes', link: '/admin/ticketing', needs: ['coupons'] },

        subscribers_count: { category: 'Community', label: 'Subscribers', value: len('subscribers'), icon: Megaphone, tone: 'blue', detail: 'Newsletter list', link: '/admin/mailing', needs: ['subscribers'] },
        giveaways_count: { category: 'Community', label: 'Giveaways', value: len('giveaways'), icon: Gift, tone: 'purple', detail: 'Fan rewards', link: '/admin/giveaways', needs: ['giveaways'] },
        volunteer_gigs: { category: 'Community', label: 'Volunteer gigs', value: len('volunteerGigs'), icon: Users, tone: 'green', detail: 'Volunteer roles', link: '/admin/volunteer-gigs', needs: ['volunteerGigs'] },
        forms_count: { category: 'Community', label: 'Forms', value: len('forms'), icon: ListChecks, tone: 'amber', detail: 'Intake forms', link: '/admin/forms', needs: ['forms'] },
        inbox_messages: { category: 'Community', label: 'Inbox', value: len('messages'), icon: MessageSquare, tone: 'pink', detail: unread ? `${unread} unread` : 'All caught up', link: '/admin/messages', needs: ['messages'] },

        announcements_count: { category: 'Content', label: 'Announcements', value: len('announcements'), icon: Radio, tone: 'pink', detail: 'Site broadcasts', link: '/admin/announcements', needs: ['announcements'] },
        blog_posts: { category: 'Content', label: 'Blog posts', value: len('posts'), icon: FileText, tone: 'blue', detail: 'Articles', link: '/admin/blog', needs: ['posts'] },
        portfolio_count: { category: 'Content', label: 'Portfolio', value: len('portfolio'), icon: Music, tone: 'purple', detail: 'Past events', link: '/admin/concertzone', needs: ['portfolio'] },

        proposals_count: { category: 'Documents', label: 'Proposals', value: len('proposals'), icon: FileSpreadsheet, tone: 'blue', detail: `${(s.proposals || []).filter(p => p.status === 'Accepted').length} accepted`, link: '/admin/proposals', needs: ['proposals'] },
        contracts_count: { category: 'Documents', label: 'Contracts', value: len('agreements'), icon: Scale, tone: 'purple', detail: `${(s.agreements || []).filter(a => a.status === 'Executed').length} signed`, link: '/admin/agreements', needs: ['agreements'] },
    };
};

// ─── widget picker ─────────────────────────────────────────────────────────

const WidgetPicker = ({ open, onClose, registry, current, onSave }) => {
    const [selected, setSelected] = useState(current);
    const [saving, setSaving] = useState(false);

    useEffect(() => { if (open) setSelected(current); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

    const toggle = (key) => setSelected(prev => (
        prev.includes(key) ? prev.filter(k => k !== key) : prev.length < 4 ? [...prev, key] : prev
    ));

    const save = async () => {
        if (saving) return;
        setSaving(true);
        try { await onSave(selected); onClose(); } catch { /* toast already shown; keep the picker open */ } finally { setSaving(false); }
    };

    const categories = useMemo(() => {
        const out = {};
        Object.entries(registry).forEach(([key, metric]) => { (out[metric.category] ||= []).push({ key, ...metric }); });
        return out;
    }, [registry]);

    return (
        <Sheet
            open={open}
            onClose={saving ? () => {} : onClose}
            size="lg"
            header={(
                <div>
                    <h2 className="text-lg font-extrabold tracking-tight">Dashboard metrics</h2>
                    <p className="mt-0.5 text-[13px] text-gray-500">Pick 4 to pin at the top · {selected.length} of 4 picked</p>
                    <div className="mt-3 grid grid-cols-4 gap-1.5">
                        {[0, 1, 2, 3].map(i => (
                            <div key={i} className={cn('h-1 rounded-full transition-colors', i < selected.length ? 'bg-emerald-500 dark:bg-neon-green' : 'bg-black/10 dark:bg-white/10')} />
                        ))}
                    </div>
                </div>
            )}
            bodyClassName="space-y-6"
            footer={(
                <div className="flex gap-2">
                    <Button variant="ghost" onClick={onClose} disabled={saving} className="h-12">Cancel</Button>
                    <Button variant="primary" onClick={save} disabled={selected.length !== 4 || saving} className="h-12 flex-1">
                        {saving ? 'Saving…' : selected.length === 4 ? 'Save metrics' : `Pick ${4 - selected.length} more`}
                    </Button>
                </div>
            )}
        >
            {Object.entries(categories).map(([category, metrics]) => (
                <div key={category}>
                    <p className="mb-2 text-[12px] font-bold text-gray-500">{category}</p>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {metrics.map(metric => {
                            const on = selected.includes(metric.key);
                            const disabled = !on && selected.length >= 4;
                            const Icon = metric.icon;
                            const a = accent(metric.tone);
                            return (
                                <button
                                    key={metric.key}
                                    type="button"
                                    disabled={disabled}
                                    onClick={() => toggle(metric.key)}
                                    aria-pressed={on}
                                    className={cn(
                                        'flex min-h-[56px] items-center gap-3 rounded-2xl border px-3 text-left transition-colors',
                                        on ? cn(a.border, a.soft) : 'border-black/[0.07] hover:border-black/20 dark:border-white/[0.07] dark:hover:border-white/20',
                                        disabled && 'opacity-35'
                                    )}
                                >
                                    <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', on ? a.solid : a.chip)}>
                                        {on ? <Check size={15} /> : <Icon size={15} />}
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate text-[13px] font-bold">{metric.label}</span>
                                        <span className="block truncate text-[12px] text-gray-500">{metric.detail}</span>
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            ))}
        </Sheet>
    );
};

// ─── dashboard ─────────────────────────────────────────────────────────────

const Dashboard = () => {
    const user = useStore(s => s.user);
    const maintenanceState = useStore(s => s.maintenanceState);
    const dashboardWidgets = useStore(s => s.dashboardWidgets);
    const saveDashboardWidgets = useStore(s => s.saveDashboardWidgets);
    const archivePastEvents = useStore(s => s.archivePastEvents);
    const addToast = useStore(s => s.addToast);

    const role = user?.role;
    const isFinance = FINANCE_ROLES.includes(role);
    const isFullAccess = FULL_ACCESS_ROLES.includes(role);
    const cards = maintenanceState?.features || {};
    const nav = useMemo(() => getAdminNav(role, cards), [role, cards]);
    const visible = useMemo(() => new Set(nav.flatMap(g => g.items.map(i => i.id))), [nav]);
    const quickActions = useMemo(() => getQuickActions(nav), [nav]);

    const [pickerOpen, setPickerOpen] = useState(false);
    const [members, setMembers] = useState(null);

    const widgetKeys = (dashboardWidgets?.length ? dashboardWidgets : DEFAULT_WIDGETS);

    // Collections the attention list, schedule and recent activity read.
    const baseNeeds = useMemo(() => {
        const keys = attentionNeeds(visible, { isFinance });
        if (visible.has('upcoming')) keys.push('upcomingEvents');
        // The Landing site and App areas.
        if (visible.has('inbox')) keys.push('messages');
        if (visible.has('portfolio')) keys.push('portfolio');
        if (visible.has('blog')) keys.push('posts');
        if (visible.has('creators') || visible.has('campaigns')) keys.push('creators', 'campaigns');
        if (visible.has('giveaways')) keys.push('giveaways');
        if (visible.has('gigs')) keys.push('volunteerGigs');
        if (visible.has('forms')) keys.push('forms');
        return keys;
    }, [visible, isFinance]);

    // The registry is rebuilt from live state; first pass is only for its `needs` lists.
    const state = useStore();
    const registry = useMemo(() => {
        const all = buildRegistry(state, members);
        if (isFinance) return all;
        return Object.fromEntries(Object.entries(all).filter(([, m]) => !m.finance));
    }, [state, members, isFinance]);

    const widgetNeeds = useMemo(() => {
        const keys = pickerOpen ? Object.keys(registry) : widgetKeys;
        return keys.flatMap(k => registry[k]?.needs || []);
    }, [pickerOpen, registry, widgetKeys]);

    const subscriptions = useMemo(() => [...new Set([...baseNeeds, ...widgetNeeds])].sort(), [baseNeeds, widgetNeeds]);
    useStoreSubscription(subscriptions);

    const showMemberCounts = pickerOpen || widgetKeys.some(k => MEMBER_METRICS.has(k));

    useEffect(() => {
        // Moves past events into the portfolio; runs on dashboard visits by full-access staff.
        if (isFullAccess) archivePastEvents?.();
    }, [isFullAccess, archivePastEvents]);

    // Tiles saved earlier that no longer exist (e.g. the old Artistant ones) just drop out.
    const widgets = widgetKeys.filter(key => registry[key]).map(key => ({ key, ...registry[key] }));

    // ── needs attention ── (rules live in components/admin/dashboard/attention.js)
    const attention = useMemo(
        () => buildAttention(state, visible, { isFinance, isFullAccess }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [state.invoices, state.spends, state.ticketOrders, state.upcomingEvents, state.proposals, state.agreements, state.creators, state.campaigns, state.giveaways, state.emailCampaigns, state.admins, state.messages, state.maintenanceState, visible, isFinance, isFullAccess]
    );
    const [showAllAttention, setShowAllAttention] = useState(false);
    const attentionShown = showAllAttention ? attention : attention.slice(0, 6);

    // ── schedule ──
    const upcoming = useMemo(() => {
        const now = Date.now() - 6 * 3600000; // keep tonight's event on the list while it runs
        return (state.upcomingEvents || [])
            .filter(e => !e.isForm)
            .map(e => ({ ...e, when: toDate(e.date) }))
            .filter(e => e.when && e.when.getTime() >= now)
            .sort((a, b) => a.when - b.when)
            .slice(0, 5);
    }, [state.upcomingEvents]);

    const ordersByEvent = useMemo(() => {
        const map = {};
        (state.ticketOrders || []).forEach(o => {
            if (!['approved', 'dispatched', 'confirmed', 'attended'].includes(o.status)) return;
            map[o.eventId] = (map[o.eventId] || 0) + ((o.items || []).reduce((n, it) => n + Number(it.count || 0), 0) || 1);
        });
        return map;
    }, [state.ticketOrders]);

    // ── recent documents ──
    const recent = useMemo(() => {
        const rows = [];
        if (visible.has('invoices')) (state.invoices || []).forEach(i => rows.push({ id: `i-${i.id}`, kind: 'Invoice', tone: 'blue', icon: FileText, title: i.clientName || 'Untitled invoice', meta: i.invoiceNumber ? `#${i.invoiceNumber}` : inr(invoiceTotal(i)), status: i.status, at: toDate(i.updatedAt || i.createdAt), link: `/admin/edit-invoice/${i.id}` }));
        if (visible.has('proposals')) (state.proposals || []).forEach(p => rows.push({ id: `p-${p.id}`, kind: 'Proposal', tone: 'violet', icon: FileSpreadsheet, title: p.clientName || 'Untitled proposal', meta: p.proposalNumber || '', status: p.status || 'Draft', at: toDate(p.updatedAt || p.createdAt), link: `/admin/edit-proposal/${p.id}` }));
        if (visible.has('contracts')) (state.agreements || []).forEach(a => rows.push({ id: `a-${a.id}`, kind: 'Contract', tone: 'amber', icon: Scale, title: a.parties?.secondParty?.name || a.details?.projectName || 'Untitled contract', meta: a.agreementNumber || '', status: a.status || 'Draft', at: toDate(a.updatedAt || a.createdAt), link: `/admin/agreements/edit/${a.id}` }));
        return rows.filter(r => r.at).sort((a, b) => b.at - a.at).slice(0, 6);
    }, [state.invoices, state.proposals, state.agreements, visible]);

    // ── finance snapshot ──
    const finance = useMemo(() => {
        if (!visible.has('invoices')) return null;
        const invoices = state.invoices || [];
        const unpaid = invoices.filter(i => invoiceBalance(i) > 0);
        const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
        // Money recorded this month (full and part payments), same as the invoices page.
        const paidThisMonth = invoices.reduce((sum, i) => sum + invoiceCollectedSince(i, monthStart), 0);
        // Who owes what: unpaid balances grouped by client, largest first.
        const clients = {};
        unpaid.forEach(i => {
            const name = (i.clientName || 'Unnamed client').trim();
            const key = name.toLowerCase();
            clients[key] = clients[key] || { name, balance: 0, count: 0, overdue: false };
            clients[key].balance += invoiceBalance(i);
            clients[key].count += 1;
            if (isInvoiceOverdue(i)) clients[key].overdue = true;
        });
        return {
            outstanding: unpaid.reduce((a, i) => a + invoiceBalance(i), 0),
            unpaidCount: unpaid.length,
            paidThisMonth,
            total: invoices.length,
            byClient: Object.values(clients).sort((a, b) => b.balance - a.balance),
        };
    }, [state.invoices, visible]);

    // ── Landing site area ──
    const siteArea = useMemo(() => {
        if (!['site', 'portfolio', 'brands', 'blog', 'inbox'].some(id => visible.has(id))) return null;
        const ss = state.siteSettings || {};
        const locked = Boolean(state.maintenanceState?.global);
        const sectionsOn = ['showUpcomingEvents', 'showPastClients', 'showCreatorTestimonials'].filter(k => ss[k] !== false).length;
        const posts = state.posts || [];
        const published = posts.filter(p => String(p.status || '').toLowerCase() === 'published').length;
        const unread = (state.messages || []).filter(m => m.status === 'new').length;
        const rows = [];
        if (visible.has('site')) {
            rows.push({ label: 'Status', value: locked ? 'Locked' : 'Live', tone: locked ? 'red' : 'green', hint: locked ? 'Visitors see the maintenance page' : 'Open to everyone', to: '/admin/site' });
            rows.push({ label: 'Sections on', value: `${sectionsOn} of 3`, hint: 'Upcoming events, partner brands, testimonials', to: '/admin/site' });
        }
        if (visible.has('inbox')) rows.push({ label: 'New enquiries', value: unread, tone: unread ? 'amber' : undefined, hint: 'From the contact form', to: '/admin/messages' });
        if (visible.has('portfolio')) rows.push({ label: 'Work', value: (state.portfolio || []).length, hint: 'Projects in “Nights we built”', to: '/admin/concertzone' });
        if (visible.has('blog')) rows.push({ label: 'ConcertZone stories', value: published, hint: posts.length - published ? `${posts.length - published} in drafts` : 'Published', to: '/admin/blog' });
        return rows;
    }, [state.siteSettings, state.maintenanceState, state.posts, state.messages, state.portfolio, visible]);

    // ── App area ──
    const appArea = useMemo(() => {
        if (!['campaigns', 'creators', 'guestlists', 'giveaways', 'gigs', 'forms', 'upcoming', 'ticketing'].some(id => visible.has(id))) return null;
        const now = new Date();
        const rows = [];
        if (visible.has('creators')) {
            const waiting = (state.creators || []).filter(c => !c.profileStatus || c.profileStatus === 'pending' || c.profileStatus === 'pending_verification').length;
            rows.push({ label: 'Creators waiting', value: waiting, tone: waiting ? 'amber' : undefined, hint: 'New applications to review', to: '/admin/creators?status=pending' });
        }
        if (visible.has('campaigns')) {
            const open = (state.campaigns || []).filter(c => campaignStatus(c) === 'open').length;
            rows.push({ label: 'Open campaigns', value: open, tone: open ? 'pink' : undefined, hint: `${(state.campaigns || []).length} in total`, to: '/admin/campaigns' });
        }
        if (visible.has('guestlists')) {
            const lists = (state.upcomingEvents || []).filter(e => (e.isGuestlistEnabled || e.guestlistEnabled) && (toDate(e.date)?.getTime() || 0) >= now.getTime() - 6 * 3600000).length;
            rows.push({ label: 'Guestlists coming up', value: lists, hint: 'Upcoming events with a guestlist', to: '/admin/guestlists' });
        }
        if (visible.has('giveaways')) {
            const open = (state.giveaways || []).filter(g => giveawayState(g, now) === 'open').length;
            rows.push({ label: 'Giveaways running', value: open, hint: 'Open for entries', to: '/admin/giveaways' });
        }
        if (visible.has('gigs')) rows.push({ label: 'Volunteer gigs', value: (state.volunteerGigs || []).length, hint: 'Listed in Community', to: '/admin/volunteer-gigs' });
        if (visible.has('forms')) rows.push({ label: 'Forms', value: (state.forms || []).length, hint: 'Public forms', to: '/admin/forms' });
        return rows;
    }, [state.creators, state.campaigns, state.upcomingEvents, state.giveaways, state.volunteerGigs, state.forms, visible]);

    const saveWidgets = async (keys) => {
        try {
            await saveDashboardWidgets(keys);
            addToast('Dashboard updated.', 'success');
        } catch {
            addToast('Please try again.', 'error', { title: 'Dashboard not saved' });
            throw new Error('save failed');
        }
    };

    const firstName = (user?.displayName || '').split(' ')[0] || (user?.email || '').split('@')[0];
    const dateLabel = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

    return (
        <div className="mx-auto w-full max-w-[1600px] px-4 pb-10 pt-5 font-heading sm:px-6 lg:px-10 lg:pt-8">
            {showMemberCounts && <MemberCounts onChange={setMembers} />}

            {/* Header */}
            <header className="mb-6 flex flex-col gap-4 lg:mb-8 xl:flex-row xl:items-end xl:justify-between">
                <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-gray-500 dark:text-zinc-400">{dateLabel}</p>
                    <h1 className="mt-1 break-words text-2xl font-extrabold tracking-tight sm:text-3xl">
                        {greeting()}{firstName ? `, ${firstName}` : ''}
                    </h1>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                        <RoleBadge role={role} />
                        {maintenanceState?.global && (
                            <Link to="/admin/system-command">
                                <Badge tone="red"><ShieldAlert size={11} /> Site is in maintenance mode</Badge>
                            </Link>
                        )}
                    </div>
                </div>
                {quickActions.length > 0 && (
                    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0 xl:justify-end [&::-webkit-scrollbar]:hidden">
                        {quickActions.slice(0, 4).map((action, i) => (
                            <Button key={action.id} as={Link} to={action.path} variant={i === 0 ? 'primary' : 'secondary'}>
                                <action.icon size={15} /> {action.name}
                            </Button>
                        ))}
                    </div>
                )}
            </header>

            {/* Pinned metrics */}
            <section className="mb-8">
                <SectionTitle
                    action={isFullAccess && (
                        <button type="button" onClick={() => setPickerOpen(true)} className="inline-flex h-10 items-center gap-1.5 rounded-lg px-3 text-[13px] font-semibold text-gray-500 transition-colors hover:bg-black/5 hover:text-gray-900 dark:hover:bg-white/5 dark:hover:text-white">
                            <Pencil size={13} /> Customize
                        </button>
                    )}
                >
                    At a glance
                </SectionTitle>
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    {widgets.map(w => <MetricTile key={w.key} {...w} />)}
                </div>
            </section>

            {/* Needs attention: everything waiting on you, across the site, the app and money. */}
            <div className="mb-8">
            <section>
                <SectionTitle action={attention.length > 0 && (
                    <span className="text-[12px] font-semibold text-gray-500">
                        {attention.filter(i => i.priority === 1).length ? `${attention.filter(i => i.priority === 1).length} urgent · ` : ''}{plural(attention.length, 'thing')}
                    </span>
                )}>Needs attention</SectionTitle>
                <Card className="overflow-hidden rounded-2xl">
                    {attention.length === 0 ? (
                        <div className="flex items-center gap-3 p-5">
                            <span className={cn('flex h-10 w-10 items-center justify-center rounded-xl', chip('green'))}><CheckCircle2 size={18} /></span>
                            <div>
                                <p className="text-sm font-bold">You're all caught up</p>
                                <p className="text-[12px] text-gray-500">Nothing is waiting on you right now.</p>
                            </div>
                        </div>
                    ) : (
                        <>
                            <ul className="divide-y divide-black/[0.05] dark:divide-white/[0.05]">
                                {attentionShown.map(item => {
                                    const Icon = item.icon;
                                    return (
                                        <li key={item.id}>
                                            <Link to={item.link} className="relative flex min-h-[68px] items-center gap-3 px-4 py-3 transition-colors hover:bg-black/[0.02] active:bg-black/[0.04] dark:hover:bg-white/[0.02] dark:active:bg-white/[0.04] sm:px-5">
                                                {item.priority === 1 && <span className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-red-500" aria-hidden="true" />}
                                                <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', chip(item.tone))}><Icon size={18} /></span>
                                                <span className="min-w-0 flex-1">
                                                    <span className="flex items-center gap-2">
                                                        <span className="min-w-0 truncate text-sm font-bold">{item.title}</span>
                                                        {item.priority === 1 && <Badge tone="red" className="shrink-0">Urgent</Badge>}
                                                    </span>
                                                    <span className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-gray-500 dark:text-zinc-400">{item.detail}</span>
                                                </span>
                                                <ChevronRight size={16} className="shrink-0 text-gray-300 dark:text-zinc-600" />
                                            </Link>
                                        </li>
                                    );
                                })}
                            </ul>
                            {attention.length > 6 && (
                                <button type="button" onClick={() => setShowAllAttention(v => !v)} className="flex h-11 w-full items-center justify-center border-t border-black/[0.05] text-[13px] font-semibold text-gray-500 hover:text-gray-900 dark:border-white/[0.05] dark:hover:text-white">
                                    {showAllAttention ? 'Show fewer' : `Show all ${attention.length}`}
                                </button>
                            )}
                        </>
                    )}
                </Card>
            </section>

            </div>

            {/* The three parts of the admin, like the sidebar: Landing site · App · Money. */}
            <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2 xl:grid-cols-3">
                {siteArea && (
                    <AreaCard title="Landing site" subtitle="newbi.live" icon={Globe} tone="cyan" to="/admin/site" rows={siteArea} />
                )}
                {appArea && (
                    <AreaCard title="App" subtitle="app.newbi.live" icon={Smartphone} tone="pink" to="/admin/campaigns" rows={appArea}>
                    {visible.has('upcoming') && (
                        <section className="pt-2">
                            <SectionTitle action={<Link to="/admin/upcoming-events" className="text-[12px] font-bold text-gray-500 hover:text-gray-900 dark:hover:text-white">All events</Link>}>Coming up</SectionTitle>
                            <Card className="overflow-hidden rounded-2xl">
                                {upcoming.length === 0 ? (
                                    <div className="p-5">
                                        <p className="text-sm font-bold">No upcoming events</p>
                                        <p className="mt-0.5 text-[12px] text-gray-500">Add one so it shows on the website.</p>
                                        <Button as={Link} to="/admin/upcoming-events?new=1" size="sm" variant="secondary" className="mt-3">Add event</Button>
                                    </div>
                                ) : (
                                    <ul className="divide-y divide-black/[0.05] dark:divide-white/[0.05]">
                                        {upcoming.map(event => {
                                            const days = daysUntil(event.when);
                                            const sold = ordersByEvent[event.id] || 0;
                                            return (
                                                <li key={event.id}>
                                                    <Link to={event.isTicketed || event.isGuestlistEnabled ? `/admin/ticketing?eventId=${encodeURIComponent(event.id)}` : '/admin/upcoming-events'} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-black/[0.02] active:bg-black/[0.04] dark:hover:bg-white/[0.02] sm:px-5">
                                                        <div className={cn('flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl', accent('pink').soft)}>
                                                            <span className={cn('text-[11px] font-bold', accent('pink').text)}>{event.when.toLocaleDateString('en-IN', { month: 'short' })}</span>
                                                            <span className="text-lg font-extrabold leading-none">{event.when.getDate()}</span>
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="truncate text-[14px] font-bold">{event.title || 'Untitled event'}</p>
                                                            <p className="flex items-center gap-1 truncate text-[12px] text-gray-500">
                                                                {event.location && <><MapPin size={11} className="shrink-0" /><span className="truncate">{event.location}</span><span>·</span></>}
                                                                <span className="shrink-0">{days <= 0 ? 'Today' : days === 1 ? 'Tomorrow' : `In ${days} days`}</span>
                                                            </p>
                                                        </div>
                                                        {event.isTicketed && (
                                                            <span className="shrink-0 text-right">
                                                                <span className="block text-sm font-extrabold tabular-nums">{sold}</span>
                                                                <span className="block text-[11px] font-semibold text-gray-500">sold</span>
                                                            </span>
                                                        )}
                                                    </Link>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )}
                            </Card>
                        </section>
                    )}
                    </AreaCard>
                )}
                {(finance || recent.length > 0) && (
                    <AreaCard title="Money" subtitle="Finance & documents" icon={Wallet} tone="teal" to={visible.has('finance') ? '/admin/finance' : '/admin/proposals'}>
                    {finance && (
                        <section>
                            <SectionTitle action={<Link to="/admin/finance" className="text-[12px] font-bold text-gray-500 hover:text-gray-900 dark:hover:text-white">Finance board</Link>}>Invoices</SectionTitle>
                            <Card className="grid grid-cols-2 divide-x divide-black/[0.05] rounded-2xl dark:divide-white/[0.05]">
                                <Link to="/admin/invoices?filter=unpaid" className="p-4 sm:p-5">
                                    <p className="text-[12px] font-bold text-gray-500">Outstanding</p>
                                    <p className={cn('mt-1 truncate text-xl font-extrabold tracking-tight tabular-nums', finance.outstanding > 0 && accent('amber').text)}>{inr(finance.outstanding)}</p>
                                    <p className="text-[11px] text-gray-500">{finance.unpaidCount} unpaid {finance.unpaidCount === 1 ? 'invoice' : 'invoices'}</p>
                                </Link>
                                <Link to="/admin/invoices" className="p-4 sm:p-5">
                                    <p className="text-[12px] font-bold text-gray-500">Collected this month</p>
                                    <p className="mt-1 truncate text-xl font-extrabold tracking-tight tabular-nums text-emerald-700 dark:text-neon-green">{inr(finance.paidThisMonth)}</p>
                                    <p className="text-[11px] text-gray-500">{finance.total} invoices in total</p>
                                </Link>
                            </Card>
                            {finance.byClient.length > 0 && (
                                <Card className="mt-3 overflow-hidden rounded-2xl">
                                    <p className="px-4 pb-1 pt-3 text-[12px] font-bold text-gray-500 sm:px-5">Outstanding by client</p>
                                    <ul className="divide-y divide-black/[0.05] dark:divide-white/[0.05]">
                                        {finance.byClient.slice(0, 6).map(c => (
                                            <li key={c.name}>
                                                <Link to={`/admin/invoices?filter=unpaid&q=${encodeURIComponent(c.name)}`} className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.02] sm:px-5">
                                                    <span className="min-w-0 flex-1">
                                                        <span className="block truncate text-[14px] font-bold">{c.name}</span>
                                                        <span className={cn('block text-[11px]', c.overdue ? 'font-semibold text-red-600 dark:text-red-400' : 'text-gray-500')}>
                                                            {c.count} {c.count === 1 ? 'invoice' : 'invoices'}{c.overdue ? ' · overdue' : ''}
                                                        </span>
                                                    </span>
                                                    <span className="shrink-0 text-[14px] font-extrabold tabular-nums">{inr(c.balance)}</span>
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                    {finance.byClient.length > 6 && (
                                        <Link to="/admin/invoices?filter=unpaid" className="block border-t border-black/[0.05] px-4 py-2.5 text-[12px] font-bold text-gray-500 hover:text-gray-900 dark:border-white/[0.05] dark:hover:text-white sm:px-5">
                                            +{finance.byClient.length - 6} more clients
                                        </Link>
                                    )}
                                </Card>
                            )}
                        </section>
                    )}

                    {recent.length > 0 && (
                        <section>
                            <SectionTitle>Recently edited</SectionTitle>
                            <Card className="overflow-hidden rounded-2xl">
                                <ul className="divide-y divide-black/[0.05] dark:divide-white/[0.05]">
                                    {recent.map(row => {
                                        const Icon = row.icon;
                                        return (
                                            <li key={row.id}>
                                                <Link to={row.link} className="flex min-h-[60px] items-center gap-3 px-4 py-2.5 transition-colors hover:bg-black/[0.02] active:bg-black/[0.04] dark:hover:bg-white/[0.02] sm:px-5">
                                                    <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', chip(row.tone))}><Icon size={16} /></span>
                                                    <span className="min-w-0 flex-1">
                                                        <span className="block truncate text-[14px] font-bold">{row.title}</span>
                                                        <span className="block truncate text-[12px] text-gray-500">{row.kind}{row.meta ? ` · ${row.meta}` : ''} · {relative(row.at)}</span>
                                                    </span>
                                                    {row.status && <Badge tone={statusTone(row.status)} className="hidden shrink-0 sm:inline-flex">{row.status}</Badge>}
                                                </Link>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </Card>
                        </section>
                    )}
                    </AreaCard>
                )}
            </div>

            {/* All tools (desktop: the sidebar covers this on phones via "More") */}
            <section className="mt-10 hidden space-y-5 sm:block">
                <SectionTitle>All tools</SectionTitle>
                {nav.filter(g => g.id !== 'overview').map(group => (
                <div key={group.id}>
                <p className="mb-2 text-[12px] font-bold text-gray-500">{group.title}</p>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
                    {group.items.map(item => {
                        const Icon = item.icon;
                        return (
                            <Link key={item.id} to={item.path} className="group">
                                <Card className="flex items-center gap-3 rounded-2xl p-3.5 transition-colors group-hover:border-black/15 dark:group-hover:border-white/15">
                                    <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors', accent(item.accent).chip)}>
                                        <Icon size={16} />
                                    </span>
                                    <span className="truncate text-[13px] font-bold">{item.name}</span>
                                </Card>
                            </Link>
                        );
                    })}
                </div>
                </div>
                ))}
            </section>

            {isFullAccess && (
                <WidgetPicker
                    open={pickerOpen}
                    onClose={() => setPickerOpen(false)}
                    registry={registry}
                    current={widgetKeys}
                    onSave={saveWidgets}
                />
            )}
        </div>
    );
};

export default Dashboard;
