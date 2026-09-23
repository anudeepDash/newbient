import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../lib/store';
import { useStoreSubscription } from '../hooks/useStoreSubscription';
import { useTheme } from '../hooks/useTheme';
import { cn, normalizePhoneNumber } from '../lib/utils';
import { 
    ArrowRight, ArrowLeft, Users, ShieldCheck, ChevronDown, 
    Briefcase, LayoutDashboard, Menu, X, Ticket, Coins, Sun, Moon,
    Star, Quote, MapPin, TrendingUp, Zap, Globe, Sparkles, Target, Instagram, Youtube
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import useDynamicMeta from '../hooks/useDynamicMeta';
import ProfilePanel from '../components/ProfilePanel';
import NotificationBell from '../components/NotificationBell';
import PastClients from '../components/home/PastClients';
import CreatorPassCard from '../components/creator/CreatorPassCard';
import CampaignDetailModal from '../components/creator/CampaignDetailModal';
import CampaignCard from '../components/ui/CampaignCard';
import { HorizontalCarousel } from '../components/ui/HorizontalCarousel';
import newbiCreatorsLogoDark from '../assets/newbi-creators-logo.png';
import newbiCreatorsLogoLight from '../assets/newbi-creators-logo-light.png';

/**
 * Intelligent, warm, time-aware greetings in Claude's signature conversational style.
 */
const getClaudeGreeting = (name) => {
    if (!name) return "India's Elite Creator Collective";
    const firstName = name.trim().split(' ')[0] || name;
    const hour = new Date().getHours();

    const morningGreetings = [
        `Good morning, ${firstName}`,
        `Rise and shine, ${firstName}`,
        `Ready to create today, ${firstName}?`,
        `Great to see you this morning, ${firstName}`,
        `Let's make something iconic today, ${firstName}`,
        `Hope your morning is off to a great start, ${firstName}`,
    ];
    const afternoonGreetings = [
        `Good afternoon, ${firstName}`,
        `Hope your day is going great, ${firstName}`,
        `Ready to make magic, ${firstName}?`,
        `Back in the creative flow, ${firstName}`,
        `Great to see you this afternoon, ${firstName}`,
        `Hope you're having an inspired day, ${firstName}`,
    ];
    const eveningGreetings = [
        `Good evening, ${firstName}`,
        `Hope you had a productive day, ${firstName}`,
        `Back in the creative zone, ${firstName}`,
        `Great to see you tonight, ${firstName}`,
        `Ready for your next big drop, ${firstName}?`,
        `Evening, ${firstName} • Ready to make something iconic?`,
    ];
    const lateNightGreetings = [
        `Late-night creativity hits different, ${firstName}`,
        `Burning the midnight oil, ${firstName}?`,
        `In the flow state, ${firstName}`,
        `Quiet hours, big ideas, ${firstName}`,
        `Great ideas happen after midnight, ${firstName}`,
    ];

    let pool = afternoonGreetings;
    if (hour >= 5 && hour < 12) pool = morningGreetings;
    else if (hour >= 12 && hour < 17) pool = afternoonGreetings;
    else if (hour >= 17 && hour < 22) pool = eveningGreetings;
    else pool = lateNightGreetings;

    return pool[Math.floor(Math.random() * pool.length)];
};

const CreatorLanding = () => {
    useStoreSubscription(['campaigns', 'pastClients', 'creatorTestimonials']);
    useDynamicMeta({
        title: "Newbi Creator Network • Brand Campaigns & Concert Experiences",
        description: "Join India's premier creator collective. Collaborate with iconic brands, access front-row concerts, and unlock real-world perks. 100% free to join.",
        url: window.location.href
    });

    const navigate = useNavigate();
    const { user, campaigns, siteSettings, creatorTestimonials, resolveCreatorProfile } = useStore();
    const { theme, toggleTheme } = useTheme();
    const isDark = theme === 'dark';

    const activeCampaigns = useMemo(() => {
        return (campaigns || []).filter(c => !c.status || c.status.toLowerCase() === 'open');
    }, [campaigns]);

    const activeTestimonials = useMemo(() => (creatorTestimonials || []).filter(t => t.isActive !== false), [creatorTestimonials]);

    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [openFaq, setOpenFaq] = useState(null);
    const [selectedCampaignForModal, setSelectedCampaignForModal] = useState(null);
    const [isScrolled, setIsScrolled] = useState(false);

    const [resolvedCreator, setResolvedCreator] = useState(null);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 50);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        if (user) {
            resolveCreatorProfile(user).then(found => {
                setResolvedCreator(found || null);
            }).catch(err => console.error("Error resolving creator for landing page:", err));
        } else {
            setResolvedCreator(null);
        }
    }, [user, resolveCreatorProfile]);

    const activeCreator = useMemo(() => {
        if (!user) return null;
        if (resolvedCreator) {
            return {
                ...resolvedCreator,
                displayName: resolvedCreator.name || resolvedCreator.displayName || user.displayName || 'Creator',
                profilePicture: resolvedCreator.profilePicture || resolvedCreator.profileImage || user.photoURL || null
            };
        }
        // If user is signed in but hasn't finalized creator record yet, personalize card with their authenticated profile
        return {
            uid: user.uid,
            name: user.displayName || 'Member',
            displayName: user.displayName || 'Member',
            email: user.email,
            profilePicture: user.photoURL || null,
            city: 'Pan-India',
            instagram: user.displayName ? user.displayName.toLowerCase().replace(/\s+/g, '') : 'creator',
            profileStatus: 'unclaimed',
            points: 500,
            isVerified: false,
        };
    }, [user, resolvedCreator]);

    const isActualCreator = Boolean(resolvedCreator && resolvedCreator.profileStatus !== 'unclaimed');

    // Dynamic Claude-style greeting computed per session
    const greetingText = useMemo(() => {
        if (!activeCreator) return "India's Elite Creator Collective";
        const firstName = (activeCreator.name || activeCreator.displayName || 'Creator').trim().split(' ')[0];
        return getClaudeGreeting(firstName);
    }, [activeCreator?.uid, activeCreator?.name, activeCreator?.displayName]);

    const faqs = [
        { 
            q: 'Is Newbi Creator free to join?', 
            a: 'Yes, 100% free forever. There are zero application fees, no monthly subscriptions, and no hidden charges to join the collective or participate in brand briefs.' 
        },
        { 
            q: 'How does the Newbi Points system work?', 
            a: 'Points are extra perks! You earn Newbi Points for signing up, referring fellow creators, and completing special community quests. Points can be redeemed for exclusive concert ticket drops, brand vouchers, and curated lifestyle drops. Campaign deliverables earn direct brand rewards independently.' 
        },
        { 
            q: 'What kind of campaigns and activations are available?', 
            a: 'We curate high-impact brand collaborations spanning lifestyle, fashion, tech, beverage, and youth culture. Activations include social reels, photo stories, exclusive festival visits, and experiential pop-ups.' 
        },
        { 
            q: 'How do I get festival and experiential access?', 
            a: 'Newbi partners directly with India’s biggest live entertainment tours and music festivals. As an active roster creator, you get invited to experiential coverage gigs, artist lounge access, and exclusive ticket drop allocations.' 
        },
        { 
            q: 'How do I know this is legitimate?', 
            a: 'Newbi is an established cultural agency and brand platform working directly with Tier-1 global and Indian brands. Every brief is vetted, and our in-house talent team provides direct support for every activation.' 
        },
        { 
            q: 'What are the eligibility requirements?', 
            a: 'We welcome active creators with authentic engagement on Instagram, YouTube, or LinkedIn. Whether you are a micro-creator with a dedicated niche or a macro-influencer, campaigns are matched to your target demographic.' 
        },
        { 
            q: 'How do I submit campaign deliverables?', 
            a: 'Everything is managed through your sleek Creator Dashboard. Once selected for a campaign, you simply post according to the brief guidelines and submit your live links or screenshots for instant verification.' 
        },
        { 
            q: 'Can I invite other creators?', 
            a: 'Absolutely! Each creator receives a unique referral code. When a creator you refer signs up and completes their first verification, you both receive bonus Newbi Points.' 
        },
    ];

    const steps = [
        { 
            num: '01', 
            title: 'Profile Setup', 
            desc: 'Register with your social handles, city, and content niches in 2 minutes. Free forever, no agency lock-in.'
        },
        { 
            num: '02', 
            title: 'Discover & Match', 
            desc: 'Browse curated brand briefs and experiential concert activations matched to your aesthetic and audience.'
        },
        { 
            num: '03', 
            title: 'Create & Submit', 
            desc: 'Attend the experience or publish your creative deliverables. Submit proofs effortlessly via your creator studio.'
        },
        { 
            num: '04', 
            title: 'Unlock Perks & Access', 
            desc: 'Claim guaranteed brand rewards, festival entries, exclusive experiences, and stack up bonus Newbi Points.'
        },
    ];

    const perks = [
        { 
            icon: Briefcase,
            title: 'Curated Brand Collabs', 
            desc: 'Direct briefs with leading brands in lifestyle, tech, fashion, and beverages. Zero middleman cuts or spam.'
        },
        { 
            icon: Ticket,
            title: 'Concert & Festival Access', 
            desc: "Front-row passes and backstage access to India's biggest music festivals, stadium tours, and pop-culture summits."
        },
        { 
            icon: Coins,
            title: 'Redeemable Creator Points', 
            desc: 'Collect bonus points for milestones, quests, and referrals. Redeem for festival drops, merchandise, and gift cards.'
        },
        { 
            icon: ShieldCheck,
            title: 'Verified Roster Status', 
            desc: 'An official Newbi Verified badge that establishes your authority and prioritizes your profile to top brand managers.'
        },
        { 
            icon: LayoutDashboard,
            title: 'Real-Time Creator Studio', 
            desc: 'Track brief milestones, live submissions, points ledger, and campaign statuses seamlessly in one powerful dashboard.'
        },
        { 
            icon: Users, 
            title: 'Creator Community & Summits', 
            desc: "Join a curated network of visionary creators across India. Collaborate, network, and attend private masterclasses."
        },
    ];

    return (
        <div className="min-h-screen bg-[#fafafa] dark:bg-[#08090d] text-gray-900 dark:text-white selection:bg-neon-green selection:text-black font-heading transition-colors duration-300 relative overflow-x-hidden">

            {/* Ambient Background Effects */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-24 left-1/3 w-[500px] h-[300px] bg-neon-green/[0.025] dark:bg-neon-green/[0.02] rounded-full blur-[120px]" />
                <div className="hidden dark:block absolute inset-0" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
            </div>

            {/* ===== FLOATING NAVBAR ===== */}
            <div className="fixed top-4 left-4 right-4 z-50 max-w-7xl mx-auto md:left-8 md:right-8 lg:left-12 lg:right-12">
                <header className="w-full h-16 bg-white/80 dark:bg-[#0C1017]/80 backdrop-blur-2xl border border-black/5 dark:border-white/10 rounded-2xl px-5 md:px-7 flex items-center justify-between shadow-lg shadow-black/[0.03] dark:shadow-black/40 transition-colors duration-300">
                    {/* Brand Logo */}
                    <div className="flex items-center gap-3">
                        <Link to="/creator" className="flex items-center gap-2 group">
                            <img 
                                src={isDark ? newbiCreatorsLogoDark : newbiCreatorsLogoLight} 
                                alt="Newbi Creators" 
                                className="h-6 w-auto object-contain transition-transform group-hover:scale-105" 
                            />
                        </Link>
                    </div>

                    {/* Navigation Pills */}
                    <nav className="hidden lg:flex items-center gap-1 bg-gray-100/80 dark:bg-white/5 p-1 rounded-full border border-gray-200/60 dark:border-white/5">
                        <a href="#campaigns" className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white transition-colors rounded-full hover:bg-white dark:hover:bg-white/5">Campaigns</a>
                        <a href="#advantages" className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white transition-colors rounded-full hover:bg-white dark:hover:bg-white/5">Advantage</a>
                        <a href="#how-it-works" className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white transition-colors rounded-full hover:bg-white dark:hover:bg-white/5">Process</a>
                        <a href="#perks" className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white transition-colors rounded-full hover:bg-white dark:hover:bg-white/5">Privileges</a>
                        <a href="#faqs" className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white transition-colors rounded-full hover:bg-white dark:hover:bg-white/5">FAQs</a>
                    </nav>

                    {/* Action Group & Theme Toggle */}
                    <div className="flex items-center gap-2 sm:gap-3">
                        {/* Theme Toggle Button */}
                        <button
                            onClick={toggleTheme}
                            aria-label="Toggle theme"
                            className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200/70 dark:border-white/10 text-gray-700 dark:text-zinc-300 hover:text-black dark:hover:text-white flex items-center justify-center transition-colors"
                        >
                            {isDark ? <Sun size={17} className="text-amber-400" /> : <Moon size={17} className="text-gray-700" />}
                        </button>

                        <div className="hidden md:flex items-center gap-2">
                            <Link 
                                to="/" 
                                className="h-10 px-3.5 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200/70 dark:border-white/10 text-gray-700 dark:text-zinc-300 font-bold uppercase tracking-wider text-[10px] hover:bg-gray-200 dark:hover:bg-white/10 transition-colors flex items-center gap-1.5"
                            >
                                <ArrowLeft size={12} className="text-neon-green" />
                                <span>newbi.live</span>
                            </Link>

                            {isActualCreator ? (
                                <Link 
                                    to="/creator-dashboard" 
                                    className="h-10 px-4 rounded-xl bg-neon-green hover:bg-white text-black font-black uppercase tracking-wider text-[10px] transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(57,255,20,0.3)] active:scale-95"
                                >
                                    <LayoutDashboard size={13} />
                                    <span>Dashboard</span>
                                </Link>
                            ) : (
                                <div className="flex items-center gap-2">
                                    {!user && (
                                        <button 
                                            onClick={() => useStore.getState().setAuthModal(true)} 
                                            className="h-10 px-3.5 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200/70 dark:border-white/10 text-gray-800 dark:text-white font-bold uppercase tracking-wider text-[10px] hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
                                        >
                                            Sign In
                                        </button>
                                    )}
                                    <Link 
                                        to="/creator/join" 
                                        className="h-10 px-4 rounded-xl bg-neon-green hover:bg-white text-black font-black uppercase tracking-wider text-[10px] transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(57,255,20,0.3)] group active:scale-95"
                                    >
                                        <span>Apply Now</span>
                                        <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                                    </Link>
                                </div>
                            )}
                        </div>

                        <NotificationBell />

                        {user ? (
                            <div className="flex items-center cursor-pointer" onClick={() => setIsProfileOpen(true)}>
                                <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-zinc-800 border border-gray-300 dark:border-white/10 flex items-center justify-center font-black text-xs text-gray-800 dark:text-white shadow-sm overflow-hidden">
                                    {activeCreator?.profilePicture ? (
                                        <img src={activeCreator.profilePicture} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        user.displayName ? user.displayName.charAt(0) : 'U'
                                    )}
                                </div>
                            </div>
                        ) : null}

                        {/* Mobile Menu Button */}
                        <button 
                            onClick={() => setIsMenuOpen(!isMenuOpen)} 
                            className="p-2 lg:hidden rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200/70 dark:border-white/10 text-gray-800 dark:text-white outline-none"
                        >
                            {isMenuOpen ? <X size={17} /> : <Menu size={17} />}
                        </button>
                    </div>
                </header>
            </div>

            {/* ===== MOBILE MENU ===== */}
            <AnimatePresence>
                {isMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.96 }}
                        className="fixed inset-0 z-[100] lg:hidden bg-white/95 dark:bg-black/95 backdrop-blur-3xl flex flex-col justify-between px-6 pt-24 pb-12 overflow-y-auto"
                    >
                        <button onClick={() => setIsMenuOpen(false)} className="absolute top-6 right-6 p-3 rounded-full bg-gray-100 dark:bg-white/10 text-gray-800 dark:text-white">
                            <X size={20} />
                        </button>
                        
                        <div className="space-y-3">
                            <div className="mb-6">
                                <img 
                                    src={isDark ? newbiCreatorsLogoDark : newbiCreatorsLogoLight} 
                                    alt="Newbi Creators" 
                                    className="h-6 w-auto object-contain" 
                                />
                            </div>
                            <p className="text-[10px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-[0.3em] mb-4">Navigation</p>
                            {[
                                { href: '#campaigns', label: 'Active Campaigns' },
                                { href: '#advantages', label: 'The Advantage' },
                                { href: '#how-it-works', label: 'How it Works' },
                                { href: '#perks', label: 'Privileges' },
                                { href: '#faqs', label: 'Frequently Asked Questions' }
                            ].map((item) => (
                                <a 
                                    key={item.href}
                                    href={item.href} 
                                    onClick={() => setIsMenuOpen(false)} 
                                    className="block p-4 rounded-2xl text-xl font-black text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                                >
                                    {item.label}
                                </a>
                            ))}
                        </div>

                        <div className="pt-6 border-t border-gray-200 dark:border-white/10 space-y-3">
                            {isActualCreator ? (
                                <Link 
                                    to="/creator-dashboard" 
                                    onClick={() => setIsMenuOpen(false)} 
                                    className="w-full h-12 bg-neon-green text-black flex items-center justify-center gap-2 rounded-xl font-black uppercase tracking-wider text-xs"
                                >
                                    <LayoutDashboard size={14} /> Open Creator Dashboard
                                </Link>
                            ) : (
                                <>
                                    <Link 
                                        to="/creator/join" 
                                        onClick={() => setIsMenuOpen(false)} 
                                        className="w-full h-12 bg-neon-green text-black flex items-center justify-center gap-2 rounded-xl font-black uppercase tracking-wider text-xs"
                                    >
                                        Apply as Creator
                                    </Link>
                                    {!user && (
                                        <button 
                                            onClick={() => { useStore.getState().setAuthModal(true); setIsMenuOpen(false); }} 
                                            className="w-full h-12 rounded-xl bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white font-bold uppercase tracking-wider text-xs"
                                        >
                                            Sign In
                                        </button>
                                    )}
                                </>
                            )}
                            <Link 
                                to="/" 
                                onClick={() => setIsMenuOpen(false)} 
                                className="w-full h-12 bg-gray-100 dark:bg-white/5 text-gray-800 dark:text-zinc-300 flex items-center justify-center gap-2 rounded-xl font-bold uppercase tracking-wider text-xs"
                            >
                                <ArrowLeft size={14} /> Back to newbi.live
                            </Link>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ===== MAIN CONTENT ===== */}
            <main className="relative z-10">

                {/* 1. HERO SECTION (Apple-esque Minimalist) */}
                <section className="relative min-h-[92vh] flex flex-col items-center justify-center pt-32 pb-16 md:pt-40 md:pb-24 overflow-hidden">
                    <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 w-full flex flex-col items-center">
                        
                        {/* Center Column: Hero Narrative */}
                        <motion.div 
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                            className="w-full max-w-4xl mx-auto text-center space-y-8"
                        >
                            {/* Warm Conversational Greeting */}
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.5, delay: 0.1 }}
                                className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-gray-100 dark:bg-white/[0.04] border border-gray-200/50 dark:border-white/[0.05] text-xs sm:text-sm font-medium text-gray-600 dark:text-zinc-300 mx-auto"
                            >
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neon-green opacity-75" />
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-neon-green" />
                                </span>
                                <span>{greetingText}</span>
                            </motion.div>

                            {/* Massive Display Headline */}
                            <h1 className="text-4xl sm:text-6xl lg:text-[5.5rem] font-semibold tracking-tighter leading-[1.05] text-gray-900 dark:text-white mx-auto">
                                Turn Your Influence Into <br className="hidden sm:block" />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-black to-neon-green dark:from-white dark:to-neon-green">
                                    Unforgettable Experiences.
                                </span>
                            </h1>

                            {/* Narrative Description */}
                            <p className="text-lg sm:text-xl text-gray-500 dark:text-zinc-400 font-medium max-w-2xl mx-auto leading-relaxed">
                                Collaborate with iconic brands, secure front-row concert passes, and earn redeemable points — all on one verified creator platform.
                            </p>

                            {/* CTAs */}
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                                {isActualCreator ? (
                                    <button 
                                        onClick={() => navigate('/creator-dashboard')}
                                        className="h-14 px-8 rounded-full bg-gray-900 dark:bg-white hover:bg-black dark:hover:bg-gray-100 text-white dark:text-black font-semibold text-[15px] transition-all flex items-center justify-center gap-2 shadow-sm hover:scale-105 active:scale-95 group w-full sm:w-auto"
                                    >
                                        <span>Open Dashboard</span>
                                        <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                                    </button>
                                ) : (
                                    <>
                                        <button 
                                            onClick={() => navigate('/creator/join')}
                                            className="h-14 px-8 rounded-full bg-neon-green hover:bg-[#a8ff6f] text-black font-semibold text-[15px] transition-all flex items-center justify-center gap-2 shadow-[0_4px_14px_rgba(57,255,20,0.2)] hover:shadow-[0_6px_20px_rgba(57,255,20,0.3)] hover:scale-105 active:scale-95 group w-full sm:w-auto"
                                        >
                                            <span>Apply as Creator</span>
                                            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                                        </button>
                                        <a 
                                            href="#advantages"
                                            className="h-14 px-8 rounded-full bg-gray-100 dark:bg-white/[0.05] hover:bg-gray-200 dark:hover:bg-white/[0.1] border border-transparent dark:border-white/[0.05] text-gray-900 dark:text-white font-semibold text-[15px] transition-all flex items-center justify-center gap-2 w-full sm:w-auto"
                                        >
                                            <span>Explore Perks</span>
                                        </a>
                                    </>
                                )}
                            </div>
                        </motion.div>



                        {/* Premium Metric Cards - Subdued and Centered */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 1, delay: 0.6 }}
                            className="w-full mt-16 sm:mt-24"
                        >
                            <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:flex sm:justify-center">
                                {[
                                    { val: '2,400+', label: 'Active Creators' },
                                    { val: '60+', label: 'Brand Partners' },
                                    { val: '12', label: 'Metros & Hubs' },
                                    { val: '100%', label: 'Free to Join' },
                                ].map((m, i) => (
                                    <div
                                        key={i}
                                        className="flex flex-col items-center justify-center text-center p-4 rounded-3xl bg-transparent sm:w-[180px] w-full"
                                    >
                                        <p className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900 dark:text-white leading-none">
                                            {m.val}
                                        </p>
                                        <p className="text-[11px] sm:text-xs font-medium text-gray-500 dark:text-zinc-500 mt-2 tracking-wide">
                                            {m.label}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </motion.div>

                    </div>
                </section>

                {/* 2. ACTIVE CAMPAIGNS SECTION */}
                <section id="campaigns" className="py-20 md:py-28 relative border-t border-gray-200/80 dark:border-white/5 bg-gray-50/50 dark:bg-black/20">
                    <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12">
                        {/* Section Header */}
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                            <div className="space-y-3">
                                <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-gray-900 dark:text-white md:whitespace-nowrap">
                                    Live brand briefs & drops.
                                </h2>
                                <p className="text-gray-600 dark:text-zinc-400 text-sm sm:text-base font-normal max-w-2xl">
                                    {isActualCreator 
                                        ? 'Curated campaigns matched to your creator profile. Apply directly with your Newbi Creator Pass.'
                                        : 'Vetted collaborations across lifestyle, fashion, tech, and live entertainment with guaranteed rewards.'
                                    }
                                </p>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                                <Link 
                                    to="/creator-dashboard"
                                    className="h-11 px-5 rounded-xl bg-neon-green text-black font-black uppercase tracking-wider text-xs hover:bg-white transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(57,255,20,0.3)]"
                                >
                                    <LayoutDashboard size={13} />
                                    <span>{isActualCreator ? 'My Dashboard' : 'Creator Dashboard'}</span>
                                </Link>
                            </div>
                        </div>

                        {/* Campaigns Grid */}
                        {activeCampaigns.length > 0 ? (
                            <HorizontalCarousel autoScroll={true} className="pb-6 -mx-5 px-5 sm:mx-0 sm:px-0 gap-6 lg:gap-8 md:grid md:grid-cols-2 lg:grid-cols-3 md:overflow-visible">
                                {activeCampaigns.map((camp, idx) => (
                                    <div key={camp.id || idx} className="shrink-0 w-[85vw] sm:w-[400px] md:w-auto snap-center">
                                        <CampaignCard
                                            campaign={camp}
                                            profile={activeCreator}
                                            type="available"
                                            onOpenMission={(c) => setSelectedCampaignForModal(c)}
                                        />
                                    </div>
                                ))}
                            </HorizontalCarousel>
                        ) : (
                            /* Empty state if no active campaigns */
                            <div className="rounded-3xl bg-white dark:bg-[#0C0E14] border border-gray-200/80 dark:border-white/[0.08] p-12 text-center max-w-2xl mx-auto space-y-4">
                                <div className="w-14 h-14 rounded-2xl bg-neon-green/10 border border-neon-green/20 text-neon-green flex items-center justify-center mx-auto">
                                    <Target size={28} />
                                </div>
                                <h3 className="text-xl font-black text-gray-900 dark:text-white">
                                    New Brand Campaigns Dropping Soon
                                </h3>
                                <p className="text-sm text-gray-600 dark:text-zinc-400 max-w-md mx-auto leading-relaxed">
                                    Brand briefs are updated frequently. Registered creators receive priority notifications and instant email alerts whenever new briefs launch.
                                </p>
                                {isActualCreator ? (
                                    <button
                                        onClick={() => navigate('/creator-dashboard')}
                                        className="h-10 px-6 rounded-xl bg-neon-green text-black font-black uppercase tracking-wider text-xs hover:bg-white transition-all inline-flex items-center gap-2"
                                    >
                                        <LayoutDashboard size={13} />
                                        <span>Check Creator Studio</span>
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => navigate('/creator/join')}
                                        className="h-10 px-6 rounded-xl bg-neon-green text-black font-black uppercase tracking-wider text-xs hover:bg-white transition-all inline-flex items-center gap-2"
                                    >
                                        <span>Join Creator Collective</span>
                                        <ArrowRight size={13} />
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </section>

                {/* 3. CREATIVE ADVANTAGE (Pillars) */}
                <section id="advantages" className="py-20 md:py-28 relative border-t border-gray-200/80 dark:border-white/5">
                    <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12">
                        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
                            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-gray-900 dark:text-white md:whitespace-nowrap">
                                Built for creators who{' '}
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-green to-emerald-400">define culture.</span>
                            </h2>
                            <p className="text-gray-600 dark:text-zinc-400 text-sm sm:text-base font-normal">
                                More than just sponsored posts. An ecosystem designed to elevate your creative portfolio and unlock real-world experiences.
                            </p>
                        </div>

                        <HorizontalCarousel autoScroll={true} className="pb-6 -mx-5 px-5 sm:mx-0 sm:px-0 gap-6 lg:gap-8 lg:grid lg:grid-cols-3 lg:overflow-visible">
                            {[
                                {
                                    num: '01',
                                    category: 'Brand Partnerships',
                                    title: 'Curated Brand Collabs',
                                    desc: 'Direct partnerships with leading lifestyle, beverage, tech, and fashion brands. Authentic campaigns matched to your audience with zero agency cuts.',
                                    stat: '0%',
                                    statLabel: 'Agency Cut',
                                    highlightTitle: 'Direct Payouts',
                                    highlightSub: 'Tier-1 Brand Deals',
                                    icon: Briefcase,
                                },
                                {
                                    num: '02',
                                    category: 'Live Experiences',
                                    title: 'Concert & Festival Access',
                                    desc: 'Exclusive passes, experiential coverage gigs, and artist hospitality at India’s largest music festivals, stadium tours, and creative gatherings.',
                                    stat: 'ENTRY',
                                    statLabel: 'Festival Guestlist',
                                    highlightTitle: 'Artist Lounges',
                                    highlightSub: 'Live Coverage Gigs',
                                    icon: Ticket,
                                },
                                {
                                    num: '03',
                                    category: 'Loyalty Ecosystem',
                                    title: 'Newbi Points & Drops',
                                    desc: 'Earn points for community milestones, sign-up bonuses, and creator referrals. Redeem them for festival tickets, rare merchandise drops, and lifestyle vouchers.',
                                    stat: '1:1',
                                    statLabel: 'Instant Redemption',
                                    highlightTitle: 'Merch Drops',
                                    highlightSub: 'Exclusive Ticket Drops',
                                    icon: Coins,
                                }
                            ].map((pillar, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.1 }}
                                    className="shrink-0 w-[85vw] sm:w-[350px] lg:w-auto snap-center relative p-8 sm:p-9 rounded-[2rem] bg-white dark:bg-[#0C0E14] border border-gray-200/80 dark:border-white/[0.08] hover:border-neon-green/40 dark:hover:border-neon-green/40 transition-all duration-300 shadow-sm hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_0_50px_rgba(57,255,20,0.07)] hover:-translate-y-1.5 flex flex-col justify-between group overflow-hidden"
                                >
                                    {/* Subtle Top Accent Glow */}
                                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neon-green/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                    <div className="absolute -top-20 -right-20 w-44 h-44 bg-neon-green/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                                    <div className="space-y-6 relative z-10">
                                        {/* Header Row: Clean Mono Index + Icon */}
                                        <div className="flex items-center justify-between">
                                            <div className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-white/[0.04] border border-gray-200/80 dark:border-white/[0.08] flex items-center justify-center text-gray-900 dark:text-white group-hover:text-neon-green group-hover:border-neon-green/40 group-hover:bg-neon-green/5 transition-all duration-300">
                                                <pillar.icon size={22} strokeWidth={1.8} />
                                            </div>
                                            <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-gray-400 dark:text-zinc-500 group-hover:text-neon-green transition-colors">
                                                {pillar.num} / {pillar.category}
                                            </span>
                                        </div>

                                        {/* Title & Description */}
                                        <div className="space-y-3">
                                            <h3 className="text-xl sm:text-2xl font-black tracking-tight text-gray-950 dark:text-white leading-tight">
                                                {pillar.title}
                                            </h3>
                                            <p className="text-gray-600 dark:text-zinc-400 text-sm sm:text-[14.5px] leading-relaxed font-normal">
                                                {pillar.desc}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Bottom High-Impact Metric Anchor */}
                                    <div className="pt-6 mt-8 border-t border-gray-100 dark:border-white/[0.06] flex items-end justify-between relative z-10">
                                        <div>
                                            <span className="text-3xl sm:text-4xl font-black tracking-tight text-gray-950 dark:text-white font-mono leading-none">
                                                {pillar.stat}
                                            </span>
                                            <p className="text-[11px] font-mono font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500 mt-1.5">
                                                {pillar.statLabel}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs font-bold text-emerald-600 dark:text-neon-green">
                                                {pillar.highlightTitle}
                                            </p>
                                            <p className="text-[11px] text-gray-400 dark:text-zinc-500 mt-0.5 font-medium">
                                                {pillar.highlightSub}
                                            </p>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </HorizontalCarousel>
                    </div>
                </section>

                {/* 3. 4-STEP PROCESS */}
                <section id="how-it-works" className="py-20 md:py-28 bg-gray-100/50 dark:bg-zinc-950/40 border-y border-gray-200/80 dark:border-white/5 relative">
                    <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12">
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-14">
                            <div>
                                <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-gray-900 dark:text-white md:whitespace-nowrap">
                                    4 steps to real rewards.
                                </h2>
                            </div>
                            <p className="text-gray-600 dark:text-zinc-400 text-xs sm:text-sm font-medium max-w-sm">
                                A streamlined workflow from initial profile setup to claiming your guaranteed perks.
                            </p>
                        </div>

                        <HorizontalCarousel autoScroll={true} className="pb-6 -mx-5 px-5 sm:mx-0 sm:px-0 gap-5 md:grid md:grid-cols-2 lg:grid-cols-4 md:overflow-visible">
                            {steps.map((s, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.1 }}
                                    className="shrink-0 w-[80vw] sm:w-[280px] md:w-auto snap-center relative p-7 rounded-3xl bg-white dark:bg-zinc-900/30 border border-gray-200 dark:border-white/5 hover:border-gray-300 dark:hover:border-white/15 transition-all flex flex-col justify-between overflow-hidden shadow-sm dark:shadow-none group"
                                >
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <span className="font-mono text-3xl font-bold text-gray-300 dark:text-zinc-700 group-hover:text-neon-green transition-colors">
                                                {s.num}
                                            </span>
                                            <span className="text-[10px] font-mono uppercase tracking-widest text-gray-400 dark:text-zinc-500">
                                                Step {s.num}
                                            </span>
                                        </div>
                                        <h3 className="text-base font-black text-gray-900 dark:text-white uppercase tracking-tight">
                                            {s.title}
                                        </h3>
                                        <p className="text-xs text-gray-600 dark:text-zinc-400 leading-relaxed font-normal">
                                            {s.desc}
                                        </p>
                                    </div>
                                </motion.div>
                            ))}
                        </HorizontalCarousel>
                    </div>
                </section>

                {/* 4. PRIVILEGES & PERKS GRID */}
                <section id="perks" className="py-20 md:py-28 relative">
                    <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12">
                        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
                            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-gray-900 dark:text-white md:whitespace-nowrap">
                                Why creators love Newbi.
                            </h2>
                            <p className="text-gray-600 dark:text-zinc-400 text-sm sm:text-base font-normal">
                                Transparent benefits engineered exclusively for rising talent and cultural voices.
                            </p>
                        </div>

                        <HorizontalCarousel autoScroll={true} className="pb-6 -mx-5 px-5 sm:mx-0 sm:px-0 gap-5 md:grid md:grid-cols-2 lg:grid-cols-3 md:overflow-visible">
                            {perks.map((p, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.08 }}
                                    className="shrink-0 w-[85vw] sm:w-[340px] md:w-auto snap-center p-7 rounded-3xl bg-white dark:bg-zinc-900/30 border border-gray-200 dark:border-white/5 hover:border-gray-300 dark:hover:border-white/10 transition-all shadow-sm dark:shadow-none space-y-3 group"
                                >
                                    <div className="w-10 h-10 rounded-xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.08] flex items-center justify-center text-gray-800 dark:text-zinc-200 group-hover:text-neon-green group-hover:border-neon-green/40 transition-all">
                                        <p.icon size={18} strokeWidth={1.8} />
                                    </div>
                                    <h3 className="text-base font-black text-gray-900 dark:text-white tracking-tight">
                                        {p.title}
                                    </h3>
                                    <p className="text-xs text-gray-600 dark:text-zinc-400 leading-relaxed font-normal">
                                        {p.desc}
                                    </p>
                                </motion.div>
                            ))}
                        </HorizontalCarousel>
                    </div>
                </section>

                {/* 5. PAST CLIENTS MARQUEE */}
                {siteSettings?.showPastClients !== false && (
                    <div className="border-t border-gray-200/80 dark:border-white/5">
                        <PastClients />
                    </div>
                )}

                {/* CREATOR TESTIMONIALS (Dynamically rendered from real verified creators) */}
                {siteSettings?.showCreatorTestimonials !== false && activeTestimonials.length > 0 && (
                    <section id="testimonials" className="py-20 md:py-28 relative border-t border-gray-200/80 dark:border-white/5 bg-gray-50/50 dark:bg-black/20">
                        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12">
                            <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/[0.04] dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] text-gray-700 dark:text-zinc-300 text-[11px] font-medium tracking-wide">
                                    <span className="w-1.5 h-1.5 rounded-full bg-neon-green" />
                                    <span>Creator Voices</span>
                                </div>
                                <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-gray-900 dark:text-white md:whitespace-nowrap">
                                    Stories from our collective.
                                </h2>
                                <p className="text-gray-600 dark:text-zinc-400 text-sm sm:text-base font-normal">
                                    Real creators on front-row concert drops, brand deals, and working with Newbi.
                                </p>
                            </div>

                            <HorizontalCarousel autoScroll={true} className="pb-6 -mx-5 px-5 sm:mx-0 sm:px-0 gap-6 md:grid md:grid-cols-2 lg:grid-cols-3 md:overflow-visible">
                                {activeTestimonials.map((t, i) => (
                                    <motion.div
                                        key={t.id || i}
                                        initial={{ opacity: 0, y: 20 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: i * 0.08 }}
                                        className="shrink-0 w-[85vw] sm:w-[360px] md:w-auto snap-center p-7 rounded-3xl bg-white dark:bg-zinc-900/40 border border-gray-200 dark:border-white/5 hover:border-gray-300 dark:hover:border-white/15 transition-all shadow-sm dark:shadow-none flex flex-col justify-between group"
                                    >
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-1 text-amber-400">
                                                    {[...Array(t.rating || 5)].map((_, starIdx) => (
                                                        <Star key={starIdx} size={14} className="fill-amber-400 text-amber-400" />
                                                    ))}
                                                </div>
                                                <Quote size={20} className="text-gray-300 dark:text-zinc-700 group-hover:text-neon-green/60 transition-colors" />
                                            </div>
                                            <p className="text-xs sm:text-sm text-gray-700 dark:text-zinc-300 leading-relaxed font-normal italic">
                                                "{t.quote}"
                                            </p>
                                        </div>

                                        <div className="pt-6 mt-6 border-t border-gray-100 dark:border-white/5 flex items-center gap-3">
                                            {t.avatarUrl ? (
                                                <img
                                                    src={t.avatarUrl}
                                                    alt={t.name}
                                                    className="w-10 h-10 rounded-full object-cover border border-black/10 dark:border-white/10 shrink-0"
                                                />
                                            ) : (
                                                <div className="w-10 h-10 rounded-full bg-neon-green/10 text-neon-green font-black text-xs flex items-center justify-center border border-neon-green/20 shrink-0">
                                                    {t.name?.slice(0, 2).toUpperCase() || 'CR'}
                                                </div>
                                            )}
                                            <div className="min-w-0 flex-1">
                                                <h4 className="text-xs font-black text-gray-900 dark:text-white truncate">
                                                    {t.name}
                                                </h4>
                                                <div className="flex items-center gap-2 text-[10px] text-gray-500 dark:text-zinc-400 truncate">
                                                    {t.city && (
                                                        <span className="flex items-center gap-0.5">
                                                            <MapPin size={9} />
                                                            {t.city}
                                                        </span>
                                                    )}
                                                    {t.city && (t.niche || t.handle) && <span>&bull;</span>}
                                                    {t.niche && <span>{t.niche}</span>}
                                                    {!t.niche && t.handle && <span>{t.handle}</span>}
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </HorizontalCarousel>
                        </div>
                    </section>
                )}

                {/* 6. FREQUENTLY ASKED QUESTIONS */}
                <section id="faqs" className="py-20 md:py-28 relative border-t border-gray-200/80 dark:border-white/5">
                    <div className="max-w-4xl mx-auto px-5 sm:px-8 lg:px-12">
                        <div className="text-center mb-14 space-y-3">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/[0.04] dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] text-gray-700 dark:text-zinc-300 text-[11px] font-medium tracking-wide">
                                <span className="w-1.5 h-1.5 rounded-full bg-neon-green" />
                                <span>Clear Answers</span>
                            </div>
                            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-gray-900 dark:text-white md:whitespace-nowrap">
                                Frequently Asked Questions
                            </h2>
                        </div>

                        <div className="space-y-3">
                            {faqs.map((faq, i) => (
                                <div 
                                    key={i} 
                                    className="bg-white dark:bg-zinc-900/40 border border-gray-200 dark:border-white/5 rounded-2xl overflow-hidden shadow-sm dark:shadow-none"
                                >
                                    <button 
                                        onClick={() => setOpenFaq(openFaq === i ? null : i)}
                                        className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors"
                                    >
                                        <span className="text-sm sm:text-base font-black text-gray-900 dark:text-white">
                                            {faq.q}
                                        </span>
                                        <div className={cn(
                                            "w-7 h-7 rounded-lg bg-gray-100 dark:bg-white/5 flex items-center justify-center shrink-0 transition-all duration-300 text-gray-500 dark:text-zinc-400",
                                            openFaq === i && "rotate-180 bg-black/[0.06] dark:bg-white/10 text-gray-950 dark:text-white"
                                        )}>
                                            <ChevronDown size={15} />
                                        </div>
                                    </button>
                                    <AnimatePresence>
                                        {openFaq === i && (
                                            <motion.div 
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.25 }}
                                                className="px-5 sm:px-6 pb-6 text-gray-600 dark:text-zinc-400 text-xs sm:text-sm leading-relaxed border-t border-gray-100 dark:border-white/5 pt-4 font-normal"
                                            >
                                                {faq.a}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* 7. FINAL CALL TO ACTION */}
                <section className="py-20 md:py-28 relative">
                    <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12">
                        <motion.div
                            initial={{ opacity: 0, y: 24 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="relative rounded-[2.5rem] bg-[#0B0F17] text-white p-10 sm:p-16 md:p-20 text-center overflow-hidden shadow-2xl border border-neon-green/30"
                        >
                            {/* Ambient Glows */}
                            <div className="absolute top-0 right-0 w-80 h-80 bg-neon-green/20 rounded-full blur-3xl pointer-events-none" />
                            <div className="absolute bottom-0 left-0 w-80 h-80 bg-neon-blue/15 rounded-full blur-3xl pointer-events-none" />

                            <div className="relative z-10 max-w-2xl mx-auto space-y-6">
                                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 text-zinc-300 text-[11px] font-medium tracking-wide">
                                    <span className="w-1.5 h-1.5 rounded-full bg-neon-green" />
                                    <span>Exclusive Creator Roster</span>
                                </div>

                                <h2 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight leading-[1.08] md:whitespace-nowrap">
                                    {isActualCreator ? "Your Creator Hub Awaits." : "Ready to Step Into the Spotlight?"}
                                </h2>

                                <p className="text-zinc-300 text-sm sm:text-base leading-relaxed font-normal">
                                    {isActualCreator 
                                        ? "Manage brand collaborations, track live deliverables, and claim your rewards directly in your dashboard."
                                        : "Join thousands of creators collaborating with global brands and unlocking front-row concert access. Free forever."
                                    }
                                </p>

                                <div className="pt-2">
                                    {isActualCreator ? (
                                        <button
                                            onClick={() => navigate('/creator-dashboard')}
                                            className="h-11 sm:h-12 px-7 rounded-xl bg-neon-green hover:bg-white text-black font-bold uppercase tracking-wider text-xs transition-all inline-flex items-center gap-2 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0"
                                        >
                                            <LayoutDashboard size={14} />
                                            <span>Enter Creator Dashboard</span>
                                            <ArrowRight size={14} />
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => navigate('/creator/join')}
                                            className="h-11 sm:h-12 px-7 rounded-xl bg-neon-green hover:bg-white text-black font-bold uppercase tracking-wider text-xs transition-all inline-flex items-center gap-2 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0"
                                        >
                                            <span>Apply as Creator for Free</span>
                                            <ArrowRight size={14} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </section>

            </main>

            {/* ─── Floating Actions (Mobile Only) ─────────────────────────── */}
            <AnimatePresence>
                {user && (
                    <>
                        {/* Left Button: newbi.live */}
                        <motion.div 
                            initial={{ y: 100, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 100, opacity: 0 }}
                            className="fixed bottom-6 left-5 z-50 pointer-events-auto md:hidden"
                        >
                            <div
                                className="relative bg-white/80 dark:bg-[#12151c]/80 border border-black/5 dark:border-white/10 rounded-full p-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.5)] flex items-center justify-center transition-all duration-300"
                                style={{ backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}
                            >
                                <button
                                    onClick={() => navigate('/')}
                                    className={cn(
                                        "rounded-full transition-all duration-300 ease-out flex items-center justify-center active:scale-95 overflow-hidden h-10",
                                        !isScrolled 
                                            ? "bg-white dark:bg-black border border-gray-200 dark:border-white/10 text-gray-800 dark:text-zinc-300 shadow-sm px-4" 
                                            : "bg-transparent border border-transparent text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white px-[11px]"
                                    )}
                                >
                                    <ArrowLeft size={18} strokeWidth={2} className="shrink-0 transition-all duration-300" />
                                    <span
                                        className={cn(
                                            "font-bold uppercase tracking-wider text-[10px] whitespace-nowrap overflow-hidden transition-all duration-300 ease-out leading-none",
                                            !isScrolled ? "max-w-[100px] opacity-100 ml-2" : "max-w-0 opacity-0 ml-0"
                                        )}
                                    >
                                        newbi.live
                                    </span>
                                </button>
                            </div>
                        </motion.div>

                        {/* Right Button: Dashboard or Apply */}
                        <motion.div 
                            initial={{ y: 100, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 100, opacity: 0 }}
                            className="fixed bottom-6 right-5 z-50 pointer-events-auto md:hidden"
                        >
                            <div
                                className="relative bg-white/80 dark:bg-[#12151c]/80 border border-black/5 dark:border-white/10 rounded-full p-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.5)] flex items-center justify-center transition-all duration-300"
                                style={{ backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}
                            >
                                <button
                                    onClick={() => navigate(isActualCreator ? '/creator-dashboard' : '/creator/join')}
                                    className={cn(
                                        "rounded-full transition-all duration-300 ease-out flex items-center justify-center active:scale-95 overflow-hidden h-10",
                                        !isScrolled 
                                            ? "bg-neon-green text-black shadow-sm px-4" 
                                            : "bg-transparent text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white px-[11px]"
                                    )}
                                >
                                    {isActualCreator ? (
                                        <LayoutDashboard size={18} strokeWidth={2} className="shrink-0 transition-all duration-300" />
                                    ) : (
                                        <Zap size={18} strokeWidth={2} className="shrink-0 transition-all duration-300" />
                                    )}
                                    <span
                                        className={cn(
                                            "font-bold uppercase tracking-wider text-[10px] whitespace-nowrap overflow-hidden transition-all duration-300 ease-out leading-none",
                                            !isScrolled ? "max-w-[130px] opacity-100 ml-2" : "max-w-0 opacity-0 ml-0"
                                        )}
                                    >
                                        {isActualCreator ? "Dashboard" : "Apply as Creator"}
                                    </span>
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            <ProfilePanel isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />

            {/* Campaign Detail Modal */}
            <AnimatePresence>
                {selectedCampaignForModal && (
                    <CampaignDetailModal 
                        campaign={selectedCampaignForModal}
                        onClose={() => setSelectedCampaignForModal(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default CreatorLanding;
