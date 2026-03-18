import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Trash2, Pin, LayoutGrid, Save, Sparkles, ChevronUp, ChevronDown, X, Clock, Eye } from 'lucide-react';
import { useStore } from '../../lib/store';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { cn } from '../../lib/utils';
import LivePreview from '../../components/admin/LivePreview';
import { motion, AnimatePresence } from 'framer-motion';

const AnnouncementsManager = () => {
    const { announcements, addAnnouncement, togglePinAnnouncement, deleteAnnouncement, reorderAnnouncements, cleanupExpiredAnnouncements } = useStore();
    const [isAdding, setIsAdding] = useState(false);

    useEffect(() => {
        cleanupExpiredAnnouncements();
    }, [cleanupExpiredAnnouncements]);

    const [newAnnouncement, setNewAnnouncement] = useState({
        title: '',
        date: new Date().toISOString().split('T')[0],
        content: '',
        image: '',
        link: '',
        isPinned: false
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        try {
            addAnnouncement({
                id: Date.now(),
                ...newAnnouncement
            });
            setIsAdding(false);
            setNewAnnouncement({
                title: '',
                date: new Date().toISOString().split('T')[0],
                content: '',
                image: '',
                link: '',
                isPinned: false
            });
        } catch (error) {
            alert("Broadcast failure.");
        }
    };

    const handleMoveUp = (index) => {
        if (index === 0) return;
        const newItems = [...announcements];
        [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
        reorderAnnouncements(newItems);
    };

    const handleMoveDown = (index) => {
        if (index === announcements.length - 1) return;
        const newItems = [...announcements];
        [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
        reorderAnnouncements(newItems);
    };

    return (
        <div className="min-h-screen bg-[#020202] text-white pb-20">
            {/* Atmos */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[10%] right-[-10%] w-[50%] h-[50%] bg-neon-pink/5 rounded-full blur-[150px]" />
                <div className="absolute bottom-[10%] left-[-10%] w-[40%] h-[40%] bg-neon-blue/5 rounded-full blur-[150px]" />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-6 pt-16 md:pt-24">
                {/* Header */}
                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-8 md:mb-12 gap-8">
                    <div className="space-y-4 max-w-full">
                        <Link to="/admin" className="relative z-[60] inline-flex items-center gap-2 text-gray-500 hover:text-white transition-colors uppercase text-[10px] font-black tracking-[0.3em] group">
                            <LayoutGrid size={14} className="group-hover:rotate-90 transition-transform" /> BACK TO COMMAND CENTRE
                        </Link>
                        <h1 className="text-2xl md:text-4xl lg:text-5xl font-black font-heading tracking-tighter uppercase italic leading-[1.6] py-10 pr-12 pl-1 overflow-visible whitespace-nowrap">
                            SIGNAL <span className="text-neon-pink px-4">CONTROL.</span>
                        </h1>
                    </div>
                    {!isAdding && (
                        <Button onClick={() => setIsAdding(true)} className="h-14 px-10 bg-neon-pink text-black font-black uppercase tracking-widest rounded-2xl shadow-[0_4px_30px_rgba(255,46,144,0.3)] hover:scale-105 active:scale-95 transition-all">
                            <Plus className="mr-2" size={18} /> New Broadcast
                        </Button>
                    )}
                </div>

                <AnimatePresence mode="wait">
                    {isAdding ? (
                        <motion.div 
                            initial={{ opacity: 0, y: 30 }} 
                            animate={{ opacity: 1, y: 0 }} 
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start"
                        >
                            {/* Editor Column */}
                            <div className="lg:col-span-7">
                                <Card className="p-6 md:p-10 bg-zinc-900/40 backdrop-blur-3xl border-white/5 rounded-[2.5rem] md:rounded-[3rem]">
                                    <div className="flex justify-between items-center mb-10">
                                        <h2 className="text-2xl font-black font-heading tracking-tighter uppercase italic text-white flex items-center gap-3">
                                            <Sparkles className="text-neon-pink" size={24} /> CREATE SIGNAL
                                        </h2>
                                        <button onClick={() => setIsAdding(false)} className="text-[10px] font-black text-gray-500 hover:text-white uppercase tracking-widest transition-colors">Discard</button>
                                    </div>

                                    <form onSubmit={handleSubmit} className="space-y-8">
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Signal Headline</label>
                                            <Input
                                                placeholder="ENTER HEADLINE..."
                                                value={newAnnouncement.title}
                                                onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
                                                required
                                                className="h-14 bg-black/50 border-white/5 rounded-xl text-xs font-bold uppercase tracking-widest focus:border-neon-pink/30"
                                            />
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Effective Date</label>
                                                <Input
                                                    type="date"
                                                    value={newAnnouncement.date}
                                                    onChange={(e) => setNewAnnouncement({ ...newAnnouncement, date: e.target.value })}
                                                    required
                                                    className="h-14 bg-black/50 border-white/5 rounded-xl text-xs font-bold uppercase tracking-widest"
                                                />
                                            </div>
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Media Payload (URL)</label>
                                                <Input
                                                    placeholder="HTTPS://..."
                                                    value={newAnnouncement.image}
                                                    onChange={(e) => setNewAnnouncement({ ...newAnnouncement, image: e.target.value })}
                                                    className="h-14 bg-black/50 border-white/5 rounded-xl text-xs font-bold"
                                                />
                                            </div>
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Target Link (Optional)</label>
                                                <Input
                                                    placeholder="HTTPS://..."
                                                    value={newAnnouncement.link}
                                                    onChange={(e) => setNewAnnouncement({ ...newAnnouncement, link: e.target.value })}
                                                    className="h-14 bg-black/50 border-white/5 rounded-xl text-xs font-bold"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Signal Data (Content)</label>
                                            <textarea
                                                className="w-full bg-black/50 border border-white/5 rounded-[2rem] p-6 text-sm font-medium text-gray-300 focus:outline-none focus:border-neon-pink/30 transition-all resize-none min-h-[200px]"
                                                placeholder="Describe the signal in detail..."
                                                value={newAnnouncement.content}
                                                onChange={(e) => setNewAnnouncement({ ...newAnnouncement, content: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="flex items-center gap-4 bg-black/30 p-4 rounded-xl border border-white/5 group border-dashed hover:border-neon-pink/20 transition-all">
                                            <input
                                                type="checkbox"
                                                id="pinned"
                                                checked={newAnnouncement.isPinned}
                                                onChange={(e) => setNewAnnouncement({ ...newAnnouncement, isPinned: e.target.checked })}
                                                className="w-5 h-5 rounded-md border-white/10 bg-transparent text-neon-pink focus:ring-neon-pink/50 cursor-pointer"
                                            />
                                            <label htmlFor="pinned" className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] cursor-pointer group-hover:text-white transition-colors">Anchor to top of stream</label>
                                        </div>
                                        <div className="flex gap-4 pt-6 border-t border-white/10">
                                            <Button type="button" variant="outline" onClick={() => setIsAdding(false)} className="h-16 px-8 flex-1 rounded-2xl border-white/10 text-gray-400 font-black uppercase tracking-widest text-[11px]">Abort</Button>
                                            <Button type="submit" className="h-16 px-10 flex-[2] bg-neon-pink text-black font-black uppercase tracking-widest rounded-2xl shadow-xl text-[11px] hover:scale-105 active:scale-95 transition-all">
                                                TRANSMIT SIGNAL
                                            </Button>
                                        </div>
                                    </form>
                                </Card>
                            </div>

                            {/* Preview Column */}
                            <div className="lg:col-span-5 hidden lg:block sticky top-12">
                                <div className="space-y-6">
                                    <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] flex items-center gap-3">
                                        <div className="w-8 h-px bg-white/10" /> REAL-TIME ECHO
                                    </h3>
                                    <LivePreview type="announcement" data={newAnnouncement} />
                                </div>
                            </div>
                        </motion.div>
                    ) : (
                        <div className="space-y-6 max-w-4xl mx-auto">
                            {announcements.length === 0 ? (
                                <div className="py-32 text-center bg-zinc-900/20 rounded-[3rem] border-2 border-dashed border-white/5 flex flex-col items-center gap-6">
                                    <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center text-gray-700">
                                        <Clock size={40} />
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="text-xl font-black uppercase tracking-tighter text-gray-500 italic">Static detected.</h3>
                                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-600">No signals currently in the stream.</p>
                                    </div>
                                    <Button onClick={() => setIsAdding(true)} className="h-14 px-10 bg-neon-pink text-black font-black uppercase tracking-widest rounded-2xl mt-4">
                                        INITIATE BROADCAST
                                    </Button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-6">
                                    <AnimatePresence mode="popLayout">
                                    {announcements.map((item, index) => (
                                        <motion.div 
                                            key={item.id} 
                                            layout
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            className={cn(
                                                "p-6 md:p-8 bg-zinc-900/40 backdrop-blur-3xl border border-white/5 rounded-[2rem] md:rounded-[2.5rem] flex items-center gap-4 md:gap-8 group hover:border-white/10 transition-all duration-500",
                                                item.isPinned && "border-neon-pink/20 bg-gradient-to-r from-neon-pink/[0.03] to-transparent"
                                            )}
                                        >
                                            <div className="flex flex-col gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => handleMoveUp(index)} disabled={index === 0} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-gray-500 hover:text-white disabled:opacity-0"><ChevronUp size={16} /></button>
                                                <button onClick={() => handleMoveDown(index)} disabled={index === announcements.length - 1} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-gray-500 hover:text-white disabled:opacity-0"><ChevronDown size={16} /></button>
                                            </div>

                                            <div className="flex-grow">
                                                <div className="flex items-center gap-4 mb-3">
                                                    <h3 className="text-2xl font-black font-heading tracking-tight uppercase italic text-white group-hover:text-neon-pink transition-colors">{item.title}</h3>
                                                    {item.isPinned && <Pin size={16} className="text-neon-pink fill-current drop-shadow-[0_0_8px_rgba(255,46,144,0.5)]" />}
                                                </div>
                                                <div className="flex items-center gap-4 text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4">
                                                    <Clock size={12} className="text-gray-700" />
                                                    {item.date}
                                                </div>
                                                <p className="text-sm font-medium text-gray-400 transition-all duration-500 leading-relaxed border-l-2 border-white/5 pl-4">{item.content}</p>
                                            </div>

                                            <div className="flex items-center gap-3 shrink-0 ml-4">
                                                <button
                                                    onClick={() => togglePinAnnouncement(item.id)}
                                                    className={cn(
                                                        "w-12 h-12 rounded-2xl transition-all flex items-center justify-center border",
                                                        item.isPinned ? "bg-neon-pink/20 text-neon-pink border-neon-pink/30" : "bg-white/5 text-gray-500 hover:text-white border-white/5"
                                                    )}
                                                    title={item.isPinned ? "Unpin" : "Pin"}
                                                >
                                                    <Pin size={18} className={item.isPinned ? "fill-current" : ""} />
                                                </button>
                                                <button
                                                    onClick={() => deleteAnnouncement(item.id)}
                                                    className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-500 border border-red-500/10 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all"
                                                    title="Erase"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </motion.div>
                                    ))}
                                    </AnimatePresence>
                                </div>
                            )}
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default AnnouncementsManager;
