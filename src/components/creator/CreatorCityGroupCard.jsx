import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../../lib/store';
import { useStoreSubscription } from '../../hooks/useStoreSubscription';
import { DEFAULT_CREATOR_GROUPS } from '../../lib/constants';
import { cn } from '../../lib/utils';
import confetti from 'canvas-confetti';
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right';
import ExternalLink from 'lucide-react/dist/esm/icons/external-link';
import Check from 'lucide-react/dist/esm/icons/check';
import CheckCircle2 from 'lucide-react/dist/esm/icons/check-circle-2';
import Copy from 'lucide-react/dist/esm/icons/copy';

// Standard SVG for WhatsApp
const WhatsAppIcon = ({ className = "w-5 h-5", size = 20 }) => (
    <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        fill="currentColor"
        className={className}
    >
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.456 5.711 1.457h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
);

const normalizeCity = (cityStr = '') => {
    const raw = String(cityStr || '').trim().toLowerCase();
    if (!raw) return 'bengaluru';
    if (/^bang[al]*o?re$/i.test(raw) || raw.includes('bengaluru') || raw.includes('bangalore')) return 'bengaluru';
    if (raw.includes('hyderabad') || raw.includes('secunderabad')) return 'hyderabad';
    if (raw.includes('chandigarh') || raw.includes('mohali') || raw.includes('panchkula') || raw.includes('tricity')) return 'chandigarh';
    if (raw.includes('mumbai') || raw.includes('bombay') || raw.includes('navi mumbai') || raw.includes('thane')) return 'mumbai';
    if (raw.includes('pune') || raw.includes('poona')) return 'pune';
    if (raw.includes('kolkata') || raw.includes('calcutta')) return 'kolkata';
    if (raw.includes('kochi') || raw.includes('cochin') || raw.includes('kerala') || raw.includes('ernakulam')) return 'kochi';
    if (raw.includes('delhi') || raw.includes('ncr') || raw.includes('noida') || raw.includes('gurugram') || raw.includes('gurgaon')) return 'delhi';
    if (raw.includes('bhubaneswar') || raw.includes('bhubaneshwar') || raw.includes('cuttack')) return 'bhubaneswar & cuttack';
    if (raw.includes('vizag') || raw.includes('visakhapatnam')) return 'vizag';
    if (raw.includes('jaipur')) return 'jaipur';
    if (raw.includes('ahmedabad')) return 'ahmedabad';
    if (raw.includes('chennai') || raw.includes('madras')) return 'chennai';
    if (raw.includes('goa')) return 'goa';
    if (raw.includes('indore')) return 'indore';
    if (raw.includes('lucknow')) return 'lucknow';
    if (raw.includes('guwahati')) return 'guwahati';
    if (raw.includes('surat')) return 'surat';
    if (raw.includes('bhopal')) return 'bhopal';
    if (raw.includes('kolhapur')) return 'kolhapur';
    if (raw.includes('shillong')) return 'shillong';
    return raw;
};

