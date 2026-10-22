import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { 
    LayoutGrid, Plus, Trash2, Edit, Save, Eye, EyeOff, Sparkles, Clock, MapPin, 
    IndianRupee, Image as ImageIcon, ChevronDown, ChevronUp, X, Upload, Zap, Ticket, 
    Link2, Copy, CheckCircle, Mail, Radio, Calendar, FileText, Music, Map as MapIcon, 
    RotateCcw, Video as VideoIcon, Pin, FileUp 
} from 'lucide-react';

import { useStore } from '../../lib/store';
import { useStoreSubscription } from '../../hooks/useStoreSubscription';
import { notifyAllUsers } from '../../lib/notificationTriggers';
import LivePreview from '../../components/admin/LivePreview';
import { cn } from '../../lib/utils';
import EventHubModal from '../../components/community/EventHubModal';
import GuestlistTaskConfig from '../../components/admin/GuestlistTaskConfig';

import AdminCommunityHubLayout from '../../components/admin/AdminCommunityHubLayout';
import { Card as PanelCard, Badge, SegmentedTabs, Menu, MenuItem, Button as AdminButton } from '../../components/admin/ui';
import { Field, Toggle, Choice, fieldCls, areaCls } from '../../components/admin/uploads/UploadKit';
import CityInput, { cleanCity } from '../../components/admin/CityInput';
import { BuilderCard, ImageSlot, splitDateTime } from '../../components/admin/events/EditorParts';
import ChevronLeft from 'lucide-react/dist/esm/icons/chevron-left';
import { computeAvailability } from '../../lib/ticketing';
import MoreHorizontal from 'lucide-react/dist/esm/icons/more-horizontal';
import Users from 'lucide-react/dist/esm/icons/users';
import ThemedSelect from '../../components/admin/ThemedSelect';

