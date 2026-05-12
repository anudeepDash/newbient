import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    X, User, Shield, Briefcase, Ticket, LogOut, ExternalLink, Settings, 
    Sparkles, AlertCircle, ArrowRight, Key, RefreshCw, Mail, Check, 
    Edit2, Loader2, Info, Instagram, ShieldCheck, 
    LayoutDashboard, CreditCard, History, ChevronRight, Image as ImageIcon
} from 'lucide-react';
import { useStore } from '../lib/store';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import { loginWithMeta } from '../lib/metaSDK';

const ProfilePanel = ({ isOpen, onClose }) => {
    const { user, logout, creators, artists, addNotification, resetPassword, updateDisplayName, verifyInstagramFollowers, ticketOrders, notifications } = useStore();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'tickets', 'settings', 'security'
    const [isUpdating, setIsUpdating] = useState(false);
    const [newDisplayName, setNewDisplayName] = useState(user?.displayName || '');
    const [isEditingName, setIsEditingName] = useState(false);
    const [ticketSort, setTicketSort] = useState('booking'); // 'booking' or 'event'
    const [ticketFilter, setTicketFilter] = useState('upcoming'); // 'upcoming' or 'past'

    if (!user) return null;

    const creatorProfile = creators?.find(c => c.uid === user.uid);
    const isCreator = !!creatorProfile;
    const isApprovedCreator = creatorProfile?.profileStatus === 'approved';

    const artistProfile = artists?.find(a => a.uid === user.uid);
    const isArtist = !!artistProfile;
    const isApprovedArtist = artistProfile?.profileStatus === 'approved';

    const { upcomingEvents, portfolio } = useStore();
    const allPossibleEvents = [...(upcomingEvents || []), ...(portfolio || [])];

    const userTickets = (ticketOrders?.filter(order => order.userId === user.uid) || [])
        .map(order => {
            const event = allPossibleEvents.find(e => e.id === order.eventId);
            return {
                ...order,
                eventTitle: order.eventTitle || event?.title || 'Event Pass',
                eventDate: order.eventDate || event?.date || null
            };
        })
        .filter(ticket => {
            const title = (ticket.eventTitle || '').toLowerCase();
            // Only leave "At the Terminal" and "Jazba Tere Ishq Ka"
            return title.includes('jazba') || title.includes('terminal');
        })
        .filter(ticket => {
            if (!ticket.eventDate) return ticketFilter === 'upcoming';
            const eventDate = new Date(ticket.eventDate);
            const now = new Date();
            now.setHours(0, 0, 0, 0); // Start of today
            
            if (ticketFilter === 'upcoming') {
                return eventDate >= now;
            } else {
                return eventDate < now;
            }
        })
        .sort((a, b) => {
            if (ticketSort === 'event') {
                const dateA = a.eventDate ? new Date(a.eventDate) : new Date(0);
                const dateB = b.eventDate ? new Date(b.eventDate) : new Date(0);
                return ticketFilter === 'upcoming' ? dateA - dateB : dateB - dateA; // Ascending for upcoming, Descending for past
            } else {
                // Booking date (createdAt)
                const dateA = a.createdAt?.seconds ? new Date(a.createdAt.seconds * 1000) : new Date(a.createdAt || 0);
                const dateB = b.createdAt?.seconds ? new Date(b.createdAt.seconds * 1000) : new Date(b.createdAt || 0);
                return dateB - dateA; // Newest booking first
            }
        });

    const tabs = [
        { id: 'overview', label: 'Overview', icon: LayoutDashboard },
        { id: 'tickets', label: 'Ticket Vault', icon: Ticket },
        { id: 'settings', label: 'Settings', icon: User },
        { id: 'security', label: 'Security', icon: Shield },
    ];

    const handleLogout = async () => {
        await logout();
        onClose();
        navigate('/');
    };

    const handleResetPassword = async () => {
        setIsUpdating(true);
        try {
            await resetPassword(user.email);
            addNotification({
                title: "Security Link Dispatched",
                content: "Check your inbox for password reset instructions.",
                type: 'message'
            });
        } catch (err) {
            addNotification({
                title: "Dispatch Failed",
                content: "Unable to send reset email.",
                type: 'default'
            });
        } finally {
            setIsUpdating(false);
        }
    };

    const handleUpdateName = async () => {
        if (!newDisplayName.trim()) return;
        setIsUpdating(true);
        try {
            await updateDisplayName(newDisplayName);
            setIsEditingName(false);
            addNotification({
                title: "Identity Updated",
                content: "Your display name has been successfully updated.",
                type: 'message'
            });
        } catch (err) {
            addNotification({
                title: "Update Error",
                content: "Failed to sync identity changes.",
                type: 'default'
            });
        } finally {
            setIsUpdating(false);
        }
    };


    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100]"
                    />

                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="fixed top-0 right-0 h-full w-full max-w-xl bg-[#050505] border-l border-white/10 z-[101] overflow-hidden flex flex-col shadow-[-20px_0_50px_rgba(0,0,0,0.5)]"
                    >
                        {/* Dynamic Background */}
                        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-neon-blue/5 blur-[120px] pointer-events-none" />
                        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-neon-pink/5 blur-[120px] pointer-events-none" />

                        {/* Top Header */}
                        <div className="p-6 flex items-center justify-between relative z-10">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-neon-blue animate-pulse shadow-[0_0_10px_#38b6ff]" />
                                <h2 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em]">Personal Hub</h2>
                            </div>
                            <button 
                                onClick={onClose}
                                className="w-10 h-10 rounded-full bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-all flex items-center justify-center"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Profile Identity Header */}
                        <div className="px-8 pb-6 pt-2 relative z-10 border-b border-white/5">
                            <div className="flex items-center gap-6">
                                <div className="relative group">
                                    <div className="absolute -inset-1 bg-gradient-to-r from-neon-blue via-neon-pink to-neon-purple rounded-2xl blur opacity-40 group-hover:opacity-70 transition duration-500"></div>
                                    <div className="relative w-20 h-20 rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-center overflow-hidden">
                                        <span className="text-3xl font-black text-white italic uppercase select-none">
                                            {user.displayName ? user.displayName.charAt(0) : 'U'}
                                        </span>
                                    </div>
                                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#050505] rounded-full flex items-center justify-center p-0.5">
                                        <div className="w-full h-full bg-neon-green rounded-full shadow-[0_0_10px_#39FF14] flex items-center justify-center">
                                            <div className="w-1 h-1 bg-black rounded-full animate-pulse" />
                                        </div>
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-1">
                                        <h3 className="text-xl font-black font-heading text-white italic tracking-tighter capitalize leading-none">
                                            {user.displayName || 'Member'}
                                        </h3>
                                        {isApprovedCreator && <ShieldCheck size={16} className="text-neon-blue" />}
                                        {isApprovedArtist && <Sparkles size={16} className="text-[#FF6B6B]" />}
                                    </div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            {user.role === 'developer' && (
                                                <span className="text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest border bg-red-500/10 text-red-500 border-red-500/20">
                                                    DEVELOPER
                                                </span>
                                            )}
                                            {user.role === 'super_admin' && (
                                                <span className="text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest border bg-neon-blue/10 text-neon-blue border-neon-blue/20">
                                                    SYSTEM ADMIN
                                                </span>
                                            )}
                                            {isApprovedCreator && (
                                                <span className="text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest border bg-neon-green/10 text-neon-green border-neon-green/20">
                                                    VERIFIED CREATOR
                                                </span>
                                            )}
                                            {isApprovedArtist && (
                                                <span className="text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest border bg-[#FF6B6B]/10 text-[#FF6B6B] border-[#FF6B6B]/20">
                                                    VERIFIED ARTIST
                                                </span>
                                            )}
                                            {user.hasJoinedTribe && (
                                                <span className="text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest border bg-neon-blue/10 text-neon-blue border-neon-blue/20">
                                                    TRIBE MEMBER
                                                </span>
                                            )}
                                            {(!isApprovedCreator && !isApprovedArtist && !user.hasJoinedTribe && user.role !== 'developer' && user.role !== 'super_admin') && (
                                                <span className="text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest border bg-white/5 text-gray-500 border-white/5">
                                                    MEMBER
                                                </span>
                                            )}
                                        <div className="flex items-center gap-1.5 text-[8px] text-gray-500 font-bold uppercase tracking-wider bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
                                            <Sparkles size={8} className="text-yellow-500" />
                                            Joined {new Date(user.createdAt || Date.now()).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Navigation Tabs */}
                        <div className="flex items-center px-4 pt-4 border-b border-white/5 relative z-10 bg-black/20 backdrop-blur-xl">
                            {tabs.map((tab) => {
                                const Icon = tab.icon;
                                const isActive = activeTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={cn(
                                            "flex-1 flex flex-col items-center gap-2 py-4 relative group transition-all",
                                            isActive ? "text-white" : "text-gray-500 hover:text-gray-300"
                                        )}
                                    >
                                        <Icon size={18} className={cn("transition-transform duration-300", isActive && "scale-110")} />
                                        <span className="text-[10px] font-black uppercase tracking-widest">{tab.label}</span>
                                        {isActive && (
                                            <motion.div 
                                                layoutId="activeTab"
                                                className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-neon-blue to-neon-pink"
                                            />
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={activeTab}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.2 }}
                                    className="p-8"
                                >
                                    {activeTab === 'overview' && (
                                        <div className="space-y-8">
                                            {/* Quick Stats/Summary Cards */}
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="p-6 rounded-3xl bg-gradient-to-br from-white/5 to-transparent border border-white/10 group hover:border-neon-blue/30 transition-all cursor-pointer" onClick={() => setActiveTab('tickets')}>
                                                    <div className="flex items-center justify-between mb-4">
                                                        <div className="w-10 h-10 rounded-2xl bg-neon-blue/10 flex items-center justify-center text-neon-blue">
                                                            <Ticket size={20} />
                                                        </div>
                                                        <ChevronRight size={16} className="text-gray-700 group-hover:text-white transition-all" />
                                                    </div>
                                                    <p className="text-2xl font-black text-white italic">{userTickets.length}</p>
                                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Tickets</p>
                                                </div>
                                                <div className="p-6 rounded-3xl bg-gradient-to-br from-white/5 to-transparent border border-white/10 group hover:border-neon-pink/30 transition-all">
                                                    <div className="flex items-center justify-between mb-4">
                                                        <div className="w-10 h-10 rounded-2xl bg-neon-pink/10 flex items-center justify-center text-neon-pink">
                                                            <Briefcase size={20} />
                                                        </div>
                                                        <ChevronRight size={16} className="text-gray-700 group-hover:text-white transition-all" />
                                                    </div>
                                                    <p className="text-2xl font-black text-white italic">{isCreator ? 'ACTIVE' : 'NONE'}</p>
                                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Creator Status</p>
                                                </div>
                                                <div className="p-6 rounded-3xl bg-gradient-to-br from-white/5 to-transparent border border-white/10 group hover:border-[#FF6B6B]/30 transition-all" onClick={() => { if(isArtist) { navigate('/artistant'); onClose(); } }}>
                                                    <div className="flex items-center justify-between mb-4">
                                                        <div className="w-10 h-10 rounded-2xl bg-[#FF6B6B]/10 flex items-center justify-center text-[#FF6B6B]">
                                                            <Sparkles size={20} />
                                                        </div>
                                                        <ChevronRight size={16} className="text-gray-700 group-hover:text-white transition-all" />
                                                    </div>
                                                    <p className="text-2xl font-black text-white italic">{isArtist ? 'VERIFIED' : 'NONE'}</p>
                                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Artist Status</p>
                                                </div>
                                            </div>

                                            {/* Creator Dashboard Shortcut */}
                                            {isCreator && (
                                                <button 
                                                    onClick={() => { navigate('/creator-dashboard'); onClose(); }}
                                                    className="w-full flex items-center justify-between p-6 rounded-[2rem] bg-neon-blue/5 border border-neon-blue/10 hover:bg-neon-blue/10 hover:border-neon-blue transition-all group"
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 rounded-2xl bg-neon-blue/10 flex items-center justify-center text-neon-blue shadow-[0_0_15px_rgba(56,182,255,0.1)]">
                                                            <LayoutDashboard size={24} />
                                                        </div>
                                                        <div className="text-left">
                                                            <p className="text-sm font-black text-white uppercase tracking-widest italic">Studio Workspace</p>
                                                            <p className="text-[10px] text-neon-blue/60 font-bold uppercase tracking-tighter mt-0.5">Access your dashboard</p>
                                                        </div>
                                                    </div>
                                                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-neon-blue group-hover:text-black transition-all">
                                                        <ArrowRight size={18} />
                                                    </div>
                                                </button>
                                            )}

                                            {isArtist && (
                                                <button 
                                                    onClick={() => { navigate('/artistant'); onClose(); }}
                                                    className="w-full flex items-center justify-between p-6 rounded-[2rem] bg-[#FF6B6B]/5 border border-[#FF6B6B]/10 hover:bg-[#FF6B6B]/10 hover:border-[#FF6B6B] transition-all group"
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 rounded-2xl bg-[#FF6B6B]/10 flex items-center justify-center text-[#FF6B6B] shadow-[0_0_15px_rgba(255,107,107,0.1)]">
                                                            <ImageIcon size={24} />
                                                        </div>
                                                        <div className="text-left">
                                                            <p className="text-sm font-black text-white uppercase tracking-widest italic">Artist Hub</p>
                                                            <p className="text-[10px] text-[#FF6B6B]/60 font-bold uppercase tracking-tighter mt-0.5">Manage your talent profile</p>
                                                        </div>
                                                    </div>
                                                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-[#FF6B6B] group-hover:text-black transition-all">
                                                        <ArrowRight size={18} />
                                                    </div>
                                                </button>
                                            )}

                                            {!isCreator && (
                                                <button 
                                                    onClick={() => { navigate('/creator'); onClose(); }}
                                                    className="w-full flex items-center justify-between p-6 rounded-[2rem] bg-white/5 border border-white/5 hover:border-neon-blue transition-all group"
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-gray-400 group-hover:text-neon-blue group-hover:bg-neon-blue/10 transition-all">
                                                            <Sparkles size={24} />
                                                        </div>
                                                        <div className="text-left">
                                                            <p className="text-sm font-black text-white uppercase tracking-widest italic">Become a Creator</p>
                                                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter mt-0.5">Join the network and earn impact</p>
                                                        </div>
                                                    </div>
                                                    <ArrowRight size={18} className="text-gray-700 group-hover:text-white group-hover:translate-x-1 transition-all" />
                                                </button>
                                            )}

                                            {/* Recent Activity Mock */}
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <History size={14} className="text-gray-500" />
                                                        <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Recent Activity</h4>
                                                    </div>
                                                    <button className="text-[8px] font-black text-neon-blue uppercase tracking-widest hover:underline">View All</button>
                                                </div>
                                                <div className="space-y-2">
                                                    {notifications?.length > 0 ? (
                                                        notifications.slice(0, 3).map((notif, i) => (
                                                            <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5 group hover:bg-white/[0.04] transition-all">
                                                                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-gray-500 group-hover:text-neon-blue transition-colors">
                                                                    {notif.type === 'ticket' ? <Ticket size={14} /> : 
                                                                     notif.type === 'security' ? <Shield size={14} /> : 
                                                                     <Info size={14} />}
                                                                </div>
                                                                <div className="flex-1">
                                                                    <p className="text-[10px] font-bold text-gray-300 uppercase leading-tight">{notif.title}</p>
                                                                    <p className="text-[8px] text-gray-600 font-bold uppercase mt-1">
                                                                        {notif.createdAt ? new Date(notif.createdAt).toLocaleDateString() : 'Just now'} • {notif.type === 'message' ? 'Update' : 'System'}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="flex items-center gap-4 p-6 rounded-2xl bg-white/[0.01] border border-dashed border-white/5">
                                                            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-gray-700">
                                                                <History size={20} />
                                                            </div>
                                                            <div>
                                                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">No recent actions</p>
                                                                <p className="text-[8px] text-gray-700 font-bold uppercase mt-1">Your activity will appear here</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {activeTab === 'tickets' && (
                                        <div className="space-y-6">
                                            <div className="flex items-center justify-between mb-2">
                                                <div>
                                                    <h3 className="text-xl font-black text-white uppercase italic tracking-tighter">My Tickets</h3>
                                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Your secured entry passes</p>
                                                </div>
                                                <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2">
                                                    <Ticket size={14} className="text-neon-pink" />
                                                    <span className="text-xs font-black text-white">{userTickets.length}</span>
                                                </div>
                                            </div>

                                            <div className="flex flex-col gap-6">
                                                <div className="flex gap-2 bg-white/5 p-1 rounded-2xl border border-white/5">
                                                    <button 
                                                        onClick={() => setTicketFilter('upcoming')}
                                                        className={cn(
                                                            "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                                            ticketFilter === 'upcoming' ? "bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.2)]" : "text-gray-500 hover:text-gray-300"
                                                        )}
                                                    >
                                                        Upcoming Passes
                                                    </button>
                                                    <button 
                                                        onClick={() => setTicketFilter('past')}
                                                        className={cn(
                                                            "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                                            ticketFilter === 'past' ? "bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.2)]" : "text-gray-500 hover:text-gray-300"
                                                        )}
                                                    >
                                                        Past History
                                                    </button>
                                                </div>

                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-4">
                                                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Sort By:</span>
                                                        <div className="flex gap-2">
                                                            <button 
                                                                onClick={() => setTicketSort('booking')}
                                                                className={cn(
                                                                    "px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest border transition-all",
                                                                    ticketSort === 'booking' ? "bg-neon-pink/10 border-neon-pink text-neon-pink" : "bg-white/5 border-white/5 text-gray-500 hover:text-white"
                                                                )}
                                                            >
                                                                Booking
                                                            </button>
                                                            <button 
                                                                onClick={() => setTicketSort('event')}
                                                                className={cn(
                                                                    "px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest border transition-all",
                                                                    ticketSort === 'event' ? "bg-neon-pink/10 border-neon-pink text-neon-pink" : "bg-white/5 border-white/5 text-gray-500 hover:text-white"
                                                                )}
                                                            >
                                                                Event
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {userTickets.length > 0 ? (
                                                <div className="grid grid-cols-1 gap-4">
                                                    {userTickets.map((ticket, i) => (
                                                        <div key={i} className="group relative overflow-hidden rounded-[2rem] bg-white/5 border border-white/10 hover:border-neon-pink/30 transition-all p-6">
                                                            <div className="absolute top-0 right-0 w-32 h-32 bg-neon-pink/5 blur-3xl pointer-events-none" />
                                                            <div className="flex items-center gap-6">
                                                                <div className="w-16 h-16 rounded-2xl bg-black/40 border border-white/5 flex items-center justify-center shrink-0">
                                                                    <ImageIcon size={30} className="text-gray-700" />
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <h4 className="text-lg font-black text-white uppercase italic truncate">{ticket.eventTitle}</h4>
                                                                    <div className="flex items-center gap-3 mt-1">
                                                                        <span className="text-[10px] font-bold text-gray-500 uppercase">
                                                                            {ticket.eventDate ? new Date(ticket.eventDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : 'TBD'}
                                                                        </span>
                                                                        <span className="w-1 h-1 rounded-full bg-gray-700" />
                                                                        <span className="text-[10px] font-black text-neon-pink uppercase tracking-widest">{ticket.bookingRef}</span>
                                                                    </div>
                                                                    <div className="mt-2 flex items-center gap-2">
                                                                        <div className={cn(
                                                                            "w-1.5 h-1.5 rounded-full",
                                                                            ticket.status === 'confirmed' || ticket.status === 'dispatched' ? "bg-neon-green" : "bg-yellow-500"
                                                                        )} />
                                                                        <span className="text-[8px] font-black uppercase text-gray-500 tracking-widest">
                                                                            {ticket.status === 'confirmed' || ticket.status === 'dispatched' ? 'Verified' : 'Pending Verification'}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                                <button 
                                                                    onClick={() => { navigate(`/ticket/${ticket.bookingRef}`); onClose(); }}
                                                                    className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center hover:bg-neon-pink hover:text-black transition-all shadow-lg"
                                                                >
                                                                    <ExternalLink size={20} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="py-20 text-center space-y-4 rounded-[2rem] bg-white/[0.02] border border-dashed border-white/10">
                                                    <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mx-auto text-gray-600">
                                                        <Ticket size={40} />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black text-white uppercase tracking-widest">No Active Passes</p>
                                                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-2">Your tickets will appear here once secured.</p>
                                                    </div>
                                                    <button 
                                                        onClick={() => { navigate('/concertzone'); onClose(); }}
                                                        className="px-6 py-3 rounded-xl bg-white text-black text-[10px] font-black uppercase tracking-widest hover:bg-neon-pink transition-colors"
                                                    >
                                                        Explore Events
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {activeTab === 'settings' && (
                                        <div className="space-y-8">
                                            <div className="space-y-6">
                                                {/* Display Name Edit */}
                                                <div className="space-y-3">
                                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest pl-1">Professional Identity</label>
                                                    <div className="relative group">
                                                        <div className={cn(
                                                            "absolute -inset-0.5 bg-gradient-to-r from-neon-blue to-neon-purple rounded-2xl blur opacity-0 transition duration-500",
                                                            isEditingName && "opacity-20"
                                                        )} />
                                                        <input 
                                                            type="text" 
                                                            disabled={!isEditingName || isUpdating}
                                                            value={isEditingName ? newDisplayName : (user.displayName || '')} 
                                                            onChange={(e) => setNewDisplayName(e.target.value)}
                                                            className="relative w-full h-16 bg-white/5 border border-white/10 rounded-2xl px-6 text-sm font-bold text-white focus:border-neon-blue transition-all disabled:opacity-50 outline-none"
                                                            placeholder="Member Display Name"
                                                        />
                                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                                            {isEditingName && (
                                                                <button 
                                                                    onClick={() => { setIsEditingName(false); setNewDisplayName(user.displayName || ''); }}
                                                                    className="w-10 h-10 rounded-xl bg-white/5 text-gray-500 hover:text-white transition-all flex items-center justify-center"
                                                                >
                                                                    <X size={16} />
                                                                </button>
                                                            )}
                                                            <button 
                                                                onClick={() => isEditingName ? handleUpdateName() : setIsEditingName(true)}
                                                                disabled={isUpdating}
                                                                className={cn(
                                                                    "w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-lg",
                                                                    isEditingName ? "bg-neon-blue text-black" : "bg-white/10 text-gray-400 hover:text-white"
                                                                )}
                                                            >
                                                                {isUpdating ? <Loader2 size={16} className="animate-spin" /> : isEditingName ? <Check size={18} /> : <Edit2 size={16} />}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Email View */}
                                                <div className="space-y-3">
                                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest pl-1">Email Address</label>
                                                    <div className="w-full h-16 bg-white/[0.02] border border-white/5 rounded-2xl px-6 flex items-center justify-between group">
                                                        <span className="text-sm font-bold text-gray-500">{user.email}</span>
                                                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-gray-700">
                                                            <Mail size={16} />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Logout Section */}
                                                <div className="pt-8 border-t border-white/5">
                                                    <button 
                                                        onClick={handleLogout}
                                                        className="w-full h-14 rounded-2xl bg-red-500/5 border border-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-3 group"
                                                    >
                                                        <LogOut size={18} className="group-hover:-translate-x-1 transition-transform" />
                                                        <span className="text-xs font-black uppercase tracking-widest">Logout Session</span>
                                                    </button>
                                                    <p className="text-[9px] text-gray-600 font-bold uppercase text-center mt-3 tracking-tighter">Securely end your personal hub session</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {activeTab === 'security' && (
                                        <div className="space-y-8">
                                            <div className="p-10 rounded-[3rem] bg-gradient-to-br from-white/5 to-transparent border border-white/10 text-center space-y-6 relative overflow-hidden group">
                                                <div className="absolute inset-0 bg-neon-blue/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                                <div className="w-20 h-20 rounded-3xl bg-neon-blue/10 flex items-center justify-center text-neon-blue mx-auto shadow-[0_0_30px_rgba(56,182,255,0.1)] group-hover:scale-110 transition-transform duration-500">
                                                    <Key size={36} />
                                                </div>
                                                <div>
                                                    <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">Account Security</h3>
                                                    <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest leading-relaxed mt-2 max-w-xs mx-auto">
                                                        Manage your access credentials and protect your personal hub from unauthorized entry.
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <div className="space-y-4">
                                                    <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest pl-1">Access Management</h4>
                                                    <button 
                                                        onClick={handleResetPassword}
                                                        disabled={isUpdating}
                                                        className="w-full h-20 rounded-3xl bg-white/5 border border-white/10 hover:bg-white hover:text-black transition-all flex items-center justify-between px-8 group disabled:opacity-50"
                                                    >
                                                        <div className="flex items-center gap-5">
                                                            <RefreshCw size={22} className={cn("text-neon-blue transition-transform group-hover:rotate-180 duration-700", isUpdating && "animate-spin")} />
                                                            <div className="text-left">
                                                                <span className="block text-xs font-black uppercase tracking-widest">Update Password</span>
                                                                <span className="block text-[9px] text-gray-500 font-bold uppercase mt-1 group-hover:text-black/60">Dispatches reset link to email</span>
                                                            </div>
                                                        </div>
                                                        <ArrowRight size={18} className="opacity-30 group-hover:opacity-100 transition-all group-hover:translate-x-1" />
                                                    </button>
                                                </div>

                                                <div className="pt-8 space-y-4 border-t border-white/5">
                                                    <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest pl-1">Privacy & Data</h4>
                                                    <button className="w-full h-16 rounded-2xl bg-white/[0.02] border border-white/5 text-gray-600 hover:text-white hover:bg-white/5 transition-all flex items-center justify-between px-6 text-left">
                                                        <div className="flex items-center gap-4">
                                                            <Info size={18} />
                                                            <span className="text-[10px] font-black uppercase tracking-widest">Data Portability Request</span>
                                                        </div>
                                                        <span className="text-[8px] font-black px-3 py-1.5 bg-white/5 rounded-lg text-gray-500 group-hover:bg-white/10">ARCHIVE</span>
                                                    </button>
                                                    <button className="w-full h-16 rounded-2xl bg-red-500/5 border border-red-500/10 text-red-500/40 hover:bg-red-500 hover:text-white transition-all flex items-center justify-between px-6 text-left group">
                                                        <div className="flex items-center gap-4">
                                                            <AlertCircle size={18} />
                                                            <span className="text-[10px] font-black uppercase tracking-widest">Delete Account</span>
                                                        </div>
                                                        <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform opacity-40 group-hover:opacity-100" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            </AnimatePresence>
                        </div>

                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default ProfilePanel;
