import React, { useRef, useEffect, useState } from 'react';
import { motion, useMotionValue, animate } from 'framer-motion';
import { useStore } from '../../lib/store';
import { Calendar, MapPin, ArrowRight, Share2, Copy, Download, Check, Ticket } from 'lucide-react';
import html2canvas from 'html2canvas';
import BuyTicketModal from '../tickets/BuyTicketModal';

const UpcomingEvents = () => {
    const { upcomingEvents, siteSettings } = useStore();
    const carouselRef = useRef();
    const [selectedEvent, setSelectedEvent] = useState(null);

    // handle share logic
    const handleShare = async (e, event) => {
        e.preventDefault();
        e.stopPropagation();

        const cardElement = document.getElementById(`event-card-${event.id}`);
        if (!cardElement) return;

        try {
            // Create a canvas from the element
            // Use scale for higher resolution
            const canvas = await html2canvas(cardElement, {
                useCORS: true,
                scale: 3,
                backgroundColor: '#000000',
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
                // Fallback for desktop: Download + Copy Link
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
            // Simple fallback if everything fails
            if (event.link) {
                await navigator.clipboard.writeText(event.link);
                alert("Link copied to clipboard!");
            }
        }
    };

    // Component for reusable card content matching Portfolio style
    const InnerCardContent = ({ event }) => (
        <div id={`event-card-${event.id}`} className="w-full h-full relative">
            {/* Image Background */}
            {event.image ? (
                <div
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                    style={{ backgroundImage: `url(${event.image})` }}
                />
            ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-800 text-gray-500">
                    No Image
                </div>
            )}

            {/* Branding Tag */}
            <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-2 py-1 rounded border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                <span className="text-[10px] font-bold text-neon-green tracking-widest uppercase">Newbi Ent.</span>
            </div>

            {/* Gradient Overlay & Text (Idle State) */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent opacity-100 group-hover:opacity-0 transition-opacity duration-300 flex flex-col justify-end p-6">
                <h3 className="text-xl font-bold text-white transform translate-y-0 group-hover:translate-y-4 transition-transform duration-300">
                    {event.title}
                </h3>
                <p className="text-neon-green text-sm opacity-100 group-hover:opacity-0 transition-opacity duration-300 uppercase font-bold tracking-tight">
                    {event.date ? new Date(event.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric' }) : 'Upcoming'}
                </p>
            </div>

            {/* Hover Revealed Text (Hover State) */}
            <div className="absolute inset-0 bg-black/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-4 text-center">
                <div className="flex flex-col items-center w-full">
                    <h3 className="text-xl font-bold text-white mb-2">{event.title}</h3>
                    <span className="text-neon-green font-bold uppercase tracking-wider text-sm mb-3">
                        {event.date ? new Date(event.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric' }) : 'Upcoming'}
                    </span>

                    {/* Description Section */}
                    {event.description && (
                        <p className="text-gray-300 text-[10px] mb-4 line-clamp-2 max-w-[200px] text-center">
                            {event.description}
                        </p>
                    )}

                    <div className="flex flex-col gap-2 w-full max-w-[200px] items-center">
                        <div className="flex items-center gap-1 text-white hover:text-neon-green transition-colors text-sm font-medium mb-1">
                            {event.buttonText || 'view event'}
                            <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                        </div>

                        <div className="flex gap-2 justify-center w-full">
                            {/* Ticket Sales temporarily disabled
                            {event.isTicketed && (
                                <button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setSelectedEvent(event);
                                    }}
                                    className="bg-neon-green text-black px-4 py-2 rounded-full font-bold uppercase text-[10px] tracking-wider hover:bg-white hover:text-black transition-colors flex items-center gap-1 flex-1 justify-center whitespace-nowrap"
                                >
                                    <Ticket size={12} /> Get Tickets
                                </button>
                            )}
                            */}

                            <button
                                onClick={(e) => handleShare(e, event)}
                                className="p-2 bg-white/10 hover:bg-neon-green hover:text-black rounded-full transition-all text-white"
                                title="Share Event"
                            >
                                <Share2 size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    if (!siteSettings?.showUpcomingEvents || upcomingEvents.length === 0) {
        return null;
    }

    return (
        <section className="py-20 bg-black text-white overflow-hidden relative border-t border-white/5">
            {/* Neon Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[500px] bg-neon-green/5 blur-[120px] rounded-full pointer-events-none" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="text-center mb-12">
                    <h2 className="font-heading text-4xl md:text-5xl font-bold mb-4">
                        Upcoming <span className="text-neon-green">Events</span>
                    </h2>
                    <p className="text-gray-400">
                        Stay tuned for what we are working on next.
                    </p>
                </div>

                {/* Carousel Container */}
                <div className="relative">
                    <div
                        ref={carouselRef}
                        className="flex gap-6 overflow-x-auto pb-8 -mx-4 px-4 sm:px-6 lg:px-8 scrollbar-hide snap-x snap-mandatory scroll-smooth"
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    >
                        {upcomingEvents.map((event) => (
                            <div
                                key={event.id}
                                className="min-w-[280px] sm:min-w-[320px] aspect-[4/5] relative rounded-xl overflow-hidden group border border-white/10 bg-gray-900 flex-shrink-0 shadow-lg snap-start"
                            >
                                {/* Link Wrapper if needed */}
                                {event.link ? (
                                    <a href={event.link} target="_blank" rel="noreferrer" className="block w-full h-full relative cursor-pointer">
                                        <InnerCardContent event={event} />
                                    </a>
                                ) : (
                                    <InnerCardContent event={event} />
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Ticket Modal */}
            <BuyTicketModal
                event={selectedEvent || {}}
                isOpen={!!selectedEvent}
                onClose={() => setSelectedEvent(null)}
            />
        </section>
    );
};

export default UpcomingEvents;
