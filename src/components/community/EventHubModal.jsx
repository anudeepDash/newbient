import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    X, Calendar, MapPin, Users, ArrowRight, Share2, 
    Ticket, Sparkles, ExternalLink, Megaphone, ClipboardList, Info, 
    ChevronRight, Zap, Star, Play
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
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 md:p-6 overflow-hidden">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/90 backdrop-blur-3xl transition-all"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className={cn(
                            "relative w-full max-w-7xl bg-zinc-950 border border-white/10 shadow-[0_50px_100px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col md:flex-row h-[90vh] md:h-[700px] rounded-[3rem]",
                            activeView === 'ticketing' && "max-w-4xl"
                        )}
                    >
                        <AnimatePresence mode="wait">
                            {activeView === 'hub' ? (
                                <motion.div 
                                    key="hub"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="flex flex-col md:flex-row w-full h-full"
                                >
                                    {/* Left: Action Sidebar */}
                                    <div className="w-full md:w-[500px] bg-black border-b md:border-b-0 md:border-r border-white/10 shrink-0 relative flex flex-col h-full overflow-hidden">
                                        <div className="relative z-10 flex-1 overflow-y-auto scrollbar-hide flex flex-col">
                                            {/* Event Hub Banner - Full Bleed 16:9 */}
                                            <div className="w-full aspect-video overflow-hidden border-b border-white/10 relative group shrink-0">
                                                <img 
                                                    src={event.hubImage || event.image} 
                                                    alt={event.title} 
                                                    className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" 
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                                            </div>

                                            <div className="flex-1 p-8 md:p-10 flex flex-col gap-10">
                                                <div className="space-y-4 pb-4 mt-auto">
                                                {hasInternalOps && (
                                                    <button 
                                                        onClick={handleInternalAction}
                                                        className="w-full h-20 px-10 rounded-[1.5rem] bg-neon-blue/10 border-2 border-neon-blue text-neon-blue font-black uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-6 hover:bg-neon-blue hover:text-black transition-all shadow-[0_0_40px_rgba(46,191,255,0.4)] relative overflow-hidden group backdrop-blur-xl"
                                                    >
                                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_2s_infinite] pointer-events-none" />
                                                        <Ticket size={24} className="group-hover:rotate-12 transition-transform shrink-0" />
                                                        <span className="truncate flex-1 text-center">
                                                            {event.isTicketed ? "BOOK TICKETS" : "RSVP NOW"}
                                                        </span>
                                                        <ArrowRight size={20} className="shrink-0 group-hover:translate-x-2 transition-transform" />
                                                    </button>
                                                )}

                                                <div className="grid grid-cols-1 gap-4">
                                                    <button 
                                                        onClick={handleShare}
                                                        className="h-16 rounded-[1.25rem] bg-white/5 border border-white/10 text-white font-black uppercase tracking-[0.15em] text-[9px] flex items-center justify-center gap-3 hover:bg-white/10 transition-all backdrop-blur-xl group"
                                                    >
                                                        <Share2 size={14} className="text-neon-green" />
                                                        SHARE PROTOCOL
                                                    </button>
                                                </div>

                                                {hasExternalLinks && event.externalTicketingLinks.map((link, idx) => (
                                                    <a 
                                                        key={idx}
                                                        href={link.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="w-full h-16 rounded-[1.25rem] bg-white/5 border border-white/10 text-white font-black uppercase tracking-[0.15em] text-[9px] flex items-center justify-center gap-4 hover:bg-white/10 transition-all backdrop-blur-xl group"
                                                    >
                                                        <ExternalLink size={14} className="text-gray-400 group-hover:text-white transition-colors" />
                                                        GET ON {link.platform || 'EXTERNAL'}
                                                    </a>
                                                ))}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {/* Mobile Close */}
                                        <button onClick={onClose} className="md:hidden absolute top-6 right-6 w-10 h-10 rounded-full bg-black/50 border border-white/10 flex items-center justify-center text-white/50 z-50">
                                            <X size={20} />
                                        </button>
                                    </div>

                                    {/* Right: Hub Content */}
                                    <div className="flex-1 flex flex-col bg-zinc-950 relative overflow-hidden">
                                        <button onClick={onClose} className="hidden md:flex absolute top-8 right-8 w-12 h-12 rounded-full bg-white/5 border border-white/10 items-center justify-center text-gray-500 hover:text-white transition-all hover:bg-white/10 z-50 group">
                                            <X size={24} className="group-hover:rotate-90 transition-transform duration-500" />
                                        </button>

                                        <div className="flex-1 overflow-y-auto p-8 md:p-12 scrollbar-hide space-y-12">
                                            {/* Video Highlight - TOP PRIORITY */}
                                            {event.videoUrl && (
                                                <div className="space-y-6">
                                                    <div className="flex items-center gap-4 text-neon-pink">
                                                        <div className="w-10 h-[1px] bg-current" />
                                                        <span className="text-[10px] font-black uppercase tracking-[0.5em]">VIDEO HIGHLIGHT</span>
                                                    </div>
                                                    <div className="aspect-video rounded-[2.5rem] overflow-hidden bg-black border border-white/10 shadow-2xl relative group">
                                                        {(event.videoUrl.match(/\.(mp4|webm|ogg)$/i) || event.videoUrl.includes('cloudinary.com')) ? (
                                                            <video 
                                                                src={event.videoUrl} 
                                                                controls 
                                                                autoPlay
                                                                muted
                                                                className="w-full h-full object-cover"
                                                                poster={event.image}
                                                            />
                                                        ) : (
                                                            <iframe 
                                                                src={getVideoEmbedUrl(event.videoUrl)} 
                                                                className="w-full h-full border-none"
                                                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                                                allowFullScreen
                                                                title="Event Highlight"
                                                            />
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Description - PRIMARY CONTEXT */}
                                            <div className="space-y-4">
                                                <div className={cn(
                                                    "text-gray-400 text-sm leading-relaxed whitespace-pre-wrap italic font-medium border-l-2 border-white/10 pl-6 transition-all duration-500",
                                                    !isDescriptionExpanded && "line-clamp-3"
                                                )}>
                                                    {event.description || "No detailed briefing provided for this protocol. Standard event parameters apply."}
                                                </div>
                                                {event.description && event.description.length > 150 && (
                                                    <button 
                                                        onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                                                        className="text-[9px] font-black uppercase tracking-[0.2em] text-neon-blue/60 hover:text-neon-blue pl-6 transition-colors"
                                                    >
                                                        {isDescriptionExpanded ? "Show Less" : "Read More"}
                                                    </button>
                                                )}
                                            </div>

                                            {/* Header - TITLE & LOGISTICS */}
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-4 text-neon-blue">
                                                    <div className="w-10 h-[1px] bg-current" />
                                                    <span className="text-[10px] font-black uppercase tracking-[0.5em]">EVENT HUB</span>
                                                </div>
                                                <h2 className="text-4xl md:text-6xl font-black font-heading text-white italic uppercase tracking-tighter leading-[0.9]">
                                                    {event.title}
                                                </h2>
                                                <div className="flex flex-wrap gap-4 pt-2">
                                                    <div className="flex items-center gap-2 text-gray-500 text-[10px] font-black uppercase tracking-widest">
                                                        <Calendar size={14} className="text-neon-green" /> 
                                                        {event.date ? new Date(event.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : 'TBA'}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-gray-500 text-[10px] font-black uppercase tracking-widest">
                                                        <MapPin size={14} className="text-neon-pink" /> 
                                                        {event.location || 'VENUE TBA'}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Artist Lineup */}
                                            {event.artists && event.artists.length > 0 && (
                                                <div className="flex flex-wrap gap-2">
                                                    {event.artists.map((artist, idx) => (
                                                        <div key={idx} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2 group/artist hover:border-neon-blue/40 transition-colors">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-neon-blue group-hover/artist:animate-ping" />
                                                            <span className="text-[10px] font-black uppercase tracking-widest text-white/70 group-hover/artist:text-white transition-colors">{artist}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}



                                            {/* Related Opportunities Hub */}
                                            {(volunteerGig || campaign || artistForm) && (
                                                <div className="space-y-6 pt-8 border-t border-white/5">
                                                    <div className="flex items-center gap-4 text-white/20">
                                                        <div className="w-10 h-[1px] bg-current" />
                                                        <span className="text-[10px] font-black uppercase tracking-[0.5em]">RELATED OPPORTUNITIES</span>
                                                    </div>
                                                    
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        {volunteerGig && (
                                                            <a href="/volunteer" className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 hover:bg-neon-green/5 hover:border-neon-green/20 transition-all group">
                                                                <div className="flex items-center justify-between mb-4">
                                                                    <div className="w-10 h-10 rounded-xl bg-neon-green/10 flex items-center justify-center text-neon-green">
                                                                        <Users size={20} />
                                                                    </div>
                                                                    <ChevronRight size={16} className="text-gray-600 group-hover:text-neon-green transition-all group-hover:translate-x-1" />
                                                                </div>
                                                                <p className="text-[8px] font-black text-neon-green uppercase tracking-widest mb-1">VOLUNTEER GIG</p>
                                                                <p className="text-[11px] font-black text-white uppercase italic">{volunteerGig.title}</p>
                                                            </a>
                                                        )}

                                                        {campaign && (
                                                            <a href="/creator" className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 hover:bg-neon-pink/5 hover:border-neon-pink/20 transition-all group">
                                                                <div className="flex items-center justify-between mb-4">
                                                                    <div className="w-10 h-10 rounded-xl bg-neon-pink/10 flex items-center justify-center text-neon-pink">
                                                                        <Megaphone size={20} />
                                                                    </div>
                                                                    <ChevronRight size={16} className="text-gray-600 group-hover:text-neon-pink transition-all group-hover:translate-x-1" />
                                                                </div>
                                                                <p className="text-[8px] font-black text-neon-pink uppercase tracking-widest mb-1">CREATOR MISSION</p>
                                                                <p className="text-[11px] font-black text-white uppercase italic">{campaign.title}</p>
                                                            </a>
                                                        )}

                                                        {artistForm && (
                                                            <a href="/artist-ant" className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 hover:bg-neon-blue/5 hover:border-neon-blue/20 transition-all group">
                                                                <div className="flex items-center justify-between mb-4">
                                                                    <div className="w-10 h-10 rounded-xl bg-neon-blue/10 flex items-center justify-center text-neon-blue">
                                                                        <Zap size={20} />
                                                                    </div>
                                                                    <ChevronRight size={16} className="text-gray-600 group-hover:text-neon-blue transition-all group-hover:translate-x-1" />
                                                                </div>
                                                                <p className="text-[8px] font-black text-neon-blue uppercase tracking-widest mb-1">ARTIST REGISTRATION</p>
                                                                <p className="text-[11px] font-black text-white uppercase italic">{artistForm.title}</p>
                                                            </a>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Footer branding */}
                                        <div className="p-8 border-t border-white/5 bg-black/20 flex items-center justify-center">
                                            <span className="text-[8px] font-black text-white/10 uppercase tracking-[0.5em] italic">NEWBI ENT.</span>
                                        </div>
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div 
                                    key="ticketing"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    className="w-full h-full relative"
                                >
                                    <button 
                                        onClick={() => setActiveView('hub')}
                                        className="absolute top-8 left-8 z-[200] flex items-center gap-2 text-[10px] font-black text-white/50 hover:text-white uppercase tracking-widest transition-all group"
                                    >
                                        <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-neon-blue group-hover:text-black transition-all">
                                            <ArrowRight className="rotate-180" size={14} />
                                        </div>
                                        Back to Hub
                                    </button>
                                    <EventTicketingModal 
                                        event={event} 
                                        isOpen={activeView === 'ticketing'} 
                                        onClose={() => setActiveView('hub')} 
                                        isEmbedded={true}
                                    />
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
