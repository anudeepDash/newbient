import React from 'react';
import { motion } from 'framer-motion';
import { Instagram, FileText, ArrowRight, Zap, MapPin, Users, Award } from 'lucide-react';
import { cn } from '../../lib/utils';

const CampaignCard = ({ campaign, profile, type, onOpenMission }) => {
    const isJoined = type === 'joined';
    const isShortlisted = profile && (profile.shortlistedCampaigns || []).includes(campaign.id);
    const uid = profile?.uid;
    
    // Helper to get submission status
    const getSubmissionStatus = (task, creatorUid) => {
        if (!task.submissions || !creatorUid) return 'not_started';
        const sub = task.submissions[creatorUid];
        return sub ? sub.status : 'not_started';
    };

    const campaignTasks = campaign.tasks || [];
    const requiredTasks = campaignTasks.filter(t => t.priority !== 'optional');
    
    // Calculate progress if joined
    let approvedTotal = 0;
    let progress = 0;
    let isFullyComplete = false;
    let hasNewTasks = false;

    if (isJoined && uid) {
        const approvedRequired = requiredTasks.filter(t => getSubmissionStatus(t, uid) === 'approved').length;
        approvedTotal = campaignTasks.filter(t => getSubmissionStatus(t, uid) === 'approved').length;
        progress = campaignTasks.length > 0 ? (approvedTotal / campaignTasks.length) * 100 : 0;
        isFullyComplete = requiredTasks.length > 0 && approvedRequired === requiredTasks.length;
        hasNewTasks = isShortlisted && campaignTasks.some(t => getSubmissionStatus(t, uid) === 'not_started');
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => onOpenMission(campaign)}
            className="bg-[#0a0a0a]/80 backdrop-blur-3xl border border-white/10 hover:border-neon-blue/40 shadow-2xl rounded-[2rem] overflow-hidden flex flex-col group transition-all duration-500 h-full relative cursor-pointer active:scale-[0.98]"
        >
            {/* Progress Strip */}
            {isJoined && (
                <div className="absolute top-0 left-0 w-full h-1.5 bg-white/5 overflow-hidden z-20">
                    <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        className={cn("h-full transition-all duration-1000 shadow-[0_0_12px_rgba(46,191,255,0.5)]", isFullyComplete ? "bg-neon-green shadow-[0_0_12px_rgba(57,255,20,0.5)]" : "bg-neon-blue")}
                    />
                </div>
            )}

            {/* Thumbnail Header */}
            {campaign.thumbnail ? (
                <div className="aspect-video relative overflow-hidden bg-black border-b border-white/5 shrink-0">
                    <img 
                        src={campaign.thumbnail} 
                        alt={campaign.title} 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/20 to-transparent pointer-events-none" />
                    <div className="absolute top-4 left-4 flex items-center gap-2 z-10">
                        <div className="p-2 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-neon-blue shadow-lg">
                            <Instagram size={16} />
                        </div>
                        <div className="px-3 py-1.5 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-[9px] font-black uppercase tracking-widest text-white shadow-lg flex items-center gap-1.5">
                            <MapPin size={10} className="text-neon-pink" /> {campaign.targetCity || 'Universal'}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="h-32 relative overflow-hidden bg-gradient-to-r from-neon-blue/20 via-neon-purple/20 to-[#0a0a0a] border-b border-white/5 flex items-center px-6 shrink-0">
                    <div className="absolute -right-10 -top-10 w-40 h-40 bg-neon-blue/10 rounded-full blur-3xl pointer-events-none" />
                    <div className="flex items-center gap-4 z-10">
                        <div className="p-3.5 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/10 text-neon-blue shadow-2xl group-hover:scale-110 transition-transform">
                            <Instagram size={24} />
                        </div>
                        <div>
                            <span className="text-[9px] font-black text-neon-blue uppercase tracking-[0.4em] block mb-1">Creator Opportunity</span>
                            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-white">
                                <MapPin size={12} className="text-neon-pink" /> {campaign.targetCity || 'Universal'}
                            </div>
                        </div>
                    </div>
                    <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-[#0a0a0a] to-transparent pointer-events-none" />
                </div>
            )}

            <div className="p-6 md:p-8 flex flex-col flex-1 relative z-10">
                {/* Status Badges Row */}
                <div className="flex items-center justify-between gap-2 mb-6">
                    <div className="flex items-center gap-2">
                        <span className="px-3 py-1 rounded-xl bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-1.5 backdrop-blur-md">
                            <Users size={10} className="text-neon-blue" /> {Number(campaign.minInstagramFollowers || 0).toLocaleString()} FLW
                        </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        {isJoined && hasNewTasks && (
                            <motion.span 
                                initial={{ scale: 0.8 }} 
                                animate={{ scale: [0.8, 1.1, 1] }} 
                                transition={{ repeat: Infinity, duration: 2 }}
                                className="px-3 py-1 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-[8px] font-black uppercase tracking-widest text-yellow-500 flex items-center gap-1 shadow-lg backdrop-blur-md"
                            >
                                <Zap size={10} /> New Tasks
                            </motion.span>
                        )}
                        {isJoined && (
                            <div className={cn(
                                "px-3 py-1 rounded-xl text-[8px] font-black uppercase tracking-widest border backdrop-blur-md shadow-lg flex items-center gap-1.5",
                                isFullyComplete ? "bg-neon-green/10 text-neon-green border-neon-green/20" :
                                isShortlisted ? "bg-neon-blue/10 text-neon-blue border-neon-blue/20" : 
                                "bg-zinc-800/50 text-gray-400 border-white/5"
                            )}>
                                <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse", isFullyComplete ? "bg-neon-green" : isShortlisted ? "bg-neon-blue" : "bg-gray-400")} />
                                {isFullyComplete ? 'Completed' : isShortlisted ? 'Ongoing' : 'Awaiting Approval'}
                            </div>
                        )}
                    </div>
                </div>

                {/* Title & Description */}
                <div className="flex-1 mb-8">
                    <h3 className="text-xl md:text-2xl font-black font-heading mb-3 text-white tracking-tighter uppercase group-hover:text-neon-blue transition-colors italic leading-tight">
                        {campaign.title}
                    </h3>
                    <p className="text-gray-400 text-xs line-clamp-2 leading-relaxed font-medium pr-4">
                        {(campaign.description || '').replace(/<[^>]*>/g, ' ')}
                    </p>
                </div>
                
                {/* Key Metrics Grid */}
                <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-white/[0.02] border border-white/5 mb-6 backdrop-blur-md">
                    <div className="flex flex-col items-center justify-center text-center border-r border-white/5 pr-2">
                        <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1 flex items-center gap-1">
                            <Award size={10} className="text-neon-green" /> REWARD
                        </span>
                        <span className="text-neon-green text-xs font-black italic truncate w-full">{campaign.reward || 'Barter'}</span>
                    </div>
                    <div className="flex flex-col items-center justify-center text-center border-r border-white/5 px-2">
                        <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1 flex items-center gap-1">
                            <FileText size={10} className="text-neon-blue" /> TASKS
                        </span>
                        <span className="text-white text-xs font-black">
                            {isJoined && isShortlisted ? `${approvedTotal}/${campaignTasks.length}` : `${campaignTasks.length} Tasks`}
                        </span>
                    </div>
                    <div className="flex flex-col items-center justify-center text-center pl-2">
                        <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1 flex items-center gap-1">
                            <Zap size={10} className="text-neon-pink" /> STATUS
                        </span>
                        <span className={cn("text-xs font-black", isFullyComplete ? 'text-neon-green' : 'text-neon-blue')}>
                            {isJoined && isShortlisted ? `${Math.round(progress)}%` : 'Open'}
                        </span>
                    </div>
                </div>

                {/* Interactive Footer Button */}
                <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between px-4 py-3 rounded-2xl bg-white/[0.02] group-hover:bg-neon-blue group-hover:text-black transition-all duration-300 shadow-lg">
                    <div className="text-[9px] font-black uppercase tracking-[0.2em] flex items-center gap-2 group-hover:text-black text-gray-400 transition-colors">
                        <FileText size={12} /> 
                        {isJoined && isShortlisted ? 'Open Campaign Page' : 'View Opportunity'}
                    </div>
                    <ArrowRight className="text-gray-600 group-hover:text-black group-hover:translate-x-1 transition-all" size={16} />
                </div>
            </div>
        </motion.div>
    );
};

export default CampaignCard;
