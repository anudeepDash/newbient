import React from 'react';
import { motion } from 'framer-motion';

const PastClients = () => {
    // Array of client names (placeholders for logos)
    const clients = [
        "Spotify",
        "Red Bull",
        "Levi's",
        "Tinder",
        "Bumble",
        "Monster Energy",
        "Jägermeister",
        "Bacardi",
        "Puma",
        "Vans",
        "MTV",
        "VH1"
    ];

    // Duplicate array to create a seamless infinite loop
    const duplicatedClients = [...clients, ...clients];

    return (
        <section className="py-20 bg-black relative overflow-hidden border-t border-white/5">
            {/* Background elements */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

            <div className="max-w-7xl mx-auto px-4 mb-12 text-center md:text-left md:flex justify-between items-end">
                <div>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-4"
                    >
                        <span className="text-[10px] font-heading font-bold uppercase tracking-widest text-gray-400">Trusted By</span>
                    </motion.div>
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="font-heading text-3xl md:text-4xl font-bold"
                    >
                        Brands & <span className="text-neon-pink">Partners</span>
                    </motion.h2>
                </div>
                <motion.p
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 }}
                    className="text-gray-500 font-medium max-w-sm mt-4 md:mt-0 text-sm md:text-base leading-relaxed"
                >
                    We’ve collaborated with industry leaders to deliver unforgettable campaigns and events.
                </motion.p>
            </div>

            {/* Infinite Marquee */}
            <div className="relative w-full overflow-hidden w-full flex items-center h-32">
                {/* Gradient masks for smooth fade in/out at edges */}
                <div className="absolute left-0 top-0 w-32 md:w-64 h-full bg-gradient-to-r from-black to-transparent z-10 pointer-events-none"></div>
                <div className="absolute right-0 top-0 w-32 md:w-64 h-full bg-gradient-to-l from-black to-transparent z-10 pointer-events-none"></div>

                <div className="flex animate-marquee whitespace-nowrap">
                    {duplicatedClients.map((client, index) => (
                        <div
                            key={index}
                            className="flex-shrink-0 mx-8 md:mx-16 flex items-center justify-center grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all duration-300 w-32 md:w-48"
                        >
                            <span className="text-2xl md:text-4xl font-black font-heading tracking-tighter text-white/80">
                                {client}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes marquee {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
                .animate-marquee {
                    animation: marquee 30s linear infinite;
                    width: max-content;
                }
                .animate-marquee:hover {
                    animation-play-state: paused;
                }
            `}} />
        </section>
    );
};

export default PastClients;
