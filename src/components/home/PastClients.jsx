import React from 'react';
import { motion } from 'framer-motion';

const PastClients = () => {
    const clients = [
        "Spotify", "Red Bull", "Levi's", "Tinder", "Bumble", 
        "Monster Energy", "Jägermeister", "Bacardi", "Puma", 
        "Vans", "MTV", "VH1"
    ];

    const duplicatedClients = [...clients, ...clients, ...clients];

    return (
        <section className="py-24 bg-[#020202] relative overflow-hidden border-t border-white/5">
            <div className="max-w-7xl mx-auto px-4 mb-20">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                    <div>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-4"
                        >
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Industry Trust</span>
                        </motion.div>
                        <motion.h2
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="font-heading text-4xl md:text-5xl font-black text-white tracking-tight"
                        >
                            GLOBAL <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-500">PARTNERS.</span>
                        </motion.h2>
                    </div>
                    <motion.p
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        className="text-gray-500 font-bold max-w-sm text-xs uppercase tracking-widest leading-relaxed"
                    >
                        Collaborating with the world's most disruptive brands to define youth culture.
                    </motion.p>
                </div>
            </div>

            {/* Premium Infinite Marquee */}
            <div className="relative w-full overflow-hidden flex items-center h-40">
                <div className="absolute left-0 top-0 w-32 md:w-96 h-full bg-gradient-to-r from-[#020202] to-transparent z-10 pointer-events-none"></div>
                <div className="absolute right-0 top-0 w-32 md:w-96 h-full bg-gradient-to-l from-[#020202] to-transparent z-10 pointer-events-none"></div>

                <div className="flex animate-marquee whitespace-nowrap gap-12 md:gap-24 items-center">
                    {duplicatedClients.map((client, index) => (
                        <div
                            key={index}
                            className="flex-shrink-0 flex items-center justify-center grayscale opacity-20 hover:grayscale-0 hover:opacity-100 transition-all duration-700 cursor-default group"
                        >
                            <span className="text-3xl md:text-6xl font-black font-heading tracking-tighter text-white group-hover:scale-110 transition-transform duration-500">
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
                    100% { transform: translateX(-33.33%); }
                }
                .animate-marquee {
                    animation: marquee 40s linear infinite;
                    width: max-content;
                }
            `}} />
        </section>
    );
};

export default PastClients;
