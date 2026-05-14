import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';

import { Link } from 'react-router-dom';
import { useStore } from '../../lib/store';
import { PREDEFINED_CITIES, ARTIST_CATEGORIES } from '../../lib/constants';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import Download from 'lucide-react/dist/esm/icons/download';
import Users from 'lucide-react/dist/esm/icons/users';
import Search from 'lucide-react/dist/esm/icons/search';
import MapPin from 'lucide-react/dist/esm/icons/map-pin';
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
import Music from 'lucide-react/dist/esm/icons/music';
import Mic2 from 'lucide-react/dist/esm/icons/mic-2';
import Video from 'lucide-react/dist/esm/icons/video';
import Star from 'lucide-react/dist/esm/icons/star';
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right';
import ChevronLeft from 'lucide-react/dist/esm/icons/chevron-left';
import Calendar from 'lucide-react/dist/esm/icons/calendar';
import Target from 'lucide-react/dist/esm/icons/target';
import Check from 'lucide-react/dist/esm/icons/check';
import Instagram from 'lucide-react/dist/esm/icons/instagram';
import SlidersHorizontal from 'lucide-react/dist/esm/icons/sliders-horizontal';
import ShieldCheck from 'lucide-react/dist/esm/icons/shield-check';
import ShieldAlert from 'lucide-react/dist/esm/icons/shield-alert';
import TrendingUp from 'lucide-react/dist/esm/icons/trending-up';
import Award from 'lucide-react/dist/esm/icons/award';
import Layers from 'lucide-react/dist/esm/icons/layers';
import LayoutDashboard from 'lucide-react/dist/esm/icons/layout-dashboard';
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle';

import { motion, AnimatePresence } from 'framer-motion';
import AdminDashboardLink from '../../components/admin/AdminDashboardLink';
import { cn } from '../../lib/utils';
import StudioSelect from '../../components/ui/StudioSelect';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

