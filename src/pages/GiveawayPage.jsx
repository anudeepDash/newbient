import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { useStore } from '../lib/store';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Gift, Instagram, Share2, Trophy, Users, CheckCircle2, Copy, Send, Sparkles, Clock, Ticket, XCircle, Twitter, Youtube, MessageCircle, Music, Ghost, Globe, Star, Crown, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SpinWheel from '../components/giveaway/SpinWheel';
import { cn } from '../lib/utils';

const GiveawayPage = () => {
    const { slug } = useParams();
    const [searchParams] = useSearchParams();
    const referredBy = searchParams.get('ref');
    
    const { giveaways, giveawayEntries, enterGiveaway, updateGiveawayEntry, user, setAuthModal } = useStore();
    const giveaway = giveaways.find(g => g.slug === slug);
    const userEntry = giveawayEntries.find(e => e.campaignId === giveaway?.id && e.userId === user?.uid);
    const winner = giveawayEntries.find(e => e.campaignId === giveaway?.id && e.isWinner);
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        name: user?.displayName || '',
        phone: '',
        college: '',
        city: '',
        instagram: '',
        answer: ''
    });

    const [copySuccess, setCopySuccess] = useState(false);
    const [instaUsername, setInstaUsername] = useState('');
    const [verifyingTasks, setVerifyingTasks] = useState({});
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
        if (!giveaway?.endDate) return;
        const interval = setInterval(() => {
            const end = new Date(giveaway.endDate).getTime();
            const now = new Date().getTime();
            const distance = end - now;

            if (distance < 0) {
                setTimeLeft('EXPIRED');
                clearInterval(interval);
                return;
            }

            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);
            setTimeLeft(`${days}D ${hours}H ${minutes}M ${seconds}S`);
        }, 1000);
        return () => clearInterval(interval);
    }, [giveaway?.endDate]);

    const campaignEntries = giveawayEntries.filter(e => e.campaignId === giveaway?.id);
    const leaderboard = [...campaignEntries]
        .sort((a, b) => (b.entryScore || 0) - (a.entryScore || 0))
        .slice(0, 10);

    const handleRegister = async (e) => {
        e.preventDefault();
        if (!user) { setAuthModal(true); return; }
        setIsSubmitting(true);
        try {
            await enterGiveaway(giveaway.id, { ...formData, referredBy });
        } catch (error) {
            alert(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleTaskAction = async (task) => {
        if (!userEntry) return;
        if (task.type === 'instagram') {
            if (!instaUsername && !userEntry.completedTasks?.[task.id]) {
                alert("Please enter your Instagram username first.");
                return;
            }
            window.open(task.config.url, '_blank');
        } else if (task.config.url) {
            window.open(task.config.url, '_blank');
        }

        const completedTasks = userEntry.completedTasks || {};
        if (!completedTasks[task.id]) {
            setVerifyingTasks(prev => ({ ...prev, [task.id]: true }));
            setTimeout(async () => {
                const updates = {
                    completedTasks: { ...completedTasks, [task.id]: true },
                    entryScore: (userEntry.entryScore || 0) + (task.entryScore || 1)
                };
                if (task.type === 'instagram') updates.instagramUsername = instaUsername;
                await updateGiveawayEntry(userEntry.id, updates);
                setVerifyingTasks(prev => ({ ...prev, [task.id]: false }));
                if (typeof confetti !== 'undefined') confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ['#A855F7', '#3B82F6', '#22C55E'] });
            }, 2000);
        }
    };

    const handleSpinResult = async (reward) => {
        if (!userEntry || userEntry.hasSpunWheel) return;
        if (reward.jackpot) {
            await updateGiveawayEntry(userEntry.id, { hasSpunWheel: true, isWinner: true, winnerReward: 'INSTANT WIN' });
            return;
        }
        await updateGiveawayEntry(userEntry.id, {
            hasSpunWheel: true,
            entryScore: (userEntry.entryScore || 0) + (reward.points || 0),
            spinReward: reward.label
        });
    };

    const copyReferralLink = () => {
        const link = `${window.location.origin}/giveaway/${slug}?ref=${userEntry.referralCode}`;
        navigator.clipboard.writeText(link);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
    };

    const shareOnWhatsApp = () => {
        const link = `${window.location.origin}/giveaway/${slug}?ref=${userEntry.referralCode}`;
        const message = `I just entered the ${giveaway.name} giveaway on Newbi. Click here to win: ${link}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
    };

    const shareOnInstagramStory = async () => {
        const link = `${window.location.origin}/giveaway/${slug}?ref=${userEntry?.referralCode}`;
        if (navigator.share) {
            try {
                await navigator.share({ title: giveaway.name, text: `Join the ${giveaway.name} giveaway on Newbi!`, url: link });
            } catch (e) { /* user cancelled */ }
        } else {
            // Copy and prompt for Instagram
            navigator.clipboard.writeText(link);
            alert('Link copied! Open Instagram Stories and paste it as a link sticker.');
        }
    };

    if (!giveaway) return (
        <div className="min-h-screen bg-[#020202] flex items-center justify-center font-black uppercase tracking-widest text-gray-600">
            Loading...
        </div>
    );

    const isEnded = giveaway.status === 'Closed' || new Date(giveaway.endDate) < new Date();

    const taskIcons = {
        instagram: Instagram,
        twitter: Twitter,
        telegram: Send,
        discord: MessageCircle,
        youtube: Youtube,
        snapchat: Ghost,
        spotify: Music,
        website: Globe,
        custom: Sparkles,
    };

    return (
        <div className="min-h-screen bg-[#020202] text-white">
            {/* Background atmosphere */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-purple-600/8 rounded-full blur-[200px]" />
                <div className="absolute bottom-[10%] right-[-10%] w-[50%] h-[50%] bg-neon-blue/8 rounded-full blur-[200px]" />
                <div className="absolute inset-0 opacity-[0.025]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
            </div>

            {/* ─── HERO BANNER ─── */}
            <div className="relative h-[60vh] md:h-[75vh] w-full overflow-hidden">
                <div className="absolute inset-0">
                    {giveaway.posterUrl ? (
                        <>
                            <img src={giveaway.posterUrl} alt={giveaway.name} className="w-full h-full object-cover scale-105" />
                            <div className="absolute inset-0 bg-[#020202]/70 backdrop-blur-[2px]" />
                        </>
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-purple-900/50 via-[#020202] to-neon-blue/20">
                            <div className="absolute top-1/4 left-1/4 w-[40%] h-[40%] bg-purple-500/15 rounded-full blur-[120px] animate-pulse" />
                            <div className="absolute bottom-1/4 right-1/4 w-[30%] h-[30%] bg-neon-blue/15 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
                        </div>
                    )}
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-[#020202] via-[#020202]/20 to-[#020202]/10" />

                {/* Hero content */}
                <div className="absolute bottom-0 left-0 w-full p-6 md:p-16 z-10">
                    <div className="max-w-7xl mx-auto">
                        <div className="space-y-4 md:space-y-6">
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-xl">
                                <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-purple-400">
                                    {isEnded ? 'Giveaway Closed' : 'Live Opportunity'}
                                </span>
                            </div>
                            <h1 className="text-4xl md:text-8xl font-black font-heading tracking-tighter uppercase italic leading-[0.9] text-white max-w-5xl">
                                {giveaway.name}
                            </h1>
                            <div className="flex flex-wrap items-center gap-4 md:gap-8 text-[10px] font-black uppercase tracking-widest text-gray-400">
                                <span className="flex items-center gap-2">
                                    <Ticket size={14} className="text-purple-400" />
                                    {giveaway.ticketsAvailable} Available
                                </span>
                                <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-xl backdrop-blur-md text-white">
                                    <Clock size={12} className="text-neon-blue" />
                                    <span>Ends: <span className="text-neon-blue ml-1">{timeLeft}</span></span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Winner full-screen overlay */}
            {winner && giveaway.status === 'Closed' && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-2xl">
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', damping: 18, stiffness: 200 }}
                        className="bg-black/80 backdrop-blur-3xl border border-yellow-500/30 p-10 md:p-20 rounded-[3rem] text-center shadow-[0_0_120px_rgba(234,179,8,0.2)] relative mx-4 w-full max-w-2xl"
                    >
                        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-24 h-24 bg-yellow-500 rounded-[2rem] flex items-center justify-center shadow-[0_0_60px_rgba(234,179,8,0.4)]">
                            <Trophy size={44} className="text-black" />
                        </div>
                        <p className="text-yellow-500 font-black uppercase tracking-[0.4em] text-[10px] mb-6 mt-4">We Have a Winner</p>
                        <h1 className="text-4xl md:text-8xl font-black font-heading text-white uppercase italic tracking-tighter leading-none mb-4">
                            {winner.name}
                        </h1>
                        <div className="flex items-center justify-center gap-2 text-gray-400 text-[10px] font-black uppercase tracking-widest">
                            <Sparkles size={12} className="text-yellow-500" />
                            CONGRATULATIONS
                            <Sparkles size={12} className="text-yellow-500" />
                        </div>
                    </motion.div>
                </div>
            )}

            {/* ─── MAIN CONTENT ─── */}
            <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-8 pb-40 space-y-32 mt-16 md:mt-20">

                {/* ─── EVENT BRIEF ─── */}
                <section>
                    <div className="flex items-center gap-6 mb-12">
                        <div className="h-14 w-1.5 rounded-full bg-purple-500" />
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.5em] text-purple-400 mb-1">About This Drop</p>
                            <h2 className="text-4xl md:text-6xl font-black font-heading tracking-tighter text-white uppercase">THE BRIEF.</h2>
                        </div>
                    </div>
                    <div className="max-w-4xl relative group">
                        <div className="absolute -inset-[1px] bg-gradient-to-br from-purple-600/30 via-transparent to-neon-blue/20 rounded-[2.5rem] opacity-0 group-hover:opacity-100 transition-all duration-700" />
                        <div className="relative bg-zinc-900/50 backdrop-blur-3xl border border-white/8 rounded-[2.5rem] overflow-hidden">
                            {/* Header accent */}
                            <div className="px-8 md:px-12 pt-8 md:pt-10 pb-6 border-b border-white/5 flex items-center gap-3">
                                <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                                    <Sparkles size={14} className="text-purple-400" />
                                </div>
                                <span className="text-[9px] font-black uppercase tracking-[0.4em] text-purple-400">Campaign Details</span>
                            </div>
                            <div className="px-8 md:px-12 py-8 md:py-10">
                                <p className="text-gray-300 leading-[1.9] text-base md:text-lg font-medium">{giveaway.description}</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ─── REGISTER (no entry yet) ─── */}
                {!userEntry && !isEnded && (
                    <section id="register">
                        <div className="flex items-center gap-6 mb-12">
                            <div className="h-14 w-1.5 rounded-full bg-neon-blue" />
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.5em] text-neon-blue mb-1">Step 01</p>
                                <h2 className="text-4xl md:text-6xl font-black font-heading tracking-tighter text-white uppercase">SECURE YOUR ENTRY.</h2>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 max-w-5xl">
                            {/* Form */}
                            <div className="lg:col-span-3 space-y-5">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {[
                                        { label: 'Full Name', key: 'name', placeholder: 'YOUR NAME' },
                                        { label: 'Phone Number', key: 'phone', placeholder: '+91 00000 00000' },
                                    ].map(f => (
                                        <div key={f.key} className="space-y-2">
                                            <label className="text-[9px] font-black uppercase tracking-widest text-gray-500 ml-1">{f.label}</label>
                                            <Input
                                                placeholder={f.placeholder}
                                                value={formData[f.key]}
                                                onChange={e => setFormData({ ...formData, [f.key]: e.target.value })}
                                                className="h-14 bg-white/5 border-white/5 rounded-2xl text-xs font-black uppercase tracking-wider focus:border-purple-500/50"
                                            />
                                        </div>
                                    ))}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-gray-500 ml-1">College / Institution</label>
                                    <Input
                                        placeholder="WHERE DO YOU STUDY?"
                                        value={formData.college}
                                        onChange={e => setFormData({ ...formData, college: e.target.value })}
                                        className="h-14 bg-white/5 border-white/5 rounded-2xl text-xs font-black uppercase tracking-wider focus:border-purple-500/50"
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {[
                                        { label: 'City', key: 'city', placeholder: 'YOUR CITY' },
                                        { label: 'Instagram Handle', key: 'instagram', placeholder: '@USERNAME' },
                                    ].map(f => (
                                        <div key={f.key} className="space-y-2">
                                            <label className="text-[9px] font-black uppercase tracking-widest text-gray-500 ml-1">{f.label}</label>
                                            <Input
                                                placeholder={f.placeholder}
                                                value={formData[f.key]}
                                                onChange={e => setFormData({ ...formData, [f.key]: e.target.value })}
                                                className="h-14 bg-white/5 border-white/5 rounded-2xl text-xs font-black uppercase tracking-wider focus:border-purple-500/50"
                                            />
                                        </div>
                                    ))}
                                </div>
                                <Button
                                    onClick={handleRegister}
                                    disabled={isSubmitting}
                                    className="w-full h-16 bg-white text-black font-black font-heading uppercase tracking-[0.2em] rounded-2xl text-sm hover:scale-[1.01] transition-all shadow-[0_20px_50px_rgba(255,255,255,0.1)]"
                                >
                                    {isSubmitting ? 'PROCESSING...' : 'INITIALIZE ENTRY'}
                                </Button>
                            </div>

                            {/* Trust card */}
                            <div className="lg:col-span-2 bg-zinc-900/40 border border-white/5 rounded-[2.5rem] p-8 md:p-10 flex flex-col justify-center items-center text-center gap-6">
                                <div className="w-20 h-20 rounded-[1.5rem] bg-neon-blue/10 border border-neon-blue/20 flex items-center justify-center text-neon-blue shadow-[0_0_30px_rgba(0,255,255,0.1)]">
                                    <CheckCircle2 size={36} />
                                </div>
                                <div className="space-y-3">
                                    <h4 className="text-xl font-black font-heading uppercase italic tracking-tight text-white">Verified Entry</h4>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 leading-relaxed max-w-xs">
                                        Data is protected. Only used for winner verification. Multi-account farming is detected and disqualified.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </section>
                )}

                {/* ─── PARTICIPANT ZONE (has entry) ─── */}
                {userEntry && (
                    <>
                        {/* Score Passport */}
                        <section>
                            <div className="relative group">
                                <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-neon-blue rounded-[3rem] blur opacity-15 group-hover:opacity-25 transition duration-700" />
                                <div className="relative bg-zinc-900/60 border border-white/10 rounded-[2.5rem] p-8 md:p-12 backdrop-blur-3xl overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 to-neon-blue/5" />
                                    <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                                        <div className="space-y-4 text-center md:text-left">
                                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[9px] font-black text-purple-400 uppercase tracking-widest">
                                                <Users size={12} /> PARTICIPANT PASSPORT
                                            </div>
                                            <h3 className="text-3xl md:text-6xl font-black font-heading tracking-tighter uppercase italic leading-none">
                                                YOUR ENTRY <span className="text-purple-500">SCORE.</span>
                                            </h3>
                                            <p className="text-gray-500 font-bold uppercase tracking-[0.1em] text-[10px] max-w-sm leading-relaxed">
                                                Every mission completed boosts your ranking. Complete all tasks to maximize your winning probability.
                                            </p>
                                        </div>
                                        <div className="flex flex-col items-center justify-center w-40 h-40 md:w-52 md:h-52 rounded-full border-[10px] border-white/5 relative shrink-0">
                                            <div className="absolute inset-0 rounded-full border-[10px] border-purple-500 border-t-transparent border-r-transparent animate-spin-slow opacity-30" />
                                            <span className="text-5xl md:text-6xl font-black font-heading text-white tracking-tighter italic leading-none">
                                                {userEntry.entryScore || 0}
                                            </span>
                                            <span className="text-[9px] font-black text-purple-400 uppercase tracking-[0.3em] mt-2">POINTS</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* ─── MISSIONS ─── */}
                        <section>
                            <div className="flex items-center justify-between mb-12 gap-6 flex-wrap">
                                <div className="flex items-center gap-6">
                                    <div className="h-14 w-1.5 rounded-full bg-neon-blue" />
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-[0.5em] text-neon-blue mb-1">Earn Points</p>
                                        <h2 className="text-4xl md:text-6xl font-black font-heading tracking-tighter text-white uppercase">AVAILABLE MISSIONS.</h2>
                                    </div>
                                </div>
                                <div className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-widest text-gray-500">
                                    Multiple entries allowed
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                {giveaway.tasks?.map((task) => {
                                    const done = userEntry.completedTasks?.[task.id];
                                    const verifying = verifyingTasks[task.id];
                                    const TaskIcon = taskIcons[task.type] || Sparkles;

                                    return (
                                        <motion.div
                                            key={task.id}
                                            whileHover={!done ? { y: -4 } : {}}
                                            className={cn(
                                                "relative bg-zinc-900/40 backdrop-blur-3xl border rounded-[2.5rem] overflow-hidden flex flex-col group transition-all duration-500",
                                                done ? "border-neon-green/30 shadow-[0_0_40px_rgba(57,255,20,0.05)]" : "border-white/5 hover:border-white/20"
                                            )}
                                        >
                                            {/* Ticket perforations */}
                                            <div className="absolute top-1/2 -left-3 w-6 h-6 bg-[#020202] rounded-full z-20 border border-white/5" />
                                            <div className="absolute top-1/2 -right-3 w-6 h-6 bg-[#020202] rounded-full z-20 border border-white/5" />

                                            <div className="flex h-full min-h-[220px]">
                                                {/* Main content */}
                                                <div className="flex-1 p-8 flex flex-col">
                                                    <div className="flex items-center justify-between mb-6">
                                                        <div className={cn(
                                                            "p-3 rounded-2xl border transition-all duration-500",
                                                            done
                                                                ? "bg-neon-green/10 border-neon-green/20 text-neon-green shadow-[0_0_20px_rgba(57,255,20,0.15)]"
                                                                : "bg-white/5 border-white/10 text-gray-400 group-hover:text-white group-hover:border-white/20 group-hover:shadow-lg"
                                                        )}>
                                                            <TaskIcon size={24} />
                                                        </div>
                                                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/5">
                                                            <Trophy size={10} className="text-purple-400" />
                                                            <span className="text-[9px] font-black uppercase text-gray-300">+{task.entryScore} PTS</span>
                                                        </div>
                                                    </div>
                                                    <h3 className="text-lg font-black font-heading text-white leading-tight mb-2 group-hover:translate-x-1 transition-transform">
                                                        {task.label}
                                                    </h3>
                                                    {task.type === 'instagram' && !done && (
                                                        <input
                                                            type="text"
                                                            placeholder="@HANDLE"
                                                            value={instaUsername}
                                                            onChange={e => setInstaUsername(e.target.value)}
                                                            className="mt-3 h-10 px-4 bg-black/40 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest focus:border-purple-500 outline-none text-white text-center placeholder:text-gray-700 w-full"
                                                        />
                                                    )}
                                                </div>

                                                {/* Action tab */}
                                                <button
                                                    onClick={() => handleTaskAction(task)}
                                                    disabled={done || verifying}
                                                    className={cn(
                                                        "w-20 flex flex-col justify-center items-center gap-3 border-l border-dashed transition-all",
                                                        done
                                                            ? "bg-neon-green/5 border-neon-green/20 cursor-default"
                                                            : "bg-white/5 border-white/10 hover:bg-white/10"
                                                    )}
                                                >
                                                    {verifying ? (
                                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                    ) : done ? (
                                                        <>
                                                            <CheckCircle2 size={20} className="text-neon-green" />
                                                            <span className="text-[8px] font-black text-neon-green uppercase tracking-[0.2em] rotate-90 whitespace-nowrap">DONE</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <ArrowRight size={20} className="text-white" />
                                                            <span className="text-[8px] font-black text-gray-500 uppercase tracking-[0.2em] rotate-90 whitespace-nowrap">CLAIM</span>
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </motion.div>
                                    );
                                })}

                                {/* Referral card */}
                                <motion.div
                                    whileHover={{ y: -4 }}
                                    className="relative bg-zinc-900/40 backdrop-blur-3xl border border-white/5 hover:border-white/20 rounded-[2.5rem] flex group transition-all duration-500 min-h-[220px]"
                                >
                                    <div className="absolute top-1/2 -left-3 w-6 h-6 bg-[#020202] rounded-full z-20 border border-white/5" />
                                    <div className="absolute top-1/2 -right-3 w-6 h-6 bg-[#020202] rounded-full z-20 border border-white/5" />
                                    
                                    <div className="flex-1 p-8 flex flex-col">
                                        <div className="flex items-center justify-between mb-6">
                                            <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-gray-400 group-hover:text-white group-hover:border-white/20 transition-all">
                                                <Share2 size={24} />
                                            </div>
                                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/5">
                                                <Trophy size={10} className="text-purple-400" />
                                                <span className="text-[9px] font-black uppercase text-gray-300">+3 PTS/REF</span>
                                            </div>
                                        </div>
                                        <h3 className="text-lg font-black font-heading text-white leading-tight mb-4 group-hover:translate-x-1 transition-transform">
                                            REFERRAL SYSTEM
                                        </h3>
                                        <div className="flex gap-2 mt-auto">
                                            <Button
                                                onClick={copyReferralLink}
                                                className="flex-1 h-10 rounded-xl text-[9px] font-black uppercase tracking-widest bg-white/10 border border-white/10 text-white hover:bg-white/20 transition-all"
                                            >
                                                {copySuccess ? 'COPIED!' : 'COPY'}
                                            </Button>
                                            <button
                                                onClick={shareOnWhatsApp}
                                                style={{ width: '40px', height: '40px', minWidth: '40px', backgroundColor: '#25D366', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer', boxShadow: '0 0 16px rgba(37,211,102,0.35)', transition: 'transform .15s', flexShrink: 0 }}
                                                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
                                                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                                            </button>
                                            <button
                                                onClick={shareOnInstagramStory}
                                                style={{ width: '40px', height: '40px', minWidth: '40px', background: 'radial-gradient(circle at 30% 107%, #fdf497 0%, #fdf497 5%, #fd5949 45%, #d6249f 60%, #285AEB 90%)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer', transition: 'transform .15s', flexShrink: 0 }}
                                                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
                                                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            </div>
                        </section>

                        {/* ─── SPIN THE WHEEL ─── */}
                        {giveaway.showSpinWheel !== false && (
                            <section>
                                <div className="flex items-center gap-6 mb-12">
                                    <div className="h-14 w-1.5 rounded-full bg-neon-pink" />
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-[0.5em] text-neon-pink mb-1">Bonus Round</p>
                                        <h2 className="text-4xl md:text-6xl font-black font-heading tracking-tighter text-white uppercase">SPIN THE WHEEL.</h2>
                                    </div>
                                </div>
                                <div className="bg-zinc-900/40 border border-white/5 rounded-[2.5rem] p-8 md:p-16 backdrop-blur-3xl flex flex-col items-center text-center relative overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-t from-purple-600/5 to-transparent" />
                                    <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-12 relative z-10">
                                        One spin per user · Unlock extra points or instant prizes
                                    </p>
                                    <div className="relative z-10">
                                        <SpinWheel
                                            onResult={handleSpinResult}
                                            alreadySpun={userEntry.hasSpunWheel}
                                            giveawayEndDate={giveaway.endDate}
                                        />
                                    </div>
                                </div>
                            </section>
                        )}

                        {/* ─── LEADERBOARD ─── */}
                        <section>
                            <div className="flex items-center justify-between mb-12 gap-6 flex-wrap">
                                <div className="flex items-center gap-6">
                                    <div className="h-14 w-1.5 rounded-full bg-yellow-500" />
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-[0.5em] text-yellow-500 mb-1">Rankings</p>
                                        <h2 className="text-4xl md:text-6xl font-black font-heading tracking-tighter text-white uppercase">POINTS LEADERBOARD.</h2>
                                    </div>
                                </div>
                                <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2 shrink-0">
                                    <Users size={14} className="text-neon-blue" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">{campaignEntries.length} Active</span>
                                </div>
                            </div>

                            <div className="bg-zinc-900/40 border border-white/5 rounded-[2.5rem] overflow-hidden backdrop-blur-3xl">
                                {leaderboard.length === 0 ? (
                                    <div className="p-16 text-center">
                                        <p className="text-xs font-black text-gray-600 uppercase tracking-widest">No points recorded yet. Be the first!</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-white/5">
                                        {leaderboard.map((p, i) => (
                                            <div key={p.id} className={cn(
                                                "flex items-center justify-between px-8 py-5 hover:bg-white/[0.02] transition-all",
                                                i === 0 && "bg-yellow-500/5"
                                            )}>
                                                <div className="flex items-center gap-6">
                                                    <div className={cn(
                                                        "w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm italic font-heading border",
                                                        i === 0 ? "bg-yellow-500 text-black border-yellow-400 shadow-[0_0_20px_rgba(234,179,8,0.3)]" :
                                                        i === 1 ? "bg-zinc-300 text-black border-zinc-200 shadow-[0_0_20px_rgba(255,255,255,0.1)]" :
                                                        i === 2 ? "bg-amber-700 text-white border-amber-600" :
                                                        "bg-zinc-800/80 text-gray-400 border-white/5"
                                                    )}>
                                                        #{i + 1}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black uppercase text-white tracking-tight truncate max-w-[140px] md:max-w-[300px]">{p.name}</p>
                                                        <p className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">Participant</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-2xl font-black font-heading italic text-white leading-none">{p.entryScore || 0}</p>
                                                    <p className="text-[8px] font-black text-neon-blue uppercase tracking-widest mt-1">POINTS</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </section>
                    </>
                )}
            </div>
        </div>
    );
};

export default GiveawayPage;
