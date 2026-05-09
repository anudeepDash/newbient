import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Send, Loader2 } from 'lucide-react';
import CheckCircle2 from 'lucide-react/dist/esm/icons/check-circle-2';
import { useStore } from '../../lib/store';

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

            <div className="relative z-10 max-w-2xl mx-auto text-center">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl mb-6"
                >
                    <Mail size={16} className="text-neon-blue" />
                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white">Join the Movement</span>
                </motion.div>

                <h2 className="text-3xl md:text-5xl font-black font-heading tracking-tight uppercase mb-4">
                    THE <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-blue to-neon-pink">PULSE</span> NEWSLETTER.
                </h2>
                <p className="text-gray-400 text-lg font-medium mb-10">
                    Get the latest concert news, artist interviews, and exclusive access directly in your inbox.
                </p>

                {isSuccess ? (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col items-center gap-4 py-6"
                    >
                        <div className="w-16 h-16 rounded-full bg-neon-green/20 flex items-center justify-center border border-neon-green/30">
                            <CheckCircle2 size={32} className="text-neon-green" />
                        </div>
                        <p className="text-xl font-bold">You're on the list!</p>
                        <button 
                            onClick={() => setIsSuccess(false)}
                            className="text-neon-blue text-sm font-black uppercase tracking-widest hover:underline"
                        >
                            Subscribe another email
                        </button>
                    </motion.div>
                ) : (
                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="flex-grow group/input relative">
                                <input
                                    type="text"
                                    placeholder="Your Name (Optional)"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 font-medium text-white placeholder:text-white/20 focus:outline-none focus:border-neon-blue/50 transition-all"
                                />
                            </div>
                            <div className="flex-grow group/input relative">
                                <input
                                    type="email"
                                    required
                                    placeholder="Email Address"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 font-medium text-white placeholder:text-white/20 focus:outline-none focus:border-neon-blue/50 transition-all"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="h-14 px-10 bg-white text-black font-black font-heading uppercase tracking-widest rounded-2xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(255,255,255,0.2)]"
                            >
                                {isSubmitting ? (
                                    <Loader2 className="animate-spin" size={20} />
                                ) : (
                                    <>
                                        Subscribe <Send size={18} />
                                    </>
                                )}
                            </button>
                        </div>
                        {error && <p className="text-neon-pink text-xs font-bold uppercase tracking-wider mt-2">{error}</p>}
                        <p className="text-gray-500 text-[10px] uppercase tracking-[0.2em] font-medium">
                            NO SPAM. JUST PURE VIBES. UNFOLLOW ANYTIME.
                        </p>
                    </form>
                )}
            </div>
        </div>
    );
};

export default BlogNewsletter;
