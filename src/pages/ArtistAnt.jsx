import React, { useState, useEffect } from 'react';
import { useStore } from '../lib/store';
import FileText from 'lucide-react/dist/esm/icons/file-text';
import Briefcase from 'lucide-react/dist/esm/icons/briefcase';
import UserCheck from 'lucide-react/dist/esm/icons/user-check';
import Shield from 'lucide-react/dist/esm/icons/shield';
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right';
import ChevronLeft from 'lucide-react/dist/esm/icons/chevron-left';
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import Search from 'lucide-react/dist/esm/icons/search';
import MapPin from 'lucide-react/dist/esm/icons/map-pin';
import MapPinIcon from 'lucide-react/dist/esm/icons/map-pin';
import Calendar from 'lucide-react/dist/esm/icons/calendar';
import Wallet from 'lucide-react/dist/esm/icons/wallet';
import Activity from 'lucide-react/dist/esm/icons/activity';
import Home from 'lucide-react/dist/esm/icons/home';
import Globe from 'lucide-react/dist/esm/icons/globe';
import Terminal from 'lucide-react/dist/esm/icons/terminal';
import Award from 'lucide-react/dist/esm/icons/award';
import BarChart3 from 'lucide-react/dist/esm/icons/bar-chart-3';
import Clock from 'lucide-react/dist/esm/icons/clock';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle';
import User from 'lucide-react/dist/esm/icons/user';
import Settings from 'lucide-react/dist/esm/icons/settings';
import ExternalLink from 'lucide-react/dist/esm/icons/external-link';
import Mail from 'lucide-react/dist/esm/icons/mail';
import Phone from 'lucide-react/dist/esm/icons/phone';
import LayoutDashboard from 'lucide-react/dist/esm/icons/layout-dashboard';
import Zap from 'lucide-react/dist/esm/icons/zap';
import Music from 'lucide-react/dist/esm/icons/music';
import Users from 'lucide-react/dist/esm/icons/users';
import Disc from 'lucide-react/dist/esm/icons/disc';
import Mic2 from 'lucide-react/dist/esm/icons/mic-2';
import Star from 'lucide-react/dist/esm/icons/star';
import PartyPopper from 'lucide-react/dist/esm/icons/party-popper';
import Wand2 from 'lucide-react/dist/esm/icons/wand-2';
import Guitar from 'lucide-react/dist/esm/icons/guitar';
import Lock from 'lucide-react/dist/esm/icons/lock';
import Cpu from 'lucide-react/dist/esm/icons/cpu';
import HeartHandshake from 'lucide-react/dist/esm/icons/heart-handshake';
import Trophy from 'lucide-react/dist/esm/icons/trophy';
import Ticket from 'lucide-react/dist/esm/icons/ticket';
import ArrowLeft from 'lucide-react/dist/esm/icons/arrow-left';
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down';
import Rocket from 'lucide-react/dist/esm/icons/rocket';
import Camera from 'lucide-react/dist/esm/icons/camera';
import Upload from 'lucide-react/dist/esm/icons/upload';
import CheckCircle2 from 'lucide-react/dist/esm/icons/check-circle-2';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { useNavigate, Link } from 'react-router-dom';
import { PREDEFINED_CITIES } from '../lib/constants';
import artistantLogo from '../assets/logo/artistant.png';

// Artistant Theme Colors: Coral/Orange & Purple/Blue
const ARTISTANT_THEME = {
    primary: '#FF6B6B', // Coral
    secondary: '#7B61FF', // Purple-Blue
};

const TALENT_CATEGORIES = [
    { id: 'singer', label: 'Vocalists', icon: <Mic2 />, desc: 'Solo performers & session singers' },
    { id: 'band', label: 'Live Bands', icon: <Users />, desc: 'Acoustic, Rock & Fusion ensembles' },
    { id: 'dj', label: 'DJs & Producers', icon: <Disc />, desc: 'Electronic, Hip-Hop & Commercial' },
    { id: 'standup', label: 'Comedians', icon: <PartyPopper />, desc: 'Stand-up, Improv & Roasts' },
    { id: 'emcee', label: 'Hosts & Emcees', icon: <Star />, desc: 'Corporate & Wedding anchors' },
    { id: 'instrumental', label: 'Instrumentalists', icon: <Guitar />, desc: 'Violin, Sax, Flute & more' },
    { id: 'magic', label: 'Special Acts', icon: <Wand2 />, desc: 'Magicians, Mentalists & Flow' },
    { id: 'dance', label: 'Performance', icon: <Music />, desc: 'Dance troupes & choreographed acts' }
];

const ECOSYSTEM_FEATURES = [
    { 
        id: 'network', 
        tag: 'Artist Network', 
        title: 'Artistant Backstage™', 
        icon: <Users />, 
        timeline: 'Est. Q4 2026',
        desc: <>Artists booking artists. Need a <span className="text-white font-black">session drummer</span> for this Saturday's gig? Post a call, find <span className="text-white font-black">verified musicians</span>, and complete your band instantly.</> 
    },
    { 
        id: 'payments', 
        tag: 'Secure Payments', 
        title: 'GigSafe Escrow', 
        icon: <Lock />, 
        timeline: 'Est. Q1 2027',
        desc: <>No more chasing payments. Clients pay <span className="text-white font-black">upfront</span>, funds are held securely, and released automatically to the artist <span className="text-white font-black">immediately after</span> the successful gig.</> 
    },
    { 
        id: 'automation', 
        tag: 'Smart Automation', 
        title: 'Smart Tech Riders', 
        icon: <Cpu />, 
        timeline: 'Est. Q2 2027',
        desc: <>Automated equipment matching. We cross-reference the artist's required sound setup with the <span className="text-white font-black">venue's inventory</span> to flag <span className="text-white font-black">missing gear</span> before the show day.</> 
    },
    { 
        id: 'trust', 
        tag: 'Trust Layer', 
        title: 'Replacement Guarantee', 
        icon: <HeartHandshake />, 
        timeline: 'Est. Q2 2027',
        desc: <>Total <span className="text-white font-black">peace of mind</span> for event organizers. If an artist cancels due to an emergency, our engine automatically sources and funds a <span className="text-white font-black">highly-rated replacement</span>.</> 
    },
    { 
        id: 'monetization', 
        tag: 'Monetization', 
        title: 'Brand Collab Hub', 
        icon: <Trophy />, 
        timeline: 'Est. Q3 2027',
        desc: <>Monetize <span className="text-white font-black">beyond the stage</span>. We connect top-rated independent artists directly with lifestyle and beverage brands for <span className="text-white font-black">hyper-local sponsorships</span>.</> 
    },
    { 
        id: 'ticketing', 
        tag: 'Fan Engagement', 
        title: 'Direct Fan Ticketing', 
        icon: <Ticket />, 
        timeline: 'Est. Q4 2027',
        desc: <>Empowering artists to host their own shows. Sell <span className="text-white font-black">tickets directly</span> through your Artistant profile without giving away <span className="text-white font-black">massive cuts</span> to ticketing giants.</> 
    }
];

