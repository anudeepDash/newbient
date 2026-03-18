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
                            "z-[100] flex flex-col overflow-hidden max-h-[70vh]",
                            "fixed md:absolute left-4 right-4 md:left-auto md:right-[-10px] top-[80px] md:top-full mt-0 md:mt-4 md:w-[400px] rounded-[2.5rem]",
                            // Solid background — no backdrop-blur so inner cards don't bleed through
                            "bg-[#0d0d0d] border border-white/10 shadow-[0_30px_60px_rgba(0,0,0,0.9)]"
                        )}
                    >
                        <div className="px-6 py-5 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-white/[0.03] to-transparent shrink-0">
                            <h3 className="font-black text-[11px] md:text-sm uppercase tracking-[0.2em] text-white flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-neon-blue animate-pulse" />
                                Broadcast Signals
                            </h3>
                            <button onClick={() => setIsOpen(false)} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all">
                                <X size={14} />
                            </button>
                        </div>

                        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide py-4 px-4 custom-scrollbar">
                            {recentAnnouncements.length === 0 ? (
                                <div className="p-12 text-center flex flex-col items-center gap-6 bg-white/[0.01] rounded-[2.5rem] border border-white/5 border-dashed">
                                    <div className="w-16 h-16 rounded-3xl border border-white/5 flex items-center justify-center text-gray-800 bg-black/40">
                                        <Bell size={24} />
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-[10px] font-black tracking-[0.3em] uppercase text-gray-600">Static detected.</p>
                                        <p className="text-[8px] font-bold uppercase text-gray-700">No active signals in the stream</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col space-y-4 pb-4">
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
                                                    className="p-5 rounded-[2.2rem] bg-zinc-900/50 border border-white/5 hover:border-neon-blue/30 transition-all group cursor-pointer overflow-hidden block relative"
                                                >
                                                    <div className="absolute inset-0 bg-gradient-to-br from-neon-blue/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    
                                                    <div className="flex gap-5 relative z-10">
                                                        {item.image && (
                                                            <div className="relative shrink-0">
                                                                <img src={item.image} alt="" className="w-14 h-14 rounded-2xl object-cover border border-white/10 group-hover:scale-105 transition-transform" />
                                                            </div>
                                                        )}
                                                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                                                            <div className="flex items-start justify-between mb-1.5 gap-2">
                                                                <h4 className="text-[11px] font-black text-white uppercase tracking-wider group-hover:text-neon-blue transition-colors line-clamp-1">{item.title}</h4>
                                                                <span className="text-[8px] text-neon-green uppercase tracking-widest font-black shrink-0 px-2 py-0.5 rounded-full bg-neon-green/10 border border-neon-green/20">{item.date}</span>
                                                            </div>
                                                            <p className="text-[10px] text-gray-500 leading-relaxed font-medium group-hover:text-gray-400 transition-colors line-clamp-2">{item.content}</p>
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
                            <div className="p-4 border-t border-white/5 bg-gradient-to-b from-transparent to-white/[0.02] shrink-0">
                                <Link to="/" className="w-full h-14 rounded-2xl bg-white text-black hover:bg-neon-blue hover:text-white border border-white/10 flex items-center justify-center text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-xl" onClick={() => setIsOpen(false)}>
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
