import React, { useState, useEffect, useRef } from 'react';
import { Bell, X, Megaphone, Ticket, MessageSquare, Gift, FileText, CheckCheck, Trash2, Users, Zap, Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../lib/store';
import { cn } from '../lib/utils';
import { formatDistanceToNow, isToday, isYesterday } from 'date-fns';

const NotificationBell = () => {
    const { 
        notifications, 
        unreadNotificationsCount, 
        markNotificationRead, 
        markAllNotificationsRead, 
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
            case 'announcement': return <Megaphone className="text-neon-blue" size={18} />;
            case 'ticket': return <Ticket className="text-neon-pink" size={18} />;
            case 'message': return <MessageSquare className="text-neon-green" size={18} />;
            case 'giveaway': return <Gift className="text-neon-yellow" size={18} />;
            case 'blog': return <FileText className="text-white" size={18} />;
            case 'campaign': return <Zap className="text-neon-purple" size={18} />;
            case 'gig': return <Users className="text-neon-cyan" size={18} />;
            case 'volunteer': return <Heart className="text-red-500" size={18} />;
            default: return <Bell className="text-gray-400" size={18} />;
        }
    };

    // Group notifications by date
    const groupedNotifications = notifications.reduce((groups, item) => {
        const date = item.createdAt ? new Date(item.createdAt) : new Date();
        let groupName = 'Earlier';
        if (isToday(date)) groupName = 'Today';
        else if (isYesterday(date)) groupName = 'Yesterday';

        if (!groups[groupName]) groups[groupName] = [];
        groups[groupName].push(item);
        return groups;
    }, {});

    const groupOrder = ['Today', 'Yesterday', 'Earlier'];

    return (
        <div className="relative mr-4 md:mr-0 z-[150]" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-gray-300 hover:text-white transition-colors outline-none focus:outline-none"
                aria-label="Notifications"
            >
                <Bell size={24} />
                {hasNotifications && (
                    <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center bg-neon-pink rounded-full border-2 border-dark text-[10px] font-black text-white">
                        {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
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
                            "flex flex-col overflow-hidden max-h-[80vh]",
                            "absolute right-[-10px] md:right-0 top-full mt-4 w-[90vw] md:w-[420px] rounded-3xl",
                            "bg-[#0a0a0a]/95 backdrop-blur-3xl shadow-[0_30px_60px_rgba(0,0,0,0.8)] border border-white/10"
                        )}
                    >
                        {/* Header */}
                        <div className="px-6 py-5 border-b border-white/5 flex justify-between items-center bg-white/[0.02] shrink-0">
                            <div className="flex flex-col">
                                <h3 className="font-black text-[15px] text-white flex items-center gap-2">
                                    Notifications
                                    {hasNotifications && (
                                        <span className="bg-neon-pink/20 text-neon-pink text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full">
                                            {unreadNotificationsCount} New
                                        </span>
                                    )}
                                </h3>
                            </div>
                            <div className="flex items-center gap-3">
                                {notifications.length > 0 && hasNotifications && (
                                    <button 
                                        onClick={() => markAllNotificationsRead()}
                                        className="text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-white transition-colors flex items-center gap-1.5"
                                        title="Mark all as read"
                                    >
                                        <CheckCheck size={14} />
                                        Mark all read
                                    </button>
                                )}
                                <button 
                                    onClick={() => setIsOpen(false)} 
                                    className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-all ml-2"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Scrollable Content */}
                        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar relative">
                            {notifications.length === 0 ? (
                                <div className="flex flex-col items-center justify-center text-center p-12">
                                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-6">
                                        <Bell size={28} className="text-gray-600" />
                                    </div>
                                    <h4 className="text-white font-bold mb-2">You're all caught up!</h4>
                                    <p className="text-sm text-gray-500">No new notifications right now.</p>
                                </div>
                            ) : (
                                <div className="p-4 space-y-6">
                                    {groupOrder.map((group) => {
                                        if (!groupedNotifications[group]) return null;
                                        
                                        return (
                                            <div key={group} className="space-y-3">
                                                <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 pl-2">
                                                    {group}
                                                </h5>
                                                <div className="space-y-2">
                                                    {groupedNotifications[group].map((item, index) => {
                                                        const timeAgo = item.createdAt ? formatDistanceToNow(new Date(item.createdAt), { addSuffix: true }) : 'just now';
                                                        
                                                        return (
                                                            <motion.div
                                                                key={item.id}
                                                                initial={{ opacity: 0, y: 10 }}
                                                                animate={{ opacity: 1, y: 0 }}
                                                                transition={{ delay: index * 0.03 }}
                                                                className={cn(
                                                                    "group relative p-4 rounded-2xl transition-all cursor-pointer overflow-hidden",
                                                                    item.isRead 
                                                                        ? "bg-transparent hover:bg-white/[0.02]" 
                                                                        : "bg-white/[0.04] hover:bg-white/[0.06] border border-white/[0.05]"
                                                                )}
                                                                onClick={() => {
                                                                    markNotificationRead(item.id);
                                                                    if (item.link && item.link.trim() !== '') {
                                                                        if (item.link.startsWith('http')) {
                                                                            window.open(item.link, '_blank');
                                                                        } else {
                                                                            window.location.href = item.link;
                                                                        }
                                                                    }
                                                                    setIsOpen(false);
                                                                }}
                                                            >
                                                                <div className="flex gap-4">
                                                                    {/* Icon/Image */}
                                                                    <div className="shrink-0 pt-0.5">
                                                                        <div className={cn(
                                                                            "w-10 h-10 rounded-full flex items-center justify-center transition-transform group-hover:scale-110",
                                                                            item.isRead ? "bg-white/5" : "bg-white/10"
                                                                        )}>
                                                                            {item.image ? (
                                                                                <img src={item.image} alt="" className="w-full h-full rounded-full object-cover" />
                                                                            ) : (
                                                                                getTypeIcon(item.type)
                                                                            )}
                                                                        </div>
                                                                    </div>

                                                                    {/* Content */}
                                                                    <div className="flex-1 min-w-0 pr-8">
                                                                        <div className="flex items-center gap-2 mb-1">
                                                                            <h4 className={cn(
                                                                                "text-sm font-semibold truncate transition-colors",
                                                                                item.isRead ? "text-gray-300" : "text-white"
                                                                            )}>
                                                                                {item.title}
                                                                            </h4>
                                                                            {!item.isRead && (
                                                                                <span className="w-1.5 h-1.5 rounded-full bg-neon-blue shrink-0 shadow-[0_0_8px_rgba(0,255,255,0.8)]" />
                                                                            )}
                                                                        </div>
                                                                        <p className={cn(
                                                                            "text-xs leading-relaxed line-clamp-2 mb-2",
                                                                            item.isRead ? "text-gray-500" : "text-gray-400"
                                                                        )}>
                                                                            {item.content}
                                                                        </p>
                                                                        <span className="text-[10px] text-gray-600 font-medium tracking-wide">
                                                                            {timeAgo}
                                                                        </span>
                                                                    </div>
                                                                </div>

                                                                {/* Delete Button */}
                                                                <button 
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        deleteNotification(item.id);
                                                                    }}
                                                                    className="absolute top-1/2 -translate-y-1/2 right-4 opacity-0 group-hover:opacity-100 p-2 rounded-full bg-red-500/10 text-red-500/60 hover:text-red-500 hover:bg-red-500/20 transition-all"
                                                                    title="Delete notification"
                                                                >
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            </motion.div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default NotificationBell;
