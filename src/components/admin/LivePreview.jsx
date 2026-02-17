import React from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Pin, Calendar, MapPin, Users, Share2, ArrowRight, ClipboardList, Sparkles } from 'lucide-react';
import { cn } from '../../lib/utils';

const formatDate = (dateStr) => {
    if (!dateStr) return 'TBD';
    const [y, m, d] = dateStr.split('-');
    return `${d}-${m}-${y}`;
};

const LivePreview = ({ type, data }) => {
    return (
        <div className="h-full flex flex-col">
            <div className="flex items-center justify-between text-gray-400 text-sm uppercase tracking-wider font-bold mb-4">
                <span>Live Preview</span>
                <span className="text-xs bg-white/10 px-2 py-1 rounded text-neon-blue">{type} View</span>
            </div>

            <div className="flex-grow bg-black rounded-xl border-4 border-gray-800 overflow-hidden relative shadow-2xl flex flex-col justify-center p-4">
                {/* Simulated Phone Header */}
                <div className="absolute top-0 left-0 right-0 h-6 bg-gray-900 flex items-center justify-between px-4 z-20">
                    <div className="text-[10px] text-gray-500">9:41</div>
                    <div className="flex gap-1">
                        <div className="w-3 h-3 bg-gray-700 rounded-full"></div>
                        <div className="w-3 h-3 bg-gray-700 rounded-full"></div>
                    </div>
                </div>

                <div className="w-full max-w-[350px] mx-auto scale-90 sm:scale-100 transition-transform origin-center">

                    {/* ANNOUNCEMENT PREVIEW */}
                    {type === 'announcement' && (
                        <Card className="p-6 flex items-start gap-4 border-white/10 bg-zinc-900">
                            <div className="flex-grow">
                                <div className="flex items-center gap-2 mb-2">
                                    <h3 className="text-lg font-bold text-white leading-tight">{data.title || 'Announcement Title'}</h3>
                                    {data.isPinned && <Pin size={14} className="text-neon-pink fill-current shrink-0" />}
                                </div>
                                <p className="text-neon-blue text-xs font-bold mb-2">
                                    {data.date || new Date().toISOString().split('T')[0]}
                                </p>
                                <p className="text-gray-300 text-sm line-clamp-3">
                                    {data.content || 'Announcement content will appear here...'}
                                </p>
                                {data.image && (
                                    <img src={data.image} alt="Preview" className="mt-3 rounded-lg w-full h-32 object-cover" />
                                )}
                            </div>
                        </Card>
                    )}

                    {/* EVENT PREVIEW */}
                    {type === 'event' && (
                        <div className="aspect-[4/5] relative rounded-xl overflow-hidden group border border-white/10 bg-gray-900 shadow-lg">
                            {data.image ? (
                                <div
                                    className="absolute inset-0 bg-cover bg-center"
                                    style={{ backgroundImage: `url(${data.image})` }}
                                />
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center bg-gray-800 text-gray-500">
                                    No Image
                                </div>
                            )}

                            {/* Hover Overlay Simulation (Always partially visible in preview) */}
                            <div className="absolute inset-0 bg-black/60 flex flex-col justify-center items-center p-4 text-center">
                                <h3 className="text-xl font-bold text-white mb-1">
                                    {data.title || 'Event Title'}
                                </h3>
                                <p className="text-neon-green text-[10px] font-bold uppercase tracking-wider mb-2">
                                    {data.date ? new Date(data.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric' }) : 'Upcoming'}
                                </p>

                                {data.description && (
                                    <p className="text-gray-300 text-[10px] mb-3 whitespace-pre-line line-clamp-4">
                                        {data.description}
                                    </p>
                                )}

                                <div className="flex items-center gap-1 text-white text-[10px] font-medium border border-white/20 px-2 py-1 rounded">
                                    {data.buttonText || 'view event'}
                                    <ArrowRight size={10} />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* GIG PREVIEW */}
                    {type === 'gig' && (
                        <div className="bg-zinc-900/40 backdrop-blur-xl border border-white/10 rounded-[1.5rem] overflow-hidden flex flex-col group transition-all duration-500 shadow-2xl">
                            <div className="h-1 w-full bg-gradient-to-r from-neon-green via-neon-green/50 to-transparent relative z-10"></div>

                            <div className="p-5 flex flex-col relative overflow-hidden">
                                <div className="absolute -right-4 -bottom-4 opacity-[0.03] scale-150 pointer-events-none">
                                    <Users size={120} />
                                </div>

                                <Button
                                    className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white transition-colors z-20 bg-black/20 rounded-full backdrop-blur-sm h-8 w-8 flex items-center justify-center border-none shadow-none"
                                    variant="ghost"
                                >
                                    <Share2 size={14} />
                                </Button>

                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-neon-green">
                                        <Users size={20} />
                                    </div>
                                    <span className="px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-widest border bg-neon-green/10 text-neon-green border-neon-green/20">
                                        {data.status || 'Open'}
                                    </span>
                                </div>

                                <h3 className="text-xl font-bold font-heading leading-tight mb-2 text-white">
                                    {data.title || 'Gig Title'}
                                </h3>

                                {data.description && (
                                    <p className="text-gray-400 text-[10px] line-clamp-2 italic font-medium opacity-70 mb-4 whitespace-pre-wrap">
                                        "{data.description}"
                                    </p>
                                )}

                                <div className="space-y-2 mt-auto">
                                    <div className="flex items-center gap-2 text-[9px] font-bold text-gray-500 uppercase tracking-widest">
                                        <Calendar size={12} className="text-neon-green" />
                                        <span className="text-white/60">
                                            {data.dates && data.dates.length > 0 ? data.dates.map(formatDate).join(', ') : formatDate(data.date)} | {data.time || 'TBD'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-[9px] font-bold text-gray-500 uppercase tracking-widest">
                                        <MapPin size={12} className="text-neon-pink" />
                                        <span className="text-white/60 truncate">{data.location || 'Location'}</span>
                                    </div>
                                </div>

                                <div className="mt-6 pt-4 border-t border-white/5 space-y-3">
                                    <Button className={cn(
                                        "w-full h-12 rounded-xl font-bold uppercase tracking-widest text-[10px] gap-2 font-heading",
                                        data.applyType === 'whatsapp'
                                            ? "bg-[#25D366] text-black"
                                            : "bg-neon-green text-black shadow-[0_0_20px_rgba(34,197,94,0.4)]"
                                    )}>
                                        {data.applyType === 'whatsapp' ? 'Apply via WA' : 'Apply for Gig'}
                                        <ArrowRight size={14} />
                                    </Button>

                                    {data.whatsappLink && (
                                        <Button className="w-full h-12 bg-zinc-800/80 text-green-400 border border-green-400/20 rounded-xl font-bold uppercase tracking-widest text-[10px] gap-2 font-heading">
                                            Join WhatsApp
                                            <Share2 size={12} />
                                        </Button>
                                    )}
                                    <button className="w-full text-center text-[8px] font-bold uppercase tracking-[0.2em] text-gray-500">
                                        [ View Details ]
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* GUESTLIST PREVIEW */}
                    {type === 'guestlist' && (
                        <div className="bg-zinc-900/40 backdrop-blur-xl border border-white/10 rounded-[1.5rem] overflow-hidden flex flex-col group transition-all duration-500 shadow-2xl">
                            <div className="h-1 w-full bg-gradient-to-r from-neon-blue via-neon-pink/50 to-transparent relative z-10"></div>

                            <div className="p-5 flex flex-col relative overflow-hidden">
                                <div className="absolute -right-4 -bottom-4 opacity-[0.03] scale-150 pointer-events-none">
                                    <Calendar size={120} />
                                </div>

                                <div className="flex items-start justify-between mb-4">
                                    <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-neon-blue">
                                        <Calendar size={20} />
                                    </div>
                                    <span className="px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-widest border bg-neon-blue/10 text-neon-blue border-neon-blue/20">
                                        {data.status || 'Open'}
                                    </span>
                                </div>

                                <div className="mb-4">
                                    <p className="text-[7px] font-bold text-neon-blue uppercase tracking-widest mb-1">Exclusive Access for Community Members</p>
                                    <h3 className="text-xl font-bold font-heading leading-tight text-white">
                                        {data.title || 'Event Title'}
                                    </h3>
                                </div>

                                {data.description && (
                                    <p className="text-gray-400 text-[10px] line-clamp-2 italic font-medium opacity-70 mb-4 whitespace-pre-wrap">
                                        "{data.description}"
                                    </p>
                                )}

                                <div className="space-y-2 mt-auto">
                                    <div className="flex items-center gap-2 text-[9px] font-bold text-gray-500 uppercase tracking-widest">
                                        <Calendar size={12} className="text-neon-blue" />
                                        <span className="text-white/60">{data.date || 'Upcoming'}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-[9px] font-bold text-gray-500 uppercase tracking-widest">
                                        <MapPin size={12} className="text-neon-pink" />
                                        <span className="text-white/60 truncate">{data.location || 'Announcing Soon'}</span>
                                    </div>
                                </div>

                                <div className="mt-6 pt-4 border-t border-white/5 space-y-3">
                                    <Button className="w-full h-12 bg-neon-blue text-black rounded-xl font-bold uppercase tracking-widest text-[10px] gap-2 font-heading">
                                        Register Now
                                        <ArrowRight size={14} />
                                    </Button>
                                    {data.whatsappLink && (
                                        <Button className="w-full h-12 bg-zinc-800/80 text-green-400 border border-green-400/20 rounded-xl font-bold uppercase tracking-widest text-[10px]">
                                            Join WhatsApp
                                        </Button>
                                    )}
                                    <button className="w-full text-center text-[8px] font-bold uppercase tracking-[0.2em] text-gray-500 pt-1">
                                        [ View Details ]
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* FORM/PULSE PREVIEW */}
                    {type === 'form' && (
                        <div className="bg-zinc-900/40 backdrop-blur-xl border border-white/10 rounded-[1.5rem] overflow-hidden flex flex-col group transition-all duration-500 shadow-2xl">
                            <div className="h-1 w-full bg-gradient-to-r from-neon-pink via-neon-pink/50 to-transparent relative z-10"></div>

                            <div className="p-5 flex flex-col relative overflow-hidden">
                                <div className="absolute -right-4 -bottom-4 opacity-[0.03] scale-150 pointer-events-none">
                                    <ClipboardList size={120} />
                                </div>

                                <div className="flex items-start justify-between mb-4">
                                    <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-neon-pink">
                                        <ClipboardList size={20} />
                                    </div>
                                    <span className="px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-widest border bg-white/5 text-gray-500 border-white/10">Active Pulse</span>
                                </div>

                                <div className="mb-4">
                                    <p className="text-[7px] font-bold text-neon-pink uppercase tracking-widest mb-1">Feedback & More</p>
                                    <h3 className="text-xl font-bold font-heading leading-tight text-white">
                                        {data.title || 'Form Title'}
                                    </h3>
                                </div>

                                {data.description && (
                                    <p className="text-gray-400 text-[10px] line-clamp-2 italic font-medium opacity-70 mb-4 whitespace-pre-wrap">
                                        "{data.description}"
                                    </p>
                                )}

                                <div className="flex items-center gap-2 text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-auto">
                                    <Sparkles size={12} className="text-neon-pink" />
                                    <span>Community Feedback Loop</span>
                                </div>

                                <div className="mt-6 pt-4 border-t border-white/5">
                                    <Button className="w-full h-12 bg-neon-pink text-black rounded-xl font-bold uppercase tracking-widest text-[10px] gap-2 font-heading">
                                        Take Form
                                        <ArrowRight size={14} />
                                    </Button>
                                    <button className="w-full text-center text-[8px] font-bold uppercase tracking-[0.2em] text-gray-500 pt-4">
                                        [ View Details ]
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default LivePreview;
