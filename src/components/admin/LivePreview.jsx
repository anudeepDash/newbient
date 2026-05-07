import React from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Pin, Calendar, MapPin, Users, Share2, ArrowRight, ClipboardList, Sparkles, Ticket, Clock, Image as ImageIcon, Play, Megaphone } from 'lucide-react';
import { cn } from '../../lib/utils';
import CommunityCard from '../community/CommunityCard';
import CampaignCard from '../ui/CampaignCard';

const formatDate = (dateValue) => {
    if (!dateValue || dateValue === 'TBD') return 'TBD';
    
    // Handle array of dates
    if (Array.isArray(dateValue)) {
        if (dateValue.length === 0) return 'TBD';
        const sorted = [...dateValue]
            .map(d => new Date(d))
            .filter(d => !isNaN(d.getTime()))
            .sort((a, b) => a.getTime() - b.getTime());
            
        if (sorted.length === 0) return 'TBD';
        const first = sorted[0];
        return first.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).toUpperCase() + (sorted.length > 1 ? ` +${sorted.length - 1}` : '');
    }

    // Handle timestamps
    let val = dateValue;
    if (val.seconds) val = new Date(val.seconds * 1000).toISOString();

    if (typeof val === 'string' && val.includes('T')) {
        try {
            const d = new Date(val);
            if (!isNaN(d.getTime())) {
                const datePart = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
                const timePart = d.toLocaleTimeString('en-US', { hour: '2-digit', minute:'2-digit', hour12: true });
                return `${datePart} • ${timePart}`;
            }
        } catch (e) {}
    }
    
    // Fallback split logic
    try {
        const strVal = String(val);
        if (strVal.includes('-')) {
            const [y, m, d] = strVal.split('-');
            const day = d ? d.split('T')[0] : '';
            return `${day}-${m}-${y}`;
        }
    } catch (e) {}
    
    return String(val).toUpperCase();
};

