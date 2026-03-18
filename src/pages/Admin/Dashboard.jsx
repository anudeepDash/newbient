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
        { label: 'Financials', value: `₹${invoices.reduce((acc, inv) => acc + inv.amount, 0).toLocaleString()}`, icon: DollarSign, color: 'neon-green', detail: `${invoices.length} Total Invoices` },
        { label: 'Proposals', value: proposals?.length || 0, icon: FileSpreadsheet, color: 'neon-blue', detail: 'Quotation Pipeline' },
        { label: 'Portfolio', value: concerts.length, icon: Music, color: 'neon-pink', detail: 'Live Concerts' },
        { label: 'Updates', value: announcements.length, icon: Radio, color: 'yellow-400', detail: 'Public Announcements' },
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
        <div className="min-h-screen bg-[#020202] text-white overflow-x-hidden pb-20">
            {/* Immersive Background */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-neon-green/5 rounded-full blur-[150px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-neon-blue/5 rounded-full blur-[150px] animate-pulse delay-1000" />
                <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }}></div>
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-6 pt-24 md:pt-32">
                {/* Modern Header */}
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 md:mb-16 gap-6 md:gap-8">
                    <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="p-2 md:p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl shrink-0">
                                <LayoutDashboard className="text-neon-green" size={24} />
                            </div>
                            <h1 className="text-2xl md:text-4xl lg:text-5xl font-black font-heading tracking-tighter uppercase italic leading-none pr-4">NEWBI <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-green to-white">COMMAND CENTRE.</span></h1>
                        </div>
                        <p className="text-gray-500 text-[10px] md:text-sm font-bold uppercase tracking-widest pl-1 flex flex-wrap items-center gap-2">
                            Newbi Management System <span className="mx-1 md:mx-2">•</span> <span className="text-neon-blue">{user.role?.replace('_', ' ')}</span>
                            {maintenanceState.global && (
                                <>
                                    <span className="hidden md:inline mx-1 md:mx-2">•</span>
                                    <span className="inline-flex items-center gap-2 px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 text-[8px] font-black border border-red-500/20 animate-pulse mt-2 md:mt-0">
                                        <Shield size={10} /> GLOBAL MAINTENANCE ACTIVE
                                    </span>
                                </>
                            )}
                        </p>
                    </div>

                    <div className="flex items-center gap-2 bg-white/5 border border-white/10 p-1 md:p-1.5 rounded-full backdrop-blur-2xl self-start md:self-auto max-w-full overflow-x-auto scrollbar-hide">
                        <Link to="/admin/site-settings" className="p-2.5 hover:bg-white/10 rounded-full transition-all group">
                            <Settings size={18} className="text-gray-400 group-hover:text-neon-blue transition-colors" />
                        </Link>
                        <Link to="/admin/messages" className="p-2.5 hover:bg-white/10 rounded-full transition-all relative group">
                            <Bell size={18} className="text-gray-400 group-hover:text-white transition-colors" />
                            {unreadCount > 0 && <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-neon-pink rounded-full shadow-[0_0_10px_rgba(255,0,255,0.5)]" />}
                        </Link>
                        <div className="h-6 w-px bg-white/10 mx-1" />
                        <div className="flex items-center gap-3 pl-1 pr-3 py-1">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-neon-green to-neon-blue p-0.5">
                                <div className="w-full h-full rounded-full bg-black flex items-center justify-center font-black text-xs">
                                    {user.email?.[0].toUpperCase()}
                                </div>
                            </div>
                            <div className="hidden sm:block">
                                <p className="text-sm font-black text-white leading-none">{user.displayName || 'Admin'}</p>
                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter mt-1">{user.email}</p>
                            </div>
                            <button onClick={logout} className="ml-2 p-2 hover:bg-neon-pink/10 hover:text-neon-pink rounded-xl transition-all">
                                <LogOut size={18} />
                            </button>
                        </div>
                    </div>
                </header>

                {isFirstRun && <BootstrapAlert onClaim={handleClaimOwnership} />}

                {/* Glass Stats Grid */}
                {/* 
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
                    {stats.map((stat, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="group relative"
                        >
                            <div className={cn("absolute -inset-px rounded-[2.5rem] opacity-0 group-hover:opacity-20 transition-opacity blur-xl bg-gradient-to-br", 
                                stat.color === 'neon-green' ? 'from-neon-green to-emerald-500' : 
                                (stat.color === 'neon-blue' ? 'from-neon-blue to-cyan-500' : 
                                (stat.color === 'neon-pink' ? 'from-neon-pink to-purple-500' : 'from-yellow-400 to-orange-500'))
                            )} />
                            <Card className="p-8 h-full bg-zinc-900/40 backdrop-blur-3xl border-white/5 hover:border-white/10 transition-all rounded-[2.5rem] flex flex-col justify-between overflow-hidden">
                                <div className="items-start justify-between mb-8 flex">
                                    <div className={cn("p-4 rounded-2xl bg-white/5 border border-white/10 group-hover:scale-110 transition-transform duration-500", 
                                        stat.color === 'neon-green' ? 'text-neon-green' : (stat.color === 'neon-blue' ? 'text-neon-blue' : (stat.color === 'neon-pink' ? 'text-neon-pink' : 'text-yellow-400'))
                                    )}>
                                        <stat.icon size={24} />
                                    </div>
                                    <TrendingUp size={20} className="text-white/10" />
                                </div>
                                <div>
                                    <h3 className="text-4xl font-black font-heading tracking-tighter text-white mb-2 leading-none uppercase">{stat.value}</h3>
                                    <p className="text-gray-500 text-xs font-black uppercase tracking-[0.2em]">{stat.label}</p>
                                    <p className="text-gray-600 text-[10px] mt-4 font-bold uppercase">{stat.detail}</p>
                                </div>
                                <div className="absolute top-0 right-0 p-8 opacity-0 group-hover:opacity-[0.03] transition-opacity pointer-events-none">
                                    <stat.icon size={120} />
                                </div>
                            </Card>
                        </motion.div>
                    ))}
                </div>
                */}

                {/* Control Sections */}
                <div className="space-y-20">
                    <DashboardSection title="Finance & Management" gradient="from-neon-green via-neon-blue to-white">
                        <ControlCard title="Invoices" desc="Manage billing and check payment cycles." icon={FileText} color="neon-green" link="/admin/invoices" count={invoices.length} isHidden={cards.invoices} />
                        <ControlCard title="Proposals" desc="Generate premium quotations for clients." icon={FileSpreadsheet} color="neon-blue" link="/admin/proposals" count={proposals?.length || 0} isNew isHidden={cards.proposals} />
                        <ControlCard title="Ticketing" desc="Offline order management and check-ins." icon={Ticket} color="neon-pink" link="/admin/tickets" isHidden={cards.tickets} />
                    </DashboardSection>

                    <DashboardSection title="Core Content" gradient="from-neon-pink via-purple-500 to-white">
                        <ControlCard title="Upcoming" desc="Pin events to the live home carousel." icon={Calendar} color="neon-pink" link="/admin/upcoming-events" isHidden={cards.upcoming} />
                        <ControlCard title="Portfolio" desc="The record of all past events & fests." icon={Music} color="neon-green" link="/admin/concerts" isHidden={cards.portfolio} />
                        <ControlCard title="Gallery" desc="Immersive photo-cloud management." icon={Image} color="neon-blue" link="/admin/gallery-manager" isHidden={cards.gallery} />
                        <ControlCard title="Broadcast" desc="Post announcements and site news." icon={Radio} color="yellow-400" link="/admin/announcements" isHidden={cards.announcements} />
                    </DashboardSection>

                    <DashboardSection title="Social & Community" gradient="from-neon-blue via-neon-green to-white">
                        <ControlCard title="Community Hub" desc="Manage volunteer gigs, community forms, and exclusive guestlists." icon={Users} color="neon-green" link="/admin/volunteer-gigs" isHidden={cards.volunteer_gigs} />
                        <ControlCard title="Creators" desc="Influencer whitelist and verification." icon={Star} color="neon-blue" link="/admin/creators" isHidden={cards.creators} />
                        <ControlCard title="Campaigns" desc="Social takeovers and marketing gigs." icon={Target} color="neon-pink" link="/admin/campaigns" isHidden={cards.campaigns} />
                        <ControlCard title="Giveaways" desc="Viral ticket giveaways and rewards." icon={Gift} color="purple-500" link="/admin/giveaways" isNew isHidden={cards.giveaways} />
                        <ControlCard title="Members" desc="Community access and admin roles." icon={Shield} color="neon-blue" link="/admin/manage-admins" isHidden={cards.members} />
                        <ControlCard title="Inbox" desc="Client queries and gig applications." icon={Mail} color="white" link="/admin/messages" count={unreadCount} isHidden={cards.inbox} />
                    </DashboardSection>
                </div>
            </div>
        </div>
    );
};

