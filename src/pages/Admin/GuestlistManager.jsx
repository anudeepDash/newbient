import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../lib/store';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import AdminCommunityHubLayout from '../../components/admin/AdminCommunityHubLayout';
import LivePreview from '../../components/admin/LivePreview';
import CommunityCard from '../../components/community/CommunityCard';
import { notifyAllUsers } from '../../lib/notificationTriggers';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import StudioDatePicker from '../../components/ui/StudioDatePicker';
import StudioTimePicker from '../../components/ui/StudioTimePicker';
import StudioSelect from '../../components/ui/StudioSelect';
import { 
    LayoutGrid, Sparkles, Plus, Trash2, Save, Eye, Loader, ListChecks, 
    Info, Megaphone, ArrowRight, Search, Pin, Users, FileText, Palette, 
    Image as ImageIcon, X, Monitor 
} from 'lucide-react';

const GuestlistManager = () => {
    const navigate = useNavigate();
    const { 
        guestlists = [], upcomingEvents = [], addGuestlist, updateGuestlist, 
        deleteGuestlist, updateUpcomingEvent, addUpcomingEvent, uploadToCloudinary
    } = useStore();
    
    // viewMode: 'dashboard' | 'select_event' | 'edit'
    const [viewMode, setViewMode] = useState('dashboard');
    const [selectedEventId, setSelectedEventId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [saving, setSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [previewType, setPreviewType] = useState('card'); // 'card' | 'embed'
    
    const [formData, setFormData] = useState({
        title: '',
        date: '',
        time: '',
        location: '',
        link: '', // External Registry Link
        whatsappLink: '', 
        status: 'Open', // Open, Closed, Past
        description: '',
        customFields: [],
        perUserLimit: 1,
        maxSpots: 100,
        image: '', 
        highlightColor: '#2ebfff',
        importantNotes: '',
        guestlistEnabled: true,
        artists: [], 
        isPinned: false,
        imageTransform: { scale: 1.05, x: 0, y: 0 }
    });

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const url = await uploadToCloudinary(file);
            if (url) {
                setFormData(prev => ({ ...prev, image: url }));
            }
        } catch (error) {
            console.error("Upload failed:", error);
            alert("UPLOAD FAILED. PLEASE TRY AGAIN.");
        } finally {
            setIsUploading(false);
        }
    };

    const colorPresets = [
        { name: 'Cyber Blue', value: '#2ebfff' },
        { name: 'Neon Pink', value: '#FF4F8B' },
        { name: 'Electric Purple', value: '#BF00FF' },
        { name: 'Neon Green', value: '#39FF14' },
    ];

    const resetForm = () => {
        setFormData({
            title: '',
            date: 'TBD',
            time: '20:00',
            location: '',
            link: '',
            whatsappLink: '',
            status: 'Open',
            description: '',
            customFields: [],
            perUserLimit: 1,
            maxSpots: 100,
            image: '',
            highlightColor: '#2ebfff',
            guestlistEnabled: true,
            artists: [],
            imageTransform: { scale: 1.05, x: 0, y: 0 },
            isPinned: false
        });
        setViewMode('dashboard');
        setSelectedEventId(null);
        setIsUploading(false);
        setSaving(false);
    };

    const handleSelectEvent = (id) => {
        if (!id) {
            // STANDALONE INITIALIZATION
            setSelectedEventId(null);
            setFormData({
                title: '',
                date: 'TBD',
                time: '20:00',
                location: '',
                link: '',
                whatsappLink: '',
                status: 'Open',
                description: '',
                customFields: [],
                perUserLimit: 1,
                maxSpots: 100,
                image: '',
                highlightColor: '#2ebfff',
                importantNotes: '',
                guestlistEnabled: true,
                artists: [],
                imageTransform: { scale: 1.05, x: 0, y: 0 }
            });
            setViewMode('edit');
            return;
        }

        const event = upcomingEvents.find(e => e.id === id);
        const gl = guestlists.find(g => g.eventId === id || g.linkedEventId === id);
        
        setSelectedEventId(id);
        if (gl) {
            setFormData({
                ...gl,
                title: gl.title || event?.title || '',
                date: gl.date || event?.date || 'TBD',
                location: gl.location || event?.location || '',
                image: gl.image || event?.image || '',
                artists: Array.isArray(gl.artists) ? gl.artists : (gl.artists ? gl.artists.split(',').map(a => a.trim()) : []),
                imageTransform: gl.imageTransform || { scale: 1.05, x: 0, y: 0 }
            });
        } else {
            setFormData({
                title: event?.title || '',
                date: event?.date || 'TBD',
                time: event?.time || '20:00',
                location: event?.location || '',
                link: '',
                whatsappLink: '',
                status: 'Open',
                description: event?.description || '',
                customFields: [],
                perUserLimit: 1,
                maxSpots: 100,
                image: event?.image || '',
                highlightColor: event?.highlightColor || '#2ebfff',
                importantNotes: '',
                guestlistEnabled: true,
                artists: Array.isArray(event?.artists) ? event.artists : (event?.artists ? event.artists.split(',').map(a => a.trim()) : []),
                eventId: id,
                imageTransform: event?.imageTransform || { scale: 1.05, x: 0, y: 0 },
                isPinned: event?.isPinned || false
            });
        }
        setViewMode('edit');
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to permanently delete this guestlist?')) {
            await deleteGuestlist(id);
        }
    };

    const handlePushNotification = async (gl) => {
        await notifyAllUsers(
            'NEW GUESTLIST OPEN!',
            `${gl.title.toUpperCase()} ACCESS IS NOW LIVE.`,
            '/community',
            'guestlist'
        );
        alert('Guestlist announcement sent to all users.');
    };

    const handlePromoteToEvent = async (gl) => {
        if (window.confirm(`Promote "${gl.title}" to Public Upcoming Events? This will create a mirrored event card on the home page, trigger a site announcement, and link it to this guestlist.`)) {
            setSaving(true);
            try {
                // 1. Prepare mirrored Event Data
                const eventData = {
                    title: gl.title,
                    date: gl.date || 'TBD',
                    time: gl.time || '20:00',
                    location: gl.location || '',
                    image: gl.image || '',
                    description: gl.description || '',
                    artists: gl.artists || [], 
                    highlightColor: gl.highlightColor || '#2ebfff',
                    imageTransform: gl.imageTransform || { scale: 1.05, x: 0, y: 0 },
                    isGuestlistEnabled: true,
                    linkedGuestlistId: gl.id,
                    maxSpots: gl.maxSpots || 100,
                    perUserLimit: gl.perUserLimit || 1,
                    customFields: gl.customFields || [],
                    category: 'Experience'
                };

                // 2. Create Event & Trigger Announcement
                const newEventId = await addUpcomingEvent(eventData, true); 
                
                // 3. Establish Bi-Directional Link: Update source guestlist with the new eventId
                await updateGuestlist(gl.id, { eventId: newEventId });
                
                alert("SUCCESS: Promotion Complete! Event mirrored to Public Hub and Site Announcements triggered.");
                navigate('/admin/upcoming-events');
            } catch (error) {
                alert(`Promotion Error: ${error.message}`);
                console.error(error);
            } finally {
                setSaving(false);
            }
        }
    };

    const handleSave = async (e) => {
        if (e) e.preventDefault();
        setSaving(true);
        try {
            const finalImageUrl = formData.image;

            const artistsArray = Array.isArray(formData.artists) 
                ? formData.artists 
                : (formData.artists ? formData.artists.split(',').map(a => a.trim()).filter(a => a !== '') : []);

            const payload = { 
                ...formData, 
                image: finalImageUrl,
                artists: artistsArray,
                date: formData.date || 'TBD'
            };

            if (selectedEventId) {
                const existingGl = guestlists.find(g => g.eventId === selectedEventId || g.linkedEventId === selectedEventId);
                if (existingGl) {
                    await updateGuestlist(existingGl.id, payload);
                } else {
                    await addGuestlist({ ...payload, eventId: selectedEventId });
                }
                // Ensure the linked event has guestlist enabled
                await updateUpcomingEvent(selectedEventId, { isGuestlistEnabled: true });
            } else {
                // Standalone creation or update (find by title or ID if existing)
                const existingStandalone = guestlists.find(g => g.title === payload.title && !g.eventId);
                if (existingStandalone) {
                    await updateGuestlist(existingStandalone.id, payload);
                } else {
                    await addGuestlist(payload);
                }
            }

            alert("Guestlist details saved! Core systems updated.");
            setViewMode('dashboard');
            setSelectedEventId(null);
        } catch (error) {
            alert(`Error: ${error.message}`);
        } finally {
            setSaving(false);
            setSelectedFile(null);
        }
    };

    const addField = () => {
        setFormData({
            ...formData,
            customFields: [...(formData.customFields || []), { label: '', type: 'text', required: true }]
        });
    };

    const removeField = (index) => {
        const updated = [...formData.customFields];
        updated.splice(index, 1);
        setFormData({ ...formData, customFields: updated });
    };

    return (
        <AdminCommunityHubLayout 
            title="Access Management"
            description="Create and manage event access lists and visitor logs."
            studioHeader={{
                title: "GUESTLIST",
                subtitle: "MANAGEMENT",
                accentClass: "text-neon-blue"
            }}
            action={viewMode !== 'dashboard' ? (
                <button 
                    onClick={() => { setViewMode('dashboard'); setSelectedEventId(null); }} 
                    className="inline-flex items-center gap-3 text-neon-blue hover:text-white transition-all uppercase text-[10px] font-black tracking-[0.3em] group bg-white/5 py-3 px-6 rounded-2xl border border-white/10"
                >
                    <ArrowRight size={14} className="rotate-180 group-hover:-translate-x-1 transition-transform" /> 
                    RETURN TO HUB
                </button>
            ) : null}
        >
            <div className="relative z-10 max-w-[1400px] mx-auto pb-32">
                {/* Mode Actions */}
                <div className="flex justify-end mb-12">
                    {viewMode === 'dashboard' && (
                        <div className="flex gap-4">
                            <Button
                                onClick={() => setViewMode('select_event')}
                                className="h-14 px-10 bg-neon-blue text-black font-black uppercase tracking-widest rounded-2xl shadow-[0_10px_30px_rgba(46,191,255,0.2)] hover:scale-105 transition-all outline-none border-none"
                            >
                                <Plus className="mr-2" size={18} /> New Batch
                            </Button>
                        </div>
                    )}

                    {viewMode === 'edit' && (
                        <div className="flex gap-4">
                            <Button
                                onClick={() => window.open(`/guestlist/${selectedEventId || 'preview'}`, '_blank')}
                                className="h-14 px-8 bg-white/5 border border-white/10 text-white font-black uppercase tracking-widest rounded-2xl hover:bg-white hover:text-black transition-all"
                            >
                                <Eye size={18} className="mr-2" /> Inspect
                            </Button>
                            <Button
                                onClick={handleSave}
                                disabled={saving}
                                className="h-14 px-10 bg-neon-blue text-black font-black uppercase tracking-widest rounded-2xl shadow-[0_10px_30px_rgba(46,191,255,0.2)] hover:scale-105 transition-all outline-none border-none"
                            >
                                {saving ? <Loader className="animate-spin mr-2" size={18} /> : <Save className="mr-2" size={18} />}
                                SAVE CHANGES
                            </Button>
                        </div>
                    )}
                </div>


                <AnimatePresence mode="wait">
                    {viewMode === 'dashboard' ? (
                        <motion.div key="dashboard" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }}>
                            <div className="grid grid-cols-1 gap-6">
                                {guestlists.map((gl) => {
                                    const isPast = gl.status === 'Past';
                                    return (
                                        <Card key={gl.id} className={cn(
                                            "p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 bg-zinc-900/40 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] hover:border-neon-blue/30 transition-all duration-500 hover:shadow-[0_20px_40px_rgba(0,255,255,0.05)]",
                                            isPast && "opacity-60 grayscale-[0.5]"
                                        )}>
                                            <div className="flex items-center gap-6 flex-1">
                                                {/* Mini Image Preview */}
                                                <div className="w-16 h-16 rounded-2xl overflow-hidden bg-white/5 shrink-0 hidden md:block">
                                                    <img src={gl.image} alt="" className="w-full h-full object-cover opacity-50" />
                                                </div>
                                                
                                                <div>
                                                    <div className="flex items-center gap-3 mb-1">
                                                        <h3 className="text-xl font-black text-white uppercase italic tracking-tight">{gl.title}</h3>
                                                        <div className={cn(
                                                            "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border",
                                                            gl.status === 'Open' ? 'bg-neon-blue/10 text-neon-blue border-neon-blue/20' : 
                                                            gl.status === 'Closed' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-white/5 text-gray-500 border-white/10'
                                                        )}>
                                                            {gl.status}
                                                        </div>
                                                        {gl.isPinned && <Pin size={12} className="text-neon-blue fill-current" />}
                                                    </div>
                                                    <div className="flex flex-wrap gap-4 text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2">
                                                        <span className="flex items-center gap-1.5"><Calendar size={12} className="text-neon-blue" /> {gl.date}</span>
                                                        <span className="flex items-center gap-1.5"><MapPin size={12} className="text-neon-blue" /> {gl.location}</span>
                                                        <span className="flex items-center gap-1.5"><Users size={12} className="text-neon-blue" /> {gl.maxSpots} CAP</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3 self-end md:self-center">
                                                <div className="flex gap-2 mr-4 pr-4 border-r border-white/5">
                                                    <button 
                                                        onClick={() => handlePromoteToEvent(gl)}
                                                        className="px-5 py-2.5 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-yellow-500 hover:text-black transition-all flex items-center gap-2 group/btn"
                                                        title="Promote to Event"
                                                    >
                                                        <Megaphone size={14} className="group-hover/btn:rotate-12 transition-transform" />
                                                        Promote
                                                    </button>
                                                    <button 
                                                        onClick={() => handlePushNotification(gl)}
                                                        className="p-2.5 bg-neon-blue/10 text-neon-blue border border-neon-blue/20 rounded-xl hover:bg-neon-blue hover:text-black transition-all"
                                                        title="Broadcast Pulse"
                                                    >
                                                        <Sparkles size={16} />
                                                    </button>
                                                </div>

                                                <button 
                                                    onClick={() => handleSelectEvent(gl.eventId || gl.linkedEventId)}
                                                    className="px-5 py-2.5 bg-white/5 border border-white/10 text-[9px] font-black text-white hover:text-black hover:bg-white uppercase tracking-widest rounded-xl transition-all"
                                                >
                                                    Configure
                                                </button>
                                                
                                                <button 
                                                    onClick={() => window.open(`/guestlist/${gl.id}`, '_blank')}
                                                    className="p-2.5 bg-white/5 border border-white/10 text-gray-500 hover:text-white rounded-xl transition-all"
                                                    title="Inspect Live"
                                                >
                                                    <Eye size={16} />
                                                </button>
                                                
                                                <button 
                                                    onClick={() => handleDelete(gl.id)}
                                                    className="p-2.5 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-black rounded-xl transition-all"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </Card>
                                    );
                                })}

                                {guestlists.length === 0 && (
                                    <div className="col-span-full py-16 text-center text-gray-500 bg-white/5 rounded-[2rem] border border-dashed border-white/10">
                                        <p className="mb-2">No active guestlists found.</p>
                                        <Button 
                                            variant="link" 
                                            onClick={() => setViewMode('select_event')} 
                                            className="text-neon-blue p-0 h-auto font-black uppercase tracking-widest text-[10px]"
                                        >
                                            Begin Initialization
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    ) : viewMode === 'select_event' ? (
                        <motion.div key="selection" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }} className="space-y-12">
                            <div className="flex flex-col md:flex-row gap-8 items-start md:items-center justify-between">
                                <div className="relative group w-full max-w-2xl">
                                    <Search className="absolute left-8 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-neon-blue transition-colors" size={24} />
                                    <input 
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        placeholder="Search events for registration selection..."
                                        className="w-full bg-zinc-900/30 border border-white/10 h-20 pl-22 pr-8 rounded-[2.5rem] text-[11px] font-black uppercase tracking-widest focus:border-neon-blue/40 outline-none transition-all placeholder:text-gray-700 backdrop-blur-3xl"
                                    />
                                </div>
                                <div className="px-8 py-4 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-xl">
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Available Events: <span className="text-white">{upcomingEvents.length}</span></span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                                {upcomingEvents
                                    .filter(e => e.title.toLowerCase().includes(searchTerm.toLowerCase()))
                                    .map((event, idx) => {
                                        const gl = guestlists.find(g => g.eventId === event.id || g.linkedEventId === event.id);
                                        return (
                                            <motion.div
                                                key={event.id}
                                                initial={{ opacity: 0, scale: 0.9 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                transition={{ delay: idx * 0.05 }}
                                                onClick={() => handleSelectEvent(event.id)}
                                                className="relative group cursor-pointer bg-zinc-900/40 border border-white/5 rounded-[3.5rem] overflow-hidden aspect-[4/5] hover:border-neon-blue/40 transition-all duration-500 shadow-2xl"
                                            >
                                                <div className="absolute inset-0">
                                                    <img src={event.image} alt={event.title} className="w-full h-full object-cover opacity-20 group-hover:opacity-70 group-hover:scale-110 transition-transform duration-1000" />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/90 to-transparent" />
                                                </div>
                                                <div className="absolute inset-0 p-10 flex flex-col justify-end">
                                                    <div className="space-y-5">
                                                        <div className="flex items-center gap-4">
                                                            <span className={cn(
                                                                "px-4 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-widest",
                                                                gl ? "bg-neon-blue/10 border-neon-blue/40 text-neon-blue" : "bg-white/5 border-white/10 text-gray-600"
                                                            )}>
                                                                {gl ? 'INITIALIZED' : 'VACANT'}
                                                            </span>
                                                            {gl && <div className="w-2 h-2 rounded-full bg-neon-blue shadow-[0_0_10px_rgba(46,191,255,0.8)] animate-pulse" />}
                                                        </div>
                                                        <h3 className="text-3xl font-black italic uppercase text-white group-hover:translate-x-2 transition-transform duration-500 leading-none tracking-tighter">{event.title}</h3>
                                                        <div className="pt-6 flex justify-between items-center opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all duration-500">
                                                            <span className="text-[10px] font-black text-neon-blue uppercase tracking-[0.3em]">Configure Guestlist</span>
                                                            <ArrowRight className="text-neon-blue" size={24} />
                                                        </div>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div key="editor" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start min-h-[800px] mb-20 text-white">
                            {/* LEFT COLUMN: STUDIO EDITOR */}
                            <div className="h-full">
                                <Card className="p-6 md:p-8 border-white/5 bg-zinc-900/40 backdrop-blur-3xl rounded-[3rem] shadow-2xl h-full flex flex-col">
                                    <h2 className="text-3xl font-black font-heading text-white italic uppercase tracking-tighter mb-12 flex items-center gap-4">
                                        <Users className="text-neon-blue" size={28} />
                                        {selectedEventId ? 'Edit Guestlist Details' : 'Create Guestlist Manager'}
                                    </h2>
                                    
                                    <form onSubmit={handleSave} className="space-y-10 text-white flex-grow flex flex-col">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">DISPLAY HEADING</label>
                                                <Input 
                                                    value={formData.title} 
                                                    onChange={e => setFormData({ ...formData, title: e.target.value })} 
                                                    required 
                                                    placeholder="E.G. THE EXCLUSIVE GUESTLIST"
                                                    className="h-14 bg-black/50 border-white/5 rounded-xl px-6 text-[11px] font-black uppercase tracking-widest focus:border-neon-blue/40"
                                                />
                                            </div>
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">GUESTLIST STATUS</label>
                                                <StudioSelect
                                                    value={formData.status}
                                                    options={[
                                                        { value: 'Open', label: 'OPEN' },
                                                        { value: 'Filling Fast', label: 'FILLING FAST' },
                                                        { value: 'Closed', label: 'CLOSED' },
                                                        { value: 'Past', label: 'PAST' }
                                                    ]}
                                                    onChange={val => setFormData({ ...formData, status: val })}
                                                    className="h-14"
                                                    accentColor="neon-blue"
                                                />
                                            </div>
                                        </div>

                                        {/* SECTION 2: LOGISTICS ROW */}
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">OPERATIONAL DATE</label>
                                                <StudioDatePicker 
                                                    value={formData.date === 'TBD' ? '' : formData.date} 
                                                    onChange={(val) => setFormData({ ...formData, date: val || 'TBD' })} 
                                                    placeholder="TBD"
                                                    className="h-14"
                                                />
                                            </div>
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">DOOR TIME</label>
                                                <StudioTimePicker 
                                                    value={formData.time} 
                                                    onChange={(val) => setFormData({ ...formData, time: val })} 
                                                    className="h-14"
                                                />
                                            </div>
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">LOCATION</label>
                                                <Input 
                                                    value={formData.location} 
                                                    onChange={e => setFormData({ ...formData, location: e.target.value })} 
                                                    placeholder="E.G. ANTI-SOCIAL, MUMBAI" 
                                                    className="h-14 bg-black/50 border-white/5 rounded-xl px-6 text-[11px] font-black uppercase tracking-widest focus:border-neon-blue/40"
                                                />
                                            </div>
                                        </div>

                                        {/* SECTION 4: PREMIUM BRANDING & MEDIA */}
                                        <div className="space-y-8 pt-4">
                                            <label className="text-[11px] font-black text-neon-blue uppercase tracking-[0.4em] flex items-center gap-2">
                                                <Palette size={16} /> PREMIUM BRANDING & MEDIA
                                            </label>
                                            
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                <div className="space-y-3">
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">ARTISTS / TALENT (CSV)</label>
                                                    <Input 
                                                        value={Array.isArray(formData.artists) ? formData.artists.join(', ') : (formData.artists || '')} 
                                                        onChange={e => setFormData({ ...formData, artists: e.target.value.split(',').map(a => a.trim()) })} 
                                                        placeholder="NARIKI, SICKFLIP, AATMA..." 
                                                        className="h-14 bg-black/40 border-white/5 rounded-xl px-6 text-[11px] font-black uppercase tracking-widest focus:border-neon-blue/40 font-mono"
                                                    />
                                                </div>

                                                <div className="space-y-3">
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">COVER ASSET</label>
                                                    <div className="flex gap-4">
                                                        <div className="relative flex-1">
                                                            <ImageIcon className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                                                            <Input 
                                                                value={formData.image} 
                                                                onChange={e => setFormData({ ...formData, image: e.target.value })} 
                                                                placeholder="IMAGE_URL" 
                                                                className="pl-14 font-mono text-[9px] h-14 bg-black/40 border-white/5 rounded-xl focus:border-neon-blue/40" 
                                                            />
                                                        </div>
                                                        <div className="relative group w-14">
                                                            <input type="file" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                                                            <div className={cn("h-14 w-14 rounded-xl flex items-center justify-center border-2 border-dashed transition-all", isUploading ? "border-neon-blue bg-neon-blue/10 text-neon-blue" : "border-white/10 bg-white/5 text-gray-500 hover:border-white/20")}>
                                                                {isUploading ? <Loader className="animate-spin" size={20} /> : <Plus size={20} />}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="space-y-3">
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">THEME ACCENT COLOR</label>
                                                    <div className="flex items-center gap-4 h-14 bg-black/40 border border-white/5 rounded-xl px-6">
                                                        {colorPresets.map(color => (
                                                            <button 
                                                                key={color.value} 
                                                                type="button" 
                                                                onClick={() => setFormData({ ...formData, highlightColor: color.value })} 
                                                                className={cn(
                                                                    "w-8 h-8 rounded-full border-2 transition-all relative hover:scale-110", 
                                                                    formData.highlightColor === color.value ? "border-white shadow-[0_0_15px_rgba(46,191,255,0.4)]" : "border-black/50"
                                                                )} 
                                                                style={{ backgroundColor: color.value }} 
                                                            />
                                                        ))}
                                                        <div className="w-[1px] h-6 bg-white/10 mx-2" />
                                                        <div className="relative w-8 h-8 rounded-full border-2 border-white/10 p-0.5 bg-zinc-950 flex items-center justify-center overflow-hidden cursor-pointer" onClick={() => document.getElementById('spectrum-picker').click()}>
                                                            <div className="w-full h-full rounded-full" style={{ background: 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)', transform: 'rotate(-45deg)' }} />
                                                            <input id="spectrum-picker" type="color" value={formData.highlightColor} onChange={e => setFormData({ ...formData, highlightColor: e.target.value })} className="absolute inset-0 opacity-0 cursor-pointer" />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* SECTION 5: IMAGE ADJUSTMENT ENGINE */}
                                        <div className="p-10 rounded-3xl bg-black/40 border border-white/5 space-y-10">
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-[11px] font-black uppercase tracking-[0.4em] text-neon-blue italic">Image Positioning</h4>
                                                <button 
                                                    type="button" 
                                                    onClick={() => setFormData({ ...formData, imageTransform: { scale: 1.05, x: 0, y: 0 } })} 
                                                    className="text-[9px] font-black text-gray-600 hover:text-white uppercase tracking-widest transition-colors flex items-center gap-2"
                                                >
                                                    <X size={12} /> Reset Adjustment
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 pt-2">
                                                <div className="space-y-4">
                                                    <div className="flex justify-between">
                                                        <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Zoom / Scale</span>
                                                        <span className="text-[9px] font-black text-white">{(formData.imageTransform?.scale || 1.15).toFixed(2)}x</span>
                                                    </div>
                                                    <input 
                                                        type="range" min="0.5" max="3" step="0.01"
                                                        value={formData.imageTransform?.scale || 1.15}
                                                        onChange={(e) => setFormData({ ...formData, imageTransform: { ...formData.imageTransform, scale: parseFloat(e.target.value) } })}
                                                        className="w-full accent-neon-blue h-1 bg-white/10 rounded-full appearance-none cursor-pointer"
                                                    />
                                                </div>
                                                <div className="space-y-4">
                                                    <div className="flex justify-between">
                                                        <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">X Offset (%)</span>
                                                        <span className="text-[9px] font-black text-white">{formData.imageTransform?.x || 0}%</span>
                                                    </div>
                                                    <input 
                                                        type="range" min="-100" max="100" step="1"
                                                        value={formData.imageTransform?.x || 0}
                                                        onChange={(e) => setFormData({ ...formData, imageTransform: { ...formData.imageTransform, x: parseInt(e.target.value) } })}
                                                        className="w-full accent-white/40 h-1 bg-white/10 rounded-full appearance-none cursor-pointer"
                                                    />
                                                </div>
                                                <div className="space-y-4">
                                                    <div className="flex justify-between">
                                                        <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Y Offset (%)</span>
                                                        <span className="text-[9px] font-black text-white">{formData.imageTransform?.y || 0}%</span>
                                                    </div>
                                                    <input 
                                                        type="range" min="-100" max="100" step="1"
                                                        value={formData.imageTransform?.y || 0}
                                                        onChange={(e) => setFormData({ ...formData, imageTransform: { ...formData.imageTransform, y: parseInt(e.target.value) } })}
                                                        className="w-full accent-white/40 h-1 bg-white/10 rounded-full appearance-none cursor-pointer"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* SECTION 6: CAPACITY & SPOTLIGHT */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Registry Capacity</label>
                                                <Input 
                                                    type="number" 
                                                    value={formData.maxSpots} 
                                                    onChange={e => setFormData({ ...formData, maxSpots: Number(e.target.value) })} 
                                                    className="h-14 bg-black/50 border-white/5 rounded-xl px-6 text-white font-black focus:border-neon-blue/40"
                                                />
                                            </div>
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Visitor Limit (Plus-Ones)</label>
                                                <Input 
                                                    type="number" 
                                                    value={formData.perUserLimit} 
                                                    onChange={e => setFormData({ ...formData, perUserLimit: Number(e.target.value) })} 
                                                    className="h-14 bg-black/50 border-white/5 rounded-xl px-6 text-white font-black focus:border-neon-blue/40"
                                                />
                                            </div>
                                        </div>

                                        {/* SECTION 7: SPOTLIGHT PIN */}
                                        <div className={cn(
                                            "p-10 rounded-[2.5rem] border flex items-center justify-between transition-all duration-500", 
                                            formData.isPinned ? "bg-neon-blue/10 border-neon-blue/40 shadow-[0_0_40px_rgba(46,191,255,0.05)]" : "bg-black/40 border-white/5"
                                        )}>
                                            <div className="flex items-center gap-8">
                                                <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-xl", formData.isPinned ? "bg-neon-blue text-black" : "bg-white/5 text-gray-600")}>
                                                    <Pin size={28} className={cn(formData.isPinned && "fill-current")} />
                                                </div>
                                                <div>
                                                    <h4 className="text-white text-sm font-black uppercase tracking-widest italic leading-tight">SPOTLIGHT PIN BROADCAST</h4>
                                                    <p className="text-[10px] text-gray-600 mt-1 uppercase font-bold tracking-[0.1em]">Featured position in the Pulse Community Directory.</p>
                                                </div>
                                            </div>
                                            <button 
                                                type="button" 
                                                onClick={() => setFormData({ ...formData, isPinned: !formData.isPinned })} 
                                                className={cn("w-16 h-9 rounded-full relative transition-all border-2", formData.isPinned ? "bg-neon-blue border-neon-blue" : "bg-black/60 border-white/10")}
                                            >
                                                <div className={cn("absolute top-1 w-6 h-6 rounded-full transition-all shadow-lg", formData.isPinned ? "right-1 bg-black" : "left-1 bg-gray-600")} />
                                            </button>
                                        </div>

                                        {/* SECTION 8: MISSION BRIEF */}
                                        <div className="space-y-4">
                                            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest pl-1 flex items-center gap-2">
                                                <FileText size={16} className="text-neon-blue" /> BRIEF / INSTRUCTIONS
                                            </label>
                                            <textarea 
                                                className="w-full bg-black/60 border border-white/5 rounded-3xl p-8 text-white focus:outline-none focus:border-neon-blue/40 min-h-[200px] resize-none text-[13px] font-medium placeholder:text-gray-800 leading-relaxed shadow-inner" 
                                                value={formData.description} 
                                                onChange={e => setFormData({ ...formData, description: e.target.value })} 
                                                placeholder="Specify registration instructions, entry conditions, or arrival details..." 
                                            />
                                        </div>

                                        {/* SECTION 9: DATA CAPTURE SCHEMA */}
                                        <div className="space-y-8 pt-4">
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-[11px] font-black uppercase tracking-[0.4em] text-white/40 flex items-center gap-3">
                                                    <div className="w-8 h-px bg-white/10" /> FORM FIELDS
                                                </h4>
                                                <button onClick={addField} type="button" className="text-[11px] font-black text-neon-blue uppercase tracking-widest hover:underline flex items-center gap-2">
                                                    <Plus size={14} /> NEW INPUT FIELD
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-1 gap-4">
                                                {formData.customFields?.map((field, idx) => (
                                                    <div key={idx} className="flex gap-6 items-center bg-black/40 p-6 rounded-2xl border border-white/5 group hover:border-white/10 transition-all">
                                                        <div className="flex-1">
                                                            <Input 
                                                                value={field.label} 
                                                                onChange={e => {
                                                                    const updated = [...formData.customFields];
                                                                    updated[idx].label = e.target.value;
                                                                    setFormData({ ...formData, customFields: updated });
                                                                }} 
                                                                placeholder="Field Label (e.g. Instagram Handle)" 
                                                                className="h-12 bg-black/40 border-white/5 rounded-xl text-[11px] font-bold uppercase tracking-widest" 
                                                            />
                                                        </div>
                                                        <StudioSelect 
                                                            value={field.type} 
                                                            options={[
                                                                { value: 'text', label: 'TEXT STRING' },
                                                                { value: 'number', label: 'NUMERICAL' },
                                                                { value: 'textarea', label: 'LONG FORM' }
                                                            ]}
                                                            onChange={val => {
                                                                const updated = [...formData.customFields];
                                                                updated[idx].type = val;
                                                                setFormData({ ...formData, customFields: updated });
                                                            }} 
                                                            className="h-12 w-[160px] shrink-0"
                                                            accentColor="neon-blue"
                                                        />
                                                        <button 
                                                            onClick={() => removeField(idx)} 
                                                            type="button" 
                                                            className="text-red-500/20 hover:text-red-500 transition-colors p-3 bg-red-500/5 rounded-xl"
                                                        >
                                                            <Trash2 size={20} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* SECTION 10: ACTIONS */}
                                        <div className="flex gap-6 pt-16 mt-auto border-t border-white/5">
                                            <Button 
                                                type="button" 
                                                variant="outline" 
                                                onClick={resetForm} 
                                                className="flex-1 h-18 border-white/5 bg-white/5 text-gray-500 hover:text-white hover:bg-white/10 rounded-3xl uppercase font-black text-[11px] tracking-[0.4em] transition-all"
                                            >
                                                Abort Changes
                                            </Button>
                                            <Button 
                                                onClick={handleSave} 
                                                disabled={saving} 
                                                className="flex-[2] h-18 rounded-3xl bg-neon-blue text-black font-black uppercase tracking-[0.2em] text-[11px] hover:scale-[1.01] active:scale-[0.98] transition-all shadow-[0_10px_30px_rgba(46,191,255,0.2)] flex items-center justify-center gap-4 border-none"
                                            >
                                                {saving ? <Loader className="animate-spin" size={24} /> : <Save size={24} />}
                                                <span>{saving ? 'SAVING CHANGES...' : 'SAVE GUESTLIST'}</span>
                                            </Button>
                                        </div>
                                    </form>
                                </Card>
                            </div>

                            {/* RIGHT COLUMN: FLOATING MONITOR */}
                            <div className="h-full flex flex-col gap-8 lg:sticky lg:top-32">
                                <div className="transition-all duration-500 h-full flex flex-col">
                                    <div className="space-y-8">
                                        {/* Tab Toggle */}
                                        <div className="flex bg-zinc-900/60 border border-white/5 p-1.5 rounded-2xl w-fit backdrop-blur-xl">
                                            <button 
                                                type="button"
                                                onClick={() => setPreviewType('card')}
                                                className={cn(
                                                    "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                                    previewType === 'card' ? "bg-neon-blue text-black" : "text-gray-500 hover:text-white"
                                                )}
                                            >
                                                Card View
                                            </button>
                                            <button 
                                                type="button"
                                                onClick={() => setPreviewType('embed')}
                                                className={cn(
                                                    "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                                    previewType === 'embed' ? "bg-neon-blue text-black" : "text-gray-500 hover:text-white"
                                                )}
                                            >
                                                Embed View
                                            </button>
                                        </div>

                                        <div className="pt-4">
                                            {previewType === 'card' ? (
                                                <LivePreview type="gl" data={formData} hideDecorations={false} />
                                            ) : (
                                                <div className="h-[500px] rounded-[3rem] border border-white/5 bg-zinc-900/40 backdrop-blur-3xl flex flex-col items-center justify-center p-12 text-center">
                                                    <div className="w-16 h-16 rounded-full bg-neon-blue/10 flex items-center justify-center mb-6">
                                                        <Ticket className="text-neon-blue" size={32} />
                                                    </div>
                                                    <h3 className="text-xl font-black uppercase italic tracking-tighter text-white mb-3">Registry Checkout</h3>
                                                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 leading-relaxed max-w-xs">
                                                        This reflects the public registration flow where users will secure their spots.
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Action Kit Card */}

                                    {/* Action Kit Card */}
                                    <Card className="mt-8 p-8 bg-zinc-900/40 border border-white/5 rounded-[2.5rem] flex items-center justify-between group/promote">
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Broadcast Control</span>
                                            <span className="text-[12px] font-black text-white uppercase italic tracking-tighter">Event Promotion</span>
                                        </div>
                                        <button 
                                            type="button"
                                            onClick={() => handlePromoteToEvent(formData)} 
                                            className="p-4 bg-neon-blue text-black rounded-2xl hover:scale-110 active:scale-95 transition-all shadow-lg hover:shadow-neon-blue/40"
                                        >
                                            <Megaphone size={20} />
                                        </button>
                                    </Card>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </AdminCommunityHubLayout>
    );
};



// HELPER COMPONENTS

const TransformSlider = ({ label, value, min, max, step = 1, onChange }) => (
    <div className="space-y-4">
        <div className="flex justify-between items-center pr-2">
            <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">{label}</span>
            <span className="text-[9px] font-mono font-black text-white px-3 py-1 bg-white/5 rounded-lg">
                {typeof value === 'number' && value % 1 !== 0 ? value.toFixed(2) : value}{label.includes('%') ? '%' : 'x'}
            </span>
        </div>
        <input 
            type="range" 
            min={min} 
            max={max} 
            step={step} 
            value={value} 
            onChange={(e) => onChange(parseFloat(e.target.value))} 
            className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-neon-blue" 
        />
    </div>
);

export default GuestlistManager;
