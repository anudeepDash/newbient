import React, { useRef, useEffect, useState } from 'react';
import { motion, useMotionValue, animate } from 'framer-motion';
import { useStore } from '../../lib/store';
import { Calendar, MapPin, ArrowRight } from 'lucide-react';

const UpcomingEvents = () => {
    const { upcomingEvents, siteSettings } = useStore();
    const carouselRef = useRef();

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
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent opacity-100 group-hover:opacity-0 transition-opacity duration-300 flex flex-col justify-end p-6">
                <h3 className="text-xl font-bold text-white transform translate-y-0 group-hover:translate-y-4 transition-transform duration-300">
                    {event.title}
                </h3>
                <p className="text-neon-green text-sm opacity-100 group-hover:opacity-0 transition-opacity duration-300">
                    {event.date ? new Date(event.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric' }) : 'Upcoming'}
                </p>
            </div>

            {/* Hover Revealed Text (Hover State) */}
            <div className="absolute inset-0 bg-black/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-4 text-center">
                <div className="flex flex-col items-center">
                    <h3 className="text-2xl font-bold text-white mb-2">{event.title}</h3>
                    <span className="text-neon-green font-bold uppercase tracking-wider text-sm mb-4">
                        {event.date ? new Date(event.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric' }) : 'Upcoming'}
                    </span>

                    <div className="flex items-center gap-1 text-white hover:text-neon-green transition-colors text-sm font-medium">
                        view event
                        <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                    </div>
                </div>
            </div>
        </>
    );

    if (!siteSettings?.showUpcomingEvents) {
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
        </section>
    );
};

export default UpcomingEvents;
