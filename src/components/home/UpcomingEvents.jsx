import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';
import { useStore } from '../../lib/store';
import { Calendar, MapPin, ArrowRight, Share2, Ticket, ChevronLeft, ChevronRight, Plus, Gift } from 'lucide-react';
import { Link } from 'react-router-dom';
import html2canvas from 'html2canvas';
import EventTicketingModal from '../tickets/EventTicketingModal';

const UpcomingEvents = () => {
    const { upcomingEvents, siteSettings, maintenanceState, giveaways, user, setAuthModal } = useStore();
    const carouselRef = useRef();
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const scroll = (direction) => {
        if (carouselRef.current) {
            const scrollAmount = direction === 'left' ? -400 : 400;
            carouselRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        }
    };

    const [isAutoScrolling, setIsAutoScrolling] = useState(true);

    useEffect(() => {
        if (!isAutoScrolling || upcomingEvents.length <= 1) return;
        const interval = setInterval(() => {
            if (carouselRef.current) {
                const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
                if (scrollLeft + clientWidth >= scrollWidth - 10) {
                    carouselRef.current.scrollTo({ left: 0, behavior: 'smooth' });
                } else {
                    carouselRef.current.scrollBy({ left: 400, behavior: 'smooth' });
                }
            }
        }, 4000);
        return () => clearInterval(interval);
    }, [isAutoScrolling, upcomingEvents.length]);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const eventId = params.get('event');
        const shouldBuy = params.get('buy') === 'true';

        if (eventId && upcomingEvents.length > 0) {
            const event = upcomingEvents.find(e => e.id === eventId);
            if (event) {
                // Scroll to card
                const element = document.getElementById(`event-card-${eventId}`);
                if (element) {
                    setTimeout(() => {
                        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }, 800);
                }
                
                // Auto-open modal if 'buy' param is present
                if (shouldBuy && !maintenanceState.features?.tickets) {
                    setTimeout(() => {
                        setSelectedEvent(event);
                        setIsModalOpen(true);
                    }, 1200);
                }
            }
        } else if (upcomingEvents.length > 0 && window.location.hash) {
            const hashId = window.location.hash.slice(1);
            if (hashId.startsWith('event-card-')) {
                const element = document.getElementById(hashId);
                if (element) {
                    setTimeout(() => {
                        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }, 800);
                }
            }
        }
    }, [upcomingEvents, maintenanceState]);

    const handleShare = async (e, event) => {
        e.preventDefault();
        e.stopPropagation();
        const cardElement = document.getElementById(`event-card-${event.id}`);
        if (!cardElement) return;

        try {
            // Temporarily remove truncation and line-clamping for full title capture
            const titleEl = cardElement.querySelector('.event-title');
            if (titleEl) {
                titleEl.classList.remove('truncate', 'line-clamp-2');
                titleEl.style.webkitLineClamp = 'unset';
                titleEl.style.display = 'block';
            }

            const canvas = await html2canvas(cardElement, {
                useCORS: true,
                scale: 3,
                backgroundColor: '#020202',
                logging: false,
                onclone: (clonedDoc) => {
                    // Ensure full visibility in clone
                    const clonedCard = clonedDoc.getElementById(`event-card-${event.id}`);
                    if (clonedCard) {
                        clonedCard.style.height = 'auto';
                        clonedCard.style.overflow = 'visible';
                        const clonedTitle = clonedCard.querySelector('.event-title');
                        if (clonedTitle) {
                            clonedTitle.classList.remove('truncate', 'line-clamp-2');
                            clonedTitle.style.webkitLineClamp = 'unset';
                            clonedTitle.style.display = 'block';
                        }
                    }
                }
            });

            if (titleEl) {
                titleEl.classList.add('line-clamp-2');
                titleEl.style.webkitLineClamp = '';
                titleEl.style.display = '';
            }

            const imageBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png', 1.0));
            const imageFile = new File([imageBlob], `${event.title.replace(/\s+/g, '_')}_event.png`, { type: 'image/png' });
            
            // Shared link defaults to home page with event param
            const eventUrl = `${window.location.origin}/?event=${event.id}`;
            
            const shareData = {
                title: event.title,
                text: `${event.title} - ${event.date ? new Date(event.date).toLocaleDateString() : 'Upcoming Event'}\n\nView event: ${eventUrl}`,
                url: eventUrl,
                files: [imageFile],
            };

            if (navigator.canShare && navigator.canShare({ files: [imageFile] })) {
                await navigator.share(shareData);
            } else {
                const link = document.createElement('a');
                link.href = canvas.toDataURL('image/png');
                link.download = `${event.title.replace(/\s+/g, '_')}_event.png`;
                link.click();
                
                await navigator.clipboard.writeText(eventUrl);
                useStore.getState().addToast("Image downloaded and event link copied to clipboard!", 'success');
            }
        } catch (error) {
            console.error("Share failed:", error);
            const eventUrl = `${window.location.origin}/?event=${event.id}`;
            await navigator.clipboard.writeText(eventUrl);
            useStore.getState().addToast("Link copied to clipboard!", 'success');
        }
    };

    if (!siteSettings?.showUpcomingEvents || upcomingEvents.length === 0) {
        return null;
    }

    return (
        <section
            id="upcoming-events"
            className="relative py-16 md:py-32 scroll-mt-24 bg-[#020202] text-white overflow-hidden border-t border-white/5"
            onMouseEnter={() => setIsAutoScrolling(false)}
            onMouseLeave={() => setIsAutoScrolling(true)}
        >
            {/* Atmosphere */}
            <div className="absolute top-1/2 left-0 w-[400px] h-[400px] bg-neon-blue/5 blur-[120px] rounded-full pointer-events-none" />

            <div className="max-w-7xl mx-auto px-4 relative z-10">
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 md:mb-24 gap-8">
                    <div className="max-w-xl">
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-4"
                        >
                            <span className="text-[10px] font-black uppercase tracking-widest text-neon-blue">Live Energy</span>
                        </motion.div>
                        <motion.h2
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="font-heading text-4xl md:text-6xl font-black tracking-tight italic"
                        >
                            Upcoming <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-blue via-cyan-400 to-neon-green not-italic">Events.</span>
                        </motion.h2>
                    </div>
                </div>

                {/* Carousel Container */}
                <div className="relative group/nav cursor-grab active:cursor-grabbing">
                    {/* Navigation Arrows */}
                    {upcomingEvents.length > 2 && (
                        <div className="hidden lg:block">
                            <button 
                                onClick={() => scroll('left')}
                                className="absolute -left-12 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-neon-blue hover:text-black transition-all z-30 backdrop-blur-md opacity-0 group-hover/nav:opacity-100 -translate-x-4 group-hover/nav:translate-x-0"
                            >
                                <ChevronLeft size={20} />
                            </button>
                            <button 
                                onClick={() => scroll('right')}
                                className="absolute -right-12 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-neon-blue hover:text-black transition-all z-30 backdrop-blur-md opacity-0 group-hover/nav:opacity-100 translate-x-4 group-hover/nav:translate-x-0"
                            >
                                <ChevronRight size={20} />
                            </button>
                        </div>
                    )}

                    <div 
                        ref={carouselRef}
                        className="flex overflow-x-auto gap-4 md:gap-8 pb-12 snap-x horizontal-scrollbar scroll-smooth px-8 md:px-0"
                        style={{ scrollbarWidth: 'auto', msOverflowStyle: 'auto' }}
                    >
                        {upcomingEvents.map((event) => {
                            // First, try to find a giveaway that is explicitly linked to this event
                            let linkedGiveaway = giveaways?.find(g => g.id === event.giveawayId);
                            
                            // Fallback to name matching if no explicit link exists (for older entries)
                            if (!linkedGiveaway) {
                                linkedGiveaway = giveaways?.find(g => 
                                    g.status === 'Open' && 
                                    (g.name.toLowerCase().includes(event.title.toLowerCase()) || 
                                     event.title.toLowerCase().includes(g.name.toLowerCase()))
                                );
                            }
                            
                            const handleCardClick = () => {
                                // Unified Modal for Tickets or Guestlist
                                if (event.isTicketed || event.isGuestlistEnabled) {
                                    if (event.isTicketed && maintenanceState.features?.tickets) {
                                        useStore.getState().addToast("Ticketing is currently paused for maintenance.", 'error');
                                        return;
                                    }
                                    if (event.isGuestlistEnabled && !event.isTicketed && !user) {
                                        setAuthModal(true);
                                        return;
                                    }
                                    setSelectedEvent(event);
                                    setIsModalOpen(true);
                                    return;
                                } 
                                
                                // LINK/GATEWAY FLOW: Fallback for generic links
                                if (event.link || event.gatewayUrl) {
                                    window.open(event.link || event.gatewayUrl, '_blank', 'noreferrer');
                                    return;
                                } 
                                
                                // FINAL FALLBACK: Giveaway or Alert
                                if (linkedGiveaway) {
                                    window.location.href = `/giveaway/${linkedGiveaway.slug}`;
                                } else {
                                    useStore.getState().addToast("No active protocol defined for this event.", 'error');
                                }
                            };

                            return (
                                <div key={event.id} className="w-[320px] md:w-[380px] flex-shrink-0 snap-start">
                                    <div 
                                        onClick={handleCardClick} 
                                        className="block w-full h-full relative cursor-pointer group"
                                    >
                                        <EventTicket event={event} handleShare={handleShare} linkedGiveaway={linkedGiveaway} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <EventTicketingModal
                event={selectedEvent}
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setTimeout(() => setSelectedEvent(null), 300);
                }}
            />
        </section>
    );
};

const EventTicket = ({ event, handleShare, linkedGiveaway }) => {
    const accentColor = event.highlightColor || '#2ebfff';
    const [showAllArtists, setShowAllArtists] = useState(false);
    
    return (
        <div 
            id={`event-card-${event.id}`} 
            className="relative bg-zinc-950 border border-white/10 rounded-[3rem] overflow-hidden aspect-[4/5] transition-all duration-500 hover:border-white/20 group shadow-[0_30px_100px_rgba(0,0,0,0.5)] w-full"
            style={{ 
                '--accent-glow': `${accentColor}33`,
                '--accent-solid': accentColor
            }}
        >
            {/* Background elements */}
            <div className="absolute inset-0 z-0 overflow-hidden bg-black">
                {event.image ? (
                    <img
                        src={event.image}
                        alt=""
                        crossOrigin="anonymous"
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105 opacity-50 group-hover:opacity-70"
                        style={{ 
                            transform: `scale(${event.imageTransform?.scale || 1})`,
                            objectPosition: `${50 + (event.imageTransform?.x || 0)}% ${50 + (event.imageTransform?.y || 0)}%`,
                            transformOrigin: 'center'
                        }}
                    />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-800 font-black uppercase tracking-[0.3em] text-[10px]">
                        SIGNAL_BUFFERING
                    </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent z-10" />
                <div 
                    className="absolute inset-0 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none"
                    style={{ background: `radial-gradient(circle at bottom right, ${accentColor}11 0%, transparent 60%)` }}
                />
            </div>
            
            {/* Top Badges */}
            <div className="absolute top-8 left-8 right-8 z-30 flex justify-between items-start">
                <div className="flex flex-col gap-2">
                    <div className="px-4 py-2 rounded-2xl bg-black/40 backdrop-blur-3xl border border-white/5 flex items-center gap-2 group-hover:border-white/20 transition-colors">
                        <div 
                            className="w-1 h-1 rounded-full animate-pulse" 
                            style={{ backgroundColor: accentColor, boxShadow: `0 0 10px ${accentColor}` }}
                        />
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/80">
                            {event.date ? (event.date === 'TBD' ? 'TBD' : new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })) : 'TBA'}
                        </span>
                    </div>
                    {event.performanceType && (
                        <span className="text-[7px] font-black uppercase tracking-[0.3em] text-white/30 pl-1">
                            {event.performanceType}
                        </span>
                    )}
                </div>

                {event.isTicketed && (
                    <div className="w-10 h-10 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white/40 group-hover:text-neon-green group-hover:border-neon-green/30 transition-all">
                        <Ticket size={18} />
                    </div>
                )}
            </div>

            {/* Content Body */}
            <div className="absolute inset-x-8 bottom-8 z-20">
                <div className="space-y-4">
                    <div className="space-y-2">
                        {event.artists && event.artists.length > 0 && (
                            <div className="flex flex-wrap gap-2 items-center opacity-60 group-hover:opacity-100 transition-opacity duration-500 min-h-[12px]">
                                {showAllArtists ? (
                                    <div className="flex flex-wrap gap-2 items-center">
                                        {event.artists.map((artist, i) => (
                                            <span key={i} className="text-[8px] font-black text-white uppercase tracking-widest">{artist}{i < event.artists.length - 1 ? ' •' : ''}</span>
                                        ))}
                                        <button 
                                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowAllArtists(false); }}
                                            className="text-[8px] font-black text-neon-blue uppercase tracking-widest ml-1 hover:underline"
                                        >
                                            LESS
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        {event.artists.slice(0, 2).map((artist, i) => (
                                            <span key={i} className="text-[8px] font-black text-white uppercase tracking-widest">{artist}{i < 1 && event.artists.length > 1 ? ' •' : ''}</span>
                                        ))}
                                        {event.artists.length > 2 && (
                                            <button 
                                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowAllArtists(true); }}
                                                className="text-[8px] font-black text-white/40 uppercase tracking-widest hover:text-white transition-colors"
                                            >
                                                + {event.artists.length - 2} MORE
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>
                        )}
                        <h3 className="text-2xl md:text-3xl font-black font-heading text-white leading-[1.1] tracking-tighter uppercase italic group-hover:text-neon-blue transition-all duration-500">
                            {event.title}
                        </h3>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-2">
                        <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-[0.2em] text-white/40">
                            <MapPin size={10} className="group-hover:text-white transition-colors" />
                            <span>{event.location || 'TBA'}</span>
                        </div>
                        {event.doorsOpen && (
                            <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-[0.2em] text-white/20">
                                <Clock size={10} />
                                <span>{event.doorsOpen}</span>
                            </div>
                        )}
                        {event.ageLimit && (
                            <span className="text-[8px] font-black uppercase tracking-[0.2em] text-white/10 px-1.5 py-0.5 rounded border border-white/5">{event.ageLimit}</span>
                        )}
                    </div>

                    <div className="pt-6 mt-2 border-t border-white/5 flex items-center justify-between">
                        <div className="flex flex-col gap-1.5">
                                <div 
                                    className="font-black tracking-[0.3em] flex items-center gap-3 group-hover:gap-5 transition-all uppercase text-[9px]"
                                    style={{ 
                                        color: event.isTicketed ? '#2eff90' : (event.isGuestlistEnabled ? '#ff2ebf' : accentColor) 
                                    }}
                                >
                                    {event.buttonText || (event.isTicketed ? "GET TICKETS" : (event.isGuestlistEnabled ? "RSVP NOW" : "VIEW DETAILS"))}
                                    <ArrowRight size={14} className="opacity-40 group-hover:opacity-100" />
                                </div>
                            {linkedGiveaway && (
                                <span className="text-purple-400 text-[7px] font-black uppercase tracking-widest flex items-center gap-1 opacity-60">
                                    <Gift size={10} /> GIVEAWAY ACTIVE
                                </span>
                            )}
                        </div>
                        
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleShare(e, event);
                            }}
                            className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-white/20 hover:text-white hover:bg-white/10 transition-all backdrop-blur-xl"
                        >
                            <Share2 size={14} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UpcomingEvents;
