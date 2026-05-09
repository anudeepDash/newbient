import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '../../lib/store';
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
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import Filter from 'lucide-react/dist/esm/icons/filter';
import Globe from 'lucide-react/dist/esm/icons/globe';
import Zap from 'lucide-react/dist/esm/icons/zap';
import X from 'lucide-react/dist/esm/icons/x';
import Clock from 'lucide-react/dist/esm/icons/clock';
import LayoutGrid from 'lucide-react/dist/esm/icons/layout-grid';
import Music from 'lucide-react/dist/esm/icons/music';
import Mic2 from 'lucide-react/dist/esm/icons/mic-2';
import Calendar from 'lucide-react/dist/esm/icons/calendar';
import Target from 'lucide-react/dist/esm/icons/target';
import Check from 'lucide-react/dist/esm/icons/check';
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right';
import ChevronLeft from 'lucide-react/dist/esm/icons/chevron-left';
import MessageSquare from 'lucide-react/dist/esm/icons/message-square';
import Briefcase from 'lucide-react/dist/esm/icons/briefcase';
import DollarSign from 'lucide-react/dist/esm/icons/dollar-sign';
import ClipboardList from 'lucide-react/dist/esm/icons/clipboard-list';
import TrendingUp from 'lucide-react/dist/esm/icons/trending-up';
import Inbox from 'lucide-react/dist/esm/icons/inbox';
import Layers from 'lucide-react/dist/esm/icons/layers';
import LayoutDashboard from 'lucide-react/dist/esm/icons/layout-dashboard';
import CheckCircle2 from 'lucide-react/dist/esm/icons/check-circle-2';


import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import { db } from '../../lib/firebase';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import StudioSelect from '../../components/ui/StudioSelect';

