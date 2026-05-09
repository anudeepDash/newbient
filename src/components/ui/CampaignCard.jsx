import React from 'react';
import { motion } from 'framer-motion';
import { Instagram, FileText, ArrowRight } from 'lucide-react';
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
            className="bg-zinc-900/40 backdrop-blur-3xl border border-white/10 hover:border-neon-blue/40 shadow-xl rounded-[2rem] overflow-hidden flex flex-col group transition-all duration-500 h-full relative cursor-pointer active:scale-[0.98]"
        >
            {/* Progress Strip */}
            {isJoined && (
                <div className="absolute top-0 left-0 w-full h-1 bg-white/5 overflow-hidden z-10">
                    <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        className={cn("h-full transition-all duration-1000", isFullyComplete ? "bg-neon-green" : "bg-neon-blue")}
                    />
                </div>
            )}

            <div className="p-5 md:p-6 flex flex-col flex-1 relative">
                {/* Header Row */}
                <div className="flex items-start justify-between mb-4 md:mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 md:p-2.5 rounded-xl bg-white/5 border border-white/5 text-neon-blue group-hover:bg-neon-blue/10 transition-colors">
                            <Instagram size={16} md={18} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[8px] md:text-[9px] font-black text-white/40 uppercase tracking-widest">{campaign.targetCity || 'Universal'}</span>
                            <span className="text-[9px] md:text-[10px] font-bold text-gray-500 uppercase tracking-wider">{Number(campaign.minInstagramFollowers || 0).toLocaleString()} Followers</span>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        {isJoined && hasNewTasks && (
                            <motion.span 
                                initial={{ scale: 0.8 }} 
                                animate={{ scale: [0.8, 1.1, 1] }} 
                                transition={{ repeat: Infinity, duration: 2 }}
                                className="px-2 py-0.5 bg-yellow-500/10 border border-yellow-500/20 rounded-md text-[6px] md:text-[7px] font-black uppercase tracking-widest text-yellow-500 flex items-center justify-center"
                            >
                                New Deliverables
                            </motion.span>
                        )}
                        {isJoined && (
                            <div className={cn(
                                "px-2.5 md:px-3 py-1 rounded-lg text-[7px] md:text-[8px] font-black uppercase tracking-widest border backdrop-blur-md shadow-sm flex items-center justify-center",
                                isFullyComplete ? "bg-neon-green/10 text-neon-green border-neon-green/20" :
                                isShortlisted ? "bg-neon-blue/10 text-neon-blue border-neon-blue/20" : 
                                "bg-zinc-800 text-gray-400 border-white/5"
                            )}>
                                {isFullyComplete ? 'MISSION COMPLETE' : isShortlisted ? 'IN-PROGRESS' : 'PENDING APPROVAL'}
                            </div>
                        )}
                    </div>
                </div>

                {/* Title */}
                <div className="flex-1">
                    <h3 className="text-lg md:text-xl font-black font-heading mb-1 md:mb-2 text-white tracking-tight uppercase group-hover:text-neon-blue transition-colors italic">
                        {campaign.title}
                    </h3>
                    <p className="text-gray-400 text-[10px] md:text-[11px] line-clamp-2 leading-relaxed font-medium mb-5 md:mb-6 pr-4">
                        {(campaign.description || '').replace(/<[^>]*>/g, ' ')}
                    </p>
                    
                    <div className="flex items-center gap-4 md:gap-6 mt-auto">
                        <div className="flex flex-col">
                            <span className="text-[7px] md:text-[8px] font-black text-gray-600 uppercase tracking-widest">BOUNTY</span>
                            <span className="text-neon-green text-xs md:text-sm font-black italic">{campaign.reward || 'Barter'}</span>
                        </div>
                        <div className="w-px h-6 md:h-8 bg-white/10" />
                        <div className="flex flex-col">
                            <span className="text-[7px] md:text-[8px] font-black text-gray-600 uppercase tracking-widest">DELIVERABLES</span>
                            <span className="text-white text-xs md:text-sm font-black">
                                {isJoined && isShortlisted ? `${approvedTotal}/${campaignTasks.length}` : `${campaignTasks.length} Segments`}
                            </span>
                        </div>
                        {isJoined && isShortlisted && (
                            <>
                                <div className="w-px h-6 md:h-8 bg-white/10" />
                                <div className="flex flex-col">
                                    <span className="text-[7px] md:text-[8px] font-black text-gray-600 uppercase tracking-widest">STATUS</span>
                                    <span className={cn("text-xs md:text-sm font-black", isFullyComplete ? 'text-neon-green' : 'text-neon-blue')}>{Math.round(progress)}%</span>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-5 md:mt-6 pt-4 md:pt-5 border-t border-white/5 flex items-center justify-between">
                    <div className="text-[8px] font-black uppercase tracking-[0.2em] text-gray-500 flex items-center gap-2">
                        <FileText size={12} className="group-hover:text-neon-blue transition-colors" /> 
                        {isJoined && isShortlisted ? 'Open Mission' : 'View Brief'}
                    </div>
                    <ArrowRight className="text-gray-700 group-hover:text-neon-blue group-hover:translate-x-1 transition-all" size={14} md={16} />
                </div>
            </div>
        </motion.div>
    );
};

export default CampaignCard;
