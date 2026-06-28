import React, { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useStore } from '../lib/store';
import { cn } from '../lib/utils';
import {
    GraduationCap, ArrowRight, ArrowLeft, ChevronDown, CheckCircle2,
    Instagram, Linkedin, User, Building2, Sparkles, Target, ShieldCheck, Smartphone,
    Gift, Star, Zap, Trophy, MapPin, Rocket, Clock, Lock
} from 'lucide-react';
import useDynamicMeta from '../hooks/useDynamicMeta';
import ProfilePanel from '../components/ProfilePanel';
import NotificationBell from '../components/NotificationBell';
import INDIA_DATA from '../data/indianColleges';
import { serverTimestamp } from 'firebase/firestore';

// ═══════════════════════════════════════════
//  INLINE SVG ILLUSTRATIONS (Apple Edu style)
// ═══════════════════════════════════════════
const ScribbleUnderline = ({ color = '#00F0FF', width = 260 }) => (
    <svg viewBox="0 0 260 20" width={width} height={20} fill="none" className="mt-1">
        <path d="M2 14 C40 2, 80 18, 130 10 C180 2, 220 16, 258 8" stroke={color} strokeWidth="3.5" strokeLinecap="round" className="scribble-underline" />
    </svg>
);

const ScribbleStar = ({ className = '' }) => (
    <svg viewBox="0 0 40 40" width={40} height={40} fill="none" className={className}>
        <path d="M20 2 L24 14 L38 16 L28 26 L30 38 L20 32 L10 38 L12 26 L2 16 L16 14Z" stroke="#FFD700" strokeWidth="2" strokeLinejoin="round" fill="#FFD700" fillOpacity="0.15" />
    </svg>
);

const ScribbleArrow = ({ className = '' }) => (
    <svg viewBox="0 0 80 40" width={80} height={40} fill="none" className={className}>
        <path d="M4 20 C20 20, 40 20, 60 20" stroke="#A855F7" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="6 4" />
        <path d="M55 12 L65 20 L55 28" stroke="#A855F7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const ScribbleCircle = ({ className = '' }) => (
    <svg viewBox="0 0 60 60" width={60} height={60} fill="none" className={className}>
        <ellipse cx="30" cy="30" rx="25" ry="22" stroke="#00F0FF" strokeWidth="2" strokeDasharray="8 5" transform="rotate(-5 30 30)" />
    </svg>
);

const IlloGift = () => (
    <div className="campus-bob campus-bob-delay-1 select-none">
        <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-neon-pink to-neon-purple flex items-center justify-center shadow-[0_8px_30px_rgba(255,79,139,0.3)]">
            <Gift size={32} className="text-white" />
        </div>
    </div>
);

const IlloTrophy = () => (
    <div className="campus-bob-alt campus-bob-delay-2 select-none">
        <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-[#FFD700] to-[#FF9933] flex items-center justify-center shadow-[0_8px_30px_rgba(255,215,0,0.3)]">
            <Trophy size={32} className="text-white" />
        </div>
    </div>
);

const IlloRocket = () => (
    <div className="campus-bob campus-bob-delay-3 select-none">
        <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-neon-blue to-neon-purple flex items-center justify-center shadow-[0_8px_30px_rgba(0,240,255,0.3)]">
            <Rocket size={32} className="text-white" />
        </div>
    </div>
);

// Progress Ring SVG
const ProgressRing = ({ radius = 45, stroke = 5, progress = 0, color = '#00F0FF' }) => {
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (progress / 100) * circumference;
    return (
        <svg width={(radius + stroke) * 2} height={(radius + stroke) * 2} className="transform -rotate-90">
            <circle cx={radius + stroke} cy={radius + stroke} r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={stroke} />
            <circle cx={radius + stroke} cy={radius + stroke} r={radius} fill="none" stroke={color} strokeWidth={stroke} strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-1000 ease-out" />
        </svg>
    );
};


// ═══════════════════════════════════════════
//  PERKS DATA (hardcoded for now)
// ═══════════════════════════════════════════
const PERKS = [
    { id: 'amazon-100', title: '₹100 Amazon Voucher', cost: 500, icon: '🛒', color: '#FF9933' },
    { id: 'spotify-1m', title: '1 Month Spotify Premium', cost: 800, icon: '🎵', color: '#1DB954' },
    { id: 'newbi-merch', title: 'Newbi Merch Pack', cost: 1200, icon: '👕', color: '#A855F7' },
    { id: 'vip-pass', title: 'VIP Event Pass', cost: 2000, icon: '🎟️', color: '#FF4F8B' },
    { id: 'amazon-500', title: '₹500 Amazon Voucher', cost: 2500, icon: '🎁', color: '#FFD700' },
    { id: 'iphone-case', title: 'Branded Phone Case', cost: 600, icon: '📱', color: '#00F0FF' },
];


// ═══════════════════════════════════════════
//  ANIMATION VARIANTS
// ═══════════════════════════════════════════
const stagger = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const fadeUp = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 120, damping: 14 } } };

