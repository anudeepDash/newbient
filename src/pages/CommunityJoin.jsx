import React, { useState, useEffect } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Users, 
    Sparkles, 
    Gift, 
    ArrowRight, 
    CheckCircle2, 
    Loader2,
    ShieldCheck,
    FileText,
    Zap,
    LayoutGrid,
    Layout
} from 'lucide-react';
import { useStore } from '../lib/store';
import { Button } from '../components/ui/Button';
import { cn } from '../lib/utils';
import CommunityCard from '../components/community/CommunityCard';
import UnifiedGuestlistModal from '../components/community/UnifiedGuestlistModal';
import useDynamicMeta from '../hooks/useDynamicMeta';

const CommunityJoin = () => {
    const { 
        forms = [], 
        siteDetails, 
        siteSettings = {}, 
        volunteerGigs = [], 
        guestlists = [], 
        giveaways = [], 
        user, 
        authInitialized, 
        markFormAsSubmitted, 
        markWhatsappJoined, 
        setAuthModal,
        campaigns = []
    } = useStore();
    const navigate = useNavigate();
    const activeGiveaway = (giveaways || []).find(g => g.status === 'Open' && (!g.endDate || new Date(g.endDate) >= new Date()));
    const location = useLocation();
    const [confirming, setConfirming] = useState(false);
    const [clickedWhatsApp, setClickedWhatsApp] = useState(false);
    const [verifyingWhatsapp, setVerifyingWhatsapp] = useState(false);
    const [isGLModalOpen, setIsGLModalOpen] = useState(false);
    const [selectedGL, setSelectedGL] = useState(null);
    const [showShareToast, setShowShareToast] = useState(false);
    const hasJoined = user && user.hasJoinedTribe;

    // Resolve Direct Link Item for Meta Tags
    const params = new URLSearchParams(location.search);
    const gigId = params.get('gig');
    const glId = params.get('gl');
    const formId = params.get('form');
    const campaignId = params.get('campaign');
    
    const directType = gigId ? 'gig' : (glId ? 'gl' : (formId ? 'form' : (campaignId ? 'campaign' : null)));
    const directId = gigId || glId || formId || campaignId;

    const directItem = directId ? (
        directType === 'gig' ? (volunteerGigs || []).find(i => i.id === directId) :
        directType === 'gl' ? (guestlists || []).find(i => i.id === directId) :
        directType === 'form' ? (forms || []).find(i => i.id === directId) :
        directType === 'campaign' ? (campaigns || []).find(i => i.id === directId) : null
    ) : null;

    useDynamicMeta({
        title: directItem ? directItem.title : "Community Hub",
        description: directItem ? (directItem.description || "Join this exclusive opportunity at Newbi Entertainment.") : "Access exclusive gigs, campaigns, and forms.",
        image: directItem && directItem.image ? directItem.image : "/favicon.svg",
        url: window.location.href
    });

    // Extract Featured Items from all categories
    const featuredItems = [
        ...(volunteerGigs || []).filter(i => i.isPinned).map(item => ({ ...item, type: 'gig' })),
        ...(guestlists || []).filter(i => i.isPinned).map(item => ({ ...item, type: 'gl' })),
        ...(forms || []).filter(i => i.isPinned).map(item => ({ ...item, type: 'form' })),
        ...(campaigns || []).filter(i => i.isPinned).map(item => ({ ...item, type: 'campaign' }))
    ];

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
            const type = directType;
            const id = directId;

            if (type && id) {
                const targetId = `${type}-${id}`;
                const attemptScroll = () => {
                    const element = document.getElementById(targetId);
                    if (element) {
                        setTimeout(() => {
                            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }, 100);
                        return true;
                    }
                    return false;
                };

                if (attemptScroll()) return;
                const interval = setInterval(() => {
                    if (attemptScroll()) clearInterval(interval);
                }, 200);
                const timeout = setTimeout(() => clearInterval(interval), 5000);
                return () => {
                    clearInterval(interval);
                    clearTimeout(timeout);
                };
            }
        }
    }, [user, hasJoined, location.search, volunteerGigs, guestlists, forms, campaigns]);

    const handleShare = async (type, id) => {
        const url = `${window.location.origin}/community?${type}=${id}`;
        
        try {
            if (navigator.share) {
                await navigator.share({
                    title: 'Newbi Tribe Access',
                    text: 'Exclusive community opportunity at Newbi.',
                    url: url,
                });
            } else {
                await navigator.clipboard.writeText(url);
                setShowShareToast(true);
                setTimeout(() => setShowShareToast(null), 3000);
            }
        } catch (err) {
            // Fallback to clipboard if share was cancelled or failed
            if (err.name !== 'AbortError') {
                navigator.clipboard.writeText(url);
                setShowShareToast(true);
                setTimeout(() => setShowShareToast(null), 3000);
            }
        }
    };

    const handleGLJoin = (gl) => {
        if (!user) {
            setAuthModal(true);
            return;
        }
        setSelectedGL(gl);
        setIsGLModalOpen(true);
    };

    const handleCardAction = (item) => {
        const type = item.type || '';
        
        if (type === 'gl' || type === 'gl_embed') {
            handleGLJoin(item);
        } else if (type === 'form') {
            navigate(`/forms/${item.id}`);
        } else if (type === 'campaign') {
            navigate(`/campaign/${item.id}`);
        } else if (type === 'gig') {
            if (item.applyType === 'whatsapp') {
                const phone = item.applyLink?.replace(/[^0-9]/g, '');
                window.open(`https://wa.me/${phone || item.applyLink}`, '_blank');
            } else if (item.applyLink) {
                window.open(item.applyLink, '_blank');
            }
        }
    };

    const handleJoinedConfirm = async () => {
        setConfirming(true);
        try { await markFormAsSubmitted(); } 
        catch (error) { useStore.getState().addToast(error.message || 'Verification failed.', 'error'); } 
        finally { setConfirming(false); }
    };

    const handleWhatsappJoined = async () => {
        setVerifyingWhatsapp(true);
        try {
            await markWhatsappJoined();
        } catch (error) {
            useStore.getState().addToast(error.message || 'Verification failed.', 'error');
        } finally {
            setVerifyingWhatsapp(false);
        }
    };

    const sections = [
        { id: 'volunteer-gigs', title: 'VOLUNTEER GIGS', icon: Users, accent: 'neon-green', items: (volunteerGigs || []), type: 'gig', label: null, show: siteSettings?.showVolunteerGigs !== false, subtitleText: 'field opportunities' },
        { id: 'guestlists', title: 'EXCLUSIVE GUESTLISTS', icon: ShieldCheck, accent: 'neon-blue', items: (guestlists || []), type: 'gl', label: null, show: true, subtitleText: 'verified entry' },
        { id: 'community-pulse', title: 'COMMUNITY FORMS', icon: FileText, accent: 'neon-pink', items: (forms || []), type: 'form', label: null, show: true, subtitleText: 'active entry portals' }
    ].filter(s => s.show);

    return (
        <div className="min-h-screen bg-[#020202] text-white pt-32 pb-20 relative overflow-hidden">
            {/* Background Atmosphere */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[20%] left-[-10%] w-[50%] h-[50%] bg-neon-blue/5 rounded-full blur-[150px] opacity-20" />
                <div className="absolute bottom-[10%] right-[-10%] w-[40%] h-[40%] bg-neon-pink/5 rounded-full blur-[150px] opacity-10" />
            </div>

            <div className="max-w-7xl mx-auto relative z-10 px-4 md:px-8">
                {/* Immersive Header */}
                <div className="text-center relative overflow-hidden mb-20">
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
                        className="text-6xl md:text-8xl font-black font-heading text-transparent bg-clip-text bg-gradient-to-r from-neon-green via-neon-blue to-neon-pink mb-6 tracking-tight leading-none uppercase text-center italic"
                    >
                        {user ? (
                            <>HELLO, {user.displayName?.split(' ')[0]}</>
                        ) : (
                            <>THE TRIBE.</>
                        )}
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="text-gray-400 max-w-2xl mx-auto text-base md:text-xl font-bold leading-relaxed uppercase tracking-widest"
                    >
                        {user ? "Exclusive opportunities await." : "Join India's most disruptive youth community."}
                    </motion.p>
                </div>

                {!user ? (
                    <section className="flex flex-col items-center">
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="p-12 md:p-20 bg-zinc-900/40 border border-white/10 rounded-[3rem] backdrop-blur-[20px] text-center max-w-2xl shadow-2xl relative overflow-hidden group"
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-neon-blue/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <Users className="w-24 h-24 text-neon-blue mx-auto mb-12 relative z-10" />
                            <h3 className="text-4xl font-black font-heading mb-6 relative z-10 italic uppercase">GET STARTED.</h3>
                            <p className="text-gray-500 mb-12 relative z-10 text-lg font-medium tracking-tight">Join the ranks to access exclusive gigs, VIP guestlists, and more.</p>
                            <Button
                                onClick={() => setAuthModal(true)}
                                className="w-full h-20 text-xl rounded-2xl font-black font-heading tracking-widest bg-white text-black hover:scale-[1.02] transition-all shadow-[0_20px_50px_rgba(255,255,255,0.1)]"
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
                                <h2 className="text-4xl font-black font-heading uppercase tracking-tighter text-white italic underline underline-offset-8">REGISTRATION.</h2>
                            </div>

                            <div className="relative group">
                                <div className="absolute -inset-2 bg-gradient-to-r from-neon-pink via-neon-blue to-neon-green rounded-[3.5rem] blur-2xl opacity-10 group-hover:opacity-30 transition duration-1000" />
                                <div className="relative w-full aspect-[4/5] md:aspect-[3/2] bg-zinc-900 rounded-[3rem] overflow-hidden border border-white/10 shadow-2xl">
                                    <iframe
                                        src="https://docs.google.com/forms/d/e/1FAIpQLScQv55cT-hPBqTtw7PFqOZND6QfPkmjzT8_4Sf4G53_UYwSQg/viewform?embedded=true"
                                        className="w-full h-full border-0"
                                        style={{ filter: 'invert(1) hue-rotate(180deg) brightness(0.8)', background: 'transparent' }}
                                        title="Newbi Tribe Registration"
                                    >Loading...</iframe>
                                </div>
                            </div>

                            <div className="mt-20 p-12 bg-zinc-900/60 border border-white/10 rounded-[2.5rem] backdrop-blur-[20px] text-center relative overflow-hidden shadow-2xl">
                                <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-neon-green blur-[80px] opacity-10" />
                                <h3 className="text-3xl font-black font-heading text-white mb-4 uppercase italic">SUBMITTED THE FORM?</h3>
                                <p className="text-gray-500 mb-10 max-w-sm mx-auto font-medium tracking-tight">Click below to finalize your entry and unlock the hub.</p>
                                <Button
                                    onClick={handleJoinedConfirm}
                                    disabled={confirming}
                                    className="h-20 px-16 rounded-2xl font-black font-heading tracking-widest bg-neon-green text-black shadow-[0_10px_30px_rgba(46,255,144,0.2)]"
                                >
                                    {confirming ? <Loader2 className="animate-spin" /> : 'SUBMIT APPLICATION'}
                                </Button>
                            </div>
                        </div>
                    </section>
                ) : (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-24 pb-20">
                         {/* 0. Featured Spotlight (Top of the Page) */}
                         {featuredItems.length > 0 && (
                             <section id="featured" className="scroll-mt-32 relative py-20 px-8 rounded-[4rem] bg-white/[0.01] border border-white/[0.03] overflow-hidden group/featured">
                                 {/* Cinematic Spotlight Accents */}
                                 <div 
                                     className="absolute top-0 right-0 w-[50%] h-[50%] blur-[120px] opacity-0 group-hover/featured:opacity-100 transition-all duration-1000" 
                                     style={{ backgroundColor: `${featuredItems[0]?.highlightColor || '#2ebfff'}15` }}
                                 />
                                 <div 
                                     className="absolute bottom-0 left-0 w-[50%] h-[50%] blur-[120px] opacity-0 group-hover/featured:opacity-30 transition-all duration-1000" 
                                     style={{ backgroundColor: `${featuredItems[0]?.highlightColor || '#FF4F8B'}15` }}
                                 />
                                 
                                 <div className="relative z-10">
                                     <div className="flex items-center gap-6 mb-16">
                                         <div 
                                             className="w-16 h-16 rounded-2xl text-black flex items-center justify-center shrink-0 transition-all duration-700"
                                             style={{ 
                                                 backgroundColor: featuredItems[0]?.highlightColor || '#2ebfff',
                                                 boxShadow: `0 0 30px ${(featuredItems[0]?.highlightColor || '#2ebfff')}50`
                                             }}
                                         >
                                             <Sparkles size={32} />
                                         </div>
                                         <div>
                                             <h2 className="text-4xl md:text-7xl font-black font-heading tracking-tighter text-white uppercase italic leading-none">
                                                 FEATURED SPOTLIGHT
                                             </h2>
                                             <div className="flex items-center gap-3 mt-2">
                                                 <div className="h-[1px] w-8 transition-all duration-700" style={{ backgroundColor: featuredItems[0]?.highlightColor || '#2ebfff' }} />
                                                 <p className="text-[10px] md:text-sm font-black text-gray-500 uppercase tracking-[0.4em]">
                                                     ELITE TRIBE EXCLUSIVES
                                                 </p>
                                             </div>
                                         </div>
                                     </div>

                                     <div className="flex overflow-x-auto md:grid md:grid-cols-2 gap-8 md:gap-10 pb-12 md:pb-0 snap-x horizontal-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
                                             {featuredItems.map((item) => (
                                                 <motion.div 
                                                     key={`featured-${item.id}`}
                                                     id={`${item.type}-${item.id}`}
                                                     initial={{ opacity: 0, y: 30 }}
                                                 whileInView={{ opacity: 1, y: 0 }}
                                                 viewport={{ once: true }}
                                                 className="relative w-[300px] md:w-full flex-shrink-0 snap-center md:snap-none"
                                             >
                                                 <CommunityCard 
                                                     item={item} 
                                                     type={item.type} 
                                                     handleShare={handleShare} 
                                                     onAction={handleCardAction}
                                                 />
                                             </motion.div>
                                         ))}
                                     </div>
                                 </div>
                             </section>
                         )}

                         {/* 1. Status UI & Quick Join */}
                         {!user?.hasJoinedWhatsapp && (
                             <section className="max-w-6xl">
                                 <div className="bg-zinc-900/40 border border-white/10 rounded-[3rem] p-10 md:p-16 flex flex-col md:flex-row items-center gap-10 relative overflow-hidden group backdrop-blur-[20px] shadow-2xl">
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-neon-green/5 blur-[100px] pointer-events-none" />
                                    <div className="w-24 h-24 bg-neon-green rounded-[2rem] flex items-center justify-center text-black shadow-[0_0_50px_rgba(57,255,20,0.3)] shrink-0">
                                        <CheckCircle2 size={40} />
                                    </div>
                                    <div className="flex-1 text-center md:text-left relative z-10">
                                        <h3 className="text-4xl font-black font-heading text-white mb-4 uppercase italic leading-tight">YOUR TRIBE ACCESS IS ACTIVE.</h3>
                                        <p className="text-gray-500 text-lg font-medium leading-relaxed tracking-tight uppercase">Join the primary communication channel below for instant updates.</p>
                                    </div>
                                    {!clickedWhatsApp ? (
                                        <a 
                                            href={siteDetails.whatsappCommunity || "#"} 
                                            target="_blank" 
                                            rel="noreferrer"
                                            onClick={() => setClickedWhatsApp(true)}
                                            className="w-full md:w-auto px-12 h-20 bg-white text-black rounded-2xl flex items-center justify-center font-black font-heading tracking-widest uppercase text-base hover:scale-105 transition-all relative z-10 shadow-[0_20px_50px_rgba(255,255,255,0.1)]"
                                        >
                                            WhatsApp Connection
                                        </a>
                                    ) : (
                                        <div className="flex flex-col gap-3 w-full md:w-auto mt-4 md:mt-0 relative z-10">
                                            <button 
                                                onClick={handleWhatsappJoined}
                                                disabled={verifyingWhatsapp}
                                                className="w-full md:w-auto px-12 h-20 bg-neon-blue text-black rounded-2xl flex items-center justify-center font-black font-heading tracking-widest uppercase text-base hover:scale-[1.02] transition-all shadow-[0_15px_40px_rgba(0,255,255,0.2)] disabled:opacity-50"
                                            >
                                                {verifyingWhatsapp ? <Loader2 className="animate-spin" size={24} /> : "I'VE JOINED THE HUB"}
                                            </button>
                                        </div>
                                    )}
                                 </div>
                             </section>
                         )}

                        {/* 2. Active Giveaway Banner */}
                        <AnimatePresence>
                            {activeGiveaway && (
                                <section className="w-full">
                                    <motion.div 
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="group relative block overflow-hidden rounded-[3rem] border border-purple-500/30 bg-purple-600/10 p-1 md:p-2 backdrop-blur-[20px] shadow-2xl shadow-purple-500/5"
                                    >
                                        <Link to={`/giveaway/${activeGiveaway.slug}`} className="flex flex-col md:flex-row items-center gap-10 p-8 md:p-14">
                                            <div className="w-24 h-24 rounded-[2rem] bg-purple-600 flex items-center justify-center text-white shadow-2xl shadow-purple-500/40 group-hover:scale-110 group-hover:rotate-12 transition-all duration-500">
                                                <Gift size={48} />
                                            </div>
                                            <div className="flex-1 text-center md:text-left space-y-4">
                                                <div className="inline-flex px-4 py-1.5 rounded-full bg-purple-500/20 text-purple-400 text-[9px] font-black uppercase tracking-widest border border-purple-500/20">
                                                    LIMITED OPPORTUNITY
                                                </div>
                                                <h3 className="text-4xl md:text-6xl font-black font-heading uppercase italic tracking-tighter text-white leading-tight">
                                                    WIN <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-neon-blue">{activeGiveaway.name}</span>
                                                </h3>
                                                <p className="text-sm md:text-lg font-medium text-gray-400 max-w-2xl tracking-tight leading-relaxed uppercase italic">
                                                    Exclusive rewarding for the Tribe. Participate, refer, and win.
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-4 px-10 h-20 bg-purple-600 text-white rounded-2xl font-black font-heading tracking-widest uppercase text-sm shadow-2xl group-hover:gap-8 transition-all">
                                                PARTICIPATE NOW <ArrowRight size={20} />
                                            </div>
                                        </Link>
                                    </motion.div>
                                </section>
                            )}
                        </AnimatePresence>

                        {/* 3. Unified Feed Sections */}
                        <div className="space-y-32">
                            {sections.map((section) => (
                                <section key={section.id} id={section.id} className="scroll-mt-32">
                                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 px-4 md:px-0">
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-3">
                                                <div className={cn(
                                                    "w-12 h-12 rounded-2xl flex items-center justify-center border backdrop-blur-xl",
                                                    section.accent === 'neon-blue' ? "bg-neon-blue/10 border-neon-blue/20 text-neon-blue" : 
                                                    (section.accent === 'neon-green' ? "bg-neon-green/10 border-neon-green/20 text-neon-green" : 
                                                    "bg-neon-pink/10 border-neon-pink/20 text-neon-pink")
                                                )}>
                                                    <section.icon size={22} />
                                                </div>
                                                {section.label && (
                                                    <span className={cn(
                                                        "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border backdrop-blur-md",
                                                        section.accent === 'neon-blue' ? "bg-neon-blue/10 text-neon-blue border-neon-blue/20" : 
                                                        (section.accent === 'neon-green' ? "bg-neon-green/10 text-neon-green border-neon-green/20" : 
                                                        "bg-neon-pink/10 text-neon-pink border-neon-pink/20")
                                                    )}>
                                                        {section.label}
                                                    </span>
                                                )}
                                            </div>
                                            <div>
                                                <h2 className="text-4xl md:text-5xl font-black font-heading tracking-tighter text-white uppercase italic leading-none pb-2">
                                                    {section.title}
                                                </h2>
                                                <p className="text-xs font-black text-gray-500 uppercase tracking-[0.3em] pl-1">
                                                    {section.items?.length || 0} {section.subtitleText}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {section.items?.length > 0 ? (
                                        <div className="flex overflow-x-auto md:grid md:grid-cols-2 gap-8 md:gap-10 pb-12 md:pb-0 snap-x horizontal-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
                                            {section.items.map((item) => (
                                                <motion.div 
                                                    key={`${section.id}-${item.id}`}
                                                    id={`${item.type || section.type}-${item.id}`}
                                                    initial={{ opacity: 0, y: 30 }}
                                                    whileInView={{ opacity: 1, y: 0 }}
                                                    viewport={{ once: true }}
                                                    className="w-[300px] md:w-full flex-shrink-0 snap-center md:snap-none"
                                                >
                                                    <CommunityCard 
                                                        item={item} 
                                                        type={item.type || section.type} 
                                                        handleShare={handleShare} 
                                                        onAction={handleCardAction}
                                                    />
                                                </motion.div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="py-24 bg-white/[0.02] rounded-[3rem] border border-dashed border-white/5 text-center flex flex-col items-center gap-6">
                                            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-gray-700">
                                                <section.icon size={30} />
                                            </div>
                                            <p className="text-gray-600 font-bold uppercase tracking-widest text-xs">No active {section.title.toLowerCase()} at the moment.</p>
                                        </div>
                                    )}
                                </section>
                            ))}
                        </div>
                    </motion.div>
                )}
            </div>

            <UnifiedGuestlistModal 
                isOpen={isGLModalOpen} 
                onClose={() => {
                    setIsGLModalOpen(false);
                    setSelectedGL(null);
                }} 
                guestlist={selectedGL} 
            />

            {/* Share Success Toast */}
            <AnimatePresence>
                {showShareToast && (
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[100] px-8 py-4 bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl flex items-center gap-4 backdrop-blur-xl"
                    >
                        <div className="w-2 h-2 rounded-full bg-neon-green" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-white">ACCESS_LINK_COPIED</span>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default CommunityJoin;
