import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, MessageSquare, Linkedin, Instagram } from 'lucide-react';
import { Button } from '../ui/Button';

const CallToAction = () => {
    return (
        <section className="py-40 bg-[#020202] relative overflow-hidden flex flex-col items-center justify-center border-t border-white/5" id="contact">
            {/* High-Impact Background */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-gradient-radial from-neon-green/10 via-transparent to-transparent opacity-50 animate-pulse" />
                <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            </div>

            <div className="max-w-6xl mx-auto px-4 text-center relative z-10">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl mb-12"
                >
                    <div className="w-2 h-2 rounded-full bg-neon-green animate-ping" />
                    <span className="text-xs font-black uppercase tracking-[0.4em] text-white">Join the Movement</span>
                </motion.div>

                <motion.h2
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-5xl md:text-8xl lg:text-9xl font-black font-heading tracking-tighter leading-[0.8] mb-12 text-white"
                >
                    LET'S CREATE <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-400 to-gray-800">HISTORY.</span>
                </motion.h2>

                <motion.p
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    className="text-gray-400 max-w-xl mx-auto mb-16 text-lg font-medium leading-relaxed"
                >
                    Ready to disrupt the college landscape or join India's most energetic community? Connect with us now.
                </motion.p>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 }}
                    className="flex flex-col md:flex-row items-center justify-center gap-6"
                >
                    <a 
                        href="https://wa.me/919304372773" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="group relative h-16 px-10 flex items-center justify-center bg-white text-black font-black font-heading uppercase tracking-widest text-sm rounded-2xl transition-all duration-300 hover:scale-105 active:scale-95 shadow-[0_0_40px_rgba(255,255,255,0.2)]"
                    >
                        <MessageSquare className="mr-3 w-5 h-5" />
                        Message Us
                    </a>

                    <div className="flex gap-4">
                        <a 
                            href="https://www.instagram.com/newbi_ent" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="w-16 h-16 rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-center text-white hover:border-neon-pink hover:text-neon-pink transition-all duration-300"
                        >
                            <Instagram size={24} />
                        </a>
                        <a 
                            href="https://www.linkedin.com/company/newbi-ent/" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="w-16 h-16 rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-center text-white hover:border-white hover:text-white transition-all duration-300"
                        >
                            <Linkedin size={24} />
                        </a>
                    </div>
                </motion.div>
            </div>
        </section >
    );
};

export default CallToAction;
