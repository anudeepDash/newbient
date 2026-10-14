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
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right';
import { cn, getCampaignSpotsInfo } from '../../../lib/utils';
import {
    Card, Button, Badge, CampaignStatusBadge, SearchInput, SegmentedTabs, EmptyState, Pagination, Menu, MenuItem,
} from './ui';
import { isOpenCampaign, countPendingSubmissions, toMillis, formatDate } from './creatorUtils';

const PAGE_SIZE = 20;
const FILTERS = ['all', 'open', 'closed', 'review'];

const CampaignList = ({
    campaigns,
    creators,
    loaded,
    onOpen,
    onEdit,
    onCreate,
    onDelete,
    onUpdate,
    onCopyLink,
    isUpdating,
}) => {
    const [searchParams, setSearchParams] = useSearchParams();
    const q = searchParams.get('q') || '';
    const filter = FILTERS.includes(searchParams.get('status')) ? searchParams.get('status') : 'all';
    const page = Math.max(1, Number(searchParams.get('page')) || 1);

    const setParam = (key, value) => {
        const next = new URLSearchParams(searchParams);
        if (!value || value === 'all') next.delete(key); else next.set(key, value);
        if (key !== 'page') next.delete('page');
        setSearchParams(next, { replace: true });
    };

    // One pass over creators instead of scanning them per campaign row.
    const applicantsByCampaign = useMemo(() => {
        const map = new Map();
        (creators || []).forEach(c => {
            (c.joinedCampaigns || []).forEach(id => map.set(id, (map.get(id) || 0) + 1));
        });
        return map;
    }, [creators]);

    const rows = useMemo(() => (campaigns || []).map(c => ({
        campaign: c,
        open: isOpenCampaign(c),
        toReview: countPendingSubmissions(c),
        applicants: applicantsByCampaign.get(c.id) || 0,
    })), [campaigns, applicantsByCampaign]);

    const counts = useMemo(() => ({
        all: rows.length,
        open: rows.filter(r => r.open).length,
        closed: rows.filter(r => !r.open).length,
        review: rows.filter(r => r.toReview > 0).length,
    }), [rows]);

    const filtered = useMemo(() => {
        const term = q.trim().toLowerCase();
        return rows
            .filter(r => {
                if (filter === 'open' && !r.open) return false;
                if (filter === 'closed' && r.open) return false;
                if (filter === 'review' && r.toReview === 0) return false;
                if (!term) return true;
                const c = r.campaign;
                return [c.title, c.brand, c.targetCity, c.targetCollege, c.id].some(v => String(v || '').toLowerCase().includes(term));
            })
            .sort((a, b) => {
                if (filter === 'review' && a.toReview !== b.toReview) return b.toReview - a.toReview;
                if (Boolean(a.campaign.isPinned) !== Boolean(b.campaign.isPinned)) return a.campaign.isPinned ? -1 : 1;
                if (a.open !== b.open) return a.open ? -1 : 1;
                const ts = (c) => toMillis(c.createdAt || c.dateAdded || c.updatedAt);
                return ts(b.campaign) - ts(a.campaign);
            });
    }, [rows, q, filter]);

    const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const currentPage = Math.min(page, pageCount);
    const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    const confirmDelete = (c) => {
        if (window.confirm(`Delete “${c.title}”? Applicants and task submissions for this campaign will be lost. This cannot be undone.`)) {
            onDelete(c.id);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <SegmentedTabs
                    value={filter}
                    onChange={(v) => setParam('status', v)}
                    items={[
                        { value: 'all', label: 'All', count: counts.all },
                        { value: 'open', label: 'Open', count: counts.open },
                        { value: 'closed', label: 'Closed', count: counts.closed },
                        { value: 'review', label: 'Needs review', count: counts.review, highlight: counts.review > 0 },
                    ]}
                    className="max-w-full overflow-x-auto"
                />
                <Button variant="primary" onClick={onCreate}>
                    <Plus size={16} /> New campaign
                </Button>
            </div>

            <Card className="overflow-hidden">
                <div className="border-b border-gray-200 p-3 dark:border-zinc-800">
                    <SearchInput value={q} onChange={(v) => setParam('q', v)} placeholder="Search by title, brand or city" className="max-w-md" />
                </div>

                {!loaded && rows.length === 0 ? (
                    <EmptyState title="Loading campaigns…" />
                ) : filtered.length === 0 ? (
                    <EmptyState
                        icon={rows.length ? Search : Target}
                        title={rows.length ? 'No campaigns match' : 'No campaigns yet'}
                        description={rows.length ? 'Try another search or filter.' : 'Create a campaign to start collecting creator applications.'}
                        action={rows.length
                            ? <Button onClick={() => setSearchParams({}, { replace: true })}>Clear filters</Button>
                            : <Button variant="primary" onClick={onCreate}><Plus size={16} /> New campaign</Button>}
                    />
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="hidden border-b border-gray-200 text-xs text-gray-500 dark:border-zinc-800 dark:text-zinc-400 md:table-header-group">
                                    <tr>
                                        <th className="py-2.5 pl-4 pr-2 font-medium">Campaign</th>
                                        <th className="px-2 py-2.5 font-medium">City</th>
                                        <th className="px-2 py-2.5 text-right font-medium">Applicants</th>
                                        <th className="hidden px-2 py-2.5 text-right font-medium lg:table-cell">Tasks</th>
                                        <th className="px-2 py-2.5 text-right font-medium">To review</th>
                                        <th className="px-2 py-2.5 font-medium">Status</th>
                                        <th className="hidden px-2 py-2.5 font-medium lg:table-cell">Created</th>
                                        <th className="w-24 py-2.5 pr-4" />
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                                    {pageRows.map(({ campaign: c, open, toReview, applicants }) => {
                                        const spots = getCampaignSpotsInfo(c, creators);
                                        return (
                                            <tr key={c.id} onClick={() => onOpen(c)} className="group cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-800/50">
                                                <td className="py-3 pl-4 pr-2">
                                                    <div className="flex min-w-0 items-center gap-3">
                                                        <div className="h-10 w-14 shrink-0 overflow-hidden rounded-md bg-gray-100 dark:bg-zinc-800">
                                                            {c.thumbnail && <img src={c.thumbnail} alt="" className="h-full w-full object-cover" loading="lazy" />}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="flex items-center gap-1.5 truncate font-medium text-gray-900 dark:text-white">
                                                                {c.isPinned && <Pin size={12} className="shrink-0 text-gray-400" aria-label="Pinned" />}
                                                                <span className="truncate">{c.title || 'Untitled campaign'}</span>
                                                            </p>
                                                            <p className="truncate text-xs text-gray-500 dark:text-zinc-400">
                                                                {[c.brand, c.reward].filter(Boolean).join(' · ') || '—'}
                                                            </p>
                                                            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-gray-500 dark:text-zinc-400 md:hidden">
                                                                <span>{c.targetCity || 'Any city'}</span>
                                                                <span>· {applicants} applied</span>
                                                                {toReview > 0 && <Badge tone="amber">{toReview} to review</Badge>}
                                                                <CampaignStatusBadge status={c.status} />
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="hidden px-2 py-3 text-gray-700 dark:text-zinc-300 md:table-cell">
                                                    {c.targetCity || 'Any'}
                                                    {c.targetCollege && c.targetCollege !== 'Any' && (
                                                        <span className="block truncate text-xs text-gray-500 dark:text-zinc-400">{c.targetCollege}</span>
                                                    )}
                                                </td>
                                                <td className="hidden px-2 py-3 text-right tabular-nums md:table-cell">
                                                    {applicants}
                                                    {spots.hasSpots && (
                                                        <span className={cn('block text-xs', spots.isFull ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-zinc-400')}>
                                                            {spots.isFull ? 'Full' : `${spots.spotsLeft} spots left`}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="hidden px-2 py-3 text-right tabular-nums text-gray-700 dark:text-zinc-300 lg:table-cell">{c.tasks?.length || 0}</td>
                                                <td className="hidden px-2 py-3 text-right md:table-cell">
                                                    {toReview > 0 ? <Badge tone="amber">{toReview}</Badge> : <span className="text-gray-400">0</span>}
                                                </td>
                                                <td className="hidden px-2 py-3 md:table-cell"><CampaignStatusBadge status={c.status} /></td>
                                                <td className="hidden whitespace-nowrap px-2 py-3 text-gray-500 dark:text-zinc-400 lg:table-cell">{formatDate(c.createdAt || c.dateAdded) || '—'}</td>
                                                <td className="py-3 pr-4" onClick={(e) => e.stopPropagation()}>
                                                    <div className="flex items-center justify-end gap-1">
                                                        <Menu
                                                            trigger={({ toggle }) => (
                                                                <Button size="sm" variant="ghost" onClick={toggle} aria-label={`Actions for ${c.title}`}>
                                                                    <MoreHorizontal size={16} />
                                                                </Button>
                                                            )}
                                                        >
                                                            <MenuItem icon={ChevronRight} onClick={() => onOpen(c)}>Manage applicants & tasks</MenuItem>
                                                            <MenuItem icon={Pencil} onClick={() => onEdit(c)}>Edit campaign</MenuItem>
                                                            <MenuItem icon={Link2} onClick={() => onCopyLink(c.id)}>Copy public link</MenuItem>
                                                            <MenuItem as={Link} to={`/campaign/${encodeURIComponent(c.id)}`} target="_blank" rel="noopener noreferrer" icon={ExternalLink}>Open public page</MenuItem>
                                                            <MenuItem icon={Pin} disabled={isUpdating} onClick={() => onUpdate(c.id, { isPinned: !c.isPinned })}>
                                                                {c.isPinned ? 'Unpin' : 'Pin to top'}
                                                            </MenuItem>
                                                            <MenuItem icon={open ? Lock : Unlock} disabled={isUpdating} onClick={() => onUpdate(c.id, { status: open ? 'Closed' : 'Open' })}>
                                                                {open ? 'Close applications' : 'Reopen applications'}
                                                            </MenuItem>
                                                            <div className="my-1 border-t border-gray-100 dark:border-zinc-800" />
                                                            <MenuItem icon={Trash2} danger disabled={isUpdating} onClick={() => confirmDelete(c)}>Delete campaign</MenuItem>
                                                        </Menu>
                                                        <ChevronRight size={16} className="hidden text-gray-300 group-hover:text-gray-500 dark:text-zinc-600 sm:block" />
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        <Pagination
                            page={currentPage}
                            pageCount={pageCount}
                            total={filtered.length}
                            pageSize={PAGE_SIZE}
                            onChange={(p) => setParam('page', p > 1 ? String(p) : '')}
                        />
                    </>
                )}
            </Card>
        </div>
    );
};

export default CampaignList;
