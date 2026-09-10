import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '../../lib/store';
import { useStoreSubscription } from '../../hooks/useStoreSubscription';
import { PREDEFINED_CITIES } from '../../lib/constants';
import Users from 'lucide-react/dist/esm/icons/users';
import Search from 'lucide-react/dist/esm/icons/search';
import MapPin from 'lucide-react/dist/esm/icons/map-pin';
import Instagram from 'lucide-react/dist/esm/icons/instagram';
import Mail from 'lucide-react/dist/esm/icons/mail';
import Phone from 'lucide-react/dist/esm/icons/phone';
import ExternalLink from 'lucide-react/dist/esm/icons/external-link';
import XCircle from 'lucide-react/dist/esm/icons/x-circle';
import Activity from 'lucide-react/dist/esm/icons/activity';
import ArrowLeft from 'lucide-react/dist/esm/icons/arrow-left';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import Ban from 'lucide-react/dist/esm/icons/ban';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import Filter from 'lucide-react/dist/esm/icons/filter';
import Globe from 'lucide-react/dist/esm/icons/globe';
import Youtube from 'lucide-react/dist/esm/icons/youtube';
import Linkedin from 'lucide-react/dist/esm/icons/linkedin';
import Twitter from 'lucide-react/dist/esm/icons/twitter';
import Zap from 'lucide-react/dist/esm/icons/zap';
import X from 'lucide-react/dist/esm/icons/x';
import Clock from 'lucide-react/dist/esm/icons/clock';
import LayoutGrid from 'lucide-react/dist/esm/icons/layout-grid';
import FileSpreadsheet from 'lucide-react/dist/esm/icons/file-spreadsheet';
import Download from 'lucide-react/dist/esm/icons/download';
import FileText from 'lucide-react/dist/esm/icons/file-text';
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down';
import ChevronUp from 'lucide-react/dist/esm/icons/chevron-up';
import ChevronLeft from 'lucide-react/dist/esm/icons/chevron-left';
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right';
import TrendingUp from 'lucide-react/dist/esm/icons/trending-up';
import Star from 'lucide-react/dist/esm/icons/star';
import Mic2 from 'lucide-react/dist/esm/icons/mic-2';
import Layers from 'lucide-react/dist/esm/icons/layers';
import Target from 'lucide-react/dist/esm/icons/target';
import Check from 'lucide-react/dist/esm/icons/check';
import Calendar from 'lucide-react/dist/esm/icons/calendar';
import CheckCircle2 from 'lucide-react/dist/esm/icons/check-circle-2';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, normalizePhoneNumber } from '../../lib/utils';
import AdminDashboardLink from '../../components/admin/AdminDashboardLink';
import AdminCommunityHubLayout from '../../components/admin/AdminCommunityHubLayout';

import StudioSelect from '../../components/ui/StudioSelect';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import Plus from 'lucide-react/dist/esm/icons/plus';
import Upload from 'lucide-react/dist/esm/icons/upload';
import Trophy from 'lucide-react/dist/esm/icons/trophy';
import MessageSquare from 'lucide-react/dist/esm/icons/message-square';
import Send from 'lucide-react/dist/esm/icons/send';
import { getEarnedBadges, getVerifiedTasksCount, getReferralsForCreator } from '../../lib/badges';
import { sendCreatorDirectEmail } from '../../lib/email';

const getPageNumbers = (currentPage, totalPages) => {
    const pages = [];
    const delta = 2;
    
    if (totalPages <= 7) {
        for (let i = 1; i <= totalPages; i++) {
            pages.push(i);
        }
    } else {
        const left = currentPage - delta;
        const right = currentPage + delta;
        const range = [];
        let l;

        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= left && i <= right)) {
                range.push(i);
            }
        }

        for (let i of range) {
            if (l) {
                if (i - l === 2) {
                    pages.push(l + 1);
                } else if (i - l > 2) {
                    pages.push('...');
                }
            }
            pages.push(i);
            l = i;
        }
    }
    return pages;
};