const ArtistManager = ({ isEmbedded = false }) => {
    const { artists, upcomingEvents, updateArtist, deleteArtist, castArtistToGig } = useStore();
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 12;

    const [filterCity, setFilterCity] = useState('All');
    const [filterCategory, setFilterCategory] = useState('All');
    const [filterStatus, setFilterStatus] = useState('All');
    const [selectedArtist, setSelectedArtist] = useState(null);
    const [viewMode, setViewMode] = useState('grid');
    const [isCastingMode, setIsCastingMode] = useState(false);
    const [showDeleteConfirmId, setShowDeleteConfirmId] = useState(null);
    const [isUpdating, setIsUpdating] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const cities = ['All', ...PREDEFINED_CITIES];
    const categories = ['All', ...ARTIST_CATEGORIES];

    const filteredArtists = useMemo(() => {
        return artists.filter(a => {
            const matchesSearch = a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (a.bio || '').toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCity = filterCity === 'All' || a.city === filterCity;
            const matchesCategory = filterCategory === 'All' || a.category === filterCategory;
            const matchesStatus = filterStatus === 'All' || a.profileStatus === filterStatus;
            return matchesSearch && matchesCity && matchesCategory && matchesStatus;
        });
    }, [artists, searchTerm, filterCity, filterCategory, filterStatus]);

    const totalPages = Math.ceil(filteredArtists.length / itemsPerPage);
    const paginatedArtists = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredArtists.slice(start, start + itemsPerPage);
    }, [filteredArtists, currentPage]);

    // Reset to page 1 on filter changes
    React.useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filterCity, filterCategory, filterStatus]);


    const stats = useMemo(() => {
        const approvedCount = artists.filter(a => a.profileStatus === 'approved').length;
        const totalBaseValue = artists.filter(a => a.profileStatus === 'approved').reduce((sum, a) => sum + (Number(a.basePrice) || 0), 0);
        
        return {
            total: artists.length,
            approved: approvedCount,
            pending: artists.filter(a => a.profileStatus === 'pending' || !a.profileStatus).length,
            rejected: artists.filter(a => a.profileStatus === 'rejected').length,
            categories: new Set(artists.map(a => a.category)).size,
            value: totalBaseValue
        };
    }, [artists]);


    const handleUpdateStatus = async (id, newStatus) => {
        setIsUpdating(true);
        try {
            await updateArtist(id, { profileStatus: newStatus });
            if (selectedArtist && selectedArtist.id === id) {
                setSelectedArtist(prev => ({ ...prev, profileStatus: newStatus }));
            }
        } catch (error) {
            useStore.getState().addToast("Status update failed.", 'error');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleDeleteArtist = async (id) => {
        setIsDeleting(true);
        try {
            await deleteArtist(id);
            setSelectedArtist(null);
            setShowDeleteConfirmId(null);
            useStore.getState().addToast("Artist profile deleted successfully.", 'success');
        } catch (error) {
            useStore.getState().addToast("Deletion failed: " + error.message, 'error');
        } finally {
            setIsDeleting(false);
        }
    };

    useEffect(() => {
        if (selectedArtist) {
            console.log("Current Selected Artist State:", selectedArtist);
        }
    }, [selectedArtist]);

    const handleCastToGig = async (artistId, gigId) => {
        if (!artistId || !gigId) {
            useStore.getState().addToast("Internal Error: Missing Talent or Mission ID", 'error');
            return;
        }

        setIsUpdating(true);
        try {
            await useStore.getState().castArtistToGig(artistId, gigId);
            useStore.getState().addToast("TALENT DEPLOYED TO MISSION.", 'success');
        } catch (error) {
            console.error("Casting error:", error);
            useStore.getState().addToast("Deployment failed: " + error.message, 'error');
        } finally {
            setIsUpdating(false);
        }
    };

    const exportToCSV = () => {
        const headers = ['NAME', 'EMAIL', 'PHONE', 'CITY', 'CATEGORY', 'EXP_YEARS', 'BASE_PRICE', 'STATUS'];
        const csvRows = [
            headers.join(','),
            ...filteredArtists.map(a => [
                `"${(a.name || '').replace(/"/g, '""')}"`,
                `"${(a.email || '').replace(/"/g, '""')}"`,
                `"${(a.phone || '').replace(/"/g, '""')}"`,
                `"${(a.city || '').replace(/"/g, '""')}"`,
                `"${(a.category || '').replace(/"/g, '""')}"`,
                `"${a.experienceYears || 0}"`,
                `"${a.basePrice || 0}"`,
                `"${a.profileStatus || 'pending'}"`
            ].join(','))
        ];
        
        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `ARTISTANT_TALENT_EXPORT_${filterCity.toUpperCase()}_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };



    const renderContent = () => (
        <div className="relative z-10 max-w-[1700px] mx-auto pb-20">
            {/* Header Section */}
            <div className={cn(
                "flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8 md:gap-10 mb-8 md:mb-12",
                isEmbedded ? "pt-8 px-0" : "pt-24 md:pt-32 px-4 md:px-12"
            )}>
                {!isEmbedded ? (
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 text-neon-blue font-black tracking-[0.5em] text-[10px] uppercase">
                            <Layers size={14} />
                            Administrative Dashboard
                        </div>
                        <h1 className="text-5xl md:text-7xl font-black font-heading tracking-tighter uppercase italic leading-[0.8]">
                            TALENT <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-blue via-neon-pink to-purple-500">OPERATIONS</span>
                        </h1>
                        <p className="text-gray-500 text-sm font-medium tracking-wide max-w-xl leading-relaxed">
                            Orchestrate your global roster of verified talent. Monitor performance, manage certifications, and deploy artists to active missions.
                        </p>
                    </div>
                ) : null}

                <div className="w-full">
                        <StatCard 
                            compact={isEmbedded} 
                            icon={<Layers size={24} />} 
                            label={isEmbedded ? "TALENT ROSTER" : "TALENT OVERVIEW"} 
                            value={stats.total} 
                            color="blue" 
                            description={isEmbedded 
                                ? `TOTAL ACTIVE ROSTER | ${stats.approved} VERIFIED • ${stats.pending} PENDING`
                                : `${stats.approved} Verified • ${stats.pending} Pending Authorization`
                            } 
                        />
                </div>



            </div>

            <div className={cn("px-4 md:px-12", isEmbedded ? "pt-12" : "pt-0")}>
                {/* Futuristic Control Panel */}
                <div className="relative z-50 bg-[#0A0A0A]/80 backdrop-blur-3xl border border-white/10 rounded-[1.5rem] md:rounded-[2rem] p-1.5 md:p-2.5 md:pr-4 mb-8 md:mb-16 shadow-[0_30px_100px_rgba(0,0,0,0.8)] flex flex-col xl:flex-row xl:items-center gap-2 md:gap-3">


                    {/* Search Engine */}
                    <div className="relative flex-1 min-w-[200px] group">
                        <div className="absolute inset-0 bg-gradient-to-r from-neon-blue/10 to-transparent opacity-0 group-focus-within:opacity-100 transition-opacity rounded-full pointer-events-none" />
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-neon-blue transition-colors" size={16} />
                        <input
                            type="text"
                            placeholder="SEARCH TALENT..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full h-14 pl-14 pr-6 bg-black/60 border border-white/10 group-hover:border-white/20 focus:border-neon-blue/60 rounded-full text-[10px] font-black uppercase tracking-[0.2em] outline-none transition-all placeholder:text-gray-700 text-white min-w-0"

                        />
                    </div>

                    {/* Filter Cluster */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 xl:flex items-center gap-2 shrink-0 w-full xl:w-auto">
                        <div className="w-full xl:w-[135px]">
                            <StudioSelect 
                                value={filterCategory} 
                                options={categories.map(c => ({ value: c, label: c === 'All' ? 'CATEGORY' : c.toUpperCase() }))} 
                                onChange={setFilterCategory} 
                                className="h-12 md:h-14 rounded-xl md:rounded-full border-white/10 bg-black/60" 
                                accentColor="neon-pink" 
                            />
                        </div>
                        <div className="w-full xl:w-[135px]">
                            <StudioSelect 
                                value={filterCity} 
                                options={cities.map(c => ({ value: c, label: c === 'All' ? 'LOCATION' : c.toUpperCase() }))} 
                                onChange={setFilterCity} 
                                className="h-12 md:h-14 rounded-xl md:rounded-full border-white/10 bg-black/60" 
                                accentColor="neon-blue" 
                            />
                        </div>
                        <div className="w-full xl:w-[135px] col-span-2 sm:col-span-1">
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
                            onClick={() => setIsCastingMode(true)}
                            className="group relative h-12 md:h-14 px-4 md:px-8 bg-zinc-900 text-white border border-white/10 rounded-xl md:rounded-full font-black uppercase tracking-[0.2em] text-[9px] md:text-[10px] overflow-hidden hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 w-full xl:w-auto shrink-0 col-span-2 sm:col-span-3 xl:col-span-1"
                        >
                            <div className="relative z-10 flex items-center gap-3">
                                <Target size={16} className="text-neon-blue" />
                                CASTING BOARD
                            </div>
                        </button>

                        <button 
                            onClick={exportToCSV}
                            className="group relative h-12 md:h-14 px-4 md:px-8 bg-white text-black rounded-xl md:rounded-full font-black uppercase tracking-[0.2em] text-[9px] md:text-[10px] overflow-hidden hover:scale-[1.02] active:scale-95 transition-all shadow-[0_15px_40px_rgba(255,255,255,0.1)] flex items-center justify-center gap-3 w-full xl:w-auto shrink-0 col-span-2 sm:col-span-3 xl:col-span-1"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-neon-blue via-neon-pink to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
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
                        {artists.length === 0 ? (
                            <motion.div 
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="py-40 text-center bg-[#050505]/40 rounded-[4rem] border border-white/5 flex flex-col items-center gap-8 shadow-inner"
                            >
                                <div className="w-32 h-32 bg-white/5 rounded-full flex items-center justify-center border border-white/10 animate-pulse">
                                    <Mic2 size={48} className="text-gray-700" />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-3xl font-black uppercase tracking-tighter text-gray-500 italic">No Talent Data Found</h3>
                                    <p className="text-gray-700 text-sm font-black uppercase tracking-widest">Initialize the database to begin</p>
                                </div>
                            </motion.div>
                        ) : filteredArtists.length === 0 ? (
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
                                {(viewMode === 'grid') ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-8 items-start">
                                        {paginatedArtists.map((artist, idx) => (
                                            <motion.div
                                                key={artist.id}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: idx * 0.05 }}
                                            >
                                                <ArtistBadgeCard 
                                            artist={artist} 
                                            onSelect={() => {
                                                console.log("Selecting artist:", artist.name, artist.id);
                                                setSelectedArtist(artist);
                                            }} 
                                        />

                                            </motion.div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-3">
                                        <div className="flex items-center gap-6 px-10 py-6 text-[10px] font-black text-gray-600 uppercase tracking-[0.4em] border-b border-white/5">
                                            <div className="w-16 shrink-0">Identity</div>
                                            <div className="flex-1 pl-1">Profile Details</div>
                                            <div className="w-48 hidden md:block">Category</div>
                                            <div className="w-40 hidden lg:block text-right pr-10">Base Premium</div>
                                            <div className="w-32 hidden sm:block text-right pr-4">Status</div>
                                            <div className="w-12 shrink-0"></div>
                                        </div>

                                        {paginatedArtists.map((artist, idx) => (
                                            <motion.div
                                                key={artist.id}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: idx * 0.03 }}
                                            >
                                                <ArtistListItem artist={artist} onSelect={() => setSelectedArtist(artist)} />
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




    const content = isEmbedded ? renderContent() : (
        <div className="min-h-screen bg-[#020202] text-white selection:bg-neon-blue selection:text-black">
            {/* Immersive Background Canvas */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(46,191,255,0.08),transparent_50%)]" />
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:80px_80px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_40%,#000_30%,transparent_100%)]" />
                <div className="absolute top-[10%] left-[-10%] w-[60%] h-[60%] bg-neon-blue/5 rounded-full blur-[180px] animate-pulse" />
                <div className="absolute bottom-[10%] right-[-10%] w-[50%] h-[50%] bg-neon-pink/5 rounded-full blur-[180px] animate-pulse" style={{ animationDelay: '1s' }} />
            </div>

            {renderContent()}
        </div>
    );

    return (
        <>
            {content}
            <AnimatePresence>
                {isCastingMode && (
                    <CastingBoardModal 
                        upcomingEvents={upcomingEvents}
                        artists={artists}
                        onClose={() => setIsCastingMode(false)}
                        onCast={handleCastToGig}
                    />
                )}
                {selectedArtist && (
                    <ArtistDetailModal 
                        artist={selectedArtist} 
                        onClose={() => setSelectedArtist(null)} 
                        onUpdateStatus={handleUpdateStatus}
                        onDelete={(id) => setShowDeleteConfirmId(id)}
                        onExport={exportToCSV}
                    />
                )}
                {showDeleteConfirmId && (
                    <div className="fixed inset-0 z-[500] flex items-center justify-center p-6 backdrop-blur-3xl bg-black/80">
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                            className="max-w-md w-full bg-zinc-900 border border-white/10 rounded-[3rem] p-12 text-center space-y-8 shadow-[0_50px_100px_rgba(0,0,0,0.5)]"
                        >
                            <div className="w-24 h-24 rounded-full bg-red-500/20 border border-red-500/20 flex items-center justify-center mx-auto">
                                <AlertTriangle size={44} className="text-red-500" />
                            </div>
                            <div className="space-y-3">
                                <h3 className="text-3xl font-black font-heading uppercase italic tracking-tighter text-white">Security Protocol</h3>
                                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest leading-relaxed">
                                    Are you certain you want to decommission this artist profile? This action is irreversible and will remove all associated deployment records.
                                </p>
                            </div>
                            <div className="flex flex-col gap-4">
                                <button 
                                    onClick={() => handleDeleteArtist(showDeleteConfirmId)}
                                    disabled={isDeleting}
                                    className="w-full h-20 bg-red-500 text-white rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-[11px] hover:bg-red-600 transition-all shadow-xl active:scale-95 flex items-center justify-center gap-3"
                                >
                                    {isDeleting ? <LoadingSpinner size="xs" color="white" /> : 'DECOMMISSION PROFILE'}
                                </button>
                                <button 
                                    onClick={() => setShowDeleteConfirmId(null)}
                                    className="w-full h-20 bg-white/5 text-gray-400 rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-[11px] hover:bg-white/10 transition-all active:scale-95"
                                >
                                    ABORT OPERATION
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );



};

/* Redesigned Sub-components */

const StatCard = ({ icon, label, value, color, description, compact = false }) => {
    const colorMap = {
        blue: { 
            bg: 'bg-neon-blue/10', 
            border: 'border-neon-blue/20', 
            text: 'text-neon-blue', 
            glow: 'rgba(46,191,255,0.2)',
            gradient: 'from-neon-blue/20 to-transparent'
        },
        green: { 
            bg: 'bg-neon-green/10', 
            border: 'border-neon-green/20', 
            text: 'text-neon-green', 
            glow: 'rgba(57,255,20,0.2)',
            gradient: 'from-neon-green/20 to-transparent'
        },
        yellow: { 
            bg: 'bg-yellow-500/10', 
            border: 'border-yellow-500/20', 
            text: 'text-yellow-500', 
            glow: 'rgba(234,179,8,0.2)',
            gradient: 'from-yellow-500/20 to-transparent'
        },
        purple: { 
            bg: 'bg-purple-500/10', 
            border: 'border-purple-500/20', 
            text: 'text-purple-500', 
            glow: 'rgba(168,85,247,0.2)',
            gradient: 'from-purple-500/20 to-transparent'
        }
    };
    
    const theme = colorMap[color];
    
    return (
        <motion.div 
            whileHover={{ y: -5, scale: 1.02 }}
            className={cn(
                "relative group overflow-hidden bg-[#0A0A0A] border transition-all duration-500 flex-1",
                compact ? "p-4 md:p-5 rounded-[2rem] min-w-[200px]" : "p-8 rounded-[3rem] min-w-[280px]",
                theme.border
            )}
            style={{
                boxShadow: compact ? `0 10px 30px -10px ${theme.glow}` : `0 20px 50px -10px ${theme.glow}`
            }}
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
                            <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">+12%</span>
                        </div>
                    )}

                </div>

                <div className={cn("space-y-1", compact ? "flex-1" : "")}>
                    <p className={cn("font-black uppercase tracking-[0.4em] leading-tight text-gray-500", compact ? "text-[8px]" : "text-[10px]")}>{label}</p>
                    <div className="flex items-baseline gap-3">
                        <h3 className={cn("font-black text-white tracking-tighter tabular-nums leading-none", compact ? "text-2xl" : "text-6xl")}>
                            {value}
                        </h3>
                    </div>
                    {!compact && description && (
                        <p className="text-[10px] font-bold text-gray-700 uppercase tracking-widest mt-2">{description}</p>
                    )}
                </div>

            </div>

            {/* Bottom Glow Line */}
            {!compact && (
                <div className={cn("absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-current to-transparent opacity-20", theme.text)} />
            )}

        </motion.div>
    );
};


const ArtistBadgeCard = ({ artist, onSelect }) => (
    <motion.div 
        layout
        onClick={onSelect}
        className="group relative bg-[#0A0A0A] border border-white/5 hover:border-neon-blue/40 rounded-[2.5rem] sm:rounded-[3rem] p-4 sm:p-5 cursor-pointer overflow-hidden transition-all duration-700 hover:-translate-y-2 hover:shadow-[0_40px_100px_rgba(0,0,0,0.9)] flex flex-col h-auto sm:min-h-[460px]"
    >
        {/* Cinematic Backdrop */}
        <div className="absolute inset-0 bg-gradient-to-br from-neon-blue/5 via-transparent to-neon-pink/5 opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
        
        {/* Avatar / Image Section - REDUCED SIZE */}
        <div className="relative mb-5 group-hover:scale-[1.01] transition-transform duration-700">
            <div className="aspect-[4/3] rounded-[2rem] overflow-hidden bg-black border border-white/5 relative flex items-center justify-center">
                {artist.image ? (
                    <img src={artist.image} alt={artist.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                ) : (
                    <div className="text-6xl font-black text-white/[0.03] uppercase italic select-none">
                        {artist.name.charAt(0)}
                    </div>
                )}
                {/* Status Indicator Over Image */}
                <div className="absolute top-3 right-3 scale-75 origin-top-right">
                    <StatusPill status={artist.profileStatus} />
                </div>
            </div>
            
            {/* Elite Badge Overlay */}
            {artist.profileStatus === 'approved' && (
                <div className="absolute -bottom-3 -right-1 w-10 h-10 bg-neon-green text-black rounded-xl flex items-center justify-center border-4 border-[#0A0A0A] shadow-[0_10px_20px_rgba(57,255,20,0.3)] z-20 group-hover:rotate-12 transition-transform">
                    <Check size={16} strokeWidth={4} />
                </div>
            )}
        </div>

        {/* Identity & Mission Data */}
        <div className="flex-1 flex flex-col px-1">
            <div className="mb-4">
                <p className="text-[9px] font-black text-neon-blue uppercase tracking-[0.4em] mb-1.5 opacity-80">{artist.category}</p>
                <h3 className="text-2xl font-black text-white tracking-tighter uppercase italic leading-none group-hover:text-neon-blue transition-colors duration-500 line-clamp-2 break-words">
                    {artist.name}
                </h3>
            </div>

            {/* Operational Meta (Grid for better layout) */}
            <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="flex items-center gap-2 text-gray-500 text-[9px] font-black uppercase tracking-[0.15em] bg-white/[0.03] px-3 py-2 rounded-xl border border-white/5 shadow-inner">
                    <MapPin size={10} className="text-neon-pink shrink-0" />
                    <span className="truncate">{artist.city || 'GLOBAL'}</span>
                </div>
                <div className="flex items-center gap-2 text-yellow-500/80 text-[9px] font-black uppercase tracking-[0.15em] bg-yellow-500/5 px-3 py-2 rounded-xl border border-yellow-500/10 shadow-inner">
                    <Award size={10} className="shrink-0" />
                    <span className="truncate">{artist.experienceYears || '0'}Y EXP</span>
                </div>
                {/* Added Phone/Contact info */}
                <div className="col-span-2 flex items-center gap-2 text-white/40 text-[9px] font-black uppercase tracking-[0.15em] bg-white/[0.02] px-3 py-2 rounded-xl border border-white/5">
                    <Phone size={10} className="text-neon-blue shrink-0" />
                    <span className="truncate">{artist.phone || 'SECURE LINE N/A'}</span>
                </div>
            </div>

            {/* Commercial Baseline */}
            <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between">
                <div>
                    <p className="text-[7px] font-black text-gray-600 uppercase tracking-widest mb-1">BASE PREMIUM</p>
                    <p className="text-xl font-black text-white tracking-tighter tabular-nums">₹{Number(artist.basePrice).toLocaleString()}</p>
                </div>
                <div className="flex gap-1.5">
                    {artist.instagram && (
                        <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center text-gray-500 hover:text-neon-pink hover:border-neon-pink/30 hover:bg-neon-pink/10 transition-all">
                            <Instagram size={14} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    </motion.div>
);






const ArtistListItem = ({ artist, onSelect }) => (
    <div 
        onClick={onSelect}
        className="group flex flex-col sm:flex-row items-start sm:items-center p-5 sm:px-8 sm:py-5 bg-[#080808]/40 backdrop-blur-xl border border-white/5 hover:border-white/10 hover:bg-[#0A0A0A]/80 rounded-[2rem] cursor-pointer transition-all duration-300 gap-4 sm:gap-6"

    >
        <div className="w-16">
            <div className="w-14 h-14 bg-black border border-white/10 rounded-2xl flex items-center justify-center font-black text-white group-hover:border-neon-blue/40 overflow-hidden transition-colors group-hover:scale-105 transition-transform">
                {artist.image ? (
                    <img src={artist.image} alt={artist.name} className="w-full h-full object-cover" />
                ) : (
                    artist.name.charAt(0)
                )}
            </div>
        </div>
        <div className="flex-1 w-full sm:w-auto">
            <div className="flex items-center justify-between sm:block mb-2 sm:mb-0">
                <p className="font-black uppercase italic tracking-tight text-white group-hover:text-neon-blue transition-colors text-lg sm:text-xl leading-none mb-2">{artist.name}</p>
                <div className="sm:hidden">
                    <StatusPill status={artist.profileStatus} />
                </div>
            </div>
            <div className="flex items-center gap-3">
                <p className="text-[9px] sm:text-[10px] text-gray-600 font-black tracking-[0.2em] flex items-center gap-1.5 uppercase">
                    <MapPin size={10} className="text-neon-pink" /> {artist.city}
                </p>
                <div className="w-1 h-1 rounded-full bg-white/10" />
                <p className="text-[9px] sm:text-[10px] text-gray-600 font-black tracking-[0.2em] uppercase">{artist.experienceYears}Y Exp</p>
            </div>
        </div>
        <div className="w-48 hidden md:block">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 bg-white/5 border border-white/5 px-4 py-2 rounded-xl group-hover:bg-white/10 transition-colors">
                {artist.category}
            </span>
        </div>
        <div className="w-40 hidden lg:block text-right pr-10">
            <p className="text-lg font-black text-white tracking-tighter">₹{Number(artist.basePrice).toLocaleString()}</p>
        </div>
        <div className="hidden sm:flex w-32 items-center justify-end">
            <StatusPill status={artist.profileStatus} />
        </div>
        <div className="hidden sm:flex w-12 h-12 rounded-2xl bg-white/5 border border-white/5 items-center justify-center group-hover:bg-white group-hover:text-black transition-all group-hover:scale-110">
            <ChevronRight size={20} />
        </div>
    </div>
);


const StatusPill = ({ status }) => {
    const themes = {
        approved: 'bg-neon-green/10 text-neon-green border-neon-green/30',
        rejected: 'bg-red-500/10 text-red-500 border-red-500/30',
        pending: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30'
    };
    
    const colors = {
        approved: 'bg-neon-green',
        rejected: 'bg-red-500',
        pending: 'bg-yellow-500'
    };

    const label = status === 'approved' ? 'VERIFIED' : status === 'rejected' ? 'REJECTED' : 'PENDING';

    return (
        <div className={cn(
            "px-5 py-2 rounded-full text-[9px] font-black uppercase tracking-[0.25em] border backdrop-blur-md inline-flex items-center gap-2.5",
            themes[status] || themes.pending
        )}>
            <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse shadow-[0_0_8px_rgba(0,0,0,0.5)]", colors[status] || colors.pending)} />
            {label}
        </div>
    );
};

const getYoutubeId = (url) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
};

const safeOpen = (url) => {
    if (!url) return;
    const protocol = /^https?:\/\//i.test(url) ? '' : 'https://';
    window.open(`${protocol}${url}`, '_blank');
};

const ArtistDetailModal = ({ artist, onClose, onUpdateStatus, onDelete, onExport }) => {


    const youtubeId = getYoutubeId(artist?.youtube);
    
    return createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 md:p-10 bg-black/40 backdrop-blur-sm">
            <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
                className="absolute inset-0 bg-black/95 backdrop-blur-xl" 
                onClick={onClose} 
            />
            <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 100 }} 
                animate={{ scale: 1, opacity: 1, y: 0 }} 
                exit={{ scale: 0.9, opacity: 0, y: 100 }}
                transition={{ type: "spring", damping: 30, stiffness: 200 }}
                className="relative bg-[#050505] border border-white/10 rounded-none sm:rounded-[4rem] w-full max-w-6xl h-full sm:h-auto sm:max-h-[90vh] flex flex-col overflow-hidden shadow-[0_0_150px_rgba(0,0,0,1)] z-10"

            >



            {/* Modal Glow Decor */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-px bg-gradient-to-r from-transparent via-neon-blue to-transparent opacity-50" />
            
            <button 
                onClick={onClose} 
                className="absolute top-6 right-6 sm:top-10 sm:right-10 w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white hover:text-black transition-all group z-50 hover:scale-110 active:scale-95"
            >
                <X size={20} className="sm:size-[28px] group-hover:rotate-90 transition-transform duration-500" />
            </button>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 sm:p-10 md:p-16">

                <div className="flex flex-col lg:flex-row items-center lg:items-start gap-8 sm:gap-12 mb-12 sm:mb-20">
                    <div className="relative shrink-0">
                        <div className="w-32 h-32 sm:w-48 sm:h-48 bg-black border-2 border-white/10 rounded-[2.5rem] sm:rounded-[4rem] flex items-center justify-center text-5xl sm:text-7xl font-black text-white shadow-[0_30px_60px_rgba(0,0,0,0.8)] relative overflow-hidden group">
                            <div className="absolute inset-0 bg-gradient-to-br from-neon-blue/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            {artist.image ? (
                                <img src={artist.image} alt={artist.name} className="w-full h-full object-cover relative z-10" />
                            ) : (
                                <span className="relative z-10">{artist.name.charAt(0)}</span>
                            )}
                        </div>
                        {artist.profileStatus === 'approved' && (
                            <div className="absolute -bottom-3 -right-3 sm:-bottom-6 sm:-right-6 bg-neon-green text-black w-10 h-10 sm:w-16 sm:h-16 rounded-[1rem] sm:rounded-[2rem] flex items-center justify-center border-4 sm:border-8 border-[#050505] shadow-[0_0_40px_rgba(57,255,20,0.3)] animate-float">
                                <ShieldCheck size={20} className="sm:size-[32px]" />
                            </div>
                        )}
                    </div>

                    
                    <div className="text-center lg:text-left space-y-6 pt-4">
                        <div className="space-y-2">
                            <div className="flex flex-wrap justify-center lg:justify-start gap-3 items-center mb-2">
                                <StatusPill status={artist.profileStatus} />
                                <span className="px-5 py-2 bg-white/5 border border-white/5 rounded-full text-[9px] font-black text-gray-500 tracking-[0.3em] uppercase">
                                    Member since {new Date(artist.createdAt || Date.now()).getFullYear()}
                                </span>
                            </div>
                            <h2 className="text-5xl md:text-7xl font-black font-heading tracking-tighter uppercase italic leading-[0.85] text-white">
                                {artist.name}
                            </h2>
                        </div>
                        
                        <div className="flex flex-wrap justify-center lg:justify-start gap-8 items-center">
                            <div className="flex items-center gap-3 text-neon-blue font-black text-sm tracking-[0.3em] uppercase">
                                <MapPin size={18} /> {artist.city}
                            </div>
                            <div className="w-1.5 h-1.5 rounded-full bg-white/10" />
                            <div className="flex items-center gap-3 text-neon-pink font-black text-sm tracking-[0.3em] uppercase">
                                <Award size={18} /> {artist.experienceYears} Years Exp
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-3 justify-center lg:justify-start">
                            <div className="px-6 py-3 bg-white/5 border border-white/5 rounded-2xl text-[10px] font-black text-gray-300 uppercase tracking-widest flex items-center gap-3">
                                <Music size={14} className="text-neon-blue" /> {artist.category}
                            </div>
                            <div className="px-6 py-3 bg-neon-blue/10 border border-neon-blue/20 rounded-2xl text-[10px] font-black text-neon-blue uppercase tracking-widest flex items-center gap-3 shadow-[0_10px_20px_rgba(46,191,255,0.1)]">
                                <Zap size={14} /> ₹{Number(artist.basePrice).toLocaleString()} / PERF
                            </div>
                        </div>
                        
                        <div className="w-px h-8 bg-white/5 mx-1 hidden xl:block" />

                        <button 
                            onClick={onExport}
                            className="group relative h-12 md:h-14 px-4 md:px-8 bg-white text-black rounded-xl md:rounded-full font-black uppercase tracking-[0.2em] text-[9px] md:text-[10px] overflow-hidden hover:scale-[1.02] active:scale-95 transition-all shadow-[0_15px_40px_rgba(255,255,255,0.1)] flex items-center justify-center gap-3 w-full xl:w-auto shrink-0 col-span-2"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-neon-blue via-neon-pink to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            <div className="relative z-10 flex items-center gap-3 group-hover:text-white transition-colors duration-500">
                                <Download size={16} />
                                EXPORT CSV
                            </div>
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-16">
                    <div className="lg:col-span-3 space-y-16">
                        <section className="space-y-8">
                            <div className="flex items-center gap-6">
                                <h3 className="text-[11px] font-black text-neon-blue uppercase tracking-[0.6em] whitespace-nowrap">ARTIST MANIFESTO</h3>
                                <div className="w-full h-px bg-gradient-to-r from-neon-blue/30 to-transparent" />
                            </div>
                            <div className="relative group">
                                <div className="absolute -inset-1 bg-gradient-to-br from-neon-blue/20 to-neon-pink/20 rounded-[2.5rem] blur opacity-20 group-hover:opacity-40 transition-opacity" />
                                <div className="relative bg-[#0A0A0A] p-10 rounded-[2.5rem] border border-white/5 shadow-inner">
                                    <p className="text-gray-300 leading-relaxed italic text-xl font-medium">"{artist.bio}"</p>
                                </div>
                            </div>
                        </section>
                        
                        {youtubeId && (
                            <section className="space-y-8">
                                <div className="flex items-center gap-6">
                                    <h3 className="text-[11px] font-black text-red-500 uppercase tracking-[0.6em] whitespace-nowrap">DIGITAL PORTFOLIO</h3>
                                    <div className="w-full h-px bg-gradient-to-r from-red-500/30 to-transparent" />
                                </div>
                                <div className="aspect-video bg-black rounded-[3rem] overflow-hidden border border-white/10 shadow-[0_40px_80px_rgba(0,0,0,0.8)] group relative">
                                    <iframe 
                                        width="100%" height="100%" 
                                        src={`https://www.youtube.com/embed/${youtubeId}`}
                                        title="YouTube video player" frameBorder="0" 
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                        allowFullScreen
                                        className="relative z-10"
                                    />
                                    <div className="absolute inset-0 bg-red-600/5 group-hover:bg-transparent transition-colors duration-700" />
                                </div>
                            </section>
                        )}

                    </div>

                    <div className="lg:col-span-2 space-y-16">
                        <section className="space-y-8">
                            <div className="flex items-center gap-6">
                                <h3 className="text-[11px] font-black text-gray-500 uppercase tracking-[0.6em] whitespace-nowrap">SECURE CHANNELS</h3>
                                <div className="w-full h-px bg-gradient-to-r from-white/10 to-transparent" />
                            </div>
                            <div className="space-y-3">
                                <ContactItem icon={<Mail size={16} />} label="Professional Email" value={artist.email || 'ENCRYPTED@ARTISTANT.IO'} />
                                <ContactItem icon={<Phone size={16} />} label="Emergency Contact" value={artist.phone || 'SECURE LINE N/A'} />
                            </div>
                        </section>

                        <section className="space-y-8">
                            <div className="flex items-center gap-6">
                                <h3 className="text-[11px] font-black text-gray-500 uppercase tracking-[0.6em] whitespace-nowrap">SOCIAL FOOTPRINT</h3>
                                <div className="w-full h-px bg-gradient-to-r from-white/10 to-transparent" />
                            </div>
                            <div className="grid grid-cols-1 gap-4">
                                {artist.instagram && (
                                    <SocialLink 
                                        href={`https://instagram.com/${artist.instagram.replace('@','')}`}
                                        icon={<Instagram size={20} />}
                                        label="Instagram"
                                        value={artist.instagram}
                                        color="pink"
                                    />
                                )}
                                {artist.youtube && (
                                    <SocialLink 
                                        href={artist.youtube}
                                        icon={<Youtube size={20} />}
                                        label="YouTube"
                                        value="Official Channel"
                                        color="red"
                                    />
                                )}
                                {artist.portfolioLink && (
                                    <button 
                                        onClick={() => safeOpen(artist.portfolioLink)}

                                        className="group relative w-full h-20 bg-white text-black rounded-[2rem] font-black uppercase tracking-[0.3em] text-[11px] flex items-center justify-center gap-4 hover:scale-[1.02] active:scale-98 transition-all shadow-[0_20px_40px_rgba(255,255,255,0.1)] overflow-hidden"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-neon-blue to-neon-pink opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                        <span className="relative z-10 flex items-center gap-3 group-hover:text-white transition-colors duration-500">
                                            <Globe size={18} /> FULL CASE STUDY
                                        </span>
                                    </button>
                                )}
                            </div>
                        </section>

                    </div>
                </div>
            </div>

            {/* Modal Command Bar */}
            <div className="shrink-0 p-10 bg-[#080808]/80 backdrop-blur-3xl border-t border-white/10 mt-auto relative z-20">
                <div className="max-w-6xl mx-auto flex flex-col sm:flex-row gap-4 items-center justify-between">
                    <div className="flex flex-wrap gap-4 w-full sm:w-auto">
                        {artist.profileStatus !== 'approved' && (
                            <button 
                                onClick={() => onUpdateStatus(artist.id, 'approved')} 
                                disabled={isUpdating}
                                className="flex-1 sm:flex-none h-20 px-16 bg-neon-green text-black font-black uppercase tracking-[0.3em] text-[11px] rounded-[1.5rem] shadow-[0_20px_50px_rgba(57,255,20,0.3)] hover:scale-[1.03] active:scale-95 transition-all flex items-center justify-center gap-3"
                            >
                                {isUpdating ? <LoadingSpinner size="xs" color="black" /> : 'AUTHORIZE TALENT'}
                            </button>
                        )}
                        {artist.profileStatus !== 'rejected' && (
                            <button 
                                onClick={() => onUpdateStatus(artist.id, 'rejected')} 
                                disabled={isUpdating}
                                className="flex-1 sm:flex-none h-20 px-16 bg-white/5 border border-white/10 text-gray-400 font-black uppercase tracking-[0.3em] text-[11px] rounded-[1.5rem] hover:bg-white hover:text-black hover:scale-[1.03] active:scale-95 transition-all flex items-center justify-center gap-3"
                            >
                                {isUpdating ? <LoadingSpinner size="xs" color="black" /> : 'REJECT PROFILE'}
                            </button>
                        )}
                    </div>
                    
                    <button 
                        onClick={() => onDelete(artist.id)} 
                        className="h-16 w-16 bg-red-600/10 border border-red-600/20 rounded-2xl flex items-center justify-center text-red-500 hover:bg-red-600 hover:text-white transition-all hover:scale-110 active:scale-90 shadow-lg shadow-red-600/5"
                    >
                        <Trash2 size={22} />
                    </button>
                </div>
            </div>
        </motion.div>
    </div>,
    document.body
);
};




