import React from 'react';
import { motion } from 'framer-motion';

const About = () => {
    const stats = [
        { label: "Events Managed", value: "250+", sub: "Successful shows and activations across India" },
        { label: "Cities Covered", value: "17+", sub: "Nationwide presence in major youth hubs" },
        { label: "GenZ Reach", value: "2M+", sub: "Monthly impressions through our massive network" },
    ];

    return (
        <section className="py-32 bg-[#020202] relative overflow-hidden">
            {/* Ambient Background Glows */}
            <div className="absolute top-1/4 left-1/4 w-[40%] h-[40%] bg-neon-green/5 blur-[120px] rounded-full" />
            <div className="absolute bottom-1/4 right-1/4 w-[40%] h-[40%] bg-neon-blue/5 blur-[120px] rounded-full" />

            <div className="max-w-7xl mx-auto px-4 relative z-10">
                {/* Section Header */}
                <div className="text-center mb-24">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md mb-8"
                    >
                        <span className="text-xs font-black uppercase tracking-[0.3em] text-white">Our Track Record</span>
                    </motion.div>
                    <motion.h2
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-4xl md:text-7xl font-black text-white mb-8 tracking-tighter"
                    >
                        MAKING <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-500">IMPACT.</span>
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {stats.map((stat, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6, delay: index * 0.1 }}
                            className="relative group p-1"
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="relative bg-zinc-900/60 backdrop-blur-2xl border border-white/5 rounded-3xl p-10 h-full flex flex-col items-center text-center group-hover:border-white/20 transition-all duration-500 group-hover:-translate-y-2">
                                <span className="text-[10px] font-black uppercase tracking-[0.5em] text-neon-green mb-8">{stat.label}</span>
                                <h4 className="text-6xl md:text-8xl font-black text-white mb-4 tracking-tighter group-hover:scale-110 transition-transform duration-500">
                                    {stat.value}
                                </h4>
                                <p className="text-sm text-gray-400 font-bold leading-relaxed max-w-[200px]">
                                    {stat.sub}
                                </p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default About;
