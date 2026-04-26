import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Trash2, LayoutGrid, Edit, Upload, Save, Loader, Sparkles, ChevronUp, ChevronDown, X, Clock, Eye, MapPin, IndianRupee } from 'lucide-react';
import { useStore } from '../../lib/store';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import LivePreview from '../../components/admin/LivePreview';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import AdminDashboardLink from '../../components/admin/AdminDashboardLink';

const ConcertManager = () => {
    const { portfolio, addPortfolioItem, updatePortfolioItem, deletePortfolioItem, updatePortfolioOrder, portfolioCategories, addCategory, deleteCategory } = useStore();
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [showCategoryManager, setShowCategoryManager] = useState(false);

    // State for Portfolio (Past)
    const [newPortfolio, setNewPortfolio] = useState({
        title: '', date: '', time: '', category: '', image: '', highlightUrl: '',
        imageTransform: { scale: 1, x: 0, y: 0 }
    });

    const resetForms = () => {
        setNewPortfolio({ 
            title: '', date: '', time: '', category: '', image: '', highlightUrl: '',
            imageTransform: { scale: 1, x: 0, y: 0 }
        });
        setIsAdding(false);
        setEditingId(null);
        setSelectedFile(null);
        setUploading(false);
    };

    const handleEdit = (item) => {
        setEditingId(item.id);
        setIsAdding(true);
        setSelectedFile(null);
        setNewPortfolio({ ...item });
    };

    const moveItem = async (index, direction) => {
        const newItems = [...portfolio];
        if (direction === 'up' && index > 0) {
            [newItems[index], newItems[index - 1]] = [newItems[index - 1], newItems[index]];
        } else if (direction === 'down' && index < newItems.length - 1) {
            [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
        } else {
            return;
        }
        await updatePortfolioOrder(newItems);
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
            throw new Error("Uplink disrupted.");
        }
    };

    const handleSavePortfolio = async (e) => {
        e.preventDefault();
        setUploading(true);
        try {
            let imageUrl = newPortfolio.image;
            if (selectedFile) {
                imageUrl = await handleFileUpload(selectedFile);
            }

            const portfolioData = { ...newPortfolio, image: imageUrl };
            if (!portfolioData.category && portfolioCategories.length > 0) {
                portfolioData.category = portfolioCategories[0].id;
            }

            if (editingId) {
                await updatePortfolioItem(editingId, portfolioData);
            } else {
                await addPortfolioItem({ id: `p-${Date.now()}`, ...portfolioData });
            }
            resetForms();
        } catch (err) {
            alert("Storage error.");
        } finally {
            setUploading(false);
        }
    };

    const handleAddCategory = async (e) => {
        e.preventDefault();
        if (!newCategoryName.trim()) return;
        try {
            await addCategory(newCategoryName.trim());
            setNewCategoryName('');
        } catch (error) {
            alert("Category sync failure.");
        }
    };

    return (
        <div className="min-h-screen bg-[#020202] text-white pb-20">
            {/* Atmos */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[10%] left-[-10%] w-[50%] h-[50%] bg-neon-green/5 rounded-full blur-[150px]" />
                <div className="absolute bottom-[10%] right-[-10%] w-[40%] h-[40%] bg-neon-purple/5 rounded-full blur-[150px]" />
            </div>

            <div className="relative z-10 max-w-[1400px] mx-auto px-4 md:px-8 pt-40 md:pt-48">
                {/* Header */}
                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-8 md:mb-12 gap-8">
                    <div className="space-y-4 max-w-full">
                        <AdminDashboardLink className="mb-4" />
                        <h1 className="text-2xl md:text-4xl lg:text-5xl font-black font-heading tracking-tighter uppercase italic leading-[1.6] py-10 pr-12 pl-1 overflow-visible whitespace-nowrap">
                            CONCERT <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-green to-white px-4">CATALOGUE.</span>
                        </h1>
                    </div>
                    
                    <div className="flex flex-wrap gap-4 w-full md:w-auto">
                        <button 
                            onClick={() => setShowCategoryManager(!showCategoryManager)}
                            className={cn(
                                "h-14 px-8 rounded-2xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest border transition-all",
                                showCategoryManager ? "bg-white text-black border-white" : "bg-white/5 text-white border-white/10 hover:bg-white/10"
                            )}
                        >
                            {showCategoryManager ? 'Hide Categories' : 'Category Management'}
                        </button>
                        <Button 
                            onClick={() => { setIsAdding(true); setEditingId(null); setNewPortfolio({ title: '', date: '', time: '', category: '', image: '', highlightUrl: '' }); }}
                            className="h-14 px-8 bg-neon-green text-black font-black uppercase tracking-widest rounded-2xl shadow-[0_10px_30px_rgba(46,255,144,0.2)] hover:scale-105 active:scale-95 transition-all"
                        >
                            <Plus className="mr-2" size={18} /> Add Portfolio Item
                        </Button>
                    </div>
                </div>

                {/* Category Manager */}
                <AnimatePresence>
                    {showCategoryManager && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-12 overflow-hidden">
                            <Card className="p-6 md:p-8 bg-zinc-900/40 backdrop-blur-3xl border-white/5 rounded-[2rem] md:rounded-[2.5rem]">
                                <h3 className="text-xs font-black text-gray-500 uppercase tracking-[0.4em] mb-8 flex items-center gap-3">
                                    <div className="w-8 h-px bg-neon-green" /> CATEGORY REGISTRY
                                </h3>
                                <div className="flex flex-col md:flex-row gap-6 mb-10">
                                    <Input
                                        placeholder="NEW CATEGORY NAME"
                                        value={newCategoryName}
                                        onChange={(e) => setNewCategoryName(e.target.value)}
                                        className="h-14 bg-black/50 border-white/5 rounded-xl uppercase text-[10px] font-black tracking-widest placeholder:text-gray-700"
                                    />
                                    <Button onClick={handleAddCategory} className="h-14 px-10 bg-white text-black font-black uppercase tracking-widest">ADD CATEGORY</Button>
                                </div>
                                <div className="flex flex-wrap gap-3">
                                    {portfolioCategories.map(cat => (
                                        <div key={cat.id} className="group flex items-center gap-4 bg-black/30 border border-white/5 px-6 py-3 rounded-xl hover:border-neon-green/30 transition-all">
                                            <span className="text-[10px] font-black text-white uppercase tracking-widest">{cat.label}</span>
                                            <button onClick={() => { if(window.confirm('Delete sector?')) deleteCategory(cat.id); }} className="text-gray-700 group-hover:text-red-500 transition-colors">
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ))}
                                    {portfolioCategories.length === 0 && <p className="text-[10px] font-black text-gray-700 uppercase tracking-widest">No custom sectors detected.</p>}
                                </div>
                            </Card>
                        </motion.div>
                    )}
                </AnimatePresence>

                <AnimatePresence mode="wait">
                    {isAdding ? (
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
                            {/* Editor Column */}
                            <div className="lg:col-span-7">
                                <Card className="p-10 bg-zinc-900/40 backdrop-blur-3xl border-white/5 rounded-[3rem]">
                                    <div className="flex justify-between items-center mb-10">
                                        <h2 className="text-2xl font-black font-heading tracking-tighter uppercase italic text-white flex items-center gap-3">
                                            <Sparkles className="text-neon-green" size={24} /> {editingId ? 'EDIT' : 'NEW'} RECORD
                                        </h2>
                                        <button onClick={resetForms} className="text-[10px] font-black text-gray-500 hover:text-white uppercase tracking-widest">Discard</button>
                                    </div>

                                    <form onSubmit={handleSavePortfolio} className="space-y-8">
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Event Reference</label>
                                            <Input
                                                placeholder="ENTER EVENT TITLE..."
                                                value={newPortfolio.title}
                                                onChange={e => setNewPortfolio({ ...newPortfolio, title: e.target.value })}
                                                required
                                                className="h-14 bg-black/50 border-white/5 rounded-2xl uppercase text-[10px] font-black tracking-widest focus:border-neon-green/30 px-6"
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Event Date</label>
                                                <Input
                                                    type="date"
                                                    value={newPortfolio.date || ''}
                                                    onChange={e => setNewPortfolio({ ...newPortfolio, date: e.target.value })}
                                                    className="h-14 bg-black/50 border-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest px-6"
                                                />
                                            </div>
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Sector (Category)</label>
                                                <div className="relative">
                                                    <select
                                                        className="w-full h-14 bg-black/50 border border-white/5 rounded-2xl px-6 text-[11px] font-black uppercase tracking-widest text-white focus:outline-none focus:border-neon-green/30 appearance-none cursor-pointer"
                                                        value={newPortfolio.category}
                                                        onChange={e => setNewPortfolio({ ...newPortfolio, category: e.target.value })}
                                                    >
                                                        <option value="" className="bg-zinc-900">SELECT SECTOR...</option>
                                                        {portfolioCategories.map(cat => (
                                                            <option key={cat.id} value={cat.id} className="bg-zinc-900">{cat.label.toUpperCase()}</option>
                                                        ))}
                                                    </select>
                                                    <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Portfolio Image</label>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                <div className="md:col-span-2">
                                                    <Input placeholder="HTTPS://SOURCE.COM/IMAGE.JPG" value={newPortfolio.image} onChange={e => setNewPortfolio({ ...newPortfolio, image: e.target.value })} className="h-14 bg-black/50 border-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest px-6" />
                                                </div>
                                                <div className="relative group">
                                                    <input type="file" accept="image/*" onChange={(e) => setSelectedFile(e.target.files[0])} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                                                    <div className="h-14 border-2 border-dashed border-white/5 rounded-2xl flex items-center justify-center gap-3 bg-black/20 group-hover:border-neon-green/30 transition-all">
                                                        <Upload className="text-gray-500 group-hover:text-neon-green" size={16} />
                                                        <span className="text-[8px] font-black text-gray-500 group-hover:text-white uppercase tracking-widest">{selectedFile ? 'READY' : 'UPLOAD'}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Visual Calibration */}
                                            <div className="bg-white/5 p-8 rounded-3xl border border-white/5 space-y-6">
                                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-neon-green mb-4">Visual Calibration</h4>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                                    <div className="space-y-3">
                                                        <div className="flex justify-between">
                                                            <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Scale</span>
                                                            <span className="text-[8px] font-black text-white">{(newPortfolio.imageTransform?.scale || 1).toFixed(2)}x</span>
                                                        </div>
                                                        <input 
                                                            type="range" min="0.5" max="2" step="0.01"
                                                            value={newPortfolio.imageTransform?.scale || 1}
                                                            onChange={(e) => setNewPortfolio({ ...newPortfolio, imageTransform: { ...newPortfolio.imageTransform, scale: parseFloat(e.target.value) } })}
                                                            className="w-full accent-neon-green bg-white/10 h-1 rounded-full appearance-none cursor-pointer"
                                                        />
                                                    </div>
                                                    <div className="space-y-3">
                                                        <div className="flex justify-between">
                                                            <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">X-Position</span>
                                                            <span className="text-[8px] font-black text-white">{newPortfolio.imageTransform?.x || 0}%</span>
                                                        </div>
                                                        <input 
                                                            type="range" min="-100" max="100" step="1"
                                                            value={newPortfolio.imageTransform?.x || 0}
                                                            onChange={(e) => setNewPortfolio({ ...newPortfolio, imageTransform: { ...newPortfolio.imageTransform, x: parseInt(e.target.value) } })}
                                                            className="w-full accent-neon-green bg-white/10 h-1 rounded-full appearance-none cursor-pointer"
                                                        />
                                                    </div>
                                                    <div className="space-y-3">
                                                        <div className="flex justify-between">
                                                            <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Y-Position</span>
                                                            <span className="text-[8px] font-black text-white">{newPortfolio.imageTransform?.y || 0}%</span>
                                                        </div>
                                                        <input 
                                                            type="range" min="-100" max="100" step="1"
                                                            value={newPortfolio.imageTransform?.y || 0}
                                                            onChange={(e) => setNewPortfolio({ ...newPortfolio, imageTransform: { ...newPortfolio.imageTransform, y: parseInt(e.target.value) } })}
                                                            className="w-full accent-neon-green bg-white/10 h-1 rounded-full appearance-none cursor-pointer"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Instagram Reel Link (Optional)</label>
                                            <Input
                                                placeholder="HTTPS://WWW.INSTAGRAM.COM/REEL/..."
                                                value={newPortfolio.highlightUrl || ''}
                                                onChange={e => setNewPortfolio({ ...newPortfolio, highlightUrl: e.target.value })}
                                                className="h-14 bg-black/50 border-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest px-6"
                                            />
                                        </div>

                                        <div className="flex gap-4 pt-8 border-t border-white/10">
                                            <Button type="button" variant="outline" onClick={resetForms} className="h-16 px-10 flex-1 rounded-2xl border-white/10 text-gray-400 font-black uppercase tracking-widest text-[11px]">Abort</Button>
                                            <Button type="submit" disabled={uploading} className="h-16 px-10 flex-[2] bg-neon-green text-black font-black uppercase tracking-widest rounded-2xl shadow-xl text-[11px] hover:scale-105 active:scale-95 transition-all">
                                                {uploading ? <Loader className="animate-spin mr-2" size={18} /> : (editingId ? 'UPDATE ITEM' : 'SAVE ITEM')}
                                            </Button>
                                        </div>
                                    </form>
                                </Card>
                            </div>

                            {/* Preview Column */}
                            <div className="lg:col-span-5 hidden lg:block sticky top-12">
                                <LivePreview
                                    type="portfolio"
                                    categories={portfolioCategories}
                                    data={{
                                        ...newPortfolio,
                                        image: selectedFile ? URL.createObjectURL(selectedFile) : newPortfolio.image
                                    }}
                                />
                            </div>
                        </motion.div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            <AnimatePresence mode="popLayout">
                            {portfolio.map((item, index) => (
                                <motion.div 
                                    key={item.id} 
                                    layout
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    className="bg-zinc-900/40 border border-white/5 rounded-[2.5rem] overflow-hidden group hover:border-white/10 transition-all duration-500 flex flex-col h-full"
                                >
                                    <div className="aspect-[4/3] relative overflow-hidden bg-black/50">
                                        <img src={item.image} alt={item.title} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700" />
                                        <div className="absolute top-6 left-6 right-6 flex justify-between items-start opacity-0 group-hover:opacity-100 transition-opacity">
                                            <div className="flex gap-2">
                                                <button onClick={() => moveItem(index, 'up')} disabled={index === 0} className="w-10 h-10 rounded-xl bg-black/60 backdrop-blur-sm flex items-center justify-center text-white hover:bg-neon-green hover:text-black transition-all disabled:opacity-0"><ChevronUp size={18} /></button>
                                                <button onClick={() => moveItem(index, 'down')} disabled={index === portfolio.length - 1} className="w-10 h-10 rounded-xl bg-black/60 backdrop-blur-sm flex items-center justify-center text-white hover:bg-neon-green hover:text-black transition-all disabled:opacity-0"><ChevronDown size={18} /></button>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => handleEdit(item)} className="w-10 h-10 rounded-xl bg-black/60 backdrop-blur-sm flex items-center justify-center text-white hover:bg-neon-blue hover:text-black transition-all"><Edit size={18} /></button>
                                                <button onClick={() => deletePortfolioItem(item.id)} className="w-10 h-10 rounded-xl bg-black/60 backdrop-blur-sm flex items-center justify-center text-white hover:bg-red-500 transition-all"><Trash2 size={18} /></button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-6 md:p-8 flex-1 flex flex-col">
                                        <div className="flex items-center gap-3 mb-4">
                                            <span className="px-3 py-1 bg-neon-green/10 text-neon-green text-[9px] font-black uppercase tracking-widest border border-neon-green/20 rounded-full">
                                                {portfolioCategories.find(c => c.id === item.category)?.label || item.category || 'GENERAL'}
                                            </span>
                                        </div>
                                        <h3 className="text-xl font-black font-heading text-white uppercase italic tracking-tight mb-2 group-hover:text-neon-green transition-colors">{item.title}</h3>
                                        {item.date && (
                                            <div className="flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase tracking-widest mt-auto shrink-0">
                                                <Clock size={12} className="text-gray-700" />
                                                {item.date}
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            ))}
                            </AnimatePresence>

                            {portfolio.length === 0 && (
                                <div className="col-span-full py-40 flex flex-col items-center justify-center gap-6 bg-zinc-900/20 rounded-[3rem] border-2 border-dashed border-white/5">
                                    <Clock size={48} className="text-gray-700" />
                                    <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.3em]">NO PORTFOLIO ITEMS FOUND.</p>
                                    <Button onClick={() => setIsAdding(true)} className="h-14 px-10 bg-neon-green text-black font-black uppercase tracking-widest rounded-2xl">ADD PORTFOLIO ITEM</Button>
                                </div>
                            )}
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default ConcertManager;
