import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MessageCircle from 'lucide-react/dist/esm/icons/message-circle';
import ClipboardPaste from 'lucide-react/dist/esm/icons/clipboard-paste';
import Inbox from 'lucide-react/dist/esm/icons/inbox';
import Star from 'lucide-react/dist/esm/icons/star';
import UserPlus from 'lucide-react/dist/esm/icons/user-plus';
import Link2 from 'lucide-react/dist/esm/icons/link-2';
import Copy from 'lucide-react/dist/esm/icons/copy';
import TriangleAlert from 'lucide-react/dist/esm/icons/triangle-alert';
import FileSpreadsheet from 'lucide-react/dist/esm/icons/file-spreadsheet';
import Plus from 'lucide-react/dist/esm/icons/plus';
import SlidersHorizontal from 'lucide-react/dist/esm/icons/sliders-horizontal';
import ExternalLink from 'lucide-react/dist/esm/icons/external-link';
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right';
import { cn } from '../../../../lib/utils';
import { useStore } from '../../../../lib/store';
import { copyToClipboard } from '../../../../lib/clipboard';
import { Button, Card, EmptyState, SearchInput, Select, SegmentedTabs, Badge, Menu, MenuItem } from '../../ui';
import ExportMenu from '../../ExportMenu';
import { Spinner, ConfirmSheet } from '../parts';
import { filterApplications, CATEGORIES, campaignCities, isBelowMinimum } from '../../../../lib/outreach/application';
import { STATUSES, STATUS_META, canTransition, isOnShortlist } from '../../../../lib/outreach/status';
import { exportSpecFor } from '../../../../lib/outreach/export';
import { callOutreach, applyUrlFor } from './outreachApi';
import { StatusBadge, Handle, followers, SKIP_REASON } from './parts';
import PasteSheet from './PasteSheet';
import MessagesPanel from './MessagesPanel';
import SetupPanel from './SetupPanel';
import ActivityList from './ActivityList';
import ApplicationSheet from './ApplicationSheet';
import DeliverablesReview from './DeliverablesReview';
import PayoutsPanel from './PayoutsPanel';
import InboxPanel from './InboxPanel';
import WhatsAppUpdatesPanel from './WhatsAppUpdatesPanel';
import ImportSheet from './ImportSheet';
import { deliverableSummary } from '../../../../lib/outreach/deliverables';

/*
 * The campaign's Outreach tab: people (from the open form, or imported from a
 * sheet) → shortlist → invite → joined / posted / paid, with WhatsApp messages
 * for every step. Everything is read and changed
 * through api/_lib/outreach.js, which checks the admin role and writes the
 * audit log; phones and emails never come from Firestore in the browser.
 */

const BLANK_FILTERS = { q: '', minFollowers: '', maxFollowers: '', category: 'all', city: 'all', registered: 'all', college: '', status: 'all', source: 'all', stage: 'all' };

/* The pipeline across the top: each stage is a few statuses, and filters People when tapped. */
const STAGES = [
    { key: 'applied', label: 'Applied', statuses: ['applied'], tone: 'bg-sky-500' },
    { key: 'shortlisted', label: 'Shortlisted', statuses: ['shortlisted', 'message_queued'], tone: 'bg-violet-500' },
    { key: 'messaged', label: 'Invited', statuses: ['message_sent', 'replied'], tone: 'bg-emerald-500' },
    { key: 'joined', label: 'In the group', statuses: ['joined'], tone: 'bg-pink-500' },
    { key: 'posted', label: 'Posted', statuses: ['posted'], tone: 'bg-orange-500' },
    { key: 'paid', label: 'Paid', statuses: ['paid'], tone: 'bg-teal-500' },
];
const stageOf = (status) => STAGES.find(s => s.statuses.includes(status || 'applied'))?.key || null;

