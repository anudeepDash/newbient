import React, { useRef, useCallback, useState, useMemo, useEffect } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
    ShieldCheck, ArrowRight, LayoutDashboard, 
    User, CheckCircle2, MapPin
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useTheme } from '../../hooks/useTheme';
import { useStore } from '../../lib/store';
import { useStoreSubscription } from '../../hooks/useStoreSubscription';
import { DEFAULT_CREATOR_GROUPS } from '../../lib/constants';
import { requestAutoLocation } from '../../lib/location';
import newbiCreatorsLogoDark from '../../assets/newbi-creators-logo.png';
import newbiCreatorsLogoLight from '../../assets/newbi-creators-logo-light.png';
import StudioSelect from '../ui/StudioSelect';

// Standard SVG for WhatsApp
const WhatsAppIcon = ({ className = "w-4 h-4", size = 16 }) => (
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
    if (/^bang[al]*o?re$/i.test(raw) || raw.includes('bengaluru') || raw.includes('bangalore')) return 'bengaluru';
    if (raw.includes('hyderabad')) return 'hyderabad';
    if (raw.includes('chandigarh')) return 'chandigarh';
    if (raw.includes('mumbai')) return 'mumbai';
    if (raw.includes('pune')) return 'pune';
    if (raw.includes('kolkata') || raw.includes('calcutta')) return 'kolkata';
    if (raw.includes('kochi') || raw.includes('cochin')) return 'kochi';
    if (raw.includes('delhi')) return 'delhi';
    if (raw.includes('bhubaneswar') || raw.includes('bhubaneshwar') || raw.includes('cuttack')) return 'bhubaneswar & cuttack';
    if (raw.includes('vizag') || raw.includes('visakhapatnam')) return 'vizag';
    return raw;
};

/**
 * CreatorPassCard
 * Apple Wallet-inspired creator membership pass.
 * Clean, minimal, with subtle 3D depth on hover.
 */
