import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';
import { useStore } from '../../lib/store';
import { Calendar, MapPin, ArrowRight, Share2, Ticket, ChevronLeft, ChevronRight, Plus, Gift } from 'lucide-react';
import { Link } from 'react-router-dom';
import html2canvas from 'html2canvas';
import EventTicketingModal from '../tickets/EventTicketingModal';
import EventHubModal from '../community/EventHubModal';
import EventCard from '../community/EventCard';

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
                                // Always open the Hub Modal now
                                setSelectedEvent(event);
                                setIsModalOpen(true);
                            };

                            return (
                                <div key={event.id} className="w-[320px] md:w-[380px] flex-shrink-0 snap-start">
                                    <div className="block w-full h-full relative cursor-default group">
                                        <EventCard 
                                            item={event}
                                            handleShare={() => handleShare({ preventDefault: () => {}, stopPropagation: () => {} }, event)}
                                            onAction={() => handleCardClick(event)}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <EventHubModal
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


export default UpcomingEvents;