const OutreachTab = ({ campaign }) => {
    const addToast = useStore(s => s.addToast);
    const navigate = useNavigate();
    // The WhatsApp center's Send tab, with these applicants picked and the campaign filled in.
    const messageOnWhatsApp = (appIds) => navigate('/admin/whatsapp', { state: { whatsappSend: { campaignId: campaign.id, appIds, at: Date.now() } } });
    const [data, setData] = useState({ loading: true, error: '', applications: [], settings: null, api: null });
    const [view, setView] = useState('applications');
    const [filters, setFilters] = useState(BLANK_FILTERS);
    const [selected, setSelected] = useState(() => new Set());
    const [pasteOpen, setPasteOpen] = useState(null); // 'handles' | 'phones'
    const [importOpen, setImportOpen] = useState(false);
    const [moreFilters, setMoreFilters] = useState(false);
    const [openId, setOpenId] = useState(null);
    const [confirmRemove, setConfirmRemove] = useState(null);
    const [refreshKey, setRefreshKey] = useState(0);

    const load = useCallback(async () => {
        const r = await callOutreach('outreach-list', { campaignId: campaign.id });
        setData(r.ok
            ? { loading: false, error: '', applications: r.data.applications, settings: r.data.settings, api: r.data.whatsappApi || null, wame: r.data.wame || null }
            : { loading: false, error: r.status === 403 ? 'Only founders and admins can see applications and contact details.' : r.error, applications: [], settings: null, api: null });
    }, [campaign.id]);
    useEffect(() => { load(); }, [load]);

    /*
     * While API sends are waiting, nudge the queue every 30 s and refresh the
     * badges. The server keeps to its own rate limit, so this only helps it
     * along when the background worker isn't running.
     */
    const waiting = (data.api?.queue?.queued || 0) + (data.api?.queue?.sending || 0);
    useEffect(() => {
        if (!waiting) return undefined;
        const timer = setInterval(async () => {
            if (document.hidden) return;
            await callOutreach('outreach-queue-run', { campaignId: campaign.id });
            load();
        }, 30_000);
        return () => clearInterval(timer);
    }, [waiting, campaign.id, load]);

    const sendWithApi = async (ids) => {
        const r = await callOutreach('outreach-send', { campaignId: campaign.id, appIds: ids });
        if (!r.ok) {
            addToast(r.error || 'Please try again.', 'error', {
                title: 'Messages not queued',
                action: { label: 'Try again', onClick: () => sendWithApi(ids) },
            });
            return;
        }
        const queued = r.data.queued.length;
        const skipped = r.data.skipped.length ? `${r.data.skipped.length} skipped: ${[...new Set(r.data.skipped.map(s => SKIP_REASON[s.reason] || s.reason))].join(', ')}.` : '';
        if (!skipped) addToast(`${queued} queued to send.`, queued ? 'success' : 'info');
        else addToast(skipped, queued ? 'warning' : 'info', { title: queued ? `${queued} queued to send` : 'Nothing queued' });
        setRefreshKey(k => k + 1);
        load();
    };
    const stopApi = async () => {
        const r = await callOutreach('outreach-cancel', { campaignId: campaign.id });
        if (r.ok) addToast(`${r.data.cancelled} won’t be sent.`, 'success', { title: 'Sending stopped' });
        else addToast(r.error || 'Please try again.', 'error', {
            title: 'Couldn’t stop sending',
            action: { label: 'Try again', onClick: () => stopApi() },
        });
        load();
    };

    const apps = data.applications;
    const byId = useMemo(() => new Map(apps.map(a => [a.id, a])), [apps]);
    const nameOf = useCallback((id) => byId.get(id)?.fullName || null, [byId]);
    const visible = useMemo(() => filterApplications(apps, filters).filter(a => filters.stage === 'all' || stageOf(a.status) === filters.stage), [apps, filters]);
    const shortlist = useMemo(() => apps.filter(a => isOnShortlist(a.status)), [apps]);
    const counts = useMemo(() => Object.fromEntries(STATUSES.map(s => [s, apps.filter(a => (a.status || 'applied') === s).length])), [apps]);
    const stageCounts = useMemo(() => Object.fromEntries(STAGES.map(st => [st.key, st.statuses.reduce((n, s) => n + (counts[s] || 0), 0)])), [counts]);
    const imported = useMemo(() => apps.filter(a => a.source === 'import').length, [apps]);
    const interested = useMemo(() => apps.filter(a => a.interestedAt).length, [apps]);
    const cities = campaignCities(campaign);
    const toReview = useMemo(() => apps.reduce((n, a) => n + deliverableSummary(campaign, a).toReview, 0), [apps, campaign]);
    const setFilter = (patch) => { setFilters(f => ({ ...f, ...patch })); setSelected(new Set()); };

    /* Every status change goes through here. Applies the server's result locally. */
    const changeStatus = useCallback(async (ids, to, { source, messageText, note, quiet } = {}) => {
        const r = await callOutreach('outreach-status', { campaignId: campaign.id, appIds: ids, to, source, messageText, note });
        if (!r.ok) {
            addToast(r.error || 'Please try again.', 'error', { title: 'Status not changed' });
            if (r.status === 429) setData(d => ({ ...d, wame: d.wame ? { ...d.wame, usedToday: d.wame.cap } : d.wame }));
            return false;
        }
        if (source === 'wame') setData(d => ({ ...d, wame: d.wame ? { ...d.wame, usedToday: d.wame.usedToday + r.data.updated.length } : d.wame }));
        const now = new Date().toISOString();
        const stamp = { message_queued: 'messageQueuedAt', message_sent: 'messageSentAt' }[to];
        const done = new Set(r.data.updated.map(u => u.id));
        setData(d => ({
            ...d,
            applications: d.applications.map(a => (done.has(a.id) ? { ...a, status: to, ...(stamp ? { [stamp]: now } : {}), ...(messageText ? { lastMessageText: messageText } : {}) } : a)),
        }));
        setSelected(new Set());
        setRefreshKey(k => k + 1);
        if (!quiet || r.data.skipped.length) {
            const updated = r.data.updated.length;
            const moved = `${updated} moved to ${STATUS_META[to].label}`;
            const skipped = r.data.skipped.length
                ? `${r.data.skipped.length} skipped: ${[...new Set(r.data.skipped.map(s => SKIP_REASON[s.reason] || s.reason))].join(', ')}.`
                : '';
            if (!skipped) addToast(updated ? `${moved}.` : 'Nothing changed.', updated ? 'success' : 'info');
            else addToast(skipped, updated ? 'warning' : 'info', { title: updated ? moved : 'Nothing changed' });
        }
        return true;
    }, [campaign.id, addToast]);

    const addToShortlist = (ids, source) => changeStatus(ids, 'shortlisted', { source });
    const selectedApps = [...selected].map(id => byId.get(id)).filter(Boolean);
    const canShortlist = selectedApps.filter(a => canTransition(a.status || 'applied', 'shortlisted') && !isBelowMinimum(a, campaign));
    const canRemove = selectedApps.filter(a => canTransition(a.status || 'applied', 'removed'));
    const allChecked = visible.length > 0 && visible.every(a => selected.has(a.id));
    const toggle = (id) => setSelected(s => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
    const toggleAll = () => setSelected(allChecked ? new Set() : new Set(visible.map(a => a.id)));

    const formUrl = campaign.slug ? applyUrlFor(campaign.slug) : '';
    const copyForm = async () => {
        const ok = await copyToClipboard(formUrl);
        if (ok) addToast('Form link copied.', 'success');
        else addToast('Select the link and copy it yourself.', 'error', { title: 'Couldn’t copy the link' });
    };

    if (data.loading) return <Card className="flex justify-center py-16 text-gray-400"><Spinner className="h-6 w-6" /></Card>;
    if (data.error) return <Card><EmptyState icon={TriangleAlert} tone="rose" title="Couldn’t load outreach" description={data.error} action={<Button onClick={load}>Try again</Button>} /></Card>;

    const formState = !campaign.publicApplyEnabled
        ? 'The open form is off. Turn it on in Edit → Open application form.'
        : String(campaign.status).toLowerCase() !== 'open' ? `The form is closed while the campaign is ${campaign.status || 'not Open'}.` : null;

    const extraFilters = ['minFollowers', 'maxFollowers', 'category', 'city', 'registered', 'college'].filter(k => filters[k] !== BLANK_FILTERS[k]).length;
    const filterBar = (
        <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
                <SearchInput value={filters.q} onChange={(q) => setFilter({ q })} placeholder="Name, @handle or number" className="w-full sm:w-64" />
                <Select label="Status" value={filters.status} onChange={(status) => setFilter({ status, stage: 'all' })} options={[{ value: 'all', label: 'Any status' }, ...STATUSES.map(s => ({ value: s, label: STATUS_META[s].label }))]} />
                <Select label="Source" value={filters.source} onChange={(source) => setFilter({ source })} options={[{ value: 'all', label: 'Form and imported' }, { value: 'form', label: 'From the form' }, { value: 'import', label: `Imported (${imported})` }, { value: 'interested', label: `Interested (${interested})` }]} />
                <Button variant={moreFilters || extraFilters ? 'secondary' : 'ghost'} onClick={() => setMoreFilters(v => !v)} className="h-11">
                    <SlidersHorizontal size={14} /> Filters{extraFilters ? ` · ${extraFilters}` : ''}
                </Button>
                {JSON.stringify(filters) !== JSON.stringify(BLANK_FILTERS) && <Button variant="ghost" className="h-11" onClick={() => setFilter(BLANK_FILTERS)}>Clear all</Button>}
            </div>
            {moreFilters && (
                <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-black/[0.02] p-2 dark:bg-white/[0.03]">
                    <input className="h-11 w-28 rounded-xl border border-black/10 bg-white px-3 text-[13px] font-semibold dark:border-white/10 dark:bg-white/[0.03]" inputMode="numeric" placeholder="Min followers" aria-label="Minimum followers" value={filters.minFollowers} onChange={(e) => setFilter({ minFollowers: e.target.value.replace(/\D/g, '') })} />
                    <input className="h-11 w-28 rounded-xl border border-black/10 bg-white px-3 text-[13px] font-semibold dark:border-white/10 dark:bg-white/[0.03]" inputMode="numeric" placeholder="Max followers" aria-label="Maximum followers" value={filters.maxFollowers} onChange={(e) => setFilter({ maxFollowers: e.target.value.replace(/\D/g, '') })} />
                    <Select label="Category" value={filters.category} onChange={(category) => setFilter({ category })} options={[{ value: 'all', label: 'All categories' }, ...CATEGORIES]} />
                    {cities.length > 1 && <Select label="City" value={filters.city} onChange={(city) => setFilter({ city })} options={[{ value: 'all', label: 'All cities' }, ...cities.map(c => ({ value: c, label: c }))]} />}
                    <Select label="Registered on Newbi" value={filters.registered} onChange={(registered) => setFilter({ registered })} options={[{ value: 'all', label: 'Registered: any' }, { value: 'yes', label: 'Registered' }, { value: 'no', label: 'Not registered' }]} />
                    <SearchInput value={filters.college} onChange={(college) => setFilter({ college })} placeholder="College or employer" className="w-full sm:w-52" />
                </div>
            )}
        </div>
    );

    const bulkBar = selected.size > 0 && (
        <div className="sticky top-2 z-20 flex flex-wrap items-center gap-2 rounded-2xl border border-black/10 bg-white/95 p-2 shadow-lg backdrop-blur dark:border-white/10 dark:bg-[#14161d]/95">
            <span className="px-2 text-[13px] font-bold">{selected.size} selected</span>
            <Button variant="accent" size="sm" disabled={!canShortlist.length} onClick={() => addToShortlist(canShortlist.map(a => a.id))}><Star size={13} /> {canShortlist.length ? `Add ${canShortlist.length} to shortlist` : 'Add to shortlist'}</Button>
            <Button size="sm" disabled={!canRemove.length} onClick={() => setConfirmRemove(canRemove.map(a => a.id))}>{canRemove.length ? `Remove ${canRemove.length}` : 'Remove'}</Button>
            <Button size="sm" variant="success" onClick={() => setView('whatsapp')}><MessageCircle size={13} /> Message on WhatsApp</Button>
            {data.api?.configured && <Button size="sm" variant="ghost" onClick={() => messageOnWhatsApp([...selected])}>Any template</Button>}
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Clear</Button>
        </div>
    );

    const rowCheck = (a) => (
        <input type="checkbox" checked={selected.has(a.id)} onChange={() => toggle(a.id)} onClick={(e) => e.stopPropagation()} aria-label={`Select ${a.fullName}`} className="h-4 w-4 accent-emerald-600" />
    );
    const tags = (a) => (
        <>
            {a.source === 'import' && <Badge tone="cyan">Imported</Badge>}
            {a.interestedAt && <Badge tone="teal">Interested</Badge>}
            {a.possibleDuplicateOf && <Badge tone="amber">Check duplicate</Badge>}
            {a.whatsappOptOut && <Badge tone="gray">No WhatsApp</Badge>}
            {!a.uid && a.source !== 'import' && <Badge tone="gray">No app account</Badge>}
        </>
    );

    const table = (
        <Card className="overflow-hidden">
            {/* Desktop: a table with every column. */}
            <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[980px] text-left text-[13px]">
                    <thead className="border-b border-black/[0.06] text-[12px] text-gray-500 dark:border-white/[0.08]">
                        <tr>
                            <th className="w-10 px-4 py-3"><input type="checkbox" checked={allChecked} onChange={toggleAll} aria-label="Select all shown" className="h-4 w-4 accent-emerald-600" /></th>
                            {['Name', 'Instagram', 'Followers', 'City', 'College or employer', 'Category', 'Phone', 'Status'].map(h => <th key={h} className="px-3 py-3 font-semibold">{h}</th>)}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-black/[0.05] dark:divide-white/[0.06]">
                        {visible.map(a => (
                            <tr key={a.id} onClick={() => setOpenId(a.id)} className={cn('cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.03]', selected.has(a.id) && 'bg-emerald-500/[0.05]')}>
                                <td className="px-4 py-2.5">{rowCheck(a)}</td>
                                <td className="max-w-[220px] px-3 py-2.5 font-semibold">
                                    <span className="block truncate">{a.fullName}</span>
                                    <span className="flex flex-wrap gap-1">{tags(a)}</span>
                                </td>
                                <td className="px-3 py-2.5"><Handle handle={a.instagramHandle} /></td>
                                <td className="px-3 py-2.5 tabular-nums">{a.followerCount !== null && a.followerCount !== undefined ? <>{followers(a.followerCount)} <span className="text-gray-400">{a.tier}</span></> : <span className="text-gray-400">—</span>}</td>
                                <td className="px-3 py-2.5">{a.city}</td>
                                <td className="max-w-[180px] truncate px-3 py-2.5">{a.collegeOrEmployer}</td>
                                <td className="max-w-[150px] truncate px-3 py-2.5">{a.category}</td>
                                <td className="whitespace-nowrap px-3 py-2.5 tabular-nums">{a.phone}</td>
                                <td className="px-3 py-2.5"><StatusBadge status={a.status} /></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {/* Phones: one card per person. */}
            <ul className="divide-y divide-black/[0.05] md:hidden dark:divide-white/[0.06]">
                <li className="flex items-center gap-3 px-4 py-2.5 text-[12px] font-semibold text-gray-500">
                    <input type="checkbox" checked={allChecked} onChange={toggleAll} aria-label="Select all shown" className="h-4 w-4 accent-emerald-600" /> Select all {visible.length}
                </li>
                {visible.map(a => (
                    <li key={a.id} className="flex items-start gap-3 px-4 py-3" onClick={() => setOpenId(a.id)}>
                        <span className="pt-1">{rowCheck(a)}</span>
                        <div className="min-w-0 flex-1 space-y-0.5">
                            <div className="flex items-center justify-between gap-2">
                                <p className="truncate text-[14px] font-bold">{a.fullName}</p>
                                <StatusBadge status={a.status} />
                            </div>
                            <p className="truncate text-[12.5px] text-gray-500">{[a.instagramHandle && `@${a.instagramHandle}`, a.followerCount != null && followers(a.followerCount), a.city].filter(Boolean).join(' · ') || a.phone}</p>
                            <p className="flex flex-wrap gap-1">{tags(a)}</p>
                        </div>
                    </li>
                ))}
            </ul>
            {!visible.length && (
                <EmptyState
                    icon={Inbox}
                    title={apps.length ? 'No one matches these filters' : 'No one here yet'}
                    description={apps.length ? 'Clear a filter to see more.' : 'Share the open form, or import a sheet of creators you already have numbers for.'}
                    action={!apps.length && <Button variant="accent" onClick={() => setImportOpen(true)}><FileSpreadsheet size={14} /> Import a sheet</Button>}
                />
            )}
        </Card>
    );

    const total = apps.filter(a => a.status !== 'removed').length;
    const pipeline = (
        <Card className="overflow-hidden p-0">
            <div className="flex flex-wrap items-start justify-between gap-3 p-4 pb-3">
                <div className="min-w-0">
                    <p className="font-heading text-[17px] font-extrabold">Creator outreach</p>
                    <p className="text-[12.5px] text-gray-500">
                        {total} {total === 1 ? 'person' : 'people'}{imported ? ` · ${imported} imported` : ''}{interested ? ` · ${interested} interested` : ''}{toReview ? ` · ${toReview} posts to review` : ''}
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button variant="accent" onClick={() => setImportOpen(true)}><FileSpreadsheet size={14} /> Import a sheet</Button>
                    <Button variant="success" onClick={() => setView('whatsapp')}><MessageCircle size={14} /> Send on WhatsApp</Button>
                </div>
            </div>
            <div className="grid grid-cols-3 gap-px border-t border-black/[0.06] bg-black/[0.06] sm:grid-cols-6 dark:border-white/[0.08] dark:bg-white/[0.08]">
                {STAGES.map(st => {
                    const n = stageCounts[st.key];
                    const on = view === 'applications' && filters.stage === st.key;
                    return (
                        <button
                            key={st.key}
                            type="button"
                            aria-pressed={on}
                            onClick={() => { setView('applications'); setFilter({ ...BLANK_FILTERS, stage: on ? 'all' : st.key }); }}
                            className={cn('group relative bg-white px-4 py-3 text-left transition-colors hover:bg-black/[0.02] dark:bg-[#0f1116] dark:hover:bg-white/[0.04]', on && 'bg-emerald-500/[0.06] dark:bg-emerald-500/[0.08]')}
                        >
                            <span className="flex items-center gap-1.5 text-[11.5px] font-semibold text-gray-500"><span className={cn('h-2 w-2 rounded-full', st.tone)} />{st.label}</span>
                            <span className="mt-0.5 block font-heading text-[22px] font-extrabold tabular-nums leading-tight">{n}</span>
                            <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-black/[0.05] dark:bg-white/[0.06]">
                                <span className={cn('block h-full rounded-full', st.tone)} style={{ width: `${total ? Math.max(n ? 4 : 0, Math.round((n / total) * 100)) : 0}%` }} />
                            </span>
                        </button>
                    );
                })}
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-black/[0.06] px-4 py-2.5 text-[12.5px] dark:border-white/[0.08]">
                <span className="flex items-center gap-1.5 font-semibold"><Link2 size={13} /> Open form</span>
                {formUrl ? <span className="min-w-0 max-w-full truncate text-gray-500">{formUrl}</span> : <span className="text-gray-500">Set a link name in Edit → Open application form.</span>}
                {formState && <span className="font-semibold text-amber-600 dark:text-amber-300">{formState}</span>}
                {formUrl && (
                    <span className="ml-auto flex gap-1.5">
                        <Button size="sm" variant="ghost" onClick={copyForm}><Copy size={13} /> Copy</Button>
                        <Button size="sm" variant="ghost" as="a" href={formUrl} target="_blank" rel="noopener noreferrer"><ExternalLink size={13} /> Open</Button>
                    </span>
                )}
            </div>
        </Card>
    );

    const toInvite = counts.shortlisted + counts.message_queued;
    return (
        <div className="space-y-4">
            {pipeline}

            <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
                <SegmentedTabs
                    value={view}
                    onChange={setView}
                    items={[
                        { value: 'applications', label: 'People', count: apps.length },
                        { value: 'messages', label: 'Invite', count: toInvite || undefined, highlight: toInvite > 0 },
                        { value: 'whatsapp', label: 'WhatsApp' },
                        { value: 'deliverables', label: 'Review posts', count: toReview || undefined, highlight: toReview > 0 },
                        { value: 'payouts', label: 'Payouts and tickets' },
                        { value: 'inbox', label: 'Inbox' },
                        { value: 'setup', label: 'Settings' },
                    ]}
                />
            </div>

            {view === 'applications' && (
                <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-[13px] text-gray-500">
                            {visible.length} of {apps.length} shown
                            {filters.stage !== 'all' && <> · <button type="button" className="font-semibold text-emerald-700 hover:underline dark:text-neon-green" onClick={() => setFilter({ stage: 'all' })}>{STAGES.find(s => s.key === filters.stage)?.label} only <span aria-hidden="true">×</span></button></>}
                        </p>
                        <div className="flex flex-wrap gap-2">
                            <Menu
                                title="Add people"
                                trigger={({ toggle }) => <Button onClick={toggle} className="h-11"><Plus size={14} /> Add people</Button>}
                            >
                                <MenuItem icon={FileSpreadsheet} hint="Paste from Google Sheets, or .xlsx / .csv" onClick={() => setImportOpen(true)}>Import a sheet</MenuItem>
                                <MenuItem icon={ClipboardPaste} hint="Matched applicants go on the shortlist" onClick={() => setPasteOpen('handles')}>Paste Instagram handles</MenuItem>
                                <MenuItem icon={UserPlus} hint="From the WhatsApp group’s members: marks them joined" onClick={() => setPasteOpen('phones')}>Paste group members</MenuItem>
                            </Menu>
                            <ExportMenu label="Export shortlist" getSpec={() => exportSpecFor({ title: campaign.title, rows: shortlist })} hint="Everyone on the shortlist, every column" />
                            <ExportMenu label="Export shown" getSpec={() => exportSpecFor({ title: campaign.title, rows: visible, label: 'applications' })} />
                        </div>
                    </div>
                    {filterBar}
                    {bulkBar}
                    {table}
                </div>
            )}
            {view === 'messages' && (
                <MessagesPanel campaign={campaign} applications={apps} settings={data.settings} api={data.api} wame={data.wame} onStatus={changeStatus} onOpen={(a) => setOpenId(a.id)} onSetup={() => setView('setup')} onSendApi={sendWithApi} onStopApi={stopApi} onSentNow={() => { setRefreshKey(k => k + 1); load(); }} />
            )}
            {view === 'setup' && (
                <div className="space-y-4">
                    <SetupPanel campaign={campaign} settings={data.settings} api={data.api} sampleApplication={shortlist[0] || apps[0]} onSaved={load} />
                    <Card className="p-4">
                        <p className="mb-3 flex items-center gap-1.5 text-[14px] font-bold">Activity <ChevronRight size={14} className="text-gray-400" /> <span className="font-medium text-gray-500">every change, by whom</span></p>
                        <ActivityList campaignId={campaign.id} nameOf={nameOf} refreshKey={refreshKey} />
                    </Card>
                </div>
            )}
            {view === 'whatsapp' && <WhatsAppUpdatesPanel campaign={campaign} applications={apps} settings={data.settings} api={data.api} onSent={() => { setRefreshKey(k => k + 1); load(); }} />}
            {view === 'deliverables' && <DeliverablesReview campaign={campaign} applications={apps} onChanged={() => { setRefreshKey(k => k + 1); load(); }} />}
            {view === 'payouts' && <PayoutsPanel campaign={campaign} applications={apps} onChanged={() => { setRefreshKey(k => k + 1); load(); }} />}
            {view === 'inbox' && <InboxPanel campaign={campaign} configured={Boolean(data.api?.configured)} />}

            <PasteSheet
                key={pasteOpen || 'closed'}
                open={Boolean(pasteOpen)}
                mode={pasteOpen || 'handles'}
                onClose={() => setPasteOpen(null)}
                applications={apps}
                onShortlist={addToShortlist}
                onMark={(ids, to, source) => changeStatus(ids, to, { source })}
            />
            <ImportSheet
                open={importOpen}
                onClose={() => setImportOpen(false)}
                campaign={campaign}
                applications={apps}
                onImported={async () => { setRefreshKey(k => k + 1); await load(); setView('applications'); setFilter({ ...BLANK_FILTERS, source: 'import' }); }}
                onShortlist={(ids) => addToShortlist(ids)}
            />
            <ApplicationSheet app={openId ? byId.get(openId) : null} campaign={campaign} campaignId={campaign.id} onClose={() => setOpenId(null)} onStatus={changeStatus} onMessage={data.api?.configured ? messageOnWhatsApp : null} nameOf={nameOf} refreshKey={refreshKey} onChanged={() => { setRefreshKey(k => k + 1); load(); }} />
            <ConfirmSheet
                open={Boolean(confirmRemove)}
                onClose={() => setConfirmRemove(null)}
                title={`Remove ${confirmRemove?.length || 0} from the shortlist?`}
                message="They stay in the People list as Removed, and you can add them back later."
                confirmLabel="Remove"
                tone="danger"
                onConfirm={async () => { await changeStatus(confirmRemove, 'removed'); setConfirmRemove(null); }}
            />
        </div>
    );
};

export default OutreachTab;
