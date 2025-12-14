import React from 'react';
import { motion } from 'framer-motion';

const About = () => {
    const stats = [
        { label: "Events Organized", value: "250+", sub: "Successful shows across India" },
        { label: "Cities Covered", value: "17+", sub: "Nationwide event presence" },
        { label: "Attendees Served", value: "150K+", sub: "Memorable experiences delivered" },
    ];

    return (
        <section className="py-24 bg-black relative overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Section Header */}
                <div className="text-center mb-16 relative z-10">
                    <h3 className="relative text-3xl md:text-4xl font-bold text-white mb-4">
                        Making <span className="text-neon-green">Impact</span>
                    </h3>
                    <p className="text-gray-400 max-w-2xl mx-auto relative">
                        We believe in the power of shared moments and specialize in event and artist management with a unique blend of creativity and professionalism.
                    </p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {stats.map((stat, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                            className="bg-black/40 border border-white/10 rounded-xl p-8 hover:border-neon-green/50 transition-colors group relative overflow-hidden"
                        >
                            <p className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-[0.2em] mb-6">{stat.label}</p>
                            <div className="flex items-baseline gap-2 mb-2">
                                <h4 className="text-6xl md:text-7xl font-black font-heading text-white group-hover:text-neon-green transition-colors tracking-tighter">
                                    {stat.value}
                                </h4>
                                <span className="text-xl md:text-2xl text-white/40 font-bold">{stat.sub.split(" ")[0]}</span>
                            </div>
                            <p className="text-sm text-gray-400 font-medium leading-relaxed border-t border-white/5 pt-4 mt-2">{stat.sub.substring(stat.sub.indexOf(" ") + 1)}</p>

                            {/* Subtle gradient glow */}
                            <div className="absolute -inset-full top-0 block h-full w-1/2 -skew-x-12 bg-gradient-to-r from-transparent to-white opacity-0 group-hover:animate-shine" />
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default About;
