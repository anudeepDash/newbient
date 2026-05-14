import React, { useState, useMemo, useEffect } from 'react';
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
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import StudioSelect from '../../components/ui/StudioSelect';

const CreatorManager = ({ isEmbedded = false }) => {
    const { creators, updateCreator, deleteCreator } = useStore();
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

    const cities = ['All', ...new Set([...PREDEFINED_CITIES, ...creators.map(c => c.city)])];

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
                setSelectedCreator(null);
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
            {/* Header Section */}
            <div className={cn(
                "flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8 md:gap-10 mb-8 md:mb-12",
                isEmbedded ? "pt-8 px-0" : "pt-32 md:pt-48 px-4 md:px-12"
            )}>
                {!isEmbedded ? (
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 text-neon-pink font-black tracking-[0.5em] text-[10px] uppercase">
                            <Layers size={14} />
                            Creator Management Center
                        </div>
                        <h1 className="text-5xl md:text-7xl font-black font-heading tracking-tighter uppercase italic leading-[0.8]">
                            TALENT <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-pink via-purple-500 to-neon-blue">NETWORK.</span>
                        </h1>
                        <p className="text-gray-500 text-sm font-medium tracking-wide max-w-xl leading-relaxed">
                            Monitor and moderate your global network of content creators. Filter by followers, location, and specialization to deploy the right talent.
                        </p>
                        <div className="pt-4">
                            <AdminDashboardLink />
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-center">
                            <Users size={24} className="text-neon-pink" />
                        </div>
                        <div className="space-y-1">
                            <h2 className="text-3xl font-black uppercase italic tracking-tighter text-white">CREATOR <span className="text-neon-pink">NETWORK</span></h2>
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Analyze and manage your creator community</p>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full xl:w-auto">
                    <StatCard compact={isEmbedded} icon={<Users size={24} />} label="ACTIVE NETWORK" value={stats.total} color="purple" description={`${stats.approved} Verified Creators`} />
                    <StatCard compact={isEmbedded} icon={<TrendingUp size={24} />} label="GROSS FOLLOWERS" value={`${(stats.followers / 1000000).toFixed(1)}M`} color="pink" description="Aggregated Social Capital" />
                </div>
            </div>

            <div className={cn("px-4 md:px-12", isEmbedded ? "pt-12" : "pt-0")}>
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
                                                        onSelect={() => setSelectedCreator(creator)} 
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
                                                <CreatorListItem creator={creator} onSelect={() => setSelectedCreator(creator)} />
                                            </motion.div>
                                        ))}
                                    </div>
                                )}

                                {/* Pagination Controls */}
                                {totalPages > 1 && (
                                    <div className="flex items-center justify-center gap-4 mt-16 pb-12">
                                        <button 
                                            disabled={currentPage === 1}
                                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                            className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white disabled:opacity-20 hover:bg-white hover:text-black transition-all"
                                        >
                                            <ChevronLeft size={20} />
                                        </button>
                                        <div className="flex items-center gap-2">
                                            {[...Array(totalPages)].map((_, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => setCurrentPage(i + 1)}
                                                    className={cn(
                                                        "w-12 h-12 rounded-2xl font-black transition-all border",
                                                        currentPage === i + 1 
                                                            ? "bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.3)]" 
                                                            : "bg-white/5 text-gray-500 border-white/10 hover:border-white/30"
                                                    )}
                                                >
                                                    {i + 1}
                                                </button>
                                            ))}
                                        </div>
                                        <button 
                                            disabled={currentPage === totalPages}
                                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                            className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white disabled:opacity-20 hover:bg-white hover:text-black transition-all"
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
        <>
            {!isEmbedded && (
                <div className="fixed inset-0 z-0 pointer-events-none">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(236,72,153,0.08),transparent_50%)]" />
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:80px_80px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_40%,#000_30%,transparent_100%)]" />
                    <div className="absolute top-[10%] left-[-10%] w-[60%] h-[60%] bg-neon-pink/5 rounded-full blur-[180px] animate-pulse" />
                    <div className="absolute bottom-[10%] right-[-10%] w-[50%] h-[50%] bg-neon-blue/5 rounded-full blur-[180px] animate-pulse" style={{ animationDelay: '1s' }} />
                </div>
            )}
            {renderContent()}
            <AnimatePresence>
                {selectedCreator && (
                    <CreatorDetailModal 
                        creator={selectedCreator} 
                        onClose={() => setSelectedCreator(null)} 
                        onUpdateStatus={handleUpdateStatus}
                        onDelete={handleDeleteCreator}
                    />
                )}
            </AnimatePresence>
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
        className="group relative bg-[#0A0A0A] border border-white/5 hover:border-neon-pink/40 rounded-[2rem] sm:rounded-[3.5rem] p-5 sm:p-6 cursor-pointer overflow-hidden transition-all duration-700 hover:-translate-y-2 hover:shadow-[0_40px_100px_rgba(0,0,0,0.9)] flex flex-col h-auto sm:h-[520px]"
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
                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/10 transition-all">
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

