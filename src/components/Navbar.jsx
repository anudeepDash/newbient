import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Zap, Star, Users, LogOut, Settings, Home, Music, Image as ImageIcon, User as UserIcon, PlusCircle, LayoutGrid, Mic2 } from 'lucide-react';
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
            {!location.pathname.includes('/admin/create-') && !location.pathname.includes('/admin/edit-') && !location.pathname.includes('/admin/agreements/') && (
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

            {/* Bottom Navigation (Mobile Only) - Hidden on Document Engines */}
            {!location.pathname.includes('/admin/create-') && !location.pathname.includes('/admin/edit-') && !location.pathname.includes('/admin/agreements/') && (
                <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-sm">
                    <div className="bg-black/60 backdrop-blur-3xl border border-white/10 rounded-3xl p-2 shadow-[0_-8px_32px_rgba(0,0,0,0.5)]">
                    <div className="flex items-center justify-around">
                        {mobilePrimaryLinks.map((link) => {
                            const isActive = link.matchPaths ? link.matchPaths.includes(location.pathname) : location.pathname === link.path;
                            const Icon = link.icon;
                            const isUnderMaintenance = link.featureId && (maintenanceState.global || maintenanceState.pages?.[link.featureId]);
                            const isClickable = !isUnderMaintenance || user?.role === 'developer';

                            if (link.action) {
                                return (
                                    <button
                                        key={link.name}
                                        onClick={link.action}
                                        className="flex flex-col items-center gap-1 p-2 text-gray-400 hover:text-white transition-all relative"
                                    >
                                        <Icon size={20} />
                                        <span className="text-[8px] font-black uppercase tracking-tighter">{link.name}</span>
                                    </button>
                                );
                            }

                            return (
                                <Link
                                    key={link.name}
                                    to={isClickable ? link.path : '#'}
                                    className={cn(
                                        "flex flex-col items-center gap-1 p-2 transition-all relative",
                                        isActive ? "text-neon-green" : "text-gray-400 hover:text-white",
                                        isUnderMaintenance && !isClickable && "opacity-50 grayscale cursor-not-allowed"
                                    )}
                                >
                                    <div className="relative">
                                        <Icon size={20} />
                                        {isUnderMaintenance && (
                                            <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border border-black " />
                                        )}
                                    </div>
                                    <span className="text-[8px] font-black uppercase tracking-tighter">{link.name}</span>
                                    {isActive && (
                                        <motion.div 
                                            layoutId="bottom-nav-active"
                                            className="absolute -bottom-1 w-1 h-1 bg-neon-green rounded-full "
                                        />
                                    )}
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </div>
            )}

            {/* Full-screen Mobile Menu */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="fixed inset-0 z-[100] md:hidden bg-black/95 backdrop-blur-2xl flex flex-col justify-start px-6 pt-24 pb-32 overflow-y-auto"
                    >
                        <button 
                            onClick={() => setIsOpen(false)}
                            className="absolute top-10 right-10 p-4 rounded-full bg-white/5 border border-white/10 text-white"
                        >
                            <X size={24} />
                        </button>

                        <div className="w-full space-y-2 mb-auto shrink-0 pb-12">
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] mb-6 text-center">Navigation</p>
                            {allLinks.map((link, idx) => {
                                const isActive = link.matchPaths ? link.matchPaths.includes(location.pathname) : location.pathname === link.path;
                                const Icon = link.icon;
                                const isUnderMaintenance = link.featureId && (maintenanceState.global || maintenanceState.pages?.[link.featureId]);
                                const isClickable = !isUnderMaintenance || user?.role === 'developer';

                                return (
                                    <motion.div
                                        key={link.name}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                    >
                                        <Link
                                            to={isClickable ? link.path : '#'}
                                            onClick={() => isClickable && setIsOpen(false)}
                                            className={cn(
                                                "flex items-center gap-6 p-6 rounded-3xl border border-transparent transition-all group",
                                                isActive 
                                                    ? "bg-white/5 border-white/10 text-neon-green" 
                                                    : "text-gray-400 hover:text-white hover:bg-white/5",
                                                isUnderMaintenance && !isClickable && "opacity-40 grayscale cursor-not-allowed"
                                            )}
                                        >
                                            <div className={cn(
                                                "w-12 h-12 rounded-2xl flex items-center justify-center transition-all relative",
                                                isActive ? "bg-neon-green/10 text-neon-green" : "bg-white/5 text-gray-500 group-hover:text-white"
                                            )}>
                                                <Icon size={22} />
                                                {isUnderMaintenance && (
                                                    <div className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-red-500 text-[8px] font-black text-white rounded-md ">
                                                        OFFLINE
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-2xl font-black uppercase italic tracking-tighter">{link.name}</span>
                                                {isUnderMaintenance && (
                                                    <span className="text-[10px] font-black uppercase text-red-500/80 tracking-[0.2em]">Maintenance in progress</span>
                                                )}
                                            </div>
                                        </Link>
                                    </motion.div>
                                );
                            })}
                        </div>

                        <div className="w-full pt-8 mt-4 border-t border-white/10 flex flex-col items-stretch gap-6 shrink-0">
                            {user ? (
                                <div className="space-y-4">
                                    <div className="w-full flex items-center justify-between bg-white/5 p-6 rounded-3xl border border-white/10">
                                        <div 
                                            className="flex items-center gap-4 flex-1 min-w-0 pr-2 cursor-pointer group/profile"
                                            onClick={() => { setIsProfileOpen(true); setIsOpen(false); }}
                                        >
                                            <div className="w-12 h-12 rounded-full bg-neon-green/10 border border-neon-blue/20 flex items-center justify-center text-neon-green shrink-0">
                                                <UserIcon size={20} />
                                            </div>
                                            <div className="flex flex-col flex-1 min-w-0">
                                                <span className="text-lg font-black text-white italic capitalize truncate group-hover/profile:text-neon-green transition-colors">{user.displayName || 'Tribe Member'}</span>
                                                <span className="text-[10px] text-gray-500 uppercase tracking-widest truncate">
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
                                        <button
                                            onClick={() => { useStore.getState().logout(); setIsOpen(false); }}
                                            className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-all shrink-0"
                                        >
                                            <LogOut size={20} />
                                        </button>
                                    </div>

                                    {['developer', 'super_admin', 'founder'].includes(user.role) && (
                                        <Link 
                                            to="/admin" 
                                            onClick={() => setIsOpen(false)}
                                            className="w-full h-16 bg-neon-green text-black flex items-center justify-center gap-3 rounded-2xl font-black font-heading uppercase tracking-widest shadow-[0_10px_30px_rgba(57,255,20,0.2)] active:scale-95 transition-all"
                                        >
                                            <LayoutGrid size={18} />
                                            ADMIN DASHBOARD
                                        </Link>
                                    )}
                                </div>
                            ) : (
                                <button
                                    onClick={() => { useStore.getState().setAuthModal(true); setIsOpen(false); }}
                                    className="w-full h-16 rounded-2xl bg-neon-green text-black font-black uppercase tracking-widest text-sm hover:scale-105 active:scale-95 transition-all shadow-[0_0_30px_rgba(57,255,20,0.3)]"
                                >
                                    Get Started
                                </button>
                            )}
                        </div>
                    </motion.div>
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