const ClientRequestManager = ({ isEmbedded = false }) => {
    const { clientRequests } = useStore();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('All');
    const [viewMode, setViewMode] = useState('grid');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 12;
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

    const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
    const paginatedRequests = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredRequests.slice(start, start + itemsPerPage);
    }, [filteredRequests, currentPage]);

    // Reset to page 1 on filter changes
    React.useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filterStatus]);


    const stats = useMemo(() => {
        return {
            total: clientRequests.length,
            pending: clientRequests.filter(r => r.status === 'pending' || !r.status).length,
            fulfilled: clientRequests.filter(r => r.status === 'fulfilled').length,
            processing: clientRequests.filter(r => r.status === 'processing').length
        };
    }, [clientRequests]);

    const handleUpdateStatus = async (id, newStatus) => {
        try {
            await updateDoc(doc(db, 'client_requests', id), { status: newStatus });
            if (selectedRequest && selectedRequest.id === id) {
                setSelectedRequest({ ...selectedRequest, status: newStatus });
            }
        } catch (error) {
            useStore.getState().addToast("Status update failed.", 'error');
        }
    };

    const handleDeleteRequest = async (id) => {
        if (window.confirm("Delete this request permanently?")) {
            try {
                await deleteDoc(doc(db, 'client_requests', id));
                setSelectedRequest(null);
            } catch (error) {
                useStore.getState().addToast("Deletion failed.", 'error');
            }
        }
    };

    const renderContent = () => (
        <div className="relative z-10 max-w-[1700px] mx-auto pb-20">
            {/* Header Section */}
            <div className={cn(
                "flex flex-col xl:flex-row justify-between items-start xl:items-center gap-10 mb-12",
                isEmbedded ? "pt-8 px-0" : "pt-32 px-6 md:px-12"
            )}>
                {!isEmbedded ? (
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 text-neon-green font-black tracking-[0.5em] text-[10px] uppercase">
                            <Layers size={14} />
                            Client Engagement Hub
                        </div>
                        <h1 className="text-5xl md:text-7xl font-black font-heading tracking-tighter uppercase italic leading-[0.8]">
                            REQUEST <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-green via-neon-blue to-purple-500">PIPELINE</span>
                        </h1>
                        <p className="text-gray-500 text-sm font-medium tracking-wide max-w-xl leading-relaxed">
                            MISSION INQUIRIES & BOOKING OPERATIONAL HUB
                        </p>
                    </div>
                ) : null}

                <div className="w-full">
                    <StatCard 
                        compact={isEmbedded} 
                        icon={<Layers size={24} />} 
                        label={isEmbedded ? "PIPELINE OVERVIEW" : "ENGAGEMENT OVERVIEW"} 
                        value={stats.total} 
                        color="green" 
                        description={isEmbedded 
                            ? `TOTAL INQUIRIES | ${stats.fulfilled} FULFILLED • ${stats.total ? Math.round((stats.fulfilled / stats.total) * 100) : 0}% CONVERSION`
                            : `${stats.pending} Pending Analysis • ${stats.fulfilled} Successful Deployments`
                        } 
                    />
                </div>


            </div>


            <div className={cn("px-6 md:px-12", isEmbedded ? "pt-12" : "pt-0")}>
                {/* Command Bar */}
                <div className="relative z-50 bg-[#0A0A0A]/80 backdrop-blur-3xl border border-white/10 rounded-[2rem] p-2 md:p-2.5 mb-12 md:mb-16 shadow-[0_30px_100px_rgba(0,0,0,0.8)] flex flex-col md:flex-row md:items-center gap-3">


                    {/* Search Engine */}
                    <div className="relative flex-1 min-w-[300px] group">
                        <div className="absolute inset-0 bg-gradient-to-r from-neon-green/10 to-transparent opacity-0 group-focus-within:opacity-100 transition-opacity rounded-full pointer-events-none" />
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-neon-green transition-colors" size={16} />
                        <input
                            type="text"
                            placeholder="SEARCH REQUESTS..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full h-14 pl-14 pr-6 bg-black/60 border border-white/10 group-hover:border-white/20 focus:border-neon-green/60 rounded-full text-[10px] font-black uppercase tracking-[0.2em] outline-none transition-all placeholder:text-gray-700 text-white min-w-0"

                        />
                    </div>

                        <div className="flex flex-wrap md:flex-nowrap items-center gap-2 shrink-0 w-full md:w-auto pr-2">
                            <div className="flex-1 md:w-[220px] min-w-[200px]">
                                <StudioSelect 
                                    value={filterStatus}
                                    options={[
                                        { value: 'All', label: 'GLOBAL STATUS' },
                                        { value: 'pending', label: 'PENDING' },
                                        { value: 'processing', label: 'PROCESSING' },
                                        { value: 'fulfilled', label: 'FULFILLED' },
                                        { value: 'rejected', label: 'REJECTED' }
                                    ]}
                                    onChange={setFilterStatus}
                                    className="h-14 rounded-full border-white/10 bg-black/60"
                                    accentColor="neon-green"
                                />
                            </div>

                            <div className="w-px h-8 bg-white/5 mx-1 hidden md:block" />
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
                                    <LayoutDashboard size={16} />
                                </button>
                            </div>
                        </div>


                    </div>
                </div>




                {/* Request Grid */}
                <div className="relative min-h-[500px]">
                    <AnimatePresence mode="wait">
                        {clientRequests.length === 0 ? (
                            <motion.div 
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="py-40 text-center bg-[#050505]/40 rounded-[4rem] border border-white/5 flex flex-col items-center gap-8 shadow-inner"
                            >
                                <div className="w-32 h-32 bg-white/5 rounded-full flex items-center justify-center border border-white/10 animate-pulse">
                                    <MessageSquare size={48} className="text-gray-700" />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-3xl font-black uppercase tracking-tighter text-gray-500 italic">No Requests Found</h3>
                                    <p className="text-gray-700 text-sm font-black uppercase tracking-widest">Awaiting client interaction</p>
                                </div>
                            </motion.div>
                        ) : filteredRequests.length === 0 ? (
                            <motion.div 
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="py-32 text-center flex flex-col items-center gap-6"
                            >
                                <Search size={64} className="text-gray-800" />
                                <h3 className="text-xl font-black uppercase tracking-[0.3em] text-gray-600">No matching requests</h3>
                            </motion.div>
                        ) : (
                            <motion.div
                                key={viewMode}
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -30 }}
                                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                            >
                                {(viewMode === 'grid' && typeof window !== 'undefined' && window.innerWidth >= 768) ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-8">
                                        {paginatedRequests.map((request, idx) => (
                                            <motion.div
                                                key={request.id}
                                                initial={{ opacity: 0, y: 30 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: idx * 0.05, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                                            >
                                                <RequestBadgeCard 
                                                    request={request} 
                                                    onSelect={() => setSelectedRequest(request)} 
                                                />
                                            </motion.div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-3">
                                        <div className="flex items-center gap-6 px-10 py-6 text-[10px] font-black text-gray-600 uppercase tracking-[0.4em] border-b border-white/5">
                                            <div className="flex-1 pl-14">Client Inquirer</div>
                                            <div className="w-48 hidden md:block">Engagement</div>
                                            <div className="w-40 hidden lg:block text-right pr-10">Budget</div>
                                            <div className="w-10 shrink-0"></div>
                                        </div>

                                        {paginatedRequests.map((request, idx) => (
                                            <RequestListItem 
                                                key={request.id} 
                                                request={request} 
                                                idx={idx} 
                                                onSelect={() => setSelectedRequest(request)} 
                                            />
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
    );



    const content = isEmbedded ? renderContent() : (
        <div className="min-h-screen bg-[#020202] text-white selection:bg-neon-green selection:text-black">
            {/* Background Canvas */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(57,255,20,0.08),transparent_50%)]" />
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:80px_80px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_40%,#000_30%,transparent_100%)]" />
                <div className="absolute top-[10%] left-[-10%] w-[60%] h-[60%] bg-neon-green/5 rounded-full blur-[180px] animate-pulse" />
                <div className="absolute bottom-[10%] right-[-10%] w-[50%] h-[50%] bg-neon-blue/5 rounded-full blur-[180px] animate-pulse" style={{ animationDelay: '1s' }} />
            </div>

            {renderContent()}
        </div>
    );

    return (
        <>
            {content}
            <AnimatePresence>
                {selectedRequest && (
                    <RequestDetailModal 
                        request={selectedRequest} 
                        onClose={() => setSelectedRequest(null)} 
                        onUpdateStatus={handleUpdateStatus}
                        onDelete={handleDeleteRequest}
                    />
                )}
            </AnimatePresence>
        </>
    );

};

/* Sub-components */

const StatCard = ({ icon, label, value, color, description, compact = false }) => {
    const colorMap = {
        green: { 
            bg: 'bg-neon-green/10', 
            border: 'border-neon-green/20', 
            text: 'text-neon-green', 
            glow: 'rgba(57,255,20,0.2)',
            gradient: 'from-neon-green/20 to-transparent'
        },
        blue: { 
            bg: 'bg-neon-blue/10', 
            border: 'border-neon-blue/20', 
            text: 'text-neon-blue', 
            glow: 'rgba(46,191,255,0.2)',
            gradient: 'from-neon-blue/20 to-transparent'
        },
        cyan: { 
            bg: 'bg-cyan-400/10', 
            border: 'border-cyan-400/20', 
            text: 'text-cyan-400', 
            glow: 'rgba(34,211,238,0.2)',
            gradient: 'from-cyan-400/20 to-transparent'
        },
        purple: { 
            bg: 'bg-purple-500/10', 
            border: 'border-purple-500/20', 
            text: 'text-purple-500', 
            glow: 'rgba(168,85,247,0.2)',
            gradient: 'from-purple-500/20 to-transparent'
        }
    };
    
    const theme = colorMap[color] || colorMap.green;
    
    return (
        <motion.div 
            whileHover={{ y: -5, scale: 1.02 }}
            className={cn(
                "relative group overflow-hidden bg-[#0A0A0A] border transition-all duration-500 flex-1",
                compact ? "p-4 md:p-5 rounded-[2rem] min-w-[200px]" : "p-8 rounded-[3rem] min-w-[260px]",
                theme.border
            )}
            style={{
                boxShadow: compact ? `0 10px 30px -10px ${theme.glow}` : `0 20px 50px -10px ${theme.glow}`
            }}
        >
            <div className={cn("absolute top-0 right-0 w-40 h-40 bg-gradient-to-br blur-[80px] -mr-20 -mt-20 opacity-30 group-hover:opacity-50 transition-opacity", theme.gradient)} />
            
            <div className={cn("relative z-10 flex h-full", compact ? "flex-row items-center gap-4" : "flex-col justify-between gap-8")}>
                <div className={cn(
                    "rounded-2xl flex items-center justify-center shadow-inner border border-white/5 shrink-0", 
                    compact ? "w-10 h-10 md:w-12 md:h-12" : "w-16 h-16",
                    theme.bg, theme.text
                )}>
                    {React.cloneElement(icon, { size: compact ? 18 : 24 })}
                </div>
                
                <div className={cn("space-y-0.5", compact ? "flex-1" : "text-right")}>
                    <p className={cn("font-black uppercase tracking-[0.3em] text-gray-500", compact ? "text-[7px] md:text-[8px]" : "text-[10px]")}>
                        {label}
                    </p>
                    <div className="flex items-baseline justify-between gap-3">
                        <h4 className={cn("font-black uppercase italic tracking-tighter text-white", compact ? "text-lg md:text-xl" : "text-4xl md:text-5xl leading-none")}>
                            {value}
                        </h4>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};



const RequestBadgeCard = ({ request, onSelect }) => (
    <div 
        onClick={onSelect}
        className="group relative bg-[#0A0A0A] border border-white/5 hover:border-neon-green/40 rounded-[2rem] sm:rounded-[3.5rem] p-6 sm:p-10 cursor-pointer overflow-hidden transition-all duration-700 hover:-translate-y-2 hover:shadow-[0_40px_100px_rgba(0,0,0,0.9)] flex flex-col h-auto sm:min-h-[500px]"
    >

        <div className="absolute inset-0 bg-gradient-to-br from-neon-green/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
        
        <div className="flex justify-between items-start mb-8 relative z-10">
            <div className="w-16 h-16 bg-black border border-white/10 rounded-[1.5rem] flex items-center justify-center text-neon-green shadow-2xl group-hover:border-neon-green/40 transition-all duration-500 group-hover:scale-110">
                <Briefcase size={28} />
            </div>
            <StatusPill status={request.status} />
        </div>

        <div className="space-y-4 sm:space-y-6 flex-1 relative z-10">
            <div className="space-y-2">
                <h3 className="text-2xl sm:text-3xl font-black uppercase italic tracking-tighter text-white group-hover:text-neon-green transition-colors duration-500 leading-tight">
                    {request.name}
                </h3>

                {request.org && (
                    <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.4em] flex items-center gap-2">
                        <Globe size={12} className="text-neon-blue" />
                        {request.org}
                    </p>
                )}
            </div>
            
            <div className="flex flex-wrap gap-4 sm:gap-6 items-center">
                <div className="flex items-center gap-2 text-gray-400 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em]">
                    <MapPin size={12} className="text-neon-pink" />
                    {request.city}
                </div>
                <div className="w-1.5 h-1.5 rounded-full bg-white/10" />
                <div className="text-[9px] sm:text-[10px] font-black text-neon-green uppercase tracking-[0.2em] px-4 py-2 bg-neon-green/5 border border-neon-green/10 rounded-full">
                    {request.category}
                </div>
            </div>


            <div className="relative">
                <div className="absolute -left-4 top-0 bottom-0 w-1 bg-neon-green/20 rounded-full" />
                <p className="text-gray-400 text-sm italic leading-relaxed pl-4 line-clamp-3">
                    "{request.requirement}"
                </p>
            </div>
        </div>

        <div className="pt-10 mt-10 border-t border-white/5 flex justify-between items-center relative z-10">
            <div className="space-y-1">
                <p className="text-[8px] font-black text-gray-600 uppercase tracking-[0.3em]">FILED ON</p>
                <p className="text-[11px] font-black text-white tracking-widest">{new Date(request.createdAt).toLocaleDateString()}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-neon-green group-hover:text-black transition-all group-hover:scale-110">
                <ChevronRight size={20} />
            </div>
        </div>
    </div>
);

const StatusPill = ({ status }) => {
    const themes = {
        fulfilled: 'bg-cyan-400/10 text-cyan-400 border-cyan-400/30',
        rejected: 'bg-red-500/10 text-red-500 border-red-500/30',
        processing: 'bg-neon-blue/10 text-neon-blue border-neon-blue/30',
        pending: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30'
    };

    const colors = {
        fulfilled: 'bg-cyan-400',
        rejected: 'bg-red-500',
        processing: 'bg-neon-blue',
        pending: 'bg-yellow-500'
    };

    return (
        <div className={cn(
            "px-6 py-2 rounded-full text-[9px] font-black uppercase tracking-[0.3em] border backdrop-blur-md inline-flex items-center gap-3",
            themes[status] || themes.pending
        )}>
            <div className={cn("w-2 h-2 rounded-full animate-pulse", colors[status] || colors.pending)} />
            {status || 'PENDING'}
        </div>
    );
};

const RequestDetailModal = ({ request, onClose, onUpdateStatus, onDelete }) => {
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
                className="relative bg-[#050505] border border-white/10 rounded-[2.5rem] sm:rounded-[4rem] w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] flex flex-col overflow-hidden shadow-[0_0_150px_rgba(0,0,0,1)] z-10"

            >

            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-px bg-gradient-to-r from-transparent via-neon-green to-transparent opacity-50" />
            
            <button 
                onClick={onClose} 
                className="absolute top-6 right-6 sm:top-10 sm:right-10 w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white hover:text-black transition-all group z-50 hover:scale-110 active:scale-95"
            >
                <X size={20} className="sm:size-[28px] group-hover:rotate-90 transition-transform duration-500" />
            </button>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 sm:p-10 md:p-16">

                <div className="space-y-12">
                    <div className="flex flex-col lg:flex-row justify-between items-start gap-10">
                        <div className="space-y-6 flex-1 w-full">
                            <div className="flex flex-wrap gap-4 items-center">
                                <StatusPill status={request.status} />
                                <div className="px-5 py-2 bg-neon-green/10 border border-neon-green/20 rounded-full text-[10px] font-black text-neon-green tracking-[0.4em] uppercase">
                                    {request.category}
                                </div>
                            </div>
                            <h2 className="text-4xl sm:text-5xl md:text-7xl font-black font-heading tracking-tighter uppercase italic leading-[0.85] text-white">
                                {request.name}
                            </h2>
                            {request.org && <p className="text-lg sm:text-xl font-black text-neon-blue uppercase tracking-[0.5em]">{request.org}</p>}
                        </div>
                        
                        <div className="shrink-0 w-full lg:w-auto p-6 sm:p-8 bg-white/[0.03] border border-white/5 rounded-[2rem] sm:rounded-[2.5rem] space-y-4 sm:space-y-6 lg:min-w-[280px]">
                            <DetailItem label="Official Email" value={request.email} icon={<Mail size={16} />} color="blue" />
                            <DetailItem label="Mission Location" value={request.city} icon={<MapPin size={16} />} color="pink" />
                            <DetailItem label="Deployment Date" value={request.date || 'TBD'} icon={<Calendar size={16} />} color="green" />
                            <DetailItem label="Allocated Budget" value={request.budget || 'UNDISCLOSED'} icon={<DollarSign size={16} />} color="yellow" />
                        </div>
                    </div>


                    <section className="space-y-8">
                        <div className="flex items-center gap-6">
                            <h3 className="text-[11px] font-black text-neon-green uppercase tracking-[0.6em] whitespace-nowrap">MISSION BRIEF</h3>
                            <div className="w-full h-px bg-gradient-to-r from-neon-green/30 to-transparent" />
                        </div>
                        <div className="relative group">
                            <div className="absolute -inset-1 bg-gradient-to-br from-neon-green/20 to-neon-blue/20 rounded-[2.5rem] blur opacity-20 transition-opacity" />
                            <div className="relative bg-[#0A0A0A] p-12 rounded-[2.5rem] border border-white/5 shadow-inner">
                                <p className="text-gray-300 leading-relaxed italic text-2xl font-medium">"{request.requirement}"</p>
                            </div>
                        </div>
                    </section>

                    <div className="flex flex-col sm:flex-row gap-6 items-center">
                         <div className="flex-1 w-full relative">
                            <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.4em] mb-4 pl-2">Modify Operational Status</p>
                            <select 
                                value={request.status || 'pending'}
                                onChange={(e) => onUpdateStatus(request.id, e.target.value)}
                                className="w-full h-20 px-8 bg-[#0A0A0A] border border-white/10 rounded-[2rem] text-[12px] font-black uppercase tracking-[0.3em] outline-none text-white focus:border-neon-green/50 transition-all cursor-pointer shadow-2xl appearance-none"
                            >
                                <option value="pending">PENDING ANALYSIS</option>
                                <option value="processing">ACTIVE PROCESSING</option>
                                <option value="fulfilled">MISSION FULFILLED</option>
                                <option value="rejected">REJECTED / ARCHIVED</option>
                            </select>
                            <ChevronRight size={20} className="absolute right-8 top-[60px] rotate-90 text-gray-600 pointer-events-none" />
                        </div>

                        <button 
                            onClick={() => onDelete(request.id)}
                            className="h-20 w-20 bg-red-600/10 border border-red-600/20 text-red-500 rounded-[2rem] flex items-center justify-center hover:bg-red-600 hover:text-white transition-all hover:scale-110 active:scale-90 shadow-xl self-end"
                        >
                            <Trash2 size={24} />
                        </button>
                    </div>
                </div>
            </div>
        </motion.div>
    </div>,
    document.body
);
};




const RequestListItem = ({ request, idx, onSelect }) => {
    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.03 }}
            onClick={onSelect}
            className="group flex items-center px-6 md:px-10 py-5 bg-[#0A0A0A]/40 border border-white/5 rounded-2xl md:rounded-[1.5rem] hover:bg-white/5 hover:border-white/10 transition-all cursor-pointer"
        >
            <div className="flex-1 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-neon-green font-black italic">
                    {request.name?.charAt(0)}
                </div>
                <div>
                    <h4 className="text-[13px] md:text-sm font-black uppercase tracking-widest text-white group-hover:text-neon-green transition-colors">{request.name}</h4>
                    <p className="text-[9px] md:text-[10px] font-black text-gray-500 uppercase tracking-widest">{request.org || 'INDIVIDUAL'}</p>
                </div>
            </div>

            <div className="w-48 hidden md:flex items-center gap-3">
                <div className={cn(
                    "px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border",
                    request.status === 'fulfilled' ? "bg-neon-green/10 text-neon-green border-neon-green/20" :
                    request.status === 'processing' ? "bg-neon-blue/10 text-neon-blue border-neon-blue/20" :
                    request.status === 'rejected' ? "bg-red-500/10 text-red-500 border-red-500/20" :
                    "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                )}>
                    {request.status || 'PENDING'}
                </div>
            </div>

            <div className="w-40 hidden lg:flex flex-col items-end pr-10">
                <span className="text-[12px] font-black text-white">{request.budget ? `₹${request.budget}` : 'TBD'}</span>
                <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest">{request.category}</span>
            </div>

            <div className="w-10 h-10 rounded-full flex items-center justify-center text-gray-700 group-hover:text-white transition-colors">
                <ChevronRight size={18} />
            </div>
        </motion.div>
    );
};

const DetailItem = ({ label, value, icon, color }) => {

    const iconColors = {
        blue: 'text-neon-blue',
        pink: 'text-neon-pink',
        green: 'text-neon-green',
        yellow: 'text-yellow-500'
    };

    return (
        <div className="space-y-1.5 group">
            <p className="text-[8px] font-black text-gray-600 uppercase tracking-[0.5em] flex items-center gap-2 group-hover:text-gray-400 transition-colors">
                {React.cloneElement(icon, { size: 12, className: iconColors[color] })} {label}
            </p>
            <p className="text-sm font-black text-white truncate tracking-wider">{value}</p>
        </div>
    );
};

export default ClientRequestManager;
