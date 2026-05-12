import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import DollarSign from 'lucide-react/dist/esm/icons/dollar-sign';
import Users from 'lucide-react/dist/esm/icons/users';
import Calendar from 'lucide-react/dist/esm/icons/calendar';
import Plus from 'lucide-react/dist/esm/icons/plus';
import FileText from 'lucide-react/dist/esm/icons/file-text';
import Megaphone from 'lucide-react/dist/esm/icons/megaphone';
import Music from 'lucide-react/dist/esm/icons/music';
import Mic2 from 'lucide-react/dist/esm/icons/mic-2';
import Mail from 'lucide-react/dist/esm/icons/mail';
import Shield from 'lucide-react/dist/esm/icons/shield';
import Clock from 'lucide-react/dist/esm/icons/clock';
import Radio from 'lucide-react/dist/esm/icons/radio';
import Star from 'lucide-react/dist/esm/icons/star';
import Image from 'lucide-react/dist/esm/icons/image';
import Ticket from 'lucide-react/dist/esm/icons/ticket';
import LayoutDashboard from 'lucide-react/dist/esm/icons/layout-dashboard';
import Settings from 'lucide-react/dist/esm/icons/settings';
import LogOut from 'lucide-react/dist/esm/icons/log-out';
import Search from 'lucide-react/dist/esm/icons/search';
import Bell from 'lucide-react/dist/esm/icons/bell';
import Zap from 'lucide-react/dist/esm/icons/zap';
import FileSpreadsheet from 'lucide-react/dist/esm/icons/file-spreadsheet';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import TrendingUp from 'lucide-react/dist/esm/icons/trending-up';
import Gift from 'lucide-react/dist/esm/icons/gift';
import ClipboardList from 'lucide-react/dist/esm/icons/clipboard-list';
import ListChecks from 'lucide-react/dist/esm/icons/list-checks';
import Scale from 'lucide-react/dist/esm/icons/scale';
import Briefcase from 'lucide-react/dist/esm/icons/briefcase';
import ChevronLeft from 'lucide-react/dist/esm/icons/chevron-left';
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right';

import { collection, query, where, onSnapshot, getDocs, addDoc } from 'firebase/firestore';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, sendPasswordResetEmail, signInWithPopup } from 'firebase/auth';
import { db, auth, googleProvider } from '../../lib/firebase';
import { useStore } from '../../lib/store';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import AdminCarousel from '../../components/admin/AdminCarousel';
import { cn } from '../../lib/utils';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import artistantLogo from '../../assets/logo/artistant.png';

// --- Helper Components & Utilities ---

