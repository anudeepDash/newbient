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

const LivePreview = ({ type, data, categories = [] }) => {
    return (
        <div className="h-full flex flex-col">
            <div className="flex items-center justify-between text-gray-400 text-sm uppercase tracking-wider font-bold mb-4">
                <span>Live Preview</span>
                <span className="text-xs bg-white/10 px-2 py-1 rounded text-neon-blue">
                    {type === 'portfolio' ? (categories?.find(c => c.id === data.category)?.label || 'General') : type} View
                </span>
            </div>

            <div className="flex-grow bg-[#050505] rounded-[3rem] border-[12px] border-[#1a1a1a] overflow-hidden relative shadow-2xl flex flex-col items-center justify-start p-6 min-h-[600px]">
                {/* Simulated Phone Header */}
                <div className="w-40 h-7 bg-[#1a1a1a] rounded-b-3xl absolute top-0 left-1/2 -translate-x-1/2 z-30 flex items-center justify-center">
                    <div className="w-12 h-1 bg-white/10 rounded-full"></div>
                </div>

                <div className="absolute top-8 left-0 right-0 h-6 flex items-center justify-between px-8 z-20">
                    <div className="text-[10px] font-black text-white/40">9:41</div>
                    <div className="flex gap-1.5 items-center">
                        <div className="w-3 h-1.5 bg-white/20 rounded-full"></div>
                        <div className="w-1.5 h-1.5 bg-white/20 rounded-full"></div>
                        <div className="w-4 h-2 bg-white/20 rounded-sm"></div>
                    </div>
                </div>

                <div className="w-full mt-12 scale-[0.85] sm:scale-90 origin-top transition-transform">
                    {/* ANNOUNCEMENT PREVIEW */}
                    {type === 'announcement' && (
                        <Card className="p-6 flex items-start gap-4 border-white/10 bg-zinc-900 rounded-3xl">
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
                        <div className="relative bg-black border border-white/5 rounded-[3rem] overflow-hidden aspect-[4/5] transition-all duration-500 group shadow-2xl w-full">
                            {/* Visual Perforations */}
                            <div className="absolute top-[65%] -left-4 w-8 h-8 bg-black rounded-full border border-white/5 z-20" />
                            <div className="absolute top-[65%] -right-4 w-8 h-8 bg-black rounded-full border border-white/5 z-20" />
                            <div className="absolute top-[66.5%] left-4 right-4 h-px border-t border-dashed border-white/20 z-10" />

                            {/* Full Image Background Overlay */}
                            <div className="absolute inset-0 z-0 overflow-hidden bg-black">
                                {data.image ? (
                                    <div 
                                        className="absolute inset-0 bg-cover bg-center transition-transform duration-300" 
                                        style={{ 
                                            backgroundImage: `url(${data.image})`,
                                            transform: `scale(${data.imageTransform?.scale || 1}) translate(${(data.imageTransform?.x || 0)}%, ${(data.imageTransform?.y || 0)}%)`,
                                            transformOrigin: 'center'
                                        }} 
                                    />
                                ) : (
                                    <div className="absolute inset-0 flex items-center justify-center text-gray-800 font-bold uppercase tracking-widest text-xs italic">AESTHETIC TBA</div>
                                )}
                                {/* Premium Gradient Overlay - Solid black at bottom for legibility */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black from-[10%] via-black/95 via-[35%] to-transparent to-[80%] z-10" />
                            </div>

                            {/* Floating Info Labels (Top-Left: Date Only) */}
                            <div className="absolute top-6 left-6 z-30">
                                <div className="px-5 py-2.5 rounded-2xl bg-black/60 backdrop-blur-md border border-white/10 shadow-xl">
                                    <span className="text-[11px] font-black uppercase tracking-[0.1em] text-neon-blue">
                                        {data.date ? new Date(data.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Soon'}
                                    </span>
                                </div>
                            </div>

                            {/* Floating Status Icons (Top-Right) */}
                            <div className="absolute top-6 right-6 flex flex-col gap-3 z-30 items-end">
                                {data.isTicketed && (
                                    <div className="w-11 h-11 rounded-2xl bg-neon-green text-black flex items-center justify-center shadow-[0_0_20px_rgba(46,255,144,0.4)] border border-neon-green/20">
                                        <Ticket size={22} />
                                    </div>
                                )}
                                {data.isGiveaway && (
                                    <div className="w-11 h-11 rounded-2xl bg-purple-600 backdrop-blur-md border border-purple-400/30 flex items-center justify-center shadow-[0_0_20px_rgba(168,85,247,0.3)]">
                                        <Gift size={20} className="text-white animate-pulse" />
                                    </div>
                                )}
                            </div>

                            {/* Content Overlay */}
                            <div className="absolute inset-0 p-8 flex flex-col justify-end z-20">
                                <div className="space-y-4">
                                    <div>
                                        <h3 className="text-2xl font-black text-white leading-tight tracking-tight mb-2 truncate italic uppercase">{data.title || 'EVENT TITLE'}</h3>
                                        <div className="flex items-center gap-4 text-gray-400">
                                            <div className="flex items-center gap-1"><MapPin size={12} className="text-neon-blue" /><span className="text-[10px] font-bold uppercase tracking-widest">{data.location || 'Announcing Soon'}</span></div>
                                            <div className="flex items-center gap-1"><Calendar size={12} className="text-neon-blue" /><span className="text-[10px] font-bold uppercase tracking-widest">{data.date ? 'Locked' : 'TBD'}</span></div>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between pt-2">
                                        <div className="text-neon-blue font-black tracking-widest flex items-center gap-2 group-hover:gap-4 transition-all">
                                            <span className="text-[10px] uppercase text-cyan-400">{data.buttonText || 'GET TICKETS NOW'}</span>
                                            <ArrowRight size={16} className="text-cyan-400" />
                                        </div>
                                        <button className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white z-30"><Share2 size={14} /></button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* PORTFOLIO PREVIEW */}
                    {type === 'portfolio' && (
                        <div className="w-full aspect-[4/5] bg-black border border-white/5 rounded-[3rem] overflow-hidden group hover:border-white/10 transition-all duration-500 relative shadow-2xl">
                             {/* Visual Perforations */}
                            <div className="absolute top-[65%] -left-4 w-8 h-8 bg-black rounded-full border border-white/5 z-20" />
                            <div className="absolute top-[65%] -right-4 w-8 h-8 bg-black rounded-full border border-white/5 z-20" />
                            <div className="absolute top-[66.5%] left-4 right-4 h-px border-t border-dashed border-white/20 z-10" />

                            {/* Full Image Background Overlay */}
                            <div className="absolute inset-0 z-0 overflow-hidden bg-black">
                                {data.image ? (
                                    <div 
                                        className="absolute inset-0 bg-cover bg-center transition-transform duration-300" 
                                        style={{ 
                                            backgroundImage: `url(${data.image})`,
                                            transform: `scale(${data.imageTransform?.scale || 1}) translate(${(data.imageTransform?.x || 0)}%, ${(data.imageTransform?.y || 0)}%)`,
                                            transformOrigin: 'center'
                                        }}
                                    />
                                ) : (
                                    <div className="absolute inset-0 flex items-center justify-center text-gray-800 uppercase font-black tracking-widest text-[10px]">AESTHETIC TBA</div>
                                )}
                                {/* Premium Gradient Overlay - Compact deep black at bottom */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black from-[0%] via-black/90 via-[30%] to-transparent to-[55%] z-10" />
                            </div>

                            {/* Floating Info Labels (Top-Left: Date Only) */}
                            <div className="absolute top-6 left-6 z-30">
                                <div className="px-5 py-2.5 rounded-2xl bg-black/60 backdrop-blur-md border border-white/10 shadow-xl">
                                    <span className="text-[11px] font-black uppercase tracking-[0.1em] text-neon-blue">
                                        {data.date ? new Date(data.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Soon'}
                                    </span>
                                </div>
                            </div>

                            {/* Content Overlay */}
                            <div className="absolute inset-0 p-8 flex flex-col justify-end z-20 text-left">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <span className="px-3 py-1 bg-neon-green/20 backdrop-blur-md text-neon-green text-[9px] font-black uppercase tracking-widest border border-neon-green/30 rounded-full">
                                            {categories?.find(c => c.id === data.category)?.label || data.category || 'GENERAL'}
                                        </span>
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black font-heading text-white uppercase italic tracking-tight mb-2 truncate">{data.title || 'RECORD TITLE'}</h3>
                                        {data.date && (
                                            <div className="flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase tracking-widest">
                                                <Clock size={12} className="text-neon-blue" />
                                                {data.date}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center justify-between pt-2">
                                        <div className="text-neon-blue font-black tracking-widest flex items-center gap-2 group-hover:gap-4 transition-all text-[10px] uppercase">
                                            View Experience <ArrowRight size={14} />
                                        </div>
                                        <button className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white z-30"><Share2 size={14} /></button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* SHARED COMMUNITY CARD PREVIEW (GIG, FORM, GUESTLIST) */}
                    {(type === 'gig' || type === 'form' || type === 'guestlist') && (
                        <div className="w-full perspective-1000">
                            <CommunityCard 
                                type={type === 'guestlist' ? 'gl' : type}
                                item={{
                                    ...data,
                                    id: 'preview'
                                }}
                                handleShare={() => {}}
                            />
                            <div className="mt-8 text-center bg-white/5 border border-white/10 p-4 rounded-2xl backdrop-blur-xl">
                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest italic leading-relaxed">
                                    Pre-visualization synced with <br/> <span className="text-neon-blue">Production Engine</span>
                                </p>
                            </div>
                        </div>
                    )}
                </div>
                
                {/* Simulated Home Bar */}
                <div className="absolute bottom-2 left-1/2 -track-x-1/2 w-32 h-1 bg-white/20 rounded-full z-30"></div>
            </div>
        </div>
    );
};

export default LivePreview;
