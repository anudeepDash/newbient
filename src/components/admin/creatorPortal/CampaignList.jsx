import React, { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Plus from 'lucide-react/dist/esm/icons/plus';
import Target from 'lucide-react/dist/esm/icons/target';
import Search from 'lucide-react/dist/esm/icons/search';
import MoreHorizontal from 'lucide-react/dist/esm/icons/more-horizontal';
import Pencil from 'lucide-react/dist/esm/icons/pencil';
import Link2 from 'lucide-react/dist/esm/icons/link-2';
import ExternalLink from 'lucide-react/dist/esm/icons/external-link';
import Lock from 'lucide-react/dist/esm/icons/lock';
import Unlock from 'lucide-react/dist/esm/icons/unlock';
import Pin from 'lucide-react/dist/esm/icons/pin';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import Copy from 'lucide-react/dist/esm/icons/copy';
import Users from 'lucide-react/dist/esm/icons/users';
import UserCheck from 'lucide-react/dist/esm/icons/user-check';
import Inbox from 'lucide-react/dist/esm/icons/inbox';
import Wallet from 'lucide-react/dist/esm/icons/wallet';
import Zap from 'lucide-react/dist/esm/icons/zap';
import MapPin from 'lucide-react/dist/esm/icons/map-pin';
import Gift from 'lucide-react/dist/esm/icons/gift';
import Send from 'lucide-react/dist/esm/icons/send';
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right';
import { cn, getCampaignSpotsInfo } from '../../../lib/utils';
import {
    Card, Button, Badge, SearchInput, SegmentedTabs, EmptyState, Pagination, Menu, MenuItem, StatTile, Select, ViewToggle, useViewMode,
} from '../ui';
import ExportMenu from '../ExportMenu';
import { exportSubtitle, fileDate } from '../../../lib/xlsx';
import { buildCampaignUrl } from '../../../lib/campaignLinks';
import { CampaignThumb, CampaignStatusPill, BrandMark } from '../campaigns/parts';
import { campaignStatus, indexApplicants, summarize, inr, formatDay, CAMPAIGN_STATUS } from '../campaigns/campaignModel';

const PAGE_SIZE = 24;
// 'review' and 'open' are linked to from the creator portal summary tiles.
const FILTERS = ['all', 'open', 'review', 'decide', 'draft', 'closed'];
const SORTS = [
    { value: 'attention', label: 'Needs attention first' },
    { value: 'newest', label: 'Newest first' },
    { value: 'applicants', label: 'Most applicants' },
    { value: 'title', label: 'Title A–Z' },
];

const CampaignList = ({
    campaigns,
    creators,
    loaded,
    onOpen,
    onEdit,
    onCreate,
    onDuplicate,
    onDelete,
    onSetStatus,
    onTogglePin,
    onCopyLink,
    busyId,
}) => {
    const [searchParams, setSearchParams] = useSearchParams();
    const q = searchParams.get('q') || '';
    const filter = FILTERS.includes(searchParams.get('status')) ? searchParams.get('status') : 'all';
    const sort = SORTS.some(s => s.value === searchParams.get('sort')) ? searchParams.get('sort') : 'attention';
    const page = Math.max(1, Number(searchParams.get('page')) || 1);
    const [view, setView] = useViewMode('campaigns', 'cards');

    const setParam = (key, value) => {
        const next = new URLSearchParams(searchParams);
        if (!value || value === 'all' || (key === 'sort' && value === 'attention')) next.delete(key); else next.set(key, value);
        if (key !== 'page') next.delete('page');
        setSearchParams(next, { replace: true });
    };

    const byCampaign = useMemo(() => indexApplicants(creators, campaigns), [creators, campaigns]);

    const rows = useMemo(() => (campaigns || []).map(c => ({
        campaign: c,
        status: campaignStatus(c),
        stats: summarize(c, byCampaign.get(c.id) || []),
        spots: getCampaignSpotsInfo(c, creators),
    })), [campaigns, byCampaign, creators]);

    const counts = useMemo(() => ({
        all: rows.length,
        open: rows.filter(r => r.status === 'open').length,
        review: rows.filter(r => r.stats.toReview > 0).length,
        decide: rows.filter(r => r.status === 'open' && r.stats.undecided > 0).length,
        draft: rows.filter(r => r.status === 'draft').length,
        closed: rows.filter(r => r.status === 'closed' || r.status === 'live').length,
    }), [rows]);

    const kpis = useMemo(() => rows.reduce((acc, r) => {
        if (r.status === 'open') acc.undecided += r.stats.undecided;
        acc.selected += r.stats.selected;
        acc.toReview += r.stats.toReview;
        acc.paidOut += r.stats.paidOut;
        acc.committed += r.stats.committed;
        return acc;
    }, { undecided: 0, selected: 0, toReview: 0, paidOut: 0, committed: 0 }), [rows]);

    const filtered = useMemo(() => {
        const term = q.trim().toLowerCase();
        const attention = (r) => (r.stats.toReview > 0 ? 2 : 0) + (r.status === 'open' && r.stats.undecided > 0 ? 1 : 0);
        return rows
            .filter(r => {
                if (filter === 'open' && r.status !== 'open') return false;
                if (filter === 'draft' && r.status !== 'draft') return false;
                if (filter === 'closed' && r.status !== 'closed' && r.status !== 'live') return false;
                if (filter === 'review' && r.stats.toReview === 0) return false;
                if (filter === 'decide' && !(r.status === 'open' && r.stats.undecided > 0)) return false;
                if (!term) return true;
                const c = r.campaign;
                return [c.title, c.brand, c.targetCity, c.targetCollege, c.reward, c.id].some(v => String(v || '').toLowerCase().includes(term));
            })
            .sort((a, b) => {
                if (sort === 'title') return String(a.campaign.title || '').localeCompare(String(b.campaign.title || ''));
                if (sort === 'applicants' && a.stats.applicants !== b.stats.applicants) return b.stats.applicants - a.stats.applicants;
                if (sort === 'attention') {
                    if (Boolean(a.campaign.isPinned) !== Boolean(b.campaign.isPinned)) return a.campaign.isPinned ? -1 : 1;
                    if ((a.status === 'open') !== (b.status === 'open')) return a.status === 'open' ? -1 : 1;
                    if (attention(a) !== attention(b)) return attention(b) - attention(a);
                }
                return b.stats.created - a.stats.created;
            });
    }, [rows, q, filter, sort]);

    const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const currentPage = Math.min(page, pageCount);
    const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    const exportSpec = () => ({
        filename: `campaigns_${filter}_${fileDate()}`,
        sheetName: 'Campaigns',
        title: 'Creator campaigns',
        subtitle: exportSubtitle(filtered.length, 'campaign', filter !== 'all' ? filter : null),
        rows: filtered,
        totals: { applicants: true, selected: true, review: true, paid: true },
        columns: [
            { header: 'Campaign', width: 34, value: r => r.campaign.title || 'Untitled campaign' },
            { header: 'Brand', value: r => r.campaign.brand || '' },
            { header: 'Status', value: r => CAMPAIGN_STATUS[r.status].label },
            { header: 'City', value: r => r.campaign.targetCity || 'Any' },
            { header: 'College', value: r => (r.campaign.targetCollege && r.campaign.targetCollege !== 'Any') ? r.campaign.targetCollege : '' },
            { header: 'Reward', width: 26, value: r => r.campaign.reward || '' },
            { header: 'Payout per creator', type: 'money', value: r => Number(r.campaign.payoutPerCreator) || null },
            { header: 'Min followers', type: 'number', value: r => Number(r.campaign.minInstagramFollowers) || 0 },
            { header: 'Applicants', key: 'applicants', type: 'number', value: r => r.stats.applicants },
            { header: 'Undecided', type: 'number', value: r => r.stats.undecided },
            { header: 'Selected', key: 'selected', type: 'number', value: r => r.stats.selected },
            { header: 'Submissions to review', key: 'review', type: 'number', value: r => r.stats.toReview },
            { header: 'Paid out', key: 'paid', type: 'money', value: r => r.stats.paidOut },
            { header: 'Deliverables', type: 'number', value: r => (r.campaign.tasks || []).length },
            { header: 'Total spots', type: 'number', value: r => r.spots.totalSpots ?? null },
            { header: 'Spots left', type: 'number', value: r => (r.spots.hasSpots ? r.spots.spotsLeft : null) },
            { header: 'Created', type: 'date', value: r => r.campaign.createdAt || r.campaign.dateAdded || null },
            { header: 'Public link', width: 40, value: r => buildCampaignUrl(r.campaign.id) },
        ],
    });

    const actionsMenu = (c, status) => (
        <Menu trigger={({ toggle }) => (
            <Button size="sm" variant="ghost" onClick={toggle} aria-label={`More actions for ${c.title || 'campaign'}`} className="h-10 w-10 px-0">
                <MoreHorizontal size={16} />
            </Button>
        )}>
            <MenuItem icon={Users} onClick={() => onOpen(c)}>Manage applicants</MenuItem>
            <MenuItem icon={Pencil} onClick={() => onEdit(c)}>Edit campaign</MenuItem>
            <MenuItem icon={Copy} onClick={() => onDuplicate(c)} hint="Opens a copy as a draft">Duplicate</MenuItem>
            <MenuItem icon={Link2} onClick={() => onCopyLink(c.id)}>Copy public link</MenuItem>
            <MenuItem as={Link} to={`/campaign/${encodeURIComponent(c.id)}`} target="_blank" rel="noopener noreferrer" icon={ExternalLink}>Open public page</MenuItem>
            <MenuItem icon={Pin} disabled={busyId === c.id} onClick={() => onTogglePin(c)}>{c.isPinned ? 'Unpin' : 'Pin to top'}</MenuItem>
            {status === 'draft' && <MenuItem icon={Send} disabled={busyId === c.id} onClick={() => onSetStatus(c, 'Open')} hint="Make it live for creators">Publish</MenuItem>}
            {status === 'open' && <MenuItem icon={Lock} disabled={busyId === c.id} onClick={() => onSetStatus(c, 'Closed')}>Close applications</MenuItem>}
            {status === 'closed' && <MenuItem icon={Unlock} disabled={busyId === c.id} onClick={() => onSetStatus(c, 'Open')}>Reopen applications</MenuItem>}
            <div className="my-1 border-t border-black/[0.05] dark:border-white/[0.08]" />
            <MenuItem icon={Trash2} danger disabled={busyId === c.id} onClick={() => onDelete(c)}>Delete campaign</MenuItem>
        </Menu>
    );

    const statLine = (stats) => (
        <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone="blue"><Users size={10} /> {stats.applicants} applied</Badge>
            {stats.selected > 0 && <Badge tone="pink"><UserCheck size={10} /> {stats.selected} selected</Badge>}
            {stats.toReview > 0 && <Badge tone="amber"><Inbox size={10} /> {stats.toReview} to review</Badge>}
            {stats.paidOut > 0 && <Badge tone="teal"><Wallet size={10} /> {inr(stats.paidOut)}</Badge>}
        </div>
    );

    const spotsBar = (spots, stats) => {
        if (!spots.hasSpots || !spots.totalSpots) return null;
        const used = Math.min(100, ((spots.totalSpots - spots.spotsLeft) / spots.totalSpots) * 100);
        return (
            <div>
                <div className="h-1.5 overflow-hidden rounded-full bg-black/5 dark:bg-white/[0.06]">
                    <div className={cn('h-full rounded-full', spots.isFull ? 'bg-rose-500' : 'bg-pink-500 dark:bg-neon-pink')} style={{ width: `${used}%` }} />
                </div>
                <p className="mt-1 text-[11px] text-gray-500">{spots.isFull ? 'All spots taken' : `${spots.spotsLeft} of ${spots.totalSpots} spots left`} · {stats.selected} selected</p>
            </div>
        );
    };

    return (
        <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatTile icon={Zap} tone="pink" label="Open campaigns" value={counts.open} hint={`${counts.all} in total${counts.draft ? ` · ${counts.draft} draft${counts.draft === 1 ? '' : 's'}` : ''}`} active={filter === 'open'} onClick={() => setParam('status', filter === 'open' ? null : 'open')} />
                <StatTile icon={Users} tone={kpis.undecided ? 'blue' : 'gray'} label="Applications to decide" value={kpis.undecided} hint={kpis.undecided ? `In ${counts.decide} open campaign${counts.decide === 1 ? '' : 's'}` : 'Nobody waiting'} active={filter === 'decide'} onClick={() => setParam('status', filter === 'decide' ? null : 'decide')} />
                <StatTile icon={UserCheck} tone="violet" label="Creators selected" value={kpis.selected} hint={kpis.toReview ? `${kpis.toReview} submission${kpis.toReview === 1 ? '' : 's'} to review` : 'No submissions waiting'} active={filter === 'review'} onClick={() => setParam('status', filter === 'review' ? null : 'review')} />
                <StatTile icon={Wallet} tone="teal" label="Paid to creators" value={inr(kpis.paidOut)} hint={kpis.committed ? `${inr(kpis.committed)} committed at set payouts` : 'Set a payout per creator to track spend'} />
            </div>

            <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
                <SearchInput value={q} onChange={(v) => setParam('q', v)} placeholder="Title, brand or city" className="xl:w-80 xl:shrink-0" />
                <div className="flex flex-1 items-center gap-2">
                    <Select value={sort} onChange={(v) => setParam('sort', v)} label="Sort" options={SORTS} className="min-w-0 flex-1 xl:w-56 xl:flex-none" />
                    <ExportMenu getSpec={exportSpec} />
                    <ViewToggle value={view} onChange={setView} />
                    <Button variant="primary" onClick={onCreate} className="hidden h-11 xl:ml-auto xl:inline-flex"><Plus size={15} /> New campaign</Button>
                </div>
            </div>

            <div className="flex items-center gap-2">
                <div className="-mx-4 min-w-0 flex-1 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
                    <SegmentedTabs
                        value={filter}
                        onChange={(v) => setParam('status', v)}
                        items={[
                            { value: 'all', label: 'All', count: counts.all },
                            { value: 'open', label: 'Open', count: counts.open },
                            { value: 'review', label: 'To review', count: counts.review, highlight: counts.review > 0 },
                            { value: 'decide', label: 'To decide', count: counts.decide },
                            ...(counts.draft || filter === 'draft' ? [{ value: 'draft', label: 'Drafts', count: counts.draft }] : []),
                            { value: 'closed', label: 'Closed', count: counts.closed },
                        ]}
                    />
                </div>
                <Button variant="primary" onClick={onCreate} className="h-11 xl:hidden" aria-label="New campaign"><Plus size={16} /><span className="hidden sm:inline">New campaign</span></Button>
            </div>

            {!loaded && rows.length === 0 ? (
                <Card className="rounded-2xl"><EmptyState icon={Target} title="Loading campaigns…" /></Card>
            ) : filtered.length === 0 ? (
                <Card className="rounded-2xl">
                    <EmptyState
                        icon={rows.length ? Search : Target}
                        title={rows.length ? 'No campaigns match' : 'No campaigns yet'}
                        description={rows.length ? 'Try another search or filter.' : 'Create a campaign with a brief and deliverables, then pick creators from the applications.'}
                        action={rows.length
                            ? <Button onClick={() => setSearchParams({}, { replace: true })}>Clear filters</Button>
                            : <Button variant="primary" onClick={onCreate}><Plus size={16} /> New campaign</Button>}
                    />
                </Card>
            ) : view === 'cards' ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {pageRows.map(({ campaign: c, status, stats, spots }) => (
                        <Card key={c.id} className="relative flex flex-col overflow-hidden rounded-2xl transition-colors hover:border-black/15 dark:hover:border-white/15">
                            <button type="button" onClick={() => onOpen(c)} className="relative block w-full text-left" aria-label={`Manage ${c.title || 'campaign'}`}>
                                <CampaignThumb campaign={c} className="aspect-video w-full" iconSize={28} />
                                <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
                                    <CampaignStatusPill campaign={c} />
                                    {c.isPinned && <Badge tone="blue"><Pin size={10} /> Pinned</Badge>}
                                    {c.websiteApplyEnabled === false && status === 'open' && <Badge tone="gray">Apply link off</Badge>}
                                </div>
                            </button>
                            <div className="flex flex-1 flex-col gap-3 p-4">
                                <div className="min-w-0">
                                    <BrandMark campaign={c} />
                                    <button type="button" onClick={() => onOpen(c)} className="-my-1 block w-full py-2 text-left">
                                        <p className="line-clamp-2 text-[16px] font-extrabold leading-snug">{c.title || 'Untitled campaign'}</p>
                                    </button>
                                    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px] text-gray-500">
                                        <span className="inline-flex items-center gap-1"><MapPin size={12} /> {c.targetCity || 'Any city'}</span>
                                        {c.reward && <span className="inline-flex min-w-0 items-center gap-1"><Gift size={12} className="shrink-0" /><span className="truncate">{c.reward}</span></span>}
                                    </p>
                                </div>
                                {statLine(stats)}
                                {spotsBar(spots, stats)}
                                <div className="mt-auto flex items-center gap-2 border-t border-black/[0.06] pt-3 dark:border-white/[0.06]">
                                    <Button size="sm" variant="accent" onClick={() => onOpen(c)} className="h-10 flex-1">
                                        {stats.toReview ? `Review ${stats.toReview}` : stats.undecided && status === 'open' ? `Decide on ${stats.undecided}` : 'Manage'}
                                    </Button>
                                    <Button size="sm" variant="secondary" onClick={() => onEdit(c)} className="h-10"><Pencil size={13} /> Edit</Button>
                                    {actionsMenu(c, status)}
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            ) : (
                <Card className="overflow-hidden rounded-2xl">
                    <div className="hidden grid-cols-[minmax(0,2.4fr)_minmax(0,1fr)_minmax(0,1.6fr)_auto] gap-4 border-b border-black/[0.06] px-5 py-2.5 text-[12px] font-bold text-gray-500 dark:border-white/[0.06] lg:grid">
                        <span>Campaign</span><span>Where</span><span>Applicants</span><span className="w-[148px]" />
                    </div>
                    <ul className="divide-y divide-black/[0.05] dark:divide-white/[0.05]">
                        {pageRows.map(({ campaign: c, status, stats }) => (
                            <li key={c.id} className="relative transition-colors hover:bg-black/[0.015] dark:hover:bg-white/[0.02]">
                                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-4 py-3 sm:px-5 lg:grid-cols-[minmax(0,2.4fr)_minmax(0,1fr)_minmax(0,1.6fr)_auto] lg:gap-4">
                                    <button type="button" onClick={() => onOpen(c)} className="flex min-w-0 items-center gap-3 text-left">
                                        <CampaignThumb campaign={c} className="aspect-video h-12 shrink-0 rounded-lg" iconSize={18} />
                                        <span className="min-w-0">
                                            <span className="flex items-center gap-2">
                                                {c.isPinned && <Pin size={12} className="shrink-0 text-sky-500" aria-label="Pinned" />}
                                                <span className="truncate text-[15px] font-bold">{c.title || 'Untitled campaign'}</span>
                                            </span>
                                            <span className="mt-0.5 flex items-center gap-2">
                                                <CampaignStatusPill campaign={c} />
                                                <span className="truncate text-[12px] text-gray-500">{[c.brand, c.reward].filter(Boolean).join(' · ') || formatDay(c.createdAt || c.dateAdded, true)}</span>
                                            </span>
                                        </span>
                                    </button>
                                    <div className="flex items-center justify-end gap-1 lg:hidden">
                                        {actionsMenu(c, status)}
                                    </div>
                                    <p className="hidden min-w-0 truncate text-[13px] text-gray-600 dark:text-zinc-300 lg:block">
                                        {c.targetCity || 'Any city'}
                                        {c.targetCollege && c.targetCollege !== 'Any' && <span className="block truncate text-[12px] text-gray-500">{c.targetCollege}</span>}
                                    </p>
                                    <div className="col-span-2 lg:col-span-1">{statLine(stats)}</div>
                                    <div className="hidden w-[148px] items-center justify-end gap-1 lg:flex">
                                        <Button size="sm" variant="secondary" onClick={() => onEdit(c)} aria-label="Edit campaign" className="h-10 w-10 px-0"><Pencil size={14} /></Button>
                                        {actionsMenu(c, status)}
                                        <Button size="sm" variant="ghost" onClick={() => onOpen(c)} aria-label="Manage" className="h-10 w-10 px-0"><ChevronRight size={16} /></Button>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                </Card>
            )}

            <Pagination
                page={currentPage}
                pageCount={pageCount}
                total={filtered.length}
                pageSize={PAGE_SIZE}
                onChange={(p) => setParam('page', p > 1 ? String(p) : '')}
            />
        </div>
    );
};

export default CampaignList;
