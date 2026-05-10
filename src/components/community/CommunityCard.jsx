import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Calendar, MapPin, Share2, ArrowRight, Sparkles, X, Info, FileText, ExternalLink, Zap, Users, Ticket, Pin, Star, ClipboardList, Megaphone
} from 'lucide-react';
import { cn } from '../../lib/utils';

const CommunityCard = ({ item, type, handleShare, onAction }) => {
    const [isFlipped, setIsFlipped] = useState(false);
    const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
    const isGig = type === 'gig';
    const isForm = type === 'form';
    const isGL = type === 'gl' || type === 'gl_embed';
    const isCampaign = type === 'campaign';
    const isEvent = type === 'event';
    
    const formatDate = (dateValue) => {
        if (Array.isArray(dateValue)) {
            if (dateValue.length === 0) return '';
            if (dateValue.length === 1) return formatDate(dateValue[0]);
            
            try {
                const dates = dateValue
                    .map(d => new Date(d))
                    .filter(d => !isNaN(d.getTime()))
                    .sort((a, b) => a.getTime() - b.getTime());
                
                if (dates.length === 0) return '';
                if (dates.length === 1) return formatDate(dates[0]);

                const start = dates[0];
                const end = dates[dates.length - 1];
                
                const startMonth = start.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
                const endMonth = end.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
                
                if (startMonth === endMonth) {
                    return `${start.getDate()} - ${end.getDate()} ${startMonth}, ${start.getFullYear()}`;
                }
                return `${start.getDate()} ${startMonth} - ${end.getDate()} ${endMonth}, ${start.getFullYear()}`;
            } catch (e) {
                return `${dateValue.length} DAYS`;
            }
        }

        if (!dateValue || dateValue === 'TBD') return '';
        
        try {
            const cleanDate = typeof dateValue === 'string' ? dateValue.split('T')[0] : dateValue;
            const d = new Date(cleanDate);
            if (isNaN(d.getTime())) return String(dateValue).toUpperCase();
            
            const day = d.getDate();
            const month = d.toLocaleDateString('en-US', { month: 'short' });
            const year = d.getFullYear();
            
            const suffix = (day) => {
                if (day > 3 && day < 21) return 'TH';
                switch (day % 10) {
                    case 1:  return "ST";
                    case 2:  return "ND";
                    case 3:  return "RD";
                    default: return "TH";
                }
            };
            
            return `${day}${suffix(day)} ${month}, ${year}`.toUpperCase();
        } catch (e) {
            return String(dateValue).toUpperCase();
        }
    };

    const hasExternalLink = (item.link && item.link.trim() !== '' && item.link !== '#') || 
                           (item.applyLink && item.applyLink.startsWith('http')) ||
                           (item.externalLink && item.externalLink.startsWith('http'));

    const isInternalGL = isGL && item.guestlistEnabled && !hasExternalLink;
    
    const getButtonLabel = () => {
        if (item.buttonText) return item.buttonText;
        if (hasExternalLink) return "ACCESS";
        if (isInternalGL) return "JOIN GUESTLIST";
        if (isGig) return "APPLY";
        if (isCampaign) return "APPLY";
        if (isEvent) {
            if (item.isTicketed) return "GET TICKETS";
            if (item.isGuestlistEnabled) return "RSVP NOW";
            return "VIEW DETAILS";
        }
        return "FILL FORM";
    };

    const buttonLabel = getButtonLabel();
    const isClosed = (item.status && (item.status.toLowerCase() === 'closed' || item.status.toLowerCase() === 'full')) || (item.activeLabel && item.activeLabel.toLowerCase() === 'closed');
    const showButton = (hasExternalLink || isInternalGL || isGig || isForm || isCampaign || isEvent) && !isClosed;

    const themeColor = isForm ? "#FF4F8B" : (isGig ? "#39FF14" : (isCampaign ? "#2ebfff" : (isEvent ? "#2ebfff" : (isGL ? "#2ebfff" : "#ffffff"))));
    const highlightColor = item.highlightColor || themeColor;

    const handleButtonClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (hasExternalLink) {
            window.open(item.link || item.applyLink || item.externalLink, '_blank');
        } else if (isInternalGL || isGig || isForm || isCampaign || isEvent) {
            onAction?.(item);
        }
    };

    const handleMouseMove = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        setMousePos({ x, y });
    };

    const transform = item.imageTransform || { scale: 1, x: 0, y: 0 };
    const artistsList = Array.isArray(item.artists) 
        ? item.artists 
        : (typeof item.artists === 'string' && item.artists.trim() !== '' ? item.artists.split(',').map(a => a.trim()) : []);

    return (
        <div 
            className="perspective-1000 w-full h-[400px] md:h-[420px] flex group"
            onMouseMove={handleMouseMove}
        >
            <motion.div
                initial={false}
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{ duration: 0.8, type: "spring", stiffness: 80, damping: 20 }}
                className="relative w-full h-full preserve-3d cursor-default flex-1 flex"
            >
                {/* Front Side */}
                <div 
                    className={cn(
                        "backface-hidden relative bg-zinc-950/20 border-2 rounded-[2.5rem] overflow-hidden flex-1 flex shadow-[0_40px_80px_-20px_rgba(0,0,0,0.8)] transition-all duration-700",
                        isFlipped ? "pointer-events-none" : "pointer-events-auto"
                    )}
                    style={{ 
                        borderColor: `${highlightColor}25`,
                        background: `radial-gradient(circle at ${mousePos.x}% ${mousePos.y}%, ${highlightColor}15 0%, transparent 60%)`
                    }}
                >
                    {/* Background Visual */}
                    <div className="absolute inset-0 z-0 overflow-hidden bg-black">
                        {/* Video Layer (Priority) */}
                        {item.videoUrl && item.enableVideoBackground && (item.videoUrl.match(/\.(mp4|webm|ogg)$/i) || item.videoUrl.includes('cloudinary.com')) ? (
                            <motion.video 
                                src={item.videoUrl}
                                autoPlay
                                loop
                                muted
                                playsInline
                                className="w-full h-full object-cover opacity-40 group-hover:opacity-80 transition-all duration-1000 scale-105 group-hover:scale-110"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 0.4 }}
                            />
                        ) : item.image ? (
                            <motion.div 
                                className="w-full h-full bg-cover opacity-60 group-hover:opacity-100 transition-all duration-1000" 
                                initial={false}
                                animate={{ 
                                    scale: isFlipped ? 1 : (transform.scale || 1.05)
                                }}
                                whileHover={{ scale: isFlipped ? 1 : (transform.scale || 1.05) * 1.05 }}
                                transition={{ duration: 2, ease: [0.23, 1, 0.32, 1] }}
                                style={{ 
                                    backgroundImage: `url(${item.image})`,
                                    backgroundPosition: `calc(50% + ${transform.x || 0}%) calc(50% + ${transform.y || 0}%)`
                                }}
                            />
                        ) : (
                            <div className="w-full h-full bg-zinc-900 flex items-center justify-center relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
                                {isForm ? <ClipboardList size={80} className="text-white/5" /> : 
                                 isGig ? <Users size={80} className="text-white/5" /> : 
                                 isCampaign ? <Megaphone size={80} className="text-white/5" /> : 
                                 isGL ? <Ticket size={80} className="text-white/5" /> : 
                                 isEvent ? <Calendar size={80} className="text-white/5" /> :
                                 <Sparkles size={80} className="text-white/5" />}
                            </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
                        
                        {/* Interactive Shimmer Overlay */}
                        <div 
                            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none z-10"
                            style={{ 
                                background: `linear-gradient(${mousePos.x + mousePos.y}deg, transparent 40%, ${highlightColor}10 50%, transparent 60%)`
                            }}
                        />
                    </div>

                    {/* Content Layer */}
                    <div className="relative z-20 flex-1 flex flex-col backdrop-blur-2xl p-6 md:p-8">
                        {/* Status Bar */}
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center px-3 h-6 rounded-full bg-white/5 border border-white/10 backdrop-blur-3xl shadow-xl">
                                    <span className="text-[8px] font-black uppercase tracking-[0.3em] italic pl-[0.3em] leading-none" style={{ color: highlightColor }}>
                                        {isGig ? "VOLUNTEER GIG" : (isCampaign ? "CAMPAIGN" : (isForm ? "FORM" : (isEvent ? "EVENT" : "GUESTLIST")))}
                                    </span>
                                </div>
                                <div className={cn(
                                    "px-3 h-6 rounded-full border text-[8px] font-black uppercase tracking-widest flex items-center justify-center gap-2 backdrop-blur-3xl shadow-lg",
                                    (item.status === 'Open' || item.activeLabel === 'Live' || item.status === 'Live') ? "bg-green-500/10 border-green-500/20 text-green-400" : 
                                    (item.status === 'Filling Fast' || item.activeLabel === 'Few Slots Remain' || item.status === 'Few Slots Remain') ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-500" : 
                                    "bg-red-500/10 border-red-500/20 text-red-400"
                                )}>
                                    <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse shadow-[0_0_8px_currentColor]" />
                                    {(item.status || item.activeLabel || 'LIVE').toUpperCase()}
                                </div>
                            </div>
                            
                            {item.isPinned && (
                                <div className="w-10 h-10 rounded-2xl bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center text-yellow-400 shadow-[0_0_20px_rgba(234,179,8,0.3)] backdrop-blur-3xl group-hover:scale-110 transition-transform">
                                    <Star size={18} className="fill-current" />
                                </div>
                            )}

                            <button 
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleShare?.(type, item.id); }}
                                className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/30 hover:text-white hover:bg-white/10 transition-all backdrop-blur-3xl shadow-xl ml-auto"
                            >
                                <Share2 size={16} />
                            </button>
                        </div>

                        {/* Title & Desc Area */}
                        <div className="mt-0 space-y-4">
                            <div className="space-y-1.5">
                                <h2 className="text-2xl md:text-3xl font-black font-heading text-white tracking-tighter uppercase italic leading-[0.95] drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)] group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-white/40 transition-all duration-700 line-clamp-3">
                                    {item.title}
                                </h2>
                                {highlightColor && <div className="h-[2px] w-12 rounded-full group-hover:w-20 transition-all duration-700" style={{ backgroundColor: highlightColor }} />}
                            </div>

                            <div className="relative group/desc">
                                <div className="absolute -inset-4 bg-white/[0.03] rounded-3xl blur-2xl opacity-0 group-hover/desc:opacity-100 transition-opacity duration-700" />
                                <p className="relative text-[12px] md:text-[13px] font-medium text-gray-400 uppercase tracking-widest leading-relaxed line-clamp-2 italic opacity-80 group-hover:opacity-100 transition-opacity">
                                    {item.description || ""}
                                </p>
                            </div>

                            <button 
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsFlipped(true); }}
                                className="flex items-center gap-3 text-[9px] font-black text-white/30 hover:text-white uppercase tracking-[0.5em] transition-all group/more"
                            >
                                VIEW DETAILS
                                <div className="w-6 h-[1px] bg-white/10 group-hover/more:w-12 group-hover/more:bg-white/40 transition-all duration-500" />
                            </button>
                        </div>

                        {/* Artists / Lineup */}
                        {artistsList.length > 0 && (
                            <div className="mt-4 flex items-center gap-2 overflow-hidden">
                                {artistsList.slice(0, 2).map((artist, idx) => (
                                    <div key={idx} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-[9px] font-black text-white/60 uppercase tracking-widest backdrop-blur-3xl hover:bg-white/10 transition-colors truncate max-w-[120px]">
                                        {artist}
                                    </div>
                                ))}
                                {artistsList.length > 2 && (
                                    <div className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-[9px] font-black text-white/20 uppercase tracking-widest shrink-0">
                                        +{artistsList.length - 2}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Footer Section */}
                        <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between gap-4">
                            <div className="space-y-2">
                                {!isForm && (
                                    <div className="flex items-center gap-2.5 text-white/50 group/meta">
                                        <div className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center group-hover/meta:bg-white/10 transition-colors">
                                            <Calendar size={12} style={{ color: highlightColor }} />
                                        </div>
                                        <span className="text-[9px] font-black uppercase tracking-widest whitespace-nowrap">{formatDate(item.dates || item.date)}</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-2.5 text-white/50 group/meta">
                                    <div className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center group-hover/meta:bg-white/10 transition-colors">
                                        <MapPin size={12} style={{ color: highlightColor }} />
                                    </div>
                                    <span className="text-[9px] font-black uppercase tracking-tight leading-tight line-clamp-2 max-w-[140px] md:max-w-[180px]">{item.bottomText || item.targetCity || item.location || ''}</span>
                                </div>
                            </div>

                            {showButton && (
                                <button 
                                    onClick={handleButtonClick}
                                    disabled={isClosed}
                                    className={cn(
                                        "h-12 px-5 rounded-xl border-2 font-black uppercase tracking-[0.15em] text-[9px] transition-all flex items-center justify-center gap-2.5 group/btn relative overflow-hidden shadow-2xl shrink-0",
                                        isClosed 
                                            ? "bg-white/5 border-white/5 text-gray-600 cursor-not-allowed opacity-50" 
                                            : "bg-black/40 border-white/10 text-white hover:bg-white hover:text-black hover:scale-105 active:scale-95"
                                    )}
                                    style={{ borderColor: isClosed ? 'transparent' : `${highlightColor}40` }}
                                >
                                    <span className="relative z-10 italic whitespace-nowrap pl-[0.15em]">{isClosed ? 'CLOSED' : buttonLabel}</span>
                                    {!isClosed && <ArrowRight size={16} className="relative z-10 group-hover/btn:translate-x-2 transition-transform duration-500 shrink-0" />}
                                    
                                    {/* Advanced Shimmer Overlay */}
                                    {!isClosed && (
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:animate-[shimmer_3s_infinite] pointer-events-none" />
                                    )}
                                </button>
                            )}
                        </div>

                        {/* Floating Corner Accent */}
                        <div 
                            className="absolute -top-10 -right-10 w-32 h-32 blur-[60px] opacity-0 group-hover:opacity-40 transition-opacity duration-1000 pointer-events-none"
                            style={{ backgroundColor: highlightColor }}
                        />
                    </div>
                </div>

                {/* Back Side */}
                <div 
                    className={cn(
                        "absolute inset-0 backface-hidden rotate-y-180 bg-[#080808] border-2 rounded-[2.5rem] p-7 md:p-9 flex flex-col shadow-2xl overflow-hidden",
                        isFlipped ? "pointer-events-auto" : "pointer-events-none"
                    )}
                    style={{ 
                        borderColor: `${highlightColor}35`,
                        background: `radial-gradient(circle at bottom right, ${highlightColor}10 0%, transparent 70%)`
                    }}
                >
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.03),transparent)]" />
                    
                    <div className="relative z-10 flex items-center justify-end mb-8">
                        <button 
                            onClick={() => setIsFlipped(false)}
                            className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/30 hover:text-white hover:bg-white/10 transition-all group/close backdrop-blur-3xl"
                        >
                            <X size={20} className="group-hover/close:rotate-90 transition-transform duration-500" />
                        </button>
                    </div>

                    <div className="relative z-10 flex-1 overflow-y-auto pr-4 space-y-10 scrollbar-hide">
                        <div className="space-y-5">
                            <div className="flex items-center gap-4 text-white/20">
                                <div className="w-10 h-[1px] bg-current" />
                                <span className="text-[10px] font-black uppercase tracking-[0.5em]">DESCRIPTION</span>
                            </div>
                            <div className="text-base font-medium text-gray-400 leading-relaxed italic whitespace-pre-wrap pl-1">
                                {item.description || ""}
                            </div>
                        </div>

                        {item.importantNotes && (
                            <div className="p-6 rounded-[1.5rem] bg-white/[0.03] border border-white/5 relative overflow-hidden group/note">
                                <div className="absolute top-0 left-0 w-1 h-full transition-all duration-500 group-hover/note:w-1.5" style={{ backgroundColor: highlightColor }} />
                                <div className="flex items-center gap-3 mb-3">
                                    <Info style={{ color: highlightColor }} size={14} />
                                    <span className="text-[9px] font-black uppercase tracking-[0.4em] text-white/70">IMPORTANT NOTES</span>
                                </div>
                                <div className="text-[11px] font-bold text-gray-400 leading-relaxed uppercase tracking-widest italic">
                                    {item.importantNotes}
                                </div>
                            </div>
                        )}

                        {isCampaign && (
                            <div className="pt-8 border-t border-white/5 space-y-5">
                                <div className="flex items-center gap-4 text-white/20">
                                    <div className="w-10 h-[1px] bg-current" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.5em]">FOLLOWERS</span>
                                </div>
                                <div className="p-8 rounded-[2rem] bg-white/[0.02] border border-white/10 flex items-center justify-between group/metric hover:bg-white/[0.04] transition-colors">
                                    <div>
                                        <p className="text-[10px] font-black text-neon-blue uppercase tracking-[0.3em] mb-1 opacity-60">MIN. THRESHOLD</p>
                                        <p className="text-4xl font-black italic tracking-tighter text-white">{Number(item.minInstagramFollowers || 0).toLocaleString()}+</p>
                                    </div>
                                    <Users size={32} className="text-white/10 group-hover/metric:text-neon-blue group-hover/metric:scale-110 transition-all duration-500" />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="relative z-10 pt-8 mt-auto flex items-center justify-between border-t border-white/10">
                        <div className="flex items-center gap-3">
                            <Sparkles size={12} style={{ color: highlightColor }} />
                            <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.6em] italic">NEWBI ENTERTAINMENT</span>
                        </div>
                        <div className="flex gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-white/30" />
                            <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                            <div className="w-1.5 h-1.5 rounded-full bg-white/10" />
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default CommunityCard;
