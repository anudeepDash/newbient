import React, { useState, useRef, useEffect } from 'react';
import { Bell, X, Megaphone, Ticket, MessageSquare, Gift, FileText, Calendar, Check, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../lib/store';
import { cn } from '../lib/utils';
import { formatDistanceToNow } from 'date-fns';

const NotificationBell = () => {
    const { 
        notifications, 
        unreadNotificationsCount, 
        markNotificationRead, 
        clearAllNotifications, 
        deleteNotification 
    } = useStore();
    
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

    const hasNotifications = unreadNotificationsCount > 0;

    const getTypeIcon = (type) => {
        switch (type) {
            case 'announcement': return <Megaphone className="text-neon-blue" size={16} />;
            case 'ticket': return <Ticket className="text-neon-pink" size={16} />;
            case 'message': return <MessageSquare className="text-neon-green" size={16} />;
            case 'giveaway': return <Gift className="text-neon-yellow" size={16} />;
            case 'blog': return <FileText className="text-white" size={16} />;
            case 'campaign': return <Calendar className="text-neon-purple" size={16} />;
            case 'gig': return <Calendar className="text-neon-cyan" size={16} />;
            default: return <Bell className="text-gray-400" size={16} />;
        }
    };

    return (
        <div className="relative mr-4 md:mr-0" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-gray-300 hover:text-white transition-colors outline-none focus:outline-none"
                aria-label="Notifications"
            >
                <Bell size={24} />
                {hasNotifications && (
                    <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center bg-neon-pink rounded-full border-2 border-dark text-[10px] font-black text-white">
                        {unreadNotificationsCount}
                    </span>
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
                            "bg-[#0d0d0d] border border-white/10 shadow-[0_30px_60px_rgba(0,0,0,0.9)]"
                        )}
                    >
                        <div className="px-6 py-5 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-white/[0.03] to-transparent shrink-0">
                            <div className="flex flex-col">
                                <h3 className="font-black text-[11px] md:text-sm uppercase tracking-[0.2em] text-white flex items-center gap-2">
                                    <span className={cn("w-1.5 h-1.5 rounded-full", hasNotifications ? "bg-neon-pink animate-pulse" : "bg-gray-600")} />
                                    Notifications
                                </h3>
                                {unreadNotificationsCount > 0 && (
                                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">
                                        {unreadNotificationsCount} New
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                {notifications.length > 0 && (
                                    <button 
                                        onClick={() => clearAllNotifications()}
                                        className="p-2 rounded-full bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                                        title="Mark all as read"
                                    >
                                        <Check size={14} />
                                    </button>
                                )}
                                <button onClick={() => setIsOpen(false)} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all">
                                    <X size={14} />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide py-4 px-4 custom-scrollbar">
                            {notifications.length === 0 ? (
                                <div className="p-12 text-center flex flex-col items-center gap-6 bg-white/[0.01] rounded-[2.5rem] border border-white/5 border-dashed">
                                    <div className="w-16 h-16 rounded-3xl border border-white/5 flex items-center justify-center text-gray-800 bg-black/40">
                                        <Bell size={24} />
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-[10px] font-black tracking-[0.3em] uppercase text-gray-600">No notifications.</p>
                                        <p className="text-[8px] font-bold uppercase text-gray-700">You're all caught up!</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col space-y-3 pb-4">
                                    {notifications.map((item, index) => {
                                        const timeAgo = item.createdAt ? formatDistanceToNow(new Date(item.createdAt), { addSuffix: true }) : '';
                                        
                                        return (
                                            <motion.div
                                                key={item.id}
                                                initial={{ opacity: 0, x: 20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: index * 0.05 }}
                                                className="relative group"
                                            >
                                                <div 
                                                    onClick={() => {
                                                        markNotificationRead(item.id);
                                                        if (item.link) {
                                                            if (item.link.startsWith('http')) {
                                                                window.open(item.link, '_blank');
                                                            } else {
                                                                window.location.href = item.link;
                                                            }
                                                        }
                                                        setIsOpen(false);
                                                    }}
                                                    className={cn(
                                                        "p-5 rounded-[2.2rem] border transition-all cursor-pointer overflow-hidden block relative",
                                                        item.isRead 
                                                            ? "bg-zinc-900/30 border-white/5 opacity-60 hover:opacity-100 hover:border-white/10" 
                                                            : "bg-zinc-900/80 border-white/10 hover:border-neon-blue/40 shadow-lg"
                                                    )}
                                                >
                                                    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    
                                                    <div className="flex gap-4 relative z-10">
                                                        <div className="shrink-0">
                                                            <div className="w-12 h-12 rounded-2xl bg-black/40 border border-white/5 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
                                                                {item.image ? (
                                                                    <img src={item.image} alt="" className="w-full h-full rounded-2xl object-cover" />
                                                                ) : (
                                                                    getTypeIcon(item.type)
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                                                            <div className="flex items-start justify-between mb-1 gap-2">
                                                                <h4 className={cn(
                                                                    "text-[11px] font-black uppercase tracking-wider line-clamp-1 transition-colors",
                                                                    item.isRead ? "text-gray-400" : "text-white group-hover:text-neon-blue"
                                                                )}>
                                                                    {item.title}
                                                                </h4>
                                                                <span className="text-[8px] text-gray-600 uppercase tracking-widest font-black shrink-0">{timeAgo}</span>
                                                            </div>
                                                            <p className="text-[10px] text-gray-500 leading-relaxed font-medium group-hover:text-gray-400 transition-colors line-clamp-2">
                                                                {item.content}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            deleteNotification(item.id);
                                                        }}
                                                        className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 p-2 rounded-full bg-red-500/10 text-red-500/40 hover:text-red-500 hover:bg-red-500/20 transition-all z-20"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>
                                                {!item.isRead && (
                                                    <div className="absolute top-1/2 -right-1 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-neon-pink shadow-[0_0_10px_rgba(255,0,163,0.8)]" />
                                                )}
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {notifications.length > 5 && (
                            <div className="p-4 border-t border-white/5 text-center bg-white/[0.02]">
                                <button className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-500 hover:text-neon-blue transition-colors">
                                    View All Notifications
                                </button>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div >
    );
};

export default NotificationBell;
