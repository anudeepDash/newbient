import React, { useCallback, useEffect, useMemo, useState } from 'react';
import ClipboardPaste from 'lucide-react/dist/esm/icons/clipboard-paste';
import Inbox from 'lucide-react/dist/esm/icons/inbox';
import Star from 'lucide-react/dist/esm/icons/star';
import Send from 'lucide-react/dist/esm/icons/send';
import UserPlus from 'lucide-react/dist/esm/icons/user-plus';
import Link2 from 'lucide-react/dist/esm/icons/link-2';
import Copy from 'lucide-react/dist/esm/icons/copy';
import TriangleAlert from 'lucide-react/dist/esm/icons/triangle-alert';
import { cn } from '../../../../lib/utils';
import { useStore } from '../../../../lib/store';
import { copyToClipboard } from '../../../../lib/clipboard';
import { Button, Card, EmptyState, SearchInput, Select, SegmentedTabs, StatTile, Badge } from '../../ui';
import ExportMenu from '../../ExportMenu';
import { Spinner, ConfirmSheet } from '../parts';
import { filterApplications, CATEGORIES, campaignCities } from '../../../../lib/outreach/application';
import { STATUSES, STATUS_META, canTransition, isOnShortlist } from '../../../../lib/outreach/status';
import { exportSpecFor } from '../../../../lib/outreach/export';
import { callOutreach, applyUrlFor } from './outreachApi';
import { StatusBadge, Handle, followers, SKIP_REASON } from './parts';
import PasteSheet from './PasteSheet';
import MessagesPanel from './MessagesPanel';
import SetupPanel from './SetupPanel';
import ActivityList from './ActivityList';
import ApplicationSheet from './ApplicationSheet';

/*
 * The campaign's Outreach tab: open-form applications → shortlist → WhatsApp
 * message by hand → joined / posted / paid. Everything is read and changed
 * through api/_lib/outreach.js, which checks the admin role and writes the
 * audit log; phones and emails never come from Firestore in the browser.
 */

const BLANK_FILTERS = { q: '', minFollowers: '', maxFollowers: '', category: 'all', city: 'all', registered: 'all', college: '', status: 'all' };

