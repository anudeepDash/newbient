import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, Zap, Target, Star } from 'lucide-react';
import logo from '../../assets/logo.png';

const Hero = () => {
    return (
        <section className="relative min-h-screen flex flex-col justify-center overflow-hidden pt-32 md:pt-40 pb-20 bg-[#020202]">
            {/* Immersive Background Effects */}
            <div className="absolute inset-0 z-0">
                {/* Dynamic Glows */}
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-neon-green/10 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-neon-blue/10 rounded-full blur-[120px] animate-pulse delay-700" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-gradient-radial from-transparent via-black/40 to-black z-10" />

                {/* Animated Grid / Mesh Pattern */}
                <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)', backgroundSize: '60px 60px' }}></div>

                {/* Abstract Glass Elements with Icons */}
                <motion.div
                    animate={{ 
                        y: [0, -20, 0],
                        rotate: [0, 5, 0]
                    }}
                    transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute top-[18%] right-[10%] w-56 h-56 bg-white/[0.01] border border-white/5 backdrop-blur-3xl rounded-[3.5rem] -rotate-12 hidden md:flex items-center justify-center group"
                >
                    <div className="opacity-20 group-hover:opacity-100 transition-opacity duration-700">
                        <Zap className="text-neon-green w-16 h-16" />
                    </div>
                </motion.div>

                <motion.div
                    animate={{ 
                        y: [0, 20, 0],
                        rotate: [45, 40, 45]
                    }}
                    transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                    className="absolute bottom-[25%] left-[8%] w-48 h-48 bg-white/[0.01] border border-white/5 backdrop-blur-2xl rounded-[3rem] rotate-[45deg] hidden md:flex items-center justify-center group"
                >
                    <div className="opacity-20 group-hover:opacity-100 transition-opacity duration-700 -rotate-[45deg]">
                        <Star className="text-neon-blue w-14 h-14" />
                    </div>
                </motion.div>

                <motion.div
                    animate={{ 
                        scale: [1, 1.1, 1],
                        opacity: [0.1, 0.2, 0.1]
                    }}
                    transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute top-[40%] left-[15%] w-32 h-32 bg-neon-pink/10 rounded-full blur-[60px] hidden md:block"
                />
            </div>

            {/* Content Container */}
            <div className="relative z-10 w-full max-w-[1400px] mx-auto px-4 md:px-8 text-center pt-0 md:pt-4 pb-32">
                {/* Floating Logo with Aura */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="mb-8 md:mb-12 relative flex justify-center"
                >
                    <div className="absolute inset-0 bg-neon-green/20 blur-[60px] rounded-full scale-75 animate-pulse"></div>
                    <img src={logo} alt="NewBi Entertainment" className="h-20 md:h-40 lg:h-48 w-auto relative z-10 drop-shadow-[0_0_20px_rgba(57,255,20,0.3)]" />
                </motion.div>

                {/* Cyberpunk Title */}
                <div className="mb-8 space-y-4">
                    <motion.div
                        initial={{ opacity: 0, x: -30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8, delay: 0.3 }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-4 whitespace-nowrap"
                    >
                        <div className="w-1.5 h-1.5 rounded-full bg-neon-pink animate-ping shrink-0"></div>
                        <span className="text-[9px] font-heading font-black uppercase tracking-[0.2em] text-gray-400">College Activations • Marketing • Events</span>
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.4 }}
                        className="font-heading text-4xl md:text-8xl lg:text-9xl font-black tracking-tighter leading-[0.85] text-white italic"
                    >
                        PULSE OF <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-green via-white to-neon-blue not-italic">YOUTH.</span>
                    </motion.h1>
                </div>

                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.5 }}
                    className="text-base md:text-2xl text-gray-400 mb-12 md:mb-16 max-w-3xl mx-auto font-medium leading-relaxed px-4"
                >
                    India's leading specialized agency for <span className="text-white">College Activations</span>, high-impact marketing, and <span className="text-white">Revolutionary Events</span>.
                </motion.p>

                {/* Premium Buttons */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.6 }}
                    className="flex flex-col sm:flex-row items-center justify-center gap-4 md:gap-8 px-6"
                >
                    <a
                        href="/contact"
                        className="group relative w-full sm:w-auto h-14 md:h-20 px-8 md:px-12 flex items-center justify-center bg-white text-black font-black font-heading uppercase tracking-[0.2em] text-[10px] md:text-sm rounded-2xl transition-all duration-300 hover:scale-105 active:scale-95 shadow-[0_0_50px_rgba(255,255,255,0.2)]"
                    >
                        Contact Us
                        <ArrowRight className="ml-3 w-4 h-4 md:w-5 md:h-5 group-hover:translate-x-1 transition-transform" />
                    </a>

                    <a
                        href="/community-join"
                        className="group relative w-full sm:w-auto h-14 md:h-20 px-8 md:px-12 flex items-center justify-center bg-zinc-900 border border-white/10 text-white font-black font-heading uppercase tracking-[0.2em] text-[10px] md:text-sm rounded-2xl transition-all duration-300 hover:border-neon-blue/50 hover:shadow-[0_0_40px_rgba(0,255,255,0.1)] overflow-hidden"
                    >
                        <span className="relative z-10">Join the Tribe</span>
                        <div className="absolute inset-0 bg-gradient-to-r from-neon-blue/0 via-neon-blue/5 to-neon-blue/0 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </a>
                </motion.div>
            </div>

            {/* High-Tech Scroll Indicator */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.5, duration: 1 }}
                className="absolute bottom-4 md:bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 md:gap-4 hidden lg:flex"
            >
                <div className="flex flex-col items-center gap-1">
                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-500">EXPLORE SPACE</span>
                    <div className="w-px h-10 md:h-16 bg-gradient-to-b from-neon-green via-neon-green/20 to-transparent relative">
                        <motion.div 
                            animate={{ y: [0, 24, 0] }}
                            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                            className="absolute top-0 left-[-1px] w-[3px] h-4 bg-neon-green blur-[1px] rounded-full"
                        />
                    </div>
                </div>
            </motion.div>
        </section>
    );
};

export default Hero;
