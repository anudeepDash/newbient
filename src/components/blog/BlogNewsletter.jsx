import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Send, Loader2, Instagram, Linkedin, Globe } from 'lucide-react';
import CheckCircle2 from 'lucide-react/dist/esm/icons/check-circle-2';
import { useStore } from '../../lib/store';
import WeeklyLogo from './WeeklyLogo';


const BlogNewsletter = () => {
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState('');
    const { subscribeUser } = useStore();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email) return;

        setIsSubmitting(true);
        setError('');

        try {
            const res = await subscribeUser(email, name);
            if (res.success) {
                setIsSuccess(true);
                setEmail('');
                setName('');
            } else {
                setError(res.message);
            }
        } catch (err) {
            setError('Failed to subscribe. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="relative group overflow-hidden rounded-[2.5rem] bg-zinc-900/40 backdrop-blur-3xl border border-white/5 p-8 md:p-12">
            {/* Background Glows */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-neon-blue/5 blur-[100px] -mr-32 -mt-32 pointer-events-none group-hover:bg-neon-blue/10 transition-all duration-500" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-neon-pink/5 blur-[100px] -ml-32 -mb-32 pointer-events-none group-hover:bg-neon-pink/10 transition-all duration-500" />

            <div className="relative z-10 text-center md:text-left">
                <div className="flex flex-col items-center md:items-start mb-10 md:mb-12">
                    <span className="text-[10px] font-black text-neon-blue uppercase tracking-[0.5em] mb-4">STAY UPDATED</span>
                    <WeeklyLogo />
                </div>
                <p className="text-gray-400 text-sm md:text-base font-medium mb-12 leading-relaxed max-w-lg mx-auto md:mx-0 opacity-70 italic">
                    Your weekly dose of nightlife culture, artist stories, and behind-the-scenes blueprints. Stay ahead of the beat with the definitive music industry briefing.
                </p>

                <div className="flex items-center gap-4 mb-12 justify-center md:justify-start">
                    <a href="https://www.instagram.com/newbi.live" target="_blank" rel="noopener noreferrer" className="w-12 h-12 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-white/50 hover:text-neon-pink hover:border-neon-pink hover:bg-neon-pink/10 transition-all group shadow-lg">
                        <Instagram size={20} className="group-hover:scale-110 transition-transform" />
                    </a>
                    <a href="https://www.linkedin.com/company/newbi-ent/" target="_blank" rel="noopener noreferrer" className="w-12 h-12 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-white/50 hover:text-[#0a66c2] hover:border-[#0a66c2] hover:bg-[#0a66c2]/10 transition-all group shadow-lg">
                        <Linkedin size={20} className="group-hover:scale-110 transition-transform" />
                    </a>
                    <a href="https://newbi.live" target="_blank" rel="noopener noreferrer" className="w-12 h-12 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-white/50 hover:text-neon-blue hover:border-neon-blue hover:bg-neon-blue/10 transition-all group shadow-lg">
                        <Globe size={20} className="group-hover:scale-110 transition-transform" />
                    </a>
                </div>
                {isSuccess ? (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col items-center gap-6 py-8"
                    >
                        <div className="w-20 h-20 rounded-2xl bg-neon-green/10 flex items-center justify-center border border-neon-green/20">
                            <CheckCircle2 size={32} className="text-neon-green" />
                        </div>
                        <div className="text-center">
                            <p className="text-2xl font-black font-heading uppercase italic tracking-tighter mb-2">YOU'RE IN.</p>
                            <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Check your email for confirmation</p>
                        </div>
                        <button 
                            onClick={() => setIsSuccess(false)}
                            className="text-neon-blue text-[9px] font-black uppercase tracking-[0.4em] hover:opacity-80 transition-opacity"
                        >
                            // ADD ANOTHER EMAIL
                        </button>
                    </motion.div>
                ) : (
                    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                        <div className="flex flex-col md:grid md:grid-cols-12 gap-4">
                            <div className="md:col-span-5 group/input relative">
                                <input
                                    type="text"
                                    placeholder="YOUR NAME"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full h-14 bg-white/[0.03] border border-white/10 rounded-xl px-6 font-black text-[10px] md:text-[11px] uppercase tracking-[0.2em] text-white placeholder:text-white/20 focus:outline-none focus:border-neon-blue/40 transition-all"
                                />
                            </div>
                            <div className="md:col-span-5 group/input relative">
                                <input
                                    type="email"
                                    required
                                    placeholder="EMAIL ADDRESS"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full h-14 bg-white/[0.03] border border-white/10 rounded-xl px-6 font-black text-[10px] md:text-[11px] uppercase tracking-[0.2em] text-white placeholder:text-white/20 focus:outline-none focus:border-neon-blue/40 transition-all"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full h-14 bg-white text-black font-black uppercase tracking-widest rounded-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center shadow-xl group/btn"
                                >
                                    {isSubmitting ? (
                                        <Loader2 className="animate-spin" size={18} />
                                    ) : (
                                        <Send size={20} className="group-hover:translate-x-1 transition-transform" />
                                    )}
                                </button>
                            </div>
                        </div>
                        {error && <p className="text-neon-pink text-[10px] font-black uppercase tracking-[0.2em] mt-2">{error}</p>}
                        <p className="text-gray-600 text-[9px] uppercase tracking-[0.4em] font-black opacity-40 text-center md:text-left">
                            NO SPAM // PURE UPDATES // SECURE
                        </p>
                    </form>
                )}
            </div>
        </div>
    );
};

export default BlogNewsletter;
