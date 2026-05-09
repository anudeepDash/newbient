import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Plus from 'lucide-react/dist/esm/icons/plus';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import Pin from 'lucide-react/dist/esm/icons/pin';
import LayoutGrid from 'lucide-react/dist/esm/icons/layout-grid';
import Save from 'lucide-react/dist/esm/icons/save';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import ChevronUp from 'lucide-react/dist/esm/icons/chevron-up';
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down';
import X from 'lucide-react/dist/esm/icons/x';
import Clock from 'lucide-react/dist/esm/icons/clock';
import Eye from 'lucide-react/dist/esm/icons/eye';
import Edit from 'lucide-react/dist/esm/icons/edit';
import Mail from 'lucide-react/dist/esm/icons/mail';
import Megaphone from 'lucide-react/dist/esm/icons/megaphone';
import Calendar from 'lucide-react/dist/esm/icons/calendar';
import Radio from 'lucide-react/dist/esm/icons/radio';
import FileText from 'lucide-react/dist/esm/icons/file-text';
import Music from 'lucide-react/dist/esm/icons/music';
import RotateCcw from 'lucide-react/dist/esm/icons/rotate-ccw';
import { useStore } from '../../lib/store';
import { notifyAllUsers } from '../../lib/notificationTriggers';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { cn } from '../../lib/utils';
import LivePreview from '../../components/admin/LivePreview';
import { motion, AnimatePresence } from 'framer-motion';

import AdminCommunityHubLayout from '../../components/admin/AdminCommunityHubLayout';

