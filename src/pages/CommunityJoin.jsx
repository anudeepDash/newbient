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

    const mainColor = isGig ? 'neon-green' : 'neon-blue';
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
                    "backface-hidden relative bg-zinc-900 border border-white/5 rounded-[1.5rem] p-5 md:p-6 flex flex-col sm:flex-row gap-6 group transition-all duration-700",
                    isGig ? "hover:border-neon-green/30" : "hover:border-neon-blue/30"
                )}>
                    <div className={cn(
                        "absolute inset-x-0 inset-y-0 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-700",
                        isGig ? "from-neon-green/5 to-transparent" : "from-neon-blue/5 to-transparent"
                    )}></div>

                    {/* Content Left */}
                    <div className="flex-1 flex flex-col relative z-10">
                        {/* Top: Main Icon */}
                        <div className="mb-5">
                            <div className={cn(
                                "p-2.5 w-fit rounded-xl group-hover:scale-110 transition-all duration-500 shadow-[0_0_20px_rgba(255,255,255,0.05)]",
                                isGig ? "bg-neon-green/10 bg-neon-green/20" : "bg-neon-blue/10 bg-neon-blue/20"
                            )}>
                                <Icon size={20} className={cn(isGig ? "text-neon-green" : "text-neon-blue")} />
                            </div>
                        </div>

                        {/* Title & Description */}
                        <div className="mb-4">
                            <h3 className={cn(
                                "text-xl md:text-2xl font-black font-heading transition-colors leading-tight tracking-tighter mb-2",
                                isGig ? "group-hover:text-neon-green" : "group-hover:text-neon-blue"
                            )}>{item.title}</h3>

                            {item.description && (
                                <div className="space-y-2">
                                    <p className="text-gray-400 text-xs line-clamp-2 italic font-medium opacity-60 leading-relaxed overflow-hidden">
                                        "{item.description}"
                                    </p>
                                    <button
                                        onClick={() => setIsFlipped(true)}
                                        className={cn(
                                            "text-[10px] font-bold uppercase tracking-widest transition-colors border-b border-transparent hover:border-current inline-block",
                                            isGig ? "text-neon-green/60 hover:text-neon-green" : "text-neon-blue/60 hover:text-neon-blue"
                                        )}
                                    >
                                        [ Read Full Details ]
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Metadata Bottom */}
                        <div className="mt-auto pt-4 space-y-2">
                            <div className="flex items-center gap-2.5 text-gray-500 text-[10px] font-bold">
                                <Calendar size={12} className={cn(isGig ? "text-neon-green" : "text-neon-blue")} />
                                <span>Date: <span className="text-white/80">{isGig ? `${item.date} | ${item.time}` : (item.date || 'Upcoming')}</span></span>
                            </div>
                            <div className="flex items-center gap-2.5 text-gray-500 text-[10px] font-bold">
                                <MapPin size={12} className="text-neon-pink" />
                                <span>Location: <span className="text-white/80">{item.location || (isGig ? '' : 'Announcing Soon')}</span></span>
                            </div>
                        </div>
                    </div>

                    {/* Actions Right */}
                    <div className="flex flex-col gap-3 relative z-10 shrink-0 sm:min-w-[180px] justify-between py-1">
                        {/* Status & Share - Now completely right-aligned above buttons */}
                        <div className="flex items-center justify-end gap-3 mb-2">
                            <span className={cn(
                                "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border shrink-0",
                                item.status === 'Open' ? "bg-neon-green/10 text-neon-green border-neon-green/20" : "bg-red-500/10 text-red-500 border-red-500/20"
                            )}>
                                {item.status || 'Open'}
                            </span>
                            <button
                                onClick={() => handleShare(isGig ? 'gig' : 'gl', item.id)}
                                className="p-1.5 text-gray-500 hover:text-white rounded-lg hover:bg-white/5 transition-all"
                                title="Share Card"
                            >
                                <Share2 size={14} />
                            </button>
                        </div>

                        {/* Stretched Vertical Buttons */}
                        <div className="flex flex-col gap-2.5 flex-1 justify-center">
                            <Button
                                as="a"
                                href={href}
                                target="_blank"
                                className={cn(
                                    "w-full h-14 rounded-xl font-black uppercase tracking-widest text-[10px] gap-2.5 font-heading transition-all shadow-lg",
                                    isGig
                                        ? (isWhatsApp ? "bg-[#25D366] text-black hover:bg-[#128C7E] shadow-[#25D366]/10" : "bg-neon-green text-black hover:bg-neon-green/80 shadow-neon-green/10")
                                        : "bg-neon-blue text-black hover:bg-neon-blue/80 shadow-neon-blue/10"
                                )}
                            >
                                {isGig ? (isWhatsApp ? 'Apply via WA' : 'Apply for Gig') : 'Register Now'}
                                {isGig ? (isWhatsApp ? <Share2 size={16} /> : <ArrowRight size={16} />) : <ArrowRight size={16} />}
                            </Button>

                            {(!isGig && item.whatsappLink) && (
                                <Button
                                    as="a"
                                    href={item.whatsappLink}
                                    target="_blank"
                                    className="w-full h-14 bg-zinc-800 text-green-400 border border-green-400/20 hover:bg-green-400/10 rounded-xl font-black uppercase tracking-widest text-[10px] gap-2.5 font-heading transition-all"
                                >
                                    Join WhatsApp
                                    <ExternalLink size={14} />
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Back Side (Description Only) */}
                <div className={cn(
                    "absolute inset-0 backface-hidden rotate-y-180 bg-zinc-900 border border-white/5 rounded-[1.5rem] p-6 md:p-8 flex flex-col overflow-hidden transition-all duration-700 shadow-2xl",
                    isGig ? "border-neon-green/30" : "border-neon-blue/30"
                )}>
                    <div className="flex items-start justify-between mb-6">
                        <h3 className={cn(
                            "text-xl font-black font-heading leading-tight tracking-tighter",
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

                    <div className="mt-6 pt-6 border-t border-white/5 text-center">
                        <button
                            onClick={() => setIsFlipped(false)}
                            className="text-[10px] font-black text-gray-400 hover:text-white uppercase tracking-[0.2em] transition-colors"
                        >
                            ← Return to Front
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
            alert(error.message || 'Failed to confirm. Please ensure you are signed in.');
        } finally {
            setConfirming(false);
        }
    };

    const hasJoined = user && user.hasJoinedTribe;

    return (
        <div className="min-h-screen bg-black text-white pt-20 md:pt-24 pb-16 md:pb-20 px-4 scroll-smooth">
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

            <div className="max-w-7xl mx-auto space-y-8 md:space-y-14">

                {/* Header */}
                <div className="text-center relative">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-neon-blue/10 blur-[100px] pointer-events-none rounded-full"></div>

                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-6"
                    >
                        <Sparkles size={14} className="text-neon-pink" />
                        <span className="text-[10px] md:text-xs font-heading font-bold uppercase tracking-widest text-gray-400">
                            The Inner Circle
                        </span>
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-3xl md:text-7xl font-bold font-heading text-transparent bg-clip-text bg-gradient-to-r from-neon-green to-neon-blue mb-4 md:mb-6"
                    >
                        {user ? `Hello, ${user.displayName || 'Tribe Member'}` : 'Community Hub'}
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
                        <div className="p-6 md:p-10 bg-zinc-900 border border-white/10 rounded-[2rem] mb-8 max-w-md w-full shadow-2xl relative group overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-neon-blue/5 blur-[50px] -mr-16 -mt-16"></div>
                            <Users className="w-16 h-16 text-neon-blue mx-auto mb-6 relative z-10" />
                            <h3 className="text-2xl font-bold mb-4 relative z-10 font-heading">Start Your Journey</h3>
                            <p className="text-gray-400 mb-10 relative z-10 leading-relaxed">
                                Sign in to join the tribe, access exclusive volunteer gigs, and claim your spot on the guestlist.
                            </p>
                            <Button
                                onClick={() => setAuthModal(true)}
                                className="w-full h-16 text-lg shadow-[0_0_30px_rgba(0,255,255,0.2)] rounded-2xl font-heading tracking-wide"
                            >
                                Sign In to Unlock
                            </Button>
                        </div>
                    </section>
                ) : !hasJoined ? (
                    /* Logged In, Not Joined State */
                    <section className="space-y-12 md:space-y-16">
                        <div className="max-w-4xl mx-auto">
                            <div className="flex items-center gap-3 md:gap-4 mb-6 md:mb-10">
                                <span className="flex items-center justify-center w-10 h-10 rounded-full bg-neon-blue text-black font-bold text-lg">1</span>
                                <h2 className="text-2xl md:text-3xl font-bold font-heading uppercase tracking-widest">Step 1: The Tribe Form</h2>
                            </div>

                            <div className="relative group">
                                <div className="absolute -inset-1 bg-gradient-to-r from-neon-pink to-neon-blue rounded-[2.5rem] blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
                                <div className="relative w-full aspect-[1/2] sm:aspect-[4/5] bg-zinc-900 rounded-[2rem] overflow-hidden shadow-2xl border border-white/10">
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

                            <div className="mt-12 text-center p-10 bg-zinc-900/50 border border-white/10 rounded-[2rem] backdrop-blur-sm">
                                <h3 className="text-2xl font-bold mb-4 font-heading">Already filled the form?</h3>
                                Workshop with you!
                                <p className="text-gray-400 mb-8 max-w-md mx-auto">Once you've submitted the Google Form, click below to instantly unlock the community hub.</p>
                                <Button
                                    onClick={handleJoinedConfirm}
                                    disabled={confirming}
                                    className="h-16 px-12 text-lg shadow-[0_0_30px_rgba(57,255,20,0.2)] group rounded-2xl font-heading tracking-wide"
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

                            <div className="flex items-center gap-3 md:gap-4 mb-6 md:mb-10">
                                <span className="flex items-center justify-center w-10 h-10 rounded-full bg-neon-pink text-black font-bold text-lg">2</span>
                                <h2 className="text-2xl md:text-3xl font-bold font-heading uppercase tracking-widest">Step 2: Join the Hub</h2>
                            </div>

                            <div className="bg-[#25D366]/5 border border-[#25D366]/20 rounded-[2.5rem] p-8 md:p-12 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-[#25D366]/10 blur-[100px] -mr-32 -mt-32"></div>
                                <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 md:gap-12">
                                    <div className="w-20 h-20 md:w-24 md:h-24 bg-[#25D366] rounded-[2rem] flex items-center justify-center group-hover:scale-110 transition-transform duration-500 shadow-[0_0_40px_rgba(37,211,102,0.3)]">
                                        <Share2 className="w-10 h-10 md:w-12 md:h-12 text-black" />
                                    </div>
                                    <div className="flex-1 text-center md:text-left">
                                        <h3 className="text-2xl md:text-3xl font-bold mb-4 font-heading">The WhatsApp Tribe</h3>
                                        <p className="text-gray-400 text-base md:text-lg max-w-xl leading-relaxed">
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
                        className="space-y-16 md:space-y-24"
                    >
                        {/* Section 1: WhatsApp (Unlocked) */}
                        <section className="relative group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-[#25D366] to-neon-blue rounded-[3rem] blur opacity-10 group-hover:opacity-20 transition duration-1000"></div>
                            <div className="bg-zinc-900 border border-white/5 rounded-[2.5rem] p-8 md:p-12 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-[#25D366]/5 blur-[80px] -mr-32 -mt-32"></div>
                                <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 md:gap-12">
                                    <div className="w-20 h-20 md:w-24 md:h-24 bg-[#25D366] rounded-[2rem] flex items-center justify-center group-hover:scale-110 transition-transform duration-500 shadow-[0_0_50px_rgba(37,211,102,0.2)]">
                                        <CheckCircle2 className="w-10 h-10 md:w-12 md:h-12 text-black" />
                                    </div>
                                    <div className="flex-1 text-center md:text-left">
                                        <div className="flex items-center justify-center md:justify-start gap-3 mb-3">
                                            <span className="px-3 py-1 bg-[#25D366]/10 text-[#25D366] text-[10px] font-bold uppercase tracking-widest rounded-full border border-[#25D366]/20">Step 2: Complete</span>
                                        </div>
                                        <h3 className="text-2xl md:text-3xl font-bold mb-4 font-heading">Welcome to the Inner Circle</h3>
                                        <p className="text-gray-400 text-base md:text-lg max-w-xl leading-relaxed">
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
                            </div>
                        </section>

                        {/* Section 2: Guestlists */}
                        <section id="guestlists" className="scroll-mt-24 md:scroll-mt-32">
                            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 md:mb-12 text-center md:text-left">
                                <div className="flex items-center justify-center md:justify-start gap-3 md:gap-4">
                                    <div className="h-8 md:h-10 w-1 bg-neon-blue rounded-full"></div>
                                    <h2 className="text-2xl md:text-4xl font-black font-heading uppercase tracking-tighter text-white">Active Guestlists</h2>
                                </div>
                                <p className="text-gray-500 text-sm italic font-medium">Claim your spot for the upcoming nights</p>
                            </div>

                            {guestlists && guestlists.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 md:gap-8">
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
                                <div className="text-center py-20 text-gray-500 bg-white/5 rounded-[3rem] border border-dashed border-white/10">
                                    <Users className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                    <p className="font-heading uppercase tracking-widest text-sm">No active guestlists at the moment</p>
                                </div>
                            )}
                        </section>

                        {/* Section 3: Volunteer Gigs */}
                        <section id="volunteer-gigs" className="scroll-mt-24 md:scroll-mt-32">
                            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 md:mb-12 text-center md:text-left">
                                <div className="flex items-center justify-center md:justify-start gap-3 md:gap-4">
                                    <div className="h-8 md:h-10 w-1 bg-neon-green rounded-full"></div>
                                    <h2 className="text-2xl md:text-4xl font-black font-heading uppercase tracking-tighter text-white">Volunteer Gigs</h2>
                                </div>
                                <p className="text-gray-500 text-sm italic font-medium">Join the crew and make it happen</p>
                            </div>

                            {volunteerGigs && volunteerGigs.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 md:gap-8">
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
                                <div className="text-center py-20 text-gray-500 bg-white/5 rounded-[3rem] border border-dashed border-white/10">
                                    <Users className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                    <p className="font-heading uppercase tracking-widest text-sm">No active volunteer opportunities right now</p>
                                </div>
                            )}
                        </section>

                        {/* Section 4: Community Pulse */}
                        <section>
                            <div className="flex items-center gap-3 md:gap-4 mb-8 md:mb-12">
                                <div className="h-8 md:h-10 w-1 bg-neon-pink rounded-full"></div>
                                <h2 className="text-2xl md:text-3xl font-bold font-heading uppercase tracking-widest">Community Pulse</h2>
                            </div>

                            {forms && forms.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                                    {forms.map((form) => (
                                        <div key={form.id} className="group p-8 md:p-10 bg-zinc-900 border border-white/5 rounded-[2.5rem] hover:border-neon-pink/50 transition-all duration-500">
                                            <div className="flex flex-col md:flex-row items-center gap-8">
                                                <div className="p-5 md:p-6 bg-neon-pink/10 rounded-[1.5rem] group-hover:scale-110 transition-transform duration-500">
                                                    <ClipboardList className="w-10 h-10 md:w-12 md:h-12 text-neon-pink" />
                                                </div>
                                                <div className="flex-1 text-center md:text-left">
                                                    <h3 className="text-xl md:text-2xl font-bold mb-3 font-heading group-hover:text-neon-pink transition-colors">{form.title}</h3>
                                                    <p className="text-gray-500 text-sm mb-6 max-w-sm line-clamp-2 md:line-clamp-none">{form.description}</p>
                                                    <div className="flex flex-wrap justify-center md:justify-start gap-4">
                                                        <Link to={`/forms/${form.id}`}>
                                                            <Button className="bg-neon-pink text-black hover:bg-neon-pink/80 h-12 px-8 rounded-xl font-bold uppercase tracking-widest text-xs gap-2 font-heading">
                                                                Take Form
                                                                <ArrowRight size={14} />
                                                            </Button>
                                                        </Link>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-16 text-gray-500 bg-white/5 rounded-[2rem] border border-white/5">
                                    <p>No active forms or surveys at the moment.</p>
                                </div>
                            )}
                        </section>

                        {/* Section 5: Secret Store */}
                        <section>
                            <div className="flex items-center gap-3 md:gap-4 mb-6 md:mb-8">
                                <div className="h-8 md:h-10 w-1 bg-neon-pink rounded-full"></div>
                                <h2 className="text-2xl md:text-3xl font-bold font-heading uppercase tracking-widest">Secret Store</h2>
                            </div>

                            <div className="relative bg-zinc-900/50 border border-white/5 rounded-[2.5rem] p-12 md:p-24 overflow-hidden text-center group">
                                <div className="absolute inset-0 bg-grid-white/5 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))]"></div>

                                <div className="relative z-10 flex flex-col items-center">
                                    <div className="mb-8 md:mb-12 p-8 md:p-10 bg-zinc-800/80 rounded-full border border-white/10 group-hover:border-neon-pink/50 group-hover:shadow-[0_0_60px_rgba(255,0,255,0.3)] transition-all duration-700">
                                        <Lock className="w-12 h-12 md:w-20 md:h-20 text-gray-400 group-hover:text-neon-pink transition-colors" />
                                    </div>

                                    <h3 className="text-3xl md:text-5xl font-bold text-white mb-6 font-heading">Coming Soon</h3>
                                    <p className="text-gray-400 max-w-xl mx-auto mb-12 text-base md:text-xl leading-relaxed">
                                        Exclusive ticket drops, guestlist spots, and flash sales for our community members. Stay tuned for the first drop!
                                    </p>

                                    <Button disabled className="bg-zinc-800 text-gray-500 border-zinc-700 cursor-not-allowed uppercase tracking-[0.2em] text-xs h-14 px-12 rounded-2xl">
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
