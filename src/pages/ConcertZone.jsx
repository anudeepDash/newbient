import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Music, Instagram, Zap } from 'lucide-react';

const ConcertZone = () => {
    useEffect(() => {
        const script = document.createElement('script');
        script.src = "https://behold.so/widget/v1.js";
        script.type = "module";
        document.head.appendChild(script);

        return () => {
            document.head.removeChild(script);
        };
    }, []);

    return (
        <div className="min-h-screen bg-[#020202] text-white pt-32 pb-32 px-4 relative overflow-hidden">
            {/* Background Glows */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[10%] right-[-10%] w-[50%] h-[50%] bg-neon-pink/6 rounded-full blur-[150px] animate-pulse" />
                <div className="absolute bottom-[20%] left-[-5%] w-[40%] h-[40%] bg-purple-600/6 rounded-full blur-[150px] animate-pulse delay-1000" />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto">
                {/* Header Container */}
                <div className="flex flex-col items-center text-center mb-20">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 mb-8 backdrop-blur-md"
                    >
                        <Music size={16} className="text-neon-blue" />
                        <span className="text-xs font-heading font-bold uppercase tracking-widest text-gray-300">
                            Live Music & Events
                        </span>
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-4xl md:text-8xl font-black font-heading text-transparent bg-clip-text bg-gradient-to-r from-neon-pink via-white to-purple-500 mb-6 tracking-tight leading-none text-center"
                    >
                        CONCERT <span className="text-white">ZONE.</span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="text-gray-400 max-w-2xl mx-auto text-base md:text-xl font-medium leading-relaxed mb-10"
                    >
                        Experience the energy. Relive the moments. Join the movement.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="flex flex-col sm:flex-row gap-4 justify-center"
                    >
                        <a
                            href="https://www.instagram.com/concert.zone/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center gap-3 h-14 px-8 rounded-2xl font-black font-heading uppercase tracking-widest bg-neon-pink text-black hover:scale-105 active:scale-95 transition-all shadow-[0_0_30px_rgba(255,0,255,0.2)] text-sm"
                        >
                            <Instagram size={18} />
                            Visit Concert.zone
                        </a>
                    </motion.div>
                </div>

                {/* Instagram Feed Widget */}
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="bg-zinc-900/40 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] p-6 md:p-10 shadow-2xl relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 w-80 h-80 bg-neon-pink/5 blur-[100px] -mr-40 -mt-40 pointer-events-none" />

                    <div className="flex items-center gap-4 mb-8 relative z-10">
                        <div className="w-12 h-12 rounded-2xl bg-neon-pink/10 border border-neon-pink/20 flex items-center justify-center">
                            <Instagram size={22} className="text-neon-pink" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black font-heading tracking-tight uppercase">Latest Vibes</h2>
                            <p className="text-gray-500 text-xs font-medium mt-0.5">Live from @concert.zone</p>
                        </div>
                    </div>

                    <div className="w-full relative z-10">
                        <behold-widget feed-id="GIVp2cgj7qbBGl85DK4U"></behold-widget>
                    </div>

                    {/* Bottom CTA */}
                    <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between relative z-10">
                        <div className="flex items-center gap-4">
                            <div className="relative flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neon-pink opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-neon-pink"></span>
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Feed Live</span>
                        </div>
                        <a
                            href="https://www.instagram.com/concert.zone/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-neon-pink hover:text-white transition-colors"
                        >
                            Follow <Zap size={12} />
                        </a>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default ConcertZone;
