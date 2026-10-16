import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams, useLocation, useSearchParams, Link } from 'react-router-dom';
import { useStore } from '../../lib/store';
import { useStoreSubscription } from '../../hooks/useStoreSubscription';
import { PREDEFINED_CITIES, CREATOR_NICHES, nicheKey, creatorHasCollegeNiche } from '../../lib/constants';
import { buildSocialUrl } from '../../lib/socialUtils';
import { cn } from '../../lib/utils';
import { copyToClipboard } from '../../lib/clipboard';
import { safeLocalStorage } from '../../lib/storage';
import { getEarnedBadges } from '../../lib/badges';
import MultiSelectFilter from '../../components/admin/filters/MultiSelectFilter';
import RangeFilter from '../../components/admin/filters/RangeFilter';
import { downloadXlsx, exportSubtitle, fileDate } from '../../lib/xlsx';
import Users from 'lucide-react/dist/esm/icons/users';
import Search from 'lucide-react/dist/esm/icons/search';
import MapPin from 'lucide-react/dist/esm/icons/map-pin';
import Mail from 'lucide-react/dist/esm/icons/mail';
import Plus from 'lucide-react/dist/esm/icons/plus';
import Upload from 'lucide-react/dist/esm/icons/upload';
import Send from 'lucide-react/dist/esm/icons/send';
import MoreHorizontal from 'lucide-react/dist/esm/icons/more-horizontal';
import Check from 'lucide-react/dist/esm/icons/check';
import X from 'lucide-react/dist/esm/icons/x';
import Clock from 'lucide-react/dist/esm/icons/clock';
import Ban from 'lucide-react/dist/esm/icons/ban';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle';
import ShieldCheck from 'lucide-react/dist/esm/icons/shield-check';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import GraduationCap from 'lucide-react/dist/esm/icons/graduation-cap';
import FileSpreadsheet from 'lucide-react/dist/esm/icons/file-spreadsheet';
import MessageCircle from 'lucide-react/dist/esm/icons/message-circle';
import Megaphone from 'lucide-react/dist/esm/icons/megaphone';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import SlidersHorizontal from 'lucide-react/dist/esm/icons/sliders-horizontal';
import BroadcastGroupsModal from '../../components/admin/BroadcastGroupsModal';
import AddCityCreatorsModal from '../../components/admin/AddCityCreatorsModal';
import AddCreatorModal from '../../components/admin/AddCreatorModal';
import CreatorDetailModal from '../../components/admin/CreatorDetailModal';
import ExportMenu from '../../components/admin/ExportMenu';
import {
    Card, Button, SearchInput, Select, SegmentedTabs, EmptyState, Pagination, Menu, MenuItem, StatTile,
    useViewMode, ViewToggle,
} from '../../components/admin/ui';
import { useAccent } from '../../components/admin/theme';
import {
    creatorKey, isPendingCreator, isManualFollowerEntry, isBangaloreVariant, creatorReach,
} from '../../components/admin/creatorPortal/creatorUtils';
import { SEARCH_FIELDS, matchesCreatorSearch, creatorNiches, creatorJoinedAt } from '../../components/admin/creators/creatorData';
import { CreatorCard, CreatorRow, CreatorListHeader } from '../../components/admin/creators/CreatorListItems';
import ConfirmSheet from '../../components/admin/creators/ConfirmSheet';
import BulkEmailModal from '../../components/admin/creators/BulkEmailModal';
import ImportCreatorsSheet from '../../components/admin/creators/ImportCreatorsSheet';
import CreatorLeaderboard from '../../components/admin/creators/CreatorLeaderboard';

/*
 * Creators: the roster with KPI tiles, filters (all in the URL so views can be
 * shared), card/list views, bulk actions, CSV import and the referral
 * leaderboard (/admin/creators/leaderboard). /admin/creators/:id opens a
 * creator's profile over the list.
 */

const STATUS_TABS = ['all', 'pending', 'approved', 'rejected', 'blocked'];
const PAGE_SIZES = { list: 25, cards: 24 };
const SORTS = [
    { value: 'newest', label: 'Newest first' },
    { value: 'oldest', label: 'Oldest first' },
    { value: 'followers', label: 'Most followers' },
    { value: 'name', label: 'Name A–Z' },
];
const JOINED = [
    { value: '', label: 'Any time' },
    { value: '7', label: 'Joined in 7 days' },
    { value: '30', label: 'Joined in 30 days' },
];
const STATUS_WORDS = {
    approved: { verb: 'Verify', done: 'Verified', tone: 'success' },
    rejected: { verb: 'Reject', done: 'Rejected', tone: 'danger' },
    blocked: { verb: 'Block', done: 'Blocked', tone: 'danger' },
    pending: { verb: 'Move to pending', done: 'Moved to pending', tone: 'accent' },
};
const BULK_CONCURRENCY = 4;
const EMPTY = [];

// The old screen saved 'grid' / 'table' under this key; carry the choice over.
const legacyView = () => {
    try { return safeLocalStorage.getItem('admin.creators.view') === 'grid' ? 'cards' : 'list'; } catch { return 'list'; }
};

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

const exportSpecFor = (rows, label) => ({
    filename: `newbi-creators-${label}-${fileDate()}`,
    sheetName: 'Creators',
    title: 'Newbi creators',
    subtitle: exportSubtitle(rows.length, 'creator', label.replace(/-/g, ' ')),
    rows,
    totals: { igf: true, lif: true, yts: true },
    columns: [
        { header: 'Name', value: c => c.name || '' },
        { header: 'Email', value: c => c.email || '' },
        { header: 'Phone', value: c => c.phone || '' },
        { header: 'Phone verified', value: c => (c.isPhoneVerified ? 'Yes' : 'No') },
        { header: 'City', value: c => c.city || '' },
        { header: 'College', value: c => c.collegeName || '' },
        { header: 'Instagram', value: c => (c.instagram ? buildSocialUrl(c.instagram, 'instagram') : '') },
        { header: 'Instagram followers', key: 'igf', type: 'number', value: c => Number(c.instagramFollowers) || 0 },
        { header: 'LinkedIn', value: c => (c.linkedin ? buildSocialUrl(c.linkedin, 'linkedin') : '') },
        { header: 'LinkedIn followers', key: 'lif', type: 'number', value: c => Number(c.linkedinFollowers) || 0 },
        { header: 'YouTube', value: c => (c.youtube ? buildSocialUrl(c.youtube, 'youtube') : '') },
        { header: 'YouTube subscribers', key: 'yts', type: 'number', value: c => Number(c.youtubeSubscribers) || 0 },
        { header: 'Niches', value: c => creatorNiches(c).join(', ') || c.categories || '' },
        { header: 'Status', value: c => c.profileStatus || 'pending' },
        { header: 'Creator ID', value: c => c.creatorId || '' },
        { header: 'Referred by', value: c => c.referredBy || '' },
        { header: 'Joined', type: 'date', value: c => { const ms = creatorJoinedAt(c); return ms ? new Date(ms) : null; } },
    ],
});