const scrollContainer = (id, direction) => {
    const container = document.getElementById(id);
    if (container) {
        const scrollAmount = direction === 'left' ? -300 : 300;
        container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
};

const DashboardSection = ({ title, gradient, children, icon }) => (
    <section className="relative">
        <div className="flex flex-col md:flex-row md:items-center gap-4 mb-10 md:mb-12">
            <div className="flex items-center gap-4">
                <div className={cn("p-2.5 rounded-xl bg-white/5 border border-white/10 text-white/40", gradient.includes('neon-green') ? 'group-hover:text-neon-green' : (gradient.includes('neon-pink') ? 'group-hover:text-neon-pink' : 'group-hover:text-neon-blue'))}>
                    {icon}
                </div>
                <h2 className={cn("text-xl md:text-3xl font-black font-heading tracking-tighter uppercase italic bg-clip-text text-transparent bg-gradient-to-r pr-6", gradient)}>
                    {title}
                </h2>
            </div>
            <div className="flex-1 h-px bg-gradient-to-r from-white/10 via-white/5 to-transparent" />
        </div>
        <div className="relative group/section">
            <button 
                onClick={() => scrollContainer(`section-${title.replace(/\s+/g, '-').toLowerCase()}`, 'left')}
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 z-40 w-10 h-10 rounded-full bg-black/80 border border-white/10 flex items-center justify-center text-white lg:hidden opacity-100 transition-opacity"
            >
                <ChevronLeft size={20} />
            </button>
            <button 
                onClick={() => scrollContainer(`section-${title.replace(/\s+/g, '-').toLowerCase()}`, 'right')}
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 z-40 w-10 h-10 rounded-full bg-black/80 border border-white/10 flex items-center justify-center text-white lg:hidden opacity-100 transition-opacity"
            >
                <ChevronRight size={20} />
            </button>
            <div id={`section-${title.replace(/\s+/g, '-').toLowerCase()}`} className="flex overflow-x-auto lg:overflow-x-visible lg:grid lg:grid-cols-4 gap-4 md:gap-8 pb-12 md:pb-0 scrollbar-hide snap-x snap-mandatory -mx-4 px-4 md:mx-0 md:px-0">
                {React.Children.map(children, (child) => (
                    <motion.div 
                        whileHover={{ y: -5 }}
                        transition={{ type: "spring", stiffness: 400, damping: 10 }}
                        className="h-full w-full min-w-[280px] lg:min-w-0 snap-center"
                    >
                        {child}
                    </motion.div>
                ))}
            </div>
        </div>
    </section>
);

const ControlCard = ({ title, desc, icon: IconComponent, logo, color, link, count, isNew, isHidden, comingSoon }) => {
    const getGlowColor = () => {
        switch(color) {
            case 'neon-green': return 'bg-neon-green';
            case 'neon-blue': return 'bg-neon-blue';
            case 'neon-purple': return 'bg-neon-purple';
            case 'neon-pink': return 'bg-neon-pink';
            default: return 'bg-white';
        }
    };

    return (
        <Link to={(isHidden || comingSoon) ? '#' : (link || '#')} className={cn("group relative block h-full", (isHidden || comingSoon) && "pointer-events-none")}>
            {/* Glow Effect */}
            <div className={cn(
                "absolute inset-0 rounded-3xl md:rounded-[2.5rem] opacity-0 group-hover:opacity-20 transition-all duration-700 blur-2xl",
                getGlowColor()
            )} />
        
            <Card className={cn(
                "relative p-5 sm:p-8 md:p-10 h-full border-white/5 transition-all duration-500 rounded-3xl md:rounded-[2.5rem] flex flex-col items-center text-center group overflow-hidden border backdrop-blur-3xl",
                isHidden 
                    ? "bg-[#0a0a0a] opacity-40 grayscale" 
                    : (comingSoon ? "bg-zinc-900/60 opacity-60 grayscale border-white/5" : "bg-zinc-900/40 hover:bg-zinc-800/40 hover:border-white/10 shadow-2xl")
            )}>
                {/* New Signal */}
                {isNew && !isHidden && !comingSoon && (
                    <span className="absolute top-6 right-6 flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neon-blue opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-neon-blue"></span>
                        </span>
                        <span className="text-[7px] font-black uppercase tracking-[0.3em] text-neon-blue">Advanced</span>
                    </span>
                )}

                {comingSoon && !isHidden && (
                    <span className="absolute top-6 right-6 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[7px] font-black uppercase tracking-[0.3em] text-gray-500">
                        Coming Soon
                    </span>
                )}

                <div className={cn(
                    "w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-2xl md:rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 md:mb-8 group-hover:scale-110 group-hover:-rotate-3 transition-all duration-700 relative",
                    color === 'neon-green' ? 'text-[#39FF14]' : (color === 'neon-blue' ? 'text-[#00F0FF]' : (color === 'neon-purple' ? 'text-[#A855F7]' : (color === 'neon-pink' ? 'text-[#FF4F8B]' : (color === 'yellow-400' ? 'text-yellow-400' : 'text-white'))))
                )}>
                    <div className="absolute inset-0 bg-current opacity-0 group-hover:opacity-10 rounded-3xl blur-md transition-opacity" />
                    {logo ? (
                        <img src={logo} alt={title} className="w-10 h-10 md:w-14 md:h-14 object-contain relative z-10" />
                    ) : (
                        IconComponent && <IconComponent className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 relative z-10" />
                    )}
                </div>

                <h3 className="text-base sm:text-lg md:text-2xl font-black font-heading text-white mb-2 md:mb-3 tracking-tighter uppercase italic group-hover:text-neon-green transition-colors">{title}</h3>
                <p className="text-gray-500 text-[9px] md:text-[11px] font-bold leading-relaxed px-2 uppercase tracking-wide opacity-80 group-hover:opacity-100 transition-opacity">{desc}</p>
                
                {count !== undefined && (
                    <div className="mt-8 px-5 py-2 rounded-2xl bg-white/5 border border-white/5 text-[9px] font-black text-gray-400 uppercase tracking-[0.3em] group-hover:border-white/10 group-hover:bg-white/10 transition-all">
                        {count} ENTRIES
                    </div>
                )}
                
                <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/5 to-transparent group-hover:via-white/20 transition-all duration-700" />
            </Card>

            {isHidden && (
                <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
                    <div className="px-6 py-3 rounded-2xl bg-black/80 border border-red-500/30 backdrop-blur-md text-red-500 text-[10px] font-black uppercase tracking-[0.4em] shadow-2xl">
                        OFFLINE
                    </div>
                </div>
            )}
        </Link>
    );
};

const AuthSection = ({ email, setEmail, password, setPassword, isResetting, setIsResetting, isRegistering, setIsRegistering, handleLogin }) => (
    <div className="min-h-screen bg-[#020202] flex items-center justify-center px-4 relative overflow-hidden">
        {/* Cinematic Backdrop */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:40px_40px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-neon-pink/10 blur-[150px] rounded-full animate-pulse" />
        <div className="absolute top-[20%] right-[20%] w-[300px] h-[300px] bg-neon-blue/5 blur-[120px] rounded-full animate-pulse delay-1000" />
        
        <Card className="p-8 sm:p-12 w-full max-w-lg border-white/10 bg-zinc-900/40 backdrop-blur-3xl rounded-[2.5rem] sm:rounded-[3.5rem] relative z-10 shadow-[0_50px_100px_rgba(0,0,0,0.8)] overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-neon-pink to-transparent" />
            
            <div className="text-center mb-8 sm:mb-12">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-neon-pink/10 rounded-2xl sm:rounded-3xl flex items-center justify-center mx-auto mb-6 sm:mb-8 border border-neon-pink/20 relative group">
                    <div className="absolute inset-0 bg-neon-pink/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                    <Shield size={32} className="text-neon-pink relative z-10 sm:w-10 sm:h-10" />
                </div>
                <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black font-heading text-white uppercase tracking-tighter italic leading-none">
                    {isResetting ? 'RESTORE ACCESS' : (isRegistering ? 'NEW CLEARANCE' : 'SECURE LOGIN')}
                </h1>
                <p className="text-gray-500 text-[8px] sm:text-[10px] font-black uppercase tracking-[0.4em] mt-3 sm:mt-4">Command Staff Authorization Required</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6 sm:space-y-8">
                <div className="space-y-3">
                    <label className="text-[9px] sm:text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] pl-2">Identity Endpoint</label>
                    <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@newbi.live" className="h-14 sm:h-16 bg-black/40 border-white/5 focus:border-neon-pink/40 rounded-xl sm:rounded-2xl text-sm font-medium transition-all" required />
                </div>
                <div className="space-y-3">
                    <label className="text-[9px] sm:text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] pl-2">Security Key</label>
                    <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="h-14 sm:h-16 bg-black/40 border-white/5 focus:border-neon-pink/40 rounded-xl sm:rounded-2xl text-sm font-medium transition-all" required />
                </div>
                <Button type="submit" className="w-full h-14 sm:h-16 bg-neon-pink text-black font-black font-heading uppercase tracking-[0.2em] text-[10px] sm:text-xs rounded-xl sm:rounded-2xl hover:scale-[1.02] active:scale-98 transition-all shadow-[0_15px_40px_rgba(255,79,139,0.3)]">
                    {isRegistering ? 'INITIALIZE' : 'AUTHENTICATE'}
                </Button>
            </form>

            <div className="mt-12 flex justify-between items-center text-[10px] font-black uppercase tracking-[0.2em]">
                <button onClick={() => setIsResetting(!isResetting)} className="text-gray-600 hover:text-white transition-colors">LOST ACCESS?</button>
                <button onClick={() => setIsRegistering(!isRegistering)} className="text-neon-blue hover:underline underline-offset-8 decoration-2">{isRegistering ? 'BACK TO PORTAL' : 'REQUEST ENTRY'}</button>
            </div>
        </Card>
    </div>
);

const BootstrapAlert = ({ onClaim }) => (
    <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="mb-16 p-10 bg-gradient-to-r from-neon-green/10 via-black/40 to-black/60 border border-neon-green/30 rounded-[3rem] flex flex-col lg:flex-row items-center justify-between gap-10 backdrop-blur-3xl relative overflow-hidden shadow-2xl"
    >
        <div className="absolute inset-0 bg-neon-green/5 blur-[100px] pointer-events-none" />
        <div className="flex items-center gap-8 relative z-10">
            <div className="w-20 h-20 rounded-3xl bg-neon-green/20 text-neon-green flex items-center justify-center border border-neon-green/30 shadow-[0_0_30px_rgba(46,255,144,0.2)]">
                <Sparkles size={40} className="animate-pulse" />
            </div>
            <div>
                <h2 className="text-2xl md:text-3xl font-black font-heading text-white uppercase tracking-tighter italic">System Root Uninitialized</h2>
                <p className="text-gray-400 text-sm mt-2 font-medium uppercase tracking-widest">No primary administrator detected. Claim <span className="text-neon-green">SUPER_ADMIN</span> status to begin.</p>
            </div>
        </div>
        <Button onClick={onClaim} className="w-full lg:w-auto bg-white text-black font-black font-heading uppercase tracking-[0.2em] text-xs h-16 px-12 rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-[0_15px_40px_rgba(255,255,255,0.2)]">
            Initialize Authority
        </Button>
    </motion.div>
);

// --- Main Dashboard Component ---

const Dashboard = () => {
    const { 
        invoices, proposals, agreements, concerts, portfolio, announcements, user, 
        artists, clientRequests, upcomingEvents, ticketOrders,
        checkUserRole, logout, maintenanceState, archivePastEvents 
    } = useStore();
    const cards = maintenanceState?.features || {};
    
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [unreadCount, setUnreadCount] = useState(0);
    const [authLoading, setAuthLoading] = useState(true);
    const [isFirstRun, setIsFirstRun] = useState(false);
    const [isRegistering, setIsRegistering] = useState(false);
    const [isResetting, setIsResetting] = useState(false);

    useEffect(() => {
        if (user && (user.role === 'super_admin' || user.role === 'developer')) {
            archivePastEvents();
        }
    }, [user, archivePastEvents]);

    // Check if system is uninitialized
    useEffect(() => {
        const checkInit = async () => {
            if (!user) return;
            if (user.role === 'unauthorized') {
                const snapshot = await getDocs(collection(db, 'admins'));
                if (snapshot.empty) setIsFirstRun(true);
            }
        };
        checkInit();
    }, [user]);

    // Auth handling is now centralized in App.jsx and the store.
    useEffect(() => {
        setAuthLoading(false);
    }, []);

    // Message Count Listener
    useEffect(() => {
        if (!user) return;
        const q = query(collection(db, "messages"), where("status", "==", "new"));
        const unsubscribe = onSnapshot(q, (snapshot) => setUnreadCount(snapshot.size));
        return () => unsubscribe();
    }, [user]);

    const handleLogin = async (e) => {
        e.preventDefault();
        try { await signInWithEmailAndPassword(auth, email, password); } 
        catch (error) { useStore.getState().addToast("Couldn't sign in. Please check your email and password.", 'error'); }
    };

    const handleClaimOwnership = async () => {
        if (!user) return;
        try {
            await addDoc(collection(db, 'admins'), {
                email: user.email,
                role: 'super_admin',
                addedBy: 'SYSTEM_BOOTSTRAP',
                createdAt: new Date().toISOString()
            });
            useStore.getState().addToast("You're now the admin!", 'success');
            checkUserRole(user);
            setIsFirstRun(false);
        } catch (error) { useStore.getState().addToast("Something went wrong. Please try again.", 'error'); }
    };

    const stats = [
        { 
            label: 'Artistant Hub', 
            value: artists?.length || 0, 
            icon: Users, color: 'neon-blue', detail: `${clientRequests?.filter(r => r.status === 'pending').length || 0} Pending Requests`, link: '/admin/artistant' 
        },
        { 
            label: 'Ticketing Ops', 
            value: upcomingEvents?.filter(e => e.isTicketed).length || 0, 
            icon: Ticket, color: 'neon-pink', detail: `${ticketOrders?.filter(o => o.status === 'pending').length || 0} Pending Verifications`, link: '/admin/ticketing' 
        },
        { 
            label: 'Settlements', 
            value: invoices.length, 
            icon: DollarSign, color: 'neon-green', detail: `Total Revenue Pipeline`, link: '/admin/invoices' 
        },
        { 
            label: 'Active Briefs', 
            value: (proposals?.length || 0) + (agreements?.length || 0), 
            icon: FileSpreadsheet, color: 'neon-purple', detail: 'Combined Contracts', link: '/admin/proposals' 
        },
    ];

    if (authLoading) return (
        <div className="min-h-screen bg-black flex items-center justify-center">
            <LoadingSpinner size="lg" color="#2bd93e" />
        </div>
    );

    if (!user) return <AuthSection email={email} setEmail={setEmail} password={password} setPassword={setPassword} isResetting={isResetting} setIsResetting={setIsResetting} isRegistering={isRegistering} setIsRegistering={setIsRegistering} handleLogin={handleLogin} />;

    return (
        <div className="min-h-screen bg-[#020202] text-white overflow-x-hidden pb-32 selection:bg-neon-green selection:text-black">
            {/* Cinematic Background Atmosphere */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:60px_60px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-neon-green/10 rounded-full blur-[180px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-neon-blue/10 rounded-full blur-[180px] animate-pulse delay-1000" />
                <div className="absolute top-[20%] right-[-5%] w-[30%] h-[30%] bg-neon-pink/10 rounded-full blur-[150px] animate-pulse delay-700" />
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>
            </div>

            <div className="relative z-10 max-w-[1500px] mx-auto px-4 md:px-10 pt-32 md:pt-48">
                {/* Advanced Command Header */}
                <header className="flex flex-col xl:flex-row justify-between items-start xl:items-end mb-10 md:mb-24 gap-8 md:gap-12 relative">
                    <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="space-y-4 md:space-y-6 max-w-full"
                    >
                        <div className="flex items-center gap-4">
                            <div className="p-3 md:p-4 rounded-2xl md:rounded-[1.8rem] bg-white/5 border border-white/10 backdrop-blur-2xl shadow-2xl relative group">
                                <div className="absolute inset-0 bg-neon-green/20 rounded-[1.8rem] blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                                <LayoutDashboard className="text-neon-green relative z-10 w-6 h-6 md:w-8 md:h-8" />
                            </div>
                            <div className="h-10 w-px bg-white/10 mx-2 hidden sm:block" />
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-neon-green uppercase tracking-[0.4em] mb-1">Central Command</span>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
                                    <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">System Active</span>
                                </div>
                            </div>
                        </div>

                        <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black font-heading tracking-tighter uppercase italic leading-tight">
                            OPERATIONS <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-green via-white to-neon-blue">DASHBOARD.</span>
                        </h1>

                        <p className="text-gray-500 text-[9px] md:text-xs font-black uppercase tracking-[0.3em] flex flex-wrap items-center gap-2 md:gap-3">
                            Internal Management Interface <span className="text-white/20 hidden sm:inline">|</span> 
                            <span className="text-neon-blue bg-neon-blue/10 px-3 py-1 rounded-full border border-neon-blue/20">{user.role?.replace('_', ' ')} CLEARANCE</span>
                            {maintenanceState.global && (
                                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 text-red-500 border border-red-500/20 animate-pulse">
                                    <Shield size={12} /> GLOBAL OVERRIDE
                                </span>
                            )}
                        </p>
                    </motion.div>

                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex items-center gap-2 bg-[#0a0a0a]/60 border border-white/10 p-2 rounded-[2.5rem] backdrop-blur-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] self-start xl:self-auto"
                    >
                        <div className="flex items-center gap-1">
                            {user.role === 'developer' && (
                                <Link to="/admin/system-command" className="p-3.5 hover:bg-white/10 rounded-2xl transition-all group relative overflow-hidden">
                                    <Settings size={20} className="text-gray-400 group-hover:text-white transition-colors relative z-10" />
                                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                </Link>
                            )}
                            <Link to="/admin/messages" className="p-3.5 hover:bg-white/10 rounded-2xl transition-all relative group overflow-hidden">
                                <Bell size={20} className="text-gray-400 group-hover:text-white transition-colors relative z-10" />
                                {unreadCount > 0 && <span className="absolute top-3 right-3 w-2 h-2 bg-neon-pink rounded-full shadow-[0_0_15px_rgba(255,0,255,0.6)] z-20 animate-pulse" />}
                            </Link>
                        </div>
                        <div className="h-10 w-px bg-white/10 mx-2" />
                        <div className="flex items-center gap-3 md:gap-4 pl-1 pr-4 py-1">
                            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-gradient-to-br from-zinc-800 to-black border border-white/10 flex items-center justify-center relative overflow-hidden group shadow-xl">
                                <div className="absolute inset-0 bg-neon-green opacity-0 group-hover:opacity-20 transition-opacity" />
                                <span className="font-black text-base md:text-lg uppercase text-neon-green relative z-10 group-hover:scale-110 transition-transform">{user.email?.[0]}</span>
                            </div>
                            <div className="hidden sm:block text-left">
                                <p className="text-sm font-black text-white leading-none capitalize mb-1">{user.displayName || 'Security Lead'}</p>
                                <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest truncate max-w-[150px]">{user.email}</p>
                            </div>
                            <button onClick={logout} className="ml-1 md:ml-2 p-2.5 md:p-3.5 bg-red-500/5 hover:bg-red-500 text-gray-500 hover:text-white border border-red-500/10 rounded-xl md:rounded-2xl transition-all flex items-center justify-center group">
                                <LogOut size={16} md={18} className="group-hover:rotate-12 transition-transform" />
                            </button>
                        </div>
                    </motion.div>
                </header>

                {isFirstRun && <BootstrapAlert onClaim={handleClaimOwnership} />}

                {/* Metrics Hub Readouts - Optimized for Mobile Horizontal Scroll */}
                <div className="relative group/metrics mb-16 md:mb-24">
                    <button 
                        onClick={() => scrollContainer('metrics-hub', 'left')}
                        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 z-40 w-10 h-10 rounded-full bg-black/80 border border-white/10 flex items-center justify-center text-white md:hidden opacity-100 transition-opacity"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <button 
                        onClick={() => scrollContainer('metrics-hub', 'right')}
                        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 z-40 w-10 h-10 rounded-full bg-black/80 border border-white/10 flex items-center justify-center text-white md:hidden opacity-100 transition-opacity"
                    >
                        <ChevronRight size={20} />
                    </button>
                    <div id="metrics-hub" className="flex overflow-x-auto lg:overflow-x-visible md:grid md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 pb-6 md:pb-0 scrollbar-hide snap-x snap-mandatory -mx-4 px-4 md:mx-0 md:px-0">
                    {stats.map((stat, i) => (
                        <motion.div
                            key={stat.label}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="group relative min-w-[85vw] md:min-w-0 snap-center"
                        >
                            <Link to={stat.link}>
                                <div className={cn("absolute -inset-px rounded-3xl md:rounded-[2.5rem] opacity-0 group-hover:opacity-20 transition-opacity blur-xl bg-gradient-to-br", 
                                    stat.color === 'neon-green' ? 'from-neon-green to-emerald-500' : 
                                    (stat.color === 'neon-blue' ? 'from-neon-blue to-cyan-500' : 
                                    (stat.color === 'neon-purple' ? 'from-neon-purple to-indigo-500' : 
                                    (stat.color === 'neon-pink' ? 'from-neon-pink to-purple-500' : 'from-yellow-400 to-orange-500')))
                                )} />
                                <Card className="p-6 md:p-8 h-full bg-zinc-900/40 backdrop-blur-3xl border-white/5 hover:border-white/10 transition-all rounded-3xl md:rounded-[2.5rem] flex flex-col justify-between overflow-hidden shadow-2xl">
                                    <div className="flex items-start justify-between mb-8">
                                        <div className={cn("p-4 rounded-2xl bg-white/5 border border-white/10 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500", 
                                            stat.color === 'neon-green' ? 'text-neon-green' : (stat.color === 'neon-blue' ? 'text-neon-blue' : (stat.color === 'neon-purple' ? 'text-neon-purple' : (stat.color === 'neon-pink' ? 'text-neon-pink' : 'text-yellow-400')))
                                        )}>
                                            <stat.icon size={24} />
                                        </div>

                                    </div>
                                    <div>
                                        <h3 className="text-3xl md:text-5xl font-black font-heading tracking-tighter text-white mb-2 leading-none uppercase italic">{stat.value}</h3>
                                        <p className="text-gray-500 text-[9px] font-black uppercase tracking-[0.3em]">{stat.label}</p>
                                        <div className="mt-6 pt-6 border-t border-white/5 flex items-center justify-between">
                                            <p className="text-gray-600 text-[9px] font-bold uppercase tracking-widest">{stat.detail}</p>
                                        </div>
                                    </div>
                                    <div className="absolute top-0 right-0 p-8 opacity-0 group-hover:opacity-[0.05] transition-opacity pointer-events-none transform translate-x-4 -translate-y-4">
                                        <stat.icon size={160} />
                                    </div>
                                </Card>
                            </Link>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Operational Modules */}
            <div className="space-y-32">
                    {user?.role !== 'scanner' && (
                        <DashboardSection title="Finance & Strategic Assets" gradient="from-neon-green via-neon-blue to-white" icon={<TrendingUp size={20} />}>
                            <ControlCard title="Invoices" desc="Financial tracking and settlement logs." icon={FileText} color="neon-blue" link="/admin/invoices" count={invoices.length} isHidden={cards.invoices} />
                            <ControlCard title="Proposal Vault" desc="Strategic quotations and client dossiers." icon={FileSpreadsheet} color="neon-green" link="/admin/proposals" count={proposals?.length || 0} isHidden={cards.docs} />
                            <ControlCard title="Contracts" desc="Legal MOU and contract generator." icon={Scale} color="neon-purple" link="/admin/agreements" count={agreements?.length || 0} isHidden={cards.docs} />
                        </DashboardSection>
                    )}

                    {user?.role !== 'scanner' && (
                        <DashboardSection title="Core Content Infrastructure" gradient="from-neon-pink via-purple-500 to-white" icon={<LayoutDashboard size={20} />}>
                            <ControlCard title="Upcoming" desc="Primary event queue for the live system." icon={Calendar} color="neon-green" link="/admin/upcoming-events" isHidden={cards.upcoming_events} />
                            <ControlCard title="Announcements" desc="System broadcasts and site-wide news." icon={Radio} color="neon-pink" link="/admin/announcements" isHidden={cards.blog_announcements} />
                            <ControlCard title="Blog" desc="Public-facing thought leadership logs." icon={FileText} color="neon-blue" link="/admin/blog" isNew isHidden={cards.blog_announcements} />
                            <ControlCard title="Portfolio" desc="Concert catalogue and past event archive." icon={Music} color="neon-purple" link="/admin/concertzone" count={portfolio?.length || 0} isHidden={cards.concerts} />
                        </DashboardSection>
                    )}

                    <DashboardSection title="Event & Ticketing Operations" gradient="from-yellow-400 via-neon-green to-white" icon={<Ticket size={20} />}>
                        <ControlCard title="Ticketing Ops" desc="Sales, UPI Verification & Offline Sync." icon={Ticket} color="neon-green" link="/admin/ticketing" isNew isHidden={cards.ticketing} />
                        <ControlCard title="QR Scanner" desc="Gate entry validation system." icon={Zap} color="yellow-400" link="/admin/scanner" isNew isHidden={cards.ticketing} />
                    </DashboardSection>

                    {user?.role !== 'scanner' && (
                        <DashboardSection title="Personnel & Community Ops" gradient="from-neon-blue via-neon-green to-white" icon={<Users size={20} />}>
                            <ControlCard title="Community Hub" desc="Volunteer coordination and gig ops." icon={Users} color="neon-green" link="/admin/volunteer-gigs" isHidden={cards.community} />
                            <ControlCard title="Creator Studio" desc="Influencer validation and mission management." icon={Star} color="neon-blue" link="/admin/creators" isHidden={cards.influencer} />
                            <ControlCard title="Giveaways" desc="Viral engagement and reward distribution." icon={Gift} color="purple-500" link="/admin/giveaways" isNew isHidden={cards.giveaways} />
                            <ControlCard title="Artistant" desc="Artist roster and client onboarding hub." logo={artistantLogo} color="neon-blue" link="/admin/artistant" isNew isHidden={cards.artists} />
                            <ControlCard title="Mailing" desc="Mass communication and broadcast logs." icon={Megaphone} color="neon-blue" link="/admin/mailing" isNew isHidden={cards.mailing} />
                            {user.role !== 'editor' && (
                                <ControlCard title="Members" desc="Security clearance and administrative roles." icon={Shield} color="neon-blue" link="/admin/manage-admins" isHidden={cards.admins} />
                            )}
                            <ControlCard title="Inbox" desc="External queries and mission requests." icon={Mail} color="white" link="/admin/messages" count={unreadCount} isHidden={cards.messages} />
                        </DashboardSection>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
