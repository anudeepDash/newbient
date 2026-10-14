import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams, useLocation, useSearchParams, Link } from 'react-router-dom';
import { useStore } from '../../lib/store';
import { useStoreSubscription } from '../../hooks/useStoreSubscription';
import { PREDEFINED_CITIES, CREATOR_NICHES, nicheKey, creatorHasCollegeNiche } from '../../lib/constants';
import { extractSocialUsername, buildSocialUrl } from '../../lib/socialUtils';
import { cn } from '../../lib/utils';
import { sendCreatorDirectEmail } from '../../lib/email';
import Users from 'lucide-react/dist/esm/icons/users';
import Search from 'lucide-react/dist/esm/icons/search';
import MapPin from 'lucide-react/dist/esm/icons/map-pin';
import Instagram from 'lucide-react/dist/esm/icons/instagram';
import Mail from 'lucide-react/dist/esm/icons/mail';
import Phone from 'lucide-react/dist/esm/icons/phone';
import Target from 'lucide-react/dist/esm/icons/target';
import Mic2 from 'lucide-react/dist/esm/icons/mic-2';
import Layers from 'lucide-react/dist/esm/icons/layers';
import X from 'lucide-react/dist/esm/icons/x';
import Plus from 'lucide-react/dist/esm/icons/plus';
import Download from 'lucide-react/dist/esm/icons/download';
import Upload from 'lucide-react/dist/esm/icons/upload';
import Send from 'lucide-react/dist/esm/icons/send';
import Settings from 'lucide-react/dist/esm/icons/settings';
import MoreHorizontal from 'lucide-react/dist/esm/icons/more-horizontal';
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right';
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down';
import Check from 'lucide-react/dist/esm/icons/check';
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle';
import Trophy from 'lucide-react/dist/esm/icons/trophy';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import BroadcastGroupsModal from '../../components/admin/BroadcastGroupsModal';
import AddCityCreatorsModal from '../../components/admin/AddCityCreatorsModal';
import AddCreatorModal from '../../components/admin/AddCreatorModal';
import CreatorDetailModal from '../../components/admin/CreatorDetailModal';
import {
    Card, Button, Badge, CreatorStatusBadge, SearchInput, Select, SegmentedTabs,
    EmptyState, Pagination, Avatar, Menu, MenuItem,
} from '../../components/admin/creatorPortal/ui';
import {
    creatorKey, creatorPhoto, creatorReach, creatorNiche, isPendingCreator,
    isManualFollowerEntry, isBangaloreVariant, toMillis, formatDate, formatCount,
} from '../../components/admin/creatorPortal/creatorUtils';

const SEARCH_FIELDS = [
    { id: 'all', label: 'All fields', icon: Search, placeholder: 'Search name, phone, email, @instagram, city, college…' },
    { id: 'phone', label: 'Phone', icon: Phone, placeholder: 'Search by phone number' },
    { id: 'name', label: 'Name', icon: Users, placeholder: 'Search by name' },
    { id: 'instagram', label: 'Instagram', icon: Instagram, placeholder: 'Search by @handle' },
    { id: 'email', label: 'Email', icon: Mail, placeholder: 'Search by email' },
    { id: 'id', label: 'Creator ID', icon: Target, placeholder: 'Search by creator ID or UID' },
    { id: 'college', label: 'College', icon: Mic2, placeholder: 'Search by college' },
    { id: 'city', label: 'City', icon: MapPin, placeholder: 'Search by city' },
    { id: 'niche', label: 'Niche', icon: Layers, placeholder: 'Search by niche' },
];

const matchesCreatorSearch = (c, term, field = 'all') => {
    if (!term || !term.trim()) return true;
    const cleanTerm = term.trim().toLowerCase();
    const termDigits = cleanTerm.replace(/\D/g, '');

    const rawPhones = [c.phone, c.mobile, c.whatsapp, c.contact, c.phoneNumber].filter(Boolean).map(String);
    const phoneDigitsList = rawPhones.map(p => p.replace(/\D/g, ''));

    const matchesPhone = () => {
        if (rawPhones.some(p => p.toLowerCase().includes(cleanTerm))) return true;
        if (termDigits.length >= 3) {
            return phoneDigitsList.some(pDigits => pDigits && (pDigits.includes(termDigits) || termDigits.includes(pDigits)));
        }
        return false;
    };
    const matchesName = () => [c.name, c.displayName, c.fullName, c.artistName].filter(Boolean)
        .some(n => String(n).toLowerCase().includes(cleanTerm));
    const matchesEmail = () => Boolean(c.email && String(c.email).toLowerCase().includes(cleanTerm));
    const matchesInstagram = () => {
        const strippedTerm = cleanTerm.replace(/^@/, '');
        return [c.instagram, c.handle, c.instagramHandle].filter(Boolean)
            .some(ig => String(ig).toLowerCase().replace(/^@/, '').includes(strippedTerm));
    };
    const matchesCity = () => Boolean(c.city && String(c.city).toLowerCase().includes(cleanTerm));
    const matchesId = () => [c.uid, c.id, c.creatorId, c.passId, c.passNumber].filter(Boolean)
        .some(id => String(id).toLowerCase().includes(cleanTerm));
    const matchesCollege = () => [c.college, c.collegeName, c.university, c.campus, c.school].filter(Boolean)
        .some(col => String(col).toLowerCase().includes(cleanTerm));
    const matchesNiche = () => {
        const specs = Array.isArray(c.specializations) ? c.specializations : (Array.isArray(c.niches) ? c.niches : []);
        return [...specs, c.category, c.niche].some(n => typeof n === 'string' && n.toLowerCase().includes(cleanTerm));
    };
    const matchesSocials = () => [c.youtube, c.youtubeChannel, c.youtubeHandle, c.linkedin, c.linkedinProfile, c.twitter, c.xHandle, c.portfolio, c.website]
        .filter(Boolean).some(soc => String(soc).toLowerCase().includes(cleanTerm));
    const matchesFinance = () => [c.pan, c.panNumber, c.upiId, c.bankAccount, c.accountNumber, c.ifsc, c.gstNumber]
        .filter(Boolean).some(f => String(f).toLowerCase().includes(cleanTerm));
    const matchesBio = () => [c.bio, c.about, c.description, c.notes, c.adminNotes]
        .filter(Boolean).some(t => String(t).toLowerCase().includes(cleanTerm));

    switch (field) {
        case 'phone': return matchesPhone();
        case 'name': return matchesName();
        case 'email': return matchesEmail();
        case 'instagram': return matchesInstagram();
        case 'id': return matchesId();
        case 'college': return matchesCollege();
        case 'city': return matchesCity();
        case 'niche': return matchesNiche();
        case 'socials': return matchesSocials() || matchesInstagram();
        case 'finance': return matchesFinance();
        case 'all':
        default:
            return matchesPhone() || matchesName() || matchesEmail() || matchesInstagram() || matchesId() ||
                matchesCity() || matchesNiche() || matchesCollege() || matchesSocials() || matchesFinance() || matchesBio();
    }
};

