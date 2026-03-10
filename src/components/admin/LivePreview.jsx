import React from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Pin, Calendar, MapPin, Users, Share2, ArrowRight, ClipboardList, Sparkles, Ticket } from 'lucide-react';
import { cn } from '../../lib/utils';

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
                        <div className="relative bg-[#111] border border-white/5 rounded-[3rem] overflow-hidden flex flex-col h-[520px] transition-all duration-500 hover:border-white/10 group shadow-2xl w-full">
                            {/* Visual Perforations */}
                            <div className="absolute top-[65%] -left-4 w-8 h-8 bg-black rounded-full border border-white/5 z-20" />
                            <div className="absolute top-[65%] -right-4 w-8 h-8 bg-black rounded-full border border-white/5 z-20" />
                            <div className="absolute top-[66.5%] left-4 right-4 h-px border-t border-dashed border-white/20 z-10" />

                            {/* Top Image Section */}
                            <div className="h-[65%] relative overflow-hidden bg-zinc-800">
                                {data.image ? (
                                    <div
                                        className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 group-hover:scale-110"
                                        style={{ backgroundImage: `url(${data.image})` }}
                                    />
                                ) : (
                                    <div className="absolute inset-0 flex items-center justify-center text-gray-600 font-bold uppercase tracking-widest text-xs">
                                        TBA
                                    </div>
                                )}
                                {/* Gradient Overlay */}
                                <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#111] to-transparent" />
                                
                                <div className="absolute top-6 left-6 px-4 py-2 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 z-10 flex items-center gap-3">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-neon-blue">
                                        {data.date ? new Date(data.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Soon'}
                                    </span>
                                    {data.isTicketed && <Ticket size={14} className="text-neon-green drop-shadow-[0_0_8px_rgba(46,255,144,0.5)]" />}
                                </div>
                            </div>

                            {/* Bottom Content Section */}
                            <div className="h-[35%] p-8 flex flex-col justify-between relative bg-[#111] z-10">
                                <div>
                                    <h3 className="text-2xl font-black text-white leading-tight tracking-tight mb-2 truncate">
                                        {data.title || 'EVENT TITLE'}
                                    </h3>
                                    <div className="flex items-center gap-4 text-gray-500">
                                        <div className="flex items-center gap-1">
                                            <MapPin size={12} className="text-neon-blue" />
                                            <span className="text-[10px] font-bold uppercase tracking-widest">{data.location || 'Mainland India'}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Calendar size={12} className="text-neon-blue" />
                                            <span className="text-[10px] font-bold uppercase tracking-widest">{data.date ? 'Confirmed' : 'Pending'}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-4">
                                    <div className="text-neon-blue font-black tracking-widest flex items-center gap-2 group-hover:gap-4 transition-all hover:text-white cursor-pointer z-30">
                                        <span className="text-[10px] uppercase text-cyan-400">{data.buttonText || 'GET TICKETS NOW'}</span>
                                        <ArrowRight size={16} className="text-cyan-400" />
                                    </div>
                                    
                                    <button className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-neon-blue hover:text-black transition-all z-30">
                                        <Share2 size={14} />
                                    </button>
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

                            <Button
                                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white transition-colors z-20 bg-black/20 rounded-full backdrop-blur-sm h-8 w-8 flex items-center justify-center border-none shadow-none"
                                variant="ghost"
                            >
                                <Share2 size={14} />
                            </Button>

                            <div className="flex flex-col sm:flex-row h-full">
                                <div className="p-5 flex-1 flex flex-col relative overflow-hidden">
                                    <div className="absolute -right-4 -bottom-4 opacity-[0.03] scale-150 pointer-events-none">
                                        <Calendar size={120} />
                                    </div>



                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-neon-blue">
                                            <Calendar size={20} />
                                        </div>
                                        <span className="px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-widest border bg-neon-blue/10 text-neon-blue border-neon-blue/20">
                                            {data.status || 'Open'}
                                        </span>
                                    </div>

                                    <div className="mb-4">
                                        <p className="text-[7px] font-bold text-neon-blue uppercase tracking-widest mb-1">Exclusive Access</p>
                                        <h3 className="text-xl font-bold font-heading leading-tight text-white mb-2">
                                            {data.title || 'Event Title'}
                                        </h3>
                                        {data.description && (
                                            <p className="text-gray-400 text-[10px] line-clamp-2 italic font-medium opacity-70 whitespace-pre-wrap">
                                                "{data.description}"
                                            </p>
                                        )}
                                    </div>

                                    <div className="mt-auto space-y-1">
                                        <div className="flex items-center gap-2 text-[9px] font-bold text-gray-500 uppercase tracking-widest">
                                            <Calendar size={12} className="text-neon-blue" />
                                            <span className="text-white/60">{data.date || 'Upcoming'}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-[9px] font-bold text-gray-500 uppercase tracking-widest">
                                            <MapPin size={12} className="text-neon-pink" />
                                            <span className="text-white/60 truncate">{data.location || 'Announcing Soon'}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-5 border-t sm:border-t-0 sm:border-l border-white/10 flex flex-col justify-center gap-3 bg-white/2 min-w-[140px]">
                                    <Button className="w-full h-10 bg-neon-blue text-black rounded-xl font-bold uppercase tracking-widest text-[9px] gap-2 font-heading">
                                        Register
                                        <ArrowRight size={12} />
                                    </Button>
                                    {data.whatsappLink && (
                                        <Button className="w-full h-10 bg-zinc-800/80 text-green-400 border border-green-400/20 rounded-xl font-bold uppercase tracking-widest text-[9px]">
                                            WhatsApp
                                        </Button>
                                    )}
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