const UpcomingEventsManager = () => {
    useStoreSubscription(['upcomingEvents', 'portfolioCategories', 'volunteerGigs', 'campaigns', 'forms', 'ticketOrders']);
    const ticketOrders = useStore(s => s.ticketOrders);
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
    const [eventFilter, setEventFilter] = useState('upcoming'); // 'upcoming' | 'past' | 'all'

    // Dashboard and quick-jump link here with ?new=1 to start a new event.
    const [searchParams, setSearchParams] = useSearchParams();
    useEffect(() => {
        if (searchParams.get('new') === '1') {
            setIsAdding(true);
            setEditingId(null);
            setActiveEditorTab('basics');
            const next = new URLSearchParams(searchParams);
            next.delete('new');
            setSearchParams(next, { replace: true });
        }
    }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

    // ?edit=<id> (e.g. from Ticketing's "Open in Events") opens that event's editor
    // once the events have loaded.
    const editParam = searchParams.get('edit');
    useEffect(() => {
        if (!editParam) return;
        const target = (upcomingEvents || []).find(e => e.id === editParam);
        if (!target) return;
        handleEdit(target);
        const next = new URLSearchParams(searchParams);
        next.delete('edit');
        setSearchParams(next, { replace: true });
    }, [editParam, upcomingEvents]); // eslint-disable-line react-hooks/exhaustive-deps

    const ordersByEvent = useMemo(() => {
        const map = {};
        (ticketOrders || []).forEach(o => { (map[o.eventId] ||= []).push(o); });
        return map;
    }, [ticketOrders]);

    const handleDelete = async (item) => {
        const sold = (ordersByEvent[item.id] || []).filter(o => o.status !== 'rejected').length;
        const warning = sold
            ? `Delete "${item.title}"? It has ${sold} ticket ${sold === 1 ? 'order' : 'orders'}; they stay in the database but the event page disappears. This can't be undone.`
            : `Delete "${item.title}"? This can't be undone.`;
        if (!window.confirm(warning)) return;
        try {
            await deleteUpcomingEvent(item.id);
            useStore.getState().addToast('Event deleted.', 'success');
        } catch (err) {
            console.error(err);
            useStore.getState().addToast("Check your connection and try again.", 'error', {
                title: 'Event not deleted',
                action: { label: 'Try again', onClick: () => handleDelete(item) },
            });
        }
    };

    const handleDuplicate = async (item) => {
        // eslint-disable-next-line no-unused-vars
        const { id, createdAt, updatedAt, order, isPinned, ...rest } = item;
        try {
            await addUpcomingEvent({ ...rest, title: `${item.title || 'Event'} (copy)`, isPinned: false, createdAt: new Date().toISOString() }, false);
            useStore.getState().addToast('Edit the copy to change its date.', 'success', { title: 'Event duplicated' });
        } catch (err) {
            console.error(err);
            useStore.getState().addToast("Please try again.", 'error', {
                title: "Couldn't duplicate the event",
                action: { label: 'Try again', onClick: () => handleDuplicate(item) },
            });
        }
    };

    const formatListDate = (value) => {
        const d = value?.seconds ? new Date(value.seconds * 1000) : value ? new Date(value) : null;
        if (!d || isNaN(d.getTime())) return 'Date to be announced';
        const hasTime = typeof value === 'string' && value.includes('T');
        return d.toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', ...(hasTime ? { hour: 'numeric', minute: '2-digit' } : {}) });
    };

    const isPastEvent = (event) => {
        if (!event.date) return false;
        let eventDate;
        if (event.date.seconds) {
            eventDate = new Date(event.date.seconds * 1000);
        } else {
            eventDate = new Date(event.date);
        }
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return eventDate < today;
    };

    const [newEvent, setNewEvent] = useState({
        title: '',
        date: '',
        category: '',
        description: '',
        location: '',
        city: '',
        locationUrl: '',
        buttonText: '',
        image: '',
        hubImage: '',
        link: '',
        venueLayout: '',
        isGuestlistEnabled: false,
        guestlistMode: 'qr',
        perUserLimit: 5,
        hasGuestlistTask: false,
        guestlistTask: null,
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
    const [isUploadingVideo, setIsUploadingVideo] = useState(false);
    const [videoUploadProgress, setVideoUploadProgress] = useState(0);

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
            title: '', date: '', time: '', category: '', description: '', location: '', city: '', locationUrl: '', buttonText: '', image: '', hubImage: '', link: '', venueLayout: '', alsoPostToAnnouncements: false,
            isTicketed: false, ticketMode: 'qr', isGuestlistEnabled: false, guestlistMode: 'qr', perUserLimit: 5,
            hasGuestlistTask: false, guestlistTask: null, ticketCategories: [],
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
        setIsUploadingVideo(false);
        setVideoUploadProgress(0);
        setUploading(false);
        setMappingCategoryId(null);
    };

    const [mappingCategoryId, setMappingCategoryId] = useState(null);
    const [dragStart, setDragStart] = useState(null);
    const [currentDrag, setCurrentDrag] = useState(null);

    const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState('');
    const [hubBannerPreviewUrl, setHubBannerPreviewUrl] = useState('');
    const [venueLayoutPreviewUrl, setVenueLayoutPreviewUrl] = useState('');

    useEffect(() => {
        if (!selectedFile) {
            setThumbnailPreviewUrl(newEvent.image || '');
            return;
        }
        let isMounted = true;
        const reader = new FileReader();
        reader.onload = (e) => {
            if (isMounted) setThumbnailPreviewUrl(e.target?.result || '');
        };
        reader.readAsDataURL(selectedFile);
        return () => { isMounted = false; };
    }, [selectedFile, newEvent.image]);

    useEffect(() => {
        if (!selectedHubBanner) {
            setHubBannerPreviewUrl(newEvent.hubImage || '');
            return;
        }
        let isMounted = true;
        const reader = new FileReader();
        reader.onload = (e) => {
            if (isMounted) setHubBannerPreviewUrl(e.target?.result || '');
        };
        reader.readAsDataURL(selectedHubBanner);
        return () => { isMounted = false; };
    }, [selectedHubBanner, newEvent.hubImage]);

    useEffect(() => {
        if (!venueLayoutFile) {
            setVenueLayoutPreviewUrl(newEvent.venueLayout || '');
            return;
        }
        let isMounted = true;
        const reader = new FileReader();
        reader.onload = (e) => {
            if (isMounted) setVenueLayoutPreviewUrl(e.target?.result || '');
        };
        reader.readAsDataURL(venueLayoutFile);
        return () => { isMounted = false; };
    }, [venueLayoutFile, newEvent.venueLayout]);

    useEffect(() => {
        const handleGlobalMouseUp = () => {
            setDragStart(null);
            setCurrentDrag(null);
        };
        window.addEventListener('mouseup', handleGlobalMouseUp);
        window.addEventListener('touchend', handleGlobalMouseUp);
        return () => {
            window.removeEventListener('mouseup', handleGlobalMouseUp);
            window.removeEventListener('touchend', handleGlobalMouseUp);
        };
    }, []);

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
        
        setVideoFile(null);
        setIsUploadingVideo(false);
        setVideoUploadProgress(0);

        setNewEvent({ 
            ...item, 
            date: dateValue || '', 
            alsoPostToAnnouncements: false,
            artists: artists,
            ageLimit: item.ageLimit || 'ALL AGES',
            doorsOpen: item.doorsOpen || '',
            performanceType: item.performanceType || 'LIVE SHOW',
            highlightColor: item.highlightColor || '#2ebfff',
            guestlistMode: item.guestlistMode || 'qr',
            perUserLimit: item.perUserLimit || 5,
            hasGuestlistTask: !!item.hasGuestlistTask,
            guestlistTask: item.guestlistTask || null,
            videoUrl: item.videoUrl || '',
            enableVideoBackground: !!item.enableVideoBackground
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
        const items = (e.clipboardData || e.originalEvent?.clipboardData)?.items;
        if (items) {
            for (let index in items) {
                const item = items[index];
                if (item.kind === 'file' && item.type.startsWith('image/')) {
                    const file = item.getAsFile();
                    if (file) {
                        if (type === 'image') {
                            setSelectedFile(file);
                            useStore.getState().addToast("Thumbnail pasted.", 'success');
                        } else if (type === 'hubImage') {
                            setSelectedHubBanner(file);
                            useStore.getState().addToast("Hub banner pasted.", 'success');
                        } else if (type === 'venueLayout') {
                            setVenueLayoutFile(file);
                            useStore.getState().addToast("Layout image pasted.", 'success');
                        }
                        e.preventDefault();
                        return;
                    }
                }
            }
        }

        const text = (e.clipboardData || e.originalEvent?.clipboardData)?.getData('text');
        if (text && (text.startsWith('http://') || text.startsWith('https://') || text.startsWith('data:image/'))) {
            if (type === 'image') {
                setSelectedFile(null);
                setNewEvent(prev => ({ ...prev, image: text.trim() }));
                useStore.getState().addToast("Thumbnail link pasted.", 'success');
            } else if (type === 'hubImage') {
                setSelectedHubBanner(null);
                setNewEvent(prev => ({ ...prev, hubImage: text.trim() }));
                useStore.getState().addToast("Hub banner link pasted.", 'success');
            } else if (type === 'venueLayout') {
                setVenueLayoutFile(null);
                setNewEvent(prev => ({ ...prev, venueLayout: text.trim() }));
                useStore.getState().addToast("Venue layout link pasted.", 'success');
            }
            e.preventDefault();
        }
    };

    const uploadToCloudinary = useStore.getState().uploadToCloudinary;
    const uploadVideoFile = useStore.getState().uploadVideoFile;

    const handleVideoUpload = async (file) => {
        if (!file) return;
        if (file.size > 100 * 1024 * 1024) {
            useStore.getState().addToast("Pick a video under 100MB.", 'warning', { title: 'This video is too big' });
            return;
        }
        setIsUploadingVideo(true);
        setVideoUploadProgress(0);
        try {
            const url = await uploadVideoFile(file, (progress) => {
                setVideoUploadProgress(progress);
            });
            if (url) {
                setNewEvent(prev => ({ ...prev, videoUrl: url }));
                setVideoFile(null);
                useStore.getState().addToast("Video uploaded.", 'success');
            }
        } catch (error) {
            console.error("Video upload failed:", error);
            useStore.getState().addToast("Check your connection and try again.", 'error', {
                title: 'Video not uploaded',
                action: { label: 'Try again', onClick: () => handleVideoUpload(file) },
            });
        } finally {
            setIsUploadingVideo(false);
            setVideoUploadProgress(0);
        }
    };

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
                videoUrl = await uploadVideoFile(videoFile, (p) => setVideoUploadProgress(p));
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
                city: cleanCity(newEvent.city),
                updatedAt: new Date().toISOString()
            };

            if (editingId) {
                await updateUpcomingEvent(editingId, eventData);
            } else {
                await addUpcomingEvent(eventData, newEvent.alsoPostToAnnouncements);
                // The event is saved at this point; a failed announcement must not
                // look like a failed save (a retry would create a duplicate event).
                try {
                    await notifyAllUsers(
                        `New event: ${eventData.title}`,
                        `Join us on ${eventData.date} at ${eventData.location}.`,
                        '/events',
                        eventData.image
                    );
                } catch (notifyError) {
                    console.error("Event saved, but notifying users failed:", notifyError);
                    useStore.getState().addToast("We couldn't send the new-event notification.", 'warning', {
                        title: 'Event saved',
                        hint: "Use Resend notification in the event's menu to try again.",
                    });
                }
            }
            resetForm();
        } catch (error) {
            console.error("Save failed:", error);
            useStore.getState().addToast("Check the details and your connection, then try again.", 'error', { title: 'Event not saved', code: 'EVT-01' });
        } finally {
            setUploading(false);
        }
    };

    // Ticket sales made in Ticket sales are managed there, not in this list.
    const ownEvents = upcomingEvents.filter(e => e.createdIn !== 'ticketing');
    const salesElsewhere = upcomingEvents.length - ownEvents.length;
    const filteredEvents = ownEvents.filter(event => {
        if (eventFilter === 'upcoming') {
            return !isPastEvent(event);
        } else if (eventFilter === 'past') {
            return isPastEvent(event);
        }
        return true;
    });

    const set = (patch) => setNewEvent(prev => ({ ...prev, ...patch }));
    const { date: datePart, time: timePart } = splitDateTime(newEvent.date);
    const setDate = (d, t) => set({ date: d ? `${d}T${t || '20:00'}` : '' });
    const updateTier = (idx, patch) => set({ ticketCategories: (newEvent.ticketCategories || []).map((c, i) => (i === idx ? { ...c, ...patch } : c)) });
    const removeTierZone = (idx, key) => set({ ticketCategories: (newEvent.ticketCategories || []).map((c, i) => {
        if (i !== idx) return c;
        const { [key]: _drop, ...rest } = c; // eslint-disable-line no-unused-vars
        return rest;
    }) });
    const toggleAccess = (key, defaultText) => {
        const on = !newEvent[key];
        const patch = { [key]: on };
        if (on && (!newEvent.buttonText || ['VIEW DETAILS', 'GET TICKETS', 'RSVP NOW', 'LEARN MORE'].includes(newEvent.buttonText))) patch.buttonText = defaultText;
        set(patch);
    };
    const finishZone = () => {
        if (dragStart && currentDrag && currentDrag.width > 0.5 && currentDrag.height > 0.5) {
            set({ ticketCategories: newEvent.ticketCategories.map(c => (c.id === mappingCategoryId ? { ...c, mapping: currentDrag } : c)) });
            setMappingCategoryId(null);
        }
        setDragStart(null);
        setCurrentDrag(null);
    };
    const pointFrom = (e, clientX, clientY) => {
        const rect = e.currentTarget.getBoundingClientRect();
        return { x: ((clientX - rect.left) / rect.width) * 100, y: ((clientY - rect.top) / rect.height) * 100 };
    };
    const dragTo = (p) => {
        if (!dragStart) return;
        setCurrentDrag({ x: Math.min(p.x, dragStart.x), y: Math.min(p.y, dragStart.y), width: Math.abs(p.x - dragStart.x), height: Math.abs(p.y - dragStart.y) });
    };
    const startNew = () => { resetForm(); setIsAdding(true); setEditingId(null); setActiveEditorTab('basics'); };
    const previewData = { ...newEvent, image: thumbnailPreviewUrl, hubImage: hubBannerPreviewUrl };
    const openHubPreview = () => { setPreviewEvent(previewData); setIsPreviewOpen(true); };
    const tiers = newEvent.ticketCategories || [];
    const layoutUrl = venueLayoutPreviewUrl || newEvent.venueLayout;
    const selectCls = cn(fieldCls, 'cursor-pointer');

    const editor = (
        <div className="pb-28 sm:pb-10">
            {/* Top bar */}
            <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-30 -mx-4 mb-5 lg:top-0 flex items-center gap-2 border-b border-black/[0.06] bg-white/90 px-4 py-3 backdrop-blur-xl dark:border-white/[0.06] dark:bg-[#0a0b10]/90 sm:-mx-6 sm:px-6">
                <button type="button" onClick={resetForm} className="flex h-10 items-center gap-1.5 rounded-xl px-2 text-[13px] font-semibold text-gray-500 hover:text-gray-900 dark:hover:text-white">
                    <ChevronLeft size={16} /> Events
                </button>
                <p className="min-w-0 flex-1 truncate text-[15px] font-bold">{editingId ? (newEvent.title || 'Edit event') : 'New event'}</p>
                <AdminButton variant="secondary" onClick={() => setShowPreviewMobile(v => !v)} className="h-10 xl:hidden">
                    {showPreviewMobile ? <EyeOff size={14} /> : <Eye size={14} />} {showPreviewMobile ? 'Edit' : 'Preview'}
                </AdminButton>
                <AdminButton variant="primary" type="submit" form="event-editor" disabled={uploading || isUploadingVideo} className="hidden h-10 sm:inline-flex">
                    {uploading ? 'Saving…' : editingId ? 'Save changes' : 'Publish event'}
                </AdminButton>
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px] 2xl:grid-cols-[minmax(0,1fr)_380px]">
                <form id="event-editor" onSubmit={handleSubmit} className={cn('space-y-5', showPreviewMobile && 'hidden xl:block')} noValidate={false}>
                    <BuilderCard id="ev-basics" title="Basics" hint="What, when and where">
                        <div className="space-y-3">
                            <Field label="Event name">
                                <input className={fieldCls} required value={newEvent.title} onChange={(e) => set({ title: e.target.value })} placeholder="e.g. Sunburn Arena ft. Alan Walker" />
                            </Field>
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                                <Field label="Date">
                                    <input className={fieldCls} type="date" value={datePart} onChange={(e) => setDate(e.target.value, timePart)} />
                                </Field>
                                <Field label="Starts at">
                                    <input className={fieldCls} type="time" value={timePart} disabled={!datePart} onChange={(e) => setDate(datePart, e.target.value)} />
                                </Field>
                                <Field label="Doors open" optional className="col-span-2 sm:col-span-1">
                                    <input className={fieldCls} value={newEvent.doorsOpen || ''} onChange={(e) => set({ doorsOpen: e.target.value })} placeholder="e.g. 6:30 PM" />
                                </Field>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2">
                                <Field label="Venue">
                                    <input className={fieldCls} required value={newEvent.location || ''} onChange={(e) => set({ location: e.target.value })} placeholder="e.g. Jayamahal Palace, Bengaluru" />
                                </Field>
                                <Field label="City" optional hint="Shown on the card; Community filters by it">
                                    <CityInput className={fieldCls} value={newEvent.city} onChange={(v) => set({ city: v })} />
                                </Field>
                            </div>
                            <Field label="Google Maps link" optional>
                                <input className={fieldCls} inputMode="url" autoCapitalize="off" value={newEvent.locationUrl || ''} onChange={(e) => set({ locationUrl: e.target.value })} placeholder="https://maps.app.goo.gl/…" />
                            </Field>
                            <Field label="Category" optional>
                                <ThemedSelect className={selectCls} value={newEvent.category || ''} onChange={(e) => set({ category: e.target.value })}>
                                    <option value="">No category</option>
                                    {portfolioCategories.map(cat => <option key={cat.id} value={cat.id}>{cat.label}</option>)}
                                </ThemedSelect>
                            </Field>
                            <Field label="Description" optional>
                                <textarea className={areaCls} rows={5} value={newEvent.description || ''} onChange={(e) => set({ description: e.target.value })} placeholder="What's happening, who's playing, dress code, entry rules…" />
                            </Field>
                        </div>
                    </BuilderCard>

                    <BuilderCard id="ev-lineup" title="Lineup and look">
                        <div className="space-y-3">
                            <Field label="Artists" optional hint="Separate names with commas">
                                <input className={fieldCls} value={artistsInput} onChange={(e) => { const val = e.target.value; setArtistsInput(val); set({ artists: val.split(',').map(s => s.trim()).filter(Boolean) }); }} placeholder="Artist one, Artist two" />
                            </Field>
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                                <Field label="Format">
                                    <input className={fieldCls} value={newEvent.performanceType || ''} onChange={(e) => set({ performanceType: e.target.value })} placeholder="Live show, DJ set…" />
                                </Field>
                                <Field label="Age limit">
                                    <input className={fieldCls} value={newEvent.ageLimit || ''} onChange={(e) => set({ ageLimit: e.target.value })} placeholder="All ages, 18+" />
                                </Field>
                                <Field label="Accent colour" className="col-span-2 sm:col-span-1">
                                    <div className="flex gap-2">
                                        <input type="color" value={newEvent.highlightColor || '#2ebfff'} onChange={(e) => set({ highlightColor: e.target.value })} className="h-12 w-14 shrink-0 cursor-pointer rounded-xl border border-black/10 bg-white p-1 dark:border-white/10 dark:bg-white/[0.04]" aria-label="Pick accent colour" />
                                        <input className={cn(fieldCls, 'font-mono uppercase')} value={newEvent.highlightColor || ''} onChange={(e) => set({ highlightColor: e.target.value })} maxLength={7} />
                                    </div>
                                </Field>
                            </div>
                        </div>
                    </BuilderCard>

                    <BuilderCard id="ev-media" title="Images and video" hint="Upload, paste (Ctrl/Cmd+V) or link">
                        <div className="grid gap-5 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
                            <ImageSlot
                                label="Card image (4:5)" hint="Shown on event cards"
                                previewUrl={thumbnailPreviewUrl} url={selectedFile ? '' : newEvent.image}
                                onFile={setSelectedFile} onUrl={(v) => { setSelectedFile(null); set({ image: v }); }}
                                onClear={() => { setSelectedFile(null); set({ image: '' }); }}
                                onPaste={(e) => handlePaste(e, 'image')}
                                transform={newEvent.imageTransform} onTransform={(t) => set({ imageTransform: t })}
                            />
                            <div className="space-y-5">
                                <ImageSlot
                                    label="Banner (16:9)" hint="Top of the event page" aspect="aspect-video"
                                    previewUrl={hubBannerPreviewUrl} url={selectedHubBanner ? '' : newEvent.hubImage}
                                    onFile={setSelectedHubBanner} onUrl={(v) => { setSelectedHubBanner(null); set({ hubImage: v }); }}
                                    onClear={() => { setSelectedHubBanner(null); set({ hubImage: '' }); }}
                                    onPaste={(e) => handlePaste(e, 'hubImage')}
                                    transform={newEvent.hubImageTransform} onTransform={(t) => set({ hubImageTransform: t })}
                                />
                                <ImageSlot
                                    label="Venue map" hint="Optional. Lets ticket tiers be marked on it" aspect="aspect-[16/10]" contain
                                    previewUrl={layoutUrl} url={venueLayoutFile ? '' : newEvent.venueLayout}
                                    onFile={setVenueLayoutFile} onUrl={(v) => { setVenueLayoutFile(null); set({ venueLayout: v }); }}
                                    onClear={() => { setVenueLayoutFile(null); set({ venueLayout: '' }); }}
                                    onPaste={(e) => handlePaste(e, 'venueLayout')}
                                />
                            </div>
                        </div>

                        <div className="mt-5 space-y-3 border-t border-black/[0.06] pt-5 dark:border-white/[0.06]">
                            <div className="flex items-center justify-between">
                                <span className="text-[12px] font-bold text-gray-500">Video <span className="font-medium">(optional)</span></span>
                                {newEvent.videoUrl && <button type="button" onClick={() => { set({ videoUrl: '' }); setVideoFile(null); }} className="-my-2 py-2 pl-3 text-[12px] font-semibold text-red-500">Remove</button>}
                            </div>
                            <div className="flex gap-2">
                                <input className={fieldCls} inputMode="url" autoCapitalize="off" value={newEvent.videoUrl || ''} onChange={(e) => set({ videoUrl: e.target.value })} placeholder="YouTube, Vimeo or a video link" />
                                <label className={cn('relative flex h-12 shrink-0 cursor-pointer items-center gap-2 rounded-xl border border-black/10 px-3.5 text-[13px] font-bold dark:border-white/10', isUploadingVideo && 'pointer-events-none opacity-60')}>
                                    <VideoIcon size={15} /> {isUploadingVideo ? `${videoUploadProgress}%` : 'Upload'}
                                    <input type="file" accept="video/*" disabled={isUploadingVideo} className="absolute inset-0 cursor-pointer opacity-0" onChange={(e) => { const file = e.target.files?.[0]; if (file) { setVideoFile(file); handleVideoUpload(file); } e.target.value = ''; }} />
                                </label>
                            </div>
                            {isUploadingVideo && (
                                <div className="h-1.5 overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
                                    <div className="h-full rounded-full bg-emerald-500 transition-[width] dark:bg-neon-green" style={{ width: `${videoUploadProgress}%` }} />
                                </div>
                            )}
                            {newEvent.videoUrl && /\.(mp4|webm|ogg|mov)(\?|$)|cloudinary\.com|firebasestorage\.googleapis\.com|storage\.googleapis\.com|^blob:/i.test(newEvent.videoUrl) && (
                                <video src={newEvent.videoUrl} controls playsInline muted className="aspect-video w-full max-w-sm rounded-xl bg-black object-cover" />
                            )}
                            {newEvent.videoUrl && (
                                <Toggle label="Play as the card background" hint="Portrait (9:16) videos look best" checked={!!newEvent.enableVideoBackground} onChange={(v) => set({ enableVideoBackground: v })} />
                            )}
                        </div>
                    </BuilderCard>

                    <BuilderCard id="ev-access" title="Tickets and guestlist" hint="How people get in">
                        <div className="grid gap-2 sm:grid-cols-2">
                            {[
                                { key: 'isTicketed', label: 'Sell tickets', hint: 'Paid or free tickets with QR passes', icon: Ticket, text: 'GET TICKETS' },
                                { key: 'isGuestlistEnabled', label: 'Guestlist', hint: 'People request a spot or RSVP', icon: Users, text: 'RSVP NOW' },
                            ].map(opt => (
                                <button key={opt.key} type="button" role="switch" aria-checked={!!newEvent[opt.key]} onClick={() => toggleAccess(opt.key, opt.text)}
                                    className={cn('flex items-center gap-3 rounded-xl border p-3.5 text-left transition-colors',
                                        newEvent[opt.key] ? 'border-emerald-500/60 bg-neon-green/[0.07] dark:border-neon-green/50' : 'border-black/10 hover:border-black/20 dark:border-white/10 dark:hover:border-white/20')}>
                                    <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', newEvent[opt.key] ? 'bg-emerald-500 text-white dark:bg-neon-green dark:text-black' : 'bg-black/5 text-gray-500 dark:bg-white/[0.06]')}><opt.icon size={18} /></span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-[14px] font-bold">{opt.label}</span>
                                        <span className="block text-[12px] text-gray-500">{opt.hint}</span>
                                    </span>
                                    <span className={cn('relative h-7 w-12 shrink-0 rounded-full transition-colors', newEvent[opt.key] ? 'bg-emerald-500 dark:bg-neon-green' : 'bg-black/15 dark:bg-white/15')}>
                                        <span className={cn('absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-[left]', newEvent[opt.key] ? 'left-[22px]' : 'left-0.5')} />
                                    </span>
                                </button>
                            ))}
                        </div>

                        {newEvent.isTicketed && (
                            <div className="mt-5 space-y-5 border-t border-black/[0.06] pt-5 dark:border-white/[0.06]">
                                <Field label="Ticket type">
                                    <Choice value={newEvent.ticketMode || 'qr'} onChange={(v) => set({ ticketMode: v })} options={[
                                        { value: 'qr', label: 'QR passes', hint: 'Issued and scanned automatically' },
                                        { value: 'pdf', label: 'PDF tickets', hint: 'You send tickets yourself' },
                                    ]} />
                                </Field>
                                <div className="grid grid-cols-2 gap-3">
                                    <Field label="Total capacity" hint="Across all tiers. Blank = no limit">
                                        <input className={fieldCls} type="number" inputMode="numeric" min="0" placeholder="No limit" value={newEvent.ticketCapacity ?? ''} onChange={(e) => set({ ticketCapacity: e.target.value === '' ? null : Math.max(0, parseInt(e.target.value, 10) || 0) })} />
                                    </Field>
                                    {!tiers.length && (
                                        <Field label="Price (₹)" hint="0 makes it free">
                                            <input className={fieldCls} type="number" inputMode="decimal" min="0" placeholder="0" value={newEvent.basePrice ?? ''} onChange={(e) => set({ basePrice: e.target.value === '' ? 0 : Math.max(0, parseFloat(e.target.value) || 0) })} />
                                        </Field>
                                    )}
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[13px] font-bold">Tiers <span className="font-medium text-gray-500">(optional)</span></span>
                                        <button type="button" onClick={() => set({ ticketCategories: [...tiers, { id: `cat_${Date.now()}`, name: '', price: 0, description: '', color: '#2ebfff' }] })} className="flex h-9 items-center gap-1 rounded-lg px-2 text-[13px] font-bold text-emerald-700 dark:text-neon-green">
                                            <Plus size={14} /> Add tier
                                        </button>
                                    </div>
                                    {!tiers.length && <p className="text-[12px] text-gray-500">One price for everyone. Add tiers for early bird, VIP and so on.</p>}
                                    {tiers.map((cat, idx) => (
                                        <div key={cat.id} className={cn('space-y-3 rounded-xl border p-3', mappingCategoryId === cat.id ? 'border-sky-500 dark:border-neon-blue' : 'border-black/10 dark:border-white/10')}>
                                            <div className="flex gap-2">
                                                <input type="color" value={cat.color || '#2ebfff'} onChange={(e) => updateTier(idx, { color: e.target.value })} className="h-12 w-12 shrink-0 cursor-pointer rounded-xl border border-black/10 bg-white p-1 dark:border-white/10 dark:bg-white/[0.04]" aria-label="Tier colour" />
                                                <input className={fieldCls} value={cat.name} onChange={(e) => updateTier(idx, { name: e.target.value })} placeholder="Tier name, e.g. Early bird" aria-label="Tier name" />
                                                <button type="button" onClick={() => set({ ticketCategories: tiers.filter((_, i) => i !== idx) })} aria-label="Remove tier" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-red-500 hover:bg-red-500/10"><Trash2 size={16} /></button>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <Field label="Price (₹)"><input className={fieldCls} type="number" inputMode="decimal" min="0" value={cat.price} onChange={(e) => updateTier(idx, { price: parseFloat(e.target.value) || 0 })} /></Field>
                                                <Field label="Tickets" hint="Blank = no limit"><input className={fieldCls} type="number" inputMode="numeric" min="0" placeholder="No limit" value={cat.capacity ?? ''} onChange={(e) => updateTier(idx, { capacity: e.target.value === '' ? null : Math.max(0, parseInt(e.target.value, 10) || 0) })} /></Field>
                                            </div>
                                            <input className={cn(fieldCls, 'font-medium')} value={cat.description || ''} onChange={(e) => updateTier(idx, { description: e.target.value })} placeholder="What's included (optional)" aria-label="Tier benefits" />
                                            {layoutUrl && (
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <button type="button" onClick={() => setMappingCategoryId(mappingCategoryId === cat.id ? null : cat.id)} className={cn('flex h-9 items-center gap-1.5 rounded-lg border px-3 text-[12px] font-bold', mappingCategoryId === cat.id ? 'border-sky-500 bg-sky-500/10 text-sky-700 dark:border-neon-blue dark:text-neon-blue' : 'border-black/10 dark:border-white/10')}>
                                                        <MapIcon size={13} /> {mappingCategoryId === cat.id ? 'Drawing… drag on the map below' : cat.mapping ? 'Redraw on map' : 'Mark on venue map'}
                                                    </button>
                                                    {cat.mapping && <button type="button" onClick={() => removeTierZone(idx, 'mapping')} className="text-[12px] font-semibold text-red-500">Clear area</button>}
                                                    {cat.coords && <button type="button" onClick={() => removeTierZone(idx, 'coords')} className="text-[12px] font-semibold text-red-500">Clear old pin</button>}
                                                </div>
                                            )}
                                        </div>
                                    ))}

                                    {layoutUrl && mappingCategoryId && (
                                        <div className="space-y-2">
                                            <p className="text-[12px] text-gray-500">Drag a box over where <strong>{tiers.find(c => c.id === mappingCategoryId)?.name || 'this tier'}</strong> is.</p>
                                            <div
                                                className="relative cursor-crosshair touch-none select-none overflow-hidden rounded-xl border border-black/10 bg-white dark:border-white/10 dark:bg-black"
                                                onMouseDown={(e) => setDragStart(pointFrom(e, e.clientX, e.clientY))}
                                                onMouseMove={(e) => dragTo(pointFrom(e, e.clientX, e.clientY))}
                                                onMouseUp={finishZone}
                                                onTouchStart={(e) => setDragStart(pointFrom(e, e.touches[0].clientX, e.touches[0].clientY))}
                                                onTouchMove={(e) => dragTo(pointFrom(e, e.touches[0].clientX, e.touches[0].clientY))}
                                                onTouchEnd={finishZone}
                                            >
                                                <img src={layoutUrl} alt="Venue map" className="pointer-events-none h-auto w-full" draggable={false} />
                                                {currentDrag && (
                                                    <div className="absolute border-2 border-dashed border-white bg-sky-500/30" style={{ left: `${currentDrag.x}%`, top: `${currentDrag.y}%`, width: `${currentDrag.width}%`, height: `${currentDrag.height}%` }} />
                                                )}
                                                {tiers.map(cat => cat.mapping && (
                                                    <div key={cat.id} className="absolute flex flex-col items-center justify-center rounded border-2 border-white/40 text-center" style={{ left: `${cat.mapping.x}%`, top: `${cat.mapping.y}%`, width: `${cat.mapping.width}%`, height: `${cat.mapping.height}%`, backgroundColor: `${cat.color || '#2ebfff'}cc` }}>
                                                        <span className="w-full truncate px-1 text-[10px] font-bold text-white drop-shadow">{cat.name}</span>
                                                        <span className="text-[10px] font-bold text-white drop-shadow">₹{cat.price}</span>
                                                    </div>
                                                ))}
                                                {tiers.map(cat => cat.coords && !cat.mapping && (
                                                    <div key={cat.id} className="absolute -ml-4 -mt-4 h-8 w-8 rounded-full border-2 border-white shadow" style={{ left: `${cat.coords.x}%`, top: `${cat.coords.y}%`, backgroundColor: cat.color || '#2ebfff' }} />
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {tiers.length > 0 && !layoutUrl && <p className="text-[12px] text-gray-500">Add a venue map above to mark where each tier sits.</p>}
                                </div>

                                <Field label="Note at the top of checkout" optional>
                                    <textarea className={areaCls} rows={3} value={newEvent.ticketingDescription || ''} onChange={(e) => set({ ticketingDescription: e.target.value })} placeholder="e.g. Prices go up on 1 Nov. Kids under 5 enter free." />
                                </Field>
                                <Field label="Rules and policies" optional>
                                    <textarea className={areaCls} rows={3} value={newEvent.ticketingRules || ''} onChange={(e) => set({ ticketingRules: e.target.value })} placeholder="ID required, no outside food, no refunds…" />
                                </Field>
                            </div>
                        )}

                        {newEvent.isGuestlistEnabled && (
                            <div className="mt-5 space-y-4 border-t border-black/[0.06] pt-5 dark:border-white/[0.06]">
                                <Field label="Guestlist type">
                                    <Choice value={newEvent.guestlistMode || 'qr'} onChange={(v) => set({ guestlistMode: v })} options={[
                                        { value: 'qr', label: 'QR passes', hint: 'Approved guests get a pass' },
                                        { value: 'rsvp', label: 'RSVP only', hint: 'Just a headcount, no QR' },
                                    ]} />
                                </Field>
                                <Field label="Guestlist entry until" optional hint="On the day, guests are reminded of this time (for clubs that charge cover after it)">
                                    <input className={cn(fieldCls, 'max-w-[10rem]')} value={newEvent.entryUntil || ''} maxLength={40} placeholder="11:00 PM" onChange={(e) => set({ entryUntil: e.target.value })} />
                                </Field>
                                <Field label="Spots per person" hint="The most one person can request (5 if blank)">
                                    <input className={cn(fieldCls, 'max-w-[10rem]')} type="number" inputMode="numeric" min="1" value={newEvent.perUserLimit || ''} onChange={(e) => set({ perUserLimit: parseInt(e.target.value, 10) || 1 })} />
                                </Field>
                                <GuestlistTaskConfig
                                    enabled={newEvent.hasGuestlistTask}
                                    taskData={newEvent.guestlistTask}
                                    onChange={({ hasGuestlistTask, guestlistTask }) => set({ hasGuestlistTask, guestlistTask })}
                                    accentColor="neon-pink"
                                />
                            </div>
                        )}
                    </BuilderCard>

                    <BuilderCard id="ev-links" title="Button and links">
                        <div className="space-y-3">
                            <div className="grid gap-3 sm:grid-cols-2">
                                <Field label="Button text" hint="Defaults to “Learn more”">
                                    <input className={fieldCls} value={newEvent.buttonText || ''} onChange={(e) => set({ buttonText: e.target.value })} placeholder="Get tickets" />
                                </Field>
                                <Field label="Button link" optional hint="Leave blank to open the event page">
                                    <input className={fieldCls} inputMode="url" autoCapitalize="off" value={newEvent.link || ''} onChange={(e) => set({ link: e.target.value })} placeholder="https://…" />
                                </Field>
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-[12px] font-bold text-gray-500">Also selling on <span className="font-medium">(optional)</span></span>
                                    <button type="button" onClick={() => set({ externalTicketingLinks: [...(newEvent.externalTicketingLinks || []), { platform: '', url: '' }] })} className="flex h-9 items-center gap-1 rounded-lg px-2 text-[13px] font-bold text-emerald-700 dark:text-neon-green"><Plus size={14} /> Add</button>
                                </div>
                                {(newEvent.externalTicketingLinks || []).map((link, idx) => (
                                    <div key={idx} className="flex gap-2">
                                        <input className={cn(fieldCls, 'w-[38%] shrink-0')} value={link.platform} onChange={(e) => set({ externalTicketingLinks: newEvent.externalTicketingLinks.map((l, i) => (i === idx ? { ...l, platform: e.target.value } : l)) })} placeholder="BookMyShow" aria-label="Platform" />
                                        <input className={fieldCls} inputMode="url" autoCapitalize="off" value={link.url} onChange={(e) => set({ externalTicketingLinks: newEvent.externalTicketingLinks.map((l, i) => (i === idx ? { ...l, url: e.target.value } : l)) })} placeholder="https://…" aria-label="Link" />
                                        <button type="button" onClick={() => set({ externalTicketingLinks: newEvent.externalTicketingLinks.filter((_, i) => i !== idx) })} aria-label="Remove link" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-red-500 hover:bg-red-500/10"><Trash2 size={16} /></button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </BuilderCard>

                    <BuilderCard id="ev-connections" title="Connected to" hint="Shown on the event page so people can get involved">
                        <div className="grid gap-3 sm:grid-cols-3">
                            <Field label="Volunteer gig">
                                <ThemedSelect className={selectCls} value={newEvent.relatedVolunteerGigId || ''} onChange={(e) => set({ relatedVolunteerGigId: e.target.value })}>
                                    <option value="">None</option>
                                    {volunteerGigs.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
                                </ThemedSelect>
                            </Field>
                            <Field label="Creator campaign">
                                <ThemedSelect className={selectCls} value={newEvent.relatedCampaignId || ''} onChange={(e) => set({ relatedCampaignId: e.target.value })}>
                                    <option value="">None</option>
                                    {campaigns.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                                </ThemedSelect>
                            </Field>
                            <Field label="Artist sign-up form">
                                <ThemedSelect className={selectCls} value={newEvent.relatedArtistFormId || ''} onChange={(e) => set({ relatedArtistFormId: e.target.value })}>
                                    <option value="">None</option>
                                    {forms.map(f => <option key={f.id} value={f.id}>{f.title}</option>)}
                                </ThemedSelect>
                            </Field>
                        </div>
                    </BuilderCard>

                    {!editingId && (
                        <BuilderCard title="When you publish">
                            <Toggle label="Also post to Announcements" hint="Everyone gets a notification and email about new events either way" checked={!!newEvent.alsoPostToAnnouncements} onChange={(v) => set({ alsoPostToAnnouncements: v })} />
                        </BuilderCard>
                    )}
                </form>

                <aside className={cn('mx-auto w-full max-w-sm space-y-3 xl:sticky xl:top-24 xl:max-w-none xl:self-start', !showPreviewMobile && 'hidden xl:block')}>
                    <p className="text-[12px] font-bold text-gray-500">Live preview</p>
                    <LivePreview type="event" data={previewData} onAction={openHubPreview} />
                    <AdminButton variant="secondary" onClick={openHubPreview} className="h-11 w-full"><Eye size={14} /> Open event page preview</AdminButton>
                </aside>
            </div>

            {/* Phone save bar */}
            <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-40 border-t border-black/[0.06] bg-white/95 px-4 py-3 backdrop-blur-xl dark:border-white/[0.06] dark:bg-[#0a0b10]/95 sm:hidden">
                <div className="flex gap-2">
                    <AdminButton variant="ghost" onClick={resetForm} className="h-12">Cancel</AdminButton>
                    <AdminButton variant="primary" type="submit" form="event-editor" disabled={uploading || isUploadingVideo} className="h-12 flex-1">
                        {uploading ? 'Saving…' : editingId ? 'Save changes' : 'Publish event'}
                    </AdminButton>
                </div>
            </div>

            <EventHubModal event={previewEvent} isOpen={isPreviewOpen} onClose={() => setIsPreviewOpen(false)} />
        </div>
    );

    return (
        <AdminCommunityHubLayout
            studioHeader={{ title: 'Events', icon: Calendar, accentClass: 'text-emerald-600 dark:text-neon-green', description: 'What shows on the website, with tickets and guestlists' }}
            tabs={coreContentTabs}
            hideTabs={isAdding}
            action={!isAdding && (
                <div className="flex w-full gap-2 sm:w-auto">
                    <AdminButton
                        variant="secondary"
                        onClick={() => toggleUpcomingSectionVisibility(siteSettings?.showUpcomingEvents)}
                        className="flex-1 sm:flex-none"
                        title="Show or hide the events section on the website"
                    >
                        {siteSettings?.showUpcomingEvents ? <Eye size={14} /> : <EyeOff size={14} />}
                        {siteSettings?.showUpcomingEvents ? 'On website' : 'Hidden on website'}
                    </AdminButton>
                    <AdminButton variant="primary" onClick={startNew} className="flex-1 sm:flex-none"><Plus size={14} /> New event</AdminButton>
                </div>
            )}
        >
            {isAdding ? editor : (
                <div className="space-y-5">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <SegmentedTabs value={eventFilter} onChange={setEventFilter} items={[
                                    { value: 'upcoming', label: 'Upcoming', count: ownEvents.filter(e => !isPastEvent(e)).length },
                                    { value: 'past', label: 'Past', count: ownEvents.filter(e => isPastEvent(e)).length },
                                    { value: 'all', label: 'All', count: ownEvents.length },
                                ]} />
                                <p className="text-[12px] text-gray-500">
                                    {ownEvents.filter(e => e.isTicketed).length} ticketed · {ownEvents.filter(e => e.isGuestlistEnabled).length} with guestlist
                                    {salesElsewhere > 0 && <> · <Link to="/admin/ticketing" className="font-semibold text-gray-700 underline underline-offset-2 dark:text-zinc-300">{salesElsewhere} in Ticket sales</Link></>}
                                </p>
                            </div>

                            {filteredEvents.length === 0 ? (
                                <PanelCard className="flex flex-col items-center gap-4 rounded-2xl px-6 py-16 text-center">
                                    <Calendar size={28} className="text-gray-400" />
                                    <div>
                                        <p className="text-base font-extrabold">{upcomingEvents.length ? 'No events here' : 'No events yet'}</p>
                                        <p className="mt-1 text-[13px] text-gray-500">{upcomingEvents.length ? 'Try another filter.' : 'Add one and it appears on the website.'}</p>
                                    </div>
                                    <AdminButton variant="primary" onClick={startNew} className="h-11 px-6">
                                        <Plus size={15} /> Add event
                                    </AdminButton>
                                </PanelCard>
                            ) : (
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                                    {filteredEvents.map((item) => {
                                        const originalIndex = upcomingEvents.findIndex(e => e.id === item.id);
                                        const availability = item.isTicketed ? computeAvailability(item, ordersByEvent[item.id] || []) : null;
                                        const pendingOrders = (ordersByEvent[item.id] || []).filter(o => o.status === 'pending').length;
                                        const image = item.hubImage || item.image;
                                        const past = isPastEvent(item);
                                        return (
                                            <PanelCard key={item.id} className="flex flex-col overflow-hidden rounded-2xl">
                                                <button type="button" onClick={() => handleEdit(item)} className="relative block aspect-video w-full overflow-hidden bg-black/5 text-left dark:bg-white/5" aria-label={`Edit ${item.title}`}>
                                                    {image ? (
                                                        <div
                                                            className="absolute inset-0 bg-cover"
                                                            style={{
                                                                backgroundImage: `url(${image})`,
                                                                transform: `scale(${item.hubImage ? (item.hubImageTransform?.scale || 1) : (item.imageTransform?.scale || 1)})`,
                                                                backgroundPosition: item.hubImage
                                                                    ? `calc(50% + ${(item.hubImageTransform?.x || 0)}%) calc(50% + ${(item.hubImageTransform?.y || 0)}%)`
                                                                    : `calc(50% + ${(item.imageTransform?.x || 0)}%) calc(50% + ${(item.imageTransform?.y || 0)}%)`
                                                            }}
                                                        />
                                                    ) : (
                                                        <Calendar size={28} className="absolute inset-0 m-auto text-gray-400" />
                                                    )}
                                                    <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
                                                        {item.isPinned && <Badge tone="blue" className="bg-white/90 dark:bg-black/70"><Pin size={10} /> Pinned</Badge>}
                                                        {past && <Badge tone="gray" className="bg-white/90 dark:bg-black/70">Past</Badge>}
                                                    </div>
                                                </button>

                                                <div className="flex flex-1 flex-col gap-3 p-4">
                                                    <div className="min-w-0">
                                                        <p className="line-clamp-2 text-[16px] font-extrabold leading-snug">{item.title || 'Untitled event'}</p>
                                                        <p className="mt-1 flex items-center gap-1.5 text-[12px] text-gray-500"><Clock size={12} className="shrink-0" />{formatListDate(item.date)}</p>
                                                        {item.location && <p className="mt-0.5 flex items-center gap-1.5 truncate text-[12px] text-gray-500"><MapPin size={12} className="shrink-0" /><span className="truncate">{item.location}</span></p>}
                                                    </div>

                                                    <div className="flex flex-wrap gap-1.5">
                                                        {availability && (
                                                            <Badge tone={availability.total.remaining === 0 ? 'red' : 'green'}>
                                                                <Ticket size={10} />
                                                                {availability.total.remaining === 0 ? 'Sold out' : `${availability.total.sold}${availability.total.capacity ? ` / ${availability.total.capacity}` : ''} sold`}
                                                            </Badge>
                                                        )}
                                                        {pendingOrders > 0 && <Badge tone="amber">{pendingOrders} to verify</Badge>}
                                                        {item.isGuestlistEnabled && <Badge tone="violet"><Users size={10} /> {item.guestlistMode === 'rsvp' ? 'RSVP' : 'Guestlist'}</Badge>}
                                                        {item.hasGuestlistTask && <Badge tone="violet"><FileUp size={10} /> Task</Badge>}
                                                    </div>

                                                    <div className="mt-auto flex items-center gap-2 pt-1">
                                                        <AdminButton variant="accent" onClick={() => handleEdit(item)} className="h-10 flex-1">
                                                            <Edit size={14} /> Edit
                                                        </AdminButton>
                                                        {(item.isTicketed || item.isGuestlistEnabled) && (
                                                            <Link to={`/admin/ticketing?eventId=${encodeURIComponent(item.id)}`} className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border border-black/10 text-[12px] font-bold dark:border-white/10">
                                                                <Ticket size={14} /> Sales
                                                            </Link>
                                                        )}
                                                        <button
                                                            type="button"
                                                            onClick={() => togglePinUpcomingEvent(item.id)}
                                                            aria-label={item.isPinned ? 'Unpin from website' : 'Pin to website'}
                                                            title={item.isPinned ? 'Unpin from website' : 'Pin to website'}
                                                            className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-black/10 dark:border-white/10', item.isPinned ? 'text-sky-600 dark:text-neon-blue' : 'text-gray-500')}
                                                        >
                                                            <Pin size={15} className={item.isPinned ? 'fill-current' : ''} />
                                                        </button>
                                                        <Menu trigger={({ toggle }) => (
                                                            <button type="button" onClick={toggle} aria-label="More actions" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-black/10 text-gray-500 dark:border-white/10">
                                                                <MoreHorizontal size={16} />
                                                            </button>
                                                        )}>
                                                            {eventFilter === 'upcoming' && originalIndex > 0 && <MenuItem icon={ChevronUp} onClick={() => moveItem(originalIndex, 'up')}>Move up</MenuItem>}
                                                            {eventFilter === 'upcoming' && originalIndex < upcomingEvents.length - 1 && <MenuItem icon={ChevronDown} onClick={() => moveItem(originalIndex, 'down')}>Move down</MenuItem>}
                                                            <MenuItem icon={Copy} onClick={() => handleDuplicate(item)}>Duplicate</MenuItem>
                                                            <MenuItem icon={Mail} hint="Opens the mailing composer" onClick={() => {
                                                                const params = new URLSearchParams({ subject: `UPDATE: ${item.title}`, header: item.title || '', body: item.description || '', heroImage: item.image || '', ctaText: 'See Details', ctaUrl: `${window.location.origin}/concertzone` });
                                                                window.location.href = `/admin/mailing?${params.toString()}`;
                                                            }}>Email subscribers</MenuItem>
                                                            <MenuItem icon={Sparkles} hint="In-app and push to everyone" onClick={async () => {
                                                                if (!window.confirm(`Send the new-event notification for "${item.title}" to everyone again?`)) return;
                                                                try {
                                                                    await notifyAllUsers(`New event: ${item.title}`, `Join us on ${item.date} at ${item.location}.`, '/events', item.image);
                                                                    useStore.getState().addToast('Notification sent.', 'success');
                                                                } catch {
                                                                    useStore.getState().addToast("Please try again.", 'error', { title: 'Notification not sent' });
                                                                }
                                                            }}>Resend notification</MenuItem>
                                                            <MenuItem icon={Trash2} danger onClick={() => handleDelete(item)}>Delete</MenuItem>
                                                        </Menu>
                                                    </div>
                                                </div>
                                            </PanelCard>
                                        );
                                    })}
                                </div>
                            )}
                </div>
            )}
        </AdminCommunityHubLayout>
    );
};

export default UpcomingEventsManager;
