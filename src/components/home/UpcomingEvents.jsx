import React, { useRef, useEffect, useState } from 'react';
import { motion, useMotionValue, animate } from 'framer-motion';
import { useStore } from '../../lib/store';
import { Calendar, MapPin, ArrowRight } from 'lucide-react';

const UpcomingEvents = () => {
    const { upcomingEvents, siteSettings } = useStore();
    const [width, setWidth] = useState(0);
    const carouselRef = useRef();
    const x = useMotionValue(0);

    // Component for reusable card content
    // Component for reusable card content matching Portfolio style
    const InnerCardContent = ({ event }) => (
        <>
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

            {/* Gradient Overlay & Text (Idle State) */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-100 group-hover:opacity-0 transition-opacity duration-300 flex flex-col justify-end p-6">
                <h3 className="text-xl font-bold text-white transform translate-y-0 group-hover:translate-y-4 transition-transform duration-300 line-clamp-2">
                    {event.title}
                </h3>
                <div className="text-neon-green text-sm opacity-100 group-hover:opacity-0 transition-opacity duration-300 flex items-center gap-2 mt-1">
                    <Calendar size={14} />
                    {event.date ? new Date(event.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric' }) : 'Upcoming'}
                </div>
            </div>

            {/* Hover Revealed Text (Hover State) */}
            <div className="absolute inset-0 bg-black/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-4 text-center">
                <div>
                    <h3 className="text-2xl font-bold text-white mb-2">{event.title}</h3>
                    <span className="text-neon-green font-bold uppercase tracking-wider text-sm">
                        {event.date ? new Date(event.date).toLocaleDateString() : 'See Details'}
                    </span>
                    {event.description && (
                        <p className="text-gray-300 text-xs mt-3 line-clamp-3 max-w-[250px] mx-auto">
                            {event.description}
                        </p>
                    )}
                </div>
            </div>
        </>
    );

    useEffect(() => {
        if (carouselRef.current) {
            // Ensure width is not negative (if content is smaller than screen)
            setWidth(Math.max(0, carouselRef.current.scrollWidth - carouselRef.current.offsetWidth));
        }
    }, [upcomingEvents]);

    // Auto-scroll animation
    useEffect(() => {
        if (upcomingEvents.length <= 1 || width <= 0) return; // Don't scroll if too few items or fits screen

        const controls = animate(x, [-width, 0], {
            ease: "linear",
            duration: 20, // Adjust speed
            repeat: Infinity,
            repeatType: "loop",
            repeatDelay: 0
        });

        return controls.stop;
    }, [x, width, upcomingEvents.length]);

    if (!siteSettings?.showUpcomingEvents) {
        return null;
    }

    return (
        <section className="py-20 bg-black text-white overflow-hidden relative">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-10 text-center">
                <div className="inline-block">
                    <h2 className="font-heading text-4xl md:text-5xl font-bold mb-4">
                        Upcoming <span className="text-neon-green">Events</span>
                    </h2>
                    <p className="text-gray-400 max-w-xl mx-auto">
                        Stay tuned for what we are working on next.
                    </p>
                </div>
            </div>

            {/* Carousel Container */}
            <div className="relative pl-4 sm:pl-6 lg:pl-8">
                {/* 
                   We want a draggable carousel. 
                   For simplicity and robustness with different screen sizes, 
                   let's use a simple horizontal scroll snap or framer-motion drag.
                   Given "carousel that automatically shows multiple", let's use a simpler drag setup.
                */}

                <motion.div
                    ref={carouselRef}
                    className="cursor-grab active:cursor-grabbing overflow-hidden"
                >
                    <motion.div
                        drag="x"
                        dragConstraints={{ right: 0, left: -width }}
                        className={`flex gap-6 ${width === 0 ? 'justify-center' : ''}`}
                    >
                        {upcomingEvents.map((event) => (
                            <motion.div
                                key={event.id}
                                className="min-w-[280px] sm:min-w-[320px] aspect-square relative rounded-xl overflow-hidden group border border-white/10 bg-gray-900 flex-shrink-0 shadow-lg"
                            >
                                {/* Link Wrapper if needed */}
                                {event.link ? (
                                    <a href={event.link} target="_blank" rel="noreferrer" className="block w-full h-full relative cursor-pointer">
                                        <InnerCardContent event={event} />
                                    </a>
                                ) : (
                                    <InnerCardContent event={event} />
                                )}
                            </motion.div>
                        ))}
                    </motion.div>
                </motion.div>
            </div>
        </section>
    );
};

export default UpcomingEvents;
