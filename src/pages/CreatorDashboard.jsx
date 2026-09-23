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
import CreatorCityGroupCard from '../components/creator/CreatorCityGroupCard';
import CampaignDetailModal from '../components/creator/CampaignDetailModal';
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


// ─── helpers ─────────────────────────────────────────────────────────────────

const getSubmissionStatus = (task, uid) => {
    const sub = task.submissions?.[uid];
    if (sub) return sub.status;
    if ((task.verifiedBy || []).includes(uid)) return 'approved';
    if ((task.completedBy || []).includes(uid)) return 'submitted';
    return 'not_started';
};

const renderRankBadge = (rank) => {
    const base = 'inline-flex items-center justify-center w-5 h-5 rounded-md font-black text-[10px] font-mono';
    if (rank === 1) return <span className={`${base} bg-amber-400/20 text-amber-500 dark:text-amber-300 border border-amber-400/30`}>1</span>;
    if (rank === 2) return <span className={`${base} bg-zinc-300/20 text-zinc-600 dark:text-zinc-300 border border-zinc-400/30`}>2</span>;
    if (rank === 3) return <span className={`${base} bg-amber-600/20 text-amber-700 dark:text-amber-400 border border-amber-600/30`}>3</span>;
    return <span className="text-gray-400 dark:text-zinc-500 font-mono text-[10px] pl-1 font-bold">#{rank}</span>;
};

// ─── Referrals View ───────────────────────────────────────────────────────────

