import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../lib/store';
import { useStoreSubscription } from '../hooks/useStoreSubscription';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn, normalizePhoneNumber } from '../lib/utils';
import { useTheme } from '../hooks/useTheme';
import GlobalLoader from '../components/ui/GlobalLoader';
import CampaignCard from '../components/ui/CampaignCard';
import useDynamicMeta from '../hooks/useDynamicMeta';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

// Lucide icon imports
import MapPin from 'lucide-react/dist/esm/icons/map-pin';
import ShieldCheck from 'lucide-react/dist/esm/icons/shield-check';
import Zap from 'lucide-react/dist/esm/icons/zap';
import Settings from 'lucide-react/dist/esm/icons/settings';
import Instagram from 'lucide-react/dist/esm/icons/instagram';
import Clock from 'lucide-react/dist/esm/icons/clock';
import Link2 from 'lucide-react/dist/esm/icons/link-2';
import Youtube from 'lucide-react/dist/esm/icons/youtube';
import Twitter from 'lucide-react/dist/esm/icons/twitter';
import Linkedin from 'lucide-react/dist/esm/icons/linkedin';
import Copy from 'lucide-react/dist/esm/icons/copy';
import Phone from 'lucide-react/dist/esm/icons/phone';
import Award from 'lucide-react/dist/esm/icons/award';
import TrendingUp from 'lucide-react/dist/esm/icons/trending-up';
import Users from 'lucide-react/dist/esm/icons/users';
import Briefcase from 'lucide-react/dist/esm/icons/briefcase';
import CheckCircle2 from 'lucide-react/dist/esm/icons/check-circle-2';
import Check from 'lucide-react/dist/esm/icons/check';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import Lock from 'lucide-react/dist/esm/icons/lock';
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right';
import Share2 from 'lucide-react/dist/esm/icons/share-2';
import ExternalLink from 'lucide-react/dist/esm/icons/external-link';
import Layers from 'lucide-react/dist/esm/icons/layers';
import Radio from 'lucide-react/dist/esm/icons/radio';
import Music from 'lucide-react/dist/esm/icons/music';
import Shirt from 'lucide-react/dist/esm/icons/shirt';
import Mic from 'lucide-react/dist/esm/icons/mic';
import Flame from 'lucide-react/dist/esm/icons/flame';
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right';
import Coins from 'lucide-react/dist/esm/icons/coins';
import Trophy from 'lucide-react/dist/esm/icons/trophy';
import Search from 'lucide-react/dist/esm/icons/search';
import Filter from 'lucide-react/dist/esm/icons/filter';
import X from 'lucide-react/dist/esm/icons/x';
import Globe from 'lucide-react/dist/esm/icons/globe';
import Compass from 'lucide-react/dist/esm/icons/compass';
import MessageCircle from 'lucide-react/dist/esm/icons/message-circle';



const getSubmissionStatus = (task, uid) => {
    const sub = task.submissions?.[uid];
    if (sub) return sub.status;
    if ((task.verifiedBy || []).includes(uid)) return 'approved';
    if ((task.completedBy || []).includes(uid)) return 'submitted';
    return 'not_started';
};

const renderRankBadge = (rank) => {
    if (rank === 1) {
        return (
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-amber-400/20 text-amber-500 dark:text-amber-300 border border-amber-400/30 font-black text-xs font-mono">
                1
            </span>
        );
    }
    if (rank === 2) {
        return (
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-zinc-300/20 text-zinc-700 dark:text-zinc-300 border border-zinc-400/30 font-black text-xs font-mono">
                2
            </span>
        );
    }
    if (rank === 3) {
        return (
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-amber-600/20 text-amber-700 dark:text-amber-400 border border-amber-600/30 font-black text-xs font-mono">
                3
            </span>
        );
    }
    return <span className="text-gray-400 dark:text-zinc-500 font-mono text-xs pl-1.5 font-bold">#{rank}</span>;
};

/**
 * Modern Creator Referrals View
 */