const ArtistAnt = () => {
    const { 
        user, authInitialized, setAuthModal, artists, addArtist, 
        addClientRequest, deleteArtist, updateArtist, uploadToCloudinary, addToast 
    } = useStore();
    const navigate = useNavigate();

    const [view, setView] = useState('gateway');
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    
    const [artistProfile, setArtistProfile] = useState(null);

    const [artistData, setArtistData] = useState({
        name: '', phone: '', city: '', categories: '', bio: '',
        instagram: '', instagramFollowers: '', youtube: '', portfolio: '',
        image: '', experienceYears: ''
    });

    const [clientData, setClientData] = useState({
        name: '', org: '', email: '', city: '', category: '', 
        budget: '', date: '', requirement: ''
    });

    useEffect(() => {
        if (user && artists) {
            const existingProfile = artists.find(a => a.uid === user.uid);
            if (existingProfile) {
                setArtistProfile(existingProfile);
                if (view === 'gateway' || view === 'artist_form') {
                    setView('dashboard');
                }
            }
        }
    }, [user, artists, view]);

    const handleImageUpload = async (e, isSettings = false) => {
        const file = e.target.files[0];
        if (!file) return;
        
        setIsSubmitting(true);
        try {
            const url = await uploadToCloudinary(file);
            if (isSettings) {
                setArtistProfile(prev => ({ ...prev, image: url }));
            } else {
                setArtistData(prev => ({ ...prev, image: url }));
            }
            addToast("Profile picture uploaded!", 'success');
        } catch (error) {
            addToast("Upload failed: " + error.message, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleArtistSubmit = async (e) => {
        e.preventDefault();
        if (!user) { setAuthModal(true); return; }
        setIsSubmitting(true);
        try {
            await addArtist({
                uid: user.uid,
                email: user.email,
                profileStatus: 'pending',
                ...artistData,
                isVerified: false,
                categories: artistData.categories.split(',').map(c => c.trim().toUpperCase())
            });
            setSuccessMessage({
                title: "APPLICATION RECEIVED",
                body: "We're reviewing your profile. We'll contact you once your account is verified and ready for gigs."
            });
            setView('dashboard');
        } catch (error) {
            useStore.getState().addToast("Protocol failure: " + error.message, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        if (!user || !artistProfile) return;
        setIsSubmitting(true);
        try {
            await updateArtist(user.uid, artistProfile);
            setSuccessMessage({
                title: "PROFILE UPDATED",
                body: "Your profile information has been saved successfully."
            });
            setView('dashboard');
        } catch (error) {
            useStore.getState().addToast("Update failed: " + error.message, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClientSubmit = async (e) => {
        e.preventDefault();
        if (!user) { setAuthModal(true); return; }
        setIsSubmitting(true);
        try {
            await addClientRequest({
                ...clientData,
                status: 'pending',
                createdAt: new Date().toISOString()
            });
            setSuccessMessage({
                title: "REQUEST RECEIVED",
                body: "Our team is finding the best artists for your requirements. We'll contact you with a shortlist of top picks shortly."
            });
            setView('gateway');
            setStep(1);
            setClientData({ name: '', org: '', email: '', city: '', category: '', budget: '', date: '', requirement: '' });
        } catch (error) {
            useStore.getState().addToast("Error: " + error.message, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteProfile = async () => {
        if (!user) return;
        setIsSubmitting(true);
        try {
            await deleteArtist(user.uid);
            setArtistProfile(null);
            setView('gateway');
            setShowDeleteConfirm(false);
        } catch (error) {
            useStore.getState().addToast("Deletion failed: " + error.message, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!authInitialized) {
        return <div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="animate-spin text-neon-green" size={32} /></div>;
    }

    const isFormView = view === 'artist_form' || view === 'client_form';

    return (
        <div className="min-h-screen bg-[#050505] text-white relative font-outfit scroll-smooth">
            {/* Minimal Header */}
            <div className="fixed top-4 left-4 right-4 md:top-8 md:left-8 md:right-8 z-[100] flex justify-between items-center">
                {isFormView ? (
                    <button 
                        onClick={() => { setView('gateway'); setStep(1); }}
                        className="flex items-center gap-3 md:gap-4 px-4 py-3 md:px-6 md:py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl md:rounded-[1.5rem] backdrop-blur-3xl transition-all group"
                    >
                        <ArrowLeft size={16} className="text-[#FF6B6B] group-hover:-translate-x-1 transition-transform" />
                        <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] md:tracking-[0.4em] text-gray-400 group-hover:text-white transition-colors">Back to Home</span>
                    </button>
                ) : (
                    <Link to="/" className="flex items-center gap-3 md:gap-4 px-4 py-3 md:px-6 md:py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl md:rounded-[1.5rem] backdrop-blur-3xl transition-all group">
                        <Home size={16} className="text-[#FF6B6B] group-hover:scale-110 transition-transform" />
                        <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] md:tracking-[0.4em] text-gray-400 group-hover:text-white transition-colors">Back to newbi.live</span>
                    </Link>
                )}

                {/* Smaller logo for header */}
                <AnimatePresence>
                    {view !== 'gateway' && (
                        <motion.img 
                            initial={{ opacity: 0, scale: 0.8 }} 
                            animate={{ opacity: 1, scale: 1 }} 
                            exit={{ opacity: 0, scale: 0.8 }}
                            src={artistantLogo} 
                            alt="Artistant" 
                            className="h-12 md:h-16 w-auto brightness-110 drop-shadow-[0_0_20px_rgba(255,107,107,0.3)] hover:scale-110 transition-transform cursor-pointer"
                            onClick={() => setView('gateway')}
                        />
                    )}
                </AnimatePresence>
            </div>

            <AnimatePresence>
                {successMessage && (
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[200] flex items-center justify-center p-6 backdrop-blur-2xl bg-black/80"
                    >
                        <motion.div 
                            initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                            className="max-w-md w-full bg-zinc-900 border border-white/10 rounded-[3rem] p-10 text-center space-y-8 shadow-2xl relative overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-b from-neon-blue/5 to-transparent pointer-events-none" />
                            <div className="w-24 h-24 rounded-full bg-neon-green/20 border border-neon-green/20 flex items-center justify-center mx-auto relative z-10">
                                <CheckCircle2 size={44} className="text-neon-green" />
                            </div>
                            <div className="space-y-3 relative z-10">
                                <h3 className="text-3xl font-black font-heading uppercase italic tracking-tighter text-white">{successMessage.title}</h3>
                                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest leading-relaxed">{successMessage.body}</p>
                            </div>
                            <button 
                                onClick={() => setSuccessMessage(null)}
                                className="w-full h-20 bg-white text-black rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-[11px] hover:bg-neon-blue hover:text-white transition-all shadow-xl active:scale-95 relative z-10"
                            >
                                ACKNOWLEDGE
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence mode="wait">
                {view === 'gateway' && (
                    <motion.div key="gateway" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        {/* ZERO-GAP ULTRA HERO */}
                        <section className="relative min-h-screen flex flex-col justify-start items-center overflow-hidden px-4 pt-8 sm:pt-12 md:pt-16 pb-20">
                            {/* Theme Background */}
                            <div className="absolute inset-0 z-0">
                                <div className="absolute top-[-15%] left-[-10%] w-[60%] h-[60%] bg-[#FF6B6B]/5 rounded-full blur-[220px] animate-pulse" />
                                <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-[#7B61FF]/3 rounded-full blur-[220px] animate-pulse delay-700" />
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#050505_100%)] z-10" />
                                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:60px_60px] opacity-[0.08]" />
                            </div>

                            <div className="relative z-20 text-center w-full max-w-7xl px-4 flex flex-col items-center">
                                {/* UNIFIED BRAND BLOCK */}
                                <div className="flex flex-col items-center mb-8 md:mb-12">
                                    <motion.div
                                        initial={{ opacity: 0, y: -40, scale: 0.8 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        transition={{ duration: 1.2, ease: "easeOut" }}
                                        className="relative flex justify-center -mb-8 sm:-mb-24 md:-mb-40 lg:-mb-48 mt-4 sm:-mt-20 md:-mt-32"
                                    >
                                        <div className="absolute inset-0 bg-[#FF6B6B]/15 blur-[120px] md:blur-[180px] rounded-full scale-110 animate-pulse"></div>
                                        <img 
                                            src={artistantLogo} 
                                            alt="Artistant" 
                                            className="h-56 sm:h-64 md:h-[32rem] lg:h-[40rem] w-auto relative z-10 drop-shadow-[0_0_100px_rgba(255,107,107,0.6)] hover:scale-[1.01] transition-transform duration-1000" 
                                        />

                                    </motion.div>


                                    <motion.div 
                                        initial={{ opacity: 0, y: 20 }} 
                                        animate={{ opacity: 1, y: 0 }} 
                                        transition={{ duration: 0.8, delay: 0.4 }}
                                        className="relative z-30 w-full mx-auto px-4"
                                    >
                                        <h1 className="text-[20px] sm:text-2xl md:text-3xl lg:text-4xl font-black font-heading tracking-[0.1em] sm:tracking-[0.25em] uppercase italic leading-none text-white opacity-90 drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)]">
                                            YOUR ARTIST. <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF6B6B] via-white to-[#7B61FF] not-italic">YOUR ASSISTANT.</span>
                                        </h1>

                                    </motion.div>
                                </div>

                                {/* Mission Statement */}
                                <motion.div 
                                    initial={{ opacity: 0, y: 20 }} 
                                    animate={{ opacity: 1, y: 0 }} 
                                    transition={{ duration: 0.8, delay: 0.6 }}
                                    className="mb-8 md:mb-10"
                                >
                                    <div className="max-w-5xl mx-auto px-2 md:px-4">
                                        <p className="text-gray-400 text-sm md:text-xl lg:text-2xl font-medium tracking-tight leading-[1.6] md:leading-[1.4] max-w-4xl mx-auto">
                                            Artistant is the <span className="text-white font-black">ultimate booking platform</span> for the <span className="text-white font-black">live performance industry</span>. We seamlessly connect <span className="text-white font-black">independent talent</span> with <span className="text-white font-black">event organizers</span>—making discovering, evaluating, and booking an artist as easy as <span className="text-white font-black">booking a cab.</span>
                                        </p>
                                    </div>
                                </motion.div>

                                {/* Action Buttons */}
                                <motion.div 
                                    initial={{ opacity: 0, y: 30 }} 
                                    animate={{ opacity: 1, y: 0 }} 
                                    transition={{ delay: 0.8 }}
                                    className="flex flex-col sm:flex-row items-center justify-center gap-4 md:gap-8 mb-8"
                                >
                                    <button
                                        onClick={() => setView('artist_form')}
                                        className="group w-full sm:max-w-5xl h-20 md:h-24 px-6 md:px-10 bg-gradient-to-r from-[#FF6B6B] to-[#FF8E53] text-black font-black font-heading uppercase tracking-[0.2em] md:tracking-[0.25em] text-xs md:text-sm rounded-2xl transition-all duration-500 hover:scale-[1.01] active:scale-95 hover:shadow-[0_0_60px_rgba(255,107,107,0.4)] flex flex-col items-center justify-center gap-1 relative overflow-hidden"
                                    >
                                        <div className="flex items-center gap-2 relative z-10">
                                            <span className="uppercase">I'M AN ARTIST</span>
                                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                        </div>
                                        <span className="relative z-10 text-[10px] opacity-60 font-bold tracking-widest uppercase">Build your profile & get gigs</span>
                                    </button>

                                    <button
                                        onClick={() => setView('client_form')}
                                        className="group w-full sm:max-w-5xl h-20 md:h-24 px-6 md:px-10 bg-transparent border-2 border-[#7B61FF] text-[#7B61FF] font-black font-heading uppercase tracking-[0.2em] md:tracking-[0.25em] text-xs md:text-sm rounded-2xl transition-all duration-500 hover:bg-[#7B61FF] hover:text-white hover:scale-[1.01] active:scale-95 flex flex-col items-center justify-center gap-1 relative overflow-hidden"
                                    >
                                        <div className="flex items-center gap-2 relative z-10">
                                            <span className="uppercase">I'M LOOKING FOR ARTISTS</span>
                                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                        </div>
                                        <span className="relative z-10 text-[10px] opacity-60 font-bold tracking-widest uppercase">Discover & book verified talent</span>
                                    </button>
                                </motion.div>

                                {/* WAITLIST ANNOUNCEMENT (Resized & Repositioned) */}
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.9 }}
                                    className="flex flex-col items-center gap-4"
                                >
                                    <div className="flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-3xl group hover:border-[#FF6B6B]/30 transition-all cursor-default">
                                        <Rocket size={12} className="text-[#FF6B6B] animate-bounce" />
                                        <p className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.3em] text-gray-500 group-hover:text-white transition-colors">
                                            Join the waitlist now. Preview live for onboarding and connecting now.
                                        </p>
                                    </div>
                                </motion.div>
                            </div>
                        </section>

                        {/* TALENT SPECTRUM SECTION (Moved Up) */}
                        <section className="relative py-16 md:py-20 px-6 md:px-8 bg-[#050505]">
                            <div className="max-w-7xl mx-auto">
                                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12 md:mb-16">
                                    <div className="space-y-4 text-left">
                                        <h2 className="text-3xl sm:text-4xl md:text-6xl font-black font-heading uppercase italic tracking-tighter leading-none">
                                            THE TALENT <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF6B6B] to-[#7B61FF]">SPECTRUM.</span>
                                        </h2>

                                        <p className="text-gray-600 text-[10px] md:text-base font-bold uppercase tracking-widest">Bridging every performance vertical with precision matching.</p>
                                    </div>

                                    {/* Carousel Navigation */}
                                    <div className="flex items-center gap-3">
                                        <button 
                                            onClick={() => {
                                                const el = document.getElementById('talent-carousel');
                                                if (el) el.scrollBy({ left: -340, behavior: 'smooth' });
                                            }}
                                            className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-zinc-900 border border-white/5 flex items-center justify-center text-white/40 hover:text-white hover:bg-zinc-800 hover:border-white/10 transition-all group"
                                            aria-label="Scroll Left"
                                        >
                                            <ChevronLeft size={24} className="group-hover:-translate-x-0.5 transition-transform" />
                                        </button>
                                        <button 
                                            onClick={() => {
                                                const el = document.getElementById('talent-carousel');
                                                if (el) el.scrollBy({ left: 340, behavior: 'smooth' });
                                            }}
                                            className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-zinc-900 border border-white/5 flex items-center justify-center text-white/40 hover:text-white hover:bg-zinc-800 hover:border-white/10 transition-all group"
                                            aria-label="Scroll Right"
                                        >
                                            <ChevronRight size={24} className="group-hover:translate-x-0.5 transition-transform" />
                                        </button>
                                    </div>
                                </div>
                                
                                <div id="talent-carousel" className="flex overflow-x-auto pb-8 px-6 md:px-0 gap-6 md:gap-8 scrollbar-hide snap-x snap-mandatory scroll-smooth">
                                    {TALENT_CATEGORIES.map((cat, i) => (
                                        <motion.div 
                                            key={cat.id}
                                            initial={{ opacity: 0, y: 20 }}
                                            whileInView={{ opacity: 1, y: 0 }}
                                            viewport={{ once: true }}
                                            transition={{ delay: i * 0.1 }}
                                            className="group flex-shrink-0 w-[280px] md:w-[320px] p-8 bg-zinc-900/20 border border-white/5 rounded-[2.5rem] hover:bg-zinc-900/40 hover:border-[#FF6B6B]/20 transition-all cursor-default snap-center"
                                        >
                                            <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center text-[#FF6B6B] mb-8 group-hover:scale-110 group-hover:bg-[#FF6B6B]/10 transition-all duration-500">
                                                {React.cloneElement(cat.icon, { size: 28 })}
                                            </div>
                                            <h3 className="text-[14px] font-black tracking-widest text-white mb-3 group-hover:text-[#FF6B6B] transition-colors uppercase">{cat.label}</h3>
                                            <p className="text-[12px] font-medium text-gray-500 tracking-tight leading-relaxed">{cat.desc}</p>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        </section>

                        {/* THE BOOKABILITY ENGINE SECTION */}
                        <section className="relative py-16 md:py-24 px-6 md:px-8 bg-[#020202] border-t border-white/5">
                            <div className="max-w-7xl mx-auto text-center space-y-12 md:space-y-16">
                                <div className="space-y-6">
                                    <div className="inline-flex items-center gap-3 px-6 py-2.5 rounded-full bg-[#FF6B6B]/10 border border-[#FF6B6B]/20 backdrop-blur-3xl mb-4">
                                        <Shield size={16} className="text-[#FF6B6B]" />
                                        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[#FF6B6B]">The Bookability Engine™</span>
                                    </div>
                                    <h2 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-black font-heading uppercase italic tracking-tighter leading-none">
                                        CONNECTING SUPPLY AND DEMAND <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF6B6B] to-[#7B61FF]">SECURELY.</span>
                                    </h2>

                                    <p className="text-gray-400 text-base md:text-xl font-bold uppercase tracking-widest max-w-3xl mx-auto">
                                        Empowering the creator economy with a trust-first booking infrastructure.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
                                    <button 
                                        onClick={() => setView('artist_form')}
                                        className="p-6 md:p-10 bg-zinc-900/20 border border-white/10 rounded-3xl md:rounded-[3rem] text-left space-y-8 group hover:border-[#FF6B6B]/30 transition-all hover:bg-zinc-900/40 outline-none"
                                    >
                                        <div className="w-12 h-12 md:w-16 md:h-16 bg-[#FF6B6B]/10 rounded-2xl flex items-center justify-center text-[#FF6B6B] group-hover:scale-110 transition-transform">
                                            <UserCheck size={28} />
                                        </div>
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-xl md:text-2xl font-black uppercase italic tracking-tighter group-hover:text-[#FF6B6B] transition-colors">FOR ARTISTS</h3>
                                                <ArrowRight size={20} className="text-gray-700 group-hover:text-[#FF6B6B] group-hover:translate-x-2 transition-all" />
                                            </div>
                                            <p className="text-gray-500 font-medium text-[13px] md:text-[14px] leading-relaxed">
                                                Build a professional booking identity, get inbound gigs, and manage your calendar seamlessly. Focus on the art, we handle the logistics.
                                            </p>
                                        </div>
                                    </button>

                                    <button 
                                        onClick={() => setView('client_form')}
                                        className="p-6 md:p-10 bg-zinc-900/20 border border-white/10 rounded-3xl md:rounded-[3rem] text-left space-y-8 group hover:border-[#7B61FF]/30 transition-all hover:bg-zinc-900/40 outline-none"
                                    >
                                        <div className="w-12 h-12 md:w-16 md:h-16 bg-[#7B61FF]/10 rounded-2xl flex items-center justify-center text-[#7B61FF] group-hover:scale-110 transition-transform">
                                            <Search size={28} />
                                        </div>
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-xl md:text-2xl font-black uppercase italic tracking-tighter group-hover:text-[#7B61FF] transition-colors">FOR ORGANIZERS</h3>
                                                <ArrowRight size={20} className="text-gray-700 group-hover:text-[#7B61FF] group-hover:translate-x-2 transition-all" />
                                            </div>
                                            <p className="text-gray-500 font-medium text-[13px] md:text-[14px] leading-relaxed">
                                                Discover verified talent, see transparent pricing, and book instantly with zero hassle. Total peace of mind for every event.
                                            </p>
                                        </div>
                                    </button>
                                </div>
                            </div>
                        </section>


                        {/* LAUNCHING SOON SECTION */}
                        <section className="relative py-16 md:py-24 px-6 md:px-8 bg-[#020202] border-t border-white/5">
                            <div className="max-w-7xl mx-auto">
                                <div className="text-center mb-16 md:mb-24 space-y-6 md:space-y-8">
                                    <div className="inline-flex items-center gap-3 px-6 py-2.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-3xl">
                                        <div className="w-2 h-2 bg-[#FF6B6B] rounded-full animate-ping" />
                                        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-400">Launching Soon</span>
                                    </div>
                                    <h2 className="text-3xl sm:text-5xl md:text-8xl font-black font-heading uppercase italic tracking-tighter leading-none">
                                        THE COMPLETE <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF6B6B] to-[#7B61FF]">ECOSYSTEM.</span>
                                    </h2>

                                    <p className="text-gray-400 text-base md:text-xl font-bold uppercase tracking-widest max-w-4xl mx-auto">
                                        We're not just building a directory; we're building the entire operating system for India's live performance economy.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                                    {ECOSYSTEM_FEATURES.map((feature, i) => (
                                        <motion.div 
                                            key={feature.id}
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            whileInView={{ opacity: 1, scale: 1 }}
                                            viewport={{ once: true }}
                                            transition={{ delay: i * 0.1 }}
                                            className="p-8 md:p-10 bg-zinc-900/30 border border-white/5 rounded-[2.5rem] md:rounded-[3rem] space-y-8 md:space-y-10 group hover:border-[#7B61FF]/30 transition-all hover:bg-zinc-900/50"
                                        >
                                            <div className="space-y-6">
                                                <div className="flex items-center justify-between">
                                                    <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center text-[#7B61FF] group-hover:scale-110 group-hover:bg-[#7B61FF]/10 transition-all">
                                                        {React.cloneElement(feature.icon, { size: 28 })}
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-[10px] font-black text-[#7B61FF] uppercase tracking-widest mb-1">{feature.timeline}</div>
                                                        <span className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-600">{feature.tag}</span>
                                                    </div>
                                                </div>
                                                <h3 className="text-2xl font-black italic tracking-tighter group-hover:text-[#7B61FF] transition-colors">{feature.title}</h3>
                                                <p className="text-[13px] font-medium text-gray-500 tracking-tight leading-relaxed">
                                                    {feature.desc}
                                                </p>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        </section>
                    </motion.div>
                )}

                {/* REDESIGNED ONBOARDING FORMS */}
                {isFormView && (
                    <motion.div key="form" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="max-w-6xl mx-auto pt-32 md:pt-48 px-6 pb-40">
                        <div className="text-center mb-12 md:mb-24 relative">
                            <h2 className="text-4xl sm:text-6xl md:text-9xl font-black font-heading uppercase italic tracking-tighter leading-tight md:leading-none mb-6">
                                {view === 'artist_form' ? "JOIN THE" : "GET A"} <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF6B6B] to-[#7B61FF]">SCOUT.</span>
                            </h2>

                            <div className="flex items-center justify-center gap-4">
                                <div className="h-[1px] w-8 md:w-12 bg-white/10" />
                                <p className="text-gray-600 text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] md:tracking-[0.5em]">Phase 1: Direct Enrollment</p>
                                <div className="h-[1px] w-8 md:w-12 bg-white/10" />
                            </div>
                        </div>

                        <div className="relative group/form max-w-4xl mx-auto">
                            {/* DIAGONAL LOGO STAMP AT BOTTOM RIGHT EDGE */}
                            <div className="absolute bottom-0 right-0 w-80 h-80 opacity-[0.15] group-hover/form:opacity-[0.25] transition-all pointer-events-none z-0 -rotate-45 translate-x-1/4 translate-y-1/4">
                                <img src={artistantLogo} alt="" className="w-full h-full object-contain" />
                            </div>
                            
                            <div className="relative z-10 space-y-12 md:space-y-20">
                                {/* Form Section Label */}
                                <div className="flex items-center gap-6">
                                    <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center text-[#FF6B6B]">
                                        <span className="text-sm font-black italic">{step}</span>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-[#FF6B6B] uppercase tracking-[0.4em]">Section {step}</p>
                                        <h3 className="text-2xl font-black italic uppercase tracking-tighter text-white">
                                            {view === 'artist_form' ? ['Identity & Roots', 'Social Impact', 'The Portfolio'][step-1] : ['Client Identification', 'Talent Search Parameters'][step-1]}
                                        </h3>
                                    </div>
                                </div>

                                <form onSubmit={
                                    view === 'artist_form' 
                                    ? (step === 3 ? handleArtistSubmit : (e) => { e.preventDefault(); setStep(s => s + 1); })
                                    : (step === 2 ? handleClientSubmit : (e) => { e.preventDefault(); setStep(s => s + 1); })
                                } className="space-y-10 md:space-y-16">
                                    
                                    <AnimatePresence mode="wait">
                                        {view === 'artist_form' ? (
                                            <motion.div key={`artist-step-${step}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-12">
                                                {step === 1 && (
                                                    <div className="space-y-12">
                                                        {/* Profile Picture Upload Section */}
                                                        <div className="flex flex-col items-center gap-8 bg-white/[0.02] border border-white/5 rounded-[3rem] p-10 md:p-12 mb-8">
                                                            <div className="relative group">
                                                                <div className="w-32 h-32 md:w-40 md:h-40 rounded-[2.5rem] md:rounded-[3.5rem] bg-black border-2 border-white/10 flex items-center justify-center overflow-hidden transition-all group-hover:border-[#FF6B6B]/40">
                                                                    {artistData.image ? (
                                                                        <img src={artistData.image} alt="Preview" className="w-full h-full object-cover" />
                                                                    ) : (
                                                                        <Camera size={40} className="text-gray-700 group-hover:text-[#FF6B6B] transition-colors" />
                                                                    )}
                                                                </div>
                                                                <label className="absolute -bottom-2 -right-2 w-12 h-12 bg-[#FF6B6B] text-black rounded-2xl flex items-center justify-center cursor-pointer hover:scale-110 active:scale-95 transition-all shadow-xl">
                                                                    <Upload size={20} />
                                                                    <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                                                                </label>
                                                            </div>
                                                            <div className="text-center space-y-1">
                                                                <h4 className="text-[11px] font-black uppercase tracking-[0.4em] text-white">Profile Identity</h4>
                                                                <p className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">Upload your professional headshot</p>
                                                            </div>
                                                        </div>

                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-8 md:gap-y-12">
                                                            <FormField label="Professional Name" value={artistData.name} onChange={(e) => setArtistData({...artistData, name: e.target.value})} placeholder="e.g. DJ Shadow" />
                                                            <FormField label="Direct Phone" value={artistData.phone} onChange={(e) => setArtistData({...artistData, phone: e.target.value})} placeholder="+91 XXXX XXXX" />
                                                            <FormField label="Years of Experience" type="number" value={artistData.experienceYears} onChange={(e) => setArtistData({...artistData, experienceYears: e.target.value})} placeholder="e.g. 5" />
                                                            <FormSelect label="Current Base" value={artistData.city} onChange={(e) => setArtistData({...artistData, city: e.target.value})} options={PREDEFINED_CITIES} />
                                                            <FormSelect label="Performance Vertical" value={artistData.categories} onChange={(e) => setArtistData({...artistData, categories: e.target.value})} options={TALENT_CATEGORIES.map(c => c.label)} />
                                                        </div>
                                                    </div>
                                                )}
                                                {step === 2 && (
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-8 md:gap-y-12">
                                                        <FormField label="Instagram Handle" value={artistData.instagram} onChange={(e) => setArtistData({...artistData, instagram: e.target.value})} placeholder="@handle" />
                                                        <FormField label="Fanbase Count" type="number" value={artistData.instagramFollowers} onChange={(e) => setArtistData({...artistData, instagramFollowers: e.target.value})} placeholder="0" />
                                                        <div className="md:col-span-2">
                                                            <FormField label="Primary Portfolio Link" value={artistData.portfolio} onChange={(e) => setArtistData({...artistData, portfolio: e.target.value})} placeholder="YouTube, Soundcloud, or Website" />
                                                        </div>
                                                    </div>
                                                )}
                                                {step === 3 && (
                                                    <div className="space-y-8">
                                                        <FormField label="Professional Bio" isTextArea value={artistData.bio} onChange={(e) => setArtistData({...artistData, bio: e.target.value})} placeholder="Describe your style, experience, and the vibe you bring to a show..." />
                                                    </div>
                                                )}
                                            </motion.div>
                                        ) : (
                                            <motion.div key={`client-step-${step}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-12">
                                                {step === 1 && (
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-8 md:gap-y-12">
                                                        <FormField label="Authorized Representative" value={clientData.name} onChange={(e) => setClientData({...clientData, name: e.target.value})} placeholder="Full name" />
                                                        <FormField label="Organization" value={clientData.org} onChange={(e) => setClientData({...clientData, org: e.target.value})} placeholder="Company or Entity" />
                                                        <FormField label="Business Email" value={clientData.email} onChange={(e) => setClientData({...clientData, email: e.target.value})} placeholder="email@company.com" />
                                                        <FormSelect label="Event Location" value={clientData.city} onChange={(e) => setClientData({...clientData, city: e.target.value})} options={PREDEFINED_CITIES} />
                                                    </div>
                                                )}
                                                {step === 2 && (
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-8 md:gap-y-12">
                                                        <FormField label="Required Talent Type" value={clientData.category} onChange={(e) => setClientData({...clientData, category: e.target.value})} placeholder="Genre or category" />
                                                        <FormField label="Allocated Budget" value={clientData.budget} onChange={(e) => setClientData({...clientData, budget: e.target.value})} placeholder="Range" />
                                                        <div className="md:col-span-2">
                                                            <FormField label="Gig Requirements" isTextArea value={clientData.requirement} onChange={(e) => setClientData({...clientData, requirement: e.target.value})} placeholder="Date range, venue details, and specific requirements..." />
                                                        </div>
                                                    </div>
                                                )}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    <div className="pt-12 flex items-center gap-10">
                                        <button 
                                            type="submit" 
                                            disabled={isSubmitting} 
                                            className="w-full max-w-5xl h-20 md:h-24 px-12 md:px-20 bg-white text-black font-black uppercase tracking-[0.2em] md:tracking-[0.3em] text-[10px] md:text-[11px] rounded-2xl hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-4 shadow-[0_20px_60px_rgba(255,255,255,0.1)]"
                                        >
                                            {isSubmitting ? <Loader2 className="animate-spin" /> : (
                                                <>
                                                    {(view === 'artist_form' && step === 3) || (view === 'client_form' && step === 2) ? 'VERIFY & SUBMIT' : 'CONTINUE'}
                                                    <ArrowRight size={16} />
                                                </>
                                            )}
                                        </button>
                                        
                                        <button type="button" onClick={() => step > 1 ? setStep(s => s - 1) : setView('gateway')} className="text-[10px] font-black text-gray-700 hover:text-white uppercase tracking-widest transition-colors">
                                            {step === 1 ? 'Cancel Application' : 'Back to previous section'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* ARTIST HUB */}
                {view === 'dashboard' && (
                    <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-7xl mx-auto pt-32 md:pt-56 px-6 md:px-8 pb-40">
                        <div className="bg-zinc-900/40 backdrop-blur-3xl border border-white/10 rounded-3xl md:rounded-[3.5rem] p-8 md:p-16 flex flex-col md:flex-row justify-between items-center gap-12 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-[#FF6B6B]/5 blur-3xl -mr-32 -mt-32" />
                            <div className="space-y-6 text-center md:text-left relative z-10">
                                <h2 className="text-4xl sm:text-5xl md:text-7xl font-black font-heading uppercase italic tracking-tighter leading-none">
                                    ARTIST <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF6B6B] to-[#7B61FF]">HUB.</span>
                                </h2>

                                <div className="flex items-center gap-6 justify-center md:justify-start">
                                    <div className="w-16 h-16 bg-[#FF6B6B]/10 rounded-2xl border border-[#FF6B6B]/20 flex items-center justify-center text-[#FF6B6B] shadow-[0_0_20px_rgba(255,107,107,0.1)]">
                                        <UserCheck size={32} />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.3em]">Profile Status</p>
                                        <p className="text-lg font-black text-white uppercase italic tracking-widest">PENDING CERTIFICATION</p>
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 md:gap-8 w-full md:w-auto relative z-10">
                                <DashboardStat label="Est. Payouts" value="₹0" icon={<Wallet size={16} />} color="#FF6B6B" />
                                <DashboardStat label="Upcoming Gigs" value="0" icon={<Calendar size={16} />} color="#7B61FF" />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 mt-12">
                            <div className="lg:col-span-2 space-y-8">
                                <h3 className="text-3xl font-black uppercase italic tracking-tighter flex items-center gap-4 text-gray-300">
                                    <Zap size={28} className="text-[#FF6B6B]" /> ASSIGNED GIGS
                                </h3>
                                <div className="bg-zinc-900/20 border border-white/5 rounded-3xl md:rounded-[3rem] p-12 md:p-20 text-center flex flex-col items-center gap-8 group">
                                    <Clock className="text-gray-800 group-hover:text-[#FF6B6B]/20 transition-colors" size={48} md:size={64} />
                                    <div className="space-y-2">
                                        <p className="text-[10px] md:text-[11px] font-black text-gray-600 uppercase tracking-[0.4em]">Awaiting Gig Allotment</p>
                                        <p className="text-[9px] md:text-[10px] font-bold text-gray-800 uppercase max-w-sm mx-auto leading-relaxed">Our scouts are matching your profile with current requirements. Stay ready.</p>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Management Section */}
                            <div className="space-y-8">
                                <h3 className="text-3xl font-black uppercase italic tracking-tighter flex items-center gap-4 text-gray-300">
                                    <Settings size={28} className="text-[#7B61FF]" /> MANAGEMENT
                                </h3>
                                
                                <div className="space-y-4">
                                    <button 
                                        onClick={() => setView('profile_settings')}
                                        className="w-full flex items-center justify-between p-8 bg-zinc-900/40 hover:bg-zinc-900 border border-white/10 rounded-2xl transition-all group"
                                    >
                                        <div className="flex items-center gap-5">
                                            <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center group-hover:bg-[#FF6B6B]/20 transition-colors">
                                                <User size={20} className="text-gray-400 group-hover:text-[#FF6B6B]" />
                                            </div>
                                            <span className="text-[11px] font-black uppercase tracking-widest text-gray-400 group-hover:text-white transition-colors">Profile Settings</span>
                                        </div>
                                        <ChevronRight size={18} className="text-gray-700 group-hover:translate-x-1 transition-transform" />
                                    </button>

                                    <button 
                                        onClick={() => setShowDeleteConfirm(true)}
                                        className="w-full flex items-center justify-between p-8 bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 rounded-2xl transition-all group"
                                    >
                                        <div className="flex items-center gap-5">
                                            <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center">
                                                <Trash2 size={20} className="text-red-500" />
                                            </div>
                                            <span className="text-[11px] font-black uppercase tracking-widest text-red-500/80 group-hover:text-red-500 transition-colors">Delete Profile</span>
                                        </div>
                                        <ChevronRight size={18} className="text-red-500/40 group-hover:translate-x-1 transition-transform" />
                                    </button>
                                </div>

                                <div className="bg-zinc-900/20 border border-white/5 rounded-[2.5rem] p-10 space-y-8">
                                    <div className="flex items-center gap-4 text-[11px] font-black text-gray-600 uppercase tracking-widest">
                                        <Activity size={16} className="text-[#FF6B6B]" /> Casting Activity
                                    </div>
                                    <p className="text-[10px] font-bold text-gray-800 uppercase tracking-widest text-center py-10 italic">No public casting calls active.</p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* PROFILE SETTINGS VIEW */}
                {view === 'profile_settings' && artistProfile && (
                    <motion.div key="profile_settings" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="max-w-4xl mx-auto pt-56 px-6 pb-40">
                        <div className="text-center mb-16">
                            <button onClick={() => setView('dashboard')} className="mb-8 text-[10px] font-black text-gray-500 hover:text-white uppercase tracking-[0.4em] flex items-center gap-2 mx-auto transition-colors group">
                                <LayoutDashboard size={14} className="group-hover:scale-110 transition-transform" /> Return to Hub
                            </button>
                            <h2 className="text-4xl md:text-7xl font-black font-heading uppercase italic tracking-tighter">
                                EDIT <span className="text-[#FF6B6B]">PROFILE.</span>
                            </h2>
                        </div>

                        <div className="bg-zinc-900/60 backdrop-blur-3xl border border-white/10 rounded-[3.5rem] p-10 md:p-16 shadow-2xl space-y-12">
                            {/* Profile Picture in Settings */}
                            <div className="flex flex-col items-center gap-8 pb-12 border-b border-white/5">
                                <div className="relative group">
                                    <div className="w-32 h-32 md:w-40 md:h-40 rounded-[2.5rem] md:rounded-[3.5rem] bg-black border-2 border-white/10 flex items-center justify-center overflow-hidden transition-all group-hover:border-[#FF6B6B]/40">
                                        {artistProfile.image ? (
                                            <img src={artistProfile.image} alt="Profile" className="w-full h-full object-cover" />
                                        ) : (
                                            <Camera size={40} className="text-gray-700 group-hover:text-[#FF6B6B] transition-colors" />
                                        )}
                                    </div>
                                    <label className="absolute -bottom-2 -right-2 w-12 h-12 bg-[#FF6B6B] text-black rounded-2xl flex items-center justify-center cursor-pointer hover:scale-110 active:scale-95 transition-all shadow-xl">
                                        <Upload size={20} />
                                        <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, true)} />
                                    </label>
                                </div>
                                <div className="text-center space-y-1">
                                    <h4 className="text-[11px] font-black uppercase tracking-[0.4em] text-white">Update Portrait</h4>
                                    <p className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">Recommended: Square headshot (800x800px)</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                <div className="space-y-8">
                                    <h3 className="text-sm font-black uppercase tracking-[0.3em] text-[#FF6B6B] flex items-center gap-3">
                                        <UserCheck size={18} /> Basic Info
                                    </h3>
                                    <div className="space-y-4">
                                        <FormField label="Full Name" value={artistProfile.name} onChange={(e) => setArtistProfile({...artistProfile, name: e.target.value})} />
                                        <FormField label="Phone Number" value={artistProfile.phone} onChange={(e) => setArtistProfile({...artistProfile, phone: e.target.value})} />
                                        <FormField label="Years of Experience" type="number" value={artistProfile.experienceYears} onChange={(e) => setArtistProfile({...artistProfile, experienceYears: e.target.value})} />
                                        <FormSelect label="Base City" value={artistProfile.city} onChange={(e) => setArtistProfile({...artistProfile, city: e.target.value})} options={PREDEFINED_CITIES} />
                                    </div>
                                </div>

                                <div className="space-y-8">
                                    <h3 className="text-sm font-black uppercase tracking-[0.3em] text-[#7B61FF] flex items-center gap-3">
                                        <Sparkles size={18} /> Social & Work
                                    </h3>
                                    <div className="space-y-4">
                                        <FormField label="Instagram" value={artistProfile.instagram} onChange={(e) => setArtistProfile({...artistProfile, instagram: e.target.value})} />
                                        <FormField label="Followers" value={artistProfile.instagramFollowers} onChange={(e) => setArtistProfile({...artistProfile, instagramFollowers: e.target.value})} />
                                        <FormField label="Portfolio Link" value={artistProfile.portfolio} onChange={(e) => setArtistProfile({...artistProfile, portfolio: e.target.value})} />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest px-2">About You</label>
                                <textarea 
                                    value={artistProfile.bio} 
                                    onChange={(e) => setArtistProfile({...artistProfile, bio: e.target.value})} 
                                    className="w-full h-40 bg-black/40 border border-white/5 rounded-2xl p-6 text-[12px] font-bold outline-none focus:border-[#FF6B6B]/30 text-white resize-none"
                                />
                            </div>

                            <div className="pt-10 border-t border-white/5 flex justify-end">
                                <button 
                                    onClick={handleUpdateProfile}
                                    disabled={isSubmitting}
                                    className="h-28 px-24 bg-gradient-to-r from-[#FF6B6B] to-[#7B61FF] text-white font-black uppercase tracking-[0.3em] text-[12px] rounded-2xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-4 shadow-[0_20px_50px_rgba(255,107,107,0.3)]"
                                >
                                    {isSubmitting ? <Loader2 className="animate-spin" /> : 'SAVE CHANGES'}
                                </button>

                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Deletion Confirmation Modal */}
            <AnimatePresence>
                {showDeleteConfirm && (
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md"
                    >
                        <motion.div 
                            initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                            className="w-full max-w-md bg-zinc-900 border border-white/10 rounded-[3rem] p-12 text-center space-y-10"
                        >
                            <div className="w-24 h-24 bg-red-500/10 rounded-[2rem] flex items-center justify-center text-red-500 mx-auto">
                                <AlertTriangle size={48} />
                            </div>
                            <div className="space-y-4">
                                <h3 className="text-3xl font-black uppercase italic tracking-tighter">DELETE PROFILE?</h3>
                                <p className="text-[12px] font-bold text-gray-500 uppercase tracking-wide leading-relaxed">
                                    Warning: This will permanently remove your artist profile and eligibility for upcoming gigs. This cannot be undone.
                                </p>
                            </div>
                            <div className="flex flex-col gap-6">
                                <button 
                                    onClick={handleDeleteProfile}
                                    disabled={isSubmitting}
                                    className="h-22 w-full bg-red-500 text-white font-black uppercase tracking-widest text-[11px] rounded-xl hover:bg-red-600 transition-all flex items-center justify-center gap-3"
                                >
                                    {isSubmitting ? <Loader2 className="animate-spin" /> : 'YES, DELETE PROFILE'}
                                </button>
                                <button 
                                    onClick={() => setShowDeleteConfirm(false)}
                                    className="h-22 w-full bg-white/5 text-gray-500 font-black uppercase tracking-widest text-[11px] rounded-xl hover:bg-white/10 transition-all"
                                >
                                    Cancel
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const FormField = ({ label, isTextArea, ...props }) => (
    <div className="space-y-4">
        <label className="text-[9px] font-black text-gray-600 uppercase tracking-[0.4em] px-2">{label}</label>
        <div className="relative group">
            {isTextArea ? (
                <textarea 
                    {...props} 
                    className="w-full h-48 md:h-64 bg-white/[0.02] border border-white/5 rounded-2xl md:rounded-3xl px-6 md:px-8 py-6 md:py-8 text-[13px] md:text-[14px] font-medium outline-none focus:border-[#FF6B6B]/30 transition-all text-white placeholder:text-white/10 resize-none shadow-2xl focus:bg-white/[0.04]"
                />
            ) : (
                <input 
                    {...props} 
                    className="w-full h-16 md:h-20 bg-white/[0.02] border border-white/5 rounded-full px-8 md:px-10 text-[13px] md:text-[14px] font-black outline-none focus:border-[#FF6B6B]/30 transition-all text-white placeholder:text-white/10 shadow-2xl focus:bg-white/[0.04]" 
                />
            )}
            <div className="absolute inset-0 rounded-full border border-[#FF6B6B]/0 group-focus-within:border-[#FF6B6B]/20 pointer-events-none transition-all duration-500" />
        </div>
    </div>
);

const FormSelect = ({ label, options, value, ...props }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="space-y-4 relative">
            <label className="text-[9px] font-black text-gray-600 uppercase tracking-[0.4em] px-2">{label}</label>
            <div className="relative group">
                <select 
                    {...props} 
                    value={value}
                    onFocus={() => setIsOpen(true)}
                    onBlur={() => setIsOpen(false)}
                    className={cn(
                        "w-full h-20 bg-white/[0.02] border border-white/5 rounded-full px-10 text-[14px] font-black outline-none appearance-none cursor-pointer transition-all shadow-2xl focus:bg-white/[0.04] focus:border-[#FF6B6B]/30",
                        !value ? "text-white/10" : "text-white"
                    )}
                >
                    <option value="" disabled className="bg-[#050505] text-white/10">Please select an option</option>
                    {options.map(o => <option key={o} value={o} className="bg-[#050505] font-bold text-white">{o.toUpperCase()}</option>)}
                </select>
                <div className="absolute inset-0 rounded-full border border-[#FF6B6B]/0 group-focus-within:border-[#FF6B6B]/20 pointer-events-none transition-all duration-500" />
                <ChevronDown className={cn("absolute right-8 top-1/2 -translate-y-1/2 text-gray-700 pointer-events-none transition-transform duration-300", isOpen ? "rotate-180 text-[#FF6B6B]" : "rotate-0")} size={18} />
            </div>
        </div>
    );
};

const DashboardStat = ({ label, value, icon, color }) => (
    <div className="bg-white/5 border border-white/10 rounded-2xl md:rounded-[1.5rem] p-5 md:p-8 min-w-0 md:min-w-[180px] space-y-2 md:space-y-3 group hover:border-white/20 transition-all">
        <div className="flex items-center gap-2 md:gap-3 text-[9px] md:text-[10px] font-black text-gray-600 uppercase tracking-widest md:tracking-[0.2em]">
            <span style={{ color }} className="group-hover:scale-110 transition-transform">{icon}</span> {label}
        </div>
        <div className="text-2xl md:text-3xl font-black text-white italic tracking-tighter drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]">{value}</div>
    </div>
);

export default ArtistAnt;