const ContactItem = ({ icon, label, value }) => (
    <div className="group flex items-center justify-between p-6 bg-[#0A0A0A] border border-white/5 rounded-3xl hover:border-white/20 transition-all shadow-xl">
        <div className="flex items-center gap-5">
            <div className="w-12 h-12 rounded-2xl bg-black border border-white/10 flex items-center justify-center text-gray-500 group-hover:text-white transition-colors">
                {icon}
            </div>
            <div className="space-y-0.5">
                <p className="text-[8px] font-black text-gray-600 uppercase tracking-[0.3em]">{label}</p>
                <p className="text-sm font-black text-white tracking-tight">{value}</p>
            </div>
        </div>
        <button className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white hover:text-black">
            <ExternalLink size={14} />
        </button>
    </div>
);

const SocialLink = ({ href, icon, label, value, color }) => {
    const themes = {
        pink: 'hover:border-neon-pink/40 shadow-neon-pink/5',
        red: 'hover:border-red-600/40 shadow-red-600/5'
    };
    
    const iconBgs = {
        pink: 'bg-gradient-to-tr from-yellow-400 via-neon-pink to-purple-600',
        red: 'bg-red-600'
    };

    return (
        <a 
            href={href} 
            target="_blank" 
            rel="noopener noreferrer"
            className={cn(
                "group flex items-center justify-between p-6 bg-[#0A0A0A] border border-white/5 rounded-3xl transition-all duration-500 shadow-2xl",
                themes[color]
            )}
        >
            <div className="flex items-center gap-5">
                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg", iconBgs[color])}>
                    {icon}
                </div>
                <div className="space-y-0.5">
                    <p className="text-[8px] font-black text-gray-600 uppercase tracking-[0.3em]">{label}</p>
                    <p className="text-sm font-black text-white tracking-tight">{value}</p>
                </div>
            </div>
            <ExternalLink size={16} className="text-gray-700 group-hover:text-white transition-colors" />
        </a>
    );
};

