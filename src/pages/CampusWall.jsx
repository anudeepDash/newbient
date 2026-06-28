import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useStore } from '../lib/store';
import { cn } from '../lib/utils';
import useDynamicMeta from '../hooks/useDynamicMeta';
import {
  Zap, Eye, Send, Trash2, Users, Copy, CheckCircle2, ArrowRight,
  Trophy, Briefcase, MapPin, Globe, Calendar, QrCode, Ticket, Star, Shield, Lock,
  MoreVertical, MessageCircle
} from 'lucide-react';

export default function CampusWall() {
    useDynamicMeta("Campus Wall | Newbi", "Your hyper-local campus feed.");
    
    const { 
        user, 
        campusProfiles,
        campusWallPosts, addCampusWallPost, deleteCampusWallPost,
        campusActivations,
        guestlists,
        campusGuestlistPasses, generateGuestlistPass,
        creators
    } = useStore();

    const [postText, setPostText] = useState('');
    const [postCategory, setPostCategory] = useState('Spotted');
    const [isPosting, setIsPosting] = useState(false);
    const [copiedRef, setCopiedRef] = useState(false);

    // Profile Detection (Matches CampusConnect pattern)
    const campusProfile = useMemo(() => {
        if (!user) return null;
        const isCreator = creators?.some(c => c.uid === user.uid && c.status === 'approved' && (c.niche?.toLowerCase().includes('student') || c.niche?.toLowerCase().includes('campus')));
        if (isCreator) return { role: 'campus_influencer', profileStatus: 'approved', university: 'Creator Network' };
        return campusProfiles?.find(c => c.uid === user.uid) || null;
    }, [user, campusProfiles, creators]);

    const handlePost = async (e) => {
        e.preventDefault();
        if (!user || !campusProfile || !postText.trim()) return;
        
        setIsPosting(true);
        try {
            await addCampusWallPost({
                text: postText.trim(),
                category: postCategory,
                authorUid: user.uid,
                authorName: user.displayName || 'Anonymous Student',
                university: campusProfile.university || 'Campus Network'
            });
            setPostText('');
        } catch (err) {
            console.error("Failed to post:", err);
            alert("Failed to post. Try again.");
        } finally {
            setIsPosting(false);
        }
    };

    const copyReferral = () => {
        if (campusProfile?.referralCode) {
            navigator.clipboard.writeText(campusProfile.referralCode);
            setCopiedRef(true);
            setTimeout(() => setCopiedRef(false), 2000);
        }
    };

    const getCategoryColor = (cat) => {
        switch(cat) {
            case 'Spotted': return 'bg-neon-pink/20 text-neon-pink border-neon-pink/50';
            case 'Gig': return 'bg-neon-green/20 text-neon-green border-neon-green/50';
            case 'Collab': return 'bg-neon-blue/20 text-neon-blue border-neon-blue/50';
            default: return 'bg-white/10 text-white border-white/20';
        }
    };

    const sortedPosts = useMemo(() => {
        if (!campusWallPosts) return [];
        return [...campusWallPosts].sort((a, b) => {
            const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (new Date(a.createdAt).getTime() || 0);
            const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (new Date(b.createdAt).getTime() || 0);
            return timeB - timeA;
        });
    }, [campusWallPosts]);

    const openGuestlists = useMemo(() => {
        if (!guestlists) return [];
        return guestlists.filter(g => g.status === 'Open');
    }, [guestlists]);

    const formatTimeAgo = (timestamp) => {
        if (!timestamp) return 'Just now';
        const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
        const seconds = Math.floor((new Date() - date) / 1000);
        if (seconds < 60) return `${seconds}s ago`;
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        return `${Math.floor(hours / 24)}d ago`;
    };

    return (
        <div className="min-h-screen bg-[#030712] text-white font-['Outfit'] pt-32 pb-20 relative overflow-hidden">
            {/* Ambient Background Orbs */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <motion.div 
                    animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.25, 0.15] }}
                    transition={{ duration: 15, repeat: Infinity }}
                    className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-neon-blue/20 rounded-full blur-[140px]" 
                />
                <motion.div 
                    animate={{ scale: [1, 1.3, 1], opacity: [0.15, 0.3, 0.15] }}
                    transition={{ duration: 18, repeat: Infinity, delay: 2 }}
                    className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-neon-purple/20 rounded-full blur-[140px]" 
                />
                <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)', backgroundSize: '80px 80px' }} />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-6">
                
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                    <div>
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-white mb-4">
                            <Zap size={14} className="text-neon-blue" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Live Feed</span>
                        </div>
                        <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter leading-none flex items-center gap-4">
                            The Wall
                            {campusProfile && (
                                <span className="px-3 py-1 bg-neon-blue/20 border border-neon-blue/50 text-neon-blue text-sm rounded-lg tracking-widest hidden md:inline-block">
                                    {campusProfile.role?.replace('_', ' ')}
                                </span>
                            )}
                        </h1>
                    </div>
                </div>

                {/* Compose Bar (Only if logged in and has profile) */}
                {user && campusProfile ? (
                    <div className="mb-10 p-2 glass-card rounded-2xl flex flex-col md:flex-row items-center gap-2">
                        <input 
                            type="text" 
                            placeholder="What's happening on campus?"
                            value={postText}
                            onChange={(e) => setPostText(e.target.value)}
                            maxLength={200}
                            className="flex-1 h-14 bg-transparent border-none focus:ring-0 text-lg px-4 text-white placeholder:text-zinc-600 font-medium"
                        />
                        <div className="flex items-center gap-2 w-full md:w-auto px-2 md:px-0 pb-2 md:pb-0">
                            <select 
                                value={postCategory} 
                                onChange={(e) => setPostCategory(e.target.value)}
                                className="h-10 bg-black/50 border border-white/10 rounded-xl px-4 text-sm font-bold focus:outline-none appearance-none"
                            >
                                <option value="Spotted">Spotted</option>
                                <option value="Gig">Quick Gig</option>
                                <option value="Collab">Collab</option>
                            </select>
                            <button 
                                onClick={handlePost}
                                disabled={isPosting || !postText.trim()}
                                className="h-10 px-6 bg-neon-blue text-black font-black uppercase tracking-widest text-xs rounded-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2 ml-auto"
                            >
                                {isPosting ? <span className="animate-pulse">...</span> : <><Send size={14} /> Post</>}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="mb-10 p-6 glass-card rounded-2xl flex items-center justify-between">
                        <div>
                            <h3 className="font-bold text-lg">Join the Conversation</h3>
                            <p className="text-zinc-400 text-sm">You need a campus profile to post on The Wall.</p>
                        </div>
                        <Link to={user ? "/campus/join" : "/auth/action?mode=login"} className="px-6 py-2 bg-white text-black font-bold uppercase text-xs rounded-xl tracking-widest">
                            {user ? 'Apply Now' : 'Sign In'}
                        </Link>
                    </div>
                )}

                {/* Card Matrix */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    
                    {/* Card 1: Spotted & Gigs */}
                    <div className="campus-wall-card bg-black/40 shadow-[0_0_40px_rgba(0,240,255,0.1)] rounded-[2.5rem] flex flex-col h-[600px] border border-white/5 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-neon-blue/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 group-hover:bg-neon-blue/20 transition-colors duration-700 pointer-events-none" />
                        <div className="p-8 border-b border-white/5 shrink-0 relative z-10">
                            <h2 className="text-2xl font-black uppercase tracking-tight flex items-center gap-3">
                                <div className="p-2 bg-neon-blue/20 rounded-xl text-neon-blue"><Eye size={20} /></div>
                                Spotted & Gigs
                            </h2>
                        </div>
                        <div className="flex-1 overflow-y-auto p-8 space-y-4 scrollbar-hide relative z-10">
                            {sortedPosts.length > 0 ? sortedPosts.map(post => (
                                <div key={post.id} className="p-4 bg-white/5 border border-white/10 rounded-2xl group/post">
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-sm">{post.authorName}</span>
                                            <span className="text-xs text-zinc-500 truncate max-w-[120px]">{post.university}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={cn("text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border", getCategoryColor(post.category))}>
                                                {post.category}
                                            </span>
                                            {user?.uid === post.authorUid && (
                                                <button onClick={() => deleteCampusWallPost(post.id)} className="text-zinc-600 hover:text-red-500 opacity-0 group-hover/post:opacity-100 transition-opacity">
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <p className="text-zinc-300 text-sm leading-relaxed">{post.text}</p>
                                    <p className="text-[10px] text-zinc-600 mt-3 font-bold uppercase tracking-widest">{formatTimeAgo(post.createdAt)}</p>
                                </div>
                            )) : (
                                <div className="h-full flex flex-col items-center justify-center text-zinc-500 text-sm">
                                    <MessageCircle className="w-12 h-12 mb-4 opacity-20" />
                                    No posts on the wall yet.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Card 2: Ambassador Bounty */}
                    {campusProfile?.role === 'ambassador' ? (
                        <div className="campus-wall-card bg-black/40 shadow-[0_0_40px_rgba(168,85,247,0.1)] rounded-[2.5rem] flex flex-col h-[600px] border border-white/5 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-neon-purple/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 group-hover:bg-neon-purple/20 transition-colors duration-700 pointer-events-none" />
                            <div className="p-8 border-b border-white/5 shrink-0 relative z-10">
                                <h2 className="text-2xl font-black uppercase tracking-tight flex items-center gap-3">
                                    <div className="p-2 bg-neon-purple/20 rounded-xl text-neon-purple"><Shield size={20} /></div>
                                    Ambassador Bounty
                                </h2>
                            </div>
                            <div className="flex-1 p-8 flex flex-col justify-between relative z-10">
                                <div className="space-y-6">
                                    <div className="p-6 bg-white/5 rounded-2xl border border-white/10 text-center">
                                        <p className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">Your Referral Code</p>
                                        <div className="text-3xl font-black text-neon-purple tracking-wider font-space mb-4">{campusProfile.referralCode || 'PENDING'}</div>
                                        <button onClick={copyReferral} className="mx-auto h-10 px-6 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-colors">
                                            {copiedRef ? <CheckCircle2 size={16} className="text-neon-green" /> : <Copy size={16} />}
                                            {copiedRef ? 'Copied' : 'Copy Code'}
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-5 bg-white/5 rounded-2xl border border-white/10 text-center">
                                            <p className="text-4xl font-black text-white mb-1">{campusProfile.referralsCount || 0}</p>
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Recruits</p>
                                        </div>
                                        <div className="p-5 bg-white/5 rounded-2xl border border-white/10 text-center">
                                            <p className="text-4xl font-black text-white mb-1">{campusActivations?.length || 0}</p>
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Active Missions</p>
                                        </div>
                                    </div>
                                </div>
                                <Link to="/campus/join" className="h-14 w-full bg-neon-purple text-white rounded-2xl font-black uppercase tracking-widest text-sm flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform shadow-[0_0_20px_rgba(168,85,247,0.3)]">
                                    View Full Dashboard <ArrowRight size={18} />
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <div className="campus-wall-card bg-black/40 rounded-[2.5rem] flex flex-col h-[600px] border border-white/5 relative overflow-hidden">
                            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center z-10 bg-black/60 backdrop-blur-sm">
                                <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6">
                                    <Lock size={24} className="text-zinc-600" />
                                </div>
                                <h3 className="text-xl font-black uppercase tracking-tight text-zinc-400 mb-2">Ambassador Bounty</h3>
                                <p className="text-sm text-zinc-500 max-w-xs mb-6">Unlock exclusive physical tasks, referral bounties, and operations workflows by becoming a Campus Ambassador.</p>
                                <Link to="/campus/join" className="h-10 px-6 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-colors">
                                    Apply Now
                                </Link>
                            </div>
                        </div>
                    )}

                    {/* Card 3: Sponsorship Portal */}
                    {['fest_head', 'club_head'].includes(campusProfile?.role) ? (
                        <div className="campus-wall-card bg-black/40 shadow-[0_0_40px_rgba(255,215,0,0.08)] rounded-[2.5rem] flex flex-col h-[600px] border border-white/5 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-[#FFD700]/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 group-hover:bg-[#FFD700]/20 transition-colors duration-700 pointer-events-none" />
                            <div className="p-8 border-b border-white/5 shrink-0 relative z-10">
                                <h2 className="text-2xl font-black uppercase tracking-tight flex items-center gap-3">
                                    <div className="p-2 bg-[#FFD700]/20 rounded-xl text-[#FFD700]"><Briefcase size={20} /></div>
                                    Sponsorship Portal
                                </h2>
                            </div>
                            <div className="flex-1 overflow-y-auto p-8 space-y-4 scrollbar-hide relative z-10">
                                {campusActivations?.length > 0 ? campusActivations.map(act => (
                                    <div key={act.id} className="p-5 bg-white/5 border border-white/10 rounded-2xl group/sponsor hover:border-[#FFD700]/50 transition-colors">
                                        <div className="flex items-center gap-4 mb-4">
                                            {act.brandLogo ? (
                                                <img src={act.brandLogo} alt={act.brandName} className="w-12 h-12 rounded-xl object-contain bg-white" />
                                            ) : (
                                                <div className="w-12 h-12 rounded-xl bg-[#FFD700]/20 text-[#FFD700] flex items-center justify-center font-bold text-xl">{act.brandName?.[0]}</div>
                                            )}
                                            <div>
                                                <h4 className="font-bold text-white text-lg">{act.brandName}</h4>
                                                <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest">{act.title}</p>
                                            </div>
                                        </div>
                                        <Link to={`/campus/activation/${act.slug}`} className="block w-full text-center py-3 bg-[#FFD700]/10 hover:bg-[#FFD700]/20 text-[#FFD700] rounded-xl text-xs font-black uppercase tracking-widest transition-colors">
                                            View Campaign Pitch
                                        </Link>
                                    </div>
                                )) : (
                                    <div className="h-full flex flex-col items-center justify-center text-zinc-500 text-sm">
                                        <Briefcase className="w-12 h-12 mb-4 opacity-20" />
                                        No active sponsorships currently.
                                    </div>
                                )}
                            </div>
                            <div className="p-6 border-t border-white/5 shrink-0 relative z-10 bg-black/40">
                                <Link to="/contact" className="h-12 w-full bg-[#FFD700] text-black rounded-xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform">
                                    Submit Custom Proposal <ArrowRight size={16} />
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <div className="campus-wall-card bg-black/40 rounded-[2.5rem] flex flex-col h-[600px] border border-white/5 relative overflow-hidden">
                            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center z-10 bg-black/60 backdrop-blur-sm">
                                <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6">
                                    <Lock size={24} className="text-zinc-600" />
                                </div>
                                <h3 className="text-xl font-black uppercase tracking-tight text-zinc-400 mb-2">Sponsorship Portal</h3>
                                <p className="text-sm text-zinc-500 max-w-xs mb-6">Connect your college fest or club with live brand budgets. Exclusive to Fest and Club Heads.</p>
                                <Link to="/campus/join" className="h-10 px-6 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-colors">
                                    Apply as Organizer
                                </Link>
                            </div>
                        </div>
                    )}

                    {/* Card 4: Guestlist Pass (Holographic) */}
                    <div className="holo-border rounded-[2.5rem] p-[2px] h-[600px]">
                        <div className="bg-black/90 w-full h-full rounded-[2.4rem] flex flex-col relative overflow-hidden">
                            <div className="p-8 border-b border-white/5 shrink-0 relative z-10">
                                <h2 className="text-2xl font-black uppercase tracking-tight flex items-center gap-3 text-white">
                                    <div className="p-2 bg-white/10 rounded-xl text-white"><Ticket size={20} /></div>
                                    Dynamic Guestlist
                                </h2>
                            </div>
                            <div className="flex-1 overflow-y-auto p-8 space-y-6 scrollbar-hide relative z-10">
                                {!user ? (
                                    <div className="h-full flex flex-col items-center justify-center text-center">
                                        <p className="text-zinc-400 mb-4">Sign in to claim event passes.</p>
                                        <Link to="/auth/action?mode=login" className="px-6 py-2 bg-white text-black font-bold uppercase text-xs rounded-xl">Sign In</Link>
                                    </div>
                                ) : openGuestlists.length > 0 ? (
                                    openGuestlists.map(gl => {
                                        const hasPass = campusGuestlistPasses?.find(p => p.eventId === gl.id && p.userId === user.uid);
                                        return (
                                            <div key={gl.id} className="p-6 bg-white/5 border border-white/10 rounded-2xl relative overflow-hidden group">
                                                <div className="relative z-10">
                                                    <h3 className="font-black text-xl text-white mb-1">{gl.title}</h3>
                                                    <p className="text-sm text-zinc-400 mb-6">{new Date(gl.date).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</p>
                                                    
                                                    {hasPass ? (
                                                        <div className="bg-white rounded-xl p-4 flex flex-col items-center justify-center relative overflow-hidden">
                                                            {/* Inline SVG QR Placeholder / Dynamic Render */}
                                                            <svg width="120" height="120" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                                                                <rect width="100%" height="100%" fill="white"/>
                                                                <rect x="10" y="10" width="30" height="30" fill="none" stroke="black" strokeWidth="4"/>
                                                                <rect x="60" y="10" width="30" height="30" fill="none" stroke="black" strokeWidth="4"/>
                                                                <rect x="10" y="60" width="30" height="30" fill="none" stroke="black" strokeWidth="4"/>
                                                                <rect x="18" y="18" width="14" height="14" fill="black"/>
                                                                <rect x="68" y="18" width="14" height="14" fill="black"/>
                                                                <rect x="18" y="68" width="14" height="14" fill="black"/>
                                                                <rect x="55" y="55" width="35" height="35" fill="none" stroke="black" strokeDasharray="5,5" strokeWidth="3"/>
                                                            </svg>
                                                            <p className="text-black text-[10px] font-mono mt-2 font-bold">{hasPass.id || 'PASS-ACTIVE'}</p>
                                                            <div className="absolute top-2 right-2 bg-green-500 text-white p-1 rounded-full"><CheckCircle2 size={12} /></div>
                                                        </div>
                                                    ) : (
                                                        <button 
                                                            onClick={() => generateGuestlistPass(gl.id, user.uid, { name: user.displayName, email: user.email })}
                                                            className="w-full h-12 bg-white text-black font-black uppercase tracking-widest text-xs rounded-xl hover:scale-[1.02] transition-transform"
                                                        >
                                                            Claim Pass
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-zinc-500 text-sm">
                                        <QrCode className="w-12 h-12 mb-4 opacity-20" />
                                        No open guestlists at the moment.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
