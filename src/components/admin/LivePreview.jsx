import React from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Pin, Calendar, MapPin, Users, Share2, ArrowRight, ClipboardList, Sparkles, Ticket, Clock } from 'lucide-react';
import { cn } from '../../lib/utils';
import CommunityCard from '../community/CommunityCard';

const formatDate = (dateStr) => {
    if (!dateStr) return 'TBD';
    if (dateStr.includes('T')) {
        try {
            const d = new Date(dateStr);
            if (!isNaN(d.getTime())) {
                const datePart = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
                const timePart = d.toLocaleTimeString('en-US', { hour: '2-digit', minute:'2-digit', hour12: true });
                return `${datePart} • ${timePart}`;
            }
        } catch (e) {}
    }
    const [y, m, d] = dateStr.split('-');
    const day = d ? d.split('T')[0] : '';
    return `${day}-${m}-${y}`;
};

const LivePreview = ({ type, data, categories = [], hideDecorations = false }) => {
    return (
        <div className="h-full flex flex-col">
            {!hideDecorations && (
                <div className="flex items-center justify-between mb-8 px-2">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-neon-pink animate-pulse" />
                            <div className="w-1.5 h-1.5 rounded-full bg-neon-pink/40 animate-ping absolute" />
                        </div>
                        <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40 font-heading italic">Live Preview</h3>
                    </div>
                    <div className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-white text-[9px] font-black uppercase tracking-[0.3em] backdrop-blur-md">
                        <span className="text-neon-blue">{type === 'gl' ? 'GUESTLIST' : type.toUpperCase()}</span> VIEW
                    </div>
                </div>
            )}
            <div className={cn(
                "w-full transition-all mx-auto overflow-hidden",
                hideDecorations ? "p-0 rounded-none bg-transparent border-none shadow-none" : cn(
                    "p-6 rounded-[3rem] border border-white/5 bg-zinc-900/20 backdrop-blur-3xl shadow-2xl relative flex flex-col items-center justify-center",
                    type === 'event' ? "aspect-[4/5]" : "aspect-[3/2]"
                )
            )}>
                <div className="w-full h-full flex flex-col items-center justify-center">
                    {/* ANNOUNCEMENT PREVIEW */}
                    {type === 'announcement' && (
                        <Card className="p-6 w-full flex items-start gap-4 border-white/10 bg-zinc-900 rounded-3xl">
                            <div className="flex-grow">
                                <div className="flex items-center gap-2 mb-2">
                                    <h3 className="text-lg font-bold text-white leading-tight">{data.title || 'Announcement Title'}</h3>
                                    {data.isPinned && <Pin size={14} className="text-neon-pink fill-current shrink-0" />}
                                </div>
                                <p className="text-neon-blue text-xs font-bold mb-2">
                                    {data.date || new Date().toISOString().split('T')[0]}
                                </p>
                                <p className="text-gray-300 text-sm line-clamp-3 leading-relaxed">
                                    {data.content || 'Announcement content will appear here...'}
                                </p>
                                {data.image && (
                                    <img src={data.image} alt="Preview" className="mt-4 rounded-2xl w-full h-32 object-cover" />
                                )}
                            </div>
                        </Card>
                    )}

                    {/* EVENT PREVIEW */}
                    {type === 'event' && (
                        <div className="relative bg-zinc-950 border border-white/10 rounded-[3rem] overflow-hidden aspect-[4/5] transition-all duration-500 group shadow-[0_30px_100px_rgba(0,0,0,0.5)] w-full">
                            {/* Full Image Background Overlay */}
                            <div className="absolute inset-0 z-0 overflow-hidden bg-black">
                                {data.image ? (
                                    <div
                                        className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                                        style={{ 
                                            backgroundImage: `url(${data.image})`,
                                            transform: `scale(${data.imageTransform?.scale || 1}) translate(${(data.imageTransform?.x || 0)}%, ${(data.imageTransform?.y || 0)}%)`,
                                        }}
                                    />
                                ) : (
                                    <div className="absolute inset-0 flex items-center justify-center text-gray-800 font-black uppercase tracking-[0.3em] text-[10px]">
                                        SIGNAL_BUFFERING
                                    </div>
                                )}
                                {/* Immersive Glass Overlays */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent z-10" />
                                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-50 z-10" />
                                <div 
                                    className="absolute inset-0 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
                                    style={{ background: `radial-gradient(circle at bottom, ${data.highlightColor || '#2ebfff'}11 0%, transparent 70%)` }}
                                />
                            </div>
                            
                            {/* Front Badge: Category/Status */}
                            <div className="absolute top-8 left-8 z-30">
                                <div className="px-5 py-2.5 rounded-2xl bg-black/40 backdrop-blur-3xl border border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.3)] flex items-center gap-2 group-hover:border-[var(--accent-glow)] transition-colors">
                                    <div 
                                        className="w-1.5 h-1.5 rounded-full animate-pulse" 
                                        style={{ backgroundColor: data.highlightColor || '#2ebfff', boxShadow: `0 0 10px ${data.highlightColor || '#2ebfff'}` }}
                                    />
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white">
                                        {data.date ? (data.date === 'TBD' ? 'TBD' : new Date(data.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })) : 'MANIFEST'}
                                    </span>
                                </div>
                            </div>

                            {/* Status Icons (Top-Right) */}
                            <div className="absolute top-8 right-8 flex flex-col gap-3 z-30 items-end">
                                {data.isTicketed && (
                                    <div className="w-11 h-11 rounded-2xl bg-neon-green/90 text-black flex items-center justify-center shadow-[0_0_30px_rgba(46,255,144,0.3)] border border-neon-green/20 backdrop-blur-xl">
                                        <Ticket size={20} />
                                    </div>
                                )}
                                {data.isGiveaway && (
                                    <div className="w-11 h-11 rounded-2xl bg-purple-600/90 backdrop-blur-xl border border-purple-400/30 flex items-center justify-center shadow-[0_0_30px_rgba(168,85,247,0.3)]">
                                        <Gift size={20} className="text-white" />
                                    </div>
                                )}
                            </div>

                            {/* Content Slab */}
                            <div className="absolute inset-0 p-10 flex flex-col justify-end z-20">
                                <div className="space-y-6">
                                    <div className="space-y-4">
                                        {data.artists && data.artists.length > 0 && (
                                            <div className="flex flex-wrap gap-2 mb-2">
                                                {data.artists.slice(0, 3).map((artist, i) => (
                                                    <span key={i} className="text-[8px] font-black uppercase tracking-[0.3em] text-white/40 border border-white/5 px-2 py-0.5 rounded-lg bg-white/5">
                                                        {artist}
                                                    </span>
                                                ))}
                                                {data.artists.length > 3 && <span className="text-[8px] font-black text-white/20">+{data.artists.length - 3}</span>}
                                            </div>
                                        )}
                                        <h3 className="event-title text-3xl md:text-4xl font-black text-white leading-none tracking-tighter uppercase italic transition-colors duration-500">
                                            <span className="group-hover:text-neon-blue transition-colors">{data.title || 'Untitled Protocol'}</span>
                                        </h3>
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/5 backdrop-blur-md">
                                                <MapPin size={12} style={{ color: data.highlightColor || '#2ebfff' }} />
                                                <span className="text-[9px] font-black uppercase tracking-widest text-white/60">{data.location || 'NEUBI_ZONE'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-6 border-t border-white/5 flex items-center justify-between">
                                        <div className="flex flex-col gap-2">
                                            <div className="text-white font-black tracking-[0.2em] flex items-center gap-3 uppercase text-[10px]">
                                                {data.buttonText || (data.isTicketed ? "GET TICKETS" : "LEARN MORE")}
                                                <ArrowRight size={16} />
                                            </div>
                                        </div>
                                        
                                        <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/10 transition-all shadow-xl backdrop-blur-xl">
                                            <Share2 size={16} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* SHARED COMMUNITY CARD PREVIEW (GIG, FORM, GUESTLIST, CAMPAIGN) */}
                    {(type === 'gig' || type === 'form' || type === 'guestlist' || type === 'gl' || type === 'campaign') && (
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
                </div>
            </div>
        </div>
    );
};

export default LivePreview;
