import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../../lib/store';
import { notifyAllUsers } from '../../lib/notificationTriggers';
import { PREDEFINED_CITIES } from '../../lib/constants';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Users, Search, MapPin, Instagram, Mail, Phone, ExternalLink, CheckCircle2, XCircle, Activity, ArrowLeft, Trash2, Ban, Sparkles, Filter, Globe, Youtube, Zap, X, Clock, LayoutGrid, FileSpreadsheet, Download, FileText, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import AdminDashboardLink from '../../components/admin/AdminDashboardLink';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import StudioSelect from '../../components/ui/StudioSelect';

const CreatorManager = () => {
    const { creators, updateCreator, deleteCreator } = useStore();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCity, setFilterCity] = useState('All');
    const [filterStatus, setFilterStatus] = useState('All');
    const [filterFollowers, setFilterFollowers] = useState('All');
    const [selectedCreator, setSelectedCreator] = useState(null);
    const [viewMode, setViewMode] = useState('table'); 
    const [exportLoading, setExportLoading] = useState(false);

    const cities = ['All', ...new Set([...PREDEFINED_CITIES, ...creators.map(c => c.city)])];

    const filteredCreators = creators.filter(c => {
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

    const handleUpdateStatus = async (uid, newStatus) => {
        try {
            await updateCreator(uid, { profileStatus: newStatus });
            if (selectedCreator && selectedCreator.uid === uid) {
                setSelectedCreator({ ...selectedCreator, profileStatus: newStatus });
            }
        } catch (error) {
            alert("Status sync failed.");
        }
    };

    const handleDeleteCreator = async (uid) => {
        if (window.confirm("Permanently delete this creator profile?")) {
            try {
                await deleteCreator(uid);
                setSelectedCreator(null);
            } catch (error) {
                alert("Deletion failed.");
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

    const exportToPDF = () => {
        const doc = new jsPDF();
        doc.text(`Newbi Creators Registry - ${filterCity}`, 14, 15);
        
        doc.autoTable({
            head: [['Name', 'City', 'Instagram', 'Followers', 'Specializations', 'Status']],
            body: filteredCreators.map(c => [
                c.name,
                c.city,
                c.instagram || '-',
                c.instagramFollowers || '0',
                (c.specializations || c.niches || []).slice(0, 2).join(', '),
                c.profileStatus || 'pending'
            ]),
            startY: 20,
            theme: 'grid',
            headStyles: { fillColor: [46, 255, 144] }, // neon-green
            styles: { fontSize: 8 }
        });

        doc.save(`Newbi_Creators_${filterCity}.pdf`);
    };

    return (
        <div className="min-h-screen bg-[#020202] text-white pb-20">
            {/* Background Atmosphere */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-neon-pink/5 rounded-full blur-[150px]" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-neon-blue/5 rounded-full blur-[150px]" />
            </div>

            <div className="relative z-10 max-w-[1400px] mx-auto px-4 md:px-8 pt-32 md:pt-40">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-16 gap-8 relative z-[100]">
                    <div className="space-y-4">
                        <AdminDashboardLink className="mb-4" />
                        <h1 className="text-2xl md:text-3xl font-black font-heading tracking-tighter uppercase italic text-white flex items-center gap-4">
                            CREATOR <span className="text-neon-pink">MANAGEMENT.</span>
                        </h1>
                        <div className="flex items-center gap-3">
                            <div className="bg-white/5 border border-white/10 px-4 py-1.5 rounded-full backdrop-blur-md">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                                    TOTAL CREATORS: <span className="text-white">{creators.length}</span>
                                </span>
                            </div>
                            {filterCity !== 'All' && (
                                <div className="bg-neon-pink/10 border border-neon-pink/20 px-4 py-1.5 rounded-full backdrop-blur-md animate-in fade-in slide-in-from-left-4 duration-500">
                                    <span className="text-[10px] font-black text-neon-pink uppercase tracking-[0.2em]">
                                        {filterCity}: <span className="text-white">{filteredCreators.length}</span>
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
                        {/* SEARCH ENGINE */}
                        <div className="relative flex-1 max-w-md w-full relative z-[70]">
                            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                            <input
                                type="text"
                                placeholder="SEARCH CREATORS..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full h-16 pl-14 pr-6 bg-zinc-900/40 border border-white/5 rounded-2xl text-[11px] font-black uppercase tracking-widest focus:border-neon-pink/30 outline-none transition-all placeholder:text-gray-700 shadow-inner"
                            />
                        </div>

                        {/* FILTER BAR */}
                        <div className="flex flex-wrap gap-2 p-1.5 bg-zinc-900/40 border border-white/5 rounded-[1.5rem] backdrop-blur-xl">
                            <div className="w-[180px]">
                                <StudioSelect
                                    value={filterCity}
                                    options={cities.map(city => ({ value: city, label: city === 'All' ? 'LOCATION' : city.toUpperCase() }))}
                                    onChange={val => setFilterCity(val)}
                                    className="h-13"
                                    accentColor="neon-pink"
                                />
                            </div>

                            <div className="w-[180px]">
                                <StudioSelect
                                    value={filterFollowers}
                                    options={[
                                        { value: 'All', label: 'REACH (%)' },
                                        { value: '10k+', label: '10K+ REACH' },
                                        { value: '50k+', label: '50K+ REACH' },
                                        { value: '100k+', label: '100K+ REACH' },
                                        { value: '500k+', label: '500K+ REACH' }
                                    ]}
                                    onChange={val => setFilterFollowers(val)}
                                    className="h-13"
                                    accentColor="neon-pink"
                                />
                            </div>

                            <div className="w-[180px]">
                                <StudioSelect
                                    value={filterStatus}
                                    options={[
                                        { value: 'All', label: 'STATUS' },
                                        { value: 'approved', label: 'APPROVED' },
                                        { value: 'pending', label: 'PENDING' },
                                        { value: 'rejected', label: 'REJECTED' }
                                    ]}
                                    onChange={val => setFilterStatus(val)}
                                    className="h-13"
                                    accentColor="neon-pink"
                                />
                            </div>
                        </div>

                        {/* EXPORT TOOLS */}
                        <div className="flex gap-2 p-1.5 bg-black/20 border border-white/5 rounded-[1.5rem]">
                            <button 
                                onClick={exportToCSV}
                                className="h-13 px-6 bg-white/5 border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-neon-green hover:text-black transition-all flex items-center gap-2"
                            >
                                <FileSpreadsheet size={16} /> EXPORT CSV
                            </button>
                            <div className="w-px h-6 bg-white/10 self-center" />
                            <div className="flex bg-zinc-900/50 p-1 rounded-xl">
                                <button onClick={() => setViewMode('grid')} className={cn("p-2 rounded-lg transition-all", viewMode === 'grid' ? "bg-white text-black" : "text-gray-500 hover:text-white")}><LayoutGrid size={16} /></button>
                                <button onClick={() => setViewMode('table')} className={cn("p-2 rounded-lg transition-all", viewMode === 'table' ? "bg-white text-black" : "text-gray-500 hover:text-white")}><Activity size={16} /></button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="relative z-0">
                    {creators.length === 0 ? (
                        <div className="py-32 text-center bg-zinc-900/20 rounded-[3rem] border-2 border-dashed border-white/5 flex flex-col items-center gap-6">
                        <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center text-gray-700">
                            <Users size={40} />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-xl font-black uppercase tracking-tighter text-gray-500 italic">No creators found.</h3>
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-600">No Newbi creator registrations found in the database.</p>
                        </div>
                    </div>
                ) : (
                    <AnimatePresence mode="wait">
                        {viewMode === 'grid' ? (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="flex overflow-x-auto lg:overflow-x-visible md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide snap-x snap-mandatory pb-8 md:pb-0"
                            >
                                {filteredCreators.map((creator, i) => (
                                    <motion.div
                                        key={creator.uid}
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: i * 0.05 }}
                                        className="min-w-[85vw] md:min-w-0 snap-center h-full flex flex-col"
                                    >
                                        {/* Status indicator line */}
                                        <div className={cn(
                                            "absolute top-0 left-0 w-full h-1 transition-all duration-500",
                                            creator.profileStatus === 'approved' ? 'bg-neon-green shadow-[0_0_15px_rgba(57,255,20,0.5)]' : 
                                            creator.profileStatus === 'blocked' ? 'bg-red-600' : 'bg-yellow-500'
                                        )}></div>

                                        <div className="relative z-10 flex flex-col h-full">
                                            <div className="flex items-start justify-between mb-8">
                                                <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-2xl font-black font-heading group-hover:bg-neon-pink group-hover:text-black transition-all duration-500 transform group-hover:rotate-3 shadow-xl">
                                                    {creator.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div className={cn(
                                                    "px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest border backdrop-blur-md",
                                                    creator.profileStatus === 'approved' ? 'bg-neon-green/10 text-neon-green border-neon-green/30' : 
                                                    creator.profileStatus === 'blocked' ? 'bg-red-500/10 text-red-500 border-red-500/30' : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30'
                                                )}>
                                                    {creator.profileStatus || 'PENDING'}
                                                </div>
                                            </div>

                                            <div className="mb-8">
                                                <h3 className="font-black text-xl uppercase tracking-tighter text-white group-hover:text-neon-pink transition-colors leading-none mb-2">{creator.name}</h3>
                                                <p className="text-[9px] font-black text-gray-500 flex items-center gap-2 uppercase tracking-[0.2em]">
                                                    <MapPin size={12} className="text-neon-pink" /> {creator.city}
                                                </p>
                                            </div>

                                            <div className="flex flex-wrap gap-2 mb-8 items-center min-h-[3rem]">
                                                {(creator.specializations || creator.niches || []).slice(0, 3).map((n, i) => (
                                                    <span key={i} className="text-[8px] px-3 py-1.5 bg-white/5 border border-white/5 rounded-xl text-gray-400 font-black uppercase tracking-widest group-hover:border-white/20 transition-all">{n}</span>
                                                ))}
                                            </div>

                                            <div className="mt-auto pt-8 border-t border-white/5 flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest mb-0.5">Reach</span>
                                                        <span className="text-[11px] font-black text-white font-mono">
                                                            {Math.max(Number(creator.instagramFollowers || 0), Number(creator.youtubeSubscribers || 0)).toLocaleString()}
                                                        </span>
                                                    </div>
                                                </div>
                                                
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={async (e) => {
                                                            e.stopPropagation();
                                                            handlePushNotification(creator);
                                                        }}
                                                        className="w-10 h-10 rounded-xl bg-neon-blue/10 text-neon-blue border border-neon-blue/20 flex items-center justify-center hover:bg-neon-blue hover:text-black transition-all shadow-lg"
                                                        title="Broadcast Profile"
                                                    >
                                                        <Sparkles size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </motion.div>
                        ) : (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.98 }}
                                className="bg-zinc-900/40 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl"
                            >
                                <div className="overflow-x-auto custom-scrollbar">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-white/[0.02] text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">
                                                <th className="p-8 first:pl-10">IDENTITY</th>
                                                <th className="p-8">LOCATION</th>
                                                <th className="p-8">SOCIAL METRICS</th>
                                                <th className="p-8">SPECIALIZATION</th>
                                                <th className="p-8">STATUS</th>
                                                <th className="p-8 last:pr-10 text-right">SYSTEMS</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {filteredCreators.map(creator => (
                                                <tr key={creator.uid} className="group hover:bg-neon-pink/[0.02] transition-colors cursor-pointer" onClick={() => setSelectedCreator(creator)}>
                                                    <td className="p-8 first:pl-10">
                                                        <div className="flex items-center gap-5">
                                                            <div className="w-12 h-12 bg-zinc-800 border border-white/5 rounded-2xl flex items-center justify-center font-black text-lg group-hover:text-neon-pink transition-colors shadow-lg">
                                                                {creator.name.charAt(0).toUpperCase()}
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="text-base font-black uppercase tracking-tight text-white group-hover:translate-x-1 transition-transform">{creator.name}</span>
                                                                <span className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">{creator.email}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-8">
                                                        <div className="flex items-center gap-2">
                                                            <MapPin size={12} className="text-neon-pink" />
                                                            <span className="text-[11px] font-black text-gray-300 uppercase tracking-widest">{creator.city}</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-8">
                                                        <div className="flex items-center gap-6">
                                                            <div className="flex items-center gap-2">
                                                                <Instagram size={14} className="text-neon-pink" />
                                                                <span className="text-[11px] font-black text-white font-mono">{(Number(creator.instagramFollowers || 0)/1000).toFixed(1)}K</span>
                                                            </div>
                                                            {creator.youtube && (
                                                                <div className="flex items-center gap-2 opacity-60">
                                                                    <Youtube size={14} className="text-red-500" />
                                                                    <span className="text-[11px] font-black text-white font-mono">{(Number(creator.youtubeSubscribers || 0)/1000).toFixed(1)}K</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="p-8">
                                                        <div className="flex flex-wrap gap-2 max-w-[200px]">
                                                            {(creator.specializations || creator.niches || []).slice(0, 2).map((n, i) => (
                                                                <span key={i} className="text-[8px] px-3 py-1 bg-white/5 border border-white/5 rounded-lg text-gray-400 uppercase font-black tracking-widest">{n}</span>
                                                            ))}
                                                        </div>
                                                    </td>
                                                    <td className="p-8">
                                                        <div className="flex items-center gap-3">
                                                            <div className={cn(
                                                                "w-2 h-2 rounded-full",
                                                                creator.profileStatus === 'approved' ? 'bg-neon-green shadow-[0_0_10px_rgba(57,255,20,0.5)]' : 
                                                                creator.profileStatus === 'blocked' ? 'bg-red-500' : 'bg-yellow-500 animate-pulse'
                                                            )} />
                                                            <span className={cn(
                                                                "text-[10px] font-black uppercase tracking-widest",
                                                                creator.profileStatus === 'approved' ? 'text-neon-green' : 
                                                                creator.profileStatus === 'blocked' ? 'text-red-500' : 'text-yellow-500'
                                                            )}>
                                                                {creator.profileStatus || 'PENDING'}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="p-8 last:pr-10 text-right">
                                                        <div className="flex justify-end gap-3 items-center">
                                                            <button
                                                                onClick={async (e) => {
                                                                    e.stopPropagation();
                                                                    handlePushNotification(creator);
                                                                }}
                                                                className="w-11 h-11 rounded-xl bg-neon-blue/10 text-neon-blue border border-neon-blue/20 flex items-center justify-center hover:bg-neon-blue hover:text-black transition-all shadow-md"
                                                            >
                                                                <Sparkles size={18} />
                                                            </button>
                                                            <button className="h-11 px-6 rounded-xl text-[10px] font-black border border-white/10 hover:bg-white hover:text-black uppercase tracking-widest transition-all">
                                                                Inspect
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                )}
                </div>
            </div>

            {/* Detailed User Modal */}
            <AnimatePresence>
                {selectedCreator && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 pt-20 pb-20 overflow-hidden">
                        <motion.div
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/95 backdrop-blur-md"
                            onClick={() => setSelectedCreator(null)}
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }} 
                            animate={{ scale: 1, opacity: 1, y: 0 }} 
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="relative bg-[#050505] border border-white/10 rounded-[2rem] p-6 md:p-10 max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-[0_50px_100px_rgba(0,0,0,0.9)] z-[101]"
                        >
                            {/* DECORATIVE BACKGROUND */}
                            <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-neon-pink/5 rounded-full blur-[100px] pointer-events-none" />
                            <div className="absolute bottom-0 left-0 w-[40%] h-[40%] bg-neon-blue/5 rounded-full blur-[100px] pointer-events-none" />

                            <button onClick={() => setSelectedCreator(null)} className="absolute top-8 right-8 w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white hover:text-black transition-all group z-50">
                                <X size={24} className="group-hover:rotate-90 transition-transform duration-500" />
                            </button>

                            <div className="relative z-20 flex-1 overflow-y-auto custom-scrollbar pr-4 -mr-4">
                                <div className="flex flex-col md:flex-row items-center md:items-start gap-10 mb-16 px-2">
                                    <div className="w-40 h-40 bg-white/5 border border-white/10 p-2 rounded-[2rem] shadow-2xl shrink-0">
                                        <div className="w-full h-full bg-zinc-900 rounded-[2.8rem] flex items-center justify-center text-6xl font-black font-heading text-neon-pink">
                                            {selectedCreator.name.charAt(0).toUpperCase()}
                                        </div>
                                    </div>
                                    <div className="text-center md:text-left pt-4">
                                        <h2 className="text-3xl md:text-5xl font-black font-heading mb-4 tracking-tighter uppercase italic leading-[0.9] text-white">
                                            {selectedCreator.name.split(' ')[0]} <br/> <span className="text-neon-pink">{selectedCreator.name.split(' ').slice(1).join(' ') || 'PROFILE.'}</span>
                                        </h2>
                                        <div className="flex flex-wrap justify-center md:justify-start gap-6">
                                            <p className="text-neon-pink text-sm uppercase tracking-[0.4em] font-black flex items-center gap-3">
                                                <MapPin size={16} /> {selectedCreator.city}
                                            </p>
                                            <div className="w-1.5 h-1.5 rounded-full bg-white/20 self-center" />
                                            <p className="text-gray-500 text-[11px] font-black uppercase tracking-[0.3em] flex items-center gap-3">
                                                <Clock size={16} /> REGISTERED {new Date(selectedCreator.createdAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-16 mb-20 px-4">
                                    <div className="space-y-12">
                                        <div>
                                            <h3 className="text-[11px] font-black text-neon-blue uppercase tracking-[0.5em] mb-10 flex items-center gap-4">
                                                <div className="w-12 h-px bg-neon-blue/20" /> CREATOR DOSSIER
                                            </h3>
                                            <div className="space-y-6">
                                                <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/5 backdrop-blur-3xl group hover:border-white/20 transition-all">
                                                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-4">Identity Signal</span>
                                                    <div className="flex items-center gap-6 text-sm font-black text-white">
                                                        <Mail size={20} className="text-neon-blue" />
                                                        <span className="selection:bg-neon-blue selection:text-black">{selectedCreator.email}</span>
                                                    </div>
                                                </div>
                                                <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/5 backdrop-blur-3xl group hover:border-white/20 transition-all">
                                                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-4">Direct Channel</span>
                                                    <div className="flex items-center gap-6 text-sm font-black text-white">
                                                        <Phone size={20} className="text-neon-green" />
                                                        <span>{selectedCreator.phone}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <h3 className="text-[11px] font-black text-neon-pink uppercase tracking-[0.5em] mb-10 flex items-center gap-4">
                                                <div className="w-12 h-px bg-neon-pink/20" /> VISION & BIO
                                            </h3>
                                            <div className="p-10 bg-white/5 border border-white/5 rounded-[3rem] text-base font-medium text-gray-400 leading-relaxed italic relative overflow-hidden backdrop-blur-3xl">
                                                <Sparkles className="absolute -bottom-4 -right-4 text-neon-pink/5" size={120} />
                                                "{selectedCreator.bio || 'No strategic vision provided.'}"
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-12">
                                        <div>
                                            <h3 className="text-[11px] font-black text-gray-500 uppercase tracking-[0.5em] mb-10 flex items-center gap-4">
                                                <div className="w-12 h-px bg-white/10" /> SOCIAL VELOCITY
                                            </h3>
                                            <div className="space-y-6">
                                                {selectedCreator.instagram && (
                                                    <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/5 hover:border-neon-pink/40 transition-all backdrop-blur-3xl">
                                                        <div className="flex items-center justify-between mb-6">
                                                            <div className="flex items-center gap-4 text-sm font-black uppercase tracking-widest text-white">
                                                                <Instagram size={22} className="text-neon-pink" /> 
                                                                {selectedCreator.instagram}
                                                            </div>
                                                            <a href={`https://instagram.com/${selectedCreator.instagram.replace('@', '')}`} target="_blank" rel="noreferrer" className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-gray-500 hover:text-white transition-all">
                                                                <ExternalLink size={16} />
                                                            </a>
                                                        </div>
                                                        <div className="flex flex-col gap-1 pl-10">
                                                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Validated Followers</span>
                                                            <span className="text-2xl font-black text-white font-mono">{Number(selectedCreator.instagramFollowers || 0).toLocaleString()}</span>
                                                        </div>
                                                    </div>
                                                )}
                                                {selectedCreator.youtube && (
                                                    <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/5 hover:border-red-500/40 transition-all backdrop-blur-3xl">
                                                        <div className="flex items-center justify-between mb-6">
                                                            <div className="flex items-center gap-4 text-sm font-black uppercase tracking-widest text-white">
                                                                <Youtube size={22} className="text-red-500" /> 
                                                                BROADCAST CHANNEL
                                                            </div>
                                                            <a href={selectedCreator.youtube.includes('http') ? selectedCreator.youtube : `https://${selectedCreator.youtube}`} target="_blank" rel="noreferrer" className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-gray-500 hover:text-white transition-all">
                                                                <ExternalLink size={16} />
                                                            </a>
                                                        </div>
                                                        <div className="flex flex-col gap-1 pl-10">
                                                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Channel Subscribers</span>
                                                            <span className="text-2xl font-black text-white font-mono">{Number(selectedCreator.youtubeSubscribers || 0).toLocaleString()}</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div>
                                            <h3 className="text-[11px] font-black text-gray-500 uppercase tracking-[0.5em] mb-10 flex items-center gap-4">
                                                <div className="w-12 h-px bg-white/10" /> SPECIALIZATION
                                            </h3>
                                            <div className="flex flex-wrap gap-3 mb-12">
                                                {(selectedCreator.specializations || selectedCreator.niches || []).map((n, i) => (
                                                    <span key={i} className="px-6 py-3 bg-white/5 border border-white/5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-gray-300">
                                                        {n}
                                                    </span>
                                                ))}
                                            </div>
                                            {selectedCreator.portfolioInfo && (
                                                <Button 
                                                    onClick={() => window.open(selectedCreator.portfolioInfo.includes('http') ? selectedCreator.portfolioInfo : `https://${selectedCreator.portfolioInfo}`, '_blank')}
                                                    className="w-full h-18 bg-white text-black font-black font-heading uppercase tracking-[0.2em] text-[11px] rounded-[2.5rem] shadow-[0_20px_40px_rgba(255,255,255,0.1)] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-4"
                                                >
                                                    <Globe size={20} /> VIEW BRAND MEDIA KIT
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="shrink-0 pt-6 border-t border-white/10 mt-auto relative z-20">
                                <div className="flex flex-col sm:flex-row gap-4">
                                    <div className="flex-1 flex gap-3">
                                        {selectedCreator.profileStatus !== 'approved' && (
                                            <button onClick={() => updateStatus(selectedCreator.uid, 'approved')} className="flex-1 h-14 bg-neon-green text-black font-black uppercase tracking-widest rounded-xl hover:scale-[1.02] transition-transform">Verify Creator</button>
                                        )}
                                        {selectedCreator.profileStatus !== 'rejected' && (
                                            <button onClick={() => updateStatus(selectedCreator.uid, 'rejected')} className="flex-1 h-14 bg-zinc-900 border border-white/10 text-yellow-500 font-black uppercase tracking-widest rounded-xl hover:bg-white/5 transition-colors">Reject</button>
                                        )}
                                        <button onClick={() => {
                                            if (window.confirm("Permanently delete this creator?")) {
                                                deleteCreator(selectedCreator.uid);
                                                setSelectedCreator(null);
                                            }
                                        }} className="h-14 w-14 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors">
                                            <Trash2 size={20} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

        </div>
    );
};

export default CreatorManager;
