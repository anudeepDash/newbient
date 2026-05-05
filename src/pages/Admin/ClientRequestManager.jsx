import React, { useState, useMemo } from 'react';
import { useStore } from '../../lib/store';
import { 
    Users, Search, MapPin, Mail, Phone, ExternalLink, 
    CheckCircle2, XCircle, Activity, ArrowLeft, Trash2, 
    Sparkles, Filter, Globe, Zap, X, 
    Clock, LayoutGrid, Music, Mic2, 
    Calendar, Target, Check, ChevronRight,
    MessageSquare, Briefcase, DollarSign
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import { db } from '../../lib/firebase';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';

const ClientRequestManager = ({ isEmbedded = false }) => {
    const { clientRequests } = useStore();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('All');
    const [selectedRequest, setSelectedRequest] = useState(null);

    const filteredRequests = useMemo(() => {
        return clientRequests.filter(r => {
            const matchesSearch = r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (r.requirement || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (r.org || '').toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = filterStatus === 'All' || r.status === filterStatus;
            return matchesSearch && matchesStatus;
        });
    }, [clientRequests, searchTerm, filterStatus]);

    const handleUpdateStatus = async (id, newStatus) => {
        try {
            await updateDoc(doc(db, 'client_requests', id), { status: newStatus });
            if (selectedRequest && selectedRequest.id === id) {
                setSelectedRequest({ ...selectedRequest, status: newStatus });
            }
        } catch (error) {
            alert("Status update failed.");
        }
    };

    const handleDeleteRequest = async (id) => {
        if (window.confirm("Delete this request?")) {
            try {
                await deleteDoc(doc(db, 'client_requests', id));
                setSelectedRequest(null);
            } catch (error) {
                alert("Deletion failed.");
            }
        }
    };

    const renderContent = () => (
        <div className="relative z-10 max-w-[1600px] mx-auto">
            {!isEmbedded && (
                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-12 mb-16 pt-32 px-4 md:px-8">
                    <div className="space-y-6">
                        <h1 className="text-3xl md:text-4xl lg:text-5xl font-black font-heading tracking-tighter uppercase italic leading-tight">
                            CLIENT <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-green to-neon-blue">REQUESTS.</span>
                        </h1>
                    </div>
                </div>
            )}

            <div className={cn("px-4 md:px-8", isEmbedded ? "pt-10" : "pt-0")}>
                <div className="bg-zinc-900/60 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-6 mb-12 shadow-2xl flex flex-col lg:flex-row items-center gap-6">
                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                        <input
                            type="text"
                            placeholder="SEARCH REQUESTS..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full h-16 pl-14 pr-6 bg-black/50 border border-white/5 rounded-2xl text-[11px] font-black uppercase tracking-widest outline-none transition-all placeholder:text-gray-700"
                        />
                    </div>

                    <div className="flex items-center gap-4 w-full lg:w-auto">
                        <select 
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="h-16 px-6 bg-black/50 border border-white/5 rounded-2xl text-[11px] font-black uppercase tracking-widest outline-none text-white"
                        >
                            <option value="All">ALL STATUS</option>
                            <option value="pending">PENDING</option>
                            <option value="processing">PROCESSING</option>
                            <option value="fulfilled">FULFILLED</option>
                            <option value="rejected">REJECTED</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredRequests.map(request => (
                        <div 
                            key={request.id}
                            onClick={() => setSelectedRequest(request)}
                            className="group bg-zinc-900/40 border border-white/5 hover:border-neon-green/30 rounded-[2.5rem] p-8 cursor-pointer transition-all duration-500 flex flex-col h-full"
                        >
                            <div className="flex justify-between items-start mb-6">
                                <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-neon-green">
                                    <Briefcase size={20} />
                                </div>
                                <StatusPill status={request.status} />
                            </div>

                            <div className="space-y-4 flex-1">
                                <h3 className="text-2xl font-black uppercase italic tracking-tighter text-white">{request.name}</h3>
                                {request.org && <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{request.org}</p>}
                                <div className="flex items-center gap-2 text-zinc-400 text-xs font-bold uppercase tracking-widest">
                                    <MapPin size={14} className="text-neon-blue" /> {request.city}
                                </div>
                                <p className="text-zinc-500 text-sm line-clamp-3 leading-relaxed mt-4 italic">"{request.requirement}"</p>
                            </div>

                            <div className="pt-6 mt-8 border-t border-white/5 flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-zinc-500">
                                <span>{new Date(request.createdAt).toLocaleDateString()}</span>
                                <span className="text-neon-green">{request.category}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    if (isEmbedded) return renderContent();

    return (
        <div className="min-h-screen bg-[#020202] text-white pb-32">
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:60px_60px]" />
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-neon-green/10 rounded-full blur-[180px]" />
            </div>

            {renderContent()}

            <AnimatePresence>
                {selectedRequest && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/95 backdrop-blur-xl" onClick={() => setSelectedRequest(null)} />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                            className="relative bg-[#050505] border border-white/10 rounded-[3rem] p-10 max-w-2xl w-full z-[101] overflow-hidden"
                        >
                            <div className="space-y-8">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-2">
                                        <h2 className="text-4xl font-black uppercase italic tracking-tighter">{selectedRequest.name}</h2>
                                        <p className="text-neon-green font-bold uppercase tracking-[0.3em] text-xs">{selectedRequest.category}</p>
                                    </div>
                                    <button onClick={() => setSelectedRequest(null)} className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center"><X size={24} /></button>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <DetailItem label="Email" value={selectedRequest.email} icon={<Mail size={14} />} />
                                    <DetailItem label="Location" value={selectedRequest.city} icon={<MapPin size={14} />} />
                                    <DetailItem label="Date" value={selectedRequest.date || 'N/A'} icon={<Calendar size={14} />} />
                                    <DetailItem label="Budget" value={selectedRequest.budget || 'N/A'} icon={<DollarSign size={14} />} />
                                </div>

                                <div className="space-y-3">
                                    <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Requirement Details</p>
                                    <p className="bg-white/5 p-6 rounded-2xl border border-white/5 text-zinc-300 italic leading-relaxed">
                                        "{selectedRequest.requirement}"
                                    </p>
                                </div>

                                <div className="flex gap-4 pt-8">
                                    <select 
                                        value={selectedRequest.status}
                                        onChange={(e) => handleUpdateStatus(selectedRequest.id, e.target.value)}
                                        className="flex-1 h-16 px-6 bg-zinc-900 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest outline-none text-white"
                                    >
                                        <option value="pending">PENDING</option>
                                        <option value="processing">PROCESSING</option>
                                        <option value="fulfilled">FULFILLED</option>
                                        <option value="rejected">REJECTED</option>
                                    </select>
                                    <button 
                                        onClick={() => handleDeleteRequest(selectedRequest.id)}
                                        className="h-16 w-16 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-all"
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

const DetailItem = ({ label, value, icon }) => (
    <div className="bg-white/5 p-4 rounded-2xl border border-white/5 space-y-1">
        <p className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest flex items-center gap-2">
            {icon} {label}
        </p>
        <p className="text-sm font-bold text-white truncate">{value}</p>
    </div>
);

const StatusPill = ({ status }) => (
    <div className={cn(
        "px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border",
        status === 'fulfilled' ? 'bg-neon-green/10 text-neon-green border-neon-green/30' : 
        status === 'rejected' ? 'bg-red-500/10 text-red-500 border-red-500/30' : 
        status === 'processing' ? 'bg-neon-blue/10 text-neon-blue border-neon-blue/30' : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30'
    )}>
        {status}
    </div>
);

export default ClientRequestManager;
