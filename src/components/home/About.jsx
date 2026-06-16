import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const About = () => {
    const carouselRef = useRef(null);
    const [isPaused, setIsPaused] = useState(false);

    const stats = [
        { label: "Events Managed", value: "250+", sub: "Successful shows and activations across India" },
        { label: "Cities Covered", value: "17+", sub: "Nationwide presence in major youth hubs" },
        { label: "GenZ Audience", value: "1M+", sub: "Total followers across our disruptive creator network" },
    ];

    const scroll = (direction) => {
        if (carouselRef.current) {
            carouselRef.current.scrollBy({ left: direction === 'left' ? -300 : 300, behavior: 'smooth' });
        }
    };

    useEffect(() => {
        if (isPaused || stats.length <= 1) return;

        const interval = setInterval(() => {
            if (window.innerWidth >= 768) return; // Only auto-scroll on mobile grid collapse

            if (carouselRef.current) {
                const el = carouselRef.current;
                const cardEl = el.querySelector('.snap-center');
                const cardWidth = cardEl?.offsetWidth || 300;
                const gap = 24;
                const scrollStep = cardWidth + gap;

                const isAtEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 15;
                if (isAtEnd) {
                    el.scrollTo({ left: 0, behavior: 'smooth' });
                } else {
                    el.scrollBy({ left: scrollStep, behavior: 'smooth' });
                }
            }
        }, 3500);

        return () => clearInterval(interval);
    }, [isPaused, stats]);

    return (
        <section className="py-10 md:py-16 bg-dark relative overflow-hidden">
            {/* Ambient Background Glows */}

            <div className="max-w-7xl mx-auto px-4 relative z-10">
                {/* Section Header */}
                <div className="text-center mb-12 md:mb-16">
                    <motion.h2
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-4xl md:text-6xl font-extrabold text-white mb-6 tracking-tight"
                    >
                        Making <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-neon-green">Impact</span>
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        className="text-gray-400 max-w-2xl mx-auto text-lg font-medium leading-relaxed"
                    >
                        We specialize in bridging the gap between global brands and the Indian youth through high-fidelity campus activations and disruptive marketing.
                    </motion.p>
                </div>

                {/* Stats Grid */}
                <div 
                    ref={carouselRef}
                    onMouseEnter={() => setIsPaused(true)}
                    onMouseLeave={() => setIsPaused(false)}
                    onTouchStart={() => setIsPaused(true)}
                    onTouchEnd={() => setIsPaused(false)}
                    className="flex md:grid md:grid-cols-3 gap-6 md:gap-8 overflow-x-auto md:overflow-visible pb-8 md:pb-0 scrollbar-hide snap-x snap-mandatory -mx-4 px-4 md:mx-0 md:px-0"
                >
                    {stats.map((stat, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6, delay: index * 0.1 }}
                            className="relative group p-1 min-w-[85vw] md:min-w-0 snap-center"
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent rounded-3xl opacity-0 md:group-hover:opacity-100 transition-opacity" />
                            <div className="relative bg-zinc-900/60 backdrop-blur-2xl border border-white/5 rounded-3xl p-6 md:p-10 h-full flex flex-col items-center text-center md:group-hover:border-white/20 transition-all duration-500 md:group-hover:-translate-y-2">
                                <span className="text-[10px] font-bold tracking-[0.25em] text-neon-green uppercase mb-8">{stat.label}</span>
                                <h4 className="text-5xl md:text-7xl font-extrabold text-white mb-4 tracking-tight md:group-hover:scale-105 transition-transform duration-500">
                                    {stat.value}
                                </h4>
                                <p className="text-xs text-gray-400 font-medium leading-relaxed max-w-[240px]">
                                    {stat.sub}
                                </p>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {stats.length > 1 && (
                    <div className="flex md:hidden items-center justify-center gap-4 mt-2">
                        <button 
                            onClick={() => scroll('left')}
                            className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white active:bg-white active:text-black transition-all"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <button 
                            onClick={() => scroll('right')}
                            className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white active:bg-white active:text-black transition-all"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                )}
            </div>
        </section>
    );
};

export default About;