const CreatorReferralsView = ({ profile }) => {
    const { creators } = useStore();
    const [copied, setCopied] = useState(false);

    const referralLink = `${window.location.origin}/creator/join?ref=${profile.creatorId || profile.uid.slice(0, 8).toUpperCase()}`;

    const handleCopy = () => {
        navigator.clipboard.writeText(referralLink);
        setCopied(true);
        useStore.getState().addToast("Referral link copied to clipboard!", "success");
        setTimeout(() => setCopied(false), 2000);
    };

    const myReferrals = useMemo(() => {
        return (creators || []).filter(c =>
            c.referredBy === profile.uid ||
            (profile.creatorId && c.referredBy && c.referredBy.toUpperCase() === profile.creatorId.toUpperCase()) ||
            (profile.instagram && c.referredBy && c.referredBy.toLowerCase() === profile.instagram.toLowerCase()) ||
            (profile.linkedin && c.referredBy && c.referredBy.toLowerCase() === profile.linkedin.toLowerCase())
        );
    }, [creators, profile]);

    const approvedCount = myReferrals.filter(c => c.profileStatus === 'approved').length;

    const leaderboard = useMemo(() => {
        const counts = {};
        (creators || []).forEach(c => {
            if (c.referredBy) {
                const referrer = creators.find(rc =>
                    rc.uid === c.referredBy ||
                    (rc.creatorId && rc.creatorId.toUpperCase() === c.referredBy.toUpperCase()) ||
                    (rc.instagram && rc.instagram.toLowerCase() === c.referredBy.toLowerCase()) ||
                    (rc.linkedin && rc.linkedin.toLowerCase() === c.referredBy.toLowerCase())
                );
                if (referrer) {
                    counts[referrer.uid] = (counts[referrer.uid] || 0) + 1;
                }
            }
        });
        return (creators || [])
            .map(c => ({ ...c, referralCount: counts[c.uid] || 0 }))
            .filter(c => c.referralCount > 0)
            .sort((a, b) => b.referralCount - a.referralCount);
    }, [creators]);

    const myRank = leaderboard.findIndex(c => c.uid === profile.uid) + 1;

    return (
        <div className="space-y-6">
            {/* Top Row: Link Sharing Card & Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                <div className="lg:col-span-8 bg-white dark:bg-[#0c0e14] border border-black/[0.08] dark:border-white/[0.08] rounded-3xl p-6 sm:p-8 shadow-sm dark:shadow-[0_20px_50px_rgba(0,0,0,0.6)] relative overflow-hidden transition-colors">
                    <div className="flex items-center gap-2 text-emerald-600 dark:text-neon-green font-black tracking-widest text-[10px] uppercase mb-3">
                        <Link2 size={13} />
                        <span>Creator Referral Network</span>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-black font-heading text-gray-950 dark:text-white tracking-tight">
                        Grow Your Creator Collective
                    </h3>
                    <p className="text-gray-500 dark:text-zinc-400 text-xs sm:text-sm font-normal mt-1.5 mb-6 max-w-xl leading-relaxed">
                        Share your personal invite link. For every creator who joins and verifies their profile, you earn <span className="font-bold text-gray-900 dark:text-white">+250 Creator Points</span> towards festival guestlists and gear drops.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="flex-1 h-12 bg-gray-50 dark:bg-black/50 border border-black/10 dark:border-white/10 rounded-xl px-4 flex items-center text-xs font-mono text-gray-900 dark:text-zinc-200 truncate select-all">
                            {referralLink}
                        </div>
                        <button 
                            type="button"
                            onClick={handleCopy} 
                            className="h-12 px-6 rounded-xl bg-neon-green text-black font-black uppercase tracking-wider text-xs hover:bg-emerald-400 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(57,255,20,0.25)] shrink-0"
                        >
                            {copied ? <Check size={14} /> : <Copy size={14} />}
                            <span>{copied ? 'Link Copied' : 'Copy Invite Link'}</span>
                        </button>
                    </div>
                </div>

                <div className="lg:col-span-4 bg-white dark:bg-[#0c0e14] border border-black/[0.08] dark:border-white/[0.08] rounded-3xl p-6 sm:p-8 shadow-sm dark:shadow-[0_20px_50px_rgba(0,0,0,0.6)] flex flex-col justify-between transition-colors">
                    <div className="flex items-center gap-2 text-gray-500 dark:text-zinc-400 font-black tracking-widest text-[10px] uppercase mb-4">
                        <TrendingUp size={13} className="text-neon-green" />
                        <span>Invite Metrics</span>
                    </div>
                    <div className="grid grid-cols-3 divide-x divide-black/[0.06] dark:divide-white/[0.08] py-2">
                        <div className="flex flex-col items-center px-1">
                            <span className="text-2xl sm:text-3xl font-black font-heading text-gray-950 dark:text-white">{myReferrals.length}</span>
                            <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 dark:text-zinc-500 mt-1">Invited</span>
                        </div>
                        <div className="flex flex-col items-center px-1">
                            <span className="text-2xl sm:text-3xl font-black font-heading text-emerald-600 dark:text-neon-green">{approvedCount}</span>
                            <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 dark:text-zinc-500 mt-1">Verified</span>
                        </div>
                        <div className="flex flex-col items-center px-1">
                            <span className="text-2xl sm:text-3xl font-black font-heading text-gray-950 dark:text-white">{myRank > 0 ? `#${myRank}` : '—'}</span>
                            <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 dark:text-zinc-500 mt-1">Rank</span>
                        </div>
                    </div>
                    <div className="pt-4 border-t border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-zinc-400">
                        <span>Conversion</span>
                        <span className="font-mono text-gray-900 dark:text-white">
                            {myReferrals.length > 0 ? Math.round((approvedCount / myReferrals.length) * 100) : 0}%
                        </span>
                    </div>
                </div>
            </div>

            {/* Bottom Row: Leaderboard and Your Invites */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                <div className="lg:col-span-7 bg-white dark:bg-[#0c0e14] border border-black/[0.08] dark:border-white/[0.08] rounded-3xl p-6 sm:p-7 shadow-sm dark:shadow-[0_20px_50px_rgba(0,0,0,0.6)] transition-colors">
                    <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-neon-green/10 border border-neon-green/25 text-emerald-700 dark:text-neon-green flex items-center justify-center">
                                <Award size={18} />
                            </div>
                            <div>
                                <h4 className="text-base font-black uppercase tracking-tight text-gray-950 dark:text-white">Network Leaderboard</h4>
                                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 dark:text-zinc-500">Top Collective Recruiters</p>
                            </div>
                        </div>
                        <span className="text-[10px] font-mono font-bold text-gray-400 dark:text-zinc-500 uppercase">Top 10</span>
                    </div>

                    <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
                        <table className="w-full text-left border-collapse min-w-[440px] sm:min-w-0">
                            <thead>
                                <tr className="border-b border-black/[0.06] dark:border-white/[0.08] text-[9px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest">
                                    <th className="pb-3 pl-2 w-14">Rank</th>
                                    <th className="pb-3">Creator</th>
                                    <th className="pb-3 hidden sm:table-cell">City</th>
                                    <th className="pb-3 text-right pr-2">Invites</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-black/[0.04] dark:divide-white/[0.05]">
                                {leaderboard.slice(0, 10).map((creator, index) => {
                                    const rank = index + 1;
                                    const isMe = creator.uid === profile.uid;
                                    return (
                                        <tr key={creator.uid} className={cn("transition-colors", isMe ? "bg-neon-green/10 font-bold" : "hover:bg-black/[0.02] dark:hover:bg-white/[0.02]")}>
                                            <td className="py-3.5 pl-2">{renderRankBadge(rank)}</td>
                                            <td className="py-3.5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-zinc-800 border border-black/10 dark:border-white/10 overflow-hidden flex items-center justify-center shrink-0">
                                                        {creator.profilePicture ? (
                                                            <img src={creator.profilePicture} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <span className="text-xs font-black text-gray-700 dark:text-zinc-300">{creator.name?.charAt(0) || 'C'}</span>
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <span className={cn("text-xs font-bold block truncate max-w-[140px] sm:max-w-none", isMe ? "text-emerald-700 dark:text-neon-green" : "text-gray-900 dark:text-white")}>
                                                            {creator.name} {isMe && "(You)"}
                                                        </span>
                                                        <span className="text-[9px] text-gray-400 dark:text-zinc-500 block">
                                                            @{creator.instagram ? creator.instagram.replace(/^@/, '') : 'creator'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-3.5 hidden sm:table-cell text-[10px] font-bold text-gray-600 dark:text-zinc-400 uppercase tracking-wider">
                                                {creator.city || 'Pan-India'}
                                            </td>
                                            <td className="py-3.5 text-right pr-2 font-black font-mono text-emerald-600 dark:text-neon-green text-sm">
                                                {creator.referralCount}
                                            </td>
                                        </tr>
                                    );
                                })}
                                {leaderboard.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="py-10 text-center text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest">
                                            No referral activity yet. Be the first to invite creators!
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="lg:col-span-5 bg-white dark:bg-[#0c0e14] border border-black/[0.08] dark:border-white/[0.08] rounded-3xl p-6 sm:p-7 shadow-sm dark:shadow-[0_20px_50px_rgba(0,0,0,0.6)] flex flex-col justify-between transition-colors">
                    <div>
                        <div className="flex items-center gap-3 mb-5">
                            <div className="w-10 h-10 rounded-xl bg-neon-green/10 border border-neon-green/25 text-emerald-700 dark:text-neon-green flex items-center justify-center">
                                <Users size={18} />
                            </div>
                            <div>
                                <h4 className="text-base font-black uppercase tracking-tight text-gray-950 dark:text-white">Your Roster Invites</h4>
                                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 dark:text-zinc-500">Creators who registered via your link</p>
                            </div>
                        </div>

                        <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                            {myReferrals.map((ref) => (
                                <div key={ref.uid} className="p-3 bg-gray-50 dark:bg-black/40 border border-black/[0.06] dark:border-white/[0.06] rounded-2xl flex items-center justify-between">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-zinc-800 border border-black/10 dark:border-white/10 flex items-center justify-center shrink-0 overflow-hidden">
                                            {ref.profilePicture ? (
                                                <img src={ref.profilePicture} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-[10px] font-black text-gray-700 dark:text-zinc-300">{ref.name?.charAt(0) || 'C'}</span>
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <h5 className="text-xs font-bold text-gray-900 dark:text-white truncate">{ref.name}</h5>
                                            <p className="text-[8px] text-gray-400 dark:text-zinc-500">@{ref.instagram ? ref.instagram.replace(/^@/, '') : 'creator'}</p>
                                        </div>
                                    </div>
                                    <span className={cn(
                                        "px-2 py-0.5 rounded text-[8px] font-black uppercase font-mono tracking-widest border",
                                        ref.profileStatus === 'approved' 
                                            ? "bg-emerald-500/10 text-emerald-700 dark:text-neon-green border-emerald-500/25 dark:border-neon-green/25" 
                                            : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/25"
                                    )}>
                                        {ref.profileStatus === 'approved' ? 'Verified' : 'Pending'}
                                    </span>
                                </div>
                            ))}
                            {myReferrals.length === 0 && (
                                <div className="py-12 text-center">
                                    <Users size={26} className="text-gray-300 dark:text-zinc-700 mx-auto mb-2" />
                                    <p className="text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest">No invited creators yet</p>
                                    <p className="text-[10px] text-gray-400 dark:text-zinc-600 mt-1">Share your exclusive link above</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="pt-4 border-t border-black/[0.06] dark:border-white/[0.08] mt-4">
                        <button 
                            type="button"
                            onClick={handleCopy}
                            className="w-full h-11 rounded-xl bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 border border-black/10 dark:border-white/10 text-gray-800 dark:text-zinc-200 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-98"
                        >
                            <Link2 size={13} className="text-neon-green" />
                            <span>Share Invite Link</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

/**
 * CreatorDashboard — Completely Redesigned Executive Studio
 */
const CreatorDashboard = () => {
    useStoreSubscription(['creators', 'campaigns', 'creatorGroups']);
    const { user, authInitialized, creators, campaigns, creatorGroups, markCreatorCityGroupJoined, loading, openProfilePanel, subscriptionsLoaded } = useStore();
    const { isDark } = useTheme();
    const navigate = useNavigate();
    const location = useLocation();

    const [profile, setProfile] = useState(null);
    const [isResolvingProfile, setIsResolvingProfile] = useState(true);
    const [activeTab, setActiveTab] = useState('opportunities');
    const [copiedId, setCopiedId] = useState(false);
    const [copiedPass, setCopiedPass] = useState(false);

    const matchedCityGroup = useMemo(() => {
        if (!profile || profile.hasJoinedCityGroup) return null;
        const groups = creatorGroups || [];
        if (groups.length === 0) return null;
        const uCity = (profile.city || '').toLowerCase().trim();
        return groups.find(g => 
            g.isActive !== false && (
                g.city?.toLowerCase() === uCity ||
                (uCity.includes('bengaluru') && g.city?.toLowerCase().includes('bengaluru')) ||
                (uCity.includes('bangalore') && g.city?.toLowerCase().includes('bengaluru')) ||
                (uCity.includes('mumbai') && g.city?.toLowerCase().includes('mumbai')) ||
                (uCity.includes('delhi') && g.city?.toLowerCase().includes('delhi'))
            )
        ) || groups.find(g => g.isActive !== false && (
            g.city?.toLowerCase().includes('pan-india') || 
            g.city?.toLowerCase().includes('india') || 
            g.city?.toLowerCase().includes('all')
        ));
    }, [profile, creatorGroups]);

    const handleMarkCityGroupJoined = async () => {
        if (!profile) return;
        const targetId = profile.uid || profile.id;
        try {
            await markCreatorCityGroupJoined(targetId);
            setProfile(prev => ({ ...prev, hasJoinedCityGroup: true, joinedCityGroupAt: new Date().toISOString() }));
            useStore.getState().addToast(`Joined ${matchedCityGroup?.city || 'city'} community group!`, 'success');
        } catch (err) {
            console.error('Error joining group:', err);
            useStore.getState().addToast('Error saving joined status.', 'error');
        }
    };

    const handleCopyCreatorId = () => {
        const id = profile?.creatorId || profile?.uid?.slice(0, 8).toUpperCase();
        if (!id) return;
        navigator.clipboard.writeText(id);
        setCopiedId(true);
        useStore.getState().addToast('Creator ID copied!', 'success');
        setTimeout(() => setCopiedId(false), 2000);
    };

    const handleSharePass = () => {
        const id = profile?.creatorId || profile?.uid?.slice(0, 8).toUpperCase();
        const link = `${window.location.origin}/creator/join?ref=${id}`;
        navigator.clipboard.writeText(link);
        setCopiedPass(true);
        useStore.getState().addToast('Creator invite link copied!', 'success');
        setTimeout(() => setCopiedPass(false), 2000);
    };

    useDynamicMeta({
        title: 'Creator Dashboard | Newbi Entertainment',
        description: 'Executive creator workspace for managing brand briefs, concert deliverables, and reward privileges.',
        url: window.location.href
    });

    useEffect(() => {
        if (location.pathname.includes('/settings')) {
            openProfilePanel('creator');
            navigate('/creator-dashboard', { replace: true });
        }
    }, [location.pathname, openProfilePanel, navigate]);

    useEffect(() => {
        if (!authInitialized) return;

        // If explicitly unauthenticated, redirect to creator join
        if (!user) {
            setIsResolvingProfile(false);
            navigate('/creator/join', { replace: true });
            return;
        }

        // 1. Try finding creator in the subscribed creators array
        const userPhoneNorm = user.phoneNumber ? normalizePhoneNumber(user.phoneNumber) : null;
        const userEmailNorm = user.email ? user.email.toLowerCase() : null;
        const existingProfile = (creators || []).find(c =>
            c.uid === user.uid ||
            c.id === user.uid ||
            (userEmailNorm && c.email && c.email.toLowerCase() === userEmailNorm) ||
            (userPhoneNorm && normalizePhoneNumber(c.phone) === userPhoneNorm)
        );

        if (existingProfile) {
            if (existingProfile.uid !== user.uid) {
                useStore.getState().updateCreator(existingProfile.uid, { uid: user.uid }).catch(err => console.error('Error linking creator uid:', err));
            }
            setProfile(existingProfile);
            setIsResolvingProfile(false);
            if (!existingProfile.creatorId) {
                const generatedId = existingProfile.uid.slice(0, 8).toUpperCase();
                useStore.getState().updateCreator(existingProfile.uid, { creatorId: generatedId })
                    .then(() => console.log(`Auto-migrated creatorId for ${existingProfile.uid}: ${generatedId}`))
                    .catch(err => console.error('Failed to auto-migrate creatorId:', err));
            }
            return;
        }

        // 2. While creators collection is loading or if user doc is indexed by uid, perform a fast direct Firestore lookup
        let isCancelled = false;
        if (db && user.uid) {
            getDoc(doc(db, 'creators', user.uid))
                .then(docSnap => {
                    if (isCancelled) return;
                    if (docSnap.exists()) {
                        const creatorData = { ...docSnap.data(), id: docSnap.id, uid: docSnap.data().uid || docSnap.id };
                        setProfile(creatorData);
                        setIsResolvingProfile(false);
                    } else if (subscriptionsLoaded?.creators) {
                        // creators collection has fully resolved and direct doc also doesn't exist -> user is not a registered creator
                        setIsResolvingProfile(false);
                        navigate('/creator/join', { replace: true });
                    }
                })
                .catch(err => {
                    console.error("Direct creator profile lookup error:", err);
                    if (subscriptionsLoaded?.creators && !isCancelled) {
                        setIsResolvingProfile(false);
                        navigate('/creator/join', { replace: true });
                    }
                });
        } else if (subscriptionsLoaded?.creators) {
            setIsResolvingProfile(false);
            navigate('/creator/join', { replace: true });
        }

        return () => {
            isCancelled = true;
        };
    }, [user, authInitialized, creators, subscriptionsLoaded?.creators, navigate]);

    const [briefSearch, setBriefSearch] = useState('');
    const [briefFilter, setBriefFilter] = useState('all'); // 'all', 'city', 'paid', 'barter'
    const [deliverableFilter, setDeliverableFilter] = useState('all'); // 'all', 'shortlisted', 'in_review', 'completed'

    const isCityMatch = (campCity, userCity) => {
        if (!campCity) return true;
        const c = campCity.trim().toLowerCase();
        if (['any', 'all', 'universal', 'pan-india', 'global', 'remote', ''].includes(c)) return true;
        if (!userCity) return true;
        const u = userCity.trim().toLowerCase();
        if (c === u) return true;
        if ((c === 'bangalore' && u === 'bengaluru') || (c === 'bengaluru' && u === 'bangalore')) return true;
        if ((c === 'mumbai' && u === 'bombay') || (c === 'bombay' && u === 'mumbai')) return true;
        if (c.includes(u) || u.includes(c)) return true;
        return false;
    };

    const creatorNiche = Array.isArray(profile?.categories)
        ? profile.categories[0]
        : (typeof profile?.categories === 'string' && profile.categories.trim()
            ? profile.categories.trim()
            : (Array.isArray(profile?.specializations)
                ? profile.specializations[0]
                : (typeof profile?.specializations === 'string' && profile.specializations.trim() ? profile.specializations.trim() : 'Content Creator')));

    const allCampaignsList = useMemo(() => {
        return (campaigns || []).filter(c => !c.status || c.status === 'Open');
    }, [campaigns]);

    const availableCampaigns = useMemo(() => {
        return allCampaignsList.filter(c => {
            const isNotJoined = !(profile?.joinedCampaigns || []).includes(c.id);
            const matchesCollege = !c.targetCollege || c.targetCollege === 'Any' ||
                (profile?.collegeName && profile.collegeName.toLowerCase().includes(c.targetCollege.toLowerCase()));
            return isNotJoined && matchesCollege;
        });
    }, [allCampaignsList, profile]);

    const localCampaigns = useMemo(() => {
        return availableCampaigns.filter(c => isCityMatch(c.targetCity, profile?.city));
    }, [availableCampaigns, profile?.city]);

    const joinedCampaignsList = (campaigns || []).filter(c => (profile?.joinedCampaigns || []).includes(c.id));
    const shortlistedCampaignsList = (campaigns || []).filter(c => (profile?.shortlistedCampaigns || []).includes(c.id));

    const totalTasks = joinedCampaignsList.reduce((sum, c) => sum + (c.tasks?.length || 0), 0);
    const approvedTasks = joinedCampaignsList.reduce((sum, c) => {
        return sum + (c.tasks || []).filter(t => getSubmissionStatus(t, profile?.uid) === 'approved').length;
    }, 0);
    const efficiencyRate = totalTasks > 0 ? Math.round((approvedTasks / totalTasks) * 100) : 100;
    const creatorPoints = profile?.points !== undefined ? profile.points : 500;

    const filteredAvailableCampaigns = useMemo(() => {
        if (!profile) return [];
        return availableCampaigns.filter(c => {
            if (briefSearch.trim()) {
                const q = briefSearch.toLowerCase();
                const matchTitle = (c.title || '').toLowerCase().includes(q);
                const matchDesc = (c.description || '').toLowerCase().includes(q);
                const matchCity = (c.targetCity || '').toLowerCase().includes(q);
                const matchReward = (c.reward || '').toLowerCase().includes(q);
                if (!matchTitle && !matchDesc && !matchCity && !matchReward) return false;
            }
            if (briefFilter === 'city') {
                return isCityMatch(c.targetCity, profile.city);
            }
            if (briefFilter === 'paid') {
                const rew = (c.reward || '').toLowerCase();
                return rew.includes('₹') || rew.includes('inr') || rew.includes('paid') || /\d/.test(rew);
            }
            if (briefFilter === 'barter') {
                const rew = (c.reward || '').toLowerCase();
                return rew.includes('barter') || rew.includes('product') || rew.includes('merch') || rew.includes('kit') || rew.includes('pass') || rew.includes('stay') || rew.includes('device');
            }
            return true;
        });
    }, [availableCampaigns, briefSearch, briefFilter, profile?.city, profile]);

    const filteredJoinedCampaigns = useMemo(() => {
        if (!profile) return [];
        return (joinedCampaignsList || []).filter(c => {
            if (deliverableFilter === 'all') return true;
            const isShortlisted = (profile.shortlistedCampaigns || []).includes(c.id);
            const campaignTasks = c.tasks || [];
            const requiredTasks = campaignTasks.filter(t => t.required !== false);
            const approvedRequired = requiredTasks.filter(t => getSubmissionStatus(t, profile.uid) === 'approved').length;
            const isComplete = requiredTasks.length > 0 && approvedRequired === requiredTasks.length;
            
            if (deliverableFilter === 'completed') return isComplete;
            if (deliverableFilter === 'shortlisted') return isShortlisted && !isComplete;
            if (deliverableFilter === 'in_review') return !isShortlisted && !isComplete;
            return true;
        });
    }, [joinedCampaignsList, deliverableFilter, profile]);

    if (!authInitialized || isResolvingProfile || !profile) return <GlobalLoader color="#39ff14" />;

    const tabs = [
        { id: 'opportunities', label: 'New Openings', count: availableCampaigns.length },
        { id: 'active', label: 'Performance History', count: joinedCampaignsList.length },
        { id: 'referrals', label: 'Referrals & Leaderboard', count: null },
        { id: 'rewards', label: 'Creator Vault', count: 'Soon' },
    ];

    return (
        <div className="min-h-screen min-h-[100dvh] bg-[#fafafa] dark:bg-[#08090d] text-gray-950 dark:text-white pt-24 sm:pt-28 pb-32 px-4 sm:px-6 lg:px-12 relative selection:bg-neon-green selection:text-black transition-colors duration-300">
            {/* Ambient Background Lights */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-24 left-1/3 w-[600px] h-[350px] bg-neon-green/[0.035] dark:bg-neon-green/[0.025] rounded-full blur-[140px]" />
                <div className="absolute top-1/2 right-10 w-[500px] h-[400px] bg-neon-blue/[0.025] dark:bg-neon-blue/[0.015] rounded-full blur-[150px]" />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto space-y-8">
                
                {/* 1. EXECUTIVE TOP STATUS BAR */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-black/[0.06] dark:border-white/[0.08]">
                    <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-black dark:bg-white/5 border border-black/10 dark:border-white/10 p-0.5 overflow-hidden shadow-sm shrink-0">
                            {profile.profilePicture ? (
                                <img src={profile.profilePicture} alt="" className="w-full h-full object-cover rounded-[14px]" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center font-black text-base text-neon-green">
                                    {profile.name?.charAt(0) || 'C'}
                                </div>
                            )}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl sm:text-2xl font-black font-heading tracking-tight text-gray-950 dark:text-white">
                                    {profile.name}
                                </h1>
                                {profile.profileStatus === 'approved' ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 dark:bg-neon-green/15 text-emerald-700 dark:text-neon-green text-[9px] font-black uppercase tracking-wider font-mono">
                                        <ShieldCheck size={11} /> Verified
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 text-[9px] font-black uppercase tracking-wider font-mono">
                                        <Clock size={11} /> Pending Review
                                    </span>
                                )}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-500 dark:text-zinc-400 mt-0.5">
                                <span>@{profile.instagram ? profile.instagram.replace(/^@/, '') : 'creator'}</span>
                                <span>&bull;</span>
                                <span className="flex items-center gap-1"><MapPin size={11} className="text-neon-green" /> {profile.city || 'Pan-India'}</span>
                                <span>&bull;</span>
                                <button
                                    type="button"
                                    onClick={handleCopyCreatorId}
                                    className="inline-flex items-center gap-1 font-mono text-[10px] text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white transition-colors group cursor-pointer bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded-md"
                                    title="Click to copy Creator ID"
                                >
                                    <span>ID: {profile.creatorId || profile.uid.slice(0, 8).toUpperCase()}</span>
                                    {copiedId ? <Check size={10} className="text-neon-green" /> : <Copy size={10} className="opacity-60 group-hover:opacity-100 transition-opacity" />}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Quick Studio Bar Actions */}
                    <div className="flex items-center gap-2 self-start md:self-auto">
                        <button
                            type="button"
                            onClick={handleSharePass}
                            className="h-10 px-4 rounded-xl bg-white dark:bg-white/5 border border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20 text-gray-800 dark:text-zinc-200 text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-sm transition-all"
                        >
                            <Share2 size={13} className="text-neon-green" />
                            <span>{copiedPass ? "Link Copied" : "Invite Creators"}</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => openProfilePanel('creator')}
                            className="h-10 px-4 rounded-xl bg-white dark:bg-white/5 border border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20 text-gray-800 dark:text-zinc-200 text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-sm transition-all"
                        >
                            <Settings size={13} />
                            <span>Edit Profile</span>
                        </button>
                    </div>
                </div>

                {/* Phone Verification Banner if unverified */}
                {!profile.isPhoneVerified && (
                    <motion.div 
                        initial={{ opacity: 0, y: -10 }} 
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 bg-amber-500/10 border border-amber-500/25 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
                                <Phone size={16} />
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    Verify Contact Number 
                                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-400 font-extrabold uppercase tracking-wider font-mono">Action Needed</span>
                                </h4>
                                <p className="text-[11px] text-gray-600 dark:text-zinc-400 mt-0.5">Your phone ({profile.phone || 'Not set'}) must be verified to receive direct concert briefs & brand payments.</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => openProfilePanel('creator')} 
                            className="w-full sm:w-auto px-4 py-2 bg-amber-400 hover:bg-amber-300 text-zinc-950 font-black text-[10px] uppercase tracking-wider rounded-xl transition-all shrink-0 text-center"
                        >
                            Verify in Profile &rarr;
                        </button>
                    </motion.div>
                )}

                {/* City Community Group Invite Banner */}
                {matchedCityGroup && !profile.hasJoinedCityGroup && (
                    <motion.div 
                        initial={{ opacity: 0, y: -10 }} 
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 sm:p-5 bg-gradient-to-r from-emerald-500/10 via-neon-green/5 to-black/20 dark:to-black/40 border border-emerald-500/30 rounded-2xl sm:rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm"
                    >
                        <div className="flex items-start sm:items-center gap-3.5">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-neon-green flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                                <MessageCircle size={18} />
                            </div>
                            <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="text-xs sm:text-sm font-black text-gray-900 dark:text-white flex items-center gap-2">
                                        {matchedCityGroup.title || `${matchedCityGroup.city} Creator Hub`}
                                    </h4>
                                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-neon-green font-extrabold uppercase tracking-wider font-mono">
                                        {matchedCityGroup.platform || 'Community'} &bull; {matchedCityGroup.city}
                                    </span>
                                </div>
                                <p className="text-[11px] text-gray-600 dark:text-zinc-400 mt-1 max-w-2xl leading-relaxed">
                                    {matchedCityGroup.description || `Join local ${matchedCityGroup.city} creators for immediate brief alerts, festival guestlist drops, and peer collaborations.`}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 w-full md:w-auto shrink-0 pt-1 md:pt-0">
                            <a 
                                href={matchedCityGroup.groupUrl} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="flex-1 md:flex-initial px-4 py-2.5 bg-neon-green hover:brightness-105 text-black font-black text-[10px] uppercase tracking-wider rounded-xl transition-all shadow-[0_0_15px_rgba(57,255,20,0.25)] flex items-center justify-center gap-1.5"
                            >
                                <span>Join Group</span>
                                <ExternalLink size={12} />
                            </a>
                            <button 
                                type="button" 
                                onClick={handleMarkCityGroupJoined} 
                                className="flex-1 md:flex-initial px-4 py-2.5 bg-white dark:bg-white/10 hover:bg-black/5 dark:hover:bg-white/15 border border-black/10 dark:border-white/10 text-gray-900 dark:text-white font-bold text-[10px] uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5"
                            >
                                <Check size={13} />
                                <span>I've Joined</span>
                            </button>
                        </div>
                    </motion.div>
                )}

                {/* 2. EXECUTIVE STUDIO METRICS GRID (Cleaner, Minimalist, High-Information Density) */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    {/* Metric 1: Available Points / Capital */}
                    <div 
                        onClick={() => setActiveTab('rewards')}
                        className="bg-white dark:bg-[#0c0e14] border border-black/[0.08] dark:border-white/[0.08] hover:border-black/20 dark:hover:border-white/20 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm dark:shadow-[0_15px_35px_rgba(0,0,0,0.4)] flex flex-col justify-between transition-all cursor-pointer group"
                    >
                        <div className="flex items-center justify-between text-gray-400 dark:text-zinc-500 mb-2">
                            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-zinc-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">Creator Points</span>
                            <Coins size={15} className="text-emerald-600 dark:text-neon-green group-hover:scale-110 transition-transform" />
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl sm:text-4xl font-black font-heading tracking-tight text-gray-950 dark:text-white">
                                {creatorPoints.toLocaleString()}
                            </span>
                            <span className="text-[10px] font-black uppercase text-emerald-600 dark:text-neon-green font-mono">PTS</span>
                        </div>
                        <div className="pt-3 mt-3 border-t border-black/[0.05] dark:border-white/[0.06] flex items-center justify-between text-[9px] sm:text-[10px] font-bold text-gray-500 dark:text-zinc-400">
                            <span className="font-mono uppercase text-emerald-600 dark:text-neon-green">Tier 1 Active</span>
                            <span className="group-hover:text-gray-900 dark:group-hover:text-white transition-colors text-amber-600 dark:text-amber-400 flex items-center gap-0.5">
                                Vault (Coming Soon) &rarr;
                            </span>
                        </div>
                    </div>

                    {/* Metric 2: Collaborations */}
                    <div 
                        onClick={() => setActiveTab(joinedCampaignsList.length > 0 ? 'active' : 'opportunities')}
                        className="bg-white dark:bg-[#0c0e14] border border-black/[0.08] dark:border-white/[0.08] hover:border-black/20 dark:hover:border-white/20 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm dark:shadow-[0_15px_35px_rgba(0,0,0,0.4)] flex flex-col justify-between transition-all cursor-pointer group"
                    >
                        <div className="flex items-center justify-between text-gray-400 dark:text-zinc-500 mb-2">
                            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-zinc-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">Active Briefs</span>
                            <Briefcase size={15} className="text-neon-green group-hover:scale-110 transition-transform" />
                        </div>
                        <div className="text-2xl sm:text-4xl font-black font-heading tracking-tight text-gray-950 dark:text-white">
                            {joinedCampaignsList.length}
                        </div>
                        <div className="pt-3 mt-3 border-t border-black/[0.05] dark:border-white/[0.06] flex items-center justify-between text-[9px] sm:text-[10px] font-bold text-gray-500 dark:text-zinc-400">
                            <span>{availableCampaigns.length} available now</span>
                            <span className="group-hover:text-gray-900 dark:group-hover:text-white transition-colors flex items-center gap-0.5">
                                {joinedCampaignsList.length > 0 ? 'Manage' : 'Explore'} &rarr;
                            </span>
                        </div>
                    </div>

                    {/* Metric 3: Deliverables */}
                    <div 
                        onClick={() => setActiveTab('active')}
                        className="bg-white dark:bg-[#0c0e14] border border-black/[0.08] dark:border-white/[0.08] hover:border-black/20 dark:hover:border-white/20 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm dark:shadow-[0_15px_35px_rgba(0,0,0,0.4)] flex flex-col justify-between transition-all cursor-pointer group"
                    >
                        <div className="flex items-center justify-between text-gray-400 dark:text-zinc-500 mb-2">
                            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-zinc-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">Deliverables</span>
                            <CheckCircle2 size={15} className="text-emerald-500 dark:text-emerald-400 group-hover:scale-110 transition-transform" />
                        </div>
                        <div className="text-2xl sm:text-4xl font-black font-heading tracking-tight text-gray-950 dark:text-white">
                            {approvedTasks} <span className="text-xs font-normal text-gray-400 dark:text-zinc-500 font-mono">/ {totalTasks}</span>
                        </div>
                        <div className="pt-3 mt-3 border-t border-black/[0.05] dark:border-white/[0.06] flex items-center justify-between text-[9px] sm:text-[10px] font-bold text-gray-500 dark:text-zinc-400">
                            <span>Verified &amp; Paid</span>
                            <span className="group-hover:text-gray-900 dark:group-hover:text-white transition-colors flex items-center gap-0.5">
                                Track &rarr;
                            </span>
                        </div>
                    </div>

                    {/* Metric 4: Success Rate & Verification Velocity */}
                    <div className="bg-white dark:bg-[#0c0e14] border border-black/[0.08] dark:border-white/[0.08] rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm dark:shadow-[0_15px_35px_rgba(0,0,0,0.4)] flex flex-col justify-between transition-colors">
                        <div className="flex items-center justify-between text-gray-400 dark:text-zinc-500 mb-2">
                            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-zinc-400">Approval Rate</span>
                            <TrendingUp size={15} className="text-emerald-600 dark:text-neon-green" />
                        </div>
                        <div className="text-2xl sm:text-4xl font-black font-heading tracking-tight text-emerald-600 dark:text-neon-green">
                            {efficiencyRate}%
                        </div>
                        <div className="pt-3 mt-3 border-t border-black/[0.05] dark:border-white/[0.06]">
                            <div className="w-full bg-black/5 dark:bg-white/10 h-1.5 rounded-full overflow-hidden">
                                <div 
                                    className="bg-neon-green h-full rounded-full transition-all duration-700 shadow-[0_0_8px_#39FF14]" 
                                    style={{ width: `${Math.min(100, Math.max(5, efficiencyRate))}%` }} 
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. PRIORITY SHORTLISTED GIGS (If any) */}
                {shortlistedCampaignsList.length > 0 && (
                    <motion.section initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-neon-green/15 border border-neon-green/30 text-emerald-700 dark:text-neon-green flex items-center justify-center">
                                <Sparkles size={16} />
                            </div>
                            <div>
                                <h3 className="text-lg sm:text-xl font-black font-heading text-gray-950 dark:text-white">Priority Shortlists</h3>
                                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 dark:text-zinc-500">You are selected for immediate execution</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {shortlistedCampaignsList.map(c => (
                                <CampaignCard 
                                    key={c.id} 
                                    campaign={c} 
                                    profile={profile} 
                                    type="joined" 
                                    onOpenMission={(camp) => navigate(`/campaign/${camp.id}`)} 
                                />
                            ))}
                        </div>
                    </motion.section>
                )}

                {/* 4. QUICK REFERRAL PROGRAM BANNER */}
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white dark:bg-[#0c0e14] border border-black/[0.08] dark:border-white/[0.08] p-6 sm:p-7 rounded-[2rem] relative overflow-hidden shadow-xs dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col lg:flex-row lg:items-center justify-between gap-6 group"
                >
                    <div className="flex items-center gap-4 sm:gap-5 relative z-10">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-neon-green/15 border border-neon-green/30 flex items-center justify-center text-emerald-600 dark:text-neon-green shadow-xs shrink-0 group-hover:scale-105 transition-transform">
                            <Award size={26} className="text-emerald-600 dark:text-neon-green" />
                        </div>
                        <div className="space-y-1">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 dark:text-neon-green block">
                                Creator Referral Program
                            </span>
                            <h3 className="text-lg sm:text-xl md:text-2xl font-bold font-heading tracking-tight text-gray-950 dark:text-white">
                                Invite Creators, Climb the Leaderboard
                            </h3>
                            <p className="text-gray-500 dark:text-zinc-400 text-xs font-medium max-w-lg leading-relaxed">
                                Grow the Newbi community. Share your unique link, refer top talent, and track your achievements.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto relative z-10 shrink-0">
                        {/* Copy Link Field */}
                        <div className="flex items-center bg-gray-50 dark:bg-black/60 border border-black/[0.08] dark:border-white/10 rounded-2xl p-1.5 pl-4 grow lg:grow-0">
                            <span className="text-xs font-mono text-gray-600 dark:text-zinc-300 truncate max-w-[210px] sm:max-w-[260px] select-all">
                                {`www.newbi.live/creator/join?ref=${profile.creatorId || (profile.uid ? profile.uid.slice(0, 8).toUpperCase() : 'NEWBI')}`}
                            </span>
                            <button
                                type="button"
                                onClick={() => {
                                    const refCode = profile.creatorId || (profile.uid ? profile.uid.slice(0, 8).toUpperCase() : 'NEWBI');
                                    const referralLink = `${window.location.origin}/creator/join?ref=${refCode}`;
                                    navigator.clipboard.writeText(referralLink);
                                    useStore.getState().addToast("Referral link copied to clipboard!", "success");
                                }}
                                className="ml-auto px-3.5 py-2 rounded-xl bg-white dark:bg-white/10 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black border border-black/10 dark:border-white/10 text-[9px] font-black uppercase tracking-widest text-gray-700 dark:text-zinc-200 transition-all flex items-center gap-1.5 shadow-2xs shrink-0"
                            >
                                <Copy size={12} />
                                <span>Copy Link</span>
                            </button>
                        </div>

                        {/* View Leaderboard Button */}
                        <button
                            type="button"
                            onClick={() => setActiveTab('referrals')}
                            className="px-5 py-3 rounded-2xl bg-white dark:bg-white text-black hover:bg-neon-green hover:text-black border border-black/10 font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2 shadow-xs shrink-0 active:scale-95"
                        >
                            <Users size={13} />
                            <span>Leaderboard</span>
                        </button>
                    </div>
                </motion.div>

                {/* 5. MAIN NAVIGATION TABS */}
                <div className="space-y-6 pt-2">
                    {/* Clean Underline Tab Navigation */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-black/[0.08] dark:border-white/[0.08] pb-0">
                        <div id="nav-tabs" className="flex items-center gap-6 sm:gap-10 overflow-x-auto scrollbar-hide">
                            {tabs.map((tab) => {
                                const isActive = activeTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => setActiveTab(tab.id)}
                                        className={cn(
                                            "text-sm sm:text-base font-black font-heading tracking-tight pb-3 transition-colors relative shrink-0 flex items-center gap-2",
                                            isActive
                                                ? "text-gray-950 dark:text-white"
                                                : "text-gray-400 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300"
                                        )}
                                    >
                                        <span>{tab.label}</span>
                                        {tab.count !== null && tab.count !== undefined && (
                                            <span className={cn(
                                                "px-1.5 py-0.5 rounded text-[9px] font-mono font-bold leading-none",
                                                tab.count === 'Soon'
                                                    ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                                                    : isActive
                                                        ? "bg-black/[0.06] dark:bg-white/[0.1] text-gray-900 dark:text-white"
                                                        : "bg-black/[0.03] dark:bg-white/[0.05] text-gray-400 dark:text-zinc-500"
                                            )}>
                                                {tab.count}
                                            </span>
                                        )}
                                        {isActive && (
                                            <motion.div
                                                layoutId="tab-underline"
                                                className="absolute -bottom-px left-0 right-0 h-0.5 bg-neon-green"
                                            />
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {activeTab !== 'referrals' && activeTab !== 'rewards' && (
                            <div className="pb-3 self-end md:self-auto shrink-0">
                                <div className="px-4 py-1.5 rounded-full bg-black/[0.04] dark:bg-white/[0.05] border border-black/[0.06] dark:border-white/[0.08] text-[9px] font-black uppercase tracking-widest text-gray-500 dark:text-zinc-400">
                                    <span className="text-gray-950 dark:text-white mr-1.5 font-mono font-bold">
                                        {activeTab === 'opportunities' ? availableCampaigns.length : joinedCampaignsList.length}
                                    </span>
                                    {activeTab === 'opportunities' ? 'GIGS DISCOVERED' : 'CAMPAIGNS TRACKED'}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Tab Views */}
                    {activeTab === 'referrals' ? (
                        <CreatorReferralsView profile={profile} />
                    ) : activeTab === 'rewards' ? (
                        <div className="bg-white dark:bg-[#0c0e14] border border-black/[0.08] dark:border-white/[0.08] rounded-3xl p-8 sm:p-12 shadow-sm dark:shadow-[0_20px_50px_rgba(0,0,0,0.6)] transition-colors">
                            <div className="max-w-2xl mx-auto text-center space-y-3 mb-10">
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-[10px] font-black uppercase tracking-wider font-mono">
                                    <Clock size={11} />
                                    <span>Coming Soon &bull; In Development</span>
                                </div>
                                <h3 className="text-2xl sm:text-3xl font-black font-heading tracking-tight text-gray-950 dark:text-white">
                                    Creator Privilege Vault
                                </h3>
                                <p className="text-gray-500 dark:text-zinc-400 text-xs sm:text-sm leading-relaxed">
                                    Direct points redemption for festival guestlists, brand PR drops, studio time, and retainers is launching soon. All creator points earned through brand briefs and referral activations are securely stacked on your account and will unlock automatically on rollout.
                                </p>
                                <div className="pt-2">
                                    <span className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs font-mono font-bold text-gray-700 dark:text-zinc-300">
                                        <span>Current Balance:</span>
                                        <span className="text-emerald-600 dark:text-neon-green font-black">{creatorPoints.toLocaleString()} PTS</span>
                                        <span className="text-gray-400 dark:text-zinc-500">&bull;</span>
                                        <span className="text-amber-600 dark:text-amber-400">Locked for Rollout</span>
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 opacity-80">
                                {[
                                    {
                                        icon: Music,
                                        title: 'Concert & Festival Guestlists',
                                        desc: 'Priority entry passes and artist area access across nationwide music festivals and arena tours.',
                                        points: '1,000 PTS',
                                        badge: 'Drop Live'
                                    },
                                    {
                                        icon: Shirt,
                                        title: 'Brand PR & Merch Kits',
                                        desc: 'Curated apparel, streetwear drops, and limited lifestyle kits delivered to your doorstep.',
                                        points: '1,500 PTS',
                                        badge: 'Quarterly'
                                    },
                                    {
                                        icon: Mic,
                                        title: 'Studio & Production Facilities',
                                        desc: 'High-end production space, podcast soundstages, and creator cameras in key metro hubs.',
                                        points: '2,500 PTS',
                                        badge: 'Metro Hubs'
                                    },
                                    {
                                        icon: Flame,
                                        title: 'Direct Ambassador Retainers',
                                        desc: 'Direct invitations into premium annual brand ambassador rosters with fixed retainer payouts.',
                                        points: 'Tier 1 Priority',
                                        badge: 'By Vetting'
                                    }
                                ].map((item, idx) => {
                                    const Icon = item.icon;
                                    return (
                                        <div key={idx} className="bg-gray-50 dark:bg-black/40 border border-black/[0.06] dark:border-white/[0.06] rounded-2xl p-5 flex flex-col justify-between transition-colors relative overflow-hidden">
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <div className="w-10 h-10 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 flex items-center justify-center text-gray-700 dark:text-zinc-300">
                                                        <Icon size={18} />
                                                    </div>
                                                    <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider font-mono text-amber-700 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                                                        <Lock size={9} /> Coming Soon
                                                    </span>
                                                </div>
                                                <div>
                                                    <h5 className="text-sm font-black uppercase tracking-tight text-gray-950 dark:text-white">{item.title}</h5>
                                                    <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-1 leading-relaxed">{item.desc}</p>
                                                </div>
                                            </div>
                                            <div className="pt-4 mt-4 border-t border-black/[0.06] dark:border-white/[0.06] flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-gray-500 dark:text-zinc-400 font-mono">
                                                <span>{item.badge}</span>
                                                <span className="text-gray-400 dark:text-zinc-500 font-bold">{item.points}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : activeTab === 'opportunities' ? (
                        <div className="space-y-6">
                            {/* Curated Briefs Search & Filter Bar */}
                            <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
                                {/* Search Input */}
                                <div className="relative flex-1 max-w-md">
                                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500" size={15} />
                                    <input 
                                        type="text"
                                        value={briefSearch}
                                        onChange={(e) => setBriefSearch(e.target.value)}
                                        placeholder="Search by title, brand, city or reward..."
                                        className="w-full h-10 pl-10 pr-9 rounded-xl bg-white dark:bg-[#0c0e14] border border-black/[0.08] dark:border-white/[0.08] text-xs text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:border-neon-green/80 transition-colors shadow-2xs"
                                    />
                                    {briefSearch && (
                                        <button 
                                            type="button" 
                                            onClick={() => setBriefSearch('')}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"
                                        >
                                            <X size={14} />
                                        </button>
                                    )}
                                </div>

                                {/* Filter Pills */}
                                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide py-0.5">
                                    {[
                                        { id: 'all', label: 'All Briefs', count: availableCampaigns.length },
                                        { id: 'city', label: profile?.city ? `In ${profile.city}` : 'In My City', count: localCampaigns.length },
                                        { id: 'paid', label: 'Paid Collabs' },
                                        { id: 'barter', label: 'Barter & Perks' },
                                    ].map(filter => {
                                        const isSelected = briefFilter === filter.id;
                                        return (
                                            <button
                                                key={filter.id}
                                                type="button"
                                                onClick={() => setBriefFilter(filter.id)}
                                                className={cn(
                                                    "px-3.5 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all shrink-0 flex items-center gap-1.5",
                                                    isSelected 
                                                        ? "bg-black text-white dark:bg-white dark:text-black shadow-sm" 
                                                        : "bg-white dark:bg-[#0c0e14] border border-black/[0.08] dark:border-white/[0.08] text-gray-600 dark:text-zinc-400 hover:text-gray-950 dark:hover:text-white hover:border-black/20 dark:hover:border-white/20"
                                                )}
                                            >
                                                <span>{filter.label}</span>
                                                {filter.count !== undefined && (
                                                    <span className={cn(
                                                        "text-[10px] px-1.5 py-0.5 rounded font-mono font-bold leading-none",
                                                        isSelected
                                                            ? "bg-white/20 dark:bg-black/20 text-white dark:text-black"
                                                            : "bg-black/[0.05] dark:bg-white/[0.08] text-gray-500 dark:text-zinc-400"
                                                    )}>
                                                        {filter.count}
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Briefs Grid or Minimalist Empty State */}
                            {filteredAvailableCampaigns.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                    <AnimatePresence mode="popLayout">
                                        {filteredAvailableCampaigns.map(c => (
                                            <motion.div 
                                                key={c.id} 
                                                layout 
                                                initial={{ opacity: 0, scale: 0.95 }} 
                                                animate={{ opacity: 1, scale: 1 }} 
                                                exit={{ opacity: 0, scale: 0.95 }}
                                            >
                                                <CampaignCard 
                                                    campaign={c} 
                                                    profile={profile} 
                                                    type="available" 
                                                    onOpenMission={(camp) => navigate(`/campaign/${camp.id}`)} 
                                                />
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                </div>
                            ) : (
                                <div className="bg-white dark:bg-[#0c0e14] border border-black/[0.08] dark:border-white/[0.08] rounded-3xl p-10 sm:p-14 text-center max-w-md mx-auto shadow-sm">
                                    <div className="w-12 h-12 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.08] flex items-center justify-center text-neon-green mx-auto mb-4">
                                        <Compass size={22} />
                                    </div>
                                    <h4 className="text-base sm:text-lg font-black font-heading text-gray-950 dark:text-white tracking-tight">
                                        {briefFilter === 'city'
                                            ? `No Open Briefs in ${profile?.city || 'Your City'}`
                                            : briefSearch
                                                ? 'No Matching Briefs Found'
                                                : 'No Briefs Available Right Now'}
                                    </h4>
                                    <p className="text-xs text-gray-500 dark:text-zinc-400 mt-2 leading-relaxed max-w-xs mx-auto">
                                        {briefFilter === 'city'
                                            ? `There are currently no exclusive briefs for ${profile?.city || 'your city'}. Explore Pan-India opportunities or reset your filter.`
                                            : briefSearch
                                                ? `No opportunities matched "${briefSearch}". Try adjusting keywords or clear your search.`
                                                : 'Brand campaigns and deliverables are refreshed frequently. Check back soon for new opportunities.'}
                                    </p>
                                    <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-2.5">
                                        {(briefFilter !== 'all' || briefSearch) && (
                                            <button
                                                type="button"
                                                onClick={() => { setBriefSearch(''); setBriefFilter('all'); }}
                                                className="w-full sm:w-auto h-10 px-5 rounded-xl bg-neon-green hover:bg-emerald-400 text-black font-black text-xs uppercase tracking-wider transition-all inline-flex items-center justify-center gap-2 shadow-sm active:scale-95"
                                            >
                                                <span>View All Briefs ({availableCampaigns.length})</span>
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => openProfilePanel('creator')}
                                            className="w-full sm:w-auto h-10 px-4 rounded-xl bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 border border-black/10 dark:border-white/10 text-gray-800 dark:text-zinc-200 text-xs font-bold uppercase tracking-wider transition-all inline-flex items-center justify-center gap-2 active:scale-95"
                                        >
                                            <Settings size={13} />
                                            <span>Edit Profile</span>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        /* activeTab === 'active' (My Deliverables) */
                        <div className="space-y-6">
                            {/* Deliverables Status Filter */}
                            {joinedCampaignsList.length > 0 && (
                                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide py-0.5">
                                    {[
                                        { id: 'all', label: `All Deliverables (${joinedCampaignsList.length})` },
                                        { id: 'shortlisted', label: 'Ongoing Work' },
                                        { id: 'in_review', label: 'Under Review' },
                                        { id: 'completed', label: 'Completed' },
                                    ].map(filter => (
                                        <button
                                            key={filter.id}
                                            type="button"
                                            onClick={() => setDeliverableFilter(filter.id)}
                                            className={cn(
                                                "px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shrink-0",
                                                deliverableFilter === filter.id 
                                                    ? "bg-black text-white dark:bg-white dark:text-black shadow-sm" 
                                                    : "bg-white dark:bg-[#0c0e14] border border-black/[0.08] dark:border-white/[0.08] text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
                                            )}
                                        >
                                            {filter.label}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {filteredJoinedCampaigns.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                    <AnimatePresence mode="popLayout">
                                        {filteredJoinedCampaigns.map(c => (
                                            <motion.div 
                                                key={c.id} 
                                                layout 
                                                initial={{ opacity: 0, scale: 0.95 }} 
                                                animate={{ opacity: 1, scale: 1 }} 
                                                exit={{ opacity: 0, scale: 0.95 }}
                                            >
                                                <CampaignCard 
                                                    campaign={c} 
                                                    profile={profile} 
                                                    type="joined" 
                                                    onOpenMission={(camp) => navigate(`/campaign/${camp.id}`)} 
                                                />
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                </div>
                            ) : (
                                <div className="bg-white dark:bg-[#0c0e14] border border-black/[0.08] dark:border-white/[0.08] rounded-3xl p-10 sm:p-14 text-center max-w-md mx-auto shadow-sm">
                                    <div className="w-12 h-12 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.08] flex items-center justify-center text-neon-green mx-auto mb-4">
                                        <Briefcase size={22} />
                                    </div>
                                    <h4 className="text-base sm:text-lg font-black font-heading text-gray-950 dark:text-white tracking-tight">
                                        {joinedCampaignsList.length === 0 ? 'No Active Campaigns Tracked' : 'No Campaigns in this Filter'}
                                    </h4>
                                    <p className="text-xs text-gray-500 dark:text-zinc-400 mt-2 leading-relaxed max-w-xs mx-auto">
                                        {joinedCampaignsList.length === 0 
                                            ? 'Browse open curated briefs to join brand campaigns, submit deliverables, and claim your rewards.'
                                            : 'Try selecting another status tab above to see your campaigns.'
                                        }
                                    </p>
                                    <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-2.5">
                                        {joinedCampaignsList.length === 0 ? (
                                            <button
                                                type="button"
                                                onClick={() => setActiveTab('opportunities')}
                                                className="w-full sm:w-auto h-10 px-5 rounded-xl bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 border border-black/10 dark:border-white/10 text-gray-800 dark:text-zinc-200 text-xs font-bold uppercase tracking-wider transition-all inline-flex items-center justify-center gap-2 active:scale-95"
                                            >
                                                <span>Explore Curated Briefs</span>
                                                <ArrowRight size={13} />
                                            </button>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => setDeliverableFilter('all')}
                                                className="w-full sm:w-auto h-10 px-5 rounded-xl bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 border border-black/10 dark:border-white/10 text-gray-800 dark:text-zinc-200 text-xs font-bold uppercase tracking-wider transition-all inline-flex items-center justify-center gap-2 active:scale-95"
                                            >
                                                <span>Show All Deliverables</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};

export default CreatorDashboard;

