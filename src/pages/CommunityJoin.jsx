import React, { useEffect, useState } from 'react';
import { useStore } from '../lib/store';
import { Button } from '../components/ui/Button';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, MapPin, Users, Lock, Share2, ClipboardList, ExternalLink, ArrowRight, Loader2, Sparkles, CheckCircle2 } from 'lucide-react';
import AuthOverlay from '../components/auth/AuthOverlay';
import { cn } from '../lib/utils';

const CommunityCard = ({ item, type, handleShare }) => {
    const [isFlipped, setIsFlipped] = useState(false);
    const isGig = type === 'gig';

    const isWhatsApp = isGig && item.applyType === 'whatsapp';
    const href = isGig
        ? (isWhatsApp
            ? `https://wa.me/${item.applyLink.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hi, I'm interested in the ${item.title} volunteer gig!`)}`
            : item.applyLink)
        : item.link;

    const Icon = isGig ? Users : Calendar;

    return (
        <div
            id={`${type}-${item.id}`}
            className="perspective-1000 w-full min-h-[220px]"
        >
            <motion.div
                initial={false}
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }}
                className="relative w-full h-full preserve-3d"
            >
                {/* Front Side */}
                <div className={cn(
                    "backface-hidden relative bg-zinc-900/50 backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 md:p-8 flex flex-col sm:flex-row gap-6 group transition-all duration-700 hover:bg-zinc-900/60",
                    isGig ? "hover:border-neon-green/40 shadow-neon-green/5" : "hover:border-neon-blue/40 shadow-neon-blue/5"
                )}>
                    {/* Subtle Glow Background */}
                    <div className={cn(
                        "absolute inset-x-0 inset-y-0 bg-gradient-to-br opacity-0 group-hover:opacity-10 transition-opacity duration-700 pointer-events-none",
                        isGig ? "from-neon-green/20 to-transparent" : "from-neon-blue/20 to-transparent"
                    )}></div>

                    {/* Content Left */}
                    <div className="flex-1 flex flex-col relative z-10">
                        {/* Top: Icon Left */}
                        <div className="mb-6">
                            <div className={cn(
                                "p-3 w-fit rounded-xl group-hover:scale-110 transition-all duration-500 shadow-xl",
                                isGig ? "bg-neon-green/10 text-neon-green" : "bg-neon-blue/10 text-neon-blue"
                            )}>
                                <Icon size={24} />
                            </div>
                        </div>

                        {/* Title & Description */}
                        <div className="mb-6">
                            <h3 className={cn(
                                "text-xl md:text-2xl font-bold font-heading transition-colors leading-tight mb-2",
                                isGig ? "group-hover:text-neon-green" : "group-hover:text-neon-blue"
                            )}>{item.title}</h3>

                            {item.description && (
                                <div className="space-y-2">
                                    <p className="text-gray-400 text-sm line-clamp-2 italic font-medium opacity-70 leading-relaxed overflow-hidden">
                                        "{item.description}"
                                    </p>
                                    <button
                                        onClick={() => setIsFlipped(true)}
                                        className={cn(
                                            "text-[10px] font-bold uppercase tracking-widest transition-colors hover:underline",
                                            isGig ? "text-neon-green/80 hover:text-neon-green" : "text-neon-blue/80 hover:text-neon-blue"
                                        )}
                                    >
                                        [ Read More ]
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Metadata Bottom */}
                        <div className="mt-auto space-y-2">
                            <div className="flex items-center gap-3 text-gray-500 text-[10px] font-bold uppercase tracking-wider">
                                <Calendar size={14} className={cn(isGig ? "text-neon-green" : "text-neon-blue")} />
                                <span>Date: <span className="text-white/80">{isGig ? `${item.date} | ${item.time}` : (item.date || 'Upcoming')}</span></span>
                            </div>
                            <div className="flex items-center gap-3 text-gray-500 text-[10px] font-bold uppercase tracking-wider">
                                <MapPin size={14} className="text-neon-pink" />
                                <span>Location: <span className="text-white/80">{item.location || (isGig ? '' : 'Announcing Soon')}</span></span>
                            </div>
                        </div>
                    </div>

                    {/* Actions Right */}
                    <div className="flex flex-col gap-4 relative z-10 shrink-0 sm:min-w-[180px] justify-between py-1">
                        {/* Status & Share */}
                        <div className="flex items-center justify-end gap-3">
                            <span className={cn(
                                "px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest border shrink-0 backdrop-blur-md",
                                item.status === 'Open' ? "bg-neon-green/10 text-neon-green border-neon-green/20" : "bg-red-500/10 text-red-500 border-red-500/20"
                            )}>
                                {item.status || 'Open'}
                            </span>
                            <button
                                onClick={() => handleShare(isGig ? 'gig' : 'gl', item.id)}
                                className="p-2 text-gray-500 hover:text-white rounded-xl hover:bg-white/5 transition-all"
                            >
                                <Share2 size={16} />
                            </button>
                        </div>

                        {/* Stretched Vertical Buttons */}
                        <div className="flex flex-col gap-3 flex-1 justify-center pt-4 sm:pt-10">
                            <Button
                                as="a"
                                href={href}
                                target="_blank"
                                className={cn(
                                    "w-full h-14 rounded-2xl font-bold uppercase tracking-widest text-xs gap-2 font-heading transition-all shadow-xl group-hover:scale-[1.02]",
                                    isGig
                                        ? (isWhatsApp ? "bg-[#25D366] text-black hover:bg-[#128C7E]" : "bg-neon-green text-black hover:bg-neon-green/80 shadow-neon-green/20")
                                        : "bg-neon-blue text-black hover:bg-neon-blue/80 shadow-neon-blue/20"
                                )}
                            >
                                {isGig ? (isWhatsApp ? 'Apply via WA' : 'Apply for Gig') : 'Register Now'}
                                <ArrowRight size={16} />
                            </Button>

                            {(!isGig && item.whatsappLink) && (
                                <Button
                                    as="a"
                                    href={item.whatsappLink}
                                    target="_blank"
                                    className="w-full h-14 bg-zinc-800/80 text-green-400 border border-green-400/20 hover:bg-green-400/10 rounded-2xl font-bold uppercase tracking-widest text-xs gap-2 font-heading backdrop-blur-md"
                                >
                                    Join WhatsApp
                                    <ExternalLink size={16} />
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Back Side */}
                <div className={cn(
                    "absolute inset-0 backface-hidden rotate-y-180 bg-zinc-900 border border-white/10 rounded-[2rem] p-8 flex flex-col overflow-hidden shadow-2xl",
                    isGig ? "border-neon-green/30" : "border-neon-blue/30"
                )}>
                    <div className="flex items-start justify-between mb-6">
                        <h3 className={cn(
                            "text-xl font-bold font-heading leading-tight",
                            isGig ? "text-neon-green" : "text-neon-blue"
                        )}>{item.title}</h3>
                        <button
                            onClick={() => setIsFlipped(false)}
                            className="p-2 text-gray-500 hover:text-white rounded-full hover:bg-white/5 transition-colors"
                        >
                            <ArrowRight className="rotate-180" size={20} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-3">
                        <p className="text-gray-300 text-sm italic font-medium leading-relaxed whitespace-pre-wrap">
                            "{item.description}"
                        </p>
                    </div>

                    <div className="mt-6 pt-6 border-t border-white/10 text-center">
                        <button
                            onClick={() => setIsFlipped(false)}
                            className="text-[10px] font-bold text-gray-400 hover:text-white uppercase tracking-[0.2em] transition-colors"
                        >
                            ← Back to Event
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

const CommunityJoin = () => {
    const { forms, siteDetails, volunteerGigs, guestlists, user, authInitialized, markFormAsSubmitted, setAuthModal, logout } = useStore();
    const location = useLocation();
    const [confirming, setConfirming] = useState(false);

    // Auto-trigger sign-in if not authenticated
    useEffect(() => {
        if (authInitialized && !user) {
            const timer = setTimeout(() => {
                setAuthModal(true);
            }, 1000); // Small delay for smooth entry
            return () => clearTimeout(timer);
        }
    }, [authInitialized, user, setAuthModal]);

    // Auto-scroll to gig if query param exists
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const gigId = params.get('gig');
        const glId = params.get('gl');

        if (gigId && volunteerGigs && volunteerGigs.length > 0) {
            const element = document.getElementById(`gig-${gigId}`);
            if (element) {
                setTimeout(() => {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 500);
            }
        } else if (glId && guestlists && guestlists.length > 0) {
            const element = document.getElementById(`gl-${glId}`);
            if (element) {
                setTimeout(() => {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 500);
            }
        }
    }, [location.search, volunteerGigs, guestlists]);

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

    const hasJoined = user && user.hasJoinedTribe;

    return (
        <div className="min-h-screen bg-black text-white pt-20 md:pt-24 pb-16 md:pb-20 px-4 scroll-smooth leading-normal tracking-normal">
            <style dangerouslySetInnerHTML={{
                __html: `
                .perspective-1000 { perspective: 1000px; }
                .preserve-3d { transform-style: preserve-3d; }
                .backface-hidden { backface-visibility: hidden; }
                .rotate-y-180 { transform: rotateY(180deg); }
                .custom-scrollbar::-webkit-scrollbar { width: 3px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
            `}} />

            <div className="max-w-7xl mx-auto space-y-10 md:space-y-16">

                {/* Header */}
                <div className="text-center relative py-6 md:py-10">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-neon-blue/10 blur-[100px] pointer-events-none rounded-full"></div>

                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-6"
                    >
                        <Sparkles size={14} className="text-neon-pink" />
                        <span className="text-[10px] md:text-xs font-heading font-bold uppercase tracking-[0.2em] text-gray-400">
                            The Inner Circle
                        </span>
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-3xl md:text-7xl font-bold font-heading text-transparent bg-clip-text bg-gradient-to-r from-neon-green to-neon-blue mb-4 md:mb-6"
                    >
                        {user ? `Hello, ${user.displayName?.split(' ')[0] || 'Tribe Member'}` : 'Community Hub'}
                    </motion.h1>

                    {user && (
                        <motion.button
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            onClick={() => logout()}
                            className="absolute top-0 right-0 md:-top-10 md:right-0 text-[10px] font-bold text-gray-400 hover:text-neon-pink uppercase tracking-widest transition-colors flex items-center gap-2"
                        >
                            <span>Sign Out</span>
                            <Lock size={12} />
                        </motion.button>
                    )}

                    <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto px-2">
                        {user
                            ? (hasJoined ? "Great to have you here! Explore upcoming gigs, guestlists and more." : "One final step to join the Newbi Tribe.")
                            : "Welcome to the Newbi Tribe. Get access to exclusive guestlists, gigs, and community perks."
                        }
                    </p>
                </div>

                {!user ? (
                    /* Not Logged In State */
                    <section className="py-6 md:py-10 text-center flex flex-col items-center">
                        <div className="p-8 md:p-12 bg-zinc-900 border border-white/10 rounded-[2.5rem] mb-8 max-w-md w-full shadow-2xl relative group overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-neon-blue/5 blur-[50px] -mr-16 -mt-16"></div>
                            <Users className="w-16 h-16 text-neon-blue mx-auto mb-6 relative z-10" />
                            <h3 className="text-2xl font-bold mb-4 relative z-10 font-heading">Start Your Journey</h3>
                            <p className="text-gray-400 mb-10 relative z-10 leading-relaxed font-medium">
                                Sign in to join the tribe, access exclusive volunteer gigs, and claim your spot on the guestlist.
                            </p>
                            <Button
                                onClick={() => setAuthModal(true)}
                                className="w-full h-16 text-lg shadow-[0_0_30px_rgba(0,255,255,0.15)] rounded-2xl font-heading tracking-wide uppercase font-bold"
                            >
                                Sign In to Unlock
                            </Button>
                        </div>
                    </section>
                ) : !hasJoined ? (
                    /* Logged In, Not Joined State */
                    <section className="space-y-12 md:space-y-20 max-w-5xl mx-auto">
                        <div className="max-w-4xl mx-auto">
                            <div className="flex items-center gap-3 md:gap-4 mb-8">
                                <span className="flex items-center justify-center w-10 h-10 rounded-full bg-neon-blue text-black font-bold text-lg">1</span>
                                <h2 className="text-2xl md:text-3xl font-bold font-heading uppercase tracking-widest">Step 1: The Tribe Form</h2>
                            </div>

                            <div className="relative group">
                                <div className="absolute -inset-1 bg-gradient-to-r from-neon-pink to-neon-blue rounded-[2.5rem] blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
                                <div className="relative w-full aspect-[1/2] sm:aspect-[4/5] bg-zinc-900 rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/10">
                                    <iframe
                                        src="https://docs.google.com/forms/d/e/1FAIpQLScQv55cT-hPBqTtw7PFqOZND6QfPkmjzT8_4Sf4G53_UYwSQg/viewform?embedded=true"
                                        className="w-full h-full border-0"
                                        style={{ filter: 'invert(1) hue-rotate(180deg)', background: 'transparent' }}
                                        title="NewBi Tribe Registration"
                                    >
                                        Loading form...
                                    </iframe>
                                </div>
                            </div>

                            <div className="mt-12 text-center p-10 bg-zinc-900/50 border border-white/10 rounded-[2.5rem] backdrop-blur-sm">
                                <h3 className="text-2xl font-bold mb-4 font-heading">Already filled the form?</h3>
                                <p className="text-gray-400 mb-8 max-w-md mx-auto font-medium">Once you've submitted the Google Form, click below to instantly unlock the community hub.</p>
                                <Button
                                    onClick={handleJoinedConfirm}
                                    disabled={confirming}
                                    className="h-16 px-12 text-lg shadow-[0_0_30px_rgba(57,255,20,0.15)] group rounded-2xl font-heading tracking-wide font-bold"
                                >
                                    <span className="flex items-center gap-3">
                                        {confirming ? <Loader2 className="animate-spin" /> : <CheckCircle2 className="group-hover:scale-110 transition-transform" size={24} />}
                                        I have submitted the form
                                    </span>
                                </Button>
                            </div>
                        </div>

                        {/* WhatsApp Section */}
                        <div className="max-w-4xl mx-auto opacity-50 filter grayscale pointer-events-none relative group">
                            <div className="absolute inset-0 bg-black/40 z-20 rounded-[2.5rem] backdrop-blur-[2px] flex items-center justify-center p-6 text-center">
                                <div className="bg-zinc-900 p-8 rounded-2xl border border-white/10">
                                    <Lock className="w-10 h-10 text-gray-400 mx-auto mb-4" />
                                    <p className="text-sm font-bold uppercase tracking-[0.2em] text-gray-500">Step 2: Join WhatsApp</p>
                                    <p className="text-xs text-gray-600 mt-2 italic font-medium">Unlock Step 1 first to join the chat</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 md:gap-4 mb-8">
                                <span className="flex items-center justify-center w-10 h-10 rounded-full bg-neon-pink text-black font-bold text-lg">2</span>
                                <h2 className="text-2xl md:text-3xl font-bold font-heading uppercase tracking-widest">Step 2: Join the Hub</h2>
                            </div>

                            <div className="bg-[#25D366]/5 border border-[#25D366]/20 rounded-[2.5rem] p-8 md:p-12 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-[#25D366]/10 blur-[100px] -mr-32 -mt-32"></div>
                                <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 md:gap-12">
                                    <div className="w-20 h-20 md:w-24 md:h-24 bg-[#25D366] rounded-[2rem] flex items-center justify-center group-hover:scale-110 transition-transform duration-500 shadow-xl">
                                        <Share2 className="w-10 h-10 md:w-12 md:h-12 text-black" />
                                    </div>
                                    <div className="flex-1 text-center md:text-left">
                                        <h3 className="text-2xl md:text-3xl font-bold mb-4 font-heading">The WhatsApp Tribe</h3>
                                        <p className="text-gray-400 text-lg max-w-xl leading-relaxed font-medium">
                                            Stay ahead of the curve. Get first dibs on event tickets, secret location drops, and community announcements.
                                        </p>
                                    </div>
                                    <Button className="w-full md:w-auto bg-[#25D366] text-black hover:bg-[#128C7E] h-16 px-10 rounded-2xl font-bold uppercase tracking-[0.2em] text-sm">
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
                        className="space-y-20 md:space-y-32"
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
                                    className="w-full md:w-auto bg-[#25D366] text-black hover:bg-[#128C7E] h-16 px-10 rounded-2xl font-bold uppercase tracking-[0.2em] text-sm"
                                >
                                    Join WhatsApp Community
                                </Button>
                            </div>
                        </section>

                        {/* Guestlists */}
                        <section id="guestlists" className="scroll-mt-24 md:scroll-mt-32">
                            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 md:mb-12">
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-1 bg-neon-blue rounded-full"></div>
                                    <h2 className="text-2xl md:text-4xl font-bold font-heading uppercase tracking-tighter text-white">Active Guestlists</h2>
                                </div>
                                <p className="text-gray-500 text-sm italic font-medium">Claim your spot for the upcoming nights</p>
                            </div>

                            {guestlists && guestlists.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 md:gap-10">
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
                                <div className="text-center py-24 text-gray-500 bg-white/5 rounded-[3rem] border border-dashed border-white/10">
                                    <Users className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                    <p className="font-heading uppercase tracking-widest text-sm">No active guestlists at the moment</p>
                                </div>
                            )}
                        </section>

                        {/* Volunteer Gigs */}
                        <section id="volunteer-gigs" className="scroll-mt-24 md:scroll-mt-32">
                            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 md:mb-12">
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-1 bg-neon-green rounded-full"></div>
                                    <h2 className="text-2xl md:text-4xl font-bold font-heading uppercase tracking-tighter text-white">Volunteer Gigs</h2>
                                </div>
                                <p className="text-gray-500 text-sm italic font-medium">Join the crew and make it happen</p>
                            </div>

                            {volunteerGigs && volunteerGigs.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 md:gap-10">
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
                                <div className="text-center py-24 text-gray-500 bg-white/5 rounded-[3rem] border border-dashed border-white/10">
                                    <Users className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                    <p className="font-heading uppercase tracking-widest text-sm">No active volunteer opportunities right now</p>
                                </div>
                            )}
                        </section>

                        {/* Community Pulse */}
                        <section>
                            <div className="flex items-center gap-4 mb-10 md:mb-12">
                                <div className="h-10 w-1 bg-neon-pink rounded-full"></div>
                                <h2 className="text-2xl md:text-4xl font-bold font-heading uppercase tracking-tighter">Community Pulse</h2>
                            </div>

                            {forms && forms.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10">
                                    {forms.map((form) => (
                                        <div key={form.id} className="group p-8 md:p-12 bg-zinc-900/50 backdrop-blur-xl border border-white/10 rounded-[2.5rem] hover:border-neon-pink/40 transition-all duration-500 overflow-hidden relative">
                                            <div className="absolute top-0 right-0 w-48 h-48 bg-neon-pink/5 blur-[60px] -mr-24 -mt-24 pointer-events-none"></div>
                                            <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
                                                <div className="p-6 bg-neon-pink/10 rounded-2xl group-hover:scale-110 transition-transform duration-500">
                                                    <ClipboardList className="w-12 h-12 text-neon-pink" />
                                                </div>
                                                <div className="flex-1 text-center md:text-left">
                                                    <h3 className="text-xl md:text-2xl font-bold mb-3 font-heading group-hover:text-neon-pink transition-colors">{form.title}</h3>
                                                    <p className="text-gray-400 text-sm mb-8 max-w-sm font-medium leading-relaxed italic line-clamp-2 md:line-clamp-none">"{form.description}"</p>
                                                    <div className="flex justify-center md:justify-start">
                                                        <Link to={`/forms/${form.id}`}>
                                                            <Button className="bg-neon-pink text-black hover:bg-neon-pink/80 h-14 px-10 rounded-2xl font-bold uppercase tracking-widest text-xs gap-2 font-heading">
                                                                Take Form
                                                                <ArrowRight size={16} />
                                                            </Button>
                                                        </Link>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-20 text-gray-500 bg-white/5 rounded-[2.5rem] border border-white/10">
                                    <p className="font-heading uppercase tracking-widest text-sm">No active forms at the moment</p>
                                </div>
                            )}
                        </section>

                        {/* Secret Store */}
                        <section className="pb-10 md:pb-20">
                            <div className="flex items-center gap-4 mb-8 md:mb-10">
                                <div className="h-10 w-1 bg-neon-pink rounded-full"></div>
                                <h2 className="text-2xl md:text-4xl font-bold font-heading uppercase tracking-tighter">Secret Store</h2>
                            </div>

                            <div className="relative bg-zinc-900/50 backdrop-blur-2xl border border-white/10 rounded-[3rem] p-12 md:p-24 overflow-hidden text-center group">
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 bg-neon-pink/5 blur-[120px] rounded-full pointer-events-none"></div>

                                <div className="relative z-10 flex flex-col items-center">
                                    <div className="mb-8 p-10 bg-zinc-800/60 rounded-full border border-white/10 group-hover:border-neon-pink/40 group-hover:shadow-2xl transition-all duration-700">
                                        <Lock className="w-16 h-16 text-gray-400 group-hover:text-neon-pink transition-colors" />
                                    </div>

                                    <h3 className="text-3xl md:text-5xl font-bold text-white mb-6 font-heading">Coming Soon</h3>
                                    <p className="text-gray-400 max-w-xl mx-auto mb-12 text-lg md:text-xl font-medium leading-relaxed italic">
                                        Exclusive ticket drops, guestlist spots, and flash sales for our community members. Stay tuned for the first drop!
                                    </p>

                                    <Button disabled className="bg-zinc-800 text-gray-500 border-zinc-700 cursor-not-allowed uppercase tracking-[0.3em] font-bold text-xs h-16 px-12 rounded-2xl">
                                        Access Locked
                                    </Button>
                                </div>
                            </div>
                        </section>
                    </motion.div>
                )}

            </div>
        </div>
    );
};

export default CommunityJoin;
