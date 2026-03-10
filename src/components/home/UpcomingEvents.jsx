import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../../lib/store';
import { Calendar, MapPin, ArrowRight, Share2, Ticket, ChevronLeft, ChevronRight } from 'lucide-react';
import html2canvas from 'html2canvas';
import BuyTicketModal from '../tickets/BuyTicketModal';

const UpcomingEvents = () => {
    const { upcomingEvents, siteSettings } = useStore();
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

    const handleShare = async (e, event) => {
        e.preventDefault();
        e.stopPropagation();
        const cardElement = document.getElementById(`event-card-${event.id}`);
        if (!cardElement) return;
        try {
            const canvas = await html2canvas(cardElement, {
                useCORS: true,
                scale: 3,
                backgroundColor: '#020202',
                logging: false,
            });
            const imageBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png', 1.0));
            const imageFile = new File([imageBlob], `${event.title.replace(/\s+/g, '_')}_event.png`, { type: 'image/png' });
            const eventUrl = event.link || window.location.origin;
            const shareData = {
                title: event.title,
                text: `${event.title} - ${event.date ? new Date(event.date).toLocaleDateString() : 'Upcoming Event'}\n\nAccess it here: ${eventUrl}`,
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
                if (event.link) {
                    await navigator.clipboard.writeText(event.link);
                    alert("Image downloaded and event link copied to clipboard!");
                } else {
                    alert("Image downloaded!");
                }
            }
        } catch (error) {
            console.error("Share failed:", error);
            if (event.link) {
                await navigator.clipboard.writeText(event.link);
                alert("Link copied to clipboard!");
            }
        }
    };

    if (!siteSettings?.showUpcomingEvents || upcomingEvents.length === 0) {
        return null;
    }

    return (
        <section
            className="py-32 bg-[#020202] text-white overflow-hidden relative border-t border-white/5"
            onMouseEnter={() => setIsAutoScrolling(false)}
            onMouseLeave={() => setIsAutoScrolling(true)}
        >
            {/* Atmosphere */}
            <div className="absolute top-1/2 left-0 w-[400px] h-[400px] bg-neon-blue/5 blur-[120px] rounded-full pointer-events-none" />

            <div className="max-w-7xl mx-auto px-4 relative z-10">
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-24 gap-8">
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
                            className="font-heading text-4xl md:text-6xl font-black tracking-tight"
                        >
                            UPCOMING <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-blue via-cyan-400 to-neon-green">EVENTS.</span>
                        </motion.h2>
                    </div>
                </div>

                {/* Carousel Container */}
                <div className="relative group/carousel">
                    <div
                        ref={carouselRef}
                        className="flex gap-8 overflow-x-auto pb-12 scrollbar-hide snap-x snap-mandatory scroll-smooth -mx-4 px-4"
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    >
                        {upcomingEvents.map((event) => (
                            <div key={event.id} className="min-w-[320px] md:min-w-[400px] snap-start">
                                {event.link ? (
                                    <a href={event.link} target="_blank" rel="noreferrer" className="block w-full h-full relative cursor-pointer group">
                                        <EventTicket event={event} handleShare={handleShare} />
                                    </a>
                                ) : (
                                    <div className="block w-full h-full relative group">
                                        <EventTicket event={event} handleShare={handleShare} />
                                    </div>
                                )}
                            </div>
                        ))}
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

const EventTicket = ({ event, handleShare }) => {
    return (
        <div id={`event-card-${event.id}`} className="bg-zinc-900/40 border border-white/5 rounded-[2.5rem] overflow-hidden flex flex-col h-[400px] shadow-2xl relative w-full group transition-all duration-500">
            <div className="aspect-[3/4] relative overflow-hidden bg-black/50 h-full cursor-pointer">
                {event.image ? (
                    <img src={event.image} alt={event.title} className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-700" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-800 text-gray-500 text-[10px] font-black tracking-widest uppercase">No Image</div>
                )}
                
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent p-6 flex flex-col justify-end">
                    <div className="flex items-center justify-between mb-3 w-full">
                        <div className="flex items-center gap-3">
                            <span className="px-3 py-1 bg-neon-blue/20 text-neon-blue text-[8px] font-black uppercase tracking-widest border border-neon-blue/30 rounded-full backdrop-blur-md">
                                {event.date ? new Date(event.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase() : 'PENDING'}
                            </span>
                            {event.isTicketed && <Ticket size={14} className="text-neon-green drop-shadow-[0_0_8px_rgba(46,255,144,0.5)]" />}
                        </div>
                        <div className="flex items-center gap-1">
                            <MapPin size={10} className="text-neon-pink" />
                            <span className="text-[8px] font-black uppercase tracking-widest text-gray-400">{event.location || 'Mainland India'}</span>
                        </div>
                    </div>
                    
                    <h3 className="text-2xl font-black font-heading text-white uppercase italic tracking-tighter mb-2 leading-none line-clamp-2">
                        {event.title}
                    </h3>
                    
                    {event.description && (
                        <p className="text-[10px] font-medium text-gray-400 line-clamp-2 leading-relaxed opacity-80 group-hover:opacity-100 transition-opacity">
                            {event.description}
                        </p>
                    )}
                    
                    <div className="mt-4 flex items-center justify-between w-full">
                        <div className="flex items-center gap-2 text-neon-blue text-[10px] font-black uppercase tracking-widest group-hover:gap-3 transition-all">
                            {event.buttonText || 'Access Event'} <ArrowRight size={12} />
                        </div>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleShare(e, event);
                            }}
                            className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-neon-blue hover:text-black transition-all"
                        >
                            <Share2 size={12} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UpcomingEvents;
