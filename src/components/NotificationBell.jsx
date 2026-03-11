import React, { useState, useRef, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../lib/store';
import { Link } from 'react-router-dom';

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
                        className="absolute right-[-1rem] sm:right-0 md:-right-4 top-full mt-4 w-[calc(100vw-2rem)] max-w-[340px] md:max-w-[400px] md:w-[400px] bg-[#0c0c0c]/95 border border-white/10 rounded-[2.5rem] shadow-[0_30px_60px_rgba(0,0,0,0.9)] overflow-hidden z-[100] backdrop-blur-3xl origin-top-right"
                    >
                        <div className="px-6 py-5 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                            <h3 className="font-black text-[10px] md:text-sm uppercase tracking-widest text-white">Broadcast Signals</h3>
                            <button onClick={() => setIsOpen(false)} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all">
                                <X size={14} />
                            </button>
                        </div>

                        <div className="max-h-[50vh] overflow-y-auto scrollbar-hide py-2 px-2">
                            {recentAnnouncements.length === 0 ? (
                                <div className="p-10 text-center flex flex-col items-center gap-4">
                                    <div className="w-12 h-12 rounded-full border border-white/5 flex items-center justify-center text-gray-600 bg-white/[0.02]">
                                        <Bell size={20} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black tracking-[0.2em] uppercase text-gray-500">No active signals.</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col space-y-2">
                                    {recentAnnouncements.map((item) => (
                                        <div key={item.id} className="p-4 rounded-[1.5rem] bg-white/[0.02] border border-white/5 hover:bg-white/5 hover:border-white/10 transition-all group cursor-pointer">
                                            <div className="flex gap-4">
                                                {item.image && (
                                                    <img src={item.image} alt="" className="w-14 h-14 rounded-2xl object-cover flex-shrink-0 border border-white/10 group-hover:scale-105 transition-transform" />
                                                )}
                                                <div className="flex-1 min-w-0 flex flex-col justify-center">
                                                    <div className="flex items-center justify-between mb-1.5 gap-2">
                                                        <h4 className="text-[11px] font-black text-white uppercase tracking-wider truncate">{item.title}</h4>
                                                        <span className="text-[8px] text-neon-green uppercase tracking-widest font-black shrink-0">{item.date}</span>
                                                    </div>
                                                    <p className="text-[10px] text-gray-400 line-clamp-2 leading-relaxed font-medium">{item.content}</p>
                                                    {item.isPinned && (
                                                        <div className="mt-3 inline-flex items-center">
                                                            <span className="text-[8px] bg-neon-pink/10 border border-neon-pink/20 text-neon-pink px-2.5 py-1 rounded-full font-black uppercase tracking-widest leading-none">Priority Alert</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {recentAnnouncements.length > 0 && (
                            <div className="p-4 border-t border-white/5 bg-white/[0.02]">
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