const CreatorPassCard = ({ 
    profile = null, 
    isPreview = false,
    hideAction = false,
    showWhatsAppGroup = false,
    className = "" 
}) => {
    const navigate = useNavigate();
    const cardRef = useRef(null);
    const { isDark } = useTheme();

    useStoreSubscription(['creatorGroups']);
    const { creatorGroups } = useStore();

    const [selectedCity, setSelectedCity] = useState(() => {
        if (profile?.city && profile.city !== 'Pan-India') return profile.city;
        return 'Bengaluru';
    });

    const [isLocating, setIsLocating] = useState(false);
    const [isAutoDetected, setIsAutoDetected] = useState(false);

    const handleAutoDetectLocation = useCallback(async (isSilent = false) => {
        setIsLocating(true);
        try {
            const result = await requestAutoLocation({ onlyPrimaryHubs: true });
            if (result?.city) {
                setSelectedCity(result.city);
                setIsAutoDetected(true);
                if (!isSilent) {
                    useStore.getState().addToast(`📍 Auto-selected ${result.city} based on your location`, 'success');
                }
            }
        } catch {
            if (!isSilent) {
                useStore.getState().addToast('Location access denied or unavailable. Please pick your city.', 'info');
            }
        } finally {
            setIsLocating(false);
        }
    }, []);

    useEffect(() => {
        if (profile?.city && profile.city !== 'Pan-India') return;
        handleAutoDetectLocation(true);
    }, [profile?.city, handleAutoDetectLocation]);

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

    const currentGroup = useMemo(() => {
        const targetCity = (profile?.city && profile.city !== 'Pan-India') ? profile.city : selectedCity;
        const targetKey = normalizeCity(targetCity);
        const matched = activeGroups.find(g => normalizeCity(g.city) === targetKey)
            || activeGroups.find(g => normalizeCity(g.city).includes(targetKey))
            || activeGroups[0]
            || DEFAULT_CREATOR_GROUPS[0];
        return matched;
    }, [activeGroups, profile?.city, selectedCity]);

    const isRegistered = Boolean(profile) && !isPreview && profile?.profileStatus !== 'unclaimed';
    const isVerified = isRegistered && (profile?.profileStatus === 'approved' || profile?.isVerified);

    const data = {
        name: profile?.displayName || profile?.name || "Reserve Your Pass",
        city: (profile?.city && profile.city !== 'Pan-India') ? profile.city : selectedCity,
        niche: (Array.isArray(profile?.categories) ? profile.categories[0] : profile?.categories) || 
               (Array.isArray(profile?.specializations) ? profile.specializations[0] : profile?.specializations) || 
               "Culture & Lifestyle",
        handle: (profile?.instagramHandle || profile?.instagram || "your.handle").replace('@', ''),
        avatar: profile?.profilePicture || profile?.profileImage || profile?.avatar || profile?.photoURL || profile?.avatarUrl || null,
        status: isVerified ? "approved" : (profile?.profileStatus || (isRegistered ? "pending" : "unclaimed")),
        points: profile?.points !== undefined ? profile.points : 500,
        collabs: isRegistered ? (profile?.joinedCampaigns?.length ?? 0) : "0%",
        passId: profile?.creatorId || (profile?.uid ? `NB-${profile.uid.slice(0, 6).toUpperCase()}` : "NB-88219"),
    };

    // ── 3D MOTION VALUES & SPRING DYNAMICS ────────────────────────────────────
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    const springConfig = { damping: 30, stiffness: 200 };
    const mouseX = useSpring(x, springConfig);
    const mouseY = useSpring(y, springConfig);

    const rotateX = useTransform(mouseY, [-0.5, 0.5], [6, -6]);
    const rotateY = useTransform(mouseX, [-0.5, 0.5], [-8, 8]);

    const glareX = useTransform(mouseX, [-0.5, 0.5], [20, 80]);
    const glareY = useTransform(mouseY, [-0.5, 0.5], [20, 80]);

    const glareBackground = useTransform(
        [glareX, glareY],
        ([gx, gy]) => isDark
            ? `radial-gradient(circle at ${gx}% ${gy}%, rgba(255, 255, 255, 0.06) 0%, transparent 50%)`
            : `radial-gradient(circle at ${gx}% ${gy}%, rgba(255, 255, 255, 0.35) 0%, transparent 50%)`
    );

    const handleMouseMove = useCallback((e) => {
        if (!cardRef.current) return;
        const rect = cardRef.current.getBoundingClientRect();
        const relativeX = (e.clientX - rect.left) / rect.width - 0.5;
        const relativeY = (e.clientY - rect.top) / rect.height - 0.5;
        x.set(Math.max(-0.5, Math.min(0.5, relativeX)));
        y.set(Math.max(-0.5, Math.min(0.5, relativeY)));
    }, [x, y]);

    const handleMouseLeave = useCallback(() => {
        x.set(0);
        y.set(0);
    }, [x, y]);

    const handleTouchMove = useCallback((e) => {
        if (!cardRef.current || !e.touches[0]) return;
        const rect = cardRef.current.getBoundingClientRect();
        const touch = e.touches[0];
        const relativeX = (touch.clientX - rect.left) / rect.width - 0.5;
        const relativeY = (touch.clientY - rect.top) / rect.height - 0.5;
        x.set(Math.max(-0.5, Math.min(0.5, relativeX)));
        y.set(Math.max(-0.5, Math.min(0.5, relativeY)));
    }, [x, y]);

    const handleTouchEnd = useCallback(() => {
        x.set(0);
        y.set(0);
    }, [x, y]);

    return (
        <div className={cn("w-full max-w-[420px] mx-auto select-none", className)}>
            <div className="relative group" style={{ perspective: 900 }}>
                <motion.div
                    ref={cardRef}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    style={{
                        rotateX,
                        rotateY,
                        transformStyle: "preserve-3d"
                    }}
                    className={cn(
                        "relative w-full aspect-[1.6/1] min-h-[200px] sm:min-h-[240px] rounded-[20px] sm:rounded-[24px] overflow-hidden transition-colors duration-300",
                        "bg-white dark:bg-[#111318]",
                        "border border-black/[0.06] dark:border-white/[0.06]",
                        "shadow-[0_2px_20px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_40px_rgba(0,0,0,0.4)]"
                    )}
                >
                    {/* Subtle Glare */}
                    <motion.div 
                        className="pointer-events-none absolute inset-0 z-30 rounded-[20px] sm:rounded-[24px]"
                        style={{ background: glareBackground }}
                    />

                    {/* Card Inner Content */}
                    <div className="relative z-20 h-full flex flex-col justify-between p-5 sm:p-6">
                        
                        {/* TOP: Logo + Pass ID */}
                        <div className="flex items-center justify-between" style={{ transform: "translateZ(16px)" }}>
                            <img 
                                src={isDark ? newbiCreatorsLogoDark : newbiCreatorsLogoLight} 
                                alt="Newbi Creators" 
                                className="h-5 sm:h-[22px] w-auto object-contain opacity-80"
                            />
                            <span className="text-[9px] sm:text-[10px] font-mono tracking-[0.15em] text-gray-400 dark:text-zinc-500 font-semibold">
                                {data.passId}
                            </span>
                        </div>

                        {/* CENTER: Identity */}
                        <div className="flex items-center gap-3 sm:gap-3.5 my-auto" style={{ transform: "translateZ(20px)" }}>
                            {/* Avatar */}
                            <div className="relative shrink-0 w-11 h-11 sm:w-[52px] sm:h-[52px]">
                                <div className="w-full h-full rounded-[14px] sm:rounded-[16px] bg-gray-100 dark:bg-zinc-800/80 overflow-hidden flex items-center justify-center">
                                    {data.avatar ? (
                                        <img src={data.avatar} alt={data.name} className="w-full h-full object-cover" />
                                    ) : (
                                        (isRegistered || (data.name && data.name !== "Reserve Your Pass")) ? (
                                            <span className="font-black text-sm text-gray-400 dark:text-zinc-500 uppercase">
                                                {data.name.charAt(0)}
                                            </span>
                                        ) : (
                                            <User size={18} className="text-gray-300 dark:text-zinc-600" />
                                        )
                                    )}
                                </div>
                                {isVerified && (
                                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-neon-green text-black flex items-center justify-center ring-2 ring-white dark:ring-[#111318]">
                                        <CheckCircle2 size={10} strokeWidth={3} />
                                    </div>
                                )}
                            </div>

                            {/* Name + Handle */}
                            <div className="min-w-0 flex-1">
                                <h3 className="text-[15px] sm:text-lg font-bold tracking-tight text-gray-900 dark:text-white truncate leading-tight">
                                    {data.name}
                                </h3>
                                <p className="text-[10px] sm:text-[11px] text-gray-400 dark:text-zinc-500 truncate mt-0.5 font-medium">
                                    @{data.handle} <span className="mx-1 opacity-40">·</span> {data.city}
                                </p>
                            </div>
                        </div>

                        {/* BOTTOM: Status + Action */}
                        <div 
                            className="flex items-center justify-between gap-2 pt-2.5 border-t border-black/[0.04] dark:border-white/[0.05]"
                            style={{ transform: "translateZ(18px)" }}
                        >
                            <div className="flex items-center gap-2 min-w-0">
                                {/* Status badge */}
                                <div className={cn(
                                    "flex items-center gap-1 px-2 py-1 rounded-lg text-[8px] sm:text-[9px] font-bold uppercase tracking-[0.12em]",
                                    isVerified 
                                        ? "bg-neon-green/10 text-emerald-700 dark:text-neon-green" 
                                        : isRegistered 
                                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                            : "bg-gray-100 dark:bg-white/[0.04] text-gray-400 dark:text-zinc-500"
                                )}>
                                    <span className={cn("w-1.5 h-1.5 rounded-full", isVerified ? "bg-neon-green" : isRegistered ? "bg-amber-400" : "bg-gray-300 dark:bg-zinc-600")} />
                                    {isVerified ? "Verified" : isRegistered ? "Pending" : "Open Pass"}
                                </div>

                                {/* WhatsApp button */}
                                {showWhatsAppGroup && (
                                    <a
                                        href={currentGroup?.groupUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#25D366]/8 hover:bg-[#25D366]/15 text-[#25D366] text-[8px] sm:text-[9px] font-bold uppercase tracking-wide transition-colors"
                                    >
                                        <WhatsAppIcon size={10} />
                                        <span>Join</span>
                                    </a>
                                )}
                            </div>

                            {/* CTA */}
                            {hideAction ? (
                                <span className="text-[8px] sm:text-[9px] font-mono text-gray-300 dark:text-zinc-600 tracking-widest uppercase">
                                    {data.niche}
                                </span>
                            ) : isRegistered ? (
                                <button
                                    type="button"
                                    onClick={() => navigate('/creator-dashboard')}
                                    className="h-7 px-3 rounded-lg bg-gray-900 dark:bg-white text-white dark:text-black font-bold text-[9px] sm:text-[10px] uppercase tracking-wider transition-all flex items-center gap-1 active:scale-95 group/btn"
                                >
                                    <LayoutDashboard size={10} />
                                    <span>Dashboard</span>
                                    <ArrowRight size={10} className="group-hover/btn:translate-x-0.5 transition-transform" />
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => navigate('/creator/join')}
                                    className="h-7 px-3 rounded-lg bg-neon-green text-black font-bold text-[9px] sm:text-[10px] uppercase tracking-wider transition-all flex items-center gap-1 active:scale-95 group/btn"
                                >
                                    <span>Claim Pass</span>
                                    <ArrowRight size={10} className="group-hover/btn:translate-x-0.5 transition-transform" />
                                </button>
                            )}
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default CreatorPassCard;
