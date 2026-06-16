import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import IndianRupee from 'lucide-react/dist/esm/icons/indian-rupee';
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
import FolderOpen from 'lucide-react/dist/esm/icons/folder-open';
import Briefcase from 'lucide-react/dist/esm/icons/briefcase';
import ChevronLeft from 'lucide-react/dist/esm/icons/chevron-left';
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right';
import Menu from 'lucide-react/dist/esm/icons/menu';
import X from 'lucide-react/dist/esm/icons/x';
import Compass from 'lucide-react/dist/esm/icons/compass';

import { collection, query, where, onSnapshot, getDocs, addDoc } from 'firebase/firestore';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, sendPasswordResetEmail, signInWithPopup } from 'firebase/auth';
import { db, auth, googleProvider } from '../../lib/firebase';
import { useStore } from '../../lib/store';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import AdminCarousel from '../../components/admin/AdminCarousel';
import { cn } from '../../lib/utils';
import GlobalLoader from '../../components/ui/GlobalLoader';
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
    <section className="relative mb-12">
        <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6 md:mb-12">
            <div className="flex items-center gap-4">
                <div className={cn("p-2.5 rounded-xl bg-white/5 border border-white/10 text-white/40 transition-colors duration-500", gradient.includes('neon-green') ? 'group-hover:text-neon-green' : (gradient.includes('neon-pink') ? 'group-hover:text-neon-pink' : 'group-hover:text-neon-blue'))}>
                    {icon}
                </div>
                <h2 className={cn("text-xl md:text-3xl font-extrabold font-heading tracking-tight bg-clip-text text-transparent bg-gradient-to-r pr-6", gradient)}>
                    {title}
                </h2>
            </div>
            <div className="flex-1 h-px bg-gradient-to-r from-white/10 via-white/5 to-transparent" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-8">
            {React.Children.map(children, (child) => (
                <motion.div 
                    whileHover={{ y: -5 }}
                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                    className="h-full w-full flex flex-col items-stretch"
                >
                    {child}
                </motion.div>
            ))}
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

    const getBorderHoverColor = () => {
        switch(color) {
            case 'neon-green': return 'group-hover:border-neon-green/30';
            case 'neon-blue': return 'group-hover:border-neon-blue/30';
            case 'neon-purple': return 'group-hover:border-neon-purple/30';
            case 'neon-pink': return 'group-hover:border-neon-pink/30';
            case 'yellow-400': return 'group-hover:border-yellow-400/30';
            default: return 'group-hover:border-white/20';
        }
    };

    return (
        <Link to={(isHidden || comingSoon) ? '#' : (link || '#')} className={cn("group relative flex flex-col h-full", (isHidden || comingSoon) && "pointer-events-none")}>
            {/* Glow Effect */}
            <div className={cn(
                "absolute inset-0 rounded-2xl md:rounded-3xl opacity-0 group-hover:opacity-15 transition-all duration-700 blur-2xl",
                getGlowColor()
            )} />
        
            <div className={cn(
                "relative p-4 sm:p-6 md:p-10 w-full flex-1 border transition-all duration-500 rounded-2xl md:rounded-3xl flex flex-col items-center text-center group overflow-hidden backdrop-blur-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] select-none",
                isHidden 
                    ? "bg-black/40 border-white/5 opacity-40 grayscale" 
                    : (comingSoon 
                        ? "bg-zinc-950/20 border-white/5 opacity-60 grayscale border-white/5" 
                        : cn("bg-zinc-950/35 border-white/[0.08] hover:bg-zinc-950/50", getBorderHoverColor()))
            )}>

                {comingSoon && !isHidden && (
                    <span className="absolute top-3 right-3 md:top-6 md:right-6 px-2 py-0.5 md:px-3 md:py-1 bg-white/5 border border-white/10 rounded-full text-[6px] md:text-[7px] font-black uppercase tracking-[0.3em] text-gray-500">
                        Soon
                    </span>
                )}

                <div className={cn(
                    "w-10 h-10 sm:w-14 sm:h-14 md:w-20 md:h-20 rounded-xl md:rounded-3xl border flex items-center justify-center mb-3 md:mb-8 group-hover:scale-110 group-hover:-rotate-3 transition-all duration-700 relative",
                    color === 'neon-green' ? 'bg-[#39FF14]/5 border-[#39FF14]/10 text-[#39FF14] group-hover:border-[#39FF14]/30' : 
                    (color === 'neon-blue' ? 'bg-[#00F0FF]/5 border-[#00F0FF]/10 text-[#00F0FF] group-hover:border-[#00F0FF]/30' : 
                    (color === 'neon-purple' ? 'bg-[#A855F7]/5 border-[#A855F7]/10 text-[#A855F7] group-hover:border-[#A855F7]/30' : 
                    (color === 'neon-pink' ? 'bg-[#FF4F8B]/5 border-[#FF4F8B]/10 text-[#FF4F8B] group-hover:border-[#FF4F8B]/30' : 
                    (color === 'yellow-400' ? 'bg-yellow-400/5 border-yellow-400/10 text-yellow-400 group-hover:border-yellow-400/30' : 
                    'bg-white/5 border-white/10 text-white group-hover:border-white/20'))))
                )}>
                    <div className="absolute inset-0 bg-current opacity-0 group-hover:opacity-10 rounded-xl md:rounded-3xl blur-md transition-opacity" />
                    {logo ? (
                        <img src={logo} alt={title} className="w-6 h-6 md:w-14 md:h-14 object-contain relative z-10" />
                    ) : (
                        IconComponent && <IconComponent className="w-5 h-5 sm:w-6 sm:h-6 md:w-10 md:h-10 relative z-10" />
                    )}
                </div>

                <h3 className="text-sm sm:text-base md:text-xl font-extrabold font-heading text-white mb-1 md:mb-3 tracking-tight group-hover:text-neon-green transition-colors">{title}</h3>
                
                <p className="text-gray-500 text-[8px] md:text-[11px] font-bold leading-relaxed px-1 md:px-2 uppercase tracking-wide opacity-0 max-h-0 md:opacity-80 md:max-h-20 md:group-hover:opacity-100 group-active:opacity-100 group-active:max-h-20 overflow-hidden transition-all duration-300">{desc}</p>
                
                {count !== undefined && (
                    <div className="mt-2 md:mt-8 px-3 py-1 md:px-5 md:py-2 rounded-xl md:rounded-2xl bg-white/5 border border-white/5 text-[7px] md:text-[9px] font-black text-gray-400 uppercase tracking-[0.3em] group-hover:border-white/10 group-hover:bg-white/10 transition-all">
                        {count} <span className="hidden md:inline">ENTRIES</span>
                    </div>
                )}
                
                <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/5 to-transparent group-hover:via-white/20 transition-all duration-700" />
            </div>

            {isHidden && (
                <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
                    <div className="px-4 py-2 md:px-6 md:py-3 rounded-xl md:rounded-2xl bg-black/80 border border-red-500/30 backdrop-blur-md text-red-500 text-[8px] md:text-[10px] font-black uppercase tracking-[0.4em] shadow-2xl">
                        OFFLINE
                    </div>
                </div>
            )}
        </Link>
    );
};