const CreatorCityGroupCard = ({
    initialCity = 'Bengaluru',
    creatorId = null,
    isJoined = false,
    onJoinMarked = null,
    className = ''
}) => {
    useStoreSubscription(['creatorGroups']);
    const { creatorGroups, markCreatorCityGroupJoined } = useStore();

    // Merge remote groups with defaults
    const activeGroups = useMemo(() => {
        const remote = (creatorGroups || []).filter(g => g.isActive !== false);
        const map = new Map();
        remote.forEach(g => {
            if (g.city) map.set(normalizeCity(g.city), g);
        });

        const list = [...remote];
        DEFAULT_CREATOR_GROUPS.forEach(dg => {
            const key = normalizeCity(dg.city);
            if (!map.has(key)) {
                list.push(dg);
                map.set(key, dg);
            }
        });
        return list;
    }, [creatorGroups]);

    // Show ONLY for the city they apply for
    const currentGroup = useMemo(() => {
        const targetKey = normalizeCity(initialCity);
        const exact = activeGroups.find(g => normalizeCity(g.city) === targetKey);
        if (exact) return exact;

        const partial = activeGroups.find(g => {
            const gKey = normalizeCity(g.city);
            return gKey.includes(targetKey) || targetKey.includes(gKey);
        });
        if (partial) return partial;

        // Fallback to Pan-India / Remote group if available
        const panIndia = activeGroups.find(g => {
            const gKey = normalizeCity(g.city);
            return gKey.includes('pan-india') || gKey.includes('india') || gKey.includes('remote') || gKey.includes('all');
        });
        if (panIndia) return panIndia;

        // Fallback to primary group if city not in the 8
        return activeGroups[0] || DEFAULT_CREATOR_GROUPS[0];
    }, [activeGroups, initialCity]);

    const isFallback = useMemo(() => {
        if (!currentGroup) return false;
        const targetKey = normalizeCity(initialCity);
        const gKey = normalizeCity(currentGroup.city);
        return gKey !== targetKey && !gKey.includes(targetKey) && !targetKey.includes(gKey);
    }, [currentGroup, initialCity]);

    const [hasJoined, setHasJoined] = useState(isJoined);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        setHasJoined(isJoined);
    }, [isJoined]);

    const handleJoinClick = () => {
        if (currentGroup?.groupUrl) {
            window.open(currentGroup.groupUrl, '_blank', 'noopener,noreferrer');
        }
    };

    const handleMarkJoined = async () => {
        setHasJoined(true);
        try {
            confetti({
                particleCount: 80,
                spread: 70,
                origin: { y: 0.6 }
            });
        } catch (e) {}

        if (creatorId && markCreatorCityGroupJoined) {
            try {
                await markCreatorCityGroupJoined(creatorId);
            } catch (err) {
                console.warn('markJoined error:', err);
            }
        }
        if (onJoinMarked) onJoinMarked(currentGroup);
        useStore.getState().addToast(`Verified! You are now in the ${currentGroup.city} Creators WhatsApp Community. 🎉`, 'success');
    };

    const handleCopyInvite = () => {
        if (!currentGroup?.groupUrl) return;
        navigator.clipboard.writeText(currentGroup.groupUrl);
        setCopied(true);
        useStore.getState().addToast('WhatsApp group link copied!', 'success');
        setTimeout(() => setCopied(false), 2000);
    };

    if (!currentGroup) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
                "relative overflow-hidden rounded-2xl sm:rounded-3xl border transition-all duration-300 group",
                // Mode-based styling
                "bg-white/95 dark:bg-[#0c0e14]/95 backdrop-blur-xl",
                hasJoined
                    ? "bg-gradient-to-r from-emerald-500/[0.08] via-emerald-500/[0.02] to-transparent dark:from-emerald-950/25 dark:via-[#0c0e14] dark:to-zinc-900/20 border-emerald-500/25 dark:border-emerald-500/30"
                    : "bg-gradient-to-r from-amber-500/[0.08] via-emerald-500/[0.03] to-transparent dark:from-amber-950/25 dark:via-[#0c0e14] dark:to-emerald-950/10 border-amber-500/30 dark:border-amber-500/30",
                "shadow-md shadow-emerald-500/[0.03] dark:shadow-[0_15px_35px_rgba(0,0,0,0.4)]",
                "p-4 sm:p-5 md:p-6",
                className
            )}
        >
            {/* Subtle WhatsApp Watermark in corner */}
            <div className="pointer-events-none absolute -right-6 -bottom-6 opacity-[0.03] dark:opacity-[0.06] text-[#25D366]">
                <WhatsAppIcon size={180} />
            </div>

            <div className="relative z-10 flex flex-col gap-4">
                {/* Top: WhatsApp Icon & Text Content */}
                <div className="flex items-start gap-3.5 sm:gap-4 text-left">
                    {/* WhatsApp Icon Badge */}
                    <div className="relative w-12 h-12 sm:w-13 sm:h-13 rounded-2xl bg-gradient-to-br from-[#25D366] to-[#128C7E] text-white flex items-center justify-center shrink-0 shadow-lg shadow-[#25D366]/25 group-hover:scale-105 transition-transform duration-300">
                        <WhatsAppIcon size={24} className="text-white" />
                        <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                            {hasJoined ? (
                                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-[#25D366] border-2 border-white dark:border-[#0c0e14]" />
                            ) : (
                                <>
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                                    <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-amber-400 border-2 border-white dark:border-[#0c0e14]" />
                                </>
                            )}
                        </span>
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className={cn(
                                "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest font-mono border",
                                hasJoined
                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25"
                                    : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                            )}>
                                {hasJoined ? '✓ Joined & Verified' : 'Action Required'}
                            </span>
                            <span className="text-[10px] text-gray-500 dark:text-zinc-500 font-mono">WhatsApp Community</span>
                        </div>

                        {/* Title */}
                        <h4 className="text-base sm:text-lg font-black font-heading tracking-tight text-gray-950 dark:text-white">
                            {hasJoined 
                                ? `Official ${currentGroup.city} Creators WhatsApp Group`
                                : isFallback
                                    ? `${initialCity} Chapter Coming Soon • Join ${currentGroup.city} Hub`
                                    : `Required: Join the ${currentGroup.city} Creators WhatsApp Group`}
                        </h4>

                        {/* Description */}
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-zinc-300 leading-relaxed">
                            {hasJoined ? (
                                <>You are confirmed in the {currentGroup.city} creator network. Campaign briefs, event allocations, and collaboration announcements will be sent to this group.</>
                            ) : isFallback ? (
                                <>We are launching a dedicated WhatsApp community for {initialCity} soon! In the meantime, join our active {currentGroup.city} Creators Hub to receive nationwide brand briefs, concert guestlists, and collab drops.</>
                            ) : (
                                <>All creators based in {currentGroup.city} are required to join this group. Paid campaign briefs, concert passes, event call times, and brand deliverables are shared exclusively here.</>
                            )}
                        </p>
                    </div>
                </div>

                {/* Bottom: Actions */}
                <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 w-full pt-3 border-t border-black/5 dark:border-white/5">
                    <a
                        href={currentGroup.groupUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={handleJoinClick}
                        className="flex-1 sm:flex-none h-11 sm:h-12 px-5 sm:px-6 rounded-xl sm:rounded-2xl bg-gradient-to-r from-[#25D366] to-[#20ba59] hover:brightness-105 active:scale-[0.98] text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md shadow-[#25D366]/25 hover:shadow-lg hover:shadow-[#25D366]/40 transition-all group/btn"
                    >
                        <WhatsAppIcon size={18} className="text-black group-hover/btn:scale-110 transition-transform" />
                        <span>
                            {hasJoined
                                ? 'Open WhatsApp Group'
                                : isFallback
                                    ? `Join ${currentGroup.city} Hub (WhatsApp)`
                                    : `Join ${currentGroup.city} Group (Required)`}
                        </span>
                        <ArrowRight size={14} className="text-black/80 group-hover/btn:translate-x-1 transition-transform" />
                    </a>

                    {!hasJoined ? (
                        <button
                            type="button"
                            onClick={handleMarkJoined}
                            className="h-11 sm:h-12 px-4 rounded-xl sm:rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 dark:bg-amber-500/15 dark:hover:bg-amber-500/25 border border-amber-500/30 text-amber-900 dark:text-amber-200 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all"
                            title="Confirm that you have joined the required group"
                        >
                            <Check size={14} />
                            <span>Confirm I've Joined</span>
                        </button>
                    ) : (
                        <div className="h-11 sm:h-12 px-4 rounded-xl sm:rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-800 dark:text-emerald-400 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5">
                            <CheckCircle2 size={16} className="text-[#25D366]" />
                            <span>Joined &amp; Verified ✓</span>
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={handleCopyInvite}
                        className="h-11 sm:h-12 w-11 sm:w-12 rounded-xl sm:rounded-2xl bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 border border-gray-200 dark:border-white/10 text-gray-600 hover:text-gray-950 dark:text-zinc-400 dark:hover:text-white flex items-center justify-center transition-all shrink-0 ml-auto sm:ml-0"
                        title="Copy WhatsApp Group Link"
                    >
                        {copied ? <Check size={16} className="text-emerald-600 dark:text-emerald-400" /> : <Copy size={16} />}
                    </button>
                </div>
            </div>
        </motion.div>
    );
};

export default CreatorCityGroupCard;
