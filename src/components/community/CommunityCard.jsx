import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Calendar, MapPin, Share2, ArrowRight, X, Info, FileText, ExternalLink, Zap, Users, Ticket, Pin, Star, ClipboardList, Megaphone
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
                return `${dateValue.length} Days`;
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
        if (hasExternalLink) return "View More";
        if (isInternalGL) return "Join Guestlist";
        if (isGig) return "Apply";
        if (isCampaign) return "Apply";
        if (isEvent) {
            if (item.isTicketed) return "Get Tickets";
            if (item.isGuestlistEnabled) return "RSVP Now";
            return "View Details";
        }
        return "Open Form";
    };

    const buttonLabel = getButtonLabel();
    const isClosed = (item.status && (item.status.toLowerCase() === 'closed' || item.status.toLowerCase() === 'full')) || (item.activeLabel && item.activeLabel.toLowerCase() === 'closed');
    const showButton = (hasExternalLink || isInternalGL || isGig || isForm || isCampaign || isEvent) && !isClosed;

    const themeColor = isForm ? "#ffffff" : (isGig ? "#39FF14" : (isCampaign ? "#39FF14" : (isEvent ? "#39FF14" : (isGL ? "#39FF14" : "#ffffff"))));
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
            className="perspective-1000 w-full aspect-[4/5] flex group"
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
                        "backface-hidden relative bg-black border border-white/5 rounded-3xl overflow-hidden flex-1 flex flex-col shadow-2xl transition-all duration-500",
                        isFlipped ? "pointer-events-none" : "pointer-events-auto"
                    )}
                >
                    {/* Background Visual */}
                    <div className="absolute inset-0 z-0 overflow-hidden">
                        {item.videoUrl && item.enableVideoBackground && (item.videoUrl.match(/\.(mp4|webm|ogg)$/i) || item.videoUrl.includes('cloudinary.com')) ? (
                            <motion.video 
                                src={item.videoUrl}
                                autoPlay
                                loop
                                muted
                                playsInline
                                className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-all duration-1000 scale-105 group-hover:scale-110"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 0.6 }}
                            />
                        ) : item.image ? (
                            <motion.div 
                                className="w-full h-full bg-cover opacity-60 group-hover:opacity-100 transition-all duration-1000" 
                                initial={false}
                                animate={{ 
                                    scale: isFlipped ? 1 : (transform.scale || 1.05)
                                }}
                                whileHover={{ scale: isFlipped ? 1 : (transform.scale || 1.05) * 1.05 }}
                                transition={{ duration: 1.5, ease: [0.23, 1, 0.32, 1] }}
                                style={{ 
                                    backgroundImage: `url(${item.image})`,
                                    backgroundPosition: `calc(50% + ${transform.x || 0}%) calc(50% + ${transform.y || 0}%)`
                                }}
                            />
                        ) : (
                            <div className="w-full h-full bg-gradient-to-br from-zinc-900 to-zinc-950 flex items-center justify-center relative overflow-hidden">
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(57,255,20,0.08),transparent_60%)]" />
                                {isForm ? <ClipboardList size={60} className="text-white/5" /> : 
                                 isGig ? <Users size={60} className="text-white/5" /> : 
                                 isCampaign ? <Megaphone size={60} className="text-white/5" /> : 
                                 isGL ? <Ticket size={60} className="text-white/5" /> : 
                                 isEvent ? <Calendar size={60} className="text-white/5" /> :
                                 <Star size={60} className="text-white/5" />}
                            </div>
                        )}
                        {/* Advanced Overlay Gradients */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-90" />
                        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-transparent opacity-60" />
                    </div>

                    {/* Corner Badges */}
                    <div className="absolute top-8 left-8 right-8 z-10 flex justify-between items-start">
                        <div className="flex gap-2">
                            <div className="px-4 h-8 rounded-2xl bg-black/40 backdrop-blur-3xl border border-white/10 flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: highlightColor }} />
                                <span className="text-[9px] font-black uppercase tracking-widest text-white/90">
                                    {isGig ? "Volunteer" : (isCampaign ? "Campaign" : (isForm ? "Form" : (isEvent ? "Event" : "Guestlist")))}
                                </span>
                            </div>
                            {item.status && (
                                <div className={cn(
                                    "px-4 h-8 rounded-2xl border text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 backdrop-blur-3xl",
                                    (item.status === 'Open' || item.activeLabel === 'Live' || item.status === 'Live') ? "bg-green-500/10 border-green-500/20 text-green-400" : 
                                    (item.status === 'Filling Fast' || item.activeLabel === 'Few Slots Remain' || item.status === 'Few Slots Remain') ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-500" : 
                                    "bg-red-500/10 border-red-500/20 text-red-400"
                                )}>
                                    {(item.status || item.activeLabel || 'LIVE').toUpperCase()}
                                </div>
                            )}
                        </div>
                        
                        <div className="flex gap-2">
                            {item.isPinned && (
                                <div className="w-10 h-10 rounded-xl bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center text-yellow-400 backdrop-blur-3xl">
                                    <Star size={14} className="fill-current" />
                                </div>
                            )}
                            <button 
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleShare?.(type, item.id); }}
                                className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all backdrop-blur-3xl"
                            >
                                <Share2 size={14} />
                            </button>
                        </div>
                    </div>

                    {/* Content Bottom Overlay */}
                    <div className="absolute inset-x-0 bottom-0 z-10 p-8 pt-20 bg-gradient-to-t from-black via-black/80 to-transparent flex flex-col justify-end text-left space-y-4">
                        <div className="space-y-2.5">
                            {/* Artists List */}
                            {artistsList.length > 0 && (
                                <div className="flex flex-wrap items-center gap-2 pb-1">
                                    {artistsList.slice(0, 2).map((artist, idx) => (
                                        <span key={idx} className="text-[9px] font-black uppercase tracking-widest text-neon-green/80 px-2 py-0.5 rounded bg-neon-green/5 border border-neon-green/20 whitespace-nowrap">
                                            {artist}
                                        </span>
                                    ))}
                                    {artistsList.length > 2 && (
                                        <span className="text-[9px] font-black uppercase tracking-widest text-white/20 whitespace-nowrap">+{artistsList.length - 2} MORE</span>
                                    )}
                                </div>
                            )}

                            <h3 className="text-2xl md:text-3xl font-extrabold font-heading tracking-tight text-white leading-tight group-hover:translate-x-1 transition-transform duration-500">
                                {item.title}
                            </h3>

                            <p className="text-[11px] md:text-[12px] font-medium text-zinc-400 leading-relaxed line-clamp-2">
                                {item.description || "No description provided."}
                            </p>
                        </div>

                        {/* Metadata Row */}
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-white/40">
                            {!isForm && (
                                <div className="flex items-center gap-2">
                                    <Calendar size={12} className="text-zinc-500 shrink-0" />
                                    <span className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap">{formatDate(item.dates || item.date)}</span>
                                </div>
                            )}
                            <div className="flex items-center gap-2">
                                <MapPin size={12} className="text-neon-green shrink-0" />
                                <span className="text-[10px] font-black uppercase tracking-widest line-clamp-1">{item.bottomText || item.targetCity || item.location || 'TBD'}</span>
                            </div>
                        </div>

                        {/* Action Buttons (Always Visible) */}
                        <div className="flex gap-3 w-full pt-2 shrink-0">
                            {showButton && (
                                <button 
                                    onClick={handleButtonClick}
                                    disabled={isClosed}
                                    className={cn(
                                        "flex-1 h-14 rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] flex items-center justify-center gap-2 transition-all active:scale-95",
                                        isClosed 
                                            ? "bg-white/5 border border-white/5 text-zinc-600 cursor-not-allowed opacity-50" 
                                            : "bg-white text-black hover:bg-neon-green hover:scale-[1.02] shadow-2xl"
                                    )}
                                >
                                    <span>{isClosed ? 'CLOSED' : buttonLabel}</span>
                                    {!isClosed && <ArrowRight size={14} />}
                                </button>
                            )}
                            <button 
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsFlipped(true); }}
                                className="w-14 h-14 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/10 flex items-center justify-center text-white transition-all shadow-md shrink-0"
                                title="View Details"
                            >
                                <Info size={18} />
                            </button>
                        </div>
                    </div>

                    {/* Shimmer on Hover */}
                    <div className="absolute inset-0 pointer-events-none bg-gradient-to-tr from-white/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                </div>

                {/* Back Side */}
                <div 
                    className={cn(
                        "absolute inset-0 backface-hidden rotate-y-180 bg-zinc-950/95 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 md:p-8 flex flex-col justify-between shadow-[0_30px_60px_-15px_rgba(0,0,0,0.8)] overflow-hidden",
                        isFlipped ? "pointer-events-auto" : "pointer-events-none"
                    )}
                    style={{ 
                        borderColor: `${highlightColor}25`,
                        background: `radial-gradient(circle at bottom right, ${highlightColor}05 0%, transparent 70%)`
                    }}
                >
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.02),transparent)] pointer-events-none" />
                    
                    <div className="relative z-10 flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
                            <span className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-zinc-400">Details Overview</span>
                        </div>
                        <button 
                            onClick={() => setIsFlipped(false)}
                            className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-all group/close"
                        >
                            <X size={14} className="group-hover/close:rotate-90 transition-transform duration-300" />
                        </button>
                    </div>

                    <div className="relative z-10 flex-1 overflow-y-auto pr-1 space-y-5 scrollbar-hide text-left">
                        <div className="space-y-2">
                            <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-500">Description</h4>
                            <p className="text-xs font-medium text-zinc-300 leading-relaxed whitespace-pre-wrap">
                                {item.description || "No additional description provided."}
                            </p>
                        </div>

                        {item.importantNotes && (
                            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 relative overflow-hidden group/note">
                                <div className="absolute top-0 left-0 w-[3px] h-full transition-all duration-300 group-hover/note:w-[4px]" style={{ backgroundColor: highlightColor }} />
                                <div className="flex items-center gap-2 mb-1.5">
                                    <Info style={{ color: highlightColor }} size={12} className="shrink-0" />
                                    <span className="text-[8px] font-extrabold uppercase tracking-[0.15em] text-zinc-400">Important Notes</span>
                                </div>
                                <p className="text-[10px] font-semibold text-zinc-300 leading-normal">
                                    {item.importantNotes}
                                </p>
                            </div>
                        )}

                        {isCampaign && (
                            <div className="space-y-2 pt-2">
                                <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-500">Requirements</h4>
                                <div className="p-4 rounded-xl bg-white/[0.01] border border-white/5 flex items-center justify-between group/metric hover:bg-white/[0.03] transition-all duration-300">
                                    <div>
                                        <p className="text-[8px] font-bold text-neon-green uppercase tracking-[0.15em] mb-0.5 opacity-80">MINIMUM FOLLOWERS</p>
                                        <p className="text-2xl font-black tracking-tight text-white">{Number(item.minInstagramFollowers || 0).toLocaleString()}+</p>
                                    </div>
                                    <Users size={24} className="text-white/10 group-hover/metric:text-neon-green group-hover/metric:scale-105 transition-all duration-300" />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="relative z-10 pt-4 mt-auto flex items-center justify-between border-t border-white/5">
                        <div className="flex items-center gap-2">
                            <Star size={10} className="text-neon-green" />
                            <span className="text-[8px] font-extrabold text-zinc-600 uppercase tracking-[0.3em]">NEWBI ENTERTAINMENT</span>
                        </div>
                        <div className="flex gap-1">
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
