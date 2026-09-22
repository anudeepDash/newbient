import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
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
import ShieldAlert from 'lucide-react/dist/esm/icons/shield-alert';
import UserCheck from 'lucide-react/dist/esm/icons/user-check';
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
import Briefcase from 'lucide-react/dist/esm/icons/briefcase';
import ChevronLeft from 'lucide-react/dist/esm/icons/chevron-left';
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right';
import Menu from 'lucide-react/dist/esm/icons/menu';
import X from 'lucide-react/dist/esm/icons/x';
import Compass from 'lucide-react/dist/esm/icons/compass';
import Check from 'lucide-react/dist/esm/icons/check';
import Pencil from 'lucide-react/dist/esm/icons/pencil';
import ArrowUpRight from 'lucide-react/dist/esm/icons/arrow-up-right';
import GripVertical from 'lucide-react/dist/esm/icons/grip-vertical';
import Target from 'lucide-react/dist/esm/icons/target';
import Layers from 'lucide-react/dist/esm/icons/layers';
import Folder from 'lucide-react/dist/esm/icons/folder';
import Tag from 'lucide-react/dist/esm/icons/tag';
import MessageSquare from 'lucide-react/dist/esm/icons/message-square';
import CheckCircle2 from 'lucide-react/dist/esm/icons/check-circle-2';

import { collection, query, where, onSnapshot, getDocs, addDoc } from 'firebase/firestore';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, sendPasswordResetEmail, signInWithPopup } from 'firebase/auth';
import { db, auth, googleProvider } from '../../lib/firebase';
import { useStore } from '../../lib/store';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { useStoreSubscription } from '../../hooks/useStoreSubscription';
import { useConsolidatedMembers } from '../../hooks/useConsolidatedMembers';
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
                <div className={cn("p-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-gray-900 dark:text-white/40 transition-colors duration-500", gradient.includes('neon-green') ? 'group-hover:text-neon-green' : (gradient.includes('neon-pink') ? 'group-hover:text-neon-pink' : 'group-hover:text-neon-blue'))}>
                    {icon}
                </div>
                <h2 className={cn(
                    "text-xl md:text-3xl font-extrabold font-heading tracking-tight pr-6 transition-colors",
                    "text-transparent bg-clip-text bg-gradient-to-r",
                    gradient
                )}>
                    {title}
                </h2>
            </div>
            <div className="flex-1 h-px bg-gradient-to-r from-gray-300 dark:from-white/10 via-gray-200 dark:via-white/5 to-transparent" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-8">
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
            case 'neon-green': return 'hover:border-emerald-500/50 dark:group-hover:border-neon-green/30';
            case 'neon-blue': return 'hover:border-sky-500/50 dark:group-hover:border-neon-blue/30';
            case 'neon-purple': return 'hover:border-purple-500/50 dark:group-hover:border-neon-purple/30';
            case 'neon-pink': return 'hover:border-rose-500/50 dark:group-hover:border-neon-pink/30';
            case 'yellow-400': return 'hover:border-amber-500/50 dark:group-hover:border-yellow-400/30';
            default: return 'group-hover:border-black/20 dark:group-hover:border-white/20';
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
                "relative p-4 sm:p-6 md:p-10 w-full flex-1 border transition-all duration-500 rounded-2xl md:rounded-3xl flex flex-col items-center text-center group overflow-hidden backdrop-blur-3xl select-none",
                "shadow-sm hover:shadow-xl dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)]",
                isHidden 
                    ? "bg-white dark:bg-black/40 border-gray-200 dark:border-white/5 opacity-40 grayscale" 
                    : (comingSoon 
                        ? "bg-gray-100 dark:bg-zinc-950/20 border-gray-200 dark:border-white/5 opacity-60 grayscale" 
                        : cn("bg-white dark:bg-zinc-950/35 border-gray-200/80 dark:border-white/[0.08] hover:bg-gray-50/80 dark:hover:bg-zinc-950/50", getBorderHoverColor()))
            )}>

                {comingSoon && !isHidden && (
                    <span className="absolute top-3 right-3 md:top-6 md:right-6 px-2 py-0.5 md:px-3 md:py-1 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-full text-[6px] md:text-[7px] font-black uppercase tracking-[0.3em] text-gray-500">
                        Soon
                    </span>
                )}

                <div className={cn(
                    "w-10 h-10 sm:w-14 sm:h-14 md:w-20 md:h-20 rounded-xl md:rounded-3xl border flex items-center justify-center mb-3 md:mb-8 group-hover:scale-110 group-hover:-rotate-3 transition-all duration-700 relative",
                    color === 'neon-green' ? 'bg-emerald-50 dark:bg-[#39FF14]/5 border-emerald-200 dark:border-[#39FF14]/10 text-emerald-600 dark:text-[#39FF14] group-hover:border-emerald-400 dark:group-hover:border-[#39FF14]/30' : 
                    (color === 'neon-blue' ? 'bg-sky-50 dark:bg-[#00F0FF]/5 border-sky-200 dark:border-[#00F0FF]/10 text-sky-600 dark:text-[#00F0FF] group-hover:border-sky-400 dark:group-hover:border-[#00F0FF]/30' : 
                    (color === 'neon-purple' ? 'bg-purple-50 dark:bg-[#A855F7]/5 border-purple-200 dark:border-[#A855F7]/10 text-purple-600 dark:text-[#A855F7] group-hover:border-purple-400 dark:group-hover:border-[#A855F7]/30' : 
                    (color === 'neon-pink' ? 'bg-rose-50 dark:bg-[#FF4F8B]/5 border-rose-200 dark:border-[#FF4F8B]/10 text-rose-600 dark:text-[#FF4F8B] group-hover:border-rose-400 dark:group-hover:border-[#FF4F8B]/30' : 
                    (color === 'yellow-400' ? 'bg-amber-50 dark:bg-yellow-400/5 border-amber-200 dark:border-yellow-400/10 text-amber-600 dark:text-yellow-400 group-hover:border-amber-400 dark:group-hover:border-yellow-400/30' : 
                    'bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 text-gray-900 dark:text-white group-hover:border-black/20 dark:group-hover:border-white/20'))))
                )}>
                    <div className="absolute inset-0 bg-current opacity-0 group-hover:opacity-10 rounded-xl md:rounded-3xl blur-md transition-opacity" />
                    {logo ? (
                        <img src={logo} alt={title} className="w-6 h-6 md:w-14 md:h-14 object-contain relative z-10" />
                    ) : (
                        IconComponent && <IconComponent className="w-5 h-5 sm:w-6 sm:h-6 md:w-10 md:h-10 relative z-10" />
                    )}
                </div>

                <h3 className="text-sm sm:text-base md:text-xl font-extrabold font-heading text-gray-900 dark:text-white mb-1 md:mb-3 tracking-tight group-hover:text-emerald-600 dark:group-hover:text-neon-green transition-colors">{title}</h3>
                
                <p className="text-gray-500 text-[8px] md:text-[11px] font-bold leading-relaxed px-1 md:px-2 uppercase tracking-wide opacity-0 max-h-0 md:opacity-80 md:max-h-20 md:group-hover:opacity-100 group-active:opacity-100 group-active:max-h-20 overflow-hidden transition-all duration-300">{desc}</p>
                
                {count !== undefined && (
                    <div className="mt-2 md:mt-8 px-3 py-1 md:px-5 md:py-2 rounded-xl md:rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-[7px] md:text-[9px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-[0.3em] group-hover:border-black/10 dark:group-hover:border-white/10 group-hover:bg-black/10 dark:group-hover:bg-white/10 transition-all">
                        {count} <span className="hidden md:inline">ENTRIES</span>
                    </div>
                )}
                
                <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-gray-300 dark:via-white/5 to-transparent group-hover:via-gray-400 dark:group-hover:via-white/20 transition-all duration-700" />
            </div>

            {isHidden && (
                <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
                    <div className="px-4 py-2 md:px-6 md:py-3 rounded-xl md:rounded-2xl bg-white dark:bg-black/80 border border-red-500/30 backdrop-blur-md text-red-500 text-[8px] md:text-[10px] font-black uppercase tracking-[0.4em] shadow-2xl">
                        OFFLINE
                    </div>
                </div>
            )}
        </Link>
    );
};

