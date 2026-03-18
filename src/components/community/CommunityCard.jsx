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
                {/* Front Side - Premium Ticket */}
                <div className={cn(
                    "backface-hidden relative bg-zinc-900/40 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] overflow-hidden flex flex-col group transition-all duration-500 h-full",
                    isForm ? "hover:border-neon-pink/40" : (isGig ? "hover:border-neon-green/40" : "hover:border-neon-blue/40")
                )}>
                    {/* Visual Perforations */}
                    <div className="absolute top-1/2 -left-3 w-6 h-6 bg-black rounded-full border border-white/5 z-20" />
                    <div className="absolute top-1/2 -right-3 w-6 h-6 bg-black rounded-full border border-white/5 z-20" />
                    
                    <div className="flex h-full min-h-[260px]">
                        <div className="flex-1 p-8 flex flex-col relative overflow-hidden">
                            <div className="flex items-center justify-between mb-6">
                                <div className={cn(
                                    "p-3 rounded-2xl bg-white/5 border border-white/10 shadow-lg group-hover:scale-110 transition-all duration-500",
                                    isForm ? "text-neon-pink" : (isGig ? "text-neon-green" : "text-neon-blue")
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
                                            "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border",
                                            item.status === 'Open' ? "bg-neon-green/10 text-neon-green border-neon-green/20" : "bg-red-500/10 text-red-500 border-red-500/20"
                                        )}>
                                            {item.status || 'Active'}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="flex-1 flex flex-col">
                                <h3 className="text-2xl font-black font-heading leading-tight mb-3 text-white group-hover:translate-x-1 transition-transform">
                                    {item.title}
                                </h3>
                                <p className="text-gray-500 text-sm font-medium line-clamp-2 mb-6">
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
                                "w-16 md:w-20 flex flex-col justify-center items-center gap-6 border-l border-dashed border-white/10 transition-colors hover:bg-white/5 cursor-pointer z-20 focus:outline-none",
                                isForm ? "bg-neon-pink/5" : (isGig ? "bg-neon-green/5" : "bg-neon-blue/5")
                            )}
                        >
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] whitespace-nowrap rotate-90 text-gray-400 group-hover:text-white transition-colors mb-4">Details</span>
                            <div className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center text-gray-400 group-hover:text-white group-hover:border-white/50 group-hover:scale-110 transition-all shadow-xl">
                                <ArrowRight size={14} />
                            </div>
                        </button>
                    </div>
                </div>

                {/* Back Side - Info Docket */}
                <div className={cn(
                    "absolute inset-0 backface-hidden rotate-y-180 bg-zinc-900 border border-white/10 rounded-[2.5rem] p-10 flex flex-col overflow-hidden shadow-2xl",
                    isForm ? "border-neon-pink/30" : (isGig ? "border-neon-green/30" : "border-neon-blue/30")
                )}>
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-2xl font-black font-heading text-white">The Breakdown</h3>
                        <button
                            onClick={() => setIsFlipped(false)}
                            className="p-3 bg-white/5 rounded-full text-gray-400 hover:text-white transition-all"
                        >
                            <ArrowRight className="rotate-180" size={20} />
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        <p className="text-gray-400 text-base leading-relaxed font-medium">
                            {item.description || (Array.isArray(item.roles) ? item.roles.join(', ') : item.roles)}
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default CommunityCard;
