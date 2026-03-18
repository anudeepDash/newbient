import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Users, 
    Sparkles, 
    Gift, 
    ArrowRight, 
    CheckCircle2, 
    Loader2,
    ChevronDown,
    ChevronUp,
    ClipboardList,
    Target,
    Zap
} from 'lucide-react';
import { useStore } from '../lib/store';
import { Button } from '../components/ui/Button';
import { cn } from '../lib/utils';
import CommunityCard from '../components/community/CommunityCard';

const CommunityJoin = () => {
    const { forms, siteDetails, siteSettings, volunteerGigs, guestlists, upcomingEvents, giveaways, user, authInitialized, markFormAsSubmitted, setAuthModal, logout } = useStore();
    const activeGiveaway = giveaways.find(g => g.status === 'Open' && (!g.endDate || new Date(g.endDate) >= new Date()));
    const location = useLocation();
    const [confirming, setConfirming] = useState(false);
    const hasJoined = user && user.hasJoinedTribe;
    const [expandedSections, setExpandedSections] = useState({
        guestlists: true,
        'volunteer-gigs': true,
        'community-pulse': true
    });
    const [scrollActiveIndex, setScrollActiveIndex] = useState({});

    const handleScroll = (sectionId, e) => {
        const container = e.target;
        const scrollLeft = container.scrollLeft;
        const width = container.offsetWidth;
        const index = Math.round(scrollLeft / (width * 0.85)); // 85vw is the card width
        setScrollActiveIndex(prev => ({ ...prev, [sectionId]: index }));
    };

    // Initialize expanded state based on items
    useEffect(() => {
        if (user && hasJoined) {
            setExpandedSections({
                guestlists: guestlists?.length > 0,
                'volunteer-gigs': volunteerGigs?.length > 0,
                'community-pulse': forms?.length > 0
            });
        }
    }, [user, hasJoined, guestlists?.length, volunteerGigs?.length, forms?.length]);

    const toggleSection = (id) => {
        setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }));
    };

    useEffect(() => {
        if (authInitialized && !user) {
            const timer = setTimeout(() => {
                setAuthModal(true);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [authInitialized, user, setAuthModal]);

    useEffect(() => {
        if (user && hasJoined) {
            const params = new URLSearchParams(location.search);
            const gigId = params.get('gig');
            const glId = params.get('gl');
            const formId = params.get('form');

            const type = gigId ? 'gig' : (glId ? 'gl' : (formId ? 'form' : null));
            const id = gigId || glId || formId;

            if (type && id) {
                const targetId = `${type}-${id}`;
                
                // Function to attempt scrolling
                const attemptScroll = () => {
                    const element = document.getElementById(targetId);
                    if (element) {
                        // Small delay to ensure layout has settled
                        setTimeout(() => {
                            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }, 100);
                        return true;
                    }
                    return false;
                };

                // Try immediately
                if (attemptScroll()) return;

                // If not found, check periodically (handles async data loading)
                const interval = setInterval(() => {
                    if (attemptScroll()) clearInterval(interval);
                }, 200);

                // Stop checking after 5s
                const timeout = setTimeout(() => clearInterval(interval), 5000);

                return () => {
                    clearInterval(interval);
                    clearTimeout(timeout);
                };
            }
        }
    }, [user, hasJoined, location.search, volunteerGigs, guestlists, forms]);

    const handleShare = (type, id) => {
        const url = `${window.location.origin}/community-join?${type}=${id}`;
        navigator.clipboard.writeText(url);
        alert('Link copied to clipboard!');
    };

    const handleJoinedConfirm = async () => {
        setConfirming(true);
        try { await markFormAsSubmitted(); } 
        catch (error) { alert(error.message || 'Verification failed.'); } 
        finally { setConfirming(false); }
    };

    return (
        <div className="min-h-screen bg-[#020202] text-white pt-32 pb-20 px-4 scroll-smooth">

            <div className="max-w-7xl mx-auto space-y-20">
                {/* Immersive Header */}
                <div className="text-center relative py-10 overflow-hidden">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-neon-pink/8 blur-[100px] pointer-events-none rounded-full" />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 mb-8 backdrop-blur-md"
                    >
                        <Sparkles size={16} className="text-neon-pink" />
                        <span className="text-xs font-heading font-bold uppercase tracking-widest text-gray-300">
                            {user ? 'Access Unlocked' : 'The Tribe'}
                        </span>
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-4xl md:text-8xl font-bold font-heading text-transparent bg-clip-text bg-gradient-to-r from-neon-green to-neon-blue mb-6 tracking-tight leading-none pr-4"
                    >
                        {user ? (
                            <>Hello, {user.displayName?.split(' ')[0]}</>
                        ) : (
                            <>The Tribe.</>
                        )}
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="text-gray-400 max-w-2xl mx-auto text-base md:text-xl font-medium leading-relaxed"
                    >
                        {user ? "Explosive opportunities await in the hub." : "Join India's most disruptive youth community."}
                    </motion.p>
                </div>

                {!user ? (
                    <section className="flex flex-col items-center">
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="p-12 md:p-20 bg-zinc-900/60 border border-white/5 rounded-[3rem] backdrop-blur-3xl text-center max-w-2xl shadow-2xl relative overflow-hidden group"
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-neon-blue/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <Users className="w-24 h-24 text-neon-blue mx-auto mb-12 relative z-10" />
                            <h3 className="text-4xl font-black font-heading mb-6 relative z-10">LOCK IN.</h3>
                            <p className="text-gray-500 mb-12 relative z-10 text-lg font-medium">Join the ranks to access exclusive gigs, VIP guestlists, and more.</p>
                            <Button
                                onClick={() => setAuthModal(true)}
                                className="w-full h-20 text-xl rounded-2xl font-black font-heading tracking-widest bg-white text-black hover:scale-[1.02] transition-all"
                            >
                                IDENTITY VERIFICATION
                            </Button>
                        </motion.div>
                    </section>
                ) : (!hasJoined && siteSettings.enableTribeForm !== false) ? (
                    <section className="space-y-20">
                        <div className="max-w-5xl mx-auto">
                            <div className="flex items-center gap-6 mb-16">
                                <div className="w-16 h-16 rounded-2xl bg-neon-blue text-black flex items-center justify-center font-black text-2xl shadow-[0_0_30px_rgba(0,255,255,0.3)]">01</div>
                                <h2 className="text-4xl font-black font-heading uppercase tracking-tighter text-white">THE RITUAL.</h2>
                            </div>

                            <div className="relative group">
                                <div className="absolute -inset-1 bg-gradient-to-r from-neon-pink to-neon-blue rounded-[3rem] blur opacity-20 group-hover:opacity-40 transition duration-1000" />
                                <div className="relative w-full aspect-[4/5] md:aspect-[3/2] bg-zinc-900 rounded-[2.8rem] overflow-hidden border border-white/10 shadow-2xl">
                                    <iframe
                                        src="https://docs.google.com/forms/d/e/1FAIpQLScQv55cT-hPBqTtw7PFqOZND6QfPkmjzT8_4Sf4G53_UYwSQg/viewform?embedded=true"
                                        className="w-full h-full border-0"
                                        style={{ filter: 'invert(1) hue-rotate(180deg)', background: 'transparent', opacity: 0.8 }}
                                        title="Newbi Tribe Registration"
                                    >Loading...</iframe>
                                </div>
                            </div>

                            <div className="mt-20 p-12 bg-white/5 border border-white/10 rounded-[3rem] backdrop-blur-2xl text-center">
                                <h3 className="text-2xl font-black font-heading text-white mb-4">SUBMITTED THE FORM?</h3>
                                <p className="text-gray-500 mb-10 max-w-sm mx-auto font-medium">Click below to finalize your entry and unlock the hub.</p>
                                <Button
                                    onClick={handleJoinedConfirm}
                                    disabled={confirming}
                                    className="h-20 px-16 rounded-2xl font-black font-heading tracking-widest bg-neon-green text-black"
                                >
                                    {confirming ? <Loader2 className="animate-spin" /> : 'INITIATE ACCESS'}
                                </Button>
                            </div>
                        </div>
                    </section>
                ) : (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-20 pb-20">
                         {/* Status UI */}
                         <section className="max-w-5xl mx-auto">
                             <div className="bg-zinc-900/40 border border-white/5 rounded-[3rem] p-10 md:p-16 flex flex-col md:flex-row items-center gap-10 relative overflow-hidden group">
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-neon-green/5 blur-[100px] pointer-events-none" />
                                <div className="w-24 h-24 bg-neon-green rounded-[2rem] flex items-center justify-center text-black shadow-[0_0_50px_rgba(57,255,20,0.3)] shrink-0">
                                    <CheckCircle2 size={40} />
                                </div>
                                <div className="flex-1 text-center md:text-left relative z-10">
                                    <h3 className="text-3xl font-black font-heading text-white mb-4">YOU'RE IN.</h3>
                                    <p className="text-gray-500 text-lg font-medium leading-relaxed">Identity confirmed. The community is live below. Join the primary communication channel now.</p>
                                </div>
                                <a 
                                    href={siteDetails.whatsappCommunity || "#"} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="w-full md:w-auto px-10 h-20 bg-white text-black rounded-2xl flex items-center justify-center font-black font-heading tracking-widest uppercase text-sm hover:scale-105 transition-all"
                                >
                                    WhatsApp Access
                                </a>
                             </div>
                        </section>

                        {/* Active Giveaway Banner */}
                        <AnimatePresence>
                            {activeGiveaway && (
                                <section className="max-w-7xl mx-auto px-4">
                                    <motion.div 
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="group relative block overflow-hidden rounded-[3rem] border border-purple-500/30 bg-purple-600/10 p-1 md:p-2 backdrop-blur-3xl"
                                    >
                                        <Link to={`/giveaway/${activeGiveaway.slug}`} className="flex flex-col md:flex-row items-center gap-10 p-8 md:p-12">
                                            <div className="w-24 h-24 rounded-[2rem] bg-purple-600 flex items-center justify-center text-white shadow-2xl shadow-purple-500/40 group-hover:scale-110 group-hover:rotate-12 transition-all duration-500">
                                                <Gift size={48} />
                                            </div>
                                            <div className="flex-1 text-center md:text-left space-y-4">
                                                <div className="inline-flex px-4 py-1.5 rounded-full bg-purple-500/20 text-purple-400 text-[9px] font-black uppercase tracking-widest border border-purple-500/20">
                                                    LIMITED OPPORTUNITY
                                                </div>
                                                <h3 className="text-3xl md:text-5xl font-black font-heading uppercase italic tracking-tighter text-white leading-tight">
                                                    WIN ACCESS TO <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-neon-blue">{activeGiveaway.name}</span>
                                                </h3>
                                                <p className="text-sm md:text-lg font-medium text-gray-500 max-w-2xl">
                                                    Exclusively for the Tribe. Join the giveaway, refer friends, and top the leaderboard to secure your tickets.
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-4 px-10 h-20 bg-purple-600 text-white rounded-2xl font-black font-heading tracking-widest uppercase text-sm shadow-2xl group-hover:gap-8 transition-all">
                                                PARTICIPATE <ArrowRight size={20} />
                                            </div>
                                        </Link>
                                        <div className="absolute bottom-0 left-0 h-1.5 bg-gradient-to-r from-purple-500 via-neon-blue to-purple-500 w-full opacity-30 animate-pulse" />
                                    </motion.div>
                                </section>
                            )}
                        </AnimatePresence>

                        {/* Grid Sections */}
                        {[
                            { id: 'volunteer-gigs', title: 'VOLUNTEER GIGS', icon: Users, accent: 'neon-green', items: volunteerGigs, type: 'gig', label: 'FIELD OPS', show: siteSettings.showVolunteerGigs !== false, subtitleText: 'gigs available for the tribe' },
                            { id: 'guestlists', title: 'GUESTLISTS', icon: ClipboardList, accent: 'neon-blue', items: guestlists, type: 'gl', label: 'EXCLUSIVE ACCESS', show: true, subtitleText: 'guestlists open for registration' },
                            { id: 'community-pulse', title: 'COMMUNITY PULSE', icon: Target, accent: 'neon-pink', items: forms, type: 'form', label: 'THE VOTE', show: true, subtitleText: 'active polls & community forms' }
                        ].filter(s => s.show).map((section) => (
                            <section key={section.id} id={section.id} className="scroll-mt-32">
                                <div 
                                    className="p-6 bg-zinc-900/40 border border-white/5 rounded-[2.5rem] cursor-pointer group/header hover:bg-zinc-900/60 hover:border-white/10 transition-all flex items-center justify-between"
                                    onClick={() => toggleSection(section.id)}
                                >
                                    <div className="flex items-center gap-6">
                                        <div className={cn(
                                            "w-14 h-14 rounded-2xl flex items-center justify-center border transition-all duration-500",
                                            section.accent === 'neon-blue' ? "bg-neon-blue/10 border-neon-blue/20 text-neon-blue group-hover/header:shadow-[0_0_20px_rgba(0,255,255,0.2)]" : 
                                            (section.accent === 'neon-green' ? "bg-neon-green/10 border-neon-green/20 text-neon-green group-hover/header:shadow-[0_0_20px_rgba(57,255,20,0.2)]" : 
                                            "bg-neon-pink/10 border-neon-pink/20 text-neon-pink group-hover/header:shadow-[0_0_20px_rgba(255,0,255,0.2)]")
                                        )}>
                                            <section.icon size={24} />
                                        </div>
                                        <div className="flex flex-col">
                                            <h2 className="text-xl md:text-3xl font-black font-heading tracking-tight text-white uppercase leading-none mb-2">
                                                {section.title}
                                            </h2>
                                            <p className="text-[10px] md:text-xs font-medium text-gray-500 uppercase tracking-widest">
                                                {section.items?.length || 0} {section.subtitleText}
                                            </p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-6">
                                        <div className="text-right hidden md:block">
                                            <p className="text-xs font-black text-white/20 group-hover/header:text-white uppercase tracking-tight transition-colors">
                                                {expandedSections[section.id] ? 'COLLAPSE' : 'EXPAND'}
                                            </p>
                                        </div>
                                        <div className={cn(
                                            "w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-500 group-hover/header:text-white group-hover/header:border-white/20 transition-all",
                                            expandedSections[section.id] ? "rotate-180 bg-white/10 text-white" : ""
                                        )}>
                                            <ChevronDown size={20} />
                                        </div>
                                    </div>
                                </div>

                                <AnimatePresence initial={false}>
                                    {expandedSections[section.id] && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.3, ease: "easeInOut" }}
                                            className="overflow-hidden mt-8"
                                        >
                                            {section.items?.length > 0 ? (
                                                <div className="relative group/scroll">
                                                    <div 
                                                        className="flex md:grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-10 overflow-x-auto md:overflow-visible pb-8 md:pb-0 scrollbar-hide snap-x snap-mandatory -mx-6 px-6 md:mx-0 md:px-0"
                                                        onScroll={(e) => handleScroll(section.id, e)}
                                                    >
                                                        {section.items.map((item) => (
                                                            <div key={item.id} className="min-w-[85vw] md:min-w-0 snap-center h-full">
                                                                <CommunityCard item={item} type={section.type} handleShare={handleShare} />
                                                            </div>
                                                        ))}
                                                    </div>

                                                    {/* Scroll Progress Indicators (Mobile Only) */}
                                                    {section.items.length > 1 && (
                                                        <div className="flex md:hidden justify-center gap-2 mt-4">
                                                            {section.items.map((_, idx) => (
                                                                <div 
                                                                    key={idx}
                                                                    className={cn(
                                                                        "h-1 transition-all duration-300 rounded-full",
                                                                        (scrollActiveIndex[section.id] || 0) === idx 
                                                                            ? "w-8 bg-neon-blue shadow-[0_0_10px_rgba(0,255,255,0.5)]" 
                                                                            : "w-2 bg-white/10"
                                                                    )}
                                                                />
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="py-32 bg-white/[0.02] rounded-[3.5rem] border border-dashed border-white/5 text-center flex flex-col items-center gap-6">
                                                    <p className="text-gray-600 font-black font-heading uppercase tracking-widest text-xs">No active {section.title.toLowerCase()} status.</p>
                                                </div>
                                            )}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </section>
                        ))}
                    </motion.div>
                )}
            </div>
        </div>
    );
};

export default CommunityJoin;
