import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import LayoutGrid from 'lucide-react/dist/esm/icons/layout-grid';
import Plus from 'lucide-react/dist/esm/icons/plus';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import Edit from 'lucide-react/dist/esm/icons/edit';
import Save from 'lucide-react/dist/esm/icons/save';
import Eye from 'lucide-react/dist/esm/icons/eye';
import EyeOff from 'lucide-react/dist/esm/icons/eye-off';
import Loader from 'lucide-react/dist/esm/icons/loader';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import Clock from 'lucide-react/dist/esm/icons/clock';
import MapPin from 'lucide-react/dist/esm/icons/map-pin';
import IndianRupee from 'lucide-react/dist/esm/icons/indian-rupee';
import ImageIcon from 'lucide-react/dist/esm/icons/image';
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down';
import ChevronUp from 'lucide-react/dist/esm/icons/chevron-up';
import X from 'lucide-react/dist/esm/icons/x';
import Upload from 'lucide-react/dist/esm/icons/upload';
import Zap from 'lucide-react/dist/esm/icons/zap';
import Ticket from 'lucide-react/dist/esm/icons/ticket';
import Link2 from 'lucide-react/dist/esm/icons/link-2';
import Copy from 'lucide-react/dist/esm/icons/copy';
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle';
import Mail from 'lucide-react/dist/esm/icons/mail';
import Radio from 'lucide-react/dist/esm/icons/radio';
import Calendar from 'lucide-react/dist/esm/icons/calendar';
import FileText from 'lucide-react/dist/esm/icons/file-text';
import Music from 'lucide-react/dist/esm/icons/music';
import RotateCcw from 'lucide-react/dist/esm/icons/rotate-ccw';

import { useStore } from '../../lib/store';
import { notifyAllUsers } from '../../lib/notificationTriggers';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import LivePreview from '../../components/admin/LivePreview';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import AdminDashboardLink from '../../components/admin/AdminDashboardLink';
import StudioDatePicker from '../../components/ui/StudioDatePicker';
import StudioTimePicker from '../../components/ui/StudioTimePicker';
import StudioSelect from '../../components/ui/StudioSelect';


import AdminCommunityHubLayout from '../../components/admin/AdminCommunityHubLayout';

