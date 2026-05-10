import React, { useState } from 'react';
import Plus from 'lucide-react/dist/esm/icons/plus';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import Edit from 'lucide-react/dist/esm/icons/edit';
import Upload from 'lucide-react/dist/esm/icons/upload';
import Loader from 'lucide-react/dist/esm/icons/loader';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import ChevronUp from 'lucide-react/dist/esm/icons/chevron-up';
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down';
import X from 'lucide-react/dist/esm/icons/x';
import Clock from 'lucide-react/dist/esm/icons/clock';
import ImageIcon from 'lucide-react/dist/esm/icons/image';
import Music from 'lucide-react/dist/esm/icons/music';
import Calendar from 'lucide-react/dist/esm/icons/calendar';
import Radio from 'lucide-react/dist/esm/icons/radio';
import FileText from 'lucide-react/dist/esm/icons/file-text';
import Eye from 'lucide-react/dist/esm/icons/eye';
import EyeOff from 'lucide-react/dist/esm/icons/eye-off';
import RotateCcw from 'lucide-react/dist/esm/icons/rotate-ccw';
import { useStore } from '../../lib/store';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import LivePreview from '../../components/admin/LivePreview';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import AdminCommunityHubLayout from '../../components/admin/AdminCommunityHubLayout';
import StudioDatePicker from '../../components/ui/StudioDatePicker';

const coreContentTabs = [
    { name: 'Upcoming', path: '/admin/upcoming-events', icon: Calendar, color: 'text-neon-green' },
    { name: 'Announcements', path: '/admin/announcements', icon: Radio, color: 'text-neon-pink' },
    { name: 'Blog', path: '/admin/blog', icon: FileText, color: 'text-neon-blue' },
    { name: 'Portfolio', path: '/admin/concertzone', icon: Music, color: 'text-neon-purple' },
];

