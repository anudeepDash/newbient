import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Settings from 'lucide-react/dist/esm/icons/settings';
import Globe from 'lucide-react/dist/esm/icons/globe';
import LayoutGrid from 'lucide-react/dist/esm/icons/layout-grid';
import LayoutDashboard from 'lucide-react/dist/esm/icons/layout-dashboard';
import Briefcase from 'lucide-react/dist/esm/icons/briefcase';
import Users from 'lucide-react/dist/esm/icons/users';
import FileText from 'lucide-react/dist/esm/icons/file-text';
import FileSpreadsheet from 'lucide-react/dist/esm/icons/file-spreadsheet';
import Calendar from 'lucide-react/dist/esm/icons/calendar';
import Mail from 'lucide-react/dist/esm/icons/mail';
import MessageSquare from 'lucide-react/dist/esm/icons/message-square';
import Image from 'lucide-react/dist/esm/icons/image';
import Ticket from 'lucide-react/dist/esm/icons/ticket';
import ScanLine from 'lucide-react/dist/esm/icons/scan-line';
import BookOpen from 'lucide-react/dist/esm/icons/book-open';
import Gift from 'lucide-react/dist/esm/icons/gift';
import Star from 'lucide-react/dist/esm/icons/star';
import Mic2 from 'lucide-react/dist/esm/icons/mic-2';
import Megaphone from 'lucide-react/dist/esm/icons/megaphone';
import ListChecks from 'lucide-react/dist/esm/icons/list-checks';
import ClipboardList from 'lucide-react/dist/esm/icons/clipboard-list';
import Shield from 'lucide-react/dist/esm/icons/shield';
import IndianRupee from 'lucide-react/dist/esm/icons/indian-rupee';
import Home from 'lucide-react/dist/esm/icons/home';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import Info from 'lucide-react/dist/esm/icons/info';
import Building2 from 'lucide-react/dist/esm/icons/building-2';
import ShoppingCart from 'lucide-react/dist/esm/icons/shopping-cart';
import Power from 'lucide-react/dist/esm/icons/power';
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle';
import Save from 'lucide-react/dist/esm/icons/save';
import Lock from 'lucide-react/dist/esm/icons/lock';
import Terminal from 'lucide-react/dist/esm/icons/terminal';
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down';
import EyeOff from 'lucide-react/dist/esm/icons/eye-off';
import AdminCommunityHubLayout from '../../components/admin/AdminCommunityHubLayout';
import { useStore } from '../../lib/store';
import { cn } from '../../lib/utils';
import { Card, Button, Badge, StatTile } from '../../components/admin/ui';
import { accent } from '../../components/admin/theme';
import { Field, fieldCls, areaCls, Toggle } from '../../components/admin/uploads/UploadKit';
import ConfirmSheet from '../../components/admin/workspace/ConfirmSheet';
import AccessNotice from '../../components/admin/workspace/AccessNotice';

/*
 * System: maintenance switches (stored in app_state/maintenance, or
 * maintenance_local on localhost), site-wide feature settings
 * (site_settings/general) and the site's contact details
 * (site_settings/contact_info). A switch that is "on" means the thing is live.
 */

