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
    const CardContent = ({ event }) => (
        <>
            <img
                src={event.image}
                alt={event.title}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            />

            {/* Gradient - stronger at bottom for text readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent opacity-90" />

            <div className="absolute top-4 right-4 bg-white/10 backdrop-blur-md border border-white/20 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-neon-green">
                Upcoming
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-6 translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                {event.date && (
                    <div className="flex items-center gap-2 text-neon-green mb-2 text-sm font-bold">
                        <Calendar size={14} />
                        {new Date(event.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </div>
                )}
                <h3 className="text-xl font-bold text-white mb-2 leading-tight">{event.title}</h3>
                {event.description && (
                    <p className="text-gray-400 text-sm line-clamp-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100">
                        {event.description}
                    </p>
                )}
            </div>
        </>
    );

    useEffect(() => {
        if (carouselRef.current) {
            setWidth(carouselRef.current.scrollWidth - carouselRef.current.offsetWidth);
        }
    }, [upcomingEvents]);

    // Auto-scroll animation
    useEffect(() => {
        if (upcomingEvents.length <= 1) return; // Don't scroll if too few items

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
                        className="flex gap-6"
                    >
                        {upcomingEvents.map((event) => (
                            <motion.div
                                key={event.id}
                                className="min-w-[280px] sm:min-w-[320px] aspect-square relative rounded-2xl overflow-hidden group border border-white/10 bg-gray-900 flex-shrink-0"
                            >
                                {/* Wrap content in link if available */}
                                {event.link ? (
                                    <a href={event.link} target="_blank" rel="noreferrer" className="block w-full h-full">
                                        <CardContent event={event} />
                                    </a>
                                ) : (
                                    <div className="w-full h-full">
                                        <CardContent event={event} />
                                    </div>
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
