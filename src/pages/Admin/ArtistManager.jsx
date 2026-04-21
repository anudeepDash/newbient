import React, { useState, useMemo } from 'react';
import { useStore } from '../../lib/store';
import { PREDEFINED_CITIES, ARTIST_CATEGORIES } from '../../lib/constants';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { 
    Users, Search, MapPin, Mail, Phone, ExternalLink, 
    CheckCircle2, XCircle, Activity, ArrowLeft, Trash2, 
    Ban, Sparkles, Filter, Globe, Youtube, Zap, X, 
    Clock, LayoutGrid, FileSpreadsheet, Music, Mic2, 
    Video, Star, ChevronRight, Calendar, Target,
    Check, Instagram, SlidersHorizontal, ShieldCheck, ShieldAlert
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import StudioSelect from '../../components/ui/StudioSelect';

const ArtistManager = () => {
    const { artists, upcomingEvents, updateArtist, deleteArtist, castArtistToGig } = useStore();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCity, setFilterCity] = useState('All');
    const [filterCategory, setFilterCategory] = useState('All');
    const [filterStatus, setFilterStatus] = useState('All');
    const [selectedArtist, setSelectedArtist] = useState(null);
    const [viewMode, setViewMode] = useState('grid');
    const [isCastingMode, setIsCastingMode] = useState(false);

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

    const stats = useMemo(() => {
        return {
            total: artists.length,
            approved: artists.filter(a => a.profileStatus === 'approved').length,
            pending: artists.filter(a => a.profileStatus === 'pending' || !a.profileStatus).length,
            categories: new Set(artists.map(a => a.category)).size
        };
    }, [artists]);

    const handleUpdateStatus = async (id, newStatus) => {
        try {
            await updateArtist(id, { profileStatus: newStatus });
            if (selectedArtist && selectedArtist.id === id) {
                setSelectedArtist({ ...selectedArtist, profileStatus: newStatus });
            }
        } catch (error) {
            alert("Status update failed.");
        }
    };

    const handleDeleteArtist = async (id) => {
        if (window.confirm("Permanently delete this artist profile?")) {
            try {
                await deleteArtist(id);
                setSelectedArtist(null);
            } catch (error) {
                alert("Deletion failed.");
            }
        }
    };

    const handleCastToGig = async (artistId, gigId) => {
        try {
            await castArtistToGig(artistId, gigId);
            setIsCastingMode(false);
            alert("Artist shortlisted for the gig!");
        } catch (error) {
            alert("Casting failed.");
        }
    };

    return (
        <div className="min-h-screen bg-[#020202] text-white pb-32">
            {/* Immersive Background */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:60px_60px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-neon-blue/10 rounded-full blur-[180px]" />
                <div className="absolute top-[20%] right-[-10%] w-[40%] h-[40%] bg-neon-pink/10 rounded-full blur-[180px]" />
            </div>

            <div className="relative z-10 max-w-[1600px] mx-auto px-4 md:px-8 pt-32">
                {/* Dashboard Header */}
                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-12 mb-16">
                    <div className="space-y-6">
                        <div className="flex items-center gap-3">
                            <Sparkles size={16} className="text-neon-blue animate-pulse" />
                            <span className="text-neon-blue text-[10px] font-black uppercase tracking-[0.4em]">Studio Workspace</span>
                        </div>
                        <h1 className="text-5xl md:text-7xl lg:text-[6rem] font-black font-heading tracking-tighter uppercase italic leading-[0.85]">
                            TALENT <br/>
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF5722] via-[#FF1F71] to-[#7B61FF]">OPERATIONS.</span>
                        </h1>
                        <p className="text-gray-400 font-medium tracking-widest text-sm uppercase">Command Center &middot; v2.0</p>
                    </div>

                    <div className="flex flex-wrap gap-4 w-full xl:w-auto">
                        <StatCard icon={<Users />} label="Total Roster" value={stats.total} color="neon-blue" />
                        <StatCard icon={<ShieldCheck />} label="Verified" value={stats.approved} color="neon-green" />
                        <StatCard icon={<ShieldAlert />} label="Pending" value={stats.pending} color="yellow-500" />
                    </div>
                </div>

                {/* Control Panel (Filters & Actions) */}
                <div className="bg-zinc-900/60 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-4 md:p-6 mb-12 shadow-2xl flex flex-col lg:flex-row items-center gap-6">
                    {/* Search */}
                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                        <input
                            type="text"
                            placeholder="SEARCH BY NAME OR BIO..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full h-16 pl-14 pr-6 bg-black/50 border border-white/5 hover:border-white/20 focus:border-neon-blue/50 rounded-2xl text-[11px] font-black uppercase tracking-widest outline-none transition-all placeholder:text-gray-700"
                        />
                    </div>

                    {/* Filters */}
                    <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                        <div className="w-full sm:w-[150px]">
                            <StudioSelect value={filterCategory} options={categories.map(c => ({ value: c, label: c === 'All' ? 'CATEGORY' : c.toUpperCase() }))} onChange={setFilterCategory} className="h-16" accentColor="neon-pink" />
                        </div>
                        <div className="w-full sm:w-[150px]">
                            <StudioSelect value={filterCity} options={cities.map(c => ({ value: c, label: c === 'All' ? 'CITY' : c.toUpperCase() }))} onChange={setFilterCity} className="h-16" accentColor="neon-blue" />
                        </div>
                        <div className="w-full sm:w-[150px]">
                            <StudioSelect 
                                value={filterStatus} 
                                options={[
                                    { value: 'All', label: 'STATUS' }, { value: 'approved', label: 'VERIFIED' }, { value: 'pending', label: 'PENDING' }, { value: 'rejected', label: 'REJECTED' }
                                ]} 
                                onChange={setFilterStatus} 
                                className="h-16" 
                                accentColor="orange-500" 
                            />
                        </div>
                    </div>

                    <div className="w-px h-12 bg-white/10 hidden lg:block" />

                    {/* Actions & View Toggles */}
                    <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto justify-between lg:justify-end">
                        <div className="flex bg-black/50 p-1.5 rounded-2xl border border-white/5 w-full sm:w-auto">
                            <button onClick={() => setViewMode('grid')} className={cn("flex-1 px-4 py-3 rounded-xl transition-all flex justify-center", viewMode === 'grid' ? "bg-white text-black shadow-lg" : "text-gray-500 hover:text-white")}><LayoutGrid size={18} /></button>
                            <button onClick={() => setViewMode('list')} className={cn("flex-1 px-4 py-3 rounded-xl transition-all flex justify-center", viewMode === 'list' ? "bg-white text-black shadow-lg" : "text-gray-500 hover:text-white")}><Activity size={18} /></button>
                        </div>
                        <button 
                            onClick={() => setIsCastingMode(true)}
                            className="w-full sm:w-auto h-16 px-6 bg-gradient-to-r from-neon-blue to-neon-pink text-white rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-[0_10px_30px_rgba(46,191,255,0.3)] hover:shadow-[0_10px_40px_rgba(255,31,113,0.5)] hover:scale-105 transition-all flex items-center justify-center gap-3"
                        >
                            <Target size={18} /> CASTING
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="relative z-0 min-h-[400px]">
                    {artists.length === 0 ? (
                        <div className="py-32 text-center bg-zinc-900/20 rounded-[3rem] border-2 border-dashed border-white/5 flex flex-col items-center gap-6">
                            <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center border border-white/10"><Mic2 size={40} className="text-gray-600" /></div>
                            <h3 className="text-2xl font-black uppercase tracking-tighter text-gray-500 italic">No Talent Data Found</h3>
                        </div>
                    ) : filteredArtists.length === 0 ? (
                         <div className="py-20 text-center flex flex-col items-center gap-6">
                            <Search size={40} className="text-gray-700" />
                            <h3 className="text-xl font-black uppercase tracking-widest text-gray-500">NO MATCHES FOUND</h3>
                        </div>
                    ) : (
                        <AnimatePresence mode="wait">
                            {viewMode === 'grid' ? (
                                <motion.div
                                    key="grid"
                                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                                    className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                                >
                                    {filteredArtists.map(artist => (
                                        <ArtistBadgeCard key={artist.id} artist={artist} onSelect={() => setSelectedArtist(artist)} />
                                    ))}
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="list"
                                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98 }}
                                    className="flex flex-col gap-4"
                                >
                                    <div className="flex items-center px-8 py-4 text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] border-b border-white/10">
                                        <div className="w-16">Profile</div>
                                        <div className="flex-1 min-w-[200px]">Artist Details</div>
                                        <div className="w-48 hidden md:block">Category</div>
                                        <div className="w-32 hidden lg:block">Base Price</div>
                                        <div className="w-32">Status</div>
                                        <div className="w-32 text-right hidden sm:block">Actions</div>
                                    </div>
                                    {filteredArtists.map(artist => (
                                        <ArtistListItem key={artist.id} artist={artist} onSelect={() => setSelectedArtist(artist)} />
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    )}
                </div>
            </div>

            {/* Detailed Artist Modal */}
            <AnimatePresence>
                {selectedArtist && (
                    <ArtistDetailModal 
                        artist={selectedArtist} 
                        onClose={() => setSelectedArtist(null)} 
                        onUpdateStatus={handleUpdateStatus}
                        onDelete={handleDeleteArtist}
                    />
                )}
            </AnimatePresence>

            {/* Casting Board Modal */}
            <AnimatePresence>
                {isCastingMode && (
                    <CastingBoardModal 
                        upcomingEvents={upcomingEvents}
                        artists={artists}
                        onClose={() => setIsCastingMode(false)}
                        onCast={handleCastToGig}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

// Components Below

const StatCard = ({ icon, label, value, color }) => {
    // Generate text color class based on the passed color
    const textColorMap = {
        'neon-blue': 'text-[#2ebfff]',
        'neon-green': 'text-[#39ff14]',
        'yellow-500': 'text-[#eab308]'
    };
    
    return (
        <div className="bg-zinc-900/60 backdrop-blur-md border border-white/10 p-6 rounded-3xl flex-1 min-w-[200px] shadow-xl hover:bg-white/5 transition-all group">
            <div className={`${textColorMap[color]} mb-4 group-hover:scale-110 transition-transform`}>{icon}</div>
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">{label}</p>
            <p className="text-4xl font-black text-white">{value}</p>
        </div>
    );
};

const ArtistBadgeCard = ({ artist, onSelect }) => (
    <div 
        onClick={onSelect}
        className="group relative bg-zinc-900/50 backdrop-blur-xl border border-white/10 hover:border-white/30 rounded-[2.5rem] p-6 cursor-pointer overflow-hidden transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col h-full"
    >
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-neon-blue/20 to-transparent blur-2xl group-hover:opacity-100 opacity-0 transition-opacity duration-700 pointer-events-none" />
        
        <div className="flex items-start justify-between mb-8 relative z-10">
            <div className="relative">
                <div className="w-20 h-20 bg-black border-2 border-white/10 rounded-2xl flex items-center justify-center text-3xl font-black text-white shadow-xl group-hover:border-neon-blue/50 transition-colors">
                    {artist.name.charAt(0)}
                </div>
                {artist.profileStatus === 'approved' && (
                    <div className="absolute -bottom-2 -right-2 bg-neon-green text-black w-6 h-6 rounded-full flex items-center justify-center border-2 border-[#020202]">
                        <Check size={12} strokeWidth={4} />
                    </div>
                )}
            </div>
            <StatusPill status={artist.profileStatus} />
        </div>

        <div className="relative z-10 mb-6 flex-1">
            <h3 className="text-2xl font-black uppercase italic tracking-tighter text-white mb-2 group-hover:text-neon-blue transition-colors">{artist.name}</h3>
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] flex items-center gap-2 mb-4">
                <MapPin size={12} className="text-neon-pink" /> {artist.city}
            </p>
            <div className="flex flex-wrap gap-2">
                <span className="text-[9px] px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-gray-300 font-black uppercase tracking-widest">{artist.category}</span>
                <span className="text-[9px] px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-gray-300 font-black uppercase tracking-widest">{artist.experienceYears}Y EXP</span>
            </div>
        </div>

        <div className="pt-6 border-t border-white/10 flex items-center justify-between relative z-10">
            <div className="flex gap-4 text-gray-500">
                {artist.instagram && <Instagram size={16} className="hover:text-neon-pink transition-colors" />}
                {artist.youtube && <Youtube size={16} className="hover:text-red-500 transition-colors" />}
            </div>
            <p className="text-xs font-black text-white tracking-widest">₹{Number(artist.basePrice).toLocaleString()}</p>
        </div>
    </div>
);

const ArtistListItem = ({ artist, onSelect }) => (
    <div 
        onClick={onSelect}
        className="group flex flex-wrap sm:flex-nowrap items-center px-4 sm:px-8 py-5 bg-zinc-900/30 backdrop-blur-md border border-white/5 hover:border-white/20 hover:bg-zinc-900/80 rounded-2xl cursor-pointer transition-all duration-300 gap-4 sm:gap-0"
    >
        <div className="w-16 hidden sm:block">
            <div className="w-12 h-12 bg-black border border-white/10 rounded-xl flex items-center justify-center font-black text-white group-hover:border-neon-blue/50 transition-colors">
                {artist.name.charAt(0)}
            </div>
        </div>
        <div className="flex-1 min-w-[200px]">
            <p className="font-black uppercase italic tracking-tight text-white group-hover:text-neon-blue transition-colors text-lg">{artist.name}</p>
            <p className="text-[10px] text-gray-500 font-black tracking-widest flex items-center gap-2 mt-1">
                <MapPin size={10} className="text-neon-pink" /> {artist.city}
            </p>
        </div>
        <div className="w-48 hidden md:block">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-300 bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg">{artist.category}</span>
        </div>
        <div className="w-32 hidden lg:block">
            <p className="text-xs font-black text-white tracking-widest">₹{Number(artist.basePrice).toLocaleString()}</p>
        </div>
        <div className="w-full sm:w-32 flex justify-between sm:justify-start items-center">
            <StatusPill status={artist.profileStatus} />
            <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex sm:hidden items-center justify-center group-hover:bg-white group-hover:text-black transition-all">
                <ChevronRight size={16} />
            </div>
        </div>
        <div className="w-32 text-right hidden sm:block">
            <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-white group-hover:text-black transition-all ml-auto">
                <ChevronRight size={16} />
            </div>
        </div>
    </div>
);

const StatusPill = ({ status }) => (
    <div className={cn(
        "px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border backdrop-blur-md inline-flex items-center gap-2",
        status === 'approved' ? 'bg-neon-green/10 text-neon-green border-neon-green/30' : 
        status === 'rejected' ? 'bg-red-500/10 text-red-500 border-red-500/30' : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30'
    )}>
        <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", 
            status === 'approved' ? 'bg-neon-green' : 
            status === 'rejected' ? 'bg-red-500' : 'bg-yellow-500'
        )} />
        {status === 'approved' ? 'VERIFIED' : status === 'rejected' ? 'REJECTED' : 'PENDING'}
    </div>
);

const ArtistDetailModal = ({ artist, onClose, onUpdateStatus, onDelete }) => (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 pt-20 pb-20">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/95 backdrop-blur-xl" onClick={onClose} />
        <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 30 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 30 }}
            className="relative bg-[#050505] border border-white/10 rounded-[3.5rem] p-8 md:p-14 max-w-4xl w-full h-[85vh] flex flex-col overflow-hidden shadow-[0_50px_100px_rgba(0,0,0,0.9)] z-[101]"
        >
            <button onClick={onClose} className="absolute top-8 right-8 w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white hover:text-black transition-all group z-50">
                <X size={24} className="group-hover:rotate-90 transition-transform duration-500" />
            </button>

            <div className="relative z-20 flex-1 overflow-y-auto custom-scrollbar pr-4 -mr-4">
                <div className="flex flex-col md:flex-row items-center md:items-start gap-10 mb-16">
                    <div className="relative">
                        <div className="w-40 h-40 bg-black border-2 border-white/10 rounded-[3.5rem] flex items-center justify-center text-6xl font-black text-white shadow-2xl">
                            {artist.name.charAt(0)}
                        </div>
                        {artist.profileStatus === 'approved' && (
                            <div className="absolute -bottom-4 -right-4 bg-neon-green text-black w-12 h-12 rounded-2xl flex items-center justify-center border-4 border-[#050505] shadow-[0_0_30px_rgba(57,255,20,0.4)]">
                                <ShieldCheck size={24} />
                            </div>
                        )}
                    </div>
                    <div className="text-center md:text-left pt-4">
                        <h2 className="text-5xl md:text-7xl font-black font-heading mb-4 tracking-tighter uppercase italic leading-[0.9] text-white">
                            {artist.name}
                        </h2>
                        <div className="flex flex-wrap justify-center md:justify-start gap-6 items-center mb-6">
                            <p className="text-neon-blue text-sm uppercase tracking-[0.4em] font-black flex items-center gap-3"><MapPin size={16} /> {artist.city}</p>
                        </div>
                        <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                            <span className="text-[10px] px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-gray-300 font-black uppercase tracking-widest">{artist.category}</span>
                            <span className="text-[10px] px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-gray-300 font-black uppercase tracking-widest">{artist.experienceYears}Y EXP</span>
                            <span className="text-[10px] px-4 py-2 bg-neon-blue/10 border border-neon-blue/30 rounded-xl text-neon-blue font-black uppercase tracking-widest flex items-center gap-2">
                                <Zap size={12} /> ₹{Number(artist.basePrice).toLocaleString()}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-16 mb-16">
                    <div className="space-y-12">
                        <div>
                            <h3 className="text-[11px] font-black text-neon-blue uppercase tracking-[0.5em] mb-8 flex items-center gap-4">
                                <div className="w-12 h-px bg-neon-blue/30" /> ARTIST BIO
                            </h3>
                            <p className="text-gray-300 leading-relaxed italic text-lg bg-white/5 p-8 rounded-3xl border border-white/5 shadow-inner">"{artist.bio}"</p>
                        </div>
                        
                        {artist.youtube && artist.youtube.includes('watch?v=') && (
                            <div className="space-y-6">
                                <h3 className="text-[11px] font-black text-red-500 uppercase tracking-[0.5em] flex items-center gap-4">
                                    <div className="w-12 h-px bg-red-500/30" /> PERFORMANCE REEL
                                </h3>
                                <div className="aspect-video bg-black rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
                                    <iframe 
                                        width="100%" height="100%" 
                                        src={`https://www.youtube.com/embed/${artist.youtube.split('v=')[1].split('&')[0]}`}
                                        title="YouTube video player" frameBorder="0" 
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                        allowFullScreen
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="space-y-12">
                        <div>
                            <h3 className="text-[11px] font-black text-gray-500 uppercase tracking-[0.5em] mb-8 flex items-center gap-4">
                                <div className="w-12 h-px bg-white/10" /> SECURE CONTACT
                            </h3>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-6 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center border border-white/10"><Mail className="text-gray-400" size={16} /></div>
                                        <span className="text-sm font-black text-white tracking-wide">{artist.email || 'artist@example.com'}</span>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between p-6 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center border border-white/10"><Phone className="text-gray-400" size={16} /></div>
                                        <span className="text-sm font-black text-white tracking-widest">{artist.phone || 'N/A'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div>
                            <h3 className="text-[11px] font-black text-gray-500 uppercase tracking-[0.5em] mb-8 flex items-center gap-4">
                                <div className="w-12 h-px bg-white/10" /> SOCIAL REACH
                            </h3>
                            <div className="space-y-4">
                                {artist.instagram && (
                                    <a href={`https://instagram.com/${artist.instagram.replace('@','')}`} target="_blank" className="flex items-center justify-between p-6 bg-zinc-900 border border-white/10 rounded-2xl hover:border-neon-pink/50 transition-all group shadow-xl">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-yellow-400 via-neon-pink to-purple-600 flex items-center justify-center"><Instagram className="text-white" size={18} /></div>
                                            <span className="text-sm font-black text-white">{artist.instagram}</span>
                                        </div>
                                        <ExternalLink size={16} className="text-gray-600 group-hover:text-white" />
                                    </a>
                                )}
                                {artist.youtube && (
                                    <a href={artist.youtube} target="_blank" className="flex items-center justify-between p-6 bg-zinc-900 border border-white/10 rounded-2xl hover:border-red-500/50 transition-all group shadow-xl">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center"><Youtube className="text-white" size={18} /></div>
                                            <span className="text-sm font-black text-white">YouTube Channel</span>
                                        </div>
                                        <ExternalLink size={16} className="text-gray-600 group-hover:text-white" />
                                    </a>
                                )}
                                <Button 
                                    onClick={() => window.open(artist.portfolioLink, '_blank')}
                                    className="w-full h-18 bg-white text-black font-black uppercase tracking-widest text-[11px] rounded-[2rem] mt-4 hover:scale-[1.02] transition-transform shadow-[0_10px_30px_rgba(255,255,255,0.2)]"
                                >
                                    <Video size={18} className="mr-2" /> ACCESS FULL PORTFOLIO
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="shrink-0 pt-8 border-t border-white/10 mt-auto relative z-20">
                <div className="bg-black border border-white/10 p-4 rounded-[2.5rem] flex flex-col sm:flex-row gap-4 shadow-[0_-20px_50px_rgba(0,0,0,0.5)]">
                    <div className="flex-1 flex gap-3">
                        {artist.profileStatus !== 'approved' && (
                            <Button onClick={() => onUpdateStatus(artist.id, 'approved')} className="flex-1 h-16 bg-neon-green text-black font-black tracking-widest rounded-2xl shadow-[0_0_30px_rgba(57,255,20,0.2)]">VERIFY TALENT</Button>
                        )}
                        {artist.profileStatus !== 'rejected' && (
                            <Button onClick={() => onUpdateStatus(artist.id, 'rejected')} className="flex-1 h-16 bg-zinc-900 border border-white/10 text-yellow-500 rounded-2xl hover:bg-white/5">REJECT</Button>
                        )}
                        <button onClick={() => onDelete(artist.id)} className="h-16 w-16 bg-red-600/10 border border-red-600/20 rounded-2xl flex items-center justify-center text-red-500 hover:bg-red-600 hover:text-white transition-all"><Trash2 size={24} /></button>
                    </div>
                </div>
            </div>
        </motion.div>
    </div>
);

const CastingBoardModal = ({ upcomingEvents, artists, onClose, onCast }) => {
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [castingSearch, setCastingSearch] = useState('');

    const matchingArtists = artists.filter(a => 
        a.profileStatus === 'approved' &&
        (selectedEvent ? (a.city === selectedEvent.location || selectedEvent.location === 'Online') : true) &&
        (a.name.toLowerCase().includes(castingSearch.toLowerCase()) || a.category.toLowerCase().includes(castingSearch.toLowerCase()))
    );

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/98 backdrop-blur-2xl" onClick={onClose} />
            <motion.div 
                initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                className="relative bg-zinc-900/50 border border-white/10 rounded-[3rem] w-full max-w-[1400px] h-[90vh] overflow-hidden flex flex-col shadow-[0_50px_100px_rgba(0,0,0,0.8)]"
            >
                {/* Header */}
                <div className="px-12 py-8 border-b border-white/10 flex items-center justify-between shrink-0 bg-black/40 backdrop-blur-md">
                    <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-gradient-to-br from-neon-blue to-neon-pink rounded-2xl flex items-center justify-center text-white shadow-[0_0_30px_rgba(46,191,255,0.3)]">
                            <Target size={30} />
                        </div>
                        <div>
                            <h2 className="text-4xl font-black font-heading uppercase italic tracking-tighter text-white">GIG <span className="text-neon-blue">CASTING.</span></h2>
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-1">Assign Verified Talent to Active Missions</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white hover:text-black transition-all group"><X size={24} className="group-hover:rotate-90 transition-transform" /></button>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* Event Sidebar */}
                    <div className="w-[400px] border-r border-white/10 overflow-y-auto custom-scrollbar p-8 bg-black/20">
                        <div className="flex items-center gap-3 mb-8">
                            <Calendar size={16} className="text-neon-pink" />
                            <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Select Mission</p>
                        </div>
                        
                        <div className="space-y-4">
                            {upcomingEvents.map(event => (
                                <div 
                                    key={event.id} 
                                    onClick={() => setSelectedEvent(event)}
                                    className={cn(
                                        "p-6 rounded-[2rem] border cursor-pointer transition-all duration-300 relative overflow-hidden group",
                                        selectedEvent?.id === event.id ? "bg-neon-blue text-black border-neon-blue shadow-[0_10px_30px_rgba(46,191,255,0.2)]" : "bg-white/5 border-white/5 hover:border-white/20 text-white hover:bg-white/10"
                                    )}
                                >
                                    {selectedEvent?.id === event.id && <div className="absolute top-0 right-0 w-24 h-24 bg-white/20 blur-2xl rounded-full" />}
                                    <p className="font-black uppercase italic text-lg mb-3 relative z-10">{event.title}</p>
                                    <div className="flex items-center gap-3 opacity-80 text-[10px] font-black uppercase tracking-widest relative z-10">
                                        <MapPin size={12} /> {event.location}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Talent Search & Casting */}
                    <div className="flex-1 flex flex-col overflow-hidden bg-zinc-900/10">
                        {selectedEvent ? (
                            <>
                                <div className="p-8 border-b border-white/10 bg-black/20">
                                    <div className="relative max-w-2xl">
                                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                                        <input
                                            type="text"
                                            placeholder="SEARCH COMPATIBLE TALENT..."
                                            value={castingSearch}
                                            onChange={(e) => setCastingSearch(e.target.value)}
                                            className="w-full h-16 pl-16 pr-6 bg-black border border-white/10 rounded-2xl text-sm font-black uppercase tracking-widest focus:border-neon-blue/50 outline-none transition-all placeholder:text-gray-700"
                                        />
                                    </div>
                                    <p className="text-[10px] text-gray-500 uppercase tracking-widest font-black mt-6">
                                        Showing verified talent in <span className="text-neon-blue">{selectedEvent.location}</span>
                                    </p>
                                </div>

                                <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
                                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                                        {matchingArtists.map(artist => {
                                            const isAlreadyCast = artist.gigCasting && artist.gigCasting[selectedEvent.id];
                                            
                                            return (
                                                <div key={artist.id} className={cn("p-6 rounded-[2rem] border transition-all flex flex-col", isAlreadyCast ? "bg-neon-green/5 border-neon-green/20" : "bg-white/5 border-white/5")}>
                                                    <div className="flex items-start justify-between mb-6">
                                                        <div className="w-12 h-12 bg-black rounded-xl border border-white/10 flex items-center justify-center font-black text-white">{artist.name.charAt(0)}</div>
                                                        {isAlreadyCast && <span className="text-[9px] font-black text-neon-green uppercase tracking-widest bg-neon-green/10 px-3 py-1 rounded-lg border border-neon-green/20 flex items-center gap-1"><Check size={10} /> CASTED</span>}
                                                    </div>
                                                    <h4 className="font-black uppercase italic text-lg mb-1 tracking-tight">{artist.name}</h4>
                                                    <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-6">{artist.category}</p>
                                                    
                                                    <div className="mt-auto pt-6 border-t border-white/5">
                                                        <Button 
                                                            disabled={isAlreadyCast}
                                                            onClick={() => onCast(artist.id, selectedEvent.id)}
                                                            className={cn("w-full h-12 text-[10px] font-black tracking-[0.2em] uppercase rounded-xl", isAlreadyCast ? "bg-white/5 text-gray-500" : "bg-white text-black hover:bg-neon-blue hover:text-white hover:scale-[1.02] transition-transform")}
                                                        >
                                                            {isAlreadyCast ? 'ASSIGNED TO MISSION' : 'ASSIGN TO MISSION'}
                                                        </Button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    {matchingArtists.length === 0 && (
                                        <div className="text-center py-20">
                                            <Target size={48} className="text-gray-700 mx-auto mb-6" />
                                            <p className="text-lg font-black text-gray-500 uppercase tracking-widest">No matching talent found</p>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-black/20">
                                <div className="w-32 h-32 bg-white/5 rounded-full flex items-center justify-center mb-8 border border-white/10">
                                    <Calendar size={40} className="text-gray-600" />
                                </div>
                                <h3 className="text-3xl font-black uppercase tracking-tighter text-gray-400 italic mb-4">AWAITING MISSION SELECTION</h3>
                                <p className="text-sm font-black text-gray-600 tracking-widest uppercase max-w-md">Select an upcoming mission from the left panel to begin assigning verified talent.</p>
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default ArtistManager;
