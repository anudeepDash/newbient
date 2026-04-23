import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    DollarSign, 
    Users, 
    Calendar, 
    Plus, 
    FileText, 
    Megaphone, 
    Music, 
    Mic2,
    Mail, 
    Shield, 
    Clock, 
    Radio, 
    Star, 
    Target, 
    Image, 
    Ticket, 
    LayoutDashboard, 
    Settings, 
    LogOut, 
    Search, 
    Bell, 
    Zap, 
    FileSpreadsheet, 
    Sparkles, 
    TrendingUp, 
    Gift,
    ClipboardList,
    ListChecks
} from 'lucide-react';

import { collection, query, where, onSnapshot, getDocs, addDoc } from 'firebase/firestore';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, sendPasswordResetEmail, signInWithPopup } from 'firebase/auth';
import { db, auth, googleProvider } from '../../lib/firebase';
import { useStore } from '../../lib/store';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import AdminCarousel from '../../components/admin/AdminCarousel';
import { cn } from '../../lib/utils';

const Dashboard = () => {
    const { 
        invoices, proposals, concerts, announcements, user, 
        checkUserRole, logout, maintenanceState, archivePastEvents 
    } = useStore();
    const cards = maintenanceState?.cards || {};
    
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

    // Auth Listener
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) checkUserRole(currentUser);
            else checkUserRole(null);
            setAuthLoading(false);
        });
        return () => unsubscribe();
    }, [checkUserRole]);

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
        catch (error) { alert("Login Failed: " + error.message); }
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
            alert("Ownership Claimed!");
            checkUserRole(user);
            setIsFirstRun(false);
        } catch (error) { alert("Failed to claim ownership."); }
    };

    const stats = [
        { label: 'Settlements', value: invoices.length, icon: FileText, color: 'neon-green', detail: 'Total Invoices', link: '/admin/invoices' },
        { label: 'Proposals', value: proposals?.length || 0, icon: FileSpreadsheet, color: 'neon-blue', detail: 'Quotation Pipeline', link: '/admin/proposals' },
        { label: 'Portfolio', value: concerts.length, icon: Music, color: 'neon-pink', detail: 'Live Concerts', link: '/admin/concertzone' },
        { label: 'Updates', value: announcements.length, icon: Radio, color: 'yellow-400', detail: 'Public Announcements', link: '/admin/announcements' },
    ];

    if (authLoading) return (
        <div className="min-h-screen bg-black flex items-center justify-center">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                <Zap className="text-neon-green" size={48} />
            </motion.div>
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

            <div className="relative z-10 max-w-[1500px] mx-auto px-4 md:px-10 pt-24 md:pt-32">
                {/* Advanced Command Header */}
                <header className="flex flex-col xl:flex-row justify-between items-start xl:items-end mb-16 md:mb-24 gap-12 relative">
                    <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="space-y-6 max-w-full"
                    >
                        <div className="flex items-center gap-4">
                            <div className="p-4 rounded-[1.8rem] bg-white/5 border border-white/10 backdrop-blur-2xl shadow-2xl relative group">
                                <div className="absolute inset-0 bg-neon-green/20 rounded-[1.8rem] blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                                <LayoutDashboard className="text-neon-green relative z-10" size={32} />
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

                        <h1 className="text-3xl md:text-4xl lg:text-5xl font-black font-heading tracking-tighter uppercase italic leading-tight">
                            OPERATIONS <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-green via-white to-neon-blue">DASHBOARD.</span>
                        </h1>

                        <p className="text-gray-500 text-[10px] md:text-xs font-black uppercase tracking-[0.3em] flex flex-wrap items-center gap-3">
                            Internal Management Interface <span className="text-white/20">|</span> 
                            <span className="text-neon-blue bg-neon-blue/10 px-3 py-1 rounded-full border border-neon-blue/20">{user.role?.replace('_', ' ')} CLEARANCE</span>
                            {maintenanceState.global && (
                                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 text-red-500 border border-red-500/20 animate-pulse">
                                    <Shield size={12} /> GLOBAL OVERRIDE ACTIVE
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
                            <Link to="/admin/site-settings" className="p-3.5 hover:bg-white/10 rounded-2xl transition-all group relative overflow-hidden">
                                <Settings size={20} className="text-gray-400 group-hover:text-white transition-colors relative z-10" />
                                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            </Link>
                            <Link to="/admin/messages" className="p-3.5 hover:bg-white/10 rounded-2xl transition-all relative group overflow-hidden">
                                <Bell size={20} className="text-gray-400 group-hover:text-white transition-colors relative z-10" />
                                {unreadCount > 0 && <span className="absolute top-3 right-3 w-2 h-2 bg-neon-pink rounded-full shadow-[0_0_15px_rgba(255,0,255,0.6)] z-20 animate-pulse" />}
                            </Link>
                        </div>
                        <div className="h-10 w-px bg-white/10 mx-2" />
                        <div className="flex items-center gap-4 pl-1 pr-4 py-1">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-zinc-800 to-black border border-white/10 flex items-center justify-center relative overflow-hidden group shadow-xl">
                                <div className="absolute inset-0 bg-neon-green opacity-0 group-hover:opacity-20 transition-opacity" />
                                <span className="font-black text-lg uppercase text-neon-green relative z-10 group-hover:scale-110 transition-transform">{user.email?.[0]}</span>
                            </div>
                            <div className="hidden sm:block text-left">
                                <p className="text-sm font-black text-white leading-none capitalize mb-1">{user.displayName || 'Security Lead'}</p>
                                <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest truncate max-w-[150px]">{user.email}</p>
                            </div>
                            <button onClick={logout} className="ml-2 p-3.5 bg-red-500/5 hover:bg-red-500 text-gray-500 hover:text-white border border-red-500/10 rounded-2xl transition-all flex items-center justify-center group">
                                <LogOut size={18} className="group-hover:rotate-12 transition-transform" />
                            </button>
                        </div>
                    </motion.div>
                </header>

                {isFirstRun && <BootstrapAlert onClaim={handleClaimOwnership} />}

                {/* Metrics Hub Readouts */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-24">
                    {stats.map((stat, i) => (
                        <motion.div
                            key={stat.label}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="group relative"
                        >
                            <Link to={stat.link}>
                                <div className={cn("absolute -inset-px rounded-[2.5rem] opacity-0 group-hover:opacity-20 transition-opacity blur-xl bg-gradient-to-br", 
                                    stat.color === 'neon-green' ? 'from-neon-green to-emerald-500' : 
                                    (stat.color === 'neon-blue' ? 'from-neon-blue to-cyan-500' : 
                                    (stat.color === 'neon-pink' ? 'from-neon-pink to-purple-500' : 'from-yellow-400 to-orange-500'))
                                )} />
                                <Card className="p-8 h-full bg-zinc-900/40 backdrop-blur-3xl border-white/5 hover:border-white/10 transition-all rounded-[2.5rem] flex flex-col justify-between overflow-hidden shadow-2xl">
                                    <div className="flex items-start justify-between mb-8">
                                        <div className={cn("p-4 rounded-2xl bg-white/5 border border-white/10 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500", 
                                            stat.color === 'neon-green' ? 'text-neon-green' : (stat.color === 'neon-blue' ? 'text-neon-blue' : (stat.color === 'neon-pink' ? 'text-neon-pink' : 'text-yellow-400'))
                                        )}>
                                            <stat.icon size={24} />
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <TrendingUp size={20} className="text-white/10 group-hover:text-neon-green transition-colors" />
                                            <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest mt-2">Active Path</span>
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="text-4xl lg:text-5xl font-black font-heading tracking-tighter text-white mb-2 leading-none uppercase italic">{stat.value}</h3>
                                        <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.3em]">{stat.label}</p>
                                        <div className="mt-6 pt-6 border-t border-white/5 flex items-center justify-between">
                                            <p className="text-gray-600 text-[9px] font-bold uppercase tracking-widest">{stat.detail}</p>
                                            <div className="w-8 h-1 bg-white/5 rounded-full overflow-hidden">
                                                <div className={cn("h-full w-2/3 rounded-full", 
                                                    stat.color === 'neon-green' ? 'bg-neon-green' : (stat.color === 'neon-blue' ? 'bg-neon-blue' : (stat.color === 'neon-pink' ? 'bg-neon-pink' : 'bg-yellow-400'))
                                                )} />
                                            </div>
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

                {/* Operational Modules */}
                <div className="space-y-32">
                    <DashboardSection title="Finance & Strategic Assets" gradient="from-neon-green via-neon-blue to-white" icon={<TrendingUp size={20} />}>
                        <ControlCard title="Invoices" desc="Financial tracking and settlement logs." icon={FileText} color="neon-green" link="/admin/invoices" count={invoices.length} isHidden={cards.invoices} />
                        <ControlCard title="Proposal Vault" desc="Strategic quotations and client dossiers." icon={FileSpreadsheet} color="neon-blue" link="/admin/proposals" count={proposals?.length || 0} isHidden={cards.proposals} />
                        <ControlCard title="Ticketing" desc="Access control and order management." icon={Ticket} color="neon-pink" link="/admin/tickets" isHidden={cards.tickets} />
                    </DashboardSection>

                    <DashboardSection title="Core Content Infrastructure" gradient="from-neon-pink via-purple-500 to-white" icon={<LayoutDashboard size={20} />}>
                        <ControlCard title="Upcoming" desc="Primary event queue for the live system." icon={Calendar} color="neon-pink" link="/admin/upcoming-events" isHidden={cards.upcoming} />
                        <ControlCard title="PORTFOLIO" desc="Historical archive of all past missions." icon={Music} color="neon-green" link="/admin/concertzone" isHidden={cards.portfolio} />
                        <ControlCard title="Announcements" desc="System broadcasts and site-wide news." icon={Radio} color="yellow-400" link="/admin/announcements" isHidden={cards.announcements} />
                        <ControlCard title="Blog" desc="Public-facing thought leadership logs." icon={FileText} color="neon-blue" link="/admin/blog" isNew />
                    </DashboardSection>

                    <DashboardSection title="Personnel & Community Ops" gradient="from-neon-blue via-neon-green to-white" icon={<Users size={20} />}>
                        <ControlCard title="Community Hub" desc="Volunteer coordination and guestlist ops." icon={Users} color="neon-green" link="/admin/volunteer-gigs" isHidden={cards.volunteer_gigs} />
                        <ControlCard title="Creators" desc="Influencer validation and reach metrics." icon={Star} color="neon-blue" link="/admin/creators" isHidden={cards.creators} />
                        <ControlCard title="Campaigns" desc="Social takeovers and marketing missions." icon={Target} color="neon-pink" link="/admin/campaigns" isHidden={cards.campaigns} />
                        <ControlCard title="Giveaways" desc="Viral engagement and reward distribution." icon={Gift} color="purple-500" link="/admin/giveaways" isNew isHidden={cards.giveaways} />
                        <ControlCard title="Artistant" desc="Performance talent and gig casting." icon={Mic2} color="neon-blue" link="/admin/artists" isNew />
                        <ControlCard title="Mailing" desc="Mass communication and broadcast logs." icon={Megaphone} color="neon-blue" link="/admin/mailing" isNew />
                        <ControlCard title="Members" desc="Security clearance and administrative roles." icon={Shield} color="neon-blue" link="/admin/manage-admins" isHidden={cards.members} />
                        <ControlCard title="Inbox" desc="External queries and mission requests." icon={Mail} color="white" link="/admin/messages" count={unreadCount} isHidden={cards.inbox} />
                    </DashboardSection>
                </div>
            </div>
        </div>
    );
};

const DashboardSection = ({ title, gradient, children, icon }) => (
    <section className="relative">
        <div className="flex flex-col md:flex-row md:items-center gap-4 mb-10 md:mb-12">
            <div className="flex items-center gap-4">
                <div className={cn("p-2.5 rounded-xl bg-white/5 border border-white/10 text-white/40", gradient.includes('neon-green') ? 'group-hover:text-neon-green' : (gradient.includes('neon-pink') ? 'group-hover:text-neon-pink' : 'group-hover:text-neon-blue'))}>
                    {icon}
                </div>
                <h2 className={cn("text-2xl md:text-3xl font-black font-heading tracking-tighter uppercase italic bg-clip-text text-transparent bg-gradient-to-r pr-6", gradient)}>
                    {title}
                </h2>
            </div>
            <div className="flex-1 h-px bg-gradient-to-r from-white/10 via-white/5 to-transparent" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8 pb-12 md:pb-0">
            {React.Children.map(children, (child) => (
                <motion.div 
                    whileHover={{ y: -5 }}
                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                    className="h-full w-full"
                >
                    {child}
                </motion.div>
            ))}
        </div>
    </section>
);

const ControlCard = ({ title, desc, icon: Icon, color, link, count, isNew, isHidden }) => (
    <Link to={isHidden ? '#' : (link || '#')} className={cn("group relative block h-full", isHidden && "pointer-events-none")}>
        {/* Glow Effect */}
        <div className={cn(
            "absolute inset-0 rounded-[2.5rem] opacity-0 group-hover:opacity-20 transition-all duration-700 blur-2xl",
            color === 'neon-green' ? 'bg-neon-green' : (color === 'neon-blue' ? 'bg-neon-blue' : (color === 'neon-pink' ? 'bg-neon-pink' : 'bg-white'))
        )} />
        
        <Card className={cn(
            "relative p-6 md:p-10 h-full border-white/5 transition-all duration-500 rounded-[2.5rem] flex flex-col items-center text-center group overflow-hidden border backdrop-blur-3xl",
            isHidden 
                ? "bg-[#0a0a0a] opacity-40 grayscale" 
                : "bg-zinc-900/40 hover:bg-zinc-800/40 hover:border-white/10 shadow-2xl"
        )}>
            {/* New Signal */}
            {isNew && !isHidden && (
                <span className="absolute top-6 right-6 flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neon-blue opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-neon-blue"></span>
                    </span>
                    <span className="text-[7px] font-black uppercase tracking-[0.3em] text-neon-blue">Advanced</span>
                </span>
            )}

            <div className={cn(
                "w-16 h-16 md:w-20 md:h-20 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mb-8 group-hover:scale-110 group-hover:-rotate-3 transition-all duration-700 relative",
                color === 'neon-green' ? 'text-neon-green' : (color === 'neon-blue' ? 'text-neon-blue' : (color === 'neon-pink' ? 'text-neon-pink' : (color === 'yellow-400' ? 'text-yellow-400' : 'text-white')))
            )}>
                <div className="absolute inset-0 bg-current opacity-0 group-hover:opacity-10 rounded-3xl blur-md transition-opacity" />
                <Icon className="w-8 h-8 md:w-10 md:h-10 relative z-10" />
            </div>

            <h3 className="text-lg md:text-2xl font-black font-heading text-white mb-3 tracking-tighter uppercase italic group-hover:text-neon-green transition-colors">{title}</h3>
            <p className="text-gray-500 text-[10px] md:text-[11px] font-bold leading-relaxed px-2 uppercase tracking-wide opacity-80 group-hover:opacity-100 transition-opacity">{desc}</p>
            
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

const AuthSection = ({ email, setEmail, password, setPassword, isResetting, setIsResetting, isRegistering, setIsRegistering, handleLogin }) => (
    <div className="min-h-screen bg-[#020202] flex items-center justify-center px-4 relative overflow-hidden">
        {/* Cinematic Backdrop */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:40px_40px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-neon-pink/10 blur-[150px] rounded-full animate-pulse" />
        <div className="absolute top-[20%] right-[20%] w-[300px] h-[300px] bg-neon-blue/5 blur-[120px] rounded-full animate-pulse delay-1000" />
        
        <Card className="p-12 w-full max-w-lg border-white/10 bg-zinc-900/40 backdrop-blur-3xl rounded-[3.5rem] relative z-10 shadow-[0_50px_100px_rgba(0,0,0,0.8)] overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-neon-pink to-transparent" />
            
            <div className="text-center mb-12">
                <div className="w-20 h-20 bg-neon-pink/10 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-neon-pink/20 relative group">
                    <div className="absolute inset-0 bg-neon-pink/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                    <Shield size={40} className="text-neon-pink relative z-10" />
                </div>
                <h1 className="text-4xl lg:text-5xl font-black font-heading text-white uppercase tracking-tighter italic leading-none">
                    {isResetting ? 'RESTORE ACCESS' : (isRegistering ? 'NEW CLEARANCE' : 'SECURE LOGIN')}
                </h1>
                <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.4em] mt-4">Command Staff Authorization Required</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-8">
                <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] pl-2">Identity Endpoint</label>
                    <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@newbi.live" className="h-16 bg-black/40 border-white/5 focus:border-neon-pink/40 rounded-2xl text-sm font-medium transition-all" required />
                </div>
                <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] pl-2">Security Key</label>
                    <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="h-16 bg-black/40 border-white/5 focus:border-neon-pink/40 rounded-2xl text-sm font-medium transition-all" required />
                </div>
                <Button type="submit" className="w-full h-16 bg-neon-pink text-black font-black font-heading uppercase tracking-[0.2em] text-xs rounded-2xl hover:scale-[1.02] active:scale-98 transition-all shadow-[0_15px_40px_rgba(255,79,139,0.3)]">
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

export default Dashboard;
