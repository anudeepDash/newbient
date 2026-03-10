import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Edit, Save, Eye, EyeOff, Loader, Sparkles, Clock, MapPin, IndianRupee, Image as ImageIcon, ChevronDown, ChevronUp, X, Upload, Zap, Ticket } from 'lucide-react';
import { useStore } from '../../lib/store';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import LivePreview from '../../components/admin/LivePreview';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';

const UpcomingEventsManager = () => {
    const { upcomingEvents, addUpcomingEvent, updateUpcomingEvent, deleteUpcomingEvent, updateUpcomingEventOrder, siteSettings, toggleUpcomingSectionVisibility, portfolioCategories } = useStore();
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);

    const [newEvent, setNewEvent] = useState({
        title: '',
        date: '',
        category: '',
        description: '',
        location: '',
        buttonText: '',
        image: '',
        link: '',
        isTicketed: false,
        ticketPrice: '',
        ticketCategories: [],
        venueLayout: '',
        alsoPostToAnnouncements: false
    });
    const [venueLayoutFile, setVenueLayoutFile] = useState(null);

    const resetForm = () => {
        setNewEvent({
            title: '', date: '', time: '', category: '', description: '', location: '', buttonText: '', image: '', link: '', isTicketed: false, ticketPrice: '', ticketCategories: [], venueLayout: '', alsoPostToAnnouncements: false
        });
        setIsAdding(false);
        setEditingId(null);
        setSelectedFile(null);
        setVenueLayoutFile(null);
        setUploading(false);
    };

    const handleEdit = (item) => {
        setEditingId(item.id);
        setIsAdding(true);
        setNewEvent({ ...item, alsoPostToAnnouncements: false });
    };

    const moveItem = async (index, direction) => {
        const newItems = [...upcomingEvents];
        if (direction === 'up' && index > 0) {
            [newItems[index], newItems[index - 1]] = [newItems[index - 1], newItems[index]];
        } else if (direction === 'down' && index < newItems.length - 1) {
            [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
        } else {
            return;
        }
        await updateUpcomingEventOrder(newItems);
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
            throw new Error("Uplink failed.");
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setUploading(true);
        try {
            let imageUrl = newEvent.image;
            if (selectedFile) imageUrl = await handleFileUpload(selectedFile);
            let venueLayoutUrl = newEvent.venueLayout;
            if (venueLayoutFile) venueLayoutUrl = await handleFileUpload(venueLayoutFile);

            const ticketCategories = newEvent.ticketCategories.map(c => ({
                id: c.id || Math.random().toString(36).substr(2, 9),
                name: c.name,
                price: Number(c.price) || 0,
                description: c.description || ''
            }));

            let ticketPrice = Number(newEvent.ticketPrice) || 0;
            if (ticketCategories.length > 0) {
                ticketPrice = Math.min(...ticketCategories.map(c => c.price));
            }

            const eventData = { ...newEvent, image: imageUrl, venueLayout: venueLayoutUrl, ticketCategories, ticketPrice };

            if (editingId) {
                await updateUpcomingEvent(editingId, eventData);
            } else {
                await addUpcomingEvent(eventData, newEvent.alsoPostToAnnouncements);
            }
            resetForm();
        } catch (error) {
            alert("Database Error.");
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#020202] text-white pb-20">
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[10%] right-[-10%] w-[50%] h-[50%] bg-neon-blue/5 rounded-full blur-[150px]" />
                <div className="absolute bottom-[20%] left-[-10%] w-[40%] h-[40%] bg-neon-green/5 rounded-full blur-[150px]" />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-6 pt-32">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-8">
                    <div className="space-y-4 text-left">
                        <Link to="/admin" className="relative z-[60] inline-flex items-center gap-2 text-gray-500 hover:text-white transition-colors uppercase text-[10px] font-black tracking-[0.3em] mb-4">
                            <ArrowLeft size={14} /> Back to Hub
                        </Link>
                        <h1 className="text-4xl md:text-5xl font-black font-heading tracking-tighter uppercase italic">
                            UPCOMING <span className="text-neon-blue">EVENTS.</span>
                        </h1>
                    </div>
                    
                    {!isAdding && (
                        <div className="flex flex-wrap gap-4 w-full md:w-auto">
                            <button
                                onClick={() => toggleUpcomingSectionVisibility(siteSettings?.showUpcomingEvents)}
                                className={cn(
                                    "h-14 px-8 rounded-2xl flex items-center gap-3 text-[10px] font-black uppercase tracking-widest border transition-all",
                                    siteSettings?.showUpcomingEvents ? "bg-neon-green/10 text-neon-green border-neon-green/20" : "bg-red-500/10 text-red-500 border-red-500/20"
                                )}
                            >
                                {siteSettings?.showUpcomingEvents ? <Eye size={16} /> : <EyeOff size={16} />}
                                PUBLIC VIEW: {siteSettings?.showUpcomingEvents ? 'VISIBLE' : 'HIDDEN'}
                            </button>
                            <Button onClick={() => { setIsAdding(true); setEditingId(null); }} className="h-14 px-10 bg-neon-blue text-black font-black uppercase tracking-widest rounded-2xl shadow-[0_10px_30px_rgba(0,255,255,0.2)]">
                                <Plus className="mr-2" size={18} /> Add Event
                            </Button>
                        </div>
                    )}
                </div>

                <AnimatePresence mode="wait">
                    {isAdding ? (
                        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
                            {/* Editor Column */}
                            <div className="lg:col-span-7">
                                <Card className="p-10 bg-zinc-900/40 backdrop-blur-3xl border-white/5 rounded-[3rem]">
                                    <div className="flex justify-between items-center mb-10">
                                        <h2 className="text-2xl font-black font-heading tracking-tighter uppercase italic text-white flex items-center gap-3">
                                            <Sparkles className="text-neon-blue" size={24} /> {editingId ? 'EDIT' : 'NEW'} EVENT
                                        </h2>
                                        <button onClick={resetForm} className="text-[10px] font-black text-gray-500 hover:text-white uppercase tracking-widest">Discard</button>
                                    </div>

                                    <form onSubmit={handleSubmit} className="space-y-8">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Event Title</label>
                                                <Input
                                                    placeholder="E.G. SUMMER MUSIC FESTIVAL..."
                                                    value={newEvent.title}
                                                    onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                                                    required
                                                    className="h-14 bg-black/50 border-white/5 rounded-2xl uppercase text-[10px] font-black tracking-widest focus:border-neon-blue/30 px-6"
                                                />
                                            </div>
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Event Date & Time</label>
                                                <Input
                                                    type="datetime-local"
                                                    value={newEvent.date}
                                                    onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                                                    required
                                                    className="h-14 bg-black/50 border-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest px-6"
                                                />
                                            </div>
                                        </div>

                                            <div className="space-y-3">
                                                <div className="flex justify-between items-center">
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Event Description (Short)</label>
                                                    <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest">{newEvent.description.length}/120</span>
                                                </div>
                                                <textarea
                                                    className="w-full bg-black/50 border border-white/5 rounded-[2rem] p-6 text-[11px] font-black uppercase tracking-widest text-gray-300 focus:outline-none focus:border-neon-blue/30 transition-all h-32 resize-none shadow-inner"
                                                    placeholder="BRIEF SUMMARY FOR HOVER DETAILS..."
                                                value={newEvent.description}
                                                maxLength={120}
                                                onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Event Location</label>
                                                <Input
                                                    placeholder="E.G. MAINLAND INDIA, VENUE NAME..."
                                                    value={newEvent.location}
                                                    onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                                                    className="h-14 bg-black/50 border-white/5 rounded-2xl uppercase text-[10px] font-black tracking-widest px-6"
                                                />
                                            </div>
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Action Button Text</label>
                                                <Input
                                                    placeholder="E.G. GET NEWBI TICKETS"
                                                    value={newEvent.buttonText}
                                                    onChange={(e) => setNewEvent({ ...newEvent, buttonText: e.target.value })}
                                                    className="h-14 bg-black/50 border-white/5 rounded-2xl uppercase text-[10px] font-black tracking-widest px-6"
                                                />
                                            </div>
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Category</label>
                                                <div className="relative">
                                                    <select
                                                        className="w-full h-14 bg-black/50 border border-white/5 rounded-2xl px-6 text-[11px] font-black uppercase tracking-widest text-white focus:outline-none focus:border-neon-blue/30 appearance-none cursor-pointer"
                                                        value={newEvent.category}
                                                        onChange={e => setNewEvent({ ...newEvent, category: e.target.value })}
                                                    >
                                                        <option value="" className="bg-zinc-900">SELECT CATEGORY...</option>
                                                        {portfolioCategories.map(cat => (
                                                            <option key={cat.id} value={cat.id} className="bg-zinc-900">{cat.label.toUpperCase()}</option>
                                                        ))}
                                                    </select>
                                                    <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Event Image</label>
                                            <div className="space-y-4">
                                                <Input placeholder="PASTE NEWBI ASSET URL" value={newEvent.image} onChange={(e) => setNewEvent({ ...newEvent, image: e.target.value })} className="h-14 bg-black/50 border-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest px-6" />
                                                <div className="relative group">
                                                    <input type="file" onChange={(e) => setSelectedFile(e.target.files[0])} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                                                    <div className="h-20 border-2 border-dashed border-white/5 rounded-2xl flex items-center justify-center gap-3 bg-black/20 group-hover:border-neon-blue/30 transition-all">
                                                        <Upload className="text-gray-500 group-hover:text-neon-blue" size={20} />
                                                        <span className="text-[10px] font-black text-gray-500 group-hover:text-white uppercase tracking-widest">{selectedFile ? selectedFile.name : 'UPLOAD NEWBI ASSET'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Ticketing High Tech */}
                                        <div className="bg-black/30 p-8 rounded-[2.5rem] border border-white/5 space-y-8">
                                            <button 
                                                type="button"
                                                onClick={() => setNewEvent({ ...newEvent, isTicketed: !newEvent.isTicketed })}
                                                className={cn(
                                                    "flex items-center justify-between w-full p-6 rounded-2xl border transition-all",
                                                    newEvent.isTicketed ? "bg-neon-green/5 border-neon-green/20" : "bg-white/5 border-white/5 opacity-60"
                                                )}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={cn("p-3 rounded-xl transition-all", newEvent.isTicketed ? "bg-neon-green text-black" : "bg-white/10 text-gray-500")}>
                                                        <Ticket size={24} />
                                                    </div>
                                                    <div className="text-left">
                                                        <p className="text-[12px] font-black uppercase tracking-widest text-white">TICKETING SYSTEM</p>
                                                        <p className="text-[10px] font-medium text-gray-500">Enable ticketing for this event.</p>
                                                    </div>
                                                </div>
                                                <div className={cn("w-14 h-8 rounded-full relative transition-all", newEvent.isTicketed ? "bg-neon-green" : "bg-zinc-800")}>
                                                    <div className={cn("absolute top-1 w-6 h-6 bg-white rounded-full transition-all shadow-lg", newEvent.isTicketed ? "right-1" : "left-1")} />
                                                </div>
                                            </button>

                                            <AnimatePresence>
                                                {newEvent.isTicketed && (
                                                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-8 overflow-hidden">
                                                        <div className="space-y-3">
                                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Sector Layout</label>
                                                            <div className="relative group">
                                                                <input type="file" onChange={(e) => setVenueLayoutFile(e.target.files[0])} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                                                                <div className="h-32 border-2 border-dashed border-white/5 rounded-2xl flex flex-col items-center justify-center gap-3 bg-black/30 group-hover:border-neon-green/30 transition-all">
                                                                    <MapPin size={24} className="text-gray-500 group-hover:text-neon-green" />
                                                                    <span className="text-[10px] font-black text-gray-500 group-hover:text-white uppercase tracking-widest">{venueLayoutFile ? venueLayoutFile.name : 'UPLOAD NEWBI VENUE LAYOUT'}</span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="space-y-3">
                                                            <div className="flex items-center justify-between">
                                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Ticket Tiers</label>
                                                                <button type="button" onClick={() => setNewEvent({ ...newEvent, ticketCategories: [...newEvent.ticketCategories, { id: Date.now().toString(), name: '', price: '', description: '' }] })} className="text-[9px] font-black bg-neon-green/10 text-neon-green px-4 py-2 rounded-lg border border-neon-green/20 hover:bg-neon-green hover:text-black transition-all">+ ADD TIER</button>
                                                            </div>
                                                            <div className="space-y-4">
                                                                {newEvent.ticketCategories.map((cat, idx) => (
                                                                    <div key={cat.id} className="grid grid-cols-12 gap-4 items-center bg-black/40 p-5 rounded-2xl border border-white/5 group/tier">
                                                                        <div className="col-span-12 md:col-span-4">
                                                                            <Input placeholder="TIER NAME" value={cat.name} onChange={e => { const c = [...newEvent.ticketCategories]; c[idx].name = e.target.value; setNewEvent({ ...newEvent, ticketCategories: c }); }} className="h-12 text-[9px] font-black uppercase tracking-widest bg-zinc-900/50 border-white/5 rounded-xl" />
                                                                        </div>
                                                                        <div className="col-span-12 md:col-span-3">
                                                                            <Input type="number" placeholder="PRICE" value={cat.price} onChange={e => { const c = [...newEvent.ticketCategories]; c[idx].price = e.target.value; setNewEvent({ ...newEvent, ticketCategories: c }); }} className="h-12 text-[9px] font-black uppercase tracking-widest bg-zinc-900/50 border-white/5 rounded-xl" />
                                                                        </div>
                                                                        <div className="col-span-10 md:col-span-4">
                                                                            <Input placeholder="TIER DESCRIPTION" value={cat.description} onChange={e => { const c = [...newEvent.ticketCategories]; c[idx].description = e.target.value; setNewEvent({ ...newEvent, ticketCategories: c }); }} className="h-12 text-[9px] font-black uppercase tracking-widest bg-zinc-900/50 border-white/5 rounded-xl" />
                                                                        </div>
                                                                        <div className="col-span-2 md:col-span-1 flex justify-center">
                                                                            <button type="button" onClick={() => setNewEvent({ ...newEvent, ticketCategories: newEvent.ticketCategories.filter((_, i) => i !== idx) })} className="text-gray-600 hover:text-red-500"><Trash2 size={16} /></button>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>

                                        {!editingId && (
                                            <div className="p-6 bg-neon-pink/5 rounded-[2rem] border border-neon-pink/10 flex items-center gap-6 group hover:bg-neon-pink/10 transition-all cursor-pointer" onClick={() => setNewEvent({ ...newEvent, alsoPostToAnnouncements: !newEvent.alsoPostToAnnouncements })}>
                                                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center transition-all", newEvent.alsoPostToAnnouncements ? "bg-neon-pink text-black" : "bg-white/5 text-gray-500")}>
                                                    <Zap size={20} />
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-[11px] font-black uppercase tracking-widest text-white">SITE ANNOUNCEMENT</p>
                                                    <p className="text-[9px] font-medium text-gray-500">Cross-post this event to the Announcements section.</p>
                                                </div>
                                                <div className={cn("w-6 h-6 rounded-lg border flex items-center justify-center transition-all", newEvent.alsoPostToAnnouncements ? "bg-neon-pink border-neon-pink text-black" : "border-white/10")}>
                                                    {newEvent.alsoPostToAnnouncements && <Plus size={14} className="rotate-45" />}
                                                </div>
                                            </div>
                                        )}

                                        <div className="flex gap-4 pt-10 border-t border-white/10">
                                            <Button type="button" variant="outline" onClick={resetForm} className="h-16 px-10 flex-1 rounded-2xl border-white/10 text-gray-400 font-black uppercase tracking-widest text-[11px]">Abort</Button>
                                            <Button type="submit" disabled={uploading} className="h-16 px-10 flex-[2] bg-neon-blue text-black font-black uppercase tracking-widest rounded-2xl shadow-xl text-[11px] hover:scale-105 active:scale-95 transition-all">
                                                {uploading ? <Loader className="animate-spin" size={18} /> : (editingId ? 'UPDATE EVENT' : 'SAVE EVENT')}
                                            </Button>
                                        </div>
                                    </form>
                                </Card>
                            </div>

                            {/* Preview Column */}
                            <div className="lg:col-span-5 hidden lg:block sticky top-12">
                                <LivePreview type="event" data={{ ...newEvent, image: selectedFile ? URL.createObjectURL(selectedFile) : newEvent.image }} />
                            </div>
                        </motion.div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            <AnimatePresence mode="popLayout">
                            {upcomingEvents.map((item, index) => (
                                <motion.div 
                                    key={item.id} 
                                    layout
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    className="bg-zinc-900/40 border border-white/5 rounded-[2.5rem] overflow-hidden group hover:border-neon-blue/20 transition-all duration-500 flex flex-col h-full"
                                >
                                    <div className="aspect-[3/4] relative overflow-hidden bg-black/50">
                                        <img src={item.image} alt={item.title} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all duration-1000" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent p-8 flex flex-col justify-between">
                                            <div className="flex justify-between items-start opacity-0 group-hover:opacity-100 translate-y-[-10px] group-hover:translate-y-0 transition-all duration-500">
                                                <div className="flex gap-2">
                                                    <button onClick={() => moveItem(index, 'up')} disabled={index === 0} className="w-10 h-10 rounded-xl bg-black/60 backdrop-blur-md flex items-center justify-center text-white hover:bg-neon-blue transition-all disabled:opacity-0"><ChevronUp size={18} /></button>
                                                    <button onClick={() => moveItem(index, 'down')} disabled={index === upcomingEvents.length - 1} className="w-10 h-10 rounded-xl bg-black/60 backdrop-blur-md flex items-center justify-center text-white hover:bg-neon-blue transition-all disabled:opacity-0"><ChevronDown size={18} /></button>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button onClick={() => handleEdit(item)} className="w-10 h-10 rounded-xl bg-black/60 backdrop-blur-md flex items-center justify-center text-white hover:bg-neon-green transition-all"><Edit size={18} /></button>
                                                    <button onClick={() => deleteUpcomingEvent(item.id)} className="w-10 h-10 rounded-xl bg-black/60 backdrop-blur-md flex items-center justify-center text-white hover:bg-red-500 transition-all"><Trash2 size={18} /></button>
                                                </div>
                                            </div>
                                            
                                            <div className="translate-y-6 group-hover:translate-y-0 transition-transform duration-500">
                                                <div className="flex items-center gap-3 mb-4">
                                                    <span className="px-3 py-1 bg-neon-blue/20 text-neon-blue text-[8px] font-black uppercase tracking-widest border border-neon-blue/30 rounded-full">{item.date?.split('T')[0] || 'TBD'}</span>
                                                    {item.isTicketed && <Ticket size={14} className="text-neon-green drop-shadow-[0_0_8px_rgba(46,255,144,0.5)]" />}
                                                </div>
                                                <h3 className="text-3xl font-black font-heading text-white uppercase italic tracking-tighter mb-2 leading-none">{item.title}</h3>
                                                <p className="text-[10px] font-medium text-gray-400 line-clamp-2 leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity duration-700 delay-100">{item.description}</p>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                            </AnimatePresence>

                            {upcomingEvents.length === 0 && (
                                <div className="col-span-full py-40 flex flex-col items-center justify-center gap-6 bg-zinc-900/20 rounded-[3rem] border-2 border-dashed border-white/5">
                                    <Clock size={48} className="text-gray-700" />
                                    <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.3em]">NO NEWBI EVENTS PLANNED.</p>
                                    <Button onClick={() => setIsAdding(true)} className="h-14 px-10 bg-neon-blue text-black font-black uppercase tracking-widest rounded-2xl">ADD FIRST EVENT</Button>
                                </div>
                            )}
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default UpcomingEventsManager;
