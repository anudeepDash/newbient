import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    X, Calendar, MapPin, Users, ArrowRight, Share2, 
    Ticket, ExternalLink, Megaphone, ClipboardList, Info, 
    ChevronRight, Zap, Star, Play, ChevronDown
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useStore } from '../../lib/store';
import CommunityCard from './CommunityCard';
import EventTicketingModal from '../tickets/EventTicketingModal';

const EventHubModal = ({ event, isOpen, onClose }) => {
    const getVideoEmbedUrl = (url) => {
        if (!url) return null;
        if (url.includes('youtube.com/watch?v=')) {
            const id = url.split('v=')[1]?.split('&')[0];
            return `https://www.youtube.com/embed/${id}?autoplay=1&mute=1`;
        }
        if (url.includes('youtu.be/')) {
            const id = url.split('/').pop();
            return `https://www.youtube.com/embed/${id}?autoplay=1&mute=1`;
        }
        if (url.includes('vimeo.com/')) {
            const id = url.split('/').pop();
            return `https://player.vimeo.com/video/${id}?autoplay=1&muted=1`;
        }
        if (url.includes('instagram.com/')) {
            const base = url.split('?')[0];
            return `${base}${base.endsWith('/') ? '' : '/'}embed/`;
        }
        return url;
    };

    const { 
        volunteerGigs, campaigns, forms, 
        maintenanceState, user, setAuthModal 
    } = useStore();
    
    const [activeView, setActiveView] = useState('hub'); // hub, ticketing
    const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
    const [showVenueMap, setShowVenueMap] = useState(false);
    
    // Reset view when modal opens
    useEffect(() => {
        if (isOpen) {
            setActiveView('hub');
            setIsDescriptionExpanded(false);
            setShowVenueMap(false);
        }
    }, [isOpen]);

    if (!isOpen || !event) return null;

    // Resolve Hub Connections
    const volunteerGig = volunteerGigs.find(g => g.id === event.relatedVolunteerGigId);
    const campaign = campaigns.find(c => c.id === event.relatedCampaignId);
    const artistForm = forms.find(f => f.id === event.relatedArtistFormId);

    const hasInternalOps = event.isTicketed || event.isGuestlistEnabled;
    const hasExternalLinks = event.externalTicketingLinks && event.externalTicketingLinks.length > 0;
    
    const handleInternalAction = () => {
        if (event.isTicketed && maintenanceState.features?.tickets) {
            useStore.getState().addToast("Ticketing is currently paused for maintenance.", 'error');
            return;
        }
        if (event.isGuestlistEnabled && !event.isTicketed && !user) {
            setAuthModal(true);
            return;
        }
        setActiveView('ticketing');
    };

    const handleShare = () => {
        const url = `${window.location.origin}/?event=${event.id}`;
        navigator.clipboard.writeText(url);
        useStore.getState().addToast("Event link copied to clipboard!", 'success');
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-0 md:p-6 overflow-hidden">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/75 backdrop-blur-md transition-all"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className={cn(
                            "relative w-full max-w-4xl bg-[#020202]/60 backdrop-blur-3xl border border-white/10 shadow-[0_30px_70px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col h-full md:h-auto md:max-h-[92vh] md:rounded-3xl z-10 transition-all duration-300",
                            activeView === 'ticketing' && "max-w-3xl"
                        )}
                    >
                        <AnimatePresence mode="wait">
                            {activeView === 'hub' ? (
                                <motion.div 
                                    key="hub"
                                    initial={{ opacity: 0, y: 15 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -15 }}
                                    className="flex flex-col w-full flex-1 min-h-0 overflow-y-auto scrollbar-hide"
                                >
                                    {/* Top Cinematic Header Banner */}
                                    <div className="relative w-full overflow-hidden border-b border-white/5 shrink-0">
                                        <img 
                                            src={event.hubImage || event.image} 
                                            alt={event.title} 
                                            className="w-full h-auto block" 
                                            style={{
                                                transform: `scale(${event.hubImageTransform?.scale || event.imageTransform?.scale || 1})`,
                                                objectPosition: `${50 + (event.hubImageTransform?.x || event.imageTransform?.x || 0)}% ${50 + (event.hubImageTransform?.y || event.imageTransform?.y || 0)}%`
                                            }}
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-[#020202] via-[#020202]/45 to-transparent" />
                                        
                                        {/* Cinematic Title overlay */}
                                        <div className="absolute bottom-6 left-6 right-6 text-left flex flex-col justify-end">
                                            <h2 className="text-2xl md:text-4xl font-extrabold font-heading text-white tracking-tight leading-tight">
                                                {event.title}
                                            </h2>
                                        </div>

                                        {/* Close Button on Banner */}
                                        <button 
                                            onClick={onClose} 
                                            className="absolute top-6 right-6 w-10 h-10 rounded-xl bg-black/60 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all z-50 group"
                                        >
                                            <X size={20} className="group-hover:rotate-90 transition-transform duration-300" />
                                        </button>
                                    </div>

                                    {/* Unified Scrolling content */}
                                    <div className="flex-1 p-6 md:p-8 space-y-8 text-left pb-28 md:pb-8">
                                        {/* Meta Row: Date, Location, Share button */}
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/5">
                                            <div className="flex flex-wrap gap-6 items-center">
                                                <div className="flex items-center gap-2.5 text-zinc-400 text-xs font-semibold tracking-wider uppercase">
                                                    <Calendar size={14} className="text-neon-green shrink-0" /> 
                                                    <span>
                                                        {event.date ? new Date(event.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : 'TBA'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2.5 text-zinc-400 text-xs font-semibold tracking-wider uppercase">
                                                    <MapPin size={14} className="text-neon-green shrink-0" /> 
                                                    <span>{event.location || 'VENUE TBA'}</span>
                                                </div>
                                                {/* Bouncing Scroll Cue beside Location */}
                                                <div className="flex items-center gap-1.5 text-neon-green text-[9px] font-black uppercase tracking-[0.2em] animate-bounce select-none">
                                                    <ChevronDown size={12} className="shrink-0" />
                                                    <span>Scroll</span>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={handleShare}
                                                className="h-10 px-4 rounded-xl bg-white/5 border border-white/10 text-white font-black uppercase tracking-widest text-[9px] hover:bg-white hover:text-black hover:border-white transition-all flex items-center justify-center gap-2 shrink-0 select-none"
                                            >
                                                <Share2 size={12} className="text-neon-green" />
                                                <span>Share Event</span>
                                            </button>
                                        </div>

                                        {/* Grid Details */}
                                        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
                                            {/* Left details pane */}
                                            <div className="md:col-span-7 space-y-8">
                                                {/* Description */}
                                                <div className="space-y-3">
                                                    <div className="flex items-center gap-3 text-zinc-500">
                                                        <div className="w-6 h-[1px] bg-current" />
                                                        <span className="text-[9px] font-bold uppercase tracking-[0.3em]">Event Details</span>
                                                    </div>
                                                    <div className={cn(
                                                        "text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap font-medium border-l-2 border-neon-green/40 pl-5 transition-all duration-500",
                                                        !isDescriptionExpanded && "line-clamp-6"
                                                    )}>
                                                        {event.description || "No detailed briefing provided for this event. Standard parameters apply."}
                                                    </div>
                                                    {event.description && event.description.length > 200 && (
                                                        <button 
                                                            onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)} 
                                                            className="text-[10px] font-bold uppercase tracking-[0.2em] text-neon-green hover:text-white pl-5 transition-colors"
                                                        >
                                                            {isDescriptionExpanded ? "Show Less" : "Read More"}
                                                        </button>
                                                    )}
                                                </div>

                                                {/* Video Highlight */}
                                                {event.videoUrl && (
                                                    <div className="space-y-4">
                                                        <div className="flex items-center gap-3 text-zinc-500">
                                                            <div className="w-6 h-[1px] bg-current" />
                                                            <span className="text-[9px] font-bold uppercase tracking-[0.3em]">Video Highlight</span>
                                                        </div>
                                                        <div className="aspect-video rounded-2xl overflow-hidden bg-black/60 border border-white/5 shadow-2xl relative group">
                                                            {(event.videoUrl.match(/\.(mp4|webm|ogg)$/i) || event.videoUrl.includes('cloudinary.com')) ? (
                                                                <video src={event.videoUrl} controls autoPlay muted className="w-full h-full object-cover" poster={event.image} />
                                                            ) : (
                                                                <iframe src={getVideoEmbedUrl(event.videoUrl)} className="w-full h-full border-none" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Artist Lineup */}
                                                {event.artists && event.artists.length > 0 && (
                                                    <div className="space-y-4">
                                                        <div className="flex items-center gap-3 text-zinc-500">
                                                            <div className="w-6 h-[1px] bg-current" />
                                                            <span className="text-[9px] font-bold uppercase tracking-[0.3em]">Artist Lineup</span>
                                                        </div>
                                                        <div className="flex flex-wrap gap-2">
                                                            {event.artists.map((artist, idx) => (
                                                                <div key={idx} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2 group/artist hover:border-neon-green/30 transition-colors">
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-neon-green" />
                                                                    <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-300 group-hover/artist:text-white transition-colors">{artist}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Right ticketing & opportunities panel */}
                                            <div className="md:col-span-5 space-y-6">
                                                {/* Inline RSVP / Booking Card - PC Only */}
                                                {(hasInternalOps || hasExternalLinks) && (
                                                    <div className="hidden md:block p-6 bg-white/[0.02] border border-white/10 rounded-2xl space-y-4">
                                                        <div className="text-left">
                                                            <p className="text-[8px] font-black text-neon-green uppercase tracking-widest mb-1">
                                                                {event.isTicketed ? "Tickets Available" : (event.isGuestlistEnabled ? "Guestlist Open" : "External Booking")}
                                                            </p>
                                                            <p className="text-sm font-bold text-white leading-tight">{event.title}</p>
                                                        </div>
                                                        {hasInternalOps ? (
                                                            <button 
                                                                onClick={handleInternalAction}
                                                                className="w-full h-12 rounded-xl bg-white text-black font-black uppercase tracking-[0.15em] text-xs flex items-center justify-center gap-2 hover:bg-neon-green active:scale-95 transition-all shadow-lg shrink-0"
                                                            >
                                                                <Ticket size={16} />
                                                                <span>{event.isTicketed ? "Book Tickets" : "Register / RSVP"}</span>
                                                            </button>
                                                        ) : (
                                                            <a 
                                                                href={event.externalTicketingLinks[0]?.url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="w-full h-12 rounded-xl bg-white text-black font-black uppercase tracking-[0.15em] text-xs flex items-center justify-center gap-2 hover:bg-neon-green active:scale-95 transition-all shadow-lg shrink-0"
                                                            >
                                                                <ExternalLink size={16} />
                                                                <span>{event.externalTicketingLinks[0]?.platform || "Book Now"}</span>
                                                            </a>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Opportunities */}
                                                {(volunteerGig || campaign || artistForm) && (
                                                    <div className="space-y-4">
                                                        <div className="flex items-center gap-3 text-zinc-500">
                                                            <div className="w-6 h-[1px] bg-current" />
                                                            <span className="text-[9px] font-bold uppercase tracking-[0.3em]">Opportunities</span>
                                                        </div>
                                                        <div className="space-y-3">
                                                            {volunteerGig && (
                                                                <a href="/volunteer" className="p-4 rounded-xl bg-white/[0.01] border border-white/10 hover:bg-neon-green/5 hover:border-neon-green/20 transition-all group flex items-center justify-between">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="w-8 h-8 rounded-lg bg-neon-green/10 flex items-center justify-center text-neon-green"><Users size={14} /></div>
                                                                        <div className="text-left">
                                                                            <p className="text-[7px] font-bold text-neon-green uppercase tracking-wider">Volunteer</p>
                                                                            <p className="text-[10px] font-bold text-white uppercase truncate max-w-[160px]">{volunteerGig.title}</p>
                                                                        </div>
                                                                    </div>
                                                                    <ChevronRight size={14} className="text-zinc-600 group-hover:text-neon-green transition-all group-hover:translate-x-1" />
                                                                </a>
                                                            )}
                                                            {campaign && (
                                                                <a href="/creator" className="p-4 rounded-xl bg-white/[0.01] border border-white/10 hover:bg-neon-green/5 hover:border-neon-green/20 transition-all group flex items-center justify-between">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="w-8 h-8 rounded-lg bg-neon-green/10 flex items-center justify-center text-neon-green"><Megaphone size={14} /></div>
                                                                        <div className="text-left">
                                                                            <p className="text-[7px] font-bold text-neon-green uppercase tracking-wider">Creator Campaign</p>
                                                                            <p className="text-[10px] font-bold text-white uppercase truncate max-w-[160px]">{campaign.title}</p>
                                                                        </div>
                                                                    </div>
                                                                    <ChevronRight size={14} className="text-zinc-600 group-hover:text-neon-green transition-all group-hover:translate-x-1" />
                                                                </a>
                                                            )}
                                                            {artistForm && (
                                                                <a href="/artist-ant" className="p-4 rounded-xl bg-white/[0.01] border border-white/10 hover:bg-neon-green/5 hover:border-neon-green/20 transition-all group flex items-center justify-between">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="w-8 h-8 rounded-lg bg-neon-green/10 flex items-center justify-center text-neon-green"><Zap size={14} /></div>
                                                                        <div className="text-left">
                                                                            <p className="text-[7px] font-bold text-neon-green uppercase tracking-wider">Artist Form</p>
                                                                            <p className="text-[10px] font-bold text-white uppercase truncate max-w-[160px]">{artistForm.title}</p>
                                                                        </div>
                                                                    </div>
                                                                    <ChevronRight size={14} className="text-zinc-600 group-hover:text-neon-green transition-all group-hover:translate-x-1" />
                                                                </a>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Sticky Bottom Bar for mobile only */}
                                    {(hasInternalOps || hasExternalLinks) && (
                                        <div className="sticky bottom-0 left-0 right-0 p-4 sm:p-6 bg-zinc-950/90 border-t border-white/10 backdrop-blur-3xl z-40 flex items-center justify-between gap-4 shrink-0 shadow-[0_-10px_30px_rgba(0,0,0,0.8)] md:hidden">
                                            <div className="text-left min-w-0">
                                                <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mb-0.5">
                                                    {event.isTicketed ? "Tickets Available" : (event.isGuestlistEnabled ? "Guestlist Open" : "External Booking")}
                                                </p>
                                                <p className="text-xs sm:text-sm font-bold text-white truncate">{event.title}</p>
                                            </div>
                                            {hasInternalOps ? (
                                                <button 
                                                    onClick={handleInternalAction}
                                                    className="h-11 sm:h-12 px-5 sm:px-8 rounded-xl bg-white text-black font-black uppercase tracking-[0.15em] text-[9px] sm:text-xs flex items-center justify-center gap-2 hover:bg-neon-green active:scale-95 transition-all shadow-lg shrink-0 animate-pulse hover:animate-none"
                                                >
                                                    <Ticket size={14} />
                                                    <span>{event.isTicketed ? "Book Tickets" : "Register / RSVP"}</span>
                                                </button>
                                            ) : (
                                                <a 
                                                    href={event.externalTicketingLinks[0]?.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="h-11 sm:h-12 px-5 sm:px-8 rounded-xl bg-white text-black font-black uppercase tracking-[0.15em] text-[9px] sm:text-xs flex items-center justify-center gap-2 hover:bg-neon-green active:scale-95 transition-all shadow-lg shrink-0"
                                                >
                                                    <ExternalLink size={14} />
                                                    <span>{event.externalTicketingLinks[0]?.platform || "Book Now"}</span>
                                                </a>
                                            )}
                                        </div>
                                    )}

                                    {/* Footer */}
                                    <div className="p-4 border-t border-white/5 bg-[#020202]/40 flex items-center justify-center shrink-0">
                                        <span className="text-[8px] font-bold text-zinc-600 tracking-[0.5em] uppercase">NEWBI ENT.</span>
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div key="ticketing" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="w-full flex-1 min-h-0 relative">
                                    <EventTicketingModal event={event} isOpen={activeView === 'ticketing'} onClose={() => setActiveView('hub')} isEmbedded={true} />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default EventHubModal;
