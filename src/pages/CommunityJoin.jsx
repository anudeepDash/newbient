import React, { useEffect, useState } from 'react';
import { useStore } from '../lib/store';
import { Button } from '../components/ui/Button';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, MapPin, Users, Lock, Share2, ClipboardList, ExternalLink, ArrowRight, Loader2, Sparkles, CheckCircle2, Ticket } from 'lucide-react';
import AuthOverlay from '../components/auth/AuthOverlay';
import BuyTicketModal from '../components/tickets/BuyTicketModal';
import { cn } from '../lib/utils';

const CommunityCard = ({ item, type, handleShare }) => {
    const [isFlipped, setIsFlipped] = useState(false);
    const isGig = type === 'gig';
    const isForm = type === 'form';

    const isWhatsApp = isGig && item.applyType === 'whatsapp';
    const href = isForm
        ? `/forms/${item.id}`
        : (isGig
            ? (isWhatsApp
                ? `https://wa.me/${item.applyLink.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hi, I'm interested in the ${item.title} volunteer gig!`)}`
                : item.applyLink)
            : item.link);

    const Icon = isForm ? ClipboardList : (isGig ? Users : Calendar);
    const accentColor = isForm ? 'neon-pink' : (isGig ? 'neon-green' : 'neon-blue');

    return (
        <div
            id={`${type}-${item.id}`}
            className="perspective-1000 w-full min-h-[220px]"
        >
            <motion.div
                initial={false}
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{ duration: 0.8, type: "spring", stiffness: 100, damping: 20 }}
                className="relative w-full h-full preserve-3d cursor-default"
            >
                {/* Front Side - Ticket Aesthetic */}
                <div className={cn(
                    "backface-hidden relative bg-zinc-900/40 backdrop-blur-xl border border-white/10 rounded-[2rem] overflow-hidden flex flex-col group transition-all duration-500",
                    isForm ? "hover:border-neon-pink/40 shadow-neon-pink/5" : (isGig ? "hover:border-neon-green/40 shadow-neon-green/5" : "hover:border-neon-blue/40 shadow-neon-blue/5")
                )}>
                    {/* Header Gradient Strip */}
                    <div className={cn(
                        "h-1.5 w-full bg-gradient-to-r relative z-10",
                        isForm ? "from-neon-pink via-neon-pink/50 to-transparent" : (isGig ? "from-neon-green via-neon-green/50 to-transparent" : "from-neon-blue via-neon-blue/50 to-transparent")
                    )}></div>

                    <div className={cn(
                        "flex h-full",
                        isGig ? "flex-col" : "flex-col sm:flex-row"
                    )}>
                        {/* Main Info Section */}
                        <div className="flex-1 p-5 md:p-6 flex flex-col relative overflow-hidden">
                            {!isForm && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleShare(isGig ? 'gig' : 'gl', item.id); }}
                                    className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white transition-colors z-20 bg-black/20 rounded-full backdrop-blur-sm"
                                >
                                    <Share2 size={16} />
                                </button>
                            )}
                            {/* Decorative Background Icon */}
                            <div className="absolute -right-8 -bottom-8 opacity-[0.03] rotate-12 pointer-events-none group-hover:scale-110 transition-transform duration-1000">
                                <Icon size={180} />
                            </div>

                            <div className="flex items-center mb-6 gap-4">
                                <div className={cn(
                                    "p-3 rounded-2xl bg-white/5 border border-white/10 shadow-lg group-hover:scale-110 transition-all duration-500 shrink-0",
                                    isForm ? "text-neon-pink group-hover:bg-neon-pink/10" : (isGig ? "text-neon-green group-hover:bg-neon-green/10" : "text-neon-blue group-hover:bg-neon-blue/10")
                                )}>
                                    <Icon size={24} />
                                </div>
                                {!isForm && (
                                    <div className="flex items-center gap-2">
                                        <span className={cn(
                                            "px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest border",
                                            item.status === 'Open' ? "bg-neon-green/10 text-neon-green border-neon-green/20" : "bg-red-500/10 text-red-500 border-red-500/20"
                                        )}>
                                            {item.status || 'Open'}
                                        </span>
                                    </div>
                                )}
                                {isForm && (
                                    <span className="px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest border bg-white/5 text-gray-500 border-white/10">{item.activeLabel ?? 'Active Pulse'}</span>
                                )}
                            </div>

                            <div className="flex-1">
                                <h3 className={cn(
                                    "text-lg md:text-xl font-bold font-heading leading-tight mb-3 transition-colors",
                                    isForm ? "group-hover:text-neon-pink" : (isGig ? "group-hover:text-neon-green" : "group-hover:text-neon-blue")
                                )}>
                                    {item.title}
                                </h3>

                                {(item.description || item.roles) && (
                                    <p className="text-gray-400 text-sm line-clamp-2 italic font-medium opacity-70 leading-relaxed mb-4">
                                        "{item.description || (Array.isArray(item.roles) ? item.roles.join(', ') : item.roles)}"
                                    </p>
                                )}

                                {!isForm && (
                                    <div className="flex flex-wrap gap-x-6 gap-y-3 mt-auto">
                                        <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                            <Calendar size={14} className={isGig ? "text-neon-green" : "text-neon-blue"} />
                                            <span className="text-white/60">
                                                {isGig
                                                    ? `${item.dates && item.dates.length > 0 ? item.dates.map(d => d.split('-').reverse().join('-')).join(', ') : (item.date ? item.date.split('-').reverse().join('-') : 'Upcoming')} | ${item.time}`
                                                    : (item.date ? item.date.split('-').reverse().join('-') : 'Upcoming')}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                            <MapPin size={14} className="text-neon-pink" />
                                            <span className="text-white/60 truncate max-w-[120px]">{item.location || (isGig ? '' : 'TBA')}</span>
                                        </div>
                                    </div>
                                )}
                                {isForm && (
                                    <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-auto">
                                        <Sparkles size={14} className="text-neon-pink" />
                                        <span>{item.bottomText ?? 'Community Form'}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Perforated Divider - Hide for Gigs */}
                        {!isGig && (
                            <div className="hidden sm:flex flex-col items-center justify-between py-4 relative w-px h-full">
                                <div className="w-5 h-5 rounded-full bg-black -mt-7 -ml-[2px] border-b border-white/5 shadow-[inset_0_-2px_4px_rgba(0,0,0,0.5)]"></div>
                                <div className="flex-1 border-l border-dashed border-white/20 my-2"></div>
                                <div className="w-5 h-5 rounded-full bg-black -mb-7 -ml-[2px] border-t border-white/5 shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]"></div>
                            </div>
                        )}

                        {/* Action Section */}
                        <div className={cn(
                            "p-5 md:p-6 bg-white/[0.02] flex flex-col justify-between items-center relative gap-3",
                            isGig ? "w-full border-t border-white/5" : "sm:w-[220px]"
                        )}>

                            <div className="w-full space-y-4 pt-4 sm:pt-0 mt-auto">


                                <div className="space-y-3">
                                    {isForm ? (
                                        <Link to={href} className="block w-full">
                                            <Button
                                                className="w-full h-14 rounded-2xl font-bold uppercase tracking-widest text-xs gap-2 font-heading transition-all shadow-xl group-hover:scale-[1.02] bg-neon-pink text-black hover:bg-neon-pink/80 shadow-neon-pink/20"
                                            >
                                                {item.buttonText || 'Take Form'}
                                                <ArrowRight size={16} />
                                            </Button>
                                        </Link>
                                    ) : (
                                        <Button
                                            as="a"
                                            href={href}
                                            target="_blank"
                                            className={cn(
                                                "w-full h-14 rounded-2xl font-bold uppercase tracking-widest text-xs gap-2 font-heading transition-all shadow-xl group-hover:scale-[1.02]",
                                                isGig
                                                    ? (isWhatsApp ? "bg-[#25D366] text-black hover:bg-[#128C7E]" : "bg-neon-green text-black hover:bg-neon-green/80 shadow-[0_0_30px_rgba(34,197,94,0.4)] hover:shadow-[0_0_40px_rgba(34,197,94,0.6)]")
                                                    : "bg-neon-blue text-black hover:bg-neon-blue/80 shadow-neon-blue/20"
                                            )}
                                        >
                                            {isGig ? (isWhatsApp ? 'Apply via WA' : 'Apply for Gig') : 'Register Now'}
                                            <ArrowRight size={16} />
                                        </Button>
                                    )}

                                    {item.whatsappLink && (
                                        <Button
                                            as="a"
                                            href={item.whatsappLink}
                                            target="_blank"
                                            className="w-full h-12 bg-zinc-800/80 text-green-400 border border-green-400/20 hover:bg-green-400/10 rounded-xl font-bold uppercase tracking-widest text-[10px] gap-2 font-heading"
                                        >
                                            Join WhatsApp
                                            <ExternalLink size={14} />
                                        </Button>
                                    )}


                                    {(item.description || item.roles) && (
                                        <button
                                            onClick={() => setIsFlipped(true)}
                                            className="w-full text-center py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 hover:text-white transition-colors pt-2"
                                        >
                                            [ View Details ]
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Back Side - Info Docket */}
                <div className={cn(
                    "absolute inset-0 backface-hidden rotate-y-180 bg-zinc-900 border border-white/10 rounded-[2rem] p-8 md:p-10 flex flex-col overflow-hidden shadow-2xl",
                    isForm ? "border-neon-pink/30" : (isGig ? "border-neon-green/30" : "border-neon-blue/30")
                )}>
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <p className={cn(
                                "text-[10px] font-bold uppercase tracking-widest mb-1",
                                isForm ? "text-neon-pink" : "text-gray-500"
                            )}>More Information</p>
                            <h3 className="text-2xl font-bold font-heading leading-tight">{item.title}</h3>
                        </div>
                        <button
                            onClick={() => setIsFlipped(false)}
                            className="p-3 bg-white/5 rounded-full text-gray-400 hover:text-white transition-all shadow-lg"
                        >
                            <ArrowRight className="rotate-180" size={24} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-4">
                        <p className="text-gray-300 text-sm italic font-medium leading-relaxed whitespace-pre-wrap">
                            "{item.description || (Array.isArray(item.roles) ? item.roles.join(', ') : item.roles)}"
                        </p>
                    </div>

                    <div className="mt-8 pt-8 border-t border-white/10 text-center">
                        <button
                            onClick={() => setIsFlipped(false)}
                            className="text-[10px] font-bold text-gray-500 hover:text-white uppercase tracking-widest transition-colors"
                        >
                            ← Back to {isForm ? 'Form' : 'Event'}
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

const CommunityJoin = () => {
    const { forms, siteDetails, volunteerGigs, guestlists, upcomingEvents, user, authInitialized, markFormAsSubmitted, setAuthModal, logout } = useStore();
    const location = useLocation();
    const [confirming, setConfirming] = useState(false);
    const [selectedTicketEvent, setSelectedTicketEvent] = useState(null);
    const hasJoined = user && user.hasJoinedTribe;

    // Filter ticketed events
    const ticketedEvents = upcomingEvents?.filter(e => e.isTicketed) || [];

    // Auto-trigger sign-in if not authenticated
    useEffect(() => {
        if (authInitialized && !user) {
            const timer = setTimeout(() => {
                setAuthModal(true);
            }, 1000); // Small delay for smooth entry
            return () => clearTimeout(timer);
        }
    }, [authInitialized, user, setAuthModal]);

    // Auto-scroll to gig/guestlist if query param exists
    useEffect(() => {
        if (!hasJoined) return; // Wait until content is unlocked

        const params = new URLSearchParams(location.search);
        const gigId = params.get('gig');
        const glId = params.get('gl');
        const targetId = gigId ? `gig-${gigId}` : (glId ? `gl-${glId}` : null);

        if (targetId) {
            // Use a small delay to ensure React has finished rendering the unlocked content
            const timer = setTimeout(() => {
                const element = document.getElementById(targetId);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    // Add a temporary glow or highlight effect
                    element.classList.add('ring-2', 'ring-neon-blue', 'rounded-[2rem]');
                    setTimeout(() => {
                        element.classList.remove('ring-2', 'ring-neon-blue', 'rounded-[2rem]');
                    }, 2000);
                }
            }, 800);
            return () => clearTimeout(timer);
        }
    }, [location.search, volunteerGigs, guestlists, hasJoined]);

    const handleShare = (type, id) => {
        const url = `${window.location.origin}/community-join?${type}=${id}`;
        navigator.clipboard.writeText(url);
        alert('Link copied to clipboard!');
    };

    const handleJoinedConfirm = async () => {
        setConfirming(true);
        try {
            await markFormAsSubmitted();
        } catch (error) {
            console.error(error);
            alert(error.message || 'Verification failed.');
        } finally {
            setConfirming(false);
        }
    };


    return (
        <div className="min-h-screen bg-black text-white pt-20 md:pt-24 pb-16 md:pb-20 px-4 scroll-smooth">
            <style dangerouslySetInnerHTML={{
                __html: `
                .perspective-1000 { perspective: 1000px; }
                .preserve-3d { transform-style: preserve-3d; }
                .backface-hidden { backface-visibility: hidden; }
                .rotate-y-180 { transform: rotateY(180deg); }
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 20px; }
            `}} />

            <div className="max-w-7xl mx-auto space-y-12 md:space-y-24">

                {/* Header */}
                <div className="text-center relative py-10 overflow-hidden">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-neon-blue/10 blur-[100px] pointer-events-none rounded-full"></div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 mb-8 backdrop-blur-md"
                    >
                        <Sparkles size={16} className="text-neon-pink" />
                        <span className="text-xs font-heading font-bold uppercase tracking-widest text-gray-300">
                            The Inner Circle
                        </span>
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-4xl md:text-8xl font-bold font-heading text-transparent bg-clip-text bg-gradient-to-r from-neon-green to-neon-blue mb-6 tracking-tight leading-none"
                    >
                        {user ? `Hello, ${user.displayName?.split(' ')[0] || 'Tribe Member'}` : 'Community Hub'}
                    </motion.h1>

                    {user && (
                        <motion.button
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            onClick={() => logout()}
                            className="absolute top-0 right-0 p-4 text-[10px] font-bold text-gray-500 hover:text-neon-pink uppercase tracking-widest transition-all flex items-center gap-2"
                        >
                            <span>Sign Out</span>
                            <Lock size={12} />
                        </motion.button>
                    )}

                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="text-lg md:text-2xl text-gray-400 max-w-2xl mx-auto px-4 font-medium leading-relaxed"
                    >
                        {user
                            ? (hasJoined ? "Great to have you here! Explore upcoming gigs, guestlists and more." : "One final step to join the Newbi Tribe.")
                            : "Welcome to the Newbi Tribe. Get access to exclusive guestlists, gigs, and community perks."
                        }
                    </motion.p>
                </div>

                {!user ? (
                    /* Not Logged In State */
                    <section className="py-10 text-center flex flex-col items-center">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            className="p-10 md:p-16 bg-zinc-900 border border-white/10 rounded-[3rem] backdrop-blur-2xl mb-12 max-w-xl w-full shadow-2xl relative group overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-neon-blue/5 blur-[50px] -mr-16 -mt-16"></div>

                            <Users className="w-20 h-20 text-neon-blue mx-auto mb-10 relative z-10" />
                            <h3 className="text-3xl font-bold mb-6 relative z-10 font-heading">Start Your Journey</h3>
                            <p className="text-gray-400 mb-12 relative z-10 text-lg font-medium leading-relaxed">
                                Sign in to join the tribe, access exclusive volunteer gigs, and claim your spot on the guestlist.
                            </p>
                            <Button
                                onClick={() => setAuthModal(true)}
                                className="w-full h-20 text-xl shadow-[0_0_50px_rgba(0,255,255,0.15)] rounded-2xl font-bold font-heading uppercase tracking-widest"
                            >
                                Sign In to Unlock
                            </Button>
                        </motion.div>
                    </section>
                ) : !hasJoined ? (
                    /* Logged In, Not Joined State */
                    <section className="space-y-20 md:space-y-32">
                        <div className="max-w-5xl mx-auto">
                            <div className="flex items-center gap-4 mb-12">
                                <span className="flex items-center justify-center w-12 h-12 rounded-full bg-neon-blue text-black font-bold text-xl">1</span>
                                <h2 className="text-3xl md:text-4xl font-bold font-heading uppercase tracking-widest">Step 1: The Tribe Form</h2>
                            </div>

                            <div className="relative group">
                                <div className="absolute -inset-1 bg-gradient-to-r from-neon-pink to-neon-blue rounded-[3rem] blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
                                <div className="relative w-full aspect-[1/2] sm:aspect-[4/5] md:aspect-[3/2] bg-zinc-900 rounded-[2.8rem] overflow-hidden shadow-2xl border border-white/10">
                                    <iframe
                                        src="https://docs.google.com/forms/d/e/1FAIpQLScQv55cT-hPBqTtw7PFqOZND6QfPkmjzT8_4Sf4G53_UYwSQg/viewform?embedded=true"
                                        className="w-full h-full border-0"
                                        style={{ filter: 'invert(1) hue-rotate(180deg)', background: 'transparent', opacity: 0.9 }}
                                        title="NewBi Tribe Registration"
                                    >
                                        Loading form...
                                    </iframe>
                                </div>
                            </div>

                            <div className="mt-16 text-center p-12 bg-zinc-900/40 border border-white/10 rounded-[3rem] backdrop-blur-xl">
                                <h3 className="text-3xl font-bold mb-4 font-heading">Already filled the form?</h3>
                                <p className="text-gray-400 mb-10 max-w-md mx-auto font-medium">Once you've submitted the Google Form, click below to instantly unlock the community hub.</p>
                                <Button
                                    onClick={handleJoinedConfirm}
                                    disabled={confirming}
                                    className="h-20 px-16 text-xl shadow-[0_0_40px_rgba(57,255,20,0.1)] group rounded-2xl font-bold font-heading uppercase tracking-widest"
                                >
                                    <span className="flex items-center gap-4">
                                        {confirming ? <Loader2 className="animate-spin" /> : <CheckCircle2 className="group-hover:scale-110 transition-transform" size={28} />}
                                        I have submitted the form
                                    </span>
                                </Button>
                            </div>
                        </div>

                        {/* WhatsApp Section (Locked) */}
                        <div className="max-w-5xl mx-auto relative group">
                            <div className="absolute inset-x-0 inset-y-0 bg-black/60 z-20 rounded-[3rem] backdrop-blur-md flex flex-col items-center justify-center p-10 text-center">
                                <div className="bg-zinc-900 p-8 rounded-2xl border border-white/10 shadow-2xl">
                                    <Lock className="w-12 h-12 text-gray-400 mx-auto mb-6" />
                                    <p className="text-sm font-bold uppercase tracking-widest text-gray-500">Step 2: Join the Hub</p>
                                    <p className="text-xs text-gray-600 mt-2 italic font-medium">Unlock Step 1 first to join the chat</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 mb-12 md:opacity-50">
                                <span className="flex items-center justify-center w-12 h-12 rounded-full bg-neon-pink text-black font-bold text-xl">2</span>
                                <h2 className="text-3xl md:text-4xl font-bold font-heading uppercase tracking-widest">Step 2: Join the Hub</h2>
                            </div>

                            <div className="bg-zinc-900 border border-white/5 rounded-[3rem] p-12 md:p-20 relative overflow-hidden grayscale opacity-30">
                                <div className="relative z-10 flex flex-col md:flex-row items-center gap-10 md:gap-16">
                                    <div className="w-24 h-24 bg-[#25D366] rounded-3xl flex items-center justify-center shadow-xl">
                                        <Share2 className="w-12 h-12 text-black" />
                                    </div>
                                    <div className="flex-1 text-center md:text-left">
                                        <h3 className="text-3xl font-bold mb-6 font-heading">The WhatsApp Tribe</h3>
                                        <p className="text-gray-500 text-lg leading-relaxed font-medium">Stay ahead of the curve. Get first dibs on event tickets, secret location drops, and community announcements.</p>
                                    </div>
                                    <Button className="w-full md:w-[240px] h-16 bg-[#25D366] text-black font-bold uppercase tracking-widest rounded-2xl">
                                        Join Community
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </section>
                ) : (
                    /* Authenticated & Joined State */
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="space-y-24 md:space-y-40"
                    >
                        {/* WhatsApp (Unlocked) */}
                        <section className="relative group max-w-5xl mx-auto">
                            <div className="absolute -inset-1 bg-gradient-to-r from-[#25D366]/10 to-neon-blue/10 rounded-[3rem] blur opacity-10 group-hover:opacity-20 transition duration-1000"></div>
                            <div className="bg-zinc-900 border border-white/5 rounded-[2.5rem] p-8 md:p-12 relative overflow-hidden flex flex-col md:flex-row items-center gap-8 md:gap-12">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-[#25D366]/5 blur-[80px] -mr-32 -mt-32"></div>
                                <div className="w-20 h-20 md:w-24 md:h-24 bg-[#25D366] rounded-[2rem] flex items-center justify-center group-hover:scale-110 transition-transform duration-500 shadow-xl">
                                    <CheckCircle2 className="w-10 h-10 md:w-12 md:h-12 text-black" />
                                </div>
                                <div className="flex-1 text-center md:text-left">
                                    <div className="flex items-center justify-center md:justify-start gap-3 mb-3">
                                        <span className="px-3 py-1 bg-[#25D366]/10 text-[#25D366] text-[10px] font-bold uppercase tracking-widest rounded-full border border-[#25D366]/20">Step 2: Complete</span>
                                    </div>
                                    <h3 className="text-2xl md:text-3xl font-bold mb-4 font-heading">Welcome to the Inner Circle</h3>
                                    <p className="text-gray-400 text-lg max-w-xl leading-relaxed font-medium">
                                        You're officially a part of the Newbi Tribe. Connect with fellow members and stay updated on the latest drops.
                                    </p>
                                </div>
                                <Button
                                    as="a"
                                    href={siteDetails.whatsappCommunity || "#"}
                                    target="_blank"
                                    className="w-full md:w-auto bg-[#25D366] text-black hover:bg-[#128C7E] h-20 px-10 rounded-2xl font-bold uppercase tracking-widest text-sm"
                                >
                                    Join WhatsApp Community
                                </Button>
                            </div>
                        </section>

                        {/* Guestlists */}
                        <section id="guestlists" className="scroll-mt-32">
                            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12 md:mb-16">
                                <div className="flex items-center gap-5">
                                    <div className="h-12 w-1.5 bg-neon-blue rounded-full shadow-[0_0_20px_rgba(0,255,255,0.3)]"></div>
                                    <div>
                                        <p className="text-[10px] font-bold text-neon-blue uppercase tracking-widest mb-1">Exclusive Access for Community Members</p>
                                        <h2 className="text-4xl md:text-5xl font-bold font-heading uppercase tracking-tight text-white">Active Guestlists</h2>
                                    </div>
                                </div>
                            </div>

                            {guestlists && guestlists.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 md:gap-12">
                                    {guestlists.map((gl) => (
                                        <CommunityCard
                                            key={gl.id}
                                            item={gl}
                                            type="gl"
                                            handleShare={handleShare}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-32 bg-white/[0.02] rounded-[3.5rem] border border-dashed border-white/10 group">
                                    <Users className="w-16 h-16 mx-auto mb-4 opacity-20" />
                                    <p className="font-heading uppercase tracking-widest text-sm text-gray-500">No active guestlists at the moment</p>
                                </div>
                            )}
                        </section>

                        {/* Volunteer Gigs */}
                        <section id="volunteer-gigs" className="scroll-mt-32">
                            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12 md:mb-16">
                                <div className="flex items-center gap-5">
                                    <div className="h-12 w-1.5 bg-neon-green rounded-full shadow-[0_0_20px_rgba(57,255,20,0.3)]"></div>
                                    <div>
                                        <p className="text-[10px] font-bold text-neon-green uppercase tracking-widest mb-1">Operational Support</p>
                                        <h2 className="text-4xl md:text-5xl font-bold font-heading uppercase tracking-tight text-white">Volunteer Gigs</h2>
                                    </div>
                                </div>
                            </div>

                            {volunteerGigs && volunteerGigs.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 md:gap-12">
                                    {volunteerGigs.map((gig) => (
                                        <CommunityCard
                                            key={gig.id}
                                            item={gig}
                                            type="gig"
                                            handleShare={handleShare}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-32 bg-white/[0.02] rounded-[3.5rem] border border-dashed border-white/10 text-gray-500">
                                    <Users className="w-16 h-16 mx-auto mb-4 opacity-20" />
                                    <p className="font-heading uppercase tracking-widest text-sm">No active volunteer opportunities right now</p>
                                </div>
                            )}
                        </section>

                        {/* Community Pulse */}
                        <section id="community-pulse" className="scroll-mt-32">
                            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12 md:mb-16">
                                <div className="flex items-center gap-5">
                                    <div className="h-12 w-1.5 bg-neon-pink rounded-full shadow-[0_0_20px_rgba(255,0,255,0.3)]"></div>
                                    <div>
                                        <p className="text-[10px] font-bold text-neon-pink uppercase tracking-widest mb-1">Forms and More</p>
                                        <h2 className="text-4xl md:text-5xl font-bold font-heading uppercase tracking-tight text-white">Community Pulse</h2>
                                    </div>
                                </div>
                            </div>

                            {forms && forms.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 md:gap-12">
                                    {forms.map((form) => (
                                        <CommunityCard
                                            key={form.id}
                                            item={form}
                                            type="form"
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-32 bg-white/[0.02] rounded-[3.5rem] border border-dashed border-white/10 text-gray-500">
                                    <ClipboardList className="w-16 h-16 mx-auto mb-4 opacity-20" />
                                    <p className="font-heading uppercase tracking-widest text-sm">No active forms at the moment</p>
                                </div>
                            )}
                        </section>

                        {/* Secret Store - Hidden for now
                        <section className="pb-20">
                            <div className="flex items-center gap-5 mb-12">
                                <div className="h-12 w-1.5 bg-yellow-500 rounded-full shadow-[0_0_20px_rgba(234,179,8,0.3)]"></div>
                                <div>
                                    <p className="text-[10px] font-bold text-yellow-500 uppercase tracking-widest mb-1">Members Only</p>
                                    <h2 className="text-4xl md:text-5xl font-bold font-heading uppercase tracking-tight text-white">Secret Store</h2>
                                </div>
                            </div>

                            {ticketedEvents.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 md:gap-12">
                                    {ticketedEvents.map((event) => (
                                        <div key={event.id} className="relative group perspective-1000">
                                            <div className="relative bg-zinc-900 border border-yellow-500/20 rounded-[2.5rem] overflow-hidden hover:border-yellow-500/50 transition-all duration-500 shadow-2xl hover:shadow-yellow-500/10">
                                                
                                                <div className="relative h-64 overflow-hidden">
                                                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 to-transparent z-10"></div>
                                                    {event.image ? (
                                                        <img
                                                            src={event.image}
                                                            alt={event.title}
                                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-gray-600">
                                                            <Ticket size={48} />
                                                        </div>
                                                    )}
                                                    <div className="absolute top-4 right-4 z-20 bg-yellow-500 text-black font-bold px-3 py-1 rounded-full text-xs uppercase tracking-widest shadow-lg">
                                                        {event.ticketCategories?.length > 0 && <span className="text-[10px] mr-1">FROM</span>}
                                                        ₹{event.ticketPrice}
                                                    </div>
                                                </div>

                                                <div className="p-8 relative">
                                                    <h3 className="text-2xl font-bold font-heading text-white mb-2 group-hover:text-yellow-500 transition-colors">
                                                        {event.title}
                                                    </h3>
                                                    <div className="flex items-center gap-4 text-xs text-gray-400 font-bold uppercase tracking-widest mb-6">
                                                        <span className="flex items-center gap-1"><Calendar size={12} /> {event.date ? new Date(event.date).toLocaleDateString() : 'TBA'}</span>
                                                        <span className="flex items-center gap-1 text-yellow-500/80"><Sparkles size={12} /> Exclusive</span>
                                                    </div>

                                                    <Button
                                                        onClick={() => setSelectedTicketEvent(event)}
                                                        className="w-full h-14 bg-yellow-500 text-black hover:bg-yellow-400 font-bold uppercase tracking-widest rounded-xl shadow-lg shadow-yellow-500/10 group-hover:shadow-yellow-500/30"
                                                    >
                                                        Get Tickets <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-32 bg-white/[0.02] rounded-[3.5rem] border border-dashed border-white/10 text-gray-500">
                                    <Lock className="w-16 h-16 mx-auto mb-4 opacity-20" />
                                    <p className="font-heading uppercase tracking-widest text-sm">Reviewing Data...</p>
                                </div>
                            )}
                        </section>
                        */}
                    </motion.div >
                )}

                {/* Ticket Modal */}
                <BuyTicketModal
                    event={selectedTicketEvent || {}}
                    isOpen={!!selectedTicketEvent}
                    onClose={() => setSelectedTicketEvent(null)}
                />

            </div >
        </div >
    );
};

export default CommunityJoin;