// RFC 4180-ish CSV parser: quoted fields, escaped quotes, commas/newlines in quotes, CRLF.
const parseCSV = (text) => {
    const rows = [];
    let row = [];
    let field = '';
    let inQuotes = false;
    const input = String(text || '').replace(/^\uFEFF/, '');
    for (let i = 0; i < input.length; i++) {
        const ch = input[i];
        if (inQuotes) {
            if (ch === '"') {
                if (input[i + 1] === '"') { field += '"'; i++; }
                else inQuotes = false;
            } else field += ch;
        } else if (ch === '"') inQuotes = true;
        else if (ch === ',') { row.push(field); field = ''; }
        else if (ch === '\n' || ch === '\r') {
            if (ch === '\r' && input[i + 1] === '\n') i++;
            row.push(field); field = '';
            if (row.some(v => v.trim() !== '')) rows.push(row);
            row = [];
        } else field += ch;
    }
    row.push(field);
    if (row.some(v => v.trim() !== '')) rows.push(row);
    return rows;
};

const csvCell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;

const STATUS_TABS = ['all', 'pending', 'approved', 'rejected', 'blocked'];
const PAGE_SIZE = 25;
const FOLLOWER_PRESETS = [
    { value: '', label: 'Any followers' },
    { value: '1000', label: '1K+ followers' },
    { value: '5000', label: '5K+ followers' },
    { value: '10000', label: '10K+ followers' },
    { value: '50000', label: '50K+ followers' },
    { value: '100000', label: '100K+ followers' },
];
const SORTS = [
    { value: 'newest', label: 'Newest first' },
    { value: 'oldest', label: 'Oldest first' },
    { value: 'followers', label: 'Most followers' },
    { value: 'name', label: 'Name A–Z' },
];

const EMPTY = [];

