import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, MessageSquare, Linkedin, Instagram } from 'lucide-react';
import { Button } from '../ui/Button';

const CallToAction = () => {
    return (
        <section className="py-10 md:py-16 bg-gray-50 dark:bg-dark transition-colors duration-300 relative overflow-hidden flex flex-col items-center justify-center border-t border-black/10 dark:border-white/5" id="contact">
            {/* High-Impact Background */}
            <div className="absolute inset-0 z-0">
                <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-black/10 dark:via-white/10 to-transparent" />
            </div>

            <div className="max-w-6xl mx-auto px-4 md:px-6 text-center relative z-10 w-full">


                <motion.h2
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-6xl md:text-8xl lg:text-9xl font-black font-heading tracking-tighter leading-none md:leading-[0.8] mb-6 md:mb-8 text-gray-900 dark:text-white"
                >
                    Let's Create <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-black to-neon-green dark:from-white dark:to-neon-green">History</span>
                </motion.h2>

                <motion.p
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    className="text-gray-600 dark:text-gray-400 max-w-xl mx-auto mb-8 md:mb-10 text-base md:text-lg font-medium leading-relaxed"
                >
                    Ready to disrupt the college landscape or join India's most energetic community? Connect with us now.
                </motion.p>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 }}
                    className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-6 w-full"
                >
                    <a 
                        href="https://wa.me/919304372773" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="group relative w-full md:w-auto h-16 px-10 flex items-center justify-center bg-black text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200 font-black font-heading uppercase tracking-widest text-sm rounded-2xl transition-all duration-300 hover:scale-[1.02] md:hover:scale-105 active:scale-95 shadow-xl"
                    >
                        <MessageSquare className="mr-3 w-5 h-5 text-neon-green" />
                        Message Us
                    </a>

                    <div className="flex w-full md:w-auto gap-4">
                        <a 
                            href="https://www.instagram.com/newbi.live" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex-1 md:w-16 h-16 rounded-2xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 flex items-center justify-center text-gray-900 dark:text-white hover:border-neon-pink hover:text-neon-pink transition-all duration-300 shadow-sm"
                        >
                            <Instagram size={24} />
                        </a>
                        <a 
                            href="https://www.linkedin.com/company/newbi-ent/" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex-1 md:w-16 h-16 rounded-2xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 flex items-center justify-center text-gray-900 dark:text-white hover:border-neon-blue hover:text-neon-blue transition-all duration-300 shadow-sm"
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
