import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../lib/store';
import { useStoreSubscription } from '../hooks/useStoreSubscription';
import { Link, useNavigate } from 'react-router-dom';
import useDynamicMeta from '../hooks/useDynamicMeta';
import { serverTimestamp } from 'firebase/firestore';
import { cn } from '../lib/utils';
import INDIA_DATA from '../data/indianColleges';
import {
  GraduationCap, User, MapPin, Instagram, Linkedin, ArrowRight,
  Eye, Send, Trash2, Shield, Lock, Briefcase, Ticket, QrCode, CheckCircle2, Copy, ChevronDown, MessageCircle
} from 'lucide-react';
import GlobalLoader from '../components/ui/GlobalLoader';

// --- ANIMATION VARIANTS ---
// Grid variants for normal enter/exit
const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } },
    exit: { opacity: 0, scale: 0.9, filter: 'blur(10px)', transition: { duration: 0.5, ease: "easeInOut" } }
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } }
};

// The intense transition explosion
const explosionVariants = {
    hidden: { scale: 0, opacity: 0 },
    explode: { 
        scale: [0, 1.5, 1], 
        opacity: [0, 1, 0],
        transition: { duration: 1.5, times: [0, 0.4, 1], ease: "anticipate" }
    }
};

const dashboardContainerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } }
};

const dashboardItemVariants = {
    hidden: { opacity: 0, scale: 0.8, y: 50 },
    show: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", bounce: 0.4, duration: 0.8 } }
};


