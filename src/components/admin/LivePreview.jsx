import React from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Pin, Calendar, MapPin, Users, Share2, ArrowRight } from 'lucide-react';
import { cn } from '../../lib/utils';

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
                        <div className="bg-zinc-900 border border-white/10 rounded-xl p-5 hover:border-neon-blue/50 transition-all">
                            <div className="flex justify-between items-start gap-3 mb-3">
                                <h3 className="text-lg font-bold text-white leading-tight">{data.title || 'Gig Title'}</h3>
                                <span className={`px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider rounded-full shrink-0 ${data.status === 'Open' ? 'bg-neon-green/20 text-neon-green' : 'bg-red-500/20 text-red-500'}`}>
                                    {data.status || 'Open'}
                                </span>
                            </div>

                            {data.description && (
                                <p className="text-gray-400 text-[10px] mb-4 line-clamp-2 italic font-medium">
                                    {data.description}
                                </p>
                            )}

                            <div className="space-y-2 mb-4 text-gray-400">
                                <div className="flex items-center gap-2 text-[10px]">
                                    <Calendar className="w-3 h-3 text-neon-green" />
                                    <span>{data.date || 'TBD'} | {data.time || 'TBD'}</span>
                                </div>
                                <div className="flex items-center gap-2 text-[10px]">
                                    <MapPin className="w-3 h-3 text-neon-pink" />
                                    <span>{data.location || 'Location'}</span>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <Button className={cn(
                                    "flex-1 h-10 text-[10px] uppercase tracking-wider rounded-lg",
                                    data.applyType === 'whatsapp' ? "bg-[#25D366] text-black" : "bg-neon-green text-black"
                                )}>
                                    {data.applyType === 'whatsapp' ? 'Apply via WhatsApp' : 'Apply for Gig'}
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* GUESTLIST PREVIEW */}
                    {type === 'guestlist' && (
                        <div className="bg-zinc-900 border border-white/10 rounded-xl p-5 hover:border-neon-blue/50 transition-all">
                            <div className="flex justify-between items-start gap-3 mb-3">
                                <h3 className="text-lg font-bold text-white leading-tight">{data.title || 'Event Title'}</h3>
                                <span className={`px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider rounded-full shrink-0 ${data.status === 'Open' ? 'bg-neon-blue/20 text-neon-blue' : 'bg-red-500/20 text-red-500'}`}>
                                    {data.status || 'Open'}
                                </span>
                            </div>

                            {data.description && (
                                <p className="text-gray-400 text-[10px] mb-4 line-clamp-2 italic font-medium">
                                    {data.description}
                                </p>
                            )}

                            <div className="space-y-2 mb-4 text-gray-400">
                                <div className="flex items-center gap-2 text-[10px]">
                                    <Calendar className="w-3 h-3 text-neon-blue" />
                                    <span>{data.date || 'Upcoming'}</span>
                                </div>
                                <div className="flex items-center gap-2 text-[10px]">
                                    <MapPin className="w-3 h-3 text-neon-pink" />
                                    <span>{data.location || 'Announcing Soon'}</span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Button className="w-full h-10 bg-neon-blue text-black text-[10px] uppercase tracking-wider rounded-lg">
                                    Register Now
                                </Button>
                                {data.whatsappLink && (
                                    <Button className="w-full h-8 bg-zinc-800 text-green-400 border border-green-400/20 text-[8px] uppercase tracking-widest rounded-lg">
                                        Join Chat Group
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default LivePreview;
