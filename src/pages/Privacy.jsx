import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Eye, Lock, Database, Bell, Shield, Info, 
    ArrowRight, MessageSquare, Fingerprint, Award, CreditCard
} from 'lucide-react';
import { Button } from '../components/ui/Button';

const Privacy = () => {
    const [activeSection, setActiveSection] = useState(null);

    const sections = [
        {
            id: 'collection',
            icon: <Eye size={22} className="text-neon-pink" />,
            title: "1. Information We Collect",
            color: "pink",
            bgGlow: "rgba(236,72,153,0.08)",
            content: (
                <div className="space-y-4">
                    <p className="text-gray-300 text-sm leading-relaxed">
                        We collect personal information when you register for an account, apply to campaign briefs, or purchase passes. This includes the following new integration touchpoints:
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                        <div className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl space-y-2 hover:bg-white/[0.04] transition-all">
                            <div className="flex items-center gap-2 text-neon-pink">
                                <Fingerprint size={16} />
                                <h4 className="text-xs font-bold uppercase tracking-wider">Account & OTP Verification</h4>
                            </div>
                            <p className="text-gray-400 text-[11px] leading-relaxed">
                                We collect your name, email address, and phone number. To ensure secure sign-in, we verify numbers via SMS or WhatsApp OTP.
                            </p>
                        </div>
                        <div className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl space-y-2 hover:bg-white/[0.04] transition-all">
                            <div className="flex items-center gap-2 text-neon-blue">
                                <Award size={16} />
                                <h4 className="text-xs font-bold uppercase tracking-wider">Creator Profiles & Referrals</h4>
                            </div>
                            <p className="text-gray-400 text-[11px] leading-relaxed">
                                For creator accounts, we collect social media metrics (Instagram, LinkedIn), follower counts, and associate registrations with unique referral links.
                            </p>
                        </div>
                        <div className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl space-y-2 hover:bg-white/[0.04] transition-all col-span-1 md:col-span-2">
                            <div className="flex items-center gap-2 text-neon-green">
                                <CreditCard size={16} />
                                <h4 className="text-xs font-bold uppercase tracking-wider">Transactional & Booking Data</h4>
                            </div>
                            <p className="text-gray-400 text-[11px] leading-relaxed">
                                During checkout, we record your selected ticket categories, pricing tier, email address for ticket delivery, and payment references (including manual UPI UTR transaction numbers for booking verification).
                            </p>
                        </div>
                    </div>
                </div>
            )
        },
        {
            id: 'usage',
            icon: <MessageSquare size={22} className="text-neon-blue" />,
            title: "2. How We Use Your Data",
            color: "blue",
            bgGlow: "rgba(59,130,246,0.08)",
            content: (
                <div className="space-y-3">
                    <p className="text-gray-300 text-sm leading-relaxed">
                        We process your information to fulfill contracts, verify compliance, and secure our network:
                    </p>
                    <ul className="space-y-2 text-gray-400 text-xs">
                        <li className="flex items-start gap-2.5">
                            <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-neon-blue shrink-0" />
                            <span>Delivering booking passes, guestlist entry QR codes, and notifications via Email, SMS, or WhatsApp.</span>
                        </li>
                        <li className="flex items-start gap-2.5">
                            <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-neon-blue shrink-0" />
                            <span>Validating manual UPI payment transfers using your submitted UTR reference codes to prevent fraud.</span>
                        </li>
                        <li className="flex items-start gap-2.5">
                            <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-neon-blue shrink-0" />
                            <span>Calculating referrals, updating the creator leaderboard, and assessing brand campaign eligibility.</span>
                        </li>
                    </ul>
                </div>
            )
        },
        {
            id: 'security',
            icon: <Lock size={22} className="text-neon-green" />,
            title: "3. Data Security & Storage",
            color: "green",
            bgGlow: "rgba(16,185,129,0.08)",
            content: (
                <p className="text-gray-300 text-sm leading-relaxed">
                    We use Firebase cloud databases and secure hosting. Access verification codes (OTP tokens) are processed in real-time and not stored permanently. Manual payment UTR details are logged securely for transaction audit purposes and are accessible only to authorized administrators during reconciliation.
                </p>
            )
        },
        {
            id: 'sharing',
            icon: <Database size={22} className="text-white" />,
            title: "4. Third-Party Integrations",
            color: "white",
            bgGlow: "rgba(255,255,255,0.04)",
            content: (
                <p className="text-gray-300 text-sm leading-relaxed">
                    We do not sell, rent, or trade your personal information. We securely integrate with verified third-party partners: Firebase Authentication for sign-ins, payment gateways/UPI processors for payments, and automated communication engines for WhatsApp and email dispatch.
                </p>
            )
        },
        {
            id: 'choices',
            icon: <Bell size={22} className="text-neon-pink" />,
            title: "5. Your Rights & Choices",
            color: "pink",
            bgGlow: "rgba(236,72,153,0.08)",
            content: (
                <p className="text-gray-300 text-sm leading-relaxed">
                    You can manage your contact channels, edit your creator profile social links, or request profile deactivation. If you wish to purge your phone number, social handles, or transaction histories, contact us directly.
                </p>
            )
        }
    ];

    const scrollToSection = (id) => {
        const el = document.getElementById(id);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setActiveSection(id);
        }
    };

    return (
        <div className="min-h-screen bg-black pt-32 pb-24 px-6 md:px-12 relative overflow-hidden">
            {/* Background Ambient Glows */}
            <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-neon-pink/5 blur-[150px] pointer-events-none rounded-full" />
            <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-neon-blue/5 blur-[180px] pointer-events-none rounded-full" />

            <div className="max-w-4xl mx-auto space-y-16 relative z-10">
                {/* Hero Header */}
                <motion.div 
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center space-y-6"
                >
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-widest text-zinc-400">
                        <Shield size={10} className="text-neon-pink" />
                        <span>Data Protection Commitment</span>
                    </div>
                    
                    <h1 className="text-4xl sm:text-6xl md:text-7xl font-black font-heading tracking-tight text-white leading-none">
                        Privacy <span className="text-neon-pink">Policy</span>
                    </h1>
                    
                    <p className="text-gray-500 text-xs sm:text-sm font-bold uppercase tracking-widest">
                        Last Updated: June 10, 2026
                    </p>

                    <div className="mt-8 p-6 bg-zinc-950/50 border border-white/[0.08] backdrop-blur-3xl rounded-[2rem] max-w-2xl mx-auto text-left shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-neon-pink/5 blur-2xl" />
                        <p className="text-gray-400 text-xs sm:text-sm leading-relaxed">
                            Welcome to <span className="text-white font-bold">Newbi Entertainment & Marketing LLP</span>. This privacy notice describes how we collect, process, and protect your information across our website portal, ticketing systems, and creator dashboard.
                        </p>
                    </div>
                </motion.div>

                {/* Quick Navigation Pills */}
                <div className="flex flex-wrap justify-center gap-2.5 pb-4 border-b border-white/5 select-none">
                    {sections.map(sec => (
                        <button
                            key={sec.id}
                            onClick={() => scrollToSection(sec.id)}
                            className={`px-4 py-2 rounded-xl text-[9px] font-bold uppercase tracking-wider transition-all border ${
                                activeSection === sec.id 
                                    ? "bg-white text-black border-white" 
                                    : "bg-white/5 text-zinc-400 border-white/5 hover:border-white/10 hover:text-white"
                            }`}
                        >
                            {sec.title.split('. ')[1]}
                        </button>
                    ))}
                </div>

                {/* Main Content Cards */}
                <div className="space-y-8">
                    {sections.map((section, idx) => (
                        <motion.section
                            id={section.id}
                            key={section.id}
                            initial={{ opacity: 0, y: 40 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: '-100px' }}
                            transition={{ duration: 0.6, delay: idx * 0.05 }}
                            onViewportEnter={() => setActiveSection(section.id)}
                            className="bg-zinc-950/45 border border-white/[0.08] backdrop-blur-3xl rounded-[2.5rem] p-8 md:p-10 shadow-2xl relative overflow-hidden group hover:border-white/15 transition-all duration-500"
                        >
                            {/* Decorative Radial Glow */}
                            <div 
                                className="absolute top-0 right-0 w-48 h-48 blur-[80px] -mr-24 -mt-24 pointer-events-none group-hover:scale-110 transition-transform duration-700" 
                                style={{ backgroundColor: section.bgGlow }}
                            />
                            
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
                                    {section.icon}
                                </div>
                                <h2 className="text-xl md:text-2xl font-extrabold font-heading text-white tracking-tight">
                                    {section.title}
                                </h2>
                            </div>

                            <div className="relative z-10 text-gray-400 font-medium">
                                {section.content}
                            </div>
                        </motion.section>
                    ))}
                </div>

                {/* Footer Section */}
                <motion.div 
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    className="mt-20 text-center border-t border-white/5 pt-12"
                >
                    <div className="inline-flex flex-col items-center gap-4">
                        <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.25em]">
                            For privacy inquiries or data requests, contact us
                        </p>
                        <a 
                            href="mailto:privacy@newbi.live" 
                            className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white hover:text-black border border-white/10 text-xs font-bold text-white transition-all shadow-xl"
                        >
                            privacy@newbi.live
                        </a>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default Privacy;
