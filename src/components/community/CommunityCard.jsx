import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
    Calendar, Users, ClipboardList, Share2, ArrowRight, ExternalLink, Sparkles, MapPin 
} from 'lucide-react';
import { cn } from '../../lib/utils';

const CommunityCard = ({ item, type, handleShare }) => {
    const [isFlipped, setIsFlipped] = useState(false);
    const isGig = type === 'gig';
    const isForm = type === 'form';
    const isGL = type === 'gl';

    const isWhatsApp = isGig && item.applyType === 'whatsapp';
    const href = isForm
        ? `/forms/${item.id}`
        : (isGig
            ? (isWhatsApp
                ? `https://wa.me/${item.applyLink?.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hi, I'm interested in the ${item.title} volunteer gig!`)}`
                : item.applyLink)
            : item.link || '#');

    const Icon = isForm ? ClipboardList : (isGig ? Users : Calendar);
    
    return (
        <div id={`${type}-${item.id}`} className="perspective-1000 w-full min-h-[260px]">
            <motion.div
                initial={false}
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{ duration: 0.8, type: "spring", stiffness: 100, damping: 20 }}
                className="relative w-full h-full preserve-3d cursor-default"
            >
                {/* Front Side - Glassmorphism Card */}
                <div className={cn(
                    "backface-hidden relative bg-zinc-900/40 backdrop-blur-[20px] border border-white/10 rounded-[2rem] overflow-hidden flex flex-col group transition-all duration-500 h-full shadow-2xl hover:shadow-[0_0_40px_rgba(255,255,255,0.05)]",
                    isForm ? "hover:border-neon-pink/40 hover:shadow-neon-pink/10" : (isGig ? "hover:border-neon-green/40 hover:shadow-neon-green/10" : "hover:border-neon-blue/40 hover:shadow-neon-blue/10")
                )}>
                    {/* Ambient Glows */}
                    <div className={cn(
                        "absolute -top-20 -right-20 w-40 h-40 blur-[80px] pointer-events-none opacity-20 transition-opacity duration-700 group-hover:opacity-40",
                        isForm ? "bg-neon-pink" : (isGig ? "bg-neon-green" : "bg-neon-blue")
                    )} />
                    
                    <div className="flex h-full min-h-[260px]">
                        <div className="flex-1 p-8 flex flex-col relative overflow-hidden">
                            <div className="flex items-center justify-between mb-6">
                                <div className={cn(
                                    "p-3 rounded-2xl bg-white/5 border border-white/10 shadow-lg group-hover:scale-110 transition-all duration-500",
                                    isForm ? "text-neon-pink border-neon-pink/20" : (isGig ? "text-neon-green border-neon-green/20" : "text-neon-blue border-neon-blue/20")
                                )}>
                                    <Icon size={24} />
                                </div>
                                <div className="flex items-center gap-3">
                                    <button 
                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleShare(type, item.id); }}
                                        className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all z-30"
                                        title="Share"
                                    >
                                        <Share2 size={14} />
                                    </button>
                                    {!isForm && (
                                        <span className={cn(
                                            "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border backdrop-blur-md",
                                            item.status === 'Open' ? "bg-neon-green/10 text-neon-green border-neon-green/20" : "bg-red-500/10 text-red-500 border-red-500/20"
                                        )}>
                                            {item.status || 'Active'}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="flex-1 flex flex-col">
                                <h3 className="text-2xl font-black font-heading leading-tight mb-3 text-white group-hover:translate-x-1 transition-transform uppercase">
                                    {item.title}
                                </h3>
                                <p className="text-gray-500 text-sm font-medium line-clamp-2 mb-6 whitespace-pre-wrap">
                                    {item.description || (Array.isArray(item.roles) ? item.roles.join(', ') : item.roles)}
                                </p>
                                
                                <div className="mt-auto flex flex-col gap-4 pt-4 border-t border-white/5">
                                    <div className="flex flex-wrap items-center gap-4">
                                        {!isForm && (
                                            <div className="flex items-center gap-2 text-[10px] font-black text-white/40 uppercase tracking-widest">
                                                <Calendar size={12} className={isGig ? "text-neon-green" : "text-neon-blue"} />
                                                <span>{item.date || (item.dates && item.dates[0] ? item.dates[0] : 'Upcoming')}</span>
                                            </div>
                                        )}
                                        {isGig && item.location && (
                                            <div className="flex items-center gap-2 text-[10px] font-black text-white/40 uppercase tracking-widest">
                                                <MapPin size={12} className="text-neon-green" />
                                                <span>{item.location}</span>
                                            </div>
                                        )}
                                        {isForm && (
                                            <div className="flex items-center gap-2 text-[10px] font-black text-neon-pink uppercase tracking-widest">
                                                <Sparkles size={12} />
                                                <span>{item.activeLabel || 'Community Access'}</span>
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div className="flex flex-wrap gap-3 z-30">
                                        {isGig && item.status !== 'Closed' && item.applyType === 'whatsapp' && (
                                            <a href={`https://wa.me/${item.applyLink?.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hi, I'm interested in the ${item.title} volunteer gig!`)}`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="px-4 py-2 bg-green-500/10 border border-green-500/20 text-green-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-green-500/20 transition-colors flex items-center gap-2">
                                                WhatsApp DM <ExternalLink size={12} />
                                            </a>
                                        )}
                                        {isGig && item.status !== 'Closed' && item.whatsappLink && (
                                            <a href={item.whatsappLink} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="px-4 py-2 bg-white/5 border border-white/10 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-colors flex items-center gap-2">
                                                Join Group <Users size={12} />
                                            </a>
                                        )}
                                        {isGig && item.status !== 'Closed' && item.applyType === 'link' && item.applyLink && (
                                            <a href={item.applyLink} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="px-4 py-2 bg-neon-green/10 border border-neon-green/20 text-neon-green rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-neon-green/20 transition-colors flex items-center gap-2">
                                                Apply Now <ExternalLink size={12} />
                                            </a>
                                        )}
                                        {isForm && (
                                            <Link to={href} onClick={(e) => e.stopPropagation()} className="px-4 py-2 bg-neon-pink/10 border border-neon-pink/20 text-neon-pink rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-neon-pink/20 transition-colors flex items-center gap-2">
                                                Participate <ArrowRight size={12} />
                                            </Link>
                                        )}
                                        {!isGig && !isForm && (
                                            <Link to={href} onClick={(e) => e.stopPropagation()} className="px-4 py-2 bg-neon-blue/10 border border-neon-blue/20 text-neon-blue rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-neon-blue/20 transition-colors flex items-center gap-2">
                                                Access Now <ArrowRight size={12} />
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Action Tab */}
                        <button
                            onClick={() => setIsFlipped(true)}
                            className={cn(
                                "w-16 md:w-20 flex flex-col justify-center items-center gap-6 border-l border-white/5 transition-colors hover:bg-white/5 cursor-pointer z-20 focus:outline-none backdrop-blur-xl",
                                isForm ? "bg-neon-pink/5" : (isGig ? "bg-neon-green/5" : "bg-neon-blue/5")
                            )}
                        >
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] whitespace-nowrap rotate-90 text-gray-400 group-hover:text-white transition-colors mb-4">Details</span>
                            <div className={cn(
                                "w-8 h-8 rounded-full border border-white/20 flex items-center justify-center text-gray-400 group-hover:text-white group-hover:border-white/50 group-hover:scale-110 transition-all shadow-xl",
                                isForm ? "group-hover:bg-neon-pink/20" : (isGig ? "group-hover:bg-neon-green/20" : "group-hover:bg-neon-blue/20")
                            )}>
                                <ArrowRight size={14} />
                            </div>
                        </button>
                    </div>
                </div>

                {/* Back Side - Info Docket */}
                <div className={cn(
                    "absolute inset-0 backface-hidden rotate-y-180 bg-zinc-950/60 border border-white/10 rounded-[2rem] p-8 md:p-10 flex flex-col overflow-hidden shadow-2xl backdrop-blur-3xl",
                    isForm ? "border-neon-pink/30 shadow-neon-pink/5" : (isGig ? "border-neon-green/30 shadow-neon-green/5" : "border-neon-blue/30 shadow-neon-blue/5")
                )}>
                    {/* Background Decorative Icon */}
                    <div className={cn(
                        "absolute -right-12 -bottom-12 opacity-[0.05] rotate-12 pointer-events-none transition-transform duration-1000 group-hover:scale-110",
                        isForm ? "text-neon-pink" : (isGig ? "text-neon-green" : "text-neon-blue")
                    )}>
                        <Icon size={240} />
                    </div>

                    <div className="flex items-center justify-between mb-8 relative z-10">
                        <div className="flex flex-col">
                            <span className={cn(
                                "text-[10px] font-black uppercase tracking-[0.3em] mb-1",
                                isForm ? "text-neon-pink" : (isGig ? "text-neon-green" : "text-neon-blue")
                            )}>Information</span>
                            <h3 className="text-xl font-black font-heading text-white tracking-tight uppercase">Details & Ops</h3>
                        </div>
                        <button
                            onClick={() => setIsFlipped(false)}
                            className="p-3 bg-white/5 rounded-full text-gray-400 hover:text-white transition-all border border-white/10 hover:bg-white/10"
                        >
                            <ArrowRight className="rotate-180" size={18} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10 pr-2">
                        <p className="text-gray-400 text-sm md:text-base leading-relaxed font-medium whitespace-pre-wrap">
                            {item.description || (Array.isArray(item.roles) ? item.roles.join(', ') : item.roles)}
                        </p>
                    </div>

                    <div className="mt-8 pt-6 border-t border-white/5 relative z-10 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", isForm ? "bg-neon-pink" : (isGig ? "bg-neon-green" : "bg-neon-blue"))} />
                            <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest leading-none">Verified Channel</span>
                        </div>
                        <Sparkles size={14} className="text-white/10" />
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default CommunityCard;
