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
                                {event.isTicketed ? (
                                    <div onClick={() => setSelectedEvent(event)} className="block w-full h-full relative cursor-pointer group">
                                        <EventTicket event={event} handleShare={handleShare} />
                                    </div>
                                ) : event.link ? (
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
        <div id={`event-card-${event.id}`} className="relative bg-zinc-900 border border-white/5 rounded-[3rem] overflow-hidden flex flex-col h-[520px] transition-all duration-500 hover:border-white/10 group shadow-2xl w-full">
            {/* Visual Perforations */}
            <div className="absolute top-[65%] -left-4 w-8 h-8 bg-[#111] rounded-full border border-white/5 z-20" />
            <div className="absolute top-[65%] -right-4 w-8 h-8 bg-[#111] rounded-full border border-white/5 z-20" />
            <div className="absolute top-[66.5%] left-4 right-4 h-px border-t border-dashed border-white/20 z-10" />

            {/* Top Image Section */}
            <div className="h-[65%] relative overflow-hidden bg-zinc-800">
                {event.image ? (
                    <div
                        className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 group-hover:scale-110"
                        style={{ backgroundImage: `url(${event.image})` }}
                    />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-600 font-bold uppercase tracking-widest text-xs">
                        TBA
                    </div>
                )}
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/40 to-transparent" />
                
                <div className="absolute top-6 left-6 px-4 py-2 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 z-10 flex items-center gap-3">
                    <span className="text-[10px] font-black uppercase tracking-widest text-neon-blue">
                        {event.date ? new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Soon'}
                    </span>
                    {event.isTicketed && <Ticket size={14} className="text-neon-green drop-shadow-[0_0_8px_rgba(46,255,144,0.5)]" />}
                </div>
            </div>

            {/* Bottom Content Section */}
            <div className="h-[35%] p-8 flex flex-col justify-between relative bg-zinc-900 z-10">
                <div>
                    <h3 className="text-2xl font-black text-white leading-tight tracking-tight mb-2 truncate">
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
                    <div className="text-neon-blue font-black tracking-widest flex items-center gap-2 group-hover:gap-4 transition-all hover:text-white cursor-pointer z-30">
                        <span className="text-[10px] uppercase">{event.buttonText || 'Access Event'}</span>
                        <ArrowRight size={16} />
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