const AuthSection = ({ email, setEmail, password, setPassword, isResetting, setIsResetting, isRegistering, setIsRegistering, handleLogin }) => (
    <div className="min-h-screen bg-gray-50 dark:bg-dark flex items-center justify-center px-4 relative overflow-hidden">
        {/* Cinematic Backdrop */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:40px_40px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-neon-pink/10 blur-[150px] rounded-full animate-pulse" />
        <div className="absolute top-[20%] right-[20%] w-[300px] h-[300px] bg-neon-blue/5 blur-[120px] rounded-full animate-pulse delay-1000" />
        
        <div className="p-8 sm:p-12 w-full max-w-lg border border-black/10 dark:border-white/5 bg-white dark:bg-zinc-950/35 backdrop-blur-3xl rounded-3xl relative z-10 shadow-xl dark:shadow-[0_50px_100px_rgba(0,0,0,0.9)] overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-neon-pink to-transparent" />
            
            <div className="text-center mb-8 sm:mb-12">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-neon-pink/10 rounded-2xl sm:rounded-3xl flex items-center justify-center mx-auto mb-6 sm:mb-8 border border-neon-pink/20 relative group">
                    <div className="absolute inset-0 bg-neon-pink/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                    <Shield size={32} className="text-neon-pink relative z-10 sm:w-10 sm:h-10" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-gray-900 dark:text-white tracking-tight leading-none">
                    {isResetting ? 'Recover Password' : (isRegistering ? 'Register Admin' : 'Admin Login')}
                </h1>
                <p className="text-gray-500 text-[8px] sm:text-[10px] font-black uppercase tracking-[0.4em] mt-3 sm:mt-4">Authorized Administrator Access Only</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6 sm:space-y-8">
                <div className="space-y-3">
                    <label className="text-[9px] sm:text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] pl-2">Email Address</label>
                    <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@newbi.live" className="h-14 sm:h-16 bg-gray-50 dark:bg-black/40 border border-black/10 dark:border-white/5 focus:border-neon-pink/40 rounded-xl sm:rounded-2xl text-sm font-medium transition-all" required />
                </div>
                <div className="space-y-3">
                    <label className="text-[9px] sm:text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] pl-2">Password</label>
                    <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="h-14 sm:h-16 bg-gray-50 dark:bg-black/40 border-black/10 dark:border-white/5 focus:border-neon-pink/40 rounded-xl sm:rounded-2xl text-sm font-medium transition-all" required />
                </div>
                <Button type="submit" className="w-full h-14 sm:h-16 bg-neon-pink text-white font-black font-heading uppercase tracking-[0.2em] text-[10px] sm:text-xs rounded-xl sm:rounded-2xl hover:scale-[1.02] active:scale-98 transition-all shadow-[0_15px_40px_rgba(255,79,139,0.3)]">
                    {isRegistering ? 'REGISTER' : 'SIGN IN'}
                </Button>
            </form>

            <div className="mt-12 flex justify-between items-center text-[10px] font-black uppercase tracking-[0.2em]">
                <button onClick={() => setIsResetting(!isResetting)} className="text-gray-600 hover:text-gray-900 dark:hover:text-white transition-colors">FORGOT PASSWORD?</button>
                <button onClick={() => setIsRegistering(!isRegistering)} className="text-neon-blue hover:underline underline-offset-8 decoration-2">{isRegistering ? 'BACK TO LOGIN' : 'REQUEST ACCESS'}</button>
            </div>
        </div>
    </div>
);

const BootstrapAlert = ({ onClaim }) => (
    <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="mb-16 p-10 bg-gradient-to-r from-neon-green/10 via-black/5 dark:via-black/40 to-black/10 dark:to-black/60 border border-neon-green/30 rounded-3xl flex flex-col lg:flex-row items-center justify-between gap-10 backdrop-blur-3xl relative overflow-hidden shadow-xl"
    >
        <div className="absolute inset-0 bg-neon-green/5 blur-[100px] pointer-events-none" />
        <div className="flex items-center gap-8 relative z-10">
            <div className="w-20 h-20 rounded-3xl bg-neon-green/20 text-neon-green flex items-center justify-center border border-neon-green/30 shadow-[0_0_30px_rgba(46,255,144,0.2)]">
                <Sparkles size={40} className="animate-pulse" />
            </div>
            <div>
                <h2 className="text-2xl md:text-3xl font-extrabold font-heading text-gray-900 dark:text-white tracking-tight">System Uninitialized</h2>
                <p className="text-gray-600 dark:text-gray-400 text-sm mt-2 font-medium uppercase tracking-widest">No primary administrator detected. Register as <span className="text-neon-green">Super Admin</span> to begin.</p>
            </div>
        </div>
        <Button onClick={onClaim} className="w-full lg:w-auto bg-black text-white dark:bg-white dark:text-black font-black font-heading uppercase tracking-[0.2em] text-xs h-16 px-12 rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-xl">
            Setup Super Admin
        </Button>
    </motion.div>
);


// --- Main Dashboard Component ---

const Dashboard = () => {
    useStoreSubscription([
        'invoices', 'spends', 'otherIncomes', 'proposals', 'agreements', 
        'concerts', 'portfolio', 'announcements', 'artists', 'clientRequests', 
        'upcomingEvents', 'ticketOrders', 'admins', 'creators', 'creatorGroups', 
        'campaigns', 'giveaways', 'subscribers', 'posts', 'forms', 
        'volunteerGigs', 'guestlists', 'messages', 'coupons', 'financePayees', 'documents'
    ]);
    const { 
        invoices, spends, otherIncomes, proposals, agreements, concerts, portfolio, announcements, user, 
        artists, clientRequests, upcomingEvents, ticketOrders, admins = [],
        creators = [], creatorGroups = [], campaigns = [], giveaways = [], subscribers = [], posts = [],
        forms = [], volunteerGigs = [], guestlists = [], messages = [], coupons = [], financePayees = [], documents = [],
        checkUserRole, maintenanceState, archivePastEvents,
        dashboardWidgets, saveDashboardWidgets
    } = useStore();
    const { 
        totalCount: totalMembersCount, 
        activeCount: activeMembersCount, 
        suspendedCount: suspendedMembersCount 
    } = useConsolidatedMembers();
    const [isWidgetConfigOpen, setIsWidgetConfigOpen] = useState(false);
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
                { name: "Contracts", path: "/admin/agreements", icon: Scale, color: "neon-purple", show: !cards.docs }
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
                { name: "Active Users", path: "/admin/active-users", icon: UserCheck, color: "neon-green", show: user?.role !== 'editor' && user?.role !== 'content_admin' && user?.role !== 'blog_writer' && !cards.admins },
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
    useBodyScrollLock(isMenuOpen);

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

    const activeAdminsCount = (admins || []).filter(a => a.role !== 'pending').length;
    const pendingAdminsCount = (admins || []).filter(a => a.role === 'pending').length;

    // Creator computations
    const approvedCreatorsCount = (creators || []).filter(c => c.profileStatus === 'approved').length;
    const pendingCreatorsCount = (creators || []).filter(c => !c.profileStatus || c.profileStatus === 'pending').length;
    const totalCreatorReach = (creators || []).reduce((sum, c) => sum + Math.max(Number(c.instagramFollowers || 0), Number(c.youtubeSubscribers || 0), Number(c.linkedinFollowers || 0)), 0);
    const formatReach = (num) => {
        if (!num || isNaN(num)) return '0';
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toLocaleString();
    };

    const unreadMessagesCount = (messages || []).filter(m => m.status === 'new' || !m.read).length;

    // ── Comprehensive Metric Registry ──
    // All available metrics across every admin module, categorized and keyed by ID
    const METRIC_REGISTRY = useMemo(() => ({
        // ── Personnel ──
        total_members: { 
            label: 'Total Members', value: totalMembersCount.toLocaleString(), icon: Users, color: 'neon-blue', 
            detail: 'All authenticated platform accounts', link: '/admin/manage-admins', category: 'Personnel' 
        },
        active_users: { 
            label: 'Active Users', value: activeMembersCount.toLocaleString(), icon: UserCheck, color: 'neon-green', 
            detail: `${totalMembersCount > 0 ? Math.round((activeMembersCount / totalMembersCount) * 100) : 100}% active clearance rate`, link: '/admin/active-users', category: 'Personnel' 
        },
        administrators: { 
            label: 'Administrators', value: activeAdminsCount, icon: Shield, color: 'neon-pink', 
            detail: pendingAdminsCount > 0 ? `${pendingAdminsCount} pending clearance` : 'Full command staff', link: '/admin/manage-admins?tab=admins', category: 'Personnel' 
        },
        pending_clearances: { 
            label: 'Pending Clearances', value: pendingAdminsCount, icon: Clock, color: 'yellow-400', 
            detail: `${pendingAdminsCount} staff awaiting approval`, link: '/admin/manage-admins?tab=requests', category: 'Personnel' 
        },
        suspended_accounts: { 
            label: 'Suspended', value: suspendedMembersCount, icon: ShieldAlert, color: 'neon-purple', 
            detail: suspendedMembersCount > 0 ? `${suspendedMembersCount} restricted accounts` : 'Zero restricted accounts', link: '/admin/manage-admins?tab=members', category: 'Personnel' 
        },

        // ── Creators & Influencers ──
        creators_total: {
            label: 'Total Creators', value: (creators?.length || 0).toLocaleString(), icon: Star, color: 'neon-blue',
            detail: `${approvedCreatorsCount} verified creators`, link: '/admin/creators', category: 'Creators'
        },
        creators_approved: {
            label: 'Verified Creators', value: approvedCreatorsCount.toLocaleString(), icon: CheckCircle2, color: 'neon-green',
            detail: `${pendingCreatorsCount} awaiting verification`, link: '/admin/creators', category: 'Creators'
        },
        creators_pending: {
            label: 'Pending Creators', value: pendingCreatorsCount.toLocaleString(), icon: Clock, color: 'yellow-400',
            detail: `${pendingCreatorsCount} applications to review`, link: '/admin/creators', category: 'Creators'
        },
        creator_groups: {
            label: 'Creator Hubs', value: (creatorGroups?.length || 0).toLocaleString(), icon: Layers, color: 'neon-purple',
            detail: 'City & regional community hubs', link: '/admin/creators', category: 'Creators'
        },
        campaigns_count: {
            label: 'Live Campaigns', value: (campaigns?.length || 0).toLocaleString(), icon: Target, color: 'neon-pink',
            detail: 'Brand & creator marketing campaigns', link: '/admin/campaigns', category: 'Creators'
        },
        creator_reach: {
            label: 'Creator Reach', value: formatReach(totalCreatorReach), icon: Sparkles, color: 'neon-green',
            detail: 'Aggregated creator audience', link: '/admin/creators', category: 'Creators'
        },

        // ── Commercial & Finance ──
        total_revenue: { 
            label: 'Total Revenue', value: `₹${totalPaidRevenue.toLocaleString('en-IN')}`, icon: IndianRupee, color: 'neon-green', 
            detail: `Net flow: ₹${netCashFlow.toLocaleString('en-IN')}`, link: '/admin/finance', category: 'Finance' 
        },
        total_expenses: { 
            label: 'Total Expenses', value: `₹${totalPaidExpenses.toLocaleString('en-IN')}`, icon: IndianRupee, color: 'neon-pink', 
            detail: `${(spends || []).length} expense entries`, link: '/admin/finance', category: 'Finance' 
        },
        net_cashflow: { 
            label: 'Net Cash Flow', value: `₹${netCashFlow.toLocaleString('en-IN')}`, icon: TrendingUp, color: netCashFlow >= 0 ? 'neon-green' : 'neon-pink', 
            detail: `Revenue − Expenses`, link: '/admin/finance', category: 'Finance' 
        },
        invoices_count: { 
            label: 'Invoices', value: (invoices?.length || 0).toLocaleString(), icon: FileText, color: 'neon-blue', 
            detail: `${(invoices || []).filter(i => i.status === 'Paid').length} paid settlements`, link: '/admin/invoices', category: 'Finance' 
        },
        payees_count: {
            label: 'Registered Payees', value: (financePayees?.length || 0).toLocaleString(), icon: Briefcase, color: 'yellow-400',
            detail: 'Financial payee & vendor registry', link: '/admin/payees', category: 'Finance'
        },

        // ── Ticketing & Events ──
        ticket_sales: { 
            label: 'Ticket Sales', value: ticketSalesCount.toLocaleString(), icon: Ticket, color: 'neon-pink', 
            detail: `₹${ticketSalesAmount.toLocaleString('en-IN')} ticket revenue`, link: '/admin/ticketing', category: 'Ticketing' 
        },
        ticket_revenue: { 
            label: 'Ticket Revenue', value: `₹${ticketSalesAmount.toLocaleString('en-IN')}`, icon: Ticket, color: 'neon-green', 
            detail: `${ticketSalesCount} tickets sold`, link: '/admin/ticketing', category: 'Ticketing' 
        },
        upcoming_events: { 
            label: 'Upcoming Events', value: (upcomingEvents?.length || 0).toLocaleString(), icon: Calendar, color: 'neon-green', 
            detail: 'Queued live event roster', link: '/admin/upcoming-events', category: 'Ticketing' 
        },
        guestlists_count: {
            label: 'Event Guestlists', value: (guestlists?.length || 0).toLocaleString(), icon: ClipboardList, color: 'neon-blue',
            detail: 'Active event RSVP guestlists', link: '/admin/guestlists', category: 'Ticketing'
        },
        coupons_count: {
            label: 'Promo Coupons', value: (coupons?.length || 0).toLocaleString(), icon: Tag, color: 'neon-purple',
            detail: 'Active discount & access codes', link: '/admin/ticketing', category: 'Ticketing'
        },

        // ── Community & Engagement ──
        subscribers_count: {
            label: 'Subscribers', value: (subscribers?.length || 0).toLocaleString(), icon: Megaphone, color: 'neon-blue',
            detail: 'Newsletter email mailing list', link: '/admin/mailing', category: 'Community'
        },
        giveaways_count: {
            label: 'Giveaways', value: (giveaways?.length || 0).toLocaleString(), icon: Gift, color: 'neon-purple',
            detail: 'Fan rewards & raffle promotions', link: '/admin/giveaways', category: 'Community'
        },
        volunteer_gigs: {
            label: 'Volunteer Gigs', value: (volunteerGigs?.length || 0).toLocaleString(), icon: Users, color: 'neon-green',
            detail: 'Community volunteer roles', link: '/admin/volunteer-gigs', category: 'Community'
        },
        forms_count: {
            label: 'Forms & Surveys', value: (forms?.length || 0).toLocaleString(), icon: ListChecks, color: 'yellow-400',
            detail: 'Custom dynamic intake forms', link: '/admin/forms', category: 'Community'
        },
        inbox_messages: {
            label: 'Inbox Messages', value: (messages?.length || 0).toLocaleString(), icon: MessageSquare, color: 'neon-pink',
            detail: unreadMessagesCount > 0 ? `${unreadMessagesCount} unread inquiries` : 'All inquiries resolved', link: '/admin/messages', category: 'Community'
        },

        // ── Content & Media ──
        announcements_count: { 
            label: 'Announcements', value: (announcements?.length || 0).toLocaleString(), icon: Radio, color: 'neon-pink', 
            detail: 'Published system broadcasts', link: '/admin/announcements', category: 'Content' 
        },
        blog_posts: {
            label: 'Blog Posts', value: (posts?.length || 0).toLocaleString(), icon: FileText, color: 'neon-blue',
            detail: 'Published editorial articles', link: '/admin/blog', category: 'Content'
        },
        portfolio_count: { 
            label: 'Portfolio Vault', value: (portfolio?.length || 0).toLocaleString(), icon: Music, color: 'neon-purple', 
            detail: 'Past concert & event archives', link: '/admin/concertzone', category: 'Content' 
        },

        // ── Legal & Documents ──
        proposals_count: { 
            label: 'Proposals', value: (proposals?.length || 0).toLocaleString(), icon: FileSpreadsheet, color: 'neon-blue', 
            detail: 'Client commercial quotations', link: '/admin/proposals', category: 'Documents' 
        },
        contracts_count: { 
            label: 'Contracts', value: (agreements?.length || 0).toLocaleString(), icon: Scale, color: 'neon-purple', 
            detail: 'Active legal MOUs & agreements', link: '/admin/agreements', category: 'Documents' 
        },
        documents_vault: {
            label: 'Document Vault', value: (documents?.length || 0).toLocaleString(), icon: Folder, color: 'neon-green',
            detail: 'Secure centralized file storage', link: '/admin/documents', category: 'Documents'
        },
        artist_roster: { 
            label: 'Artist Roster', value: (artists?.length || 0).toLocaleString(), icon: Mic2, color: 'neon-blue', 
            detail: `${pendingArtistRequests} pending onboarding`, link: '/admin/artistant', category: 'Documents' 
        },
        client_requests: { 
            label: 'Client Requests', value: (clientRequests?.length || 0).toLocaleString(), icon: Briefcase, color: 'neon-green', 
            detail: `${pendingArtistRequests} pending approval`, link: '/admin/artistant', category: 'Documents' 
        },
    }), [
        totalMembersCount, activeMembersCount, suspendedMembersCount, activeAdminsCount, pendingAdminsCount, 
        creators, approvedCreatorsCount, pendingCreatorsCount, creatorGroups, campaigns, totalCreatorReach,
        totalPaidRevenue, totalPaidExpenses, netCashFlow, invoices, spends, financePayees,
        ticketSalesCount, ticketSalesAmount, upcomingEvents, guestlists, coupons,
        subscribers, giveaways, volunteerGigs, forms, messages, unreadMessagesCount,
        announcements, posts, portfolio,
        proposals, agreements, documents, artists, clientRequests, pendingArtistRequests
    ]);

    // Resolve the 4 active widget definitions from the stored keys
    const activeWidgets = useMemo(() => {
        return (dashboardWidgets || ['total_members', 'active_users', 'administrators', 'ticket_sales']).map(key => ({
            key,
            ...(METRIC_REGISTRY[key] || METRIC_REGISTRY['total_members'])
        }));
    }, [dashboardWidgets, METRIC_REGISTRY]);

    // ── Widget Config Modal (Rendered via Portal for perfect layout & scroll) ──
    const WidgetConfigModal = () => {
        const [selected, setSelected] = useState([...(dashboardWidgets || ['total_members', 'active_users', 'administrators', 'ticket_sales'])]);
        const [saving, setSaving] = useState(false);

        // Keep in sync when modal opens
        useEffect(() => {
            if (isWidgetConfigOpen) {
                setSelected([...(dashboardWidgets || ['total_members', 'active_users', 'administrators', 'ticket_sales'])]);
            }
        }, [isWidgetConfigOpen, dashboardWidgets]);

        const toggleMetric = (key) => {
            if (selected.includes(key)) {
                setSelected(selected.filter(k => k !== key));
            } else if (selected.length < 4) {
                setSelected([...selected, key]);
            }
        };

        const handleSave = async () => {
            if (selected.length !== 4) {
                useStore.getState().addToast('Please select exactly 4 metrics', 'error');
                return;
            }
            setSaving(true);
            try {
                await saveDashboardWidgets(selected);
                useStore.getState().addToast('Dashboard widgets updated', 'success');
                setIsWidgetConfigOpen(false);
            } catch (err) {
                useStore.getState().addToast('Failed to save config', 'error');
            } finally {
                setSaving(false);
            }
        };

        // Group metrics by category
        const categories = {};
        Object.entries(METRIC_REGISTRY).forEach(([key, metric]) => {
            if (!categories[metric.category]) categories[metric.category] = [];
            categories[metric.category].push({ key, ...metric });
        });

        if (!isWidgetConfigOpen) return null;

        const modalMarkup = (
            <AnimatePresence>
                {isWidgetConfigOpen && (
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6">
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            exit={{ opacity: 0 }}
                            onClick={() => setIsWidgetConfigOpen(false)}
                            className="fixed inset-0 bg-black/80 backdrop-blur-md"
                        />

                        {/* Modal Container */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 16 }} 
                            animate={{ opacity: 1, scale: 1, y: 0 }} 
                            exit={{ opacity: 0, scale: 0.95, y: 16 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="relative z-10 w-full max-w-2xl max-h-[85vh] bg-white dark:bg-zinc-950 border border-gray-200 dark:border-white/10 rounded-3xl overflow-hidden flex flex-col shadow-2xl"
                        >
                            {/* Header (Pinned) */}
                            <div className="p-5 sm:p-6 border-b border-gray-100 dark:border-white/5 shrink-0 bg-white dark:bg-zinc-950">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h2 className="text-xl sm:text-2xl font-extrabold font-heading text-gray-900 dark:text-white tracking-tight">Configure Widgets</h2>
                                        <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.3em] mt-1.5">
                                            Select exactly 4 metrics · {selected.length}/4 selected
                                        </p>
                                    </div>
                                    <button 
                                        type="button"
                                        onClick={() => setIsWidgetConfigOpen(false)} 
                                        className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors text-gray-400 hover:text-gray-900 dark:hover:text-white"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>

                                {/* 4-Slot Progress Bars */}
                                <div className="grid grid-cols-4 gap-2 mt-4">
                                    {[0, 1, 2, 3].map(i => (
                                        <div 
                                            key={i} 
                                            className={cn(
                                                "h-1.5 rounded-full transition-all duration-300",
                                                i < selected.length ? "bg-neon-green shadow-[0_0_8px_rgba(57,255,20,0.5)]" : "bg-gray-200 dark:bg-white/10"
                                            )} 
                                        />
                                    ))}
                                </div>

                                {/* Selected metric tags */}
                                {selected.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mt-3">
                                        {selected.map(k => {
                                            const m = METRIC_REGISTRY[k];
                                            if (!m) return null;
                                            return (
                                                <span 
                                                    key={k} 
                                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-neon-green/10 border border-neon-green/30 text-neon-green"
                                                >
                                                    <Check size={10} />
                                                    {m.label}
                                                    <button 
                                                        type="button"
                                                        onClick={(e) => { e.stopPropagation(); toggleMetric(k); }} 
                                                        className="hover:text-red-400 ml-0.5"
                                                    >
                                                        <X size={10} />
                                                    </button>
                                                </span>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Scrollable Categories & Metrics Body */}
                            <div className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-6 space-y-6 custom-scrollbar">
                                {Object.entries(categories).map(([category, metrics]) => (
                                    <div key={category}>
                                        <div className="flex items-center justify-between mb-3">
                                            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">{category}</h3>
                                            <span className="text-[9px] font-bold text-gray-500">{metrics.length} available</span>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {metrics.map(metric => {
                                                const isSelected = selected.includes(metric.key);
                                                const isDisabled = !isSelected && selected.length >= 4;
                                                return (
                                                    <button
                                                        key={metric.key}
                                                        type="button"
                                                        onClick={() => !isDisabled && toggleMetric(metric.key)}
                                                        disabled={isDisabled}
                                                        className={cn(
                                                            "p-3 sm:p-3.5 rounded-2xl border text-left transition-all duration-200 group relative overflow-hidden",
                                                            isSelected 
                                                                ? "bg-neon-green/10 border-neon-green/40 dark:bg-neon-green/5 dark:border-neon-green/30 shadow-sm" 
                                                                : isDisabled 
                                                                    ? "bg-gray-50 dark:bg-white/[0.01] border-gray-100 dark:border-white/5 opacity-35 cursor-not-allowed" 
                                                                    : "bg-white dark:bg-white/[0.02] border-gray-200 dark:border-white/5 hover:border-gray-300 dark:hover:border-white/15 hover:bg-gray-50 dark:hover:bg-white/5"
                                                        )}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className={cn(
                                                                "w-8 h-8 rounded-xl flex items-center justify-center border shrink-0 transition-all",
                                                                isSelected 
                                                                    ? "bg-neon-green/20 border-neon-green/30 text-neon-green" 
                                                                    : "bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-400 group-hover:text-gray-200"
                                                            )}>
                                                                {isSelected ? <Check size={14} /> : <metric.icon size={14} />}
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <p className={cn("text-xs font-bold truncate", isSelected ? "text-gray-900 dark:text-white" : "text-gray-700 dark:text-gray-300")}>
                                                                    {metric.label}
                                                                </p>
                                                                <p className="text-[10px] text-gray-400 font-medium mt-0.5 truncate">{metric.value}</p>
                                                            </div>
                                                            {isSelected && (
                                                                <div className="w-1.5 h-1.5 rounded-full bg-neon-green shrink-0 shadow-[0_0_6px_#39FF14]" />
                                                            )}
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Footer (Pinned) */}
                            <div className="p-4 sm:p-5 border-t border-gray-100 dark:border-white/5 shrink-0 flex items-center justify-between gap-4 bg-gray-50/80 dark:bg-black/40 backdrop-blur-sm">
                                <button 
                                    type="button"
                                    onClick={() => setIsWidgetConfigOpen(false)} 
                                    className="px-5 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSave}
                                    disabled={selected.length !== 4 || saving}
                                    className={cn(
                                        "px-7 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-2",
                                        selected.length === 4 
                                            ? "bg-gray-900 dark:bg-white text-white dark:text-black hover:scale-[1.02] active:scale-[0.98] shadow-lg font-extrabold" 
                                            : "bg-gray-200 dark:bg-white/10 text-gray-400 cursor-not-allowed"
                                    )}
                                >
                                    {saving ? 'Saving...' : 'Save 4 Widgets'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        );

        return createPortal(modalMarkup, document.body);
    };

    if (authLoading) return <GlobalLoader color="#00F0FF" />;

    if (!user) return <AuthSection email={email} setEmail={setEmail} password={password} setPassword={setPassword} isResetting={isResetting} setIsResetting={setIsResetting} isRegistering={isRegistering} setIsRegistering={setIsRegistering} handleLogin={handleLogin} />;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-dark text-gray-900 dark:text-white overflow-x-hidden pb-32 selection:bg-neon-green selection:text-black">
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
                        <h1 className="text-2xl sm:text-3xl md:text-5xl font-extrabold font-heading tracking-tight leading-tight text-gray-900 dark:text-white">
                            ADMIN <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-green via-black dark:via-white to-neon-blue">DASHBOARD.</span>
                        </h1>

                        <p className="text-gray-500 text-[9px] md:text-xs font-black uppercase tracking-[0.3em] flex flex-wrap items-center gap-2 md:gap-3">
                            Administrative Access Panel <span className="text-gray-900 dark:text-white/20 hidden sm:inline">|</span> 
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
                        className="flex items-center bg-white/80 dark:bg-[#0a0a0a]/60 border border-gray-200 dark:border-white/10 p-1.5 rounded-2xl backdrop-blur-3xl shadow-sm dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] self-start xl:self-auto"
                    >
                        <div className="flex items-center gap-1">
                            {['developer', 'super_admin', 'founder'].includes(user?.role) && (
                                <Link to="/admin/system-command" className="p-3 hover:bg-black/5 dark:hover:bg-white/10 rounded-xl transition-all group relative overflow-hidden" title="System Settings">
                                    <Settings size={20} className="text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors relative z-10" />
                                    <div className="absolute inset-0 bg-gradient-to-br from-gray-900 dark:from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                </Link>
                            )}
                            <Link to="/admin/messages" className="p-3 hover:bg-black/5 dark:hover:bg-white/10 rounded-xl transition-all relative group overflow-hidden">
                                <Bell size={20} className="text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors relative z-10" />
                                {unreadCount > 0 && <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-neon-pink rounded-full shadow-[0_0_15px_rgba(255,0,255,0.6)] z-20 animate-pulse" />}
                            </Link>
                        </div>
                    </motion.div>
                </header>

                {isFirstRun && <BootstrapAlert onClaim={handleClaimOwnership} />}

                {/* Configurable Metrics Hub */}
                <div className="relative mb-16 md:mb-24">
                    <div className="flex items-center justify-between gap-4 mb-6">
                        <span className="text-[10px] md:text-xs font-black uppercase tracking-[0.25em] text-gray-500">
                            Live Command Telemetry
                        </span>
                        {['developer', 'super_admin', 'founder'].includes(user?.role) && (
                            <button
                                onClick={() => setIsWidgetConfigOpen(true)}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 hover:bg-black/10 dark:hover:bg-white/10 transition-all group"
                                title="Configure dashboard widgets"
                            >
                                <Pencil size={12} className="text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors" />
                                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-500 group-hover:text-gray-900 dark:group-hover:text-white transition-colors hidden sm:inline">Customize</span>
                            </button>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                    {activeWidgets.map((stat, i) => {
                        const hoverBorder = stat.color === 'neon-green' ? 'hover:border-emerald-500/50 dark:group-hover:border-neon-green/30' :
                                            (stat.color === 'neon-blue' ? 'hover:border-sky-500/50 dark:group-hover:border-neon-blue/30' :
                                            (stat.color === 'neon-pink' ? 'hover:border-rose-500/50 dark:group-hover:border-neon-pink/30' :
                                            (stat.color === 'neon-purple' ? 'hover:border-purple-500/50 dark:group-hover:border-neon-purple/30' : 'hover:border-amber-500/50 dark:group-hover:border-yellow-400/30')));
                        return (
                            <motion.div
                                key={stat.key || stat.label}
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
                                        "p-6 md:p-8 h-full bg-white dark:bg-zinc-950/35 backdrop-blur-3xl border border-gray-200 dark:border-white/5 transition-all duration-500 rounded-3xl flex flex-col justify-between overflow-hidden shadow-sm hover:shadow-xl dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)]",
                                        hoverBorder
                                    )}>
                                        <div className="flex items-start justify-between mb-8">
                                            <div className={cn("p-4 rounded-2xl border flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-500", 
                                                stat.color === 'neon-green' ? 'text-emerald-600 dark:text-[#39FF14] bg-emerald-50 dark:bg-[#39FF14]/5 border-emerald-200 dark:border-[#39FF14]/10 group-hover:border-emerald-400 dark:group-hover:border-[#39FF14]/30' : 
                                                (stat.color === 'neon-blue' ? 'text-sky-600 dark:text-[#00F0FF] bg-sky-50 dark:bg-[#00F0FF]/5 border-sky-200 dark:border-[#00F0FF]/10 group-hover:border-sky-400 dark:group-hover:border-[#00F0FF]/30' : 
                                                (stat.color === 'neon-purple' ? 'text-purple-600 dark:text-[#A855F7] bg-purple-50 dark:bg-[#A855F7]/5 border-purple-200 dark:border-[#A855F7]/10 group-hover:border-purple-400 dark:group-hover:border-[#A855F7]/30' : 
                                                (stat.color === 'neon-pink' ? 'text-rose-600 dark:text-[#FF4F8B] bg-rose-50 dark:bg-[#FF4F8B]/5 border-rose-200 dark:border-[#FF4F8B]/10 group-hover:border-rose-400 dark:group-hover:border-[#FF4F8B]/30' : 'text-amber-600 dark:text-yellow-400 bg-amber-50 dark:bg-yellow-400/5 border-amber-200 dark:border-yellow-400/10 group-hover:border-amber-400 dark:group-hover:border-yellow-400/30')))
                                            )}>
                                                <stat.icon size={24} />
                                            </div>
                                        </div>
                                        <div>
                                            <h3 className="text-4xl md:text-5xl font-extrabold font-heading tracking-tight text-gray-900 dark:text-white mb-2 leading-none">{stat.value}</h3>
                                            <p className="text-gray-500 text-[10px] md:text-[9px] font-black uppercase tracking-[0.3em]">{stat.label}</p>
                                            <div className="mt-6 pt-6 border-t border-gray-100 dark:border-white/5 flex items-center justify-between">
                                                <p className="text-gray-600 dark:text-gray-400 text-[10px] md:text-[9px] font-bold uppercase tracking-widest">{stat.detail}</p>
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

                <WidgetConfigModal />
            {/* Operational Modules */}
            <div className="space-y-32">
                    {user?.role !== 'scanner' && user?.role !== 'gate_manager' && user?.role !== 'blog_writer' && (
                        <DashboardSection title="Finance & Strategic Assets" gradient="from-neon-green via-neon-blue to-black dark:to-white" icon={<TrendingUp size={20} />}>
                            {['developer', 'founder'].includes(user?.role) && (
                                <ControlCard title="Finance Board" desc="Cashflow, spends, invoices and income tracking." icon={TrendingUp} color="neon-green" link="/admin/finance" isNew isHidden={cards.invoices} />
                            )}
                            {['developer', 'founder'].includes(user?.role) && (
                                <ControlCard title="Invoices" desc="Financial tracking and settlement logs." icon={FileText} color="neon-blue" link="/admin/invoices" count={invoices.length} isHidden={cards.invoices} />
                            )}
                            <ControlCard title="Proposal Vault" desc="Strategic quotations and client dossiers." icon={FileSpreadsheet} color="neon-green" link="/admin/proposals" count={proposals?.length || 0} isHidden={cards.docs} />
                            <ControlCard title="Contracts" desc="Legal MOU and contract generator." icon={Scale} color="neon-purple" link="/admin/agreements" count={agreements?.length || 0} isHidden={cards.docs} />
                        </DashboardSection>
                    )}

                    {user?.role !== 'scanner' && user?.role !== 'gate_manager' && (
                        <DashboardSection title="Core Content Infrastructure" gradient="from-neon-pink via-purple-500 to-black dark:to-white" icon={<LayoutDashboard size={20} />}>
                            <ControlCard title="Upcoming" desc="Primary event queue for the live system." icon={Calendar} color="neon-green" link="/admin/upcoming-events" isHidden={cards.upcoming_events} />
                            <ControlCard title="Announcements" desc="System broadcasts and site-wide news." icon={Radio} color="neon-pink" link="/admin/announcements" isHidden={cards.blog_announcements} />
                            <ControlCard title="Blog" desc="Public-facing thought leadership logs." icon={FileText} color="neon-blue" link="/admin/blog" isNew isHidden={cards.blog_announcements} />
                            <ControlCard title="Portfolio" desc="Concert catalogue and past event archive." icon={Music} color="neon-purple" link="/admin/concertzone" count={portfolio?.length || 0} isHidden={cards.concerts} />
                        </DashboardSection>
                    )}

                    <DashboardSection title="Event & Ticketing Operations" gradient="from-yellow-400 via-neon-green to-black dark:to-white" icon={<Ticket size={20} />}>
                        <ControlCard title="Ticketing Ops" desc="Sales, UPI Verification & Offline Sync." icon={Ticket} color="neon-green" link="/admin/ticketing" isNew isHidden={cards.ticketing} />
                        <ControlCard title="QR Scanner" desc="Gate entry validation system." icon={Zap} color="yellow-400" link="/admin/scanner" isNew isHidden={cards.ticketing} />
                    </DashboardSection>

                    {user?.role !== 'scanner' && user?.role !== 'gate_manager' && user?.role !== 'blog_writer' && (
                        <DashboardSection title="Personnel & Community Ops" gradient="from-neon-blue via-neon-green to-black dark:to-white" icon={<Users size={20} />}>
                            <ControlCard title="Community Hub" desc="Volunteer coordination and gig ops." icon={Users} color="neon-green" link="/admin/volunteer-gigs" isHidden={cards.community} />
                            <ControlCard title="Creator Studio" desc="Influencer validation and mission management." icon={Star} color="neon-blue" link="/admin/creators" isHidden={cards.influencer} />
                            <ControlCard title="Giveaways" desc="Viral engagement and reward distribution." icon={Gift} color="purple-500" link="/admin/giveaways" isNew isHidden={cards.giveaways} />
                            <ControlCard title="Artistant" desc="Artist roster and client onboarding hub." logo={artistantLogo} color="neon-blue" link="/admin/artistant" isNew isHidden={cards.artists} />
                            <ControlCard title="Mailing" desc="Mass communication and broadcast logs." icon={Megaphone} color="neon-blue" link="/admin/mailing" isNew isHidden={cards.mailing} />
                            {user.role !== 'editor' && user.role !== 'content_admin' && user.role !== 'blog_writer' && (
                                <ControlCard 
                                    title="Active Users" 
                                    desc="Active clearance personnel and live session audits." 
                                    icon={UserCheck} 
                                    color="neon-green" 
                                    link="/admin/active-users" 
                                    count={activeMembersCount}
                                    detail={`${totalMembersCount > 0 ? Math.round((activeMembersCount / totalMembersCount) * 100) : 100}% Active Clearance`}
                                    isHidden={cards.admins} 
                                />
                            )}
                            {user.role !== 'editor' && user.role !== 'content_admin' && user.role !== 'blog_writer' && (
                                <ControlCard 
                                    title="Members" 
                                    desc="Security clearance and administrative roles." 
                                    icon={Shield} 
                                    color="neon-blue" 
                                    link="/admin/manage-admins" 
                                    count={totalMembersCount}
                                    detail={`${activeAdminsCount} Staff / ${totalMembersCount} Total`}
                                    isHidden={cards.admins} 
                                />
                            )}
                        </DashboardSection>
                    )}
                </div>
            </div>

            {/* Mobile Persistent Floating Control Bar */}
            <div 
                className="fixed bottom-6 inset-x-0 mx-auto z-[100] w-[90%] max-w-[420px] h-16 bg-white/90 dark:bg-[#050505]/80 backdrop-blur-2xl border border-gray-200 dark:border-white/10 rounded-full flex items-center justify-between p-2 shadow-xl dark:shadow-2xl md:hidden"
                style={{ bottom: 'max(1.5rem, calc(0.75rem + env(safe-area-inset-bottom, 0px)))' }}
            >
                <Link
                    to="/admin"
                    className="w-12 h-12 rounded-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/5 hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all active:scale-90"
                    title="Dashboard"
                >
                    <LayoutDashboard size={20} />
                </Link>
                
                <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="flex-1 mx-2 h-12 rounded-full bg-gradient-to-r from-neon-green/10 via-neon-blue/10 to-neon-pink/10 border border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20 flex flex-col items-center justify-center text-[10px] font-black uppercase tracking-[0.2em] text-gray-900 dark:text-white transition-all active:scale-[0.98]"
                >
                    <span className="flex items-center gap-2">
                        {isMenuOpen ? <X size={14} className="text-neon-pink" /> : <Compass size={14} className="text-neon-blue animate-pulse" />}
                        {isMenuOpen ? 'CLOSE MENU' : 'QUICK JUMP'}
                    </span>
                </button>
                
                <Link
                    to="/admin/messages"
                    className="w-12 h-12 rounded-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/5 hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white relative transition-all active:scale-90"
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
                            className="fixed inset-0 z-[80] bg-white dark:bg-black/60 backdrop-blur-sm md:hidden"
                        />
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            className="fixed inset-x-0 bottom-0 z-[90] h-[85vh] bg-white/95 dark:bg-[#0a0a0a] border-t border-black/10 dark:border-white/10 rounded-t-[2.5rem] md:hidden flex flex-col overflow-hidden shadow-[0_-20px_50px_rgba(0,0,0,0.5)]"
                        >
                            {/* Handle */}
                            <div className="w-full flex justify-center py-4 bg-transparent z-10 shrink-0">
                                <div className="w-12 h-1.5 bg-black/20 dark:bg-white/20 rounded-full" />
                            </div>

                            <div className="flex-1 overflow-y-auto px-6 pb-24 scrollbar-hide">
                                {/* Search / Quick Stats */}
                                <div className="mb-6 space-y-4">
                                    <div className="flex items-center justify-between gap-3 overflow-x-auto scrollbar-hide">
                                        <div className="flex-1 min-w-[120px] p-3 rounded-2xl bg-gradient-to-br from-neon-green/10 to-transparent border border-neon-green/20">
                                            <p className="text-[10px] text-gray-600 dark:text-gray-400 font-bold uppercase">Net Revenue</p>
                                            <p className="text-lg font-black text-gray-900 dark:text-white mt-1">₹{totalPaidRevenue.toLocaleString('en-IN')}</p>
                                        </div>
                                        <div className="flex-1 min-w-[120px] p-3 rounded-2xl bg-gradient-to-br from-neon-pink/10 to-transparent border border-neon-pink/20">
                                            <p className="text-[10px] text-gray-600 dark:text-gray-400 font-bold uppercase">Tickets</p>
                                            <p className="text-lg font-black text-gray-900 dark:text-white mt-1">{ticketSalesCount}</p>
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
                                                        
                                                        const colorClassMap = {
                                                            'neon-green': 'text-neon-green',
                                                            'neon-blue': 'text-neon-blue',
                                                            'neon-pink': 'text-neon-pink',
                                                            'neon-purple': 'text-neon-purple',
                                                            'yellow-400': 'text-yellow-400',
                                                            'white': 'text-white',
                                                            'red-400': 'text-red-400',
                                                        };

                                                        return (
                                                            <Link
                                                                key={link.name}
                                                                to={link.path}
                                                                onClick={() => setIsMenuOpen(false)}
                                                                className={cn(
                                                                    "flex flex-col gap-2 p-3.5 rounded-2xl transition-all duration-300 border",
                                                                    isActive 
                                                                        ? "bg-white text-black font-black border-white"
                                                                        : "bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 border-black/10 dark:border-white/5"
                                                                )}
                                                            >
                                                                <LinkIcon size={18} className={isActive ? "text-black" : (colorClassMap[link.color] || 'text-white')} />
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
