import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Target, ArrowRight, Zap, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../../lib/utils';

const CreatorsSection = () => {
    return (
        <section id="creators-brands" className="py-16 md:py-24 bg-[#020202] relative px-4 overflow-hidden border-t border-white/5">
            {/* Background Atmosphere Glows */}
            <div className="absolute top-1/4 right-0 w-96 h-96 bg-neon-pink/5 blur-[130px] rounded-full pointer-events-none" />
            <div className="absolute bottom-1/4 left-0 w-96 h-96 bg-neon-blue/5 blur-[130px] rounded-full pointer-events-none" />

            <div className="max-w-7xl mx-auto relative z-10">
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-8">
                    <div className="max-w-2xl">
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-6"
                        >
                            <Sparkles size={14} className="text-neon-pink" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-white">Creator Ecosystem</span>
                        </motion.div>
                        <motion.h2
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="font-heading text-4xl md:text-7xl font-black mb-6 text-white tracking-tighter italic"
                        >
                            CREATIVE <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-pink via-white to-neon-blue not-italic">POWERHOUSE.</span>
                        </motion.h2>
                    </div>
                    <motion.p
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        className="text-gray-500 max-w-sm text-base md:text-lg font-medium leading-relaxed pb-2"
                    >
                        Bridging authentic campus and niche creators with high-octane brands for maximum cultural impact.
                    </motion.p>
                </div>

                {/* Two Column Grid for Creators vs Brands */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
                    {/* For Creators Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                        className="group relative bg-zinc-900/35 backdrop-blur-3xl border border-white/5 p-8 md:p-14 rounded-3xl md:rounded-[3rem] overflow-hidden hover:border-white/10 transition-all duration-700 min-h-[380px] md:min-h-[460px] flex flex-col justify-between"
                    >
                        {/* Perforations */}
                        <div className="absolute top-1/2 -left-3 w-6 h-6 bg-[#020202] rounded-full border border-white/5 z-20 group-hover:scale-110 transition-transform" />
                        <div className="absolute top-1/2 -right-3 w-6 h-6 bg-[#020202] rounded-full border border-white/5 z-20 group-hover:scale-110 transition-transform" />

                        <div className="space-y-6">
                            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-neon-pink group-hover:bg-white group-hover:text-black transition-all duration-700 group-hover:scale-110 shadow-lg">
                                <Users size={32} />
                            </div>
                            <div className="space-y-3">
                                <h3 className="text-2xl md:text-4xl font-black font-heading text-white tracking-tight leading-none group-hover:translate-x-2 transition-transform duration-500 italic uppercase">
                                    FOR CREATORS
                                </h3>
                                <p className="text-neon-pink text-[10px] font-black uppercase tracking-[0.3em] leading-tight">
                                    UNLEASH YOUR INFLUENCE.
                                </p>
                                <p className="text-gray-400 text-sm md:text-base font-medium leading-relaxed pt-2">
                                    Join India's premier network of campus and niche content creators. Get access to paid campaigns, build an automated media kit portfolio, track real-time analytics, and secure exclusive sponsorship deals.
                                </p>
                            </div>
                        </div>

                        <div className="pt-8 md:pt-10">
                            <Link to="/creator">
                                <motion.div
                                    whileHover={{ scale: 1.03 }}
                                    whileTap={{ scale: 0.98 }}
                                    className="relative inline-block cursor-pointer"
                                >
                                    <div className="absolute -inset-1 bg-gradient-to-r from-neon-pink to-neon-purple rounded-2xl blur opacity-20 group-hover:opacity-60 transition duration-700"></div>
                                    <div className="relative px-8 py-4 bg-black rounded-2xl leading-none flex items-center gap-3 border border-white/10 group-hover:border-neon-pink/40 transition-colors">
                                        <span className="text-white text-sm font-black font-heading uppercase tracking-wider italic">APPLY AS CREATOR</span>
                                        <div className="p-1 rounded-full bg-neon-pink/20 group-hover:bg-neon-pink transition-colors">
                                            <ArrowRight className="h-3 w-3 text-neon-pink group-hover:text-black" />
                                        </div>
                                    </div>
                                </motion.div>
                            </Link>
                        </div>

                        {/* Background Aura Icon */}
                        <div className="absolute -bottom-10 -right-10 opacity-[0.02] group-hover:opacity-[0.06] transition-all duration-1000 rotate-12 scale-150 pointer-events-none">
                            <Users size={240} />
                        </div>
                    </motion.div>

                    {/* For Brands Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="group relative bg-zinc-900/35 backdrop-blur-3xl border border-white/5 p-8 md:p-14 rounded-3xl md:rounded-[3rem] overflow-hidden hover:border-white/10 transition-all duration-700 min-h-[380px] md:min-h-[460px] flex flex-col justify-between"
                    >
                        {/* Perforations */}
                        <div className="absolute top-1/2 -left-3 w-6 h-6 bg-[#020202] rounded-full border border-white/5 z-20 group-hover:scale-110 transition-transform" />
                        <div className="absolute top-1/2 -right-3 w-6 h-6 bg-[#020202] rounded-full border border-white/5 z-20 group-hover:scale-110 transition-transform" />

                        <div className="space-y-6">
                            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-neon-blue group-hover:bg-white group-hover:text-black transition-all duration-700 group-hover:scale-110 shadow-lg">
                                <Target size={32} />
                            </div>
                            <div className="space-y-3">
                                <h3 className="text-2xl md:text-4xl font-black font-heading text-white tracking-tight leading-none group-hover:translate-x-2 transition-transform duration-500 italic uppercase">
                                    FOR BRANDS
                                </h3>
                                <p className="text-neon-blue text-[10px] font-black uppercase tracking-[0.3em] leading-tight">
                                    DOMINATE THE HEARTLAND.
                                </p>
                                <p className="text-gray-400 text-sm md:text-base font-medium leading-relaxed pt-2">
                                    Tap into authentic, high-impact youth networks. Scale up hyper-local college and regional influencer campaigns with automated matching, full-scope reporting, campaign tracking, and verified ROI analytics.
                                </p>
                            </div>
                        </div>

                        <div className="pt-8 md:pt-10">
                            <Link to="/contact">
                                <motion.div
                                    whileHover={{ scale: 1.03 }}
                                    whileTap={{ scale: 0.98 }}
                                    className="relative inline-block cursor-pointer"
                                >
                                    <div className="absolute -inset-1 bg-gradient-to-r from-neon-blue to-neon-green rounded-2xl blur opacity-20 group-hover:opacity-60 transition duration-700"></div>
                                    <div className="relative px-8 py-4 bg-black rounded-2xl leading-none flex items-center gap-3 border border-white/10 group-hover:border-neon-blue/40 transition-colors">
                                        <span className="text-white text-sm font-black font-heading uppercase tracking-wider italic">HIRE OUR NETWORK</span>
                                        <div className="p-1 rounded-full bg-neon-blue/20 group-hover:bg-neon-blue transition-colors">
                                            <ArrowRight className="h-3 w-3 text-neon-blue group-hover:text-black" />
                                        </div>
                                    </div>
                                </motion.div>
                            </Link>
                        </div>

                        {/* Background Aura Icon */}
                        <div className="absolute -bottom-10 -right-10 opacity-[0.02] group-hover:opacity-[0.06] transition-all duration-1000 rotate-12 scale-150 pointer-events-none">
                            <Target size={240} />
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
};

export default CreatorsSection;