const LivePreview = ({ type, data, categories = [], hideDecorations = false }) => {
    return (
        <div className="h-full flex flex-col">
            {!hideDecorations && (
                <div className="flex items-center justify-between mb-8 px-2">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <div className={cn("w-2 h-2 rounded-full animate-pulse", type === 'portfolio' ? "bg-neon-green" : "bg-neon-pink")} />
                            <div className={cn("w-1.5 h-1.5 rounded-full animate-ping absolute", type === 'portfolio' ? "bg-neon-green/40" : "bg-neon-pink/40")} />
                        </div>
                        <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40 font-heading italic">Live Preview</h3>
                    </div>
                    <div className="px-5 py-2 rounded-full bg-white/5 border border-white/10 text-white text-[9px] font-black uppercase tracking-[0.3em] backdrop-blur-3xl flex items-center justify-center shadow-xl">
                        <span className={cn(
                            type === 'portfolio' ? "text-neon-green" : (type === 'event' ? "text-neon-pink" : "text-neon-blue")
                        )}>
                            {type === 'gl' ? 'GUESTLIST' : type.toUpperCase()}
                        </span> 
                        <span className="ml-2 opacity-40">VIEW</span>
                    </div>
                </div>
            )}
            <div className={cn(
                "w-full transition-all mx-auto overflow-hidden",
                hideDecorations ? "p-0 rounded-none bg-transparent border-none shadow-none" : cn(
                    "p-8 rounded-[3.5rem] border border-white/5 bg-zinc-900/20 backdrop-blur-3xl shadow-2xl relative flex flex-col items-center justify-center",
                    type === 'event' || type === 'portfolio' ? "aspect-[4/5]" : "aspect-[3/2]"
                )
            )}>
                <div className="w-full h-full flex flex-col items-center justify-center">
                    {/* ANNOUNCEMENT PREVIEW */}
                    {type === 'announcement' && (
                        <div className="w-full max-w-sm mx-auto group">
                            <div className="relative overflow-hidden rounded-[2.5rem] bg-zinc-950 border border-white/5 shadow-2xl transition-all duration-500 hover:border-white/20">
                                {/* Ambient Glow */}
                                <div className="absolute -inset-24 bg-gradient-to-br from-neon-pink/10 via-transparent to-neon-blue/10 blur-[100px] opacity-50 group-hover:opacity-100 transition-opacity" />
                                
                                {/* Image Support */}
                                {data.image && (
                                    <div className="h-48 w-full overflow-hidden relative border-b border-white/5">
                                        <div 
                                            className="absolute inset-0 bg-cover transition-transform duration-700 group-hover:scale-110" 
                                            style={{ 
                                                backgroundImage: `url(${data.image})`,
                                                transform: `scale(${data.imageTransform?.scale || 1})`,
                                                backgroundPosition: `calc(50% + ${(data.imageTransform?.x || 0)}%) calc(50% + ${(data.imageTransform?.y || 0)}%)`
                                            }}
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />
                                    </div>
                                )}

                                <div className="p-8 relative z-10">
                                    {/* Header Meta */}
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="flex items-center gap-3">
                                            <div className="px-3 py-1 rounded-full bg-neon-pink/10 border border-neon-pink/20">
                                                <span className="text-[8px] font-black uppercase tracking-[0.2em] text-neon-pink">
                                                    {data.category || 'BROADCAST'}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-widest text-white/30">
                                                <Clock size={10} />
                                                <span>{data.date || new Date().toISOString().split('T')[0]}</span>
                                            </div>
                                        </div>
                                        {data.isPinned && (
                                            <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-neon-pink shadow-[0_0_15px_rgba(255,46,144,0.2)]">
                                                <Pin size={14} className="fill-current" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Content */}
                                    <div className="space-y-4">
                                        {data.tagline && (
                                            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40 italic">
                                                {data.tagline}
                                            </p>
                                        )}
                                        <h3 className="text-2xl font-black font-heading tracking-tighter uppercase italic text-white leading-none group-hover:text-neon-pink transition-colors">
                                            {data.title || 'UNTITLED SIGNAL'}
                                        </h3>
                                        <div className="h-0.5 w-10 bg-neon-pink/30 rounded-full group-hover:w-20 transition-all" />
                                        <p className="text-sm font-medium text-gray-400 line-clamp-4 leading-relaxed italic">
                                            {data.content || 'Awaiting transmission data... The broadcast content will materialize here in high-fidelity.'}
                                        </p>
                                    </div>

                                    {/* Action */}
                                    <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
                                        <div className="flex items-center gap-3 text-neon-pink group/btn">
                                            <span className="text-[10px] font-black uppercase tracking-[0.3em]">{data.buttonText || 'READ MORE'}</span>
                                            <ArrowRight size={14} className="group-hover/btn:translate-x-2 transition-transform" />
                                        </div>
                                        <div className="flex gap-1">
                                            <div className="w-1 h-1 rounded-full bg-neon-pink" />
                                            <div className="w-1 h-1 rounded-full bg-white/20" />
                                            <div className="w-1 h-1 rounded-full bg-white/10" />
                                        </div>
                                    </div>
                                </div>

                                {/* Scanlines effect */}
                                <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]" />
                            </div>
                        </div>
                    )}


                    {/* EVENT PREVIEW */}
                    {type === 'event' && (
                        <div className="relative bg-zinc-950 border border-white/10 rounded-[3rem] overflow-hidden aspect-[4/5] transition-all duration-500 hover:border-white/20 group shadow-[0_30px_100px_rgba(0,0,0,0.5)] w-full max-w-[380px] mx-auto">
                            {/* Background elements */}
                            <div className="absolute inset-0 z-0 overflow-hidden bg-black">
                                {data.image ? (
                                    <img
                                        src={data.image}
                                        alt=""
                                        crossOrigin="anonymous"
                                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105 opacity-50 group-hover:opacity-70"
                                        style={{ 
                                            transform: `scale(${data.imageTransform?.scale || 1})`,
                                            objectPosition: `${50 + (data.imageTransform?.x || 0)}% ${50 + (data.imageTransform?.y || 0)}%`,
                                            transformOrigin: 'center'
                                        }}
                                    />
                                ) : (
                                    <div className="absolute inset-0 flex items-center justify-center text-gray-800 font-black uppercase tracking-[0.3em] text-[10px]">
                                        SIGNAL_BUFFERING
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent z-10" />
                                <div 
                                    className="absolute inset-0 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none"
                                    style={{ background: `radial-gradient(circle at bottom right, ${(data.highlightColor || '#2ebfff')}11 0%, transparent 60%)` }}
                                />
                            </div>
                            
                            {/* Top Badges */}
                            <div className="absolute top-8 left-8 right-8 z-30 flex justify-between items-start">
                                <div className="flex flex-col gap-2 text-left">
                                    <div className="px-4 py-2 rounded-2xl bg-black/40 backdrop-blur-3xl border border-white/5 flex items-center gap-2">
                                        <div 
                                            className="w-1 h-1 rounded-full animate-pulse" 
                                            style={{ backgroundColor: data.highlightColor || '#2ebfff', boxShadow: `0 0 10px ${data.highlightColor || '#2ebfff'}` }}
                                        />
                                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/80">
                                            {formatDate(data.dates || data.date)}
                                        </span>
                                    </div>
                                    {data.performanceType && (
                                        <span className="text-[7px] font-black uppercase tracking-[0.3em] text-white/30 pl-1">
                                            {data.performanceType}
                                        </span>
                                    )}
                                </div>

                                {data.isTicketed && (
                                    <div className="w-10 h-10 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white/40 group-hover:text-neon-green group-hover:border-neon-green/30 transition-all">
                                        <Ticket size={18} />
                                    </div>
                                )}
                            </div>

                            {/* Content Body */}
                            <div className="absolute inset-x-8 bottom-8 z-20 text-left">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        {data.artists && data.artists.length > 0 && (
                                            <div className="flex flex-wrap gap-2 items-center opacity-60 group-hover:opacity-100 transition-opacity duration-500 min-h-[12px]">
                                                {showAllArtists ? (
                                                    <div className="flex flex-wrap gap-2 items-center">
                                                        {data.artists.map((artist, i) => (
                                                            <span key={i} className="text-[8px] font-black text-white uppercase tracking-widest">{artist}{i < data.artists.length - 1 ? ' •' : ''}</span>
                                                        ))}
                                                        <button 
                                                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowAllArtists(false); }}
                                                            className="text-[8px] font-black text-neon-blue uppercase tracking-widest ml-1 hover:underline"
                                                        >
                                                            LESS
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <>
                                                        {data.artists.slice(0, 2).map((artist, i) => (
                                                            <span key={i} className="text-[8px] font-black text-white uppercase tracking-widest">{artist}{i < 1 && data.artists.length > 1 ? ' •' : ''}</span>
                                                        ))}
                                                        {data.artists.length > 2 && (
                                                            <button 
                                                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowAllArtists(true); }}
                                                                className="text-[8px] font-black text-white/40 uppercase tracking-widest hover:text-white transition-colors"
                                                            >
                                                                + {data.artists.length - 2} MORE
                                                            </button>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        )}
                                        <h3 className="text-2xl md:text-3xl font-black font-heading text-white leading-[1.1] tracking-tighter uppercase italic group-hover:text-neon-blue transition-all duration-500">
                                            {data.title || 'UNTITLED PROTOCOL'}
                                        </h3>
                                    </div>
                                    
                                    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-2">
                                        <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-[0.2em] text-white/40">
                                            <MapPin size={10} className="group-hover:text-white transition-colors" />
                                            <span>{data.location || 'TBA'}</span>
                                        </div>
                                        {data.doorsOpen && (
                                            <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-[0.2em] text-white/20">
                                                <Clock size={10} />
                                                <span>{data.doorsOpen}</span>
                                            </div>
                                        )}
                                        {data.ageLimit && (
                                            <span className="text-[8px] font-black uppercase tracking-[0.2em] text-white/10 px-1.5 py-0.5 rounded border border-white/5">{data.ageLimit}</span>
                                        )}
                                    </div>

                                    <div className="pt-6 mt-2 border-t border-white/5 flex items-center justify-between">
                                        <div className="flex flex-col gap-1.5">
                                            <div 
                                                className="font-black tracking-[0.3em] flex items-center gap-3 group-hover:gap-5 transition-all uppercase text-[9px]"
                                                style={{ 
                                                    color: data.isTicketed ? '#2eff90' : (data.isGuestlistEnabled ? '#ff2ebf' : (data.highlightColor || '#2ebfff')) 
                                                }}
                                            >
                                                {data.buttonText || (data.isTicketed ? "GET TICKETS" : (data.isGuestlistEnabled ? "RSVP NOW" : "VIEW DETAILS"))}
                                                <ArrowRight size={14} className="opacity-40 group-hover:opacity-100" />
                                            </div>
                                        </div>
                                        
                                        <button className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-white/20 hover:text-white hover:bg-white/10 transition-all backdrop-blur-xl">
                                            <Share2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* PORTFOLIO PREVIEW */}
                    {type === 'portfolio' && (
                        <div className="relative bg-zinc-950 border border-white/5 rounded-[2.5rem] overflow-hidden aspect-[4/5] transition-all duration-700 group shadow-[0_30px_100px_rgba(0,0,0,0.5)] w-full max-w-[380px] mx-auto">
                            {/* Glow Halo */}
                            <div className="absolute -inset-px rounded-[2.5rem] bg-gradient-to-br from-neon-green/10 to-neon-blue/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none blur-xl" />

                            {/* Background elements */}
                            <div className="absolute inset-0 z-0 overflow-hidden bg-black">
                                {data.image ? (
                                    <img
                                        src={data.image}
                                        alt=""
                                        crossOrigin="anonymous"
                                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110 opacity-60 group-hover:opacity-100"
                                        style={{ 
                                            transform: `scale(${data.imageTransform?.scale || 1})`,
                                            objectPosition: `${50 + (data.imageTransform?.x || 0)}% ${50 + (data.imageTransform?.y || 0)}%`,
                                            transformOrigin: 'center',
                                        }}
                                    />
                                ) : (
                                    <div className="absolute inset-0 flex items-center justify-center text-gray-800 font-black uppercase tracking-[0.3em] text-[9px]">
                                        PORTFOLIO_READY
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/10 z-10" />
                                <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-black/10 z-10" />
                                <div 
                                    className="absolute inset-0 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none"
                                    style={{ background: 'radial-gradient(ellipse at bottom left, rgba(46,255,144,0.08) 0%, transparent 65%)' }}
                                />
                            </div>
                            
                            {/* Top Badges */}
                            <div className="absolute top-6 left-6 right-6 z-30 flex justify-between items-start">
                                <div className="px-4 py-2 rounded-2xl bg-black/40 backdrop-blur-2xl border border-white/10 group-hover:border-neon-green/20 transition-colors duration-500">
                                    <span className="text-[9px] font-black uppercase tracking-[0.3em] text-neon-green">
                                        {data.sector || categories.find(c => c.id === data.category)?.label || 'SECTOR'}
                                    </span>
                                </div>

                                <div className="px-3 py-1.5 rounded-xl bg-white/5 backdrop-blur-2xl border border-white/10 flex items-center gap-1.5">
                                    <Clock size={10} className="text-white/40" />
                                    <span className="text-[9px] font-black uppercase tracking-widest text-white/50">{data.year || new Date().getFullYear()}</span>
                                </div>
                            </div>

                            {/* Ticket Perforation Line */}
                            <div className="absolute top-[62%] -left-3 w-6 h-6 bg-[#020202] rounded-full border border-white/5 z-20" />
                            <div className="absolute top-[62%] -right-3 w-6 h-6 bg-[#020202] rounded-full border border-white/5 z-20" />
                            <div className="absolute top-[63%] left-4 right-4 h-px border-t border-dashed border-white/10 z-20" />

                            {/* Content Body */}
                            <div className="absolute inset-x-6 bottom-7 z-30 space-y-5 w-full pr-12">
                                <div>
                                    <h3 className="text-2xl md:text-3xl font-black font-heading text-white leading-none tracking-tighter uppercase italic mb-2 group-hover:text-neon-green transition-all duration-500 line-clamp-2">
                                        {data.title || 'UNTITLED RECORD'}
                                    </h3>
                                    <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.25em]">
                                        {data.date ? new Date(data.date).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : 'PROJECT TIMELINE'}
                                    </p>
                                </div>

                                <div className="pt-5 border-t border-white/5 flex items-center justify-between">
                                    {data.highlightUrl ? (
                                        <div className="flex items-center gap-3">
                                            <span className="w-8 h-8 rounded-xl bg-neon-green/90 text-black flex items-center justify-center shadow-[0_0_20px_rgba(46,255,144,0.3)]">
                                                <Play size={14} fill="black" />
                                            </span>
                                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70">
                                                View Reel
                                            </span>
                                            <ArrowRight size={14} className="text-white/30" />
                                        </div>
                                    ) : (
                                        <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] flex items-center gap-2">
                                            <span className="w-4 h-px bg-white/20" />
                                            Archived Record
                                        </span>
                                    )}

                                    {/* Index dot cluster */}
                                    <div className="flex items-center gap-1 opacity-40">
                                        <span className="w-1.5 h-1.5 rounded-full bg-neon-green" />
                                        <span className="w-1 h-1 rounded-full bg-white/40" />
                                        <span className="w-1 h-1 rounded-full bg-white/40" />
                                    </div>
                                </div>
                            </div>

                            {/* Shimmer overlay */}
                            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none z-20"
                                style={{ background: 'linear-gradient(135deg, rgba(46,255,144,0.03) 0%, transparent 50%, rgba(46,191,255,0.03) 100%)' }}
                            />
                        </div>
                    )}

                    {/* SHARED COMMUNITY CARD PREVIEW (GIG, FORM, GUESTLIST) */}
                    {(type === 'gig' || type === 'form' || type === 'guestlist' || type === 'gl') && (
                        <div className="w-full flex justify-center h-full">
                            <div className="w-full h-full flex flex-col justify-center">
                                <CommunityCard 
                                    type={type === 'gl' ? 'gl' : type}
                                    item={{
                                        ...data,
                                        id: 'preview'
                                    }}
                                    handleShare={() => {}}
                                    className="w-full h-full"
                                />
                            </div>
                        </div>
                    )}

                    {/* CAMPAIGN SPECIFIC PREVIEW */}
                    {type === 'campaign' && (
                        <div className="w-full h-full flex items-center justify-center p-4">
                            <div className="w-full max-w-sm">
                                <CampaignCard 
                                    campaign={{
                                        ...data,
                                        id: 'preview',
                                        tasks: data.tasks || []
                                    }}
                                    onOpenMission={() => {}}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LivePreview;
