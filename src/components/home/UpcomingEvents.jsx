import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../../lib/store';
import { Calendar, MapPin, ArrowRight, Share2, Ticket, ChevronLeft, ChevronRight, Plus, Gift } from 'lucide-react';
import { Link } from 'react-router-dom';
import html2canvas from 'html2canvas';
import BuyTicketModal from '../tickets/BuyTicketModal';

const UpcomingEvents = () => {
    const { upcomingEvents, siteSettings, maintenanceState, giveaways } = useStore();
    const carouselRef = useRef();
    const [selectedEvent, setSelectedEvent] = useState(null);

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
        if (eventId && upcomingEvents.length > 0) {
            const element = document.getElementById(`event-card-${eventId}`);
            if (element) {
                setTimeout(() => {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 800);
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
    }, [upcomingEvents]);

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
                alert("Image downloaded and event link copied to clipboard!");
            }
        } catch (error) {
            console.error("Share failed:", error);
            const eventUrl = `${window.location.origin}/?event=${event.id}`;
            await navigator.clipboard.writeText(eventUrl);
            alert("Link copied to clipboard!");
        }
    };

    if (!siteSettings?.showUpcomingEvents || upcomingEvents.length === 0) {
        return null;
    }

    return (
        <section
            id="upcoming-events"
            className="relative py-16 md:py-24 pt-16 pb-32 md:pb-24 scroll-mt-24 bg-[#020202] text-white overflow-hidden border-t border-white/5"
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
                            UPCOMING <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-blue via-cyan-400 to-neon-green not-italic">EVENTS.</span>
                        </motion.h2>
                    </div>
                </div>

                {/* Carousel Container */}
                <div className="relative group cursor-grab active:cursor-grabbing">
                    <div 
                        ref={carouselRef}
                        className="flex overflow-x-auto gap-4 md:gap-8 pb-12 snap-x horizontal-scrollbar scroll-smooth px-6 md:px-0"
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
                                if (event.isTicketed) {
                                    if (maintenanceState.features?.tickets) {
                                        alert("Ticketing is currently paused for maintenance. Please check back later.");
                                    } else {
                                        setSelectedEvent(event);
                                    }
                                } else if (event.link) {
                                    window.open(event.link, '_blank', 'noreferrer');
                                } else if (linkedGiveaway) {
                                    window.location.href = `/giveaway/${linkedGiveaway.slug}`;
                                } else {
                                    alert("This event currently has no active ticketing or link specified.");
                                }
                            };

                            return (
                                <div key={event.id} className="min-w-[280px] md:min-w-[400px] snap-start">
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

            <BuyTicketModal
                event={selectedEvent || {}}
                isOpen={!!selectedEvent}
                onClose={() => setSelectedEvent(null)}
            />
        </section>
    );
};

const EventTicket = ({ event, handleShare, linkedGiveaway }) => {
    const isHybrid = event.isTicketed && linkedGiveaway;

    return (
        <div id={`event-card-${event.id}`} className="relative bg-[#111] border border-white/5 rounded-3xl md:rounded-[3rem] overflow-hidden flex flex-col h-[420px] md:h-[520px] transition-all duration-500 hover:border-white/10 group shadow-2xl w-full">
            {/* Visual Perforations */}
            <div className="absolute top-[65%] -left-4 w-8 h-8 bg-black rounded-full border border-white/5 z-20" />
            <div className="absolute top-[65%] -right-4 w-8 h-8 bg-black rounded-full border border-white/5 z-20" />
            <div className="absolute top-[66.5%] left-4 right-4 h-px border-t border-dashed border-white/20 z-10" />

            {/* Top Image Section */}
            <div className="h-[65%] relative overflow-hidden bg-zinc-800">
                {event.image ? (
                    <div
                        className="absolute inset-0 bg-cover bg-[center_top] transition-transform duration-1000 group-hover:scale-110"
                        style={{ backgroundImage: `url(${event.image})` }}
                    />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-600 font-bold uppercase tracking-widest text-xs">
                        TBA
                    </div>
                )}
                {/* Gradient Overlay */}
                <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#111] to-transparent" />
                
                <div className="absolute top-6 left-6 flex items-center gap-2 z-10">
                    <div className="px-4 py-2 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 flex items-center gap-3">
                        <span className="text-[10px] font-black uppercase tracking-widest text-neon-blue">
                            {event.date ? new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Soon'}
                        </span>
                    </div>
                    {event.isGiveaway && (
                        <div className="px-3 py-2 rounded-xl bg-purple-600/80 backdrop-blur-md border border-purple-400/30 flex items-center gap-2">
                            <Gift size={14} className="text-white animate-pulse" />
                            <span className="text-[9px] font-black uppercase tracking-widest text-white">GIVEAWAY</span>
                        </div>
                    )}
                </div>
                
                {event.isTicketed && (
                    <div className="absolute top-6 right-6 w-10 h-10 rounded-xl bg-neon-green text-black flex items-center justify-center shadow-[0_0_15px_rgba(46,255,144,0.3)] z-10">
                        <Ticket size={20} />
                    </div>
                )}
            </div>

            {/* Bottom Content Section */}
            <div className="h-[35%] p-6 md:p-8 flex flex-col justify-between relative bg-[#111] z-10">
                <div>
                    <h3 className="event-title text-xl md:text-2xl font-black text-white leading-tight tracking-tight mb-2 line-clamp-2 italic">
                        {event.title}
                    </h3>
                    <div className="flex items-center gap-4 text-gray-500">
                        <div className="flex items-center gap-1">
                            <MapPin size={12} className="text-neon-blue" />
                            <span className="text-[10px] font-bold uppercase tracking-widest">{event.location || 'Mainland India'}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <Calendar size={12} className="text-neon-blue" />
                            <span className="text-[10px] font-bold uppercase tracking-widest">{event.date ? 'Confirmed' : 'Pending'}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between pt-4">
                    <div className="flex flex-col gap-2">
                        {(event.isTicketed || event.buttonText?.toUpperCase().includes('TICKET')) && (
                            <div className="text-neon-green font-black tracking-widest flex items-center gap-2 group-hover:gap-4 transition-all hover:text-white cursor-pointer z-30">
                                <span className="text-[10px] uppercase">{event.buttonText || "GET TICKETS"}</span>
                                <ArrowRight size={16} />
                            </div>
                        )}
                        
                        {linkedGiveaway && (
                            <Link 
                                to={`/giveaway/${linkedGiveaway.slug}`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                }}
                                className="text-purple-400 font-black tracking-widest flex items-center gap-2 group-hover:gap-4 transition-all hover:text-white cursor-pointer z-30 group/giveaway"
                            >
                                <Gift size={15} className="text-purple-400" />
                                <span className="text-[10px] uppercase tracking-tighter border-b border-purple-500/0 group-hover/giveaway:border-purple-500/50 transition-all">
                                    {event.isTicketed ? 'ENTER GIVEAWAY' : 'PARTICIPATE IN GIVEAWAY'}
                                </span>
                            </Link>
                        )}

                        {!event.isTicketed && !linkedGiveaway && (event.link || event.buttonText) && (
                            <div className="text-neon-blue font-black tracking-widest flex items-center gap-2 group-hover:gap-4 transition-all hover:text-white cursor-pointer z-30">
                                <span className="text-[10px] uppercase">{event.buttonText || "LEARN MORE"}</span>
                                <ArrowRight size={16} />
                            </div>
                        )}
                    </div>
                    
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleShare(e, event);
                        }}
                        className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-neon-blue hover:text-black transition-all z-30"
                    >
                        <Share2 size={14} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UpcomingEvents;