const DashboardSection = ({ title, gradient, children }) => (
    <section>
        <div className="flex items-center gap-4 mb-6 md:mb-8">
            <h2 className={cn("text-2xl font-black font-heading tracking-tight uppercase italic bg-clip-text text-transparent bg-gradient-to-r pr-4", gradient)}>{title}</h2>
            <div className="flex-1 h-px bg-white/5" />
        </div>
        <div className="flex md:grid md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 overflow-x-auto md:overflow-visible pb-8 md:pb-0 scrollbar-hide snap-x snap-mandatory -mx-6 px-6 md:mx-0 md:px-0">
            {React.Children.map(children, (child) => (
                <div className="min-w-[85vw] md:min-w-0 snap-center h-full">
                    {child}
                </div>
            ))}
        </div>
    </section>
);

const ControlCard = ({ title, desc, icon: Icon, color, link, count, isNew, isHidden }) => (
    <Link to={isHidden ? '#' : (link || '#')} className={cn("group relative block h-full", isHidden && "pointer-events-none")}>
        <div className={cn("absolute -inset-px rounded-[2rem] opacity-0 group-hover:opacity-10 transition-opacity blur-md bg-white", isHidden && "group-hover:opacity-0")} />
        <Card className={cn(
            "relative p-6 md:p-8 h-full border-white/5 transition-all rounded-[2rem] flex flex-col items-center text-center group cursor-pointer overflow-hidden border",
            isHidden 
                ? "bg-[#0a0a0a] opacity-40 grayscale" 
                : "bg-[#111] hover:bg-zinc-900 hover:border-white/10"
        )}>
            {isHidden && (
                <div className="absolute inset-0 flex items-center justify-center z-10">
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-red-500/70 border border-red-500/20 px-3 py-1 rounded-full bg-red-500/5">Offline</span>
                </div>
            )}
            {isNew && !isHidden && <span className="absolute top-4 right-4 text-[8px] font-black uppercase tracking-widest bg-neon-blue text-black px-2 py-1 rounded-full animate-pulse">New System</span>}
            <div className={cn("w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:-translate-y-2 transition-all duration-700", 
                color === 'neon-green' ? 'text-neon-green' : (color === 'neon-blue' ? 'text-neon-blue' : (color === 'neon-pink' ? 'text-neon-pink' : (color === 'yellow-400' ? 'text-yellow-400' : 'text-white')))
            )}>
                <Icon size={32} />
            </div>
            <h3 className="text-xl font-black font-heading text-white mb-2 tracking-tight uppercase group-hover:text-neon-green transition-colors">{title}</h3>
            <p className="text-gray-500 text-xs font-medium leading-relaxed px-2">{desc}</p>
            
            {count !== undefined && (
                <div className="mt-6 px-4 py-1 rounded-full bg-white/5 border border-white/5 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    {count} Recorded
                </div>
            )}
            
            <div className="absolute top-full left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:top-[98%] transition-all duration-500" />
        </Card>
    </Link>
);