const CreatorManager = ({ showLeaderboardOnly = false }) => {
    useStoreSubscription(['creators', 'campaigns']);
    const creators = useStore(state => state.creators) || EMPTY;
    const creatorsLoaded = useStore(state => Boolean(state.subscriptionsLoaded?.creators));
    const { updateCreator, deleteCreator, mergeBangaloreCreatorsToBengaluru } = useStore();
    const navigate = useNavigate();
    const location = useLocation();
    const params = useParams();
    const [searchParams, setSearchParams] = useSearchParams();
    const isLeaderboardRoute = location.pathname.includes('/leaderboard') || showLeaderboardOnly;

    // Filters live in the URL so views can be bookmarked, shared and survive the
    // detail modal opening/closing.
    const q = searchParams.get('q') || '';
    const field = searchParams.get('field') || 'all';
    const status = STATUS_TABS.includes(searchParams.get('status')) ? searchParams.get('status') : 'all';
    const city = searchParams.get('city') || 'all';
    const niche = searchParams.get('niche') || 'all';
    const college = searchParams.get('college') || 'all';
    const platform = searchParams.get('platform') || 'all';
    const minFollowers = searchParams.get('min') || '';
    const manualOnly = searchParams.get('manual') === '1';
    const sort = searchParams.get('sort') || 'newest';
    const page = Math.max(1, Number(searchParams.get('page')) || 1);

    const updateParams = (patch, { keepPage = false } = {}) => {
        const next = new URLSearchParams(searchParams);
        Object.entries(patch).forEach(([k, v]) => {
            if (v === '' || v === null || v === undefined || v === 'all' || v === false || (k === 'sort' && v === 'newest') || (k === 'field' && v === 'all')) next.delete(k);
            else next.set(k, String(v));
        });
        if (!keepPage) next.delete('page');
        setSearchParams(next, { replace: true });
    };

    // Search box is local for snappy typing, synced to the URL shortly after.
    // When the URL changes from elsewhere (clear filters, back button) adopt it.
    const [searchDraft, setSearchDraft] = useState(q);
    const [syncedQ, setSyncedQ] = useState(q);
    if (q !== syncedQ) {
        setSyncedQ(q);
        setSearchDraft(q);
    }
    useEffect(() => {
        if (searchDraft === q) return;
        const t = setTimeout(() => updateParams({ q: searchDraft.trim() ? searchDraft : '' }), 200);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchDraft]);

    const [rawSelected, setSelected] = useState(() => new Set());
    const [isUpdating, setIsUpdating] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isBulkEmailOpen, setIsBulkEmailOpen] = useState(false);
    const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);
    const [cityInvite, setCityInvite] = useState(null); // { city, uids }
    const [isMergingBangalore, setIsMergingBangalore] = useState(false);
    const [isBulkApproving, setIsBulkApproving] = useState(false);
    const importInputRef = useRef(null);

    // ── Derived data ────────────────────────────────────────────────────────
    const counts = useMemo(() => {
        const out = { all: creators.length, pending: 0, approved: 0, rejected: 0, blocked: 0, manualPending: 0 };
        creators.forEach(c => {
            if (isPendingCreator(c)) {
                out.pending++;
                if (isManualFollowerEntry(c)) out.manualPending++;
            } else if (out[c.profileStatus] !== undefined) out[c.profileStatus]++;
        });
        return out;
    }, [creators]);

    const cityOptions = useMemo(() => {
        const set = new Set(PREDEFINED_CITIES);
        creators.forEach(c => { if (c.city && !isBangaloreVariant(c.city)) set.add(String(c.city).trim()); });
        return [{ value: 'all', label: 'All cities' }, ...[...set].filter(Boolean).sort().map(c => ({ value: c, label: c }))];
    }, [creators]);

    // Colleges grouped case-insensitively, most creators first.
    const collegeOptions = useMemo(() => {
        const byKey = new Map();
        let missing = 0;
        creators.forEach(c => {
            const name = String(c.collegeName || '').trim();
            if (!name) { if (creatorHasCollegeNiche(c)) missing++; return; }
            const key = name.toLowerCase();
            const entry = byKey.get(key) || { label: name, count: 0 };
            entry.count++;
            byKey.set(key, entry);
        });
        const list = [...byKey.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
        return [
            { value: 'all', label: 'All colleges' },
            ...(missing ? [{ value: 'missing', label: `College missing (${missing})` }] : []),
            ...list.map(e => ({ value: e.label, label: `${e.label} (${e.count})` })),
        ];
    }, [creators]);

    const nicheOptions = useMemo(() => [{ value: 'all', label: 'All niches' }, ...CREATOR_NICHES.map(n => ({ value: n, label: n }))], []);

    const bangaloreCount = useMemo(
        () => creators.filter(c => /bangalore|banglore/i.test(String(c.city || ''))).length,
        [creators]
    );

    const filtered = useMemo(() => {
        const min = Number(minFollowers) || 0;
        const list = creators.filter(c => {
            if (!matchesCreatorSearch(c, q, field)) return false;
            if (status === 'pending' && !isPendingCreator(c)) return false;
            if (status !== 'all' && status !== 'pending' && c.profileStatus !== status) return false;
            if (manualOnly && !isManualFollowerEntry(c)) return false;
            if (city !== 'all' && c.city !== city && !(city === 'Bengaluru' && isBangaloreVariant(c.city))) return false;
            if (niche !== 'all') {
                const specs = Array.isArray(c.specializations) ? c.specializations : (Array.isArray(c.niches) ? c.niches : []);
                const target = nicheKey(niche);
                if (![...specs, c.categories].some(n => nicheKey(n) === target)) return false;
            }
            if (college === 'missing') {
                if (!creatorHasCollegeNiche(c) || String(c.collegeName || '').trim()) return false;
            } else if (college !== 'all' && String(c.collegeName || '').trim().toLowerCase() !== college.toLowerCase()) return false;
            if (platform !== 'all' && !String(c[platform] || '').trim()) return false;
            if (min && creatorReach(c) < min) return false;
            return true;
        });
        const createdAt = (c) => toMillis(c.createdAt || c.joinedAt || c.registeredAt || c.updatedAt);
        const sorters = {
            newest: (a, b) => createdAt(b) - createdAt(a),
            oldest: (a, b) => createdAt(a) - createdAt(b),
            followers: (a, b) => creatorReach(b) - creatorReach(a),
            name: (a, b) => String(a.name || '').localeCompare(String(b.name || '')),
        };
        return list.sort(sorters[sort] || sorters.newest);
    }, [creators, q, field, status, manualOnly, city, niche, college, platform, minFollowers, sort]);

    const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const currentPage = Math.min(page, pageCount);
    const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    const hasFilters = Boolean(q || status !== 'all' || city !== 'all' || niche !== 'all' || college !== 'all' || platform !== 'all' || minFollowers || manualOnly);

    // Detail modal follows the URL (/admin/creators/:id) and always shows live data.
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

    // ── Actions ─────────────────────────────────────────────────────────────
    const toast = (msg, type = 'success') => useStore.getState().addToast(msg, type);

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
    const selectAllFiltered = () => setSelected(new Set(filtered.map(creatorKey)));

    const handleUpdateStatus = async (id, newStatus) => {
        setIsUpdating(true);
        try {
            await updateCreator(id, { profileStatus: newStatus });
            toast(newStatus === 'approved' ? 'Creator verified.' : `Creator marked as ${newStatus}.`);
        } catch (error) {
            console.error('Error updating creator status:', error);
            toast(error?.message || "Couldn't update the status. Please try again.", 'error');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleDeleteCreator = async (id) => {
        if (!window.confirm('Permanently delete this creator profile? This cannot be undone.')) return;
        setIsDeleting(true);
        try {
            await deleteCreator(id);
            closeCreator();
            toast('Creator profile deleted.');
        } catch (error) {
            console.error('Error deleting creator:', error);
            toast(error?.message || "Couldn't delete the creator. Please try again.", 'error');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleBulkApprove = async () => {
        const targets = creators.filter(c => selected.has(creatorKey(c)) && c.profileStatus !== 'approved');
        if (targets.length === 0) { toast('Everyone selected is already verified.', 'info'); return; }
        if (!window.confirm(`Verify ${targets.length} creator${targets.length === 1 ? '' : 's'}? Each one gets an approval email.`)) return;
        setIsBulkApproving(true);
        const results = await Promise.allSettled(targets.map(c => updateCreator(creatorKey(c), { profileStatus: 'approved' })));
        const failed = results.filter(r => r.status === 'rejected').length;
        setIsBulkApproving(false);
        toast(failed ? `Verified ${targets.length - failed}, ${failed} failed.` : `Verified ${targets.length} creator${targets.length === 1 ? '' : 's'}.`, failed ? 'warning' : 'success');
        setSelected(new Set());
    };

    const handleMergeBangalore = async () => {
        if (!mergeBangaloreCreatorsToBengaluru) return;
        setIsMergingBangalore(true);
        try {
            const res = await mergeBangaloreCreatorsToBengaluru();
            toast(`Moved ${res?.updatedCount || 0} creators to Bengaluru.`);
        } catch (err) {
            console.error('Error merging Bangalore creators:', err);
            toast('Failed to merge Bangalore creators.', 'error');
        } finally {
            setIsMergingBangalore(false);
        }
    };

    const exportToCSV = () => {
        const headers = ['Name', 'Email', 'Phone', 'Phone verified', 'City', 'College', 'Instagram', 'Instagram followers', 'LinkedIn', 'LinkedIn followers', 'YouTube', 'YouTube subscribers', 'Niches', 'Status', 'Creator ID', 'Joined'];
        const rows = filtered.map(c => [
            c.name, c.email, c.phone, c.isPhoneVerified ? 'Yes' : 'No', c.city, c.collegeName,
            c.instagram ? buildSocialUrl(c.instagram, 'instagram') : '', c.instagramFollowers || 0,
            c.linkedin ? buildSocialUrl(c.linkedin, 'linkedin') : '', c.linkedinFollowers || 0,
            c.youtube ? buildSocialUrl(c.youtube, 'youtube') : '', c.youtubeSubscribers || 0,
            (c.specializations || c.niches || []).join(', '), c.profileStatus || 'pending', c.creatorId || '', formatDate(c.createdAt),
        ].map(csvCell).join(','));
        const blob = new Blob([[headers.map(csvCell).join(','), ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `newbi-creators-${status}-${city === 'all' ? 'all-cities' : city.toLowerCase()}-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleImportCSV = (e) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (event) => {
            const rows = parseCSV(event.target.result);
            if (rows.length < 2) { toast('CSV file is empty or has no data rows.', 'error'); return; }
            const headers = rows[0].map(h => h.trim().toLowerCase());
            const toImport = [];
            let skipped = 0;
            rows.slice(1).forEach(values => {
                const row = {};
                headers.forEach((h, idx) => { row[h] = (values[idx] || '').trim(); });
                const name = row['name'] || row['full name'] || '';
                const email = row['email'] || row['email id'] || '';
                const phone = row['phone'] || row['mobile'] || row['contact'] || '';
                const rawCity = row['city'] || row['location'] || '';
                const rowCity = isBangaloreVariant(rawCity) ? 'Bengaluru' : rawCity;
                const rowNiche = row['niche'] || row['specialization'] || row['category'] || '';
                if (!name || !email || !phone || !rowNiche || !rowCity) { skipped++; return; }

                let ig = row['instagram'] || row['handle'] || '';
                if (ig.includes('/')) {
                    const parts = ig.split('/').filter(Boolean);
                    ig = (parts[parts.length - 1] || '').split('?')[0];
                }
                toImport.push({
                    uid: `imported_${Math.random().toString(36).substring(2, 15)}`,
                    name, email, phone, city: rowCity,
                    categories: rowNiche,
                    specializations: [rowNiche],
                    instagram: ig.replace(/^@/, ''),
                    instagramFollowers: row['followers'] || row['instagram followers'] || '0',
                    collegeName: row['college'] || row['college name'] || '',
                    bio: row['bio'] || row['description'] || '',
                    profileStatus: 'approved',
                    isPhoneVerified: true,
                });
            });
            if (toImport.length === 0) { toast('No valid rows found. Name, email, phone, city and niche are required.', 'error'); return; }
            try {
                const { addCreator } = useStore.getState();
                const results = await Promise.allSettled(toImport.map(c => addCreator(c, false)));
                const failed = results.filter(r => r.status === 'rejected').length;
                toast(`Imported ${toImport.length - failed} creator${toImport.length - failed === 1 ? '' : 's'}${skipped ? `, skipped ${skipped} incomplete row${skipped === 1 ? '' : 's'}` : ''}${failed ? `, ${failed} failed` : ''}.`, failed ? 'warning' : 'success');
            } catch (err) {
                console.error('CSV import error:', err);
                toast('Failed to import creators.', 'error');
            }
        };
        reader.readAsText(file);
    };

    // ── Render ──────────────────────────────────────────────────────────────
    if (isLeaderboardRoute) {
        return <ReferralLeaderboard creators={creators} onSelectCreator={(c) => navigate(`/admin/creators/${encodeURIComponent(creatorKey(c))}`)} />;
    }

    const statusTabs = [
        { value: 'all', label: 'All', count: counts.all },
        { value: 'pending', label: 'Pending', count: counts.pending, highlight: counts.pending > 0 },
        { value: 'approved', label: 'Verified', count: counts.approved },
        { value: 'rejected', label: 'Rejected', count: counts.rejected },
        { value: 'blocked', label: 'Blocked', count: counts.blocked },
    ];

    const fieldMeta = SEARCH_FIELDS.find(f => f.id === field) || SEARCH_FIELDS[0];

    return (
        <div className="space-y-4">
            {detailNotFound && (
                <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                    <AlertTriangle size={18} className="mt-0.5 shrink-0" />
                    <div className="flex-1">
                        <p className="font-medium">Creator not found</p>
                        <p className="mt-0.5 text-amber-800/80 dark:text-amber-200/80">
                            No creator matches “{params.id}”. They may have been deleted, or the link is wrong.
                        </p>
                    </div>
                    <Button size="sm" variant="secondary" onClick={closeCreator}>Back to list</Button>
                </div>
            )}

            {/* Toolbar */}
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <SegmentedTabs
                    value={status}
                    onChange={(v) => updateParams({ status: v, manual: v === 'pending' && manualOnly ? '1' : '' })}
                    items={statusTabs}
                    className="max-w-full overflow-x-auto"
                />
                <div className="flex flex-wrap items-center gap-2">
                    <Menu
                        trigger={({ toggle }) => (
                            <Button variant="secondary" onClick={toggle}>
                                <MoreHorizontal size={16} /> More
                            </Button>
                        )}
                    >
                        <MenuItem icon={Download} onClick={exportToCSV} hint={`${filtered.length} creators in the current view`}>Export to CSV</MenuItem>
                        <MenuItem icon={Upload} onClick={() => importInputRef.current?.click()} hint="Columns: name, email, phone, city, niche">
                            Import from CSV
                        </MenuItem>
                        {bangaloreCount > 0 && (
                            <MenuItem icon={MapPin} onClick={handleMergeBangalore} disabled={isMergingBangalore} hint={`${bangaloreCount} creators use “Bangalore”`}>
                                Rename Bangalore to Bengaluru
                            </MenuItem>
                        )}
                        <div className="my-1 border-t border-gray-100 dark:border-zinc-800" />
                        <MenuItem icon={Send} onClick={() => setCityInvite({ city: city !== 'all' ? city : 'Bengaluru', uids: null })} hint="Send city WhatsApp group links">
                            Send group invites
                        </MenuItem>
                        <MenuItem icon={Mail} onClick={() => setIsBroadcastOpen(true)} hint="Email an announcement to city groups">
                            Broadcast to groups
                        </MenuItem>
                        <MenuItem as={Link} to="/admin/creators/settings?tab=groups" icon={Settings}>City group settings</MenuItem>
                    </Menu>
                    <Button variant="primary" onClick={() => setIsAddModalOpen(true)}>
                        <Plus size={16} /> Add creator
                    </Button>
                    {/* Lives outside the menu so it stays mounted while the file picker is open. */}
                    <input ref={importInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleImportCSV} />
                </div>
            </div>

            <Card className="overflow-hidden">
                {/* Filters */}
                <div className="flex flex-col gap-2 border-b border-gray-200 p-3 dark:border-zinc-800">
                    <div className="flex min-w-0 gap-2 lg:max-w-2xl">
                        <Select
                            label="Search in"
                            value={field}
                            onChange={(v) => updateParams({ field: v })}
                            options={SEARCH_FIELDS.map(f => ({ value: f.id, label: f.label }))}
                            className="w-32 shrink-0"
                        />
                        <SearchInput value={searchDraft} onChange={setSearchDraft} placeholder={fieldMeta.placeholder} className="flex-1" />
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                        <Select label="City" value={city} onChange={(v) => updateParams({ city: v })} options={cityOptions} className="sm:w-40" />
                        <Select label="Niche" value={niche} onChange={(v) => updateParams({ niche: v })} options={nicheOptions} className="sm:w-44" />
                        {collegeOptions.length > 1 && (
                            <Select label="College" value={college} onChange={(v) => updateParams({ college: v })} options={collegeOptions} className="sm:w-48" />
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
                            className="sm:w-36"
                        />
                        <Select label="Followers" value={minFollowers} onChange={(v) => updateParams({ min: v })} options={FOLLOWER_PRESETS} className="sm:w-36" />
                        <Select label="Sort" value={sort} onChange={(v) => updateParams({ sort: v }, { keepPage: false })} options={SORTS} className="col-span-2 sm:w-36" />
                    </div>
                </div>

                {/* Result summary */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 bg-gray-50/60 px-4 py-2 text-sm text-gray-600 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-400">
                    <span>
                        {creatorsLoaded || creators.length ? (
                            <>{filtered.length.toLocaleString()} {filtered.length === 1 ? 'creator' : 'creators'}{hasFilters ? ` (of ${creators.length.toLocaleString()})` : ''}</>
                        ) : 'Loading creators…'}
                    </span>
                    <div className="flex flex-wrap items-center gap-3">
                        {status === 'pending' && counts.manualPending > 0 && (
                            <label className="inline-flex cursor-pointer items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={manualOnly}
                                    onChange={(e) => updateParams({ manual: e.target.checked ? '1' : '' })}
                                    className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-500"
                                />
                                Only manual follower counts ({counts.manualPending})
                            </label>
                        )}
                        {hasFilters && (
                            <button
                                type="button"
                                onClick={() => setSearchParams({}, { replace: true })}
                                className="font-medium text-gray-900 underline-offset-2 hover:underline dark:text-white"
                            >
                                Clear filters
                            </button>
                        )}
                    </div>
                </div>

                {/* Table */}
                {!creatorsLoaded && creators.length === 0 ? (
                    <div className="flex items-center justify-center py-20"><LoadingSpinner size="md" color="#71717a" /></div>
                ) : filtered.length === 0 ? (
                    <EmptyState
                        icon={creators.length ? Search : Users}
                        title={creators.length ? 'No creators match these filters' : 'No creators yet'}
                        description={creators.length ? 'Try a different search or clear the filters.' : 'Creators appear here once they apply at /creator/join, or you can add one manually.'}
                        action={creators.length
                            ? <Button onClick={() => setSearchParams({}, { replace: true })}>Clear filters</Button>
                            : <Button variant="primary" onClick={() => setIsAddModalOpen(true)}><Plus size={16} /> Add creator</Button>}
                    />
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="hidden border-b border-gray-200 text-xs font-medium text-gray-500 dark:border-zinc-800 dark:text-zinc-400 md:table-header-group">
                                    <tr>
                                        <th className="w-10 py-2.5 pl-4 pr-2">
                                            <input
                                                type="checkbox"
                                                aria-label="Select all on this page"
                                                checked={allPageSelected}
                                                onChange={togglePage}
                                                className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-500"
                                            />
                                        </th>
                                        <th className="px-2 py-2.5 font-medium">Creator</th>
                                        <th className="px-2 py-2.5 font-medium">City</th>
                                        <th className="hidden px-2 py-2.5 font-medium lg:table-cell">Niche / college</th>
                                        <th className="px-2 py-2.5 text-right font-medium">Followers</th>
                                        <th className="hidden px-2 py-2.5 font-medium xl:table-cell">Phone</th>
                                        <th className="px-2 py-2.5 font-medium">Status</th>
                                        <th className="hidden px-2 py-2.5 font-medium lg:table-cell">Joined</th>
                                        <th className="w-8 py-2.5 pr-4" />
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                                    {pageRows.map(c => (
                                        <CreatorRow
                                            key={creatorKey(c)}
                                            creator={c}
                                            selected={selected.has(creatorKey(c))}
                                            onToggle={() => toggleSelect(creatorKey(c))}
                                            onOpen={() => openCreator(c)}
                                        />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <Pagination
                            page={currentPage}
                            pageCount={pageCount}
                            total={filtered.length}
                            pageSize={PAGE_SIZE}
                            onChange={(p) => { updateParams({ page: p > 1 ? p : '' }, { keepPage: true }); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                        />
                    </>
                )}
            </Card>

            {/* Bulk action bar */}
            {selected.size > 0 && createPortal(
                <div className="fixed inset-x-0 bottom-4 z-[100] flex justify-center px-4 font-sans">
                    <div className="flex w-full max-w-3xl flex-col gap-2 rounded-xl border border-gray-200 bg-white p-3 shadow-xl dark:border-zinc-700 dark:bg-zinc-900 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-700 dark:text-zinc-300">
                            <span className="font-medium text-gray-900 dark:text-white">{selected.size} selected</span>
                            {selected.size < filtered.length && (
                                <button type="button" onClick={selectAllFiltered} className="underline-offset-2 hover:underline">
                                    Select all {filtered.length}
                                </button>
                            )}
                            <button type="button" onClick={() => setSelected(new Set())} className="underline-offset-2 hover:underline">Clear</button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Button size="sm" variant="secondary" onClick={handleBulkApprove} disabled={isBulkApproving}>
                                <Check size={14} /> {isBulkApproving ? 'Verifying…' : 'Verify'}
                            </Button>
                            <Button size="sm" variant="secondary" onClick={() => setCityInvite({ city: city !== 'all' ? city : 'Bengaluru', uids: [...selected] })}>
                                <Send size={14} /> WhatsApp invites
                            </Button>
                            <Button size="sm" variant="primary" onClick={() => setIsBulkEmailOpen(true)}>
                                <Mail size={14} /> Email
                            </Button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {selectedCreator && (
                <CreatorDetailModal
                    creator={selectedCreator}
                    onClose={closeCreator}
                    onUpdateStatus={handleUpdateStatus}
                    onDelete={handleDeleteCreator}
                    isUpdating={isUpdating}
                    isDeleting={isDeleting}
                />
            )}
            {isAddModalOpen && <AddCreatorModal onClose={() => setIsAddModalOpen(false)} />}
            {isBulkEmailOpen && (
                <BulkEmailModal
                    recipients={creators.filter(c => selected.has(creatorKey(c)))}
                    onClose={(sent) => { setIsBulkEmailOpen(false); if (sent) setSelected(new Set()); }}
                />
            )}
            {isBroadcastOpen && <BroadcastGroupsModal onClose={() => setIsBroadcastOpen(false)} />}
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

const CreatorRow = ({ creator: c, selected, onToggle, onOpen }) => {
    const handle = c.instagram ? `@${extractSocialUsername(c.instagram, 'instagram')}` : '';
    const reach = creatorReach(c);
    const manual = isManualFollowerEntry(c) && c.profileStatus !== 'approved';
    const collegeName = String(c.collegeName || '').trim();
    const needsCollege = !collegeName && creatorHasCollegeNiche(c);
    const stop = (e) => e.stopPropagation();

    return (
        <tr
            onClick={onOpen}
            className={cn(
                'group cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-zinc-800/50',
                selected && 'bg-sky-50/60 dark:bg-sky-500/5'
            )}
        >
            <td className="w-10 py-3 pl-4 pr-2 align-middle" onClick={stop}>
                <input
                    type="checkbox"
                    aria-label={`Select ${c.name || 'creator'}`}
                    checked={selected}
                    onChange={onToggle}
                    className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-500"
                />
            </td>
            <td className="px-2 py-3">
                <div className="flex min-w-0 items-center gap-3">
                    <Avatar src={creatorPhoto(c)} name={c.name} />
                    <div className="min-w-0">
                        <p className="truncate font-medium text-gray-900 dark:text-white">{c.name || 'Unnamed creator'}</p>
                        <p className="truncate text-xs text-gray-500 dark:text-zinc-400">
                            {handle ? (
                                <a
                                    href={buildSocialUrl(c.instagram, 'instagram')}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={stop}
                                    className="hover:text-gray-900 hover:underline dark:hover:text-white"
                                >
                                    {handle}
                                </a>
                            ) : (c.email || 'No contact')}
                        </p>
                        {/* Compact details on small screens */}
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-gray-500 dark:text-zinc-400 md:hidden">
                            <span>{c.city || 'No city'}</span>
                            <span>·</span>
                            <span>{formatCount(reach)} followers</span>
                            {collegeName && <><span>·</span><span className="truncate">{collegeName}</span></>}
                            <span className="ml-auto"><CreatorStatusBadge status={c.profileStatus} /></span>
                        </p>
                    </div>
                </div>
            </td>
            <td className="hidden px-2 py-3 text-gray-700 dark:text-zinc-300 md:table-cell">{c.city || '—'}</td>
            <td className="hidden max-w-[200px] px-2 py-3 text-gray-700 dark:text-zinc-300 lg:table-cell">
                <span className="block truncate">{creatorNiche(c) || '—'}</span>
                {collegeName ? (
                    <span className="block truncate text-xs text-gray-500 dark:text-zinc-400" title={collegeName}>{collegeName}</span>
                ) : needsCollege ? (
                    <span className="block text-xs text-amber-700 dark:text-amber-400">College missing</span>
                ) : null}
            </td>
            <td className="hidden px-2 py-3 text-right tabular-nums text-gray-900 dark:text-white md:table-cell">
                {formatCount(reach)}
                {manual && <span className="ml-1.5 align-middle"><Badge tone="amber">Manual</Badge></span>}
            </td>
            <td className="hidden px-2 py-3 xl:table-cell">
                <div className="flex items-center gap-2 text-gray-700 dark:text-zinc-300">
                    <span className="tabular-nums">{c.phone || '—'}</span>
                    {c.phone && (c.isPhoneVerified
                        ? <Check size={14} className="text-emerald-600 dark:text-emerald-400" aria-label="Phone verified" />
                        : <span className="text-xs text-amber-700 dark:text-amber-400">unverified</span>)}
                </div>
            </td>
            <td className="hidden px-2 py-3 md:table-cell"><CreatorStatusBadge status={c.profileStatus} /></td>
            <td className="hidden whitespace-nowrap px-2 py-3 text-gray-500 dark:text-zinc-400 lg:table-cell">{formatDate(c.createdAt) || '—'}</td>
            <td className="w-8 py-3 pr-4 text-gray-300 group-hover:text-gray-500 dark:text-zinc-600">
                <ChevronRight size={16} />
            </td>
        </tr>
    );
};

/* ── Referral leaderboard ─────────────────────────────────────────────────── */

const ReferralLeaderboard = ({ creators, onSelectCreator }) => {
    const [search, setSearch] = useState('');
    const [expanded, setExpanded] = useState(null);

    const leaderboard = useMemo(() => {
        const byUid = new Map();
        const byCreatorId = new Map();
        const byInstagram = new Map();
        const byLinkedin = new Map();
        creators.forEach(rc => {
            if (rc.uid) byUid.set(rc.uid, rc);
            if (rc.id) byUid.set(rc.id, rc);
            if (rc.creatorId) byCreatorId.set(String(rc.creatorId).toUpperCase(), rc);
            if (rc.instagram) byInstagram.set(String(rc.instagram).toLowerCase(), rc);
            if (rc.linkedin) byLinkedin.set(String(rc.linkedin).toLowerCase(), rc);
        });

        const referred = new Map();
        creators.forEach(c => {
            if (!c.referredBy) return;
            const ref = String(c.referredBy).trim();
            const referrer = byUid.get(ref) || byCreatorId.get(ref.toUpperCase()) ||
                byInstagram.get(ref.toLowerCase().replace(/^@/, '')) || byLinkedin.get(ref.toLowerCase());
            if (!referrer || creatorKey(referrer) === creatorKey(c)) return;
            const key = creatorKey(referrer);
            if (!referred.has(key)) referred.set(key, { referrer, list: [] });
            referred.get(key).list.push(c);
        });

        return [...referred.values()]
            .map(({ referrer, list }) => ({
                creator: referrer,
                referrals: list,
                verified: list.filter(r => r.profileStatus === 'approved').length,
                reach: list.reduce((sum, r) => sum + creatorReach(r), 0),
            }))
            .sort((a, b) => b.referrals.length - a.referrals.length || b.verified - a.verified);
    }, [creators]);

    const rows = useMemo(
        () => leaderboard.map((r, i) => ({ ...r, rank: i + 1 })).filter(r => matchesCreatorSearch(r.creator, search, 'all')),
        [leaderboard, search]
    );

    const totalReferred = creators.filter(c => c.referredBy).length;
    const top = leaderboard[0];

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Card className="p-4">
                    <p className="text-sm text-gray-500 dark:text-zinc-400">Referred sign-ups</p>
                    <p className="mt-1 text-2xl font-semibold tabular-nums">{totalReferred.toLocaleString()}</p>
                </Card>
                <Card className="p-4">
                    <p className="text-sm text-gray-500 dark:text-zinc-400">Creators who referred someone</p>
                    <p className="mt-1 text-2xl font-semibold tabular-nums">{leaderboard.length.toLocaleString()}</p>
                </Card>
                <Card className="p-4">
                    <p className="text-sm text-gray-500 dark:text-zinc-400">Top referrer</p>
                    <p className="mt-1 truncate text-2xl font-semibold">{top ? top.creator.name : '—'}</p>
                    {top && <p className="text-xs text-gray-500 dark:text-zinc-400">{top.referrals.length} referrals</p>}
                </Card>
            </div>

            <Card className="overflow-hidden">
                <div className="border-b border-gray-200 p-3 dark:border-zinc-800">
                    <SearchInput value={search} onChange={setSearch} placeholder="Search referrers" className="max-w-md" />
                </div>
                {rows.length === 0 ? (
                    <EmptyState
                        icon={Trophy}
                        title={leaderboard.length ? 'No referrers match your search' : 'No referrals yet'}
                        description={leaderboard.length ? undefined : 'When creators share their invite link (/creator/join?ref=…), sign-ups show up here.'}
                    />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="border-b border-gray-200 text-xs text-gray-500 dark:border-zinc-800 dark:text-zinc-400">
                                <tr>
                                    <th className="w-14 py-2.5 pl-4 font-medium">Rank</th>
                                    <th className="px-2 py-2.5 font-medium">Creator</th>
                                    <th className="px-2 py-2.5 text-right font-medium">Referrals</th>
                                    <th className="hidden px-2 py-2.5 text-right font-medium sm:table-cell">Verified</th>
                                    <th className="hidden px-2 py-2.5 text-right font-medium md:table-cell">Referred reach</th>
                                    <th className="w-24 py-2.5 pr-4" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                                {rows.map(r => {
                                    const key = creatorKey(r.creator);
                                    const isOpen = expanded === key;
                                    return (
                                        <React.Fragment key={key}>
                                            <tr className="hover:bg-gray-50 dark:hover:bg-zinc-800/50">
                                                <td className="py-3 pl-4 font-medium tabular-nums text-gray-500 dark:text-zinc-400">#{r.rank}</td>
                                                <td className="px-2 py-3">
                                                    <button type="button" onClick={() => onSelectCreator(r.creator)} className="flex min-w-0 items-center gap-3 text-left">
                                                        <Avatar src={creatorPhoto(r.creator)} name={r.creator.name} size={32} />
                                                        <span className="min-w-0">
                                                            <span className="block truncate font-medium text-gray-900 hover:underline dark:text-white">{r.creator.name}</span>
                                                            <span className="block truncate text-xs text-gray-500 dark:text-zinc-400">{r.creator.city || '—'} · ID {r.creator.creatorId || '—'}</span>
                                                        </span>
                                                    </button>
                                                </td>
                                                <td className="px-2 py-3 text-right font-medium tabular-nums">{r.referrals.length}</td>
                                                <td className="hidden px-2 py-3 text-right tabular-nums text-gray-600 dark:text-zinc-400 sm:table-cell">{r.verified}</td>
                                                <td className="hidden px-2 py-3 text-right tabular-nums text-gray-600 dark:text-zinc-400 md:table-cell">{formatCount(r.reach)}</td>
                                                <td className="py-3 pr-4 text-right">
                                                    <Button size="sm" variant="ghost" onClick={() => setExpanded(isOpen ? null : key)} aria-expanded={isOpen}>
                                                        {isOpen ? 'Hide' : 'View'} <ChevronDown size={14} className={cn('transition-transform', isOpen && 'rotate-180')} />
                                                    </Button>
                                                </td>
                                            </tr>
                                            {isOpen && (
                                                <tr className="bg-gray-50/70 dark:bg-zinc-900/70">
                                                    <td />
                                                    <td colSpan={5} className="px-2 py-3 pr-4">
                                                        <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
                                                            {r.referrals.map(rc => (
                                                                <li key={creatorKey(rc)}>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => onSelectCreator(rc)}
                                                                        className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-zinc-800"
                                                                    >
                                                                        <Avatar src={creatorPhoto(rc)} name={rc.name} size={28} />
                                                                        <span className="min-w-0 flex-1 truncate">{rc.name}</span>
                                                                        <span className="hidden text-xs text-gray-500 dark:text-zinc-400 sm:inline">{rc.city || '—'}</span>
                                                                        <span className="hidden text-xs tabular-nums text-gray-500 dark:text-zinc-400 sm:inline">{formatCount(creatorReach(rc))}</span>
                                                                        <CreatorStatusBadge status={rc.profileStatus} />
                                                                    </button>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
        </div>
    );
};

/* ── Bulk email ───────────────────────────────────────────────────────────── */

const BulkEmailModal = ({ recipients, onClose }) => {
    const [subject, setSubject] = useState('Partnership update from Newbi Entertainment');
    const [body, setBody] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0 });
    const withEmail = recipients.filter(c => c.email);
    const withoutEmail = recipients.length - withEmail.length;

    const handleSend = async (e) => {
        e.preventDefault();
        if (!subject.trim() || !body.trim()) {
            useStore.getState().addToast('Add a subject and a message.', 'warning');
            return;
        }
        setIsSending(true);
        setProgress({ current: 0, total: withEmail.length });
        let sent = 0;
        let failed = 0;
        for (let i = 0; i < withEmail.length; i++) {
            const c = withEmail[i];
            setProgress({ current: i + 1, total: withEmail.length });
            try {
                const res = await sendCreatorDirectEmail(c.email, subject, body, c.name);
                if (res?.success) sent++; else failed++;
            } catch {
                failed++;
            }
        }
        setIsSending(false);
        useStore.getState().addToast(`Emails sent: ${sent}${failed ? `, failed: ${failed}` : ''}.`, failed ? 'warning' : 'success');
        onClose(true);
    };

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 font-sans">
            <div className="absolute inset-0 bg-black/40" onClick={() => !isSending && onClose(false)} />
            <div className="relative max-h-[90dvh] w-full max-w-xl overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
                <div className="flex items-start justify-between gap-4 border-b border-gray-200 p-5 dark:border-zinc-800">
                    <div>
                        <h3 className="text-base font-semibold text-gray-900 dark:text-white">Email {withEmail.length} creator{withEmail.length === 1 ? '' : 's'}</h3>
                        {withoutEmail > 0 && (
                            <p className="mt-0.5 text-sm text-amber-700 dark:text-amber-400">{withoutEmail} selected creator{withoutEmail === 1 ? ' has' : 's have'} no email and will be skipped.</p>
                        )}
                    </div>
                    <button type="button" onClick={() => !isSending && onClose(false)} className="rounded p-1 text-gray-400 hover:text-gray-700 dark:hover:text-zinc-200" aria-label="Close">
                        <X size={18} />
                    </button>
                </div>

                {isSending ? (
                    <div className="space-y-3 p-8 text-center">
                        <LoadingSpinner size="md" color="#71717a" />
                        <p className="text-sm text-gray-700 dark:text-zinc-300">Sending {progress.current} of {progress.total}…</p>
                        <div className="mx-auto h-1.5 max-w-sm overflow-hidden rounded-full bg-gray-100 dark:bg-zinc-800">
                            <div className="h-full bg-gray-900 transition-all dark:bg-white" style={{ width: `${progress.total ? (progress.current / progress.total) * 100 : 0}%` }} />
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSend} className="space-y-4 p-5">
                        <div>
                            <p className="mb-1.5 text-sm font-medium text-gray-700 dark:text-zinc-300">Recipients</p>
                            <div className="flex max-h-28 flex-wrap gap-1.5 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-2 dark:border-zinc-800 dark:bg-zinc-950">
                                {withEmail.map(c => <Badge key={creatorKey(c)}>{c.name || c.email}</Badge>)}
                            </div>
                        </div>
                        <label className="block">
                            <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-zinc-300">Subject</span>
                            <input
                                required
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                className="h-9 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                            />
                        </label>
                        <label className="block">
                            <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-zinc-300">Message</span>
                            <textarea
                                required
                                value={body}
                                onChange={(e) => setBody(e.target.value)}
                                rows={8}
                                placeholder="Write your message…"
                                className="w-full rounded-lg border border-gray-300 bg-white p-3 text-sm text-gray-900 focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                            />
                        </label>
                        <div className="flex justify-end gap-2">
                            <Button onClick={() => onClose(false)}>Cancel</Button>
                            <Button type="submit" variant="primary" disabled={withEmail.length === 0}>
                                <Mail size={15} /> Send email
                            </Button>
                        </div>
                    </form>
                )}
            </div>
        </div>,
        document.body
    );
};

export default CreatorManager;