const CastingBoardModal = ({ upcomingEvents, artists, onClose, onCast }) => {
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [castingSearch, setCastingSearch] = useState('');

    const matchingArtists = artists.filter(a => {
        const isApproved = a.profileStatus === 'approved';
        const searchLower = castingSearch.toLowerCase();
        const matchesSearch = a.name.toLowerCase().includes(searchLower) || (a.category || '').toLowerCase().includes(searchLower);
        
        let matchesLocation = true;
        if (selectedEvent) {
            const eventLoc = (selectedEvent.location || '').toLowerCase();
            const artistCity = (a.city || '').toLowerCase();
            
            // Allow casting if locations match, or if it's online, or if no location is specified for either
            matchesLocation = !eventLoc || eventLoc === 'online' || !artistCity || 
                             artistCity === eventLoc || 
                             eventLoc.includes(artistCity) || 
                             artistCity.includes(eventLoc);
        }


        return isApproved && matchesSearch && matchesLocation;
    });


    return createPortal(
        <div className="fixed top-0 left-0 w-full h-full z-[99999] flex items-center justify-center p-4 md:p-10 pt-24 pb-12">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/99 backdrop-blur-[40px]" onClick={onClose} />
            <motion.div 
                initial={{ scale: 0.95, opacity: 0, filter: 'blur(10px)' }} 
                animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }} 
                exit={{ scale: 0.95, opacity: 0, filter: 'blur(10px)' }}
                className="relative bg-[#050505] border border-white/10 rounded-[4rem] w-full max-w-[1500px] h-full overflow-hidden flex flex-col shadow-[0_50px_150px_rgba(0,0,0,1)] z-10"
            >
                {/* Board Header */}
                <div className="px-12 py-10 border-b border-white/5 flex items-center justify-between shrink-0 bg-[#080808]/50">
                    <div className="flex items-center gap-8">
                        <div className="w-20 h-20 bg-white text-black rounded-[2.5rem] flex items-center justify-center shadow-[0_20px_40px_rgba(255,255,255,0.15)] group relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-neon-blue via-neon-pink to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <Target size={36} className="relative z-10 group-hover:text-white transition-colors" />
                        </div>
                        <div className="space-y-1">
                            <h2 className="text-5xl font-black font-heading uppercase italic tracking-tighter text-white">GIG <span className="text-neon-blue">CASTING</span> BOARD</h2>
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.5em] mt-1">Deploy elite verified talent to active missions</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white hover:text-black transition-all group hover:scale-110 active:scale-90">
                        <X size={28} className="group-hover:rotate-90 transition-transform duration-500" />
                    </button>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* Event Summary Sidebar */}
                    <div className="w-[450px] border-r border-white/5 overflow-y-auto custom-scrollbar p-10 bg-[#080808]/30">
                        <div className="flex items-center gap-4 mb-10">
                            <Calendar size={18} className="text-neon-pink" />
                            <p className="text-[11px] font-black text-gray-500 uppercase tracking-[0.4em]">Active Missions</p>
                        </div>
                        
                        <div className="space-y-4">
                            {upcomingEvents.length === 0 ? (
                                <div className="p-10 text-center border-2 border-dashed border-white/5 rounded-[3rem] space-y-4">
                                    <Calendar size={32} className="text-gray-800 mx-auto" />
                                    <p className="text-[10px] font-black text-gray-700 uppercase tracking-widest leading-loose">No active missions scheduled in the command center</p>
                                </div>
                            ) : upcomingEvents.map(event => (
                                <div 
                                    key={event.id} 
                                    onClick={() => setSelectedEvent(event)}
                                    className={cn(
                                        "p-8 rounded-[2.5rem] border cursor-pointer transition-all duration-500 relative overflow-hidden group hover:-translate-y-1",
                                        selectedEvent?.id === event.id 
                                            ? "bg-white text-black border-white shadow-[0_20px_40px_rgba(255,255,255,0.1)]" 
                                            : "bg-[#0A0A0A] border-white/5 hover:border-white/20 text-white"
                                    )}
                                >
                                    <div className="relative z-10">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className={cn("text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full", selectedEvent?.id === event.id ? "bg-black/10" : "bg-white/5")}>
                                                {event.date || 'TBA'}
                                            </div>
                                            <StatusPill status="approved" />
                                        </div>
                                        <p className="font-black uppercase italic text-2xl mb-4 leading-none tracking-tight">{event.title}</p>
                                        <div className="flex items-center gap-3 opacity-60 text-[10px] font-black uppercase tracking-[0.2em]">
                                            <MapPin size={12} className="text-neon-pink" /> {event.location}
                                        </div>
                                    </div>
                                    <div className={cn(
                                        "absolute top-0 right-0 w-32 h-32 blur-[60px] rounded-full -mr-16 -mt-16 transition-opacity duration-1000",
                                        selectedEvent?.id === event.id ? "bg-neon-blue/40 opacity-100" : "bg-white/5 opacity-0 group-hover:opacity-100"
                                    )} />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Deployment Engine */}
                    <div className="flex-1 flex flex-col overflow-hidden bg-[#020202]">
                        {selectedEvent ? (
                            <>
                                <div className="p-10 border-b border-white/5 bg-[#080808]/20 flex items-center justify-between">
                                    <div className="relative max-w-xl flex-1 group">
                                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-700 group-focus-within:text-neon-blue transition-colors" size={20} />
                                        <input
                                            type="text"
                                            placeholder="FILTER COMPATIBLE TALENT..."
                                            value={castingSearch}
                                            onChange={(e) => setCastingSearch(e.target.value)}
                                            className="w-full h-18 pl-16 pr-8 bg-black border border-white/5 rounded-[2rem] text-xs font-black uppercase tracking-[0.2em] focus:border-neon-blue/40 outline-none transition-all placeholder:text-gray-800"
                                        />
                                    </div>
                                    <div className="flex items-center gap-6 pl-10 text-right">
                                        <div className="space-y-1">
                                            <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest">DEPLOYMENT TARGET</p>
                                            <p className="text-neon-blue font-black uppercase italic text-lg tracking-tight">{selectedEvent.location}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto custom-scrollbar p-10">
                                    <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6 items-start">
                                        {matchingArtists.map((artist, idx) => {
                                            const isAlreadyCast = artist.gigCasting && artist.gigCasting[selectedEvent.id];
                                            
                                            return (
                                                <motion.div 
                                                    key={artist.id}
                                                    initial={{ opacity: 0, scale: 0.95 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    transition={{ delay: idx * 0.05 }}
                                                    className={cn(
                                                        "p-8 rounded-[3rem] border transition-all duration-500 flex flex-col relative group overflow-hidden h-auto", 
                                                        isAlreadyCast 
                                                            ? "bg-neon-green/5 border-neon-green/20 shadow-[0_20px_40px_rgba(57,255,20,0.05)]" 
                                                            : "bg-[#0A0A0A] border-white/5 hover:border-white/20 hover:bg-[#0E0E0E]"
                                                    )}
                                                >
                                                    <div className="flex items-start justify-between mb-8 relative z-10">
                                                        <div className="w-16 h-16 bg-black rounded-2xl border border-white/10 flex items-center justify-center font-black text-white text-xl shadow-2xl group-hover:border-neon-blue/30 transition-colors">
                                                            {artist.name.charAt(0)}
                                                        </div>
                                                        {isAlreadyCast ? (
                                                            <div className="px-4 py-2 bg-neon-green/20 text-neon-green border border-neon-green/30 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-2 animate-pulse">
                                                                <Check size={12} strokeWidth={4} /> DEPLOYED
                                                            </div>
                                                        ) : (
                                                            <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500">
                                                                <Zap size={14} className="text-neon-blue" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    
                                                    <div className="relative z-10 space-y-1 mb-8">
                                                        <h4 className="font-black uppercase italic text-2xl tracking-tight group-hover:text-neon-blue transition-colors duration-500 line-clamp-1">{artist.name}</h4>
                                                        <p className="text-[10px] text-gray-600 uppercase font-black tracking-[0.2em]">{artist.category}</p>
                                                    </div>
                                                    
                                                    <div className="mt-auto relative z-10 flex items-center gap-4">
                                                        <button 
                                                            disabled={isAlreadyCast}
                                                            onClick={() => {
                                                                console.log("Modal Casting Request:", artist.id, selectedEvent.id);
                                                                onCast(artist.id, selectedEvent.id);
                                                            }}
                                                            className={cn(
                                                                "flex-1 h-16 text-[11px] font-black tracking-[0.3em] uppercase rounded-[1.5rem] transition-all duration-500 shadow-2xl", 
                                                                isAlreadyCast 
                                                                    ? "bg-white/5 text-gray-700 cursor-not-allowed" 
                                                                    : "bg-white text-black hover:bg-neon-blue hover:text-white hover:scale-[1.03] active:scale-95"
                                                            )}
                                                        >
                                                            {isAlreadyCast ? 'MISSION ASSIGNED' : 'DEPLOY TO MISSION'}
                                                        </button>
                                                    </div>
                                                    
                                                    {/* Card Glow */}
                                                    <div className={cn(
                                                        "absolute bottom-0 right-0 w-32 h-32 blur-[50px] rounded-full -mr-16 -mb-16 transition-opacity duration-1000 opacity-0 group-hover:opacity-40",
                                                        isAlreadyCast ? "bg-neon-green" : "bg-neon-blue"
                                                    )} />
                                                </motion.div>
                                            );
                                        })}
                                    </div>

                                    {matchingArtists.length === 0 && (
                                        <div className="flex flex-col items-center justify-center py-40 space-y-8 opacity-40">
                                            <div className="w-32 h-32 rounded-full border-2 border-dashed border-white/20 flex items-center justify-center">
                                                <Target size={48} className="text-white" />
                                            </div>
                                            <div className="text-center space-y-2">
                                                <p className="text-2xl font-black uppercase italic tracking-tighter text-white">No Compatible Talent</p>
                                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Searching for verified operators in {selectedEvent.location}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-center p-10 bg-[#020202]">
                                <div className="relative mb-12">
                                    <div className="absolute inset-0 bg-neon-blue/20 blur-[100px] animate-pulse rounded-full" />
                                    <div className="relative w-48 h-48 bg-white/5 rounded-[4rem] flex items-center justify-center border border-white/10 animate-float">
                                        <Calendar size={64} className="text-gray-700" />
                                    </div>
                                </div>
                                <h3 className="text-5xl font-black uppercase tracking-tighter text-gray-500 italic mb-6">SELECT AN EVENT</h3>
                                <p className="text-sm font-black text-gray-800 tracking-[0.4em] uppercase max-w-md leading-relaxed">
                                    Select an event from the left panel to begin assigning artists.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
                </motion.div>
            </div>,
            document.body
        );
};


export default ArtistManager;
