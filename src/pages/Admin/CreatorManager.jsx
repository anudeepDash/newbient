import React, { useState, useMemo, useEffect } from 'react';
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

const CreatorManager = () => {
    const { creators, updateCreator, deleteCreator } = useStore();
    const navigate = useNavigate();
    const location = useLocation();
    const params = useParams();
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 12;

    const [filterCity, setFilterCity] = useState('All');
    const [filterStatus, setFilterStatus] = useState('All');
    const [filterFollowers, setFilterFollowers] = useState('All');
    const [selectedCreator, setSelectedCreator] = useState(null);
    const [isUpdating, setIsUpdating] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [viewMode, setViewMode] = useState('grid'); 

    const personnelTabs = [
        { name: 'Creators', path: '/admin/creators', icon: Star },
        { name: 'Campaigns', path: '/admin/campaigns', icon: Target },
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
                
            const followers = Math.max(Number(c.instagramFollowers || 0), Number(c.youtubeSubscribers || 0));
            let matchesFollowers = true;
            if (filterFollowers === '10k+') matchesFollowers = followers >= 10000;
            else if (filterFollowers === '50k+') matchesFollowers = followers >= 50000;
            else if (filterFollowers === '100k+') matchesFollowers = followers >= 100000;
            else if (filterFollowers === '500k+') matchesFollowers = followers >= 500000;

            return matchesSearch && matchesCity && matchesStatus && matchesFollowers;
        });
    }, [creators, searchTerm, filterCity, filterStatus, filterFollowers]);

    const totalPages = Math.ceil(filteredCreators.length / itemsPerPage);
    const paginatedCreators = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredCreators.slice(start, start + itemsPerPage);
    }, [filteredCreators, currentPage]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filterCity, filterStatus, filterFollowers]);

    const stats = useMemo(() => {
        const approvedCount = creators.filter(c => c.profileStatus === 'approved').length;
        const totalFollowers = creators.reduce((sum, c) => sum + Math.max(Number(c.instagramFollowers || 0), Number(c.youtubeSubscribers || 0)), 0);
        
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
        const headers = ['Name', 'Email', 'Phone', 'City', 'Instagram', 'Instagram Followers', 'YouTube', 'YouTube Subs', 'Specializations', 'Status'];
        const csvRows = [
            headers.join(','),
            ...filteredCreators.map(c => [
                `"${(c.name || '').replace(/"/g, '""')}"`,
                `"${(c.email || '').replace(/"/g, '""')}"`,
                `"${(c.phone || '').replace(/"/g, '""')}"`,
                `"${(c.city || '').replace(/"/g, '""')}"`,
                `"${c.instagram ? (c.instagram.includes('http') ? c.instagram : `https://instagram.com/${c.instagram.replace('@', '')}`) : ''}"`,
                `"${c.instagramFollowers || 0}"`,
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

    const renderContent = () => (
        <div className="relative z-10 max-w-[1700px] mx-auto pb-20">
            <div>
                {/* Control Panel */}
                <div className="relative z-50 bg-[#0A0A0A]/80 backdrop-blur-3xl border border-white/10 rounded-[1.5rem] md:rounded-[2rem] p-1.5 md:p-2.5 mb-8 md:mb-16 shadow-[0_30px_100px_rgba(0,0,0,0.8)] flex flex-col xl:flex-row xl:items-center gap-2 md:gap-3">
                    
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
                    <div className="grid grid-cols-2 sm:grid-cols-3 xl:flex items-center gap-2 shrink-0 w-full xl:w-auto pr-0 md:pr-2">
                        <div className="w-full xl:w-[150px]">
                            <StudioSelect 
                                value={filterFollowers} 
                                options={[
                                    { value: 'All', label: 'FOLLOWERS (%)' },
                                    { value: '10k+', label: '10K+ FOLLOWERS' },
                                    { value: '50k+', label: '50K+ FOLLOWERS' },
                                    { value: '100k+', label: '100K+ FOLLOWERS' },
                                    { value: '500k+', label: '500K+ FOLLOWERS' }
                                ]} 
                                onChange={setFilterFollowers} 
                                className="h-12 md:h-14 rounded-xl md:rounded-full border-white/10 bg-black/60" 
                                accentColor="neon-pink" 
                            />
                        </div>
                        <div className="w-full xl:w-[150px]">
                            <StudioSelect 
                                value={filterCity} 
                                options={cities.map(c => ({ value: c, label: c === 'All' ? 'LOCATION' : c.toUpperCase() }))} 
                                onChange={setFilterCity} 
                                className="h-12 md:h-14 rounded-xl md:rounded-full border-white/10 bg-black/60" 
                                accentColor="neon-blue" 
                            />
                        </div>
                        <div className="w-full xl:w-[150px] col-span-2 sm:col-span-1">
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
                            />
                        </div>

                        <div className="w-px h-8 bg-white/5 mx-1 hidden xl:block" />

                        <div className="hidden md:flex bg-black/60 p-1 rounded-full border border-white/10 shrink-0">
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
                            className="group relative h-12 md:h-14 px-4 md:px-8 bg-white text-black rounded-xl md:rounded-full font-black uppercase tracking-[0.2em] text-[9px] md:text-[10px] overflow-hidden hover:scale-[1.02] active:scale-95 transition-all shadow-[0_15px_40px_rgba(255,255,255,0.1)] flex items-center justify-center gap-3 w-full xl:w-auto shrink-0 col-span-2 sm:col-span-3 xl:col-span-1"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-neon-pink via-purple-500 to-neon-blue opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            <div className="relative z-10 flex items-center gap-3 group-hover:text-white transition-colors duration-500">
                                <Download size={16} />
                                EXPORT CSV
                            </div>
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
                                                    />
                                                </motion.div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-3">
                                        <div className="flex items-center gap-6 px-10 py-6 text-[10px] font-black text-gray-600 uppercase tracking-[0.4em] border-b border-white/5">
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
                                                <CreatorListItem creator={creator} onSelect={() => navigate(`/admin/creators/${creator.uid}`)} />
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

const CreatorBadgeCard = ({ creator, onSelect }) => (
    <motion.div 
        layout
        onClick={onSelect}
        className="group relative bg-[#0A0A0A] border border-white/5 hover:border-neon-pink/40 rounded-[2rem] sm:rounded-[3.5rem] p-5 sm:p-6 cursor-pointer overflow-hidden transition-all duration-700 hover:-translate-y-2 hover:shadow-[0_40px_100px_rgba(0,0,0,0.9)] flex flex-col h-full min-h-[520px]"
    >
        <div className="absolute inset-0 bg-gradient-to-br from-neon-pink/5 via-transparent to-neon-blue/5 opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
        
        <div className="relative mb-6 group-hover:scale-[1.01] transition-transform duration-700">
            <div className="aspect-[1/1] rounded-[2.5rem] overflow-hidden bg-black border border-white/5 relative flex items-center justify-center">
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
                <div className="absolute -bottom-4 -right-2 w-12 h-12 bg-neon-green text-black rounded-2xl flex items-center justify-center border-8 border-[#0A0A0A] shadow-[0_10px_20px_rgba(57,255,20,0.3)] z-20 group-hover:rotate-12 transition-transform">
                    <Check size={20} strokeWidth={4} />
                </div>
            )}
        </div>

        <div className="flex-1 flex flex-col px-2">
            <div className="h-28 mb-4">
                <p className="text-[10px] font-black text-neon-pink uppercase tracking-[0.4em] mb-2">{(creator.niches || creator.specializations || [])[0] || 'CREATOR'}</p>
                <h3 className="text-3xl font-black text-white tracking-tighter uppercase italic leading-[0.9] group-hover:text-neon-pink transition-colors duration-500 line-clamp-2">
                    {creator.name}
                </h3>
            </div>

            <div className="space-y-3 mb-6">
                <div className="flex items-center gap-2 text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] bg-white/[0.03] px-4 py-2.5 rounded-2xl border border-white/5 shadow-inner w-fit">
                    <MapPin size={12} className="text-neon-pink" />
                    <span>{creator.city || 'GLOBAL'}</span>
                </div>
                <div className="flex items-center gap-2 text-neon-blue/80 text-[10px] font-black uppercase tracking-[0.2em] bg-neon-blue/5 px-4 py-2.5 rounded-2xl border border-neon-blue/10 shadow-inner w-fit">
                    <TrendingUp size={12} className="animate-pulse" />
                    <span>{Math.max(Number(creator.instagramFollowers || 0), Number(creator.youtubeSubscribers || 0)).toLocaleString()} FOLLOWERS</span>
                </div>
            </div>

            <div className="mt-auto pt-6 border-t border-white/5 flex items-center justify-between">
                <div>
                    <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest mb-1.5">PLATFORM HUB</p>
                    <div className="flex gap-3">
                        {creator.instagram && <Instagram size={14} className="text-neon-pink" />}
                        {creator.youtube && <Youtube size={14} className="text-red-500" />}
                    </div>
                </div>
                <div className="flex gap-2">
                    <div className="w-11 h-11 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/10 transition-all">
                        <ChevronRight size={16} />
                    </div>
                </div>
            </div>
        </div>
    </motion.div>
);

const CreatorListItem = ({ creator, onSelect }) => (
    <div 
        onClick={onSelect}
        className="group flex flex-col sm:flex-row items-start sm:items-center p-5 sm:px-8 sm:py-5 bg-[#080808]/40 backdrop-blur-xl border border-white/5 hover:border-white/10 hover:bg-[#0A0A0A]/80 rounded-[2rem] cursor-pointer transition-all duration-300 gap-4 sm:gap-6"
    >
        <div className="w-16">
            <div className="w-14 h-14 bg-black border border-white/10 rounded-2xl flex items-center justify-center font-black text-white group-hover:border-neon-pink/40 overflow-hidden transition-colors group-hover:scale-105 transition-transform">
                {creator.profilePicture ? (
                    <img src={creator.profilePicture} alt={creator.name} className="w-full h-full object-cover" />
                ) : (
                    creator.name.charAt(0)
                )}
            </div>
        </div>
        
        <div className="flex-1 min-w-0">
            <h4 className="text-lg font-black text-white uppercase italic tracking-tight group-hover:text-neon-pink transition-colors truncate mb-1">{creator.name}</h4>
            <div className="flex items-center gap-3">
                <p className="text-[9px] text-gray-600 uppercase font-black tracking-widest truncate">{creator.email}</p>
                <div className="w-1 h-1 rounded-full bg-white/10" />
                <p className="text-[9px] text-gray-600 font-black tracking-[0.2em] flex items-center gap-1.5 uppercase">
                    <MapPin size={10} className="text-neon-pink" /> {creator.city}
                </p>
            </div>
        </div>

        <div className="w-48 hidden md:block">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 bg-white/5 border border-white/5 px-4 py-2 rounded-xl group-hover:bg-white/10 transition-colors">
                {(creator.niches || creator.specializations || [])[0] || 'CREATOR'}
            </span>
        </div>

        <div className="w-40 hidden lg:block text-right pr-10">
            <p className="text-[8px] font-black text-gray-700 uppercase tracking-widest mb-1">AGGREGATE FOLLOWERS</p>
            <p className="text-lg font-black text-white font-mono">{Math.max(Number(creator.instagramFollowers || 0), Number(creator.youtubeSubscribers || 0)).toLocaleString()}</p>
        </div>

        <div className="w-full sm:w-32 hidden sm:flex justify-end">
            <StatusPill status={creator.profileStatus} />
        </div>

        <div className="hidden sm:flex w-12 h-12 rounded-2xl bg-white/5 border border-white/5 items-center justify-center group-hover:bg-white group-hover:text-black transition-all group-hover:scale-110">
            <ChevronRight size={20} />
        </div>
    </div>
);

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
                                        ID: {creator.uid.slice(0, 8)}
                                    </span>
                                </div>
                                <h2 className="text-3xl font-black font-heading tracking-tighter uppercase italic leading-[0.9] text-white break-words">
                                    {creator.name}
                                </h2>
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

                    {/* Right Side: Dossier, Socials, Specialization */}
                    <div className="flex-1 flex flex-col gap-6 overflow-y-auto custom-scrollbar pr-2">
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
                                                <p className="text-xs font-black text-white truncate">@{creator.instagram.replace('@', '')}</p>
                                                <p className="text-[8px] font-bold text-gray-500 uppercase tracking-wider">{Number(creator.instagramFollowers || 0).toLocaleString()} Followers</p>
                                            </div>
                                        </div>
                                        <a href={`https://instagram.com/${creator.instagram.replace('@', '')}`} target="_blank" rel="noreferrer" className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-500 hover:bg-white hover:text-black transition-all">
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

                        {creator.portfolioInfo && (
                            <button 
                                onClick={() => window.open(creator.portfolioInfo.includes('http') ? creator.portfolioInfo : `https://${creator.portfolioInfo}`, '_blank')}
                                className="w-full h-14 bg-white text-black rounded-2xl font-black uppercase tracking-[0.2em] text-[9px] shadow-lg flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all overflow-hidden relative group"
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

export default CreatorManager;
