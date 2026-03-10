import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Mic2, Megaphone, CalendarCheck, Music, Globe, Users, BarChart3, Zap, ArrowRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Link } from 'react-router-dom';

const Services = () => {
    const services = [
        {
            title: "College Activations",
            shortDesc: "DOMINATE THE CAMPUS.",
            fullDesc: "Specialized end-to-end execution across 100+ colleges. We handle student networks, ground ops, and immersive brand experiences.",
            icon: Users,
            color: "neon-green",
            className: "md:col-span-2 md:row-span-1"
        },
        {
            title: "Marketing",
            shortDesc: "CULTURAL RELEVANCE.",
            fullDesc: "Strategic influencer campaigns and trend-driven digital takeovers designed for the Indian youth heartland.",
            icon: Megaphone,
            color: "neon-blue",
            className: "md:col-span-1 md:row-span-1"
        },
        {
            title: "Artist Management",
            shortDesc: "TOP-TIER TALENT.",
            fullDesc: "Comprehensive artist hospitality and technical riders for college fests, concerts, and corporate takeovers.",
            icon: Music,
            color: "neon-pink",
            className: "md:col-span-1 md:row-span-1"
        },
        {
            title: "Event Operations",
            shortDesc: "FLAWLESS EXECUTION.",
            fullDesc: "From sound and lighting systems to venue security and large-scale crowd management.",
            icon: Shield,
            color: "neon-blue",
            className: "md:col-span-1 md:row-span-1"
        },
        {
            title: "Full-Scale PR",
            shortDesc: "GLOBAL VISIBILITY.",
            fullDesc: "Holistic public relations strategy combined with ground-level community building to amplify brand presence.",
            icon: Globe,
            color: "white",
            className: "md:col-span-1 md:row-span-1"
        },
    ];

    return (
        <section id="capabilities" className="py-32 bg-[#020202] relative px-4 overflow-hidden">
             {/* Background Atmosphere */}
             <div className="absolute top-1/2 left-0 -translate-y-1/2 w-96 h-96 bg-neon-green/5 blur-[120px] rounded-full pointer-events-none" />
             <div className="absolute bottom-0 right-0 w-96 h-96 bg-neon-blue/5 blur-[120px] rounded-full pointer-events-none" />

            <div className="max-w-7xl mx-auto relative z-10">
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-24 gap-12">
                    <div className="max-w-2xl">
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-6"
                        >
                            <Zap size={14} className="text-neon-green" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-white">Full-Stack Solutions</span>
                        </motion.div>
                        <motion.h2
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="font-heading text-4xl md:text-7xl font-black mb-6 text-white tracking-tighter italic"
                        >
                            OUR <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-green via-white to-neon-blue not-italic">CAPABILITIES.</span>
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

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 mb-24">
                    {services.map((service, index) => (
                        <ServiceCard key={index} service={service} index={index} />
                    ))}
                </div>

                {/* CTA Section - Shrinked to a smaller premium button */}
                <motion.div 
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="flex flex-col items-center justify-center mt-20"
                >
                    <Link to="/contact">
                        <motion.div
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="relative group cursor-pointer"
                        >
                            {/* Animated Glow Backdrop */}
                            <div className="absolute -inset-1 bg-gradient-to-r from-neon-green via-neon-blue to-neon-pink rounded-full blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200"></div>
                            
                            <div className="relative px-10 py-4 bg-black rounded-full leading-none flex items-center gap-3 border border-white/10 group-hover:border-neon-green/50 transition-colors">
                                <span className="text-white text-lg font-black font-heading uppercase tracking-tighter italic">READY TO SCALE?</span>
                                <div className="p-2 rounded-full bg-neon-green/20 group-hover:bg-neon-green transition-colors">
                                    <ArrowRight className="h-4 w-4 text-neon-green group-hover:text-black" />
                                </div>
                            </div>
                            <div className="absolute top-0 right-0 p-12 opacity-5 group-hover:opacity-20 transition-opacity">
                                <Zap size={120} className="text-black" />
                            </div>
                        </motion.div>
                    </Link>
                    <p className="text-gray-500 text-[10px] font-bold uppercase tracking-[0.2em] mt-4 opacity-50">GET IN TOUCH FOR A CUSTOM STRATEGY</p>
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
            {/* Visual Perforations */}
            <div className="absolute top-1/2 -left-3 w-6 h-6 bg-[#020202] rounded-full border border-white/5 z-20 group-hover:scale-110 transition-transform" />
            <div className="absolute top-1/2 -right-3 w-6 h-6 bg-[#020202] rounded-full border border-white/5 z-20 group-hover:scale-110 transition-transform" />
            
            <div className="relative z-10 flex flex-col h-full">
                <div className="mb-auto">
                    <div className={cn(
                        "w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center transition-all duration-700 group-hover:bg-white group-hover:text-black group-hover:scale-110",
                        service.color === 'neon-green' ? 'text-neon-green' : (service.color === 'neon-blue' ? 'text-neon-blue' : (service.color === 'neon-pink' ? 'text-neon-pink' : 'text-white'))
                    )}>
                        <service.icon size={32} />
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="text-xl md:text-3xl font-black font-heading text-white tracking-tight leading-none group-hover:translate-x-2 transition-transform duration-500 italic">
                        {service.title}
                    </h3>

                    <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.3em]">
                        {service.shortDesc}
                    </p>

                    <p className="text-gray-400 text-sm font-medium leading-relaxed opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all duration-700">
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
