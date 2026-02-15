import React, { useEffect, useState } from 'react';
import { useStore } from '../lib/store';
import { Button } from '../components/ui/Button';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, MapPin, Users, Lock, Share2, ClipboardList, ExternalLink, ArrowRight, Loader2, Sparkles, CheckCircle2, Ticket } from 'lucide-react';
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
    const accentColor = isGig ? 'rgba(57, 255, 20, 0.4)' : 'rgba(0, 255, 255, 0.4)';
    const accentClass = isGig ? 'from-neon-green/20 to-transparent' : 'from-neon-blue/20 to-transparent';
    const borderClass = isGig ? 'group-hover:border-neon-green/50' : 'group-hover:border-neon-blue/50';
    const glowClass = isGig ? 'shadow-neon-green/20' : 'shadow-neon-blue/20';

    return (
        <div
            id={`${type}-${item.id}`}
            className="perspective-1000 w-full min-h-[240px]"
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
                    borderClass
                )}>
                    {/* Header Gradient Strip */}
                    <div className={cn(
                        "h-1.5 w-full bg-gradient-to-r",
                        isGig ? "from-neon-green via-neon-green/50 to-transparent" : "from-neon-blue via-neon-pink/50 to-transparent"
                    )}></div>

                    <div className="flex flex-col sm:flex-row h-full">
                        {/* Main Info Section */}
                        <div className="flex-1 p-6 md:p-8 flex flex-col relative overflow-hidden">
                            {/* Decorative Background Icon */}
                            <div className="absolute -right-8 -bottom-8 opacity-[0.03] rotate-12 pointer-events-none group-hover:scale-110 transition-transform duration-1000">
                                <Icon size={180} />
                            </div>

                            <div className="flex items-start justify-between mb-6">
                                <div className={cn(
                                    "p-3 rounded-2xl bg-white/5 border border-white/10 shadow-lg group-hover:scale-110 transition-all duration-500 group-hover:shadow-[0_0_20px_rgba(255,255,255,0.05)]",
                                    isGig ? "group-hover:text-neon-green" : "group-hover:text-neon-blue"
                                )}>
                                    <Icon size={24} />
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={cn(
                                        "px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.2em] border",
                                        item.status === 'Open' ? "bg-neon-green/10 text-neon-green border-neon-green/20" : "bg-neon-pink/10 text-neon-pink border-neon-pink/20"
                                    )}>
                                        {item.status || 'Open'}
                                    </span>
                                </div>
                            </div>

                            <div className="flex-1">
                                <h3 className="text-2xl md:text-3xl font-black font-heading leading-none tracking-tighter mb-3 group-hover:translate-x-1 transition-transform duration-500">
                                    {item.title}
                                </h3>

                                {item.description && (
                                    <p className="text-gray-400 text-sm line-clamp-2 italic font-medium opacity-70 leading-relaxed mb-4">
                                        "{item.description}"
                                    </p>
                                )}

                                <div className="flex flex-wrap gap-x-6 gap-y-3 mt-auto">
                                    <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                        <Calendar size={12} className={isGig ? "text-neon-green" : "text-neon-blue"} />
                                        <span className="text-white/60">{isGig ? `${item.date} • ${item.time}` : (item.date || 'Upcoming')}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                        <MapPin size={12} className="text-neon-pink" />
                                        <span className="text-white/60 truncate max-w-[120px]">{item.location || (isGig ? '' : 'TBA')}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Perforated Divider (Hidden on small screens, shown as border) */}
                        <div className="hidden sm:flex flex-col items-center justify-between py-4 relative w-px h-full">
                            <div className="w-4 h-4 rounded-full bg-black -mt-6 border-b border-white/10"></div>
                            <div className="flex-1 border-l border-dashed border-white/20 my-2"></div>
                            <div className="w-4 h-4 rounded-full bg-black -mb-6 border-t border-white/10"></div>
                        </div>

                        {/* Action Section */}
                        <div className="sm:w-[220px] p-6 md:p-8 bg-white/[0.02] flex flex-col justify-between items-center relative gap-6">
                            <button
                                onClick={() => handleShare(isGig ? 'gig' : 'gl', item.id)}
                                className="absolute top-4 right-4 p-2 text-gray-600 hover:text-white transition-colors"
                            >
                                <Share2 size={16} />
                            </button>

                            <div className="w-full space-y-4 pt-4 sm:pt-0">
                                {item.description && (
                                    <button
                                        onClick={() => setIsFlipped(true)}
                                        className="w-full text-center py-2 text-[9px] font-black uppercase tracking-[0.3em] text-gray-500 hover:text-white transition-colors border-b border-dashed border-white/10 mb-2"
                                    >
                                        [ Pass Details ]
                                    </button>
                                )}

                                <div className="space-y-3">
                                    <Button
                                        as="a"
                                        href={href}
                                        target="_blank"
                                        className={cn(
                                            "w-full h-14 rounded-2xl font-black uppercase tracking-widest text-[10px] gap-2 font-heading transition-all shadow-xl group-hover:scale-[1.02]",
                                            isGig
                                                ? (isWhatsApp ? "bg-[#25D366] text-black hover:bg-[#128C7E]" : "bg-neon-green text-black hover:bg-neon-green/80 shadow-neon-green/20")
                                                : "bg-neon-blue text-black hover:bg-neon-blue/80 shadow-neon-blue/20"
                                        )}
                                    >
                                        {isGig ? (isWhatsApp ? 'Apply via WA' : 'Claim Gig') : 'Book Spot'}
                                        <Ticket size={16} />
                                    </Button>

                                    {(!isGig && item.whatsappLink) && (
                                        <Button
                                            as="a"
                                            href={item.whatsappLink}
                                            target="_blank"
                                            className="w-full h-14 bg-white/5 text-neon-green border border-neon-green/30 hover:bg-neon-green/10 rounded-2xl font-black uppercase tracking-widest text-[10px] gap-2 font-heading"
                                        >
                                            Inner Circle
                                            <ExternalLink size={14} />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Back Side - Info Docket */}
                <div className={cn(
                    "absolute inset-0 backface-hidden rotate-y-180 bg-zinc-900 border border-white/10 rounded-[2rem] p-8 md:p-10 flex flex-col overflow-hidden shadow-2xl",
                    isGig ? "border-neon-green/30" : "border-neon-blue/30"
                )}>
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <p className="text-[10px] font-black text-neon-pink uppercase tracking-[0.3em] mb-1">Administrative Details</p>
                            <h3 className="text-2xl font-black font-heading leading-tight tracking-tighter uppercase">{item.title}</h3>
                        </div>
                        <button
                            onClick={() => setIsFlipped(false)}
                            className="p-3 bg-white/5 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-all shadow-lg"
                        >
                            <ArrowRight className="rotate-180" size={24} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-4 space-y-6">
                        <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap font-medium">
                            {item.description}
                        </p>

                        <div className="grid grid-cols-2 gap-4 pb-4">
                            <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                                <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1">Schedule</p>
                                <p className="text-xs font-bold text-white uppercase">{isGig ? `${item.date} @ ${item.time}` : (item.date || 'TBA')}</p>
                            </div>
                            <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                                <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1">Zone</p>
                                <p className="text-xs font-bold text-white uppercase truncate">{item.location || 'Announcing Soon'}</p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 pt-8 border-t border-white/10">
                        <button
                            onClick={() => setIsFlipped(false)}
                            className="w-full text-center text-[10px] font-black text-gray-500 hover:text-white uppercase tracking-[0.4em] transition-colors"
                        >
                            ← Return to Pass
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
        alert('Pass link copied!');
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
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.1); }
            `}} />

            <div className="max-w-7xl mx-auto space-y-12 md:space-y-20">

                {/* Header */}
                <div className="text-center relative py-10 overflow-hidden">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-neon-blue/20 blur-[120px] pointer-events-none rounded-full animate-pulse-slow"></div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-white/5 border border-white/10 mb-8 backdrop-blur-md"
                    >
                        <Sparkles size={16} className="text-neon-pink animate-spin-slow" />
                        <span className="text-xs md:text-sm font-heading font-black uppercase tracking-[0.4em] text-white">
                            The Collective
                        </span>
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-4xl md:text-8xl font-black font-heading text-transparent bg-clip-text bg-gradient-to-b from-white to-white/40 mb-6 tracking-tighter leading-none"
                    >
                        {user ? (user.displayName?.split(' ')[0] || 'Member') : 'HUB'}
                        <span className="text-neon-blue">.</span>
                    </motion.h1>

                    {user && (
                        <motion.button
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            onClick={() => logout()}
                            className="absolute top-0 right-0 p-4 text-[10px] font-black text-gray-500 hover:text-neon-pink uppercase tracking-[0.3em] transition-all flex items-center gap-2 group"
                        >
                            <span className="opacity-0 group-hover:opacity-100 transition-opacity">Deauthenticate</span>
                            <Lock size={14} />
                        </motion.button>
                    )}

                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="text-lg md:text-2xl text-gray-400 max-w-2xl mx-auto px-4 font-medium leading-relaxed"
                    >
                        {user
                            ? (hasJoined ? "You are authenticated. Accessing collective passes..." : "Authentication partial. Step 2 required.")
                            : "Secure entry point for the Newbi Tribe. Login required for collective access."
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
                            className="p-10 md:p-16 bg-zinc-900/60 border border-white/10 rounded-[3rem] backdrop-blur-2xl mb-12 max-w-xl w-full shadow-2xl relative group overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 w-64 h-64 bg-neon-blue/10 blur-[80px] -mr-32 -mt-32"></div>
                            <div className="absolute bottom-0 left-0 w-64 h-64 bg-neon-pink/10 blur-[80px] -ml-32 -mb-32"></div>

                            <Users className="w-20 h-20 text-neon-blue mx-auto mb-10 relative z-10 animate-bounce-slow" />
                            <h3 className="text-3xl font-black mb-6 relative z-10 font-heading uppercase tracking-tighter">Identity Required</h3>
                            <p className="text-gray-400 mb-12 relative z-10 text-lg font-medium leading-relaxed">
                                Join the network to unlock exclusive volunteer opportunities, guestlists, and collective perks.
                            </p>
                            <Button
                                onClick={() => setAuthModal(true)}
                                className="w-full h-20 text-xl shadow-[0_0_50px_rgba(0,255,255,0.15)] rounded-2xl font-black font-heading uppercase tracking-[0.1em] hover:scale-[1.02] transition-transform"
                            >
                                Initiate Login
                            </Button>
                        </motion.div>
                    </section>
                ) : !hasJoined ? (
                    /* Logged In, Not Joined State */
                    <section className="space-y-20 md:space-y-32">
                        <div className="max-w-5xl mx-auto">
                            <div className="flex flex-col items-center mb-12 text-center">
                                <div className="w-16 h-16 rounded-3xl bg-neon-blue text-black flex items-center justify-center font-black text-2xl mb-6 shadow-[0_0_30px_rgba(0,255,255,0.3)]">01</div>
                                <h2 className="text-3xl md:text-5xl font-black font-heading uppercase tracking-tighter">COLLECTIVE DOSSIER</h2>
                                <p className="text-gray-500 font-bold uppercase tracking-[0.3em] text-[10px] mt-2">Required for network entry</p>
                            </div>

                            <div className="relative group p-1 bg-gradient-to-br from-white/10 to-transparent rounded-[3rem]">
                                <div className="absolute -inset-2 bg-gradient-to-r from-neon-pink/20 to-neon-blue/20 rounded-[3.5rem] blur-2xl opacity-0 group-hover:opacity-100 transition duration-1000"></div>
                                <div className="relative w-full aspect-[1/2] sm:aspect-[4/5] md:aspect-[3/2] bg-zinc-900 rounded-[2.8rem] overflow-hidden shadow-2xl border border-white/5">
                                    <iframe
                                        src="https://docs.google.com/forms/d/e/1FAIpQLScQv55cT-hPBqTtw7PFqOZND6QfPkmjzT8_4Sf4G53_UYwSQg/viewform?embedded=true"
                                        className="w-full h-full border-0"
                                        style={{ filter: 'invert(1) hue-rotate(180deg)', background: 'transparent', opacity: 0.9 }}
                                        title="NewBi Tribe Registration"
                                    >
                                        Establishing connection...
                                    </iframe>
                                </div>
                            </div>

                            <div className="mt-16 text-center p-12 bg-zinc-900/40 border border-white/10 rounded-[3rem] backdrop-blur-xl">
                                <h3 className="text-3xl font-black mb-4 font-heading uppercase tracking-tighter">Already Processed?</h3>
                                <p className="text-gray-400 mb-10 max-w-md mx-auto font-medium">If you've submitted your credentials via the form above, synchronize your status below.</p>
                                <Button
                                    onClick={handleJoinedConfirm}
                                    disabled={confirming}
                                    className="h-20 px-16 text-xl shadow-[0_0_40px_rgba(57,255,20,0.1)] group rounded-2xl font-black font-heading uppercase tracking-widest"
                                >
                                    <span className="flex items-center gap-4">
                                        {confirming ? <Loader2 className="animate-spin" /> : <CheckCircle2 className="group-hover:scale-110 transition-transform" size={28} />}
                                        VERIFY SUBMISSION
                                    </span>
                                </Button>
                            </div>
                        </div>

                        {/* Blocked Section */}
                        <div className="max-w-5xl mx-auto relative group">
                            <div className="absolute inset-x-0 inset-y-0 bg-black/60 z-20 rounded-[3.5rem] backdrop-blur-md flex flex-col items-center justify-center p-10 text-center">
                                <div className="p-10 bg-zinc-900/80 rounded-[2rem] border border-white/10 shadow-2xl max-w-sm">
                                    <div className="p-4 bg-white/5 rounded-2xl w-fit mx-auto mb-6">
                                        <Lock className="w-12 h-12 text-gray-400" />
                                    </div>
                                    <p className="text-xs font-black uppercase tracking-[0.4em] text-gray-500 mb-2">Protocol 02: RESTRICTED</p>
                                    <p className="text-sm text-gray-600 italic font-medium">Requires Stage 01 authentication</p>
                                </div>
                            </div>

                            <div className="flex flex-col items-center mb-12 opacity-30">
                                <div className="w-16 h-16 rounded-3xl bg-white/10 text-white flex items-center justify-center font-black text-2xl mb-6">02</div>
                                <h2 className="text-3xl md:text-5xl font-black font-heading uppercase tracking-tighter">NETWORK CHAT</h2>
                            </div>

                            <div className="bg-white/5 border border-white/10 rounded-[3.5rem] p-12 md:p-20 relative overflow-hidden grayscale opacity-30">
                                <div className="relative z-10 flex flex-col md:flex-row items-center gap-10 md:gap-16">
                                    <div className="w-24 h-24 bg-white/10 rounded-3xl flex items-center justify-center">
                                        <Share2 className="w-12 h-12 text-white" />
                                    </div>
                                    <div className="flex-1 text-center md:text-left">
                                        <h3 className="text-3xl font-black mb-6 font-heading uppercase tracking-tighter">Digital Collective</h3>
                                        <p className="text-gray-500 text-lg leading-relaxed font-medium">Join the encrypted communication channel for real-time drops and network alerts.</p>
                                    </div>
                                    <div className="w-full md:w-[240px] h-16 bg-white/5 rounded-2xl border border-dashed border-white/20"></div>
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
                            <div className="absolute -inset-1 bg-gradient-to-r from-[#25D366]/20 to-neon-blue/20 rounded-[3.5rem] blur-2xl opacity-10 group-hover:opacity-30 transition duration-1000"></div>
                            <div className="bg-zinc-900/40 border border-white/10 rounded-[3rem] backdrop-blur-2xl p-10 md:p-16 relative overflow-hidden flex flex-col md:flex-row items-center gap-12">
                                <div className="absolute top-0 right-0 w-80 h-80 bg-[#25D366]/10 blur-[100px] -mr-40 -mt-40"></div>

                                <div className="w-24 h-24 bg-[#25D366] rounded-[2rem] flex items-center justify-center shadow-[0_0_50px_rgba(37,211,102,0.3)] group-hover:scale-110 transition-transform duration-700 shrink-0">
                                    <CheckCircle2 className="w-14 h-14 text-black" />
                                </div>

                                <div className="flex-1 text-center md:text-left">
                                    <div className="inline-block px-4 py-1.5 bg-[#25D366]/10 text-[#25D366] text-[10px] font-black uppercase tracking-[0.3em] rounded-full border border-[#25D366]/20 mb-6">PROTOCOL 02: ACTIVE</div>
                                    <h3 className="text-3xl md:text-4xl font-black mb-4 font-heading uppercase tracking-tighter">NETWORK ESTABLISHED</h3>
                                    <p className="text-gray-400 text-lg md:text-xl font-medium leading-relaxed max-w-xl">
                                        You are now part of the encrypted network. Access the main communication node below.
                                    </p>
                                </div>

                                <Button
                                    as="a"
                                    href={siteDetails.whatsappCommunity || "#"}
                                    target="_blank"
                                    className="w-full md:w-auto bg-[#25D366] text-black hover:bg-[#128C7E] h-20 px-12 rounded-[2rem] font-black font-heading uppercase tracking-[0.2em] transform active:scale-95 transition-all text-base shrink-0"
                                >
                                    OPEN NODE
                                </Button>
                            </div>
                        </section>

                        {/* Guestlists */}
                        <section id="guestlists" className="scroll-mt-32">
                            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12 md:mb-16">
                                <div className="flex items-center gap-5">
                                    <div className="h-12 w-1.5 bg-neon-blue rounded-full shadow-[0_0_20px_rgba(0,255,255,0.5)]"></div>
                                    <div>
                                        <p className="text-[10px] font-black text-neon-blue uppercase tracking-[0.4em] mb-1">Authorization Layer</p>
                                        <h2 className="text-4xl md:text-6xl font-black font-heading uppercase tracking-tighter text-white">COLLECTIVE PASSES</h2>
                                    </div>
                                </div>
                                <p className="text-gray-500 font-bold uppercase tracking-[0.2em] text-[10px] bg-white/5 py-2 px-4 rounded-lg border border-white/5">Authenticated Access Required</p>
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
                                <div className="text-center py-32 bg-white/[0.02] rounded-[4rem] border border-dashed border-white/10 group">
                                    <Ticket className="w-16 h-16 mx-auto mb-6 opacity-10 group-hover:opacity-20 transition-opacity" />
                                    <p className="font-heading font-black uppercase tracking-[0.4em] text-sm text-gray-600">No passes available in current cycle</p>
                                </div>
                            )}
                        </section>

                        {/* Volunteer Gigs */}
                        <section id="volunteer-gigs" className="scroll-mt-32">
                            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12 md:mb-16">
                                <div className="flex items-center gap-5">
                                    <div className="h-12 w-1.5 bg-neon-green rounded-full shadow-[0_0_20px_rgba(57,255,20,0.5)]"></div>
                                    <div>
                                        <p className="text-[10px] font-black text-neon-green uppercase tracking-[0.4em] mb-1">Operational Support</p>
                                        <h2 className="text-4xl md:text-6xl font-black font-heading uppercase tracking-tighter text-white">NETWORK GIGS</h2>
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
                                <div className="text-center py-32 bg-white/[0.02] rounded-[4rem] border border-dashed border-white/10">
                                    <Users className="w-16 h-16 mx-auto mb-6 opacity-10" />
                                    <p className="font-heading font-black uppercase tracking-[0.4em] text-sm text-gray-600">Network fully staffed</p>
                                </div>
                            )}
                        </section>

                        {/* Community Pulse */}
                        <section>
                            <div className="flex items-center gap-5 mb-12 md:mb-16">
                                <div className="h-12 w-1.5 bg-neon-pink rounded-full shadow-[0_0_20px_rgba(255,0,255,0.5)]"></div>
                                <h2 className="text-4xl font-black font-heading uppercase tracking-tighter">PULSE CHECKS</h2>
                            </div>

                            {forms && forms.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
                                    {forms.map((form) => (
                                        <div key={form.id} className="group p-10 md:p-14 bg-zinc-900/40 border border-white/5 backdrop-blur-2xl rounded-[3rem] hover:border-neon-pink/50 transition-all duration-700 relative overflow-hidden">
                                            <div className="absolute top-0 right-0 w-64 h-64 bg-neon-pink/5 blur-[80px] -mr-32 -mt-32"></div>

                                            <div className="flex flex-col md:flex-row items-center gap-10 relative z-10">
                                                <div className="p-6 md:p-8 bg-neon-pink/10 rounded-[2rem] group-hover:scale-110 group-hover:bg-neon-pink/20 transition-all duration-700 shadow-xl">
                                                    <ClipboardList className="w-12 h-12 md:w-16 md:h-16 text-neon-pink" />
                                                </div>
                                                <div className="flex-1 text-center md:text-left">
                                                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mb-2">Protocol: Analysis</p>
                                                    <h3 className="text-3xl font-black mb-4 font-heading group-hover:text-neon-pink transition-colors uppercase tracking-tight">{form.title}</h3>
                                                    <p className="text-gray-400 text-sm mb-8 font-medium leading-relaxed max-w-sm">{form.description}</p>
                                                    <div className="flex justify-center md:justify-start">
                                                        <Link to={`/forms/${form.id}`}>
                                                            <Button className="bg-neon-pink text-black hover:bg-neon-pink/80 h-14 px-10 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] gap-3 font-heading transform active:scale-95 transition-all">
                                                                INITIATE FORM
                                                                <ArrowRight size={18} />
                                                            </Button>
                                                        </Link>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-24 bg-white/[0.02] rounded-[3rem] border border-white/5">
                                    <p className="font-heading font-black uppercase tracking-[0.3em] text-gray-600">Pulse stable. No checks pending.</p>
                                </div>
                            )}
                        </section>

                        {/* Secret Store */}
                        <section className="pb-20">
                            <div className="flex items-center gap-5 mb-10 md:mb-12">
                                <div className="h-10 w-1.5 bg-neon-pink rounded-full group-hover:animate-pulse"></div>
                                <h2 className="text-3xl md:text-4xl font-black font-heading uppercase tracking-tighter">BLACK STORE</h2>
                            </div>

                            <div className="relative bg-zinc-900/40 border border-white/5 rounded-[4rem] p-16 md:p-32 overflow-hidden text-center group backdrop-blur-3xl shadow-2xl">
                                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 bg-neon-pink/5 blur-[120px] rounded-full pointer-events-none group-hover:bg-neon-pink/10 transition-all duration-1000"></div>

                                <div className="relative z-10 flex flex-col items-center">
                                    <div className="mb-12 p-10 md:p-14 bg-zinc-800/40 rounded-[3rem] border border-white/5 group-hover:border-neon-pink/30 group-hover:shadow-[0_0_80px_rgba(255,0,255,0.15)] transition-all duration-1000 transform group-hover:rotate-1">
                                        <Lock className="w-16 h-16 md:w-24 md:h-24 text-gray-500 group-hover:text-neon-pink transition-colors" />
                                    </div>

                                    <h3 className="text-4xl md:text-7xl font-black text-white mb-8 font-heading uppercase tracking-tighter">OFFLINE</h3>
                                    <p className="text-gray-500 max-w-2xl mx-auto mb-16 text-lg md:text-2xl font-medium leading-relaxed italic">
                                        Collective merchandise, restricted drops, and physical passes. Inventory pending next cycle.
                                    </p>

                                    <div className="relative">
                                        <div className="absolute -inset-1 bg-neon-pink blur opacity-20 animate-pulse"></div>
                                        <Button disabled className="relative bg-zinc-800 text-gray-600 border-zinc-700 cursor-not-allowed uppercase tracking-[0.5em] font-black text-[10px] h-16 px-16 rounded-2xl grayscale">
                                            ACCESS DENIED
                                        </Button>
                                    </div>
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
