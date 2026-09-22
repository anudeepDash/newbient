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
 * Ultra-luxury Minimalist Mode-Based Creator Membership Pass (One-Sided).
 * Features official Newbi Creators logo, pure Newbi Green (#39FF14),
 * and clean glare with zero muddy washouts.
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

    // Automatically request location access on mount if profile city is not already established
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

    const springConfig = { damping: 26, stiffness: 280 };
    const mouseX = useSpring(x, springConfig);
    const mouseY = useSpring(y, springConfig);

    const rotateX = useTransform(mouseY, [-0.5, 0.5], [11, -11]);
    const rotateY = useTransform(mouseX, [-0.5, 0.5], [-13, 13]);

    const glareX = useTransform(mouseX, [-0.5, 0.5], [15, 85]);
    const glareY = useTransform(mouseY, [-0.5, 0.5], [15, 85]);

    // Clean specular reflection: pure subtle white in Light Mode (no green blob!), subtle neon sheen in Dark Mode
    const glareBackground = useTransform(
        [glareX, glareY],
        ([gx, gy]) => isDark
            ? `radial-gradient(circle at ${gx}% ${gy}%, rgba(255, 255, 255, 0.12) 0%, rgba(57, 255, 20, 0.08) 25%, transparent 60%)`
            : `radial-gradient(circle at ${gx}% ${gy}%, rgba(255, 255, 255, 0.45) 0%, transparent 55%)`
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
        <div className={cn("w-full max-w-[480px] mx-auto select-none", className)}>
            {/* Outer 3D Perspective Stage */}
            <motion.div
                ref={cardRef}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                style={{ 
                    perspective: 1200,
                    WebkitPerspective: 1200,
                    touchAction: "pan-y",
                }}
                className="relative group"
            >
                {/* Ambient Aura: Soft clean shadow, zero muddy green in Light Mode */}
                <div className="absolute -inset-2 rounded-[2.5rem] blur-2xl transition-opacity duration-700 pointer-events-none opacity-0 dark:opacity-30 dark:bg-neon-green/10" />

                {/* 3D Tilting Card Container (One-Sided Luxury Pass) */}
                <motion.div
                    style={{
                        rotateX,
                        rotateY,
                        transformStyle: "preserve-3d",
                        WebkitTransformStyle: "preserve-3d",
                        WebkitBackfaceVisibility: "hidden",
                        backfaceVisibility: "hidden",
                        WebkitMaskImage: "-webkit-radial-gradient(white, black)",
                    }}
                    className={cn(
                        "relative w-full aspect-[1.586/1] min-h-[210px] sm:min-h-[260px] rounded-[20px] sm:rounded-[26px] p-4 sm:p-6 backdrop-blur-2xl flex flex-col justify-between overflow-hidden transition-colors duration-300 will-change-transform",
                        // Light Mode: Crisp White Ceramic with razor-sharp contrast
                        "bg-white text-gray-900 border border-black/[0.08] shadow-[0_20px_45px_-15px_rgba(0,0,0,0.07),0_1px_2px_rgba(0,0,0,0.03)] ring-1 ring-black/[0.02]",
                        // Dark Mode: Matte Obsidian Titanium with Newbi Green accent
                        "dark:bg-[#0B0D13] dark:text-white dark:border-white/10 dark:ring-1 dark:ring-neon-green/20 dark:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)]"
                    )}
                >
                    {/* Dynamic Glare Overlay (Clean Specular Highlight) */}
                    <motion.div 
                        className="pointer-events-none absolute inset-0 rounded-[20px] sm:rounded-[26px] transition-opacity duration-300 z-30"
                        style={{ background: glareBackground }}
                    />

                    {/* TOP ROW: Official Logo & Pass ID */}
                    <div className="flex items-center justify-between relative z-20" style={{ transform: "translateZ(20px)" }}>
                        <div className="flex items-center">
                            <img 
                                src={isDark ? newbiCreatorsLogoDark : newbiCreatorsLogoLight} 
                                alt="Newbi Creators" 
                                className="h-6 sm:h-7 w-auto object-contain"
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono tracking-widest text-gray-400 dark:text-zinc-500 font-semibold px-2 py-0.5 rounded-md bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.04] dark:border-white/[0.05]">
                                {data.passId}
                            </span>
                        </div>
                    </div>

                    {/* CENTERPIECE: Identity & Avatar */}
                    <div className="flex items-center gap-3.5 sm:gap-4 relative z-20 my-auto py-1" style={{ transform: "translateZ(24px)" }}>
                        {/* Avatar */}
                        <div className="relative shrink-0 w-12 h-12 sm:w-14 sm:h-14">
                            <div className="w-full h-full rounded-2xl bg-black text-white dark:bg-zinc-900 border border-black/[0.08] dark:border-white/10 overflow-hidden flex items-center justify-center shadow-sm">
                                {data.avatar ? (
                                    <img src={data.avatar} alt={data.name} className="w-full h-full object-cover" />
                                ) : (
                                    (isRegistered || (data.name && data.name !== "Reserve Your Pass")) ? (
                                        <span className="font-black text-[10px] sm:text-xs tracking-wider uppercase text-neon-green">
                                            {data.niche.split(' ')[0].substring(0, 5)}
                                        </span>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center text-zinc-300 dark:text-zinc-300">
                                            <User size={18} />
                                            <span className="text-[7px] font-black tracking-wider uppercase text-neon-green mt-0.5">+YOU</span>
                                        </div>
                                    )
                                )}
                            </div>
                            {isVerified && (
                                <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-neon-green text-black flex items-center justify-center shadow-sm">
                                    <ShieldCheck size={10} strokeWidth={3} />
                                </div>
                            )}
                        </div>

                        {/* Name & Handle */}
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 sm:gap-2">
                                <h3 className="text-base sm:text-xl font-black tracking-tight text-gray-950 dark:text-white truncate font-heading">
                                    {data.name}
                                </h3>
                                {isVerified ? (
                                    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-neon-green/20 border border-neon-green/40 text-black dark:text-neon-green text-[8px] font-black uppercase tracking-wider font-mono shrink-0">
                                        <CheckCircle2 size={10} /> VERIFIED
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-gray-500/20 border border-gray-500/40 text-gray-700 dark:text-gray-300 text-[8px] font-black uppercase tracking-wider font-mono shrink-0">
                                        UNVERIFIED
                                    </div>
                                )}
                            </div>
                            <p className="text-[11px] sm:text-xs text-gray-500 dark:text-zinc-400 font-medium truncate mt-0.5">
                                @{data.handle} <span className="mx-1 text-gray-300 dark:text-zinc-700">&bull;</span> {data.city} <span className="mx-1 text-gray-300 dark:text-zinc-700">&bull;</span> {data.niche}
                            </p>
                        </div>
                    </div>

                    {/* VIP MEMBERSHIP AUTHENTICATION STRIP */}
                    <div 
                        className="flex items-center justify-between py-1.5 sm:py-2 border-t border-black/[0.06] dark:border-white/[0.08] relative z-20"
                        style={{ transform: "translateZ(18px)" }}
                    >
                        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                            <span className="text-[8px] sm:text-[9px] font-mono tracking-widest text-gray-500 dark:text-zinc-400 uppercase flex items-center gap-1.5 shrink-0">
                                <span className="w-1.5 h-1.5 rounded-full bg-neon-green inline-block animate-pulse" />
                                {isVerified ? "VERIFIED ROSTER" : isRegistered ? "REGISTERED CREATOR" : "ALL-ACCESS PASS"}
                            </span>
                            {data.niche && data.niche !== 'C' && (
                                <span className="hidden xs:inline-block px-1.5 sm:px-2 py-0.5 rounded-md bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.04] dark:border-white/[0.06] text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-gray-600 dark:text-zinc-400 truncate max-w-[120px]">
                                    {data.niche}
                                </span>
                            )}
                        </div>

                        {/* Monospace Barcode Aesthetic */}
                        <div className="flex items-center gap-1 font-mono text-[8px] sm:text-[9px] text-gray-300 dark:text-zinc-600 tracking-widest select-none shrink-0">
                            <span>|||</span><span>|</span><span>||</span><span>||||</span><span>|</span><span>||</span>
                        </div>
                    </div>

                    {/* BOTTOM ROW: Subtle Pass Indicator & Newbi Green Pill CTA */}
                    <div className="flex items-center justify-between pt-1 relative z-20 gap-2" style={{ transform: "translateZ(22px)" }}>
                        {showWhatsAppGroup ? (
                            <a
                                href={currentGroup?.groupUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="h-7 sm:h-8 px-2.5 sm:px-3 rounded-xl bg-black/[0.04] hover:bg-[#25D366]/15 dark:bg-white/[0.06] dark:hover:bg-[#25D366]/20 border border-black/[0.08] dark:border-white/[0.08] hover:border-[#25D366]/30 dark:hover:border-[#25D366]/40 text-gray-800 dark:text-zinc-200 text-[9px] sm:text-[10px] font-bold tracking-wide transition-all flex items-center gap-1.5 shadow-2xs group/wa shrink-0"
                                title={`Join ${currentGroup?.city || ''} Creators WhatsApp Group`}
                            >
                                <WhatsAppIcon size={12} className="text-[#25D366]" />
                                <span>Join WhatsApp</span>
                            </a>
                        ) : (
                            <span className="text-[8px] sm:text-[9px] font-mono tracking-widest text-gray-400 dark:text-zinc-500 uppercase flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-neon-green inline-block" />
                                {isRegistered ? "Authorized Member" : "Official Creator Pass"}
                            </span>
                        )}

                        {hideAction ? (
                            <div className="h-7 sm:h-8 px-2.5 sm:px-3 rounded-xl bg-neon-green/10 border border-neon-green/25 text-neon-green font-black text-[9px] sm:text-[10px] uppercase tracking-wider flex items-center gap-1.5 font-mono shrink-0">
                                <span className="w-1.5 h-1.5 rounded-full bg-neon-green" />
                                <span>{isVerified ? "Verified Pass" : "Active Member"}</span>
                            </div>
                        ) : isRegistered ? (
                            <button
                                type="button"
                                onClick={() => navigate('/creator-dashboard')}
                                className="h-7 sm:h-8 px-3 sm:px-4 rounded-xl bg-neon-green hover:bg-black hover:text-white text-black font-black text-[9px] sm:text-[10px] uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(57,255,20,0.3)] active:scale-95 group/btn shrink-0"
                            >
                                <LayoutDashboard size={11} />
                                <span>Dashboard</span>
                                <ArrowRight size={11} className="group-hover/btn:translate-x-0.5 transition-transform" />
                            </button>
                        ) : isPreview ? (
                            <button
                                type="button"
                                onClick={() => navigate('/creator/join')}
                                className="h-7 sm:h-8 px-3 sm:px-4 rounded-xl bg-neon-green hover:bg-black hover:text-white text-black font-black text-[9px] sm:text-[10px] uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(57,255,20,0.3)] active:scale-95 group/btn shrink-0"
                            >
                                <span>Claim Pass</span>
                                <ArrowRight size={11} className="group-hover/btn:translate-x-0.5 transition-transform" />
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() => navigate('/creator/join')}
                                className="h-7 sm:h-8 px-3 sm:px-4 rounded-xl bg-neon-green hover:bg-black hover:text-white text-black font-black text-[9px] sm:text-[10px] uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(57,255,20,0.3)] active:scale-95 group/btn shrink-0"
                            >
                                <span>Claim Pass</span>
                                <ArrowRight size={11} className="group-hover/btn:translate-x-0.5 transition-transform" />
                            </button>
                        )}
                    </div>
                </motion.div>
            </motion.div>

            {/* Optional Companion City Group Join Card */}
            {showWhatsAppGroup && (
                <motion.div 
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full mt-3.5"
                >
                    <div className="p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-[#0c0e14] border border-black/[0.08] dark:border-white/[0.08] flex items-center justify-between gap-2.5 sm:gap-3 shadow-xs">
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <div className="w-8 h-8 rounded-xl bg-[#25D366]/15 text-[#25D366] flex items-center justify-center shrink-0">
                                <WhatsAppIcon size={16} />
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                    <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                                        {currentGroup?.city} Creators WhatsApp
                                    </p>
                                    <span className="text-[9px] font-mono text-emerald-600 dark:text-neon-green font-bold shrink-0">
                                        • Required
                                    </span>
                                </div>
                                <p className="text-[10px] text-gray-500 dark:text-zinc-400 truncate">
                                    Brand briefs, concert guestlists &amp; deliverables
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                            {(!profile?.city || profile.city === 'Pan-India') && (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => handleAutoDetectLocation(false)}
                                        disabled={isLocating}
                                        title={isAutoDetected ? `Auto-detected: ${selectedCity}` : "Auto-detect my location"}
                                        className={cn(
                                            "h-8 px-2 sm:px-2.5 rounded-xl border flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer shrink-0",
                                            isAutoDetected
                                                ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-neon-green"
                                                : "bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.08] dark:border-white/[0.08] text-gray-600 dark:text-zinc-400 hover:text-black dark:hover:text-white"
                                        )}
                                    >
                                        <MapPin size={11} className={isLocating ? "animate-pulse text-emerald-600 dark:text-neon-green" : ""} />
                                        <span className="hidden sm:inline">{isLocating ? "Locating..." : isAutoDetected ? "Auto" : "Detect"}</span>
                                    </button>
                                    <div className="w-24 xs:w-28 sm:w-36 shrink-0">
                                        <StudioSelect
                                            value={selectedCity}
                                            onChange={(val) => {
                                                setSelectedCity(val);
                                                setIsAutoDetected(false);
                                            }}
                                            options={activeGroups.map(g => ({ value: g.city, label: g.city }))}
                                            size="sm"
                                            accentColor="neon-green"
                                            searchable={false}
                                        />
                                    </div>
                                </>
                            )}
                            <a
                                href={currentGroup?.groupUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="h-8 px-3 sm:px-3.5 rounded-xl bg-gray-950 dark:bg-white text-white dark:text-black hover:bg-black dark:hover:bg-zinc-200 font-bold text-[10px] uppercase tracking-wider flex items-center gap-1 transition-all shadow-xs shrink-0"
                            >
                                <span>Join</span>
                                <ArrowRight size={11} />
                            </a>
                        </div>
                    </div>
                </motion.div>
            )}
        </div>
    );
};

export default CreatorPassCard;
