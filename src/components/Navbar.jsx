import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Sparkles, Users, LogOut, Settings, Home, Music, Image as ImageIcon, User as UserIcon, PlusCircle, LayoutGrid, Mic2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import NotificationBell from './NotificationBell';
import ProfilePanel from './ProfilePanel';
import { useStore } from '../lib/store';
import logo from '../assets/logo.png';

const Navbar = () => {
    const { maintenanceState, user, siteSettings, creators, announcements } = useStore();
    const pinnedAnnouncement = announcements?.find(a => a.isPinned);
    const [isOpen, setIsOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const location = useLocation();

    const allLinks = [
        { name: 'HOME', path: '/', icon: Home },
        { name: 'COMMUNITY', path: '/community', featureId: 'community', icon: Users },
        { name: 'CREATOR', path: user ? '/creator-dashboard' : '/creator', matchPaths: ['/creator-dashboard', '/creator'], featureId: 'influencer', icon: Sparkles },
        { name: 'ARTISTANT', path: '/artistant', icon: Mic2 },
        { name: 'CONCERT ZONE', path: '/concertzone', featureId: 'concerts', icon: Music },
        { name: 'CONTACT', path: '/contact', featureId: 'contact', icon: LayoutGrid },
    ];

    const mobilePrimaryLinks = [
        { name: 'HOME', path: '/', icon: Home },
        { name: 'COMMUNITY', path: '/community', featureId: 'community', icon: Users },
        { name: 'CREATOR', path: user ? '/creator-dashboard' : '/creator', matchPaths: ['/creator-dashboard', '/creator'], featureId: 'influencer', icon: Sparkles },
        { name: 'ARTISTANT', path: '/artistant', icon: Mic2 },
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
                <div className="fixed top-0 left-0 right-0 z-[60] bg-red-600 text-white text-[10px] font-black uppercase tracking-[0.2em] py-1 text-center animate-pulse">
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
                    <motion.div 
                        initial={{ x: '-100%' }}
                        animate={{ x: '100%' }}
                        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                        className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-neon-pink to-transparent opacity-50"
                    />

                    {(() => {
                        const destination = pinnedAnnouncement.link || (pinnedAnnouncement.linkedEventId ? `/?event=${pinnedAnnouncement.linkedEventId}` : null);
                        const content = (
                            <div className="flex items-center justify-center gap-3">
                                <Sparkles size={12} className="text-neon-pink animate-pulse" />
                                <p className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-white/90">
                                    <span className="text-neon-pink mr-2">{pinnedAnnouncement.title}</span>
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

            {/* Top Navbar */}
            <nav className={cn(
                "fixed left-1/2 -translate-x-1/2 z-50 transition-all duration-500 w-full max-w-[1800px] px-4 md:px-6 flex items-center justify-center",
                (maintenanceState.global && user?.role === 'developer') 
                    ? "top-14 md:top-14" 
                    : pinnedAnnouncement 
                        ? "top-14 md:top-14" 
                        : "top-4 md:top-6"
            )}>
                {/* Main Menu Pill */}
                <div className="relative rounded-full px-4 md:px-6 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
                    <div className="absolute inset-0 bg-white/[0.03] backdrop-blur-2xl rounded-full border border-white/10 -z-10" />
                    <div className="flex items-center h-14 relative z-10">
                        {/* Logo */}
                        <Link to="/" className="flex-shrink-0 hover:opacity-80 transition-opacity mr-0 md:mr-6 px-2">
                            <img src={logo} alt="Newbi Entertainments" className="h-6 w-auto" />
                        </Link>

                        {/* Desktop Menu */}
                        <div className="hidden md:block">
                            <div className="flex items-center space-x-1">
                                {links.map((link) => {
                                    const isUnderMaintenance = link.featureId && (maintenanceState.global || maintenanceState.pages?.[link.featureId]);
                                    const isActive = link.matchPaths ? link.matchPaths.includes(location.pathname) : location.pathname === link.path;
                                    
                                    return (
                                        <Link
                                            key={link.name}
                                            to={link.path}
                                            className={cn(
                                                'px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all rounded-full relative group',
                                                isActive ? 'text-white' : 'text-gray-400 hover:text-white',
                                                isUnderMaintenance && 'opacity-50 grayscale'
                                            )}
                                        >
                                            {link.name}
                                            {isActive && (
                                                <motion.div 
                                                    layoutId="nav-active"
                                                    className="absolute inset-0 bg-white/10 rounded-full -z-10"
                                                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                                />
                                            )}
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Top Right Actions (Mobile) */}
                        <div className="md:hidden ml-auto flex items-center gap-2">
                            <NotificationBell />
                            {user && (
                                <div className="h-4 w-px bg-white/10 mx-1" />
                            )}
                            {user && (
                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={() => setIsProfileOpen(true)}
                                        className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all outline-none"
                                    >
                                        <UserIcon size={14} className="text-gray-400" />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Action/User Pill (Desktop Only) */}
                <div className="rounded-full px-4 shadow-[0_8px_32px_rgba(0,0,0,0.4)] hidden md:block absolute right-6">
                    <div className="absolute inset-0 bg-white/[0.03] backdrop-blur-2xl rounded-full border border-white/10 -z-10" />
                    <div className="flex items-center h-14 gap-4 relative z-10">
                        {user && ['developer', 'super_admin'].includes(user.role) && (
                            <Link to="/admin/site-settings" className="p-1.5 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-all">
                                <Settings size={14} />
                            </Link>
                        )}
                        {user && <div className="h-4 w-px bg-white/10" />}
                        {user && ['developer', 'super_admin'].includes(user.role) && (
                            <Link 
                                to="/admin" 
                                className="p-2 rounded-xl bg-neon-blue/10 border border-neon-blue/20 text-neon-blue hover:bg-neon-blue hover:text-black transition-all"
                                title="Open Admin"
                            >
                                <LayoutGrid size={16} />
                            </Link>
                        )}
                        <NotificationBell />
                        {user ? (
                            <div 
                                className="flex items-center gap-3 cursor-pointer"
                                onClick={() => setIsProfileOpen(true)}
                            >
                                <div className="flex items-center gap-2 pr-2 group">
                                    <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0 group-hover:border-neon-blue transition-all">
                                        <span className="text-white font-black text-[11px] uppercase group-hover:text-neon-blue">
                                            {user.displayName ? user.displayName.charAt(0) : 'U'}
                                        </span>
                                    </div>
                                    <div className="text-left flex flex-col justify-center">
                                        <span className="text-[11px] font-bold text-white leading-none capitalize tracking-tight group-hover:text-neon-blue transition-colors">
                                            {user.displayName?.split(' ')[0] || 'Member'}
                                        </span>
                                        <span className="text-[8px] text-neon-blue uppercase tracking-[0.2em] font-black mt-1">
                                            {user.role === 'developer' ? 'DEV' : (user.role === 'super_admin' ? 'ADMIN' : (creators?.find(c => c.uid === user.uid)?.profileStatus === 'approved' ? 'CREATOR' : 'TRIBE MEMBER'))}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={() => useStore.getState().setAuthModal(true)}
                                className="px-5 py-2 rounded-full bg-white text-black text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all"
                            >
                                Login
                            </button>
                        )}
                    </div>
                </div>
            </nav>

            {/* Bottom Navigation (Mobile Only) */}
            <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-sm">
                <div className="bg-black/60 backdrop-blur-3xl border border-white/10 rounded-3xl p-2 shadow-[0_-8px_32px_rgba(0,0,0,0.5)]">
                    <div className="flex items-center justify-around">
                        {mobilePrimaryLinks.map((link) => {
                            const isActive = link.matchPaths ? link.matchPaths.includes(location.pathname) : location.pathname === link.path;
                            const Icon = link.icon;

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
                                    to={link.path}
                                    className={cn(
                                        "flex flex-col items-center gap-1 p-2 transition-all relative",
                                        isActive ? "text-neon-green" : "text-gray-400 hover:text-white"
                                    )}
                                >
                                    <Icon size={20} />
                                    <span className="text-[8px] font-black uppercase tracking-tighter">{link.name}</span>
                                    {isActive && (
                                        <motion.div 
                                            layoutId="bottom-nav-active"
                                            className="absolute -bottom-1 w-1 h-1 bg-neon-green rounded-full shadow-[0_0_8px_#00E6A8]"
                                        />
                                    )}
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </div>

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
                            {links.map((link, idx) => {
                                const isActive = link.matchPaths ? link.matchPaths.includes(location.pathname) : location.pathname === link.path;
                                const Icon = link.icon;
                                return (
                                    <motion.div
                                        key={link.name}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                    >
                                        <Link
                                            to={link.path}
                                            onClick={() => setIsOpen(false)}
                                            className={cn(
                                                "flex items-center gap-6 p-6 rounded-3xl border border-transparent transition-all group",
                                                isActive 
                                                    ? "bg-white/5 border-white/10 text-neon-green" 
                                                    : "text-gray-400 hover:text-white hover:bg-white/5"
                                            )}
                                        >
                                            <div className={cn(
                                                "w-12 h-12 rounded-2xl flex items-center justify-center transition-all",
                                                isActive ? "bg-neon-green/10 text-neon-green" : "bg-white/5 text-gray-500 group-hover:text-white"
                                            )}>
                                                <Icon size={22} />
                                            </div>
                                            <span className="text-2xl font-black uppercase italic tracking-tighter">{link.name}</span>
                                        </Link>
                                    </motion.div>
                                );
                            })}
                        </div>

                        <div className="w-full pt-8 mt-4 border-t border-white/10 flex flex-col items-stretch gap-6 shrink-0">
                            {user ? (
                                <div className="space-y-4">
                                    <div className="w-full flex items-center justify-between bg-white/5 p-6 rounded-3xl border border-white/10">
                                        <div className="flex items-center gap-4 flex-1 min-w-0 pr-2">
                                            <div className="w-12 h-12 rounded-full bg-neon-blue/10 border border-neon-blue/20 flex items-center justify-center text-neon-blue shrink-0">
                                                <UserIcon size={20} />
                                            </div>
                                            <div className="flex flex-col flex-1 min-w-0">
                                                <span className="text-lg font-black text-white italic capitalize truncate">{user.displayName || 'Tribe Member'}</span>
                                                <span className="text-[10px] text-gray-500 uppercase tracking-widest truncate">
                                                    {user.role === 'developer' ? 'DEV' : (user.role === 'super_admin' ? 'ADMIN' : (creators?.find(c => c.uid === user.uid)?.profileStatus === 'approved' ? 'CREATOR' : 'TRIBE MEMBER'))}
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

                                    {['developer', 'super_admin'].includes(user.role) && (
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
                                    className="w-full h-16 rounded-2xl bg-neon-blue text-black font-black uppercase tracking-widest text-sm hover:scale-105 active:scale-95 transition-all shadow-[0_0_30px_rgba(56,182,255,0.3)]"
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
