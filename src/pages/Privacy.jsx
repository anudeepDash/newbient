import React from 'react';
import { motion } from 'framer-motion';
import { Lock, Eye, Database, Bell } from 'lucide-react';

const Privacy = () => {
    return (
        <div className="min-h-screen bg-black pt-32 pb-20 px-6">
            <div className="max-w-4xl mx-auto">
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-16 text-center"
                >
                    <h1 className="text-5xl md:text-7xl font-black italic tracking-tighter text-white mb-6 uppercase">
                        Privacy <span className="text-neon-pink">Policy</span>
                    </h1>
                    <p className="text-gray-400 text-lg md:text-xl font-medium tracking-tight">
                        Last Updated: May 6, 2026
                    </p>
                    <div className="mt-8 p-6 bg-white/5 border border-white/10 rounded-2xl inline-block max-w-2xl text-center">
                        <p className="text-gray-400 text-sm md:text-base leading-relaxed">
                            This Privacy Policy describes how <span className="text-white font-bold text-neon-pink">Newbi Entertainment & Marketing LLP</span> collects, uses, and shares your personal information when you visit or make a purchase from our website.
                        </p>
                    </div>

                </motion.div>

                <div className="space-y-12">
                    <section className="bg-white/5 border border-white/10 rounded-3xl p-8 md:p-12 backdrop-blur-xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-neon-pink/10 blur-[60px] -mr-16 -mt-16 group-hover:bg-neon-pink/20 transition-all duration-700" />
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 rounded-2xl bg-neon-pink/20 flex items-center justify-center text-neon-pink">
                                <Eye size={24} />
                            </div>
                            <h2 className="text-2xl font-black uppercase tracking-wider text-white">1. Information Collection</h2>
                        </div>
                        <p className="text-gray-400 leading-relaxed text-lg mb-4">
                            We collect information you provide directly to us when you:
                        </p>
                        <ul className="space-y-4 text-gray-400">
                            <li className="flex items-start gap-3">
                                <div className="mt-2 w-1.5 h-1.5 rounded-full bg-neon-pink flex-shrink-0" />
                                <span>Register for an account or join our community.</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <div className="mt-2 w-1.5 h-1.5 rounded-full bg-neon-pink flex-shrink-0" />
                                <span>Purchase tickets or services through our platform.</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <div className="mt-2 w-1.5 h-1.5 rounded-full bg-neon-pink flex-shrink-0" />
                                <span>Contact our support team or participate in surveys.</span>
                            </li>
                        </ul>
                    </section>

                    <section className="bg-white/5 border border-white/10 rounded-3xl p-8 md:p-12 backdrop-blur-xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-neon-blue/10 blur-[60px] -mr-16 -mt-16 group-hover:bg-neon-blue/20 transition-all duration-700" />
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 rounded-2xl bg-neon-blue/20 flex items-center justify-center text-neon-blue">
                                <Lock size={24} />
                            </div>
                            <h2 className="text-2xl font-black uppercase tracking-wider text-white">2. Data Security</h2>
                        </div>
                        <p className="text-gray-400 leading-relaxed text-lg">
                            We implement commercially reasonable security measures designed to protect your information from unauthorized access, disclosure, or destruction. However, no method of transmission over the internet or method of electronic storage is 100% secure.
                        </p>
                    </section>

                    <section className="bg-white/5 border border-white/10 rounded-3xl p-8 md:p-12 backdrop-blur-xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-neon-green/10 blur-[60px] -mr-16 -mt-16 group-hover:bg-neon-green/20 transition-all duration-700" />
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 rounded-2xl bg-neon-green/20 flex items-center justify-center text-neon-green">
                                <Database size={24} />
                            </div>
                            <h2 className="text-2xl font-black uppercase tracking-wider text-white">3. Information Sharing</h2>
                        </div>
                        <p className="text-gray-400 leading-relaxed text-lg">
                            We do not sell your personal information. We may share information with third-party vendors who perform services on our behalf, such as payment processing, data analysis, and marketing assistance.
                        </p>
                    </section>

                    <section className="bg-white/5 border border-white/10 rounded-3xl p-8 md:p-12 backdrop-blur-xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-[60px] -mr-16 -mt-16 group-hover:bg-white/20 transition-all duration-700" />
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-white">
                                <Bell size={24} />
                            </div>
                            <h2 className="text-2xl font-black uppercase tracking-wider text-white">4. Your Choices</h2>
                        </div>
                        <p className="text-gray-400 leading-relaxed text-lg">
                            You can update your account information at any time. You may also opt out of receiving promotional communications from us by following the instructions in those communications or by contacting us directly.
                        </p>
                    </section>
                </div>

                <motion.div 
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    className="mt-20 text-center border-t border-white/5 pt-12"
                >
                    <p className="text-gray-500 text-sm font-black uppercase tracking-[0.2em]">
                        For privacy concerns, contact <a href="mailto:privacy@newbi.ent" className="text-white hover:text-neon-pink transition-colors">privacy@newbi.ent</a>
                    </p>
                </motion.div>
            </div>
        </div>
    );
};

export default Privacy;