const CreatorReferralsView = ({ profile }) => {
    const { creators } = useStore();
    const [copied, setCopied] = useState(false);
    const referralLink = `${window.location.origin}/creator/join?ref=${profile.creatorId || String(profile.uid || '').slice(0, 8).toUpperCase()}`;

    const handleCopy = () => {
        navigator.clipboard.writeText(referralLink);
        setCopied(true);
        useStore.getState().addToast('Referral link copied!', 'success');
        setTimeout(() => setCopied(false), 2000);
    };

    const myReferrals = useMemo(() => {
        if (!profile) return [];
        const profUid = profile.uid;
        const profIdUpper = profile.creatorId ? String(profile.creatorId).toUpperCase() : null;
        const profInstaLower = profile.instagram ? String(profile.instagram).toLowerCase() : null;
        const profLiLower = profile.linkedin ? String(profile.linkedin).toLowerCase() : null;
        
        return (creators || []).filter(c => {
            const ref = c.referredBy;
            if (!ref) return false;
            if (ref === profUid) return true;
            
            const refStr = String(ref);
            const refUpper = refStr.toUpperCase();
            const refLower = refStr.toLowerCase();
            
            if (profIdUpper && refUpper === profIdUpper) return true;
            if (profInstaLower && refLower === profInstaLower) return true;
            if (profLiLower && refLower === profLiLower) return true;
            
            return false;
        });
    }, [creators, profile]);

    const approvedCount = myReferrals.filter(c => c.profileStatus === 'approved').length;

    const leaderboard = useMemo(() => {
        const counts = {};
        const uidMap = new Map();
        const creatorIdMap = new Map();
        const instagramMap = new Map();
        const linkedinMap = new Map();
        
        (creators || []).forEach(rc => {
            if (rc.uid) uidMap.set(rc.uid, rc);
            if (rc.creatorId) creatorIdMap.set(String(rc.creatorId).toUpperCase(), rc);
            if (rc.instagram) instagramMap.set(String(rc.instagram).toLowerCase(), rc);
            if (rc.linkedin) linkedinMap.set(String(rc.linkedin).toLowerCase(), rc);
        });

        (creators || []).forEach(c => {
            if (c.referredBy) {
                const refStr = String(c.referredBy);
                const refUpper = refStr.toUpperCase();
                const refLower = refStr.toLowerCase();
                
                const referrer = uidMap.get(refStr) || 
                                 creatorIdMap.get(refUpper) || 
                                 instagramMap.get(refLower) || 
                                 linkedinMap.get(refLower);
                                 
                if (referrer && referrer.uid) {
                    counts[referrer.uid] = (counts[referrer.uid] || 0) + 1;
                }
            }
        });

        return (creators || [])
            .filter(c => counts[c.uid] > 0)
            .map(c => ({ ...c, referralCount: counts[c.uid] }))
            .sort((a, b) => b.referralCount - a.referralCount);
    }, [creators]);

    const myRank = leaderboard.findIndex(c => c.uid === profile.uid) + 1;
    const conversionRate = myReferrals.length > 0 ? Math.round((approvedCount / myReferrals.length) * 100) : 0;

    return (
        <div className="space-y-4 pb-6">
            {/* Invite Card */}
            <div className="bg-white dark:bg-[#0c0e14] border border-black/[0.07] dark:border-white/[0.07] rounded-2xl p-5 shadow-sm dark:shadow-[0_8px_30px_rgba(0,0,0,0.5)]">
                <div className="flex items-center gap-1.5 mb-3">
                    <div className="w-5 h-5 rounded-md bg-emerald-500/15 dark:bg-neon-green/10 flex items-center justify-center">
                        <Link2 size={11} className="text-emerald-600 dark:text-neon-green" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.15em] text-emerald-600 dark:text-neon-green">Referral Network</span>
                </div>
                <h3 className="text-base font-black font-heading text-gray-950 dark:text-white mb-1">Grow Your Creator Collective</h3>
                <p className="text-xs text-gray-500 dark:text-zinc-400 mb-4 leading-relaxed">
                    Earn <span className="font-bold text-gray-900 dark:text-white">+250 Creator Points</span> for every creator who joins and gets verified through your link.
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                    <div className="flex-1 h-10 bg-gray-50 dark:bg-black/50 border border-black/[0.07] dark:border-white/[0.07] rounded-xl px-3 flex items-center text-[11px] font-mono text-gray-700 dark:text-zinc-300 truncate select-all">
                        {referralLink}
                    </div>
                    <button
                        type="button"
                        onClick={handleCopy}
                        className="h-10 px-5 rounded-xl bg-neon-green text-black font-black text-[11px] uppercase tracking-wider hover:bg-emerald-400 active:scale-95 transition-all flex items-center justify-center gap-1.5 shadow-[0_0_16px_rgba(57,255,20,0.2)] shrink-0"
                    >
                        {copied ? <Check size={13} /> : <Copy size={13} />}
                        {copied ? 'Copied!' : 'Copy Link'}
                    </button>
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-3">
                {[
                    { label: 'Invited', value: myReferrals.length, accent: false },
                    { label: 'Verified', value: approvedCount, accent: true },
                    { label: 'Conversion', value: `${conversionRate}%`, accent: false },
                ].map(stat => (
                    <div key={stat.label} className="bg-white dark:bg-[#0c0e14] border border-black/[0.07] dark:border-white/[0.07] rounded-2xl p-4 text-center shadow-sm">
                        <div className={`text-2xl font-black font-heading ${stat.accent ? 'text-emerald-600 dark:text-neon-green' : 'text-gray-950 dark:text-white'}`}>
                            {stat.value}
                        </div>
                        <div className="text-[9px] font-black uppercase tracking-widest text-gray-400 dark:text-zinc-500 mt-0.5">{stat.label}</div>
                    </div>
                ))}
            </div>

            {/* Leaderboard */}
            <div className="bg-white dark:bg-[#0c0e14] border border-black/[0.07] dark:border-white/[0.07] rounded-2xl p-5 shadow-sm dark:shadow-[0_8px_30px_rgba(0,0,0,0.5)]">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Trophy size={14} className="text-emerald-600 dark:text-neon-green" />
                        <span className="text-sm font-black uppercase tracking-tight text-gray-950 dark:text-white">Network Leaderboard</span>
                    </div>
                    <span className="text-[10px] font-mono text-gray-400 dark:text-zinc-500 uppercase">Top 10</span>
                </div>
                <div className="space-y-1">
                    {leaderboard.slice(0, 10).map((creator, index) => {
                        const rank = index + 1;
                        const isMe = creator.uid === profile.uid;
                        return (
                            <div key={creator.uid} className={cn(
                                'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors',
                                isMe ? 'bg-neon-green/10 dark:bg-neon-green/[0.08]' : 'hover:bg-black/[0.02] dark:hover:bg-white/[0.02]'
                            )}>
                                <div className="w-6 shrink-0 flex items-center justify-center">{renderRankBadge(rank)}</div>
                                <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-zinc-800 border border-black/[0.07] dark:border-white/[0.07] overflow-hidden flex items-center justify-center shrink-0">
                                    {creator.profilePicture
                                        ? <img src={creator.profilePicture} alt="" className="w-full h-full object-cover" />
                                        : <span className="text-[10px] font-black text-gray-600 dark:text-zinc-300">{creator.name?.charAt(0) || 'C'}</span>}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className={cn('text-xs font-bold truncate', isMe ? 'text-emerald-700 dark:text-neon-green' : 'text-gray-900 dark:text-white')}>
                                        {creator.name}{isMe && ' (You)'}
                                    </div>
                                    <div className="text-[10px] text-gray-400 dark:text-zinc-500">@{creator.instagram?.replace(/^@/, '') || 'creator'}</div>
                                </div>
                                <span className="font-black font-mono text-emerald-600 dark:text-neon-green text-sm shrink-0">{creator.referralCount}</span>
                            </div>
                        );
                    })}
                    {leaderboard.length === 0 && (
                        <div className="py-10 text-center">
                            <Trophy size={22} className="text-gray-300 dark:text-zinc-700 mx-auto mb-2" />
                            <p className="text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest">No referral activity yet</p>
                            <p className="text-[10px] text-gray-400 dark:text-zinc-600 mt-1">Be the first to invite creators!</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Your Invites List */}
            {myReferrals.length > 0 && (
                <div className="bg-white dark:bg-[#0c0e14] border border-black/[0.07] dark:border-white/[0.07] rounded-2xl p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                        <Users size={14} className="text-gray-500 dark:text-zinc-400" />
                        <span className="text-sm font-black uppercase tracking-tight text-gray-950 dark:text-white">Your Roster</span>
                        <span className="ml-auto text-[10px] font-mono text-gray-400 dark:text-zinc-500">{myReferrals.length} invited</span>
                    </div>
                    <div className="space-y-2">
                        {myReferrals.map(ref => (
                            <div key={ref.uid} className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 dark:bg-black/40 border border-black/[0.05] dark:border-white/[0.05] rounded-xl">
                                <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-zinc-800 border border-black/[0.07] dark:border-white/[0.07] flex items-center justify-center shrink-0 overflow-hidden">
                                    {ref.profilePicture
                                        ? <img src={ref.profilePicture} alt="" className="w-full h-full object-cover" />
                                        : <span className="text-[10px] font-black text-gray-600 dark:text-zinc-300">{ref.name?.charAt(0) || 'C'}</span>}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-xs font-bold text-gray-900 dark:text-white truncate">{ref.name}</div>
                                    <div className="text-[10px] text-gray-400 dark:text-zinc-500">@{ref.instagram?.replace(/^@/, '') || 'creator'}</div>
                                </div>
                                <span className={cn(
                                    'px-2 py-0.5 rounded-md text-[9px] font-black uppercase font-mono tracking-widest',
                                    ref.profileStatus === 'approved'
                                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-neon-green border border-emerald-500/20'
                                        : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20'
                                )}>
                                    {ref.profileStatus === 'approved' ? 'Verified' : 'Pending'}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

// ─── Rewards View ─────────────────────────────────────────────────────────────

const CreatorVaultView = ({ creatorPoints }) => {
    const vaultItems = [
        { icon: Music, title: 'Concert & Festival Guestlists', desc: 'Priority entry passes and artist area access across nationwide music festivals.', points: '1,000 PTS', badge: 'Drop Live' },
        { icon: Shirt, title: 'Brand PR & Merch Kits', desc: 'Curated apparel, streetwear drops, and limited lifestyle kits delivered to you.', points: '1,500 PTS', badge: 'Quarterly' },
        { icon: Mic, title: 'Studio & Production Facilities', desc: 'High-end production space, podcast soundstages, and creator cameras.', points: '2,500 PTS', badge: 'Metro Hubs' },
        { icon: Flame, title: 'Direct Ambassador Retainers', desc: 'Direct invitations into premium annual brand ambassador rosters.', points: 'Tier 1', badge: 'By Vetting' },
    ];

    return (
        <div className="space-y-4 pb-6">
            {/* Coming Soon Header */}
            <div className="bg-white dark:bg-[#0c0e14] border border-black/[0.07] dark:border-white/[0.07] rounded-2xl p-6 text-center shadow-sm">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-700 dark:text-amber-400 text-[10px] font-black uppercase tracking-wider font-mono mb-3">
                    <Clock size={10} />
                    <span>Coming Soon · In Development</span>
                </div>
                <h3 className="text-xl font-black font-heading text-gray-950 dark:text-white mb-2">Creator Privilege Vault</h3>
                <p className="text-xs text-gray-500 dark:text-zinc-400 leading-relaxed max-w-sm mx-auto mb-4">
                    Direct points redemption for festival guestlists, brand PR drops, studio time, and retainers is launching soon.
                </p>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-black/[0.04] dark:bg-white/[0.05] border border-black/[0.07] dark:border-white/[0.07] text-xs font-mono font-bold text-gray-700 dark:text-zinc-300">
                    <span>Your Balance:</span>
                    <span className="text-emerald-600 dark:text-neon-green font-black">{creatorPoints.toLocaleString()} PTS</span>
                    <span className="text-gray-300 dark:text-zinc-600">·</span>
                    <span className="text-amber-600 dark:text-amber-400">Locked for Rollout</span>
                </div>
            </div>

            {/* Vault Items */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 opacity-75">
                {vaultItems.map((item, idx) => {
                    const Icon = item.icon;
                    return (
                        <div key={idx} className="bg-white dark:bg-[#0c0e14] border border-black/[0.07] dark:border-white/[0.07] rounded-2xl p-4 flex gap-4 shadow-sm">
                            <div className="w-9 h-9 rounded-xl bg-black/[0.04] dark:bg-white/[0.05] border border-black/[0.07] dark:border-white/[0.07] flex items-center justify-center shrink-0 text-gray-600 dark:text-zinc-300">
                                <Icon size={16} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                    <h5 className="text-xs font-black text-gray-900 dark:text-white">{item.title}</h5>
                                    <span className="inline-flex items-center gap-0.5 text-[9px] font-black uppercase tracking-wider font-mono text-amber-700 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-md border border-amber-500/20">
                                        <Lock size={8} /> Soon
                                    </span>
                                </div>
                                <p className="text-[11px] text-gray-500 dark:text-zinc-400 leading-relaxed">{item.desc}</p>
                                <div className="mt-2 flex items-center justify-between">
                                    <span className="text-[10px] font-mono font-black text-gray-400 dark:text-zinc-500">{item.badge}</span>
                                    <span className="text-[10px] font-mono font-black text-gray-500 dark:text-zinc-400">{item.points}</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// ─── Main Dashboard ───────────────────────────────────────────────────────────

const CreatorDashboard = () => {
    useStoreSubscription(['creators', 'campaigns', 'creatorGroups']);
    const {
        user, authInitialized, creators, campaigns, creatorGroups,
        markCreatorCityGroupJoined, loading, openProfilePanel, subscriptionsLoaded,
        setAuthModal, resolveCreatorProfile
    } = useStore();
    const { isDark } = useTheme();
    const navigate = useNavigate();
    const location = useLocation();

    const [profile, setProfile] = useState(null);
    const [isResolvingProfile, setIsResolvingProfile] = useState(true);
    const [activeTab, setActiveTab] = useState('opportunities');
    const [copiedId, setCopiedId] = useState(false);
    const [selectedCampaignForModal, setSelectedCampaignForModal] = useState(null);
    const [briefSearch, setBriefSearch] = useState('');
    const [briefFilter, setBriefFilter] = useState('all');
    const [deliverableFilter, setDeliverableFilter] = useState('all');
    const [phoneBannerDismissed, setPhoneBannerDismissed] = useState(false);

    useDynamicMeta({
        title: 'Creator Dashboard | Newbi Entertainment',
        description: 'Executive creator workspace for managing brand briefs, concert deliverables, and reward privileges.',
        url: window.location.href
    });

    // Deep link support
    useEffect(() => {
        const searchParams = new URLSearchParams(location.search);
        const campaignId = searchParams.get('campaignId');
        if (campaignId && campaigns && campaigns.length > 0) {
            const found = campaigns.find(c => c.id === campaignId);
            if (found) setSelectedCampaignForModal(found);
        }
    }, [location.search, campaigns]);

    useEffect(() => {
        if (location.pathname.includes('/settings')) {
            openProfilePanel('creator');
            navigate('/creator-dashboard', { replace: true });
        }
    }, [location.pathname, openProfilePanel, navigate]);

    useEffect(() => {
        if (!authInitialized) return;
        if (!user) { setIsResolvingProfile(false); return; }

        let isCancelled = false;
        resolveCreatorProfile(user).then((resolvedProfile) => {
            if (isCancelled) return;
            if (resolvedProfile) {
                setProfile(resolvedProfile);
            } else if (subscriptionsLoaded?.creators) {
                navigate('/creator/join', { replace: true });
            }
            setIsResolvingProfile(false);
        }).catch(err => {
            console.error('Profile resolution error:', err);
            if (!isCancelled) setIsResolvingProfile(false);
        });

        return () => { isCancelled = true; };
    }, [user, authInitialized, creators, subscriptionsLoaded?.creators, navigate, resolveCreatorProfile]);

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

    const allCampaignsList = useMemo(() => {
        return (campaigns || []).filter(c => !c.status || c.status.toLowerCase() === 'open');
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

    const sortedJoinedCampaigns = useMemo(() => {
        return [...joinedCampaignsList].sort((a, b) => {
            const aShortlisted = (profile?.shortlistedCampaigns || []).includes(a.id) ? 1 : 0;
            const bShortlisted = (profile?.shortlistedCampaigns || []).includes(b.id) ? 1 : 0;
            if (bShortlisted !== aShortlisted) return bShortlisted - aShortlisted;
            const aOpen = (!a.status || a.status.toLowerCase() === 'open') ? 1 : 0;
            const bOpen = (!b.status || b.status.toLowerCase() === 'open') ? 1 : 0;
            return bOpen - aOpen;
        });
    }, [joinedCampaignsList, profile?.shortlistedCampaigns]);

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
                if (
                    !(c.title || '').toLowerCase().includes(q) &&
                    !(c.description || '').toLowerCase().includes(q) &&
                    !(c.targetCity || '').toLowerCase().includes(q) &&
                    !(c.reward || '').toLowerCase().includes(q)
                ) return false;
            }
            if (briefFilter === 'city') return isCityMatch(c.targetCity, profile.city);
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
        return joinedCampaignsList.filter(c => {
            if (deliverableFilter === 'all') return true;
            const isShortlisted = (profile.shortlistedCampaigns || []).includes(c.id);
            const requiredTasks = (c.tasks || []).filter(t => t.required !== false);
            const approvedRequired = requiredTasks.filter(t => getSubmissionStatus(t, profile.uid) === 'approved').length;
            const isComplete = requiredTasks.length > 0 && approvedRequired === requiredTasks.length;
            if (deliverableFilter === 'completed') return isComplete;
            if (deliverableFilter === 'shortlisted') return isShortlisted && !isComplete;
            if (deliverableFilter === 'in_review') return !isShortlisted && !isComplete;
            return true;
        });
    }, [joinedCampaignsList, deliverableFilter, profile]);

    const handleCopyCreatorId = () => {
        const id = profile?.creatorId || String(profile?.uid || '').slice(0, 8).toUpperCase();
        if (!id) return;
        navigator.clipboard.writeText(id);
        setCopiedId(true);
        useStore.getState().addToast('Creator ID copied!', 'success');
        setTimeout(() => setCopiedId(false), 2000);
    };

    // ─── Loading / Auth Gates ──────────────────────────────────────────────────

    if (!authInitialized || isResolvingProfile) return <GlobalLoader color="#39ff14" />;

    if (!user || !profile) {
        return (
            <div className="min-h-screen min-h-[100dvh] bg-[#fafafa] dark:bg-[#08090d] flex flex-col items-center justify-center p-6">
                <div className="absolute inset-0 z-0 pointer-events-none">
                    <div className="absolute -top-24 left-1/3 w-[600px] h-[350px] bg-neon-green/[0.03] rounded-full blur-[140px]" />
                </div>
                <div className="relative z-10 max-w-sm w-full bg-white dark:bg-[#0c0e14] border border-black/[0.07] dark:border-white/[0.07] rounded-3xl p-8 text-center shadow-lg">
                    <div className="w-16 h-16 bg-neon-green/10 text-emerald-600 dark:text-neon-green rounded-2xl flex items-center justify-center mx-auto mb-5 border border-neon-green/20">
                        <Lock size={28} strokeWidth={1.5} />
                    </div>
                    <h2 className="text-xl font-black font-heading tracking-tight mb-2 text-gray-900 dark:text-white">Sign In to Dashboard</h2>
                    <p className="text-sm text-gray-500 dark:text-zinc-400 mb-6 leading-relaxed">Authenticate to access your campaigns, rewards, and creator ID.</p>
                    <div className="space-y-3">
                        <button onClick={() => setAuthModal(true)} className="w-full h-12 bg-neon-green text-black font-black uppercase tracking-wider rounded-xl hover:bg-emerald-400 transition-all active:scale-95 shadow-[0_0_16px_rgba(57,255,20,0.15)] flex items-center justify-center gap-2 text-sm">
                            Sign In Securely <ArrowRight size={16} />
                        </button>
                        <button onClick={() => navigate('/creator/join')} className="w-full h-12 bg-transparent border border-black/10 dark:border-white/10 text-gray-600 dark:text-zinc-300 font-bold uppercase tracking-wider rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-all active:scale-95 text-xs">
                            Apply as Creator
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ─── Tab Definitions ───────────────────────────────────────────────────────

    const tabs = [
        { id: 'opportunities', label: 'Openings', mobileLabel: 'Openings', icon: Compass, count: availableCampaigns.length },
        { id: 'active', label: 'Deliverables', mobileLabel: 'Active', icon: Briefcase, count: joinedCampaignsList.length },
        { id: 'referrals', label: 'Referrals', mobileLabel: 'Referrals', icon: Users, count: null },
        { id: 'rewards', label: 'Vault', mobileLabel: 'Vault', icon: Trophy, count: 'Soon' },
    ];

    const creatorHandle = profile.instagram ? `@${profile.instagram.replace(/^@/, '')}` : profile.linkedin ? profile.linkedin.replace(/^@/, '') : 'creator';
    const creatorId = profile?.creatorId || String(profile?.uid || '').slice(0, 8).toUpperCase();

    // ─── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="min-h-screen min-h-[100dvh] bg-[#fafafa] dark:bg-[#08090d] text-gray-950 dark:text-white transition-colors duration-300 selection:bg-neon-green selection:text-black">

            {/* Ambient background */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-24 left-1/3 w-[500px] h-[300px] bg-neon-green/[0.025] dark:bg-neon-green/[0.02] rounded-full blur-[120px]" />
            </div>

            {/* ─── Scrollable Content ─────────────────────────────────────────── */}
            <div className="relative z-10 max-w-3xl mx-auto px-4 pt-20 pb-28 sm:pt-28 sm:pb-12 sm:px-6">

                {/* ── Profile Hero ─────────────────────────────────────────────── */}
                <div className="flex items-center gap-3 mb-5">
                    {/* Avatar */}
                    <div className="relative shrink-0">
                        <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-zinc-800 border border-black/[0.08] dark:border-white/[0.08] overflow-hidden shadow-sm">
                            {profile.profilePicture
                                ? <img src={profile.profilePicture} alt={profile.name} className="w-full h-full object-cover" />
                                : <div className="w-full h-full flex items-center justify-center font-black text-lg text-neon-green">{profile.name?.charAt(0) || 'C'}</div>}
                        </div>
                        {profile.profileStatus === 'approved' && (
                            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-500 dark:bg-neon-green border-2 border-white dark:border-[#08090d] flex items-center justify-center">
                                <Check size={8} className="text-white dark:text-black" strokeWidth={3} />
                            </div>
                        )}
                    </div>

                    {/* Name + meta */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-lg font-black font-heading tracking-tight text-gray-950 dark:text-white leading-tight">{profile.name}</h1>
                            {profile.profileStatus !== 'approved' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 text-[9px] font-black uppercase tracking-wider font-mono">
                                    <Clock size={9} /> Pending
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-500 dark:text-zinc-400 flex-wrap">
                            <span>{creatorHandle}</span>
                            <span className="opacity-30">·</span>
                            <span className="flex items-center gap-0.5"><MapPin size={10} className="text-neon-green" />{profile.city || 'Pan-India'}</span>
                            <span className="opacity-30">·</span>
                            <button
                                type="button"
                                onClick={handleCopyCreatorId}
                                className="inline-flex items-center gap-1 font-mono text-[10px] bg-black/[0.05] dark:bg-white/[0.06] px-1.5 py-0.5 rounded-md hover:bg-black/[0.09] dark:hover:bg-white/[0.1] transition-colors"
                                title="Copy Creator ID"
                            >
                                {creatorId}
                                {copiedId ? <Check size={9} className="text-neon-green" /> : <Copy size={9} className="opacity-50" />}
                            </button>
                        </div>
                    </div>

                    {/* Settings */}
                    <button
                        type="button"
                        onClick={() => openProfilePanel('creator')}
                        className="w-9 h-9 rounded-xl bg-white dark:bg-white/[0.05] border border-black/[0.08] dark:border-white/[0.08] flex items-center justify-center text-gray-600 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-white/[0.08] transition-colors shadow-sm shrink-0"
                        aria-label="Edit Profile"
                    >
                        <Settings size={15} />
                    </button>
                </div>

                {/* ── Phone Verification Banner (slim, dismissable) ─────────────── */}
                <AnimatePresence>
                    {!profile.isPhoneVerified && !phoneBannerDismissed && (
                        <motion.div
                            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                            animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
                            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-500/[0.08] border border-amber-200 dark:border-amber-500/20 rounded-xl">
                                <Phone size={13} className="text-amber-600 dark:text-amber-400 shrink-0" />
                                <p className="flex-1 text-xs text-amber-800 dark:text-amber-300 min-w-0">
                                    <span className="font-bold">Phone unverified</span> — verify to receive direct brand briefs
                                </p>
                                <button
                                    type="button"
                                    onClick={() => openProfilePanel('creator')}
                                    className="text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-400 underline underline-offset-2 shrink-0"
                                >
                                    Fix
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPhoneBannerDismissed(true)}
                                    className="text-amber-500 dark:text-amber-500 opacity-60 hover:opacity-100 transition-opacity shrink-0"
                                    aria-label="Dismiss"
                                >
                                    <X size={13} />
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ── Stats Strip ───────────────────────────────────────────────── */}
                <div className="grid grid-cols-3 gap-2.5 mb-5">
                    {[
                        {
                            label: 'Creator Points',
                            value: creatorPoints.toLocaleString(),
                            sub: 'PTS',
                            accent: true,
                            onClick: () => setActiveTab('rewards'),
                        },
                        {
                            label: 'Active Briefs',
                            value: joinedCampaignsList.length,
                            sub: `${availableCampaigns.length} open`,
                            onClick: () => setActiveTab(joinedCampaignsList.length > 0 ? 'active' : 'opportunities'),
                        },
                        {
                            label: 'Approval Rate',
                            value: `${efficiencyRate}%`,
                            sub: `${approvedTasks}/${totalTasks} done`,
                            onClick: () => setActiveTab('active'),
                        },
                    ].map(stat => (
                        <motion.button
                            key={stat.label}
                            type="button"
                            whileTap={{ scale: 0.97 }}
                            onClick={stat.onClick}
                            className="bg-white dark:bg-[#0c0e14] border border-black/[0.07] dark:border-white/[0.07] rounded-2xl p-3.5 text-left shadow-sm hover:border-black/[0.12] dark:hover:border-white/[0.12] transition-colors group"
                        >
                            <div className={`text-xl font-black font-heading leading-none mb-1 ${stat.accent ? 'text-emerald-600 dark:text-neon-green' : 'text-gray-950 dark:text-white'}`}>
                                {stat.value}
                            </div>
                            {stat.sub && (
                                <div className="text-[9px] font-black uppercase tracking-widest text-gray-400 dark:text-zinc-500 mb-0.5">{stat.sub}</div>
                            )}
                            <div className="text-[9px] text-gray-400 dark:text-zinc-600 truncate">{stat.label}</div>
                        </motion.button>
                    ))}
                </div>

                {/* ── City Group (slim, only if not joined) ────────────────────── */}
                {!profile.hasJoinedCityGroup && (
                    <div className="mb-5">
                        <CreatorCityGroupCard
                            initialCity={profile?.city || ''}
                            creatorId={profile?.uid || profile?.id}
                            isJoined={Boolean(profile?.hasJoinedCityGroup)}
                            onJoinMarked={() => setProfile(prev => ({ ...prev, hasJoinedCityGroup: true, joinedCityGroupAt: new Date().toISOString() }))}
                        />
                    </div>
                )}

                {/* ── Desktop Tab Bar ───────────────────────────────────────────── */}
                <div className="hidden sm:flex items-center gap-1 bg-white dark:bg-[#0c0e14] border border-black/[0.07] dark:border-white/[0.07] rounded-2xl p-1 mb-5 shadow-sm">
                    {tabs.map(tab => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    'relative flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all',
                                    isActive
                                        ? 'bg-black dark:bg-white text-white dark:text-black shadow-sm'
                                        : 'text-gray-500 dark:text-zinc-400 hover:text-gray-800 dark:hover:text-white'
                                )}
                            >
                                <Icon size={13} />
                                <span>{tab.label}</span>
                                {tab.count !== null && tab.count !== undefined && (
                                    <span className={cn(
                                        'text-[9px] px-1 py-0.5 rounded font-mono font-black leading-none',
                                        tab.count === 'Soon'
                                            ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                                            : isActive
                                                ? 'bg-white/20 dark:bg-black/20 text-white dark:text-black'
                                                : 'bg-black/[0.05] dark:bg-white/[0.08] text-gray-400 dark:text-zinc-500'
                                    )}>
                                        {tab.count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* ── Tab Content ───────────────────────────────────────────────── */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
                    >
                        {/* ─ Opportunities ─ */}
                        {activeTab === 'opportunities' && (
                            <div className="space-y-4">
                                {/* Search + Filters */}
                                <div className="space-y-2.5">
                                    <div className="relative">
                                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500" size={14} />
                                        <input
                                            type="text"
                                            value={briefSearch}
                                            onChange={e => setBriefSearch(e.target.value)}
                                            placeholder="Search by title, brand, city or reward…"
                                            className="w-full h-10 pl-10 pr-9 rounded-xl bg-white dark:bg-[#0c0e14] border border-black/[0.07] dark:border-white/[0.07] text-xs text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:border-neon-green/70 transition-colors shadow-sm"
                                        />
                                        {briefSearch && (
                                            <button type="button" onClick={() => setBriefSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
                                                <X size={14} />
                                            </button>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
                                        {[
                                            { id: 'all', label: 'All', count: availableCampaigns.length },
                                            { id: 'city', label: profile?.city ? `In ${profile.city}` : 'My City', count: localCampaigns.length },
                                            { id: 'paid', label: 'Paid' },
                                            { id: 'barter', label: 'Barter & Perks' },
                                        ].map(f => (
                                            <button
                                                key={f.id}
                                                type="button"
                                                onClick={() => setBriefFilter(f.id)}
                                                className={cn(
                                                    'px-3 py-1.5 rounded-lg text-[11px] font-semibold tracking-wide transition-all shrink-0 flex items-center gap-1',
                                                    briefFilter === f.id
                                                        ? 'bg-black dark:bg-white text-white dark:text-black shadow-sm'
                                                        : 'bg-white dark:bg-[#0c0e14] border border-black/[0.07] dark:border-white/[0.07] text-gray-600 dark:text-zinc-400 hover:text-gray-950 dark:hover:text-white'
                                                )}
                                            >
                                                {f.label}
                                                {f.count !== undefined && (
                                                    <span className={cn('text-[9px] font-mono font-black px-1 py-0.5 rounded leading-none',
                                                        briefFilter === f.id ? 'bg-white/20 dark:bg-black/20 text-white dark:text-black' : 'bg-black/[0.05] dark:bg-white/[0.08] text-gray-400 dark:text-zinc-500'
                                                    )}>{f.count}</span>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Campaign list */}
                                {filteredAvailableCampaigns.length > 0 ? (
                                    <div className="grid grid-cols-1 gap-4">
                                        <AnimatePresence mode="popLayout">
                                            {filteredAvailableCampaigns.map(c => (
                                                <motion.div key={c.id} layout initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }}>
                                                    <CampaignCard campaign={c} profile={profile} type="available" onOpenMission={camp => setSelectedCampaignForModal(camp)} />
                                                </motion.div>
                                            ))}
                                        </AnimatePresence>
                                    </div>
                                ) : (
                                    <div className="bg-white dark:bg-[#0c0e14] border border-black/[0.07] dark:border-white/[0.07] rounded-2xl py-14 px-6 text-center shadow-sm">
                                        <Compass size={24} className="text-gray-300 dark:text-zinc-700 mx-auto mb-3" strokeWidth={1.5} />
                                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                                            {briefFilter === 'city' ? `No briefs in ${profile?.city || 'your city'}` : briefSearch ? 'No matching briefs' : 'No briefs available'}
                                        </h4>
                                        <p className="text-xs text-gray-500 dark:text-zinc-400 max-w-xs mx-auto leading-relaxed">
                                            {briefSearch ? `No results for "${briefSearch}". Try clearing your search.` : 'Campaigns are refreshed frequently. Check back soon.'}
                                        </p>
                                        {(briefFilter !== 'all' || briefSearch) && (
                                            <button type="button" onClick={() => { setBriefSearch(''); setBriefFilter('all'); }} className="mt-4 h-9 px-4 rounded-xl bg-gray-950 dark:bg-white text-white dark:text-black text-xs font-semibold tracking-wide transition-all active:scale-95 inline-flex items-center gap-1.5">
                                                View All ({availableCampaigns.length})
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ─ Active / Deliverables ─ */}
                        {activeTab === 'active' && (
                            <div className="space-y-4">
                                {joinedCampaignsList.length > 0 && (
                                    <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
                                        {[
                                            { id: 'all', label: `All (${joinedCampaignsList.length})` },
                                            { id: 'shortlisted', label: 'Ongoing' },
                                            { id: 'in_review', label: 'Under Review' },
                                            { id: 'completed', label: 'Completed' },
                                        ].map(f => (
                                            <button
                                                key={f.id}
                                                type="button"
                                                onClick={() => setDeliverableFilter(f.id)}
                                                className={cn(
                                                    'px-3 py-1.5 rounded-lg text-[11px] font-semibold tracking-wide transition-all shrink-0',
                                                    deliverableFilter === f.id
                                                        ? 'bg-black dark:bg-white text-white dark:text-black shadow-sm'
                                                        : 'bg-white dark:bg-[#0c0e14] border border-black/[0.07] dark:border-white/[0.07] text-gray-600 dark:text-zinc-400 hover:text-gray-950 dark:hover:text-white'
                                                )}
                                            >
                                                {f.label}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {filteredJoinedCampaigns.length > 0 ? (
                                    <div className="grid grid-cols-1 gap-4">
                                        <AnimatePresence mode="popLayout">
                                            {filteredJoinedCampaigns.map(c => (
                                                <motion.div key={c.id} layout initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }}>
                                                    <CampaignCard campaign={c} profile={profile} type="joined" onOpenMission={camp => setSelectedCampaignForModal(camp)} />
                                                </motion.div>
                                            ))}
                                        </AnimatePresence>
                                    </div>
                                ) : (
                                    <div className="bg-white dark:bg-[#0c0e14] border border-black/[0.07] dark:border-white/[0.07] rounded-2xl py-14 px-6 text-center shadow-sm">
                                        <Briefcase size={24} className="text-gray-300 dark:text-zinc-700 mx-auto mb-3" strokeWidth={1.5} />
                                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                                            {joinedCampaignsList.length === 0 ? 'No active campaigns' : 'No campaigns in this filter'}
                                        </h4>
                                        <p className="text-xs text-gray-500 dark:text-zinc-400 max-w-xs mx-auto leading-relaxed">
                                            {joinedCampaignsList.length === 0
                                                ? 'Browse open briefs to join campaigns, submit deliverables, and claim rewards.'
                                                : 'Try selecting a different filter above.'}
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() => joinedCampaignsList.length === 0 ? setActiveTab('opportunities') : setDeliverableFilter('all')}
                                            className="mt-4 h-9 px-4 rounded-xl bg-gray-950 dark:bg-white text-white dark:text-black text-xs font-semibold tracking-wide transition-all active:scale-95 inline-flex items-center gap-1.5"
                                        >
                                            {joinedCampaignsList.length === 0 ? (<><span>Explore Briefs</span><ArrowRight size={13} /></>) : 'Show All'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ─ Referrals ─ */}
                        {activeTab === 'referrals' && <CreatorReferralsView profile={profile} />}

                        {/* ─ Vault ─ */}
                        {activeTab === 'rewards' && <CreatorVaultView creatorPoints={creatorPoints} />}
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* ─── Mobile Bottom Tab Bar (iOS style) ─────────────────────────── */}
            <div className="sm:hidden fixed bottom-0 left-0 right-0 z-50">
                {/* Frosted glass bar */}
                <div
                    className="relative bg-white/90 dark:bg-[#0c0e14]/95 border-t border-black/[0.07] dark:border-white/[0.07] px-2 pb-[env(safe-area-inset-bottom,0px)]"
                    style={{ backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}
                >
                    <div className="flex items-center justify-around">
                        {tabs.map(tab => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setActiveTab(tab.id)}
                                    className="relative flex flex-col items-center justify-center gap-0.5 py-3 px-3 min-w-[56px] transition-all active:scale-90"
                                    aria-label={tab.label}
                                >
                                    {/* Active indicator pill */}
                                    {isActive && (
                                        <motion.div
                                            layoutId="mobile-tab-indicator"
                                            className="absolute inset-x-1 top-1 h-0.5 rounded-full bg-neon-green"
                                            transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                                        />
                                    )}

                                    {/* Badge */}
                                    {tab.count !== null && tab.count !== undefined && tab.count !== 0 && (
                                        <div className="absolute top-2 right-2">
                                            {tab.count === 'Soon' ? (
                                                <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                            ) : (
                                                <div className="min-w-[14px] h-[14px] rounded-full bg-neon-green text-black text-[8px] font-black flex items-center justify-center px-1 leading-none">
                                                    {tab.count}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <Icon
                                        size={20}
                                        strokeWidth={isActive ? 2 : 1.5}
                                        className={cn(
                                            'transition-colors',
                                            isActive ? 'text-gray-950 dark:text-white' : 'text-gray-400 dark:text-zinc-500'
                                        )}
                                    />
                                    <span className={cn(
                                        'text-[10px] font-semibold transition-colors leading-none',
                                        isActive ? 'text-gray-950 dark:text-white' : 'text-gray-400 dark:text-zinc-500'
                                    )}>
                                        {tab.mobileLabel}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* ─── Campaign Detail Modal ───────────────────────────────────────── */}
            <AnimatePresence>
                {selectedCampaignForModal && (
                    <CampaignDetailModal
                        campaign={selectedCampaignForModal}
                        onClose={() => setSelectedCampaignForModal(null)}
                        initialTaskId={new URLSearchParams(location.search).get('taskId')}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default CreatorDashboard;
