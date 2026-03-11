import React, { useState, useRef, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../lib/store';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';

const NotificationBell = () => {
    const { announcements } = useStore();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Get latest 5 announcements
    const recentAnnouncements = announcements.slice(0, 5);
    const hasNotifications = recentAnnouncements.length > 0;

    return (
        <div className="relative mr-4 md:mr-0" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-gray-300 hover:text-white transition-colors outline-none focus:outline-none"
                aria-label="Notifications"
            >
                <Bell size={24} />
                {hasNotifications && (
                    <span className="absolute top-1 right-1 h-3 w-3 bg-neon-pink rounded-full border-2 border-dark animate-pulse"></span>
                )}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className={cn(
                            "z-[100] flex flex-col overflow-hidden",
                            // Mobile: fill the safe zone between top nav and bottom nav
                            "fixed inset-x-3 top-20 bottom-24 rounded-[2rem]",
                            // Desktop: normal dropdown
                            "md:absolute md:inset-auto md:bottom-auto md:top-full md:mt-4 md:right-0 md:w-[400px] md:rounded-[2.5rem]",
                            // Solid background — no backdrop-blur so inner cards don't bleed through
                            "bg-[#0d0d0d] border border-white/10 shadow-[0_30px_60px_rgba(0,0,0,0.9)]"
                        )}
                    >
                        <div className="px-6 py-5 border-b border-white/5 flex justify-between items-center bg-white/[0.02] shrink-0">
                            <h3 className="font-black text-[10px] md:text-sm uppercase tracking-widest text-white">Broadcast Signals</h3>
                            <button onClick={() => setIsOpen(false)} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all">
                                <X size={14} />
                            </button>
                        </div>

                        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide py-4 px-4">
                            {recentAnnouncements.length === 0 ? (
                                <div className="p-10 text-center flex flex-col items-center gap-4 bg-white/[0.02] rounded-[2.5rem] border border-white/5">
                                    <div className="w-12 h-12 rounded-full border border-white/5 flex items-center justify-center text-gray-600 bg-black/40">
                                        <Bell size={20} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black tracking-[0.2em] uppercase text-gray-500">No active signals.</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col space-y-4">
                                    {recentAnnouncements.map((item, index) => {
                                        const CardWrapper = item.link ? 'a' : 'div';
                                        return (
                                            <motion.div
                                                key={item.id}
                                                initial={{ opacity: 0, x: 20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: index * 0.1 }}
                                            >
                                                <CardWrapper 
                                                    href={item.link}
                                                    target={item.link?.startsWith('http') ? '_blank' : undefined}
                                                    rel={item.link?.startsWith('http') ? 'noopener noreferrer' : undefined}
                                                    onClick={() => {
                                                        if (item.link && !item.link.startsWith('http')) {
                                                            window.location.href = item.link;
                                                        }
                                                        setIsOpen(false);
                                                    }}
                                                    className="p-5 rounded-[2rem] bg-[#1a1a1a] border border-white/10 hover:border-neon-blue/40 transition-all group cursor-pointer overflow-hidden block shadow-[0_4px_16px_rgba(0,0,0,0.4)] relative"
                                                >
                                                    {/* Glow effect on hover */}
                                                    <div className="absolute inset-0 bg-gradient-to-br from-neon-blue/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    
                                                    <div className="flex gap-5 relative z-10">
                                                        {item.image && (
                                                            <div className="relative shrink-0">
                                                                <img src={item.image} alt="" className="w-16 h-16 rounded-2xl object-cover border border-white/10 group-hover:scale-105 transition-transform" />
                                                                <div className="absolute -inset-1 bg-neon-blue/20 blur-lg rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                                                            </div>
                                                        )}
                                                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                                                            <div className="flex items-start justify-between mb-2 gap-2">
                                                                <h4 className="text-[12px] font-black text-white uppercase tracking-wider group-hover:text-neon-blue transition-colors">{item.title}</h4>
                                                                <span className="text-[8px] text-neon-green uppercase tracking-widest font-black shrink-0 px-2 py-0.5 rounded-full bg-neon-green/5 border border-neon-green/10 mt-0.5">{item.date}</span>
                                                            </div>
                                                            <p className="text-[10px] text-gray-400 leading-relaxed font-medium group-hover:text-gray-300 transition-colors">{item.content}</p>
                                                            {item.isPinned && (
                                                                <div className="mt-3 inline-flex items-center">
                                                                    <span className="text-[8px] bg-neon-pink/10 border border-neon-pink/20 text-neon-pink px-3 py-1 rounded-full font-black uppercase tracking-widest leading-none shadow-[0_0_15px_rgba(255,0,255,0.1)]">Priority Alert</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </CardWrapper>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {recentAnnouncements.length > 0 && (
                            // shrink-0 keeps this footer always visible
                            <div className="p-4 border-t border-white/5 bg-white/[0.02] shrink-0">
                                <Link to="/" className="w-full h-12 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-[10px] font-black text-white uppercase tracking-widest transition-all" onClick={() => setIsOpen(false)}>
                                    Access Full Archive
                                </Link>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div >
    );
};

export default NotificationBell;
