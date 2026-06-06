import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../lib/store';
import { cn } from '../lib/utils';
import { 
    Zap, ArrowRight, ArrowLeft, Instagram, Youtube, Users, Target, 
    ShieldCheck, CheckCircle2, ChevronDown, MapPin, 
    Briefcase, HelpCircle, Check, Globe, Mail, LayoutDashboard
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import useDynamicMeta from '../hooks/useDynamicMeta';
import ProfilePanel from '../components/ProfilePanel';
import NotificationBell from '../components/NotificationBell';

const CreatorLanding = () => {
    useDynamicMeta({
        title: "Newbi Creator",
        description: "Explore campaign opportunities and collaborate with local brands.",
        url: window.location.href
    });

    const navigate = useNavigate();
    const { campaigns, user, creators, artists } = useStore();
    const [isProfileOpen, setIsProfileOpen] = useState(false);

    // Determine if the logged-in user is an existing creator
    const creatorProfile = useMemo(() => {
        if (!user || !creators) return null;
        return creators.find(c => c.uid === user.uid) || null;
    }, [user, creators]);

    const joinedCampaignsCount = useMemo(() => {
        if (!creatorProfile) return 0;
        return (creatorProfile.joinedCampaigns || []).length;
    }, [creatorProfile]);

    // FAQ Accordion State
    const [openFaq, setOpenFaq] = useState(null);

    // Live Campaigns Data Processing
    const liveCampaigns = useMemo(() => {
        return campaigns.filter(c => c.status === 'Open');
    }, [campaigns]);

    // Simplified FAQs for the basic system
    const faqs = [
        { 
            q: 'How do I join the Newbi Creator network?', 
            a: 'Sign in to Newbi, navigate to the Creator section, and submit our simple Creator Registration form. It takes less than two minutes to connect your social handle, operational city, and niches.' 
        },
        { 
            q: 'What kind of campaigns can I participate in?', 
            a: 'You can browse any open campaigns that match your operating location and follower requirements. Once registered, you can apply directly from the campaign brief details page.' 
        },
        { 
            q: 'How do I submit my completed deliverables?', 
            a: 'Once your application is accepted, navigate to your Creator Dashboard workspace, open the active campaign, and submit the link or screenshot proof of your post, reel, or story for admin review.' 
        },
        { 
            q: 'Is there any fee to join the creator network?', 
            a: 'No. Joining the network and applying to campaigns is 100% free for all creators.' 
        }
    ];

    return (
        <div className="min-h-screen bg-[#030303] text-white selection:bg-neon-blue selection:text-black font-['Outfit'] overflow-x-clip relative pb-32">
            <style dangerouslySetInnerHTML={{ __html: `
                @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@100..900&display=swap');
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
                .animate-spin-slow { animation: spin 12s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}} />

            {/* Immersive Ambient Background */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-neon-blue/10 rounded-full blur-[160px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-neon-pink/10 rounded-full blur-[160px] animate-pulse delay-700" />
                <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)', backgroundSize: '80px 80px' }} />
            </div>

            {/* Header Navigation */}
            <header className="fixed top-0 left-0 right-0 h-20 bg-black/40 backdrop-blur-3xl border-b border-white/10 z-50 px-6 md:px-12 flex items-center justify-between shadow-2xl">
                <div className="flex items-center gap-3">
                    <Link to="/creator" className="flex items-center gap-3 group">
                        <div className="w-10 h-10 rounded-2xl bg-white text-black flex items-center justify-center font-black text-xl shadow-[0_0_20px_rgba(255,255,255,0.3)] group-hover:scale-105 transition-transform">
                            NB
                        </div>
                        <span className="text-xl font-black uppercase tracking-tighter italic text-white hidden sm:inline">
                            Newbi <span className="text-neon-blue">Creator.</span>
                        </span>
                    </Link>
                </div>

                <nav className="hidden lg:flex items-center gap-8 text-xs font-bold uppercase tracking-widest text-gray-300">
                    <a href="#how-it-works" className="hover:text-white transition-colors">How it works</a>
                    <a href="#missions" className="hover:text-white transition-colors">Live Gigs</a>
                    <a href="#faqs" className="hover:text-white transition-colors">FAQs</a>
                </nav>

                <div className="flex items-center gap-3">
                    <Link 
                        to="/"
                        className="h-10 px-4 rounded-xl bg-white/5 border border-white/10 text-white font-black uppercase tracking-widest text-[10px] hover:bg-white/10 hover:border-white/20 transition-all flex items-center gap-2 group shadow-lg"
                    >
                        <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform text-neon-pink" />
                        <span className="hidden sm:inline">newbi.live</span>
                        <span className="sm:hidden">Back</span>
                    </Link>
                    {creatorProfile ? (
                        <Button 
                            onClick={() => navigate('/creator-dashboard')}
                            className="h-10 px-4 rounded-xl bg-white text-black font-black uppercase tracking-widest text-[10px] shadow-[0_0_20px_rgba(255,255,255,0.15)] hover:bg-neon-blue hover:text-black transition-all flex items-center gap-2 group"
                        >
                            <LayoutDashboard size={14} />
                            <span>Dashboard</span>
                            <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform hidden sm:inline" />
                        </Button>
                    ) : (
                        <Button 
                            onClick={() => navigate('/creator/join')}
                            className="h-10 px-4 rounded-xl bg-white text-black font-black uppercase tracking-widest text-[10px] shadow-[0_0_20px_rgba(255,255,255,0.15)] hover:bg-neon-blue hover:text-black transition-all flex items-center gap-2 group"
                        >
                            <span>Apply Now</span>
                            <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform hidden sm:inline" />
                        </Button>
                    )}
                    
                    {user && <div className="h-4 w-px bg-white/10 mx-1" />}
                    
                    <NotificationBell />
                    
                    {user ? (
                        <div 
                            className="flex items-center gap-3 cursor-pointer select-none"
                            onClick={() => setIsProfileOpen(true)}
                        >
                            <div className="flex items-center gap-2 group">
                                <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0 group-hover:border-neon-blue transition-all">
                                    <span className="text-white font-black text-[11px] uppercase group-hover:text-neon-blue">
                                        {user.displayName ? user.displayName.charAt(0) : 'U'}
                                    </span>
                                </div>
                                <div className="text-left flex flex-col justify-center hidden md:flex">
                                    <span className="text-[11px] font-bold text-white leading-none capitalize tracking-tight group-hover:text-neon-blue transition-colors">
                                        {user.displayName?.split(' ')[0] || 'Member'}
                                    </span>
                                    <span className="text-[8px] text-neon-blue uppercase tracking-[0.2em] font-black mt-1">
                                        {(() => {
                                            if (user.role === 'developer') return 'DEV';
                                            if (user.role === 'founder') return 'FOUNDER';
                                            if (user.role === 'super_admin') return 'ADMIN';
                                            const isApprovedArtist = artists?.some(a => a.uid === user.uid && a.profileStatus === 'approved');
                                            const isApprovedCreator = creators?.some(c => c.uid === user.uid && c.profileStatus === 'approved');
                                            if (isApprovedArtist) return 'ARTIST';
                                            if (isApprovedCreator) return 'CREATOR';
                                            return 'TRIBE MEMBER';
                                        })()}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={() => useStore.getState().setAuthModal(true)}
                            className="px-5 h-10 rounded-xl bg-white text-black text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all"
                        >
                            Login
                        </button>
                    )}
                </div>
            </header>

            <main className="relative z-10 max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-12 pt-32 md:pt-40 space-y-32 md:space-y-40">
                {/* CINEMATIC HERO SECTION */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center pt-8">
                    <motion.div 
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                        className="lg:col-span-7 space-y-8"
                    >
                        <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-xl shadow-2xl">
                            <Zap size={16} className="text-neon-blue animate-spin-slow" />
                            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-300">{creatorProfile ? `Welcome back, ${creatorProfile.name?.split(' ')[0] || 'Creator'}` : 'Creator Workspace'}</span>
                        </div>

                        <h1 className="text-5xl sm:text-7xl md:text-8xl font-black tracking-tighter uppercase italic leading-[0.85] text-white pr-4">
                            COLLABORATE <br />WITH <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-blue via-neon-pink to-purple-500">BRANDS.</span>
                        </h1>

                        <p className="text-gray-400 text-base md:text-xl font-medium leading-relaxed max-w-2xl">
                            Discover open campaigns in your city, align with campaign requirements, submit deliverables directly, and track your submission statuses from your creator dashboard.
                        </p>

                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-4">
                            {creatorProfile ? (
                                <>
                                    <Button 
                                        onClick={() => navigate('/creator-dashboard')}
                                        className="h-16 md:h-20 px-10 md:px-12 rounded-2xl bg-white text-black font-black uppercase tracking-[0.2em] text-xs md:text-sm shadow-[0_0_50px_rgba(255,255,255,0.2)] hover:bg-neon-blue hover:text-black hover:shadow-[0_0_50px_rgba(46,191,255,0.4)] transition-all group flex items-center justify-center gap-3"
                                    >
                                        <LayoutDashboard size={20} />
                                        <span>Enter Dashboard</span> 
                                        <ArrowRight size={20} className="group-hover:translate-x-2 transition-transform" />
                                    </Button>
                                    <Button 
                                        onClick={() => navigate('/campaigns')}
                                        className="h-16 md:h-20 px-10 md:px-12 rounded-2xl bg-white/5 border border-white/10 text-white font-black uppercase tracking-[0.2em] text-xs md:text-sm hover:bg-white/10 hover:border-white/20 transition-all backdrop-blur-xl shadow-2xl flex items-center justify-center gap-3"
                                    >
                                        <Globe size={20} className="text-neon-blue" />
                                        <span>Browse Campaigns</span>
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <Button 
                                        onClick={() => navigate('/creator/join')}
                                        className="h-16 md:h-20 px-10 md:px-12 rounded-2xl bg-white text-black font-black uppercase tracking-[0.2em] text-xs md:text-sm shadow-[0_0_50px_rgba(255,255,255,0.2)] hover:bg-neon-blue hover:text-black hover:shadow-[0_0_50px_rgba(46,191,255,0.4)] transition-all group flex items-center justify-center gap-3"
                                    >
                                        <span>Join as a Creator</span> 
                                        <ArrowRight size={20} className="group-hover:translate-x-2 transition-transform" />
                                    </Button>
                                    <Button 
                                        onClick={() => navigate('/contact')}
                                        className="h-16 md:h-20 px-10 md:px-12 rounded-2xl bg-white/5 border border-white/10 text-white font-black uppercase tracking-[0.2em] text-xs md:text-sm hover:bg-white/10 hover:border-white/20 transition-all backdrop-blur-xl shadow-2xl flex items-center justify-center gap-3"
                                    >
                                        <Mail size={20} className="text-neon-pink" />
                                        <span>Partner as a Brand</span>
                                    </Button>
                                </>
                            )}
                        </div>
                    </motion.div>

                    {/* Right Hero Visual: Dynamic based on auth state */}
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="lg:col-span-5 relative flex flex-col items-center justify-center"
                    >
                        <div className="absolute w-80 h-80 bg-neon-blue/20 rounded-full blur-[140px] pointer-events-none animate-pulse" />

                        {creatorProfile ? (
                            /* LOGGED-IN CREATOR: Live Profile Preview */
                            <div className="w-full max-w-lg bg-black/60 backdrop-blur-3xl border border-white/10 rounded-[3rem] p-8 md:p-10 shadow-[0_30px_100px_rgba(0,0,0,0.8)] relative z-10 space-y-6 group hover:border-neon-blue/30 transition-all duration-500">
                                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Your Profile</span>
                                    <span className="w-3.5 h-3.5 rounded-full bg-neon-green shadow-[0_0_10px_#39FF14] animate-pulse" />
                                </div>

                                {/* Avatar & Identity */}
                                <div className="flex items-center gap-5">
                                    <div className="relative">
                                        <div className="w-20 h-20 rounded-2xl bg-zinc-900 border border-white/10 overflow-hidden shadow-2xl">
                                            {creatorProfile.profilePicture ? (
                                                <img src={creatorProfile.profilePicture} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-2xl font-black text-white italic">
                                                    {creatorProfile.name?.charAt(0) || 'C'}
                                                </div>
                                            )}
                                        </div>
                                        <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-[#030303] rounded-full flex items-center justify-center border border-white/5">
                                            <div className="w-4 h-4 bg-neon-green rounded-full flex items-center justify-center shadow-[0_0_10px_rgba(57,255,20,0.4)]">
                                                <CheckCircle2 size={10} className="text-black" />
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h4 className="text-lg font-black text-white uppercase tracking-tight">{creatorProfile.name}</h4>
                                            {creatorProfile.profileStatus === 'approved' && <ShieldCheck size={16} className="text-neon-blue" />}
                                        </div>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1 flex items-center gap-1.5">
                                            <MapPin size={10} className="text-neon-pink" /> {creatorProfile.city || 'Not set'}
                                        </p>
                                        <div className={cn("mt-2 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border inline-block",
                                            creatorProfile.profileStatus === 'approved' ? 'bg-neon-green/10 text-neon-green border-neon-green/20' : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20')}>
                                            {creatorProfile.profileStatus === 'approved' ? 'Verified' : (creatorProfile.profileStatus || 'Pending').toUpperCase()}
                                        </div>
                                    </div>
                                </div>

                                {/* Stats Grid */}
                                <div className="grid grid-cols-3 gap-4 p-5 bg-white/[0.02] border border-white/5 rounded-2xl">
                                    <div className="text-center">
                                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Campaigns</p>
                                        <p className="text-xl font-black text-white">{joinedCampaignsCount}</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Followers</p>
                                        <p className="text-xl font-black text-neon-blue">{Number(creatorProfile.instagramFollowers || 0).toLocaleString()}</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Niches</p>
                                        <p className="text-xl font-black text-neon-pink">{(creatorProfile.specializations || []).length}</p>
                                    </div>
                                </div>

                                {/* Niches Tags */}
                                {(creatorProfile.specializations || []).length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {(creatorProfile.specializations || []).slice(0, 4).map((tag, i) => (
                                            <span key={i} className="px-3 py-1 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-gray-300">{tag}</span>
                                        ))}
                                    </div>
                                )}

                                {/* Enter Dashboard CTA */}
                                <Button 
                                    onClick={() => navigate('/creator-dashboard')}
                                    className="w-full h-14 rounded-2xl bg-white text-black font-black uppercase tracking-widest text-[10px] hover:bg-neon-blue transition-all shadow-xl flex items-center justify-center gap-2 group"
                                >
                                    <LayoutDashboard size={16} />
                                    <span>Open Creator Dashboard</span>
                                    <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                                </Button>
                            </div>
                        ) : (
                            /* LOGGED-OUT / NEW USER: Workflow Preview */
                            <div className="w-full max-w-lg bg-black/60 backdrop-blur-3xl border border-white/10 rounded-[3rem] p-8 md:p-10 shadow-[0_30px_100px_rgba(0,0,0,0.8)] relative z-10 space-y-6 group hover:border-neon-blue/30 transition-all duration-500">
                                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Creator Pipeline</span>
                                    <span className="w-3.5 h-3.5 rounded-full bg-neon-blue shadow-[0_0_10px_#38b6ff] animate-pulse" />
                                </div>

                                <div className="space-y-5">
                                    <div className="flex items-start gap-4 p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                                        <div className="w-10 h-10 rounded-xl bg-neon-blue/10 border border-neon-blue/20 flex items-center justify-center text-neon-blue shrink-0"><Users size={18} /></div>
                                        <div>
                                            <h5 className="text-xs font-black text-white uppercase tracking-wider">1. Register Profile</h5>
                                            <p className="text-[10px] font-bold text-gray-400 mt-1 leading-normal">Connect your social handle and details to create your workspace.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-4 p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                                        <div className="w-10 h-10 rounded-xl bg-neon-pink/10 border border-neon-pink/20 flex items-center justify-center text-neon-pink shrink-0"><Target size={18} /></div>
                                        <div>
                                            <h5 className="text-xs font-black text-white uppercase tracking-wider">2. Apply to Campaigns</h5>
                                            <p className="text-[10px] font-bold text-gray-400 mt-1 leading-normal">Browse and apply directly to gigs matching your city and niche.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-4 p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                                        <div className="w-10 h-10 rounded-xl bg-neon-green/10 border border-neon-green/20 flex items-center justify-center text-neon-green shrink-0"><CheckCircle2 size={18} /></div>
                                        <div>
                                            <h5 className="text-xs font-black text-white uppercase tracking-wider">3. Submit & Track</h5>
                                            <p className="text-[10px] font-bold text-gray-400 mt-1 leading-normal">Upload deliverable proof and track verification in real-time.</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-4 border-t border-white/10 text-[10px] font-black uppercase tracking-widest text-gray-500">
                                    <span className="flex items-center gap-1.5"><ShieldCheck size={12} className="text-neon-blue" /> Verified Creator Workflow</span>
                                    <span className="text-white hover:underline cursor-pointer flex items-center gap-1" onClick={() => navigate('/creator/join')}>Get Started <ArrowRight size={12} /></span>
                                </div>
                            </div>
                        )}
                    </motion.div>
                </div>

                {/* HOW IT WORKS SECTION */}
                <motion.section id="how-it-works" className="space-y-16 pt-12">
                    <div className="text-center max-w-3xl mx-auto space-y-4">
                        <h2 className="text-4xl sm:text-6xl font-black font-heading tracking-tighter uppercase italic text-white pr-4 leading-none">
                            SIMPLE, <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-blue via-neon-pink to-white">TRANSPARENT.</span>
                        </h2>
                        <p className="text-gray-400 text-sm md:text-base font-bold uppercase tracking-widest leading-relaxed">
                            No fake metrics, no complex packages. A simple system to track and submit your creative content.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 pt-4">
                        {[
                            { title: 'Create Profile', desc: 'Register with your name, city, social handles, and categories. Our platform verifies profile legitimacy without complex audits.', step: '01' },
                            { title: 'Browse Gigs', desc: 'Filter missions based on platform requirements (Instagram, YouTube), niches, target locations, and post rules.', step: '02' },
                            { title: 'Upload Deliverables', desc: 'When you complete a task, submit the live link or screenshot directly within your creator workspace.', step: '03' },
                            { title: 'Monitor Verification', desc: 'Track your submission state as it transitions from Submitted to Approved in real-time on your dashboard.', step: '04' }
                        ].map((item, idx) => (
                            <div key={idx} className="bg-black/60 backdrop-blur-3xl border border-white/10 hover:border-white/30 rounded-[3rem] p-10 space-y-8 transition-all duration-500 hover:-translate-y-2 shadow-2xl group flex flex-col justify-between">
                                <div className="space-y-6">
                                    <span className="text-4xl font-black font-mono text-neon-blue/30 group-hover:text-neon-blue transition-colors">{item.step}</span>
                                    <h3 className="text-2xl font-black uppercase italic tracking-tighter text-white pr-2">{item.title}</h3>
                                    <p className="text-gray-400 text-sm font-medium leading-relaxed">{item.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.section>

                {/* LIVE CAMPAIGNS DIRECTORY */}
                <motion.section id="missions" className="space-y-12 pt-12">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/5 pb-8">
                        <div>
                            <div className="flex items-center gap-3 text-neon-blue font-black tracking-[0.4em] text-[10px] uppercase mb-2">
                                <Target size={14} className="animate-pulse" />
                                LIVE CAMPAIGNS DIRECTORY
                            </div>
                            <h2 className="text-4xl sm:text-6xl font-black uppercase italic tracking-tighter text-white pr-4 leading-none">
                                ACTIVE <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-blue via-neon-pink to-white">BRIEFS.</span>
                            </h2>
                        </div>
                        <Button 
                            onClick={() => navigate('/campaigns')}
                            className="h-14 px-8 rounded-2xl bg-white/5 border border-white/10 text-white font-black uppercase tracking-[0.2em] text-xs hover:bg-white hover:text-black transition-all shadow-xl shrink-0 flex items-center gap-2"
                        >
                            <span>Explore Full Directory</span> 
                            <ArrowRight size={16} />
                        </Button>
                    </div>

                    {liveCampaigns.length === 0 ? (
                        <div className="py-20 text-center bg-white/[0.01] border border-white/5 rounded-[3rem]">
                            <p className="text-gray-400 text-base font-bold uppercase tracking-widest">No active open briefs right now.</p>
                            <p className="text-gray-600 text-xs font-bold uppercase tracking-widest mt-2">Apply as a creator to be notified when brand missions go live.</p>
                            <Button 
                                onClick={() => navigate('/creator/join')}
                                className="h-12 px-6 rounded-xl bg-white text-black font-black uppercase tracking-widest text-[10px] mt-6 shadow-xl"
                            >
                                Register Profile
                            </Button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pt-4">
                            {liveCampaigns.slice(0, 3).map((camp) => (
                                <div key={camp.id} className="group bg-black/40 backdrop-blur-2xl border border-white/10 hover:border-neon-blue/40 rounded-[2.5rem] overflow-hidden flex flex-col transition-all duration-500 hover:-translate-y-2 shadow-2xl">
                                    {camp.thumbnail && (
                                        <div className="h-56 relative overflow-hidden bg-zinc-900">
                                            <img src={camp.thumbnail} alt={camp.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-80" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                                            <div className="absolute top-6 left-6 flex flex-wrap gap-2 z-10">
                                                <span className="px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[9px] font-black uppercase tracking-widest text-neon-pink flex items-center gap-1.5 shadow-xl">
                                                    <MapPin size={12} /> {camp.targetCity || 'Universal'}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                    <div className="p-8 flex-1 flex flex-col justify-between space-y-6 bg-gradient-to-b from-transparent to-black/60">
                                        <div className="space-y-3">
                                            <span className="text-[10px] font-bold text-neon-blue uppercase tracking-widest">{camp.category || 'Brand Mission'}</span>
                                            <h4 className="text-xl font-black uppercase italic tracking-tight text-white group-hover:text-neon-blue transition-colors line-clamp-2">{camp.title}</h4>
                                            <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-gray-400 pt-2 border-t border-white/5">
                                                <span>Min. {Number(camp.minInstagramFollowers || 0).toLocaleString()} Followers Required</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                            <div>
                                                <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-0.5">Reward</p>
                                                <p className="text-sm font-black text-neon-green uppercase truncate max-w-[150px]">{camp.reward}</p>
                                            </div>
                                            <Button 
                                                onClick={() => navigate(`/campaign/${camp.id}`)}
                                                className="h-12 px-6 rounded-xl bg-white text-black font-black uppercase tracking-widest text-[10px] group-hover:bg-neon-blue group-hover:text-black transition-all shadow-xl"
                                            >
                                                View Brief
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </motion.section>

                {/* FAQ SECTION */}
                <motion.section id="faqs" className="max-w-4xl mx-auto space-y-12 pt-12">
                    <div className="text-center space-y-4">
                        <h2 className="text-4xl sm:text-6xl font-black font-heading tracking-tighter uppercase italic text-white pr-4 leading-none">
                            FREQUENTLY ASKED <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-blue via-neon-pink to-white">QUESTIONS.</span>
                        </h2>
                        <p className="text-gray-400 text-sm md:text-base font-bold uppercase tracking-widest">Clear and direct answers about application and delivery flow.</p>
                    </div>

                    <div className="space-y-4 pt-4">
                        {faqs.map((faq, i) => (
                            <div key={i} className="bg-white/[0.02] border border-white/5 rounded-[2rem] overflow-hidden backdrop-blur-xl transition-all duration-300 shadow-xl">
                                <button 
                                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                                    className="w-full p-8 text-left flex items-center justify-between gap-6 hover:bg-white/[0.02] transition-colors"
                                >
                                    <span className="text-base md:text-lg font-black uppercase tracking-tight italic text-white">{faq.q}</span>
                                    <div className={cn("w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 transition-transform duration-500 shadow-md", openFaq === i ? "rotate-180 bg-white text-black" : "text-gray-400")}>
                                        <ChevronDown size={16} />
                                    </div>
                                </button>
                                <AnimatePresence>
                                    {openFaq === i && (
                                        <motion.div 
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.3 }}
                                            className="px-8 pb-8 text-sm md:text-base text-gray-400 font-medium leading-relaxed border-t border-white/5 pt-6"
                                        >
                                            {faq.a}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        ))}
                    </div>
                </motion.section>

                {/* BOTTOM CTA BANNER */}
                <motion.section className="relative bg-gradient-to-r from-neon-blue/20 via-neon-pink/20 to-purple-500/20 backdrop-blur-3xl border border-white/20 rounded-[4rem] p-12 md:p-24 text-center overflow-hidden shadow-[0_0_100px_rgba(46,191,255,0.2)] mt-12">
                    <div className="absolute -top-40 -right-40 w-96 h-96 bg-neon-blue/30 rounded-full blur-[150px] pointer-events-none animate-pulse" />
                    <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-neon-pink/30 rounded-full blur-[150px] pointer-events-none animate-pulse delay-700" />

                    <div className="relative z-10 max-w-3xl mx-auto space-y-10">
                        <div className="w-20 h-20 bg-white text-black rounded-[2.5rem] flex items-center justify-center mx-auto shadow-2xl">
                            <Zap size={36} className="text-black animate-spin-slow" />
                        </div>
                        <h2 className="text-5xl sm:text-7xl font-black font-heading tracking-tighter uppercase italic text-white pr-4 leading-[0.9]">
                            {creatorProfile ? 'YOUR' : 'READY TO JOIN'} <span className="text-white">{creatorProfile ? 'CREATOR HUB.' : 'NEWBI CREATOR?'}</span>
                        </h2>
                        <p className="text-gray-300 text-base md:text-xl font-bold uppercase tracking-widest leading-relaxed max-w-2xl mx-auto">
                            {creatorProfile ? 'Access your dashboard to manage campaigns, submit deliverables, and track your progress.' : 'Connect your profile, explore open brand campaigns, and track all your deliverables.'}
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                            {creatorProfile ? (
                                <Button 
                                    onClick={() => navigate('/creator-dashboard')}
                                    className="w-full sm:w-auto h-20 px-16 rounded-2xl bg-white text-black font-black uppercase tracking-[0.2em] text-sm shadow-[0_0_50px_rgba(255,255,255,0.3)] hover:bg-neon-blue hover:text-black transition-all hover:scale-105 flex items-center justify-center gap-3"
                                >
                                    <LayoutDashboard size={20} />
                                    <span>Open Dashboard</span> 
                                    <ArrowRight size={20} />
                                </Button>
                            ) : (
                                <Button 
                                    onClick={() => navigate('/creator/join')}
                                    className="w-full sm:w-auto h-20 px-16 rounded-2xl bg-white text-black font-black uppercase tracking-[0.2em] text-sm shadow-[0_0_50px_rgba(255,255,255,0.3)] hover:bg-neon-blue hover:text-black transition-all hover:scale-105 flex items-center justify-center gap-3"
                                
                                >
                                    <span>Register Profile</span> 
                                    <ArrowRight size={20} />
                                </Button>
                            )}
                        </div>
                    </div>
                </motion.section>
            </main>

            {/* Profile modal drawer */}
            <ProfilePanel isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
        </div>
    );
};

export default CreatorLanding;