const ConcertManager = () => {
    const { portfolio, addPortfolioItem, updatePortfolioItem, deletePortfolioItem, updatePortfolioOrder, portfolioCategories, addCategory, deleteCategory } = useStore();
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [showCategoryManager, setShowCategoryManager] = useState(false);
    const [filterCategory, setFilterCategory] = useState('all');
    const [showPreviewMobile, setShowPreviewMobile] = useState(false);

    const [newPortfolio, setNewPortfolio] = useState({
        title: '', date: '', category: '', image: '', highlightUrl: '',
        imageTransform: { scale: 1, x: 0, y: 0 },
        year: new Date().getFullYear(),
        sector: ''
    });

    const resetForms = () => {
        setNewPortfolio({ title: '', date: '', category: '', image: '', highlightUrl: '', imageTransform: { scale: 1, x: 0, y: 0 }, year: new Date().getFullYear(), sector: '' });
        setIsAdding(false); setEditingId(null); setSelectedFile(null); setUploading(false); setShowPreviewMobile(false);
    };

    const handleEdit = (item) => { setEditingId(item.id); setIsAdding(true); setSelectedFile(null); setNewPortfolio({ ...item }); setShowPreviewMobile(false); };

    const moveItem = async (index, direction) => {
        const newItems = [...portfolio];
        if (direction === 'up' && index > 0) [newItems[index], newItems[index - 1]] = [newItems[index - 1], newItems[index]];
        else if (direction === 'down' && index < newItems.length - 1) [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
        else return;
        await updatePortfolioOrder(newItems);
    };

    const handleFileUpload = async (file) => {
        if (!file) return null;
        const data = new FormData();
        data.append('file', file); data.append('upload_preset', 'maw1e4ud'); data.append('cloud_name', 'dgtalrz4n');
        const res = await fetch('https://api.cloudinary.com/v1_1/dgtalrz4n/image/upload', { method: 'POST', body: data });
        return (await res.json()).secure_url;
    };

    const handleSave = async (e) => {
        e.preventDefault(); setUploading(true);
        try {
            let imageUrl = newPortfolio.image;
            if (selectedFile) imageUrl = await handleFileUpload(selectedFile);
            const data = { ...newPortfolio, image: imageUrl };
            if (!data.category && portfolioCategories.length > 0) data.category = portfolioCategories[0].id;
            if (editingId) await updatePortfolioItem(editingId, data);
            else await addPortfolioItem({ id: `p-${Date.now()}`, ...data });
            resetForms();
        } catch { useStore.getState().addToast('Storage error.', 'error'); }
        finally { setUploading(false); }
    };

    const handleAddCategory = async (e) => {
        e.preventDefault();
        if (!newCategoryName.trim()) return;
        try { await addCategory(newCategoryName.trim()); setNewCategoryName(''); }
        catch { useStore.getState().addToast('Category sync failure.', 'error'); }
    };

    const filtered = filterCategory === 'all' ? portfolio : portfolio.filter(i => i.category === filterCategory);

    return (
        <AdminCommunityHubLayout
            studioHeader={{ title: 'PORTFOLIO', subtitle: 'MANAGER', accentClass: 'text-neon-purple', icon: Music }}
            tabs={coreContentTabs}
            accentColor="neon-purple"
            action={!isAdding && (
                <div className="flex flex-wrap gap-3">
                    <button
                        onClick={() => setShowCategoryManager(!showCategoryManager)}
                        className={cn('h-12 px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all',
                            showCategoryManager ? 'bg-white text-black border-white' : 'bg-white/5 text-white border-white/10 hover:bg-white/10')}
                    >
                        {showCategoryManager ? 'Hide' : 'Categories'}
                    </button>
                    <Button onClick={() => { setIsAdding(true); setEditingId(null); setNewPortfolio({ title: '', date: '', category: '', image: '', highlightUrl: '', imageTransform: { scale: 1, x: 0, y: 0 } }); }}
                        className="h-12 px-8 bg-neon-purple text-black font-black uppercase tracking-widest rounded-2xl shadow-[0_0_30px_rgba(168,85,247,0.2)] hover:scale-105 active:scale-95 transition-all">
                        <Plus size={16} className="mr-2" /> New Entry
                    </Button>
                </div>
            )}
        >
            {/* Mobile Preview Toggle */}
            {isAdding && (
                <div className="lg:hidden fixed bottom-6 right-6 z-[200]">
                    <button 
                        onClick={() => setShowPreviewMobile(!showPreviewMobile)}
                        className={cn(
                            "w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all border animate-in zoom-in duration-300",
                            showPreviewMobile ? "bg-white text-black border-white" : "bg-neon-purple text-black border-neon-purple"
                        )}
                    >
                        {showPreviewMobile ? <X size={24} /> : <Eye size={24} />}
                    </button>
                </div>
            )}
            <div className="relative z-10 max-w-[1400px] mx-auto px-4 md:px-8 pt-10 pb-20">

                {/* ── Category Manager ── */}
                <AnimatePresence>
                    {showCategoryManager && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-10 overflow-hidden">
                            <Card className="p-6 md:p-8 bg-zinc-900/40 backdrop-blur-3xl border-white/5 rounded-[2rem]">
                                <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] mb-6 flex items-center gap-3">
                                    <div className="w-8 h-px bg-neon-green/40" /> SECTOR REGISTRY
                                </h3>
                                <form onSubmit={handleAddCategory} className="flex gap-4 mb-6">
                                    <Input placeholder="NEW SECTOR NAME" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)}
                                        className="h-12 bg-black/50 border-white/5 rounded-xl uppercase text-[10px] font-black tracking-widest flex-1 focus:border-neon-purple/30" />
                                    <Button type="submit" className="h-12 px-8 bg-neon-purple text-black font-black uppercase tracking-widest rounded-xl">Add</Button>
                                </form>
                                <div className="flex flex-wrap gap-3">
                                    {portfolioCategories.map(cat => (
                                        <div key={cat.id} className="group flex items-center gap-3 bg-black/30 border border-white/5 px-5 py-2.5 rounded-xl hover:border-neon-green/20 transition-all">
                                            <span className="text-[10px] font-black text-white uppercase tracking-widest">{cat.label}</span>
                                            <button onClick={() => deleteCategory(cat.id)} className="text-gray-700 group-hover:text-red-500 transition-colors"><X size={12} /></button>
                                        </div>
                                    ))}
                                    {portfolioCategories.length === 0 && <p className="text-[10px] font-black text-gray-700 uppercase tracking-widest">No sectors defined.</p>}
                                </div>
                            </Card>
                        </motion.div>
                    )}
                </AnimatePresence>

                <AnimatePresence mode="wait">
                    {isAdding ? (
                        /* ── Editor ── */
                        <motion.div key="editor" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}
                            className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                            <div className="lg:col-span-7 w-full">
                                <AnimatePresence mode="wait">
                                    {showPreviewMobile ? (
                                        <motion.div key="mobile-preview" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="lg:hidden">
                                            <LivePreview type="portfolio" categories={portfolioCategories} data={{ ...newPortfolio, image: selectedFile ? URL.createObjectURL(selectedFile) : newPortfolio.image }} />
                                        </motion.div>
                                    ) : (
                                        <Card className="p-8 md:p-10 bg-zinc-900/40 backdrop-blur-3xl border-white/5 rounded-[2.5rem]">
                                    <div className="flex justify-between items-center mb-10">
                                        <h2 className="text-xl font-black font-heading tracking-tighter uppercase italic text-white flex items-center gap-3">
                                            <Sparkles className="text-neon-purple" size={22} /> {editingId ? 'EDIT' : 'NEW'} RECORD
                                        </h2>
                                        <button onClick={resetForms} className="text-[10px] font-black text-gray-500 hover:text-white uppercase tracking-widest">Discard</button>
                                    </div>

                                    <form onSubmit={handleSave} className="space-y-8">
                                        {/* Title */}
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Event Reference</label>
                                            <Input placeholder="ENTER EVENT TITLE..." value={newPortfolio.title}
                                                onChange={e => setNewPortfolio({ ...newPortfolio, title: e.target.value })} required
                                                className="h-14 bg-black/50 border-white/5 rounded-2xl uppercase text-[10px] font-black tracking-widest focus:border-neon-purple/30 px-6" />
                                        </div>

                                        {/* Date + Category + Year */}
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Event Date</label>
                                                <StudioDatePicker
                                                    value={newPortfolio.date && (newPortfolio.date.seconds ? new Date(newPortfolio.date.seconds * 1000).toISOString().split('T')[0] : (typeof newPortfolio.date === 'string' ? newPortfolio.date.split('T')[0] : new Date(newPortfolio.date).toISOString().split('T')[0]))}
                                                    onChange={val => setNewPortfolio({ ...newPortfolio, date: val })}
                                                    className="h-14"
                                                    placeholder="SELECT EVENT DATE..."
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Sector</label>
                                                <select value={newPortfolio.category} onChange={e => setNewPortfolio({ ...newPortfolio, category: e.target.value })}
                                                    className="w-full h-14 bg-black/50 border border-white/5 rounded-2xl px-6 text-[11px] font-black uppercase tracking-widest text-white focus:outline-none focus:border-neon-purple/30 appearance-none cursor-pointer">
                                                    <option value="" className="bg-zinc-900">SELECT SECTOR...</option>
                                                    {portfolioCategories.map(cat => <option key={cat.id} value={cat.id} className="bg-zinc-900">{cat.label.toUpperCase()}</option>)}
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Project Year</label>
                                                <Input type="number" placeholder="2024" value={newPortfolio.year || ''}
                                                    onChange={e => setNewPortfolio({ ...newPortfolio, year: parseInt(e.target.value) || '' })}
                                                    className="h-14 bg-black/50 border-white/5 rounded-2xl text-[10px] font-black tracking-widest px-6" />
                                            </div>
                                        </div>

                                        {/* Image */}
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Portfolio Image</label>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div className="md:col-span-2">
                                                    <Input placeholder="HTTPS://..." value={newPortfolio.image} onChange={e => setNewPortfolio({ ...newPortfolio, image: e.target.value })}
                                                        className="h-14 bg-black/50 border-white/5 rounded-2xl text-[10px] font-black px-6" />
                                                </div>
                                                <div className="relative group cursor-pointer">
                                                    <input type="file" accept="image/*" onChange={e => setSelectedFile(e.target.files[0])} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                                                    <div className="h-14 border-2 border-dashed border-white/5 rounded-2xl flex items-center justify-center gap-2 bg-black/20 group-hover:border-neon-purple/30 transition-all">
                                                        <Upload className="text-gray-500 group-hover:text-neon-purple" size={16} />
                                                        <span className="text-[8px] font-black text-gray-500 group-hover:text-white uppercase tracking-widest">{selectedFile ? 'READY' : 'UPLOAD'}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Image Calibration */}
                                            <div className="bg-white/[0.03] p-6 rounded-2xl border border-white/5 space-y-5">
                                                <div className="flex justify-between items-center mb-4">
                                                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-neon-purple">Visual Calibration</h4>
                                                    <button 
                                                        type="button"
                                                        onClick={() => setNewPortfolio({ 
                                                            ...newPortfolio, 
                                                            imageTransform: { scale: 1, x: 0, y: 0 } 
                                                        })}
                                                        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/5 text-[8px] font-black uppercase tracking-widest text-gray-500 hover:text-neon-purple hover:bg-neon-purple/5 hover:border-neon-purple/20 transition-all"
                                                    >
                                                        <RotateCcw size={10} />
                                                        Reset
                                                    </button>
                                                </div>
                                                <div className="grid grid-cols-3 gap-6">
                                                    {[
                                                        { label: 'Scale', key: 'scale', min: 1, max: 3, step: 0.01, unit: 'x', format: v => v.toFixed(2) },
                                                        { label: 'X-Pos', key: 'x', min: -100, max: 100, step: 1, unit: '%', format: v => v },
                                                        { label: 'Y-Pos', key: 'y', min: -100, max: 100, step: 1, unit: '%', format: v => v },
                                                    ].map(({ label, key, min, max, step, unit, format }) => (
                                                        <div key={key} className="space-y-2">
                                                            <div className="flex justify-between">
                                                                <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">{label}</span>
                                                                <span className="text-[8px] font-black text-white">{format(newPortfolio.imageTransform?.[key] ?? (key === 'scale' ? 1 : 0))}{unit}</span>
                                                            </div>
                                                            <input type="range" min={min} max={max} step={step}
                                                                value={newPortfolio.imageTransform?.[key] ?? (key === 'scale' ? 1 : 0)}
                                                                onChange={e => setNewPortfolio({ ...newPortfolio, imageTransform: { ...newPortfolio.imageTransform, [key]: parseFloat(e.target.value) } })}
                                                                className="w-full accent-neon-purple bg-white/10 h-1 rounded-full appearance-none cursor-pointer" />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Reel URL */}
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Highlight Reel URL (Optional)</label>
                                            <Input placeholder="HTTPS://WWW.INSTAGRAM.COM/REEL/..." value={newPortfolio.highlightUrl || ''}
                                                onChange={e => setNewPortfolio({ ...newPortfolio, highlightUrl: e.target.value })}
                                                className="h-14 bg-black/50 border-white/5 rounded-2xl text-[10px] font-black px-6" />
                                        </div>

                                        <div className="flex gap-4 pt-6 border-t border-white/10">
                                            <Button type="button" variant="outline" onClick={resetForms} className="h-14 px-8 flex-1 rounded-2xl border-white/10 text-gray-400 font-black uppercase tracking-widest text-[10px]">Abort</Button>
                                            <Button type="submit" disabled={uploading} className="h-14 px-10 flex-[2] bg-neon-purple text-black font-black uppercase tracking-widest rounded-2xl shadow-xl text-[10px] hover:scale-105 active:scale-95 transition-all">
                                                {uploading ? <Loader className="animate-spin mr-2" size={16} /> : (editingId ? 'UPDATE RECORD' : 'SAVE RECORD')}
                                            </Button>
                                        </div>
                                    </form>
                                </Card>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Live Preview */}
                            <div className="lg:col-span-5 hidden lg:block lg:sticky lg:top-32">
                                <LivePreview type="portfolio" categories={portfolioCategories}
                                    data={{ ...newPortfolio, image: selectedFile ? URL.createObjectURL(selectedFile) : newPortfolio.image }} />
                            </div>
                        </motion.div>
                    ) : (
                        /* ── Grid ── */
                        <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            {/* Stats + Filter bar */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
                                <div className="flex items-center gap-6">
                                    <div className="text-center">
                                        <p className="text-3xl font-black text-white font-heading">{portfolio.length}</p>
                                        <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Total Records</p>
                                    </div>
                                    <div className="w-px h-10 bg-white/5" />
                                    <div className="text-center">
                                        <p className="text-3xl font-black text-neon-purple font-heading">{portfolioCategories.length}</p>
                                        <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Sectors</p>
                                    </div>
                                </div>

                                {/* Category Filter */}
                                <div className="flex gap-2 flex-wrap">
                                    <button onClick={() => setFilterCategory('all')}
                                        className={cn('px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all',
                                            filterCategory === 'all' ? 'bg-white text-black border-white' : 'bg-white/5 text-gray-400 border-white/10 hover:text-white')}>
                                        All
                                    </button>
                                    {portfolioCategories.map(cat => (
                                        <button key={cat.id} onClick={() => setFilterCategory(cat.id)}
                                            className={cn('px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all',
                                                filterCategory === cat.id ? 'bg-neon-purple text-black border-neon-purple' : 'bg-white/5 text-gray-400 border-white/10 hover:text-white')}>
                                            {cat.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <AnimatePresence mode="popLayout">
                                    {filtered.map((item, index) => (
                                        <motion.div key={item.id} layout
                                            initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.92 }}
                                            transition={{ duration: 0.4 }}
                                            className="group relative aspect-[4/5] rounded-[2.5rem] overflow-hidden bg-zinc-950 border border-white/5 hover:border-neon-purple/20 transition-all duration-500 shadow-[0_20px_60px_rgba(0,0,0,0.4)]"
                                        >
                                            {/* Image */}
                                            <div className="absolute inset-0 z-0">
                                                {item.image ? (
                                                    <div className="absolute inset-0 bg-cover transition-transform duration-700 group-hover:scale-110"
                                                        style={{
                                                            backgroundImage: `url(${item.image})`,
                                                            transform: `scale(${item.imageTransform?.scale || 1})`,
                                                            backgroundPosition: `calc(50% + ${(item.imageTransform?.x || 0)}%) calc(50% + ${(item.imageTransform?.y || 0)}%)`
                                                        }} />
                                                ) : (
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                        <ImageIcon size={40} className="text-gray-800" />
                                                    </div>
                                                )}
                                                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/10 z-10" />
                                                <div className="absolute inset-0 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-700"
                                                    style={{ background: 'radial-gradient(ellipse at bottom, rgba(168,85,247,0.07) 0%, transparent 70%)' }} />
                                            </div>

                                            {/* Top toolbar — appears on hover */}
                                            <div className="absolute top-5 left-5 right-5 z-30 flex justify-between items-center opacity-0 group-hover:opacity-100 -translate-y-2 group-hover:translate-y-0 transition-all duration-400">
                                                <div className="flex gap-2">
                                                    <button onClick={() => moveItem(index, 'up')} disabled={index === 0}
                                                        className="w-9 h-9 rounded-xl bg-black/70 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-neon-purple hover:text-black transition-all disabled:opacity-0">
                                                        <ChevronUp size={16} />
                                                    </button>
                                                    <button onClick={() => moveItem(index, 'down')} disabled={index === portfolio.length - 1}
                                                        className="w-9 h-9 rounded-xl bg-black/70 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-neon-purple hover:text-black transition-all disabled:opacity-0">
                                                        <ChevronDown size={16} />
                                                    </button>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button onClick={() => handleEdit(item)}
                                                        className="w-9 h-9 rounded-xl bg-black/70 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-neon-purple hover:text-black transition-all">
                                                        <Edit size={16} />
                                                    </button>
                                                    <button onClick={() => deletePortfolioItem(item.id)}
                                                        className="w-9 h-9 rounded-xl bg-black/70 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-red-500 transition-all">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Category badge */}
                                            <div className="absolute top-5 left-1/2 -translate-x-1/2 z-30 opacity-0 group-hover:opacity-100 transition-all duration-400">
                                                <span className="px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-neon-purple/20 text-[8px] font-black uppercase tracking-widest text-neon-purple whitespace-nowrap">
                                                    {portfolioCategories.find(c => c.id === item.category)?.label || 'GENERAL'}
                                                </span>
                                            </div>

                                            {/* Content slab */}
                                            <div className="absolute inset-x-6 bottom-6 z-20 space-y-3">
                                                <h3 className="text-xl font-black text-white uppercase italic tracking-tight leading-tight group-hover:text-neon-purple transition-colors duration-500 line-clamp-2">
                                                    {item.title}
                                                </h3>
                                                <div className="flex items-center justify-between">
                                                    {item.date && (
                                                        <div className="flex items-center gap-1.5">
                                                            <Clock size={10} className="text-white/30" />
                                                            <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">{item.date}</span>
                                                        </div>
                                                    )}
                                                    {item.highlightUrl && (
                                                        <span className="text-[9px] font-black text-neon-purple uppercase tracking-widest flex items-center gap-1">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-neon-purple animate-pulse" /> Reel
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>

                                {filtered.length === 0 && (
                                    <div className="col-span-full py-32 flex flex-col items-center justify-center gap-6 bg-zinc-900/20 rounded-[3rem] border-2 border-dashed border-white/5">
                                        <div className="w-16 h-16 rounded-full border border-white/10 flex items-center justify-center text-gray-700 animate-pulse">
                                            <Music size={28} />
                                        </div>
                                        <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.3em]">No portfolio records found.</p>
                                        <Button onClick={() => setIsAdding(true)} className="h-12 px-10 bg-neon-purple text-black font-black uppercase tracking-widest rounded-2xl">
                                            Add First Entry
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </AdminCommunityHubLayout>
    );
};

export default ConcertManager;
