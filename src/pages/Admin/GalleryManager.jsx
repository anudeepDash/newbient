import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import LayoutGrid from 'lucide-react/dist/esm/icons/layout-grid';
import Plus from 'lucide-react/dist/esm/icons/plus';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import Upload from 'lucide-react/dist/esm/icons/upload';
import Loader from 'lucide-react/dist/esm/icons/loader';
import ImageIcon from 'lucide-react/dist/esm/icons/image';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import Filter from 'lucide-react/dist/esm/icons/filter';
import X from 'lucide-react/dist/esm/icons/x';
import { useStore } from '../../lib/store';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import AdminDashboardLink from '../../components/admin/AdminDashboardLink';

const GalleryManager = () => {
    const { galleryImages, addGalleryImage, deleteGalleryImage } = useStore();
    const [newImage, setNewImage] = useState({
        type: 'image',
        src: '',
        title: '',
        category: 'Event'
    });
    const [uploading, setUploading] = useState(false);

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
            useStore.getState().addToast("Network error during uplink.", 'error');
            return null;
        }
    };

    const handlePaste = async (e) => {
        const items = (e.clipboardData || e.originalEvent.clipboardData).items;
        for (let index in items) {
            const item = items[index];
            if (item.kind === 'file' && item.type.startsWith('image/')) {
                const file = item.getAsFile();
                setUploading(true);
                const url = await handleFileUpload(file);
                if (url) {
                    setNewImage(prev => ({ ...prev, src: url }));
                    useStore.getState().addToast("IMAGE_CAPTURED_FROM_CLIPBOARD", 'success');
                }
                setUploading(false);
                e.preventDefault();
            }
        }
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!newImage.src) return;
        addGalleryImage(newImage);
        setNewImage({ type: 'image', src: '', title: '', category: 'Event' });
    };

    return (
        <div className="min-h-screen bg-[#020202] text-white pb-20">
            {/* Atmos */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[20%] right-[-10%] w-[50%] h-[50%] bg-neon-blue/5 rounded-full blur-[150px]" />
                <div className="absolute bottom-[10%] left-[-10%] w-[40%] h-[40%] bg-neon-green/5 rounded-full blur-[150px]" />
            </div>

            <div className="relative z-10 max-w-[1400px] mx-auto px-4 md:px-8 pt-32 md:pt-48">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-8">
                    <div className="space-y-4">
                        <h1 className="text-4xl md:text-6xl font-black font-heading tracking-tighter uppercase italic leading-[1.1] pb-2 pr-4">
                            VISUAL <span className="text-neon-blue">ARCHIVE.</span>
                        </h1>
                        <div className="pt-4">
                            <AdminDashboardLink />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                    {/* Control Panel */}
                    <div className="lg:col-span-4">
                        <Card className="p-10 bg-zinc-900/40 backdrop-blur-3xl border-white/5 rounded-[2.5rem] lg:sticky lg:top-32">
                            <h2 className="text-2xl font-black font-heading uppercase italic tracking-tight text-white mb-8 flex items-center gap-3">
                                <Plus className="text-neon-blue" size={20} /> INGEST MEDIA
                            </h2>

                            <div className="space-y-8">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Source Uplink</label>
                                    <div className="relative group">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={async (e) => {
                                                if (e.target.files[0]) {
                                                    setUploading(true);
                                                    const url = await handleFileUpload(e.target.files[0]);
                                                    if (url) setNewImage({ ...newImage, src: url });
                                                    setUploading(false);
                                                }
                                            }}
                                            className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                            disabled={uploading}
                                        />
                                        <div className={cn(
                                            "h-32 border-2 border-dashed border-white/5 rounded-2xl flex flex-col items-center justify-center gap-3 bg-black/30 group-hover:border-neon-blue/40 transition-all",
                                            uploading && "animate-pulse"
                                        )}>
                                            {uploading ? (
                                                <Loader className="animate-spin text-neon-blue" size={24} />
                                            ) : (
                                                <Upload className="text-gray-500 group-hover:text-neon-blue" size={24} />
                                            )}
                                            <span className="text-[10px] font-black text-gray-500 group-hover:text-white uppercase tracking-widest">
                                                {uploading ? 'SYNCING...' : 'SELECT ASSET'}
                                            </span>
                                        </div>
                                    </div>
                                    <p className="text-[8px] font-black text-gray-700 uppercase tracking-[0.2em] text-center pt-2">OR PASTE EXTERNAL URL BELOW</p>
                                </div>

                                <form onSubmit={handleAdd} className="space-y-6">
                                    <div className="space-y-3">
                                        <Input
                                            value={newImage.src}
                                            onChange={(e) => setNewImage({ ...newImage, src: e.target.value })}
                                            onPaste={handlePaste}
                                            placeholder="HTTPS://... OR CTRL+V IMAGE"
                                            required
                                            disabled={uploading}
                                            className="h-14 bg-black/50 border-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest focus:border-neon-blue/30"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Media Title / Event</label>
                                        <Input
                                            value={newImage.title}
                                            onChange={(e) => setNewImage({ ...newImage, title: e.target.value })}
                                            placeholder="E.G. SUMMER ROOFTOP SESSION"
                                            className="h-14 bg-black/50 border-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest focus:border-neon-blue/30"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Sector (Category)</label>
                                        <Input
                                            value={newImage.category}
                                            onChange={(e) => setNewImage({ ...newImage, category: e.target.value })}
                                            placeholder="E.G. BTS, EVENT, PRESS"
                                            className="h-14 bg-black/50 border-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest focus:border-neon-blue/30"
                                        />
                                    </div>
                                    <Button type="submit" className="w-full h-16 bg-white text-black font-black uppercase tracking-widest text-[11px] rounded-xl hover:scale-[1.02] active:scale-95 transition-all shadow-xl" disabled={uploading}>
                                        COMMIT TO DATABASE
                                    </Button>
                                </form>
                            </div>
                        </Card>
                    </div>

                    {/* Matrix View */}
                    <div className="lg:col-span-8">
                        <div className="flex sm:grid sm:grid-cols-2 gap-6 sm:gap-8 overflow-x-auto sm:overflow-visible pb-8 sm:pb-0 scrollbar-hide snap-x snap-mandatory -mx-6 px-6 sm:mx-0 sm:px-0">
                            <AnimatePresence mode="popLayout">
                            {galleryImages.map((item, index) => (
                                <motion.div 
                                    key={item.id || index}
                                    layout
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    className="min-w-[85vw] sm:min-w-0 snap-center shrink-0 group relative aspect-video bg-zinc-900 border border-white/5 rounded-[2rem] overflow-hidden hover:border-neon-blue/30 transition-all duration-500"
                                >
                                    <img src={item.src} alt={item.title} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent p-8 flex flex-col justify-end">
                                        <div className="translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                                            <span className="text-[8px] font-black text-neon-blue uppercase tracking-[0.3em] mb-2 inline-block">{item.category || 'GENERAL'}</span>
                                            <h3 className="text-lg font-black font-heading text-white uppercase italic tracking-tight truncate">{item.title || 'ARCHIVE_DATA'}</h3>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => deleteGalleryImage(item.id)}
                                        className="absolute top-6 right-6 w-10 h-10 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </motion.div>
                            ))}
                            </AnimatePresence>
                            {galleryImages.length === 0 && (
                                <div className="col-span-full py-40 flex flex-col items-center justify-center gap-6 bg-zinc-900/20 rounded-[3rem] border-2 border-dashed border-white/5">
                                    <ImageIcon size={48} className="text-gray-700" />
                                    <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.3em]">THE ARCHIVE IS CURRENTLY DEPLETED.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GalleryManager;
