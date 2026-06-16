import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Zap, Star } from 'lucide-react';
import logo from '../../assets/logo.png';

const Hero = () => {
    return (
        <section className="relative min-h-screen flex flex-col justify-center overflow-hidden pt-20 md:pt-40 pb-16 md:pb-24 bg-dark">
            {/* Immersive Background Effects */}
            <div className="absolute inset-0 z-0">
                {/* Subtle Ambient Spotlights */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-gradient-radial from-transparent via-black/45 to-black z-10" />

                {/* Subtle Modern Mesh Grid */}
                <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)', backgroundSize: '60px 60px' }}></div>

                {/* Abstract Glass Elements with Icons (Hidden on Mobile) */}
                <motion.div
                    animate={{ 
                        y: [0, -20, 0],
                        rotate: [0, 5, 0]
                    }}
                    transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute top-[18%] right-[10%] w-56 h-56 bg-white/[0.01] border border-white/5 backdrop-blur-3xl rounded-3xl -rotate-12 hidden md:flex items-center justify-center group"
                >
                    <div className="opacity-20 group-hover:opacity-100 transition-opacity duration-700">
                        <Zap className="text-white/20 w-16 h-16 " />
                    </div>
                </motion.div>

                <motion.div
                    animate={{ 
                        y: [0, 20, 0],
                        rotate: [45, 40, 45]
                    }}
                    transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                    className="absolute bottom-[25%] left-[8%] w-48 h-48 bg-white/[0.01] border border-white/5 backdrop-blur-2xl rounded-3xl rotate-[45deg] hidden md:flex items-center justify-center group"
                >
                    <div className="opacity-20 group-hover:opacity-100 transition-opacity duration-700 -rotate-[45deg]">
                        <Star className="text-white/20 w-14 h-14 " />
                    </div>
                </motion.div>
            </div>

            {/* Content Container */}
            <div className="relative z-10 w-full max-w-[1400px] mx-auto px-4 sm:px-6 md:px-8 text-center pt-0 md:pt-4 pb-16 md:pb-20">
                {/* Brand Logo with Premium Glow */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="mb-8 md:mb-12 relative flex justify-center"
                >
                    <img src={logo} alt="NewBi Entertainment" className="h-24 md:h-40 w-auto relative z-10 filter drop-shadow-[0_10px_20px_rgba(255,255,255,0.05)]" />
                </motion.div>

                {/* Sophisticated Display Title */}
                <div className="space-y-4 mb-6 overflow-visible">
                    <motion.h1
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
                        className="font-heading text-[clamp(2.5rem,10vw,6rem)] sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-black tracking-tight leading-none text-white md:whitespace-nowrap overflow-visible select-none py-2"
                    >
                        The Pulse of <br className="md:hidden" /><span className="bg-gradient-to-r from-white via-neutral-100 to-gray-400 bg-clip-text text-transparent">Youth.</span>
                    </motion.h1>
                </div>

                {/* Refined Description */}
                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1, delay: 0.4, ease: "easeOut" }}
                    className="text-base sm:text-lg md:text-xl text-gray-400 max-w-2xl mx-auto font-medium leading-relaxed mb-10 px-4"
                >
                    India's leading specialized agency building premium experiences, high-impact college activations, and revolutionary digital campaigns.
                </motion.p>

                {/* Actions */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
                    className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10 px-6 sm:px-0 w-full"
                >
                    <a
                        href="/contact"
                        className="group relative w-full sm:w-auto h-[56px] md:h-16 px-10 flex items-center justify-center bg-white text-black font-bold uppercase tracking-[0.2em] text-sm md:text-base rounded-xl transition-all duration-300 hover:bg-neutral-100 hover:scale-[1.02] active:scale-95 shadow-xl"
                    >
                        CONTACT US
                        <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </a>

                    <a
                        href="/community"
                        className="group relative w-full sm:w-auto h-[56px] md:h-16 px-10 flex items-center justify-center bg-slate-900/40 border border-white/10 text-white font-bold uppercase tracking-[0.2em] text-[10px] md:text-xs rounded-xl transition-all duration-300 hover:border-white/20 hover:bg-slate-900/60 active:scale-95 shadow-inner"
                    >
                        JOIN OUR COMMUNITY
                    </a>
                </motion.div>
            </div>

            {/* Premium Minimalist Scroll Cue */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2, duration: 1 }}
                className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none"
            >
                <span className="text-[9px] font-black uppercase tracking-[0.4em] text-gray-500">SCROLL TO EXPLORE</span>
                <div className="w-px h-10 bg-gradient-to-b from-white/30 via-white/10 to-transparent relative">
                    <motion.div 
                        animate={{ y: [0, 16, 0] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute top-0 left-[-1px] w-[3px] h-3 bg-white/60 rounded-full"
                    />
                </div>
            </motion.div>
        </section>
    );
};

export default Hero;
