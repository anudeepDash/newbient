import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Calendar, MapPin, Share2, ArrowRight, Sparkles, X, Info, FileText, ExternalLink, Zap, Users
} from 'lucide-react';
import { cn } from '../../lib/utils';

const CommunityCard = ({ item, type, handleShare, onAction }) => {
    const [isFlipped, setIsFlipped] = useState(false);
    const isGig = type === 'gig';
    const isForm = type === 'form';
    const isGL = type === 'gl' || type === 'gl_embed';
    const isCampaign = type === 'campaign';

    const hasExternalLink = (item.link && item.link.trim() !== '' && item.link !== '#') || (item.applyLink && item.applyLink.startsWith('http'));
    const isInternalGL = isGL && item.guestlistEnabled && !hasExternalLink;
    
    const buttonLabel = item.buttonText || (hasExternalLink ? "ACCESS NOW" : (isInternalGL ? "GET GUESTLIST" : (isGig ? "APPLY GIG" : (isCampaign ? "APPLY NOW" : "TAKE FORM"))));
    const showButton = hasExternalLink || isInternalGL || isGig || isForm || isCampaign;

    const themeColor = isForm ? "#FF4F8B" : (isGig ? "#39FF14" : (isCampaign ? "#2ebfff" : "#2ebfff"));
    const highlightColor = item.highlightColor || themeColor;

    const handleButtonClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (hasExternalLink) {
            window.open(item.link || item.applyLink, '_blank');
        } else if (isInternalGL || isGig || isForm || isCampaign) {
            onAction?.(item);
        }
    };

    const transform = item.imageTransform || { scale: 1, x: 0, y: 0 };
    
    // Safely handle artists array (fallback for legacy string data)
    const artistsList = Array.isArray(item.artists) 
        ? item.artists 
        : (typeof item.artists === 'string' && item.artists.trim() !== '' ? item.artists.split(',').map(a => a.trim()) : []);

    return (
        <div className="perspective-1000 w-full min-h-[240px] md:min-h-[220px] flex">
            <motion.div
                initial={false}
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{ duration: 0.8, type: "spring", stiffness: 100, damping: 20 }}
                className="relative w-full h-full preserve-3d cursor-default group/card flex-1 flex"
            >
                {/* Front Side: Artsy V5 Sidebar Design */}
                <div 
                    className={cn(
                        "backface-hidden relative bg-[#020202] border rounded-[2.5rem] md:rounded-[3rem] overflow-hidden flex-1 flex shadow-2xl transition-all duration-500",
                        isFlipped ? "pointer-events-none" : "pointer-events-auto"
                    )}
                    style={{ borderColor: `${highlightColor}20` }}
                >
                    {/* Background Poster layer */}
                    <div className="absolute inset-0 z-0 overflow-hidden">
                        {item.image ? (
                            <motion.div 
                                className="w-full h-full bg-cover bg-center opacity-40 mix-blend-screen blur-[1px]" 
                                initial={false}
                                animate={{ 
                                    scale: (transform.scale || 1.05),
                                    x: `${transform.x || 0}%`,
                                    y: `${transform.y || 0}%`
                                }}
                                whileHover={{ scale: (transform.scale || 1.05) * 1.15 }}
                                transition={{ duration: 1, ease: [0.23, 1, 0.32, 1] }}
                                style={{ 
                                    backgroundImage: `url(${item.image})`
                                }}
                            />
                        ) : (
                            <div className="w-full h-full bg-gradient-to-br from-zinc-900 to-black" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-tr from-black via-black/80 to-transparent" />
                    </div>

                    {/* Content Layer (Edge-to-Edge Frosted) */}
                    <div className="relative z-10 flex-1 flex flex-row bg-white/[0.01] backdrop-blur-[40px]">
                        {/* Background Tech Pattern */}
                        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
                             style={{ 
                                 backgroundImage: `linear-gradient(${highlightColor} 1px, transparent 1px), linear-gradient(90deg, ${highlightColor} 1px, transparent 1px)`,
                                 backgroundSize: '20px 20px' 
                             }} />

                        {/* Main Content Area */}
                        <div className="flex-1 p-5 md:p-8 flex flex-col justify-between">
                            {/* Header Module */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 backdrop-blur-md">
                                        <span 
                                            className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.4em]"
                                            style={{ color: highlightColor }}
                                        >
                                            {isGig ? "GIGS" : (isCampaign ? "CAMPAIGNS" : "ACCESS")}
                                        </span>
                                    </div>
                                    <div className={cn(
                                        "px-3 py-1.5 rounded-lg border text-[8px] font-black uppercase tracking-widest whitespace-nowrap",
                                        (item.status === 'Open' || item.activeLabel === 'Live' || item.status === 'Live') ? "bg-green-500/10 border-green-500/20 text-green-400" : 
                                        (item.status === 'Filling Fast' || item.activeLabel === 'Few Slots Remain' || item.status === 'Few Slots Remain') ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-500" : 
                                        "bg-red-500/10 border-red-500/20 text-red-400"
                                    )}>
                                        {(item.status || item.activeLabel || 'LIVE').toUpperCase()}
                                    </div>
                                </div>

                                {item.isPinned && (
                                    <div 
                                        className="px-3 py-1 rounded-md text-[8px] font-black uppercase tracking-widest bg-yellow-400/10 border border-yellow-400/20 text-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.15)]"
                                    >
                                        FEATURED
                                    </div>
                                )}
                            </div>

                            {/* Body: Title & Desc */}
                            <div className="space-y-4 py-4 pr-12">
                                <div className="space-y-1">
                                    <h2 className="text-3xl md:text-[2.75rem] font-black font-heading text-white tracking-tighter uppercase italic leading-[0.85] drop-shadow-[0_10px_30px_rgba(0,0,0,0.8)]">
                                        {item.title}
                                    </h2>
                                    <div className="h-0.5 w-12 rounded-full" style={{ backgroundColor: highlightColor }} />
                                </div>
                                <div className="relative">
                                    {/* Glass backdrop for the spec sheet */}
                                    <div className="absolute -inset-4 bg-white/[0.02] rounded-2xl blur-md -z-10" />
                                    <p className="text-[10px] md:text-[11px] font-bold text-gray-500 uppercase tracking-[0.15em] leading-[1.8] max-w-xl whitespace-pre-wrap">
                                        {item.description ? (
                                            item.description.split('\n').map((line, i) => {
                                                const parts = line.split(':');
                                                if (parts.length > 1) {
                                                    return (
                                                        <span key={i} className="block mb-1 last:mb-0">
                                                            <span className="text-white opacity-80" style={{ color: highlightColor }}>{parts[0]}:</span>
                                                            <span className="text-gray-400"> {parts.slice(1).join(':')}</span>
                                                        </span>
                                                    );
                                                }
                                                return <span key={i} className="block mb-1 last:mb-0 opacity-60 italic">{line}</span>;
                                            })
                                        ) : "The next frontier of lifestyle & entertainment."}
                                    </p>
                                </div>
                            </div>

                            {/* Artist Lineup (Only shows if present) */}
                            {artistsList.length > 0 ? (
                                <div className="space-y-4 mb-8">
                                    <div className="flex items-center gap-3">
                                        <div className="h-[1px] w-4 bg-white/20" />
                                        <span className="text-[8px] font-black text-white/30 uppercase tracking-[0.4em]">LINEUP //</span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {artistsList.map((artist, idx) => (
                                            <div key={idx} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-[9px] font-black text-white uppercase tracking-widest backdrop-blur-md hover:bg-white/10 transition-colors cursor-default">
                                                {artist}
                                            </div>
                                        ))}
                                        {artistsList.length > 3 && (
                                            <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-[9px] font-black text-white/30 uppercase tracking-widest backdrop-blur-md">
                                                + OTHERS
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="h-4" /> // Spacer for balanced centering
                            )}

                            {/* Footer Area */}
                            <div className="pt-4 border-t border-white/5 space-y-4 relative z-20 bg-[#020202]/80 backdrop-blur-sm -mx-8 px-8 pb-8 -mb-8 rounded-b-[3rem]">
                                <div className="flex flex-wrap items-center gap-8 text-white/50">
                                    <div className="flex items-center gap-2.5">
                                        <Calendar size={13} style={{ color: highlightColor }} />
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">
                                            {item.date?.split('T')[0] || 'PENDING'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2.5">
                                        <MapPin size={13} style={{ color: highlightColor }} />
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">
                                            {item.bottomText || item.targetCity || item.location || 'GLOBAL'}
                                        </span>
                                    </div>
                                    {isCampaign && (
                                        <div className="flex items-center gap-2.5">
                                            <Zap size={13} className="text-neon-green" />
                                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neon-green">
                                                {item.reward || 'TBD'}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {showButton && (
                                    <button 
                                        onClick={handleButtonClick}
                                        disabled={item.status === 'Closed'}
                                        className={cn(
                                            "h-12 w-full md:w-fit px-12 rounded-xl border font-black uppercase tracking-[0.3em] text-[10px] transition-all flex items-center justify-center gap-4 group/btn",
                                            item.status === 'Closed' 
                                                ? "bg-white/5 border-white/5 text-gray-600 cursor-not-allowed opacity-50" 
                                                : "bg-white/10 border-white/10 text-white hover:bg-white hover:text-black hover:scale-[1.02]"
                                        )}
                                        style={{ borderColor: item.status === 'Closed' ? 'transparent' : `${highlightColor}30` }}
                                    >
                                        {item.status === 'Closed' ? 'ENTRIES CLOSED' : buttonLabel}
                                        <ArrowRight size={14} className={cn("group-hover/btn:translate-x-1 transition-transform", item.status === 'Closed' && "hidden")} />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Right Interaction Sidebar */}
                        <div className="w-12 md:w-14 bg-black/60 border-l border-white/5 flex flex-col items-center py-4 md:py-6 relative group/sidebar overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/[0.03] to-transparent opacity-0 group-hover/sidebar:opacity-100 transition-opacity" />
                            
                            {/* Single Pulsing Status Dot */}
                            {/* Single Pulsing Status Dot */}
                            <div className="w-2.5 h-2.5 relative my-4">
                                <div className={cn(
                                    "w-full h-full rounded-full relative z-10",
                                    item.status === 'Open' ? "bg-neon-green shadow-[0_0_10px_#10b981]" : "bg-zinc-800"
                                )} />
                                {item.status === 'Open' && (
                                    <div className="absolute inset-0 bg-neon-green/40 rounded-full animate-ping scale-[2.5]" />
                                )}
                            </div>
                            
                            {/* Centered Details Pill Wrapper */}
                            <div className="flex-1 flex items-center justify-center w-full">
                                <button 
                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsFlipped(true); }}
                                    className="flex flex-col items-center gap-3 md:gap-4 py-4 md:py-5 px-3 md:px-4 rounded-3xl transition-all z-20 active:scale-95 group/pill relative border border-white/5 hover:border-white/20 bg-white/[0.03] shadow-2xl backdrop-blur-xl pointer-events-auto"
                                    style={{ borderColor: `${highlightColor}30` }}
                                >
                                    <span 
                                        className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.4em] [writing-mode:vertical-lr]"
                                        style={{ color: `${highlightColor}80` }}
                                    >
                                        DETAILS
                                    </span>
                                    <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" style={{ color: `${highlightColor}40` }} />
                                    
                                    {/* Aesthetic Glow */}
                                    <div 
                                        className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity" 
                                        style={{ backgroundColor: `${highlightColor}05` }}
                                    />
                                </button>
                            </div>

                            <button 
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleShare?.(type, item.id); }}
                                className="mt-auto w-10 h-10 flex items-center justify-center text-white/20 hover:text-white hover:scale-110 active:scale-90 transition-all z-30 relative cursor-pointer pointer-events-auto"
                            >
                                <Share2 size={18} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Back Side: Mission View */}
                <div 
                    className={cn(
                        "absolute inset-0 backface-hidden rotate-y-180 bg-[#050505] border rounded-[2.5rem] md:rounded-[3rem] p-6 md:p-10 flex flex-col shadow-2xl overflow-hidden",
                        isFlipped ? "pointer-events-auto" : "pointer-events-none"
                    )}
                    style={{ borderColor: `${highlightColor}30` }}
                >
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.03),transparent)] pointer-events-none" />
                    
                    <div className="flex items-center justify-between mb-8 relative z-20">
                        <div className="space-y-1">
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: highlightColor, boxShadow: `0 0 10px ${highlightColor}80` }} />
                                <span className="text-white/40 text-[9px] font-black uppercase tracking-[0.6em]">RECORDS // INFO</span>
                            </div>
                            <h3 className="text-2xl md:text-4xl font-black font-heading text-white tracking-tighter uppercase italic">{isCampaign ? "CAMPAIGN" : "EVENT"} BRIEF.</h3>
                        </div>
                        <button 
                            onClick={() => setIsFlipped(false)}
                            className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/30 hover:text-white transition-all hover:bg-white/10 backdrop-blur-xl group/close"
                        >
                            <X size={20} className="group-hover/close:rotate-90 transition-transform duration-300" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar relative z-20 pr-6 space-y-10">
                        {item.importantNotes && (
                            <div className="p-8 rounded-[2rem] bg-white/[0.03] border border-white/5 relative overflow-hidden backdrop-blur-2xl">
                                <div className="absolute top-0 left-0 w-1.5 h-full" style={{ backgroundColor: highlightColor }} />
                                <div className="flex items-center gap-3 mb-4">
                                    <Info style={{ color: highlightColor }} size={16} />
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.5em] text-white/80">IMPORTANT NOTES</h4>
                                </div>
                                <div className="text-[11px] md:text-[13px] font-bold text-gray-400 leading-relaxed uppercase tracking-[0.15em] italic">
                                    {item.importantNotes?.split('\n').map((line, i) => {
                                        const parts = line.split(':');
                                        if (parts.length > 1) {
                                            return (
                                                <span key={i} className="block mb-1">
                                                    <span style={{ color: highlightColor }}>{parts[0]}:</span>
                                                    <span className="text-gray-400 opacity-80"> {parts.slice(1).join(':')}</span>
                                                </span>
                                            );
                                        }
                                        return <span key={i} className="block mb-1">{line}</span>;
                                    })}
                                </div>
                            </div>
                        )}

                        <div className="space-y-6 pl-8 border-l-2 border-white/5">
                            <div className="flex items-center gap-4 text-white/30">
                                <FileText size={16} />
                                <h4 className="text-[10px] font-black uppercase tracking-[0.8em]">{isCampaign ? "CAMPAIGN BRIEF" : "EVENT BRIEF"}</h4>
                            </div>
                            <div className="text-sm md:text-base font-medium text-gray-400 leading-relaxed italic whitespace-pre-wrap">
                                {item.description ? (
                                    item.description.split('\n').map((line, i) => {
                                        const parts = line.split(':');
                                        if (parts.length > 1) {
                                            return (
                                                <span key={i} className="block mb-2">
                                                    <span style={{ color: highlightColor }} className="font-black text-[12px] md:text-[14px]">{parts[0]}:</span>
                                                    <span className="text-gray-400 opacity-80"> {parts.slice(1).join(':')}</span>
                                                </span>
                                            );
                                        }
                                        return <span key={i} className="block mb-2">{line}</span>;
                                    })
                                ) : (isCampaign ? "No campaign details provided." : "No event details provided.")}
                            </div>
                            
                            {isCampaign && (
                                <div className="pt-6 space-y-6">
                                    <div className="flex items-center gap-4 text-white/30">
                                        <Users size={16} />
                                        <h4 className="text-[10px] font-black uppercase tracking-[0.8em]">CREATOR REQUIREMENTS</h4>
                                    </div>
                                    <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                                        <p className="text-[10px] font-black text-neon-blue uppercase tracking-widest">Minimum Followers</p>
                                        <p className="text-2xl font-black italic">{Number(item.minInstagramFollowers || 0).toLocaleString()}+</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="pt-8 mt-auto flex items-center justify-end gap-3 opacity-30 relative z-20">
                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                        <div className="w-1.5 h-1.5 rounded-full bg-white opacity-50" />
                        <div className="w-1.5 h-1.5 rounded-full bg-white opacity-20" />
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default CommunityCard;
