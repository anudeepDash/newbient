import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { LayoutGrid, Plus, Trash2, Edit, Save, Eye, EyeOff, Loader, Sparkles, Clock, MapPin, IndianRupee, Image as ImageIcon, ChevronDown, ChevronUp, X, Upload, Zap, Ticket, Link2, Copy, CheckCircle, Mail } from 'lucide-react';
import { useStore } from '../../lib/store';
import { notifyAllUsers } from '../../lib/notificationTriggers';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import LivePreview from '../../components/admin/LivePreview';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import StudioDatePicker from '../../components/ui/StudioDatePicker';
import StudioTimePicker from '../../components/ui/StudioTimePicker';
import StudioSelect from '../../components/ui/StudioSelect';


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
        alsoPostToAnnouncements: false,
        imageTransform: { scale: 1, x: 0, y: 0 }
    });
    const [venueLayoutFile, setVenueLayoutFile] = useState(null);

    const resetForm = () => {
        setNewEvent({
            title: '', date: '', time: '', category: '', description: '', location: '', buttonText: '', image: '', link: '', isTicketed: false, ticketPrice: '', ticketCategories: [], venueLayout: '', alsoPostToAnnouncements: false,
            imageTransform: { scale: 1, x: 0, y: 0 }
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
            throw new Error("Upload failed.");
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

            const eventData = { 
                ...newEvent, 
                image: imageUrl, 
                venueLayout: venueLayoutUrl, 
                ticketCategories, 
                ticketPrice,
                // Ensure button text has a fallback if ticketed
                buttonText: newEvent.buttonText || (newEvent.isTicketed ? "GET TICKETS" : "LEARN MORE")
            };

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
        <div className="min-h-screen bg-[#020202] text-white pb-20 overflow-x-hidden">
            {/* Ambient Atmosphere */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-neon-green/5 rounded-full blur-[150px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-neon-blue/5 rounded-full blur-[150px] animate-pulse delay-700" />
            </div>

            <div className="relative z-10 max-w-[1400px] mx-auto px-4 md:px-8 pt-32 md:pt-40">
                {/* Header Section */}
                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-16 gap-8">
                    <div className="space-y-6 max-w-full text-left">
                        <Link to="/admin" className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition-colors group">
                            <LayoutGrid size={14} className="group-hover:rotate-90 transition-transform" />
                            BACK TO ADMIN DASHBOARD
                        </Link>
                        
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <Sparkles size={16} className="text-neon-green" />
                                <span className="text-neon-green text-[10px] font-black uppercase tracking-[0.4em]">Operations Hub</span>
                            </div>
                            <h1 className="text-4xl md:text-6xl font-black font-heading tracking-tighter uppercase italic text-white flex items-center gap-4 leading-none">
                                EVENT <span className="text-neon-green">MANAGEMENT.</span>
                            </h1>
                        </div>
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
                                Public View: {siteSettings?.showUpcomingEvents ? 'Visible' : 'Hidden'}
                            </button>
                            <Button onClick={() => { setIsAdding(true); setEditingId(null); }} className="h-14 px-10 bg-neon-blue text-black font-black uppercase tracking-widest rounded-2xl shadow-[0_10px_30px_rgba(0,255,255,0.2)]">
                                <Plus className="mr-2" size={18} /> New Entry
                            </Button>
                        </div>
                    )}
                </div>

                <AnimatePresence mode="wait">
                    {isAdding ? (
                        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
                            {/* Editor Column */}
                            <div className="lg:col-span-8">
                                <Card className="p-6 md:p-10 bg-zinc-900/40 backdrop-blur-3xl border-white/5 rounded-[2.5rem] md:rounded-[3rem]">
                                    <div className="flex justify-between items-center mb-10">
                                        <h2 className="text-2xl font-black font-heading tracking-tighter uppercase italic text-white flex items-center gap-3">
                                            <Sparkles className="text-neon-blue" size={24} /> {editingId ? 'EDIT' : 'NEW'} EVENT
                                        </h2>
                                        <button onClick={resetForm} className="text-[10px] font-black text-gray-500 hover:text-white uppercase tracking-widest">Discard</button>
                                    </div>

                                    <form onSubmit={handleSubmit} className="space-y-8">
                                        <div className="space-y-12">
                                            {/* Section 1: Core Identities */}
                                            <div className="space-y-8">
                                                <h3 className="text-[10px] font-black text-neon-blue uppercase tracking-[0.4em] flex items-center gap-3">
                                                    <div className="w-8 h-px bg-neon-blue/20" /> GENERAL DETAILS
                                                </h3>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                    <div className="space-y-3">
                                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Event Title</label>
                                                        <Input
                                                            placeholder="E.G. SUMMER MUSIC FESTIVAL..."
                                                            value={newEvent.title}
                                                            onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                                                            required
                                                            className="h-16 bg-black/50 border-white/5 rounded-2xl uppercase text-[10px] font-black tracking-widest focus:border-neon-blue/30 px-6"
                                                        />
                                                    </div>
                                                    <div className="space-y-3">
                                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Event Date & Time</label>
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <StudioDatePicker
                                                                value={newEvent.date ? newEvent.date.split('T')[0] : ''}
                                                                onChange={(val) => {
                                                                    const timePart = newEvent.date?.split('T')[1] || '20:00';
                                                                    setNewEvent({ ...newEvent, date: `${val}T${timePart}` });
                                                                }}
                                                                className="h-16"
                                                            />
                                                            <StudioTimePicker
                                                                value={newEvent.date ? newEvent.date.split('T')[1] : '20:00'}
                                                                onChange={(val) => {
                                                                    const datePart = newEvent.date?.split('T')[0] || new Date().toISOString().split('T')[0];
                                                                    setNewEvent({ ...newEvent, date: `${datePart}T${val}` });
                                                                }}
                                                                className="h-16"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                    <div className="space-y-3">
                                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Event Location</label>
                                                        <Input
                                                            placeholder="E.G. MAINLAND INDIA, VENUE NAME..."
                                                            value={newEvent.location}
                                                            onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                                                            className="h-16 bg-black/50 border-white/5 rounded-2xl uppercase text-[10px] font-black tracking-widest px-6"
                                                        />
                                                    </div>
                                                    <div className="space-y-3">
                                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Category</label>
                                                        <StudioSelect
                                                            value={newEvent.category}
                                                            options={portfolioCategories.map(cat => ({ 
                                                                value: cat.id, 
                                                                label: cat.label.toUpperCase() 
                                                            }))}
                                                            onChange={val => setNewEvent({ ...newEvent, category: val })}
                                                            placeholder="SELECT CATEGORY..."
                                                            className="h-16"
                                                            accentColor="neon-blue"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="space-y-3">
                                                    <div className="flex justify-between items-center">
                                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Event Description (Short)</label>
                                                        <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest">{newEvent.description.length}/120</span>
                                                    </div>
                                                    <textarea
                                                        className="w-full bg-black/50 border border-white/5 rounded-[2.5rem] p-8 text-[11px] font-black uppercase tracking-widest text-gray-300 focus:outline-none focus:border-neon-blue/30 transition-all h-32 resize-none shadow-inner"
                                                        placeholder="BRIEF SUMMARY FOR HOVER DETAILS..."
                                                        value={newEvent.description}
                                                        maxLength={120}
                                                        onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                                                    />
                                                </div>
                                            </div>

                                            {/* Section 2: Media & CTAs */}
                                            <div className="space-y-8">
                                                <h3 className="text-[10px] font-black text-neon-green uppercase tracking-[0.4em] flex items-center gap-3">
                                                    <div className="w-8 h-px bg-neon-green/20" /> MEDIA & ASSETS
                                                </h3>
                                                <div className="space-y-6">
                                                    <div className="space-y-4">
                                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Event Image</label>
                                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                            <div className="md:col-span-2">
                                                                <Input placeholder="PASTE ASSET URL" value={newEvent.image} onChange={(e) => setNewEvent({ ...newEvent, image: e.target.value })} className="h-16 bg-black/50 border-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest px-6" />
                                                            </div>
                                                            <div className="relative group">
                                                                <input type="file" onChange={(e) => setSelectedFile(e.target.files[0])} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                                                                <div className="h-16 border-2 border-dashed border-white/5 rounded-2xl flex items-center justify-center gap-3 bg-black/20 group-hover:border-neon-blue/30 transition-all">
                                                                    <Upload className="text-gray-500 group-hover:text-neon-blue" size={18} />
                                                                    <span className="text-[8px] font-black text-gray-500 group-hover:text-white uppercase tracking-widest">{selectedFile ? 'READY' : 'UPLOAD'}</span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Visual Calibration */}
                                                        <div className="bg-white/5 p-8 rounded-3xl border border-white/5 space-y-6">
                                                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-neon-blue mb-4">Visual Calibration</h4>
                                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                                                <div className="space-y-3">
                                                                    <div className="flex justify-between">
                                                                        <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Scale</span>
                                                                        <span className="text-[8px] font-black text-white">{(newEvent.imageTransform?.scale || 1).toFixed(2)}x</span>
                                                                    </div>
                                                                    <input 
                                                                        type="range" min="0.5" max="2" step="0.01"
                                                                        value={newEvent.imageTransform?.scale || 1}
                                                                        onChange={(e) => setNewEvent({ ...newEvent, imageTransform: { ...newEvent.imageTransform, scale: parseFloat(e.target.value) } })}
                                                                        className="w-full accent-neon-blue bg-white/10 h-1 rounded-full appearance-none cursor-pointer"
                                                                    />
                                                                </div>
                                                                <div className="space-y-3">
                                                                    <div className="flex justify-between">
                                                                        <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">X-Position</span>
                                                                        <span className="text-[8px] font-black text-white">{newEvent.imageTransform?.x || 0}%</span>
                                                                    </div>
                                                                    <input 
                                                                        type="range" min="-100" max="100" step="1"
                                                                        value={newEvent.imageTransform?.x || 0}
                                                                        onChange={(e) => setNewEvent({ ...newEvent, imageTransform: { ...newEvent.imageTransform, x: parseInt(e.target.value) } })}
                                                                        className="w-full accent-neon-green bg-white/10 h-1 rounded-full appearance-none cursor-pointer"
                                                                    />
                                                                </div>
                                                                <div className="space-y-3">
                                                                    <div className="flex justify-between">
                                                                        <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Y-Position</span>
                                                                        <span className="text-[8px] font-black text-white">{newEvent.imageTransform?.y || 0}%</span>
                                                                    </div>
                                                                    <input 
                                                                        type="range" min="-100" max="100" step="1"
                                                                        value={newEvent.imageTransform?.y || 0}
                                                                        onChange={(e) => setNewEvent({ ...newEvent, imageTransform: { ...newEvent.imageTransform, y: parseInt(e.target.value) } })}
                                                                        className="w-full accent-neon-pink bg-white/10 h-1 rounded-full appearance-none cursor-pointer"
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-3">
                                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Venue Layout / Seat Map</label>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            <Input placeholder="LAYOUT IMAGE URL" value={newEvent.venueLayout} onChange={(e) => setNewEvent({ ...newEvent, venueLayout: e.target.value })} className="h-16 bg-black/50 border-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest px-6" />
                                                            <div className="relative group">
                                                                <input type="file" onChange={(e) => setVenueLayoutFile(e.target.files[0])} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                                                                <div className="h-16 border-2 border-dashed border-white/5 rounded-2xl flex items-center justify-center gap-2 bg-black/20 group-hover:border-neon-blue/30 transition-all">
                                                                    <Upload className="text-gray-500" size={14} />
                                                                    <span className="text-[8px] font-black text-gray-500 group-hover:text-white uppercase tracking-widest">{venueLayoutFile ? 'UPLOAD READY' : 'UPLOAD MAP'}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                        <div className="space-y-3">
                                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Action Button Text</label>
                                                            <Input
                                                                placeholder="E.G. GET TICKETS"
                                                                value={newEvent.buttonText}
                                                                onChange={(e) => setNewEvent({ ...newEvent, buttonText: e.target.value })}
                                                                className="h-16 bg-black/50 border-white/5 rounded-2xl uppercase text-[10px] font-black tracking-widest px-6"
                                                            />
                                                        </div>
                                                        <div className="space-y-3">
                                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Target Link (Optional)</label>
                                                            <Input
                                                                placeholder="HTTPS://..."
                                                                value={newEvent.link}
                                                                onChange={(e) => setNewEvent({ ...newEvent, link: e.target.value })}
                                                                className="h-16 bg-black/50 border-white/5 rounded-2xl text-[10px] font-black tracking-widest px-6"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Section 3: Ticketing High Tech */}
                                            <div className="space-y-8">
                                                <h3 className="text-[10px] font-black text-yellow-500 uppercase tracking-[0.4em] flex items-center gap-3">
                                                    <div className="w-8 h-px bg-yellow-500/20" /> TICKETING & BROADCAST
                                                </h3>
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
                                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Seating Map</label>
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
                            <div className="lg:col-span-4 hidden lg:block sticky top-12">
                                <LivePreview type="event" data={{ ...newEvent, image: selectedFile ? URL.createObjectURL(selectedFile) : newEvent.image }} />
                            </div>
                        </motion.div>
                    ) : (
                        <div className="flex flex-col md:grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 pb-8 md:pb-0">
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
                                                    <button 
                                                        onClick={() => {
                                                            const params = new URLSearchParams({
                                                                subject: `UPDATE: ${item.title}`,
                                                                header: item.title,
                                                                body: item.description,
                                                                heroImage: item.image,
                                                                ctaText: 'See Details',
                                                                ctaUrl: `${window.location.origin}/ticket-selection?event=${item.id}`
                                                            });
                                                            window.location.href = `/admin/mailing?${params.toString()}`;
                                                        }}
                                                        className="w-10 h-10 rounded-xl bg-black/60 backdrop-blur-md flex items-center justify-center text-white hover:bg-neon-green transition-all"
                                                        title="Broadcast via Email"
                                                    >
                                                        <Mail size={18} />
                                                    </button>
                                                     <button
                                                        onClick={async () => {
                                                            if (window.confirm(`Transmit broadcast update for "${item.title}"?`)) {
                                                                await notifyAllUsers(
                                                                    item.title,
                                                                    item.description,
                                                                    `/ticket-selection?event=${item.id}`,
                                                                    item.image
                                                                );
                                                                alert("BROADCAST_COMPLETE.");
                                                            }
                                                        }}
                                                        className="w-10 h-10 rounded-xl bg-neon-blue/20 backdrop-blur-md flex items-center justify-center text-neon-blue border border-neon-blue/30 hover:bg-neon-blue hover:text-black transition-all shadow-[0_0_15px_rgba(0,255,255,0.1)]"
                                                        title="Direct Broadcast"
                                                    >
                                                        <Sparkles size={18} />
                                                    </button>
                                                    <button onClick={() => handleEdit(item)} className="w-10 h-10 rounded-xl bg-black/60 backdrop-blur-md flex items-center justify-center text-white hover:bg-neon-green transition-all"><Edit size={18} /></button>
                                                    <button onClick={() => deleteUpcomingEvent(item.id)} className="w-10 h-10 rounded-xl bg-black/60 backdrop-blur-md flex items-center justify-center text-white hover:bg-red-500 transition-all"><Trash2 size={18} /></button>
                                                </div>
                                            </div>
                                            
                                            <div className="translate-y-6 group-hover:translate-y-0 transition-transform duration-500">
                                                <div className="flex items-center gap-3 mb-4">
                                                    <span className="px-3 py-1 bg-neon-blue/20 text-neon-blue text-[8px] font-black uppercase tracking-widest border border-neon-blue/30 rounded-full">{item.date?.split('T')[0] || 'TBD'}</span>
                                                    {item.isTicketed && <Ticket size={14} className="text-neon-green drop-shadow-[0_0_8px_rgba(46,255,144,0.5)]" />}
                                                </div>
                                                <div>
                                                    <h3 className="text-xl md:text-3xl font-black font-heading tracking-tight uppercase italic text-white group-hover:text-neon-green transition-colors">{item.title}</h3>
                                                    <div className="flex flex-wrap items-center gap-4 md:gap-6 mt-2 md:mt-4">
                                                        <p className="text-[10px] font-medium text-gray-400 line-clamp-2 leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity duration-700 delay-100">{item.description}</p>
                                                    </div>
                                                </div>
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
