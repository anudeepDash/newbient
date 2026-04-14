import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../lib/store';
import { X, Bell, Megaphone, Ticket, MessageSquare, Gift, FileText, Calendar, Users, Zap, Heart } from 'lucide-react';

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
    const { notifications } = useStore();
    const [activeToast, setActiveToast] = useState(null);
    const [imgError, setImgError] = useState(false);

    useEffect(() => {
        setImgError(false); // Reset error state for new toast
        // Find the latest unread notification created recently
        const now = new Date();
        const latest = notifications.find(n => !n.isRead && (now - new Date(n.createdAt)) < 10000);
        
        if (latest && (!activeToast || activeToast.id !== latest.id)) {
            setActiveToast(latest);
            const timer = setTimeout(() => setActiveToast(null), 8000);
            return () => clearTimeout(timer);
        }
    }, [notifications, activeToast, setActiveToast]);

    if (!activeToast) return null;

    const getSmartIcon = () => {
        const text = (activeToast.title + " " + (activeToast.content || "")).toLowerCase();
        if (text.includes('volunteer')) return icons.volunteer;
        if (text.includes('gig') || text.includes('hiring')) return icons.gig;
        if (text.includes('giveaway')) return icons.giveaway;
        if (text.includes('campaign')) return icons.campaign;
        if (text.includes('ticket') || text.includes('booking')) return icons.ticket;
        if (text.includes('blog') || text.includes('read')) return icons.blog;
        return icons[activeToast.type] || icons.default;
    };

    return (
        <div className="fixed bottom-8 right-4 z-[200] pointer-events-none md:right-8 lg:bottom-12">
            <AnimatePresence mode="wait">
                <motion.div
                    key={activeToast.id}
                    initial={{ opacity: 0, y: 50, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 50, scale: 0.95 }}
                    className="pointer-events-auto bg-[#0d0d0d] border border-white/10 rounded-[2.2rem] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.8)] flex gap-4 min-w-[320px] max-w-[420px] backdrop-blur-xl relative overflow-hidden group"
                >
                    {/* Subtle pulse background */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent" />
                    <div className="absolute top-0 left-0 w-1 h-full bg-neon-blue" />
                    
                    <div className="w-12 h-12 rounded-2xl bg-black/40 border border-white/5 flex items-center justify-center shrink-0 relative z-10 transition-transform group-hover:scale-110 duration-500">
                        {activeToast.image && !imgError ? (
                            <img 
                                src={activeToast.image} 
                                alt="" 
                                className="w-full h-full rounded-2xl object-cover" 
                                onError={() => setImgError(true)}
                            />
                        ) : (
                            getSmartIcon()
                        )}
                    </div>
                    
                    <div className="flex-1 relative z-10 pr-2">
                        <div className="flex items-center justify-between gap-2 mb-1">
                            <h4 className="text-[11px] font-black uppercase text-white tracking-wider line-clamp-1">
                                {activeToast.title}
                            </h4>
                            <span className="text-[8px] text-gray-500 uppercase font-bold shrink-0">Now</span>
                        </div>
                        <p className="text-[10px] text-gray-400 leading-relaxed line-clamp-2">
                            {activeToast.content}
                        </p>
                    </div>
                    
                    <button 
                        onClick={() => setActiveToast(null)} 
                        className="relative z-10 text-gray-600 hover:text-white transition-colors p-1 self-start"
                    >
                        <X size={14} />
                    </button>
                </motion.div>
            </AnimatePresence>
        </div>
    );
};

export default NotificationToast;
