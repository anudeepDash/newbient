import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Shield, Megaphone, Globe, Users, Zap, ArrowRight, Music, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Link } from 'react-router-dom';

const Services = () => {
    const carouselRef = useRef(null);
    const [isPaused, setIsPaused] = useState(false);

    const services = [
        {
            title: "Campus Activations",
            shortDesc: "Dominate the Campus.",
            fullDesc: "Specialized end-to-end execution across 100+ colleges. We handle student networks, ground ops, and immersive brand experiences.",
            icon: Users,
            color: "neon-green",
            className: "md:col-span-2 md:row-span-1"
        },
        {
            title: "Marketing",
            shortDesc: "Cultural Relevance.",
            fullDesc: "Strategic influencer campaigns and trend-driven digital takeovers designed for the Indian youth heartland.",
            icon: Megaphone,
            color: "neon-blue",
            className: "md:col-span-1 md:row-span-1"
        },
        {
            title: "Artist Management",
            shortDesc: "Top-Tier Talent.",
            fullDesc: "Comprehensive artist hospitality and technical riders for college fests, concerts, and corporate takeovers.",
            icon: Music,
            color: "neon-pink",
            className: "md:col-span-1 md:row-span-1"
        },
        {
            title: "Event Operations",
            shortDesc: "Flawless Execution.",
            fullDesc: "From sound and lighting systems to venue security and large-scale crowd management.",
            icon: Shield,
            color: "neon-blue",
            className: "md:col-span-1 md:row-span-1"
        },
        {
            title: "Full-Scale PR",
            shortDesc: "Global Visibility.",
            fullDesc: "Holistic public relations strategy combined with ground-level community building to amplify brand presence.",
            icon: Globe,
            color: "white",
            className: "md:col-span-1 md:row-span-1"
        },
    ];

    const scroll = (direction) => {
        if (carouselRef.current) {
            carouselRef.current.scrollBy({ left: direction === 'left' ? -300 : 300, behavior: 'smooth' });
        }
    };

    useEffect(() => {
        if (isPaused || services.length <= 1) return;

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
    }, [isPaused, services]);

    return (
        <section id="capabilities" className="py-10 md:py-16 bg-dark relative px-4 overflow-hidden">
             {/* Background Atmosphere */}

            <div className="max-w-7xl mx-auto relative z-10">
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 md:mb-16 gap-12">
                    <div className="max-w-2xl">
                        <motion.h2
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="font-heading text-4xl md:text-6xl font-extrabold mb-6 text-white tracking-tight"
                        >
                            Our <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-neon-green">Capabilities</span>
                        </motion.h2>
                    </div>
                    <motion.p
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        className="text-gray-500 max-w-sm text-base md:text-lg font-medium leading-relaxed pb-2"
                    >
                        We bridge the gap between brands and the audience through high-octane activations and digital dominance.
                    </motion.p>
                </div>

                <div 
                    ref={carouselRef}
                    onMouseEnter={() => setIsPaused(true)}
                    onMouseLeave={() => setIsPaused(false)}
                    onTouchStart={() => setIsPaused(true)}
                    onTouchEnd={() => setIsPaused(false)}
                    className="flex overflow-x-auto md:grid md:grid-cols-3 gap-6 md:gap-8 overflow-y-hidden md:overflow-visible pb-12 md:pb-0 scrollbar-hide snap-x snap-mandatory -mx-4 px-4 md:mx-0 md:px-0"
                >
                    {services.map((service, index) => (
                        <div key={index} className={cn("min-w-[85vw] md:min-w-0 snap-center", service.className)}>
                            <ServiceCard service={service} index={index} />
                         </div>
                    ))}
                </div>

                {services.length > 1 && (
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

                {/* CTA Section */}
                <motion.div 
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="flex flex-col items-center justify-center mt-10 md:mt-12"
                >
                    <Link to="/contact">
                        <motion.div
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="relative group cursor-pointer"
                        >
                            {/* Animated Glow Backdrop */}
                            <div className="absolute -inset-1 bg-gradient-to-r from-neon-green via-neon-blue to-neon-pink rounded-xl blur opacity-25 group-hover:opacity-60 transition duration-1000 group-hover:duration-200"></div>
                            
                            <div className="relative px-10 py-4 bg-black rounded-xl leading-none flex items-center gap-3 border border-white/10 group-hover:border-neon-green/30 transition-colors">
                                <span className="text-white text-xs font-bold uppercase tracking-[0.2em]">Ready to scale?</span>
                                <div className="p-1.5 rounded-lg bg-neon-green/10 group-hover:bg-neon-green transition-colors">
                                    <ArrowRight className="h-3.5 w-3.5 text-neon-green group-hover:text-black" />
                                </div>
                            </div>
                        </motion.div>
                    </Link>
                    <p className="text-gray-500 text-[9px] font-bold uppercase tracking-[0.2em] mt-4 opacity-50">GET IN TOUCH FOR A CUSTOM STRATEGY</p>
                </motion.div>
            </div>
        </section>
    );
};

const ServiceCard = ({ service, index }) => {
    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className={cn(
                "group relative bg-zinc-900/40 backdrop-blur-3xl border border-white/5 p-6 md:p-10 rounded-3xl md:rounded-[2.5rem] overflow-hidden transition-all duration-700 hover:border-white/20 flex flex-col min-h-[280px] md:min-h-[340px]",
                service.className
            )}
        >
            <div className="relative z-10 flex flex-col h-full">
                <div className="mb-auto">
                    <div className={cn(
                        "w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center transition-all duration-700 md:group-hover:bg-white md:group-hover:text-black md:group-hover:scale-110",
                        service.color === 'neon-green' ? 'text-neon-green' : (service.color === 'neon-blue' ? 'text-neon-blue' : (service.color === 'neon-pink' ? 'text-neon-pink' : 'text-white'))
                    )}>
                        <service.icon size={32} />
                    </div>
                </div>

                <div className="space-y-4 mt-6">
                    <h3 className="text-xl md:text-2xl font-extrabold font-heading text-white tracking-tight leading-none md:group-hover:translate-x-2 transition-transform duration-500">
                        {service.title}
                    </h3>

                    <p className="text-gray-500 text-[10px] font-bold uppercase tracking-[0.2em] leading-tight">
                        {service.shortDesc}
                    </p>

                    <p className="text-gray-400 text-sm font-medium leading-relaxed opacity-100 translate-y-0 md:opacity-0 md:group-hover:opacity-100 md:translate-y-4 md:group-hover:translate-y-0 transition-all duration-700">
                        {service.fullDesc}
                    </p>
                </div>
            </div>

            {/* Background Icon Aura */}
            <div className="absolute -bottom-10 -right-10 opacity-[0.02] group-hover:opacity-[0.08] transition-all duration-1000 rotate-12 scale-150">
                <service.icon size={200} />
            </div>
        </motion.div>
    );
};

export default Services;
