import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../lib/store';
import { useStoreSubscription } from '../hooks/useStoreSubscription';
import { cn } from '../lib/utils';
import { 
    Zap, ArrowRight, ArrowLeft, Instagram, Youtube, Users, Target, 
    ShieldCheck, CheckCircle2, ChevronDown, MapPin, 
    Briefcase, HelpCircle, Check, Globe, Mail, LayoutDashboard,
    Star, Menu, X
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import useDynamicMeta from '../hooks/useDynamicMeta';
import ProfilePanel from '../components/ProfilePanel';
import NotificationBell from '../components/NotificationBell';

const CreatorLanding = () => {
    useStoreSubscription(['creators', 'campaigns']);
    useDynamicMeta({
        title: "Newbi Creator",
        description: "Explore campaign opportunities and collaborate with local brands.",
        url: window.location.href
    });

    const navigate = useNavigate();
    const { campaigns, user, creators, artists } = useStore();
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    // Determine if the logged-in user is an existing creator
    const creatorProfile = useMemo(() => {
        if (!user || !creators) return null;
        return creators.find(c => c.uid === user.uid) || null;
    }, [user, creators]);

    const joinedCampaignsCount = useMemo(() => {
        if (!creatorProfile) return 0;
        return (creatorProfile.joinedCampaigns || []).length;
    }, [creatorProfile]);

    // FAQ Accordion State
    const [openFaq, setOpenFaq] = useState(null);

    // Live Campaigns Data Processing
    const liveCampaigns = useMemo(() => {
        return campaigns.filter(c => c.status === 'Open');
    }, [campaigns]);

    // Simplified FAQs for the basic system
    const faqs = [
        { 
            q: 'How do I join the Newbi Creator network?', 
            a: 'Sign in to Newbi, navigate to the Creator section, and submit our simple Creator Registration form. It takes less than two minutes to connect your social handle, operational city, and niches.' 
        },
        { 
            q: 'What kind of campaigns can I participate in?', 
            a: 'You can browse any open campaigns that match your operating location and follower requirements. Once registered, you can apply directly from the campaign brief details page.' 
        },
        { 
            q: 'How do I submit my completed deliverables?', 
            a: 'Once your application is accepted, navigate to your Creator Dashboard workspace, open the active campaign, and submit the link or screenshot proof of your post, reel, or story for admin review.' 
        },
        { 
            q: 'Is there any fee to join the creator network?', 
            a: 'No. Joining the network and applying to campaigns is 100% free for all creators.' 
        }
    ];

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-dark text-gray-900 dark:text-white selection:bg-neon-green selection:text-black font-['Outfit'] overflow-x-hidden relative pb-32">

            <style dangerouslySetInnerHTML={{ __html: `
                @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@100..900&display=swap');
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
                .animate-spin-slow { animation: spin 12s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}} />

            {/* Immersive Ambient Background */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-neon-green/10 rounded-full blur-[160px]  delay-700" />
                <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)', backgroundSize: '80px 80px' }} />
            </div>

            {/* Redesigned Floating Header Navigation - Unified Glassmorphic Capsule */}
            <div className="fixed top-4 left-4 right-4 z-50 max-w-7xl mx-auto md:left-8 md:right-8 lg:left-12 lg:right-12">
                <header className="w-full h-16 bg-gray-100 dark:bg-zinc-950/35 backdrop-blur-3xl border border-black/[0.08] dark:border-white/[0.08] rounded-2xl px-6 md:px-8 flex items-center justify-between shadow-[0_8px_30px_-15px_rgba(0,0,0,0.15)] dark:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] select-none">
                    {/* Left: Logo */}
                    <div className="flex items-center gap-3">
                        <Link to="/creator" className="flex items-center gap-3 group">
                            <div className="w-9 h-9 rounded-xl bg-white text-black flex items-center justify-center font-black text-base shadow-lg group-hover:scale-105 group-hover:shadow-[0_0_20px_rgba(255,255,255,0.4)] transition-all">
                                NB
                            </div>
                            <span className="text-lg font-extrabold tracking-tight text-gray-900 dark:text-white hidden sm:inline">
                                Newbi <span className="text-neon-green">Creator</span>
                            </span>
                        </Link>
                    </div>

                    {/* Center: Desktop Links */}
                    <div className="hidden lg:flex items-center gap-1 bg-white dark:bg-black/20 p-1.5 rounded-full border border-black/10 dark:border-white/5 backdrop-blur-3xl">
                        <a href="#how-it-works" className="px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-gray-900 dark:hover:text-white transition-all rounded-full hover:bg-black/5 dark:hover:bg-white/5">How it works</a>
                        <a href="#missions" className="px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-gray-900 dark:hover:text-white transition-all rounded-full hover:bg-black/5 dark:hover:bg-white/5">Live Gigs</a>
                        <a href="#faqs" className="px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-gray-900 dark:hover:text-white transition-all rounded-full hover:bg-black/5 dark:hover:bg-white/5">FAQs</a>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 sm:gap-3">
                        {/* Desktop buttons */}
                        <div className="hidden md:flex items-center gap-2 sm:gap-3">
                            <Link 
                                to="/"
                                className="h-10 px-4 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-gray-900 dark:text-white font-black uppercase tracking-widest text-[9px] hover:bg-white hover:text-black hover:border-white transition-all flex items-center gap-2 group shrink-0 select-none"
                            >
                                <ArrowLeft size={12} className="group-hover:-translate-x-1 transition-transform text-neon-green" />
                                <span>newbi.live</span>
                            </Link>
                            {creatorProfile ? (
                                <Link 
                                    to="/creator-dashboard"
                                    className="h-10 px-4 rounded-xl bg-neon-green text-black font-black uppercase tracking-widest text-[9px] hover:bg-white hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 group shrink-0 select-none shadow-[0_0_20px_rgba(57,255,20,0.3)]"
                                >
                                    <LayoutDashboard size={12} />
                                    <span>Dashboard</span>
                                    <ArrowRight size={10} className="group-hover:translate-x-1 transition-transform hidden sm:inline" />
                                </Link>
                            ) : (
                                <div className="flex items-center gap-2">
                                    {!user && (
                                        <button 
                                            onClick={() => useStore.getState().setAuthModal(true)}
                                            className="h-10 px-4 rounded-xl bg-black/10 dark:bg-white/10 border border-black/10 dark:border-white/15 text-gray-900 dark:text-white hover:text-neon-green font-black uppercase tracking-widest text-[9px] hover:bg-white/15 transition-all flex items-center gap-1.5 shrink-0 select-none shadow-sm"
                                        >
                                            <span>Creator Sign In</span>
                                        </button>
                                    )}
                                    <Link 
                                        to="/creator/join"
                                        className="h-10 px-4 rounded-xl bg-white text-black font-black uppercase tracking-widest text-[9px] hover:bg-neon-green hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 group shrink-0 select-none shadow-md"
                                    >
                                        <span>Apply Now</span>
                                        <ArrowRight size={10} className="group-hover:translate-x-1 transition-transform hidden sm:inline" />
                                    </Link>
                                </div>
                            )}
                        </div>

                        {user && <div className="h-4 w-px bg-black/10 dark:bg-white/10 mx-0.5 sm:mx-1 hidden md:block" />}
                        
                        <NotificationBell />
                        
                        {user ? (
                            <div 
                                className="flex items-center gap-3 cursor-pointer select-none group/avatar"
                                onClick={() => setIsProfileOpen(true)}
                            >
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-zinc-900 border border-black/10 dark:border-white/10 flex items-center justify-center shrink-0 p-0.5 group-hover/avatar:border-neon-green/50 transition-all shadow-md">
                                        <div className="w-full h-full rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center font-black text-[10px] text-gray-900 dark:text-white group-hover/avatar:text-neon-green">
                                            {user.displayName ? user.displayName.charAt(0) : 'U'}
                                        </div>
                                    </div>
                                    <div className="text-left flex flex-col justify-center hidden md:flex">
                                        <span className="text-[10px] font-bold text-gray-900 dark:text-white leading-none capitalize tracking-tight group-hover/avatar:text-neon-green transition-colors">
                                            {user.displayName?.split(' ')[0] || 'Member'}
                                        </span>
                                        <span className="text-[7px] text-neon-green uppercase tracking-[0.15em] font-black mt-0.5">
                                            {(() => {
                                                if (user.role === 'developer') return 'DEV';
                                                if (user.role === 'founder') return 'FOUNDER';
                                                if (user.role === 'super_admin') return 'ADMIN';
                                                const isApprovedArtist = artists?.some(a => a.uid === user.uid && a.profileStatus === 'approved');
                                                const isApprovedCreator = creators?.some(c => c.uid === user.uid && c.profileStatus === 'approved');
                                                if (isApprovedArtist) return 'ARTIST';
                                                if (isApprovedCreator) return 'CREATOR';
                                                return 'TRIBE MEMBER';
                                            })()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ) : null}

                        {/* Mobile Menu Icon */}
                        <button
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="p-2 lg:hidden rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-gray-900 dark:text-white hover:bg-black/10 dark:hover:bg-white/10 transition-all outline-none"
                        >
                            {isMenuOpen ? <X size={16} /> : <Menu size={16} />}
                        </button>
                    </div>
                </header>
            </div>

            {/* Full-screen Mobile Menu for Creator Landing */}
            <AnimatePresence>
                {isMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="fixed inset-0 z-[100] lg:hidden bg-white dark:bg-black/95 backdrop-blur-2xl flex flex-col justify-start px-6 pt-24 pb-32 overflow-y-auto"
                    >
                        <button 
                            onClick={() => setIsMenuOpen(false)}
                            className="absolute top-10 right-10 p-4 rounded-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-gray-900 dark:text-white"
                        >
                            <X size={24} />
                        </button>

                        <div className="w-full space-y-2 mb-auto shrink-0 pb-12">
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] mb-6 text-center">Navigation</p>
                            
                            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 }}>
                                <a
                                    href="#how-it-works"
                                    onClick={() => setIsMenuOpen(false)}
                                    className="flex items-center gap-6 p-6 rounded-3xl border border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-all group"
                                >
                                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-black/5 dark:bg-white/5 text-gray-500 group-hover:text-gray-900 dark:group-hover:text-white transition-all">
                                        <Briefcase size={22} />
                                    </div>
                                    <span className="text-2xl font-black uppercase italic tracking-tighter">How it works</span>
                                </a>
                            </motion.div>

                            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
                                <a
                                    href="#missions"
                                    onClick={() => setIsMenuOpen(false)}
                                    className="flex items-center gap-6 p-6 rounded-3xl border border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-all group"
                                >
                                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-black/5 dark:bg-white/5 text-gray-500 group-hover:text-gray-900 dark:group-hover:text-white transition-all">
                                        <Target size={22} />
                                    </div>
                                    <span className="text-2xl font-black uppercase italic tracking-tighter">Live Gigs</span>
                                </a>
                            </motion.div>

                            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}>
                                <a
                                    href="#faqs"
                                    onClick={() => setIsMenuOpen(false)}
                                    className="flex items-center gap-6 p-6 rounded-3xl border border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-all group"
                                >
                                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-black/5 dark:bg-white/5 text-gray-500 group-hover:text-gray-900 dark:group-hover:text-white transition-all">
                                        <HelpCircle size={22} />
                                    </div>
                                    <span className="text-2xl font-black uppercase italic tracking-tighter">FAQs</span>
                                </a>
                            </motion.div>
                        </div>

                        <div className="w-full pt-8 mt-4 border-t border-black/10 dark:border-white/10 flex flex-col items-stretch gap-4 shrink-0">
                            <Link 
                                to="/"
                                onClick={() => setIsMenuOpen(false)}
                                className="w-full h-14 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-gray-900 dark:text-white flex items-center justify-center gap-3 rounded-2xl font-black uppercase tracking-widest text-sm active:scale-95 transition-all"
                            >
                                <ArrowLeft size={16} className="text-neon-green" />
                                BACK TO NEWBI.LIVE
                            </Link>

                            {creatorProfile ? (
                                <Link 
                                    to="/creator-dashboard" 
                                    onClick={() => setIsMenuOpen(false)}
                                    className="w-full h-14 bg-neon-green text-black flex items-center justify-center gap-3 rounded-2xl font-black uppercase tracking-widest text-sm shadow-[0_10px_30px_rgba(57,255,20,0.2)] active:scale-95 transition-all"
                                >
                                    <LayoutDashboard size={16} />
                                    CREATOR DASHBOARD
                                </Link>
                            ) : (
                                <>
                                    <Link 
                                        to="/creator/join" 
                                        onClick={() => setIsMenuOpen(false)}
                                        className="w-full h-14 bg-neon-green text-black flex items-center justify-center gap-3 rounded-2xl font-black uppercase tracking-widest text-sm shadow-[0_10px_30px_rgba(57,255,20,0.2)] active:scale-95 transition-all"
                                    >
                                        APPLY AS CREATOR
                                    </Link>
                                    {!user && (
                                        <button
                                            onClick={() => { useStore.getState().setAuthModal(true); setIsMenuOpen(false); }}
                                            className="w-full h-14 rounded-2xl bg-black/10 dark:bg-white/10 border border-black/20 dark:border-white/20 text-gray-900 dark:text-white font-black uppercase tracking-widest text-sm hover:bg-white hover:text-black transition-all"
                                        >
                                            ALREADY A CREATOR? SIGN IN
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <main className="relative z-10 max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-12 pt-32 md:pt-40 space-y-16 lg:space-y-32">
                {/* CINEMATIC HERO SECTION */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center pt-8">
                    <motion.div 
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                        className="lg:col-span-7 space-y-8"
                    >
                        <div className="flex items-center gap-2.5 text-neon-green tracking-[0.3em] text-[10px] font-bold uppercase">
                            <Zap size={14} className="animate-spin-slow text-neon-green" />
                            <span>{creatorProfile ? `Welcome back, ${creatorProfile.name?.split(' ')[0] || 'Creator'}` : 'Creator Workspace'}</span>
                        </div>

                        <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight leading-[1.05] text-gray-900 dark:text-white pr-4">
                            Collaborate with <span className="text-transparent bg-clip-text bg-gradient-to-r from-black via-black to-neon-green dark:from-white dark:via-white dark:to-neon-green">brands at scale.</span>
                        </h1>

                        <p className="text-gray-600 dark:text-gray-400 text-base md:text-xl font-medium leading-relaxed max-w-2xl">
                            Discover open campaigns in your city, align with campaign requirements, submit deliverables directly, and track your submission statuses from your creator dashboard.
                        </p>

                        <div className="pt-4">
                            {creatorProfile ? (
                                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 w-full">
                                    <Button 
                                        onClick={() => navigate('/creator-dashboard')}
                                        className="h-14 sm:h-16 md:h-20 px-6 sm:px-10 md:px-12 rounded-2xl bg-black text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neon-green dark:hover:text-black font-black uppercase tracking-[0.2em] text-xs md:text-sm shadow-xl transition-all group flex items-center justify-center gap-3"
                                    >
                                        <LayoutDashboard size={20} />
                                        <span>Enter Dashboard</span> 
                                        <ArrowRight size={20} className="group-hover:translate-x-2 transition-transform" />
                                    </Button>
                                    <Button 
                                        onClick={() => navigate('/campaigns')}
                                        className="h-14 sm:h-16 md:h-20 px-6 sm:px-10 md:px-12 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-gray-900 dark:text-white font-black uppercase tracking-[0.2em] text-xs md:text-sm hover:bg-black/10 dark:hover:bg-white/10 hover:border-black/20 dark:hover:border-white/20 transition-all backdrop-blur-xl shadow-2xl flex items-center justify-center gap-3"
                                    >
                                        <Globe size={20} className="text-neon-green" />
                                        <span>Browse Campaigns</span>
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-4 w-full">
                                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 w-full">
                                        <Button 
                                            onClick={() => navigate('/creator/join')}
                                            className="h-14 sm:h-16 md:h-20 px-6 sm:px-10 md:px-12 rounded-2xl bg-black text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neon-green dark:hover:text-black font-black uppercase tracking-[0.2em] text-xs md:text-sm shadow-xl transition-all group flex items-center justify-center gap-3"
                                        >
                                            <span>Join as a Creator</span> 
                                            <ArrowRight size={20} className="group-hover:translate-x-2 transition-transform" />
                                        </Button>
                                        <Button 
                                            onClick={() => navigate('/contact')}
                                            className="h-14 sm:h-16 md:h-20 px-6 sm:px-10 md:px-12 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-gray-900 dark:text-white font-black uppercase tracking-[0.2em] text-xs md:text-sm hover:bg-black/10 dark:hover:bg-white/10 hover:border-black/20 dark:hover:border-white/20 transition-all backdrop-blur-xl shadow-2xl flex items-center justify-center gap-3"
                                        >
                                            <Mail size={20} className="text-neon-green" />
                                            <span>Partner as a Brand</span>
                                        </Button>
                                    </div>

                                    <div className="pt-2">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (user) {
                                                    navigate('/creator-dashboard');
                                                } else {
                                                    useStore.getState().setAuthModal(true);
                                                }
                                            }}
                                            className="text-xs font-bold text-gray-900 dark:text-white/70 hover:text-neon-green transition-colors inline-flex items-center gap-1.5 group/signin"
                                        >
                                            <span>Already a Creator?</span>
                                            <span className="underline underline-offset-4 text-neon-green font-extrabold group-hover/signin:text-gray-900 dark:signin:text-white transition-colors">Access Dashboard / Sign In</span>
                                            <ArrowRight size={13} className="text-neon-green group-hover/signin:translate-x-0.5 transition-transform" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>

                    {/* Right Hero Visual: Dynamic based on auth state */}
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="lg:col-span-5 relative flex flex-col items-center justify-center"
                    >

                        {creatorProfile ? (
                            /* LOGGED-IN CREATOR: Live Profile Preview */
                            <div className="w-full max-w-lg bg-gray-100 dark:bg-slate-900/40 backdrop-blur-3xl border border-black/10 dark:border-white/5 rounded-[2rem] sm:rounded-[3rem] p-5 sm:p-8 md:p-10 shadow-2xl relative z-10 space-y-6 group hover:border-neon-green/20 transition-all duration-500">
                                <div className="flex items-center justify-between border-b border-black/10 dark:border-white/5 pb-4">
                                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Your Profile</span>
                                    <span className="w-3.5 h-3.5 rounded-full bg-neon-green shadow-[0_0_10px_#39FF14] " />
                                </div>

                                {/* Avatar & Identity */}
                                <div className="flex items-center gap-5">
                                    <div className="relative">
                                        <div className="w-20 h-20 rounded-2xl bg-gray-100 dark:bg-slate-950 border border-black/10 dark:border-white/10 overflow-hidden shadow-2xl">
                                            {creatorProfile.profilePicture ? (
                                                <img src={creatorProfile.profilePicture} alt="" className="w-full h-full object-cover object-top" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-2xl font-black text-gray-900 dark:text-white italic">
                                                    {creatorProfile.name?.charAt(0) || 'C'}
                                                </div>
                                            )}
                                        </div>
                                        <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-gray-50 dark:bg-dark rounded-full flex items-center justify-center border border-black/10 dark:border-white/5">
                                            <div className="w-4 h-4 bg-neon-green rounded-full flex items-center justify-center shadow-[0_0_10px_rgba(57,255,20,0.4)]">
                                                <CheckCircle2 size={10} className="text-black" />
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h4 className="text-lg font-extrabold text-gray-900 dark:text-white tracking-tight">{creatorProfile.name}</h4>
                                            {creatorProfile.profileStatus === 'approved' && <ShieldCheck size={16} className="text-neon-green" />}
                                        </div>
                                        <p className="text-[10px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest mt-1 flex items-center gap-1.5">
                                            <MapPin size={10} className="text-neon-green" /> {creatorProfile.city || 'Not set'}
                                        </p>
                                        <div className={cn("mt-2 px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest border inline-block",
                                            creatorProfile.profileStatus === 'approved' ? 'bg-neon-green/10 text-neon-green border-neon-green/20' : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20')}>
                                            {creatorProfile.profileStatus === 'approved' ? 'Verified' : (creatorProfile.profileStatus || 'Pending').toUpperCase()}
                                        </div>
                                    </div>
                                </div>

                                {/* Stats Grid */}
                                <div className="grid grid-cols-3 gap-2 sm:gap-4 p-4 sm:p-5 bg-white/[0.02] border border-black/10 dark:border-white/5 rounded-2xl">
                                    <div className="text-center">
                                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Campaigns</p>
                                        <p className="text-xl font-black text-gray-900 dark:text-white">{joinedCampaignsCount}</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Followers</p>
                                        <p className="text-xl font-black text-neon-green">{Number(creatorProfile.instagramFollowers || 0).toLocaleString()}</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Niches</p>
                                        <p className="text-xl font-black text-neon-green">{(creatorProfile.specializations || []).length}</p>
                                    </div>
                                </div>

                                {/* Niches Tags */}
                                {(creatorProfile.specializations || []).length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {(creatorProfile.specializations || []).slice(0, 4).map((tag, i) => (
                                            <span key={i} className="px-3 py-1 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-[10px] font-black uppercase tracking-widest text-gray-700 dark:text-gray-300">{tag}</span>
                                        ))}
                                    </div>
                                )}

                                {/* Enter Dashboard CTA */}
                                <Button 
                                    onClick={() => navigate('/creator-dashboard')}
                                    className="w-full h-14 rounded-2xl bg-white text-black font-black uppercase tracking-widest text-[10px] hover:bg-neon-green transition-all shadow-xl flex items-center justify-center gap-2 group"
                                >
                                    <LayoutDashboard size={16} />
                                    <span>Open Creator Dashboard</span>
                                    <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                                </Button>
                            </div>
                        ) : (
                            /* LOGGED-OUT / NEW USER: Workflow Preview */
                            <div className="w-full max-w-lg bg-gray-100 dark:bg-slate-900/40 backdrop-blur-3xl border border-black/10 dark:border-white/5 rounded-[2rem] sm:rounded-[3rem] p-5 sm:p-8 md:p-10 shadow-2xl relative z-10 space-y-6 group hover:border-neon-green/20 transition-all duration-500">
                                <div className="flex items-center justify-between border-b border-black/10 dark:border-white/10 pb-4">
                                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Creator Pipeline</span>
                                    <span className="w-3.5 h-3.5 rounded-full bg-neon-green  " />
                                </div>

                                <div className="space-y-5">
                                    <div className="flex items-start gap-4 p-4 bg-white/[0.02] border border-black/10 dark:border-white/5 rounded-2xl">
                                        <div className="w-10 h-10 rounded-xl bg-neon-green/10 border border-neon-green/20 flex items-center justify-center text-neon-green shrink-0"><Users size={18} /></div>
                                        <div>
                                            <h5 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider">1. Register Profile</h5>
                                            <p className="text-[10px] font-bold text-gray-600 dark:text-gray-400 mt-1 leading-normal">Connect your social handle and details to create your workspace.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-4 p-4 bg-white/[0.02] border border-black/10 dark:border-white/5 rounded-2xl">
                                        <div className="w-10 h-10 rounded-xl bg-neon-green/10 border border-neon-green/20 flex items-center justify-center text-neon-green shrink-0"><Target size={18} /></div>
                                        <div>
                                            <h5 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider">2. Apply to Campaigns</h5>
                                            <p className="text-[10px] font-bold text-gray-600 dark:text-gray-400 mt-1 leading-normal">Browse and apply directly to gigs matching your city and niche.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-4 p-4 bg-white/[0.02] border border-black/10 dark:border-white/5 rounded-2xl">
                                        <div className="w-10 h-10 rounded-xl bg-neon-green/10 border border-neon-green/20 flex items-center justify-center text-neon-green shrink-0"><CheckCircle2 size={18} /></div>
                                        <div>
                                            <h5 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider">3. Submit & Track</h5>
                                            <p className="text-[10px] font-bold text-gray-600 dark:text-gray-400 mt-1 leading-normal">Upload deliverable proof and track verification in real-time.</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-4 border-t border-black/10 dark:border-white/10 text-[10px] font-black uppercase tracking-widest text-gray-500">
                                    <span className="flex items-center gap-1.5"><ShieldCheck size={12} className="text-neon-green" /> Verified Creator Workflow</span>
                                    <span className="text-gray-900 dark:text-white hover:underline cursor-pointer flex items-center gap-1" onClick={() => navigate('/creator/join')}>Get Started <ArrowRight size={12} /></span>
                                </div>
                            </div>
                        )}
                    </motion.div>
                </div>

                {/* HOW IT WORKS SECTION */}
                <motion.section id="how-it-works" className="space-y-16 pt-12">
                    <div className="text-center max-w-3xl mx-auto space-y-4">
                        <h2 className="text-3xl sm:text-5xl font-extrabold font-heading tracking-tight text-gray-900 dark:text-white pr-4 leading-none">
                            Simple, <span className="text-transparent bg-clip-text bg-gradient-to-r from-black via-black to-neon-green dark:from-white dark:via-white dark:to-neon-green">transparent workflow.</span>
                        </h2>
                        <p className="text-gray-600 dark:text-gray-400 text-sm md:text-base font-bold uppercase tracking-widest leading-relaxed">
                            No fake metrics, no complex packages. A simple system to track and submit your creative content.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 pt-4">
                        {[
                            { title: 'Create Profile', desc: 'Register with your name, city, social handles, and categories. Our platform verifies profile legitimacy without complex audits.', step: '01' },
                            { title: 'Browse Gigs', desc: 'Filter missions based on platform requirements (Instagram, YouTube), niches, target locations, and post rules.', step: '02' },
                            { title: 'Upload Deliverables', desc: 'When you complete a task, submit the live link or screenshot directly within your creator workspace.', step: '03' },
                            { title: 'Monitor Verification', desc: 'Track your submission state as it transitions from Submitted to Approved in real-time on your dashboard.', step: '04' }
                        ].map((item, idx) => (
                            <div key={idx} className="bg-gray-100 dark:bg-slate-900/30 backdrop-blur-3xl border border-black/10 dark:border-white/5 hover:border-gray-300 dark:hover:border-white/15 rounded-[2rem] sm:rounded-[3rem] p-6 sm:p-8 md:p-10 space-y-6 sm:space-y-8 transition-all duration-500 hover:-translate-y-1.5 shadow-2xl group flex flex-col justify-between">
                                <div className="space-y-6">
                                    <span className="text-4xl font-black font-mono text-neon-green/30 group-hover:text-neon-green transition-colors">{item.step}</span>
                                    <h3 className="text-2xl font-extrabold font-heading tracking-tight text-gray-900 dark:text-white pr-2">{item.title}</h3>
                                    <p className="text-gray-600 dark:text-gray-400 text-sm font-medium leading-relaxed">{item.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.section>


                {/* LIVE CAMPAIGNS DIRECTORY */}
                <motion.section id="missions" className="space-y-12 pt-12">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-black/10 dark:border-white/5 pb-8">
                        <div>
                            <div className="flex items-center gap-3 text-neon-green font-black tracking-[0.4em] text-[10px] uppercase mb-2">
                                <Target size={14} className="" />
                                LIVE CAMPAIGNS DIRECTORY
                            </div>
                            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-gray-900 dark:text-white pr-4 leading-none">
                                Active <span className="text-transparent bg-clip-text bg-gradient-to-r from-black via-black to-neon-green dark:from-white dark:via-white dark:to-neon-green">Briefs.</span>
                            </h2>
                        </div>
                        <Button 
                            onClick={() => navigate('/campaigns')}
                            className="h-14 px-8 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-gray-900 dark:text-white font-black uppercase tracking-[0.2em] text-xs hover:bg-white hover:text-black transition-all shadow-xl shrink-0 flex items-center gap-2"
                        >
                            <span>Explore Full Directory</span> 
                            <ArrowRight size={16} />
                        </Button>
                    </div>

                    {liveCampaigns.length === 0 ? (
                        <div className="py-20 text-center bg-white/[0.01] border border-black/10 dark:border-white/5 rounded-3xl">
                            <p className="text-gray-600 dark:text-gray-400 text-base font-bold uppercase tracking-widest">No active open briefs right now.</p>
                            <p className="text-gray-600 text-xs font-bold uppercase tracking-widest mt-2">Apply as a creator to be notified when brand missions go live.</p>
                            <Button 
                                onClick={() => navigate('/creator/join')}
                                className="h-12 px-6 rounded-xl bg-white text-black font-black uppercase tracking-widest text-[10px] mt-6 shadow-xl"
                            >
                                Register Profile
                            </Button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pt-4">
                            {liveCampaigns.slice(0, 3).map((camp) => (
                                <div key={camp.id} className="group bg-gray-100 dark:bg-zinc-950/45 backdrop-blur-3xl border border-gray-200 dark:border-white/[0.08] hover:border-neon-green/30 rounded-[2.2rem] overflow-hidden flex flex-col transition-all duration-500 hover:-translate-y-2 shadow-lg dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_10px_30px_rgba(0,0,0,0.5)] hover:shadow-xl dark:hover:shadow-[0_20px_50px_rgba(57,255,20,0.1)] relative">
                                    {camp.thumbnail && (
                                        <div className="aspect-video relative overflow-hidden bg-gray-100 dark:bg-zinc-900 shrink-0">
                                            <img src={camp.thumbnail} alt={camp.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out opacity-80" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent pointer-events-none" />
                                            <div className="absolute top-6 left-6 flex flex-wrap gap-2 z-10">
                                                <span className="px-3.5 py-1.5 rounded-full bg-white dark:bg-black/60 backdrop-blur-md border border-black/10 dark:border-white/10 text-[9px] font-black uppercase tracking-widest text-neon-green flex items-center gap-1.5 shadow-xl">
                                                    <MapPin size={12} /> {camp.targetCity || 'Universal'}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                    <div className="p-6 sm:p-8 flex-1 flex flex-col justify-between space-y-6 bg-gradient-to-b from-transparent to-zinc-950/40">
                                        <div className="space-y-3">
                                            <span className="text-[10px] font-black text-neon-green uppercase tracking-[0.2em]">{camp.category || 'Brand Mission'}</span>
                                            <h4 className="text-xl md:text-2xl font-black font-heading tracking-tight text-gray-900 dark:text-white group-hover:text-neon-green transition-colors line-clamp-2 uppercase italic leading-none">{camp.title}</h4>
                                            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-600 dark:text-gray-400 pt-3 border-t border-black/10 dark:border-white/5">
                                                <Users size={12} className="text-neon-green" />
                                                <span>Min. {Number(camp.minInstagramFollowers || 0).toLocaleString()} Followers Required</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between pt-4 border-t border-black/10 dark:border-white/5 mt-auto">
                                            <div>
                                                <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-0.5">Reward</p>
                                                <p className="text-sm font-black text-neon-green uppercase truncate max-w-[150px] italic">{camp.reward}</p>
                                            </div>
                                            <Button 
                                                onClick={() => navigate(`/campaign/${camp.id}`)}
                                                className="h-12 px-6 rounded-full bg-white text-black font-black uppercase tracking-widest text-[10px] group-hover:bg-neon-green group-hover:text-black transition-all duration-300 hover:scale-105 shadow-xl flex items-center gap-2 border-none"
                                            >
                                                <span>View Brief</span>
                                                <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </motion.section>

                {/* FAQ SECTION */}
                <motion.section id="faqs" className="max-w-4xl mx-auto space-y-12 pt-12">
                    <div className="text-center space-y-4">
                        <h2 className="text-3xl sm:text-5xl font-extrabold font-heading tracking-tight text-gray-900 dark:text-white pr-4 leading-none">
                            Frequently Asked <span className="text-transparent bg-clip-text bg-gradient-to-r from-black via-black to-neon-green dark:from-white dark:via-white dark:to-neon-green">Questions.</span>
                        </h2>
                        <p className="text-gray-600 dark:text-gray-400 text-sm md:text-base font-bold uppercase tracking-widest">Clear and direct answers about application and delivery flow.</p>
                    </div>

                    <div className="space-y-4 pt-4">
                        {faqs.map((faq, i) => (
                            <div key={i} className="bg-gray-100 dark:bg-slate-900/10 border border-black/10 dark:border-white/5 rounded-[1.8rem] overflow-hidden backdrop-blur-xl hover:border-black/10 dark:hover:border-white/10 transition-all duration-300 shadow-xl">
                                <button 
                                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                                    className="w-full p-8 text-left flex items-center justify-between gap-6 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
                                >
                                    <span className="text-base md:text-lg font-black uppercase tracking-tight italic text-gray-900 dark:text-white">{faq.q}</span>
                                    <div className={cn("w-10 h-10 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 flex items-center justify-center shrink-0 transition-transform duration-500 shadow-md", openFaq === i ? "rotate-180 bg-white text-black" : "text-gray-600 dark:text-gray-400")}>
                                        <ChevronDown size={16} />
                                    </div>
                                </button>
                                <AnimatePresence>
                                    {openFaq === i && (
                                        <motion.div 
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.3 }}
                                            className="px-8 pb-8 text-sm md:text-base text-gray-600 dark:text-gray-400 font-medium leading-relaxed border-t border-black/10 dark:border-white/5 pt-6"
                                        >
                                            {faq.a}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        ))}
                    </div>
                </motion.section>

                {/* BOTTOM CTA BANNER */}
                <motion.section className="relative bg-gray-100 dark:bg-zinc-950/65 backdrop-blur-3xl border border-black/20 dark:border-white/20 rounded-[2rem] sm:rounded-[3rem] md:rounded-[4rem] p-8 sm:p-12 md:p-24 text-center overflow-hidden  mt-12">

                    <div className="relative z-10 max-w-3xl mx-auto space-y-10">
                        <div className="w-20 h-20 bg-white text-black rounded-[2.5rem] flex items-center justify-center mx-auto shadow-2xl">
                            <Zap size={36} className="text-black animate-spin-slow" />
                        </div>
                        <h2 className="text-4xl sm:text-6xl font-extrabold font-heading tracking-tight text-gray-900 dark:text-white pr-4 leading-[1.1]">
                            {creatorProfile ? 'Your Creator Hub.' : 'Ready to join Newbi Creator?'}
                        </h2>
                        <p className="text-gray-700 dark:text-gray-300 text-base md:text-xl font-bold uppercase tracking-widest leading-relaxed max-w-2xl mx-auto">
                            {creatorProfile ? 'Access your dashboard to manage campaigns, submit deliverables, and track your progress.' : 'Connect your profile, explore open brand campaigns, and track all your deliverables.'}
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                            {creatorProfile ? (
                                <Button 
                                    onClick={() => navigate('/creator-dashboard')}
                                    className="w-full sm:w-auto h-16 sm:h-20 px-10 sm:px-16 rounded-2xl bg-white text-black font-black uppercase tracking-[0.2em] text-xs sm:text-sm shadow-[0_0_50px_rgba(255,255,255,0.3)] hover:bg-neon-green hover:text-black transition-all hover:scale-105 flex items-center justify-center gap-3"
                                >
                                    <LayoutDashboard size={20} />
                                    <span>Open Dashboard</span> 
                                    <ArrowRight size={20} />
                                </Button>
                            ) : (
                                <Button 
                                    onClick={() => navigate('/creator/join')}
                                    className="w-full sm:w-auto h-16 sm:h-20 px-10 sm:px-16 rounded-2xl bg-white text-black font-black uppercase tracking-[0.2em] text-xs sm:text-sm shadow-[0_0_50px_rgba(255,255,255,0.3)] hover:bg-neon-green hover:text-black transition-all hover:scale-105 flex items-center justify-center gap-3"
                                
                                >
                                    <span>Register Profile</span> 
                                    <ArrowRight size={20} />
                                </Button>
                            )}
                        </div>
                    </div>
                </motion.section>
            </main>

            {/* Profile modal drawer */}
            <ProfilePanel isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
        </div>
    );
};

export default CreatorLanding;