// `cat` is the maintenance map the switch lives in; true there = switched off.
const SWITCH_GROUPS = [
    {
        key: 'pages',
        title: 'Public pages',
        hint: 'Visitors see a "back soon" page instead. Developers can still open them.',
        icon: Globe,
        tone: 'blue',
        items: [
            { cat: 'pages', id: 'home', label: 'Home page', icon: Home, hint: 'newbi.live itself' },
            { cat: 'pages', id: 'concerts', label: 'Concert Zone', icon: Mic2, hint: 'The blog and its articles' },
            { cat: 'pages', id: 'community', label: 'Community', icon: Users, hint: 'Community and join pages' },
            { cat: 'pages', id: 'influencer_public', label: 'Creator pages', icon: Star, hint: 'Creator landing, sign-up and creator dashboard' },
            { cat: 'pages', id: 'giveaways_public', label: 'Giveaways', icon: Gift, hint: 'Public giveaway pages' },
            { cat: 'pages', id: 'forms_public', label: 'Forms', icon: ClipboardList, hint: 'Public forms people fill in' },
            { cat: 'pages', id: 'contact', label: 'Contact page', icon: MessageSquare, hint: 'The contact form that fills your Inbox' },
            { cat: 'pages', id: 'ticketing', label: 'Digital tickets', icon: Ticket, hint: "People can't open their ticket links (needed at the gate)" },
            { cat: 'features', id: 'tickets', label: 'Online ticket sales', icon: ShoppingCart, hint: 'Ticket checkout on event pages pauses' },
            { cat: 'pages', id: 'docs', label: 'Shared proposals and contracts', icon: FileSpreadsheet, hint: "Links you've sent clients stop opening" },
            { cat: 'pages', id: 'artistant_public', label: 'Artistant page', icon: Sparkles, hint: 'The old /artistant page on this site' },
        ],
    },
    {
        key: 'features',
        title: 'Admin modules',
        hint: 'Hidden from the admin menu, and their screens show a maintenance notice. Developers keep access.',
        icon: Briefcase,
        tone: 'violet',
        items: [
            { cat: 'features', id: 'invoices', label: 'Finance and invoices', icon: IndianRupee, hint: 'Finance board, invoices, spends, payees' },
            { cat: 'features', id: 'docs', label: 'Proposals and contracts', icon: FileText, hint: 'Also documents and AI studio' },
            { cat: 'features', id: 'influencer', label: 'Creators', icon: Star, hint: 'Creator portal and campaigns' },
            { cat: 'features', id: 'community', label: 'Volunteer gigs', icon: Users },
            { cat: 'features', id: 'forms_public', label: 'Forms', icon: ClipboardList, hint: 'Form builder and responses' },
            { cat: 'features', id: 'giveaways', label: 'Giveaways', icon: Gift },
            { cat: 'features', id: 'mailing', label: 'Mailing', icon: Megaphone },
            { cat: 'features', id: 'upcoming_events', label: 'Events', icon: Calendar },
            { cat: 'features', id: 'ticketing', label: 'Ticketing and gate scanner', icon: ScanLine },
            { cat: 'features', id: 'guestlists', label: 'Guestlists', icon: ListChecks },
            { cat: 'features', id: 'blog_announcements', label: 'Blog and announcements', icon: BookOpen },
            { cat: 'features', id: 'concerts', label: 'Portfolio', icon: Image },
            { cat: 'features', id: 'messages', label: 'Inbox', icon: Mail },
            { cat: 'features', id: 'admins', label: 'Members', icon: Shield, hint: 'Team, access requests and member list' },
        ],
    },
    {
        key: 'sections',
        title: 'Home page sections',
        hint: 'The section stays in place behind a "being improved" cover.',
        icon: LayoutGrid,
        tone: 'pink',
        items: [
            { cat: 'sections', id: 'home_why', label: 'Why Newbi', icon: Sparkles },
            { cat: 'sections', id: 'home_about', label: 'About us', icon: Info },
            { cat: 'sections', id: 'home_creators', label: 'Creators', icon: Star },
            { cat: 'sections', id: 'home_upcoming', label: 'Upcoming events', icon: Calendar },
            { cat: 'sections', id: 'home_portfolio', label: 'Portfolio', icon: Image },
            { cat: 'sections', id: 'blog_featured', label: 'Featured blog posts', icon: BookOpen },
            { cat: 'sections', id: 'home_clients', label: 'Client logos', icon: Building2 },
        ],
    },
];

// site_settings/general flags. `isOn` mirrors how the website reads each one.
const SITE_FEATURES = [
    { key: 'showUpcomingEvents', label: 'Upcoming events on the home page', hint: 'The events strip near the top of the home page', isOn: (s) => Boolean(s.showUpcomingEvents) },
    { key: 'enableTribeForm', label: 'Tribe sign-up form', hint: 'The join form on the community page', isOn: (s) => s.enableTribeForm !== false },
    { key: 'showVolunteerGigs', label: 'Volunteer gigs board', hint: 'Open gigs on the community page', isOn: (s) => s.showVolunteerGigs !== false },
    { key: 'showPastClients', label: 'Client logos', hint: 'The brands we have worked with, on the home and creator pages', isOn: (s) => s.showPastClients !== false },
    { key: 'hideMaintenancePages', label: 'Hide switched-off pages from the menu', hint: 'Otherwise they stay in the menu, greyed out', isOn: (s) => s.hideMaintenancePages === true, notAFeature: true },
];