const AnnouncementsManager = () => {
    const { announcements, addAnnouncement, updateAnnouncement, togglePinAnnouncement, deleteAnnouncement, reorderAnnouncements, cleanupExpiredAnnouncements } = useStore();
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [showPreviewMobile, setShowPreviewMobile] = useState(false);
    const [activeEditorTab, setActiveEditorTab] = useState('content');

    useEffect(() => {
        cleanupExpiredAnnouncements();
    }, [cleanupExpiredAnnouncements]);

    const [newAnnouncement, setNewAnnouncement] = useState({
        title: '',
        tagline: '',
        date: new Date().toISOString().split('T')[0],
        content: '',
        image: '',
        imageTransform: { scale: 1, x: 0, y: 0 },
        link: '',
        buttonText: 'READ MORE',
        category: 'NEWS',
        priority: 'Normal',
        isPinned: false
    });

    const coreContentTabs = [
        { name: 'Upcoming', path: '/admin/upcoming-events', icon: Calendar, color: 'text-neon-green' },
        { name: 'Announcements', path: '/admin/announcements', icon: Radio, color: 'text-neon-pink' },
        { name: 'Blog', path: '/admin/blog', icon: FileText, color: 'text-neon-blue' },
        { name: 'Portfolio', path: '/admin/concertzone', icon: Music, color: 'text-neon-purple' },
    ];

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingId) {
                await updateAnnouncement(editingId, newAnnouncement);
            } else {
                await addAnnouncement(newAnnouncement);
                await notifyAllUsers(
                    `New Announcement: ${newAnnouncement.title}`,
                    newAnnouncement.content,
                    newAnnouncement.link,
                    newAnnouncement.image
                );
            }
            resetForm();
        } catch (error) {
            console.error("Broadcast failed:", error);
            useStore.getState().addToast("Broadcast failure.", 'error');
        }
    };
    const resetForm = () => {
        setActiveEditorTab('identity');
        setShowPreviewMobile(false);
        setIsAdding(false);
        setEditingId(null);
        setNewAnnouncement({
            title: '',
            tagline: '',
            date: new Date().toISOString().split('T')[0],
            content: '',
            image: '',
            imageTransform: { scale: 1, x: 0, y: 0 },
            link: '',
            buttonText: 'READ MORE',
            category: 'NEWS',
            priority: 'Normal',
            isPinned: false
        });
    };

    const handleEdit = (item) => {
        setNewAnnouncement({
            title: item.title || '',
            tagline: item.tagline || '',
            date: item.date || new Date().toISOString().split('T')[0],
            content: item.content || '',
            image: item.image || '',
            imageTransform: item.imageTransform || { scale: 1, x: 0, y: 0 },
            link: item.link || '',
            buttonText: item.buttonText || 'READ MORE',
            category: item.category || 'NEWS',
            priority: item.priority || 'Normal',
            isPinned: item.isPinned || false
        });
        setEditingId(item.id);
        setIsAdding(true);
        setActiveEditorTab('identity');
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
        <AdminCommunityHubLayout
            studioHeader={{
                title: "BROADCAST",
                subtitle: "MANAGER",
                accentClass: "text-neon-pink",
                icon: Megaphone
            }}
            tabs={coreContentTabs}
            accentColor="neon-pink"
            action={!isAdding && (
                <Button onClick={() => { setIsAdding(true); setActiveEditorTab('identity'); }} className="h-12 md:h-14 px-6 md:px-10 bg-neon-pink text-black font-black uppercase tracking-widest rounded-xl md:rounded-2xl shadow-[0_10px_30px_rgba(255,46,144,0.2)] w-full sm:w-auto">
                    <Plus className="mr-2" size={18} /> New Broadcast
                </Button>
            )}
        >
            <div className="relative z-10 max-w-[1400px] mx-auto px-4 md:px-8 pt-10">

                {/* Mobile Preview Toggle */}
                {isAdding && (
                    <div className="lg:hidden fixed bottom-6 right-6 z-[200]">
                        <button 
                            onClick={() => setShowPreviewMobile(!showPreviewMobile)}
                            className={cn(
                                "w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all border animate-in zoom-in duration-300",
                                showPreviewMobile ? "bg-white text-black border-white" : "bg-neon-pink text-black border-neon-pink"
                            )}
                        >
                            {showPreviewMobile ? <X size={24} /> : <Eye size={24} />}
                        </button>
                    </div>
                )}

                {/* Stats Bar */}
                {!isAdding && (
                    <div className="flex items-center gap-6 mb-10 overflow-x-auto pb-4 scrollbar-hide">
                        <div className="text-center shrink-0">
                            <p className="text-3xl font-black text-white font-heading leading-none">{announcements.length}</p>
                            <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mt-1">Total Signals</p>
                        </div>
                        <div className="w-px h-10 bg-white/5 shrink-0" />
                        <div className="text-center shrink-0">
                            <p className="text-3xl font-black text-neon-pink font-heading leading-none">{announcements.filter(a => a.isPinned).length}</p>
                            <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mt-1">Pinned</p>
                        </div>
                        <div className="w-px h-10 bg-white/5 shrink-0" />
                        <div className="text-center shrink-0">
                            <p className="text-3xl font-black text-white font-heading leading-none">{announcements.filter(a => a.priority === 'High').length}</p>
                            <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mt-1">High Priority</p>
                        </div>
                        <div className="w-px h-10 bg-white/5 shrink-0" />
                        <div className="text-center shrink-0">
                            <p className="text-3xl font-black text-neon-pink animate-pulse font-heading leading-none">{announcements.filter(a => a.priority === 'Critical').length}</p>
                            <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mt-1">Critical</p>
                        </div>
                    </div>
                )}

                {/* Content */}
                <div className="relative z-0">
                        {isAdding ? (
                            <div className="flex flex-col lg:flex-row gap-10 items-start pb-32">
                                <div className="flex-1 w-full relative">
                                    <AnimatePresence mode="wait">
                                        {showPreviewMobile ? (
                                            <motion.div key="mobile-preview" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="lg:hidden">
                                                <LivePreview type="announcement" data={newAnnouncement} hideDecorations={true} />
                                            </motion.div>
                                        ) : (
                                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="grid grid-cols-1 xl:grid-cols-12 gap-10">
                                                <div className="xl:col-span-7">
                                                    <Card className="p-6 md:p-10 bg-zinc-900/40 backdrop-blur-3xl border-white/5 rounded-[2.5rem] md:rounded-[3rem] overflow-hidden">
                                                        {/* Header */}
                                                        <div className="flex justify-between items-center mb-10">
                                                            <div className="space-y-1">
                                                                <h2 className="text-2xl font-black font-heading tracking-tighter uppercase italic text-white flex items-center gap-3 leading-none">
                                                                    BROADCAST <span className="text-neon-pink">ENGINE.</span>
                                                                </h2>
                                                                <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest pl-1">Configuration Terminal v2.0</p>
                                                            </div>
                                                            <button onClick={resetForm} className="px-4 py-2 rounded-xl bg-white/5 text-[10px] font-black text-gray-500 hover:text-white uppercase tracking-widest border border-white/5 transition-all">Abort</button>
                                                        </div>

                                                        {/* Tabs */}
                                                        <div className="flex gap-2 mb-12 p-1.5 bg-black/40 rounded-2xl border border-white/5 w-fit">
                                                            {['identity', 'content', 'media', 'deployment'].map((tab) => (
                                                                <button
                                                                    key={tab}
                                                                    onClick={() => setActiveEditorTab(tab)}
                                                                    className={cn(
                                                                        "px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                                                                        activeEditorTab === tab 
                                                                            ? "bg-neon-pink text-black shadow-[0_0_20px_rgba(255,46,144,0.3)]" 
                                                                            : "text-gray-500 hover:text-white hover:bg-white/5"
                                                                    )}
                                                                >
                                                                    {tab}
                                                                </button>
                                                            ))}
                                                        </div>

                                                        <form onSubmit={handleSubmit} className="space-y-10">
                                                            <AnimatePresence mode="wait">
                                                                {activeEditorTab === 'identity' && (
                                                                    <motion.div key="identity" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-8">
                                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                                            <div className="space-y-3">
                                                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Headline</label>
                                                                                <Input placeholder="ENTER HEADLINE..." value={newAnnouncement.title} onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })} required className="h-16 bg-black/50 border-white/5 rounded-2xl uppercase text-[10px] font-black tracking-widest px-6" />
                                                                            </div>
                                                                            <div className="space-y-3">
                                                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Tagline (Optional)</label>
                                                                                <Input placeholder="BRIEF HOOK..." value={newAnnouncement.tagline} onChange={(e) => setNewAnnouncement({ ...newAnnouncement, tagline: e.target.value })} className="h-16 bg-black/50 border-white/5 rounded-2xl uppercase text-[10px] font-black tracking-widest px-6" />
                                                                            </div>
                                                                        </div>
                                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                                            <div className="space-y-3">
                                                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Category</label>
                                                                                <select 
                                                                                    value={newAnnouncement.category} 
                                                                                    onChange={(e) => setNewAnnouncement({ ...newAnnouncement, category: e.target.value })}
                                                                                    className="w-full h-16 bg-black/50 border border-white/5 rounded-2xl text-[10px] font-black tracking-widest px-6 text-white uppercase appearance-none focus:outline-none focus:border-neon-pink/30"
                                                                                >
                                                                                    {['NEWS', 'UPDATE', 'ALERT', 'EVENT', 'OPPORTUNITY'].map(cat => (
                                                                                        <option key={cat} value={cat}>{cat}</option>
                                                                                    ))}
                                                                                </select>
                                                                            </div>
                                                                            <div className="space-y-3">
                                                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Release Date</label>
                                                                                <Input type="date" value={newAnnouncement.date} onChange={(e) => setNewAnnouncement({ ...newAnnouncement, date: e.target.value })} required className="h-16 bg-black/50 border-white/5 rounded-2xl text-[10px] font-black tracking-widest px-6" />
                                                                            </div>
                                                                        </div>
                                                                    </motion.div>
                                                                )}

                                                                {activeEditorTab === 'content' && (
                                                                    <motion.div key="content" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-6">
                                                                        <div className="space-y-3">
                                                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Message Body</label>
                                                                            <textarea 
                                                                                className="w-full bg-black/50 border border-white/5 rounded-[2.5rem] p-8 text-sm font-medium text-gray-300 focus:outline-none focus:border-neon-pink/30 transition-all min-h-[300px] resize-none shadow-inner custom-scrollbar" 
                                                                                placeholder="CRAFT THE SIGNAL..." 
                                                                                value={newAnnouncement.content} 
                                                                                onChange={(e) => setNewAnnouncement({ ...newAnnouncement, content: e.target.value })} 
                                                                                required 
                                                                            />
                                                                        </div>
                                                                    </motion.div>
                                                                )}

                                                                {activeEditorTab === 'media' && (
                                                                    <motion.div key="media" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-8">
                                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                                            <div className="space-y-3">
                                                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Hero Asset (URL)</label>
                                                                                <Input placeholder="HTTPS://..." value={newAnnouncement.image} onChange={(e) => setNewAnnouncement({ ...newAnnouncement, image: e.target.value })} className="h-16 bg-black/50 border-white/5 rounded-2xl text-[10px] font-black tracking-widest px-6" />
                                                                            </div>
                                                                            <div className="space-y-3">
                                                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">CTA Action Text</label>
                                                                                <Input placeholder="READ MORE..." value={newAnnouncement.buttonText} onChange={(e) => setNewAnnouncement({ ...newAnnouncement, buttonText: e.target.value })} className="h-16 bg-black/50 border-white/5 rounded-2xl uppercase text-[10px] font-black tracking-widest px-6" />
                                                                            </div>
                                                                        </div>

                                                                        {/* Visual Calibration */}
                                                                        <div className="bg-white/5 p-8 rounded-3xl border border-white/5 space-y-6">
                                                                            <div className="flex justify-between items-center mb-4">
                                                                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-neon-pink">Visual Calibration</h4>
                                                                                <button 
                                                                                    type="button"
                                                                                    onClick={() => setNewAnnouncement({ 
                                                                                        ...newAnnouncement, 
                                                                                        imageTransform: { scale: 1, x: 0, y: 0 } 
                                                                                    })}
                                                                                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/5 text-[8px] font-black uppercase tracking-widest text-gray-500 hover:text-neon-pink hover:bg-neon-pink/5 hover:border-neon-pink/20 transition-all"
                                                                                >
                                                                                    <RotateCcw size={10} />
                                                                                    Reset
                                                                                </button>
                                                                            </div>
                                                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                                                                {[
                                                                                    { label: 'Scale', key: 'scale', min: 1, max: 3, step: 0.01, unit: 'x' },
                                                                                    { label: 'X-Position', key: 'x', min: -100, max: 100, step: 1, unit: '%' },
                                                                                    { label: 'Y-Position', key: 'y', min: -100, max: 100, step: 1, unit: '%' }
                                                                                ].map(adjust => (
                                                                                    <div key={adjust.key} className="space-y-3">
                                                                                        <div className="flex justify-between">
                                                                                            <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">{adjust.label}</span>
                                                                                            <span className="text-[8px] font-black text-white">{newAnnouncement.imageTransform?.[adjust.key].toFixed(adjust.step < 1 ? 2 : 0)}{adjust.unit}</span>
                                                                                        </div>
                                                                                        <input type="range" min={adjust.min} max={adjust.max} step={adjust.step} value={newAnnouncement.imageTransform?.[adjust.key]} onChange={(e) => setNewAnnouncement({ ...newAnnouncement, imageTransform: { ...newAnnouncement.imageTransform, [adjust.key]: parseFloat(e.target.value) } })} className="w-full h-1 rounded-full appearance-none cursor-pointer bg-white/10 accent-neon-pink" />
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        </div>

                                                                        <div className="space-y-3">
                                                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Target Link (External or Relative)</label>
                                                                            <Input placeholder="HTTPS://..." value={newAnnouncement.link} onChange={(e) => setNewAnnouncement({ ...newAnnouncement, link: e.target.value })} className="h-16 bg-black/50 border-white/5 rounded-2xl text-[10px] font-black tracking-widest px-6" />
                                                                        </div>
                                                                    </motion.div>
                                                                )}

                                                                {activeEditorTab === 'deployment' && (
                                                                    <motion.div key="deployment" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-8">
                                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                                            <div className="space-y-3">
                                                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Broadcast Priority</label>
                                                                                <select 
                                                                                    value={newAnnouncement.priority} 
                                                                                    onChange={(e) => setNewAnnouncement({ ...newAnnouncement, priority: e.target.value })}
                                                                                    className="w-full h-16 bg-black/50 border border-white/5 rounded-2xl text-[10px] font-black tracking-widest px-6 text-white uppercase appearance-none focus:outline-none focus:border-neon-pink/30"
                                                                                >
                                                                                    {['Normal', 'High', 'Critical'].map(p => (
                                                                                        <option key={p} value={p}>{p}</option>
                                                                                    ))}
                                                                                </select>
                                                                            </div>
                                                                            <div className="pt-7">
                                                                                <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/10 group cursor-pointer hover:bg-white/10 transition-all" onClick={() => setNewAnnouncement({ ...newAnnouncement, isPinned: !newAnnouncement.isPinned })}>
                                                                                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-all", newAnnouncement.isPinned ? "bg-neon-pink text-black shadow-[0_0_15px_rgba(255,46,144,0.4)]" : "bg-black text-gray-500")}>
                                                                                        <Pin size={18} className={newAnnouncement.isPinned ? "fill-current" : ""} />
                                                                                    </div>
                                                                                    <div className="flex-1">
                                                                                        <p className="text-[10px] font-black uppercase tracking-widest text-white leading-none mb-1">ANCHOR SIGNAL</p>
                                                                                        <p className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">Pin to global dashboard</p>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                        
                                                                        <div className="p-6 rounded-2xl bg-zinc-950 border border-white/5 space-y-4">
                                                                            <div className="flex items-center gap-3">
                                                                                <Sparkles size={14} className="text-neon-pink" />
                                                                                <h4 className="text-[10px] font-black text-white uppercase tracking-widest">Transmission Policy</h4>
                                                                            </div>
                                                                            <p className="text-[9px] font-medium text-gray-500 leading-relaxed uppercase tracking-widest">Deploying this broadcast will automatically trigger in-app notifications and background synchronization across all active nodes.</p>
                                                                        </div>
                                                                    </motion.div>
                                                                )}
                                                            </AnimatePresence>

                                                            <div className="flex flex-col sm:flex-row gap-4 pt-10 border-t border-white/5">
                                                                <button 
                                                                    type="button" 
                                                                    onClick={() => {
                                                                        const tabs = ['identity', 'content', 'media', 'deployment'];
                                                                        const currentIndex = tabs.indexOf(activeEditorTab);
                                                                        if (currentIndex > 0) setActiveEditorTab(tabs[currentIndex - 1]);
                                                                        else resetForm();
                                                                    }} 
                                                                    className="h-16 px-12 rounded-2xl bg-white/5 border border-white/5 text-gray-500 hover:text-white hover:bg-white/10 transition-all font-black uppercase tracking-widest text-[10px] flex-1"
                                                                >
                                                                    {activeEditorTab === 'identity' ? 'Abort' : 'Back'}
                                                                </button>
                                                                <Button 
                                                                    type={activeEditorTab === 'deployment' ? 'submit' : 'button'}
                                                                    onClick={() => {
                                                                        if (activeEditorTab !== 'deployment') {
                                                                            const tabs = ['identity', 'content', 'media', 'deployment'];
                                                                            const currentIndex = tabs.indexOf(activeEditorTab);
                                                                            setActiveEditorTab(tabs[currentIndex + 1]);
                                                                        }
                                                                    }}
                                                                    className="h-14 px-12 sm:px-24 bg-neon-pink text-black font-black uppercase tracking-widest rounded-2xl shadow-[0_15px_40px_rgba(255,46,144,0.3)] text-[11px] hover:scale-105 active:scale-95 transition-all w-full sm:w-auto"
                                                                >
                                                                    {activeEditorTab === 'deployment' ? (editingId ? 'COMMIT CHANGES' : 'DEPLOY BROADCAST') : 'Next Component'}
                                                                </Button>
                                                            </div>
                                                        </form>
                                                    </Card>
                                                </div>

                                                <div className="xl:col-span-5 hidden xl:block sticky top-12">
                                                    <div className="space-y-6">
                                                        <div className="flex items-center justify-between">
                                                            <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] flex items-center gap-3">
                                                                <div className="w-8 h-px bg-white/10" /> REAL-TIME ECHO
                                                            </h3>
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-neon-pink animate-pulse" />
                                                                <span className="text-[8px] font-black text-neon-pink uppercase tracking-widest">Live Link Active</span>
                                                            </div>
                                                        </div>
                                                        <LivePreview type="announcement" data={newAnnouncement} hideDecorations={true} />
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6">
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
                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-20">
                                        <AnimatePresence mode="popLayout">
                                        {announcements.map((item, index) => {
                                            return (
                                                <motion.div
                                                    key={item.id}
                                                    layout
                                                    initial={{ opacity: 0, scale: 0.92 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    exit={{ opacity: 0, scale: 0.92 }}
                                                    transition={{ duration: 0.4 }}
                                                    className={cn(
                                                        "group relative aspect-[4/5] rounded-[2.5rem] overflow-hidden bg-zinc-950 border border-white/5 hover:border-neon-pink/20 transition-all duration-500 shadow-[0_20px_60px_rgba(0,0,0,0.5)]",
                                                        item.isPinned && "border-neon-pink/40 shadow-[0_0_30px_rgba(255,46,144,0.1)]"
                                                    )}
                                                >
                                                    {/* Background Image */}
                                                    <div className="absolute inset-0 z-0">
                                                        {item.image ? (
                                                            <div
                                                                className="absolute inset-0 bg-cover transition-transform duration-700 group-hover:scale-110"
                                                                style={{
                                                                    backgroundImage: `url(${item.image})`,
                                                                    transform: `scale(${item.imageTransform?.scale || 1})`,
                                                                    backgroundPosition: `calc(50% + ${(item.imageTransform?.x || 0)}%) calc(50% + ${(item.imageTransform?.y || 0)}%)`
                                                                }}
                                                            />
                                                        ) : (
                                                            <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
                                                                <Megaphone size={40} className="text-gray-800" />
                                                            </div>
                                                        )}
                                                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/10 z-10" />
                                                        <div className="absolute inset-0 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-700"
                                                            style={{ background: 'radial-gradient(ellipse at bottom, rgba(255,46,144,0.1) 0%, transparent 70%)' }} />
                                                    </div>

                                                    {/* Top Toolbar */}
                                                    <div className="absolute top-5 left-5 right-5 z-30 flex justify-between items-start opacity-0 group-hover:opacity-100 -translate-y-2 group-hover:translate-y-0 transition-all duration-400">
                                                        <div className="flex gap-2">
                                                            <button onClick={() => handleMoveUp(index)} disabled={index === 0}
                                                                className="w-9 h-9 rounded-xl bg-black/70 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-neon-pink hover:text-black transition-all disabled:opacity-0">
                                                                <ChevronUp size={16} />
                                                            </button>
                                                            <button onClick={() => handleMoveDown(index)} disabled={index === announcements.length - 1}
                                                                className="w-9 h-9 rounded-xl bg-black/70 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-neon-pink hover:text-black transition-all disabled:opacity-0">
                                                                <ChevronDown size={16} />
                                                            </button>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => {
                                                                    const params = new URLSearchParams({
                                                                        subject: `[${item.category || 'BROADCAST'}] ${item.title}`,
                                                                        header: item.title,
                                                                        body: item.content,
                                                                        heroImage: item.image || '',
                                                                        ctaText: item.buttonText || 'READ MORE',
                                                                        ctaUrl: item.link || `${window.location.origin}/announcements`
                                                                    });
                                                                    window.location.href = `/admin/mailing?${params.toString()}`;
                                                                }}
                                                                className="w-9 h-9 rounded-xl bg-black/70 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-neon-green hover:text-black transition-all"
                                                                title="Email Blast"
                                                            >
                                                                <Mail size={15} />
                                                            </button>
                                                            <button
                                                                onClick={async () => {
                                                                    if (window.confirm(`Retransmit broadcast signal for "${item.title}"?`)) {
                                                                        await notifyAllUsers(item.title, item.content, item.link || `/announcements`, item.image);
                                                                        useStore.getState().addToast("SIGNAL_TRANSMITTED.", 'error');
                                                                    }
                                                                }}
                                                                className="w-9 h-9 rounded-xl bg-neon-pink/20 backdrop-blur-md border border-neon-pink/30 flex items-center justify-center text-neon-pink hover:bg-neon-pink hover:text-black transition-all"
                                                                title="Push Signal"
                                                            >
                                                                <Sparkles size={15} />
                                                            </button>
                                                            <button onClick={() => handleEdit(item)}
                                                                className="w-9 h-9 rounded-xl bg-black/70 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-neon-pink hover:text-black transition-all">
                                                                <Edit size={15} />
                                                            </button>
                                                            <button onClick={() => deleteAnnouncement(item.id)}
                                                                className="w-9 h-9 rounded-xl bg-black/70 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-red-500 transition-all">
                                                                <Trash2 size={15} />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* PIN Indicator */}
                                                    {item.isPinned && (
                                                        <div className="absolute top-5 left-1/2 -translate-x-1/2 z-30">
                                                            <div className="px-3 py-1.5 rounded-full bg-neon-pink/20 backdrop-blur-md border border-neon-pink/40 flex items-center gap-2">
                                                                <Pin size={10} className="text-neon-pink fill-current" />
                                                                <span className="text-[8px] font-black text-neon-pink uppercase tracking-widest">Anchored</span>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Bottom Content Slab */}
                                                    <div className="absolute inset-x-6 bottom-6 z-20 space-y-3">
                                                        <div className="flex flex-wrap gap-2">
                                                            <span className="px-2.5 py-1 text-[7px] font-black uppercase tracking-widest border border-white/20 bg-white/5 rounded-full backdrop-blur-md text-white/70">
                                                                {item.category || 'BROADCAST'}
                                                            </span>
                                                            {item.priority !== 'Normal' && (
                                                                <span className={cn(
                                                                    "px-2.5 py-1 text-[7px] font-black uppercase tracking-widest border rounded-full backdrop-blur-md",
                                                                    item.priority === 'Critical' ? "bg-red-500/10 border-red-500/30 text-red-500 animate-pulse" : "bg-yellow-500/10 border-yellow-500/30 text-yellow-500"
                                                                )}>
                                                                    {item.priority}
                                                                </span>
                                                            )}
                                                        </div>

                                                        <h3 className="text-xl font-black font-heading tracking-tight uppercase italic text-white group-hover:text-neon-pink transition-colors duration-500 leading-tight line-clamp-2">
                                                            {item.title}
                                                        </h3>

                                                        <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
                                                            <div className="flex items-center gap-1.5">
                                                                <Clock size={10} className="text-white/30" />
                                                                <span className="text-[8px] font-black text-white/40 uppercase tracking-widest">{item.date}</span>
                                                            </div>
                                                            <button 
                                                                onClick={() => togglePinAnnouncement(item.id)}
                                                                className={cn(
                                                                    "p-2 rounded-lg transition-all",
                                                                    item.isPinned ? "text-neon-pink" : "text-white/20 hover:text-white"
                                                                )}
                                                            >
                                                                <Pin size={12} className={item.isPinned ? "fill-current" : ""} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            );
                                        })}
                                        </AnimatePresence>
                                    </div>
                                )}
                            </div>
                        )}
                </div>

            </div>
        </AdminCommunityHubLayout>
    );
};

export default AnnouncementsManager;
