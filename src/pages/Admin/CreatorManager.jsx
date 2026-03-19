import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../../lib/store';
import { PREDEFINED_CITIES } from '../../lib/constants';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Users, Search, MapPin, Instagram, Mail, Phone, ExternalLink, CheckCircle2, XCircle, Activity, ArrowLeft, Trash2, Ban, Sparkles, Filter, Globe, Youtube, Zap, X, Clock, LayoutGrid, FileSpreadsheet, Download, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const CreatorManager = () => {
    const { creators, updateCreator, deleteCreator } = useStore();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCity, setFilterCity] = useState('All');
    const [selectedCreator, setSelectedCreator] = useState(null);
    const [viewMode, setViewMode] = useState('table'); // Default to table as requested
    const [exportLoading, setExportLoading] = useState(false);

    const cities = ['All', ...new Set([...PREDEFINED_CITIES, ...creators.map(c => c.city)])];

    const filteredCreators = creators.filter(c => {
        const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.niches.some(n => n.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesCity = filterCity === 'All' || c.city === filterCity;
        return matchesSearch && matchesCity;
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
        if (window.confirm("Permanently erase this creator profile from the database?")) {
            try {
                await deleteCreator(uid);
                setSelectedCreator(null);
            } catch (error) {
                alert("Erasure failed.");
            }
        }
    };
    
    const exportToCSV = () => {
        const headers = ['Name', 'Email', 'Phone', 'City', 'Instagram', 'Instagram Followers', 'YouTube', 'YouTube Subs', 'Niches', 'Status'];
        const csvRows = [
            headers.join(','),
            ...filteredCreators.map(c => [
                `"${c.name}"`,
                `"${c.email}"`,
                `"${c.phone}"`,
                `"${c.city}"`,
                `"${c.instagram ? (c.instagram.includes('http') ? c.instagram : `https://instagram.com/${c.instagram.replace('@', '')}`) : ''}"`,
                `"${c.instagramFollowers || 0}"`,
                `"${c.youtube || ''}"`,
                `"${c.youtubeSubscribers || 0}"`,
                `"${c.niches.join(', ')}"`,
                `"${c.profileStatus || 'pending'}"`
            ].join(','))
        ];
        
        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('hidden', '');
        a.setAttribute('href', url);
        a.setAttribute('download', `Newbi_Creators_${filterCity}_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    const exportToPDF = () => {
        const doc = new jsPDF();
        doc.text(`Newbi Creators Registry - ${filterCity}`, 14, 15);
        
        const tableData = filteredCreators.map(c => [
            c.name,
            c.city,
            c.instagram || '-',
            c.instagramFollowers || '0',
            c.niches.slice(0, 2).join(', '),
            c.profileStatus || 'pending'
        ]);

        doc.autoTable({
            head: [['Name', 'City', 'Instagram', 'Followers', 'Niches', 'Status']],
            body: tableData,
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

            <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-6 pt-32 md:pt-32">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 md:mb-8 gap-8">
                    <div className="space-y-4">
                        <Link to="/admin" className="relative z-[60] inline-flex items-center gap-2 text-gray-500 hover:text-white transition-colors uppercase text-[10px] font-black tracking-[0.3em] mb-4 group">
                            <LayoutGrid size={14} className="group-hover:rotate-90 transition-transform" /> BACK TO COMMAND CENTRE
                        </Link>
                        <h1 className="text-4xl md:text-6xl font-black font-heading tracking-tighter uppercase italic leading-[1.1] pb-2 pr-4">
                            CREATOR <span className="text-neon-pink">REGISTRY.</span>
                        </h1>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto items-center">
                        {/* View Toggle */}
                        <div className="flex bg-zinc-900/50 p-1.5 rounded-2xl border border-white/5 mr-2">
                            <button onClick={() => setViewMode('grid')} className={cn("px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", viewMode === 'grid' ? "bg-white text-black" : "text-gray-500 hover:text-white")}>Grid</button>
                            <button onClick={() => setViewMode('table')} className={cn("px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", viewMode === 'table' ? "bg-white text-black" : "text-gray-500 hover:text-white")}>Table</button>
                        </div>

                        <div className="relative flex-1 md:w-64">
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                            <input
                                type="text"
                                placeholder="SEARCH..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full h-14 pl-12 pr-6 bg-zinc-900/50 border border-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest focus:border-neon-pink/30 outline-none transition-all placeholder:text-gray-600"
                            />
                        </div>

                        <div className="relative">
                            <Filter className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                            <select
                                value={filterCity}
                                onChange={(e) => setFilterCity(e.target.value)}
                                className="h-14 pl-12 pr-10 bg-zinc-900/50 border border-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest focus:border-neon-pink/30 outline-none transition-all appearance-none cursor-pointer min-w-[140px]"
                            >
                                {cities.map(city => <option key={city} value={city} className="bg-zinc-900">{city.toUpperCase()}</option>)}
                            </select>
                        </div>

                        <div className="flex gap-2">
                             <Button onClick={exportToCSV} variant="outline" className="h-14 px-5 border-white/10 hover:bg-white/5 text-[10px] font-black uppercase tracking-widest rounded-2xl">
                                <FileSpreadsheet className="mr-2 text-neon-green" size={14} /> XLSX / CSV
                            </Button>
                            <Button onClick={exportToPDF} variant="outline" className="h-14 px-5 border-white/10 hover:bg-white/5 text-[10px] font-black uppercase tracking-widest rounded-2xl">
                                <FileText className="mr-2 text-neon-pink" size={14} /> PDF
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Content Area */}
                {creators.length === 0 ? (
                    <div className="py-32 text-center bg-zinc-900/20 rounded-[3rem] border-2 border-dashed border-white/5 flex flex-col items-center gap-6">
                        <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center text-gray-700">
                            <Users size={40} />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-xl font-black uppercase tracking-tighter text-gray-500 italic">No creators found.</h3>
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-600">No Newbi creator registrations found on the network.</p>
                        </div>
                    </div>
                ) : (
                    <AnimatePresence mode="wait">
                        {viewMode === 'grid' ? (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8"
                            >
                                {filteredCreators.map(creator => (
                                    <motion.div
                                        key={creator.uid}
                                        onClick={() => setSelectedCreator(creator)}
                                        className="snap-center shrink-0 group relative bg-zinc-900/40 backdrop-blur-3xl border border-white/5 rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 hover:border-neon-pink/30 cursor-pointer transition-all duration-500 hover:shadow-[0_20px_40px_rgba(255,46,144,0.05)] overflow-hidden"
                                    >
                                        {/* Status Light */}
                                        <div className={cn(
                                            "absolute top-0 left-0 w-1.5 h-full opacity-50 group-hover:opacity-100 transition-opacity",
                                            creator.profileStatus === 'approved' ? 'bg-neon-green' : 
                                            creator.profileStatus === 'blocked' ? 'bg-red-600' : 'bg-yellow-500'
                                        )}></div>

                                        <div className="flex items-center gap-5 mb-8">
                                            <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center text-xl font-black font-heading group-hover:bg-neon-pink/10 group-hover:text-neon-pink transition-all">
                                                {creator.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <h3 className="font-black text-lg uppercase tracking-tight text-white group-hover:translate-x-1 transition-transform">{creator.name}</h3>
                                                <p className="text-[8px] font-black text-gray-500 flex items-center gap-1.5 mt-1 uppercase tracking-widest"><MapPin size={10} className="text-neon-pink" /> {creator.city}</p>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap gap-2 mb-8 items-center min-h-[3rem]">
                                            {creator.niches.slice(0, 3).map((n, i) => (
                                                <span key={i} className="text-[8px] px-2.5 py-1 bg-white/5 border border-white/5 rounded-full text-gray-400 font-black uppercase tracking-widest whitespace-nowrap">{n}</span>
                                            ))}
                                        </div>

                                        <div className="flex items-center justify-between mt-auto pt-6 border-t border-white/5">
                                            <span className={cn(
                                                "text-[9px] font-black uppercase tracking-widest",
                                                creator.profileStatus === 'approved' ? 'text-neon-green' : 
                                                creator.profileStatus === 'blocked' ? 'text-red-500' : 'text-yellow-500'
                                            )}>
                                                {creator.profileStatus || 'PENDING'}
                                            </span>
                                            <div className="flex gap-3">
                                                {creator.instagram && <Instagram size={14} className="text-gray-500 group-hover:text-white transition-colors" />}
                                                {creator.youtube && <Youtube size={14} className="text-gray-500 group-hover:text-white transition-colors" />}
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </motion.div>
                        ) : (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="bg-zinc-900/40 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] overflow-hidden"
                            >
                                <div className="overflow-x-auto custom-scrollbar">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="border-b border-white/5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
                                                <th className="p-8">CREATOR</th>
                                                <th className="p-8">CITY</th>
                                                <th className="p-8">SOCIALS</th>
                                                <th className="p-8">SPECIALIZATION</th>
                                                <th className="p-8">STATUS</th>
                                                <th className="p-8 text-right">ACTION</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {filteredCreators.map(creator => (
                                                <tr key={creator.uid} className="group hover:bg-white/[0.02] transition-colors cursor-pointer" onClick={() => setSelectedCreator(creator)}>
                                                    <td className="p-8">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center font-black text-sm group-hover:text-neon-pink transition-colors">
                                                                {creator.name.charAt(0).toUpperCase()}
                                                            </div>
                                                            <span className="text-sm font-black uppercase tracking-tight text-white">{creator.name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-8">
                                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{creator.city}</span>
                                                    </td>
                                                    <td className="p-8">
                                                        <div className="flex gap-3 text-gray-500">
                                                            {creator.instagram && <Instagram size={14} />}
                                                            {creator.youtube && <Youtube size={14} />}
                                                            {creator.instagramFollowers && <span className="text-[10px] font-black text-neon-pink">{(Number(creator.instagramFollowers)/1000).toFixed(1)}K</span>}
                                                        </div>
                                                    </td>
                                                    <td className="p-8">
                                                        <div className="flex gap-2">
                                                            {creator.niches.slice(0, 2).map((n, i) => (
                                                                <span key={i} className="text-[8px] px-2 py-0.5 bg-white/5 border border-white/5 rounded-full text-gray-500 uppercase font-black">{n}</span>
                                                            ))}
                                                        </div>
                                                    </td>
                                                    <td className="p-8">
                                                        <span className={cn(
                                                            "text-[9px] font-black uppercase tracking-widest",
                                                            creator.profileStatus === 'approved' ? 'text-neon-green' : 
                                                            creator.profileStatus === 'blocked' ? 'text-red-500' : 'text-yellow-500'
                                                        )}>
                                                            {creator.profileStatus || 'PENDING'}
                                                        </span>
                                                    </td>
                                                    <td className="p-8 text-right">
                                                        <Button variant="outline" className="h-10 px-4 rounded-xl text-[8px] font-black border-white/10 hover:bg-white/5 uppercase tracking-widest">
                                                            Review
                                                        </Button>
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

            {/* Detailed User Modal */}
            <AnimatePresence>
                {selectedCreator && (
                    <div className="fixed inset-0 z-[100] flex items-start md:items-center justify-center p-4 md:p-6 pt-20 pb-20 overflow-y-auto">
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/95 backdrop-blur-sm"
                            onClick={() => setSelectedCreator(null)}
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 30 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 30 }}
                            className="relative bg-zinc-900 border border-white/10 rounded-[3rem] p-6 md:p-10 max-w-3xl w-full max-h-[85vh] md:max-h-[95vh] overflow-y-auto custom-scrollbar shadow-[0_40px_100px_rgba(0,0,0,0.8)] shrink-0"
                        >
                            <button onClick={() => setSelectedCreator(null)} className="absolute top-8 right-8 w-12 h-12 rounded-full bg-white/5 flex items-center justify-center hover:bg-white hover:text-black transition-all group z-20">
                                <X size={20} className="group-hover:scale-110 transition-transform" />
                            </button>

                            <div className="flex flex-col md:flex-row items-center md:items-start gap-8 mb-12 relative z-10">
                                <div className="w-32 h-32 bg-gradient-to-br from-neon-pink to-neon-blue rounded-[2.5rem] p-1 shrink-0 rotate-3 group-hover:rotate-0 transition-all duration-500">
                                    <div className="w-full h-full bg-black rounded-[2.2rem] flex items-center justify-center text-4xl font-black font-heading text-white">
                                        {selectedCreator.name.charAt(0).toUpperCase()}
                                    </div>
                                </div>
                                <div className="text-center md:text-left pt-2">
                                    <h2 className="text-5xl font-black font-heading mb-2 tracking-tighter uppercase italic">{selectedCreator.name}</h2>
                                    <div className="flex flex-wrap justify-center md:justify-start gap-4">
                                        <p className="text-neon-pink text-xs uppercase tracking-[0.3em] font-black flex items-center gap-2">
                                            <MapPin size={12} /> {selectedCreator.city}
                                        </p>
                                        <div className="w-1 h-1 rounded-full bg-gray-700 self-center" />
                                        <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                                            <Clock size={12} /> REGISTERED {new Date(selectedCreator.createdAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-12">
                                <div className="space-y-6">
                                    <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] mb-4 flex items-center gap-3">
                                        <div className="w-8 h-px bg-white/5" /> CONNECTIVITY
                                    </h3>
                                    <div className="space-y-4">
                                        <div className="bg-black/40 p-5 rounded-2xl border border-white/5 hover:border-white/10 transition-all group/info">
                                            <div className="flex items-center gap-4 text-xs font-bold text-gray-300">
                                                <Mail size={16} className="text-neon-blue" />
                                                <span className="selection:bg-neon-blue selection:text-black">{selectedCreator.email}</span>
                                            </div>
                                        </div>
                                        <div className="bg-black/40 p-5 rounded-2xl border border-white/5 hover:border-white/10 transition-all group/info">
                                            <div className="flex items-center gap-4 text-xs font-bold text-gray-300">
                                                <Phone size={16} className="text-neon-green" />
                                                <span>{selectedCreator.phone}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] mb-4 flex items-center gap-3">
                                        <div className="w-8 h-px bg-white/5" /> SOCIAL METRICS
                                    </h3>
                                    <div className="space-y-4">
                                        {selectedCreator.instagram && (
                                            <div className="bg-black/40 p-5 rounded-2xl border border-white/5 hover:border-neon-pink/30 transition-all">
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-3 text-xs font-black uppercase tracking-widest">
                                                        <Instagram size={16} className="text-neon-pink" /> 
                                                        {selectedCreator.instagram}
                                                    </div>
                                                    <a href={`https://instagram.com/${selectedCreator.instagram.replace('@', '')}`} target="_blank" rel="noreferrer" className="p-2 bg-white/5 rounded-lg text-gray-500 hover:text-white transition-colors">
                                                        <ExternalLink size={12} />
                                                    </a>
                                                </div>
                                                {selectedCreator.instagramFollowers && (
                                                    <div className="flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase tracking-widest pl-7">
                                                        <Activity size={10} className="text-neon-pink" /> {Number(selectedCreator.instagramFollowers).toLocaleString()} FOLLOWERS
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        {selectedCreator.youtube && (
                                            <div className="bg-black/40 p-5 rounded-2xl border border-white/5 hover:border-red-500/30 transition-all">
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-3 text-xs font-black uppercase tracking-widest">
                                                        <Youtube size={16} className="text-red-500" /> 
                                                        YOUTUBE CHANNEL
                                                    </div>
                                                    <a href={selectedCreator.youtube.includes('http') ? selectedCreator.youtube : `https://${selectedCreator.youtube}`} target="_blank" rel="noreferrer" className="p-2 bg-white/5 rounded-lg text-gray-500 hover:text-white transition-colors">
                                                        <ExternalLink size={12} />
                                                    </a>
                                                </div>
                                                {selectedCreator.youtubeSubscribers && (
                                                    <div className="flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase tracking-widest pl-7">
                                                        <Activity size={10} className="text-red-500" /> {Number(selectedCreator.youtubeSubscribers).toLocaleString()} SUBS
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-12">
                                <div className="space-y-6">
                                    <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] mb-4 flex items-center gap-3">
                                        <div className="w-8 h-px bg-white/5" /> USER BIO
                                    </h3>
                                    <div className="p-8 bg-black/40 border border-white/5 rounded-[2rem] text-sm font-medium text-gray-400 leading-relaxed italic relative">
                                        <Sparkles className="absolute top-4 right-4 text-neon-pink/10" size={40} />
                                        "{selectedCreator.bio || 'No bio provided.'}"
                                    </div>
                                </div>
                                <div className="space-y-6">
                                    <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] mb-4 flex items-center gap-3">
                                        <div className="w-8 h-px bg-white/5" /> SPECIALIZATIONS
                                    </h3>
                                    <div className="flex flex-wrap gap-3 p-2">
                                        {selectedCreator.niches.map((n, i) => (
                                            <span key={i} className="px-5 py-2.5 bg-white/5 border border-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-300 group-hover:bg-neon-pink group-hover:text-black transition-all">
                                                {n}
                                            </span>
                                        ))}
                                    </div>
                                    {selectedCreator.portfolioInfo && (
                                        <div className="pt-6">
                                            <Button 
                                                onClick={() => window.open(selectedCreator.portfolioInfo.includes('http') ? selectedCreator.portfolioInfo : `https://${selectedCreator.portfolioInfo}`, '_blank')}
                                                className="w-full h-14 bg-neon-blue text-black font-black font-heading uppercase tracking-widest text-xs rounded-2xl"
                                            >
                                                <Globe className="mr-3" size={16} /> VIEW MEDIA KIT / PORTFOLIO
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-4 pt-10 border-t border-white/10 relative">
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 bg-zinc-900 text-[8px] font-black uppercase tracking-[0.3em] text-gray-500">ADMIN ACTIONS</div>
                                
                                {selectedCreator.profileStatus !== 'approved' && (
                                    <Button
                                        onClick={() => handleUpdateStatus(selectedCreator.uid, 'approved')}
                                        className="flex-1 h-16 bg-neon-green text-black hover:scale-[1.02] active:scale-95 transition-all font-black font-heading tracking-widest gap-3 rounded-2xl"
                                    >
                                        <CheckCircle2 size={20} /> APPROVE
                                    </Button>
                                )}
                                
                                <div className="flex flex-1 gap-4">
                                    {selectedCreator.profileStatus !== 'rejected' && selectedCreator.profileStatus !== 'blocked' && (
                                        <Button
                                            onClick={() => handleUpdateStatus(selectedCreator.uid, 'rejected')}
                                            className="flex-1 h-16 bg-white/5 border border-white/10 text-yellow-500 hover:bg-yellow-500 hover:text-black transition-all font-black font-heading tracking-widest gap-2 rounded-2xl"
                                        >
                                            <XCircle size={18} /> REJECT
                                        </Button>
                                    )}
                                    {selectedCreator.profileStatus !== 'blocked' ? (
                                        <Button
                                            onClick={() => handleUpdateStatus(selectedCreator.uid, 'blocked')}
                                            className="flex-1 h-16 bg-white/5 border border-white/10 text-red-500 hover:bg-red-500 hover:text-white transition-all font-black font-heading tracking-widest gap-2 rounded-2xl"
                                        >
                                            <Ban size={18} /> BLOCK
                                        </Button>
                                    ) : (
                                        <Button
                                            onClick={() => handleUpdateStatus(selectedCreator.uid, 'approved')}
                                            className="flex-1 h-16 bg-neon-green/10 border border-neon-green/30 text-neon-green hover:bg-neon-green hover:text-black transition-all font-black font-heading tracking-widest gap-2 rounded-2xl"
                                        >
                                            <CheckCircle2 size={18} /> REINSTATE
                                        </Button>
                                    )}
                                </div>

                                <button
                                    onClick={() => handleDeleteCreator(selectedCreator.uid)}
                                    className="h-16 w-16 bg-zinc-950 border border-white/5 rounded-2xl flex items-center justify-center text-gray-600 hover:bg-red-600 hover:text-white hover:border-red-600 transition-all group/del"
                                >
                                    <Trash2 size={20} className="group-hover/del:scale-110 transition-transform" />
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

        </div>
    );
};

export default CreatorManager;
