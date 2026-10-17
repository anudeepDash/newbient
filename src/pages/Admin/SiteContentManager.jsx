import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Globe from 'lucide-react/dist/esm/icons/globe';
import MapPin from 'lucide-react/dist/esm/icons/map-pin';
import MessageSquareQuote from 'lucide-react/dist/esm/icons/message-square-quote';
import Phone from 'lucide-react/dist/esm/icons/phone';
import Mail from 'lucide-react/dist/esm/icons/mail';
import Instagram from 'lucide-react/dist/esm/icons/instagram';
import Linkedin from 'lucide-react/dist/esm/icons/linkedin';
import MessageCircle from 'lucide-react/dist/esm/icons/message-circle';
import ExternalLink from 'lucide-react/dist/esm/icons/external-link';
import ShieldAlert from 'lucide-react/dist/esm/icons/shield-alert';
import Save from 'lucide-react/dist/esm/icons/save';
import Smartphone from 'lucide-react/dist/esm/icons/smartphone';
import Zap from 'lucide-react/dist/esm/icons/zap';
import Radio from 'lucide-react/dist/esm/icons/radio';
import Plus from 'lucide-react/dist/esm/icons/plus';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right';
import CreatorTestimonialsManager from '../../components/admin/CreatorTestimonialsManager';
import { useStore } from '../../lib/store';
import { cn } from '../../lib/utils';
import AdminCommunityHubLayout from '../../components/admin/AdminCommunityHubLayout';
import { Button, Badge } from '../../components/admin/ui';
import { accent } from '../../components/admin/theme';
import { fieldCls, areaCls, Toggle } from '../../components/admin/uploads/UploadKit';
import { BuilderCard } from '../../components/admin/events/EditorParts';
import { CharCount, LabelRow } from '../../components/admin/content/ContentKit';
import PartnerBrandsCard from '../../components/admin/content/PartnerBrandsCard';

const DETAIL_FIELDS = ['title', 'tagline', 'description', 'phone', 'email', 'whatsappCommunity', 'instagram', 'linkedin', 'address'];
const pickDetails = (d) => DETAIL_FIELDS.reduce((acc, k) => ({ ...acc, [k]: d?.[k] && d[k] !== '#' ? d[k] : '' }), {});

/*
 * One page, three sidebar entries:
 *   site    Landing site → Site settings: what newbi.live shows (sections, home numbers),
 *           contact details, search and sharing, and the site status.
 *   brands  Landing site → Brands & quotes: partner logos and creator testimonials.
 *   app     App → App settings: the WhatsApp community link and where the app's other
 *           settings live (creator settings, announcements, maintenance).
 */
const VIEWS = {
    site: { title: 'Site settings', icon: Globe, description: 'What newbi.live shows, and how people reach you' },
    brands: { title: 'Brands & quotes', icon: MessageSquareQuote, description: 'Partner logos and creator testimonials on newbi.live' },
    app: { title: 'App settings', icon: Smartphone, description: 'Settings for app.newbi.live' },
};

