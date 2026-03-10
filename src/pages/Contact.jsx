import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Send, Instagram, Mail, Phone, Globe, MessageSquare, Zap, Sparkles, MapPin } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { useStore } from '../lib/store';
import { cn } from '../lib/utils';

const Contact = () => {
    const { siteDetails } = useStore();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        message: ''
    });
    const [sending, setSending] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSending(true);
        try {
            await addDoc(collection(db, "messages"), {
                ...formData,
                createdAt: new Date().toISOString(),
                status: 'new'
            });
            alert('Message sent! We will get back to you soon.');
            setFormData({ name: '', email: '', message: '' });
        } catch (error) {
            console.error("Error sending message: ", error);
            alert('Failed to send message. Please try again.');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#020202] text-white pt-32 pb-20 px-4 overflow-hidden">
            {/* Background Atmosphere */}
            <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-neon-blue/5 blur-[150px] rounded-full pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-neon-green/5 blur-[150px] rounded-full pointer-events-none" />

            <div className="max-w-7xl mx-auto relative z-10">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row items-center justify-between mb-32 gap-12">
                    <div className="max-w-2xl text-center md:text-left">
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl mb-8"
                        >
                            <Sparkles size={16} className="text-neon-blue" />
                            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white">Global Reach</span>
                        </motion.div>
                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-5xl md:text-8xl font-black font-heading tracking-tighter leading-none mb-8"
                        >
                            LET'S <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-blue via-white to-neon-green">SCALE.</span>
                        </motion.h1>
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="text-gray-400 text-lg md:text-2xl font-medium max-w-xl leading-relaxed"
                        >
                            Ready to take your brand or event to the next level? Our team is live and ready for deployment.
                        </motion.p>
                    </div>

                    {/* Stats or Trust Markers */}
                    <div className="grid grid-cols-2 gap-4 w-full md:w-auto">
                        {[
                            { label: 'Response Time', val: '< 12h' },
                            { label: 'Active Regions', val: 'Pan India' }
                        ].map((stat, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.1 * i }}
                                className="p-8 bg-white/5 border border-white/10 rounded-[2.5rem] backdrop-blur-3xl text-center"
                            >
                                <p className="text-[10px] font-black uppercase tracking-widest text-neon-blue mb-2">{stat.label}</p>
                                <p className="text-3xl font-black font-heading text-white tracking-tight">{stat.val}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-stretch">
                    {/* Left: Interactive Info */}
                    <motion.div
                        initial={{ opacity: 0, x: -30 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="space-y-12"
                    >
                        <div className="space-y-6">
                            <h3 className="text-2xl font-black font-heading tracking-tight text-white mb-8 italic">"WE DON'T DO ORDINARY."</h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <ContactMethod 
                                    icon={MessageSquare} 
                                    label="Quick Chat" 
                                    val="WHATSAPP LIVE" 
                                    href={`https://wa.me/${siteDetails.phone?.replace(/[^0-9]/g, '')}`} 
                                    accent="neon-green"
                                />
                                <ContactMethod 
                                    icon={Mail} 
                                    label="Email Deck" 
                                    val={siteDetails.email} 
                                    href={`mailto:${siteDetails.email}`} 
                                    accent="neon-blue"
                                />
                                <ContactMethod 
                                    icon={Instagram} 
                                    label="Social" 
                                    val="@newbi_ent" 
                                    href={siteDetails.instagram} 
                                    accent="neon-pink"
                                />
                                <ContactMethod 
                                    icon={MapPin} 
                                    label="Base" 
                                    val="Mainland India" 
                                    href="#" 
                                    accent="white"
                                />
                            </div>
                        </div>

                        {/* Interactive Element: Live Status Indicator */}
                        <div className="p-8 bg-white/5 border border-white/10 rounded-[3rem] backdrop-blur-3xl relative overflow-hidden group transition-all hover:bg-white/10">
                           <div className="flex items-center gap-6 relative z-10">
                                <div className="relative flex h-3 w-3">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neon-green opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-3 w-3 bg-neon-green"></span>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Availability</p>
                                    <p className="text-lg font-black text-white uppercase tracking-tight">Accepting New Projects</p>
                                </div>
                           </div>
                        </div>
                    </motion.div>

                    {/* Right: Premium Form */}
                    <motion.div
                        initial={{ opacity: 0, x: 30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        className="relative"
                    >
                        {/* Glassmorphic Form Container */}
                        <div className="p-12 md:p-16 bg-zinc-900/60 border border-white/10 rounded-[4rem] backdrop-blur-[100px] shadow-2xl relative overflow-hidden">
                            <form onSubmit={handleSubmit} className="space-y-10 relative z-10">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-2">Full Name</label>
                                        <input
                                            type="text"
                                            className="w-full h-16 bg-white/5 border border-white/10 rounded-2xl px-6 font-medium text-white focus:outline-none focus:border-neon-blue transition-all"
                                            placeholder="Abhinav Anand"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-2">Email Address</label>
                                        <input
                                            type="email"
                                            className="w-full h-16 bg-white/5 border border-white/10 rounded-2xl px-6 font-medium text-white focus:outline-none focus:border-neon-blue transition-all"
                                            placeholder="abhinav@newbi.live"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-2">Tell us about your mission</label>
                                    <textarea
                                        className="w-full h-48 bg-white/5 border border-white/10 rounded-[2rem] p-8 font-medium text-white focus:outline-none focus:border-neon-blue transition-all resize-none"
                                        placeholder="We need a campus tour that breaks the internet..."
                                        value={formData.message}
                                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                        required
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={sending}
                                    className="w-full h-24 bg-white text-black rounded-[2.2rem] flex items-center justify-center gap-4 font-black font-heading tracking-[0.3em] uppercase text-sm hover:scale-[1.02] active:scale-95 transition-all shadow-[0_20px_50px_rgba(255,255,255,0.1)] disabled:opacity-50"
                                >
                                    {sending ? 'COMMUNICATING...' : (
                                        <>
                                            SEND MESSAGE
                                            <Zap size={20} className="fill-black" />
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

const ContactMethod = ({ icon: Icon, label, val, href, accent }) => (
    <a 
        href={href} 
        target="_blank" 
        rel="noopener noreferrer"
        className="group p-8 bg-white/5 border border-white/5 rounded-[3rem] hover:border-white/10 hover:bg-white/10 transition-all duration-500"
    >
        <div className={cn(
            "w-12 h-12 rounded-2xl flex items-center justify-center mb-6 transition-all duration-500 group-hover:scale-110",
            accent === 'neon-green' ? 'bg-neon-green/10 text-neon-green' : (accent === 'neon-blue' ? 'bg-neon-blue/10 text-neon-blue' : (accent === 'neon-pink' ? 'bg-neon-pink/10 text-neon-pink' : 'bg-white/10 text-white'))
        )}>
            <Icon size={24} />
        </div>
        <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">{label}</p>
            <p className="text-sm font-black text-white truncate">{val}</p>
        </div>
    </a>
);

export default Contact;