const gridStagger = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.06 } },
    exit: { opacity: 0, scale: 0.7, filter: 'blur(16px)', transition: { duration: 0.5 } }
};
const gridItem = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 150, damping: 15 } }
};

const dashStagger = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } } };
const dashItem = { hidden: { opacity: 0, scale: 0.8, y: 40 }, show: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', bounce: 0.35, duration: 0.8 } } };


// ═══════════════════════════════════════════
//  ONBOARDING BENTO GRID
// ═══════════════════════════════════════════
const OnboardingGrid = ({ user, onSubmit, isLoading }) => {
    const [fd, setFd] = useState({
        fullName: user?.displayName || '', email: user?.email || '', phone: user?.phoneNumber || '',
        state: '', city: '', university: '', course: '', graduationYear: '',
        instagram: '', linkedin: '', role: 'normal_student'
    });
    const hc = (e) => {
        const { name, value } = e.target;
        if (name === 'state') setFd(p => ({ ...p, state: value, city: '', university: '' }));
        else if (name === 'city') setFd(p => ({ ...p, city: value, university: '' }));
        else setFd(p => ({ ...p, [name]: value }));
    };
    const cities = useMemo(() => INDIA_DATA.states.find(s => s.name === fd.state)?.cities || [], [fd.state]);
    const colleges = useMemo(() => {
        const st = INDIA_DATA.states.find(s => s.name === fd.state);
        return st?.cities.find(c => c.name === fd.city)?.colleges || [];
    }, [fd.state, fd.city]);

    const inp = "w-full h-12 bg-white/5 border border-transparent rounded-xl px-4 focus:border-white/20 focus:bg-white/10 focus:outline-none transition-colors text-sm font-medium text-white";
    const sel = cn(inp, "appearance-none pr-10");

    return (
        <motion.form variants={gridStagger} initial="hidden" animate="show" exit="exit"
            onSubmit={e => { e.preventDefault(); onSubmit(fd); }}
            className="grid grid-cols-1 md:grid-cols-12 gap-4"
        >
            {/* Role */}
            <motion.div variants={gridItem} className="md:col-span-8 campus-card bg-[#0a0a0a] border-l-4 border-l-neon-blue border border-white/[0.06] rounded-3xl p-6 md:p-8">
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-4">Your identity</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[
                        { id: 'normal_student', label: 'Student' },
                        { id: 'ambassador', label: 'Ambassador' },
                        { id: 'campus_influencer', label: 'Influencer' },
                        { id: 'fest_head', label: 'Fest Head' },
                        { id: 'club_head', label: 'Club Head' },
                    ].map(r => (
                        <button key={r.id} type="button" onClick={() => setFd(p => ({ ...p, role: r.id }))}
                            className={cn("h-12 rounded-xl text-xs font-bold border transition-all uppercase tracking-widest",
                                fd.role === r.id ? "border-neon-blue text-neon-blue bg-neon-blue/10" : "border-white/10 text-zinc-600 hover:border-white/20"
                            )}>{r.label}</button>
                    ))}
                </div>
            </motion.div>
            {/* Personal */}
            <motion.div variants={gridItem} className="md:col-span-4 campus-card bg-[#0a0a0a] border-l-4 border-l-neon-purple border border-white/[0.06] rounded-3xl p-6 space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">Personal</p>
                <div className="relative"><User size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" /><input type="text" name="fullName" required value={fd.fullName} onChange={hc} className={cn(inp, "pl-10")} placeholder="Full Name" /></div>
                <input type="tel" name="phone" required value={fd.phone} onChange={hc} className={inp} placeholder="Phone" />
            </motion.div>
            {/* Location */}
            <motion.div variants={gridItem} className="md:col-span-8 campus-card bg-[#0a0a0a] border-l-4 border-l-neon-green border border-white/[0.06] rounded-3xl p-6">
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-3">Academic network</p>
                <div className="grid sm:grid-cols-2 gap-3 mb-3">
                    <div className="relative"><ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none" /><select name="state" required value={fd.state} onChange={hc} className={sel}><option value="" className="bg-zinc-900">State</option>{INDIA_DATA.states.map(s => <option key={s.name} value={s.name} className="bg-zinc-900">{s.name}</option>)}</select></div>
                    <div className="relative"><ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none" /><select name="city" required disabled={!fd.state} value={fd.city} onChange={hc} className={cn(sel, !fd.state && "opacity-40")}><option value="" className="bg-zinc-900">City</option>{cities.map(c => <option key={c.name} value={c.name} className="bg-zinc-900">{c.name}</option>)}</select></div>
                </div>
                <div className="relative mb-3"><GraduationCap size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none" /><ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none" /><select name="university" required disabled={!fd.city} value={colleges.includes(fd.university) || fd.university === 'Other' ? fd.university : ''} onChange={e => setFd(p => ({ ...p, university: e.target.value }))} className={cn(sel, "pl-10", !fd.city && "opacity-40")}><option value="" className="bg-zinc-900">College</option>{colleges.map(c => <option key={c} value={c} className="bg-zinc-900">{c}</option>)}</select></div>
                {fd.university === 'Other' && <input type="text" required onChange={e => setFd(p => ({ ...p, university: e.target.value || 'Other' }))} className={cn(inp, "mb-3")} placeholder="Type college name..." autoFocus />}
                <div className="grid grid-cols-2 gap-3"><input type="text" name="course" required value={fd.course} onChange={hc} className={inp} placeholder="Degree" /><input type="text" name="graduationYear" required value={fd.graduationYear} onChange={hc} className={inp} placeholder="Grad Year" /></div>
            </motion.div>
            {/* Socials + Submit */}
            <motion.div variants={gridItem} className="md:col-span-4 flex flex-col gap-4">
                <div className="flex-1 campus-card bg-[#0a0a0a] border-l-4 border-l-[#FFD700] border border-white/[0.06] rounded-3xl p-6 space-y-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Social</p>
                    <div className="relative"><Instagram size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" /><input type="text" name="instagram" value={fd.instagram} onChange={hc} className={cn(inp, "pl-10")} placeholder="@username" /></div>
                    <div className="relative"><Linkedin size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" /><input type="text" name="linkedin" value={fd.linkedin} onChange={hc} className={cn(inp, "pl-10")} placeholder="linkedin.com/in/..." /></div>
                </div>
                <button type="submit" disabled={isLoading} className="w-full h-16 bg-gradient-to-r from-neon-blue to-neon-purple text-black rounded-3xl font-black uppercase tracking-widest text-sm flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-transform shadow-[0_0_40px_rgba(0,240,255,0.15)]">
                    {isLoading ? <span className="animate-pulse">Processing...</span> : <>Join Campus <ArrowRight size={18} /></>}
                </button>
            </motion.div>
        </motion.form>
    );
};