/* The numbers strip on the home page (site_settings/general.stats), up to four. Nothing shows until you add them. */
const HomeNumbersCard = ({ stats = [], onSave }) => {
    const toRows = (list) => [...(Array.isArray(list) ? list : []).map(x => ({ value: x?.value || '', label: x?.label || '' }))];
    const [rows, setRows] = useState(() => toRows(stats));
    const [saving, setSaving] = useState(false);
    const savedJson = JSON.stringify(toRows(stats).filter(r => r.value.trim() && r.label.trim()));
    const cleaned = rows.map(r => ({ value: r.value.trim(), label: r.label.trim() })).filter(r => r.value && r.label).slice(0, 4);
    const dirty = JSON.stringify(cleaned) !== savedJson;
    useEffect(() => { if (!dirty) setRows(toRows(stats)); }, [JSON.stringify(stats)]); // eslint-disable-line react-hooks/exhaustive-deps
    const set = (i, k, v) => setRows(list => list.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
    const save = async () => { setSaving(true); try { await onSave(cleaned); } finally { setSaving(false); } };
    return (
        <BuilderCard title="Numbers on the home page" hint="Up to four, like “120+ · College activations”. Leave empty to hide the strip.">
            <div className="space-y-2">
                {rows.map((r, i) => (
                    <div key={i} className="flex items-center gap-2">
                        <input className={cn(fieldCls, 'w-28 shrink-0')} value={r.value} maxLength={16} onChange={(e) => set(i, 'value', e.target.value)} placeholder="120+" />
                        <input className={cn(fieldCls, 'min-w-0 flex-1')} value={r.label} maxLength={40} onChange={(e) => set(i, 'label', e.target.value)} placeholder="College activations" />
                        <button type="button" aria-label="Remove" onClick={() => setRows(list => list.filter((_, j) => j !== i))} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-gray-400 hover:bg-black/5 hover:text-red-600 dark:hover:bg-white/10"><Trash2 size={16} /></button>
                    </div>
                ))}
                <div className="flex items-center justify-between gap-2 pt-1">
                    {rows.length < 4
                        ? <Button variant="ghost" onClick={() => setRows(list => [...list, { value: '', label: '' }])} className="h-10"><Plus size={15} /> Add a number</Button>
                        : <span />}
                    {dirty && <Button variant="accent" onClick={save} disabled={saving} className="h-10 px-4"><Save size={15} /> {saving ? 'Saving…' : 'Save numbers'}</Button>}
                </div>
            </div>
        </BuilderCard>
    );
};

const LinkRow = ({ to, href, icon: Icon, tone, title, hint }) => {
    const body = (
        <>
            <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', accent(tone).chip)}><Icon size={18} /></span>
            <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-semibold">{title}</span>
                <span className="block text-[12px] text-gray-500">{hint}</span>
            </span>
            {href ? <ExternalLink size={15} className="shrink-0 text-gray-400" /> : <ChevronRight size={16} className="shrink-0 text-gray-400" />}
        </>
    );
    const cls = 'flex min-h-[56px] items-center gap-3 rounded-xl border border-black/[0.06] p-3 transition-colors hover:border-black/15 dark:border-white/[0.08] dark:hover:border-white/20';
    return href ? <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>{body}</a> : <Link to={to} className={cls}>{body}</Link>;
};

const IconField = ({ icon: Icon, label, hint, right, children }) => (
    <label className="block min-w-0">
        <LabelRow label={label} right={right} />
        <span className="relative block">
            <Icon size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            {children}
        </span>
        {hint && <span className="mt-1 block text-[11px] text-gray-500">{hint}</span>}
    </label>
);

const SiteContentManager = ({ view = 'site' }) => {
    const { siteDetails, updateSiteDetails, siteSettings = {}, updateGeneralSettings, maintenanceState = {}, addToast } = useStore();
    const tab = view === 'site' ? 'website' : view;

    const [form, setForm] = useState(() => pickDetails(siteDetails));
    const [dirty, setDirty] = useState(false);
    const [saving, setSaving] = useState(false);
    const [settingKey, setSettingKey] = useState(null);
    const saveLock = useRef(false);

    // Pick up the saved details when they arrive, unless you are mid-edit.
    useEffect(() => { if (!dirty) setForm(pickDetails(siteDetails)); }, [siteDetails, dirty]);

    useEffect(() => {
        if (!dirty) return undefined;
        const warn = (e) => { e.preventDefault(); e.returnValue = ''; };
        window.addEventListener('beforeunload', warn);
        return () => window.removeEventListener('beforeunload', warn);
    }, [dirty]);

    const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setDirty(true); };
    const changed = useMemo(() => {
        const saved = pickDetails(siteDetails);
        return DETAIL_FIELDS.filter(k => (form[k] || '') !== (saved[k] || ''));
    }, [form, siteDetails]);

    const emailBad = form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim());
    const waBad = form.whatsappCommunity && !/^https?:\/\//i.test(form.whatsappCommunity.trim());

    const saveDetails = async () => {
        if (saveLock.current || emailBad || waBad) return;
        saveLock.current = true;
        setSaving(true);
        try {
            const payload = changed.reduce((acc, k) => ({ ...acc, [k]: (form[k] || '').trim() }), {});
            await updateSiteDetails(payload);
            setDirty(false);
            addToast('Site details saved.', 'success');
        } catch (err) {
            console.error(err);
            addToast("Couldn't save the site details. Please try again.", 'error');
        } finally {
            saveLock.current = false;
            setSaving(false);
        }
    };
    const discard = () => { setForm(pickDetails(siteDetails)); setDirty(false); };

    const setSetting = async (key, value, label) => {
        if (settingKey) return;
        setSettingKey(key);
        try {
            await updateGeneralSettings({ [key]: value });
            addToast(`${label} ${value ? 'on' : 'off'}.`, 'success');
        } catch (err) {
            console.error(err);
            addToast("Couldn't change that setting. Please try again.", 'error');
        } finally {
            setSettingKey(null);
        }
    };

    const locked = !!maintenanceState.global;
    const sectionToggles = [
        // Defaults match what newbi.live does when a setting was never saved (on).
        { key: 'showUpcomingEvents', label: 'Upcoming events', hint: 'Upcoming shows on the home page', on: siteSettings.showUpcomingEvents !== false, value: (v) => v, href: '/' },
        { key: 'showPastClients', label: 'Partner brands', hint: 'The logo strip on the home and creator pages', on: siteSettings.showPastClients !== false, value: (v) => v, href: '/' },
        { key: 'showCreatorTestimonials', label: 'Creator testimonials', hint: 'Quotes from creators on the creator page', on: siteSettings.showCreatorTestimonials !== false, value: (v) => v, href: '/creator' },
    ];

    const sticky = dirty && changed.length > 0;

    return (
        <AdminCommunityHubLayout studioHeader={VIEWS[view] || VIEWS.site} hideTabs>
            <div className="space-y-5">
                {tab === 'brands' && (
                    <>
                        <PartnerBrandsCard visible={siteSettings.showPastClients !== false} />
                        <CreatorTestimonialsManager />
                    </>
                )}

                {tab === 'app' && (
                    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
                        <div className="min-w-0 space-y-5">
                            <BuilderCard title="Community" hint="The WhatsApp group button members see in the app's Community tab">
                                <IconField icon={MessageCircle} label="WhatsApp community link">
                                    <input className={cn(fieldCls, 'pl-10', waBad && 'border-red-400')} value={form.whatsappCommunity} onChange={(e) => set('whatsappCommunity', e.target.value)} placeholder="https://chat.whatsapp.com/…" inputMode="url" autoCapitalize="off" autoCorrect="off" />
                                    {waBad && <span role="alert" className="mt-1 block text-[12px] font-semibold text-red-600 dark:text-red-400">Paste the full link, starting with https://</span>}
                                </IconField>
                            </BuilderCard>
                            <BuilderCard title="More app settings" hint="The rest lives with the part of the app it changes">
                                <div className="space-y-2">
                                    <LinkRow to="/admin/creators/settings" icon={Zap} tone="pink" title="Creator settings" hint="Instagram check, minimum followers, welcome points, new sign-ups" />
                                    <LinkRow to="/admin/announcements" icon={Radio} tone="amber" title="Announcements" hint="Notices and updates for app users" />
                                    <LinkRow to="/admin/system-command" icon={ShieldAlert} tone="red" title="Maintenance" hint="Switch pages and features off for everyone" />
                                    <LinkRow href="https://app.newbi.live" icon={Smartphone} tone="green" title="Open the app" hint="app.newbi.live" />
                                </div>
                            </BuilderCard>
                        </div>
                    </div>
                )}

                {tab === 'website' && (
                    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
                        <div className="min-w-0 space-y-5">
                            <BuilderCard
                                title="Site status"
                                hint="For emergencies and big updates"
                                action={<Badge tone={locked ? 'red' : 'green'}>{locked ? 'Locked for visitors' : 'Open to everyone'}</Badge>}
                            >
                                <div className="space-y-3">
                                    <Link to="/admin/system-command" className={cn('flex min-h-[56px] items-center gap-3 rounded-xl border p-3 transition-colors hover:border-black/15 dark:hover:border-white/20', locked ? cn(accent('red').border, accent('red').soft) : 'border-black/[0.06] dark:border-white/[0.08]')}>
                                        <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', accent('red').chip)}><ShieldAlert size={18} /></span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block text-[14px] font-semibold">Maintenance mode lives in System</span>
                                            <span className="block text-[12px] text-gray-500">{locked ? 'The site is locked for visitors right now.' : 'Lock the whole site for visitors from there.'}</span>
                                        </span>
                                        <ChevronRight size={16} className="shrink-0 text-gray-400" />
                                    </Link>
                                    <Toggle
                                        label="Hide pages under maintenance from menus"
                                        hint="Visitors won't see links to pages that are switched off"
                                        checked={siteSettings.hideMaintenancePages === true}
                                        onChange={(v) => setSetting('hideMaintenancePages', v, 'Hiding pages under maintenance')}
                                    />
                                </div>
                            </BuilderCard>

                            <BuilderCard title="Sections on the website" hint="Switch a section off to hide it right away">
                                <ul className="divide-y divide-black/[0.05] dark:divide-white/[0.06]">
                                    {sectionToggles.map(t => (
                                        <li key={t.key} className="flex items-center gap-2 py-2 first:pt-0 last:pb-0">
                                            <div className={cn('min-w-0 flex-1', settingKey === t.key && 'opacity-60')}>
                                                <Toggle label={t.label} hint={t.hint} checked={t.on} onChange={(v) => setSetting(t.key, t.value(v), t.label)} />
                                            </div>
                                            <a href={t.href} target="_blank" rel="noopener noreferrer" aria-label={`Open ${t.label} on the site`} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-gray-400 hover:bg-black/5 hover:text-gray-900 dark:hover:bg-white/10 dark:hover:text-white">
                                                <ExternalLink size={15} />
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </BuilderCard>

                            <HomeNumbersCard
                                stats={siteSettings.stats}
                                onSave={async (stats) => {
                                    try { await updateGeneralSettings({ stats }); addToast(stats.length ? 'Home page numbers saved.' : 'Home page numbers removed.', 'success'); }
                                    catch (err) { console.error(err); addToast("Couldn't save the numbers. Please try again.", 'error'); }
                                }}
                            />

                            <BuilderCard title="Contact details" hint="Shown on the contact page and in the site footer">
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <IconField icon={Phone} label="Phone" hint="Also used for the WhatsApp chat button">
                                        <input className={cn(fieldCls, 'pl-10')} value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+91 98765 43210" inputMode="tel" autoComplete="off" />
                                    </IconField>
                                    <IconField icon={Mail} label="Email" hint={emailBad ? undefined : 'Where the contact page sends people'}>
                                        <input className={cn(fieldCls, 'pl-10', emailBad && 'border-red-400')} value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="hello@newbi.live" inputMode="email" autoCapitalize="off" autoComplete="off" />
                                        {emailBad && <span role="alert" className="mt-1 block text-[12px] font-semibold text-red-600 dark:text-red-400">That doesn't look like an email address.</span>}
                                    </IconField>
                                    <IconField icon={Instagram} label="Instagram">
                                        <input className={cn(fieldCls, 'pl-10')} value={form.instagram} onChange={(e) => set('instagram', e.target.value)} placeholder="@newbi.live or a link" autoCapitalize="off" autoCorrect="off" />
                                    </IconField>
                                    <IconField icon={Linkedin} label="LinkedIn">
                                        <input className={cn(fieldCls, 'pl-10')} value={form.linkedin} onChange={(e) => set('linkedin', e.target.value)} placeholder="Company page link" autoCapitalize="off" autoCorrect="off" />
                                    </IconField>
                                    <label className="block min-w-0 sm:col-span-2">
                                        <LabelRow label="Office address" />
                                        <span className="relative block">
                                            <MapPin size={16} className="pointer-events-none absolute left-3.5 top-3.5 text-gray-400" />
                                            <textarea className={cn(areaCls, 'min-h-[88px] resize-y pl-10')} value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="Full address, used for the map link" />
                                        </span>
                                    </label>
                                </div>
                            </BuilderCard>

                            <BuilderCard title="Search and sharing" hint="Name, tagline and description of the site">
                                <div className="space-y-4">
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <label className="block">
                                            <LabelRow label="Site title" right={<CharCount value={form.title} ideal={30} max={60} />} />
                                            <input className={fieldCls} value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Newbi — We build the nights you remember" />
                                        </label>
                                        <label className="block">
                                            <LabelRow label="Tagline" />
                                            <input className={fieldCls} value={form.tagline} onChange={(e) => set('tagline', e.target.value)} placeholder="Music, culture and creators" />
                                        </label>
                                    </div>
                                    <label className="block">
                                        <LabelRow label="Description" right={<CharCount value={form.description} ideal={120} max={160} />} />
                                        <textarea className={cn(areaCls, 'min-h-[88px] resize-y')} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="One or two sentences about Newbi for search results" />
                                    </label>
                                    <div className="rounded-xl border border-black/[0.06] p-3 dark:border-white/[0.08]">
                                        <p className="mb-1 text-[11px] font-bold text-gray-500">Search result preview</p>
                                        <p className="truncate text-[12px] text-emerald-700 dark:text-neon-green">newbi.live</p>
                                        <p className="truncate text-[17px] font-medium text-sky-700 dark:text-neon-blue">{form.title || 'Newbi — We build the nights you remember'}</p>
                                        <p className="line-clamp-2 text-[13px] text-gray-600 dark:text-zinc-400">{form.description || 'Your description will appear here.'}</p>
                                    </div>
                                    <p className="text-[12px] text-gray-500">These are saved for the team. The website's own page title is set in its code, so changing them here doesn't change Google results yet.</p>
                                </div>
                            </BuilderCard>
                        </div>

                        <aside className="hidden space-y-3 xl:sticky xl:top-24 xl:block xl:self-start">
                            <p className="text-[12px] font-bold text-gray-500">Contact page preview</p>
                            <ContactPreview form={form} />
                        </aside>
                    </div>
                )}
                {(tab === 'website' || tab === 'app') && sticky && (
                    <div className="sticky bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-30 lg:bottom-4">
                        <div className="flex items-center gap-2 rounded-2xl border border-black/[0.08] bg-white/95 p-2 pl-4 shadow-xl backdrop-blur-xl dark:border-white/[0.1] dark:bg-[#0d0f15]/95">
                            <p className="min-w-0 flex-1 truncate text-[13px] font-semibold text-gray-600 dark:text-zinc-300">
                                {changed.length} unsaved change{changed.length === 1 ? '' : 's'}
                            </p>
                            <Button variant="ghost" onClick={discard} disabled={saving} className="h-11">Discard</Button>
                            <Button variant="accent" onClick={saveDetails} disabled={saving || emailBad || waBad} className="h-11 px-5"><Save size={15} /> {saving ? 'Saving…' : 'Save'}</Button>
                        </div>
                    </div>
                )}
            </div>

        </AdminCommunityHubLayout>
    );
};

const ContactPreview = ({ form }) => {
    const rows = [
        { icon: Phone, label: 'Call or WhatsApp', value: form.phone, tone: 'green' },
        { icon: Mail, label: 'Email', value: form.email, tone: 'blue' },
        { icon: Instagram, label: 'Instagram', value: form.instagram, tone: 'pink' },
        { icon: MapPin, label: 'Office', value: form.address, tone: 'amber' },
    ];
    return (
        <div className="space-y-2 rounded-2xl border border-black/[0.06] bg-white p-3 dark:border-white/[0.08] dark:bg-white/[0.03]">
            {rows.map(r => (
                <div key={r.label} className="flex items-start gap-3 rounded-xl p-2">
                    <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', accent(r.tone).chip)}><r.icon size={16} /></span>
                    <span className="min-w-0">
                        <span className="block text-[11px] font-semibold text-gray-500">{r.label}</span>
                        <span className={cn('block break-words text-[13px] font-semibold', !r.value && 'text-gray-400')}>{r.value || 'Not set'}</span>
                    </span>
                </div>
            ))}
        </div>
    );
};

export default SiteContentManager;
