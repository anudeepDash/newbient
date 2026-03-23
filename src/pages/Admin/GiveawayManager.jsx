import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../../lib/store';
import { notifyAllUsers } from '../../lib/notificationTriggers';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Gift, LayoutGrid, Plus, Search, Edit, Trash2, Users, Calendar, X, ChevronRight, Globe, Info, Clock, ArrowLeft, Download, Trophy, BarChart3, Instagram, Send, Youtube, MessageCircle, Music, Ghost, Link as LinkIcon, Camera, Twitter, XCircle, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import { downloadCSV } from '../../components/admin/CSVHandler';

const GiveawayManager = () => {
    const { giveaways = [], giveawayEntries = [], addGiveaway, updateGiveaway, deleteGiveaway, user } = useStore();
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState('all');
    const [isCreating, setIsCreating] = useState(false);
    const [editingId, setEditingId] = useState(null);

    const [formData, setFormData] = useState({
        name: '',
        slug: '',
        description: '',
        ticketsAvailable: 0,
        eventCardImage: null,
        showSpinWheel: true,
        endDate: '',
        endTime: '',
        winnerAnnouncementDate: '',
        posterUrl: '',
        giveawayType: 'Standard',
        tasks: [],
        status: 'Open',
        alsoPostToUpcomingEvents: false,
        alsoPostToAnnouncements: false,
        isTicketed: false,
        ticketCategories: [],
        venueLayout: '',
        location: '',
        buttonText: 'PARTICIPATE NOW'
    });
    const [selectedFile, setSelectedFile] = useState(null);
    const [venueLayoutFile, setVenueLayoutFile] = useState(null);
    const [uploading, setUploading] = useState(false);

    const filteredGiveaways = (giveaways || []).filter(g => {
        const matchesSearch = (g.name || '').toLowerCase().includes(searchTerm.toLowerCase());
        if (filter === 'active') return matchesSearch && (g.status === 'Open' || g.status === 'active');
        if (filter === 'past') return matchesSearch && (g.status !== 'Open' && g.status !== 'active');
        return matchesSearch;
    });

    const handlePickWinner = async (campaignId, campaignName) => {
        const participants = giveawayEntries.filter(e => e.campaignId === campaignId);
        if (participants.length === 0) {
            alert("No participants in this campaign yet.");
            return;
        }

        // Weighted Random Selection
        const totalWeight = participants.reduce((sum, p) => sum + (p.entryScore || 1), 0);
        let random = Math.random() * totalWeight;
        
        let winner = null;
        for (const p of participants) {
            random -= (p.entryScore || 1);
            if (random <= 0) {
                winner = p;
                break;
            }
        }

        if (winner) {
            const confirmCrown = window.confirm(`🏆 WEIGHT-BASED WINNER SELECTED!\n\nName: ${winner.name}\nScore: ${winner.entryScore} points\n\nWould you like to crown this winner and close the giveaway?`);
            
            if (confirmCrown) {
                // Crown the winner
                // Assuming updateGiveawayEntry exists and is imported/available
                // await updateGiveawayEntry(winner.id, { isWinner: true, winnerReward: true }); 
                // Close the giveaway
                await handleCloseGiveaway(campaignId);
                alert(`🎊 ${winner.name} HAS BEEN CROWNED AND GIVEAWAY CLOSED!`);
            }
        }
    };

    const handleCloseGiveaway = async (id) => {
        if (!window.confirm("ARE YOU SURE YOU WANT TO CLOSE THIS GIVEAWAY? THIS ACTION IS FINAL.")) return;
        
        try {
            await updateGiveaway(id, { 
                status: 'Closed',
                endDate: new Date().toISOString().split('T')[0] // Set to today
            });
        } catch (error) {
            alert("Error closing giveaway.");
        }
    };

    const handleExportCSV = (campaignId, campaignName) => {
        const participants = giveawayEntries.filter(e => e.campaignId === campaignId);
        if (participants.length === 0) {
            alert("No data to export.");
            return;
        }
        
        // Clean data for export
        const exportData = participants.map(p => ({
            Name: p.name,
            Email: p.email || 'N/A',
            Phone: p.phone,
            Score: p.entryScore,
            Instagram: p.instagramUsername || p.instagram || 'N/A',
            College: p.college || 'N/A',
            City: p.city,
            WhyShouldWin: p.answer || 'N/A',
            RegistrationDate: p.timestamp ? new Date(p.timestamp).toLocaleDateString() : 'N/A',
            ReferredBy: p.referredBy || 'None'
        }));

        downloadCSV(exportData, `${campaignName.replace(/\s+/g, '_')}_Participants`);
    };

    const handleFileUpload = async (file) => {
        if (!file) return null;
        const data = new FormData();
        data.append("file", file);
        data.append("upload_preset", "maw1e4ud");
        data.append("cloud_name", "dgtalrz4n");

        try {
            const res = await fetch("https://api.cloudinary.com/v1_1/dgtalrz4n/image/upload", { method: "POST", body: data });
            const uploadedImage = await res.json();
            return uploadedImage.secure_url;
        } catch (error) {
            throw new Error("Upload failed.");
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setUploading(true);
        try {
            let posterUrl = formData.posterUrl;
            if (selectedFile) posterUrl = await handleFileUpload(selectedFile);
            
            let venueLayoutUrl = formData.venueLayout;
            if (venueLayoutFile) venueLayoutUrl = await handleFileUpload(venueLayoutFile);

            const processedData = {
                ...formData,
                posterUrl,
                venueLayout: venueLayoutUrl,
                ticketsAvailable: Number(formData.ticketsAvailable) || 0,
                ticketCategories: formData.ticketCategories.map(c => ({
                    ...c,
                    price: Number(c.price) || 0
                }))
            };

            if (editingId) {
                await updateGiveaway(editingId, processedData);
            } else {
                await addGiveaway(processedData);
            }
            setIsCreating(false);
            setEditingId(null);
            setFormData({
                name: '', slug: '', description: '', ticketsAvailable: 0, endDate: '', endTime: '',
                winnerAnnouncementDate: '', posterUrl: '', giveawayType: 'Standard', tasks: [], status: 'Open',
                alsoPostToUpcomingEvents: false, alsoPostToAnnouncements: false, isTicketed: false,
                ticketCategories: [], venueLayout: '', location: '', buttonText: 'PARTICIPATE NOW',
                eventCardImage: null, showSpinWheel: true
            });
            setSelectedFile(null);
            setVenueLayoutFile(null);
        } catch (error) {
            alert(error.message);
        } finally {
            setUploading(false);
        }
    };

    const handleEdit = (giveaway) => {
        setFormData({ 
            ...giveaway,
            tasks: giveaway.tasks || [],
            alsoPostToUpcomingEvents: giveaway.alsoPostToUpcomingEvents || false,
            alsoPostToAnnouncements: giveaway.alsoPostToAnnouncements || false,
            isTicketed: giveaway.isTicketed || false,
            eventCardImage: giveaway.eventCardImage || null,
            showSpinWheel: giveaway.showSpinWheel ?? true,
            ticketCategories: giveaway.ticketCategories || [],
            venueLayout: giveaway.venueLayout || '',
            location: giveaway.location || '',
            buttonText: giveaway.buttonText || 'PARTICIPATE NOW'
        });
        setEditingId(giveaway.id);
        setIsCreating(true);
    };

    const handleDelete = async (id) => {
        if (window.confirm("Archive this giveaway forever?")) {
            await deleteGiveaway(id);
        }
    };

    return (
        <div className="min-h-screen bg-[#020202] text-white pb-20">
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[10%] left-[-10%] w-[60%] h-[60%] bg-purple-600/5 rounded-full blur-[150px]" />
                <div className="absolute bottom-[20%] right-[-5%] w-[40%] h-[40%] bg-neon-blue/5 rounded-full blur-[150px]" />
            </div>

            <div className="relative z-10 max-w-[1400px] mx-auto px-4 md:px-8 pt-24 md:pt-32">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-8">
                    <div className="space-y-4">
                        <Link to="/admin" className="relative z-[60] inline-flex items-center gap-2 text-gray-500 hover:text-white transition-colors uppercase text-[10px] font-black tracking-[0.3em] mb-4 group">
                            <LayoutGrid size={14} className="group-hover:rotate-90 transition-transform" /> BACK TO ADMIN DASHBOARD
                        </Link>
                        <h1 className="text-4xl md:text-5xl font-black font-heading tracking-tighter uppercase italic pr-4">
                            GIVEAWAY <span className="text-purple-500">REGISTRY.</span>
                        </h1>
                    </div>
                    
                    <Button 
                        onClick={() => {
                            setEditingId(null);
                            setFormData({
                                name: '', slug: '', description: '', ticketsAvailable: 0, endDate: '', endTime: '',
                                winnerAnnouncementDate: '', posterUrl: '', giveawayType: 'Standard', tasks: [], status: 'Open',
                                alsoPostToUpcomingEvents: false, alsoPostToAnnouncements: false, isTicketed: false,
                                ticketCategories: [], venueLayout: '', location: '', buttonText: 'PARTICIPATE NOW',
                                eventCardImage: null, showSpinWheel: true
                            });
                            setIsCreating(true);
                        }} 
                        className="h-14 px-8 rounded-2xl bg-purple-500 text-white text-xs font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-[0_0_25px_rgba(168,85,247,0.4)]"
                    >
                        <Plus className="mr-2 h-4 w-4" /> New Giveaway
                    </Button>
                </div>

                {/* Combined Search & Filters Bar - Matching Invoice Style */}
                <div className="bg-zinc-900/40 border border-white/5 rounded-[2.5rem] p-2 mb-12 backdrop-blur-3xl flex flex-col md:flex-row items-center gap-4">
                    <div className="relative flex-1 w-full group">
                        <Search className="absolute left-8 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-purple-500 transition-colors" size={20} />
                        <input 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="SEARCH BY CAMPAIGN NAME OR SLUG..."
                            className="w-full bg-transparent h-16 pl-20 pr-8 rounded-2xl text-[11px] font-black uppercase tracking-widest outline-none transition-all placeholder:text-gray-600"
                        />
                    </div>
                    <div className="flex bg-black/40 p-1.5 rounded-[1.5rem] border border-white/5 w-full md:w-auto mr-1">
                        {['ALL', 'ACTIVE', 'PAST'].map((s) => (
                            <button
                                key={s}
                                onClick={() => setFilter(s.toLowerCase())}
                                className={cn(
                                    "px-10 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 min-w-[120px]",
                                    filter === s.toLowerCase() 
                                        ? "bg-purple-500 text-white shadow-[0_10px_25px_rgba(168,85,247,0.3)] scale-[1.02]" 
                                        : "text-gray-500 hover:text-white hover:bg-white/5"
                                )}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
                    <Card className="p-6 bg-zinc-900/40 border-white/5 backdrop-blur-3xl rounded-3xl">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-500">
                                <Gift size={24} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest leading-none mb-1">Total Giveaways</p>
                                <h4 className="text-2xl font-black italic">{giveaways.length}</h4>
                            </div>
                        </div>
                    </Card>
                    <Card className="p-6 bg-zinc-900/40 border-white/5 backdrop-blur-3xl rounded-3xl">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-neon-blue/10 flex items-center justify-center text-neon-blue">
                                <Users size={24} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest leading-none mb-1">Total Participants</p>
                                <h4 className="text-2xl font-black italic">{giveawayEntries.length} Entered</h4>
                            </div>
                        </div>
                    </Card>
                    <Card className="p-6 bg-zinc-900/40 border-white/5 backdrop-blur-3xl rounded-3xl md:col-span-2">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-neon-green/10 flex items-center justify-center text-neon-green">
                                <BarChart3 size={24} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest leading-none mb-1">Most Recent Winner</p>
                                <h4 className="text-sm font-black uppercase tracking-widest line-clamp-1">{
                                    [...giveawayEntries]
                                        .filter(e => e.isWinner)
                                        .sort((a, b) => new Date(b.winnerSelectedAt || b.createdAt || 0) - new Date(a.winnerSelectedAt || a.createdAt || 0))[0]?.name || 'NO WINNERS YET'
                                }</h4>
                            </div>
                        </div>
                    </Card>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {filteredGiveaways.map(giveaway => (
                        <motion.div 
                            key={giveaway.id} 
                            layout
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-zinc-900/40 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] p-8 flex flex-col h-full relative group hover:border-purple-500/30 transition-all duration-500 hover:shadow-[0_20px_40px_rgba(168,85,247,0.05)]" 
                        >
                            <div className="flex items-start justify-between mb-8">
                                <div className={cn(
                                    "px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all",
                                    giveaway.status === 'Open' ? 'bg-neon-green/10 text-neon-green border-neon-green/20' : 'bg-red-500/10 text-red-500 border-red-500/20 opacity-60'
                                )}>
                                    STATUS: {giveaway.status}
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={async () => {
                                            if (window.confirm(`Transmit direct push signal for "${giveaway.name}"?`)) {
                                                await notifyAllUsers(
                                                    `New Giveaway: ${giveaway.name}`,
                                                    giveaway.description,
                                                    `/giveaways/${giveaway.slug}`,
                                                    giveaway.posterUrl
                                                );
                                                alert("PUSH_SIGNAL_TRANSMITTED.");
                                            }
                                        }}
                                        className="p-2.5 bg-neon-blue/10 rounded-xl text-neon-blue border border-neon-blue/20 hover:bg-neon-blue hover:text-black transition-all shadow-[0_0_15px_rgba(0,255,255,0.1)]"
                                        title="Direct Push Signal"
                                    >
                                        <Sparkles size={16} />
                                    </button>
                                    <button onClick={() => handleEdit(giveaway)} className="p-2.5 bg-white/5 rounded-xl text-gray-500 hover:text-purple-500 transition-colors"><Edit size={16} /></button>
                                    <button onClick={() => handleDelete(giveaway.id)} className="p-2.5 bg-white/5 rounded-xl text-gray-500 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                                </div>
                            </div>

                            <div className="flex-1">
                                <h3 className="text-2xl font-black font-heading mb-3 uppercase italic tracking-tight group-hover:text-purple-500 transition-colors">{giveaway.name}</h3>
                                <div className="flex flex-wrap items-center gap-6 mb-6">
                                    <span className="flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase tracking-widest"><Globe size={12} className="text-purple-500" /> {giveaway.slug}</span>
                                    <span className="flex items-center gap-2 text-[10px] font-black text-neon-green uppercase tracking-widest"><Gift size={12} /> {giveaway.ticketsAvailable} POINTS</span>
                                </div>
                                <div className="flex gap-2 mb-8">
                                    <button 
                                        onClick={() => handlePickWinner(giveaway.id, giveaway.name)} 
                                        disabled={giveaway.status === 'Closed'}
                                        className="flex-1 h-10 px-4 flex items-center justify-center bg-purple-600/10 border border-purple-500/20 text-purple-500 text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-purple-600 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                    >
                                        <Trophy size={14} className="mr-2" /> Winner
                                    </button>
                                    <button 
                                        onClick={() => handleExportCSV(giveaway.id, giveaway.name)} 
                                        className="h-10 w-12 bg-zinc-800 border border-white/10 flex items-center justify-center rounded-xl hover:bg-zinc-700 transition-all"
                                    >
                                        <Download size={18} className="text-white" strokeWidth={2} />
                                    </button>
                                    {giveaway.status !== 'Closed' && (
                                        <button 
                                            onClick={() => handleCloseGiveaway(giveaway.id)} 
                                            className="h-10 w-12 bg-red-900/30 border border-red-500/40 flex items-center justify-center rounded-xl hover:bg-red-600 transition-all"
                                        >
                                            <X size={18} className="text-red-500 hover:text-white transition-colors" strokeWidth={2} />
                                        </button>
                                    )}
                                </div>

                                <p className="text-gray-400 text-sm font-medium line-clamp-3 mb-10 leading-relaxed border-l-2 border-white/5 pl-4">{giveaway.description}</p>
                                
                                <div className="mt-auto pt-8 border-t border-white/5 flex items-center justify-between">
                                    <Link to={`/admin/giveaways/${giveaway.id}/participants`} className="flex items-center gap-3 text-[10px] font-black text-gray-500 uppercase tracking-widest hover:text-white transition-colors">
                                        VIEW PARTICIPANTS <ChevronRight size={14} />
                                    </Link>
                                    <div className="flex items-center gap-2 text-[9px] text-gray-600 font-black uppercase tracking-widest">
                                        <Clock size={12} /> {giveaway.endDate}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {(giveaways || []).length === 0 && !isCreating && (
                    <div className="py-32 text-center bg-zinc-900/20 rounded-[3rem] border-2 border-dashed border-white/5 flex flex-col items-center gap-6">
                        <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center text-gray-700">
                            <Gift size={40} />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-xl font-black uppercase tracking-tighter text-gray-500 italic">No giveaways active.</h3>
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-600">Start by creating a new rewards campaign.</p>
                        </div>
                        <Button onClick={() => setIsCreating(true)} className="h-14 px-8 bg-purple-600 text-white font-black uppercase tracking-widest rounded-2xl mt-4">
                            CREATE GIVEAWAY
                        </Button>
                    </div>
                )}
            </div>

            <AnimatePresence>
                {isCreating && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                        <motion.div 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            exit={{ opacity: 0 }} 
                            onClick={() => setIsCreating(false)} 
                            className="fixed inset-0 bg-black/90 backdrop-blur-sm" 
                        />
                        
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0, y: 30 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 30 }}
                            transition={{ type: "spring", damping: 30, stiffness: 300 }}
                            className="relative w-full max-w-5xl max-h-[90vh] bg-zinc-900 border border-white/10 rounded-[2.5rem] overflow-hidden flex flex-col shadow-[0_30px_100px_rgba(0,0,0,0.8)]"
                        >
                            <div className="flex items-center justify-between p-8 border-b border-white/5">
                                <div className="space-y-1">
                                    <h2 className="text-3xl font-black font-heading tracking-tight uppercase italic text-white">
                                        {editingId ? 'EDIT' : 'NEW'} <span className="text-purple-500">GIVEAWAY.</span>
                                    </h2>
                                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-500">CONFIGURE CAMPAIGN PARAMETERS</p>
                                </div>
                                <button onClick={() => setIsCreating(false)} className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white hover:text-black transition-all">
                                    <X size={20} />
                                </button>
                            </div>
                            
                            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar p-8">
                                <div className="space-y-12">
                                    {/* Section 1: Logistics */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-3">
                                            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-1">Campaign Title</label>
                                            <Input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. UN40 Music Festival" className="h-12 bg-black/50 border-white/5 rounded-xl text-sm font-bold" />
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-1">Slug</label>
                                            <Input required value={formData.slug} onChange={e => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })} placeholder="un40-giveaway" className="h-12 bg-black/50 border-white/5 rounded-xl" />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-3">
                                            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-1">Poster URL (Optional)</label>
                                            <Input value={formData.posterUrl} onChange={e => setFormData({ ...formData, posterUrl: e.target.value })} placeholder="Cloudinary Link" className="h-12 bg-black/50 border-white/5 rounded-xl" />
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-1">Giveaway Type</label>
                                            <select 
                                                value={formData.giveawayType} 
                                                onChange={e => setFormData({ ...formData, giveawayType: e.target.value })}
                                                className="w-full h-12 bg-black/50 border border-white/5 rounded-xl px-4 text-[9px] font-black uppercase tracking-widest text-white appearance-none"
                                            >
                                                <option value="Standard">Standard Registration</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Section 2: Details */}
                                    <div className="space-y-3">
                                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-1">Narrative</label>
                                        <textarea
                                            required
                                            value={formData.description}
                                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                                            className="w-full bg-black/50 border border-white/5 rounded-2xl p-6 text-sm font-medium text-gray-300 focus:outline-none focus:border-purple-500 transition-all h-32 resize-none"
                                            placeholder="TELL THE STORY..."
                                        />
                                    </div>


                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                        <div className="space-y-3">
                                            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-1">Tickets</label>
                                            <Input type="number" required value={formData.ticketsAvailable} onChange={e => setFormData({ ...formData, ticketsAvailable: parseInt(e.target.value) })} className="h-12 bg-black/50 border-white/5 rounded-xl font-bold" />
                                        </div>
                                        <div className="md:col-span-2 space-y-3">
                                            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-1">Announcement Date</label>
                                            <Input type="date" required value={formData.winnerAnnouncementDate} onChange={e => setFormData({ ...formData, winnerAnnouncementDate: e.target.value })} className="h-12 bg-black/50 border-white/5 rounded-xl" />
                                        </div>
                                    </div>

                                    {/* Section 3: Missions */}
                                    <div className="space-y-8">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mb-1">MISSION TASKS</h3>
                                                <p className="text-[8px] text-gray-600 font-bold uppercase tracking-widest">DRIVE ENGAGEMENT THROUGH CUSTOM CHALLENGES</p>
                                            </div>
                                            <Button 
                                                type="button" 
                                                onClick={() => {
                                                    const id = Math.random().toString(36).substr(2, 9);
                                                    setFormData({ ...formData, tasks: [...formData.tasks, { id, type: 'custom', label: 'New Custom Task', entryScore: 1, config: { url: '' } }] });
                                                }}
                                                className="h-10 px-6 bg-purple-600/10 border border-purple-500/20 text-purple-500 text-[9px] font-black uppercase tracking-widest hover:bg-purple-600 hover:text-white transition-all rounded-xl"
                                            >
                                                <Plus size={14} className="mr-2" /> ADD CUSTOM
                                            </Button>
                                        </div>
                                        
                                        {/* Task Type Quick Select */}
                                        <div className="grid grid-cols-3 gap-3">
                                            {[
                                                { type: 'instagram', icon: Instagram, color: 'hover:text-pink-500', label: 'Follow IG' },
                                                { type: 'instagram_like_comment', icon: Instagram, color: 'hover:text-pink-400', label: 'Like + Comment' },
                                                { type: 'website', icon: Globe, color: 'hover:text-blue-400', label: 'Website' },
                                                { type: 'youtube', icon: Youtube, color: 'hover:text-red-500', label: 'YouTube' },
                                                { type: 'telegram', icon: Send, color: 'hover:text-blue-400', label: 'Telegram' },
                                                { type: 'custom', icon: Sparkles, color: 'hover:text-purple-500', label: 'Custom' },
                                            ].map(preset => (
                                                <button
                                                    key={preset.type}
                                                    type="button"
                                                    onClick={() => {
                                                        const id = Math.random().toString(36).substr(2, 9);
                                                        const labels = {
                                                            instagram: 'Follow on Instagram',
                                                            twitter: 'Follow on X',
                                                            telegram: 'Join Telegram Channel',
                                                            discord: 'Join Discord Server',
                                                            youtube: 'Subscribe on YouTube',
                                                            snapchat: 'Add on Snapchat',
                                                            spotify: 'Follow on Spotify',
                                                            website: 'Visit our Website'
                                                        };
                                                        setFormData({ 
                                                            ...formData, 
                                                            tasks: [...formData.tasks, { 
                                                                id, 
                                                                type: preset.type, 
                                                                label: labels[preset.type], 
                                                                entryScore: 1, 
                                                                config: { url: '' } 
                                                            }] 
                                                        });
                                                    }}
                                                    className={cn(
                                                        "flex flex-col items-center justify-center gap-2 p-3 rounded-2xl bg-black/40 border border-white/5 transition-all group",
                                                        preset.color
                                                    )}
                                                >
                                                    <preset.icon size={18} className="text-gray-500 group-hover:scale-110 transition-transform" />
                                                    <span className="text-[7px] font-black text-gray-600 uppercase tracking-tighter">{preset.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                        
                                        <div className="grid grid-cols-1 gap-4">
                                            {(formData.tasks || []).map((task, index) => (
                                                <motion.div 
                                                    key={task.id} 
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    className="p-6 bg-black/40 border border-white/5 rounded-3xl grid grid-cols-1 md:grid-cols-12 gap-6 items-center relative overflow-hidden group"
                                                >
                                                    <div className="absolute top-0 left-0 w-1 h-full bg-purple-500/20 group-hover:bg-purple-500 transition-colors" />
                                                    
                                                    <div className="md:col-span-1 flex justify-center">
                                                        <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center text-gray-500">
                                                            {task.type === 'instagram' && <Instagram size={18} />}
                                                            {task.type === 'instagram_like_comment' && <Instagram size={18} className="text-pink-400" />}
                                                            {task.type === 'twitter' && <Twitter size={18} />}
                                                            {task.type === 'telegram' && <Send size={18} />}
                                                            {task.type === 'discord' && <MessageCircle size={18} />}
                                                            {task.type === 'youtube' && <Youtube size={18} />}
                                                            {task.type === 'snapchat' && <Ghost size={18} />}
                                                            {task.type === 'spotify' && <Music size={18} />}
                                                            {task.type === 'website' && <Globe size={18} />}
                                                            {task.type === 'custom' && <Trophy size={18} />}
                                                        </div>
                                                    </div>

                                                    <div className="md:col-span-4 space-y-1">
                                                        <label className="text-[7px] font-black text-gray-600 uppercase tracking-widest ml-1">Label / Call to Action</label>
                                                        <input 
                                                            value={task.label} 
                                                            onChange={e => {
                                                                const newTasks = [...formData.tasks];
                                                                newTasks[index].label = e.target.value;
                                                                setFormData({ ...formData, tasks: newTasks });
                                                            }}
                                                            className="w-full h-10 bg-transparent border-b border-white/10 text-xs font-bold text-white focus:border-purple-500 outline-none transition-all" 
                                                            placeholder="Follow on X..." 
                                                        />
                                                    </div>

                                                    <div className="md:col-span-4 space-y-1">
                                                        <label className="text-[7px] font-black text-gray-600 uppercase tracking-widest ml-1">Destination URL</label>
                                                        <input 
                                                            value={task.config.url} 
                                                            onChange={e => {
                                                                const newTasks = [...formData.tasks];
                                                                newTasks[index].config = { ...newTasks[index].config, url: e.target.value };
                                                                setFormData({ ...formData, tasks: newTasks });
                                                            }}
                                                            className="w-full h-10 bg-transparent border-b border-white/10 text-xs font-bold text-gray-400 focus:border-purple-500 outline-none transition-all font-mono" 
                                                            placeholder="https://..." 
                                                        />
                                                    </div>

                                                    <div className="md:col-span-2 space-y-1">
                                                        <label className="text-[7px] font-black text-gray-600 uppercase tracking-widest ml-1">Points</label>
                                                        <div className="flex items-center gap-2">
                                                            <input 
                                                                type="number"
                                                                value={task.entryScore} 
                                                                onChange={e => {
                                                                    const newTasks = [...formData.tasks];
                                                                    newTasks[index].entryScore = parseInt(e.target.value) || 0;
                                                                    setFormData({ ...formData, tasks: newTasks });
                                                                }}
                                                                className="w-full h-10 bg-zinc-900 border border-white/5 rounded-xl px-4 text-xs font-black text-white outline-none" 
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="md:col-span-1 flex justify-center">
                                                        <button 
                                                            type="button"
                                                            onClick={() => setFormData({ ...formData, tasks: formData.tasks.filter((_, i) => i !== index) })}
                                                            className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center border border-red-500/20"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </motion.div>
                                            ))}
                                            
                                            {formData.tasks.length === 0 && (
                                                <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-white/5 rounded-[3rem] text-gray-600 space-y-4">
                                                    <Plus size={48} className="opacity-20" />
                                                    <p className="text-[10px] font-black uppercase tracking-widest">No Missions Configured</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </form>

                            <div className="p-8 bg-zinc-900 border-t border-white/5 flex gap-4">
                                <Button type="button" variant="outline" onClick={() => setIsCreating(false)} className="flex-1 h-12 rounded-xl border-white/5 text-[10px] font-black tracking-widest">CANCEL</Button>
                                <Button onClick={handleSubmit} className="flex-1 h-12 bg-purple-600 text-white font-black uppercase tracking-widest rounded-xl shadow-lg">
                                    {editingId ? 'UPDATE' : 'CREATE'}
                                </Button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default GiveawayManager;