// ==========================================
// COMPONENT 1: ONBOARDING BENTO GRID
// ==========================================
const OnboardingGrid = ({ user, onSubmit, isLoading }) => {
    const [formData, setFormData] = useState({
        fullName: user?.displayName || '',
        email: user?.email || '',
        phone: user?.phoneNumber || '',
        state: '',
        city: '',
        university: '',
        course: '',
        graduationYear: '',
        instagram: '',
        linkedin: '',
        whyJoin: '',
        role: 'normal_student'
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === 'state') {
            setFormData(prev => ({ ...prev, state: value, city: '', university: '' }));
        } else if (name === 'city') {
            setFormData(prev => ({ ...prev, city: value, university: '' }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const availableCities = useMemo(() => {
        if (!formData.state) return [];
        return INDIA_DATA.states.find(s => s.name === formData.state)?.cities || [];
    }, [formData.state]);

    const availableColleges = useMemo(() => {
        if (!formData.state || !formData.city) return [];
        const stateData = INDIA_DATA.states.find(s => s.name === formData.state);
        return stateData?.cities.find(c => c.name === formData.city)?.colleges || [];
    }, [formData.state, formData.city]);

    return (
        <motion.div variants={containerVariants} initial="hidden" animate="show" exit="exit" className="max-w-7xl mx-auto px-4 w-full">
            <div className="mb-8">
                <motion.h1 variants={itemVariants} className="text-5xl md:text-7xl font-black uppercase tracking-tighter font-space text-white leading-none">
                    Join <span className="text-zinc-500">Campus</span>
                </motion.h1>
            </div>
            
            <form onSubmit={(e) => { e.preventDefault(); onSubmit(formData); }} className="grid grid-cols-1 md:grid-cols-12 gap-4 auto-rows-[minmax(120px,auto)]">
                
                {/* ROLE SELECTOR (Big Card) */}
                <motion.div variants={itemVariants} className="md:col-span-12 lg:col-span-8 bg-[#0a0a0a] border border-white/10 rounded-3xl p-8 flex flex-col justify-between hover:border-white/20 transition-colors">
                    <div>
                        <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400 mb-4">Select Identity</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {[
                                { id: 'normal_student', label: 'Student', color: 'border-white/50 text-white' },
                                { id: 'ambassador', label: 'Ambassador', color: 'border-neon-purple text-neon-purple shadow-[0_0_15px_rgba(168,85,247,0.2)]' },
                                { id: 'campus_influencer', label: 'Influencer', color: 'border-neon-blue text-neon-blue shadow-[0_0_15px_rgba(0,240,255,0.2)]' },
                                { id: 'fest_head', label: 'Fest Head', color: 'border-[#FFD700] text-[#FFD700] shadow-[0_0_15px_rgba(255,215,0,0.2)]' },
                                { id: 'club_head', label: 'Club Head', color: 'border-[#FFD700] text-[#FFD700] shadow-[0_0_15px_rgba(255,215,0,0.2)]' },
                            ].map((role) => (
                                <button
                                    type="button"
                                    key={role.id}
                                    onClick={() => setFormData(prev => ({ ...prev, role: role.id }))}
                                    className={cn(
                                        "h-12 rounded-xl text-xs font-bold border transition-all uppercase tracking-widest",
                                        formData.role === role.id ? role.color + " bg-white/5" : "bg-transparent border-white/10 text-zinc-500 hover:border-white/30"
                                    )}
                                >
                                    {role.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </motion.div>

                {/* BASIC INFO */}
                <motion.div variants={itemVariants} className="md:col-span-6 lg:col-span-4 bg-[#0a0a0a] border border-white/10 rounded-3xl p-6 space-y-4">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400">Details</h3>
                    <div className="relative">
                        <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                        <input type="text" name="fullName" required value={formData.fullName} onChange={handleChange} className="w-full h-12 bg-white/5 border border-transparent rounded-xl pl-12 pr-4 focus:border-white/20 focus:bg-white/10 focus:outline-none transition-colors text-sm font-medium text-white" placeholder="Full Name" />
                    </div>
                    <div className="relative">
                        <input type="tel" name="phone" required value={formData.phone} onChange={handleChange} className="w-full h-12 bg-white/5 border border-transparent rounded-xl px-4 focus:border-white/20 focus:bg-white/10 focus:outline-none transition-colors text-sm font-medium text-white" placeholder="Phone Number" />
                    </div>
                </motion.div>

                {/* LOCATION & COLLEGE */}
                <motion.div variants={itemVariants} className="md:col-span-12 lg:col-span-8 bg-[#0a0a0a] border border-white/10 rounded-3xl p-6">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400 mb-4">Academic Network</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                        <div className="relative">
                            <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                            <select name="state" required value={formData.state} onChange={handleChange} className="w-full h-12 bg-white/5 border border-transparent rounded-xl px-4 appearance-none focus:border-white/20 focus:outline-none transition-colors text-sm font-medium text-white">
                                <option value="" className="bg-zinc-900 text-zinc-500">Select State</option>
                                {INDIA_DATA.states.map(s => <option key={s.name} value={s.name} className="bg-zinc-900">{s.name}</option>)}
                            </select>
                        </div>
                        <div className="relative">
                            <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                            <select name="city" required disabled={!formData.state} value={formData.city} onChange={handleChange} className="w-full h-12 bg-white/5 border border-transparent rounded-xl px-4 appearance-none focus:border-white/20 focus:outline-none transition-colors text-sm font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed">
                                <option value="" className="bg-zinc-900 text-zinc-500">Select City</option>
                                {availableCities.map(c => <option key={c.name} value={c.name} className="bg-zinc-900">{c.name}</option>)}
                            </select>
                        </div>
                    </div>
                    
                    <div className="relative mb-4">
                        <GraduationCap size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                        <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                        <select 
                            name="university" required disabled={!formData.city}
                            value={availableColleges.includes(formData.university) || formData.university === 'Other' ? formData.university : (formData.university ? 'Other' : '')}
                            onChange={(e) => setFormData(prev => ({ ...prev, university: e.target.value }))}
                            className="w-full h-12 bg-white/5 border border-transparent rounded-xl pl-12 pr-4 appearance-none focus:border-white/20 focus:outline-none transition-colors text-sm font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <option value="" className="bg-zinc-900 text-zinc-500">Select College</option>
                            {availableColleges.map(c => <option key={c} value={c} className="bg-zinc-900">{c}</option>)}
                        </select>
                    </div>
                    
                    {formData.university === 'Other' && (
                        <input type="text" name="university" required value={formData.university === 'Other' ? '' : formData.university} onChange={(e) => setFormData(prev => ({ ...prev, university: e.target.value || 'Other' }))} className="w-full h-12 bg-white/5 border border-transparent rounded-xl px-4 focus:border-white/20 focus:outline-none transition-colors text-sm font-medium text-white mb-4" placeholder="Type your college name..." autoFocus />
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <input type="text" name="course" required value={formData.course} onChange={handleChange} className="w-full h-12 bg-white/5 border border-transparent rounded-xl px-4 focus:border-white/20 focus:outline-none transition-colors text-sm font-medium text-white" placeholder="Degree / Course" />
                        <input type="text" name="graduationYear" required value={formData.graduationYear} onChange={handleChange} className="w-full h-12 bg-white/5 border border-transparent rounded-xl px-4 focus:border-white/20 focus:outline-none transition-colors text-sm font-medium text-white" placeholder="Grad Year (e.g. 2026)" />
                    </div>
                </motion.div>

                {/* SOCIALS & SUBMIT */}
                <motion.div variants={itemVariants} className="md:col-span-6 lg:col-span-4 space-y-4 flex flex-col">
                    <div className="flex-1 bg-[#0a0a0a] border border-white/10 rounded-3xl p-6 space-y-4">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400">Social Links</h3>
                        <div className="relative">
                            <Instagram size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                            <input type="text" name="instagram" value={formData.instagram} onChange={handleChange} className="w-full h-12 bg-white/5 border border-transparent rounded-xl pl-12 pr-4 focus:border-white/20 focus:outline-none transition-colors text-sm font-medium text-white" placeholder="@username" />
                        </div>
                        <div className="relative">
                            <Linkedin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                            <input type="text" name="linkedin" value={formData.linkedin} onChange={handleChange} className="w-full h-12 bg-white/5 border border-transparent rounded-xl pl-12 pr-4 focus:border-white/20 focus:outline-none transition-colors text-sm font-medium text-white" placeholder="linkedin.com/in/username" />
                        </div>
                    </div>
                    
                    <button 
                        type="submit" disabled={isLoading}
                        className="w-full h-16 bg-white text-black rounded-3xl font-black uppercase tracking-widest text-sm flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-transform shadow-[0_0_30px_rgba(255,255,255,0.1)]"
                    >
                        {isLoading ? <span className="animate-pulse">Processing...</span> : <>Initialize Profile <ArrowRight size={18} /></>}
                    </button>
                </motion.div>
            </form>
        </motion.div>
    );
};


// ==========================================
// COMPONENT 2: DASHBOARD BENTO GRID
// ==========================================
const DashboardGrid = ({ user, profile, store }) => {
    const { campusWallPosts, addCampusWallPost, deleteCampusWallPost, campusActivations, guestlists, campusGuestlistPasses, generateGuestlistPass } = store;
    const [postText, setPostText] = useState('');
    const [postCategory, setPostCategory] = useState('Spotted');
    const [copiedRef, setCopiedRef] = useState(false);

    const handlePost = async (e) => {
        e.preventDefault();
        if (!postText.trim()) return;
        try {
            await addCampusWallPost({
                text: postText.trim(),
                category: postCategory,
                authorUid: user.uid,
                authorName: user.displayName || 'Student',
                university: profile.university || 'Campus Network'
            });
            setPostText('');
        } catch (err) {
            console.error(err);
        }
    };

    const sortedPosts = useMemo(() => {
        return [...(campusWallPosts || [])].sort((a, b) => {
            const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (new Date(a.createdAt).getTime() || 0);
            const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (new Date(b.createdAt).getTime() || 0);
            return timeB - timeA;
        });
    }, [campusWallPosts]);

    const openGuestlists = useMemo(() => guestlists?.filter(g => g.status === 'Open') || [], [guestlists]);

    const getCategoryStyle = (cat) => {
        switch(cat) {
            case 'Spotted': return 'text-neon-pink bg-neon-pink/10';
            case 'Gig': return 'text-neon-green bg-neon-green/10';
            case 'Collab': return 'text-neon-blue bg-neon-blue/10';
            default: return 'text-zinc-400 bg-white/5';
        }
    };

    const copyReferral = () => {
        if (profile?.referralCode) {
            navigator.clipboard.writeText(profile.referralCode);
            setCopiedRef(true);
            setTimeout(() => setCopiedRef(false), 2000);
        }
    };

    return (
        <motion.div variants={dashboardContainerVariants} initial="hidden" animate="show" className="max-w-7xl mx-auto px-4 w-full relative z-10">
            <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <motion.h1 variants={dashboardItemVariants} className="text-5xl md:text-7xl font-black uppercase tracking-tighter font-space text-white leading-none">
                    Newbi <span className="text-neon-blue">Campus</span>
                </motion.h1>
                <motion.div variants={dashboardItemVariants} className="px-4 py-2 bg-white/5 border border-white/10 rounded-full">
                    <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">{profile.university}</span>
                </motion.div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 auto-rows-[300px]">
                
                {/* THE FEED (Span 2 rows, 8 cols) */}
                <motion.div variants={dashboardItemVariants} className="md:col-span-12 lg:col-span-8 md:row-span-2 bg-[#0a0a0a] border border-white/10 rounded-3xl p-6 flex flex-col overflow-hidden">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-black uppercase tracking-widest flex items-center gap-2">
                            <Eye size={18} className="text-neon-blue" /> Live Feed
                        </h2>
                    </div>

                    <div className="flex gap-2 mb-6">
                        <input type="text" value={postText} onChange={e=>setPostText(e.target.value)} placeholder="Drop something on the wall..." className="flex-1 h-12 bg-white/5 border border-transparent rounded-xl px-4 text-sm font-medium focus:border-white/20 focus:outline-none" />
                        <select value={postCategory} onChange={e=>setPostCategory(e.target.value)} className="w-28 h-12 bg-white/5 border border-transparent rounded-xl px-3 text-xs font-bold uppercase tracking-widest focus:outline-none appearance-none">
                            <option value="Spotted">Spotted</option>
                            <option value="Gig">Gig</option>
                            <option value="Collab">Collab</option>
                        </select>
                        <button onClick={handlePost} disabled={!postText.trim()} className="h-12 px-6 bg-white text-black rounded-xl font-bold uppercase tracking-widest text-xs disabled:opacity-50">Post</button>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-hide">
                        {sortedPosts.map(post => (
                            <div key={post.id} className="p-4 bg-white/5 rounded-2xl group flex flex-col gap-2">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-sm text-white">{post.authorName}</span>
                                        <span className={cn("text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full", getCategoryStyle(post.category))}>{post.category}</span>
                                    </div>
                                    {post.authorUid === user.uid && (
                                        <button onClick={() => deleteCampusWallPost(post.id)} className="text-zinc-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14}/></button>
                                    )}
                                </div>
                                <p className="text-zinc-300 text-sm leading-relaxed">{post.text}</p>
                            </div>
                        ))}
                        {sortedPosts.length === 0 && <div className="h-full flex flex-col items-center justify-center text-zinc-600 text-sm"><MessageCircle size={32} className="mb-2 opacity-50" /> Nothing spotted yet.</div>}
                    </div>
                </motion.div>

                {/* ROLE SPECIFIC DASHBOARD (Span 1 row, 4 cols) */}
                <motion.div variants={dashboardItemVariants} className="md:col-span-6 lg:col-span-4 bg-[#0a0a0a] border border-white/10 rounded-3xl p-6 flex flex-col">
                    {profile.role === 'ambassador' ? (
                        <>
                            <h2 className="text-lg font-black uppercase tracking-widest flex items-center gap-2 mb-6 text-neon-purple">
                                <Shield size={18} /> Ambassador
                            </h2>
                            <div className="flex-1 flex flex-col justify-center space-y-4">
                                <div className="bg-white/5 rounded-2xl p-4 text-center cursor-pointer hover:bg-white/10 transition-colors" onClick={copyReferral}>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">Referral Code</p>
                                    <p className="text-2xl font-black font-space text-white">{profile.referralCode || 'PENDING'}</p>
                                    <p className="text-xs text-neon-green mt-1 h-4">{copiedRef ? 'Copied!' : ''}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white/5 rounded-2xl p-4 text-center">
                                        <p className="text-3xl font-black">{profile.referralsCount || 0}</p>
                                        <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">Recruits</p>
                                    </div>
                                    <div className="bg-white/5 rounded-2xl p-4 text-center">
                                        <p className="text-3xl font-black">{campusActivations?.length || 0}</p>
                                        <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">Missions</p>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : ['fest_head', 'club_head'].includes(profile.role) ? (
                        <>
                            <h2 className="text-lg font-black uppercase tracking-widest flex items-center gap-2 mb-6 text-[#FFD700]">
                                <Briefcase size={18} /> Sponsorships
                            </h2>
                            <div className="flex-1 overflow-y-auto space-y-3 scrollbar-hide">
                                {campusActivations?.map(act => (
                                    <Link to={`/campus/activation/${act.slug}`} key={act.id} className="block p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors border border-transparent hover:border-[#FFD700]/30">
                                        <p className="font-bold text-sm text-white">{act.brandName}</p>
                                        <p className="text-xs text-zinc-400 truncate">{act.title}</p>
                                    </Link>
                                ))}
                                {(!campusActivations || campusActivations.length === 0) && (
                                    <p className="text-sm text-zinc-500 text-center mt-10">No active budgets.</p>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center">
                            <Lock size={32} className="text-zinc-700 mb-4" />
                            <h3 className="font-bold uppercase tracking-widest text-sm text-zinc-500 mb-2">Pro Features Locked</h3>
                            <p className="text-xs text-zinc-600">Upgrade to Ambassador or Fest Head to unlock.</p>
                        </div>
                    )}
                </motion.div>

                {/* GUESTLIST PASS (Span 1 row, 4 cols) */}
                <motion.div variants={dashboardItemVariants} className="md:col-span-6 lg:col-span-4 bg-[#0a0a0a] border border-white/10 rounded-3xl p-6 flex flex-col relative overflow-hidden">
                    <h2 className="text-lg font-black uppercase tracking-widest flex items-center gap-2 mb-6">
                        <Ticket size={18} /> Events
                    </h2>
                    <div className="flex-1 overflow-y-auto scrollbar-hide">
                        {openGuestlists.length > 0 ? openGuestlists.map(gl => {
                            const hasPass = campusGuestlistPasses?.find(p => p.eventId === gl.id && p.userId === user.uid);
                            return (
                                <div key={gl.id} className="mb-4 last:mb-0">
                                    <div className="bg-white/5 rounded-xl p-4 flex items-center justify-between">
                                        <div>
                                            <p className="font-bold text-sm text-white mb-1">{gl.title}</p>
                                            <p className="text-[10px] uppercase tracking-widest text-zinc-500">{new Date(gl.date).toLocaleDateString()}</p>
                                        </div>
                                        {hasPass ? (
                                            <div className="bg-white text-black p-1.5 rounded-lg flex items-center justify-center relative">
                                                <QrCode size={24} />
                                                <div className="absolute -top-1 -right-1 bg-neon-green text-black rounded-full"><CheckCircle2 size={10} /></div>
                                            </div>
                                        ) : (
                                            <button onClick={() => generateGuestlistPass(gl.id, user.uid, { name: user.displayName, email: user.email })} className="px-3 py-1.5 bg-white text-black text-[10px] font-bold uppercase tracking-widest rounded-lg hover:scale-105 transition-transform">Claim</button>
                                        )}
                                    </div>
                                </div>
                            );
                        }) : (
                            <div className="h-full flex flex-col items-center justify-center text-center">
                                <Ticket size={32} className="text-zinc-700 mb-4" />
                                <p className="text-xs text-zinc-600">No upcoming events.</p>
                            </div>
                        )}
                    </div>
                </motion.div>

            </div>
        </motion.div>
    );
};


// ==========================================
// MASTER COMPONENT
// ==========================================
export default function NewbiCampus() {
    useStoreSubscription(['campusProfiles', 'creators']);
    useDynamicMeta("Newbi Campus | Hub", "The GenZ Campus Network.");
    const navigate = useNavigate();
    const store = useStore();
    const { user, campusProfiles, creators, addCampusProfile, authInitialized } = store;

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [animationState, setAnimationState] = useState('idle'); // idle -> exploding -> dashboard

    const campusProfile = useMemo(() => {
        if (!user) return null;
        const isCreator = creators?.some(c => c.uid === user.uid && c.status === 'approved' && (c.niche?.toLowerCase().includes('student') || c.niche?.toLowerCase().includes('campus')));
        if (isCreator) return { role: 'campus_influencer', profileStatus: 'approved', university: 'Creator Network' };
        return campusProfiles?.find(c => c.uid === user.uid) || null;
    }, [user, campusProfiles, creators]);

    // If user is not logged in, redirect to login
    useEffect(() => {
        if (authInitialized && !user) {
            navigate('/auth/action?mode=login');
        }
    }, [user, authInitialized, navigate]);

    // The Form Submit Handler
    const handleJoinSubmit = async (formData) => {
        if (!user) return;
        setIsSubmitting(true);
        try {
            // 1. Save data to Firestore (without waiting to block animation)
            addCampusProfile({
                uid: user.uid,
                ...formData,
                profileStatus: 'pending',
                joinedAt: serverTimestamp(),
            });

            // 2. Trigger the "Suck & Explode" Animation
            setAnimationState('exploding');
            
            // 3. Wait for explosion duration then show dashboard
            setTimeout(() => {
                setAnimationState('dashboard');
                setIsSubmitting(false);
            }, 1500); // 1.5s explosion duration matches variants

        } catch (err) {
            console.error("Failed to join:", err);
            setIsSubmitting(false);
            alert("Something went wrong. Please try again.");
        }
    };

    if (!authInitialized || (authInitialized && !user)) {
        return <div className="min-h-screen bg-dark flex items-center justify-center"><GlobalLoader color="#ffffff" /></div>;
    }

    // Determine what to show natively based on profile, unless we are in the middle of forcing the animation
    const showDashboard = animationState === 'dashboard' || (campusProfile && animationState === 'idle');
    const showExplosion = animationState === 'exploding';
    const showOnboarding = !campusProfile && animationState === 'idle';

    return (
        <div className="min-h-screen bg-dark text-white font-['Outfit'] pt-32 pb-20 relative flex flex-col justify-center overflow-hidden">
            
            {/* EXPLOSION OVERLAY (The Motion Graphic) */}
            <AnimatePresence>
                {showExplosion && (
                    <motion.div 
                        className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
                        initial={{ backgroundColor: 'rgba(0,0,0,0)' }}
                        animate={{ backgroundColor: ['rgba(0,0,0,0)', 'rgba(0,0,0,1)', 'rgba(0,0,0,0)'] }}
                        transition={{ duration: 1.5, times: [0, 0.4, 1] }}
                    >
                        <motion.h1 
                            variants={explosionVariants}
                            initial="hidden"
                            animate="explode"
                            className="text-7xl md:text-9xl font-black uppercase tracking-tighter font-space text-white text-center leading-none mix-blend-difference"
                        >
                            NEWBI<br/>CAMPUS
                        </motion.h1>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence mode="wait">
                {showOnboarding && (
                    <motion.div key="onboarding" className="w-full" exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.4, ease: "anticipate" } }}>
                        <OnboardingGrid user={user} onSubmit={handleJoinSubmit} isLoading={isSubmitting} />
                    </motion.div>
                )}

                {showDashboard && (
                    <motion.div key="dashboard" className="w-full">
                        <DashboardGrid user={user} profile={campusProfile} store={store} />
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    );
}