// ═══════════════════════════════════════════
//  CAMPUS DASHBOARD
// ═══════════════════════════════════════════
const CampusDashboard = ({ user, profile, store }) => {
    const { campusActivations, redeemCampusPerk } = store;
    const points = profile.campusPoints || 0;
    const maxPoints = 3000;
    const progress = Math.min((points / maxPoints) * 100, 100);

    const handleRedeem = async (perk) => {
        if (points < perk.cost) return;
        if (!confirm(`Redeem "${perk.title}" for ${perk.cost} CP?`)) return;
        try { await redeemCampusPerk(user.uid, perk, perk.cost); } catch (e) { console.error(e); }
    };

    return (
        <motion.div variants={dashStagger} initial="hidden" animate="show" className="space-y-6">
            {/* Top Row: Points + Profile */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                {/* Points Ring */}
                <motion.div variants={dashItem} className="md:col-span-4 campus-card bg-[#0a0a0a] border-l-4 border-l-neon-blue border border-white/[0.06] rounded-3xl p-8 flex flex-col items-center justify-center text-center">
                    <div className="relative mb-4">
                        <ProgressRing radius={50} stroke={6} progress={progress} color="#00F0FF" />
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-3xl font-black font-space text-white">{points}</span>
                            <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">Campus Pts</span>
                        </div>
                    </div>
                    <p className="text-xs text-zinc-500">Complete missions to earn more CP</p>
                </motion.div>

                {/* Profile Card */}
                <motion.div variants={dashItem} className="md:col-span-4 campus-card bg-[#0a0a0a] border-l-4 border-l-neon-purple border border-white/[0.06] rounded-3xl p-8 flex flex-col justify-center">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-neon-blue to-neon-purple text-white flex items-center justify-center font-black text-2xl">{(profile.fullName || 'U')[0]}</div>
                        <div><h3 className="font-bold text-lg">{profile.fullName || user.displayName}</h3><p className="text-xs text-zinc-500">{profile.university}</p></div>
                    </div>
                    <div className="flex gap-2">
                        <span className="px-3 py-1 bg-neon-purple/15 text-neon-purple rounded-full text-[10px] font-bold uppercase tracking-widest">{(profile.role || 'student').replace('_', ' ')}</span>
                        <span className="px-3 py-1 bg-white/5 text-zinc-400 rounded-full text-[10px] font-bold uppercase tracking-widest">{profile.city}</span>
                    </div>
                </motion.div>

                {/* Quick Stats */}
                <motion.div variants={dashItem} className="md:col-span-4 campus-card bg-[#0a0a0a] border-l-4 border-l-[#FFD700] border border-white/[0.06] rounded-3xl p-8 grid grid-cols-2 gap-4">
                    <div className="text-center"><p className="text-3xl font-black font-space text-white">{campusActivations?.length || 0}</p><p className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">Missions</p></div>
                    <div className="text-center"><p className="text-3xl font-black font-space text-white">{profile.redeemedPerks?.length || 0}</p><p className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">Perks Used</p></div>
                    <div className="text-center"><p className="text-3xl font-black font-space text-white">{profile.referralsCount || 0}</p><p className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">Referrals</p></div>
                    <div className="text-center"><p className="text-3xl font-black font-space text-neon-green">#{Math.max(1, Math.floor(Math.random() * 50))}</p><p className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">Rank</p></div>
                </motion.div>
            </div>

            {/* Active Missions */}
            <motion.div variants={dashItem}>
                <h3 className="text-lg font-black uppercase tracking-widest mb-4 flex items-center gap-2"><Zap size={18} className="text-neon-blue" /> Active Missions</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {campusActivations?.length ? campusActivations.map(a => (
                        <Link to={`/campus/activation/${a.slug}`} key={a.id} className="campus-card bg-[#0a0a0a] border border-white/[0.06] rounded-2xl p-5 hover:border-neon-blue/30 transition-colors group">
                            <div className="flex items-center gap-3 mb-3">
                                {a.brandLogo ? <img src={a.brandLogo} alt="" className="w-10 h-10 rounded-xl object-contain bg-white" /> : <div className="w-10 h-10 rounded-xl bg-neon-blue/20 text-neon-blue flex items-center justify-center font-bold">{a.brandName?.[0]}</div>}
                                <div><p className="font-bold text-sm">{a.brandName}</p><p className="text-[10px] text-zinc-500 truncate">{a.title}</p></div>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-neon-blue bg-neon-blue/10 px-2 py-1 rounded-lg">{a.points || 100} CP</span>
                                <ArrowRight size={14} className="text-zinc-600 group-hover:text-neon-blue group-hover:translate-x-1 transition-all" />
                            </div>
                        </Link>
                    )) : (
                        <div className="col-span-full p-10 text-center bg-[#0a0a0a] border border-white/[0.06] rounded-2xl text-zinc-600 text-sm">No active missions right now. Check back soon!</div>
                    )}
                </div>
            </motion.div>

            {/* Mini Perks Store */}
            <motion.div variants={dashItem}>
                <h3 className="text-lg font-black uppercase tracking-widest mb-4 flex items-center gap-2"><Gift size={18} className="text-neon-pink" /> Redeem Perks</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    {PERKS.map(perk => {
                        const canAfford = points >= perk.cost;
                        return (
                            <button key={perk.id} onClick={() => handleRedeem(perk)} disabled={!canAfford}
                                className={cn("campus-card bg-[#0a0a0a] border border-white/[0.06] rounded-2xl p-4 text-center transition-all", canAfford ? "hover:border-neon-green/40 hover:scale-105 cursor-pointer" : "opacity-50 cursor-not-allowed")}
                            >
                                <span className="text-3xl block mb-2">{perk.icon}</span>
                                <p className="text-[10px] font-bold text-white mb-1 leading-tight">{perk.title}</p>
                                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: perk.color }}>{perk.cost} CP</p>
                            </button>
                        );
                    })}
                </div>
            </motion.div>
        </motion.div>
    );
};


