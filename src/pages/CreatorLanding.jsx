import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';
import { cn } from '../lib/utils';
import {
    ArrowRight, ArrowLeft, Users, ShieldCheck, ChevronDown,
    Briefcase, LayoutDashboard, Menu, X, Ticket, Coins, Sun, Moon,
    Star, Quote, MapPin, Target, ArrowUpRight
} from 'lucide-react';
import useBodyScrollLock from '../hooks/useBodyScrollLock';
import { HorizontalCarousel } from '../components/ui/HorizontalCarousel';
import { LogoImage } from '../landing/components/Logo';
import CampaignTeaser from '../landing/components/CampaignTeaser';
import Proof from '../landing/home/Proof';
import { usePublicFeed, isOff } from '../landing/feed';
import { APP_LINKS, appUrl } from '../landing/links';

/*
 * The creator program pitch at newbi.live/creator. Part of the landing site:
 * prerendered, no sign-in and no Firestore. Live data (open campaigns, past
 * clients, testimonials, welcome points) comes from the cached public feed;
 * applying and the creator dashboard live in the app.
 */
const CreatorLanding = () => {
    const feed = usePublicFeed();
    const { toggleTheme } = useTheme();

    const activeCampaigns = feed?.campaigns || [];
    const activeTestimonials = feed?.testimonials || [];
    const clients = isOff(feed, { section: 'home_clients' }) ? [] : (feed?.clients || []);
    const welcomePoints = feed?.settings?.creatorWelcomePoints || null;
    const pointsText = welcomePoints ? welcomePoints.toLocaleString('en-IN') : '';

    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [openFaq, setOpenFaq] = useState(null);
    useBodyScrollLock(isMenuOpen);

    useEffect(() => {
        if (!isMenuOpen) return undefined;
        const onKey = (e) => { if (e.key === 'Escape') setIsMenuOpen(false); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isMenuOpen]);

    // Only real numbers: open campaigns and past clients from the feed, points from settings.
    const metrics = useMemo(() => [
        activeCampaigns.length > 0 && { val: String(activeCampaigns.length), label: activeCampaigns.length === 1 ? 'Open Campaign' : 'Open Campaigns' },
        clients.length > 0 && { val: String(clients.length), label: 'Brands Worked With' },
        welcomePoints && { val: pointsText, label: 'Welcome Points' },
        { val: '100%', label: 'Free to Join' },
    ].filter(Boolean), [activeCampaigns.length, clients.length, welcomePoints, pointsText]);

    const faqs = [
        { 
            q: 'Is Newbi Creator free to join?', 
            a: 'Yes, 100% free forever. There are zero application fees, no monthly subscriptions, and no hidden charges to join the collective or participate in brand briefs.' 
        },
        welcomePoints && {
            q: 'How do Newbi Points work?',
            a: `You get ${pointsText} Newbi Points when you join, shown on your creator pass. Campaign rewards are separate and listed on each brief.`
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
            a: 'Everything is managed through your sleek Creator Dashboard. Once selected for a campaign, you simply post according to the brief guidelines and submit your live links or screenshots for review.' 
        },
        { 
            q: 'Can I invite other creators?', 
            a: 'Absolutely! Each creator gets a personal referral code to share with other creators.' 
        },
    ].filter(Boolean);

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
            desc: 'Claim the brand rewards on your brief, plus festival entries and experiences where the campaign includes them.'
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
        welcomePoints && {
            icon: Coins,
            title: 'Newbi Points',
            desc: `Start with ${pointsText} points when you join. They sit on your creator pass alongside your campaign history.`
        },
        { 
            icon: ShieldCheck,
            title: 'Verified Roster Status', 
            desc: 'An official Newbi Verified badge that establishes your authority and prioritizes your profile to top brand managers.'
        },
        { 
            icon: LayoutDashboard,
            title: 'Real-Time Creator Studio', 
            desc: 'Track your briefs, submissions and campaign status in one dashboard.'
        },
        { 
            icon: Users, 
            title: 'Creator Community & Summits', 
            desc: "Join a curated network of visionary creators across India. Collaborate, network, and attend private masterclasses."
        },
    ].filter(Boolean);

    const pillars = [
        {
            num: '01',
            category: 'Brand Partnerships',
            title: 'Curated Brand Collabs',
            desc: 'Direct partnerships with leading lifestyle, beverage, tech, and fashion brands. Authentic campaigns matched to your audience with zero agency cuts.',
            stat: '0%',
            statLabel: 'Agency Cut',
            highlightTitle: 'Matched Briefs',
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
        welcomePoints && {
            num: '03',
            category: 'Creator Pass',
            title: 'Newbi Points',
            desc: `Every new creator starts with ${pointsText} Newbi Points on their creator pass, next to their campaign history.`,
            stat: pointsText,
            statLabel: 'Welcome Points',
            highlightTitle: 'Creator Pass',
            highlightSub: 'In the Newbi app',
            icon: Coins,
        },
    ].filter(Boolean);

    return (
        <div className="min-h-[100dvh] bg-[#fafafa] dark:bg-[#08090d] text-gray-900 dark:text-white selection:bg-neon-green selection:text-black font-heading transition-colors duration-300 relative overflow-x-hidden" style={{ WebkitTapHighlightColor: 'transparent' }}>

            {/* Ambient Background Effects */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="hidden md:block absolute -top-24 left-1/3 w-[500px] h-[300px] bg-neon-green/[0.025] dark:bg-neon-green/[0.02] rounded-full blur-[120px] transform-gpu" />
                <div className="hidden md:dark:block absolute inset-0" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
            </div>

            {/* ===== FLOATING NAVBAR ===== */}
            <div 
                className="fixed left-4 right-4 z-50 max-w-7xl mx-auto md:left-8 md:right-8 lg:left-12 lg:right-12"
                style={{ top: 'calc(env(safe-area-inset-top, 0px) + 0.75rem)' }}
            >
                <header 
                    className="w-full h-16 bg-white/95 dark:bg-[#0C1017]/95 md:bg-white/90 md:dark:bg-[#0C1017]/90 md:backdrop-blur-md border border-black/5 dark:border-white/10 rounded-2xl px-4 sm:px-6 md:px-7 flex items-center justify-between shadow-lg shadow-black/[0.03] dark:shadow-black/40 transition-colors duration-300 transform-gpu"
                >
                    {/* Brand Logo */}
                    <div className="flex items-center gap-3">
                        <Link to="/creator" aria-label="Newbi Creators" className="flex items-center gap-2 min-h-[44px]" style={{ touchAction: 'manipulation' }}>
                            <LogoImage height={26} priority />
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-zinc-400">Creators</span>
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
                            onClick={() => toggleTheme()}
                            aria-label="Switch light or dark theme"
                            className="w-11 h-11 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200/70 dark:border-white/10 text-gray-700 dark:text-zinc-300 hover:text-black dark:hover:text-white flex items-center justify-center transition-colors active:scale-95"
                            style={{ touchAction: 'manipulation' }}
                        >
                            <Moon size={17} className="text-gray-700 dark:hidden" aria-hidden="true" />
                            <Sun size={17} className="text-amber-400 hidden dark:block" aria-hidden="true" />
                        </button>

                        <div className="hidden md:flex items-center gap-2">
                            <Link 
                                to="/" 
                                className="h-10 px-3.5 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200/70 dark:border-white/10 text-gray-700 dark:text-zinc-300 font-bold uppercase tracking-wider text-[10px] hover:bg-gray-200 dark:hover:bg-white/10 transition-colors flex items-center gap-1.5 active:scale-95"
                            >
                                <ArrowLeft size={12} className="text-neon-green" />
                                <span>newbi.live</span>
                            </Link>

                            <a
                                href={appUrl('/creator')}
                                className="h-10 px-3.5 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200/70 dark:border-white/10 text-gray-800 dark:text-white font-bold uppercase tracking-wider text-[10px] hover:bg-gray-200 dark:hover:bg-white/10 transition-colors flex items-center active:scale-95"
                            >
                                Open App
                            </a>
                            <a
                                href={APP_LINKS.creatorApply}
                                className="h-10 px-4 rounded-xl bg-neon-green hover:bg-white text-black font-black uppercase tracking-wider text-[10px] transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(57,255,20,0.3)] group active:scale-95"
                            >
                                <span>Apply Now</span>
                                <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                            </a>
                        </div>


                        {/* Mobile Menu Button */}
                        <button 
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
                            aria-expanded={isMenuOpen}
                            className="w-11 h-11 flex items-center justify-center lg:hidden rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200/70 dark:border-white/10 text-gray-800 dark:text-white outline-none active:scale-95"
                            style={{ touchAction: 'manipulation' }}
                        >
                            {isMenuOpen ? <X size={17} /> : <Menu size={17} />}
                        </button>
                    </div>
                </header>
            </div>

            {/* ===== MOBILE MENU ===== */}
                {isMenuOpen && (
                    <div
                        className="fixed inset-0 z-[100] lg:hidden bg-white dark:bg-black flex flex-col justify-between px-6 overflow-y-auto transform-gpu"
                        style={{
                            paddingTop: 'calc(env(safe-area-inset-top, 0px) + 5rem)',
                            paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 2rem)',
                            WebkitOverflowScrolling: 'touch',
                            overscrollBehavior: 'contain'
                        }}
                    >
                        <button 
                            onClick={() => setIsMenuOpen(false)}
                            aria-label="Close menu"
                            className="absolute right-6 p-3 rounded-full bg-gray-100 dark:bg-white/10 text-gray-800 dark:text-white active:scale-95"
                            style={{ 
                                top: 'calc(env(safe-area-inset-top, 0px) + 1.25rem)',
                                touchAction: 'manipulation'
                            }}
                        >
                            <X size={20} />
                        </button>
                        
                        <div className="space-y-3">
                            <div className="mb-6">
                                <LogoImage height={26} />
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
                                    className="block p-4 rounded-2xl text-xl font-black text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-white/5 active:bg-gray-200 dark:active:bg-white/10 transition-colors"
                                    style={{ touchAction: 'manipulation' }}
                                >
                                    {item.label}
                                </a>
                            ))}
                        </div>

                        <div className="pt-6 border-t border-gray-200 dark:border-white/10 space-y-3">
                            <a
                                href={APP_LINKS.creatorApply}
                                className="w-full h-12 bg-neon-green text-black flex items-center justify-center gap-2 rounded-xl font-black uppercase tracking-wider text-xs active:scale-95"
                                style={{ touchAction: 'manipulation' }}
                            >
                                Apply as Creator
                            </a>
                            <a
                                href={appUrl('/creator')}
                                className="w-full h-12 rounded-xl bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white font-bold uppercase tracking-wider text-xs flex items-center justify-center gap-2 active:scale-95"
                                style={{ touchAction: 'manipulation' }}
                            >
                                Open the App <ArrowUpRight size={14} />
                            </a>
                            <Link 
                                to="/" 
                                onClick={() => setIsMenuOpen(false)} 
                                className="w-full h-12 bg-gray-100 dark:bg-white/5 text-gray-800 dark:text-zinc-300 flex items-center justify-center gap-2 rounded-xl font-bold uppercase tracking-wider text-xs active:scale-95"
                                style={{ touchAction: 'manipulation' }}
                            >
                                <ArrowLeft size={14} /> Back to newbi.live
                            </Link>
                        </div>
                    </div>
                )}

            {/* ===== MAIN CONTENT ===== */}
            <main className="relative z-10">

                {/* 1. HERO SECTION (Apple-esque Minimalist) */}
                <section 
                    className="relative min-h-[85svh] md:min-h-[90svh] flex flex-col items-center justify-center pb-16 md:pb-24 overflow-hidden"
                    style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 6.5rem)' }}
                >
                    <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 w-full flex flex-col items-center">
                        
                        {/* Center Column: Hero Narrative */}
                        <div 
                            className="w-full max-w-4xl mx-auto text-center space-y-8"
                        >
                            {/* Warm Conversational Greeting */}
                            <div
                                className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-gray-100 dark:bg-white/[0.04] border border-gray-200/50 dark:border-white/[0.05] text-xs sm:text-sm font-medium text-gray-600 dark:text-zinc-300 mx-auto"
                            >
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neon-green opacity-75" />
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-neon-green" />
                                </span>
                                <span>Newbi Creator Network · Free to join</span>
                            </div>

                            {/* Massive Display Headline */}
                            <h1 className="text-4xl sm:text-6xl lg:text-[5.5rem] font-semibold tracking-tighter leading-[1.05] text-gray-900 dark:text-white mx-auto">
                                Turn Your Influence Into <br className="hidden sm:block" />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-black to-neon-green dark:from-white dark:to-neon-green">
                                    Unforgettable Experiences.
                                </span>
                            </h1>

                            {/* Narrative Description */}
                            <p className="text-lg sm:text-xl text-gray-500 dark:text-zinc-400 font-medium max-w-2xl mx-auto leading-relaxed">
                                {welcomePoints
                                    ? 'Collaborate with iconic brands, secure front-row concert passes, and earn Newbi points — all on one verified creator platform.'
                                    : 'Collaborate with iconic brands and secure front-row concert passes — all on one verified creator platform.'}
                            </p>

                            {/* CTAs */}
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                                    <>
                                        <a
                                            href={APP_LINKS.creatorApply}
                                            className="h-14 px-8 rounded-full bg-neon-green sm:hover:bg-[#a8ff6f] text-black font-semibold text-[15px] transition-all flex items-center justify-center gap-2 shadow-[0_4px_14px_rgba(57,255,20,0.2)] sm:hover:shadow-[0_6px_20px_rgba(57,255,20,0.3)] sm:hover:scale-105 active:scale-95 group w-full sm:w-auto"
                                            style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                                        >
                                            <span>Apply as Creator</span>
                                            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                                        </a>
                                        <a 
                                            href="#advantages"
                                            className="h-14 px-8 rounded-full bg-gray-100 dark:bg-white/[0.05] sm:hover:bg-gray-200 dark:sm:hover:bg-white/[0.1] border border-transparent dark:border-white/[0.05] text-gray-900 dark:text-white font-semibold text-[15px] transition-all flex items-center justify-center gap-2 w-full sm:w-auto active:scale-95"
                                            style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                                        >
                                            <span>Explore Perks</span>
                                        </a>
                                    </>
                            </div>
                        </div>



                        {/* Premium Metric Cards - Subdued and Centered */}
                        <div
                            className="w-full mt-16 sm:mt-24"
                        >
                            <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:flex sm:justify-center">
                                {metrics.map((m, i) => (
                                    <div
                                        key={i}
                                        className="flex flex-col items-center justify-center text-center p-4 rounded-3xl bg-transparent sm:w-[180px] w-full [&:last-child:nth-child(odd)]:col-span-2"
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
                        </div>

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
                                    Vetted collaborations across lifestyle, fashion, tech, and live entertainment. Open one to see the brief and apply in the app.
                                </p>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                                <a
                                    href={appUrl('/creator')}
                                    className="h-11 px-5 rounded-xl bg-neon-green text-black font-black uppercase tracking-wider text-xs hover:bg-white transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(57,255,20,0.3)]"
                                >
                                    <LayoutDashboard size={13} />
                                    <span>Creator Dashboard</span>
                                </a>
                            </div>
                        </div>

                        {/* Campaigns Grid */}
                        {activeCampaigns.length > 0 ? (
                            <HorizontalCarousel autoScroll={true} className="pb-6 -mx-5 px-5 sm:mx-0 sm:px-0 gap-6 lg:gap-8 md:grid md:grid-cols-2 lg:grid-cols-3 md:overflow-visible">
                                {activeCampaigns.map((camp, idx) => (
                                    <div key={camp.id || idx} className="shrink-0 w-[85vw] sm:w-[400px] md:w-auto snap-start">
                                        <CampaignTeaser campaign={camp} />
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
                                <a
                                    href={APP_LINKS.creatorApply}
                                    className="h-11 px-6 rounded-xl bg-neon-green text-black font-black uppercase tracking-wider text-xs hover:bg-white transition-all inline-flex items-center gap-2"
                                >
                                    <span>Join Creator Collective</span>
                                    <ArrowRight size={13} />
                                </a>
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

                        <HorizontalCarousel autoScroll={true} className={cn("pb-6 -mx-5 px-5 sm:mx-0 sm:px-0 gap-6 lg:gap-8 lg:grid lg:overflow-visible", pillars.length === 3 ? "lg:grid-cols-3" : "lg:grid-cols-2")}>
                            {pillars.map((pillar, i) => (
                                <div
                                    key={i}
                                    className="shrink-0 w-[85vw] sm:w-[350px] lg:w-auto snap-start relative p-8 sm:p-9 rounded-[2rem] bg-white dark:bg-[#0C0E14] border border-gray-200/80 dark:border-white/[0.08] hover:border-neon-green/40 dark:hover:border-neon-green/40 transition-all duration-300 shadow-sm hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_0_50px_rgba(57,255,20,0.07)] hover:-translate-y-1.5 flex flex-col justify-between group overflow-hidden"
                                >
                                    {/* Subtle Top Accent Glow */}
                                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neon-green/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                    <div className="hidden md:block absolute -top-20 -right-20 w-44 h-44 bg-neon-green/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none transform-gpu" />

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
                                </div>
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
                                <div
                                    key={i}
                                    className="shrink-0 w-[80vw] sm:w-[280px] md:w-auto snap-start relative p-7 rounded-3xl bg-white dark:bg-zinc-900/30 border border-gray-200 dark:border-white/5 hover:border-gray-300 dark:hover:border-white/15 transition-all flex flex-col justify-between overflow-hidden shadow-sm dark:shadow-none group"
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
                                </div>
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
                                <div
                                    key={i}
                                    className="shrink-0 w-[85vw] sm:w-[340px] md:w-auto snap-start p-7 rounded-3xl bg-white dark:bg-zinc-900/30 border border-gray-200 dark:border-white/5 hover:border-gray-300 dark:hover:border-white/10 transition-all shadow-sm dark:shadow-none space-y-3 group"
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
                                </div>
                            ))}
                        </HorizontalCarousel>
                    </div>
                </section>

                {/* 5. PAST CLIENTS MARQUEE */}
                {clients.length > 0 && <Proof clients={clients} />}

                {/* CREATOR TESTIMONIALS (Dynamically rendered from real verified creators) */}
                {activeTestimonials.length > 0 && (
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
                                    <div
                                        key={t.id || i}
                                        className="shrink-0 w-[85vw] sm:w-[360px] md:w-auto snap-start p-7 rounded-3xl bg-white dark:bg-zinc-900/40 border border-gray-200 dark:border-white/5 hover:border-gray-300 dark:hover:border-white/15 transition-all shadow-sm dark:shadow-none flex flex-col justify-between group"
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
                                                    width="40"
                                                    height="40"
                                                    loading="lazy"
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
                                    </div>
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
                                        aria-expanded={openFaq === i}
                                        aria-controls={`faq-${i}`}
                                        className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 hover:bg-gray-50 dark:hover:bg-white/[0.02] active:bg-gray-100 dark:active:bg-white/[0.05] transition-colors active:scale-[0.99]"
                                        style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
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
                                        {openFaq === i && (
                                            <div
                                                id={`faq-${i}`}
                                                className="px-5 sm:px-6 pb-6 text-gray-600 dark:text-zinc-400 text-xs sm:text-sm leading-relaxed border-t border-gray-100 dark:border-white/5 pt-4 font-normal"
                                            >
                                                {faq.a}
                                            </div>
                                        )}
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* 7. FINAL CALL TO ACTION */}
                <section className="py-20 md:py-28 relative">
                    <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12">
                        <div
                            className="relative rounded-[2.5rem] bg-[#0B0F17] text-white p-10 sm:p-16 md:p-20 text-center overflow-hidden shadow-2xl border border-neon-green/30"
                        >
                            {/* Ambient Glows */}
                            <div className="hidden md:block absolute top-0 right-0 w-80 h-80 bg-neon-green/20 rounded-full blur-3xl pointer-events-none transform-gpu" />
                            <div className="hidden md:block absolute bottom-0 left-0 w-80 h-80 bg-neon-blue/15 rounded-full blur-3xl pointer-events-none transform-gpu" />

                            <div className="relative z-10 max-w-2xl mx-auto space-y-6">
                                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 text-zinc-300 text-[11px] font-medium tracking-wide">
                                    <span className="w-1.5 h-1.5 rounded-full bg-neon-green" />
                                    <span>Exclusive Creator Roster</span>
                                </div>

                                <h2 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight leading-[1.08] md:whitespace-nowrap">
                                    Ready to Step Into the Spotlight?
                                </h2>

                                <p className="text-zinc-300 text-sm sm:text-base leading-relaxed font-normal">
                                    Collaborate with brands and unlock front-row concert access. Free forever.
                                </p>

                                <div className="pt-2">
                                    <a
                                        href={APP_LINKS.creatorApply}
                                        className="h-12 px-7 rounded-xl bg-neon-green hover:bg-white text-black font-bold uppercase tracking-wider text-xs transition-all inline-flex items-center gap-2 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0"
                                        style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                                    >
                                        <span>Apply as Creator for Free</span>
                                        <ArrowRight size={14} />
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

            </main>
        </div>
    );
};

export default CreatorLanding;