const CreatorDetailModal = ({ creator, onClose, onUpdateStatus, onDelete }) => (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-8">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/90 backdrop-blur-xl" onClick={onClose} />
        
        <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 30 }}
            className="relative bg-[#050505] border border-white/10 rounded-[3rem] w-full max-w-5xl h-full md:h-[90vh] overflow-hidden flex flex-col shadow-[0_50px_150px_rgba(0,0,0,1)]"
        >
            {/* Header / Banner */}
            <div className="h-48 md:h-64 relative shrink-0 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-neon-pink/20 to-[#050505]" />
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20" />
                <button onClick={onClose} className="absolute top-8 right-8 w-14 h-14 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 flex items-center justify-center hover:bg-white hover:text-black transition-all group z-50">
                    <X size={24} className="group-hover:rotate-90 transition-transform duration-500" />
                </button>
            </div>

            <div className="px-10 -mt-20 relative z-10 flex flex-col md:flex-row items-end gap-8 mb-12">
                <div className="w-40 h-40 md:w-48 md:h-48 rounded-[3.5rem] bg-black border-4 border-[#050505] shadow-2xl overflow-hidden shrink-0">
                    {creator.profilePicture ? (
                        <img src={creator.profilePicture} alt="" className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-6xl font-black text-white/5 italic">{creator.name.charAt(0)}</div>
                    )}
                </div>
                <div className="flex-1 pb-4">
                    <div className="flex items-center gap-4 mb-3">
                        <StatusPill status={creator.profileStatus} />
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em]">Creator ID: {creator.uid.slice(0, 8)}</span>
                    </div>
                    <h2 className="text-4xl md:text-6xl font-black text-white uppercase italic tracking-tighter leading-none mb-2">{creator.name}</h2>
                    <div className="flex flex-wrap gap-6 items-center">
                        <div className="flex items-center gap-2 text-neon-pink font-black text-[11px] uppercase tracking-widest">
                            <MapPin size={14} /> {creator.city}
                        </div>
                        <div className="w-1.5 h-1.5 rounded-full bg-white/10" />
                        <div className="text-gray-500 font-black text-[11px] uppercase tracking-widest">
                            {creator.email}
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar px-10 pb-10">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                    {/* Left Column: Bio & Experience */}
                    <div className="lg:col-span-7 space-y-10">
                        <div className="p-10 bg-white/[0.02] border border-white/5 rounded-[3rem] relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity"><Mic2 size={80} /></div>
                            <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.5em] mb-8">Strategic Dossier</h4>
                            <p className="text-xl font-medium text-gray-300 leading-relaxed italic">
                                "{creator.bio || "No professional overview provided for this talent profile."}"
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-8 bg-white/[0.02] border border-white/5 rounded-[2.5rem] flex flex-col gap-4">
                                <Phone size={24} className="text-neon-green" />
                                <div>
                                    <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest mb-1">Direct Line</p>
                                    <p className="text-lg font-black text-white tracking-tight">{creator.phone || 'RESTRICTED'}</p>
                                </div>
                            </div>
                            <div className="p-8 bg-white/[0.02] border border-white/5 rounded-[2.5rem] flex flex-col gap-4">
                                <Calendar size={24} className="text-neon-blue" />
                                <div>
                                    <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest mb-1">Enlistment Date</p>
                                    <p className="text-lg font-black text-white tracking-tight">{new Date(creator.createdAt).toLocaleDateString()}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Socials & Stats */}
                    <div className="lg:col-span-5 space-y-10">
                        <div className="space-y-6">
                            <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.5em] flex items-center gap-3">
                                <Activity size={14} className="text-neon-pink" /> Social Metrics
                            </h4>
                            {creator.instagram && (
                                <div className="p-6 bg-white/[0.03] border border-white/10 rounded-[2rem] flex items-center justify-between group hover:border-neon-pink/30 transition-all">
                                    <div className="flex items-center gap-5">
                                        <div className="w-12 h-12 rounded-xl bg-neon-pink/10 flex items-center justify-center text-neon-pink"><Instagram size={24} /></div>
                                        <div>
                                            <p className="text-xs font-black text-white tracking-tight">@{creator.instagram.replace('@', '')}</p>
                                            <p className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">{Number(creator.instagramFollowers || 0).toLocaleString()} Followers</p>
                                        </div>
                                    </div>
                                    <a href={`https://instagram.com/${creator.instagram.replace('@', '')}`} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-gray-500 hover:bg-white hover:text-black transition-all">
                                        <ExternalLink size={16} />
                                    </a>
                                </div>
                            )}
                            {creator.youtube && (
                                <div className="p-6 bg-white/[0.03] border border-white/10 rounded-[2rem] flex items-center justify-between group hover:border-red-500/30 transition-all">
                                    <div className="flex items-center gap-5">
                                        <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500"><Youtube size={24} /></div>
                                        <div>
                                            <p className="text-xs font-black text-white tracking-tight">Broadcast Channel</p>
                                            <p className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">{Number(creator.youtubeSubscribers || 0).toLocaleString()} Subscribers</p>
                                        </div>
                                    </div>
                                    <a href={creator.youtube.includes('http') ? creator.youtube : `https://${creator.youtube}`} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-gray-500 hover:bg-white hover:text-black transition-all">
                                        <ExternalLink size={16} />
                                    </a>
                                </div>
                            )}
                        </div>

                        <div className="space-y-6">
                            <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.5em]">Niche & Specialization</h4>
                            <div className="flex flex-wrap gap-2">
                                {(creator.niches || creator.specializations || []).map((n, i) => (
                                    <span key={i} className="px-5 py-2.5 bg-white/5 border border-white/5 rounded-xl text-[9px] font-black uppercase tracking-widest text-white/60">
                                        {n}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {creator.portfolioInfo && (
                            <button 
                                onClick={() => window.open(creator.portfolioInfo.includes('http') ? creator.portfolioInfo : `https://${creator.portfolioInfo}`, '_blank')}
                                className="w-full h-16 bg-white text-black rounded-[2rem] font-black uppercase tracking-widest text-[11px] shadow-2xl flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all"
                            >
                                <FileText size={18} /> View Media Kit / Portfolio
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Footer Actions */}
            <div className="p-8 md:p-10 border-t border-white/5 bg-black/40 backdrop-blur-xl shrink-0">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
                    <div className="flex gap-3 w-full sm:w-auto">
                        <button 
                            onClick={() => onUpdateStatus(creator.uid, 'approved')}
                            disabled={isUpdating}
                            className={cn(
                                "flex-1 sm:px-10 h-14 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-3",
                                creator.profileStatus === 'approved' ? "bg-white/5 text-gray-600 cursor-not-allowed border border-white/5" : "bg-neon-green text-black shadow-[0_10px_30px_rgba(57,255,20,0.2)] hover:scale-105"
                            )}
                        >
                            {isUpdating ? <LoadingSpinner size="xs" color="black" /> : (creator.profileStatus === 'approved' ? 'ALREADY VERIFIED' : 'VERIFY CREATOR')}
                        </button>
                        <button 
                            onClick={() => onUpdateStatus(creator.uid, 'rejected')}
                            disabled={isUpdating}
                            className={cn(
                                "flex-1 sm:px-10 h-14 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all border flex items-center justify-center gap-3",
                                creator.profileStatus === 'rejected' ? "bg-white/5 text-gray-600 cursor-not-allowed border-white/5" : "bg-black border-yellow-500/20 text-yellow-500 hover:bg-yellow-500/5"
                            )}
                        >
                            {isUpdating ? <LoadingSpinner size="xs" color="black" /> : 'REJECT'}
                        </button>
                    </div>
                    <button 
                        onClick={() => onDelete(creator.uid)}
                        disabled={isDeleting}
                        className="w-full sm:w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all"
                    >
                        {isDeleting ? <LoadingSpinner size="xs" color="white" /> : <Trash2 size={20} />}
                    </button>
                </div>
            </div>
        </motion.div>
    </div>
);

export default CreatorManager;
