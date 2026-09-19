import React, { useRef, useCallback } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
    ShieldCheck, ArrowRight, LayoutDashboard, 
    User, CheckCircle2
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useTheme } from '../../hooks/useTheme';
import newbiCreatorsLogoDark from '../../assets/newbi-creators-logo.png';
import newbiCreatorsLogoLight from '../../assets/newbi-creators-logo-light.png';

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
    className = "" 
}) => {
    const navigate = useNavigate();
    const cardRef = useRef(null);
    const { isDark } = useTheme();

    const isRegistered = Boolean(profile) && !isPreview && profile?.profileStatus !== 'unclaimed';
    const isVerified = isRegistered && (profile?.profileStatus === 'approved' || profile?.isVerified);

    const data = {
        name: profile?.displayName || profile?.name || "Reserve Your Pass",
        city: profile?.city || "Pan-India",
        niche: profile?.categories?.[0] || profile?.specializations?.[0] || "Culture & Lifestyle",
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
                    <div className="flex items-center gap-4 relative z-20 my-auto" style={{ transform: "translateZ(24px)" }}>
                        {/* Avatar */}
                        <div className="relative shrink-0">
                            <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-black text-white dark:bg-zinc-900 border border-black/[0.08] dark:border-white/10 overflow-hidden flex items-center justify-center shadow-sm">
                                {data.avatar ? (
                                    <img src={data.avatar} alt={data.name} className="w-full h-full object-cover" />
                                ) : (
                                    (isRegistered || (data.name && data.name !== "Reserve Your Pass")) ? (
                                        <span className="font-black text-lg text-neon-green">
                                            {data.name.charAt(0).toUpperCase()}
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
                            <div className="flex items-center gap-2">
                                <h3 className="text-lg sm:text-xl font-black tracking-tight text-gray-950 dark:text-white truncate font-heading">
                                    {data.name}
                                </h3>
                                {isVerified ? (
                                    <CheckCircle2 size={15} className="text-neon-green shrink-0" />
                                ) : (
                                    <span className="px-1.5 py-0.5 rounded bg-neon-green/20 border border-neon-green/40 text-black dark:text-neon-green text-[8px] font-black uppercase tracking-wider font-mono">
                                        RESERVED
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-gray-500 dark:text-zinc-400 font-medium truncate mt-0.5">
                                @{data.handle} <span className="mx-1 text-gray-300 dark:text-zinc-700">&bull;</span> {data.city} <span className="mx-1 text-gray-300 dark:text-zinc-700">&bull;</span> {data.niche}
                            </p>
                        </div>
                    </div>

                    {/* METRICS & STATUS: Clean borderless stat row with hairline dividers */}
                    <div 
                        className="grid grid-cols-3 divide-x divide-black/[0.06] dark:divide-white/[0.08] py-2.5 border-y border-black/[0.06] dark:border-white/[0.08] relative z-20"
                        style={{ transform: "translateZ(18px)" }}
                    >
                        <div className="text-center px-2">
                            <p className="text-sm sm:text-base font-black font-mono tracking-tight text-gray-950 dark:text-white">
                                {data.points.toLocaleString()} <span className="text-[10px] font-normal text-gray-400 dark:text-zinc-500">PTS</span>
                            </p>
                            <span className="inline-block text-[8px] font-black uppercase tracking-widest text-black dark:text-neon-green bg-neon-green/25 dark:bg-transparent px-1.5 py-0.5 rounded mt-0.5">
                                {isRegistered ? "Redeemable" : "Welcome Bonus"}
                            </span>
                        </div>
                        <div className="text-center px-2">
                            <p className="text-sm sm:text-base font-black font-mono tracking-tight text-gray-950 dark:text-white">
                                {data.collabs}
                            </p>
                            <span className="text-[8px] font-bold uppercase tracking-widest text-gray-400 dark:text-zinc-500 block mt-0.5">
                                {isRegistered ? "Collaborations" : "Agency Cut"}
                            </span>
                        </div>
                        <div className="text-center px-2">
                            <p className="text-sm sm:text-base font-black tracking-tight text-gray-950 dark:text-neon-green">
                                {isRegistered ? "Verified" : "Tier 1"}
                            </p>
                            <span className="text-[8px] font-bold uppercase tracking-widest text-gray-400 dark:text-zinc-500 block mt-0.5">
                                All-Access Pass
                            </span>
                        </div>
                    </div>

                    {/* BOTTOM ROW: Subtle Pass Indicator & Newbi Green Pill CTA */}
                    <div className="flex items-center justify-between pt-1 relative z-20" style={{ transform: "translateZ(22px)" }}>
                        <span className="text-[9px] font-mono tracking-widest text-gray-400 dark:text-zinc-500 uppercase flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-neon-green inline-block" />
                            {isRegistered ? "Authorized Member" : "Official Creator Pass"}
                        </span>

                        {hideAction ? (
                            <div className="h-8 px-3 rounded-xl bg-neon-green/10 border border-neon-green/25 text-neon-green font-black text-[10px] uppercase tracking-wider flex items-center gap-1.5 font-mono">
                                <span className="w-1.5 h-1.5 rounded-full bg-neon-green" />
                                <span>{isVerified ? "Verified Pass" : "Active Member"}</span>
                            </div>
                        ) : isRegistered ? (
                            <button
                                type="button"
                                onClick={() => navigate('/creator-dashboard')}
                                className="h-8 px-4 rounded-xl bg-neon-green hover:bg-black hover:text-white text-black font-black text-[10px] uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(57,255,20,0.3)] active:scale-95 group/btn"
                            >
                                <LayoutDashboard size={11} />
                                <span>Dashboard</span>
                                <ArrowRight size={11} className="group-hover/btn:translate-x-0.5 transition-transform" />
                            </button>
                        ) : isPreview ? (
                            <div className="h-8 px-3.5 rounded-xl bg-neon-green/20 border border-neon-green/40 text-black dark:text-neon-green font-black text-[10px] uppercase tracking-wider flex items-center gap-1.5 font-mono">
                                <span className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse" />
                                <span>Live Preview</span>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => navigate('/creator/join')}
                                className="h-8 px-4 rounded-xl bg-neon-green hover:bg-black hover:text-white text-black font-black text-[10px] uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(57,255,20,0.3)] active:scale-95 group/btn"
                            >
                                <span>Claim Pass</span>
                                <ArrowRight size={11} className="group-hover/btn:translate-x-0.5 transition-transform" />
                            </button>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </div>
    );
};

export default CreatorPassCard;