const CreatorManager = ({ showLeaderboardOnly = false }) => {
    useStoreSubscription(['creators', 'campaigns']);
    const creators = useStore(state => state.creators) || EMPTY;
    const creatorsLoaded = useStore(state => Boolean(state.subscriptionsLoaded?.creators));
    const campaigns = useStore(state => state.campaigns) || EMPTY;
    const navigate = useNavigate();
    const location = useLocation();
    const params = useParams();
    const [searchParams, setSearchParams] = useSearchParams();
    const a = useAccent();
    const isLeaderboardRoute = location.pathname.includes('/leaderboard') || showLeaderboardOnly;

    // Filters live in the URL so views can be bookmarked, shared and survive the
    // detail panel opening and closing.
    const q = searchParams.get('q') || '';
    const field = searchParams.get('field') || 'all';
    const status = STATUS_TABS.includes(searchParams.get('status')) ? searchParams.get('status') : 'all';
    // ?city= takes one city or several, comma-separated (old single-city links still work).
    const cityParam = searchParams.get('city') || '';
    const cities = useMemo(() => (cityParam && cityParam !== 'all' ? cityParam.split(',').map(s => s.trim()).filter(Boolean) : []), [cityParam]);
    const niche = searchParams.get('niche') || 'all';
    const college = searchParams.get('college') || 'all';
    const platform = searchParams.get('platform') || 'all';
    // Follower range: ?min= and ?max= (either can be left open).
    const minFollowers = Number(searchParams.get('min')) || null;
    const maxFollowers = Number(searchParams.get('max')) || null;
    const joined = ['7', '30'].includes(searchParams.get('joined')) ? searchParams.get('joined') : '';
    const manualOnly = searchParams.get('manual') === '1';
    const sort = searchParams.get('sort') || 'newest';

    // ?view= (cards/list, or the old grid/table) wins so shared links open the same way.
    const [savedView, setSavedView] = useViewMode('creators', legacyView());
    const urlView = { grid: 'cards', cards: 'cards', table: 'list', list: 'list' }[searchParams.get('view')];
    const view = urlView || savedView;
    const PAGE_SIZE = PAGE_SIZES[view] || 25;
    const page = Math.max(1, Number(searchParams.get('page')) || 1);

    const updateParams = (patch, { keepPage = false } = {}) => {
        const next = new URLSearchParams(searchParams);
        Object.entries(patch).forEach(([k, v]) => {
            if (v === '' || v === null || v === undefined || v === 'all' || v === false || (k === 'sort' && v === 'newest')) next.delete(k);
            else next.set(k, String(v));
        });
        if (!keepPage) next.delete('page');
        setSearchParams(next, { replace: true });
    };
    const setView = (next) => {
        setSavedView(next);
        if (urlView) updateParams({ view: '' });
    };

    // The search box is local for snappy typing and synced to the URL shortly after.
    // When the URL changes from elsewhere (clear filters, back button) adopt it.
    const [searchDraft, setSearchDraft] = useState(q);
    const [syncedQ, setSyncedQ] = useState(q);
    if (q !== syncedQ) {
        setSyncedQ(q);
        setSearchDraft(q);
    }
    useEffect(() => {
        if (searchDraft === q) return undefined;
        const t = setTimeout(() => updateParams({ q: searchDraft.trim() ? searchDraft : '' }), 200);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchDraft]);

    const [rawSelected, setSelected] = useState(() => new Set());
    const [busyIds, setBusyIds] = useState(() => new Set());
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [emailRecipients, setEmailRecipients] = useState(null); // { list, fromSelection }
    const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [cityInvite, setCityInvite] = useState(null); // { city, uids }
    const [confirm, setConfirm] = useState(null); // { kind, targets, bulk }
    const [includeNoCollege, setIncludeNoCollege] = useState(false);
    const [bulkProgress, setBulkProgress] = useState(null); // { label, done, total }
    const [filtersOpen, setFiltersOpen] = useState(false); // phones only

    const toast = (msg, type = 'success') => useStore.getState().addToast(msg, type);

    // ── Derived data ────────────────────────────────────────────────────────
    const counts = useMemo(() => {
        const weekAgo = Date.now() - 7 * 86400000;
        const out = { all: creators.length, pending: 0, approved: 0, rejected: 0, blocked: 0, manualPending: 0, week: 0, collegeMissing: 0 };
        creators.forEach(c => {
            if (isPendingCreator(c)) {
                out.pending++;
                if (isManualFollowerEntry(c)) out.manualPending++;
            } else if (out[c.profileStatus] !== undefined) out[c.profileStatus]++;
            if (creatorJoinedAt(c) >= weekAgo) out.week++;
            if (creatorHasCollegeNiche(c) && !String(c.collegeName || '').trim()) out.collegeMissing++;
        });
        return out;
    }, [creators]);

    const cityOptions = useMemo(() => {
        const set = new Set(PREDEFINED_CITIES.filter(c => c !== 'Others'));
        creators.forEach(c => { if (c.city && !isBangaloreVariant(c.city)) set.add(String(c.city).trim()); });
        return [...set].filter(Boolean).sort().map(c => ({ value: c, label: c }));
    }, [creators]);

    // Colleges grouped case-insensitively, most creators first.
    const collegeOptions = useMemo(() => {
        const byKey = new Map();
        creators.forEach(c => {
            const name = String(c.collegeName || '').trim();
            if (!name) return;
            const key = name.toLowerCase();
            const entry = byKey.get(key) || { label: name, count: 0 };
            entry.count++;
            byKey.set(key, entry);
        });
        const list = [...byKey.values()].sort((x, y) => y.count - x.count || x.label.localeCompare(y.label));
        return [
            { value: 'all', label: 'All colleges' },
            ...(counts.collegeMissing ? [{ value: 'missing', label: `College missing (${counts.collegeMissing})` }] : []),
            ...list.map(e => ({ value: e.label, label: `${e.label} (${e.count})` })),
        ];
    }, [creators, counts.collegeMissing]);

    const nicheOptions = useMemo(() => [{ value: 'all', label: 'All niches' }, ...CREATOR_NICHES.map(n => ({ value: n, label: n }))], []);

    const bangaloreCount = useMemo(
        () => creators.filter(c => /bangalore|banglore/i.test(String(c.city || ''))).length,
        [creators]
    );

    // One rule for "does this creator match the filters", with a way to leave
    // one filter out: the city list counts and the follower preview use it so
    // their numbers reflect everything else you've picked.
    const matches = useCallback((c, { skipCity = false, skipFollowers = false, range } = {}) => {
        const joinedSince = joined ? Date.now() - Number(joined) * 86400000 : 0;
        if (!matchesCreatorSearch(c, q, field)) return false;
        if (status === 'pending' && !isPendingCreator(c)) return false;
        if (status !== 'all' && status !== 'pending' && c.profileStatus !== status) return false;
        if (manualOnly && !isManualFollowerEntry(c)) return false;
        if (!skipCity && cities.length && !cities.some(ct => c.city === ct || (ct === 'Bengaluru' && isBangaloreVariant(c.city)))) return false;
        if (niche !== 'all') {
            const target = nicheKey(niche);
            if (![...creatorNiches(c), c.categories, c.category, c.niche].some(n => nicheKey(n) === target)) return false;
        }
        if (college === 'missing') {
            if (!creatorHasCollegeNiche(c) || String(c.collegeName || '').trim()) return false;
        } else if (college !== 'all' && String(c.collegeName || '').trim().toLowerCase() !== college.toLowerCase()) return false;
        if (platform !== 'all' && !String(c[platform] || '').trim()) return false;
        if (!skipFollowers) {
            const { min, max } = range || { min: minFollowers, max: maxFollowers };
            const reach = creatorReach(c);
            if (min && reach < min) return false;
            if (max && reach > max) return false;
        }
        if (joinedSince && creatorJoinedAt(c) < joinedSince) return false;
        return true;
    }, [q, field, status, manualOnly, cities, niche, college, platform, minFollowers, maxFollowers, joined]);

    const filtered = useMemo(() => {
        const list = creators.filter(c => matches(c));
        const sorters = {
            newest: (x, y) => creatorJoinedAt(y) - creatorJoinedAt(x),
            oldest: (x, y) => creatorJoinedAt(x) - creatorJoinedAt(y),
            followers: (x, y) => creatorReach(y) - creatorReach(x),
            name: (x, y) => String(x.name || '').localeCompare(String(y.name || '')),
        };
        return list.sort(sorters[sort] || sorters.newest);
    }, [creators, matches, sort]);

    // How many creators each city has, given the other filters.
    const cityCounts = useMemo(() => {
        const out = {};
        creators.forEach(c => {
            if (!c.city || !matches(c, { skipCity: true })) return;
            const key = isBangaloreVariant(c.city) ? 'Bengaluru' : String(c.city).trim();
            out[key] = (out[key] || 0) + 1;
        });
        return out;
    }, [creators, matches]);

    // Live count for the follower range while it's being adjusted.
    const followerBase = useMemo(() => creators.filter(c => matches(c, { skipFollowers: true })), [creators, matches]);
    const countForRange = useCallback((min, max) => followerBase.filter(c => {
        const reach = creatorReach(c);
        return (!min || reach >= min) && (!max || reach <= max);
    }).length, [followerBase]);

    const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const currentPage = Math.min(page, pageCount);
    const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    const activeFilters = [q, cities.length > 0, niche !== 'all', college !== 'all', platform !== 'all', minFollowers || maxFollowers, joined, manualOnly].filter(Boolean).length;
    const hasFilters = activeFilters > 0 || status !== 'all';
    const panelFilters = activeFilters - (q ? 1 : 0) - (manualOnly ? 1 : 0);

    // Detail panel follows the URL (/admin/creators/:id) and always shows live data.
    const selectedCreator = useMemo(() => {
        if (!params.id || isLeaderboardRoute) return null;
        const target = String(params.id);
        return creators.find(c =>
            c.id === target || c.uid === target ||
            (c.creatorId && String(c.creatorId).toUpperCase() === target.toUpperCase())
        ) || null;
    }, [params.id, creators, isLeaderboardRoute]);
    const detailNotFound = Boolean(params.id && !isLeaderboardRoute && creatorsLoaded && !selectedCreator);

    const listSearch = location.search;
    const openCreator = (c) => navigate(`/admin/creators/${encodeURIComponent(creatorKey(c))}${listSearch}`);
    const closeCreator = () => navigate(`/admin/creators${listSearch}`);

    // Ignore selections for creators that have since been deleted.
    const selected = useMemo(() => {
        if (rawSelected.size === 0) return rawSelected;
        const keys = new Set(creators.map(creatorKey));
        return new Set([...rawSelected].filter(k => keys.has(k)));
    }, [rawSelected, creators]);
    const selectedCreators = useMemo(() => creators.filter(c => selected.has(creatorKey(c))), [creators, selected]);

    const toggleSelect = (key) => setSelected(prev => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key); else next.add(key);
        return next;
    });
    const pageKeys = pageRows.map(creatorKey);
    const allPageSelected = pageKeys.length > 0 && pageKeys.every(k => selected.has(k));
    const togglePage = () => setSelected(prev => {
        const next = new Set(prev);
        if (allPageSelected) pageKeys.forEach(k => next.delete(k));
        else pageKeys.forEach(k => next.add(k));
        return next;
    });

    // ── Status changes and deletes ──────────────────────────────────────────
    const markBusy = (keys, on) => setBusyIds(prev => {
        const next = new Set(prev);
        keys.forEach(k => (on ? next.add(k) : next.delete(k)));
        return next;
    });

    const applyStatus = async (c, newStatus) => {
        const key = creatorKey(c);
        if (busyIds.has(key)) return;
        markBusy([key], true);
        try {
            await useStore.getState().updateCreator(key, { profileStatus: newStatus });
            toast(`${STATUS_WORDS[newStatus]?.done || 'Updated'}: ${c.name || 'creator'}.`);
        } catch (error) {
            console.error('Error updating creator status:', error);
            toast(error?.message || "Couldn't update the status. Please try again.", 'error');
        } finally {
            markBusy([key], false);
        }
    };

    // From the detail panel, which asks its own questions first.
    const handleUpdateStatus = async (id, newStatus) => {
        const c = creators.find(x => creatorKey(x) === id || x.id === id || x.uid === id) || { id, name: 'Creator' };
        // Campus creators and college pages need a college before they're verified.
        if (newStatus === 'approved' && creatorHasCollegeNiche(c) && !String(c.collegeName || '').trim()) {
            setIncludeNoCollege(false);
            setConfirm({ kind: 'approved', targets: [c], bulk: false });
            return;
        }
        await applyStatus(c, newStatus);
    };
    const handleDeleteCreator = (id) => {
        const c = creators.find(x => creatorKey(x) === id || x.id === id || x.uid === id);
        if (c) setConfirm({ kind: 'delete', targets: [c], bulk: false });
    };

    // One status change from a card, row or menu.
    const requestStatus = (c, newStatus) => {
        const needsCollege = newStatus === 'approved' && creatorHasCollegeNiche(c) && !String(c.collegeName || '').trim();
        if (newStatus === 'approved' && !needsCollege) { applyStatus(c, newStatus); return; }
        if (newStatus === 'pending') { applyStatus(c, newStatus); return; }
        setIncludeNoCollege(false);
        setConfirm({ kind: newStatus, targets: [c], bulk: false });
    };

    const runConfirmed = async () => {
        if (!confirm) return;
        const { kind, bulk } = confirm;
        let targets = confirm.targets;
        if (kind === 'approved' && !includeNoCollege) {
            targets = targets.filter(c => !(creatorHasCollegeNiche(c) && !String(c.collegeName || '').trim()));
        }
        if (kind !== 'delete') targets = targets.filter(c => (c.profileStatus || 'pending') !== kind);
        if (!targets.length) { setConfirm(null); return; }

        if (!bulk && targets.length === 1) {
            const c = targets[0];
            if (kind === 'delete') {
                const key = creatorKey(c);
                markBusy([key], true);
                try {
                    await useStore.getState().deleteCreator(key);
                    if (selectedCreator && creatorKey(selectedCreator) === key) closeCreator();
                    toast(`${c.name || 'Creator'} deleted.`);
                    setConfirm(null);
                } catch (error) {
                    console.error('Error deleting creator:', error);
                    toast(error?.message || "Couldn't delete the creator. Please try again.", 'error');
                } finally {
                    markBusy([key], false);
                }
                return;
            }
            setConfirm(null);
            await applyStatus(c, kind);
            return;
        }

        // Bulk: a few at a time, with progress. Failures stay selected to retry.
        setConfirm(null);
        const keys = targets.map(creatorKey);
        markBusy(keys, true);
        setBulkProgress({ label: kind === 'delete' ? 'Deleting' : kind === 'approved' ? 'Verifying' : kind === 'rejected' ? 'Rejecting' : kind === 'blocked' ? 'Blocking' : 'Moving to pending', done: 0, total: targets.length });
        const failed = [];
        let cursor = 0;
        const { updateCreator, deleteCreator } = useStore.getState();
        const worker = async () => {
            while (cursor < targets.length) {
                const c = targets[cursor++];
                try {
                    if (kind === 'delete') await deleteCreator(creatorKey(c));
                    else await updateCreator(creatorKey(c), { profileStatus: kind });
                } catch (err) {
                    console.error(`Bulk ${kind} failed for ${creatorKey(c)}:`, err);
                    failed.push(c);
                }
                setBulkProgress(p => (p ? { ...p, done: p.done + 1 } : p));
            }
        };
        await Promise.all(Array.from({ length: Math.min(BULK_CONCURRENCY, targets.length) }, worker));
        markBusy(keys, false);
        setBulkProgress(null);
        const ok = targets.length - failed.length;
        const doneWord = kind === 'delete' ? 'Deleted' : STATUS_WORDS[kind].done;
        if (failed.length) {
            const verb = kind === 'delete' ? 'delete' : STATUS_WORDS[kind].verb.toLowerCase();
            toast(ok
                ? `${doneWord} ${ok}. ${plural(failed.length, 'creator')} couldn't be updated and ${failed.length === 1 ? 'is' : 'are'} still selected.`
                : `Couldn't ${verb} ${failed.length === 1 ? 'that creator' : `those ${failed.length} creators`}. They're still selected, so you can try again.`, ok ? 'warning' : 'error');
            setSelected(new Set(failed.map(creatorKey)));
        } else {
            toast(`${doneWord} ${plural(ok, 'creator')}.`);
            setSelected(new Set());
        }
        if (kind === 'delete' && selectedCreator && targets.some(c => creatorKey(c) === creatorKey(selectedCreator)) && !failed.includes(selectedCreator)) closeCreator();
    };

    const requestBulk = (kind) => {
        if (!selectedCreators.length) return;
        if (kind !== 'delete' && selectedCreators.every(c => (c.profileStatus || 'pending') === kind)) {
            toast(`Everyone selected is already ${kind === 'approved' ? 'verified' : kind}.`, 'info');
            return;
        }
        setIncludeNoCollege(false);
        setConfirm({ kind, targets: selectedCreators, bulk: true });
    };

    const onRowAction = async (action, c) => {
        if (action === 'open') openCreator(c);
        else if (STATUS_WORDS[action]) requestStatus(c, action);
        else if (action === 'delete') setConfirm({ kind: 'delete', targets: [c], bulk: false });
        else if (action === 'email') setEmailRecipients({ list: [c], fromSelection: false });
        else if (action === 'copy-phone') {
            const ok = await copyToClipboard(c.phone || '');
            toast(ok ? 'Phone number copied.' : "Couldn't copy.", ok ? 'success' : 'error');
        } else if (action === 'copy-link') {
            const ok = await copyToClipboard(`${window.location.origin}/admin/creators/${encodeURIComponent(creatorKey(c))}`);
            toast(ok ? 'Link copied.' : "Couldn't copy.", ok ? 'success' : 'error');
        }
    };

    const handleMergeBangalore = async () => {
        try {
            const res = await useStore.getState().mergeBangaloreCreatorsToBengaluru();
            const failedCount = (res?.totalFound || 0) - (res?.updatedCount || 0);
            toast(`Moved ${plural(res?.updatedCount || 0, 'creator')} to Bengaluru${failedCount ? `, ${failedCount} failed` : ''}.`, failedCount ? 'warning' : 'success');
            setConfirm(null);
        } catch (err) {
            console.error('Error merging Bangalore creators:', err);
            toast("Couldn't move Bangalore creators to Bengaluru. Please try again.", 'error');
        }
    };

    const exportLabel = [status !== 'all' ? status : 'all', cities.length ? cities.slice(0, 3).join('-').toLowerCase().replace(/\s+/g, '-') : null].filter(Boolean).join('-');
    const exportSelected = () => {
        const ok = downloadXlsx(exportSpecFor(selectedCreators, 'selected'));
        toast(ok ? 'Download started.' : "There's nothing to export.", ok ? 'success' : 'info');
    };

    // ── Render ──────────────────────────────────────────────────────────────
    if (isLeaderboardRoute) {
        return <CreatorLeaderboard creators={creators} onSelectCreator={(c) => navigate(`/admin/creators/${encodeURIComponent(creatorKey(c))}`)} />;
    }

    const statusTabs = [
        { value: 'all', label: 'All', count: counts.all },
        { value: 'pending', label: 'Pending', count: counts.pending, highlight: counts.pending > 0 },
        { value: 'approved', label: 'Verified', count: counts.approved },
        { value: 'rejected', label: 'Rejected', count: counts.rejected },
        { value: 'blocked', label: 'Blocked', count: counts.blocked },
    ];
    const fieldMeta = SEARCH_FIELDS.find(f => f.id === field) || SEARCH_FIELDS[0];
    const loading = !creatorsLoaded && creators.length === 0;
    const showBulkBar = selected.size > 0 || Boolean(bulkProgress);

    const confirmTargets = confirm?.targets || [];
    const missingCollege = (c) => creatorHasCollegeNiche(c) && !String(c.collegeName || '').trim();
    // People already in the target status are left alone.
    const confirmEligible = confirm && confirm.kind !== 'delete' ? confirmTargets.filter(c => (c.profileStatus || 'pending') !== confirm.kind) : confirmTargets;
    const alreadyCount = confirmTargets.length - confirmEligible.length;
    const noCollegeInConfirm = confirm?.kind === 'approved' ? confirmEligible.filter(missingCollege) : [];
    const confirmCount = confirm?.kind === 'approved' && !includeNoCollege ? confirmEligible.length - noCollegeInConfirm.length : confirmEligible.length;
    const confirmName = confirm?.bulk ? plural(confirmEligible.length, 'creator') : (confirmTargets[0]?.name || 'this creator');

    return (
        <div className={cn('space-y-5', showBulkBar && 'pb-32 lg:pb-24')}>
            {detailNotFound && (
                <div className="flex flex-col gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/[0.07] p-4 sm:flex-row sm:items-center">
                    <AlertTriangle size={18} className="shrink-0 text-amber-600 dark:text-amber-300" />
                    <div className="min-w-0 flex-1">
                        <p className="text-[14px] font-bold">Creator not found</p>
                        <p className="text-[13px] text-gray-600 dark:text-zinc-300">No creator matches “{params.id}”. They may have been deleted, or the link is wrong.</p>
                    </div>
                    <Button variant="secondary" onClick={closeCreator}>Back to the list</Button>
                </div>
            )}

            {/* KPI tiles double as quick filters. */}
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                <StatTile label="All creators" value={counts.all.toLocaleString()} hint={loading ? 'Loading…' : `${counts.approved.toLocaleString()} verified`} icon={Users} tone="pink"
                    active={status === 'all' && !joined && !hasFilters} onClick={() => setSearchParams({}, { replace: true })} />
                <StatTile label="Waiting for review" value={counts.pending.toLocaleString()} hint={counts.manualPending ? `${counts.manualPending} with manual follower counts` : counts.pending ? 'Verify or reject them' : 'All clear'} icon={Clock}
                    tone={counts.pending ? 'amber' : 'gray'} active={status === 'pending'} onClick={() => updateParams({ status: status === 'pending' ? '' : 'pending', manual: '' })} />
                <StatTile label="Verified" value={counts.approved.toLocaleString()} hint="Can join campaigns" icon={ShieldCheck} tone="green"
                    active={status === 'approved'} onClick={() => updateParams({ status: status === 'approved' ? '' : 'approved', manual: '' })} />
                <StatTile label="Joined this week" value={counts.week.toLocaleString()} hint="Last 7 days" icon={Sparkles} tone="blue"
                    active={joined === '7'} onClick={() => updateParams({ joined: joined === '7' ? '' : '7', sort: 'newest' })} />
            </div>

            {counts.collegeMissing > 0 && college !== 'missing' && (
                <div className="flex flex-col gap-3 rounded-2xl border border-orange-500/30 bg-orange-500/[0.06] p-4 sm:flex-row sm:items-center">
                    <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-500/15 text-orange-600 dark:bg-orange-400/15 dark:text-orange-300"><GraduationCap size={18} /></span>
                        <div className="min-w-0">
                            <p className="text-[14px] font-bold">{counts.collegeMissing} campus {counts.collegeMissing === 1 ? 'profile has' : 'profiles have'} no college name</p>
                            <p className="text-[13px] text-gray-600 dark:text-zinc-300">Student and campus creators and college pages need one. Open each profile and add it.</p>
                        </div>
                    </div>
                    <Button variant="secondary" onClick={() => updateParams({ college: 'missing' })} className="h-11">Show them</Button>
                </div>
            )}

            {/* Search, export, view and actions */}
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
                <div className="flex min-w-0 gap-2 xl:w-[460px]">
                    <Select
                        label="Search in"
                        value={field}
                        onChange={(v) => updateParams({ field: v })}
                        options={SEARCH_FIELDS.map(f => ({ value: f.id, label: f.label }))}
                        className="w-[118px] shrink-0"
                    />
                    <SearchInput value={searchDraft} onChange={setSearchDraft} placeholder={fieldMeta.placeholder} className="flex-1" />
                </div>
                <div className="flex flex-1 flex-wrap items-center gap-2 xl:justify-end">
                    <Button variant="secondary" onClick={() => setFiltersOpen(v => !v)} aria-expanded={filtersOpen} className={cn('h-11 sm:hidden', panelFilters > 0 && cn(a.border, a.soft))}>
                        <SlidersHorizontal size={15} /> Filters{panelFilters > 0 ? ` · ${panelFilters}` : ''}
                    </Button>
                    <ExportMenu getSpec={() => exportSpecFor(filtered, exportLabel)} hint={`${plural(filtered.length, 'creator')} in this view`} />
                    <ViewToggle value={view} onChange={setView} />
                    <Menu trigger={({ toggle }) => (
                        <Button variant="secondary" onClick={toggle} className="h-11" aria-label="More actions"><MoreHorizontal size={16} /> More</Button>
                    )}>
                        <MenuItem icon={Upload} onClick={() => setIsImportOpen(true)} hint="Check every row before saving">Import from CSV</MenuItem>
                        <MenuItem icon={Megaphone} onClick={() => setIsBroadcastOpen(true)} hint="Announcements to city groups">Email city groups</MenuItem>
                        <MenuItem as={Link} to="/admin/creators/groups" icon={MessageCircle} hint="Invites and group links">WhatsApp groups</MenuItem>
                        {bangaloreCount > 0 && (
                            <MenuItem icon={MapPin} onClick={() => setConfirm({ kind: 'bangalore', targets: [] })} hint={`${plural(bangaloreCount, 'creator')} use “Bangalore”`}>
                                Rename Bangalore to Bengaluru
                            </MenuItem>
                        )}
                    </Menu>
                    <Button variant="primary" onClick={() => setIsAddModalOpen(true)} className="h-11 flex-1 sm:flex-none">
                        <Plus size={16} /> Add creator
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <div className={cn('grid-cols-2 gap-2 sm:grid sm:grid-cols-3 lg:flex lg:flex-wrap', filtersOpen ? 'grid' : 'hidden')}>
                <MultiSelectFilter
                    label="Cities"
                    allLabel="All cities"
                    noun="city"
                    nounPlural="cities"
                    options={cityOptions.map(o => ({ ...o, count: cityCounts[o.value] || 0 }))}
                    value={cities}
                    onChange={(list) => updateParams({ city: list.join(',') })}
                    className="lg:w-48"
                />
                <Select label="Niche" value={niche} onChange={(v) => updateParams({ niche: v })} options={nicheOptions} className="lg:w-48" />
                {collegeOptions.length > 1 && (
                    <Select label="College" value={college} onChange={(v) => updateParams({ college: v })} options={collegeOptions} className="lg:w-52" />
                )}
                <Select
                    label="Platform"
                    value={platform}
                    onChange={(v) => updateParams({ platform: v })}
                    options={[
                        { value: 'all', label: 'Any platform' },
                        { value: 'instagram', label: 'Has Instagram' },
                        { value: 'youtube', label: 'Has YouTube' },
                        { value: 'linkedin', label: 'Has LinkedIn' },
                    ]}
                    className="lg:w-40"
                />
                <RangeFilter
                    label="Followers"
                    value={{ min: minFollowers, max: maxFollowers }}
                    onChange={({ min, max }) => updateParams({ min: min || '', max: max || '' })}
                    countFor={countForRange}
                    className="lg:w-44"
                />
                <Select label="Joined" value={joined} onChange={(v) => updateParams({ joined: v })} options={JOINED} className="lg:w-44" />
                <Select label="Sort" value={sort} onChange={(v) => updateParams({ sort: v })} options={SORTS} className="lg:w-40" />
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
                    <SegmentedTabs value={status} onChange={(v) => updateParams({ status: v, manual: v === 'pending' && manualOnly ? '1' : '' })} items={statusTabs} />
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px]">
                    <span className="font-semibold text-gray-500">
                        {loading ? 'Loading creators…' : `${plural(filtered.length, 'creator')}${hasFilters ? ` of ${creators.length.toLocaleString()}` : ''}`}
                    </span>
                    {status === 'pending' && counts.manualPending > 0 && (
                        <button
                            type="button"
                            onClick={() => updateParams({ manual: manualOnly ? '' : '1' })}
                            aria-pressed={manualOnly}
                            className={cn('inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 font-semibold transition-colors',
                                manualOnly ? 'border-orange-500/40 bg-orange-500/10 text-orange-700 dark:text-orange-300' : 'border-black/10 text-gray-600 hover:border-black/20 dark:border-white/10 dark:text-zinc-300')}
                        >
                            {manualOnly && <Check size={13} />} Manual follower counts ({counts.manualPending})
                        </button>
                    )}
                    {activeFilters > 0 && (
                        <button type="button" onClick={() => setSearchParams(status !== 'all' ? { status } : {}, { replace: true })} className={cn('h-9 font-semibold hover:underline', a.text)}>
                            Clear {plural(activeFilters, 'filter')}
                        </button>
                    )}
                </div>
            </div>

            {/* Results */}
            {loading ? (
                <Card className="flex items-center justify-center rounded-2xl py-20"><Loader2 size={22} className={cn('animate-spin', a.text)} /></Card>
            ) : filtered.length === 0 ? (
                <Card className="rounded-2xl">
                    <EmptyState
                        icon={creators.length ? Search : Users}
                        title={creators.length ? 'No creators match these filters' : 'No creators yet'}
                        description={creators.length ? 'Try a different search, or clear the filters.' : 'Creators show up here when they apply at /creator/join. You can also add one yourself or import a CSV.'}
                        action={creators.length
                            ? <Button onClick={() => setSearchParams({}, { replace: true })}>Clear filters</Button>
                            : (
                                <div className="flex flex-wrap justify-center gap-2">
                                    <Button variant="primary" onClick={() => setIsAddModalOpen(true)}><Plus size={16} /> Add creator</Button>
                                    <Button variant="secondary" onClick={() => setIsImportOpen(true)}><Upload size={15} /> Import CSV</Button>
                                </div>
                            )}
                    />
                </Card>
            ) : (
                <>
                    {view === 'cards' ? (
                        <div className="space-y-3">
                            <label className="inline-flex h-10 cursor-pointer items-center gap-2.5 pl-2 text-[13px] font-semibold text-gray-600 dark:text-zinc-300">
                                <input type="checkbox" checked={allPageSelected} onChange={togglePage} className="h-[18px] w-[18px] cursor-pointer rounded-md accent-pink-500" />
                                Select this page
                            </label>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                                {pageRows.map(c => (
                                    <CreatorCard
                                        key={creatorKey(c)}
                                        creator={c}
                                        badges={getEarnedBadges(c, creators, campaigns)}
                                        selected={selected.has(creatorKey(c))}
                                        busy={busyIds.has(creatorKey(c))}
                                        onToggle={() => toggleSelect(creatorKey(c))}
                                        onOpen={() => openCreator(c)}
                                        onAction={onRowAction}
                                    />
                                ))}
                            </div>
                        </div>
                    ) : (
                        <Card className="overflow-hidden rounded-2xl">
                            <CreatorListHeader allSelected={allPageSelected} onToggleAll={togglePage} />
                            <ul className="divide-y divide-black/[0.05] dark:divide-white/[0.05]">
                                {pageRows.map(c => (
                                    <CreatorRow
                                        key={creatorKey(c)}
                                        creator={c}
                                        selected={selected.has(creatorKey(c))}
                                        onToggle={() => toggleSelect(creatorKey(c))}
                                        onOpen={() => openCreator(c)}
                                        onAction={onRowAction}
                                    />
                                ))}
                            </ul>
                        </Card>
                    )}
                    <Card className="rounded-2xl">
                        <Pagination
                            page={currentPage}
                            pageCount={pageCount}
                            total={filtered.length}
                            pageSize={PAGE_SIZE}
                            onChange={(p) => { updateParams({ page: p > 1 ? p : '' }, { keepPage: true }); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                        />
                    </Card>
                </>
            )}

            {/* Bulk action bar (above the phone tab bar) */}
            {showBulkBar && createPortal(
                <div className="pointer-events-none fixed inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-[60] flex justify-center px-3 lg:bottom-[calc(1rem+env(safe-area-inset-bottom))]">
                    <div className="pointer-events-auto w-full max-w-3xl rounded-2xl border border-black/[0.08] bg-white p-3 shadow-2xl dark:border-white/10 dark:bg-[#12141b]">
                        {bulkProgress ? (
                            <div className="space-y-2 px-1 py-1" role="status">
                                <p className="flex items-center gap-2 text-[14px] font-bold">
                                    <Loader2 size={15} className={cn('animate-spin', a.text)} />
                                    {bulkProgress.label} {bulkProgress.done} of {bulkProgress.total}…
                                </p>
                                <div className="h-1.5 overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
                                    <div className={cn('h-full rounded-full transition-[width]', a.dot)} style={{ width: `${(bulkProgress.done / Math.max(1, bulkProgress.total)) * 100}%` }} />
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-1 text-[13px]">
                                    <span className={cn('rounded-full px-2.5 py-1 text-[13px] font-bold', a.chip)}>{selected.size} selected</span>
                                    {selected.size < filtered.length && (
                                        <button type="button" onClick={() => setSelected(new Set(filtered.map(creatorKey)))} className="h-9 font-semibold text-gray-600 hover:underline dark:text-zinc-300">
                                            Select all {filtered.length.toLocaleString()}
                                        </button>
                                    )}
                                    <button type="button" onClick={() => setSelected(new Set())} className="h-9 font-semibold text-gray-600 hover:underline dark:text-zinc-300">Clear</button>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button size="sm" variant="success" onClick={() => requestBulk('approved')} className="h-10 flex-1 sm:flex-none"><Check size={14} /> Verify</Button>
                                    <Button size="sm" variant="accent" onClick={() => setEmailRecipients({ list: selectedCreators, fromSelection: true })} className="h-10 flex-1 sm:flex-none"><Mail size={14} /> Email</Button>
                                    <Button size="sm" variant="secondary" onClick={() => setCityInvite({ city: cities.length === 1 ? cities[0] : (selectedCreators[0]?.city || 'Bengaluru'), uids: [...selected] })} className="h-10 flex-1 sm:flex-none">
                                        <Send size={14} /> <span className="sm:hidden">Invite</span><span className="hidden sm:inline">Group invites</span>
                                    </Button>
                                    <Menu trigger={({ toggle }) => (
                                        <Button size="sm" variant="secondary" onClick={toggle} aria-label="More bulk actions" className="h-10 w-10 px-0"><MoreHorizontal size={16} /></Button>
                                    )}>
                                        <MenuItem icon={X} onClick={() => requestBulk('rejected')}>Reject</MenuItem>
                                        <MenuItem icon={Clock} onClick={() => requestBulk('pending')}>Move back to pending</MenuItem>
                                        <MenuItem icon={Ban} onClick={() => requestBulk('blocked')}>Block</MenuItem>
                                        <MenuItem icon={FileSpreadsheet} onClick={exportSelected} hint="Excel file of the selection">Export selected</MenuItem>
                                        <div className="my-1 border-t border-black/[0.05] dark:border-white/[0.08]" />
                                        <MenuItem icon={Trash2} danger onClick={() => requestBulk('delete')}>Delete</MenuItem>
                                    </Menu>
                                </div>
                            </div>
                        )}
                    </div>
                </div>,
                document.body
            )}

            {/* Confirmations */}
            <ConfirmSheet
                open={Boolean(confirm) && confirm.kind !== 'bangalore'}
                onClose={() => setConfirm(null)}
                title={confirm?.kind === 'delete'
                    ? `Delete ${confirmName}?`
                    : confirm ? `${STATUS_WORDS[confirm.kind]?.verb} ${confirmName}?` : ''}
                tone={confirm?.kind === 'delete' ? 'danger' : STATUS_WORDS[confirm?.kind]?.tone}
                confirmLabel={confirm?.kind === 'delete'
                    ? `Delete ${confirmTargets.length === 1 ? 'profile' : plural(confirmTargets.length, 'profile')}`
                    : confirm ? `${STATUS_WORDS[confirm.kind]?.verb}${confirmCount > 1 ? ` ${confirmCount}` : ''}` : ''}
                typeToConfirm={confirm?.kind === 'delete' && confirmTargets.length > 1 ? 'delete' : undefined}
                onConfirm={runConfirmed}
                disabled={confirm?.kind !== 'delete' && confirmCount === 0}
                zIndex={confirm?.bulk ? undefined : 320}
            >
                {confirm?.kind === 'delete' && <p>This removes {confirmTargets.length === 1 ? 'the profile' : 'these profiles'} for good. {confirmTargets.length === 1 ? 'It' : 'They'} can't be brought back.</p>}
                {confirm?.kind === 'approved' && <p>{confirmCount === 1 ? 'They get' : 'Each one gets'} the approval email and can join campaigns.</p>}
                {confirm?.kind === 'rejected' && <p>{confirmTargets.length === 1 ? 'Their application is' : 'Their applications are'} marked rejected. No email is sent.</p>}
                {confirm?.kind === 'blocked' && <p>Blocked creators can't join campaigns until you move them back.</p>}
                {confirm?.kind === 'pending' && <p>They go back to the review queue.</p>}
                {noCollegeInConfirm.length > 0 && (
                    <div className="rounded-xl border border-orange-500/30 bg-orange-500/[0.06] p-3">
                        <p className="flex items-start gap-2 text-[13px] font-semibold text-orange-700 dark:text-orange-300">
                            <GraduationCap size={15} className="mt-0.5 shrink-0" />
                            {noCollegeInConfirm.length === 1 && confirmEligible.length === 1
                                ? 'This is a campus creator or college page with no college name. Add the college first.'
                                : `${plural(noCollegeInConfirm.length, 'campus creator')} or college pages have no college name and will be skipped.`}
                        </p>
                        <label className="mt-2 flex min-h-[40px] cursor-pointer items-center gap-2 text-[13px] font-semibold">
                            <input type="checkbox" checked={includeNoCollege} onChange={(e) => setIncludeNoCollege(e.target.checked)} className="h-[18px] w-[18px] accent-orange-500" />
                            Verify {noCollegeInConfirm.length === 1 ? 'it' : 'them'} anyway
                        </label>
                    </div>
                )}
                {alreadyCount > 0 && (
                    <p className="text-[13px]">{alreadyCount === confirmTargets.length ? `Everyone selected is already ${STATUS_WORDS[confirm.kind]?.done.toLowerCase()}.` : `${plural(alreadyCount, 'creator')} ${alreadyCount === 1 ? 'is' : 'are'} already ${STATUS_WORDS[confirm.kind]?.done.toLowerCase()} and will be left as ${alreadyCount === 1 ? 'is' : 'they are'}.`}</p>
                )}
                {confirm?.bulk && confirmEligible.length > 1 && (
                    <p className="text-[12px] text-gray-500">
                        {confirmEligible.slice(0, 5).map(c => c.name || 'Unnamed').join(', ')}{confirmEligible.length > 5 ? ` and ${confirmEligible.length - 5} more` : ''}
                    </p>
                )}
            </ConfirmSheet>

            <ConfirmSheet
                open={confirm?.kind === 'bangalore'}
                onClose={() => setConfirm(null)}
                title="Rename Bangalore to Bengaluru?"
                tone="accent"
                confirmLabel={`Update ${plural(bangaloreCount, 'creator')}`}
                onConfirm={handleMergeBangalore}
            >
                <p>{plural(bangaloreCount, 'creator')} have “Bangalore” or a misspelling as their city. They'll all be set to Bengaluru so filters, groups and campaigns match them.</p>
            </ConfirmSheet>

            {selectedCreator && (
                <CreatorDetailModal
                    creator={selectedCreator}
                    onClose={closeCreator}
                    onUpdateStatus={handleUpdateStatus}
                    onDelete={handleDeleteCreator}
                    isUpdating={busyIds.has(creatorKey(selectedCreator))}
                    isDeleting={busyIds.has(creatorKey(selectedCreator))}
                />
            )}
            {isAddModalOpen && <AddCreatorModal onClose={() => setIsAddModalOpen(false)} onCreated={(res) => { if (res?.id) navigate(`/admin/creators/${encodeURIComponent(res.id)}${listSearch}`); }} />}
            {emailRecipients && (
                <BulkEmailModal
                    recipients={emailRecipients.list}
                    onClose={(sent) => { if (sent && emailRecipients.fromSelection) setSelected(new Set()); setEmailRecipients(null); }}
                />
            )}
            {isBroadcastOpen && <BroadcastGroupsModal onClose={() => setIsBroadcastOpen(false)} />}
            <ImportCreatorsSheet open={isImportOpen} onClose={() => setIsImportOpen(false)} creators={creators} />
            {cityInvite && (
                <AddCityCreatorsModal
                    isOpen
                    initialCity={cityInvite.city}
                    preselectedUids={cityInvite.uids}
                    onClose={() => setCityInvite(null)}
                />
            )}
        </div>
    );
};

export default CreatorManager;
