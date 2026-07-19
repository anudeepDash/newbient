import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Target, ArrowRight, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

const CreatorsSection = () => {
    return (
        <section id="creators-brands" className="py-16 md:py-24 bg-dark relative px-4 overflow-hidden border-t border-white/5">
            {/* Background Atmosphere Glows */}

            <div className="max-w-7xl mx-auto relative z-10">
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-8">
                    <div className="max-w-4xl">
                        <motion.h2
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="font-heading text-4xl md:text-6xl font-extrabold mb-6 text-white tracking-tight whitespace-nowrap"
                        >
                            Creative <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-neon-green">Powerhouse</span>
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
                        className="group relative bg-zinc-900/35 backdrop-blur-3xl border border-white/5 p-6 md:p-14 rounded-3xl overflow-hidden hover:border-white/10 transition-[background-color,border-color,box-shadow] duration-700 min-h-[380px] md:min-h-[460px] flex flex-col justify-between"
                    >
                        <div className="space-y-6">
                            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-neon-green group-hover:bg-white group-hover:text-black transition-all duration-700 group-hover:scale-110 shadow-lg">
                                <Users size={32} />
                            </div>
                            <div className="space-y-3">
                                <h3 className="text-2xl md:text-4xl font-extrabold font-heading text-white tracking-tight leading-none group-hover:translate-x-2 transition-transform duration-500">
                                    For Creators
                                </h3>
                                <p className="text-neon-green text-xs font-semibold tracking-wider leading-tight">
                                    Unleash Your Influence.
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
                                    <div className="absolute -inset-1 bg-gradient-to-r from-neon-green to-white/10 rounded-2xl blur opacity-20 group-hover:opacity-60 transition duration-700"></div>
                                    <div className="relative px-8 py-4 bg-black rounded-2xl leading-none flex items-center gap-3 border border-white/10 group-hover:border-neon-green/40 transition-colors">
                                        <span className="text-white text-sm font-bold font-heading uppercase tracking-wider">Apply As Creator</span>
                                        <div className="p-1 rounded-full bg-neon-green/20 group-hover:bg-neon-green transition-colors">
                                            <ArrowRight className="h-3 w-3 text-neon-green group-hover:text-black" />
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
                        className="group relative bg-zinc-900/35 backdrop-blur-3xl border border-white/5 p-6 md:p-14 rounded-3xl overflow-hidden hover:border-white/10 transition-[background-color,border-color,box-shadow] duration-700 min-h-[380px] md:min-h-[460px] flex flex-col justify-between"
                    >
                        <div className="space-y-6">
                            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white group-hover:bg-white group-hover:text-black transition-all duration-700 group-hover:scale-110 shadow-lg">
                                <Target size={32} />
                            </div>
                            <div className="space-y-3">
                                <h3 className="text-2xl md:text-4xl font-extrabold font-heading text-white tracking-tight leading-none group-hover:translate-x-2 transition-transform duration-500">
                                    For Brands
                                </h3>
                                <p className="text-neon-green text-xs font-semibold tracking-wider leading-tight">
                                    Dominate The Heartland.
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
                                    <div className="absolute -inset-1 bg-gradient-to-r from-neon-green to-white/10 rounded-2xl blur opacity-20 group-hover:opacity-60 transition duration-700"></div>
                                    <div className="relative px-8 py-4 bg-black rounded-2xl leading-none flex items-center gap-3 border border-white/10 group-hover:border-neon-green/40 transition-colors">
                                        <span className="text-white text-sm font-bold font-heading uppercase tracking-wider">Hire Our Network</span>
                                        <div className="p-1 rounded-full bg-neon-green/20 group-hover:bg-neon-green transition-colors">
                                            <ArrowRight className="h-3 w-3 text-neon-green group-hover:text-black" />
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
