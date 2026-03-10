import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Sparkles, Users, LogOut, Settings } from 'lucide-react';
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
        { name: 'Home', path: '/' },
        { name: 'Concert Zone', path: '/concerts', featureId: 'concerts' },
        { name: 'Gallery', path: '/gallery', featureId: 'gallery' },
        { name: 'Community', path: '/community-join', featureId: 'community' },
        { name: 'Creator Hub', path: user ? '/creator-dashboard' : '/creator-join', featureId: 'influencer' },
        { name: 'Contact', path: '/contact', featureId: 'contact' },
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
            <nav className={cn(
                "fixed top-4 md:top-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-500 w-full max-w-[1800px] px-4 md:px-6 flex items-center justify-center",
                maintenanceState.global && user?.role === 'developer' ? "top-10" : "top-4 md:top-6"
            )}>
                {/* Main Menu Pill */}
                <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-full px-6 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
                    <div className="flex items-center h-14">
                        {/* Logo */}
                        <Link to="/" className="flex-shrink-0 hover:opacity-80 transition-opacity mr-6 px-2">
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

                        {/* Mobile Menu Toggle (Simplified) */}
                        <div className="md:hidden ml-auto flex items-center gap-4">
                            <NotificationBell />
                            <button onClick={toggleMenu} className="text-gray-400 hover:text-white">
                                {isOpen ? <X size={20} /> : <Menu size={20} />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right Action/User Pill */}
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

                {/* Mobile Menu */}
                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="md:hidden bg-dark border-b border-white/10 overflow-hidden"
                        >
                            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                                {links.map((link) => {
                                    const isUnderMaintenance = link.featureId && (maintenanceState.global || maintenanceState.pages?.[link.featureId]);
                                    return link.path.startsWith('http') ? (
                                        <a
                                            key={link.name}
                                            href={link.path}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={() => setIsOpen(false)}
                                            className={cn(
                                                'block px-3 py-2 rounded-md text-base font-medium hover:bg-white/5 hover:text-neon-green transition-colors',
                                                location.pathname === link.path ? 'text-neon-green bg-white/5' : 'text-gray-300'
                                            )}
                                        >
                                            {link.name}
                                        </a>
                                    ) : (
                                        <Link
                                            key={link.name}
                                            to={link.path}
                                            onClick={() => setIsOpen(false)}
                                            className={cn(
                                                'flex items-center gap-2 px-3 py-2 rounded-md text-base font-medium hover:bg-white/5 hover:text-neon-green transition-all',
                                                location.pathname === link.path ? 'text-neon-green bg-white/5' : 'text-gray-300',
                                                isUnderMaintenance && 'opacity-50 grayscale'
                                            )}
                                        >
                                            {isUnderMaintenance && <span>🔧</span>}
                                            {link.name}
                                        </Link>
                                    );
                                })}
                                <div className="pt-4 mt-4 border-t border-white/10 px-3 pb-3">
                                    {user ? (
                                        <div className="flex items-center justify-between group">
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-bold text-white capitalize">{user.displayName || 'Tribe Member'}</span>
                                                    {user.hasJoinedTribe && <Users size={12} className="text-neon-blue" />}
                                                    {creators?.some(c => c.uid === user.uid) && <Sparkles size={12} className="text-neon-pink" />}
                                                </div>
                                                <span className="text-[10px] text-gray-500 uppercase tracking-widest leading-none mt-1">
                                                    {['developer', 'super_admin', 'editor'].includes(user.role)
                                                        ? user.role.replace('_', ' ')
                                                        : 'Member'}
                                                </span>
                                            </div>
                                            <button
                                                onClick={() => { useStore.getState().logout(); setIsOpen(false); }}
                                                className="text-xs font-bold text-neon-pink uppercase tracking-widest p-2"
                                            >
                                                Logout
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => { useStore.getState().setAuthModal(true); setIsOpen(false); }}
                                            className="w-full py-3 rounded-xl border border-neon-blue text-neon-blue text-sm font-bold uppercase tracking-[0.2em] hover:bg-neon-blue hover:text-black transition-all"
                                        >
                                            Sign In / Join Tribe
                                        </button>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </nav>
        </>
    );
};

export default Navbar;
