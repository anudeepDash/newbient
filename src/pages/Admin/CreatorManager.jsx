import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '../../lib/store';
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
import { cn } from '../../lib/utils';
import AdminDashboardLink from '../../components/admin/AdminDashboardLink';
import AdminCommunityHubLayout from '../../components/admin/AdminCommunityHubLayout';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
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

const CreatorManager = ({ showLeaderboardOnly = false }) => {
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

            return matchesSearch && matchesCity && matchesStatus && matchesNiche && matchesFollowers;
        });
    }, [creators, searchTerm, filterCity, filterStatus, filterNiche, minFollowers, maxFollowers]);

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
    }, [searchTerm, filterCity, filterStatus, filterNiche, minFollowers, maxFollowers]);

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
            <div className="relative z-10 max-w-[1700px] mx-auto pb-20">
            <div>
                {/* Control Panel */}
                <div className="relative z-50 bg-[#0A0A0A]/80 backdrop-blur-3xl border border-white/10 rounded-[1.5rem] md:rounded-[2rem] p-1.5 md:p-2.5 md:pr-6 mb-8 md:mb-16 shadow-[0_30px_100px_rgba(0,0,0,0.8)] flex flex-col 2xl:flex-row 2xl:flex-wrap 2xl:items-center gap-2 md:gap-3">
                    
                    {/* Search Engine */}
                    <div className="relative flex-1 min-w-[280px] group">
                        <div className="absolute inset-0 bg-gradient-to-r from-neon-pink/10 to-transparent opacity-0 group-focus-within:opacity-100 transition-opacity rounded-full pointer-events-none" />
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-neon-pink transition-colors" size={16} />
                        <input
                            type="text"
                            placeholder="SEARCH CREATORS..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full h-14 pl-14 pr-6 bg-black/60 border border-white/10 group-hover:border-white/20 focus:border-neon-pink/60 rounded-full text-[10px] font-black uppercase tracking-[0.2em] outline-none transition-all placeholder:text-gray-700 text-white min-w-0"
                        />
                    </div>

                    {/* Filter Cluster */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:flex lg:flex-wrap 2xl:flex-wrap items-center gap-2 shrink-0 w-full 2xl:w-auto pr-0 md:pr-2">
                        {/* Custom Followers Range Popover Selector */}
                        <div className="relative w-full lg:w-[160px]" ref={followersRef}>
                            <div 
                                onClick={() => setIsFollowersOpen(!isFollowersOpen)}
                                className={cn(
                                    "flex items-center justify-between h-12 md:h-14 bg-black/60 border border-white/10 rounded-xl md:rounded-full px-4 cursor-pointer hover:border-white/20 transition-all group shadow-inner select-none",
                                    isFollowersOpen && "border-white/20"
                                )}
                            >
                                <span className={cn(
                                    "text-[10px] font-black uppercase tracking-[0.12em] truncate leading-none",
                                    (!minFollowers && !maxFollowers) ? "text-white/30" : "text-white italic"
                                )}>
                                    {getFollowersLabel()}
                                </span>
                                <ChevronDown 
                                    size={14} 
                                    className={cn(
                                        "transition-all duration-300 shrink-0 ml-2 text-white/30 group-hover:text-white/50",
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
                                        className="absolute z-[100] left-0 mt-3 w-[260px] bg-[#0a0a0a]/95 backdrop-blur-[64px] border border-white/10 rounded-2xl shadow-[0_30px_60px_rgba(0,0,0,0.8)] p-6 space-y-4"
                                    >
                                        <div className="space-y-1">
                                            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-1">FOLLOWER RANGE</p>
                                        </div>
                                        <div className="flex gap-2 items-center">
                                            <div className="space-y-1 flex-1">
                                                <label className="text-[8px] font-black text-gray-600 uppercase tracking-widest pl-1">MIN</label>
                                                <input 
                                                    type="number" 
                                                    value={minFollowers} 
                                                    onChange={(e) => setMinFollowers(e.target.value)}
                                                    placeholder="0" 
                                                    className="w-full h-10 bg-black/40 border border-white/10 rounded-lg px-2 text-xs font-bold text-white focus:border-neon-pink outline-none transition-all"
                                                />
                                            </div>
                                            <span className="text-gray-600 text-xs font-bold pt-4">-</span>
                                            <div className="space-y-1 flex-1">
                                                <label className="text-[8px] font-black text-gray-600 uppercase tracking-widest pl-1">MAX</label>
                                                <input 
                                                    type="number" 
                                                    value={maxFollowers} 
                                                    onChange={(e) => setMaxFollowers(e.target.value)}
                                                    placeholder="Any" 
                                                    className="w-full h-10 bg-black/40 border border-white/10 rounded-lg px-2 text-xs font-bold text-white focus:border-neon-pink outline-none transition-all"
                                                />
                                            </div>
                                        </div>

                                        <div className="h-px bg-white/5" />

                                        {/* Preset quick ranges */}
                                        <div className="space-y-2">
                                            <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest pl-1">PRESETS</p>
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
                                                        className="px-3 py-2 bg-white/5 border border-white/5 hover:border-neon-pink/20 hover:bg-neon-pink/5 hover:text-neon-pink rounded-lg text-[9px] font-black uppercase tracking-wider text-gray-400 transition-all text-center"
                                                    >
                                                        {p.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="flex gap-2 pt-2 select-none">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setMinFollowers('');
                                                    setMaxFollowers('');
                                                    setIsFollowersOpen(false);
                                                }}
                                                className="flex-1 py-2 rounded-lg border border-white/5 hover:bg-white/5 text-[9px] font-black uppercase tracking-wider text-gray-500 hover:text-white transition-all text-center"
                                            >
                                                RESET
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setIsFollowersOpen(false)}
                                                className="flex-1 py-2 rounded-lg bg-neon-pink text-black text-[9px] font-black uppercase tracking-wider transition-all text-center hover:scale-[1.02] active:scale-95"
                                            >
                                                APPLY
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Niche Filter */}
                        <div className="w-full lg:w-[150px]">
                            <StudioSelect 
                                value={filterNiche} 
                                options={['All', ...NICHES].map(n => ({ value: n, label: n === 'All' ? 'NICHE' : n.toUpperCase() }))} 
                                onChange={setFilterNiche} 
                                className="h-12 md:h-14 rounded-xl md:rounded-full border-white/10 bg-black/60" 
                                accentColor="neon-pink" 
                                classNamePrefix="studio-select"
                            />
                        </div>

                        {/* Location Filter */}
                        <div className="w-full lg:w-[150px]">
                            <StudioSelect 
                                value={filterCity} 
                                options={cities.map(c => ({ value: c, label: c === 'All' ? 'LOCATION' : c.toUpperCase() }))} 
                                onChange={setFilterCity} 
                                className="h-12 md:h-14 rounded-xl md:rounded-full border-white/10 bg-black/60" 
                                accentColor="neon-blue" 
                                classNamePrefix="studio-select"
                            />
                        </div>

                        {/* Status Filter */}
                        <div className="w-full lg:w-[150px] col-span-2 sm:col-span-1">
                            <StudioSelect 
                                value={filterStatus} 
                                options={[
                                    { value: 'All', label: 'STATUS' }, 
                                    { value: 'approved', label: 'VERIFIED' }, 
                                    { value: 'pending', label: 'PENDING' }, 
                                    { value: 'rejected', label: 'REJECTED' }
                                ]} 
                                onChange={setFilterStatus} 
                                className="h-12 md:h-14 rounded-xl md:rounded-full border-white/10 bg-black/60" 
                                accentColor="neon-green" 
                                classNamePrefix="studio-select"
                            />
                        </div>

                        <div className="w-px h-8 bg-white/5 mx-1 hidden lg:block" />

                        <div className="hidden md:flex bg-black/60 p-1 rounded-full border border-white/10 shrink-0 h-14 items-center">
                            <button 
                                onClick={() => setViewMode('grid')} 
                                className={cn(
                                    "w-11 h-11 rounded-full flex items-center justify-center transition-all", 
                                    viewMode === 'grid' ? "bg-white text-black shadow-xl" : "text-gray-500 hover:text-white"
                                )}
                            >
                                <LayoutGrid size={16} />
                            </button>
                            <button 
                                onClick={() => setViewMode('list')} 
                                className={cn(
                                    "w-11 h-11 rounded-full flex items-center justify-center transition-all", 
                                    viewMode === 'list' ? "bg-white text-black shadow-xl" : "text-gray-500 hover:text-white"
                                )}
                            >
                                <FileSpreadsheet size={16} />
                            </button>
                        </div>

                        <button 
                            onClick={exportToCSV}
                            className="group relative h-12 md:h-14 px-4 md:px-8 bg-white text-black rounded-xl md:rounded-full font-black uppercase tracking-[0.2em] text-[9px] md:text-[10px] overflow-hidden hover:scale-[1.02] active:scale-95 transition-all shadow-[0_15px_40px_rgba(255,255,255,0.1)] flex items-center justify-center gap-3 w-full lg:w-auto shrink-0 col-span-2 sm:col-span-3 lg:col-span-1"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-neon-pink via-purple-500 to-neon-blue opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            <div className="relative z-10 flex items-center gap-3 group-hover:text-white transition-colors duration-500">
                                <Download size={16} />
                                EXPORT CSV
                            </div>
                        </button>

                        <label className="group relative h-12 md:h-14 px-4 md:px-8 bg-zinc-900 border border-white/10 hover:border-white/20 text-white rounded-xl md:rounded-full font-black uppercase tracking-[0.2em] text-[9px] md:text-[10px] hover:scale-[1.02] active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-3 w-full lg:w-auto shrink-0 col-span-2 sm:col-span-3 lg:col-span-1">
                            <Upload size={16} className="text-neon-pink" />
                            IMPORT SHEET
                            <input type="file" accept=".csv" onChange={handleImportCSV} className="hidden" />
                        </label>

                        <button 
                            onClick={() => setIsAddModalOpen(true)}
                            className="group relative h-12 md:h-14 px-4 md:px-8 bg-zinc-900 border border-white/10 hover:border-white/20 text-white rounded-xl md:rounded-full font-black uppercase tracking-[0.2em] text-[9px] md:text-[10px] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 w-full lg:w-auto shrink-0 col-span-2 sm:col-span-3 lg:col-span-1"
                        >
                            <Plus size={16} className="text-neon-blue" />
                            ADD CREATOR
                        </button>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="relative min-h-[500px]">
                    <AnimatePresence mode="wait">
                        {creators.length === 0 ? (
                            <motion.div 
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="py-40 text-center bg-[#050505]/40 rounded-[4rem] border border-white/5 flex flex-col items-center gap-8 shadow-inner"
                            >
                                <div className="w-32 h-32 bg-white/5 rounded-full flex items-center justify-center border border-white/10 animate-pulse">
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
                                            <button onClick={() => scrollContainer('creator-grid', 'left')} className="w-12 h-12 rounded-2xl bg-black/80 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white pointer-events-auto hover:bg-white hover:text-black transition-all shadow-2xl">
                                                <ChevronRight className="rotate-180" size={24} />
                                            </button>
                                        </div>
                                        <div className="absolute -right-4 top-1/2 -translate-y-1/2 z-20 hidden md:flex opacity-0 group-hover/carousel:opacity-100 transition-opacity pointer-events-none">
                                            <button onClick={() => scrollContainer('creator-grid', 'right')} className="w-12 h-12 rounded-2xl bg-black/80 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white pointer-events-auto hover:bg-white hover:text-black transition-all shadow-2xl">
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
                                        <div className="flex items-center gap-6 px-10 py-6 text-[10px] font-black text-gray-600 uppercase tracking-[0.4em] border-b border-white/5">
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
                                            className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white disabled:opacity-20 hover:bg-white hover:text-black transition-all"
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
                                                                : "bg-white/5 text-gray-500 border-white/10 hover:border-white/30"
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
                                            className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white disabled:opacity-20 hover:bg-white hover:text-black transition-all"
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

    return (
        <AdminCommunityHubLayout
            studioHeader={{
                title: 'CREATOR',
                subtitle: 'PORTAL',
                icon: Users,
                accentClass: 'text-neon-pink'
            }}
            accentColor="neon-pink"
            tabs={personnelTabs}
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
                {selectedUids.length > 0 && !isLeaderboardRoute && createPortal(
                    <motion.div
                        initial={{ y: 100, x: '-50%', opacity: 0 }}
                        animate={{ y: 0, x: '-50%', opacity: 1 }}
                        exit={{ y: 100, x: '-50%', opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        className="fixed bottom-8 left-1/2 z-[100] w-[90%] max-w-2xl bg-black/60 backdrop-blur-2xl border border-white/10 rounded-3xl px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-t-white/20"
                    >
                        <div className="flex items-center gap-3">
                            <span className="w-3 h-3 rounded-full bg-neon-pink animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-white">
                                {selectedUids.length} Creator{selectedUids.length > 1 ? 's' : ''} Selected
                            </span>
                        </div>
                        <div className="flex items-center gap-3 w-full md:w-auto">
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
                                className="flex-1 md:flex-none h-10 px-4 bg-white/5 border border-white/10 hover:border-white/20 text-white font-black text-[9px] uppercase tracking-widest rounded-xl transition-all"
                            >
                                Select Page
                            </button>
                            <button
                                onClick={handleDeselectAll}
                                className="flex-1 md:flex-none h-10 px-4 bg-white/5 border border-white/10 hover:border-white/20 text-white font-black text-[9px] uppercase tracking-widest rounded-xl transition-all"
                            >
                                Deselect All
                            </button>
                            <button
                                onClick={() => setIsBulkEmailModalOpen(true)}
                                className="flex-1 md:flex-none h-10 px-6 bg-neon-pink text-black hover:bg-neon-pink/90 font-black text-[9px] uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,0,127,0.3)]"
                            >
                                <Mail size={12} /> Email Selected
                            </button>
                        </div>
                    </motion.div>,
                    document.body
                )}
            </AnimatePresence>
        </AdminCommunityHubLayout>
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
                        "rounded-2xl flex items-center justify-center shadow-inner border border-white/5 shrink-0", 
                        compact ? "w-10 h-10 md:w-12 md:h-12" : "w-16 h-16",
                        theme.bg, theme.text
                    )}>
                        {React.cloneElement(icon, { size: compact ? 18 : 24 })}
                    </div>
                    {!compact && (
                        <div className="text-right">
                            <TrendingUp size={16} className={cn("inline-block mr-2", theme.text)} />
                            <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">+8%</span>
                        </div>
                    )}
                </div>
                <div className={cn("space-y-1", compact ? "flex-1" : "")}>
                    <p className={cn("font-black uppercase tracking-[0.4em] leading-tight text-gray-500", compact ? "text-[8px]" : "text-[10px]")}>{label}</p>
                    <h3 className={cn("font-black text-white tracking-tighter tabular-nums leading-none", compact ? "text-2xl" : "text-6xl")}>{value}</h3>
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
    const instagramHandle = creator.instagram 
        ? `@${creator.instagram.replace(/^@/, '').trim()}`
        : '';

    const earnedBadges = getEarnedBadges(creator, creators, campaigns);
    const customBadges = creator.adminBadges || [];

    return (
        <motion.div 
            layout
            onClick={onSelect}
            className={cn(
                "group relative bg-zinc-950/45 border backdrop-blur-3xl rounded-[2.5rem] p-6 cursor-pointer overflow-hidden transition-all duration-700 hover:-translate-y-2 hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_40px_80px_rgba(0,0,0,0.7)] hover:border-white/20 flex flex-col h-full min-h-[560px] shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]",
                isSelected ? "border-neon-pink/50 shadow-[0_0_30px_rgba(255,0,127,0.15)] bg-zinc-900/60" : "border-white/[0.08]"
            )}
        >
            <div className="absolute inset-0 bg-gradient-to-br from-neon-pink/5 via-transparent to-neon-blue/5 opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
            
            <div className="relative mb-6 group-hover:scale-[1.01] transition-transform duration-700">
                <div className="aspect-[1/1] rounded-[2rem] overflow-hidden bg-black/40 border border-white/[0.08] relative flex items-center justify-center">
                    {/* Checkbox overlay in the top-left */}
                    <div className="absolute top-4 left-4 z-30 flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                        <input
                            type="checkbox"
                            checked={isSelected || false}
                            onChange={() => onToggleSelect(creator.uid)}
                            className="w-5 h-5 rounded-lg border-white/20 bg-black text-neon-pink focus:ring-0 cursor-pointer shadow-lg transition-transform hover:scale-105 active:scale-95"
                        />
                    </div>
                    {creator.profilePicture ? (
                        <img src={creator.profilePicture} alt={creator.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                    ) : (
                        <div className="text-7xl font-black text-white/[0.03] uppercase italic select-none">
                            {creator.name.charAt(0)}
                        </div>
                    )}
                    <div className="absolute top-4 right-4">
                        <StatusPill status={creator.profileStatus} />
                    </div>
                </div>
                {creator.profileStatus === 'approved' && (
                    <div className="absolute -bottom-4 -right-2 w-12 h-12 bg-neon-green text-black rounded-2xl flex items-center justify-center border-8 border-zinc-950 shadow-[0_10px_20px_rgba(57,255,20,0.3)] z-20 group-hover:rotate-12 transition-transform">
                        <Check size={20} strokeWidth={4} />
                    </div>
                )}
            </div>

            <div className="flex-1 flex flex-col">
                <div className="mb-4">
                    <p className="text-[10px] font-black text-neon-pink uppercase tracking-[0.4em] mb-2">{(creator.niches || creator.specializations || [])[0] || 'CREATOR'}</p>
                    <h3 className="text-3xl font-black text-white tracking-tighter uppercase italic leading-[0.9] group-hover:text-neon-pink transition-colors duration-500 line-clamp-2 mb-3">
                        {creator.name}
                    </h3>
                    
                    {/* Badges Row */}
                    <div className="flex flex-wrap gap-1.5 max-h-[36px] overflow-hidden">
                        {earnedBadges.slice(0, 3).map(badge => (
                            <span 
                                key={badge.id} 
                                title={badge.desc}
                                className={cn("inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border", badge.bg)}
                            >
                                <span>{badge.icon}</span>
                                <span className="text-[7px]">{badge.label.split(' ')[0]}</span>
                            </span>
                        ))}
                        {customBadges.slice(0, 2).map((badge, idx) => (
                            <span 
                                key={`custom-${idx}`} 
                                className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-neon-purple/10 border border-neon-purple/35 text-neon-purple rounded-md text-[8px] font-black uppercase tracking-widest"
                                title={`Custom badge: ${badge}`}
                            >
                                <span>🏅</span>
                                <span className="text-[7px] truncate max-w-[45px]">{badge}</span>
                            </span>
                        ))}
                    </div>
                </div>

                <div className="space-y-2 mb-6">
                    <div className="flex flex-wrap gap-2">
                        <div className="flex items-center gap-1.5 text-gray-400 text-[9px] font-black uppercase tracking-[0.15em] bg-white/[0.03] px-3 py-1.5 rounded-xl border border-white/5">
                            <MapPin size={10} className="text-neon-pink" />
                            <span>{creator.city || 'GLOBAL'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-neon-blue/80 text-[9px] font-black uppercase tracking-[0.15em] bg-neon-blue/5 px-3 py-1.5 rounded-xl border border-neon-blue/10">
                            <TrendingUp size={10} className="animate-pulse" />
                            <span>{Math.max(Number(creator.instagramFollowers || 0), Number(creator.youtubeSubscribers || 0), Number(creator.linkedinFollowers || 0)).toLocaleString()} FLW</span>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <div className="flex items-center gap-2.5 text-gray-400 text-[9px] font-black uppercase tracking-[0.15em] bg-white/[0.02] px-3.5 py-2 rounded-xl border border-white/5 w-full">
                            <Mail size={12} className="text-neon-pink shrink-0" />
                            <span className="truncate">{creator.email || 'N/A'}</span>
                        </div>
                        <div className="flex items-center justify-between text-gray-400 text-[9px] font-black uppercase tracking-[0.15em] bg-white/[0.02] px-3.5 py-2 rounded-xl border border-white/5 w-full">
                            <div className="flex items-center gap-2.5 min-w-0">
                                <Phone size={12} className="text-neon-blue shrink-0" />
                                <span className="truncate">{creator.phone || 'N/A'}</span>
                            </div>
                            {creator.isPhoneVerified ? (
                                <span className="flex items-center gap-0.5 text-neon-green text-[8px] tracking-widest shrink-0 bg-neon-green/10 border border-neon-green/20 px-2 py-0.5 rounded-md font-extrabold">
                                    <Check size={8} strokeWidth={3} /> VERIFIED
                                </span>
                            ) : (
                                <span className="text-yellow-500 text-[8px] tracking-widest shrink-0 bg-yellow-500/10 border border-yellow-500/20 px-2 py-0.5 rounded-md font-extrabold">
                                    UNVERIFIED
                                </span>
                            )}
                        </div>
                    </div>

                    {creator.collegeName && (
                        <div className="flex items-center gap-2.5 text-gray-400 text-[9px] font-black uppercase tracking-[0.15em] bg-white/[0.02] px-3.5 py-2 rounded-xl border border-white/5 w-full">
                            <Layers size={12} className="text-purple-400 shrink-0" />
                            <span className="truncate">{creator.collegeName}</span>
                        </div>
                    )}
                </div>

                <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between">
                    <div>
                        <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest mb-1.5">PLATFORM CONNECT</p>
                        <div className="flex gap-2">
                            {creator.instagram && (
                                <a 
                                    href={instagramUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="inline-flex items-center gap-1.5 text-neon-pink hover:text-white text-[9px] font-black uppercase tracking-[0.2em] bg-neon-pink/5 hover:bg-neon-pink/10 px-2.5 py-1.5 rounded-xl border border-neon-pink/10 transition-all"
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
                                    className="inline-flex items-center gap-1.5 text-neon-blue hover:text-white text-[9px] font-black uppercase tracking-[0.2em] bg-neon-blue/5 hover:bg-neon-blue/10 px-2.5 py-1.5 rounded-xl border border-neon-blue/10 transition-all"
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
                                    className="inline-flex items-center gap-1.5 text-red-500 hover:text-white text-[9px] font-black uppercase tracking-[0.2em] bg-red-500/5 hover:bg-red-500/10 px-2.5 py-1.5 rounded-xl border border-red-500/10 transition-all"
                                    title="YouTube Channel"
                                >
                                    <Youtube size={11} />
                                </a>
                            )}
                            {!creator.instagram && !creator.linkedin && !creator.youtube && (
                                <span className="text-[9px] font-black text-gray-500 tracking-wider">N/A</span>
                            )}
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/10 transition-all shrink-0">
                            <ChevronRight size={16} />
                        </div>
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
                "group flex flex-col lg:flex-row items-start lg:items-center p-6 bg-zinc-950/45 backdrop-blur-3xl border shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] hover:border-white/20 hover:bg-zinc-900/60 rounded-3xl cursor-pointer transition-all duration-300 gap-6",
                isSelected ? "border-neon-pink/50 bg-zinc-900/60" : "border-white/[0.08]"
            )}
        >
            <div className="flex items-center gap-4 w-full lg:w-auto min-w-0">
                <div onClick={(e) => e.stopPropagation()} className="shrink-0 flex items-center justify-center pr-2">
                    <input
                        type="checkbox"
                        checked={isSelected || false}
                        onChange={() => onToggleSelect(creator.uid)}
                        className="w-5 h-5 rounded border-white/20 bg-black text-neon-pink focus:ring-0 cursor-pointer transition-transform hover:scale-105 active:scale-95"
                    />
                </div>
                <div className="w-14 h-14 bg-black/40 border border-white/[0.08] rounded-2xl flex items-center justify-center font-black text-white group-hover:border-neon-pink/40 overflow-hidden shrink-0 transition-all group-hover:scale-105">
                    {creator.profilePicture ? (
                        <img src={creator.profilePicture} alt={creator.name} className="w-full h-full object-cover" />
                    ) : (
                        <span className="italic">{creator.name.charAt(0)}</span>
                    )}
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-lg font-black text-white uppercase italic tracking-tight group-hover:text-neon-pink transition-colors truncate">{creator.name}</h4>
                        {creator.isPhoneVerified && (
                            <span className="flex items-center gap-0.5 text-neon-green text-[8px] font-black tracking-widest bg-neon-green/10 border border-neon-green/20 px-1.5 py-0.5 rounded-md">
                                <Check size={8} strokeWidth={3} /> VERIFIED
                            </span>
                        )}
                    </div>
                    <div className="flex flex-wrap items-center gap-y-1 gap-x-3 mt-1 text-[9px] text-gray-500 font-black tracking-widest uppercase">
                        <span className="truncate">{creator.email}</span>
                        <span className="w-1 h-1 rounded-full bg-white/10 hidden sm:inline-block" />
                        <span className="flex items-center gap-1"><Phone size={10} className="text-neon-blue" /> {creator.phone || 'N/A'}</span>
                    </div>
                </div>
            </div>

            <div className="flex flex-wrap gap-2 w-full lg:w-64 shrink-0">
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 bg-white/5 border border-white/5 px-3 py-1.5 rounded-xl">
                    {(creator.niches || creator.specializations || [])[0] || 'CREATOR'}
                </span>
                {creator.collegeName && (
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-purple-400 bg-purple-500/5 border border-purple-500/10 px-3 py-1.5 rounded-xl truncate max-w-[180px]">
                        {creator.collegeName}
                    </span>
                )}
            </div>

            <div className="w-full lg:w-48 shrink-0 flex gap-2 flex-wrap">
                {creator.instagram && (
                    <a
                        href={instagramUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1.5 text-neon-pink hover:text-white text-[10px] font-black uppercase tracking-[0.2em] bg-neon-pink/5 hover:bg-neon-pink/10 px-2.5 py-1.5 rounded-xl border border-neon-pink/10 transition-all"
                        title={instagramHandle}
                    >
                        <Instagram size={12} />
                    </a>
                )}
                {creator.linkedin && (
                    <a
                        href={creator.linkedin.includes('http') ? creator.linkedin : `https://${creator.linkedin}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1.5 text-neon-blue hover:text-white text-[10px] font-black uppercase tracking-[0.2em] bg-neon-blue/5 hover:bg-neon-blue/10 px-2.5 py-1.5 rounded-xl border border-neon-blue/10 transition-all"
                        title="LinkedIn Profile"
                    >
                        <Linkedin size={12} />
                    </a>
                )}
                {creator.youtube && (
                    <a
                        href={creator.youtube.includes('http') ? creator.youtube : `https://${creator.youtube}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1.5 text-red-500 hover:text-white text-[10px] font-black uppercase tracking-[0.2em] bg-red-500/5 hover:bg-red-500/10 px-2.5 py-1.5 rounded-xl border border-red-500/10 transition-all"
                        title="YouTube Channel"
                    >
                        <Youtube size={12} />
                    </a>
                )}
            </div>

            <div className="hidden lg:block w-40 text-right pr-4">
                <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest mb-0.5">FOLLOWERS</p>
                <p className="text-base font-black text-white font-mono">{Math.max(Number(creator.instagramFollowers || 0), Number(creator.youtubeSubscribers || 0), Number(creator.linkedinFollowers || 0)).toLocaleString()}</p>
            </div>

            <div className="flex items-center justify-between lg:justify-end gap-4 w-full lg:w-48 shrink-0">
                <StatusPill status={creator.profileStatus} />
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-gray-500 group-hover:bg-white group-hover:text-black transition-all group-hover:scale-105 shrink-0">
                    <ChevronRight size={16} />
                </div>
            </div>
        </div>
    );
};

const StatusPill = ({ status }) => {
    const config = {
        approved: "bg-neon-green/10 text-neon-green border-neon-green/30",
        rejected: "bg-red-500/10 text-red-500 border-red-500/30",
        blocked: "bg-red-500/10 text-red-500 border-red-500/30",
        pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/30"
    };
    const style = config[status] || config.pending;
    return (
        <span className={cn("px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-[0.2em] border backdrop-blur-md", style)}>
            {status || 'PENDING'}
        </span>
    );
};

const CreatorDetailModal = ({ creator, onClose, onUpdateStatus, onDelete, isUpdating, isDeleting }) => {
    const { updateCreator, addNotification, creators, campaigns } = useStore();
    
    // States
    const [isFeatured, setIsFeatured] = useState(creator.isFeatured || false);
    const [customBadgeText, setCustomBadgeText] = useState('');
    const [adminBadges, setAdminBadges] = useState(creator.adminBadges || []);
    const [communicationTab, setCommunicationTab] = useState('email'); // 'email' or 'message'
    const [emailSubject, setEmailSubject] = useState('Partnership Update - Newbi Entertainment');
    const [emailBody, setEmailBody] = useState('');
    const [messageText, setMessageText] = useState('');
    const [sendingEmail, setSendingEmail] = useState(false);
    const [sendingMessage, setSendingMessage] = useState(false);

    // Synchronize states with creator changes
    useEffect(() => {
        setIsFeatured(creator.isFeatured || false);
        setAdminBadges(creator.adminBadges || []);
    }, [creator]);

    const handleToggleFeatured = async () => {
        const nextVal = !isFeatured;
        setIsFeatured(nextVal);
        try {
            await updateCreator(creator.uid, { isFeatured: nextVal });
            useStore.getState().addToast(`Creator ${nextVal ? 'featured' : 'unfeatured'} successfully!`, 'success');
        } catch (err) {
            setIsFeatured(!nextVal); // Rollback
            useStore.getState().addToast("Failed to update featured status.", 'error');
        }
    };

    const handleAddBadge = async (e) => {
        e.preventDefault();
        const cleanBadge = customBadgeText.trim();
        if (!cleanBadge) return;
        if (adminBadges.includes(cleanBadge)) {
            useStore.getState().addToast("Badge already exists.", 'warning');
            return;
        }
        const nextBadges = [...adminBadges, cleanBadge];
        try {
            await updateCreator(creator.uid, { adminBadges: nextBadges });
            setAdminBadges(nextBadges);
            setCustomBadgeText('');
            useStore.getState().addToast("Custom badge added!", 'success');
        } catch (err) {
            useStore.getState().addToast("Failed to add custom badge.", 'error');
        }
    };

    const handleRemoveBadge = async (badgeToRemove) => {
        const nextBadges = adminBadges.filter(b => b !== badgeToRemove);
        try {
            await updateCreator(creator.uid, { adminBadges: nextBadges });
            setAdminBadges(nextBadges);
            useStore.getState().addToast("Custom badge removed.", 'success');
        } catch (err) {
            useStore.getState().addToast("Failed to remove custom badge.", 'error');
        }
    };

    const handleSendEmail = async (e) => {
        e.preventDefault();
        if (!emailSubject.trim() || !emailBody.trim()) {
            useStore.getState().addToast("Please fill in subject and body.", 'warning');
            return;
        }
        setSendingEmail(true);
        try {
            const res = await sendCreatorDirectEmail(creator.email, emailSubject, emailBody, creator.name);
            if (res.success) {
                useStore.getState().addToast("Direct email sent successfully!", 'success');
                setEmailBody('');
            } else {
                useStore.getState().addToast(res.error || "Failed to send email.", 'error');
            }
        } catch (err) {
            useStore.getState().addToast("Failed to send email.", 'error');
        } finally {
            setSendingEmail(false);
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!messageText.trim()) {
            useStore.getState().addToast("Please enter a notification message.", 'warning');
            return;
        }
        setSendingMessage(true);
        try {
            await addNotification({
                userId: creator.uid,
                title: "Admin Announcement ✉️",
                message: messageText.trim(),
                type: "info"
            });
            useStore.getState().addToast("In-app notification sent successfully!", 'success');
            setMessageText('');
        } catch (err) {
            useStore.getState().addToast("Failed to send notification.", 'error');
        } finally {
            setSendingMessage(false);
        }
    };

    const earnedBadges = getEarnedBadges(creator, creators, campaigns);

    return createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 md:p-10 bg-black/50 backdrop-blur-md">
            <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
                className="absolute inset-0 bg-black/80" 
                onClick={onClose} 
            />
            <motion.div 
                initial={{ scale: 0.95, opacity: 0, y: 30 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 30 }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="relative bg-[#050505] border border-white/10 rounded-[3rem] w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden shadow-[0_0_100px_rgba(0,0,0,1)] z-10"
            >
                {/* Modal Glow Decor */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-px bg-gradient-to-r from-transparent via-neon-pink to-transparent opacity-50" />
                
                <button 
                    onClick={onClose} 
                    className="absolute top-6 right-6 w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white hover:text-black transition-all group z-50 hover:scale-110 active:scale-95"
                >
                    <X size={20} className="group-hover:rotate-90 transition-transform duration-500" />
                </button>

                <div className="flex-1 flex flex-col lg:flex-row overflow-hidden p-6 sm:p-10 gap-8 h-full">
                    {/* Left Side: Profile, Meta, Contact, Actions */}
                    <div className="w-full lg:w-[350px] flex flex-col justify-between gap-6 shrink-0 border-b lg:border-b-0 lg:border-r border-white/10 pb-6 lg:pb-0 lg:pr-8 overflow-y-auto custom-scrollbar">
                        <div className="space-y-6">
                            <div className="relative w-36 h-36 bg-black border-2 border-white/10 rounded-[2.5rem] flex items-center justify-center text-5xl font-black text-white shadow-[0_20px_45px_rgba(0,0,0,0.8)] overflow-hidden group mx-auto lg:mx-0">
                                <div className="absolute inset-0 bg-gradient-to-br from-neon-pink/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                {creator.profilePicture ? (
                                    <img src={creator.profilePicture} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-6xl font-black text-white/5 italic select-none">{creator.name.charAt(0)}</div>
                                )}
                            </div>

                            <div className="space-y-3 text-center lg:text-left">
                                <div className="flex flex-wrap justify-center lg:justify-start gap-2 items-center">
                                    <StatusPill status={creator.profileStatus} />
                                    <span className="px-3 py-1 bg-white/5 border border-white/5 rounded-full text-[8px] font-black text-gray-500 tracking-[0.2em] uppercase">
                                        ID: {creator.creatorId || creator.uid.slice(0, 8).toUpperCase()}
                                    </span>
                                </div>
                                <h2 className="text-3xl font-black font-heading tracking-tighter uppercase italic leading-[0.9] text-white break-words">
                                    {creator.name}
                                </h2>
                                
                                {/* Badges Row */}
                                <div className="flex flex-wrap gap-1.5 justify-center lg:justify-start mt-2">
                                    {earnedBadges.map(badge => (
                                        <span 
                                            key={badge.id} 
                                            title={badge.desc}
                                            className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border", badge.bg)}
                                        >
                                            <span>{badge.icon}</span>
                                            <span className="text-[7px]">{badge.label}</span>
                                        </span>
                                    ))}
                                    {adminBadges.map((badge, idx) => (
                                        <span 
                                            key={`custom-${idx}`} 
                                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-neon-purple/10 border border-neon-purple/35 text-neon-purple rounded-md text-[8px] font-black uppercase tracking-widest shadow-[0_0_15px_rgba(168,85,247,0.1)]"
                                            title={`Custom badge: ${badge}`}
                                        >
                                            <span>🏅</span>
                                            <span className="text-[7px]">{badge}</span>
                                            <button 
                                                onClick={() => handleRemoveBadge(badge)}
                                                className="ml-1 text-red-500 hover:text-white font-black"
                                                title="Remove Badge"
                                            >
                                                ×
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Meta Grid */}
                            <div className="grid grid-cols-2 gap-2.5 text-[9px] font-black uppercase tracking-[0.1em]">
                                <div className="px-3.5 py-2.5 bg-white/5 border border-white/5 rounded-2xl text-gray-300 flex items-center gap-2">
                                    <MapPin size={12} className="text-neon-pink shrink-0" />
                                    <span className="truncate">{creator.city || 'GLOBAL'}</span>
                                </div>
                                <div className="px-3.5 py-2.5 bg-white/5 border border-white/5 rounded-2xl text-gray-300 flex items-center gap-2">
                                    <Calendar size={12} className="text-neon-blue shrink-0" />
                                    <span className="truncate">{new Date(creator.createdAt || Date.now()).getFullYear()} Joined</span>
                                </div>
                            </div>

                            {/* Contact channels */}
                            <div className="space-y-2">
                                <div className="p-3 bg-[#0A0A0A] border border-white/5 rounded-2xl flex items-center gap-3">
                                    <Mail size={14} className="text-gray-500 shrink-0" />
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[7px] font-black text-gray-600 uppercase tracking-widest">Email</p>
                                        <p className="text-xs font-black text-white truncate">{creator.email || 'N/A'}</p>
                                    </div>
                                </div>
                                <div className="p-3 bg-[#0A0A0A] border border-white/5 rounded-2xl flex items-center gap-3">
                                    <Phone size={14} className="text-gray-500 shrink-0" />
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[7px] font-black text-gray-600 uppercase tracking-widest">Phone</p>
                                        <p className="text-xs font-black text-white truncate">{creator.phone || 'N/A'}</p>
                                    </div>
                                </div>
                                {creator.collegeName && (
                                    <div className="p-3 bg-[#0A0A0A] border border-white/5 rounded-2xl flex items-center gap-3">
                                        <Layers size={14} className="text-gray-500 shrink-0" />
                                        <div className="min-w-0 flex-1">
                                            <p className="text-[7px] font-black text-gray-600 uppercase tracking-widest">College Name</p>
                                            <p className="text-xs font-black text-white truncate">{creator.collegeName}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Actions block */}
                        <div className="space-y-3 pt-4 border-t border-white/5 shrink-0">
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => onUpdateStatus(creator.uid, 'approved')}
                                    disabled={isUpdating}
                                    className={cn(
                                        "flex-1 h-12 rounded-xl font-black uppercase tracking-[0.2em] text-[9px] transition-all flex items-center justify-center gap-2",
                                        creator.profileStatus === 'approved' ? "bg-white/5 text-gray-600 cursor-not-allowed border border-white/5" : "bg-neon-green text-black shadow-lg hover:scale-[1.02]"
                                    )}
                                >
                                    {isUpdating ? <LoadingSpinner size="xs" color="black" /> : 'VERIFY'}
                                </button>
                                <button 
                                    onClick={() => onUpdateStatus(creator.uid, 'rejected')}
                                    disabled={isUpdating}
                                    className={cn(
                                        "flex-1 h-12 rounded-xl font-black uppercase tracking-[0.2em] text-[9px] transition-all border flex items-center justify-center gap-2",
                                        creator.profileStatus === 'rejected' ? "bg-white/5 text-gray-600 cursor-not-allowed border-white/5" : "bg-black border-yellow-500/20 text-yellow-500 hover:bg-yellow-500/5"
                                    )}
                                >
                                    {isUpdating ? <LoadingSpinner size="xs" color="black" /> : 'REJECT'}
                                </button>
                            </div>
                            <button 
                                onClick={() => onDelete(creator.uid)}
                                disabled={isDeleting}
                                className="w-full h-12 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all active:scale-90 gap-2 font-black uppercase tracking-[0.2em] text-[9px]"
                            >
                                <Trash2 size={14} /> DELETE PROFILE
                            </button>
                        </div>
                    </div>

                    {/* Right Side: Dossier, Socials, Specialization, Badge Manager & Direct Communication */}
                    <div className="flex-1 flex flex-col gap-6 overflow-y-auto custom-scrollbar pr-2 pb-6">
                        <section className="space-y-3">
                            <div className="flex items-center gap-4">
                                <h3 className="text-[10px] font-black text-neon-pink uppercase tracking-[0.4em] whitespace-nowrap">STRATEGIC DOSSIER</h3>
                                <div className="w-full h-px bg-gradient-to-r from-neon-pink/30 to-transparent" />
                            </div>
                            <div className="bg-[#0A0A0A] p-5 rounded-2xl border border-white/5 max-h-[160px] overflow-y-auto custom-scrollbar">
                                <p className="text-gray-300 leading-relaxed italic text-sm font-medium">"{creator.bio || "No professional overview provided."}"</p>
                            </div>
                        </section>

                        <section className="space-y-3">
                            <div className="flex items-center gap-4">
                                <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] whitespace-nowrap">SOCIAL FOOTPRINT</h3>
                                <div className="w-full h-px bg-gradient-to-r from-white/10 to-transparent" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                {creator.instagram && (
                                    <div className="p-4 bg-[#0A0A0A] border border-white/5 hover:border-neon-pink/40 rounded-2xl flex items-center justify-between transition-all">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-lg bg-neon-pink/10 flex items-center justify-center text-neon-pink"><Instagram size={16} /></div>
                                            <div>
                                                <p className="text-[7px] font-black text-gray-600 uppercase tracking-widest">Instagram</p>
                                                <p className="text-xs font-black text-white truncate">@{creator.instagram.replace(/^@/, '').trim()}</p>
                                                <p className="text-[8px] font-bold text-gray-500 uppercase tracking-wider">{Number(creator.instagramFollowers || 0).toLocaleString()} Followers</p>
                                            </div>
                                        </div>
                                        <a href={creator.instagram.includes('instagram.com') ? creator.instagram : `https://instagram.com/${creator.instagram.replace(/^@/, '').trim()}`} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-500 hover:bg-white hover:text-black transition-all">
                                            <ExternalLink size={12} />
                                        </a>
                                    </div>
                                )}
                                {creator.linkedin && (
                                    <div className="p-4 bg-[#0A0A0A] border border-white/5 hover:border-neon-blue/40 rounded-2xl flex items-center justify-between transition-all">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-lg bg-neon-blue/10 flex items-center justify-center text-neon-blue"><Linkedin size={16} /></div>
                                            <div>
                                                <p className="text-[7px] font-black text-gray-600 uppercase tracking-widest">LinkedIn</p>
                                                <p className="text-xs font-black text-white truncate">Profile</p>
                                                <p className="text-[8px] font-bold text-gray-500 uppercase tracking-wider">{Number(creator.linkedinFollowers || 0).toLocaleString()} Connections</p>
                                            </div>
                                        </div>
                                        <a href={creator.linkedin.includes('http') ? creator.linkedin : `https://${creator.linkedin}`} target="_blank" rel="noreferrer" className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-500 hover:bg-white hover:text-black transition-all">
                                            <ExternalLink size={12} />
                                        </a>
                                    </div>
                                )}
                                {creator.youtube && (
                                    <div className="p-4 bg-[#0A0A0A] border border-white/5 hover:border-red-500/40 rounded-2xl flex items-center justify-between transition-all">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500"><Youtube size={16} /></div>
                                            <div>
                                                <p className="text-[7px] font-black text-gray-600 uppercase tracking-widest">YouTube</p>
                                                <p className="text-xs font-black text-white truncate">Channel</p>
                                                <p className="text-[8px] font-bold text-gray-500 uppercase tracking-wider">{Number(creator.youtubeSubscribers || 0).toLocaleString()} Subscribers</p>
                                            </div>
                                        </div>
                                        <a href={creator.youtube.includes('http') ? creator.youtube : `https://${creator.youtube}`} target="_blank" rel="noreferrer" className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-500 hover:bg-white hover:text-black transition-all">
                                            <ExternalLink size={12} />
                                        </a>
                                    </div>
                                )}
                                {creator.twitter && (
                                    <div className="p-4 bg-[#0A0A0A] border border-white/5 hover:border-sky-400/40 rounded-2xl flex items-center justify-between transition-all">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-lg bg-sky-400/10 flex items-center justify-center text-sky-400"><Twitter size={16} /></div>
                                            <div>
                                                <p className="text-[7px] font-black text-gray-600 uppercase tracking-widest">Twitter / X / Web</p>
                                                <p className="text-xs font-black text-white truncate">Link</p>
                                            </div>
                                        </div>
                                        <a href={creator.twitter.includes('http') ? creator.twitter : `https://${creator.twitter}`} target="_blank" rel="noreferrer" className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-500 hover:bg-white hover:text-black transition-all">
                                            <ExternalLink size={12} />
                                        </a>
                                    </div>
                                )}
                            </div>
                        </section>

                        <section className="space-y-3">
                            <div className="flex items-center gap-4">
                                <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] whitespace-nowrap">NICHE & SPECIALIZATION</h3>
                                <div className="w-full h-px bg-gradient-to-r from-white/10 to-transparent" />
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {(creator.niches || creator.specializations || []).map((n, i) => (
                                    <span key={i} className="px-4 py-2 bg-white/5 border border-white/5 rounded-xl text-[9px] font-black uppercase tracking-widest text-white/60">
                                        {n}
                                    </span>
                                ))}
                            </div>
                        </section>

                        {/* Admin Badge & Promotion Controls */}
                        <section className="space-y-4 bg-[#0A0A0A] border border-white/5 p-6 rounded-3xl">
                            <div className="flex items-center justify-between border-b border-white/5 pb-3">
                                <h3 className="text-[10px] font-black text-neon-blue uppercase tracking-[0.4em]">PROMOTIONS & BADGES</h3>
                                <div className="flex items-center gap-3">
                                    <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Feature Creator</span>
                                    <button 
                                        onClick={handleToggleFeatured}
                                        className={cn(
                                            "w-12 h-6 rounded-full p-1 transition-all duration-300 flex items-center",
                                            isFeatured ? "bg-neon-pink justify-end" : "bg-white/10 justify-start"
                                        )}
                                    >
                                        <motion.div layout className="w-4 h-4 rounded-full bg-black shadow-md" />
                                    </button>
                                </div>
                            </div>
                            
                            <form onSubmit={handleAddBadge} className="flex gap-2">
                                <input 
                                    type="text" 
                                    value={customBadgeText}
                                    onChange={(e) => setCustomBadgeText(e.target.value)}
                                    placeholder="ENTER CUSTOM BADGE NAME (E.G. CAMPUS LEAD)..."
                                    className="flex-1 h-12 bg-black border border-white/10 rounded-xl px-4 text-xs font-bold text-white focus:border-neon-purple outline-none transition-all placeholder:text-gray-700"
                                />
                                <button 
                                    type="submit"
                                    className="px-6 h-12 bg-neon-purple text-white rounded-xl text-[10px] font-black uppercase tracking-wider hover:scale-[1.02] active:scale-95 transition-all"
                                >
                                    ADD BADGE
                                </button>
                            </form>
                        </section>

                        {/* Direct Mailing & Messaging unit */}
                        <section className="space-y-4 bg-[#0A0A0A] border border-white/5 p-6 rounded-3xl">
                            <div className="flex items-center justify-between border-b border-white/5 pb-3">
                                <h3 className="text-[10px] font-black text-neon-green uppercase tracking-[0.4em]">DIRECT COMMUNICATION UNIT</h3>
                                <div className="flex bg-black p-1 rounded-xl border border-white/10 h-10 items-center">
                                    <button 
                                        onClick={() => setCommunicationTab('email')} 
                                        className={cn(
                                            "px-4 h-8 rounded-lg text-[8px] font-black uppercase tracking-wider transition-all",
                                            communicationTab === 'email' ? "bg-white text-black" : "text-gray-500 hover:text-white"
                                        )}
                                    >
                                        Email
                                    </button>
                                    <button 
                                        onClick={() => setCommunicationTab('message')} 
                                        className={cn(
                                            "px-4 h-8 rounded-lg text-[8px] font-black uppercase tracking-wider transition-all",
                                            communicationTab === 'message' ? "bg-white text-black" : "text-gray-500 hover:text-white"
                                        )}
                                    >
                                        Notification
                                    </button>
                                </div>
                            </div>

                            {communicationTab === 'email' ? (
                                <form onSubmit={handleSendEmail} className="space-y-3">
                                    <div className="space-y-1">
                                        <label className="text-[8px] font-black text-gray-600 uppercase tracking-widest pl-1">Subject</label>
                                        <input 
                                            type="text" 
                                            value={emailSubject}
                                            onChange={(e) => setEmailSubject(e.target.value)}
                                            placeholder="EMAIL SUBJECT..." 
                                            className="w-full h-11 bg-black border border-white/10 rounded-xl px-4 text-xs font-bold text-white focus:border-neon-green outline-none transition-all"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[8px] font-black text-gray-600 uppercase tracking-widest pl-1">Message Body</label>
                                        <textarea 
                                            value={emailBody}
                                            onChange={(e) => setEmailBody(e.target.value)}
                                            placeholder="WRITE EMAIL BODY HERE..." 
                                            className="w-full h-28 bg-black border border-white/10 rounded-xl p-4 text-xs font-bold text-white focus:border-neon-green outline-none transition-all resize-none"
                                        />
                                    </div>
                                    <button 
                                        type="submit"
                                        disabled={sendingEmail}
                                        className="w-full h-12 bg-neon-green hover:bg-neon-green/90 text-black rounded-xl text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-50"
                                    >
                                        {sendingEmail ? <LoadingSpinner size="xs" color="black" /> : (
                                            <>
                                                <Send size={12} /> SEND OFFICIAL PARTNERSHIP EMAIL
                                            </>
                                        )}
                                    </button>
                                </form>
                            ) : (
                                <form onSubmit={handleSendMessage} className="space-y-3">
                                    <div className="space-y-1">
                                        <label className="text-[8px] font-black text-gray-600 uppercase tracking-widest pl-1">In-App Notification Text</label>
                                        <textarea 
                                            value={messageText}
                                            onChange={(e) => setMessageText(e.target.value)}
                                            placeholder="WRITE IN-APP PUSH NOTIFICATION MESSAGE HERE..." 
                                            className="w-full h-28 bg-black border border-white/10 rounded-xl p-4 text-xs font-bold text-white focus:border-neon-green outline-none transition-all resize-none"
                                        />
                                    </div>
                                    <button 
                                        type="submit"
                                        disabled={sendingMessage}
                                        className="w-full h-12 bg-neon-green hover:bg-neon-green/90 text-black rounded-xl text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-50"
                                    >
                                        {sendingMessage ? <LoadingSpinner size="xs" color="black" /> : (
                                            <>
                                                <MessageSquare size={12} /> BROADCAST REAL-TIME NOTIFICATION
                                            </>
                                        )}
                                    </button>
                                </form>
                            )}
                        </section>

                        {creator.portfolioInfo && (
                            <button 
                                onClick={() => window.open(creator.portfolioInfo.includes('http') ? creator.portfolioInfo : `https://${creator.portfolioInfo}`, '_blank')}
                                className="w-full h-14 bg-white text-black rounded-2xl font-black uppercase tracking-[0.2em] text-[9px] shadow-lg flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all overflow-hidden relative group mt-2 shrink-0"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-neon-pink to-neon-blue opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                <span className="relative z-10 flex items-center gap-2 group-hover:text-white transition-colors duration-500">
                                    <FileText size={14} /> VIEW MEDIA KIT / PORTFOLIO
                                </span>
                            </button>
                        )}
                    </div>
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
        profilePicture: ''
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
                profileStatus: 'approved',
                isPhoneVerified: true
            }, sendWelcomeMail);
            useStore.getState().addToast("Creator profile added successfully!", 'success');
            onClose();
        } catch (err) {
            console.error("Error manually adding creator:", err);
            useStore.getState().addToast("Failed to add creator profile.", 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const showCollegeField = form.specializations === 'Student/ Campus Creator' || form.specializations === 'Student Creator/ Campus Creator' || form.specializations === 'College Pages';

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 md:p-10 bg-black/50 backdrop-blur-md overflow-y-auto">
            <div className="fixed inset-0 bg-black/80" onClick={onClose} />
            <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="relative bg-[#050505] border border-white/10 rounded-[3rem] w-full max-w-2xl max-h-[90vh] overflow-y-auto p-8 md:p-10 shadow-2xl z-10 custom-scrollbar"
            >
                <button onClick={onClose} className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white hover:text-black transition-all">
                    <X size={16} />
                </button>
                
                <h3 className="text-2xl font-black uppercase italic tracking-tighter text-white mb-6">MANUALLY ADD INFLUENCER</h3>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Full Name</label>
                            <input required name="name" value={form.name} onChange={handleChange} placeholder="Full Name" className="w-full h-12 bg-black border border-white/10 rounded-xl px-4 text-sm font-bold text-white focus:border-neon-blue outline-none transition-all" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Contact Number</label>
                            <input name="phone" type="tel" value={form.phone} onChange={handleChange} placeholder="Contact Number (Optional)" className="w-full h-12 bg-black border border-white/10 rounded-xl px-4 text-sm font-bold text-white focus:border-neon-blue outline-none transition-all" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Email Address</label>
                            <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="email@example.com (Optional)" className="w-full h-12 bg-black border border-white/10 rounded-xl px-4 text-sm font-bold text-white focus:border-neon-blue outline-none transition-all" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Operational Hub (City)</label>
                            <select
                                name="city" value={form.city} onChange={handleChange}
                                className="w-full h-12 bg-black border border-white/10 rounded-xl px-4 text-sm font-bold text-white focus:border-neon-blue outline-none transition-all appearance-none cursor-pointer"
                            >
                                <option value="">Select City (Optional)</option>
                                {PREDEFINED_CITIES.map(c => <option key={c} value={c} className="bg-zinc-950">{c.toUpperCase()}</option>)}
                            </select>
                        </div>
                    </div>

                    {form.city === 'Others' && (
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Specify City Name</label>
                            <input name="customCity" value={form.customCity} onChange={handleChange} placeholder="City Name" className="w-full h-12 bg-black border border-white/10 rounded-xl px-4 text-sm font-bold text-white focus:border-neon-blue outline-none transition-all" />
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Niche / Specialization</label>
                            <select
                                name="specializations" value={form.specializations} onChange={handleChange}
                                className="w-full h-12 bg-black border border-white/10 rounded-xl px-4 text-sm font-bold text-white focus:border-neon-blue outline-none transition-all appearance-none cursor-pointer"
                            >
                                <option value="">Select Niche (Optional)</option>
                                {NICHES.map(n => <option key={n} value={n} className="bg-zinc-950">{n.toUpperCase()}</option>)}
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
                                className="w-full h-12 bg-black border border-white/10 rounded-xl px-4 text-sm font-bold text-white focus:border-neon-blue outline-none transition-all" 
                            />
                            <p className="text-[8px] font-bold text-gray-500 uppercase tracking-wider pl-1 mt-0.5 leading-normal">
                                Matching college helps connect creators with regional campaigns and events.
                            </p>
                        </div>
                    </div>

                    {form.specializations === 'Others' && (
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Specify Content Niche</label>
                            <input name="customNiche" value={form.customNiche} onChange={handleChange} placeholder="Niche Description" className="w-full h-12 bg-black border border-white/10 rounded-xl px-4 text-sm font-bold text-white focus:border-neon-blue outline-none transition-all" />
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Instagram Handle</label>
                            <input name="instagram" value={form.instagram} onChange={handleChange} placeholder="@handle" className="w-full h-12 bg-black border border-white/10 rounded-xl px-4 text-sm font-bold text-white focus:border-neon-blue outline-none transition-all" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Instagram Followers</label>
                            <input name="instagramFollowers" type="number" value={form.instagramFollowers} onChange={handleChange} placeholder="e.g. 5000 (Optional)" className="w-full h-12 bg-black border border-white/10 rounded-xl px-4 text-sm font-bold text-white focus:border-neon-blue outline-none transition-all" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">LinkedIn Profile URL</label>
                            <input name="linkedin" value={form.linkedin} onChange={handleChange} placeholder="https://linkedin.com/in/username" className="w-full h-12 bg-black border border-white/10 rounded-xl px-4 text-sm font-bold text-white focus:border-neon-blue outline-none transition-all" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">LinkedIn Connections</label>
                            <input name="linkedinFollowers" type="number" value={form.linkedinFollowers} onChange={handleChange} placeholder="e.g. 500 (Optional)" className="w-full h-12 bg-black border border-white/10 rounded-xl px-4 text-sm font-bold text-white focus:border-neon-blue outline-none transition-all" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">YouTube URL</label>
                            <input name="youtube" value={form.youtube} onChange={handleChange} placeholder="https://youtube.com/..." className="w-full h-12 bg-black border border-white/10 rounded-xl px-4 text-sm font-bold text-white focus:border-neon-blue outline-none transition-all" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Twitter / X URL</label>
                            <input name="twitter" value={form.twitter} onChange={handleChange} placeholder="https://twitter.com/..." className="w-full h-12 bg-black border border-white/10 rounded-xl px-4 text-sm font-bold text-white focus:border-neon-blue outline-none transition-all" />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Profile Picture URL</label>
                        <input name="profilePicture" value={form.profilePicture} onChange={handleChange} placeholder="https://..." className="w-full h-12 bg-black border border-white/10 rounded-xl px-4 text-sm font-bold text-white focus:border-neon-blue outline-none transition-all" />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Strategic Bio</label>
                        <textarea name="bio" value={form.bio} onChange={handleChange} placeholder="Bio description..." className="w-full h-24 bg-black border border-white/10 rounded-xl p-4 text-sm font-bold text-white focus:border-neon-blue outline-none transition-all resize-none animate-none" />
                    </div>

                    <div className="flex items-center gap-3 py-3 bg-white/5 border border-white/10 rounded-2xl px-4">
                        <input
                            type="checkbox"
                            id="sendWelcomeMail"
                            checked={sendWelcomeMail}
                            onChange={(e) => setSendWelcomeMail(e.target.checked)}
                            disabled={!form.email?.trim()}
                            className="w-5 h-5 rounded border-white/10 bg-black text-neon-blue focus:ring-0 focus:ring-offset-0 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                        />
                        <label htmlFor="sendWelcomeMail" className={`text-xs font-black uppercase tracking-wider cursor-pointer ${!form.email?.trim() ? 'text-gray-600' : 'text-gray-300 hover:text-white'}`}>
                            Send Welcome Email {!form.email?.trim() && "(Requires Email)"}
                        </label>
                    </div>

                    <button type="submit" disabled={isSaving} className="w-full h-14 bg-white hover:bg-neon-blue text-black font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2">
                        {isSaving ? <LoadingSpinner size="xs" color="black" /> : 'Add Creator Profile'}
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
                <div className="bg-[#0A0A0A] border border-white/5 p-6 rounded-[2rem] shadow-xl flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-neon-pink/10 border border-neon-pink/20 flex items-center justify-center text-neon-pink shrink-0">
                        <Users size={20} />
                    </div>
                    <div>
                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest leading-none mb-1">TOTAL REFERRED</p>
                        <h3 className="text-3xl font-black text-white italic">{stats.totalReferred}</h3>
                    </div>
                </div>
                
                <div className="bg-[#0A0A0A] border border-white/5 p-6 rounded-[2rem] shadow-xl flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-neon-blue/10 border border-neon-blue/20 flex items-center justify-center text-neon-blue shrink-0">
                        <Trophy size={20} />
                    </div>
                    <div>
                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest leading-none mb-1">TOP REFERRER</p>
                        <h3 className="text-xl font-black text-white truncate max-w-[200px] italic">
                            {stats.topReferrerName} ({stats.topReferrerCount})
                        </h3>
                    </div>
                </div>

                <div className="bg-[#0A0A0A] border border-white/5 p-6 rounded-[2rem] shadow-xl flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-neon-green/10 border border-neon-green/20 flex items-center justify-center text-neon-green shrink-0">
                        <TrendingUp size={20} />
                    </div>
                    <div>
                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest leading-none mb-1">NETWORK REACH</p>
                        <h3 className="text-3xl font-black text-white italic">{stats.networkFollowers.toLocaleString()} FLW</h3>
                    </div>
                </div>
            </div>

            {/* Filter Search */}
            <div className="relative group">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-neon-pink transition-colors" size={16} />
                <input
                    type="text"
                    placeholder="SEARCH REFERRERS..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full h-14 pl-14 pr-6 bg-black/60 border border-white/10 group-hover:border-white/20 focus:border-neon-pink/60 rounded-full text-[10px] font-black uppercase tracking-[0.2em] outline-none transition-all placeholder:text-gray-700 text-white"
                />
            </div>

            {/* Leaderboard Table */}
            <div className="bg-[#050505]/40 rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left">
                        <thead>
                            <tr className="border-b border-white/5 text-[9px] font-black text-gray-500 uppercase tracking-[0.3em]">
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
                                                    <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-white/5 overflow-hidden flex items-center justify-center shrink-0">
                                                        {referrer.profilePicture ? (
                                                            <img src={referrer.profilePicture} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <span className="text-[12px] font-black text-white italic">{referrer.name?.charAt(0)}</span>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <h4 className="text-sm font-black text-white uppercase italic tracking-tight leading-tight">{referrer.name}</h4>
                                                        <p className="text-[8px] text-gray-500 uppercase tracking-widest mt-0.5">@{referrer.instagram || 'N/A'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-5 px-6 text-center">
                                                <span className="inline-flex items-center justify-center px-4 py-1.5 rounded-full bg-neon-pink/15 border border-neon-pink/20 text-neon-pink text-sm font-black tabular-nums">
                                                    {referrer.referralCount}
                                                </span>
                                            </td>
                                            <td className="py-5 px-6 text-right font-black text-sm text-gray-400 tabular-nums">
                                                {totalReach.toLocaleString()} FLW
                                            </td>
                                            <td className="py-5 px-8 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button 
                                                        onClick={() => toggleExpand(referrer.uid)}
                                                        className="h-10 px-4 rounded-xl bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-wider text-gray-400 hover:text-white hover:bg-white/10 transition-all flex items-center gap-1.5 animate-none"
                                                    >
                                                        <span>Invites ({referrer.referredCreators.length})</span>
                                                        {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                                    </button>
                                                    <button 
                                                        onClick={() => onSelectCreator(referrer)}
                                                        className="w-10 h-10 rounded-xl bg-white text-black hover:bg-neon-pink hover:text-white transition-all flex items-center justify-center"
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
                                                <td colSpan={5} className="bg-black/30 p-8 border-b border-white/5">
                                                    <div className="space-y-4">
                                                        <div className="flex items-center justify-between border-b border-white/5 pb-2">
                                                            <h5 className="text-[9px] font-black text-neon-pink uppercase tracking-widest">INVITED CREATORS BY {referrer.name.toUpperCase()}</h5>
                                                        </div>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                            {referrer.referredCreators.map(rc => {
                                                                const isApproved = rc.profileStatus === 'approved';
                                                                return (
                                                                    <div 
                                                                        key={rc.uid}
                                                                        onClick={() => onSelectCreator(rc)}
                                                                        className="p-4 bg-zinc-950/60 border border-white/5 hover:border-white/10 hover:bg-zinc-950 rounded-2xl flex items-center justify-between cursor-pointer transition-all group"
                                                                    >
                                                                        <div className="flex items-center gap-3 min-w-0">
                                                                            <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-white/5 overflow-hidden flex items-center justify-center shrink-0">
                                                                                {rc.profilePicture ? (
                                                                                    <img src={rc.profilePicture} alt="" className="w-full h-full object-cover" />
                                                                                ) : (
                                                                                    <span className="text-[10px] font-black text-white italic">{rc.name?.charAt(0)}</span>
                                                                                )}
                                                                            </div>
                                                                            <div className="min-w-0">
                                                                                <h6 className="text-xs font-bold text-white uppercase tracking-tight truncate leading-tight group-hover:text-neon-pink transition-colors">{rc.name}</h6>
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
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 md:p-10 bg-black/50 backdrop-blur-md overflow-y-auto">
            <div className="fixed inset-0 bg-black/80" onClick={onClose} />
            <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="relative bg-[#050505] border border-white/10 rounded-[3rem] w-full max-w-2xl max-h-[90vh] overflow-y-auto p-8 md:p-10 shadow-2xl z-10 custom-scrollbar"
            >
                <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-6">
                    <div>
                        <h3 className="text-2xl font-black font-heading uppercase italic tracking-tighter">BULK PARTNERSHIP EMAIL</h3>
                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mt-1">Sending to {selectedCreators.length} recipients</p>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/5 border border-white/10 text-gray-400 hover:text-white flex items-center justify-center">
                        <X size={18} />
                    </button>
                </div>

                {isSending ? (
                    <div className="py-12 flex flex-col items-center justify-center space-y-6 text-center">
                        <LoadingSpinner size="md" color="#FF007F" />
                        <div className="space-y-1">
                            <h4 className="text-lg font-black uppercase tracking-wider text-white">Dispatched {progress.current} of {progress.total}</h4>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Generating and transmitting official branded emails...</p>
                        </div>
                        <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden max-w-md">
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
                            <div className="bg-[#0A0A0A] border border-white/5 p-4 rounded-2xl max-h-[120px] overflow-y-auto custom-scrollbar flex flex-wrap gap-2">
                                {selectedCreators.map(c => (
                                    <span key={c.uid} className="px-3 py-1 bg-white/5 rounded-lg text-[9px] font-black text-gray-300 border border-white/5">
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
                                className="w-full h-12 bg-black border border-white/10 rounded-xl px-4 text-xs font-bold text-white focus:border-neon-pink outline-none transition-all"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Email Body</label>
                            <textarea 
                                required
                                value={emailBody}
                                onChange={(e) => setEmailBody(e.target.value)}
                                placeholder="WRITE YOUR BULK CORRESPONDENCE MESSAGE HERE..."
                                className="w-full h-64 bg-black border border-white/10 rounded-xl p-4 text-xs font-bold text-white focus:border-neon-pink outline-none transition-all resize-none placeholder:text-gray-700"
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