const DETAIL_FIELDS = [
    { name: 'title', label: 'Site name', placeholder: 'Newbi Entertainment' },
    { name: 'tagline', label: 'Tagline', placeholder: 'One line about Newbi' },
    { name: 'email', label: 'Contact email', placeholder: 'hello@newbi.live', type: 'email' },
    { name: 'phone', label: 'Phone', placeholder: '+91…', type: 'tel' },
    { name: 'whatsappCommunity', label: 'WhatsApp community link', placeholder: 'https://chat.whatsapp.com/…', type: 'url' },
    { name: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/newbi.live' },
    { name: 'linkedin', label: 'LinkedIn', placeholder: 'https://linkedin.com/company/…' },
    { name: 'address', label: 'Address', placeholder: 'City, state' },
];

const ERROR_CODES = [
    { code: 'TKT-VAL-*', module: 'Ticketing', scenario: 'Something the buyer typed was not valid (phone, name, ticket choice)' },
    { code: 'TKT-OTP-01', module: 'Ticketing', scenario: "The phone verification code couldn't be sent" },
    { code: 'TKT-OTP-02', module: 'Ticketing', scenario: 'The buyer entered the wrong verification code' },
    { code: 'TKT-PAY-01', module: 'Ticketing', scenario: "Serious: the order couldn't be saved after a payment attempt" },
    { code: 'TKT-CPN-01', module: 'Ticketing', scenario: "A coupon couldn't be checked" },
    { code: 'TKT-GST-01', module: 'Ticketing', scenario: "A guestlist entry couldn't be saved" },
    { code: 'ANN-01', module: 'Announcements', scenario: "A new announcement couldn't be saved" },
    { code: 'EVT-01', module: 'Events', scenario: "An event couldn't be created or updated" },
];

const SectionHeader = ({ icon: Icon, tone, title, hint, right }) => (
    <div className="flex items-start gap-3 px-4 pb-3 pt-4 sm:px-5">
        <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', accent(tone).chip)}><Icon size={18} /></span>
        <div className="min-w-0 flex-1">
            <h2 className="text-[15px] font-bold">{title}</h2>
            {hint && <p className="text-[12.5px] leading-snug text-gray-500 dark:text-zinc-400">{hint}</p>}
        </div>
        {right}
    </div>
);

const SystemControlCenter = () => {
    const user = useStore(s => s.user);
    const maintenanceState = useStore(s => s.maintenanceState) || {};
    const toggleMaintenanceFeature = useStore(s => s.toggleMaintenanceFeature);
    const toggleGlobalMaintenance = useStore(s => s.toggleGlobalMaintenance);
    const siteDetails = useStore(s => s.siteDetails) || {};
    const updateSiteDetails = useStore(s => s.updateSiteDetails);
    const siteSettings = useStore(s => s.siteSettings) || {};
    const updateGeneralSettings = useStore(s => s.updateGeneralSettings);
    const addToast = useStore(s => s.addToast);

    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const isAdmin = user && ['developer', 'super_admin', 'founder'].includes(user.role);

    const [formData, setFormData] = useState({ ...siteDetails });
    const [isDirty, setIsDirty] = useState(false);
    const [savingDetails, setSavingDetails] = useState(false);
    const [saving, setSaving] = useState({});
    const [confirm, setConfirm] = useState(null);
    const [showCodes, setShowCodes] = useState(false);
    const refs = { pages: useRef(null), features: useRef(null), sections: useRef(null), danger: useRef(null) };

    useEffect(() => {
        if (siteDetails && !isDirty && Object.keys(siteDetails).length > 0) setFormData({ ...siteDetails });
    }, [siteDetails, isDirty]);

    const offCount = useMemo(() => Object.fromEntries(SWITCH_GROUPS.map(g => [g.key, g.items.filter(i => maintenanceState[i.cat]?.[i.id]).length])), [maintenanceState]);

    if (!isAdmin) {
        return (
            <AccessNotice
                icon={Lock}
                tone="gray"
                title="System is for founders and super admins"
                actions={<Button as={Link} to="/admin" variant="primary" className="h-12 w-full"><LayoutDashboard size={15} /> Back to the dashboard</Button>}
            >
                These switches can take parts of the site offline, so only founders, super admins and developers can open them.
            </AccessNotice>
        );
    }

    const busyKey = (item) => `${item.cat}.${item.id}`;

    const writeSwitch = async (item, off) => {
        const key = busyKey(item);
        setSaving(s => ({ ...s, [key]: true }));
        try {
            await toggleMaintenanceFeature(item.cat, item.id, off);
            addToast(off ? `${item.label} switched off.` : `${item.label} is back on.`, 'success');
        } catch (err) {
            console.error(err);
            const msg = `Couldn't switch ${item.label} ${off ? 'off' : 'on'}. Please try again.`;
            throw Object.assign(new Error(msg), { userMessage: msg });
        } finally {
            setSaving(s => ({ ...s, [key]: false }));
        }
    };

    const onSwitch = (item, nextOn) => {
        if (saving[busyKey(item)]) return;
        if (nextOn) { writeSwitch(item, false).catch(err => addToast(err.userMessage, 'error')); return; }
        const group = SWITCH_GROUPS.find(g => g.items.includes(item));
        setConfirm({
            title: `Switch off ${item.label}?`,
            description: (
                <>
                    <p>{item.hint ? `${item.hint}. ` : ''}{group?.hint}</p>
                    <p className="mt-2">You can switch it back on here at any time.</p>
                </>
            ),
            confirmLabel: 'Switch off',
            busyLabel: 'Switching off…',
            tone: 'warning',
            icon: Power,
            onConfirm: () => writeSwitch(item, true),
        });
    };

    const writeSiteFeature = async (feature, on) => {
        setSaving(s => ({ ...s, [feature.key]: true }));
        try {
            await updateGeneralSettings({ [feature.key]: on });
            addToast(on ? `${feature.label} turned on.` : `${feature.label} turned off.`, 'success');
        } catch (err) {
            console.error(err);
            const msg = "Couldn't save that setting. Please try again.";
            throw Object.assign(new Error(msg), { userMessage: msg });
        } finally {
            setSaving(s => ({ ...s, [feature.key]: false }));
        }
    };

    const onSiteFeature = (feature, nextOn) => {
        if (saving[feature.key]) return;
        if (nextOn || feature.notAFeature) { writeSiteFeature(feature, nextOn).catch(err => addToast(err.userMessage, 'error')); return; }
        setConfirm({
            title: `Turn off ${feature.label.toLowerCase()}?`,
            description: `${feature.hint} will be hidden from visitors until you turn it back on.`,
            confirmLabel: 'Turn off',
            busyLabel: 'Saving…',
            tone: 'warning',
            icon: EyeOff,
            onConfirm: () => writeSiteFeature(feature, false),
        });
    };

    const askGlobal = (turnOn) => setConfirm(turnOn ? {
        title: 'Put the whole site in maintenance mode?',
        description: (
            <>
                <p>Every visitor sees the maintenance page straight away, on every page of newbi.live. Ticket links and shared documents stop opening too.</p>
                <p className="mt-2">Inside the admin, everyone except developers sees a maintenance notice on most screens. This page and the dashboard stay open so you can switch it back off.</p>
                {isLocal && <p className="mt-2 font-semibold">You're on a local copy, so this only changes the test switch.</p>}
            </>
        ),
        confirmLabel: 'Turn on maintenance mode',
        busyLabel: 'Turning on…',
        tone: 'danger',
        icon: Power,
        onConfirm: async () => {
            await toggleGlobalMaintenance(true).catch(() => { throw Object.assign(new Error("Couldn't turn on maintenance mode. Please try again."), { userMessage: "Couldn't turn on maintenance mode. Please try again." }); });
            addToast('Maintenance mode is on. The site is offline for visitors.', 'warning');
        },
    } : {
        title: 'Bring the site back online?',
        description: 'Visitors can use newbi.live again straight away. Pages you switched off one by one stay off.',
        confirmLabel: 'Bring it back online',
        busyLabel: 'Bringing it back…',
        tone: 'primary',
        icon: Power,
        onConfirm: async () => {
            await toggleGlobalMaintenance(false).catch(() => { throw Object.assign(new Error("Couldn't bring the site back online. Please try again."), { userMessage: "Couldn't bring the site back online. Please try again." }); });
            addToast('The site is back online.', 'success');
        },
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setIsDirty(true);
    };

    const handleSaveConfig = async (e) => {
        e?.preventDefault();
        if (savingDetails) return;
        setSavingDetails(true);
        try {
            await updateSiteDetails(formData);
            setIsDirty(false);
            addToast('Site details saved.', 'success');
        } catch (error) {
            console.error(error);
            addToast("Couldn't save the site details. Please try again.", 'error');
        } finally {
            setSavingDetails(false);
        }
    };

    const discard = () => { setFormData({ ...siteDetails }); setIsDirty(false); };
    const scrollTo = (key) => refs[key]?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    const global = Boolean(maintenanceState.global);

    return (
        <AdminCommunityHubLayout
            studioHeader={{ title: 'System', icon: Settings, description: 'Maintenance switches, site features and contact details' }}
            hideTabs
            action={(
                <Badge tone={isLocal ? 'amber' : 'green'} className="h-8 px-3 text-[12px]">
                    <span className={cn('h-1.5 w-1.5 rounded-full', accent(isLocal ? 'amber' : 'green').dot)} />
                    {isLocal ? 'Local copy: test switches' : 'Live site'}
                </Badge>
            )}
        >
            <div className="space-y-6">
                {global && (
                    <div className={cn('flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center', accent('red').border, accent('red').soft)}>
                        <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', accent('red').solid)}><Power size={20} /></span>
                        <div className="min-w-0 flex-1">
                            <p className="text-[15px] font-bold text-red-700 dark:text-red-300">The whole site is in maintenance mode</p>
                            <p className="text-[13px] text-gray-600 dark:text-zinc-400">Visitors see the maintenance page everywhere until you bring it back.</p>
                        </div>
                        <Button variant="primary" onClick={() => askGlobal(false)} className="h-11 w-full sm:w-auto"><Power size={15} /> Bring the site back online</Button>
                    </div>
                )}

                {isLocal && (
                    <div className="flex gap-2.5 rounded-2xl bg-amber-500/[0.08] px-4 py-3 text-[13px] text-amber-800 dark:bg-amber-400/[0.08] dark:text-amber-200">
                        <Info size={16} className="mt-0.5 shrink-0" />
                        <p>You're running the site locally, so maintenance switches here change a test copy and don't touch the live site. Site features and contact details below are shared with the live site.</p>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <StatTile icon={Power} tone={global ? 'red' : 'green'} label="Site status" value={global ? 'Offline' : 'Online'} hint={global ? 'Maintenance mode is on' : 'Open to everyone'} onClick={() => scrollTo('danger')} />
                    <StatTile icon={Globe} tone={offCount.pages ? 'amber' : 'blue'} label="Pages off" value={offCount.pages} hint={offCount.pages ? 'Showing "back soon"' : 'All pages live'} onClick={() => scrollTo('pages')} />
                    <StatTile icon={Briefcase} tone={offCount.features ? 'orange' : 'violet'} label="Modules off" value={offCount.features} hint={offCount.features ? 'Hidden from the menu' : 'All modules on'} onClick={() => scrollTo('features')} />
                    <StatTile icon={LayoutGrid} tone={offCount.sections ? 'amber' : 'pink'} label="Sections off" value={offCount.sections} hint={offCount.sections ? 'Behind a cover' : 'All sections showing'} onClick={() => scrollTo('sections')} />
                </div>

                {SWITCH_GROUPS.map(group => (
                    <section key={group.key} ref={refs[group.key]} className="scroll-mt-24">
                        <Card className="overflow-hidden rounded-2xl">
                            <SectionHeader
                                icon={group.icon}
                                tone={group.tone}
                                title={group.title}
                                hint={group.hint}
                                right={offCount[group.key] > 0 ? <Badge tone="amber">{offCount[group.key]} off</Badge> : <Badge tone="green">All on</Badge>}
                            />
                            <ul className="grid grid-cols-1 border-t border-black/[0.05] dark:border-white/[0.05] md:grid-cols-2">
                                {group.items.map(item => {
                                    const on = !maintenanceState[item.cat]?.[item.id];
                                    const busy = saving[busyKey(item)];
                                    return (
                                        <li key={busyKey(item)} className={cn('border-b border-black/[0.05] px-4 py-2.5 dark:border-white/[0.05] sm:px-5 md:odd:border-r', !on && accent('amber').soft, busy && 'opacity-60')}>
                                            <div className="flex items-center gap-3">
                                                <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', on ? accent(group.tone).chip : accent('amber').chip)}><item.icon size={16} /></span>
                                                <div className="min-w-0 flex-1">
                                                    <Toggle
                                                        label={<span className="flex items-center gap-2">{item.label}{!on && <Badge tone="amber">Off</Badge>}</span>}
                                                        hint={item.hint}
                                                        checked={on}
                                                        onChange={(next) => onSwitch(item, next)}
                                                    />
                                                </div>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        </Card>
                    </section>
                ))}

                <Card className="overflow-hidden rounded-2xl">
                    <SectionHeader icon={Sparkles} tone="teal" title="Site features" hint="Parts of the public pages you can show or hide without switching anything off." />
                    <ul className="border-t border-black/[0.05] dark:border-white/[0.05]">
                        {SITE_FEATURES.map(feature => {
                            const on = feature.isOn(siteSettings);
                            return (
                                <li key={feature.key} className={cn('border-b border-black/[0.05] px-4 py-2.5 last:border-0 dark:border-white/[0.05] sm:px-5', saving[feature.key] && 'opacity-60')}>
                                    <Toggle label={feature.label} hint={feature.hint} checked={on} onChange={(next) => onSiteFeature(feature, next)} />
                                </li>
                            );
                        })}
                    </ul>
                </Card>

                <Card className="overflow-hidden rounded-2xl">
                    <SectionHeader icon={Building2} tone="green" title="Site details" hint="Used in the footer, contact page, emails and search results." />
                    <form id="site-details" onSubmit={handleSaveConfig} className="space-y-4 border-t border-black/[0.05] p-4 dark:border-white/[0.05] sm:p-5">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            {DETAIL_FIELDS.map(f => (
                                <Field key={f.name} label={f.label}>
                                    <input name={f.name} type={f.type || 'text'} value={formData[f.name] || ''} onChange={handleChange} placeholder={f.placeholder} className={fieldCls} autoCapitalize={f.type ? 'off' : undefined} />
                                </Field>
                            ))}
                        </div>
                        <Field label="Description for search engines" hint="One or two sentences. Shown under the site's name in Google results.">
                            <textarea name="description" rows={3} value={formData.description || ''} onChange={handleChange} className={cn(areaCls, 'resize-none')} placeholder="What Newbi does, in a sentence or two" />
                        </Field>
                        {!isDirty && <p className="text-[12px] text-gray-500">Change anything above and a save bar appears.</p>}
                    </form>
                </Card>

                {isDirty && (
                    <div className="sticky bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-30 lg:bottom-4">
                        <div className="flex items-center gap-2 rounded-2xl border border-black/[0.08] bg-white/95 p-3 shadow-xl backdrop-blur dark:border-white/[0.1] dark:bg-[#0d0f15]/95">
                            <p className="hidden min-w-0 flex-1 truncate pl-1 text-[13px] font-semibold text-gray-600 dark:text-zinc-300 sm:block">Unsaved changes to the site details</p>
                            <Button variant="ghost" onClick={discard} disabled={savingDetails} className="h-11 flex-1 sm:flex-none">Discard</Button>
                            <Button variant="primary" type="submit" form="site-details" disabled={savingDetails} className="h-11 flex-1 sm:flex-none"><Save size={15} /> {savingDetails ? 'Saving…' : 'Save details'}</Button>
                        </div>
                    </div>
                )}

                <Card className="overflow-hidden rounded-2xl">
                    <button type="button" onClick={() => setShowCodes(v => !v)} aria-expanded={showCodes} className="flex w-full items-center text-left">
                        <SectionHeader
                            icon={Terminal}
                            tone="cyan"
                            title="Error codes"
                            hint="What the codes people quote from error messages mean."
                            right={<ChevronDown size={18} className={cn('mt-2 shrink-0 text-gray-400 transition-transform', showCodes && 'rotate-180')} />}
                        />
                    </button>
                    {showCodes && (
                        <ul className="divide-y divide-black/[0.05] border-t border-black/[0.05] dark:divide-white/[0.05] dark:border-white/[0.05]">
                            {ERROR_CODES.map(e => (
                                <li key={e.code} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:gap-4 sm:px-5">
                                    <code className="w-32 shrink-0 font-mono text-[13px] font-bold text-cyan-700 dark:text-cyan-300">{e.code}</code>
                                    <Badge tone={e.module === 'Ticketing' ? 'orange' : e.module === 'Events' ? 'green' : 'amber'} className="w-fit">{e.module}</Badge>
                                    <span className="text-[13px] text-gray-600 dark:text-zinc-300">{e.scenario}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                    <div className="grid grid-cols-1 gap-x-6 gap-y-1 border-t border-black/[0.05] px-4 py-3 text-[12.5px] text-gray-500 dark:border-white/[0.05] sm:grid-cols-3 sm:px-5">
                        <p>Host <span className="font-mono font-semibold text-gray-700 dark:text-zinc-300">{window.location.hostname}</span></p>
                        <p>Switch record <span className="font-mono font-semibold text-gray-700 dark:text-zinc-300">app_state/{isLocal ? 'maintenance_local' : 'maintenance'}</span></p>
                        <p>Signed in as <span className="font-semibold text-gray-700 dark:text-zinc-300">{String(user.role).replace(/_/g, ' ')}</span></p>
                    </div>
                </Card>

                <section ref={refs.danger} className="scroll-mt-24">
                    <div className={cn('overflow-hidden rounded-2xl border bg-white dark:bg-white/[0.03]', accent('red').border)}>
                        <SectionHeader icon={AlertTriangle} tone="red" title="Danger zone" hint="Switches that affect the whole site at once." />
                        <div className="flex flex-col gap-3 border-t border-red-500/20 px-4 py-4 sm:flex-row sm:items-center sm:px-5">
                            <div className="min-w-0 flex-1">
                                <p className="text-[14px] font-bold">Maintenance mode for the whole site</p>
                                <p className="text-[12.5px] leading-snug text-gray-500 dark:text-zinc-400">
                                    {global ? 'On now. Visitors see the maintenance page everywhere.' : 'Takes every public page offline at once. Use it for big updates or emergencies.'}
                                </p>
                            </div>
                            {global ? (
                                <Button variant="primary" onClick={() => askGlobal(false)} className="h-11 w-full sm:w-auto"><Power size={15} /> Bring back online</Button>
                            ) : (
                                <Button variant="danger" onClick={() => askGlobal(true)} className="h-11 w-full sm:w-auto"><Power size={15} /> Turn on maintenance mode</Button>
                            )}
                        </div>
                    </div>
                </section>
            </div>

            <ConfirmSheet
                open={Boolean(confirm)}
                onClose={() => setConfirm(null)}
                title={confirm?.title}
                description={confirm?.description}
                confirmLabel={confirm?.confirmLabel}
                busyLabel={confirm?.busyLabel}
                tone={confirm?.tone}
                icon={confirm?.icon}
                onConfirm={confirm?.onConfirm}
            />
        </AdminCommunityHubLayout>
    );
};

export default SystemControlCenter;