const AuthSection = ({ email, setEmail, password, setPassword, isResetting, setIsResetting, isRegistering, setIsRegistering, handleLogin, handleResetPassword, handleSignUp }) => (
    <div className="min-h-screen bg-black flex items-center justify-center px-4 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-neon-pink/5 blur-[120px] rounded-full" />
        <Card className="p-10 w-full max-w-md border-white/10 bg-zinc-900/40 backdrop-blur-3xl rounded-[3rem] relative z-10 shadow-2xl">
            <div className="text-center mb-10">
                <div className="w-16 h-16 bg-neon-pink/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-neon-pink/20">
                    <Shield size={32} className="text-neon-pink" />
                </div>
                <h1 className="text-3xl font-black font-heading text-white uppercase tracking-tighter italic">
                    {isResetting ? 'RESTORE ACCESS' : (isRegistering ? 'REQUEST AUTH' : 'SECURE LOGIN')}
                </h1>
                <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mt-2">{isResetting ? 'Password Recovery' : 'Newbi Internal Systems'}</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Email Authority</label>
                    <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@newbi.live" className="h-12 bg-black/50 border-white/5 focus:border-neon-pink/50 rounded-xl" required />
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Security Key</label>
                    <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="h-12 bg-black/50 border-white/5 focus:border-neon-pink/50 rounded-xl" required />
                </div>
                <Button type="submit" className="w-full h-14 bg-neon-pink text-black font-black font-heading uppercase tracking-widest text-sm rounded-xl hover:bg-neon-pink/80 transition-all shadow-[0_10px_30px_rgba(255,0,255,0.2)]">
                    {isRegistering ? 'INITIALIZE REQUEST' : 'AUTHENTICATE'}
                </Button>
            </form>

            <div className="mt-8 flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                <button onClick={() => setIsResetting(!isResetting)} className="text-gray-500 hover:text-white transition-colors">Forgot Key?</button>
                <button onClick={() => setIsRegistering(!isRegistering)} className="text-neon-blue hover:underline underline-offset-4">{isRegistering ? 'Back to Login' : 'Request Access'}</button>
            </div>
        </Card>
    </div>
);

const BootstrapAlert = ({ onClaim }) => (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mb-12 p-8 bg-gradient-to-r from-neon-green/10 via-black to-black border border-neon-green/30 rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between gap-6 backdrop-blur-xl">
        <div className="flex items-center gap-6">
            <div className="p-4 rounded-2xl bg-neon-green/20 text-neon-green">
                <Sparkles size={32} />
            </div>
            <div>
                <h2 className="text-xl font-black font-heading text-white uppercase tracking-tight">System Initialization Required</h2>
                <p className="text-gray-400 text-sm mt-1">No admins detected. Claim <strong>SUPER ADMIN</strong> ownership to initialize the command centre.</p>
            </div>
        </div>
        <Button onClick={onClaim} className="bg-white text-black font-black font-heading uppercase tracking-widest text-xs h-12 px-8 rounded-xl hover:scale-105 active:scale-95 transition-all">
            Initialize Authority
        </Button>
    </motion.div>
);

export default Dashboard;