const OutreachTab = ({ campaign }) => {
    const addToast = useStore(s => s.addToast);
    const [data, setData] = useState({ loading: true, error: '', applications: [], settings: null });
    const [view, setView] = useState('applications');
    const [filters, setFilters] = useState(BLANK_FILTERS);
    const [selected, setSelected] = useState(() => new Set());
    const [pasteOpen, setPasteOpen] = useState(false);
    const [openId, setOpenId] = useState(null);
    const [confirmRemove, setConfirmRemove] = useState(null);
    const [refreshKey, setRefreshKey] = useState(0);

    const load = useCallback(async () => {
        const r = await callOutreach('outreach-list', { campaignId: campaign.id });
        setData(r.ok
            ? { loading: false, error: '', applications: r.data.applications, settings: r.data.settings }
            : { loading: false, error: r.status === 403 ? 'Only founders and admins can see applications and contact details.' : r.error, applications: [], settings: null });
    }, [campaign.id]);
    useEffect(() => { load(); }, [load]);

    const apps = data.applications;
    const byId = useMemo(() => new Map(apps.map(a => [a.id, a])), [apps]);
    const nameOf = useCallback((id) => byId.get(id)?.fullName || null, [byId]);
    const visible = useMemo(() => filterApplications(apps, filters), [apps, filters]);
    const shortlist = useMemo(() => apps.filter(a => isOnShortlist(a.status)), [apps]);
    const counts = useMemo(() => Object.fromEntries(STATUSES.map(s => [s, apps.filter(a => (a.status || 'applied') === s).length])), [apps]);
    const cities = campaignCities(campaign);
    const setFilter = (patch) => { setFilters(f => ({ ...f, ...patch })); setSelected(new Set()); };

    /* Every status change goes through here. Applies the server's result locally. */
    const changeStatus = useCallback(async (ids, to, { source, messageText, note, quiet } = {}) => {
        const r = await callOutreach('outreach-status', { campaignId: campaign.id, appIds: ids, to, source, messageText, note });
        if (!r.ok) {
            addToast(r.error, 'error');
            return false;
        }
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
            const skipped = r.data.skipped.length
                ? ` ${r.data.skipped.length} skipped (${[...new Set(r.data.skipped.map(s => SKIP_REASON[s.reason] || s.reason))].join(', ')}).`
                : '';
            addToast(`${r.data.updated.length ? `${STATUS_META[to].label}: ${r.data.updated.length}.` : 'Nothing changed.'}${skipped}`, r.data.updated.length ? 'success' : 'info');
        }
        return true;
    }, [campaign.id, addToast]);

    const addToShortlist = (ids, source) => changeStatus(ids, 'shortlisted', { source });
    const selectedApps = [...selected].map(id => byId.get(id)).filter(Boolean);
    const canShortlist = selectedApps.filter(a => canTransition(a.status || 'applied', 'shortlisted'));
    const canRemove = selectedApps.filter(a => canTransition(a.status || 'applied', 'removed'));
    const allChecked = visible.length > 0 && visible.every(a => selected.has(a.id));
    const toggle = (id) => setSelected(s => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
    const toggleAll = () => setSelected(allChecked ? new Set() : new Set(visible.map(a => a.id)));

    const formUrl = campaign.slug ? applyUrlFor(campaign.slug) : '';
    const copyForm = async () => {
        const ok = await copyToClipboard(formUrl);
        addToast(ok ? 'Form link copied.' : 'Couldn’t copy.', ok ? 'success' : 'error');
    };

    if (data.loading) return <Card className="flex justify-center py-16 text-gray-400"><Spinner className="h-6 w-6" /></Card>;
    if (data.error) return <Card><EmptyState icon={TriangleAlert} tone="rose" title="Couldn’t load outreach" description={data.error} action={<Button onClick={load}>Try again</Button>} /></Card>;

    const formState = !campaign.publicApplyEnabled
        ? 'The open form is off. Turn it on in Edit → Open application form.'
        : String(campaign.status).toLowerCase() !== 'open' ? `The form is closed while the campaign is ${campaign.status || 'not Open'}.` : null;

    const filterBar = (
        <div className="flex flex-wrap items-center gap-2">
            <SearchInput value={filters.q} onChange={(q) => setFilter({ q })} placeholder="Name or @handle" className="w-full sm:w-56" />
            <input className="h-11 w-28 rounded-xl border border-black/10 bg-white px-3 text-[13px] font-semibold dark:border-white/10 dark:bg-white/[0.03]" inputMode="numeric" placeholder="Min followers" aria-label="Minimum followers" value={filters.minFollowers} onChange={(e) => setFilter({ minFollowers: e.target.value.replace(/\D/g, '') })} />
            <input className="h-11 w-28 rounded-xl border border-black/10 bg-white px-3 text-[13px] font-semibold dark:border-white/10 dark:bg-white/[0.03]" inputMode="numeric" placeholder="Max followers" aria-label="Maximum followers" value={filters.maxFollowers} onChange={(e) => setFilter({ maxFollowers: e.target.value.replace(/\D/g, '') })} />
            <Select label="Category" value={filters.category} onChange={(category) => setFilter({ category })} options={[{ value: 'all', label: 'All categories' }, ...CATEGORIES]} />
            {cities.length > 1 && <Select label="City" value={filters.city} onChange={(city) => setFilter({ city })} options={[{ value: 'all', label: 'All cities' }, ...cities.map(c => ({ value: c, label: c }))]} />}
            <Select label="Registered on Newbi" value={filters.registered} onChange={(registered) => setFilter({ registered })} options={[{ value: 'all', label: 'Registered: any' }, { value: 'yes', label: 'Registered' }, { value: 'no', label: 'Not registered' }]} />
            <SearchInput value={filters.college} onChange={(college) => setFilter({ college })} placeholder="College or employer" className="w-full sm:w-52" />
            <Select label="Status" value={filters.status} onChange={(status) => setFilter({ status })} options={[{ value: 'all', label: 'Any status' }, ...STATUSES.map(s => ({ value: s, label: STATUS_META[s].label }))]} />
            {JSON.stringify(filters) !== JSON.stringify(BLANK_FILTERS) && <Button variant="ghost" onClick={() => setFilter(BLANK_FILTERS)}>Clear</Button>}
        </div>
    );

    const bulkBar = selected.size > 0 && (
        <div className="sticky top-2 z-20 flex flex-wrap items-center gap-2 rounded-2xl border border-black/10 bg-white/95 p-2 shadow-lg backdrop-blur dark:border-white/10 dark:bg-[#14161d]/95">
            <span className="px-2 text-[13px] font-bold">{selected.size} selected</span>
            <Button variant="accent" size="sm" disabled={!canShortlist.length} onClick={() => addToShortlist(canShortlist.map(a => a.id))}><Star size={13} /> {canShortlist.length ? `Add ${canShortlist.length} to shortlist` : 'Add to shortlist'}</Button>
            <Button size="sm" disabled={!canRemove.length} onClick={() => setConfirmRemove(canRemove.map(a => a.id))}>{canRemove.length ? `Remove ${canRemove.length}` : 'Remove'}</Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Clear</Button>
        </div>
    );

    const rowCheck = (a) => (
        <input type="checkbox" checked={selected.has(a.id)} onChange={() => toggle(a.id)} onClick={(e) => e.stopPropagation()} aria-label={`Select ${a.fullName}`} className="h-4 w-4 accent-emerald-600" />
    );

    const table = (
        <Card className="overflow-hidden">
            {/* Desktop: a table with every column. */}
            <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[980px] text-left text-[13px]">
                    <thead className="border-b border-black/[0.06] text-[12px] text-gray-500 dark:border-white/[0.08]">
                        <tr>
                            <th className="w-10 px-4 py-3"><input type="checkbox" checked={allChecked} onChange={toggleAll} aria-label="Select all shown" className="h-4 w-4 accent-emerald-600" /></th>
                            {['Name', 'Instagram', 'Followers', 'City', 'College or employer', 'Category', 'Registered', 'Phone', 'Status'].map(h => <th key={h} className="px-3 py-3 font-semibold">{h}</th>)}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-black/[0.05] dark:divide-white/[0.06]">
                        {visible.map(a => (
                            <tr key={a.id} onClick={() => setOpenId(a.id)} className={cn('cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.03]', selected.has(a.id) && 'bg-emerald-500/[0.05]')}>
                                <td className="px-4 py-2.5">{rowCheck(a)}</td>
                                <td className="max-w-[180px] px-3 py-2.5 font-semibold">
                                    <span className="block truncate">{a.fullName}</span>
                                    {a.possibleDuplicateOf && <Badge tone="amber">Check duplicate</Badge>}
                                </td>
                                <td className="px-3 py-2.5"><Handle handle={a.instagramHandle} /></td>
                                <td className="px-3 py-2.5 tabular-nums">{followers(a.followerCount)} <span className="text-gray-400">{a.tier}</span></td>
                                <td className="px-3 py-2.5">{a.city}</td>
                                <td className="max-w-[180px] truncate px-3 py-2.5">{a.collegeOrEmployer}</td>
                                <td className="max-w-[150px] truncate px-3 py-2.5">{a.category}</td>
                                <td className="px-3 py-2.5">{a.registeredNewbiCreator ? (a.creatorId ? 'Yes, linked' : 'Yes') : 'No'}</td>
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
                            <p className="truncate text-[12.5px] text-gray-500"><Handle handle={a.instagramHandle} /> · {followers(a.followerCount)} · {a.city}</p>
                            <p className="truncate text-[12.5px] text-gray-500">{[a.collegeOrEmployer, a.category, a.registeredNewbiCreator ? 'On Newbi' : null].filter(Boolean).join(' · ')}</p>
                        </div>
                    </li>
                ))}
            </ul>
            {!visible.length && <EmptyState icon={Inbox} title={apps.length ? 'No one matches these filters' : 'No applications yet'} description={apps.length ? 'Clear a filter to see more.' : 'Share the open form link to start collecting applications.'} />}
        </Card>
    );

    return (
        <div className="space-y-4">
            <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                    <p className="flex items-center gap-2 text-[13px] font-bold"><Link2 size={14} /> Open application form</p>
                    {formUrl ? <p className="truncate text-[13px] text-gray-500">{formUrl}</p> : <p className="text-[13px] text-gray-500">Set a link name in Edit → Open application form.</p>}
                    {formState && <p className="text-[12.5px] font-semibold text-amber-600 dark:text-amber-300">{formState}</p>}
                </div>
                {formUrl && (
                    <div className="flex gap-2">
                        <Button size="sm" onClick={copyForm}><Copy size={13} /> Copy link</Button>
                        <Button size="sm" as="a" href={formUrl} target="_blank" rel="noopener noreferrer">Open</Button>
                    </div>
                )}
            </Card>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatTile icon={Inbox} tone="blue" label="Applied" value={apps.length} hint={`${counts.applied} new`} active={view === 'applications' && filters.status === 'applied'} onClick={() => { setView('applications'); setFilter({ ...BLANK_FILTERS, status: 'applied' }); }} />
                <StatTile icon={Star} tone="violet" label="Shortlist" value={shortlist.length} hint={`${counts.shortlisted + counts.message_queued} to message`} active={view === 'messages'} onClick={() => setView('messages')} />
                <StatTile icon={Send} tone="green" label="Messaged" value={counts.message_sent + counts.replied + counts.joined + counts.posted + counts.paid} hint={`${counts.joined} joined`} />
                <StatTile icon={UserPlus} tone="teal" label="Posted" value={counts.posted + counts.paid} hint={`${counts.paid} paid`} />
            </div>

            <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
                <SegmentedTabs
                    value={view}
                    onChange={setView}
                    items={[
                        { value: 'applications', label: 'Applications', count: apps.length },
                        { value: 'messages', label: 'Messages', count: counts.shortlisted + counts.message_queued || undefined, highlight: counts.shortlisted + counts.message_queued > 0 },
                        { value: 'setup', label: 'Message setup' },
                        { value: 'activity', label: 'Activity' },
                    ]}
                />
            </div>

            {view === 'applications' && (
                <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-[13px] text-gray-500">{visible.length} of {apps.length} shown</p>
                        <div className="flex flex-wrap gap-2">
                            <Button onClick={() => setPasteOpen(true)} className="h-11"><ClipboardPaste size={14} /> Paste handles</Button>
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
                <MessagesPanel campaign={campaign} applications={apps} settings={data.settings} onStatus={changeStatus} onOpen={(a) => setOpenId(a.id)} onSetup={() => setView('setup')} />
            )}
            {view === 'setup' && (
                <SetupPanel campaign={campaign} settings={data.settings} sampleApplication={shortlist[0] || apps[0]} onSaved={load} />
            )}
            {view === 'activity' && (
                <Card className="p-4"><ActivityList campaignId={campaign.id} nameOf={nameOf} refreshKey={refreshKey} /></Card>
            )}

            <PasteSheet open={pasteOpen} onClose={() => setPasteOpen(false)} applications={apps} onShortlist={addToShortlist} />
            <ApplicationSheet app={openId ? byId.get(openId) : null} campaignId={campaign.id} onClose={() => setOpenId(null)} onStatus={changeStatus} nameOf={nameOf} refreshKey={refreshKey} />
            <ConfirmSheet
                open={Boolean(confirmRemove)}
                onClose={() => setConfirmRemove(null)}
                title={`Remove ${confirmRemove?.length || 0} from the shortlist?`}
                message="They stay in the applications list as Removed, and you can add them back later."
                confirmLabel="Remove"
                tone="danger"
                onConfirm={async () => { await changeStatus(confirmRemove, 'removed'); setConfirmRemove(null); }}
            />
        </div>
    );
};

export default OutreachTab;