const CreatorManager = ({ showLeaderboardOnly = false, isEmbedded = false }) => {
    useStoreSubscription(['creators', 'campaigns']);
    const { creators, campaigns, updateCreator, deleteCreator } = useStore();
    const navigate = useNavigate();
    const location = useLocation();
    const params = useParams();
    const isLeaderboardRoute = location.pathname.includes('/leaderboard') || showLeaderboardOnly;
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 12;

    const [filterCity, setFilterCity] = useState('All');
    const [filterStatus, setFilterStatus] = useState('All');
    const [filterNiche, setFilterNiche] = useState('All');
    const [filterPlatform, setFilterPlatform] = useState('All');
    const [minFollowers, setMinFollowers] = useState('');
    const [maxFollowers, setMaxFollowers] = useState('');
    const [isFollowersOpen, setIsFollowersOpen] = useState(false);
    const followersRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (followersRef.current && !followersRef.current.contains(event.target)) {
                setIsFollowersOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const [selectedCreator, setSelectedCreator] = useState(null);
    const [isUpdating, setIsUpdating] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [viewMode, setViewMode] = useState('grid'); 
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedUids, setSelectedUids] = useState([]);
    const [isBulkEmailModalOpen, setIsBulkEmailModalOpen] = useState(false);

    const handleToggleSelect = (uid) => {
        setSelectedUids(prev => 
            prev.includes(uid) 
                ? prev.filter(id => id !== uid) 
                : [...prev, uid]
        );
    };
    const handleDeselectAll = () => setSelectedUids([]);

    const handleImportCSV = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            const csvText = event.target.result;
            const lines = csvText.split('\n').filter(line => line.trim() !== '');
            if (lines.length < 2) {
                useStore.getState().addToast("CSV file is empty or invalid.", 'error');
                return;
            }

            // Parse headers
            const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim().toLowerCase());
            
            const creatorsToImport = [];
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i];
                // Regex to split by comma but respect quotes
                const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
                const values = matches.map(val => val.replace(/(^"|"$)/g, '').trim());
                
                const row = {};
                headers.forEach((header, idx) => {
                    row[header] = values[idx] || '';
                });

                const name = row['name'] || row['full name'] || '';
                const email = row['email'] || row['email id'] || '';
                const phone = row['phone'] || row['mobile'] || row['contact'] || '';
                const city = row['city'] || row['location'] || '';
                const instagram = row['instagram'] || row['handle'] || '';
                const instagramFollowers = row['followers'] || row['instagram followers'] || '0';
                const niche = row['niche'] || row['specialization'] || row['category'] || '';
                const collegeName = row['college'] || row['college name'] || '';
                const bio = row['bio'] || row['description'] || '';
                
                if (!name || !email || !phone || !niche || !city) {
                    continue; // Skip invalid rows
                }

                let cleanInstagram = instagram.trim();
                if (cleanInstagram.includes('/')) {
                    const parts = cleanInstagram.split('/');
                    cleanInstagram = parts[parts.length - 1] || parts[parts.length - 2] || '';
                    cleanInstagram = cleanInstagram.split('?')[0];
                }
                cleanInstagram = cleanInstagram.replace(/^@/, '');

                creatorsToImport.push({
                    uid: `imported_${Math.random().toString(36).substring(2, 15)}`,
                    name,
                    email,
                    phone,
                    city,
                    categories: niche,
                    specializations: [niche],
                    instagram: cleanInstagram,
                    instagramFollowers,
                    collegeName,
                    bio,
                    profileStatus: 'approved',
                    isPhoneVerified: true
                });
            }

            if (creatorsToImport.length === 0) {
                useStore.getState().addToast("No valid creators found to import.", 'error');
                return;
            }

            try {
                const { addCreator } = useStore.getState();
                await Promise.all(creatorsToImport.map(c => addCreator(c, false)));
                useStore.getState().addToast(`Imported ${creatorsToImport.length} creators successfully!`, 'success');
            } catch (err) {
                console.error("CSV Import error:", err);
                useStore.getState().addToast("Failed to import creators.", 'error');
            }
        };
        reader.readAsText(file);
        e.target.value = null; // reset input
    };

    const personnelTabs = [
        { name: 'Creators', path: '/admin/creators', icon: Star },
        { name: 'Campaigns', path: '/admin/campaigns', icon: Target },
        { name: 'Leaderboard', path: '/admin/creators/leaderboard', icon: Trophy },
    ];

    const cities = ['All', ...new Set([...PREDEFINED_CITIES, ...creators.map(c => c.city)])];

    useEffect(() => {
        if (params.id && creators.length > 0) {
            const found = creators.find(c => c.uid === params.id);
            if (found) {
                setSelectedCreator(found);
            }
        } else if (!params.id) {
            setSelectedCreator(null);
        }
    }, [params.id, creators]);

    const filteredCreators = useMemo(() => {
        return creators.filter(c => {
            const specs = c.specializations || c.niches || [];
            const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (c.instagram && c.instagram.toLowerCase().includes(searchTerm.toLowerCase())) ||
                specs.some(n => n.toLowerCase().includes(searchTerm.toLowerCase()));
            const matchesCity = filterCity === 'All' || c.city === filterCity;
            const matchesStatus = filterStatus === 'All' || 
                (filterStatus === 'pending' && (!c.profileStatus || c.profileStatus === 'pending')) ||
                c.profileStatus === filterStatus;
            
            const matchesNiche = filterNiche === 'All' || specs.some(n => {
                const normalizedNiche = n === 'Student Creator/ Campus Creator' ? 'Student/ Campus Creator' : n;
                return normalizedNiche === filterNiche;
            });
                
            const followers = Math.max(Number(c.instagramFollowers || 0), Number(c.youtubeSubscribers || 0), Number(c.linkedinFollowers || 0));
            const matchesMin = !minFollowers || followers >= Number(minFollowers);
            const matchesMax = !maxFollowers || followers <= Number(maxFollowers);
            const matchesFollowers = matchesMin && matchesMax;

            const matchesPlatform = filterPlatform === 'All' ||
                (filterPlatform === 'instagram' && c.instagram && c.instagram.trim() !== '') ||
                (filterPlatform === 'linkedin' && c.linkedin && c.linkedin.trim() !== '') ||
                (filterPlatform === 'youtube' && c.youtube && c.youtube.trim() !== '');

            return matchesSearch && matchesCity && matchesStatus && matchesNiche && matchesFollowers && matchesPlatform;
        });
    }, [creators, searchTerm, filterCity, filterStatus, filterNiche, minFollowers, maxFollowers, filterPlatform]);

    const getFollowersLabel = () => {
        if (!minFollowers && !maxFollowers) return 'FOLLOWERS (ANY)';
        
        const formatNum = (num) => {
            const n = Number(num);
            if (n >= 1000000) return `${(n / 1000000).toFixed(1).replace(/\.0$/, '')}M`;
            if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K`;
            return n.toLocaleString();
        };

        if (minFollowers && !maxFollowers) return `${formatNum(minFollowers)}+`;
        if (!minFollowers && maxFollowers) return `< ${formatNum(maxFollowers)}`;
        return `${formatNum(minFollowers)} - ${formatNum(maxFollowers)}`;
    };

    const totalPages = Math.ceil(filteredCreators.length / itemsPerPage);
    const paginatedCreators = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredCreators.slice(start, start + itemsPerPage);
    }, [filteredCreators, currentPage]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filterCity, filterStatus, filterNiche, minFollowers, maxFollowers, filterPlatform]);

    const stats = useMemo(() => {
        const approvedCount = creators.filter(c => c.profileStatus === 'approved').length;
        const totalFollowers = creators.reduce((sum, c) => sum + Math.max(Number(c.instagramFollowers || 0), Number(c.youtubeSubscribers || 0), Number(c.linkedinFollowers || 0)), 0);
        
        return {
            total: creators.length,
            approved: approvedCount,
            pending: creators.filter(c => !c.profileStatus || c.profileStatus === 'pending').length,
            followers: totalFollowers
        };
    }, [creators]);

    const handleUpdateStatus = async (uid, newStatus) => {
        setIsUpdating(true);
        try {
            await updateCreator(uid, { profileStatus: newStatus });
            if (selectedCreator && selectedCreator.uid === uid) {
                setSelectedCreator({ ...selectedCreator, profileStatus: newStatus });
            }
        } catch (error) {
            useStore.getState().addToast("Couldn't update the status. Please try again.", 'error');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleDeleteCreator = async (uid) => {
        if (window.confirm("Permanently delete this creator profile?")) {
            setIsDeleting(true);
            try {
                await deleteCreator(uid);
                navigate('/admin/creators');
            } catch (error) {
                useStore.getState().addToast("Couldn't delete the creator. Please try again.", 'error');
            } finally {
                setIsDeleting(false);
            }
        }
    };
    
    const exportToCSV = () => {
        const headers = ['Name', 'Email', 'Phone', 'City', 'Instagram', 'Instagram Followers', 'LinkedIn', 'LinkedIn Connections', 'YouTube', 'YouTube Subs', 'Specializations', 'Status'];
        const csvRows = [
            headers.join(','),
            ...filteredCreators.map(c => [
                `"${(c.name || '').replace(/"/g, '""')}"`,
                `"${(c.email || '').replace(/"/g, '""')}"`,
                `"${(c.phone || '').replace(/"/g, '""')}"`,
                `"${(c.city || '').replace(/"/g, '""')}"`,
                `"${c.instagram ? (c.instagram.includes('http') ? c.instagram : `https://instagram.com/${c.instagram.replace(/^@/, '').trim()}`) : ''}"`,
                `"${c.instagramFollowers || 0}"`,
                `"${c.linkedin ? (c.linkedin.includes('http') ? c.linkedin : `https://${c.linkedin}`) : ''}"`,
                `"${c.linkedinFollowers || 0}"`,
                `"${c.youtube || ''}"`,
                `"${c.youtubeSubscribers || 0}"`,
                `"${(c.specializations || c.niches || []).join(', ').replace(/"/g, '""')}"`,
                `"${c.profileStatus || 'pending'}"`
            ].join(','))
        ];
        
        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `NEWBI_CREATORS_EXPORT_${filterCity.toUpperCase()}_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const resetAllFilters = () => {
        setSearchTerm('');
        setFilterCity('All');
        setFilterStatus('All');
        setFilterNiche('All');
        setFilterPlatform('All');
        setMinFollowers('');
        setMaxFollowers('');
    };

    const hasActiveFilters = Boolean(
        searchTerm ||
        filterCity !== 'All' ||
        filterStatus !== 'All' ||
        filterNiche !== 'All' ||
        filterPlatform !== 'All' ||
        minFollowers ||
        maxFollowers
    );

    const scrollContainer = (id, direction) => {
        const el = document.getElementById(id);
        if (el) {
            const amount = direction === 'left' ? -350 : 350;
            el.scrollBy({ left: amount, behavior: 'smooth' });
        }
    };

    const renderContent = () => {
        if (isLeaderboardRoute) {
            return (
                <ReferralLeaderboard 
                    creators={creators} 
                    onSelectCreator={(c) => navigate(`/admin/creators/${c.uid}`)} 
                />
            );
        }
        return (
            <div className={cn("relative z-10 max-w-[1700px] mx-auto pb-20", isEmbedded ? "px-4 md:px-12 pt-6" : "")}>
            <div>
                {/* Control Panel */}
                <div className="relative z-50 bg-white/[0.02] border border-white/[0.06] rounded-2xl p-3 sm:p-4 mb-6 md:mb-8 space-y-3">
                    
                    {/* Row 1: Search Engine & Action Bar */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3">
                        {/* Search Input */}
                        <div className="relative flex-1 min-w-0">
                            <Search className="absolute left-3.5 sm:left-4 top-1/2 -translate-y-1/2 text-gray-900 dark:text-white/20" size={14} />
                            <input
                                type="text"
                                placeholder="Search creators..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full h-10 pl-9 sm:pl-10 pr-9 bg-white dark:bg-black/30 border border-white/[0.06] focus:border-black/20 dark:focus:border-white/20 rounded-xl text-xs font-medium outline-none transition-all placeholder:text-gray-900 dark:placeholder:text-white/15 text-gray-900 dark:text-white min-w-0"
                            />
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-900 dark:text-white/20 hover:text-gray-900 dark:hover:text-white transition-colors"
                                >
                                    <X size={13} />
                                </button>
                            )}
                        </div>

                        {/* Action Controls Cluster */}
                        <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
                            <div className="flex items-center gap-1.5 sm:gap-2">
                                {/* View Switcher */}
                                <div className="flex bg-white dark:bg-black/30 p-0.5 rounded-xl border border-white/[0.06] shrink-0 h-10 items-center">
                                    <button 
                                        onClick={() => setViewMode('grid')} 
                                        title="Grid View"
                                        className={cn(
                                            "w-9 h-9 rounded-lg flex items-center justify-center transition-all", 
                                            viewMode === 'grid' ? "bg-black/10 dark:bg-white/10 text-gray-900 dark:text-white" : "text-gray-900 dark:text-white/25 hover:text-gray-900 dark:hover:text-white/50"
                                        )}
                                    >
                                        <LayoutGrid size={14} />
                                    </button>
                                    <button 
                                        onClick={() => setViewMode('list')} 
                                        title="List View"
                                        className={cn(
                                            "w-9 h-9 rounded-lg flex items-center justify-center transition-all", 
                                            viewMode === 'list' ? "bg-black/10 dark:bg-white/10 text-gray-900 dark:text-white" : "text-gray-900 dark:text-white/25 hover:text-gray-900 dark:hover:text-white/50"
                                        )}
                                    >
                                        <FileSpreadsheet size={14} />
                                    </button>
                                </div>

                                {/* Export CSV */}
                                <button 
                                    onClick={exportToCSV}
                                    className="h-10 px-2.5 sm:px-4 bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] text-gray-900 dark:text-white/60 hover:text-gray-900 dark:hover:text-white rounded-xl font-bold uppercase tracking-wider text-[9px] transition-all flex items-center justify-center gap-1.5 shrink-0"
                                    title="Export Creators to CSV"
                                >
                                    <Download size={13} />
                                    <span className="hidden xs:inline sm:inline">Export</span>
                                </button>

                                {/* Import Sheet */}
                                <label 
                                    className="h-10 px-2.5 sm:px-4 bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] text-gray-900 dark:text-white/60 hover:text-gray-900 dark:hover:text-white rounded-xl font-bold uppercase tracking-wider text-[9px] transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
                                    title="Import Creators from CSV"
                                >
                                    <Upload size={13} />
                                    <span className="hidden xs:inline sm:inline">Import</span>
                                    <input type="file" accept=".csv" onChange={handleImportCSV} className="hidden" />
                                </label>
                            </div>

                            {/* Add Creator */}
                            <button 
                                onClick={() => setIsAddModalOpen(true)}
                                className="h-10 px-3.5 sm:px-5 bg-white text-black hover:bg-neon-pink rounded-xl font-bold uppercase tracking-wider text-[9px] transition-all flex items-center justify-center gap-1.5 shrink-0"
                            >
                                <Plus size={14} />
                                <span className="whitespace-nowrap">Add Creator</span>
                            </button>
                        </div>
                    </div>

                    {/* Row 2: Filter Toolbar (2-column balanced grid on mobile, inline flex on desktop) */}
                    <div className="pt-2.5 border-t border-white/[0.04] grid grid-cols-2 sm:grid-cols-3 lg:flex lg:flex-nowrap items-center gap-2">
                        
                        {/* Filter Indicator Label */}
                        <div className="hidden xl:flex items-center gap-1.5 px-2 text-[9px] font-black uppercase tracking-widest text-gray-500 shrink-0 select-none">
                            <Filter size={12} className="text-neon-pink" />
                            <span>FILTERS:</span>
                        </div>

                        {/* Custom Followers Range Popover Selector */}
                        <div className="relative col-span-1 sm:flex-1 sm:min-w-[130px]" ref={followersRef}>
                            <div 
                                onClick={() => setIsFollowersOpen(!isFollowersOpen)}
                                className={cn(
                                    "flex items-center justify-between h-10 bg-white dark:bg-black/40 border border-white/[0.06] rounded-xl px-3 cursor-pointer hover:border-black/20 dark:hover:border-white/20 transition-all group select-none",
                                    isFollowersOpen && "border-neon-pink/40"
                                )}
                            >
                                <span className={cn(
                                    "text-[9px] font-bold uppercase tracking-wider truncate leading-none",
                                    (!minFollowers && !maxFollowers) ? "text-gray-900 dark:text-white/40" : "text-gray-900 dark:text-white"
                                )}
                                title={getFollowersLabel()}
                                >
                                    {getFollowersLabel()}
                                </span>
                                <ChevronDown 
                                    size={12} 
                                    className={cn(
                                        "transition-all duration-300 shrink-0 ml-1.5 text-gray-900 dark:text-white/30 group-hover:text-gray-900 dark:group-hover:text-white/50",
                                        isFollowersOpen && "rotate-180 text-neon-pink"
                                    )} 
                                />
                            </div>

                            <AnimatePresence>
                                {isFollowersOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        className="absolute z-[100] left-0 mt-2 w-[calc(100vw-2.5rem)] sm:w-[260px] max-w-[280px] bg-[#0a0a0a]/95 backdrop-blur-2xl border border-black/10 dark:border-white/10 rounded-2xl shadow-2xl p-4 sm:p-5 space-y-3"
                                    >
                                        <div className="space-y-1">
                                            <p className="text-[9px] font-bold text-gray-900 dark:text-white/40 uppercase tracking-wider">Follower Range</p>
                                        </div>
                                        <div className="flex gap-2 items-center">
                                            <div className="space-y-1 flex-1">
                                                <label className="text-[7px] font-bold text-gray-900 dark:text-white/30 uppercase tracking-wider pl-0.5">Min</label>
                                                <input 
                                                    type="number" 
                                                    value={minFollowers} 
                                                    onChange={(e) => setMinFollowers(e.target.value)}
                                                    placeholder="0" 
                                                    className="w-full h-9 bg-white dark:bg-black/40 border border-black/10 dark:border-white/10 rounded-lg px-2 text-xs font-bold text-gray-900 dark:text-white focus:border-neon-pink outline-none transition-all"
                                                />
                                            </div>
                                            <span className="text-gray-900 dark:text-white/20 text-xs font-bold pt-4">-</span>
                                            <div className="space-y-1 flex-1">
                                                <label className="text-[7px] font-bold text-gray-900 dark:text-white/30 uppercase tracking-wider pl-0.5">Max</label>
                                                <input 
                                                    type="number" 
                                                    value={maxFollowers} 
                                                    onChange={(e) => setMaxFollowers(e.target.value)}
                                                    placeholder="Any" 
                                                    className="w-full h-9 bg-white dark:bg-black/40 border border-black/10 dark:border-white/10 rounded-lg px-2 text-xs font-bold text-gray-900 dark:text-white focus:border-neon-pink outline-none transition-all"
                                                />
                                            </div>
                                        </div>

                                        <div className="h-px bg-black/5 dark:bg-white/5" />

                                        {/* Preset quick ranges */}
                                        <div className="space-y-1.5">
                                            <p className="text-[7px] font-bold text-gray-900 dark:text-white/30 uppercase tracking-wider pl-0.5">Presets</p>
                                            <div className="grid grid-cols-2 gap-1.5">
                                                {[
                                                    { label: '0 - 10K', min: '0', max: '10000' },
                                                    { label: '10K - 50K', min: '10000', max: '50000' },
                                                    { label: '50K - 100K', min: '50000', max: '100000' },
                                                    { label: '100K - 500K', min: '100000', max: '500000' },
                                                    { label: '500K - 1M', min: '500000', max: '1000000' },
                                                    { label: '1M+', min: '1000000', max: '' },
                                                ].map((p, idx) => (
                                                    <button
                                                        key={idx}
                                                        type="button"
                                                        onClick={() => {
                                                             setMinFollowers(p.min);
                                                             setMaxFollowers(p.max);
                                                        }}
                                                        className="px-2.5 py-1.5 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/5 hover:border-neon-pink/20 hover:bg-neon-pink/5 hover:text-neon-pink rounded-lg text-[8px] font-bold uppercase tracking-wider text-gray-900 dark:text-white/50 transition-all text-center"
                                                    >
                                                        {p.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="flex gap-2 pt-1 select-none">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setMinFollowers('');
                                                    setMaxFollowers('');
                                                    setIsFollowersOpen(false);
                                                }}
                                                className="flex-1 py-1.5 rounded-lg border border-black/10 dark:border-white/5 hover:bg-black/5 dark:hover:bg-white/5 text-[8px] font-bold uppercase tracking-wider text-gray-900 dark:text-white/40 hover:text-gray-900 dark:hover:text-white transition-all text-center"
                                            >
                                                Reset
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setIsFollowersOpen(false)}
                                                className="flex-1 py-1.5 rounded-lg bg-neon-pink text-black text-[8px] font-bold uppercase tracking-wider transition-all text-center hover:brightness-110 active:scale-95"
                                            >
                                                Apply
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Niche Filter */}
                        <div className="col-span-1 sm:flex-1 sm:min-w-[130px]">
                            <StudioSelect 
                                value={filterNiche} 
                                options={['All', ...NICHES].map(n => ({ value: n, label: n === 'All' ? 'NICHE' : n.toUpperCase() }))} 
                                onChange={setFilterNiche} 
                                className="w-full min-w-0 h-10 rounded-xl border-white/[0.06] bg-white dark:bg-black/40 text-[9px]" 
                                accentColor="neon-pink" 
                                classNamePrefix="studio-select"
                            />
                        </div>

                        {/* Location Filter */}
                        <div className="col-span-1 sm:flex-1 sm:min-w-[130px]">
                            <StudioSelect 
                                value={filterCity} 
                                options={cities.map(c => ({ value: c, label: c === 'All' ? 'LOCATION' : c.toUpperCase() }))} 
                                onChange={setFilterCity} 
                                className="w-full min-w-0 h-10 rounded-xl border-white/[0.06] bg-white dark:bg-black/40 text-[9px]" 
                                accentColor="neon-blue" 
                                classNamePrefix="studio-select"
                            />
                        </div>

                        {/* Status Filter */}
                        <div className="col-span-1 sm:flex-1 sm:min-w-[120px]">
                            <StudioSelect 
                                value={filterStatus} 
                                options={[
                                    { value: 'All', label: 'STATUS' }, 
                                    { value: 'approved', label: 'VERIFIED' }, 
                                    { value: 'pending', label: 'PENDING' }, 
                                    { value: 'rejected', label: 'REJECTED' }
                                ]} 
                                onChange={setFilterStatus} 
                                className="w-full min-w-0 h-10 rounded-xl border-white/[0.06] bg-white dark:bg-black/40 text-[9px]" 
                                accentColor="neon-green" 
                                classNamePrefix="studio-select"
                            />
                        </div>

                        {/* Platform Filter */}
                        <div className="col-span-1 sm:flex-1 sm:min-w-[120px]">
                            <StudioSelect 
                                value={filterPlatform} 
                                options={[
                                    { value: 'All', label: 'PLATFORM' }, 
                                    { value: 'instagram', label: 'INSTAGRAM' }, 
                                    { value: 'linkedin', label: 'LINKEDIN' },
                                    { value: 'youtube', label: 'YOUTUBE' }
                                ]} 
                                onChange={setFilterPlatform} 
                                className="w-full min-w-0 h-10 rounded-xl border-white/[0.06] bg-white dark:bg-black/40 text-[9px]" 
                                accentColor="neon-blue" 
                                classNamePrefix="studio-select"
                            />
                        </div>

                        {/* 6th Slot on Mobile Grid: Reset Button if active, or Count pill */}
                        {hasActiveFilters ? (
                            <button
                                onClick={resetAllFilters}
                                className="col-span-1 sm:col-auto h-10 px-3.5 rounded-xl bg-neon-pink/10 border border-neon-pink/30 hover:bg-neon-pink/20 text-neon-pink text-[9px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shrink-0 active:scale-95"
                                title="Reset all filters"
                            >
                                <X size={12} />
                                <span>Reset Filters</span>
                            </button>
                        ) : (
                            <div className="col-span-1 sm:hidden h-10 px-3 bg-white dark:bg-black/40 border border-white/[0.06] rounded-xl flex items-center justify-center gap-1.5 text-[8px] font-bold text-gray-900 dark:text-white/30 uppercase tracking-wider select-none">
                                <span className="w-1.5 h-1.5 rounded-full bg-neon-pink animate-pulse" />
                                <span>{filteredCreators.length} of {creators.length}</span>
                            </div>
                        )}

                        {/* Creators Count Badge (Tablet / Desktop) */}
                        <div className="hidden sm:flex col-auto items-center justify-start gap-1.5 text-[8px] font-bold text-gray-900 dark:text-white/30 uppercase tracking-wider sm:ml-auto shrink-0 py-1 select-none">
                            <span className="w-1.5 h-1.5 rounded-full bg-neon-pink animate-pulse" />
                            <span>{filteredCreators.length} of {creators.length} Creators</span>
                        </div>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="relative min-h-[500px]">
                    <AnimatePresence mode="wait">
                        {creators.length === 0 ? (
                            <motion.div 
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="py-40 text-center bg-[#050505]/40 rounded-[4rem] border border-black/10 dark:border-white/5 flex flex-col items-center gap-8 shadow-inner"
                            >
                                <div className="w-32 h-32 bg-black/5 dark:bg-white/5 rounded-full flex items-center justify-center border border-black/10 dark:border-white/10 animate-pulse">
                                    <Users size={48} className="text-gray-700" />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-3xl font-black uppercase tracking-tighter text-gray-500 italic">No Creator Data Found</h3>
                                    <p className="text-gray-700 text-sm font-black uppercase tracking-widest">Initialize the database to begin</p>
                                </div>
                            </motion.div>
                        ) : filteredCreators.length === 0 ? (
                            <motion.div 
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="py-32 text-center flex flex-col items-center gap-6"
                            >
                                <Search size={64} className="text-gray-800" />
                                <div className="space-y-2">
                                    <h3 className="text-xl font-black uppercase tracking-[0.3em] text-gray-600">No matches found</h3>
                                    <p className="text-gray-800 text-xs font-black uppercase tracking-widest">Try adjusting your filters or search terms</p>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                key={viewMode}
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -30 }}
                                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                            >
                                {viewMode === 'grid' ? (
                                    <div className="relative group/carousel">
                                        {/* Scroll Indicators - Only visible on desktop hover or mobile always */}
                                        <div className="absolute -left-4 top-1/2 -translate-y-1/2 z-20 hidden md:flex opacity-0 group-hover/carousel:opacity-100 transition-opacity pointer-events-none">
                                            <button onClick={() => { const el = document.getElementById('creator-grid'); if (el) el.scrollBy({ left: -300, behavior: 'smooth' }); }} className="w-12 h-12 rounded-2xl bg-white dark:bg-black/80 backdrop-blur-xl border border-black/10 dark:border-white/10 flex items-center justify-center text-gray-900 dark:text-white pointer-events-auto hover:bg-white hover:text-black transition-all shadow-2xl">
                                                <ChevronRight className="rotate-180" size={24} />
                                            </button>
                                        </div>
                                        <div className="absolute -right-4 top-1/2 -translate-y-1/2 z-20 hidden md:flex opacity-0 group-hover/carousel:opacity-100 transition-opacity pointer-events-none">
                                            <button onClick={() => { const el = document.getElementById('creator-grid'); if (el) el.scrollBy({ left: 300, behavior: 'smooth' }); }} className="w-12 h-12 rounded-2xl bg-white dark:bg-black/80 backdrop-blur-xl border border-black/10 dark:border-white/10 flex items-center justify-center text-gray-900 dark:text-white pointer-events-auto hover:bg-white hover:text-black transition-all shadow-2xl">
                                                <ChevronRight size={24} />
                                            </button>
                                        </div>

                                        <div 
                                            id="creator-grid" 
                                            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-8 items-start pb-8 md:pb-0"
                                        >
                                            {paginatedCreators.map((creator, idx) => (
                                                <motion.div
                                                    key={creator.uid}
                                                    initial={{ opacity: 0, y: 20 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: idx * 0.05 }}
                                                    className="w-full"
                                                >
                                                    <CreatorBadgeCard 
                                                        creator={creator} 
                                                        onSelect={() => navigate(`/admin/creators/${creator.uid}`)} 
                                                        isSelected={selectedUids.includes(creator.uid)}
                                                        onToggleSelect={handleToggleSelect}
                                                    />
                                                </motion.div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-3">
                                        <div className="hidden md:flex items-center gap-6 px-10 py-6 text-[10px] font-black text-gray-600 uppercase tracking-[0.4em] border-b border-black/10 dark:border-white/5">
                                            <div className="w-6 shrink-0" />
                                            <div className="w-16 shrink-0">Identity</div>
                                            <div className="flex-1 pl-1">Profile Details</div>
                                            <div className="w-48 hidden md:block">Specialization</div>
                                            <div className="w-40 hidden lg:block text-right pr-10">Followers</div>
                                            <div className="w-32 hidden sm:block text-right pr-4">Status</div>
                                            <div className="w-12 shrink-0"></div>
                                        </div>

                                        {paginatedCreators.map((creator, idx) => (
                                            <motion.div
                                                key={creator.uid}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: idx * 0.03 }}
                                            >
                                                <CreatorListItem 
                                                    creator={creator} 
                                                    onSelect={() => navigate(`/admin/creators/${creator.uid}`)} 
                                                    isSelected={selectedUids.includes(creator.uid)}
                                                    onToggleSelect={handleToggleSelect}
                                                />
                                            </motion.div>
                                        ))}
                                    </div>
                                )}

                                {/* Pagination Controls */}
                                {totalPages > 1 && (
                                    <div className="flex items-center justify-center gap-3 mt-16 pb-12">
                                        <button 
                                            disabled={currentPage === 1}
                                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                            className="w-12 h-12 rounded-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 flex items-center justify-center text-gray-900 dark:text-white disabled:opacity-20 hover:bg-white hover:text-black transition-all"
                                        >
                                            <ChevronLeft size={20} />
                                        </button>
                                        <div className="flex items-center gap-2">
                                            {getPageNumbers(currentPage, totalPages).map((page, i) => {
                                                if (page === '...') {
                                                    return (
                                                        <span 
                                                            key={`dots-${i}`} 
                                                            className="w-12 h-12 flex items-center justify-center text-gray-500 font-black text-sm select-none"
                                                        >
                                                            ...
                                                        </span>
                                                    );
                                                }
                                                return (
                                                    <button
                                                        key={page}
                                                        onClick={() => setCurrentPage(page)}
                                                        className={cn(
                                                            "w-12 h-12 rounded-full font-black text-xs transition-all border flex items-center justify-center",
                                                            currentPage === page 
                                                                ? "bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.3)]" 
                                                                : "bg-black/5 dark:bg-white/5 text-gray-500 border-black/10 dark:border-white/10 hover:border-white/30"
                                                        )}
                                                    >
                                                        {page}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        <button 
                                            disabled={currentPage === totalPages}
                                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                            className="w-12 h-12 rounded-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 flex items-center justify-center text-gray-900 dark:text-white disabled:opacity-20 hover:bg-white hover:text-black transition-all"
                                        >
                                            <ChevronRight size={20} />
                                        </button>
                                    </div>
                                )}

                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
        );
    };

    const content = isEmbedded ? (
        renderContent()
    ) : (
        <AdminCommunityHubLayout
            studioHeader={{
                title: 'CREATOR',
                subtitle: 'PORTAL',
                icon: Users,
                accentClass: 'text-neon-pink'
            }}
            accentColor="neon-pink"
            tabs={personnelTabs}
            hideMobileMenu={selectedUids.length > 0}
            action={
                <div className="w-full md:w-80 shrink-0">
                    <StatCard 
                        compact={true} 
                        icon={<Users size={20} />} 
                        label="CREATOR ROSTER" 
                        value={stats.total} 
                        color="pink" 
                        description={`TOTAL CREATORS | ${stats.approved} VERIFIED • ${stats.pending} PENDING`} 
                    />
                </div>
            }
        >
            {renderContent()}
        </AdminCommunityHubLayout>
    );

    return (
        <>
            {content}
            <AnimatePresence>
                {selectedCreator && (
                    <CreatorDetailModal 
                        creator={selectedCreator} 
                        onClose={() => navigate('/admin/creators')} 
                        onUpdateStatus={handleUpdateStatus}
                        onDelete={handleDeleteCreator}
                        isUpdating={isUpdating}
                        isDeleting={isDeleting}
                    />
                )}
                {isAddModalOpen && (
                    <AddCreatorModal onClose={() => setIsAddModalOpen(false)} />
                )}
                {isBulkEmailModalOpen && (
                    <BulkEmailModal
                        selectedUids={selectedUids}
                        creators={creators}
                        onClose={() => {
                            setIsBulkEmailModalOpen(false);
                            setSelectedUids([]);
                        }}
                    />
                )}
            </AnimatePresence>
            {createPortal(
                <AnimatePresence>
                    {selectedUids.length > 0 && !isLeaderboardRoute && (
                        <motion.div
                            initial={{ y: 100, x: '-50%', opacity: 0 }}
                            animate={{ y: 0, x: '-50%', opacity: 1 }}
                            exit={{ y: 100, x: '-50%', opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                            className="fixed bottom-6 md:bottom-8 left-1/2 z-[100] w-[94%] sm:w-[90%] max-w-2xl bg-white dark:bg-black/80 backdrop-blur-2xl border border-black/10 dark:border-white/10 rounded-2xl sm:rounded-3xl px-4 sm:px-6 py-3 sm:py-4 flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4 shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-t-white/20"
                        >
                            <div className="flex items-center gap-2.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-neon-pink animate-pulse" />
                                <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-gray-900 dark:text-white">
                                    {selectedUids.length} Creator{selectedUids.length > 1 ? 's' : ''} Selected
                                </span>
                            </div>
                            <div className="flex items-center gap-2 w-full md:w-auto">
                                <button
                                    onClick={() => {
                                        const pageUids = paginatedCreators.map(c => c.uid);
                                        setSelectedUids(prev => {
                                            const newUids = [...prev];
                                            pageUids.forEach(uid => {
                                                if (!newUids.includes(uid)) newUids.push(uid);
                                            });
                                            return newUids;
                                        });
                                    }}
                                    className="flex-1 md:flex-none h-9 sm:h-10 px-3 sm:px-4 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20 text-gray-900 dark:text-white font-black text-[8px] sm:text-[9px] uppercase tracking-widest rounded-xl transition-all"
                                >
                                    Select Page
                                </button>
                                <button
                                    onClick={handleDeselectAll}
                                    className="flex-1 md:flex-none h-9 sm:h-10 px-3 sm:px-4 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20 text-gray-900 dark:text-white font-black text-[8px] sm:text-[9px] uppercase tracking-widest rounded-xl transition-all"
                                >
                                    Deselect All
                                </button>
                                <button
                                    onClick={() => setIsBulkEmailModalOpen(true)}
                                    className="flex-1 md:flex-none h-9 sm:h-10 px-4 sm:px-6 bg-neon-pink text-black hover:bg-neon-pink/90 font-black text-[8px] sm:text-[9px] uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-[0_0_20px_rgba(255,0,127,0.3)]"
                                >
                                    <Mail size={12} /> Email Selected
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </>
    );
};

/* --- Redesigned Sub-components --- */

const StatCard = ({ icon, label, value, color, description, compact = false }) => {
    const colorMap = {
        blue: { bg: 'bg-neon-blue/10', border: 'border-neon-blue/20', text: 'text-neon-blue', glow: 'rgba(46,191,255,0.2)', gradient: 'from-neon-blue/20 to-transparent' },
        green: { bg: 'bg-neon-green/10', border: 'border-neon-green/20', text: 'text-neon-green', glow: 'rgba(57,255,20,0.2)', gradient: 'from-neon-green/20 to-transparent' },
        yellow: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', text: 'text-yellow-500', glow: 'rgba(234,179,8,0.2)', gradient: 'from-yellow-500/20 to-transparent' },
        purple: { bg: 'bg-purple-500/10', border: 'border-purple-500/20', text: 'text-purple-500', glow: 'rgba(168,85,247,0.2)', gradient: 'from-purple-500/20 to-transparent' },
        pink: { bg: 'bg-neon-pink/10', border: 'border-neon-pink/20', text: 'text-neon-pink', glow: 'rgba(236,72,153,0.2)', gradient: 'from-neon-pink/20 to-transparent' }
    };
    
    const theme = colorMap[color] || colorMap.purple;
    
    return (
        <motion.div 
            whileHover={{ y: -5, scale: 1.02 }}
            className={cn(
                "relative group overflow-hidden bg-[#0A0A0A] border transition-all duration-500 flex-1",
                compact ? "p-4 md:p-5 rounded-[2rem] min-w-[200px]" : "p-8 rounded-[3rem] min-w-[280px]",
                theme.border
            )}
            style={{ boxShadow: compact ? `0 10px 30px -10px ${theme.glow}` : `0 20px 50px -10px ${theme.glow}` }}
        >
            <div className={cn("absolute top-0 right-0 w-40 h-40 bg-gradient-to-br blur-[80px] -mr-20 -mt-20 opacity-30 group-hover:opacity-50 transition-opacity", theme.gradient)} />
            <div className={cn("relative z-10 flex h-full", compact ? "flex-row items-center gap-4" : "flex-col justify-between gap-8")}>
                <div className="flex items-start justify-between">
                    <div className={cn(
                        "rounded-2xl flex items-center justify-center shadow-inner border border-black/10 dark:border-white/5 shrink-0", 
                        compact ? "w-10 h-10 md:w-12 md:h-12" : "w-16 h-16",
                        theme.bg, theme.text
                    )}>
                        {React.cloneElement(icon, { size: compact ? 18 : 24 })}
                    </div>
                    {!compact && (
                        <div className="text-right">
                            <TrendingUp size={16} className={cn("inline-block mr-2", theme.text)} />
                            <span className="text-[10px] font-black text-gray-900 dark:text-white/40 uppercase tracking-widest">+8%</span>
                        </div>
                    )}
                </div>
                <div className={cn("space-y-1", compact ? "flex-1" : "")}>
                    <p className={cn("font-black uppercase tracking-[0.4em] leading-tight text-gray-500", compact ? "text-[8px]" : "text-[10px]")}>{label}</p>
                    <h3 className={cn("font-black text-gray-900 dark:text-white tracking-tighter tabular-nums leading-none", compact ? "text-2xl" : "text-6xl")}>{value}</h3>
                    {!compact && description && (
                        <p className="text-[10px] font-bold text-gray-700 uppercase tracking-widest mt-2">{description}</p>
                    )}
                </div>
            </div>
            {!compact && (
                <div className={cn("absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-current to-transparent opacity-20", theme.text)} />
            )}
        </motion.div>
    );
};

const CreatorBadgeCard = ({ creator, onSelect, isSelected, onToggleSelect }) => {
    const { creators, campaigns } = useStore();
    const instagramUrl = creator.instagram 
        ? (creator.instagram.includes('instagram.com') ? creator.instagram : `https://instagram.com/${creator.instagram.replace(/^@/, '').trim()}`)
        : '';

    const earnedBadges = getEarnedBadges(creator, creators, campaigns);
    const customBadges = creator.adminBadges || [];

    const maxFollowers = Math.max(Number(creator.instagramFollowers || 0), Number(creator.youtubeSubscribers || 0), Number(creator.linkedinFollowers || 0));

    return (
        <motion.div 
            layout
            onClick={onSelect}
            className={cn(
                "group relative bg-white/[0.02] border rounded-2xl cursor-pointer overflow-hidden transition-all duration-300 hover:bg-white/[0.04] hover:border-white/[0.12] flex flex-col",
                isSelected ? "border-neon-pink/40 bg-neon-pink/[0.03]" : "border-white/[0.06]"
            )}
        >
            {/* Image */}
            <div className="relative aspect-[4/3] overflow-hidden bg-white dark:bg-black/30">
                {/* Checkbox */}
                <div className="absolute top-3 left-3 z-30" onClick={(e) => e.stopPropagation()}>
                    <input
                        type="checkbox"
                        checked={isSelected || false}
                        onChange={() => onToggleSelect(creator.uid)}
                        className="w-4 h-4 rounded border-black/20 dark:border-white/20 bg-white dark:bg-black/60 text-neon-pink focus:ring-0 cursor-pointer"
                    />
                </div>
                {creator.profilePicture ? (
                    <img src={creator.profilePicture} alt={creator.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-5xl font-black text-black/[0.03] dark:text-white/[0.03] uppercase italic select-none">
                        {creator.name.charAt(0)}
                    </div>
                )}
                <div className="absolute top-3 right-3">
                    <StatusPill status={creator.profileStatus} />
                </div>
                {creator.profileStatus === 'approved' && (
                    <div className="absolute bottom-3 right-3 w-8 h-8 bg-neon-green text-black rounded-xl flex items-center justify-center shadow-lg">
                        <Check size={14} strokeWidth={3} />
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col p-4 gap-3">
                {/* Name & Niche */}
                <div>
                    <p className="text-[9px] font-bold text-neon-pink/70 uppercase tracking-wider mb-1">{(creator.niches || creator.specializations || [])[0] || 'Creator'}</p>
                    <h3 className="text-lg font-black text-gray-900 dark:text-white tracking-tight uppercase leading-tight line-clamp-1">
                        {creator.name}
                    </h3>
                </div>
                
                {/* Badges — max 3 */}
                {(earnedBadges.length > 0 || customBadges.length > 0) && (
                    <div className="flex flex-wrap gap-1 max-h-[28px] overflow-hidden">
                        {earnedBadges.slice(0, 2).map(badge => (
                            <span 
                                key={badge.id} 
                                title={badge.desc}
                                className={cn("inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[7px] font-bold uppercase tracking-wider border", badge.bg)}
                            >
                                <span>{badge.icon}</span>
                                <span>{badge.label.split(' ')[0]}</span>
                            </span>
                        ))}
                        {customBadges.slice(0, 1).map((badge, idx) => (
                            <span 
                                key={`custom-${idx}`} 
                                className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-md text-[7px] font-bold uppercase tracking-wider"
                            >
                                🏅 <span className="truncate max-w-[40px]">{badge}</span>
                            </span>
                        ))}
                    </div>
                )}

                {/* Meta pills */}
                <div className="flex flex-wrap gap-1.5">
                    <span className="flex items-center gap-1 text-[8px] font-bold text-gray-900 dark:text-white/30 uppercase tracking-wider bg-white/[0.03] px-2 py-1 rounded-md border border-white/[0.04]">
                        <MapPin size={9} className="text-neon-pink/50" />{creator.city || 'Global'}
                    </span>
                    <span className="flex items-center gap-1 text-[8px] font-bold text-gray-900 dark:text-white/30 uppercase tracking-wider bg-white/[0.03] px-2 py-1 rounded-md border border-white/[0.04]">
                        <TrendingUp size={9} />{maxFollowers.toLocaleString()} flw
                    </span>
                </div>

                {/* Contact */}
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-[8px] font-bold text-gray-900 dark:text-white/25 uppercase tracking-wider truncate">
                        <Mail size={10} className="shrink-0 text-gray-900 dark:text-white/15" /><span className="truncate">{creator.email || 'N/A'}</span>
                    </div>
                    <div className="flex items-center justify-between text-[8px] font-bold text-gray-900 dark:text-white/25 uppercase tracking-wider">
                        <div className="flex items-center gap-2 min-w-0">
                            <Phone size={10} className="shrink-0 text-gray-900 dark:text-white/15" /><span className="truncate">{creator.phone || 'N/A'}</span>
                        </div>
                        {creator.isPhoneVerified && (
                            <span className="flex items-center gap-0.5 text-neon-green text-[7px] tracking-wider shrink-0 bg-neon-green/10 border border-neon-green/20 px-1.5 py-0.5 rounded">
                                <Check size={7} strokeWidth={3} /> OK
                            </span>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-auto pt-3 border-t border-white/[0.04] flex items-center justify-between">
                    <div className="flex gap-1.5">
                        {creator.instagram && (
                            <a 
                                href={instagramUrl} target="_blank" rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="w-7 h-7 rounded-lg bg-pink-500/10 border border-pink-500/15 flex items-center justify-center text-pink-400 hover:bg-pink-500/20 transition-all"
                            ><Instagram size={11} /></a>
                        )}
                        {creator.linkedin && (
                            <a 
                                href={creator.linkedin.includes('http') ? creator.linkedin : `https://${creator.linkedin}`} target="_blank" rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/15 flex items-center justify-center text-blue-400 hover:bg-blue-500/20 transition-all"
                            ><Linkedin size={11} /></a>
                        )}
                        {creator.youtube && (
                            <a 
                                href={creator.youtube.includes('http') ? creator.youtube : `https://${creator.youtube}`} target="_blank" rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="w-7 h-7 rounded-lg bg-red-500/10 border border-red-500/15 flex items-center justify-center text-red-400 hover:bg-red-500/20 transition-all"
                            ><Youtube size={11} /></a>
                        )}
                        {!creator.instagram && !creator.linkedin && !creator.youtube && (
                            <span className="text-[8px] font-bold text-gray-900 dark:text-white/15">No socials</span>
                        )}
                    </div>
                    <div className="w-7 h-7 rounded-lg bg-white/[0.03] border border-white/[0.05] flex items-center justify-center text-gray-900 dark:text-white/20 group-hover:text-gray-900 dark:group-hover:text-white/40 transition-colors">
                        <ChevronRight size={13} />
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

const CreatorListItem = ({ creator, onSelect, isSelected, onToggleSelect }) => {
    const instagramUrl = creator.instagram 
        ? (creator.instagram.includes('instagram.com') ? creator.instagram : `https://instagram.com/${creator.instagram.replace(/^@/, '').trim()}`)
        : '';
    const instagramHandle = creator.instagram 
        ? `@${creator.instagram.replace(/^@/, '').trim()}`
        : '';

    return (
        <div 
            onClick={onSelect}
            className={cn(
                "group flex flex-col lg:flex-row items-start lg:items-center p-4 sm:p-5 bg-white/[0.02] border hover:border-white/[0.12] hover:bg-white/[0.04] rounded-2xl cursor-pointer transition-all duration-200 gap-4 sm:gap-6",
                isSelected ? "border-neon-pink/40 bg-neon-pink/[0.03]" : "border-white/[0.06]"
            )}
        >
            <div className="flex items-center gap-3 sm:gap-4 w-full lg:w-auto min-w-0">
                <div onClick={(e) => e.stopPropagation()} className="shrink-0 flex items-center justify-center">
                    <input
                        type="checkbox"
                        checked={isSelected || false}
                        onChange={() => onToggleSelect(creator.uid)}
                        className="w-4 h-4 rounded border-black/20 dark:border-white/20 bg-white dark:bg-black/60 text-neon-pink focus:ring-0 cursor-pointer"
                    />
                </div>
                <div className="w-12 h-12 bg-white dark:bg-black/40 border border-white/[0.08] rounded-xl flex items-center justify-center font-black text-gray-900 dark:text-white overflow-hidden shrink-0">
                    {creator.profilePicture ? (
                        <img src={creator.profilePicture} alt={creator.name} className="w-full h-full object-cover" />
                    ) : (
                        <span className="italic text-gray-900 dark:text-white/30">{creator.name.charAt(0)}</span>
                    )}
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-base font-black text-gray-900 dark:text-white uppercase tracking-tight truncate">{creator.name}</h4>
                        {creator.isPhoneVerified && (
                            <span className="flex items-center gap-0.5 text-neon-green text-[7px] font-bold tracking-wider bg-neon-green/10 border border-neon-green/20 px-1.5 py-0.5 rounded">
                                <Check size={7} strokeWidth={3} /> OK
                            </span>
                        )}
                    </div>
                    <div className="flex flex-wrap items-center gap-y-1 gap-x-2 mt-0.5 text-[8px] text-gray-900 dark:text-white/30 font-bold tracking-wider uppercase">
                        <span className="truncate max-w-[150px]">{creator.email}</span>
                        <span className="text-gray-900 dark:text-white/10">•</span>
                        <span className="flex items-center gap-1"><Phone size={9} className="text-gray-900 dark:text-white/20" /> {creator.phone || 'N/A'}</span>
                    </div>
                </div>
            </div>

            <div className="flex flex-wrap gap-1.5 w-full lg:w-56 shrink-0">
                <span className="text-[8px] font-bold uppercase tracking-wider text-gray-900 dark:text-white/40 bg-white/[0.03] border border-white/[0.04] px-2.5 py-1 rounded-lg">
                    {(creator.niches || creator.specializations || [])[0] || 'Creator'}
                </span>
                {creator.collegeName && (
                    <span className="text-[8px] font-bold uppercase tracking-wider text-purple-400/80 bg-purple-500/5 border border-purple-500/10 px-2.5 py-1 rounded-lg truncate max-w-[140px]">
                        {creator.collegeName}
                    </span>
                )}
            </div>

            <div className="w-full lg:w-44 shrink-0 flex gap-1.5 flex-wrap">
                {creator.instagram && (
                    <a
                        href={instagramUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="w-7 h-7 rounded-lg bg-pink-500/10 border border-pink-500/15 flex items-center justify-center text-pink-400 hover:bg-pink-500/20 transition-all"
                        title={instagramHandle}
                    >
                        <Instagram size={11} />
                    </a>
                )}
                {creator.linkedin && (
                    <a
                        href={creator.linkedin.includes('http') ? creator.linkedin : `https://${creator.linkedin}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/15 flex items-center justify-center text-blue-400 hover:bg-blue-500/20 transition-all"
                        title="LinkedIn Profile"
                    >
                        <Linkedin size={11} />
                    </a>
                )}
                {creator.youtube && (
                    <a
                        href={creator.youtube.includes('http') ? creator.youtube : `https://${creator.youtube}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="w-7 h-7 rounded-lg bg-red-500/10 border border-red-500/15 flex items-center justify-center text-red-400 hover:bg-red-500/20 transition-all"
                        title="YouTube Channel"
                    >
                        <Youtube size={11} />
                    </a>
                )}
            </div>

            <div className="hidden lg:block w-32 text-right pr-2">
                <p className="text-[7px] font-bold text-gray-900 dark:text-white/20 uppercase tracking-wider mb-0.5">FOLLOWERS</p>
                <p className="text-sm font-bold text-gray-900 dark:text-white tabular-nums">{Math.max(Number(creator.instagramFollowers || 0), Number(creator.youtubeSubscribers || 0), Number(creator.linkedinFollowers || 0)).toLocaleString()}</p>
            </div>

            <div className="flex items-center justify-between lg:justify-end gap-3 w-full lg:w-44 shrink-0">
                <StatusPill status={creator.profileStatus} />
                <div className="w-8 h-8 rounded-lg bg-white/[0.03] border border-white/[0.05] flex items-center justify-center text-gray-900 dark:text-white/20 group-hover:text-gray-900 dark:group-hover:text-white/50 transition-all shrink-0">
                    <ChevronRight size={14} />
                </div>
            </div>
        </div>
    );
};

const StatusPill = ({ status }) => {
    const config = {
        approved: "bg-neon-green/10 text-neon-green border-neon-green/20",
        rejected: "bg-red-500/10 text-red-400 border-red-500/20",
        blocked: "bg-red-500/10 text-red-400 border-red-500/20",
        pending: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
    };
    const style = config[status] || config.pending;
    return (
        <span className={cn("px-2.5 py-1 rounded-lg text-[8px] font-bold uppercase tracking-wider border", style)}>
            {status || 'PENDING'}
        </span>
    );
};

// Section heading component
const SectionLabel = ({ children }) => (
    <p className="text-[10px] font-bold text-gray-500 dark:text-white/40 uppercase tracking-[0.2em] mb-3">{children}</p>
);

const CreatorDetailModal = ({ creator, onClose, onUpdateStatus, onDelete, isUpdating, isDeleting }) => {
    const { updateCreator, addNotification, creators, campaigns } = useStore();
    
    // States
    const [isFeatured, setIsFeatured] = useState(creator.isFeatured || false);
    const [customBadgeText, setCustomBadgeText] = useState('');
    const [adminBadges, setAdminBadges] = useState(creator.adminBadges || []);
    const [communicationTab, setCommunicationTab] = useState('email');
    const [emailSubject, setEmailSubject] = useState('Partnership Update - Newbi Entertainment');
    const [emailBody, setEmailBody] = useState('');
    const [messageText, setMessageText] = useState('');
    const [sendingEmail, setSendingEmail] = useState(false);
    const [sendingMessage, setSendingMessage] = useState(false);

    useEffect(() => {
        setIsFeatured(creator.isFeatured || false);
        setAdminBadges(creator.adminBadges || []);
    }, [creator]);

    // Derived badges from creator stats
    const earnedBadges = useMemo(() => {
        const badges = [];
        const followers = Number(creator.instagramFollowers || 0);
        
        if (followers >= 100000) {
            badges.push({ id: 'macro', label: 'Macro Creator (100K+)', icon: '👑', bg: 'bg-amber-500/10 border-amber-500/20 text-amber-500 dark:text-amber-400', desc: 'Over 100,000 followers' });
        } else if (followers >= 10000) {
            badges.push({ id: 'micro', label: 'Micro Creator (10K+)', icon: '⭐', bg: 'bg-blue-500/10 border-blue-500/20 text-blue-500 dark:text-blue-400', desc: 'Over 10,000 followers' });
        } else if (followers >= 1000) {
            badges.push({ id: 'nano', label: 'Nano Creator (1K+)', icon: '🌱', bg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400', desc: 'Over 1,000 followers' });
        }

        const joinedCount = (creator.joinedCampaigns || []).length;
        if (joinedCount >= 10) {
            badges.push({ id: 'veteran', label: 'Campaign Veteran (10+)', icon: '🔥', bg: 'bg-orange-500/10 border-orange-500/20 text-orange-500 dark:text-orange-400', desc: 'Completed 10+ campaigns' });
        } else if (joinedCount >= 3) {
            badges.push({ id: 'active', label: 'Active Collaborator (3+)', icon: '⚡', bg: 'bg-purple-500/10 border-purple-500/20 text-purple-600 dark:text-purple-400', desc: 'Participated in 3+ campaigns' });
        }

        const approvedCount = (creator.shortlistedCampaigns || []).length;
        if (approvedCount >= 5) {
            badges.push({ id: 'top_performer', label: 'Top Performer', icon: '🏆', bg: 'bg-rose-500/10 border-rose-500/20 text-rose-500 dark:text-rose-400', desc: 'Shortlisted for 5+ campaigns' });
        }

        if (creator.isPhoneVerified) {
            badges.push({ id: 'verified_phone', label: 'Verified Contact', icon: '📱', bg: 'bg-teal-500/10 border-teal-500/20 text-teal-600 dark:text-teal-400', desc: 'Phone number verified' });
        }

        return badges;
    }, [creator]);

    // Handle toggle featured
    const handleToggleFeatured = async () => {
        const next = !isFeatured;
        setIsFeatured(next);
        try {
            await updateCreator(creator.uid, { isFeatured: next });
            useStore.getState().addToast(next ? "Marked as Featured Creator" : "Removed from Featured", 'success');
        } catch (err) {
            setIsFeatured(!next);
            useStore.getState().addToast("Failed to update featured status", 'error');
        }
    };

    // Handle add custom badge
    const handleAddBadge = async (e) => {
        e.preventDefault();
        const trimmed = customBadgeText.trim();
        if (!trimmed) return;
        if (adminBadges.includes(trimmed)) {
            useStore.getState().addToast("Badge already exists", 'error');
            return;
        }
        const updated = [...adminBadges, trimmed];
        setAdminBadges(updated);
        setCustomBadgeText('');
        try {
            await updateCreator(creator.uid, { adminBadges: updated });
            useStore.getState().addToast(`Added badge: ${trimmed}`, 'success');
        } catch (err) {
            setAdminBadges(adminBadges);
            useStore.getState().addToast("Failed to add badge", 'error');
        }
    };

    // Handle remove custom badge
    const handleRemoveBadge = async (badgeToRemove) => {
        const updated = adminBadges.filter(b => b !== badgeToRemove);
        setAdminBadges(updated);
        try {
            await updateCreator(creator.uid, { adminBadges: updated });
            useStore.getState().addToast(`Removed badge: ${badgeToRemove}`, 'success');
        } catch (err) {
            setAdminBadges(adminBadges);
            useStore.getState().addToast("Failed to remove badge", 'error');
        }
    };

    // Handle sending individual email
    const handleSendEmail = async (e) => {
        e.preventDefault();
        if (!creator.email) {
            useStore.getState().addToast("Creator does not have an email address", 'error');
            return;
        }
        if (!emailSubject.trim() || !emailBody.trim()) {
            useStore.getState().addToast("Please enter both subject and message body", 'error');
            return;
        }
        setSendingEmail(true);
        try {
            const { sendCustomEmail } = await import('../../lib/email');
            const result = await sendCustomEmail({
                toEmail: creator.email,
                toName: creator.name,
                subject: emailSubject,
                message: emailBody,
                html: `<div style="font-family: Arial, sans-serif; padding: 20px; color: #111;">
                    <p>${emailBody.replace(/\n/g, '<br/>')}</p>
                    <hr style="margin-top: 30px; border: none; border-top: 1px solid #eee;" />
                    <p style="font-size: 12px; color: #888;">Newbi Entertainment • Creator Operations</p>
                </div>`
            });
            if (result && result.success) {
                useStore.getState().addToast(`Email sent to ${creator.name}!`, 'success');
                setEmailBody('');
            } else {
                throw new Error(result?.error || "Send failed");
            }
        } catch (err) {
            console.error("Error sending custom email:", err);
            useStore.getState().addToast("Failed to send email. Please try again.", 'error');
        } finally {
            setSendingEmail(false);
        }
    };

    // Handle sending notification
    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!messageText.trim()) return;
        setSendingMessage(true);
        try {
            await addNotification({
                userId: creator.uid,
                title: 'Message from Newbi Admin',
                message: messageText.trim(),
                type: 'admin_message',
                createdAt: new Date().toISOString(),
                read: false
            });
            useStore.getState().addToast(`Notification sent to ${creator.name}!`, 'success');
            setMessageText('');
        } catch (err) {
            console.error("Error sending notification:", err);
            useStore.getState().addToast("Failed to send notification", 'error');
        } finally {
            setSendingMessage(false);
        }
    };

    const socialLinks = [
        creator.instagram && { platform: 'Instagram', icon: Instagram, handle: `@${creator.instagram.replace('@', '')}`, followers: creator.instagramFollowers, url: `https://instagram.com/${creator.instagram.replace('@', '')}`, color: 'text-pink-600 dark:text-pink-400', bg: 'bg-pink-500/10 border-pink-500/20' },
        creator.linkedin && { platform: 'LinkedIn', icon: Linkedin, handle: 'Profile', followers: creator.linkedinFollowers, url: creator.linkedin.includes('http') ? creator.linkedin : `https://${creator.linkedin}`, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
        creator.youtube && { platform: 'YouTube', icon: Youtube, handle: 'Channel', followers: creator.youtubeSubscribers, url: creator.youtube.includes('http') ? creator.youtube : `https://${creator.youtube}`, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
        creator.twitter && { platform: 'X / Web', icon: Twitter, handle: 'Link', followers: null, url: creator.twitter.includes('http') ? creator.twitter : `https://${creator.twitter}`, color: 'text-sky-600 dark:text-sky-400', bg: 'bg-sky-500/10 border-sky-500/20' },
    ].filter(Boolean);

    return createPortal(
        <div className="fixed inset-0 z-[99999] flex justify-end">
            {/* Backdrop */}
            <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
                onClick={onClose} 
            />

            {/* Drawer Panel */}
            <motion.div 
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
                className="relative w-full sm:max-w-xl md:max-w-2xl h-[100dvh] max-h-[100dvh] bg-white dark:bg-[#0A0A0A] sm:border-l border-black/10 dark:border-white/[0.06] flex flex-col z-10 shadow-[-20px_0_60px_rgba(0,0,0,0.2)] dark:shadow-[-20px_0_60px_rgba(0,0,0,0.5)]"
            >
                {/* Sticky Header */}
                <div className="sticky top-0 z-50 flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 bg-white/95 dark:bg-[#0A0A0A]/95 backdrop-blur-xl border-b border-black/10 dark:border-white/[0.06]">
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-black/5 dark:bg-white/[0.04] border border-black/10 dark:border-white/[0.06] flex items-center justify-center shrink-0">
                            <Users size={13} className="text-gray-500 dark:text-white/40" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[8px] sm:text-[9px] font-bold text-gray-500 dark:text-white/40 uppercase tracking-[0.15em]">Creator Profile</p>
                            <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{creator.name}</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-black/5 dark:bg-white/[0.04] border border-black/10 dark:border-white/[0.06] flex items-center justify-center text-gray-600 dark:text-white/40 hover:bg-black/10 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white transition-all shrink-0"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <div className="px-4 sm:px-6 py-4 sm:py-6 space-y-5 sm:space-y-6">

                        {/* ─── Hero Section ─── */}
                        <div className="flex items-start gap-3.5 sm:gap-5">
                            <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl bg-gray-100 dark:bg-black border border-black/10 dark:border-white/[0.08] overflow-hidden shrink-0">
                                {creator.profilePicture ? (
                                    <img src={creator.profilePicture} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-xl sm:text-2xl font-black text-black/10 dark:text-white/[0.06] italic select-none">{creator.name.charAt(0)}</div>
                                )}
                                {creator.profileStatus === 'approved' && (
                                    <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 sm:w-6 sm:h-6 bg-neon-green rounded-md sm:rounded-lg flex items-center justify-center border-2 border-white dark:border-[#0A0A0A]">
                                        <Check size={10} strokeWidth={3} className="text-black" />
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 min-w-0 pt-0.5">
                                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1">
                                    <StatusPill status={creator.profileStatus} />
                                    <span className="text-[7px] sm:text-[8px] font-bold text-gray-500 dark:text-white/40 uppercase tracking-[0.15em] bg-black/5 dark:bg-white/[0.03] px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md border border-black/10 dark:border-white/[0.04]">
                                        {creator.creatorId || creator.uid.slice(0, 8).toUpperCase()}
                                    </span>
                                </div>
                                <h2 className="text-xl sm:text-2xl font-black font-heading tracking-tight uppercase text-gray-900 dark:text-white leading-tight break-words">
                                    {creator.name}
                                </h2>
                                <div className="flex items-center gap-2 sm:gap-3 mt-1.5 text-[8px] sm:text-[9px] font-bold text-gray-500 dark:text-white/40 uppercase tracking-wider flex-wrap">
                                    <span className="flex items-center gap-1"><MapPin size={9} className="text-neon-pink/60" />{creator.city || 'Global'}</span>
                                    <span className="text-gray-300 dark:text-white/10">•</span>
                                    <span className="flex items-center gap-1"><Calendar size={9} className="text-gray-400 dark:text-white/20" />{new Date(creator.createdAt || Date.now()).getFullYear()} Joined</span>
                                </div>
                            </div>
                        </div>

                        {/* ─── Badges Row ─── */}
                        {(earnedBadges.length > 0 || adminBadges.length > 0) && (
                            <div className="flex flex-wrap gap-1.5">
                                {earnedBadges.map(badge => (
                                    <span 
                                        key={badge.id} 
                                        title={badge.desc}
                                        className={cn("inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[8px] font-bold uppercase tracking-wider border", badge.bg)}
                                    >
                                        <span>{badge.icon}</span>
                                        <span>{badge.label}</span>
                                    </span>
                                ))}
                                {adminBadges.map((badge, idx) => (
                                    <span 
                                        key={`custom-${idx}`} 
                                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 rounded-lg text-[8px] font-bold uppercase tracking-wider"
                                    >
                                        <span>🏅</span>
                                        <span>{badge}</span>
                                        <button 
                                            onClick={() => handleRemoveBadge(badge)}
                                            className="ml-0.5 text-red-500 hover:text-red-700 dark:hover:text-white transition-colors"
                                        >
                                            ×
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* Divider */}
                        <div className="h-px bg-black/10 dark:bg-white/[0.04]" />

                        {/* ─── Contact Info ─── */}
                        <div>
                            <SectionLabel>Contact</SectionLabel>
                            <div className="space-y-2">
                                <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-white/[0.02] border border-black/10 dark:border-white/[0.05] rounded-xl">
                                    <Mail size={14} className="text-gray-400 dark:text-white/30 shrink-0" />
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[8px] font-bold text-gray-500 dark:text-white/40 uppercase tracking-wider">Email</p>
                                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{creator.email || 'N/A'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-white/[0.02] border border-black/10 dark:border-white/[0.05] rounded-xl">
                                    <Phone size={14} className="text-gray-400 dark:text-white/30 shrink-0" />
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[8px] font-bold text-gray-500 dark:text-white/40 uppercase tracking-wider">Phone</p>
                                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{creator.phone || 'N/A'}</p>
                                    </div>
                                </div>
                                {creator.collegeName && (
                                    <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-white/[0.02] border border-black/10 dark:border-white/[0.05] rounded-xl">
                                        <Layers size={14} className="text-gray-400 dark:text-white/30 shrink-0" />
                                        <div className="min-w-0 flex-1">
                                            <p className="text-[8px] font-bold text-gray-500 dark:text-white/40 uppercase tracking-wider">College</p>
                                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{creator.collegeName}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ─── Social Links ─── */}
                        {socialLinks.length > 0 && (
                            <div>
                                <SectionLabel>Social Footprint</SectionLabel>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {socialLinks.map(social => (
                                        <a
                                            key={social.platform}
                                            href={social.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className={cn("flex items-center gap-3 px-4 py-3 rounded-xl border transition-all hover:scale-[1.01] active:scale-[0.99]", social.bg)}
                                        >
                                            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", social.color)}>
                                                <social.icon size={15} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[8px] font-bold text-gray-500 dark:text-white/40 uppercase tracking-wider">{social.platform}</p>
                                                <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{social.handle}</p>
                                                {social.followers && (
                                                    <p className="text-[9px] font-medium text-gray-600 dark:text-white/40">{Number(social.followers || 0).toLocaleString()} followers</p>
                                                )}
                                            </div>
                                            <ExternalLink size={12} className="text-gray-400 dark:text-white/20 shrink-0" />
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* ─── Bio / Strategic Dossier ─── */}
                        <div>
                            <SectionLabel>Strategic Dossier</SectionLabel>
                            <div className="px-4 py-4 bg-gray-50 dark:bg-white/[0.02] border border-black/10 dark:border-white/[0.05] rounded-xl">
                                <p className="text-sm text-gray-700 dark:text-white/60 leading-relaxed italic">
                                    "{creator.bio || "No professional overview provided."}"
                                </p>
                            </div>
                        </div>

                        {/* ─── Niche & Specialization ─── */}
                        <div>
                            <SectionLabel>Niche & Specialization</SectionLabel>
                            <div className="flex flex-wrap gap-2">
                                {(creator.niches || creator.specializations || []).map((n, i) => (
                                    <span key={i} className="px-3 py-1.5 bg-gray-100 dark:bg-white/[0.03] border border-black/10 dark:border-white/[0.06] rounded-lg text-[9px] font-bold uppercase tracking-wider text-gray-700 dark:text-white/50">
                                        {n}
                                    </span>
                                ))}
                                {(creator.niches || creator.specializations || []).length === 0 && (
                                    <span className="text-[9px] font-medium text-gray-400 dark:text-white/20 italic">No specializations listed</span>
                                )}
                            </div>
                        </div>

                        {/* ─── Collaboration Preferences ─── */}
                        <div>
                            <SectionLabel>Collaboration Preferences</SectionLabel>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="px-4 py-3 bg-gray-50 dark:bg-white/[0.02] border border-black/10 dark:border-white/[0.05] rounded-xl">
                                    <p className="text-[8px] font-bold text-gray-500 dark:text-white/40 uppercase tracking-wider mb-1">Barter</p>
                                    <p className="text-xs font-bold text-gray-900 dark:text-white">
                                        {creator.doBarter === 'yes' ? 'Yes' : creator.doBarter === 'no' ? 'Paid Only' : creator.doBarter === 'selective' ? 'Selective' : (creator.doBarter || 'N/A')}
                                    </p>
                                </div>
                                <div className="px-4 py-3 bg-gray-50 dark:bg-white/[0.02] border border-black/10 dark:border-white/[0.05] rounded-xl">
                                    <p className="text-[8px] font-bold text-gray-500 dark:text-white/40 uppercase tracking-wider mb-1">Rates</p>
                                    <p className="text-xs font-bold text-gray-900 dark:text-white">{creator.commercials || 'N/A'}</p>
                                </div>
                            </div>
                        </div>

                        {/* Divider */}
                        <div className="h-px bg-black/10 dark:bg-white/[0.04]" />

                        {/* ─── Promotions & Badges ─── */}
                        <div className="p-4 bg-gray-50 dark:bg-white/[0.02] border border-black/10 dark:border-white/[0.05] rounded-2xl space-y-4">
                            <div className="flex items-center justify-between">
                                <p className="text-[10px] font-bold text-gray-500 dark:text-white/40 uppercase tracking-[0.2em]">Promotions & Badges</p>
                                <div className="flex items-center gap-2.5">
                                    <span className="text-[9px] font-bold text-gray-500 dark:text-white/40 uppercase tracking-wider">Featured</span>
                                    <button 
                                        onClick={handleToggleFeatured}
                                        className={cn(
                                            "w-10 h-5 rounded-full p-0.5 transition-all duration-300 flex items-center",
                                            isFeatured ? "bg-neon-pink justify-end" : "bg-black/10 dark:bg-white/10 justify-start"
                                        )}
                                    >
                                        <motion.div layout className="w-4 h-4 rounded-full bg-white dark:bg-black shadow-md" />
                                    </button>
                                </div>
                            </div>
                            <form onSubmit={handleAddBadge} className="flex gap-2">
                                <input 
                                    type="text" 
                                    value={customBadgeText}
                                    onChange={(e) => setCustomBadgeText(e.target.value)}
                                    placeholder="Custom badge name..."
                                    className="flex-1 h-10 bg-white dark:bg-black/40 border border-black/10 dark:border-white/[0.06] rounded-lg px-3 text-xs font-medium text-gray-900 dark:text-white focus:border-neon-pink/40 outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-white/20"
                                />
                                <button 
                                    type="submit"
                                    className="px-4 h-10 bg-black/5 dark:bg-white/[0.06] hover:bg-black/10 dark:hover:bg-white/10 text-gray-800 dark:text-white/60 hover:text-black dark:hover:text-white rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all"
                                >
                                    Add
                                </button>
                            </form>
                        </div>

                        {/* ─── Direct Communication ─── */}
                        <div className="p-4 bg-gray-50 dark:bg-white/[0.02] border border-black/10 dark:border-white/[0.05] rounded-2xl space-y-4">
                            <div className="flex items-center justify-between">
                                <p className="text-[10px] font-bold text-gray-500 dark:text-white/40 uppercase tracking-[0.2em]">Direct Communication</p>
                                <div className="flex bg-black/5 dark:bg-black/40 p-0.5 rounded-lg border border-black/10 dark:border-white/[0.06] h-8 items-center">
                                    <button 
                                        onClick={() => setCommunicationTab('email')} 
                                        className={cn(
                                            "px-3 h-7 rounded-md text-[8px] font-bold uppercase tracking-wider transition-all",
                                            communicationTab === 'email' ? "bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm" : "text-gray-500 dark:text-white/40 hover:text-gray-900 dark:hover:text-white"
                                        )}
                                    >
                                        Email
                                    </button>
                                    <button 
                                        onClick={() => setCommunicationTab('message')} 
                                        className={cn(
                                            "px-3 h-7 rounded-md text-[8px] font-bold uppercase tracking-wider transition-all",
                                            communicationTab === 'message' ? "bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm" : "text-gray-500 dark:text-white/40 hover:text-gray-900 dark:hover:text-white"
                                        )}
                                    >
                                        Notification
                                    </button>
                                </div>
                            </div>

                            {communicationTab === 'email' ? (
                                <form onSubmit={handleSendEmail} className="space-y-3">
                                    <div>
                                        <label className="text-[8px] font-bold text-gray-500 dark:text-white/40 uppercase tracking-wider block mb-1 pl-0.5">Subject</label>
                                        <input 
                                            type="text" 
                                            value={emailSubject}
                                            onChange={(e) => setEmailSubject(e.target.value)}
                                            placeholder="Email subject..." 
                                            className="w-full h-10 bg-white dark:bg-black/40 border border-black/10 dark:border-white/[0.06] rounded-lg px-3 text-xs font-medium text-gray-900 dark:text-white focus:border-neon-pink/40 outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-white/20"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[8px] font-bold text-gray-500 dark:text-white/40 uppercase tracking-wider block mb-1 pl-0.5">Message Body</label>
                                        <textarea 
                                            value={emailBody}
                                            onChange={(e) => setEmailBody(e.target.value)}
                                            placeholder="Write email body..." 
                                            className="w-full h-28 bg-white dark:bg-black/40 border border-black/10 dark:border-white/[0.06] rounded-lg p-3 text-xs font-medium text-gray-900 dark:text-white focus:border-neon-pink/40 outline-none transition-all resize-none placeholder:text-gray-400 dark:placeholder:text-white/20"
                                        />
                                    </div>
                                    <button 
                                        type="submit"
                                        disabled={sendingEmail}
                                        className="w-full h-10 bg-black text-white dark:bg-white/10 hover:bg-black/80 dark:hover:bg-white/20 dark:text-white rounded-lg text-[9px] font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all disabled:opacity-40"
                                    >
                                        {sendingEmail ? <LoadingSpinner size="xs" color="white" /> : (
                                            <><Send size={11} /> Send Email</>
                                        )}
                                    </button>
                                </form>
                            ) : (
                                <form onSubmit={handleSendMessage} className="space-y-3">
                                    <div>
                                        <label className="text-[8px] font-bold text-gray-500 dark:text-white/40 uppercase tracking-wider block mb-1 pl-0.5">Notification Text</label>
                                        <textarea 
                                            value={messageText}
                                            onChange={(e) => setMessageText(e.target.value)}
                                            placeholder="Write notification message..." 
                                            className="w-full h-28 bg-white dark:bg-black/40 border border-black/10 dark:border-white/[0.06] rounded-lg p-3 text-xs font-medium text-gray-900 dark:text-white focus:border-neon-pink/40 outline-none transition-all resize-none placeholder:text-gray-400 dark:placeholder:text-white/20"
                                        />
                                    </div>
                                    <button 
                                        type="submit"
                                        disabled={sendingMessage}
                                        className="w-full h-10 bg-black text-white dark:bg-white/10 hover:bg-black/80 dark:hover:bg-white/20 dark:text-white rounded-lg text-[9px] font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all disabled:opacity-40"
                                    >
                                        {sendingMessage ? <LoadingSpinner size="xs" color="white" /> : (
                                            <><MessageSquare size={11} /> Send Notification</>
                                        )}
                                    </button>
                                </form>
                            )}
                        </div>

                        {/* ─── Portfolio Link ─── */}
                        {creator.portfolioInfo && (
                            <button 
                                onClick={() => window.open(creator.portfolioInfo.includes('http') ? creator.portfolioInfo : `https://${creator.portfolioInfo}`, '_blank')}
                                className="w-full h-11 bg-black/5 hover:bg-black/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] border border-black/10 dark:border-white/[0.06] text-gray-800 dark:text-white/60 hover:text-black dark:hover:text-white rounded-xl font-bold uppercase tracking-wider text-[9px] flex items-center justify-center gap-2 transition-all"
                            >
                                <FileText size={13} /> View Media Kit / Portfolio
                            </button>
                        )}

                        {/* Bottom spacer for action bar */}
                        <div className="h-20" />
                    </div>
                </div>

                {/* ─── Sticky Bottom Action Bar ─── */}
                <div className="sticky bottom-0 z-50 px-4 sm:px-6 py-3 sm:py-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-white/95 dark:bg-[#0A0A0A]/95 backdrop-blur-xl border-t border-black/10 dark:border-white/[0.06] flex items-center gap-2">
                    <button 
                        onClick={() => onUpdateStatus(creator.uid, 'approved')}
                        disabled={isUpdating || creator.profileStatus === 'approved'}
                        className={cn(
                            "flex-1 h-10 sm:h-11 rounded-xl font-bold uppercase tracking-wider text-[9px] transition-all flex items-center justify-center gap-1.5",
                            creator.profileStatus === 'approved' 
                                ? "bg-neon-green/10 text-neon-green/50 border border-neon-green/20 cursor-default" 
                                : "bg-neon-green text-black hover:brightness-110 active:scale-[0.98]"
                        )}
                    >
                        {isUpdating ? <LoadingSpinner size="xs" color="black" /> : (
                            <><CheckCircle2 size={13} /> {creator.profileStatus === 'approved' ? 'Verified' : 'Verify'}</>
                        )}
                    </button>
                    <button 
                        onClick={() => onUpdateStatus(creator.uid, 'rejected')}
                        disabled={isUpdating || creator.profileStatus === 'rejected'}
                        className={cn(
                            "flex-1 h-10 sm:h-11 rounded-xl font-bold uppercase tracking-wider text-[9px] transition-all border flex items-center justify-center gap-1.5",
                            creator.profileStatus === 'rejected' 
                                ? "bg-yellow-500/10 text-yellow-500/50 border-yellow-500/20 cursor-default" 
                                : "bg-transparent border-yellow-500/30 text-yellow-500 hover:bg-yellow-500/10 active:scale-[0.98]"
                        )}
                    >
                        {isUpdating ? <LoadingSpinner size="xs" color="yellow" /> : (
                            <><Ban size={12} /> Reject</>
                        )}
                    </button>
                    <button 
                        onClick={() => onDelete(creator.uid)}
                        disabled={isDeleting}
                        className="h-10 sm:h-11 px-3 sm:px-4 rounded-xl bg-transparent border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-all active:scale-[0.98] flex items-center justify-center gap-1 font-bold uppercase tracking-wider text-[9px] shrink-0"
                    >
                        <Trash2 size={13} />
                    </button>
                </div>
            </motion.div>
        </div>,
        document.body
    );
};

const NICHES = [
    'Student/ Campus Creator',
    'Fashion & Luxury',
    'Tech & Gaming',
    'Travel & Lifestyle',
    'Beauty & Fitness',
    'Food & Beverage',
    'College Pages',
    'Startup',
    'Finance',
    'Business',
    'Real Estate',
    'Career',
    'Entrepreneurship',
    'Others'
];

const AddCreatorModal = ({ onClose }) => {
    const { addCreator } = useStore();
    const [isSaving, setIsSaving] = useState(false);
    const [sendWelcomeMail, setSendWelcomeMail] = useState(false);
    const [form, setForm] = useState({
        name: '',
        phone: '',
        email: '',
        city: '',
        customCity: '',
        specializations: '',
        customNiche: '',
        collegeName: '',
        bio: '',
        instagram: '',
        instagramFollowers: '',
        youtube: '',
        twitter: '',
        linkedin: '',
        linkedinFollowers: '',
        profilePicture: '',
        doBarter: '',
        commercials: ''
    });

    const handleChange = (e) => setForm({...form, [e.target.name]: e.target.value});

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (sendWelcomeMail && !form.email?.trim()) {
            useStore.getState().addToast("Please provide an email address to send the welcome email.", 'error');
            return;
        }

        if (form.city === 'Others' && !form.customCity?.trim()) {
            useStore.getState().addToast("Please specify custom city.", 'error');
            return;
        }
        if (form.specializations === 'Others' && !form.customNiche?.trim()) {
            useStore.getState().addToast("Please specify custom content niche.", 'error');
            return;
        }

        const showCollege = form.specializations === 'Student/ Campus Creator' || form.specializations === 'Student Creator/ Campus Creator' || form.specializations === 'College Pages';
        if (showCollege && !form.collegeName?.trim()) {
            useStore.getState().addToast("Please enter college name.", 'error');
            return;
        }

        if (form.instagram && (form.instagram.includes('/') || form.instagram.includes('http') || form.instagram.includes('.com'))) {
            useStore.getState().addToast("Please enter only the Instagram username/handle, not a full link.", 'error');
            return;
        }

        const normPhone = normalizePhoneNumber(form.phone);
        if (normPhone) {
            const creators = useStore.getState().creators;
            const existing = creators.find(c => normalizePhoneNumber(c.phone) === normPhone);
            if (existing) {
                useStore.getState().addToast(`The mobile number ${form.phone} is already linked to creator profile ${existing.name || existing.displayName} (${existing.email}).`, 'error');
                return;
            }
        }

        setIsSaving(true);
        try {
            const finalCity = form.city === 'Others' ? form.customCity : form.city;
            const finalNiche = form.specializations === 'Others' ? form.customNiche : form.specializations;
            const generatedUid = `manual_${Math.random().toString(36).substring(2, 15)}`;
            const cleanInstagram = form.instagram ? form.instagram.trim().replace(/^@/, '') : '';

            await addCreator({
                uid: generatedUid,
                name: form.name,
                phone: form.phone || '',
                email: form.email || '',
                city: finalCity || '',
                categories: finalNiche || '',
                specializations: finalNiche ? [finalNiche] : [],
                collegeName: form.collegeName || '',
                bio: form.bio || '',
                instagram: cleanInstagram,
                instagramFollowers: form.instagramFollowers || '0',
                youtube: form.youtube || '',
                twitter: form.twitter || '',
                linkedin: form.linkedin || '',
                linkedinFollowers: form.linkedinFollowers || '0',
                profilePicture: form.profilePicture || '',
                doBarter: form.doBarter || '',
                commercials: form.commercials || '',
                profileStatus: 'approved',
                isPhoneVerified: true
            }, sendWelcomeMail);
            useStore.getState().addToast("Creator profile added successfully!", 'success');
            onClose();
        } catch (err) {
            console.error("Error manually adding creator:", err);
            useStore.getState().addToast(err.message || "Failed to add creator profile.", 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const showCollegeField = form.specializations === 'Student/ Campus Creator' || form.specializations === 'Student Creator/ Campus Creator' || form.specializations === 'College Pages';

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 md:p-10 bg-black/60 dark:bg-black/50 backdrop-blur-md overflow-y-auto">
            <div className="fixed inset-0 bg-black/60 dark:bg-black/80" onClick={onClose} />
            <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="relative bg-white dark:bg-[#050505] border border-black/10 dark:border-white/10 rounded-2xl sm:rounded-[2.5rem] w-full max-w-2xl max-h-[92dvh] overflow-y-auto p-5 sm:p-8 md:p-10 shadow-2xl z-10 custom-scrollbar"
            >
                <button onClick={onClose} className="absolute top-6 right-6 w-10 h-10 rounded-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 flex items-center justify-center text-gray-600 dark:text-gray-400 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all">
                    <X size={16} />
                </button>
                
                <h3 className="text-2xl font-black uppercase italic tracking-tighter text-gray-900 dark:text-white mb-6">MANUALLY ADD INFLUENCER</h3>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Full Name</label>
                            <input required name="name" value={form.name} onChange={handleChange} placeholder="Full Name" className="w-full h-12 bg-gray-50 dark:bg-black border border-black/10 dark:border-white/10 rounded-xl px-4 text-sm font-bold text-gray-900 dark:text-white focus:border-neon-blue outline-none transition-all" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Contact Number</label>
                            <input name="phone" type="tel" value={form.phone} onChange={handleChange} placeholder="Contact Number (Optional)" className="w-full h-12 bg-gray-50 dark:bg-black border border-black/10 dark:border-white/10 rounded-xl px-4 text-sm font-bold text-gray-900 dark:text-white focus:border-neon-blue outline-none transition-all" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Email Address</label>
                            <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="email@example.com (Optional)" className="w-full h-12 bg-gray-50 dark:bg-black border border-black/10 dark:border-white/10 rounded-xl px-4 text-sm font-bold text-gray-900 dark:text-white focus:border-neon-blue outline-none transition-all" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Operational Hub (City)</label>
                            <select
                                name="city" value={form.city} onChange={handleChange}
                                className="w-full h-12 bg-gray-50 dark:bg-black border border-black/10 dark:border-white/10 rounded-xl px-4 text-sm font-bold text-gray-900 dark:text-white focus:border-neon-blue outline-none transition-all appearance-none cursor-pointer"
                            >
                                <option value="">Select City (Optional)</option>
                                {PREDEFINED_CITIES.map(c => <option key={c} value={c} className="bg-gray-100 dark:bg-zinc-950">{c.toUpperCase()}</option>)}
                            </select>
                        </div>
                    </div>

                    {form.city === 'Others' && (
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Specify City Name</label>
                            <input name="customCity" value={form.customCity} onChange={handleChange} placeholder="City Name" className="w-full h-12 bg-gray-50 dark:bg-black border border-black/10 dark:border-white/10 rounded-xl px-4 text-sm font-bold text-gray-900 dark:text-white focus:border-neon-blue outline-none transition-all" />
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Niche / Specialization</label>
                            <select
                                name="specializations" value={form.specializations} onChange={handleChange}
                                className="w-full h-12 bg-gray-50 dark:bg-black border border-black/10 dark:border-white/10 rounded-xl px-4 text-sm font-bold text-gray-900 dark:text-white focus:border-neon-blue outline-none transition-all appearance-none cursor-pointer"
                            >
                                <option value="">Select Niche (Optional)</option>
                                {NICHES.map(n => <option key={n} value={n} className="bg-gray-100 dark:bg-zinc-950">{n.toUpperCase()}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">
                                College Name {showCollegeField ? '' : '(Optional)'}
                            </label>
                            <input 
                                name="collegeName" 
                                value={form.collegeName} 
                                onChange={handleChange} 
                                placeholder={showCollegeField ? 'College/University Name' : 'College/University Name (Optional)'} 
                                className="w-full h-12 bg-gray-50 dark:bg-black border border-black/10 dark:border-white/10 rounded-xl px-4 text-sm font-bold text-gray-900 dark:text-white focus:border-neon-blue outline-none transition-all" 
                            />
                            <p className="text-[8px] font-bold text-gray-500 uppercase tracking-wider pl-1 mt-0.5 leading-normal">
                                Matching college helps connect creators with regional campaigns and events.
                            </p>
                        </div>
                    </div>

                    {form.specializations === 'Others' && (
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Specify Content Niche</label>
                            <input name="customNiche" value={form.customNiche} onChange={handleChange} placeholder="Niche Description" className="w-full h-12 bg-gray-50 dark:bg-black border border-black/10 dark:border-white/10 rounded-xl px-4 text-sm font-bold text-gray-900 dark:text-white focus:border-neon-blue outline-none transition-all" />
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Instagram Handle</label>
                            <input name="instagram" value={form.instagram} onChange={handleChange} placeholder="@handle" className="w-full h-12 bg-gray-50 dark:bg-black border border-black/10 dark:border-white/10 rounded-xl px-4 text-sm font-bold text-gray-900 dark:text-white focus:border-neon-blue outline-none transition-all" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Instagram Followers</label>
                            <input name="instagramFollowers" type="number" value={form.instagramFollowers} onChange={handleChange} placeholder="e.g. 5000 (Optional)" className="w-full h-12 bg-gray-50 dark:bg-black border border-black/10 dark:border-white/10 rounded-xl px-4 text-sm font-bold text-gray-900 dark:text-white focus:border-neon-blue outline-none transition-all" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">LinkedIn Profile URL</label>
                            <input name="linkedin" value={form.linkedin} onChange={handleChange} placeholder="https://linkedin.com/in/username" className="w-full h-12 bg-gray-50 dark:bg-black border border-black/10 dark:border-white/10 rounded-xl px-4 text-sm font-bold text-gray-900 dark:text-white focus:border-neon-blue outline-none transition-all" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">LinkedIn Connections</label>
                            <input name="linkedinFollowers" type="number" value={form.linkedinFollowers} onChange={handleChange} placeholder="e.g. 500 (Optional)" className="w-full h-12 bg-gray-50 dark:bg-black border border-black/10 dark:border-white/10 rounded-xl px-4 text-sm font-bold text-gray-900 dark:text-white focus:border-neon-blue outline-none transition-all" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">YouTube URL</label>
                            <input name="youtube" value={form.youtube} onChange={handleChange} placeholder="https://youtube.com/..." className="w-full h-12 bg-gray-50 dark:bg-black border border-black/10 dark:border-white/10 rounded-xl px-4 text-sm font-bold text-gray-900 dark:text-white focus:border-neon-blue outline-none transition-all" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Twitter / X URL</label>
                            <input name="twitter" value={form.twitter} onChange={handleChange} placeholder="https://twitter.com/..." className="w-full h-12 bg-gray-50 dark:bg-black border border-black/10 dark:border-white/10 rounded-xl px-4 text-sm font-bold text-gray-900 dark:text-white focus:border-neon-blue outline-none transition-all" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Barter Collaborations</label>
                            <select
                                name="doBarter" value={form.doBarter} onChange={handleChange}
                                className="w-full h-12 bg-gray-50 dark:bg-black border border-black/10 dark:border-white/10 rounded-xl px-4 text-sm font-bold text-gray-900 dark:text-white focus:border-neon-blue outline-none transition-all appearance-none cursor-pointer"
                            >
                                <option value="">Select Preference</option>
                                <option value="yes" className="bg-gray-100 dark:bg-zinc-950">YES</option>
                                <option value="no" className="bg-gray-100 dark:bg-zinc-950">NO (ONLY PAID)</option>
                                <option value="selective" className="bg-gray-100 dark:bg-zinc-950">SELECTIVE</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Commercial Rates</label>
                            <input name="commercials" value={form.commercials} onChange={handleChange} placeholder="e.g. 5k/Reel, 2k/Story" className="w-full h-12 bg-gray-50 dark:bg-black border border-black/10 dark:border-white/10 rounded-xl px-4 text-sm font-bold text-gray-900 dark:text-white focus:border-neon-blue outline-none transition-all" />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Profile Picture URL</label>
                        <input name="profilePicture" value={form.profilePicture} onChange={handleChange} placeholder="https://..." className="w-full h-12 bg-gray-50 dark:bg-black border border-black/10 dark:border-white/10 rounded-xl px-4 text-sm font-bold text-gray-900 dark:text-white focus:border-neon-blue outline-none transition-all" />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Strategic Bio</label>
                        <textarea name="bio" value={form.bio} onChange={handleChange} placeholder="Bio description..." className="w-full h-24 bg-gray-50 dark:bg-black border border-black/10 dark:border-white/10 rounded-xl p-4 text-sm font-bold text-gray-900 dark:text-white focus:border-neon-blue outline-none transition-all resize-none animate-none" />
                    </div>

                    <div className="flex items-center gap-3 py-3 bg-gray-50 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-2xl px-4">
                        <input
                            type="checkbox"
                            id="sendWelcomeMail"
                            checked={sendWelcomeMail}
                            onChange={(e) => setSendWelcomeMail(e.target.checked)}
                            disabled={!form.email?.trim()}
                            className="w-5 h-5 rounded border-black/10 dark:border-white/10 bg-white dark:bg-black text-neon-blue focus:ring-0 focus:ring-offset-0 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                        />
                        <label htmlFor="sendWelcomeMail" className={`text-xs font-black uppercase tracking-wider cursor-pointer ${!form.email?.trim() ? 'text-gray-400' : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'}`}>
                            Send Welcome Email {!form.email?.trim() && "(Requires Email)"}
                        </label>
                    </div>

                    <button type="submit" disabled={isSaving} className="w-full h-14 bg-black text-white hover:bg-neon-blue hover:text-black dark:bg-white dark:text-black dark:hover:bg-neon-blue font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg">
                        {isSaving ? <LoadingSpinner size="xs" color="currentColor" /> : 'Add Creator Profile'}
                    </button>
                </form>
            </motion.div>
        </div>,
        document.body
    );
};

/**
 * Referral Leaderboard Sub-component
 */
const ReferralLeaderboard = ({ creators, onSelectCreator }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedUid, setExpandedUid] = useState(null);

    // Calculate leaderboard
    const leaderboard = useMemo(() => {
        const counts = {};
        const referredList = {};

        creators.forEach(c => {
            if (c.referredBy) {
                // Find referrer
                const referrer = creators.find(rc => 
                    rc.uid === c.referredBy || 
                    (rc.creatorId && rc.creatorId.toUpperCase() === c.referredBy.toUpperCase()) ||
                    (rc.instagram && rc.instagram.toLowerCase() === c.referredBy.toLowerCase())
                );
                if (referrer) {
                    counts[referrer.uid] = (counts[referrer.uid] || 0) + 1;
                    if (!referredList[referrer.uid]) referredList[referrer.uid] = [];
                    referredList[referrer.uid].push(c);
                }
            }
        });

        return creators
            .map(c => ({
                ...c,
                referralCount: counts[c.uid] || 0,
                referredCreators: referredList[c.uid] || []
            }))
            .filter(c => c.referralCount > 0)
            .sort((a, b) => b.referralCount - a.referralCount);
    }, [creators]);

    const filteredLeaderboard = useMemo(() => {
        return leaderboard.filter(c => 
            c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (c.instagram && c.instagram.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (c.linkedin && c.linkedin.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [leaderboard, searchTerm]);

    const stats = useMemo(() => {
        const totalReferred = creators.filter(c => c.referredBy).length;
        const topReferrer = leaderboard[0];
        const totalNetworkFollowers = leaderboard.reduce((acc, c) => {
            const referredFollowers = c.referredCreators.reduce((sum, rc) => {
                return sum + Math.max(Number(rc.instagramFollowers || 0), Number(rc.youtubeSubscribers || 0), Number(rc.linkedinFollowers || 0));
            }, 0);
            return acc + referredFollowers;
        }, 0);

        return {
            totalReferred,
            topReferrerName: topReferrer ? topReferrer.name : 'N/A',
            topReferrerCount: topReferrer ? topReferrer.referralCount : 0,
            networkFollowers: totalNetworkFollowers
        };
    }, [creators, leaderboard]);

    const toggleExpand = (uid) => {
        setExpandedUid(expandedUid === uid ? null : uid);
    };

    return (
        <div className="space-y-8 relative z-10 max-w-[1700px] mx-auto pb-20">
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-[#0A0A0A] border border-black/10 dark:border-white/5 p-6 rounded-[2rem] shadow-xl flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-neon-pink/10 border border-neon-pink/20 flex items-center justify-center text-neon-pink shrink-0">
                        <Users size={20} />
                    </div>
                    <div>
                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest leading-none mb-1">TOTAL REFERRED</p>
                        <h3 className="text-3xl font-black text-gray-900 dark:text-white italic">{stats.totalReferred}</h3>
                    </div>
                </div>
                
                <div className="bg-[#0A0A0A] border border-black/10 dark:border-white/5 p-6 rounded-[2rem] shadow-xl flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-neon-blue/10 border border-neon-blue/20 flex items-center justify-center text-neon-blue shrink-0">
                        <Trophy size={20} />
                    </div>
                    <div>
                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest leading-none mb-1">TOP REFERRER</p>
                        <h3 className="text-xl font-black text-gray-900 dark:text-white truncate max-w-[200px] italic">
                            {stats.topReferrerName} ({stats.topReferrerCount})
                        </h3>
                    </div>
                </div>

                <div className="bg-[#0A0A0A] border border-black/10 dark:border-white/5 p-6 rounded-[2rem] shadow-xl flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-neon-green/10 border border-neon-green/20 flex items-center justify-center text-neon-green shrink-0">
                        <TrendingUp size={20} />
                    </div>
                    <div>
                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest leading-none mb-1">NETWORK REACH</p>
                        <h3 className="text-3xl font-black text-gray-900 dark:text-white italic">{stats.networkFollowers.toLocaleString()} FLW</h3>
                    </div>
                </div>
            </div>

            {/* Filter Search */}
            <div className="relative group">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-600 dark:text-gray-400 group-focus-within:text-pink-600 dark:group-focus-within:text-neon-pink transition-colors" size={16} />
                <input
                    type="text"
                    placeholder="SEARCH REFERRERS..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full h-14 pl-14 pr-6 bg-white dark:bg-black/60 border border-black/10 dark:border-white/10 group-hover:border-black/20 dark:group-hover:border-white/20 focus:border-neon-pink/60 rounded-full text-[10px] font-black uppercase tracking-[0.2em] outline-none transition-all placeholder:text-gray-700 text-gray-900 dark:text-white"
                />
            </div>

            {/* Leaderboard Table */}
            {/* Leaderboard Section */}
            <div className="bg-[#050505]/40 md:bg-transparent md:border-none rounded-[2.5rem] border border-black/10 dark:border-white/5 overflow-hidden md:overflow-visible shadow-2xl md:shadow-none">
                
                {/* Desktop Table View */}
                <div className="hidden md:block bg-[#050505]/40 rounded-[2.5rem] border border-black/10 dark:border-white/5 overflow-hidden shadow-2xl">
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-left">
                            <thead>
                                <tr className="border-b border-black/10 dark:border-white/5 text-[9px] font-black text-gray-500 uppercase tracking-[0.3em]">
                                    <th className="py-6 px-8 w-16 text-center">Rank</th>
                                    <th className="py-6 px-6">Creator</th>
                                    <th className="py-6 px-6 text-center">Invites</th>
                                    <th className="py-6 px-6 text-right">Network Reach</th>
                                    <th className="py-6 px-8 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredLeaderboard.map((referrer, index) => {
                                    const isExpanded = expandedUid === referrer.uid;
                                    const totalReach = referrer.referredCreators.reduce((sum, rc) => {
                                        return sum + Math.max(Number(rc.instagramFollowers || 0), Number(rc.youtubeSubscribers || 0), Number(rc.linkedinFollowers || 0));
                                    }, 0);

                                    let medal = `${index + 1}`;
                                    if (index === 0) medal = '🥇';
                                    else if (index === 1) medal = '🥈';
                                    else if (index === 2) medal = '🥉';

                                    return (
                                        <React.Fragment key={referrer.uid}>
                                            <tr 
                                                className={cn(
                                                    "border-b border-white/[0.03] transition-colors hover:bg-white/[0.02]",
                                                    isExpanded && "bg-white/[0.01]"
                                                )}
                                            >
                                                <td className="py-5 px-8 text-center font-black text-lg italic">{medal}</td>
                                                <td className="py-5 px-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-zinc-900 border border-black/10 dark:border-white/5 overflow-hidden flex items-center justify-center shrink-0">
                                                            {referrer.profilePicture ? (
                                                                <img src={referrer.profilePicture} alt="" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <span className="text-[12px] font-black text-gray-900 dark:text-white italic">{referrer.name?.charAt(0)}</span>
                                                            )}
                                                        </div>
                                                        <div>
                                                            <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase italic tracking-tight leading-tight">{referrer.name}</h4>
                                                            <p className="text-[8px] text-gray-500 uppercase tracking-widest mt-0.5">@{referrer.instagram || 'N/A'}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-5 px-6 text-center">
                                                    <span className="inline-flex items-center justify-center px-4 py-1.5 rounded-full bg-neon-pink/15 border border-neon-pink/20 text-neon-pink text-sm font-black tabular-nums">
                                                        {referrer.referralCount}
                                                    </span>
                                                </td>
                                                <td className="py-5 px-6 text-right font-black text-sm text-gray-600 dark:text-gray-400 tabular-nums">
                                                    {totalReach.toLocaleString()} FLW
                                                </td>
                                                <td className="py-5 px-8 text-center">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button 
                                                            onClick={() => toggleExpand(referrer.uid)}
                                                            className="h-10 px-4 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-[9px] font-black uppercase tracking-wider text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-black/10 dark:hover:bg-white/10 transition-all flex items-center gap-1.5 animate-none"
                                                        >
                                                            <span>Invites ({referrer.referredCreators.length})</span>
                                                            {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                                        </button>
                                                        <button 
                                                            onClick={() => onSelectCreator(referrer)}
                                                            className="w-10 h-10 rounded-xl bg-white text-black hover:bg-neon-pink hover:text-gray-900 dark:hover:text-white transition-all flex items-center justify-center"
                                                            title="View Profile"
                                                        >
                                                            <ChevronRight size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>

                                            {/* Expandable referrals row */}
                                            {isExpanded && (
                                                <tr>
                                                    <td colSpan={5} className="bg-white dark:bg-black/30 p-8 border-b border-black/10 dark:border-white/5">
                                                        <div className="space-y-4">
                                                            <div className="flex items-center justify-between border-b border-black/10 dark:border-white/5 pb-2">
                                                                <h5 className="text-[9px] font-black text-neon-pink uppercase tracking-widest">INVITED CREATORS BY {referrer.name.toUpperCase()}</h5>
                                                            </div>
                                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                                {referrer.referredCreators.map(rc => {
                                                                    const isApproved = rc.profileStatus === 'approved';
                                                                    return (
                                                                        <div 
                                                                            key={rc.uid}
                                                                            onClick={() => onSelectCreator(rc)}
                                                                            className="p-4 bg-gray-100 dark:bg-zinc-950/60 border border-black/10 dark:border-white/5 hover:border-black/10 dark:hover:border-white/10 hover:bg-gray-100 dark:hover:bg-zinc-950 rounded-2xl flex items-center justify-between cursor-pointer transition-all group"
                                                                        >
                                                                            <div className="flex items-center gap-3 min-w-0">
                                                                                <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-zinc-900 border border-black/10 dark:border-white/5 overflow-hidden flex items-center justify-center shrink-0">
                                                                                    {rc.profilePicture ? (
                                                                                        <img src={rc.profilePicture} alt="" className="w-full h-full object-cover" />
                                                                                    ) : (
                                                                                        <span className="text-[10px] font-black text-gray-900 dark:text-white italic">{rc.name?.charAt(0)}</span>
                                                                                    )}
                                                                                </div>
                                                                                <div className="min-w-0">
                                                                                    <h6 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-tight truncate leading-tight group-hover:text-neon-pink transition-colors">{rc.name}</h6>
                                                                                    <p className="text-[8px] text-gray-500 uppercase tracking-widest mt-0.5 truncate">@{rc.instagram || 'N/A'}</p>
                                                                                </div>
                                                                            </div>
                                                                            <div className={cn(
                                                                                "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border shrink-0",
                                                                                isApproved ? "bg-neon-green/10 text-neon-green border-neon-green/20" : "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                                                                            )}>
                                                                                {isApproved ? "Verified" : "Pending"}
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                                {filteredLeaderboard.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="py-20 text-center">
                                            <Trophy size={48} className="text-gray-700 mx-auto mb-4 animate-pulse" />
                                            <h4 className="text-lg font-black text-gray-500 uppercase tracking-widest italic">No Leaderboard Data</h4>
                                            <p className="text-[10px] text-gray-700 uppercase tracking-wider mt-1">No referrals have been made by creators yet.</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Mobile Cards View */}
                <div className="md:hidden flex flex-col gap-4 p-4">
                    {filteredLeaderboard.map((referrer, index) => {
                        const isExpanded = expandedUid === referrer.uid;
                        const totalReach = referrer.referredCreators.reduce((sum, rc) => {
                            return sum + Math.max(Number(rc.instagramFollowers || 0), Number(rc.youtubeSubscribers || 0), Number(rc.linkedinFollowers || 0));
                        }, 0);

                        let medal = `${index + 1}`;
                        if (index === 0) medal = '🥇';
                        else if (index === 1) medal = '🥈';
                        else if (index === 2) medal = '🥉';

                        return (
                            <div key={referrer.uid} className="bg-white dark:bg-black/60 rounded-[2rem] border border-black/10 dark:border-white/5 p-5 shadow-lg flex flex-col gap-4">
                                <div className="flex items-center justify-between border-b border-black/10 dark:border-white/5 pb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-zinc-900 border border-black/10 dark:border-white/5 overflow-hidden flex items-center justify-center shrink-0">
                                            {referrer.profilePicture ? (
                                                <img src={referrer.profilePicture} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-[12px] font-black text-gray-900 dark:text-white italic">{referrer.name?.charAt(0)}</span>
                                            )}
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase italic tracking-tight leading-tight flex items-center gap-2">
                                                {referrer.name} <span className="text-lg">{medal}</span>
                                            </h4>
                                            <p className="text-[8px] text-gray-500 uppercase tracking-widest mt-0.5">@{referrer.instagram || 'N/A'}</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => onSelectCreator(referrer)}
                                        className="w-10 h-10 rounded-xl bg-black/5 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-black/10 dark:hover:bg-white/10 transition-all flex items-center justify-center shrink-0"
                                        title="View Profile"
                                    >
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                                
                                <div className="flex items-center justify-between pt-2">
                                    <div>
                                        <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1">INVITES</p>
                                        <span className="inline-flex items-center justify-center px-4 py-1.5 rounded-full bg-neon-pink/15 border border-neon-pink/20 text-neon-pink text-sm font-black tabular-nums">
                                            {referrer.referralCount}
                                        </span>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1">NETWORK REACH</p>
                                        <p className="font-black text-sm text-gray-600 dark:text-gray-400 tabular-nums">
                                            {totalReach.toLocaleString()} FLW
                                        </p>
                                    </div>
                                </div>

                                <button 
                                    onClick={() => toggleExpand(referrer.uid)}
                                    className="w-full h-12 mt-2 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-[10px] font-black uppercase tracking-wider text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-black/10 dark:hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                                >
                                    <span>Invites ({referrer.referredCreators.length})</span>
                                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                </button>

                                {/* Expandable referrals */}
                                <AnimatePresence>
                                    {isExpanded && (
                                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mt-2 pt-4 border-t border-black/10 dark:border-white/5">
                                            <div className="flex flex-col gap-3">
                                                {referrer.referredCreators.map(rc => {
                                                    const isApproved = rc.profileStatus === 'approved';
                                                    return (
                                                        <div 
                                                            key={rc.uid}
                                                            onClick={() => onSelectCreator(rc)}
                                                            className="p-4 bg-gray-100 dark:bg-zinc-950/60 border border-black/10 dark:border-white/5 hover:border-black/10 dark:hover:border-white/10 hover:bg-gray-100 dark:hover:bg-zinc-950 rounded-2xl flex items-center justify-between cursor-pointer transition-all group"
                                                        >
                                                            <div className="flex items-center gap-3 min-w-0">
                                                                <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-zinc-900 border border-black/10 dark:border-white/5 overflow-hidden flex items-center justify-center shrink-0">
                                                                    {rc.profilePicture ? (
                                                                        <img src={rc.profilePicture} alt="" className="w-full h-full object-cover" />
                                                                    ) : (
                                                                        <span className="text-[10px] font-black text-gray-900 dark:text-white italic">{rc.name?.charAt(0)}</span>
                                                                    )}
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <h6 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-tight truncate leading-tight group-hover:text-neon-pink transition-colors">{rc.name}</h6>
                                                                    <p className="text-[8px] text-gray-500 uppercase tracking-widest mt-0.5 truncate">@{rc.instagram || 'N/A'}</p>
                                                                </div>
                                                            </div>
                                                            <div className={cn(
                                                                "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border shrink-0",
                                                                isApproved ? "bg-neon-green/10 text-neon-green border-neon-green/20" : "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                                                            )}>
                                                                {isApproved ? "Verified" : "Pending"}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        );
                    })}
                    {filteredLeaderboard.length === 0 && (
                        <div className="py-20 text-center">
                            <Trophy size={48} className="text-gray-700 mx-auto mb-4 animate-pulse" />
                            <h4 className="text-lg font-black text-gray-500 uppercase tracking-widest italic">No Leaderboard Data</h4>
                            <p className="text-[10px] text-gray-700 uppercase tracking-wider mt-1">No referrals have been made by creators yet.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const BulkEmailModal = ({ selectedUids, creators, onClose }) => {
    const [emailSubject, setEmailSubject] = useState('Partnership Update - Newbi Entertainment');
    const [emailBody, setEmailBody] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0 });
    const selectedCreators = useMemo(() => creators.filter(c => selectedUids.includes(c.uid)), [creators, selectedUids]);

    const handleSendBulkEmail = async (e) => {
        e.preventDefault();
        if (!emailSubject.trim() || !emailBody.trim()) {
            useStore.getState().addToast("Please fill in subject and body.", 'warning');
            return;
        }

        setIsSending(true);
        setProgress({ current: 0, total: selectedCreators.length });

        let successCount = 0;
        let failCount = 0;

        for (let i = 0; i < selectedCreators.length; i++) {
            const creator = selectedCreators[i];
            setProgress({ current: i + 1, total: selectedCreators.length });
            try {
                const res = await sendCreatorDirectEmail(creator.email, emailSubject, emailBody, creator.name);
                if (res.success) {
                    successCount++;
                } else {
                    failCount++;
                }
            } catch (err) {
                failCount++;
            }
        }

        setIsSending(false);
        useStore.getState().addToast(`Bulk email process completed: ${successCount} sent, ${failCount} failed.`, 'success');
        onClose();
    };

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 md:p-10 bg-white dark:bg-black/50 backdrop-blur-md overflow-y-auto">
            <div className="fixed inset-0 bg-white dark:bg-black/80" onClick={onClose} />
            <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="relative bg-[#050505] border border-black/10 dark:border-white/10 rounded-2xl sm:rounded-[2.5rem] w-full max-w-2xl max-h-[92dvh] overflow-y-auto p-5 sm:p-8 md:p-10 shadow-2xl z-10 custom-scrollbar"
            >
                <div className="flex items-center justify-between border-b border-black/10 dark:border-white/5 pb-4 mb-5 sm:mb-6">
                    <div>
                        <h3 className="text-xl sm:text-2xl font-black font-heading uppercase italic tracking-tighter">BULK PARTNERSHIP EMAIL</h3>
                        <p className="text-[8px] sm:text-[9px] font-black text-gray-500 uppercase tracking-widest mt-1">Sending to {selectedCreators.length} recipients</p>
                    </div>
                    <button onClick={onClose} className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white flex items-center justify-center">
                        <X size={16} />
                    </button>
                </div>

                {isSending ? (
                    <div className="py-12 flex flex-col items-center justify-center space-y-6 text-center">
                        <LoadingSpinner size="md" color="#FF007F" />
                        <div className="space-y-1">
                            <h4 className="text-lg font-black uppercase tracking-wider text-gray-900 dark:text-white">Dispatched {progress.current} of {progress.total}</h4>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Generating and transmitting official branded emails...</p>
                        </div>
                        <div className="w-full bg-black/5 dark:bg-white/5 h-2 rounded-full overflow-hidden max-w-md">
                            <div 
                                className="bg-neon-pink h-full transition-all duration-300"
                                style={{ width: `${(progress.current / progress.total) * 100}%` }}
                            />
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSendBulkEmail} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Recipients Preview</label>
                            <div className="bg-[#0A0A0A] border border-black/10 dark:border-white/5 p-4 rounded-2xl max-h-[120px] overflow-y-auto custom-scrollbar flex flex-wrap gap-2">
                                {selectedCreators.map(c => (
                                    <span key={c.uid} className="px-3 py-1 bg-black/5 dark:bg-white/5 rounded-lg text-[9px] font-black text-gray-700 dark:text-gray-300 border border-black/10 dark:border-white/5">
                                        {c.name} ({c.email || 'No email'})
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Email Subject</label>
                            <input 
                                required
                                type="text" 
                                value={emailSubject}
                                onChange={(e) => setEmailSubject(e.target.value)}
                                className="w-full h-12 bg-white dark:bg-black border border-black/10 dark:border-white/10 rounded-xl px-4 text-xs font-bold text-gray-900 dark:text-white focus:border-neon-pink outline-none transition-all"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Email Body</label>
                            <textarea 
                                required
                                value={emailBody}
                                onChange={(e) => setEmailBody(e.target.value)}
                                placeholder="WRITE YOUR BULK CORRESPONDENCE MESSAGE HERE..."
                                className="w-full h-64 bg-white dark:bg-black border border-black/10 dark:border-white/10 rounded-xl p-4 text-xs font-bold text-gray-900 dark:text-white focus:border-neon-pink outline-none transition-all resize-none placeholder:text-gray-700"
                            />
                        </div>

                        <button 
                            type="submit"
                            className="w-full h-16 bg-neon-pink text-black font-black uppercase tracking-widest text-xs rounded-2xl hover:bg-neon-pink/90 transition-all flex items-center justify-center gap-2 shadow-[0_15px_40px_rgba(255,0,127,0.3)]"
                        >
                            <Mail size={16} /> SEND BULK CAMPAIGN
                        </button>
                    </form>
                )}
            </motion.div>
        </div>,
        document.body
    );
};

export default CreatorManager;

