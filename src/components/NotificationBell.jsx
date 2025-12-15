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
                        className="absolute right-0 mt-2 w-80 sm:w-96 bg-dark border border-white/10 rounded-xl shadow-2xl shadow-black/50 overflow-hidden z-50 backdrop-blur-xl"
                    >
                        <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/5">
                            <h3 className="font-bold text-white">Announcements</h3>
                            <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white">
                                <X size={16} />
                            </button>
                        </div>

                        <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
                            {recentAnnouncements.length === 0 ? (
                                <div className="p-8 text-center text-gray-500">
                                    <p>No new announcements</p>
                                </div>
                            ) : (
                                <ul className="divide-y divide-white/5">
                                    {recentAnnouncements.map((item) => (
                                        <li key={item.id} className="p-4 hover:bg-white/5 transition-colors">
                                            <div className="flex gap-3">
                                                {item.image && (
                                                    <img src={item.image} alt="" className="w-12 h-12 rounded-md object-cover flex-shrink-0 bg-white/10" />
                                                )}
                                                <div>
                                                    <h4 className="text-sm font-bold text-white mb-1">{item.title}</h4>
                                                    <p className="text-xs text-gray-400 mb-2 line-clamp-2">{item.content}</p>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[10px] text-neon-green uppercase tracking-wider font-bold">{item.date}</span>
                                                        {item.isPinned && <span className="text-[10px] bg-neon-pink/20 text-neon-pink px-2 py-0.5 rounded-full">Pinned</span>}
                                                    </div>
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        {recentAnnouncements.length > 0 && (
                            <div className="p-2 bg-white/5 border-t border-white/5 text-center">
                                <Link to="/" className="text-xs text-gray-400 hover:text-white transition-colors" onClick={() => setIsOpen(false)}>
                                    View All
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
