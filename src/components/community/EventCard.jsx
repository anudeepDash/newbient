import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, MapPin, ArrowRight, Share2, Play } from 'lucide-react';
import { cn } from '../../lib/utils';

const EventCard = ({ item, onAction, handleShare }) => {
    const highlightColor = item.highlightColor || "#2ebfff";
    
    const formatDate = (dateValue) => {
        if (!dateValue) return 'TBD';
        const d = new Date(dateValue);
        if (isNaN(d.getTime())) return String(dateValue).toUpperCase();
        return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).toUpperCase();
    };

    const isVideoBg = item.videoUrl && item.enableVideoBackground && (item.videoUrl.match(/\.(mp4|webm|ogg)$/i) || item.videoUrl.includes('cloudinary.com'));

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="group relative w-full aspect-[4/5] rounded-[3rem] overflow-hidden bg-black border border-white/5 shadow-2xl cursor-pointer"
            onClick={onAction}
        >
            {/* Background Visual */}
            <div className="absolute inset-0 z-0 overflow-hidden">
                {isVideoBg ? (
                    <video 
                        src={item.videoUrl}
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-all duration-1000 scale-105 group-hover:scale-110"
                    />
                ) : (
                    <div 
                        className="w-full h-full bg-cover bg-center opacity-60 group-hover:opacity-100 transition-all duration-1000 scale-105 group-hover:scale-110"
                        style={{ backgroundImage: `url(${item.image})` }}
                    />
                )}
                {/* Advanced Overlay Gradients */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-90" />
                <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-transparent opacity-60" />
            </div>

            {/* Corner Badges */}
            <div className="absolute top-8 left-8 right-8 z-10 flex justify-between items-start">
                <div className="flex gap-2">
                    <div className="px-4 py-2 rounded-2xl bg-black/40 backdrop-blur-3xl border border-white/10 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: highlightColor }} />
                        <span className="text-[9px] font-black uppercase tracking-widest text-white/90">EVENT</span>
                    </div>
                    {item.performanceType && (
                        <div className="px-4 py-2 rounded-2xl bg-black/40 backdrop-blur-3xl border border-white/10 flex items-center">
                            <span className="text-[9px] font-black uppercase tracking-widest text-white/50">{item.performanceType}</span>
                        </div>
                    )}
                </div>
                
                <button 
                    onClick={(e) => { e.stopPropagation(); handleShare?.(); }}
                    className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all backdrop-blur-3xl"
                >
                    <Share2 size={16} />
                </button>
            </div>

            {/* Content Bottom Overlay */}
            <div className="absolute inset-x-0 bottom-0 z-10 p-8 pt-20 bg-gradient-to-t from-black via-black/80 to-transparent">
                <div className="space-y-4">
                    {/* Artists List */}
                    {item.artists && item.artists.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {item.artists.slice(0, 2).map((artist, idx) => (
                                <span key={idx} className="text-[9px] font-black uppercase tracking-widest text-neon-blue/80 px-2 py-0.5 rounded bg-neon-blue/5 border border-neon-blue/20">
                                    {artist}
                                </span>
                            ))}
                            {item.artists.length > 2 && (
                                <span className="text-[9px] font-black uppercase tracking-widest text-white/20">+{item.artists.length - 2} MORE</span>
                            )}
                        </div>
                    )}

                    <h3 className="text-3xl md:text-4xl font-black font-heading tracking-tighter uppercase italic text-white leading-none group-hover:translate-x-1 transition-transform duration-500">
                        {item.title}
                    </h3>

                    {/* Metadata Row */}
                    <div className="flex items-center gap-6 text-white/40">
                        <div className="flex items-center gap-2">
                            <Calendar size={12} className="text-neon-pink" />
                            <span className="text-[10px] font-black uppercase tracking-widest">{formatDate(item.date)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <MapPin size={12} className="text-neon-blue" />
                            <span className="text-[10px] font-black uppercase tracking-widest truncate max-w-[120px]">{item.location || 'TBD'}</span>
                        </div>
                    </div>
                </div>

                {/* Sliding Action Button */}
                <div className="mt-8 overflow-hidden h-0 group-hover:h-16 transition-all duration-500 ease-out opacity-0 group-hover:opacity-100">
                    <button 
                        className="w-full h-16 rounded-[1.5rem] bg-white text-black font-black uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-3 active:scale-95 transition-all shadow-2xl"
                    >
                        {item.buttonText || "BOOK NOW"}
                        <ArrowRight size={16} />
                    </button>
                </div>
            </div>

            {/* Shimmer on Hover */}
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-tr from-white/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
        </motion.div>
    );
};

export default EventCard;
