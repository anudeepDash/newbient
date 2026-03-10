import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Trash2, CheckCircle, ArrowLeft, Clock, User, AlertCircle, Sparkles, Filter, Search, X } from 'lucide-react';
import { useStore } from '../../lib/store';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
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

            <div className="relative z-10 max-w-6xl mx-auto px-6 pt-32">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-8">
                    <div className="space-y-4">
                        <Link to="/admin" className="relative z-[60] inline-flex items-center gap-2 text-gray-500 hover:text-white transition-colors uppercase text-[10px] font-black tracking-[0.3em] mb-4">
                            <ArrowLeft size={14} /> Back to Hub
                        </Link>
                        <h1 className="text-4xl md:text-5xl font-black font-heading tracking-tighter uppercase italic">
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
                <div className="space-y-6">
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
                                    <Card className={cn(
                                        "p-8 transition-all duration-500 border-white/5 group hover:border-white/10 rounded-[2.5rem] bg-zinc-900/40 backdrop-blur-3xl",
                                        msg.status === 'new' && "border-neon-pink/20 bg-gradient-to-r from-neon-pink/[0.03] to-transparent shadow-[0_10px_40px_rgba(255,46,144,0.05)]"
                                    )}>
                                        <div className="flex flex-col lg:flex-row gap-10">
                                            {/* SENDER INTEL */}
                                            <div className="lg:w-1/4 shrink-0">
                                                <div className="flex items-center gap-4 mb-4">
                                                    <div className={cn(
                                                        "w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl transition-all duration-500",
                                                        msg.status === 'new' ? "bg-neon-pink text-black scale-110" : "bg-white/5 text-gray-500 group-hover:bg-white/10 group-hover:text-white"
                                                    )}>
                                                        {(msg.name || 'A').charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <h3 className="font-black text-lg uppercase tracking-tight text-white group-hover:text-neon-pink transition-colors">{msg.name || 'ANONYMOUS'}</h3>
                                                        <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-0.5">
                                                            <Clock size={10} className="text-gray-600" />
                                                            {formatDate(msg.createdAt)}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="space-y-3 pt-6 border-t border-white/5">
                                                    <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-gray-400">
                                                        <Mail size={12} className="text-neon-pink/50" />
                                                        <span className="truncate max-w-[150px]">{msg.email}</span>
                                                    </div>
                                                    {msg.status === 'new' && (
                                                        <div className="inline-flex px-3 py-1 rounded-full bg-neon-pink/10 text-neon-pink text-[8px] font-black uppercase tracking-widest border border-neon-pink/20">
                                                            NEW COMMUNICATION
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* CONTENT VAULT */}
                                            <div className="flex-grow pt-4 lg:pt-0">
                                                <div className="relative p-6 lg:p-10 bg-black/40 rounded-[2rem] border border-white/5 group-hover:border-white/10 transition-all leading-relaxed min-h-[160px]">
                                                    <div className="absolute -top-3 -left-3 p-2 bg-zinc-900 rounded-lg border border-white/5 text-[8px] font-black uppercase tracking-widest text-gray-500">DECRYPTED DATA</div>
                                                    <p className="text-sm font-medium text-gray-300 whitespace-pre-wrap selection:bg-neon-pink selection:text-black">
                                                        {msg.message}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* OPERATIONAL ACTIONS */}
                                            <div className="lg:w-48 flex flex-row lg:flex-col gap-3 shrink-0 lg:border-l lg:border-white/5 lg:pl-10 justify-center">
                                                <Button
                                                    onClick={() => markMessageRead(msg.id, msg.status === 'new' ? 'read' : 'new')}
                                                    className={cn(
                                                        "flex-1 h-14 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all gap-3 shadow-xl",
                                                        msg.status === 'new' 
                                                            ? "bg-neon-pink text-black hover:scale-105 active:scale-95" 
                                                            : "bg-white/5 text-gray-500 hover:bg-white/10 hover:text-white border border-white/5"
                                                    )}
                                                >
                                                    {msg.status === 'new' ? (
                                                        <><CheckCircle size={16} /> Mark Processed</>
                                                    ) : (
                                                        <><AlertCircle size={16} /> Recall to Queue</>
                                                    )}
                                                </Button>

                                                <button
                                                    onClick={() => handleDelete(msg.id)}
                                                    className="w-14 h-14 shrink-0 rounded-2xl bg-red-500/10 text-red-500 border border-red-500/20 flex items-center justify-center hover:bg-red-500 hover:text-black transition-all group/del"
                                                >
                                                    <Trash2 size={20} className="group-hover/del:scale-110 transition-transform" />
                                                </button>
                                            </div>
                                        </div>
                                    </Card>
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
