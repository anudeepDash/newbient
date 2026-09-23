import React from 'react';
import { motion } from 'framer-motion';
import { Instagram, FileText, ArrowRight, Zap, MapPin, Users, Award, CheckCircle2 } from 'lucide-react';
import { cn } from '../../lib/utils';

const CampaignCard = ({ campaign, profile, type, onOpenMission }) => {
    const hasJoined = Boolean(profile && (profile.joinedCampaigns || []).includes(campaign.id));
    const isJoined = type === 'joined' || hasJoined;
    const isShortlisted = profile && (profile.shortlistedCampaigns || []).includes(campaign.id);
    const uid = profile?.uid;
    
    const getSubmissionStatus = (task, creatorUid) => {
        if (!task.submissions || !creatorUid) return 'not_started';
        const sub = task.submissions[creatorUid];
        return sub ? sub.status : 'not_started';
    };

    const campaignTasks = campaign.tasks || [];
    const requiredTasks = campaignTasks.filter(t => t.priority !== 'optional');
    
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

    const statusLabel = isFullyComplete ? 'Completed' : isShortlisted ? 'Ongoing' : 'Awaiting';

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileTap={{ scale: 0.985 }}
            onClick={() => onOpenMission(campaign)}
            className="relative group cursor-pointer rounded-3xl overflow-hidden flex flex-col h-full bg-white dark:bg-[#0c0e14] border border-gray-200 dark:border-white/[0.07] shadow-[0_8px_40px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.6)] hover:border-neon-green/40 dark:hover:border-white/[0.15] hover:shadow-[0_16px_60px_rgba(0,0,0,0.12)] dark:hover:shadow-[0_16px_60px_rgba(0,0,0,0.8)] transition-all duration-500"
        >
            {/* Glowing Progress Strip */}
            {isJoined && (
                <div className="absolute top-0 left-0 w-full h-[3px] bg-black/5 dark:bg-white/5 overflow-hidden z-30">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 1.2, ease: 'easeOut' }}
                        className="h-full bg-neon-green shadow-[0_0_12px_rgba(57,255,20,0.8)]"
                    />
                </div>
            )}

            {/* ── Hero Image Block with seamless mask fade ── */}
            <div className="relative w-full aspect-video shrink-0 overflow-hidden">
                {/* Mask layer — image only, not the badges */}
                <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 40%, transparent 100%)',
                        maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 40%, transparent 100%)',
                    }}
                >
                    {campaign.thumbnail ? (
                        <>
                            {/* Ambient aura */}
                            <div
                                className="absolute -inset-8 bg-cover bg-center blur-2xl opacity-80 scale-110 transform-gpu"
                                style={{ backgroundImage: `url(${campaign.thumbnail})` }}
                            />
                            <img
                                src={campaign.thumbnail}
                                alt={campaign.title}
                                className="relative z-10 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                            />
                            {/* Radial edge vignette */}
                            <div className="absolute inset-0 z-10 bg-[radial-gradient(ellipse_at_center,_transparent_50%,_rgba(0,0,0,0.4)_100%)]" />
                        </>
                    ) : (
                        <div className="w-full h-full bg-gradient-to-tr from-gray-100 via-gray-50 to-white dark:from-zinc-950 dark:via-[#121620] dark:to-[#0c0e14]" />
                    )}
                </div>

                {/* Floating badges — outside the mask, fully opaque */}
                <div className="absolute top-3.5 left-3.5 flex items-center gap-2 z-20">
                    <div className="p-1.5 rounded-xl bg-black/60 backdrop-blur-xl border border-white/15 text-neon-green shadow-lg">
                        <Instagram size={13} />
                    </div>
                    <div className="px-2.5 py-1 rounded-xl bg-black/60 backdrop-blur-xl border border-white/15 text-[9px] font-black uppercase tracking-widest text-white shadow-lg flex items-center gap-1.5 font-mono">
                        <MapPin size={9} className="text-neon-green" /> {campaign.targetCity || 'Universal'}
                    </div>
                </div>

                {/* Status badge top-right */}
                {isJoined && (
                    <div className="absolute top-3.5 right-3.5 z-20 flex items-center gap-1.5">
                        {hasNewTasks && (
                            <motion.span
                                animate={{ scale: [1, 1.08, 1] }}
                                transition={{ repeat: Infinity, duration: 2 }}
                                className="px-2 py-0.5 bg-amber-500/20 border border-amber-500/30 rounded-lg text-[8px] font-black uppercase tracking-widest text-amber-400 flex items-center gap-1 backdrop-blur-xl"
                            >
                                <Zap size={8} className="fill-current" /> New
                            </motion.span>
                        )}
                        <span className={cn(
                            'px-2.5 py-1 rounded-xl text-[8px] font-black uppercase tracking-widest border backdrop-blur-xl flex items-center gap-1.5 font-mono shadow-lg',
                            isFullyComplete
                                ? 'bg-neon-green/20 text-neon-green border-neon-green/30'
                                : isShortlisted
                                    ? 'bg-neon-green/15 text-neon-green border-neon-green/20'
                                    : 'bg-black/5 dark:bg-white/5 text-gray-500 dark:text-zinc-400 border-black/10 dark:border-white/10'
                        )}>
                            <span className={cn('w-1.5 h-1.5 rounded-full', isFullyComplete || isShortlisted ? 'bg-neon-green animate-pulse' : 'bg-gray-400 dark:bg-zinc-500')} />
                            {statusLabel}
                        </span>
                    </div>
                )}
            </div>

            {/* ── Card Body (dark glass) ── */}
            <div className="flex flex-col flex-1 px-5 pt-4 pb-5 relative z-10">
                {/* Ambient photo colour spill into body */}
                {campaign.thumbnail && (
                    <div
                        className="absolute top-0 inset-x-0 h-32 bg-cover bg-center blur-[60px] opacity-20 pointer-events-none transform-gpu -z-0"
                        style={{ backgroundImage: `url(${campaign.thumbnail})` }}
                    />
                )}

                {/* Followers pill */}
                <div className="flex items-center justify-between mb-4 relative z-10">
                    <span className="px-2.5 py-1 rounded-lg bg-black/[0.02] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.07] text-[9px] font-black uppercase tracking-widest text-gray-600 dark:text-zinc-400 flex items-center gap-1.5 font-mono">
                        <Users size={9} className="text-neon-green" />
                        {Number(campaign.minInstagramFollowers || 0).toLocaleString()}+ FLW
                    </span>
                    {isJoined && (
                        <span className="text-[9px] font-mono font-bold text-gray-500 dark:text-zinc-500">
                            {approvedTotal}/{campaignTasks.length} done
                        </span>
                    )}
                </div>

                {/* Title & Description */}
                <div className="flex-1 mb-5 relative z-10">
                    <h3 className="text-lg font-black font-heading mb-2 text-gray-900 dark:text-white tracking-tight group-hover:text-emerald-600 dark:group-hover:text-neon-green transition-colors duration-300 leading-snug">
                        {campaign.title}
                    </h3>
                    <p className="text-gray-600 dark:text-zinc-500 text-[11px] line-clamp-2 leading-relaxed font-medium">
                        {(campaign.description || '').replace(/<style[^>]*>[\s\S]*?<\/style>|<script[^>]*>[\s\S]*?<\/script>|<[^>]+>/gi, ' ').replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&quot;/gi, '"').replace(/&#39;/gi, "'").replace(/\s+/g, ' ').trim()}
                    </p>
                </div>

                {/* Metrics row */}
                <div className="flex items-center gap-2 mb-5 relative z-10">
                    <div className="flex-1 flex flex-col items-center py-2.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/[0.06]">
                        <span className="text-[7px] font-black text-gray-500 dark:text-zinc-600 uppercase tracking-widest mb-0.5 flex items-center gap-0.5">
                            <Award size={7} className="text-emerald-600 dark:text-neon-green" /> Reward
                        </span>
                        <span className="text-emerald-600 dark:text-neon-green text-[10px] font-black truncate max-w-full px-1">{campaign.reward || 'Barter'}</span>
                    </div>
                    <div className="flex-1 flex flex-col items-center py-2.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/[0.06]">
                        <span className="text-[7px] font-black text-gray-500 dark:text-zinc-600 uppercase tracking-widest mb-0.5 flex items-center gap-0.5">
                            <FileText size={7} className="text-emerald-600 dark:text-neon-green" /> Tasks
                        </span>
                        <span className="text-gray-900 dark:text-white text-[10px] font-black">
                            {isJoined && isShortlisted ? `${approvedTotal}/${campaignTasks.length}` : `${campaignTasks.length}`}
                        </span>
                    </div>
                    <div className="flex-1 flex flex-col items-center py-2.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/[0.06]">
                        <span className="text-[7px] font-black text-gray-500 dark:text-zinc-600 uppercase tracking-widest mb-0.5 flex items-center gap-0.5">
                            <Zap size={7} className="text-gray-500 dark:text-zinc-600" /> Status
                        </span>
                        <span className={cn('text-[10px] font-black', isFullyComplete || isShortlisted ? 'text-emerald-600 dark:text-neon-green' : 'text-gray-500 dark:text-zinc-400')}>
                            {isJoined && isShortlisted ? `${Math.round(progress)}%` : 'Open'}
                        </span>
                    </div>
                </div>

                {/* CTA Footer */}
                <div className="relative z-10 flex items-center justify-between px-4 py-2.5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.05] dark:border-white/[0.07] hover:bg-emerald-50 hover:border-emerald-200 dark:group-hover:bg-neon-green dark:group-hover:border-neon-green transition-all duration-300 group/cta">
                    <span className="text-[9px] font-black uppercase tracking-[0.18em] text-gray-500 dark:text-zinc-400 group-hover/cta:text-emerald-700 dark:group-hover/cta:text-black transition-colors duration-300 flex items-center gap-1.5">
                        <FileText size={10} />
                        {isJoined ? (isShortlisted ? 'Open Campaign' : 'Applied · View Brief') : 'View Opportunity'}
                    </span>
                    <ArrowRight size={13} className="text-gray-400 dark:text-zinc-500 group-hover/cta:text-emerald-700 dark:group-hover/cta:text-black group-hover/cta:translate-x-1 transition-all duration-300" />
                </div>
            </div>
        </motion.div>
    );
};

export default CampaignCard;
