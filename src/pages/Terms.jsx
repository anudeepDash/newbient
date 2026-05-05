import React from 'react';
import { motion } from 'framer-motion';
import { Shield, FileText, Scale, Clock } from 'lucide-react';

const Terms = () => {
    return (
        <div className="min-h-screen bg-black pt-32 pb-20 px-6">
            <div className="max-w-4xl mx-auto">
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-16 text-center"
                >
                    <h1 className="text-5xl md:text-7xl font-black italic tracking-tighter text-white mb-6 uppercase">
                        Terms & <span className="text-neon-blue">Conditions</span>
                    </h1>
                    <p className="text-gray-400 text-lg md:text-xl font-medium tracking-tight">
                        Last Updated: May 6, 2026
                    </p>
                </motion.div>

                <div className="space-y-12">
                    <section className="bg-white/5 border border-white/10 rounded-3xl p-8 md:p-12 backdrop-blur-xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-neon-blue/10 blur-[60px] -mr-16 -mt-16 group-hover:bg-neon-blue/20 transition-all duration-700" />
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 rounded-2xl bg-neon-blue/20 flex items-center justify-center text-neon-blue">
                                <Shield size={24} />
                            </div>
                            <h2 className="text-2xl font-black uppercase tracking-wider text-white">1. Acceptance of Terms</h2>
                        </div>
                        <p className="text-gray-400 leading-relaxed text-lg">
                            By accessing or using Newbi Entertainment's services, including our website, events, and community platforms, you agree to be bound by these Terms and Conditions. If you do not agree to all of these terms, do not use our services.
                        </p>
                    </section>

                    <section className="bg-white/5 border border-white/10 rounded-3xl p-8 md:p-12 backdrop-blur-xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-neon-green/10 blur-[60px] -mr-16 -mt-16 group-hover:bg-neon-green/20 transition-all duration-700" />
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 rounded-2xl bg-neon-green/20 flex items-center justify-center text-neon-green">
                                <FileText size={24} />
                            </div>
                            <h2 className="text-2xl font-black uppercase tracking-wider text-white">2. User Conduct</h2>
                        </div>
                        <p className="text-gray-400 leading-relaxed text-lg mb-4">
                            You agree not to engage in any of the following prohibited activities:
                        </p>
                        <ul className="space-y-4 text-gray-400">
                            <li className="flex items-start gap-3">
                                <div className="mt-2 w-1.5 h-1.5 rounded-full bg-neon-green flex-shrink-0" />
                                <span>Copying, distributing, or disclosing any part of the service in any medium.</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <div className="mt-2 w-1.5 h-1.5 rounded-full bg-neon-green flex-shrink-0" />
                                <span>Using any automated system, including robots or spiders, to access the service.</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <div className="mt-2 w-1.5 h-1.5 rounded-full bg-neon-green flex-shrink-0" />
                                <span>Attempting to interfere with, compromise the system integrity or security of our servers.</span>
                            </li>
                        </ul>
                    </section>

                    <section className="bg-white/5 border border-white/10 rounded-3xl p-8 md:p-12 backdrop-blur-xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-neon-pink/10 blur-[60px] -mr-16 -mt-16 group-hover:bg-neon-pink/20 transition-all duration-700" />
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 rounded-2xl bg-neon-pink/20 flex items-center justify-center text-neon-pink">
                                <Scale size={24} />
                            </div>
                            <h2 className="text-2xl font-black uppercase tracking-wider text-white">3. Intellectual Property</h2>
                        </div>
                        <p className="text-gray-400 leading-relaxed text-lg">
                            All content, features, and functionality of Newbi Entertainment, including but not limited to text, graphics, logos, and software, are the exclusive property of Newbi Entertainment and are protected by international copyright, trademark, patent, and other intellectual property laws.
                        </p>
                    </section>

                    <section className="bg-white/5 border border-white/10 rounded-3xl p-8 md:p-12 backdrop-blur-xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-[60px] -mr-16 -mt-16 group-hover:bg-white/20 transition-all duration-700" />
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-white">
                                <Clock size={24} />
                            </div>
                            <h2 className="text-2xl font-black uppercase tracking-wider text-white">4. Termination</h2>
                        </div>
                        <p className="text-gray-400 leading-relaxed text-lg">
                            We may terminate or suspend your access to our services immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.
                        </p>
                    </section>
                </div>

                <motion.div 
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    className="mt-20 text-center border-t border-white/5 pt-12"
                >
                    <p className="text-gray-500 text-sm font-black uppercase tracking-[0.2em]">
                        Contact us at <a href="mailto:legal@newbi.ent" className="text-white hover:text-neon-blue transition-colors">legal@newbi.ent</a> for any questions.
                    </p>
                </motion.div>
            </div>
        </div>
    );
};

export default Terms;
