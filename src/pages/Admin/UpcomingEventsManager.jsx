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
import MapIcon from 'lucide-react/dist/esm/icons/map';
import RotateCcw from 'lucide-react/dist/esm/icons/rotate-ccw';
import VideoIcon from 'lucide-react/dist/esm/icons/video';
import Pin from 'lucide-react/dist/esm/icons/pin';

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
import EventHubModal from '../../components/community/EventHubModal';


import AdminCommunityHubLayout from '../../components/admin/AdminCommunityHubLayout';

const UpcomingEventsManager = () => {
    const { 
        upcomingEvents, addUpcomingEvent, updateUpcomingEvent, 
        deleteUpcomingEvent, updateUpcomingEventOrder, siteSettings, 
        toggleUpcomingSectionVisibility, portfolioCategories, addNotification,
        volunteerGigs, campaigns, forms, togglePinUpcomingEvent
    } = useStore();
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [selectedHubBanner, setSelectedHubBanner] = useState(null);
    const [showPreviewMobile, setShowPreviewMobile] = useState(false);
    const [activeEditorTab, setActiveEditorTab] = useState('basics');

    const [newEvent, setNewEvent] = useState({
        title: '',
        date: '',
        category: '',
        description: '',
        location: '',
        locationUrl: '',
        buttonText: '',
        image: '',
        hubImage: '',
        link: '',
        venueLayout: '',
        isTicketed: false,
        ticketMode: 'qr',
        isGuestlistEnabled: false,
        ticketCategories: [],
        alsoPostToAnnouncements: false,
        imageTransform: { scale: 1, x: 0, y: 0 },
        hubImageTransform: { scale: 1, x: 0, y: 0 },
        artists: [],
        ageLimit: 'ALL AGES',
        doorsOpen: '',
        performanceType: 'LIVE SHOW',
        highlightColor: '#2ebfff',
        ticketingDescription: '',
        ticketingRules: '',
        externalTicketingLinks: [], // { platform: '', url: '' }
        relatedVolunteerGigId: '',
        relatedCampaignId: '',
        relatedArtistFormId: '',
        videoUrl: '',
        enableVideoBackground: false,
    });
    const [artistsInput, setArtistsInput] = useState('');
    const [venueLayoutFile, setVenueLayoutFile] = useState(null);
    const [videoFile, setVideoFile] = useState(null);

    const coreContentTabs = [
        { name: 'Upcoming', path: '/admin/upcoming-events', icon: Calendar, color: 'text-neon-green' },
        { name: 'Announcements', path: '/admin/announcements', icon: Radio, color: 'text-neon-pink' },
        { name: 'Blog', path: '/admin/blog', icon: FileText, color: 'text-neon-blue' },
        { name: 'Portfolio', path: '/admin/concertzone', icon: Music, color: 'text-neon-purple' },
    ];

    const [previewEvent, setPreviewEvent] = useState(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);

    const resetForm = () => {
        setNewEvent({
            title: '', date: '', time: '', category: '', description: '', location: '', locationUrl: '', buttonText: '', image: '', hubImage: '', link: '', venueLayout: '', alsoPostToAnnouncements: false,
            isTicketed: false, ticketMode: 'qr', isGuestlistEnabled: false, ticketCategories: [],
            imageTransform: { scale: 1, x: 0, y: 0 },
            hubImageTransform: { scale: 1, x: 0, y: 0 },
            artists: [], ageLimit: 'ALL AGES', doorsOpen: '', performanceType: 'LIVE SHOW', highlightColor: '#2ebfff',
            externalTicketingLinks: [], relatedVolunteerGigId: '', relatedCampaignId: '', relatedArtistFormId: '',
            videoUrl: '', enableVideoBackground: false
        });
        setArtistsInput('');
        setActiveEditorTab('basics');
        setShowPreviewMobile(false);
        setIsAdding(false);
        setEditingId(null);
        setSelectedFile(null);
        setSelectedHubBanner(null);
        setVenueLayoutFile(null);
        setVideoFile(null);
        setUploading(false);
        setMappingCategoryId(null);
    };

    const [mappingCategoryId, setMappingCategoryId] = useState(null);
    const [dragStart, setDragStart] = useState(null);
    const [currentDrag, setCurrentDrag] = useState(null);

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

    const handlePaste = (e, type) => {
        const items = (e.clipboardData || e.originalEvent.clipboardData).items;
        for (let index in items) {
            const item = items[index];
            if (item.kind === 'file' && item.type.startsWith('image/')) {
                const file = item.getAsFile();
                if (type === 'image') {
                    setSelectedFile(file);
                    useStore.getState().addToast("Thumbnail pasted from clipboard!", 'success');
                } else if (type === 'hubImage') {
                    setSelectedHubBanner(file);
                    useStore.getState().addToast("Hub banner pasted from clipboard!", 'success');
                } else if (type === 'venueLayout') {
                    setVenueLayoutFile(file);
                    useStore.getState().addToast("Layout image pasted from clipboard!", 'success');
                }
                e.preventDefault();
            }
        }
    };

    const uploadToCloudinary = useStore.getState().uploadToCloudinary;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setUploading(true);
        try {
            let imageUrl = newEvent.image;
            if (selectedFile) imageUrl = await uploadToCloudinary(selectedFile);
            
            let venueLayoutUrl = newEvent.venueLayout;
            if (venueLayoutFile) venueLayoutUrl = await uploadToCloudinary(venueLayoutFile);
            
            let videoUrl = newEvent.videoUrl;
            if (videoFile) {
                // For video, we might still need a specific endpoint or preset if it's different
                // But let's try the store's one first as it's cleaner
                videoUrl = await uploadToCloudinary(videoFile);
            }

            let hubImageUrl = newEvent.hubImage;
            if (selectedHubBanner) {
                hubImageUrl = await uploadToCloudinary(selectedHubBanner);
            }

            const eventData = { 
                ...newEvent, 
                image: imageUrl || '',
                hubImage: hubImageUrl || '',
                venueLayout: venueLayoutUrl || '', 
                videoUrl: videoUrl || '',
                buttonText: newEvent.buttonText || "LEARN MORE",
                updatedAt: new Date().toISOString()
            };

            if (editingId) {
                await updateUpcomingEvent(editingId, eventData);
            } else {
                await addUpcomingEvent(eventData, newEvent.alsoPostToAnnouncements);
                await notifyAllUsers(
                    `NEW EVENT: ${eventData.title.toUpperCase()}`,
                    `${eventData.date} @ ${eventData.location}`,
                    '/events',
                    eventData.image,
                    true // sendEmail
                );
            }
            resetForm();
        } catch (error) {
            console.error("Save failed:", error);
            useStore.getState().addToast("Couldn't save the event. Please check your data and try again.", 'error', 'EVT-01');
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
                        <div className="flex flex-col lg:flex-row gap-10 items-stretch pb-32">
                            <div className="flex-1 w-full relative">
                                <AnimatePresence mode="wait">
                                    {showPreviewMobile ? (
                                        <div className="lg:hidden">
                                            <LivePreview type="event" data={{ ...newEvent, image: selectedFile ? URL.createObjectURL(selectedFile) : newEvent.image }} />
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
                                            <div className="lg:col-span-8">
                                                <Card className="p-6 md:p-10 bg-zinc-900/40 backdrop-blur-3xl border-white/5 rounded-[2.5rem] md:rounded-[3rem]">
                                                    <div className="flex justify-between items-center mb-10">
                                                        <h2 className="text-2xl font-black font-heading tracking-tighter uppercase italic text-white flex items-center gap-3 leading-none">
                                                            EVENT <span className="text-neon-blue">EDITOR.</span>
                                                        </h2>
                                                        <button onClick={resetForm} className="text-[10px] font-black text-gray-500 hover:text-white uppercase tracking-widest">Cancel</button>
                                                    </div>

                                                    <form onSubmit={handleSubmit} className="space-y-16">


                                                        {/* Section 1: Identity */}
                                                        <div className="space-y-8">
                                                            {/* Asset Management */}
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                                    <div 
                                                                        className="space-y-6 bg-black/30 p-8 rounded-[2.5rem] border border-white/5 relative group/upload outline-none focus-within:border-neon-blue/40"
                                                                        onPaste={(e) => handlePaste(e, 'image')}
                                                                        tabIndex={0}
                                                                    >
                                                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1 flex justify-between items-center">
                                                                            Card Thumbnail (4:5)
                                                                            <span className="text-[8px] text-neon-blue/40 opacity-0 group-hover/upload:opacity-100 transition-opacity">CTRL+V TO PASTE</span>
                                                                        </label>
                                                                        <div className="relative aspect-[4/5] rounded-3xl overflow-hidden bg-black border border-white/10 group-hover/upload:border-neon-blue/30 transition-all">
                                                                            {(selectedFile || newEvent.image) ? (
                                                                                <img 
                                                                                    src={selectedFile ? URL.createObjectURL(selectedFile) : newEvent.image} 
                                                                                    className="w-full h-full object-cover" 
                                                                                    style={{
                                                                                        transform: `scale(${newEvent.imageTransform?.scale || 1})`,
                                                                                        objectPosition: `${50 + (newEvent.imageTransform?.x || 0)}% ${50 + (newEvent.imageTransform?.y || 0)}%`
                                                                                    }}
                                                                                />
                                                                            ) : (
                                                                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-gray-600">
                                                                                    <Plus size={32} />
                                                                                    <span className="text-[9px] font-black uppercase tracking-widest">Upload 4:5</span>
                                                                                </div>
                                                                            )}
                                                                            <input 
                                                                                type="file" 
                                                                                accept="image/*" 
                                                                                onChange={e => setSelectedFile(e.target.files[0])}
                                                                                className="absolute inset-0 opacity-0 cursor-pointer"
                                                                            />
                                                                        </div>

                                                                        {/* Calibration Overlay */}
                                                                        {(selectedFile || newEvent.image) && (
                                                                            <div className="pt-4 space-y-4 border-t border-white/5">
                                                                                <div className="flex items-center justify-between">
                                                                                    <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">CALIBRATE</span>
                                                                                    <button type="button" onClick={() => setNewEvent({ ...newEvent, imageTransform: { scale: 1, x: 0, y: 0 } })} className="text-[8px] font-black text-neon-blue hover:underline">RESET</button>
                                                                                </div>
                                                                                <div className="space-y-4">
                                                                                    <div className="space-y-2">
                                                                                        <div className="flex justify-between items-center">
                                                                                            <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest">Scale</span>
                                                                                            <input 
                                                                                                type="number" 
                                                                                                value={newEvent.imageTransform?.scale || 1} 
                                                                                                step="0.01"
                                                                                                onChange={e => setNewEvent({...newEvent, imageTransform: {...newEvent.imageTransform, scale: parseFloat(e.target.value) || 1}})}
                                                                                                className="w-12 h-5 bg-black/40 border border-white/10 rounded text-[8px] font-black text-white text-center focus:border-neon-blue/40 outline-none"
                                                                                            />
                                                                                        </div>
                                                                                        <input type="range" min="1" max="3" step="0.01" value={newEvent.imageTransform?.scale || 1} onChange={e => setNewEvent({...newEvent, imageTransform: {...newEvent.imageTransform, scale: parseFloat(e.target.value)}})} className="w-full h-1 bg-white/5 rounded-full appearance-none accent-neon-blue" />
                                                                                    </div>
                                                                                    <div className="grid grid-cols-2 gap-4">
                                                                                        <div className="space-y-2">
                                                                                            <div className="flex justify-between items-center">
                                                                                                <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest">X-Pos</span>
                                                                                                <input 
                                                                                                    type="number" 
                                                                                                    value={newEvent.imageTransform?.x || 0} 
                                                                                                    onChange={e => setNewEvent({...newEvent, imageTransform: {...newEvent.imageTransform, x: parseFloat(e.target.value) || 0}})}
                                                                                                    className="w-10 h-5 bg-black/40 border border-white/10 rounded text-[8px] font-black text-white text-center focus:border-neon-green/40 outline-none"
                                                                                                />
                                                                                            </div>
                                                                                            <input type="range" min="-100" max="100" step="1" value={newEvent.imageTransform?.x || 0} onChange={e => setNewEvent({...newEvent, imageTransform: {...newEvent.imageTransform, x: parseFloat(e.target.value)}})} className="h-1 bg-white/5 rounded-full appearance-none accent-neon-green" />
                                                                                        </div>
                                                                                        <div className="space-y-2">
                                                                                            <div className="flex justify-between items-center">
                                                                                                <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest">Y-Pos</span>
                                                                                                <input 
                                                                                                    type="number" 
                                                                                                    value={newEvent.imageTransform?.y || 0} 
                                                                                                    onChange={e => setNewEvent({...newEvent, imageTransform: {...newEvent.imageTransform, y: parseFloat(e.target.value) || 0}})}
                                                                                                    className="w-10 h-5 bg-black/40 border border-white/10 rounded text-[8px] font-black text-white text-center focus:border-neon-pink/40 outline-none"
                                                                                                />
                                                                                            </div>
                                                                                            <input type="range" min="-100" max="100" step="1" value={newEvent.imageTransform?.y || 0} onChange={e => setNewEvent({...newEvent, imageTransform: {...newEvent.imageTransform, y: parseFloat(e.target.value)}})} className="h-1 bg-white/5 rounded-full appearance-none accent-neon-pink" />
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    <div 
                                                                        className="space-y-6 bg-black/30 p-8 rounded-[2.5rem] border border-white/5 relative group/hubupload outline-none focus-within:border-neon-pink/40"
                                                                        onPaste={(e) => handlePaste(e, 'hubImage')}
                                                                        tabIndex={0}
                                                                    >
                                                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1 flex justify-between items-center">
                                                                            Hub Banner (16:9)
                                                                            <span className="text-[8px] text-neon-pink/40 opacity-0 group-hover/hubupload:opacity-100 transition-opacity">CTRL+V TO PASTE</span>
                                                                        </label>
                                                                        <div className="relative aspect-video rounded-3xl overflow-hidden bg-black border border-white/10 group-hover/hubupload:border-neon-pink/30 transition-all">
                                                                            {(selectedHubBanner || newEvent.hubImage) ? (
                                                                                <img 
                                                                                    src={selectedHubBanner ? URL.createObjectURL(selectedHubBanner) : newEvent.hubImage} 
                                                                                    className="w-full h-full object-cover" 
                                                                                    style={{
                                                                                        transform: `scale(${newEvent.hubImageTransform?.scale || 1})`,
                                                                                        objectPosition: `${50 + (newEvent.hubImageTransform?.x || 0)}% ${50 + (newEvent.hubImageTransform?.y || 0)}%`
                                                                                    }}
                                                                                />
                                                                            ) : (
                                                                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-gray-600">
                                                                                    <Plus size={32} />
                                                                                    <span className="text-[9px] font-black uppercase tracking-widest">Upload 16:9</span>
                                                                                </div>
                                                                            )}
                                                                            <input 
                                                                                type="file" 
                                                                                accept="image/*" 
                                                                                onChange={e => setSelectedHubBanner(e.target.files[0])}
                                                                                className="absolute inset-0 opacity-0 cursor-pointer"
                                                                            />
                                                                        </div>

                                                                        {/* Hub Calibration */}
                                                                        {(selectedHubBanner || newEvent.hubImage) && (
                                                                            <div className="pt-4 space-y-4 border-t border-white/5">
                                                                                <div className="flex items-center justify-between">
                                                                                    <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">CALIBRATE BANNER</span>
                                                                                    <button type="button" onClick={() => setNewEvent({ ...newEvent, hubImageTransform: { scale: 1, x: 0, y: 0 } })} className="text-[8px] font-black text-neon-pink hover:underline">RESET</button>
                                                                                </div>
                                                                                <div className="space-y-4">
                                                                                    <div className="space-y-2">
                                                                                        <div className="flex justify-between items-center">
                                                                                            <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest">Scale</span>
                                                                                            <input 
                                                                                                type="number" 
                                                                                                value={newEvent.hubImageTransform?.scale || 1} 
                                                                                                step="0.01"
                                                                                                onChange={e => setNewEvent({...newEvent, hubImageTransform: {...newEvent.hubImageTransform, scale: parseFloat(e.target.value) || 1}})}
                                                                                                className="w-12 h-5 bg-black/40 border border-white/10 rounded text-[8px] font-black text-white text-center focus:border-neon-pink/40 outline-none"
                                                                                            />
                                                                                        </div>
                                                                                        <input type="range" min="1" max="3" step="0.01" value={newEvent.hubImageTransform?.scale || 1} onChange={e => setNewEvent({...newEvent, hubImageTransform: {...newEvent.hubImageTransform, scale: parseFloat(e.target.value)}})} className="w-full h-1 bg-white/5 rounded-full appearance-none accent-neon-pink" />
                                                                                    </div>
                                                                                    <div className="grid grid-cols-2 gap-4">
                                                                                        <div className="space-y-2">
                                                                                            <div className="flex justify-between items-center">
                                                                                                <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest">X-Pos</span>
                                                                                                <input 
                                                                                                    type="number" 
                                                                                                    value={newEvent.hubImageTransform?.x || 0} 
                                                                                                    onChange={e => setNewEvent({...newEvent, hubImageTransform: {...newEvent.hubImageTransform, x: parseFloat(e.target.value) || 0}})}
                                                                                                    className="w-10 h-5 bg-black/40 border border-white/10 rounded text-[8px] font-black text-white text-center focus:border-neon-green/40 outline-none"
                                                                                                />
                                                                                            </div>
                                                                                            <input type="range" min="-100" max="100" step="1" value={newEvent.hubImageTransform?.x || 0} onChange={e => setNewEvent({...newEvent, hubImageTransform: {...newEvent.hubImageTransform, x: parseFloat(e.target.value)}})} className="h-1 bg-white/5 rounded-full appearance-none accent-neon-green" />
                                                                                        </div>
                                                                                        <div className="space-y-2">
                                                                                            <div className="flex justify-between items-center">
                                                                                                <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest">Y-Pos</span>
                                                                                                <input 
                                                                                                    type="number" 
                                                                                                    value={newEvent.hubImageTransform?.y || 0} 
                                                                                                    onChange={e => setNewEvent({...newEvent, hubImageTransform: {...newEvent.hubImageTransform, y: parseFloat(e.target.value) || 0}})}
                                                                                                    className="w-10 h-5 bg-black/40 border border-white/10 rounded text-[8px] font-black text-white text-center focus:border-neon-blue/40 outline-none"
                                                                                                />
                                                                                            </div>
                                                                                            <input type="range" min="-100" max="100" step="1" value={newEvent.hubImageTransform?.y || 0} onChange={e => setNewEvent({...newEvent, hubImageTransform: {...newEvent.hubImageTransform, y: parseFloat(e.target.value)}})} className="h-1 bg-white/5 rounded-full appearance-none accent-neon-blue" />
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                            </div>
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                                <div className="space-y-3">
                                                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Event Title</label>
                                                                    <Input placeholder="E.G. SUMMER MUSIC FESTIVAL..." value={newEvent.title} onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })} required className="h-16 bg-black/50 border-white/5 rounded-2xl uppercase text-[10px] font-black tracking-widest px-6" />
                                                                </div>
                                                                <div className="space-y-3">
                                                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Location Name</label>
                                                                    <Input placeholder="E.G. MADISON SQUARE GARDEN..." value={newEvent.location} onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })} required className="h-16 bg-black/50 border-white/5 rounded-2xl uppercase text-[10px] font-black tracking-widest px-6" />
                                                                </div>
                                                            </div>
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                                <div className="space-y-3">
                                                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Location Google Maps URL</label>
                                                                    <Input placeholder="PASTE MAPS LINK HERE..." value={newEvent.locationUrl} onChange={(e) => setNewEvent({ ...newEvent, locationUrl: e.target.value })} className="h-16 bg-black/50 border-white/5 rounded-2xl text-[10px] font-black tracking-widest px-6" />
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
                                                            <div className="space-y-3">
                                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Event Description</label>
                                                                <textarea 
                                                                    className="w-full bg-black/50 border border-white/5 rounded-[2rem] p-8 text-white focus:outline-none focus:border-neon-pink/40 min-h-[150px] resize-none text-[11px] font-medium placeholder:text-gray-800 leading-relaxed italic shadow-inner uppercase tracking-widest" 
                                                                    value={newEvent.description} 
                                                                    onChange={e => setNewEvent({ ...newEvent, description: e.target.value })} 
                                                                    placeholder="Rules of entry, age limits, dress code..." 
                                                                />
                                                            </div>
                                                        </div>

                                                        {/* Section 2: Media */}
                                                        <div className="pt-16 border-t border-white/5 space-y-12">


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

                                                            <div className="space-y-3">
                                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Video Highlight (URL or Upload)</label>
                                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                                    <div className="md:col-span-2">
                                                                        <Input 
                                                                            placeholder="YOUTUBE, VIMEO, OR INSTAGRAM URL..." 
                                                                            value={newEvent.videoUrl} 
                                                                            onChange={(e) => setNewEvent({ ...newEvent, videoUrl: e.target.value })} 
                                                                            className="h-16 bg-black/50 border-white/5 rounded-2xl text-[10px] font-black tracking-widest px-6" 
                                                                        />
                                                                    </div>
                                                                    <div className="relative group">
                                                                        <input type="file" accept="video/*" onChange={(e) => setVideoFile(e.target.files[0])} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                                                                        <div className="h-16 border-2 border-dashed border-white/5 rounded-2xl flex items-center justify-center gap-3 bg-black/20 group-hover:border-neon-pink/30 transition-all">
                                                                            <VideoIcon className="text-gray-500 group-hover:text-neon-pink" size={18} />
                                                                            <span className="text-[8px] font-black text-gray-500 group-hover:text-white uppercase tracking-widest">{videoFile ? 'READY' : 'UPLOAD'}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center justify-between p-6 bg-white/5 rounded-2xl border border-white/5 mt-6">
                                                                <div className="space-y-1">
                                                                    <p className="text-[10px] font-black text-white uppercase tracking-widest">Ambient Card Background</p>
                                                                    <p className="text-[8px] text-gray-500 uppercase tracking-widest">Play video as card background (9:16 recommended)</p>
                                                                </div>
                                                                <button 
                                                                    type="button"
                                                                    onClick={() => setNewEvent({ ...newEvent, enableVideoBackground: !newEvent.enableVideoBackground })}
                                                                    className={cn(
                                                                        "w-12 h-6 rounded-full p-1 transition-all duration-300",
                                                                        newEvent.enableVideoBackground ? "bg-neon-pink" : "bg-white/10"
                                                                    )}
                                                                >
                                                                    <div className={cn(
                                                                        "w-4 h-4 rounded-full bg-white transition-all duration-300 transform",
                                                                        newEvent.enableVideoBackground ? "translate-x-6" : "translate-x-0"
                                                                    )} />
                                                                </button>
                                                            </div>

                                                            <div className="space-y-4 pt-6 border-t border-white/5">
                                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Venue Layout / Map Asset</label>
                                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                                    <div className="md:col-span-2">
                                                                        <Input 
                                                                            placeholder="PASTE LAYOUT URL OR CTRL+V IMAGE" 
                                                                            value={newEvent.venueLayout} 
                                                                            onChange={(e) => setNewEvent({ ...newEvent, venueLayout: e.target.value })} 
                                                                            onPaste={(e) => handlePaste(e, 'venueLayout')}
                                                                            className="h-16 bg-black/50 border-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest px-6" 
                                                                        />
                                                                    </div>
                                                                    <div className="relative group">
                                                                        <input type="file" onChange={(e) => setVenueLayoutFile(e.target.files[0])} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                                                                        <div className="h-16 border-2 border-dashed border-white/5 rounded-2xl flex items-center justify-center gap-3 bg-black/20 group-hover:border-neon-blue/30 transition-all">
                                                                            <MapIcon className="text-gray-500 group-hover:text-neon-blue" size={18} />
                                                                            <span className="text-[8px] font-black text-gray-500 group-hover:text-white uppercase tracking-widest">{venueLayoutFile ? 'READY' : 'UPLOAD MAP'}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Section 3: Connectivity */}
                                                        <div className="pt-16 border-t border-white/5 space-y-12">
                                                            <div className="flex justify-between items-center">
                                                                <h2 className="text-2xl font-black font-heading tracking-tighter uppercase italic text-white flex items-center gap-3 leading-none">
                                                                    EVENT <span className="text-neon-pink">CONNECTIONS.</span>
                                                                </h2>
                                                                <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Connect external platforms and related gigs</p>
                                                            </div>

                                                            {/* External Ticketing */}
                                                            <div className="space-y-6 bg-black/30 p-8 rounded-[2.5rem] border border-white/5">
                                                                <div className="flex justify-between items-center">
                                                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">External Ticketing Links</label>
                                                                    <button type="button" onClick={() => setNewEvent({...newEvent, externalTicketingLinks: [...(newEvent.externalTicketingLinks || []), { platform: '', url: '' }]})} className="text-[9px] font-black text-neon-pink uppercase tracking-widest flex items-center gap-1"><Plus size={12}/> Add Link</button>
                                                                </div>
                                                                <div className="space-y-4">
                                                                    {(newEvent.externalTicketingLinks || []).map((link, idx) => (
                                                                        <div key={idx} className="flex gap-4 items-center bg-black/50 p-4 rounded-2xl border border-white/5">
                                                                            <Input placeholder="PLATFORM (E.G. BMS, PAYTM)" value={link.platform} onChange={e => { const newLinks = [...newEvent.externalTicketingLinks]; newLinks[idx].platform = e.target.value; setNewEvent({...newEvent, externalTicketingLinks: newLinks}) }} className="h-12 bg-black/50 border-white/10 uppercase text-[10px] font-black tracking-widest" />
                                                                            <Input placeholder="HTTPS://..." value={link.url} onChange={e => { const newLinks = [...newEvent.externalTicketingLinks]; newLinks[idx].url = e.target.value; setNewEvent({...newEvent, externalTicketingLinks: newLinks}) }} className="h-12 bg-black/50 border-white/10 text-[10px] font-medium" />
                                                                            <button type="button" onClick={() => { const newLinks = newEvent.externalTicketingLinks.filter((_, i) => i !== idx); setNewEvent({...newEvent, externalTicketingLinks: newLinks}) }} className="p-3 text-red-500 hover:bg-red-500/10 rounded-xl transition-all"><Trash2 size={16}/></button>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>

                                                            {/* Related Hub Connections */}
                                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                                                <div className="space-y-3">
                                                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Volunteer Gig</label>
                                                                    <StudioSelect
                                                                        value={newEvent.relatedVolunteerGigId}
                                                                        options={[
                                                                            { value: '', label: 'NONE / DISCONNECT' },
                                                                            ...volunteerGigs.map(g => ({ value: g.id, label: g.title.toUpperCase() }))
                                                                        ]}
                                                                        onChange={val => setNewEvent({ ...newEvent, relatedVolunteerGigId: val })}
                                                                        placeholder="SELECT VOLUNTEER GIG..."
                                                                        className="h-16"
                                                                        accentColor="neon-green"
                                                                    />
                                                                </div>
                                                                <div className="space-y-3">
                                                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Creator Campaign</label>
                                                                    <StudioSelect
                                                                        value={newEvent.relatedCampaignId}
                                                                        options={[
                                                                            { value: '', label: 'NONE / DISCONNECT' },
                                                                            ...campaigns.map(c => ({ value: c.id, label: c.title.toUpperCase() }))
                                                                        ]}
                                                                        onChange={val => setNewEvent({ ...newEvent, relatedCampaignId: val })}
                                                                        placeholder="SELECT CREATOR CAMPAIGN..."
                                                                        className="h-16"
                                                                        accentColor="neon-pink"
                                                                    />
                                                                </div>
                                                                <div className="space-y-3">
                                                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Artist Registration</label>
                                                                    <StudioSelect
                                                                        value={newEvent.relatedArtistFormId}
                                                                        options={[
                                                                            { value: '', label: 'NONE / DISCONNECT' },
                                                                            ...forms.map(f => ({ value: f.id, label: f.title.toUpperCase() }))
                                                                        ]}
                                                                        onChange={val => setNewEvent({ ...newEvent, relatedArtistFormId: val })}
                                                                        placeholder="SELECT ARTIST FORM..."
                                                                        className="h-16"
                                                                        accentColor="neon-blue"
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Section 4: Access */}
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
                                                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Ticket System</label>
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
                                                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Ticket Categories</label>
                                                                            <button type="button" onClick={() => setNewEvent({...newEvent, ticketCategories: [...(newEvent.ticketCategories || []), { id: `cat_${Date.now()}`, name: '', price: 0, description: '', color: '#2ebfff' }]})} className="text-[9px] font-black text-neon-green uppercase tracking-widest flex items-center gap-1"><Plus size={12}/> Add Category</button>
                                                                        </div>
                                                                        <div className="space-y-4">
                                                                            {(newEvent.ticketCategories || []).map((cat, idx) => (
                                                                                <div key={cat.id} className={cn("bg-black/50 p-5 rounded-2xl border transition-all", mappingCategoryId === cat.id ? "border-neon-blue shadow-[0_0_20px_rgba(0,255,255,0.1)]" : "border-white/5")}>
                                                                                    <div className="flex flex-wrap md:flex-nowrap gap-4 items-center">
                                                                                        <Input placeholder="TIER NAME" value={cat.name} onChange={e => { const newCats = [...newEvent.ticketCategories]; newCats[idx].name = e.target.value; setNewEvent({...newEvent, ticketCategories: newCats}) }} className="h-12 bg-black/50 border-white/10 uppercase text-[10px] font-black tracking-widest" />
                                                                                        <div className="relative w-32 shrink-0">
                                                                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neon-green font-black text-[10px]">₹</span>
                                                                                            <Input type="number" placeholder="0" value={cat.price} onChange={e => { const newCats = [...newEvent.ticketCategories]; newCats[idx].price = parseFloat(e.target.value) || 0; setNewEvent({...newEvent, ticketCategories: newCats}) }} className="h-12 pl-8 bg-black/50 border-white/10 text-xs font-black" />
                                                                                        </div>
                                                                                        <div className="flex items-center gap-2 bg-black/40 p-1.5 rounded-xl border border-white/5">
                                                                                            <input 
                                                                                                type="color" 
                                                                                                value={cat.color || '#2ebfff'} 
                                                                                                onChange={e => { const newCats = [...newEvent.ticketCategories]; newCats[idx].color = e.target.value; setNewEvent({...newEvent, ticketCategories: newCats}) }}
                                                                                                className="w-8 h-8 rounded-lg bg-transparent border-0 cursor-pointer"
                                                                                            />
                                                                                        </div>
                                                                                        <Input placeholder="BENEFITS..." value={cat.description} onChange={e => { const newCats = [...newEvent.ticketCategories]; newCats[idx].description = e.target.value; setNewEvent({...newEvent, ticketCategories: newCats}) }} className="h-12 bg-black/50 border-white/10 text-[10px] font-medium" />

                                                                                        <div className="flex gap-2">
                                                                                            <button 
                                                                                                type="button" 
                                                                                                onClick={() => setMappingCategoryId(mappingCategoryId === cat.id ? null : cat.id)}
                                                                                                className={cn("h-12 px-4 rounded-xl flex items-center gap-2 text-[8px] font-black uppercase tracking-widest transition-all", mappingCategoryId === cat.id ? "bg-neon-blue text-black" : "bg-white/5 text-gray-500 hover:text-neon-blue hover:bg-neon-blue/5")}
                                                                                            >
                                                                                                <MapIcon size={12} /> {cat.coords ? 'MAPPED' : 'MAP'}
                                                                                            </button>
                                                                                            <button type="button" onClick={() => { const newCats = newEvent.ticketCategories.filter((_, i) => i !== idx); setNewEvent({...newEvent, ticketCategories: newCats}) }} className="p-3 text-red-500 hover:bg-red-500/10 rounded-xl transition-all"><Trash2 size={16}/></button>
                                                                                        </div>
                                                                                    </div>
                                                                                    {cat.mapping && (
                                                                                        <div className="mt-3 flex items-center gap-3 pl-1">
                                                                                            <span className="text-[8px] font-black text-neon-blue uppercase tracking-widest">Zone Defined: {Math.round(cat.mapping.width)}% Wide</span>
                                                                                            <button type="button" onClick={() => { 
                                                                                                const newCats = newEvent.ticketCategories.map((c, i) => {
                                                                                                    if (i === idx) {
                                                                                                        const { mapping, ...rest } = c;
                                                                                                        return rest;
                                                                                                    }
                                                                                                    return c;
                                                                                                });
                                                                                                setNewEvent({...newEvent, ticketCategories: newCats});
                                                                                            }} className="text-[8px] font-black text-red-500 uppercase tracking-widest hover:underline">Clear</button>
                                                                                        </div>
                                                                                    )}
                                                                                    {cat.coords && (
                                                                                        <div className="mt-3 flex items-center gap-3 pl-1">
                                                                                            <span className="text-[8px] font-black text-neon-blue uppercase tracking-widest">Pin Location: {Math.round(cat.coords.x)}% x {Math.round(cat.coords.y)}%</span>
                                                                                            <button type="button" onClick={() => { 
                                                                                                const newCats = newEvent.ticketCategories.map((c, i) => {
                                                                                                    if (i === idx) {
                                                                                                        const { coords, ...rest } = c;
                                                                                                        return rest;
                                                                                                    }
                                                                                                    return c;
                                                                                                });
                                                                                                setNewEvent({...newEvent, ticketCategories: newCats});
                                                                                            }} className="text-[8px] font-black text-red-500 uppercase tracking-widest hover:underline">Clear</button>
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            ))}
                                                                        </div>

                                                                        {/* Map Interaction Area */}
                                                                        {(newEvent.venueLayout || venueLayoutFile) && mappingCategoryId && (
                                                                            <div className="mt-8 space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
                                                                                <div className="flex justify-between items-center px-1">
                                                                                    <div className="flex items-center gap-2">
                                                                                        <span className="w-2 h-2 rounded-full bg-neon-blue animate-pulse" />
                                                                                        <span className="text-[10px] font-black text-white uppercase tracking-widest">Mapping: {newEvent.ticketCategories.find(c => c.id === mappingCategoryId)?.name || 'SELECTED TIER'}</span>
                                                                                    </div>
                                                                                    <span className="text-[9px] font-medium text-gray-500 italic">Click on the layout below to place the hotspot.</span>
                                                                                </div>                                                                                <div 
                                                                                    className="relative rounded-3xl overflow-hidden border border-white/10 bg-black group cursor-crosshair select-none"
                                                                                    onMouseDown={(e) => {
                                                                                        const rect = e.currentTarget.getBoundingClientRect();
                                                                                        const x = ((e.clientX - rect.left) / rect.width) * 100;
                                                                                        const y = ((e.clientY - rect.top) / rect.height) * 100;
                                                                                        setDragStart({ x, y });
                                                                                    }}
                                                                                    onMouseMove={(e) => {
                                                                                        if (!dragStart) return;
                                                                                        const rect = e.currentTarget.getBoundingClientRect();
                                                                                        const x = ((e.clientX - rect.left) / rect.width) * 100;
                                                                                        const y = ((e.clientY - rect.top) / rect.height) * 100;
                                                                                        
                                                                                        const width = Math.abs(x - dragStart.x);
                                                                                        const height = Math.abs(y - dragStart.y);
                                                                                        const left = Math.min(x, dragStart.x);
                                                                                        const top = Math.min(y, dragStart.y);
                                                                                        
                                                                                        setCurrentDrag({ x: left, y: top, width, height });
                                                                                    }}
                                                                                    onMouseUp={() => {
                                                                                        if (!dragStart || !currentDrag) {
                                                                                            setDragStart(null);
                                                                                            setCurrentDrag(null);
                                                                                            return;
                                                                                        }
                                                                                        
                                                                                        const newCats = newEvent.ticketCategories.map(c => 
                                                                                            c.id === mappingCategoryId ? { ...c, mapping: currentDrag } : c
                                                                                        );
                                                                                        setNewEvent({ ...newEvent, ticketCategories: newCats });
                                                                                        setMappingCategoryId(null);
                                                                                        setDragStart(null);
                                                                                        setCurrentDrag(null);
                                                                                    }}
                                                                                >
                                                                                    <img 
                                                                                        src={venueLayoutFile ? URL.createObjectURL(venueLayoutFile) : newEvent.venueLayout} 
                                                                                        alt="Mapping Surface" 
                                                                                        className="w-full h-auto opacity-80 group-hover:opacity-100 transition-opacity"
                                                                                    />
                                                                                    
                                                                                    {/* Current Drag Preview */}
                                                                                    {currentDrag && (
                                                                                        <div 
                                                                                            className="absolute border-2 border-dashed border-white bg-neon-blue/30 z-[60] flex items-center justify-center overflow-hidden"
                                                                                            style={{ 
                                                                                                left: `${currentDrag.x}%`, 
                                                                                                top: `${currentDrag.y}%`,
                                                                                                width: `${currentDrag.width}%`,
                                                                                                height: `${currentDrag.height}%`
                                                                                            }}
                                                                                        >
                                                                                            <span className="text-[8px] font-black text-white uppercase tracking-tighter opacity-50">Defining Area...</span>
                                                                                        </div>
                                                                                    )}

                                                                                    {/* Existing Zones */}
                                                                                    {newEvent.ticketCategories.map(cat => cat.mapping && (
                                                                                        <div 
                                                                                            key={cat.id}
                                                                                            className={cn(
                                                                                                "absolute flex flex-col items-center justify-center transition-all shadow-[0_0_20px_rgba(0,0,0,0.3)] border-2",
                                                                                                cat.id === mappingCategoryId ? "z-50 scale-105 border-white ring-4 ring-white/20" : "scale-100 border-black/20"
                                                                                            )}
                                                                                            style={{ 
                                                                                                left: `${cat.mapping.x}%`, 
                                                                                                top: `${cat.mapping.y}%`,
                                                                                                width: `${cat.mapping.width}%`,
                                                                                                height: `${cat.mapping.height}%`,
                                                                                                backgroundColor: cat.color || '#2ebfff',
                                                                                                borderColor: 'rgba(255,255,255,0.3)',
                                                                                                borderRadius: '4px'
                                                                                            }}
                                                                                        >
                                                                                            <span className="text-[8px] font-black text-white uppercase truncate w-full text-center drop-shadow-md">
                                                                                                {cat.name}
                                                                                            </span>
                                                                                            <span className="text-[10px] font-black text-neon-green drop-shadow-md">
                                                                                                ₹{cat.price}
                                                                                            </span>
                                                                                        </div>
                                                                                    ))}

                                                                                    {/* Legacy Pins */}
                                                                                    {newEvent.ticketCategories.map(cat => cat.coords && !cat.mapping && (
                                                                                        <div 
                                                                                            key={cat.id}
                                                                                            className="absolute w-10 h-10 -ml-5 -mt-5 flex flex-col items-center justify-center transition-all border-2 border-white rounded-full shadow-lg"
                                                                                            style={{ 
                                                                                                left: `${cat.coords.x}%`, 
                                                                                                top: `${cat.coords.y}%`,
                                                                                                backgroundColor: cat.color || '#2ebfff',
                                                                                            }}
                                                                                        >
                                                                                            <span className="text-[6px] font-black text-black uppercase truncate w-full text-center">
                                                                                                {cat.name}
                                                                                            </span>
                                                                                            <span className="text-[8px] font-black text-black">
                                                                                                ₹{cat.price}
                                                                                            </span>
                                                                                        </div>
                                                                                    ))}
                                                                                </div>

                                                                            </div>
                                                                        )}
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
                                                                        <p className="text-xs font-black uppercase tracking-widest text-white">POST TO ANNOUNCEMENTS</p>
                                                                        <p className="text-[10px] font-medium text-gray-500">Post this event to the Announcements feed.</p>
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
                                                                Cancel
                                                            </button>
                                                            <Button type="submit" disabled={uploading} className="h-14 px-12 sm:px-24 bg-neon-blue text-black font-black uppercase tracking-widest rounded-2xl shadow-[0_15px_40px_rgba(0,255,255,0.3)] text-[11px] hover:scale-105 active:scale-95 transition-all w-full sm:w-auto">
                                                                {uploading ? <Loader className="animate-spin" size={18} /> : (editingId ? 'SAVE CHANGES' : 'PUBLISH EVENT')}
                                                            </Button>
                                                        </div>
                                                    </form>
                                                </Card>
                                            </div>


                                            <div className="lg:col-span-4 hidden lg:block lg:sticky lg:top-32">
                                                <LivePreview 
                                                    type="event" 
                                                    data={{ 
                                                        ...newEvent, 
                                                        image: selectedFile ? URL.createObjectURL(selectedFile) : newEvent.image,
                                                        hubImage: selectedHubBanner ? URL.createObjectURL(selectedHubBanner) : newEvent.hubImage
                                                    }} 
                                                    onAction={() => {
                                                        setPreviewEvent({
                                                            ...newEvent,
                                                            image: selectedFile ? URL.createObjectURL(selectedFile) : newEvent.image,
                                                            hubImage: selectedHubBanner ? URL.createObjectURL(selectedHubBanner) : newEvent.hubImage
                                                        });
                                                        setIsPreviewOpen(true);
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </AnimatePresence>

                                <EventHubModal 
                                    event={previewEvent}
                                    isOpen={isPreviewOpen}
                                    onClose={() => setIsPreviewOpen(false)}
                                />
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
                                        transition={{ duration: 0.4 }}                                        className="group relative bg-[#0A0A0A] border border-white/5 hover:border-neon-blue/20 rounded-[2.5rem] p-5 flex flex-col h-auto min-h-[420px] shadow-[0_20px_60px_rgba(0,0,0,0.5)] overflow-hidden transition-all duration-500"
                                    >
                                        {/* Standardized 16:9 Thumbnail Header */}
                                        <div className="relative mb-6 shrink-0 group-hover:scale-[1.01] transition-transform duration-700">
                                            <div className="aspect-video rounded-[1.5rem] overflow-hidden bg-black border border-white/5 relative flex items-center justify-center">
                                                {(item.hubImage || item.image) ? (
                                                    <div
                                                        className="absolute inset-0 bg-cover transition-transform duration-700 group-hover:scale-110"
                                                        style={{
                                                            backgroundImage: `url(${item.hubImage || item.image})`,
                                                            transform: `scale(${item.hubImage ? (item.hubImageTransform?.scale || 1) : (item.imageTransform?.scale || 1)})`,
                                                            backgroundPosition: item.hubImage 
                                                                ? `calc(50% + ${(item.hubImageTransform?.x || 0)}%) calc(50% + ${(item.hubImageTransform?.y || 0)}%)`
                                                                : `calc(50% + ${(item.imageTransform?.x || 0)}%) calc(50% + ${(item.imageTransform?.y || 0)}%)`
                                                        }}
                                                    />
                                                ) : (
                                                    <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/50">
                                                        <Calendar size={32} className="text-white/5" />
                                                    </div>
                                                )}
                                                {/* Gradient layers */}
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent z-10" />
                                            </div>
                                        </div>

                                        {/* Top toolbar — floats over content/image */}
                                        <div className="absolute top-8 left-8 right-8 z-30 flex justify-between items-start opacity-0 group-hover:opacity-100 -translate-y-2 group-hover:translate-y-0 transition-all duration-400">
                                            <div className="flex gap-2">
                                                <button onClick={(e) => { e.stopPropagation(); moveItem(index, 'up'); }} disabled={index === 0}
                                                    className="w-9 h-9 rounded-xl bg-black/70 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-neon-blue hover:text-black transition-all disabled:opacity-0">
                                                    <ChevronUp size={16} />
                                                </button>
                                                <button onClick={(e) => { e.stopPropagation(); moveItem(index, 'down'); }} disabled={index === upcomingEvents.length - 1}
                                                    className="w-9 h-9 rounded-xl bg-black/70 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-neon-blue hover:text-black transition-all disabled:opacity-0">
                                                    <ChevronDown size={16} />
                                                </button>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const params = new URLSearchParams({ subject: `UPDATE: ${item.title}`, header: item.title, body: item.description, heroImage: item.image, ctaText: 'See Details', ctaUrl: `${window.location.origin}/concertzone` });
                                                        window.location.href = `/admin/mailing?${params.toString()}`;
                                                    }}
                                                    className="w-9 h-9 rounded-xl bg-black/70 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-neon-green hover:text-black transition-all"
                                                    title="Mailing List"
                                                >
                                                    <Mail size={15} />
                                                </button>
                                                <button
                                                    onClick={async (e) => {
                                                        e.stopPropagation();
                                                        if (window.confirm(`Resend notification for "${item.title}"?`)) {
                                                            await notifyAllUsers(`NEW EVENT: ${item.title.toUpperCase()}`, `${item.date} @ ${item.location}`, '/events', item.image, true);
                                                            useStore.getState().addToast("Notification sent successfully!", 'success');
                                                        }
                                                    }}
                                                    className="w-9 h-9 rounded-xl bg-neon-pink/20 backdrop-blur-md border border-neon-pink/30 flex items-center justify-center text-neon-pink hover:bg-neon-pink hover:text-black transition-all"
                                                    title="Push Signal"
                                                >
                                                    <Sparkles size={15} />
                                                </button>
                                                <button onClick={(e) => { e.stopPropagation(); handleEdit(item); }}
                                                    className="w-9 h-9 rounded-xl bg-black/70 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-neon-blue hover:text-black transition-all">
                                                    <Edit size={15} />
                                                </button>
                                                <button onClick={(e) => { e.stopPropagation(); deleteUpcomingEvent(item.id); }}
                                                    className="w-9 h-9 rounded-xl bg-black/70 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-red-500 transition-all">
                                                    <Trash2 size={15} />
                                                </button>
                                            </div>
                                        </div>

                                        {/* PIN Indicator */}
                                        {item.isPinned && (
                                            <div className="absolute top-8 left-1/2 -translate-x-1/2 z-30">
                                                <div className="px-3 py-1.5 rounded-full bg-neon-blue/20 backdrop-blur-md border border-neon-blue/40 flex items-center gap-2">
                                                    <Pin size={10} className="text-neon-blue fill-current" />
                                                    <span className="text-[8px] font-black text-neon-blue uppercase tracking-widest">Anchored</span>
                                                </div>
                                            </div>
                                        )}

                                        {/* Content Body */}
                                        <div className="flex-1 flex flex-col px-1">
                                            {/* Badges row */}
                                            <div className="flex flex-wrap gap-2 mb-4">
                                                <span
                                                    className="px-2.5 h-5 flex items-center text-[7px] font-black uppercase tracking-widest border rounded-full backdrop-blur-md"
                                                    style={{
                                                        backgroundColor: `${item.highlightColor || '#2ebfff'}11`,
                                                        borderColor: `${item.highlightColor || '#2ebfff'}33`,
                                                        color: item.highlightColor || '#2ebfff'
                                                    }}
                                                >
                                                    {item.performanceType || 'EVENT'}
                                                </span>
                                                <span className="px-2.5 h-5 flex items-center bg-white/5 border border-white/10 text-white/50 text-[7px] font-black uppercase tracking-widest rounded-full backdrop-blur-md">
                                                    {(typeof item.date === 'string' && item.date.includes('T'))
                                                        ? item.date.split('T')[0]
                                                        : (item.date?.seconds ? new Date(item.date.seconds * 1000).toLocaleDateString() : 'TBD')}
                                                </span>
                                            </div>

                                            {/* Title */}
                                            <h3 className="text-xl font-black font-heading tracking-tight uppercase italic text-white group-hover:text-neon-blue transition-colors duration-500 leading-tight line-clamp-2 mb-4">
                                                {item.title}
                                            </h3>

                                            {/* Footer Area */}
                                            <div className="mt-auto pt-4 border-t border-white/[0.06] flex items-center justify-between">
                                                <div className="flex flex-col gap-1 min-w-0 pr-4">
                                                    {item.artists?.length > 0 ? (
                                                        <p className="text-[8px] font-black text-white/40 uppercase tracking-widest truncate">
                                                            {item.artists.slice(0, 2).join(' • ')}
                                                        </p>
                                                    ) : <span className="h-2" />}
                                                    <p className="text-[7px] font-black text-gray-600 uppercase tracking-widest truncate">
                                                        {item.location || 'TBD'}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    {item.isTicketed && (
                                                        <div className="w-7 h-7 rounded-lg bg-neon-green/10 flex items-center justify-center text-neon-green border border-neon-green/20" title="Ticketing Enabled">
                                                            <Ticket size={12} />
                                                        </div>
                                                    )}
                                                    {item.isGuestlistEnabled && (
                                                        <div className="w-7 h-7 rounded-lg bg-neon-pink/10 flex items-center justify-center text-neon-pink border border-neon-pink/20" title="RSVP Enabled">
                                                            <Sparkles size={12} />
                                                        </div>
                                                    )}
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); togglePinUpcomingEvent(item.id); }}
                                                        className={cn(
                                                            "p-2 rounded-lg transition-all ml-1",
                                                            item.isPinned ? "text-neon-blue" : "text-white/20 hover:text-white"
                                                        )}
                                                        title={item.isPinned ? "Unpin Event" : "Pin to Website"}
                                                    >
                                                        <Pin size={14} className={item.isPinned ? "fill-current" : ""} />
                                                    </button>
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