// ═══════════════════════════════════════════
//  MAIN PAGE
// ═══════════════════════════════════════════
const CampusConnect = () => {
    useDynamicMeta({ title: "Newbi Campus", description: "Where brands meet campuses. Earn points. Unlock perks.", url: window.location.href });

    const store = useStore();
    const { user, campusProfiles, creators, addCampusProfile } = store;
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [openFaq, setOpenFaq] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [animState, setAnimState] = useState('idle');
    const hubRef = useRef(null);

    const campusProfile = useMemo(() => {
        if (!user) return null;
        const isCreator = creators?.some(c => c.uid === user.uid && c.status === 'approved' && (c.niche?.toLowerCase().includes('student') || c.niche?.toLowerCase().includes('campus')));
        if (isCreator) return { role: 'campus_influencer', profileStatus: 'approved', university: 'Creator Network' };
        return campusProfiles?.find(c => c.uid === user.uid) || null;
    }, [user, campusProfiles, creators]);

    const showDashboard = animState === 'dashboard' || (campusProfile && animState === 'idle');
    const showOnboarding = user && !campusProfile && animState === 'idle';
    const showExplosion = animState === 'exploding';

    const handleJoin = async (fd) => {
        if (!user) return;
        setIsSubmitting(true);
        try {
            addCampusProfile({ uid: user.uid, ...fd, profileStatus: 'pending', joinedAt: serverTimestamp() });
            setAnimState('exploding');
            setTimeout(() => { setAnimState('dashboard'); setIsSubmitting(false); }, 2200);
        } catch (e) { console.error(e); setIsSubmitting(false); }
    };

    const scrollToHub = () => hubRef.current?.scrollIntoView({ behavior: 'smooth' });

    const faqs = [
        { q: 'Who can join Newbi Campus?', a: 'Any college student in India! Choose your role — student, ambassador, influencer, fest head, or club head — and start earning Campus Points.' },
        { q: 'How do I earn Campus Points?', a: 'Complete brand missions (online and offline activations), refer friends, and participate in campus events. Each activity rewards you with CP.' },
        { q: 'What can I redeem points for?', a: 'Gift vouchers (Amazon, Spotify), exclusive Newbi merch, VIP event passes, and more. New perks are added regularly!' },
        { q: 'I\'m a fest head. Can I get sponsorships?', a: 'Yes! Apply as a Fest Head and get matched with brands looking to activate on your campus. We handle the platform, you handle the hype.' },
    ];

    return (
        <div className="min-h-screen bg-[#030712] text-white selection:bg-neon-purple selection:text-black font-['Outfit'] overflow-x-clip relative">
            <style dangerouslySetInnerHTML={{ __html: `
                @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@100..900&family=Space+Grotesk:wght@300..700&display=swap');
                .font-space { font-family: 'Space Grotesk', sans-serif; }
                .glass-card { background: rgba(255,255,255,0.02); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.05); }
                .gradient-text { background: linear-gradient(135deg, #00F0FF 0%, #B200FF 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
                .gradient-text-brand { background: linear-gradient(135deg, #FF3366 0%, #FF9933 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
            `}} />

            {/* BG */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.25, 0.4, 0.25] }} transition={{ duration: 15, repeat: Infinity }} className="absolute top-[-20%] right-[-10%] w-[70vw] h-[70vw] rounded-full bg-[radial-gradient(circle,rgba(178,0,255,0.12)_0%,transparent_70%)] blur-[120px]" />
                <motion.div animate={{ scale: [1, 1.3, 1], opacity: [0.15, 0.35, 0.15] }} transition={{ duration: 20, repeat: Infinity, delay: 2 }} className="absolute bottom-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-[radial-gradient(circle,rgba(0,240,255,0.08)_0%,transparent_70%)] blur-[120px]" />
            </div>

            {/* HEADER */}
            <div className="fixed top-4 left-4 right-4 z-50 max-w-7xl mx-auto md:left-8 md:right-8 lg:left-12 lg:right-12">
                <header className="w-full h-16 bg-black/50 backdrop-blur-2xl border border-white/10 rounded-2xl px-6 md:px-8 flex items-center justify-between shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
                    <Link to="/" className="flex items-center gap-3 group"><div className="w-9 h-9 rounded-xl bg-gradient-to-br from-neon-blue to-neon-purple text-white flex items-center justify-center font-black text-base group-hover:scale-105 transition-all">NB</div><span className="text-lg font-extrabold tracking-tight hidden sm:inline">Newbi <span className="text-neon-purple">Campus</span></span></Link>
                    <div className="flex items-center gap-2 sm:gap-3">
                        <Link to="/" className="hidden md:flex h-10 px-4 rounded-xl bg-white/5 border border-white/10 text-white font-bold uppercase tracking-widest text-[10px] hover:bg-white hover:text-black transition-all items-center gap-2 group"><ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> Home</Link>
                        {user ? (<div className="flex items-center gap-2"><NotificationBell /><button onClick={() => setIsProfileOpen(true)} className="h-10 px-4 rounded-xl bg-neon-purple/20 border border-neon-purple/30 text-neon-purple hover:bg-neon-purple hover:text-black font-bold uppercase tracking-widest text-[10px] transition-all flex items-center gap-2"><span className="hidden sm:block truncate max-w-[100px]">{user.displayName || 'Profile'}</span><UserAvatar name={user.displayName} className="sm:hidden w-6 h-6 rounded" /></button></div>) : (<Link to="/auth/action?mode=login" className="h-10 px-6 rounded-xl bg-white text-black font-black uppercase tracking-widest text-[10px] hover:scale-105 transition-transform flex items-center gap-2 shrink-0">Sign In</Link>)}
                    </div>
                </header>
            </div>

            <main className="relative z-10 pt-40 pb-20">
                {/* ═══ HERO ═══ */}
                <section className="min-h-[85vh] flex flex-col items-center justify-center px-6 relative max-w-7xl mx-auto text-center">
                    {/* Floating illustrated icons */}
                    <div className="absolute top-20 left-[8%] hidden md:block"><IlloGift /></div>
                    <div className="absolute top-32 right-[10%] hidden md:block"><IlloTrophy /></div>
                    <div className="absolute bottom-40 left-[15%] hidden md:block"><IlloRocket /></div>
                    {/* Scribble decorations */}
                    <div className="absolute top-40 right-[20%] hidden lg:block"><ScribbleStar className="w-8 h-8 opacity-60" /></div>
                    <div className="absolute bottom-60 right-[8%] hidden lg:block"><ScribbleCircle className="w-12 h-12 opacity-40" /></div>

                    <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2 }}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full glass-card text-white mb-10">
                            <Sparkles size={14} className="text-neon-blue" />
                            <span className="text-[11px] font-bold uppercase tracking-widest">Where Brands Meet Campuses</span>
                        </motion.div>

                        <h1 className="text-7xl md:text-[120px] font-black uppercase tracking-tighter leading-[0.85] mb-4 font-space text-white">
                            Newbi
                        </h1>
                        <div className="relative inline-block mb-10">
                            <h1 className="text-7xl md:text-[120px] font-black uppercase tracking-tighter leading-[0.85] font-space gradient-text pb-4 inline-block">
                                Campus.
                            </h1>
                            <div className="absolute -bottom-1 left-0 right-0 flex justify-center"><ScribbleUnderline color="#A855F7" width={300} /></div>
                        </div>

                        <p className="text-xl md:text-2xl text-zinc-400 max-w-3xl mx-auto font-medium leading-relaxed mb-14">
                            Earn <span className="text-neon-blue font-bold">Campus Points</span> by completing brand missions.
                            Redeem them for <span className="text-neon-pink font-bold">gift vouchers</span>, merch, and exclusive perks.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-5">
                            <button onClick={scrollToHub} className="w-full sm:w-auto h-16 px-12 rounded-2xl bg-gradient-to-r from-neon-blue to-neon-purple text-black font-black uppercase tracking-widest text-sm hover:scale-105 transition-transform flex items-center justify-center gap-3 shadow-[0_0_50px_rgba(178,0,255,0.3)]">
                                {campusProfile ? "Go to Dashboard" : "Enter Campus"} <ArrowRight size={20} />
                            </button>
                            <a href="#brands" className="w-full sm:w-auto h-16 px-12 rounded-2xl glass-card text-white font-bold uppercase tracking-widest text-sm hover:bg-white/10 transition-all flex items-center justify-center gap-3"><Building2 size={20} className="text-zinc-400" /> For Brands</a>
                        </div>
                    </motion.div>
                </section>

                {/* ═══ HOW IT WORKS — 3-Step Bridge ═══ */}
                <section className="py-32 px-6 relative">
                    <div className="max-w-5xl mx-auto">
                        <div className="text-center mb-20">
                            <h2 className="text-sm font-bold uppercase tracking-widest text-neon-green mb-4">The Bridge</h2>
                            <h3 className="text-4xl md:text-6xl font-black uppercase tracking-tighter font-space">How It <span className="text-zinc-500">Works</span></h3>
                        </div>
                        <div className="grid md:grid-cols-3 gap-8 relative">
                            {/* Connecting arrows (desktop) */}
                            <div className="hidden md:block absolute top-1/2 left-[33%] -translate-y-1/2 z-20"><ScribbleArrow /></div>
                            <div className="hidden md:block absolute top-1/2 left-[63%] -translate-y-1/2 z-20"><ScribbleArrow /></div>

                            {[
                                { step: '01', title: 'Brands Launch Missions', desc: 'Brands post challenges, activations, and campaigns targeted at your campus.', icon: <Target size={32} className="text-[#FF3366]" />, border: 'border-l-[#FF3366]' },
                                { step: '02', title: 'Students Complete & Earn', desc: 'Complete online and offline tasks to earn Campus Points (CP) and climb the leaderboard.', icon: <Zap size={32} className="text-neon-blue" />, border: 'border-l-neon-blue' },
                                { step: '03', title: 'Redeem Perks', desc: 'Spend your CP on gift vouchers, exclusive merch, VIP passes, and more.', icon: <Gift size={32} className="text-neon-green" />, border: 'border-l-neon-green' },
                            ].map((s, i) => (
                                <motion.div key={i} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.15 }}
                                    className={cn("campus-card bg-[#0a0a0a] border border-white/[0.06] rounded-3xl p-8 border-l-4", s.border)}>
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-4 block">Step {s.step}</span>
                                    <div className="mb-4">{s.icon}</div>
                                    <h4 className="text-xl font-bold mb-2 font-space">{s.title}</h4>
                                    <p className="text-zinc-500 text-sm leading-relaxed">{s.desc}</p>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ═══ PERKS STORE ═══ */}
                <section className="py-24 px-6 relative border-t border-white/5">
                    <div className="max-w-7xl mx-auto">
                        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
                            <div>
                                <h2 className="text-sm font-bold uppercase tracking-widest text-neon-pink mb-4">Perks Store</h2>
                                <h3 className="text-4xl md:text-6xl font-black uppercase tracking-tighter font-space">Spend Your <span className="text-neon-pink">Points</span></h3>
                            </div>
                            <div className="relative inline-block"><ScribbleStar className="w-6 h-6 absolute -top-3 -right-3" /><p className="text-zinc-500 text-sm max-w-sm">Complete missions to earn Campus Points. Redeem them here for real rewards.</p></div>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                            {PERKS.map((perk, i) => (
                                <motion.div key={perk.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}
                                    className="campus-card bg-[#0a0a0a] border border-white/[0.06] rounded-2xl p-5 text-center hover:border-white/20 transition-all group cursor-pointer hover:scale-105">
                                    <span className="text-4xl block mb-3 group-hover:scale-110 transition-transform">{perk.icon}</span>
                                    <p className="text-xs font-bold text-white mb-1 leading-tight">{perk.title}</p>
                                    <p className="text-xs font-bold uppercase tracking-widest" style={{ color: perk.color }}>{perk.cost} CP</p>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ═══ FOR BRANDS ═══ */}
                <section id="brands" className="py-32 px-6 relative border-t border-white/5 overflow-hidden">
                    <div className="absolute top-0 right-0 w-[80vw] h-[80vw] bg-[radial-gradient(circle,rgba(255,51,102,0.04)_0%,transparent_70%)] rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />
                    <div className="max-w-7xl mx-auto">
                        <div className="text-center mb-24">
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#FF3366]/30 text-[#FF3366] mb-8 bg-[#FF3366]/10"><Building2 size={14} /><span className="text-[10px] font-bold uppercase tracking-widest">For Brands & Agencies</span></div>
                            <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter mb-6 font-space">Activate On <br/><span className="gradient-text-brand">100+ Campuses.</span></h2>
                            <p className="text-xl text-zinc-400 max-w-3xl mx-auto leading-relaxed">Launch gamified missions directly into college campuses. Get verified student engagement, not bots.</p>
                        </div>
                        <div className="grid lg:grid-cols-3 gap-8">
                            {[
                                { icon: <Smartphone size={40} className="text-[#FF3366]" />, title: 'Plug & Play Campaigns', desc: 'Custom brand-themed gamified web apps. Define tasks, set rewards, and watch students compete.', border: 'border-l-[#FF3366]' },
                                { icon: <Target size={40} className="text-[#FF9933]" />, title: 'Sponsor College Fests', desc: 'Access vetted college fests. Sponsor events and integrate your brand into the student experience.', border: 'border-l-[#FF9933]' },
                                { icon: <ShieldCheck size={40} className="text-white" />, title: 'Verified Student Data', desc: 'Every participant is a verified student. Build highly targeted Gen-Z campaigns with real data.', border: 'border-l-white' },
                            ].map((c, i) => (
                                <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                                    className={cn("campus-card bg-[#0a0a0a] border border-white/[0.06] rounded-3xl p-10 border-l-4 hover:border-white/20 transition-colors", c.border)}>
                                    <div className="mb-8">{c.icon}</div>
                                    <h3 className="text-2xl font-bold mb-4 font-space">{c.title}</h3>
                                    <p className="text-zinc-500 leading-relaxed">{c.desc}</p>
                                </motion.div>
                            ))}
                        </div>
                        <div className="mt-16 text-center"><Link to="/contact" className="inline-flex h-16 px-12 rounded-2xl bg-gradient-to-r from-[#FF3366] to-[#FF9933] text-white font-black uppercase tracking-widest text-sm items-center gap-3 hover:scale-105 transition-transform shadow-[0_0_40px_rgba(255,51,102,0.2)]">Partner with Newbi <ArrowRight size={20} /></Link></div>
                    </div>
                </section>

                {/* ═══ THE HUB ═══ */}
                <section ref={hubRef} id="hub" className="py-32 px-6 relative border-t border-white/5">
                    <div className="max-w-7xl mx-auto">
                        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-4">
                            <div className="relative">
                                <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter font-space leading-none">
                                    {showDashboard ? <>Your <span className="text-neon-blue">Dashboard</span></> : <>Enter The <span className="text-zinc-500">Network</span></>}
                                </h2>
                                {showDashboard && <div className="mt-3"><ScribbleUnderline color="#00F0FF" width={200} /></div>}
                            </div>
                            {showDashboard && campusProfile?.university && <p className="text-sm text-zinc-500 uppercase tracking-widest font-bold">{campusProfile.university}</p>}
                        </motion.div>

                        {!user && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8 campus-card bg-[#0a0a0a] border-l-4 border-l-neon-blue border border-white/[0.06] rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6">
                                <div><h3 className="text-2xl font-bold mb-2">Sign in to join Newbi Campus</h3><p className="text-zinc-500">You need a Newbi account to start earning Campus Points.</p></div>
                                <Link to="/auth/action?mode=login" className="h-14 px-8 bg-white text-black rounded-2xl font-black uppercase tracking-widest text-sm flex items-center gap-2 hover:scale-105 transition-transform shrink-0">Sign In <ArrowRight size={18} /></Link>
                            </motion.div>
                        )}

                        {/* REVEAL ANIMATION */}
                        <AnimatePresence>
                            {showExplosion && (
                                <motion.div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none"
                                    initial={{ backgroundColor: 'rgba(3,7,18,0)' }}
                                    animate={{ backgroundColor: ['rgba(3,7,18,0)', 'rgba(3,7,18,1)', 'rgba(3,7,18,1)', 'rgba(3,7,18,0)'] }}
                                    transition={{ duration: 2.2, times: [0, 0.25, 0.7, 1] }}>
                                    {/* Pulse ring */}
                                    <motion.div className="absolute w-[300px] h-[300px] rounded-full border-2 border-neon-blue"
                                        initial={{ scale: 0, opacity: 1 }}
                                        animate={{ scale: [0, 2.5], opacity: [1, 0] }}
                                        transition={{ duration: 1.2, delay: 0.3, ease: "easeOut" }} />
                                    <motion.div className="absolute w-[200px] h-[200px] rounded-full border border-neon-purple"
                                        initial={{ scale: 0, opacity: 1 }}
                                        animate={{ scale: [0, 3], opacity: [1, 0] }}
                                        transition={{ duration: 1.4, delay: 0.5, ease: "easeOut" }} />
                                    {/* Logo burst */}
                                    <motion.div className="flex flex-col items-center"
                                        initial={{ scale: 0, opacity: 0 }}
                                        animate={{ scale: [0, 1.3, 1], opacity: [0, 1, 1, 0] }}
                                        transition={{ duration: 2, times: [0, 0.3, 0.65, 1], ease: "anticipate" }}>
                                        <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-neon-blue to-neon-purple flex items-center justify-center mb-6 shadow-[0_0_80px_rgba(0,240,255,0.5)]">
                                            <span className="text-4xl font-black text-white">NB</span>
                                        </div>
                                        <h1 className="text-5xl md:text-8xl font-black uppercase tracking-tighter font-space text-white text-center leading-none">NEWBI<br/>CAMPUS</h1>
                                    </motion.div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {user && (
                            <AnimatePresence mode="wait">
                                {showOnboarding && <motion.div key="onboarding" exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.4, ease: "anticipate" } }}><OnboardingGrid user={user} onSubmit={handleJoin} isLoading={isSubmitting} /></motion.div>}
                                {showDashboard && <motion.div key="dashboard"><CampusDashboard user={user} profile={campusProfile} store={store} /></motion.div>}
                            </AnimatePresence>
                        )}
                    </div>
                </section>

                {/* ═══ FAQs ═══ */}
                <section className="py-32 px-6 border-t border-white/5">
                    <div className="max-w-3xl mx-auto">
                        <div className="text-center mb-16"><h2 className="text-5xl font-black uppercase tracking-tighter mb-4 font-space">FAQs</h2></div>
                        <div className="space-y-4">
                            {faqs.map((faq, i) => (
                                <div key={i} className="campus-card bg-[#0a0a0a] border border-white/[0.06] rounded-2xl overflow-hidden transition-all hover:border-white/20">
                                    <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="w-full p-6 text-left flex items-center justify-between gap-4">
                                        <span className="font-bold pr-8 text-lg">{faq.q}</span>
                                        <ChevronDown className={cn("shrink-0 text-neon-blue transition-transform duration-300", openFaq === i && "rotate-180")} />
                                    </button>
                                    <AnimatePresence>
                                        {openFaq === i && <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="px-6 pb-6 text-zinc-400 text-lg">{faq.a}</motion.div>}
                                    </AnimatePresence>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            </main>

            <ProfilePanel isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
        </div>
    );
};

const UserAvatar = ({ name, className }) => (
    <div className={cn("w-8 h-8 rounded-lg bg-gradient-to-br from-neon-blue to-neon-purple text-white flex items-center justify-center font-bold text-sm uppercase shrink-0", className)}>
        {name ? name.charAt(0) : 'U'}
    </div>
);

export default CampusConnect;
