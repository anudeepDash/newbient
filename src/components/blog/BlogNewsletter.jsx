import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Send, Loader2, Instagram, Linkedin, Globe, CheckCircle2 } from 'lucide-react';
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

    const field = 'w-full h-12 px-4 rounded-xl bg-[#F4F2EC] dark:bg-white/[0.04] ring-1 ring-inset ring-black/10 dark:ring-white/15 text-base text-gray-950 dark:text-white placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[var(--cz-accent,#00F0FF)]';

    return (
        <section aria-label="Weekly by ConcertZone" className="relative overflow-hidden rounded-[1.75rem] bg-white dark:bg-white/[0.04] ring-1 ring-black/[0.06] dark:ring-white/10 p-6 sm:p-10 md:p-12">
            <div aria-hidden="true" className="absolute -top-24 -right-24 w-72 h-72 rounded-full opacity-25 blur-3xl bg-[var(--cz-accent,#00F0FF)] pointer-events-none" />
            <div className="relative grid gap-8 lg:grid-cols-[1fr_1.1fr] lg:items-center">
                <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-gray-500 dark:text-zinc-500 mb-4">The newsletter</p>
                    <WeeklyLogo />
                    <p className="mt-5 max-w-md text-base leading-relaxed text-gray-600 dark:text-zinc-400">
                        One email a week: the shows worth going to, artist stories and what is happening behind the scenes.
                    </p>
                    <div className="mt-5 flex items-center gap-1 -ml-3">
                        <a href="https://www.instagram.com/newbi.live" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="w-11 h-11 rounded-full flex items-center justify-center text-gray-600 dark:text-zinc-400 hover:text-gray-950 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
                            <Instagram size={19} aria-hidden="true" />
                        </a>
                        <a href="https://www.linkedin.com/company/newbi-ent/" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="w-11 h-11 rounded-full flex items-center justify-center text-gray-600 dark:text-zinc-400 hover:text-gray-950 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
                            <Linkedin size={19} aria-hidden="true" />
                        </a>
                        <a href="/" aria-label="newbi.live" className="w-11 h-11 rounded-full flex items-center justify-center text-gray-600 dark:text-zinc-400 hover:text-gray-950 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
                            <Globe size={19} aria-hidden="true" />
                        </a>
                    </div>
                </div>

                {isSuccess ? (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} role="status" className="flex flex-col items-start gap-4 rounded-2xl bg-[#F4F2EC] dark:bg-white/[0.04] p-6">
                        <CheckCircle2 size={28} className="text-emerald-600 dark:text-neon-green" aria-hidden="true" />
                        <div>
                            <p className="font-heading text-2xl font-extrabold tracking-[-0.02em]">You're in.</p>
                            <p className="mt-1 text-sm text-gray-600 dark:text-zinc-400">Check your inbox to confirm your email.</p>
                        </div>
                        <button type="button" onClick={() => setIsSuccess(false)} className="min-h-[44px] text-sm font-semibold underline underline-offset-4 decoration-[var(--cz-accent,#00F0FF)] decoration-2">
                            Add another email
                        </button>
                    </motion.div>
                ) : (
                    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                        <label className="sr-only" htmlFor="cz-nl-name">Your name</label>
                        <input id="cz-nl-name" type="text" autoComplete="name" placeholder="Your name (optional)" value={name} onChange={(e) => setName(e.target.value)} className={field} />
                        <label className="sr-only" htmlFor="cz-nl-email">Email</label>
                        <input id="cz-nl-email" type="email" required autoComplete="email" inputMode="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className={field} />
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="h-12 px-6 inline-flex items-center justify-center gap-2 rounded-full bg-gray-950 text-white dark:bg-white dark:text-black font-heading font-bold hover:scale-[1.02] active:scale-[0.98] transition disabled:opacity-60"
                        >
                            {isSubmitting ? <Loader2 className="animate-spin" size={18} aria-hidden="true" /> : <Send size={17} aria-hidden="true" />}
                            {isSubmitting ? 'Subscribing' : 'Subscribe'}
                        </button>
                        {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
                        <p className="text-xs text-gray-500 dark:text-zinc-500">No spam. Unsubscribe from any email.</p>
                    </form>
                )}
            </div>
        </section>
    );
};

export default BlogNewsletter;