const UpcomingEventsManager = () => {
    const { upcomingEvents, addUpcomingEvent, updateUpcomingEvent, deleteUpcomingEvent, updateUpcomingEventOrder, siteSettings, toggleUpcomingSectionVisibility, portfolioCategories, addNotification } = useStore();
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [showPreviewMobile, setShowPreviewMobile] = useState(false);
    const [activeEditorTab, setActiveEditorTab] = useState('basics');

    const [newEvent, setNewEvent] = useState({
        title: '',
        date: '',
        category: '',
        description: '',
        location: '',
        buttonText: '',
        image: '',
        link: '',
        venueLayout: '',
        isTicketed: false,
        ticketMode: 'qr',
        isGuestlistEnabled: false,
        ticketCategories: [],
        alsoPostToAnnouncements: false,
        imageTransform: { scale: 1, x: 0, y: 0 },
        artists: [],
        ageLimit: 'ALL AGES',
        doorsOpen: '',
        performanceType: 'LIVE SHOW',
        highlightColor: '#2ebfff',
        ticketingDescription: '',
        ticketingRules: '',
    });
    const [artistsInput, setArtistsInput] = useState('');
    const [venueLayoutFile, setVenueLayoutFile] = useState(null);

    const coreContentTabs = [
        { name: 'Upcoming', path: '/admin/upcoming-events', icon: Calendar, color: 'text-neon-green' },
        { name: 'Announcements', path: '/admin/announcements', icon: Radio, color: 'text-neon-pink' },
        { name: 'Blog', path: '/admin/blog', icon: FileText, color: 'text-neon-blue' },
        { name: 'Portfolio', path: '/admin/concertzone', icon: Music, color: 'text-neon-purple' },
    ];

    const resetForm = () => {
        setNewEvent({
            title: '', date: '', time: '', category: '', description: '', location: '', buttonText: '', image: '', link: '', venueLayout: '', alsoPostToAnnouncements: false,
            isTicketed: false, ticketMode: 'qr', isGuestlistEnabled: false, ticketCategories: [],
            imageTransform: { scale: 1, x: 0, y: 0 },
            artists: [], ageLimit: 'ALL AGES', doorsOpen: '', performanceType: 'LIVE SHOW', highlightColor: '#2ebfff',
            ticketingDescription: '', ticketingRules: ''
        });
        setArtistsInput('');
        setActiveEditorTab('basics');
        setShowPreviewMobile(false);
        setIsAdding(false);
        setEditingId(null);
        setSelectedFile(null);
        setVenueLayoutFile(null);
        setUploading(false);
    };

    const handleEdit = (item) => {
        setEditingId(item.id);
        setIsAdding(true);
        
        let dateValue = item.date;
        // Handle Firestore Timestamp
        if (dateValue && dateValue.seconds) {
            dateValue = new Date(dateValue.seconds * 1000).toISOString();
        } else if (dateValue && typeof dateValue !== 'string') {
            try {
                dateValue = new Date(dateValue).toISOString();
            } catch (e) {
                dateValue = '';
            }
        }

        const artists = item.artists || [];
        setArtistsInput(artists.join(', '));
        
        setNewEvent({ 
            ...item, 
            date: dateValue || '', 
            alsoPostToAnnouncements: false,
            artists: artists,
            ageLimit: item.ageLimit || 'ALL AGES',
            doorsOpen: item.doorsOpen || '',
            performanceType: item.performanceType || 'LIVE SHOW',
            highlightColor: item.highlightColor || '#2ebfff'
        });
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

            const eventData = { 
                ...newEvent, 
                image: imageUrl, 
                venueLayout: venueLayoutUrl, 
                buttonText: newEvent.buttonText || "LEARN MORE"
            };

            if (editingId) {
                await updateUpcomingEvent(editingId, eventData);
            } else {
                await addUpcomingEvent(eventData, newEvent.alsoPostToAnnouncements);
            }
            resetForm();
        } catch (error) {
            addNotification({
                title: "Database Error",
                content: "The system was unable to save your changes.",
                type: 'error'
            });
        } finally {
            setUploading(false);
        }
    };

    return (
        <AdminCommunityHubLayout
            studioHeader={{
                title: 'EVENT',
                subtitle: 'MANAGEMENT',
                accentClass: 'text-neon-pink',
                icon: Calendar
            }}
            tabs={coreContentTabs}
            accentColor="neon-pink"
            action={!isAdding && (
                <div className="flex flex-col sm:flex-row flex-wrap gap-2 md:gap-4 w-full md:w-auto">
                    <button
                        onClick={() => toggleUpcomingSectionVisibility(siteSettings?.showUpcomingEvents)}
                        className={cn(
                            "h-12 md:h-14 px-4 md:px-8 rounded-xl md:rounded-2xl flex items-center justify-center gap-3 text-[9px] md:text-[10px] font-black uppercase tracking-widest border transition-all w-full sm:w-auto",
                            siteSettings?.showUpcomingEvents ? "bg-neon-green/10 text-neon-green border-neon-green/20" : "bg-red-500/10 text-red-500 border-red-500/20"
                        )}
                    >
                        {siteSettings?.showUpcomingEvents ? <Eye size={16} /> : <EyeOff size={16} />}
                        Public: {siteSettings?.showUpcomingEvents ? 'Visible' : 'Hidden'}
                    </button>
                    <Button onClick={() => { setIsAdding(true); setEditingId(null); setActiveEditorTab('basics'); }} className="h-12 md:h-14 px-6 md:px-10 bg-neon-blue text-black font-black uppercase tracking-widest rounded-xl md:rounded-2xl shadow-[0_10px_30px_rgba(0,255,255,0.2)] w-full sm:w-auto">
                        <Plus className="mr-2" size={18} /> New Entry
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
                            showPreviewMobile ? "bg-white text-black border-white" : "bg-neon-blue text-black border-neon-blue"
                        )}
                    >
                        {showPreviewMobile ? <X size={24} /> : <Eye size={24} />}
                    </button>
                </div>
            )}
            <div className="relative z-10 max-w-[1400px] mx-auto px-4 md:px-8 pt-10">

                <AnimatePresence mode="wait">
                    {isAdding ? (
                        <div className="flex flex-col lg:flex-row gap-10 items-start pb-32">
                            <div className="flex-1 w-full relative">
                                <AnimatePresence mode="wait">
                                    {showPreviewMobile ? (
                                        <motion.div key="mobile-preview" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="lg:hidden">
                                            <LivePreview type="event" data={{ ...newEvent, image: selectedFile ? URL.createObjectURL(selectedFile) : newEvent.image }} />
                                        </motion.div>
                                    ) : (
                                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="grid grid-cols-1 xl:grid-cols-12 gap-10">
                                            <div className="xl:col-span-8">
                                                <Card className="p-6 md:p-10 bg-zinc-900/40 backdrop-blur-3xl border-white/5 rounded-[2.5rem] md:rounded-[3rem]">
                                                    <div className="flex justify-between items-center mb-10">
                                                        <h2 className="text-2xl font-black font-heading tracking-tighter uppercase italic text-white flex items-center gap-3 leading-none">
                                                            BASICS <span className="text-neon-blue">ENGINE.</span>
                                                        </h2>
                                                        <button onClick={resetForm} className="text-[10px] font-black text-gray-500 hover:text-white uppercase tracking-widest">Abort</button>
                                                    </div>

                                                    <form onSubmit={handleSubmit} className="space-y-16">
                                                        <div className="space-y-4">
                                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Event Description</label>
                                                            <textarea 
                                                                className="w-full bg-black/50 border border-white/5 rounded-[2rem] p-8 text-white focus:outline-none focus:border-neon-pink/40 min-h-[150px] resize-none text-[11px] font-medium placeholder:text-gray-800 leading-relaxed italic shadow-inner uppercase tracking-widest" 
                                                                value={newEvent.description} 
                                                                onChange={e => setNewEvent({ ...newEvent, description: e.target.value })} 
                                                                placeholder="Rules of entry, age limits, dress code..." 
                                                            />
                                                        </div>

                                                        {/* Section 1: Identity */}
                                                        <div className="space-y-8">
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                                <div className="space-y-3">
                                                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Event Title</label>
                                                                    <Input placeholder="E.G. SUMMER MUSIC FESTIVAL..." value={newEvent.title} onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })} required className="h-16 bg-black/50 border-white/5 rounded-2xl uppercase text-[10px] font-black tracking-widest px-6" />
                                                                </div>
                                                                <div className="space-y-3">
                                                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Event Date & Time</label>
                                                                    <div className="grid grid-cols-2 gap-4">
                                                                        <StudioDatePicker
                                                                            value={(typeof newEvent.date === 'string' && newEvent.date.includes('T')) ? newEvent.date.split('T')[0] : (typeof newEvent.date === 'string' ? newEvent.date : '')}
                                                                            onChange={(val) => {
                                                                                const timePart = (typeof newEvent.date === 'string' && newEvent.date.includes('T')) ? newEvent.date.split('T')[1] : '20:00';
                                                                                setNewEvent({ ...newEvent, date: `${val}T${timePart}` });
                                                                            }}
                                                                            className="h-16"
                                                                        />
                                                                        <StudioTimePicker
                                                                            value={(typeof newEvent.date === 'string' && newEvent.date.includes('T')) ? newEvent.date.split('T')[1] : '20:00'}
                                                                            onChange={(val) => {
                                                                                const datePart = (typeof newEvent.date === 'string' && newEvent.date.includes('T')) ? newEvent.date.split('T')[0] : new Date().toISOString().split('T')[0];
                                                                                setNewEvent({ ...newEvent, date: `${datePart}T${val}` });
                                                                            }}
                                                                            className="h-16"
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                                <div className="space-y-3">
                                                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Event Location</label>
                                                                    <Input placeholder="E.G. MAINLAND INDIA, VENUE NAME..." value={newEvent.location} onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })} className="h-16 bg-black/50 border-white/5 rounded-2xl uppercase text-[10px] font-black tracking-widest px-6" />
                                                                </div>
                                                                <div className="space-y-3">
                                                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Category</label>
                                                                    <StudioSelect
                                                                        value={newEvent.category}
                                                                        options={portfolioCategories.map(cat => ({ value: cat.id, label: cat.label.toUpperCase() }))}
                                                                        onChange={val => setNewEvent({ ...newEvent, category: val })}
                                                                        placeholder="SELECT CATEGORY..."
                                                                        className="h-16"
                                                                        accentColor="neon-blue"
                                                                    />
                                                                </div>
                                                            </div>

                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                                <div className="space-y-3">
                                                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Artists Lineup</label>
                                                                    <Input placeholder="E.G. ARTIST 1, ARTIST 2..." value={artistsInput} onChange={(e) => { const val = e.target.value; setArtistsInput(val); setNewEvent({ ...newEvent, artists: val.split(',').map(s => s.trim()).filter(s => s !== '') }); }} className="h-16 bg-black/50 border-white/5 rounded-2xl uppercase text-[10px] font-black tracking-widest px-6" />
                                                                </div>
                                                                <div className="space-y-3">
                                                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Performance Type</label>
                                                                    <Input placeholder="E.G. LIVE SHOW, DJ SET..." value={newEvent.performanceType} onChange={(e) => setNewEvent({ ...newEvent, performanceType: e.target.value })} className="h-16 bg-black/50 border-white/5 rounded-2xl uppercase text-[10px] font-black tracking-widest px-6" />
                                                                </div>
                                                            </div>

                                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                                                <div className="space-y-3">
                                                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Doors Open</label>
                                                                    <Input placeholder="E.G. 7:00 PM" value={newEvent.doorsOpen} onChange={(e) => setNewEvent({ ...newEvent, doorsOpen: e.target.value })} className="h-16 bg-black/50 border-white/5 rounded-2xl uppercase text-[10px] font-black tracking-widest px-6" />
                                                                </div>
                                                                <div className="space-y-3">
                                                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Age Limit</label>
                                                                    <Input placeholder="E.G. 18+, ALL AGES" value={newEvent.ageLimit} onChange={(e) => setNewEvent({ ...newEvent, ageLimit: e.target.value })} className="h-16 bg-black/50 border-white/5 rounded-2xl uppercase text-[10px] font-black tracking-widest px-6" />
                                                                </div>
                                                                <div className="space-y-3">
                                                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Accent Color</label>
                                                                    <div className="flex gap-2">
                                                                        <Input type="color" value={newEvent.highlightColor} onChange={(e) => setNewEvent({ ...newEvent, highlightColor: e.target.value })} className="h-16 w-20 bg-black/50 border-white/5 rounded-2xl cursor-pointer p-2" />
                                                                        <Input placeholder="#000000" value={newEvent.highlightColor} onChange={(e) => setNewEvent({ ...newEvent, highlightColor: e.target.value })} className="h-16 flex-1 bg-black/50 border-white/5 rounded-2xl uppercase text-[10px] font-black tracking-widest px-6" />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Section 2: Media */}
                                                        <div className="pt-16 border-t border-white/5 space-y-12">
                                                            <div className="space-y-4">
                                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Event Image Asset</label>
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
                                                            </div>

                                                            <div className="bg-white/5 p-8 rounded-3xl border border-white/5 space-y-6">
                                                                <div className="flex justify-between items-center mb-4">
                                                                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-neon-blue">Visual Calibration</h4>
                                                                    <button 
                                                                        type="button"
                                                                        onClick={() => setNewEvent({ 
                                                                            ...newEvent, 
                                                                            imageTransform: { scale: 1, x: 0, y: 0 } 
                                                                        })}
                                                                        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/5 text-[8px] font-black uppercase tracking-widest text-gray-500 hover:text-neon-blue hover:bg-neon-blue/5 hover:border-neon-blue/20 transition-all"
                                                                    >
                                                                        <RotateCcw size={10} />
                                                                        Reset
                                                                    </button>
                                                                </div>
                                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                                                    {[
                                                                        { label: 'Scale', key: 'scale', min: 1, max: 3, step: 0.01, unit: 'x', color: 'accent-neon-blue' },
                                                                        { label: 'X-Position', key: 'x', min: -100, max: 100, step: 1, unit: '%', color: 'accent-neon-green' },
                                                                        { label: 'Y-Position', key: 'y', min: -100, max: 100, step: 1, unit: '%', color: 'accent-neon-pink' }
                                                                    ].map(adjust => (
                                                                        <div key={adjust.key} className="space-y-3">
                                                                            <div className="flex justify-between">
                                                                                <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">{adjust.label}</span>
                                                                                <span className="text-[8px] font-black text-white">{(newEvent.imageTransform?.[adjust.key] || (adjust.key === 'scale' ? 1 : 0)).toFixed(adjust.step < 1 ? 2 : 0)}{adjust.unit}</span>
                                                                            </div>
                                                                            <input type="range" min={adjust.min} max={adjust.max} step={adjust.step} value={newEvent.imageTransform?.[adjust.key] || (adjust.key === 'scale' ? 1 : 0)} onChange={(e) => setNewEvent({ ...newEvent, imageTransform: { ...newEvent.imageTransform, [adjust.key]: parseFloat(e.target.value) } })} className={cn("w-full h-1 rounded-full appearance-none cursor-pointer bg-white/10", adjust.color)} />
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>

                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                                <div className="space-y-3">
                                                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Action Button Text</label>
                                                                    <Input placeholder="E.G. GET TICKETS" value={newEvent.buttonText} onChange={(e) => setNewEvent({ ...newEvent, buttonText: e.target.value })} className="h-16 bg-black/50 border-white/5 rounded-2xl uppercase text-[10px] font-black tracking-widest px-6" />
                                                                </div>
                                                                <div className="space-y-3">
                                                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Target Link (Optional)</label>
                                                                    <Input placeholder="HTTPS://..." value={newEvent.link} onChange={(e) => setNewEvent({ ...newEvent, link: e.target.value })} className="h-16 bg-black/50 border-white/5 rounded-2xl text-[10px] font-black tracking-widest px-6" />
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Section 3: Access */}
                                                        <div className="pt-16 border-t border-white/5 space-y-12">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {[
                                            { key: 'isTicketed', label: 'ENABLE TICKETING', desc: 'Allow ticket sales.', icon: Ticket, color: 'neon-green', defaultText: 'GET TICKETS' },
                                            { key: 'isGuestlistEnabled', label: 'ENABLE GUESTLIST', desc: 'Allow RSVP access.', icon: Sparkles, color: 'neon-pink', defaultText: 'RSVP NOW' }
                                        ].map(opt => (
                                            <div key={opt.key} className="p-6 bg-white/5 rounded-[2rem] border border-white/10 flex items-center gap-6 group hover:bg-white/10 transition-all cursor-pointer" 
                                                onClick={() => {
                                                    const newState = !newEvent[opt.key];
                                                    const updates = { [opt.key]: newState };
                                                    if (newState && (!newEvent.buttonText || newEvent.buttonText === 'VIEW DETAILS' || newEvent.buttonText === 'GET TICKETS' || newEvent.buttonText === 'RSVP NOW')) {
                                                        updates.buttonText = opt.defaultText;
                                                    }
                                                    setNewEvent({ ...newEvent, ...updates });
                                                }}>
                                                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center transition-all", newEvent[opt.key] ? `bg-${opt.color} text-black` : "bg-black text-gray-500 border border-white/10")}>
                                                    <opt.icon size={20} />
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-[11px] font-black uppercase tracking-widest text-white">{opt.label}</p>
                                                    <p className="text-[9px] font-medium text-gray-500">{opt.desc}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                                            {newEvent.isTicketed && (
                                                                <div className="space-y-8 bg-black/30 p-8 rounded-[2.5rem] border border-white/5">
                                                                    <div className="space-y-4">
                                                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Ticketing Infrastructure</label>
                                                                        <div className="flex gap-4 p-1.5 bg-black/40 rounded-2xl border border-white/10">
                                                                            {[
                                                                                { id: 'qr', label: 'QR PASSES (AUTOMATED)', color: 'neon-green' },
                                                                                { id: 'pdf', label: 'PDF TICKETS (OFFLINE)', color: 'neon-blue' }
                                                                            ].map(mode => (
                                                                                <button key={mode.id} type="button" onClick={() => setNewEvent({...newEvent, ticketMode: mode.id})} className={cn("flex-1 h-12 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all", newEvent.ticketMode === mode.id ? `bg-${mode.color} text-black` : "text-gray-500 hover:text-white")}>
                                                                                        {mode.label}
                                                                                </button>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                    
                                                                    <div className="space-y-4 pt-6 border-t border-white/5">
                                                                        <div className="flex justify-between items-center">
                                                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Inventory Tiers</label>
                                                                            <button type="button" onClick={() => setNewEvent({...newEvent, ticketCategories: [...(newEvent.ticketCategories || []), { id: `cat_${Date.now()}`, name: '', price: 0, description: '' }]})} className="text-[9px] font-black text-neon-green uppercase tracking-widest flex items-center gap-1"><Plus size={12}/> New Tier</button>
                                                                        </div>
                                                                        <div className="space-y-4">
                                                                            {(newEvent.ticketCategories || []).map((cat, idx) => (
                                                                                <div key={cat.id} className="flex flex-wrap md:flex-nowrap gap-4 items-center bg-black/50 p-5 rounded-2xl border border-white/5">
                                                                                    <Input placeholder="TIER NAME" value={cat.name} onChange={e => { const newCats = [...newEvent.ticketCategories]; newCats[idx].name = e.target.value; setNewEvent({...newEvent, ticketCategories: newCats}) }} className="h-12 bg-black/50 border-white/10 uppercase text-[10px] font-black tracking-widest" />
                                                                                    <div className="relative w-32 shrink-0"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-neon-green font-black text-[10px]">₹</span><Input type="number" placeholder="0" value={cat.price} onChange={e => { const newCats = [...newEvent.ticketCategories]; newCats[idx].price = parseFloat(e.target.value) || 0; setNewEvent({...newEvent, ticketCategories: newCats}) }} className="h-12 pl-8 bg-black/50 border-white/10 text-xs font-black" /></div>
                                                                                    <Input placeholder="BENEFITS..." value={cat.description} onChange={e => { const newCats = [...newEvent.ticketCategories]; newCats[idx].description = e.target.value; setNewEvent({...newEvent, ticketCategories: newCats}) }} className="h-12 bg-black/50 border-white/10 text-[10px] font-medium" />
                                                                                    <button type="button" onClick={() => { const newCats = newEvent.ticketCategories.filter((_, i) => i !== idx); setNewEvent({...newEvent, ticketCategories: newCats}) }} className="p-3 text-red-500 hover:bg-red-500/10 rounded-xl transition-all"><Trash2 size={16}/></button>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                    
                                                                    <div className="space-y-6 pt-8 border-t border-white/5">
                                                                        <div className="space-y-3">
                                                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Ticketing Overview Description</label>
                                                                            <textarea 
                                                                                placeholder="Custom message for the first page of the ticketing modal..." 
                                                                                value={newEvent.ticketingDescription} 
                                                                                onChange={e => setNewEvent({...newEvent, ticketingDescription: e.target.value})}
                                                                                className="w-full min-h-[100px] bg-black/50 border border-white/5 rounded-2xl p-6 text-[10px] font-medium text-white focus:border-neon-green/40 outline-none transition-all"
                                                                            />
                                                                        </div>
                                                                        <div className="space-y-3">
                                                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Ticketing Rules & Information</label>
                                                                            <textarea 
                                                                                placeholder="Age limits, prohibited items, cancellation policy, etc..." 
                                                                                value={newEvent.ticketingRules} 
                                                                                onChange={e => setNewEvent({...newEvent, ticketingRules: e.target.value})}
                                                                                className="w-full min-h-[100px] bg-black/50 border border-white/5 rounded-2xl p-6 text-[10px] font-medium text-white focus:border-neon-green/40 outline-none transition-all"
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                            
                                                            {!editingId && (
                                                                <div className="p-8 bg-neon-blue/5 rounded-[2.5rem] border border-neon-blue/10 flex items-center gap-6 group hover:bg-neon-blue/10 transition-all cursor-pointer" onClick={() => setNewEvent({ ...newEvent, alsoPostToAnnouncements: !newEvent.alsoPostToAnnouncements })}>
                                                                    <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center transition-all", newEvent.alsoPostToAnnouncements ? "bg-neon-blue text-black" : "bg-white/5 text-gray-500")}>
                                                                        <Zap size={24} />
                                                                    </div>
                                                                    <div className="flex-1">
                                                                        <p className="text-xs font-black uppercase tracking-widest text-white">CROSS-POST TO BROADCASTS</p>
                                                                        <p className="text-[10px] font-medium text-gray-500">Cross-post this event to the Announcements stream.</p>
                                                                    </div>
                                                                    <div className={cn("w-6 h-6 rounded-lg border flex items-center justify-center transition-all", newEvent.alsoPostToAnnouncements ? "bg-neon-blue border-neon-blue text-black" : "border-white/10")}>
                                                                        {newEvent.alsoPostToAnnouncements && <CheckCircle size={14} />}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="flex flex-col sm:flex-row gap-4 pt-10 border-t border-white/10">
                                                            <button 
                                                                type="button" 
                                                                onClick={resetForm} 
                                                                className="h-16 px-12 rounded-2xl bg-white/5 border border-white/5 text-gray-500 hover:text-white hover:bg-white/10 transition-all font-black uppercase tracking-widest text-[10px] flex-1"
                                                            >
                                                                Abort
                                                            </button>
                                                            <Button type="submit" disabled={uploading} className="h-14 px-12 sm:px-24 bg-neon-blue text-black font-black uppercase tracking-widest rounded-2xl shadow-[0_15px_40px_rgba(0,255,255,0.3)] text-[11px] hover:scale-105 active:scale-95 transition-all w-full sm:w-auto">
                                                                {uploading ? <Loader className="animate-spin" size={18} /> : (editingId ? 'COMMIT CHANGES' : 'DEPLOY EVENT')}
                                                            </Button>
                                                        </div>
                                                    </form>
                                                </Card>
                                            </div>


                                            <div className="xl:col-span-4 hidden xl:block sticky top-12">
                                                <LivePreview type="event" data={{ ...newEvent, image: selectedFile ? URL.createObjectURL(selectedFile) : newEvent.image }} />
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    ) : (
                        <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            {/* Stats bar */}
                            <div className="flex items-center gap-6 mb-10">
                                <div className="text-center">
                                    <p className="text-3xl font-black text-white font-heading">{upcomingEvents.length}</p>
                                    <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Total Events</p>
                                </div>
                                <div className="w-px h-10 bg-white/5" />
                                <div className="text-center">
                                    <p className="text-3xl font-black text-neon-blue font-heading">{upcomingEvents.filter(e => e.isTicketed).length}</p>
                                    <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Ticketed</p>
                                </div>
                                <div className="w-px h-10 bg-white/5" />
                                <div className="text-center">
                                    <p className="text-3xl font-black text-neon-pink font-heading">{upcomingEvents.filter(e => e.isGuestlistEnabled).length}</p>
                                    <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Guestlist</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-20">
                                <AnimatePresence mode="popLayout">
                                {upcomingEvents.map((item, index) => (
                                    <motion.div
                                        key={item.id}
                                        layout
                                        initial={{ opacity: 0, scale: 0.92 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.92 }}
                                        transition={{ duration: 0.4 }}
                                        className="group relative aspect-[4/5] rounded-[2.5rem] overflow-hidden bg-zinc-950 border border-white/5 hover:border-neon-blue/20 transition-all duration-500 shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
                                    >
                                        {/* Full-bleed image */}
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
                                                    <Calendar size={40} className="text-gray-800" />
                                                </div>
                                            )}
                                            {/* Gradient layers */}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/10 z-10" />
                                            {/* Neon accent glow on hover */}
                                            <div className="absolute inset-0 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-700"
                                                style={{ background: `radial-gradient(ellipse at bottom, ${item.highlightColor || '#2ebfff'}12 0%, transparent 70%)` }} />
                                        </div>

                                        {/* Top toolbar — slides down on hover */}
                                        <div className="absolute top-5 left-5 right-5 z-30 flex justify-between items-start opacity-0 group-hover:opacity-100 -translate-y-2 group-hover:translate-y-0 transition-all duration-400">
                                            <div className="flex gap-2">
                                                <button onClick={() => moveItem(index, 'up')} disabled={index === 0}
                                                    className="w-9 h-9 rounded-xl bg-black/70 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-neon-blue hover:text-black transition-all disabled:opacity-0">
                                                    <ChevronUp size={16} />
                                                </button>
                                                <button onClick={() => moveItem(index, 'down')} disabled={index === upcomingEvents.length - 1}
                                                    className="w-9 h-9 rounded-xl bg-black/70 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-neon-blue hover:text-black transition-all disabled:opacity-0">
                                                    <ChevronDown size={16} />
                                                </button>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => {
                                                        const params = new URLSearchParams({ subject: `UPDATE: ${item.title}`, header: item.title, body: item.description, heroImage: item.image, ctaText: 'See Details', ctaUrl: `${window.location.origin}/concertzone` });
                                                        window.location.href = `/admin/mailing?${params.toString()}`;
                                                    }}
                                                    className="w-9 h-9 rounded-xl bg-black/70 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-neon-green hover:text-black transition-all"
                                                    title="Mailing List"
                                                >
                                                    <Mail size={15} />
                                                </button>
                                                <button
                                                    onClick={async () => {
                                                        if (window.confirm(`Broadcast "${item.title}" to all users?`)) {
                                                            await notifyAllUsers(item.title, item.description, `/concertzone`, item.image);
                                                            addNotification({ title: 'Announcement Sent', content: `Users notified about "${item.title}".`, type: 'message' });
                                                        }
                                                    }}
                                                    className="w-9 h-9 rounded-xl bg-neon-blue/20 backdrop-blur-md border border-neon-blue/30 flex items-center justify-center text-neon-blue hover:bg-neon-blue hover:text-black transition-all"
                                                    title="Broadcast"
                                                >
                                                    <Sparkles size={15} />
                                                </button>
                                                <button onClick={() => handleEdit(item)}
                                                    className="w-9 h-9 rounded-xl bg-black/70 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-neon-blue hover:text-black transition-all">
                                                    <Edit size={15} />
                                                </button>
                                                <button onClick={() => deleteUpcomingEvent(item.id)}
                                                    className="w-9 h-9 rounded-xl bg-black/70 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-red-500 transition-all">
                                                    <Trash2 size={15} />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Bottom content slab */}
                                        <div className="absolute inset-x-6 bottom-6 z-20 space-y-3">
                                            {/* Badges row */}
                                            <div className="flex flex-wrap gap-2">
                                                <span
                                                    className="px-2.5 py-1 text-[7px] font-black uppercase tracking-widest border rounded-full backdrop-blur-md"
                                                    style={{
                                                        backgroundColor: `${item.highlightColor || '#2ebfff'}11`,
                                                        borderColor: `${item.highlightColor || '#2ebfff'}33`,
                                                        color: item.highlightColor || '#2ebfff'
                                                    }}
                                                >
                                                    {item.performanceType || 'EVENT'}
                                                </span>
                                                <span className="px-2.5 py-1 bg-white/5 border border-white/10 text-white/50 text-[7px] font-black uppercase tracking-widest rounded-full backdrop-blur-md">
                                                    {(typeof item.date === 'string' && item.date.includes('T'))
                                                        ? item.date.split('T')[0]
                                                        : (item.date?.seconds ? new Date(item.date.seconds * 1000).toLocaleDateString() : 'TBD')}
                                                </span>
                                            </div>

                                            {/* Title */}
                                            <h3 className="text-xl font-black font-heading tracking-tight uppercase italic text-white group-hover:text-neon-blue transition-colors duration-500 leading-tight line-clamp-2">
                                                {item.title}
                                            </h3>

                                            {/* Artists + access indicators */}
                                            <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
                                                {item.artists?.length > 0 ? (
                                                    <p className="text-[8px] font-black text-white/40 uppercase tracking-widest truncate">
                                                        {item.artists.slice(0, 2).join(' • ')}{item.artists.length > 2 ? ` +${item.artists.length - 2}` : ''}
                                                    </p>
                                                ) : <span />}
                                                <div className="flex items-center gap-3 shrink-0">
                                                    {item.isTicketed && (
                                                        <span className="flex items-center gap-1 text-[7px] font-black text-neon-green uppercase tracking-widest">
                                                            <Ticket size={9} /> TKT
                                                        </span>
                                                    )}
                                                    {item.isGuestlistEnabled && (
                                                        <span className="flex items-center gap-1 text-[7px] font-black text-neon-pink uppercase tracking-widest">
                                                            <Sparkles size={9} /> RSVP
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                                </AnimatePresence>

                                {upcomingEvents.length === 0 && (
                                    <div className="col-span-full py-32 flex flex-col items-center justify-center gap-6 bg-zinc-900/20 rounded-[3rem] border-2 border-dashed border-white/5">
                                        <div className="w-16 h-16 rounded-full border border-white/10 flex items-center justify-center text-gray-700 animate-pulse">
                                            <Calendar size={28} />
                                        </div>
                                        <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.3em]">No events scheduled.</p>
                                        <Button onClick={() => setIsAdding(true)} className="h-12 px-10 bg-neon-blue text-black font-black uppercase tracking-widest rounded-2xl">
                                            Add First Event
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

export default UpcomingEventsManager;
