import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Sparkles, Users, LogOut, Settings, Home, Music, Image as ImageIcon, User as UserIcon, PlusCircle, LayoutGrid } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import logo from '../assets/logo.png';
import NotificationBell from './NotificationBell';
import { useStore } from '../lib/store';

const Navbar = () => {
    const { maintenanceState, user, siteSettings, creators } = useStore();
    const [isOpen, setIsOpen] = useState(false);
    const location = useLocation();

    const allLinks = [
        { name: 'Home', path: '/', icon: Home },
        { name: 'Community', path: '/community-join', featureId: 'community', icon: Users },
        { name: 'Creator Hub', path: user ? '/creator-dashboard' : '/creator-join', featureId: 'influencer', icon: Sparkles },
        { name: 'Concert Zone', path: '/concerts', featureId: 'concerts', icon: Music },
        { name: 'Gallery', path: '/gallery', featureId: 'gallery', icon: ImageIcon },
        { name: 'Contact', path: '/contact', featureId: 'contact', icon: LayoutGrid },
    ];

    const mobilePrimaryLinks = [
        { name: 'Home', path: '/', icon: Home },
        { name: 'Community', path: '/community-join', featureId: 'community', icon: Users },
        { name: 'Hub', path: user ? '/creator-dashboard' : '/creator-join', featureId: 'influencer', icon: Sparkles },
        { name: 'Concerts', path: '/concerts', featureId: 'concerts', icon: Music },
        { name: 'More', action: () => setIsOpen(true), icon: Menu },
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

            {/* Top Navbar */}
            <nav className={cn(
                "fixed top-4 md:top-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-500 w-full max-w-[1800px] px-4 md:px-6 flex items-center justify-center",
                maintenanceState.global && user?.role === 'developer' ? "top-10" : "top-4 md:top-6"
            )}>
                {/* Main Menu Pill */}
                <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-full px-4 md:px-6 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
                    <div className="flex items-center h-14">
                        {/* Logo */}
                        <Link to="/" className="flex-shrink-0 hover:opacity-80 transition-opacity mr-0 md:mr-6 px-2">
                            <img src={logo} alt="Newbi Entertainments" className="h-6 w-auto" />
                        </Link>

                        {/* Desktop Menu */}
                        <div className="hidden md:block">
                            <div className="flex items-center space-x-1">
                                {links.map((link) => {
                                    const isUnderMaintenance = link.featureId && (maintenanceState.global || maintenanceState.pages?.[link.featureId]);
                                    const isActive = location.pathname === link.path;
                                    
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
                                    <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                                        <UserIcon size={14} className="text-gray-400" />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Action/User Pill (Desktop Only) */}
                <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-full px-4 shadow-[0_8px_32px_rgba(0,0,0,0.4)] hidden md:block absolute right-6">
                    <div className="flex items-center h-14 gap-4">
                        <NotificationBell />
                        <div className="h-4 w-px bg-white/10" />
                        {user ? (
                            <div className="flex items-center gap-4">
                                <div className="text-right">
                                    <div className="text-[10px] font-black text-white leading-none capitalize flex items-center gap-1 justify-end tracking-tight">
                                        {user.displayName?.split(' ')[0] || 'Tribe'}
                                        {user.hasJoinedTribe && <Users size={10} className="text-neon-blue" />}
                                    </div>
                                    <div className="text-[8px] text-gray-500 uppercase tracking-widest mt-1 font-bold">
                                        {user.role === 'developer' ? 'DEV' : (user.role === 'super_admin' ? 'ADMIN' : 'MEMBER')}
                                    </div>
                                </div>
                                {['developer', 'super_admin'].includes(user.role) && (
                                    <Link to="/admin/site-settings" className="p-1.5 rounded-full hover:bg-white/10 text-gray-500 hover:text-white transition-all">
                                        <Settings size={14} />
                                    </Link>
                                )}
                                <button
                                    onClick={() => useStore.getState().logout()}
                                    className="p-1.5 rounded-full hover:bg-red-500/10 text-gray-500 hover:text-red-500 transition-all"
                                >
                                    <LogOut size={14} />
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => useStore.getState().setAuthModal(true)}
                                className="px-4 py-2 rounded-full bg-white text-black text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all"
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
                            const isActive = location.pathname === link.path;
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
                        className="fixed inset-0 z-[100] md:hidden bg-black/95 backdrop-blur-2xl flex flex-col items-center justify-center px-6"
                    >
                        <button 
                            onClick={() => setIsOpen(false)}
                            className="absolute top-10 right-10 p-4 rounded-full bg-white/5 border border-white/10 text-white"
                        >
                            <X size={24} />
                        </button>

                        <div className="w-full space-y-2 mb-12">
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] mb-6 text-center">Navigation</p>
                            {links.map((link, idx) => {
                                const isActive = location.pathname === link.path;
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

                        <div className="w-full pt-8 border-t border-white/10 flex flex-col items-center gap-6">
                            {user ? (
                                <div className="w-full flex items-center justify-between bg-white/5 p-6 rounded-3xl border border-white/10">
                                    <div className="flex items-center gap-4 flex-1 min-w-0 pr-2">
                                        <div className="w-12 h-12 rounded-full bg-neon-blue/10 border border-neon-blue/20 flex items-center justify-center text-neon-blue shrink-0">
                                            <UserIcon size={20} />
                                        </div>
                                        <div className="flex flex-col flex-1 min-w-0">
                                            <span className="text-lg font-black text-white italic capitalize truncate">{user.displayName || 'Tribe Member'}</span>
                                            <span className="text-[10px] text-gray-500 uppercase tracking-widest truncate">
                                                {user.role?.replace('_', ' ') || 'Member'}
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => { useStore.getState().logout(); setIsOpen(false); }}
                                        className="p-3 rounded-2xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all shrink-0"
                                    >
                                        <LogOut size={20} />
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => { useStore.getState().setAuthModal(true); setIsOpen(false); }}
                                    className="w-full h-16 rounded-2xl bg-neon-blue text-black font-black uppercase tracking-widest text-sm hover:scale-105 active:scale-95 transition-all shadow-[0_0_30px_rgba(56,182,255,0.3)]"
                                >
                                    Join the Tribe
                                </button>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default Navbar;
