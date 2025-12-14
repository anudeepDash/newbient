import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, MessageSquare, Linkedin, Instagram } from 'lucide-react';
import { Button } from '../ui/Button';

const CallToAction = () => {
    return (
        <section className="py-24 bg-black relative overflow-hidden flex flex-col items-center justify-center border-t border-white/5" id="contact">

            <div className="max-w-5xl mx-auto px-4 text-center z-10">
                <motion.h2
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-4xl md:text-6xl font-black font-heading tracking-tight mb-4"
                >
                    Empowering Events, <br />
                    <span className="text-gray-400">Inspiring Lives</span>
                </motion.h2>

                <motion.p
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 }}
                    className="text-neon-green font-mono mb-12"
                >
                    &gt;&gt; Event Production + Artist Bookings + Promotions
                </motion.p>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.4 }}
                    className="flex flex-col md:flex-row items-center justify-center gap-6"
                >
                    <a href="https://wa.me/919304372773" target="_blank" rel="noopener noreferrer">
                        <Button variant="secondary" className="px-8 py-4 text-lg rounded-full flex items-center gap-2">
                            <MessageSquare size={20} /> WhatsApp
                        </Button>
                    </a>

                    <a href="https://www.instagram.com/newbi_ent" target="_blank" rel="noopener noreferrer">
                        <Button variant="primary" className="px-8 py-4 text-lg rounded-full flex items-center gap-2">
                            <Instagram size={20} /> Instagram
                        </Button>
                    </a>

                    <a href="https://www.linkedin.com/company/newbi-ent/" target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" className="px-8 py-4 text-lg border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white rounded-full flex items-center gap-2">
                            <Linkedin size={20} /> LinkedIn
                        </Button>
                    </a>
                </motion.div>
            </div>

            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-neon-green/5 via-transparent to-transparent opacity-50" />
        </section >
    );
};

export default CallToAction;
