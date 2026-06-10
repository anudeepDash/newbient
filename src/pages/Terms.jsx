import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
    Shield, Scale, FileText, Gavel, CreditCard, 
    AlertCircle, ExternalLink, RefreshCw, Clock, Key, Users, AlertTriangle
} from 'lucide-react';

const Terms = () => {
    const [activeSection, setActiveSection] = useState(null);

    const termsList = [
        {
            icon: <Key size={22} className="text-neon-blue" />,
            title: "1. Account Security & Verification",
            color: "blue",
            bgGlow: "rgba(59,130,246,0.06)",
            content: "You are responsible for keeping your account details accurate. To register or perform transactions, you must verify your phone number via SMS or WhatsApp OTP. Bypassing OTP systems or using virtual/throwaway numbers is strictly prohibited and will result in account termination."
        },
        {
            icon: <CreditCard size={22} className="text-neon-green" />,
            title: "2. Booking Payments & UTR Matching",
            color: "green",
            bgGlow: "rgba(16,185,129,0.06)",
            content: "When using manual UPI checkout, you must provide the exact 12-digit UTR (Transaction ID) within the payment step. Submitting false, expired, or duplicate UTR codes constitutes fraud and will result in the immediate cancellation of your booking without refund, and potential suspension of your profile."
        },
        {
            icon: <Users size={22} className="text-neon-pink" />,
            title: "3. Creator Referrals & Leaderboard Rules",
            color: "pink",
            bgGlow: "rgba(236,72,153,0.06)",
            content: "The Referral Program is designed for genuine creators. Any manipulation of referrals—including registering duplicate accounts, using bot networks, or presenting invalid social handles (Instagram/LinkedIn)—will result in disqualification from the leaderboard and the removal of referral rewards."
        },
        {
            icon: <FileText size={22} className="text-white" />,
            title: "4. Intellectual Property Rights",
            color: "white",
            bgGlow: "rgba(255,255,255,0.03)",
            content: "All content, designs, graphics, code, and interfaces on the website and the services are proprietary to Newbi Entertainment. You may not copy, scrape, modify, or repurpose any assets without our express written consent."
        },
        {
            icon: <Scale size={22} className="text-neon-blue" />,
            title: "5. Information Accuracy Warranty",
            color: "blue",
            bgGlow: "rgba(59,130,246,0.06)",
            content: "While we strive for accurate details regarding events and creator campaigns, neither we nor any third parties guarantee the complete accuracy, timeliness, or performance of site listings. Listings are subject to modifications without notice."
        },
        {
            icon: <AlertTriangle size={22} className="text-neon-green" />,
            title: "6. Prohibited Activities",
            color: "green",
            bgGlow: "rgba(16,185,129,0.06)",
            content: "You agree not to use our systems for unlawful purposes, to host spam, or to attack our API endpoints. Disrupting services for other users will result in immediate bans and potential legal reports to local cyber cells."
        },
        {
            icon: <ExternalLink size={22} className="text-neon-pink" />,
            title: "7. Third-Party Links & Portal Integration",
            color: "pink",
            bgGlow: "rgba(236,72,153,0.06)",
            content: "Our services might redirect you to external payment processors, social sites, or map coordinates. We are not responsible for the privacy practices, content, or transaction compliance of these external portals."
        },
        {
            icon: <RefreshCw size={22} className="text-white" />,
            title: "8. Refunds & Cancellations",
            color: "white",
            bgGlow: "rgba(255,255,255,0.03)",
            content: "Bookings and tickets are generally non-refundable unless an event is officially cancelled by the organizers. If you are eligible for a refund, it will be processed through the original payment medium within our stipulated window (typically 5-7 business days)."
        },
        {
            icon: <Clock size={22} className="text-neon-blue" />,
            title: "9. Force Majeure & Cancellations",
            color: "blue",
            bgGlow: "rgba(59,130,246,0.06)",
            content: "Neither party will be liable for failures to perform duties under these terms due to extreme acts of nature, pandemics, strikes, power outages, or other events beyond reasonable control."
        },
        {
            icon: <Gavel size={22} className="text-neon-green" />,
            title: "10. Governing Law & Jurisdictional Claims",
            color: "green",
            bgGlow: "rgba(16,185,129,0.06)",
            content: "These terms and all related claims will be governed by the laws of India. Any litigation or legal filings must be processed through the courts of our registered corporate location."
        }
    ];

    const scrollToSection = (idx) => {
        const el = document.getElementById(`term-${idx}`);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setActiveSection(idx);
        }
    };

    return (
        <div className="min-h-screen bg-black pt-32 pb-24 px-6 md:px-12 relative overflow-hidden">
            {/* Background Ambient Glows */}
            <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-neon-blue/5 blur-[150px] pointer-events-none rounded-full" />
            <div className="absolute bottom-0 left-1/4 w-[600px] h-[600px] bg-neon-green/5 blur-[180px] pointer-events-none rounded-full" />

            <div className="max-w-4xl mx-auto space-y-16 relative z-10">
                {/* Hero Header */}
                <motion.div 
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center space-y-6"
                >
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-widest text-zinc-400">
                        <Scale size={10} className="text-neon-blue" />
                        <span>LEGALLY BINDING AGREEMENT</span>
                    </div>
                    
                    <h1 className="text-4xl sm:text-6xl md:text-7xl font-black font-heading tracking-tight text-white leading-none">
                        Terms & <span className="text-neon-blue">Conditions</span>
                    </h1>
                    
                    <p className="text-gray-500 text-xs sm:text-sm font-bold uppercase tracking-widest">
                        Last Updated: June 10, 2026
                    </p>

                    <div className="mt-8 p-6 bg-zinc-950/50 border border-white/[0.08] backdrop-blur-3xl rounded-[2rem] max-w-2xl mx-auto text-left shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-neon-blue/5 blur-2xl" />
                        <p className="text-gray-400 text-xs sm:text-sm leading-relaxed">
                            These Terms and Conditions, along with the privacy policy, constitute a binding agreement between <span className="text-white font-bold">Newbi Entertainment & Marketing LLP</span> (“Website Owner”, “we”, “us”, “our”) and you (“you”, “your”) regarding your access to services, tickets, and panels.
                        </p>
                    </div>
                </motion.div>

                {/* Quick Navigation Pills */}
                <div className="flex flex-wrap justify-center gap-2.5 pb-4 border-b border-white/5 select-none">
                    {termsList.map((term, idx) => (
                        <button
                            key={idx}
                            onClick={() => scrollToSection(idx)}
                            className={`px-3 py-1.5 rounded-xl text-[9px] font-bold uppercase tracking-wider transition-all border ${
                                activeSection === idx 
                                    ? "bg-white text-black border-white" 
                                    : "bg-white/5 text-zinc-400 border-white/5 hover:border-white/10 hover:text-white"
                            }`}
                        >
                            {term.title.split('. ')[1]}
                        </button>
                    ))}
                </div>

                {/* Important Notice Banner */}
                <div className="p-8 bg-neon-blue/5 border border-neon-blue/20 rounded-[2.5rem] backdrop-blur-xl flex items-start gap-4">
                    <AlertCircle size={24} className="text-neon-blue shrink-0 mt-0.5" />
                    <div className="space-y-1">
                        <h4 className="text-sm font-bold text-white uppercase tracking-wider">Please Read Carefully</h4>
                        <p className="text-gray-400 text-xs sm:text-sm leading-relaxed">
                            By continuing to access our website and using the services, you acknowledge that you accept all sections of these Terms. We reserve the right to revise these terms without assigning reason. Periodic reviews are recommended.
                        </p>
                    </div>
                </div>

                {/* Terms List Cards */}
                <div className="space-y-8">
                    {termsList.map((term, idx) => (
                        <motion.section
                            id={`term-${idx}`}
                            key={idx}
                            initial={{ opacity: 0, y: 40 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: '-100px' }}
                            transition={{ duration: 0.6, delay: idx * 0.05 }}
                            onViewportEnter={() => setActiveSection(idx)}
                            className="bg-zinc-950/45 border border-white/[0.08] backdrop-blur-3xl rounded-[2.5rem] p-8 md:p-10 shadow-2xl relative overflow-hidden group hover:border-white/15 transition-all duration-500"
                        >
                            {/* Decorative Radial Glow */}
                            <div 
                                className="absolute top-0 right-0 w-48 h-48 blur-[80px] -mr-24 -mt-24 pointer-events-none group-hover:scale-110 transition-transform duration-700" 
                                style={{ backgroundColor: term.bgGlow }}
                            />
                            
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
                                    {term.icon}
                                </div>
                                <h2 className="text-xl md:text-2xl font-extrabold font-heading text-white tracking-tight">
                                    {term.title}
                                </h2>
                            </div>

                            <p className="text-gray-400 font-medium text-xs sm:text-sm leading-relaxed relative z-10">
                                {term.content}
                            </p>
                        </motion.section>
                    ))}
                </div>

                {/* Legal Contact Footer */}
                <motion.div 
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    className="mt-20 text-center border-t border-white/5 pt-12"
                >
                    <div className="inline-flex flex-col items-center gap-4">
                        <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.25em]">
                            For legal disputes or corporate clarification, reach us at
                        </p>
                        <a 
                            href="mailto:legal@newbi.live" 
                            className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white hover:text-black border border-white/10 text-xs font-bold text-white transition-all shadow-xl"
                        >
                            legal@newbi.live
                        </a>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default Terms;
