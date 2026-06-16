import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Zap, Star, Users, LogOut, Settings, Home, Music, Image as ImageIcon, User as UserIcon, PlusCircle, LayoutGrid, Mic2, Search, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import NotificationBell from './NotificationBell';
import ProfilePanel from './ProfilePanel';
import { useStore } from '../lib/store';
import logo from '../assets/logo.png';

const Navbar = () => {
    const { maintenanceState, user, siteSettings, creators, artists, announcements } = useStore();
    const pinnedAnnouncement = announcements?.find(a => a.isPinned);
    const [isOpen, setIsOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const location = useLocation();

    const allLinks = [
        { name: 'HOME', path: '/', icon: Home },
        { name: 'ARTISTANT', path: '/artistant', icon: Mic2 },
        { name: 'COMMUNITY', path: '/community', featureId: 'community', icon: Users },
        { name: 'CREATOR', path: '/creator', matchPaths: ['/creator-dashboard', '/creator'], featureId: 'influencer', icon: Zap },
        { name: 'CONCERT ZONE', path: '/concertzone', featureId: 'concerts', icon: Music },
        { name: 'CONTACT', path: '/contact', featureId: 'contact', icon: LayoutGrid },
    ];

    const isAdmin = user?.role === 'super_admin' || user?.role === 'developer' || user?.role === 'founder';

    const mobilePrimaryLinks = [
        { name: 'HOME', path: '/', icon: Home },
        { name: 'ARTISTANT', path: '/artistant', icon: Mic2 },
        { name: 'COMMUNITY', path: '/community', featureId: 'community', icon: Users },
        { name: 'CREATOR', path: '/creator', matchPaths: ['/creator-dashboard', '/creator'], featureId: 'influencer', icon: Zap },
        { name: 'MORE', action: () => setIsOpen(true), icon: Menu },
    ];

    const hideMaintenance = siteSettings.hideMaintenancePages && user?.role !== 'developer';
    const links = allLinks.filter(link => {
        if (!hideMaintenance || !link.featureId) return true;
        const isUnderMaintenance = maintenanceState.global || maintenanceState.pages?.[link.featureId];
        return !isUnderMaintenance;
    });

    const toggleMenu = () => setIsOpen(!isOpen);

    return (
        <>
            {/* Global Maintenance Bypass Banner for Developer */}
            {(maintenanceState.global && user?.role === 'developer') && (
                <div className="fixed top-0 left-0 right-0 z-[60] bg-red-600 text-white text-[10px] font-black uppercase tracking-[0.2em] py-1 text-center ">
                    ⚠️ Global Maintenance Active - Bypassing as {user.role?.replace('_', ' ')} ⚠️
                </div>
            )}

            {/* Global Pinned Announcement Banner */}
            {(pinnedAnnouncement && !(maintenanceState.global && user?.role === 'developer')) && (
                <motion.div 
                    initial={{ y: -50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="fixed top-0 left-0 right-0 z-[55] bg-zinc-950/20 backdrop-blur-2xl border-b border-white/5 py-4 px-6 text-center shadow-[0_4px_30px_rgba(0,0,0,0.5)] overflow-hidden group"
                >
                    {/* Animated Neon Underline */}

                    {(() => {
                        const destination = pinnedAnnouncement.link || (pinnedAnnouncement.linkedEventId ? `/?event=${pinnedAnnouncement.linkedEventId}` : null);
                        const content = (
                            <div className="flex items-center justify-center gap-3">
                                <Star size={12} className="text-neon-green " />
                                <p className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-white/90">
                                    <span className="text-neon-green mr-2">{pinnedAnnouncement.title}</span>
                                    <span className="opacity-60">{pinnedAnnouncement.content}</span>
                                </p>
                            </div>
                        );

                        if (!destination) return content;

                        return (
                            <Link to={destination} className="hover:opacity-80 transition-all block">
                                {content}
                            </Link>
                        );
                    })()}
                </motion.div>
            )}

            {/* Top Navbar - Hidden on Document Engines */}
            {/* Top Navbar - Hidden on Document Engines */}
            {!location.pathname.toLowerCase().includes('/admin/create-') && !location.pathname.toLowerCase().includes('/admin/edit-') && !location.pathname.toLowerCase().includes('/admin/agreements/') && (
                <nav className={cn(
                    "fixed left-1/2 -translate-x-1/2 z-50 transition-all duration-500 w-full max-w-7xl px-4",
                (maintenanceState.global && user?.role === 'developer') 
                    ? "top-14" 
                    : pinnedAnnouncement 
                        ? "top-14" 
                        : "top-4 md:top-6"
            )}>
                {/* Redesigned Floating Header Navigation - Unified Glassmorphic Capsule */}
                <header className="w-full h-16 bg-zinc-950/35 backdrop-blur-3xl border border-white/[0.08] rounded-2xl px-6 md:px-8 flex items-center justify-between shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] select-none">
                    {/* Left: Logo */}
                    <div className="flex items-center gap-3">
                        <Link to="/" className="flex items-center gap-3 group">
                            <img src={logo} alt="Newbi Entertainments" className="h-6 w-auto" />
                        </Link>
                    </div>

                    {/* Center: Desktop Menu */}
                    <div className="hidden md:flex items-center gap-1 bg-black/20 p-1.5 rounded-full border border-white/5 backdrop-blur-3xl">
                        {allLinks.map((link) => {
                            const isUnderMaintenance = link.featureId && (maintenanceState.global || maintenanceState.pages?.[link.featureId]);
                            const isActive = link.matchPaths ? link.matchPaths.includes(location.pathname) : location.pathname === link.path;
                            const isClickable = !isUnderMaintenance || user?.role === 'developer';
                            
                            return (
                                <Link
                                    key={link.name}
                                    to={isClickable ? link.path : '#'}
                                    className={cn(
                                        'px-4 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all rounded-full relative group flex items-center gap-2',
                                        isActive ? 'text-black' : 'text-zinc-400 hover:text-white',
                                        isUnderMaintenance && !isClickable && 'opacity-60 cursor-not-allowed grayscale'
                                    )}
                                >
                                    <span className="relative z-10">{link.name}</span>
                                    {isUnderMaintenance && (
                                        <div className="w-1.5 h-1.5 rounded-full bg-red-500 relative z-10" title="Under Maintenance" />
                                    )}
                                    {isActive && (
                                        <motion.div 
                                            layoutId="nav-active"
                                            className="absolute inset-0 bg-white rounded-full"
                                            transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                                        />
                                    )}
                                </Link>
                            );
                        })}
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 sm:gap-3">
                        {/* Desktop Only Settings & Admin links */}
                        <div className="hidden md:flex items-center gap-3">
                            {user && ['developer', 'super_admin', 'founder'].includes(user.role) && (
                                <Link to="/admin/system-command" className="p-1.5 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-all">
                                    <Settings size={14} />
                                </Link>
                            )}
                            {user && ['developer', 'super_admin', 'founder'].includes(user.role) && (
                                <Link 
                                    to="/admin" 
                                    className="p-2 rounded-xl bg-neon-green/10 border border-neon-green/20 text-neon-green hover:bg-neon-green hover:text-black transition-all"
                                    title="Open Admin"
                                >
                                    <LayoutGrid size={16} />
                                </Link>
                            )}
                        </div>

                        <NotificationBell />

                        {user && <div className="h-4 w-px bg-white/10 mx-0.5" />}

                        {user ? (
                            <div 
                                className="flex items-center gap-3 cursor-pointer select-none group/avatar"
                                onClick={() => setIsProfileOpen(true)}
                            >
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center shrink-0 p-0.5 group-hover/avatar:border-neon-green/50 transition-all shadow-md">
                                        <div className="w-full h-full rounded-full bg-white/5 flex items-center justify-center font-black text-[10px] text-white group-hover/avatar:text-neon-green">
                                            {user.displayName ? user.displayName.charAt(0) : 'U'}
                                        </div>
                                    </div>
                                    <div className="text-left flex flex-col justify-center hidden md:flex">
                                        <span className="text-[10px] font-bold text-white leading-none capitalize tracking-tight group-hover/avatar:text-neon-green transition-colors">
                                            {user.displayName?.split(' ')[0] || 'Member'}
                                        </span>
                                        <span className="text-[7px] text-neon-green uppercase tracking-[0.15em] font-black mt-0.5">
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
                                className="h-10 px-5 rounded-xl bg-white text-black text-[9px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shrink-0"
                            >
                                Login
                            </button>
                        )}
                    </div>
                </header>
            </nav>
            )}

            {/* iOS-Style Bottom Navigation (Mobile Only) */}
            {!location.pathname.toLowerCase().startsWith('/admin') && !location.pathname.toLowerCase().includes('/admin/') && (
                <div 
                    className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-3xl border-t border-white/10"
                    style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
                >
                    <div className="flex items-center justify-around px-2 pt-2 pb-3">
                        {mobilePrimaryLinks.map((link) => {
                            const isActive = link.matchPaths ? link.matchPaths.includes(location.pathname) : location.pathname === link.path;
                            const Icon = link.icon;
                            const isUnderMaintenance = link.featureId && (maintenanceState.global || maintenanceState.pages?.[link.featureId]);
                            const isClickable = !isUnderMaintenance || user?.role === 'developer';

                            const content = (
                                <>
                                    <motion.div
                                        animate={{ scale: isActive ? 1.15 : 1 }}
                                        transition={{ type: "spring", stiffness: 400, damping: 17 }}
                                        className="relative"
                                    >
                                        <Icon size={22} className={isActive ? "text-neon-green drop-shadow-[0_0_8px_rgba(57,255,20,0.6)]" : "text-zinc-400"} />
                                        {isUnderMaintenance && (
                                            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-black" />
                                        )}
                                    </motion.div>
                                    <span className={cn(
                                        "text-[9px] font-bold mt-1 tracking-wide",
                                        isActive ? "text-white" : "text-zinc-500"
                                    )}>
                                        {link.name}
                                    </span>
                                    {isActive && (
                                        <motion.div 
                                            layoutId="ios-bottom-nav-active"
                                            className="absolute -top-2 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-neon-green rounded-full shadow-[0_0_10px_rgba(57,255,20,1)]"
                                            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                        />
                                    )}
                                </>
                            );

                            if (link.action) {
                                return (
                                    <button
                                        key={link.name}
                                        onClick={link.action}
                                        className="flex flex-col items-center justify-center flex-1 py-1 relative"
                                    >
                                        {content}
                                    </button>
                                );
                            }

                            return (
                                <Link
                                    key={link.name}
                                    to={isClickable ? link.path : '#'}
                                    className={cn(
                                        "flex flex-col items-center justify-center flex-1 py-1 relative",
                                        isUnderMaintenance && !isClickable && "opacity-50 grayscale cursor-not-allowed"
                                    )}
                                >
                                    {content}
                                </Link>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Bottom-Sheet Mobile Menu */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsOpen(false)}
                            className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm md:hidden"
                        />
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            drag="y"
                            dragConstraints={{ top: 0 }}
                            dragElastic={0.2}
                            onDragEnd={(e, { offset, velocity }) => {
                                if (offset.y > 150 || velocity.y > 500) {
                                    setIsOpen(false);
                                }
                            }}
                            className="fixed bottom-0 left-0 right-0 z-[100] md:hidden bg-zinc-950 border-t border-white/10 rounded-t-3xl flex flex-col max-h-[90vh]"
                            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
                        >
                            {/* Drag Handle */}
                            <div className="w-full flex justify-center py-4 shrink-0 cursor-grab active:cursor-grabbing">
                                <div className="w-12 h-1.5 bg-white/20 rounded-full" />
                            </div>

                            <div className="overflow-y-auto px-6 pb-8 custom-scrollbar">
                                {/* Search Bar */}
                                <div className="relative mb-6">
                                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                                        <Search size={18} className="text-zinc-500" />
                                    </div>
                                    <input 
                                        type="text"
                                        placeholder="Search anything..."
                                        className="w-full h-12 bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 text-white placeholder:text-zinc-500 focus:outline-none focus:border-neon-green/50 focus:ring-1 focus:ring-neon-green/50 transition-all text-sm"
                                    />
                                </div>

                                {/* Quick Action Grid */}
                                <div className="grid grid-cols-4 gap-4 mb-8">
                                    {allLinks.filter(l => ['HOME', 'COMMUNITY', 'CREATOR', 'CONTACT'].includes(l.name)).map(link => {
                                        const Icon = link.icon;
                                        const isUnderMaintenance = link.featureId && (maintenanceState.global || maintenanceState.pages?.[link.featureId]);
                                        const isClickable = !isUnderMaintenance || user?.role === 'developer';
                                        return (
                                            <Link 
                                                key={`quick-${link.name}`}
                                                to={isClickable ? link.path : '#'}
                                                onClick={() => isClickable && setIsOpen(false)}
                                                className={cn(
                                                    "flex flex-col items-center gap-2 group",
                                                    isUnderMaintenance && !isClickable && "opacity-40 grayscale cursor-not-allowed"
                                                )}
                                            >
                                                <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 group-hover:text-neon-green group-hover:border-neon-green/30 group-hover:bg-neon-green/5 transition-all">
                                                    <Icon size={24} />
                                                </div>
                                                <span className="text-[10px] font-bold text-zinc-400 group-hover:text-white transition-colors">{link.name}</span>
                                            </Link>
                                        );
                                    })}
                                </div>

                                {/* Menu List Sections */}
                                <div className="space-y-6">
                                    <div>
                                        <p className="text-[11px] font-black text-zinc-500 uppercase tracking-widest mb-3 pl-2">Explore</p>
                                        <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden">
                                            {allLinks.map((link, idx) => {
                                                const Icon = link.icon;
                                                const isActive = link.matchPaths ? link.matchPaths.includes(location.pathname) : location.pathname === link.path;
                                                const isUnderMaintenance = link.featureId && (maintenanceState.global || maintenanceState.pages?.[link.featureId]);
                                                const isClickable = !isUnderMaintenance || user?.role === 'developer';
                                                
                                                return (
                                                    <Link
                                                        key={link.name}
                                                        to={isClickable ? link.path : '#'}
                                                        onClick={() => isClickable && setIsOpen(false)}
                                                        className={cn(
                                                            "flex items-center justify-between p-4 transition-all",
                                                            idx !== allLinks.length - 1 && "border-b border-white/5",
                                                            isActive ? "bg-neon-green/5" : "hover:bg-white/5",
                                                            isUnderMaintenance && !isClickable && "opacity-40 grayscale cursor-not-allowed"
                                                        )}
                                                    >
                                                        <div className="flex items-center gap-4">
                                                            <div className={cn(
                                                                "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                                                                isActive ? "bg-neon-green/20 text-neon-green" : "bg-white/5 text-zinc-400"
                                                            )}>
                                                                <Icon size={20} />
                                                            </div>
                                                            <span className={cn(
                                                                "text-sm font-bold",
                                                                isActive ? "text-neon-green" : "text-zinc-200"
                                                            )}>{link.name}</span>
                                                        </div>
                                                        {isUnderMaintenance ? (
                                                            <span className="text-[9px] font-bold uppercase text-red-500 tracking-widest bg-red-500/10 px-2 py-1 rounded-md">Offline</span>
                                                        ) : (
                                                            <ChevronRight size={18} className="text-zinc-600" />
                                                        )}
                                                    </Link>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Account Section */}
                                    <div>
                                        <p className="text-[11px] font-black text-zinc-500 uppercase tracking-widest mb-3 pl-2">Account</p>
                                        {user ? (
                                            <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden">
                                                <div 
                                                    className="flex items-center justify-between p-4 border-b border-white/5 cursor-pointer hover:bg-white/5 transition-all"
                                                    onClick={() => { setIsProfileOpen(true); setIsOpen(false); }}
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-xl bg-neon-green/10 border border-neon-blue/20 flex items-center justify-center text-neon-green">
                                                            <UserIcon size={20} />
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-bold text-white capitalize">{user.displayName || 'Tribe Member'}</span>
                                                            <span className="text-[10px] text-zinc-500 uppercase tracking-widest">Profile & Settings</span>
                                                        </div>
                                                    </div>
                                                    <ChevronRight size={18} className="text-zinc-600" />
                                                </div>

                                                {['developer', 'super_admin', 'founder'].includes(user.role) && (
                                                    <Link 
                                                        to="/admin" 
                                                        onClick={() => setIsOpen(false)}
                                                        className="flex items-center justify-between p-4 border-b border-white/5 hover:bg-white/5 transition-all"
                                                    >
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
                                                                <LayoutGrid size={20} />
                                                            </div>
                                                            <span className="text-sm font-bold text-white">Admin Dashboard</span>
                                                        </div>
                                                        <ChevronRight size={18} className="text-zinc-600" />
                                                    </Link>
                                                )}

                                                <button
                                                    onClick={() => { useStore.getState().logout(); setIsOpen(false); }}
                                                    className="w-full flex items-center justify-between p-4 hover:bg-red-500/5 transition-all text-red-500"
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                                                            <LogOut size={20} />
                                                        </div>
                                                        <span className="text-sm font-bold">Log Out</span>
                                                    </div>
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="bg-white/5 border border-white/10 rounded-3xl p-4 flex flex-col items-center text-center gap-4">
                                                <p className="text-sm text-zinc-400">Join the tribe to access all features</p>
                                                <button
                                                    onClick={() => { useStore.getState().setAuthModal(true); setIsOpen(false); }}
                                                    className="w-full h-12 rounded-xl bg-neon-green text-black font-black uppercase tracking-widest text-xs hover:scale-[1.02] active:scale-95 transition-all shadow-[0_0_20px_rgba(57,255,20,0.2)]"
                                                >
                                                    Login / Sign Up
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
            <ProfilePanel 
                isOpen={isProfileOpen} 
                onClose={() => setIsProfileOpen(false)} 
            />
        </>
    );
};

export default Navbar;