const AuthSection = ({ email, setEmail, password, setPassword, isResetting, setIsResetting, isRegistering, setIsRegistering, handleLogin }) => (
    <div className="min-h-screen bg-dark flex items-center justify-center px-4 relative overflow-hidden">
        {/* Cinematic Backdrop */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:40px_40px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-neon-pink/10 blur-[150px] rounded-full animate-pulse" />
        <div className="absolute top-[20%] right-[20%] w-[300px] h-[300px] bg-neon-blue/5 blur-[120px] rounded-full animate-pulse delay-1000" />
        
        <div className="p-8 sm:p-12 w-full max-w-lg border border-white/5 bg-zinc-950/35 backdrop-blur-3xl rounded-3xl relative z-10 shadow-[0_50px_100px_rgba(0,0,0,0.9)] overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-neon-pink to-transparent" />
            
            <div className="text-center mb-8 sm:mb-12">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-neon-pink/10 rounded-2xl sm:rounded-3xl flex items-center justify-center mx-auto mb-6 sm:mb-8 border border-neon-pink/20 relative group">
                    <div className="absolute inset-0 bg-neon-pink/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                    <Shield size={32} className="text-neon-pink relative z-10 sm:w-10 sm:h-10" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-white tracking-tight leading-none">
                    {isResetting ? 'Recover Password' : (isRegistering ? 'Register Admin' : 'Admin Login')}
                </h1>
                <p className="text-gray-500 text-[8px] sm:text-[10px] font-black uppercase tracking-[0.4em] mt-3 sm:mt-4">Authorized Administrator Access Only</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6 sm:space-y-8">
                <div className="space-y-3">
                    <label className="text-[9px] sm:text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] pl-2">Email Address</label>
                    <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@newbi.live" className="h-14 sm:h-16 bg-black/40 border border-white/5 focus:border-neon-pink/40 rounded-xl sm:rounded-2xl text-sm font-medium transition-all" required />
                </div>
                <div className="space-y-3">
                    <label className="text-[9px] sm:text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] pl-2">Password</label>
                    <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="h-14 sm:h-16 bg-black/40 border-white/5 focus:border-neon-pink/40 rounded-xl sm:rounded-2xl text-sm font-medium transition-all" required />
                </div>
                <Button type="submit" className="w-full h-14 sm:h-16 bg-neon-pink text-black font-black font-heading uppercase tracking-[0.2em] text-[10px] sm:text-xs rounded-xl sm:rounded-2xl hover:scale-[1.02] active:scale-98 transition-all shadow-[0_15px_40px_rgba(255,79,139,0.3)]">
                    {isRegistering ? 'REGISTER' : 'SIGN IN'}
                </Button>
            </form>

            <div className="mt-12 flex justify-between items-center text-[10px] font-black uppercase tracking-[0.2em]">
                <button onClick={() => setIsResetting(!isResetting)} className="text-gray-600 hover:text-white transition-colors">FORGOT PASSWORD?</button>
                <button onClick={() => setIsRegistering(!isRegistering)} className="text-neon-blue hover:underline underline-offset-8 decoration-2">{isRegistering ? 'BACK TO LOGIN' : 'REQUEST ACCESS'}</button>
            </div>
        </div>
    </div>
);

const BootstrapAlert = ({ onClaim }) => (
    <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="mb-16 p-10 bg-gradient-to-r from-neon-green/10 via-black/40 to-black/60 border border-neon-green/30 rounded-3xl flex flex-col lg:flex-row items-center justify-between gap-10 backdrop-blur-3xl relative overflow-hidden shadow-2xl"
    >
        <div className="absolute inset-0 bg-neon-green/5 blur-[100px] pointer-events-none" />
        <div className="flex items-center gap-8 relative z-10">
            <div className="w-20 h-20 rounded-3xl bg-neon-green/20 text-neon-green flex items-center justify-center border border-neon-green/30 shadow-[0_0_30px_rgba(46,255,144,0.2)]">
                <Sparkles size={40} className="animate-pulse" />
            </div>
            <div>
                <h2 className="text-2xl md:text-3xl font-extrabold font-heading text-white tracking-tight">System Uninitialized</h2>
                <p className="text-gray-400 text-sm mt-2 font-medium uppercase tracking-widest">No primary administrator detected. Register as <span className="text-neon-green">Super Admin</span> to begin.</p>
            </div>
        </div>
        <Button onClick={onClaim} className="w-full lg:w-auto bg-white text-black font-black font-heading uppercase tracking-[0.2em] text-xs h-16 px-12 rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-[0_15px_40px_rgba(255,255,255,0.2)]">
            Setup Super Admin
        </Button>
    </motion.div>
);


// --- Main Dashboard Component ---

const Dashboard = () => {
    const { 
        invoices, spends, otherIncomes, proposals, agreements, concerts, portfolio, announcements, user, 
        artists, clientRequests, upcomingEvents, ticketOrders, documents,
        checkUserRole, maintenanceState, archivePastEvents 
    } = useStore();
    const cards = maintenanceState?.features || {};
    const location = useLocation();
    
    const sections = [
        {
            title: "Finance & Strategic Assets",
            color: "text-neon-green",
            visible: user?.role !== 'scanner' && user?.role !== 'gate_manager' && user?.role !== 'blog_writer',
            links: [
                { name: "Finance Board", path: "/admin/finance", icon: TrendingUp, color: "neon-green", show: ['developer', 'founder'].includes(user?.role) && !cards.invoices },
                { name: "Invoices", path: "/admin/invoices", icon: FileText, color: "neon-blue", show: ['developer', 'founder'].includes(user?.role) && !cards.invoices },
                { name: "Proposals", path: "/admin/proposals", icon: FileSpreadsheet, color: "neon-green", show: !cards.docs },
                { name: "Contracts", path: "/admin/agreements", icon: Scale, color: "neon-purple", show: !cards.docs },
                { name: "Documents", path: "/admin/documents", icon: FolderOpen, color: "neon-blue", show: true }
            ]
        },
        {
            title: "Core Content Infrastructure",
            color: "text-neon-pink",
            visible: user?.role !== 'scanner' && user?.role !== 'gate_manager',
            links: [
                { name: "Upcoming", path: "/admin/upcoming-events", icon: Calendar, color: "neon-green", show: !cards.upcoming_events },
                { name: "Announcements", path: "/admin/announcements", icon: Radio, color: "neon-pink", show: !cards.blog_announcements },
                { name: "Blog", path: "/admin/blog", icon: FileText, color: "neon-blue", show: !cards.blog_announcements },
                { name: "Portfolio", path: "/admin/concertzone", icon: Music, color: "neon-purple", show: !cards.concerts }
            ]
        },
        {
            title: "Event & Ticketing Operations",
            color: "text-yellow-400",
            visible: true,
            links: [
                { name: "Ticketing Ops", path: "/admin/ticketing", icon: Ticket, color: "neon-green", show: !cards.ticketing },
                { name: "QR Scanner", path: "/admin/scanner", icon: Zap, color: "yellow-400", show: !cards.ticketing }
            ]
        },
        {
            title: "Personnel & Community Ops",
            color: "text-neon-blue",
            visible: user?.role !== 'scanner' && user?.role !== 'gate_manager' && user?.role !== 'blog_writer',
            links: [
                { name: "Community Hub", path: "/admin/volunteer-gigs", icon: Users, color: "neon-green", show: !cards.community },
                { name: "Creator Studio", path: "/admin/creators", icon: Star, color: "neon-blue", show: !cards.influencer },
                { name: "Giveaways", path: "/admin/giveaways", icon: Gift, color: "neon-purple", show: !cards.giveaways },
                { name: "Artistant", path: "/admin/artistant", icon: Music, color: "neon-blue", show: !cards.artists },
                { name: "Mailing", path: "/admin/mailing", icon: Megaphone, color: "neon-blue", show: !cards.mailing },
                { name: "Members", path: "/admin/manage-admins", icon: Shield, color: "neon-blue", show: user?.role !== 'editor' && user?.role !== 'content_admin' && user?.role !== 'blog_writer' && !cards.admins },
                { name: "Inbox", path: "/admin/messages", icon: Mail, color: "white", show: !cards.messages }
            ]
        }
    ];
    
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [unreadCount, setUnreadCount] = useState(0);
    const [authLoading, setAuthLoading] = useState(true);
    const [isFirstRun, setIsFirstRun] = useState(false);
    const [isRegistering, setIsRegistering] = useState(false);
    const [isResetting, setIsResetting] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    useEffect(() => {
        if (user && (user.role === 'super_admin' || user.role === 'developer' || user.role === 'founder')) {
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

    const totalPaidRevenue = (invoices || [])
        .filter(inv => inv.status === 'Paid')
        .reduce((sum, inv) => sum + Number(inv.total || inv.amount || 0), 0) +
        (otherIncomes || [])
        .filter(inc => inc.status === 'Paid')
        .reduce((sum, inc) => sum + Number(inc.amount || 0), 0);

    const totalPaidExpenses = (spends || [])
        .filter(sp => sp.status === 'Paid' || sp.status === 'Cleared')
        .reduce((sum, sp) => sum + Number(sp.amount || 0), 0);

    const netCashFlow = totalPaidRevenue - totalPaidExpenses;

    const pendingArtistRequests = (clientRequests || [])
        .filter(r => r.status === 'pending').length;

    const ticketSalesAmount = (ticketOrders || [])
        .filter(o => o.status === 'approved' || o.status === 'dispatched')
        .reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);

    const ticketSalesCount = (ticketOrders || [])
        .filter(o => o.status === 'approved' || o.status === 'dispatched')
        .length;

    const stats = [
        { 
            label: 'Artist Roster', 
            value: artists?.length || 0, 
            icon: Users, 
            color: 'neon-blue', 
            detail: `${pendingArtistRequests} Pending Onboarding Requests`, 
            link: '/admin/artistant' 
        },
        { 
            label: 'Ticket Sales', 
            value: ticketSalesCount, 
            icon: Ticket, 
            color: 'neon-pink', 
            detail: ['developer', 'founder'].includes(user?.role) ? `₹${ticketSalesAmount.toLocaleString('en-IN')} Ticketing Revenue` : `${ticketSalesCount} Tickets Sold`, 
            link: '/admin/ticketing' 
        },
        ...(['developer', 'founder'].includes(user?.role) ? [{ 
            label: 'Total Revenue', 
            value: `₹${totalPaidRevenue.toLocaleString('en-IN')}`, 
            icon: IndianRupee, 
            color: 'neon-green', 
            detail: `Net Cash Flow: ₹${netCashFlow.toLocaleString('en-IN')}`, 
            link: '/admin/finance' 
        }] : []),
        { 
            label: 'Contracts & Proposals', 
            value: (proposals?.length || 0) + (agreements?.length || 0), 
            icon: FileSpreadsheet, 
            color: 'neon-purple', 
            detail: `${proposals?.length || 0} Proposals | ${agreements?.length || 0} Contracts`, 
            link: '/admin/proposals' 
        },
    ];

    if (authLoading) return <GlobalLoader color="#00F0FF" />;

    if (!user) return <AuthSection email={email} setEmail={setEmail} password={password} setPassword={setPassword} isResetting={isResetting} setIsResetting={setIsResetting} isRegistering={isRegistering} setIsRegistering={setIsRegistering} handleLogin={handleLogin} />;

    return (
        <div className="min-h-screen bg-dark text-white overflow-x-hidden pb-32 selection:bg-neon-green selection:text-black">
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
                        <h1 className="text-2xl sm:text-3xl md:text-5xl font-extrabold font-heading tracking-tight leading-tight">
                            ADMIN <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-green via-white to-neon-blue">DASHBOARD.</span>
                        </h1>

                        <p className="text-gray-500 text-[9px] md:text-xs font-black uppercase tracking-[0.3em] flex flex-wrap items-center gap-2 md:gap-3">
                            Administrative Access Panel <span className="text-white/20 hidden sm:inline">|</span> 
                            <span className="text-neon-blue bg-neon-blue/10 px-3 py-1 rounded-full border border-neon-blue/20">{user.role?.replace('_', ' ').toUpperCase()} ROLE</span>
                            {maintenanceState.global && (
                                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 text-red-500 border border-red-500/20 animate-pulse">
                                    <Shield size={12} /> MAINTENANCE MODE
                                </span>
                            )}
                        </p>
                    </motion.div>

                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex items-center bg-[#0a0a0a]/60 border border-white/10 p-1.5 rounded-2xl backdrop-blur-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] self-start xl:self-auto"
                    >
                        <div className="flex items-center gap-1">
                            {user.role === 'developer' && (
                                <Link to="/admin/system-command" className="p-3 hover:bg-white/10 rounded-xl transition-all group relative overflow-hidden">
                                    <Settings size={20} className="text-gray-400 group-hover:text-white transition-colors relative z-10" />
                                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                </Link>
                            )}
                            <Link to="/admin/messages" className="p-3 hover:bg-white/10 rounded-xl transition-all relative group overflow-hidden">
                                <Bell size={20} className="text-gray-400 group-hover:text-white transition-colors relative z-10" />
                                {unreadCount > 0 && <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-neon-pink rounded-full shadow-[0_0_15px_rgba(255,0,255,0.6)] z-20 animate-pulse" />}
                            </Link>
                        </div>
                    </motion.div>
                </header>

                {isFirstRun && <BootstrapAlert onClaim={handleClaimOwnership} />}

                {/* Metrics Hub Readouts - Optimized for Mobile Horizontal Scroll */}
                <div className="relative mb-16 md:mb-24">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                    {stats.map((stat, i) => {
                        const hoverBorder = stat.color === 'neon-green' ? 'group-hover:border-neon-green/30' :
                                            (stat.color === 'neon-blue' ? 'group-hover:border-neon-blue/30' :
                                            (stat.color === 'neon-pink' ? 'group-hover:border-neon-pink/30' :
                                            (stat.color === 'neon-purple' ? 'group-hover:border-neon-purple/30' : 'group-hover:border-yellow-400/30')));
                        return (
                            <motion.div
                                key={stat.label}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1 }}
                                className="group relative w-full flex flex-col items-stretch"
                            >
                                <Link to={stat.link} className="block h-full w-full flex flex-col items-stretch">
                                    <div className={cn("absolute -inset-px rounded-3xl opacity-0 group-hover:opacity-15 transition-opacity blur-xl bg-gradient-to-br", 
                                        stat.color === 'neon-green' ? 'from-neon-green to-emerald-500' : 
                                        (stat.color === 'neon-blue' ? 'from-neon-blue to-cyan-500' : 
                                        (stat.color === 'neon-purple' ? 'from-neon-purple to-indigo-500' : 
                                        (stat.color === 'neon-pink' ? 'from-neon-pink to-purple-500' : 'from-yellow-400 to-orange-500')))
                                    )} />
                                    <div className={cn(
                                        "p-6 md:p-8 h-full bg-zinc-950/35 backdrop-blur-3xl border border-white/5 transition-all duration-500 rounded-3xl flex flex-col justify-between overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)]",
                                        hoverBorder
                                    )}>
                                        <div className="flex items-start justify-between mb-8">
                                            <div className={cn("p-4 rounded-2xl border flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-500", 
                                                stat.color === 'neon-green' ? 'text-[#39FF14] bg-[#39FF14]/5 border-[#39FF14]/10 group-hover:border-[#39FF14]/30' : 
                                                (stat.color === 'neon-blue' ? 'text-[#00F0FF] bg-[#00F0FF]/5 border-[#00F0FF]/10 group-hover:border-[#00F0FF]/30' : 
                                                (stat.color === 'neon-purple' ? 'text-[#A855F7] bg-[#A855F7]/5 border-[#A855F7]/10 group-hover:border-[#A855F7]/30' : 
                                                (stat.color === 'neon-pink' ? 'text-[#FF4F8B] bg-[#FF4F8B]/5 border-[#FF4F8B]/10 group-hover:border-[#FF4F8B]/30' : 'text-yellow-400 bg-yellow-400/5 border-yellow-400/10 group-hover:border-yellow-400/30')))
                                            )}>
                                                <stat.icon size={24} />
                                            </div>
                                        </div>
                                        <div>
                                            <h3 className="text-4xl md:text-5xl font-extrabold font-heading tracking-tight text-white mb-2 leading-none">{stat.value}</h3>
                                            <p className="text-gray-500 text-[10px] md:text-[9px] font-black uppercase tracking-[0.3em]">{stat.label}</p>
                                            <div className="mt-6 pt-6 border-t border-white/5 flex items-center justify-between">
                                                <p className="text-gray-600 text-[10px] md:text-[9px] font-bold uppercase tracking-widest">{stat.detail}</p>
                                            </div>
                                        </div>
                                        <div className="absolute top-0 right-0 p-8 opacity-0 group-hover:opacity-[0.03] transition-opacity pointer-events-none transform translate-x-4 -translate-y-4">
                                            <stat.icon size={160} />
                                        </div>
                                    </div>
                                </Link>
                            </motion.div>
                        );
                    })}
                    </div>
                </div>

            {/* Operational Modules */}
            <div className="space-y-32">
                    {user?.role !== 'scanner' && user?.role !== 'gate_manager' && user?.role !== 'blog_writer' && (
                        <DashboardSection title="Finance & Strategic Assets" gradient="from-neon-green via-neon-blue to-white" icon={<TrendingUp size={20} />}>
                            {['developer', 'founder'].includes(user?.role) && (
                                <ControlCard title="Finance Board" desc="Cashflow, spends, invoices and income tracking." icon={TrendingUp} color="neon-green" link="/admin/finance" isNew isHidden={cards.invoices} />
                            )}
                            {['developer', 'founder'].includes(user?.role) && (
                                <ControlCard title="Invoices" desc="Financial tracking and settlement logs." icon={FileText} color="neon-blue" link="/admin/invoices" count={invoices.length} isHidden={cards.invoices} />
                            )}
                            <ControlCard title="Proposal Vault" desc="Strategic quotations and client dossiers." icon={FileSpreadsheet} color="neon-green" link="/admin/proposals" count={proposals?.length || 0} isHidden={cards.docs} />
                            <ControlCard title="Contracts" desc="Legal MOU and contract generator." icon={Scale} color="neon-purple" link="/admin/agreements" count={agreements?.length || 0} isHidden={cards.docs} />
                            <ControlCard title="Document Hub" desc="Host Google Docs, Sheets, Drive files and PDFs." icon={FolderOpen} color="neon-blue" link="/admin/documents" count={documents?.length || 0} isNew />
                        </DashboardSection>
                    )}

                    {user?.role !== 'scanner' && user?.role !== 'gate_manager' && (
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

                    {user?.role !== 'scanner' && user?.role !== 'gate_manager' && user?.role !== 'blog_writer' && (
                        <DashboardSection title="Personnel & Community Ops" gradient="from-neon-blue via-neon-green to-white" icon={<Users size={20} />}>
                            <ControlCard title="Community Hub" desc="Volunteer coordination and gig ops." icon={Users} color="neon-green" link="/admin/volunteer-gigs" isHidden={cards.community} />
                            <ControlCard title="Creator Studio" desc="Influencer validation and mission management." icon={Star} color="neon-blue" link="/admin/creators" isHidden={cards.influencer} />
                            <ControlCard title="Giveaways" desc="Viral engagement and reward distribution." icon={Gift} color="purple-500" link="/admin/giveaways" isNew isHidden={cards.giveaways} />
                            <ControlCard title="Artistant" desc="Artist roster and client onboarding hub." logo={artistantLogo} color="neon-blue" link="/admin/artistant" isNew isHidden={cards.artists} />
                            <ControlCard title="Mailing" desc="Mass communication and broadcast logs." icon={Megaphone} color="neon-blue" link="/admin/mailing" isNew isHidden={cards.mailing} />
                            {user.role !== 'editor' && user.role !== 'content_admin' && user.role !== 'blog_writer' && (
                                <ControlCard title="Members" desc="Security clearance and administrative roles." icon={Shield} color="neon-blue" link="/admin/manage-admins" isHidden={cards.admins} />
                            )}
                            <ControlCard title="Inbox" desc="External queries and mission requests." icon={Mail} color="white" link="/admin/messages" count={unreadCount} isHidden={cards.messages} />
                        </DashboardSection>
                    )}
                </div>
            </div>

            {/* Mobile Persistent Floating Control Bar */}
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-[420px] h-16 bg-[#050505]/80 backdrop-blur-2xl border border-white/10 rounded-full flex items-center justify-between p-2 shadow-2xl md:hidden">
                <Link
                    to="/admin"
                    className="w-12 h-12 rounded-full bg-white/5 border border-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all active:scale-90"
                    title="Dashboard"
                >
                    <LayoutDashboard size={20} />
                </Link>
                
                <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="flex-1 mx-2 h-12 rounded-full bg-gradient-to-r from-neon-green/10 via-neon-blue/10 to-neon-pink/10 border border-white/10 hover:border-white/20 flex flex-col items-center justify-center text-[10px] font-black uppercase tracking-[0.2em] text-white transition-all active:scale-[0.98]"
                >
                    <span className="flex items-center gap-2">
                        {isMenuOpen ? <X size={14} className="text-neon-pink" /> : <Compass size={14} className="text-neon-blue animate-pulse" />}
                        {isMenuOpen ? 'CLOSE MENU' : 'QUICK JUMP'}
                    </span>
                </button>
                
                <Link
                    to="/admin/messages"
                    className="w-12 h-12 rounded-full bg-white/5 border border-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white relative transition-all active:scale-90"
                    title="Inbox"
                >
                    <Bell size={20} />
                    {unreadCount > 0 && (
                        <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-neon-pink border-2 border-black rounded-full animate-pulse shadow-[0_0_8px_rgba(255,79,139,0.8)]" />
                    )}
                </Link>
            </div>

            {/* Mobile Bottom Sheet Menu */}
            <AnimatePresence>
                {isMenuOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsMenuOpen(false)}
                            className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm md:hidden"
                        />
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            className="fixed inset-x-0 bottom-0 z-[90] h-[85vh] bg-[#0a0a0a] border-t border-white/10 rounded-t-[2.5rem] md:hidden flex flex-col overflow-hidden shadow-[0_-20px_50px_rgba(0,0,0,0.5)]"
                        >
                            {/* Handle */}
                            <div className="w-full flex justify-center py-4 bg-[#0a0a0a] z-10 shrink-0">
                                <div className="w-12 h-1.5 bg-white/20 rounded-full" />
                            </div>

                            <div className="flex-1 overflow-y-auto px-6 pb-24 scrollbar-hide">
                                {/* Search / Quick Stats */}
                                <div className="mb-6 space-y-4">
                                    <div className="relative">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                                        <input 
                                            type="text" 
                                            placeholder="Search modules..." 
                                            className="w-full h-12 bg-white/5 border border-white/10 rounded-2xl pl-11 pr-4 text-sm font-medium text-white placeholder-gray-500 focus:outline-none focus:border-neon-blue/50 transition-colors"
                                        />
                                    </div>
                                    <div className="flex items-center justify-between gap-3 overflow-x-auto scrollbar-hide">
                                        <div className="flex-1 min-w-[120px] p-3 rounded-2xl bg-gradient-to-br from-neon-green/10 to-transparent border border-neon-green/20">
                                            <p className="text-[10px] text-gray-400 font-bold uppercase">Net Revenue</p>
                                            <p className="text-lg font-black text-white mt-1">₹{totalPaidRevenue.toLocaleString('en-IN')}</p>
                                        </div>
                                        <div className="flex-1 min-w-[120px] p-3 rounded-2xl bg-gradient-to-br from-neon-pink/10 to-transparent border border-neon-pink/20">
                                            <p className="text-[10px] text-gray-400 font-bold uppercase">Tickets</p>
                                            <p className="text-lg font-black text-white mt-1">{ticketSalesCount}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    {sections.map((section) => {
                                        if (!section.visible) return null;
                                        const visibleLinks = section.links.filter(l => l.show);
                                        if (visibleLinks.length === 0) return null;

                                        return (
                                            <div key={section.title} className="space-y-3">
                                                <div className="flex items-center gap-2">
                                                    <div className={cn("w-2 h-2 rounded-full", 
                                                        section.color === 'text-neon-green' ? 'bg-neon-green' :
                                                        section.color === 'text-neon-blue' ? 'bg-neon-blue' :
                                                        section.color === 'text-neon-pink' ? 'bg-neon-pink' :
                                                        section.color === 'text-yellow-400' ? 'bg-yellow-400' : 'bg-white'
                                                    )} />
                                                    <h4 className={cn("text-[10px] font-black uppercase tracking-[0.2em]", section.color)}>
                                                        {section.title}
                                                    </h4>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    {visibleLinks.map((link) => {
                                                        const LinkIcon = link.icon;
                                                        const isActive = location.pathname === link.path;
                                                        return (
                                                            <Link
                                                                key={link.name}
                                                                to={link.path}
                                                                onClick={() => setIsMenuOpen(false)}
                                                                className={cn(
                                                                    "flex flex-col gap-2 p-3.5 rounded-2xl transition-all duration-300 border",
                                                                    isActive 
                                                                        ? "bg-white text-black font-black border-white"
                                                                        : "bg-white/5 hover:bg-white/10 text-gray-300 border-white/5"
                                                                )}
                                                            >
                                                                <LinkIcon size={18} className={isActive ? "text-black" : `text-${link.color}`} />
                                                                <span className="text-[11px] font-bold tracking-wide">{link.name}</span>
                                                            </Link>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Dashboard;
