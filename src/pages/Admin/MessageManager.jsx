import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Trash2, CheckCircle, LayoutGrid, Clock, User, AlertCircle, Sparkles, Filter, Search, X } from 'lucide-react';
import { useStore } from '../../lib/store';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';

const MessageManager = () => {
    const { messages, markMessageRead, deleteMessage } = useStore();
    const [filter, setFilter] = useState('all'); // 'all', 'unread', 'read'
    const [searchTerm, setSearchTerm] = useState('');

    const filteredMessages = messages
        .filter(msg => {
            if (filter === 'unread') return msg.status === 'new';
            if (filter === 'read') return msg.status === 'read';
            return true;
        })
        .filter(msg => {
            if (!searchTerm) return true;
            return msg.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                   msg.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                   msg.message?.toLowerCase().includes(searchTerm.toLowerCase());
        });

    const unreadCount = messages.filter(m => m.status === 'new').length;

    const handleDelete = async (id) => {
        if (window.confirm("Delete this communication forever?")) {
            await deleteMessage(id);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Unknown Date';
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('en-US', {
            month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
        }).format(date);
    };

    return (
        <div className="min-h-screen bg-[#020202] text-white pb-20">
            {/* Immersive Background */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[15%] left-[-5%] w-[40%] h-[40%] bg-neon-pink/5 rounded-full blur-[150px]" />
                <div className="absolute bottom-[5%] right-[-5%] w-[30%] h-[30%] bg-neon-blue/5 rounded-full blur-[150px]" />
            </div>

            <div className="relative z-10 max-w-[1400px] mx-auto px-4 md:px-8 pt-24 md:pt-32">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-8">
                    <div className="space-y-4">
                        <Link to="/admin" className="relative z-[60] inline-flex items-center gap-2 text-gray-500 hover:text-white transition-colors uppercase text-[10px] font-black tracking-[0.3em] mb-4 group">
                            <LayoutGrid size={14} className="group-hover:rotate-90 transition-transform" /> BACK TO ADMIN DASHBOARD
                        </Link>
                        <h1 className="text-4xl md:text-6xl font-black font-heading tracking-tighter uppercase italic leading-[1.1] pb-2 pr-4">
                            INTEL <span className="text-neon-pink">STREAM.</span>
                        </h1>
                    </div>
                    
                    {unreadCount > 0 && (
                        <div className="px-4 py-2 bg-neon-pink/10 border border-neon-pink/20 rounded-xl flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-neon-pink animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-neon-pink">{unreadCount} UNREAD DEBRIEFS</span>
                        </div>
                    )}
                </div>

                {/* Filters & Search */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-12">
                    <div className="md:col-span-4 flex bg-zinc-900/50 p-1.5 rounded-2xl border border-white/5 h-14">
                        {['all', 'unread', 'read'].map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={cn(
                                    "flex-1 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                    filter === f ? "bg-white text-black shadow-lg" : "text-gray-500 hover:text-white"
                                )}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                    <div className="md:col-span-8 relative">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                        <Input 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="SEARCH SENDER, EMAIL OR CONTENT"
                            className="bg-zinc-900/50 border-white/5 h-14 pl-14 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] focus:border-neon-pink/30"
                        />
                    </div>
                </div>

                {/* Messages Feed */}
                <div className="space-y-4">
                    <AnimatePresence mode='popLayout'>
                        {filteredMessages.length > 0 ? (
                            filteredMessages.map((msg) => (
                                <motion.div
                                    key={msg.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    layout
                                >
                                    <div className={cn(
                                        "p-6 md:p-8 transition-all duration-500 border rounded-[2rem] backdrop-blur-3xl group",
                                        msg.status === 'new'
                                            ? "bg-zinc-900/60 border-neon-pink/20 shadow-[0_0_40px_rgba(255,46,144,0.05)]"
                                            : "bg-zinc-900/30 border-white/5 hover:border-white/10"
                                    )}>
                                        {/* Top row: Avatar + name + email + status + actions */}
                                        <div className="flex flex-col sm:flex-row items-start justify-between gap-4 sm:gap-6 mb-6">
                                            <div className="flex items-center gap-4 w-full sm:w-auto">
                                                <div className={cn(
                                                    "w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl shrink-0 transition-all duration-300",
                                                    msg.status === 'new' ? "bg-neon-pink text-black" : "bg-white/5 text-gray-400 group-hover:bg-white/10"
                                                )}>
                                                    {(msg.name || 'A').charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <h3 className="font-black text-sm uppercase tracking-tight text-white leading-none mb-1">{msg.name || 'ANONYMOUS'}</h3>
                                                    <div className="flex items-center flex-wrap gap-2 sm:gap-3">
                                                        <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest break-all">{msg.email}</span>
                                                        <span className="text-[9px] font-bold text-gray-600 uppercase tracking-widest flex items-center gap-1">
                                                            <Clock size={9} />{formatDate(msg.createdAt)}
                                                        </span>
                                                        {msg.status === 'new' && (
                                                            <span className="px-2 py-0.5 rounded-full bg-neon-pink/10 text-neon-pink text-[8px] font-black uppercase tracking-widest border border-neon-pink/20">
                                                                New
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Action buttons — compact row */}
                                            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto w-full sm:w-auto mt-2 sm:mt-0 justify-end">
                                                <button
                                                    onClick={() => markMessageRead(msg.id, msg.status === 'new' ? 'read' : 'new')}
                                                    className={cn(
                                                        "h-9 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2 transition-all",
                                                        msg.status === 'new'
                                                            ? "bg-neon-pink text-black hover:scale-105"
                                                            : "bg-white/5 text-gray-500 hover:bg-white/10 hover:text-white border border-white/5"
                                                    )}
                                                >
                                                    {msg.status === 'new' ? (
                                                        <><CheckCircle size={13} /> Mark Read</>
                                                    ) : (
                                                        <><AlertCircle size={13} /> Unreads</>
                                                    )}
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(msg.id)}
                                                    className="w-9 h-9 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Message body */}
                                        <div className="pl-0 md:pl-16">
                                            <div className="p-5 md:p-6 bg-black/30 rounded-2xl border border-white/5 group-hover:border-white/8 transition-all">
                                                <p className="text-sm font-medium text-gray-300 whitespace-pre-wrap leading-relaxed selection:bg-neon-pink selection:text-black">
                                                    {msg.message}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))
                        ) : (
                            <div className="py-32 text-center bg-zinc-900/20 rounded-[3rem] border-2 border-dashed border-white/5 flex flex-col items-center gap-6">
                                <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center text-gray-700">
                                    <Mail size={40} />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-xl font-black uppercase tracking-tighter text-gray-500 italic">No signals detected.</h3>
                                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-600">
                                        {filter !== 'all' ? `No ${filter} intel packets available.` : 'The inbox remains silent.'}
                                    </p>
                                </div>
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};

export default MessageManager;
