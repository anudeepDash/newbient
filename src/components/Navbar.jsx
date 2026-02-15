import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import logo from '../assets/logo.png';
import NotificationBell from './NotificationBell';
import { useStore } from '../lib/store';

const Navbar = () => {
    const { maintenanceState, user } = useStore();
    const [isOpen, setIsOpen] = useState(false);
    const location = useLocation();

    const links = [
        { name: 'Home', path: '/' },
        { name: 'Concert Zone', path: '/concerts', featureId: 'concerts' },
        { name: 'Gallery', path: '/gallery', featureId: 'gallery' },
        { name: 'Community', path: '/community-join', featureId: 'community' },
        { name: 'Contact', path: '/contact', featureId: 'contact' },
    ];

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
                "fixed left-0 right-0 z-50 bg-dark/80 backdrop-blur-md border-b border-white/10 transition-all duration-300",
                maintenanceState.global && user?.role === 'developer' ? "top-6" : "top-0"
            )}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-20">
                        {/* Logo */}
                        <Link to="/" className="flex-shrink-0">
                            <img src={logo} alt="Newbi Entertainments" className="h-12 w-auto" />
                        </Link>

                        {/* Desktop Menu */}
                        <div className="hidden md:block">
                            <div className="ml-10 flex items-baseline space-x-8">
                                {links.map((link) => {
                                    const isUnderMaintenance = link.featureId && (maintenanceState.global || maintenanceState.pages?.[link.featureId]);
                                    return link.path.startsWith('http') ? (
                                        <a
                                            key={link.name}
                                            href={link.path}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className={cn(
                                                'text-sm font-medium transition-colors duration-300 hover:text-neon-green',
                                                location.pathname === link.path ? 'text-neon-green' : 'text-gray-300'
                                            )}
                                        >
                                            {link.name}
                                        </a>
                                    ) : (
                                        <Link
                                            key={link.name}
                                            to={link.path}
                                            className={cn(
                                                'text-sm font-medium transition-all duration-300 hover:text-neon-green flex items-center gap-1',
                                                location.pathname === link.path ? 'text-neon-green' : 'text-gray-300',
                                                isUnderMaintenance && 'opacity-50 grayscale'
                                            )}
                                        >
                                            {isUnderMaintenance && <span className="text-[10px]">🔧</span>}
                                            {link.name}
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Notification & Desktop Menu Right */}
                        <div className="hidden md:flex items-center ml-4 gap-4">
                            <NotificationBell />
                            {user ? (
                                <div className="flex items-center gap-4 pl-4 border-l border-white/10">
                                    <div className="text-right">
                                        <div className="text-xs font-bold text-white leading-none capitalize">{user.displayName || 'Tribe Member'}</div>
                                        <div className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">
                                            {['developer', 'super_admin', 'editor'].includes(user.role)
                                                ? user.role.replace('_', ' ')
                                                : 'Tribe Member'}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => useStore.getState().logout()}
                                        className="text-xs font-bold text-gray-400 hover:text-neon-pink uppercase tracking-widest transition-colors"
                                    >
                                        Logout
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => useStore.getState().setAuthModal(true)}
                                    className="px-4 py-2 rounded-full border border-neon-blue text-neon-blue text-xs font-bold uppercase tracking-widest hover:bg-neon-blue hover:text-black transition-all shadow-[0_0_15px_rgba(0,243,255,0.1)] hover:shadow-[0_0_20px_rgba(0,243,255,0.3)]"
                                >
                                    Sign In
                                </button>
                            )}
                        </div>

                        {/* Mobile Menu Button */}
                        <div className="md:hidden flex items-center gap-4">
                            <NotificationBell />
                            <button
                                onClick={toggleMenu}
                                className="text-gray-300 hover:text-white focus:outline-none"
                            >
                                {isOpen ? <X size={24} /> : <Menu size={24} />}
                            </button>
                        </div>
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
                                                <span className="text-sm font-bold text-white capitalize">{user.displayName || 'Tribe Member'}</span>
                                                <span className="text-[10px] text-gray-500 uppercase tracking-widest leading-none mt-1">
                                                    {['developer', 'super_admin', 'editor'].includes(user.role)
                                                        ? user.role.replace('_', ' ')
                                                        : 'Tribe Member'}
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
