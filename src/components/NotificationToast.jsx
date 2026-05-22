import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../lib/store';
import { X, Bell, Megaphone, Ticket, MessageSquare, Gift, FileText, Zap, Users, Heart } from 'lucide-react';
import { cn } from '../lib/utils';

const icons = {
    announcement: <Megaphone className="text-neon-blue" size={20} />,
    ticket: <Ticket className="text-neon-pink" size={20} />,
    message: <MessageSquare className="text-neon-green" size={20} />,
    giveaway: <Gift className="text-neon-yellow" size={20} />,
    blog: <FileText className="text-white" size={20} />,
    campaign: <Zap className="text-neon-purple" size={20} />,
    gig: <Users className="text-neon-cyan" size={20} />,
    volunteer: <Heart className="text-red-500" size={20} />,
    default: <Bell className="text-gray-400" size={20} />
};

const NotificationToast = () => {
    const { notifications, markNotificationRead } = useStore();
    const [activeToast, setActiveToast] = useState(null);
    const [imgError, setImgError] = useState(false);
    
    // Use ref to track the previous list to reliably detect NEW notifications
    const prevNotificationsRef = useRef([]);

    useEffect(() => {
        const currentNotifications = notifications;
        const prevNotifications = prevNotificationsRef.current;
        
        // Find if there is a new unread notification that wasn't in the previous state
        const newUnread = currentNotifications.find(curr => 
            !curr.isRead && 
            !prevNotifications.some(prev => prev.id === curr.id)
        );

        if (newUnread) {
            setImgError(false);
            setActiveToast(newUnread);
        }

        prevNotificationsRef.current = currentNotifications;
    }, [notifications]);

    // Handle auto-dismiss timer
    useEffect(() => {
        if (!activeToast) return;
        
        const timer = setTimeout(() => {
            setActiveToast(null);
        }, 6000); // 6 seconds duration
        
        return () => clearTimeout(timer);
    }, [activeToast]); // Now safely depends on activeToast

    if (!activeToast) return null;

    const getSmartIcon = () => {
        const text = ((activeToast.title || "") + " " + (activeToast.content || "")).toLowerCase();
        if (text.includes('volunteer')) return icons.volunteer;
        if (text.includes('gig') || text.includes('hiring')) return icons.gig;
        if (text.includes('giveaway')) return icons.giveaway;
        if (text.includes('campaign')) return icons.campaign;
        if (text.includes('ticket') || text.includes('booking')) return icons.ticket;
        if (text.includes('blog') || text.includes('read')) return icons.blog;
        return icons[activeToast.type] || icons.default;
    };

    return (
        <div className="fixed top-4 right-4 z-[300] md:top-6 md:right-6 pointer-events-none w-[calc(100vw-2rem)] md:w-auto">
            <AnimatePresence mode="wait">
                <motion.div
                    key={activeToast.id}
                    initial={{ opacity: 0, y: -20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    className={cn(
                        "pointer-events-auto bg-[#0a0a0a]/90 backdrop-blur-2xl border border-white/[0.08]",
                        "rounded-2xl p-4 shadow-[0_20px_40px_rgba(0,0,0,0.6)]",
                        "flex gap-4 md:min-w-[340px] md:max-w-[420px] relative overflow-hidden group cursor-pointer"
                    )}
                    onClick={() => {
                        markNotificationRead(activeToast.id);
                        if (activeToast.link && activeToast.link.trim() !== '') {
                            if (activeToast.link.startsWith('http')) {
                                window.open(activeToast.link, '_blank');
                            } else {
                                window.location.href = activeToast.link;
                            }
                        }
                        setActiveToast(null);
                    }}
                >
                    {/* Subtle pulse background */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.04] to-transparent pointer-events-none" />
                    
                    <div className="w-10 h-10 rounded-full bg-white/5 border border-white/5 flex items-center justify-center shrink-0 relative z-10 transition-transform group-hover:scale-110 duration-500">
                        {activeToast.image && !imgError ? (
                            <img 
                                src={activeToast.image} 
                                alt="" 
                                className="w-full h-full rounded-full object-cover" 
                                onError={() => setImgError(true)}
                            />
                        ) : (
                            getSmartIcon()
                        )}
                    </div>
                    
                    <div className="flex-1 relative z-10 pr-6">
                        <div className="flex items-center gap-2 mb-0.5">
                            <h4 className="text-[13px] font-bold text-white line-clamp-1">
                                {activeToast.title}
                            </h4>
                        </div>
                        <p className="text-[11px] text-gray-400 leading-relaxed line-clamp-2">
                            {activeToast.content}
                        </p>
                    </div>
                    
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            setActiveToast(null);
                        }} 
                        className="absolute top-3 right-3 z-10 text-gray-500 hover:text-white hover:bg-white/10 rounded-full p-1 transition-all"
                    >
                        <X size={14} />
                    </button>
                </motion.div>
            </AnimatePresence>
        </div>
    );
};

export default NotificationToast;
