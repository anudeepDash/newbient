import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../lib/store';
import { useStoreSubscription } from '../hooks/useStoreSubscription';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn, normalizePhoneNumber } from '../lib/utils';
import { useTheme } from '../hooks/useTheme';
import GlobalLoader from '../components/ui/GlobalLoader';
import CampaignCard from '../components/ui/CampaignCard';
import { HorizontalCarousel } from '../components/ui/HorizontalCarousel';
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
import UsersRound from 'lucide-react/dist/esm/icons/users-round';
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
import ArrowLeft from 'lucide-react/dist/esm/icons/arrow-left';


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

            {/* Roster & Leaderboard Grid */}
            <div className={cn("grid grid-cols-1 gap-4", myReferrals.length > 0 ? "lg:grid-cols-2" : "")}>
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
                                        <div className={cn('text-xs font-bold truncate', isMe ? 'text-emerald-700 dark:text-neon-green' : 'text-gray-950 dark:text-white')}>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 opacity-75">
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

    const activeSubs = useMemo(() => ['campaigns', 'creatorGroups', 'creators'], []);
    useStoreSubscription(activeSubs);

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
            const matchesCollege = !c.targetCollege || c.targetCollege === 'Any' ||
                (profile?.collegeName && profile.collegeName.toLowerCase().includes(c.targetCollege.toLowerCase()));
            return matchesCollege;
        });
    }, [allCampaignsList, profile]);

    const unappliedCampaigns = useMemo(() => {
        return availableCampaigns.filter(c => !(profile?.joinedCampaigns || []).includes(c.id));
    }, [availableCampaigns, profile?.joinedCampaigns]);

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
            if (briefFilter === 'unapplied') return !(profile?.joinedCampaigns || []).includes(c.id);
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

    const referralCount = useMemo(() => {
        if (!profile) return 0;
        const profUid = profile.uid;
        const profIdUpper = profile.creatorId ? String(profile.creatorId).toUpperCase() : null;
        return (creators || []).filter(c => {
            const ref = c.referredBy;
            if (!ref) return false;
            if (ref === profUid) return true;
            if (profIdUpper && String(ref).toUpperCase() === profIdUpper) return true;
            return false;
        }).length;
    }, [creators, profile]);

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
            <div className="min-h-screen min-h-[100dvh] bg-gray-50 dark:bg-[#07090E] flex flex-col items-center justify-center p-6 relative overflow-hidden">
                {/* Ambient dynamic background */}
                <div className="absolute inset-0 z-0 pointer-events-none">
                    <motion.div 
                        animate={{ 
                            scale: [1, 1.2, 1],
                            opacity: [0.3, 0.5, 0.3]
                        }}
                        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-neon-green/10 dark:bg-neon-green/5 rounded-full blur-[120px]" 
                    />
                    <motion.div 
                        animate={{ 
                            scale: [1, 1.5, 1],
                            opacity: [0.2, 0.4, 0.2]
                        }}
                        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
                        className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-blue-500/10 dark:bg-blue-500/5 rounded-full blur-[100px]" 
                    />
                </div>

                {/* Back to Home Button */}
                <motion.button
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    onClick={() => navigate('/')}
                    className="absolute top-8 left-6 sm:top-12 sm:left-12 flex items-center gap-2 text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white transition-colors text-[10px] font-bold uppercase tracking-widest z-20"
                >
                    <ArrowLeft size={16} /> newbi.live
                </motion.button>

                <motion.div 
                    initial={{ opacity: 0, y: 30, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    className="relative z-10 max-w-[380px] w-full"
                >
                    <div className="bg-white/80 dark:bg-[#12151C]/80 backdrop-blur-2xl border border-black/5 dark:border-white/10 rounded-[2.5rem] p-10 text-center shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] overflow-hidden">
                        {/* Shimmer effect */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/40 dark:via-white/5 to-transparent opacity-50" />
                        
                        <div className="relative">
                            <motion.div 
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", delay: 0.1, stiffness: 400, damping: 20 }}
                                className="w-20 h-20 mx-auto mb-8 relative"
                            >
                                <div className="absolute inset-0 bg-neon-green/20 dark:bg-neon-green/10 rounded-[2rem] animate-ping opacity-50" style={{ animationDuration: '3s' }} />
                                <div className="absolute inset-0 bg-gradient-to-br from-neon-green/30 to-emerald-500/10 rounded-[2rem] rotate-6" />
                                <div className="absolute inset-0 bg-white dark:bg-[#1A1D24] border border-black/5 dark:border-white/10 rounded-[2rem] -rotate-3 flex items-center justify-center shadow-lg transition-transform hover:rotate-0 duration-300">
                                    <Lock size={28} className="text-emerald-600 dark:text-neon-green" strokeWidth={1.5} />
                                </div>
                            </motion.div>

                            <motion.h2 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="text-2xl font-black font-heading tracking-tight mb-3 text-gray-900 dark:text-white"
                            >
                                Dashboard Access
                            </motion.h2>
                            <motion.p 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="text-sm text-gray-500 dark:text-zinc-400 mb-8 leading-relaxed px-2"
                            >
                                Secure your session to view active campaigns, deliverables, and claim your rewards.
                            </motion.p>

                            <div className="space-y-3">
                                <motion.button 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.4 }}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => setAuthModal(true)} 
                                    className="w-full h-14 bg-gray-900 dark:bg-neon-green text-white dark:text-black font-bold uppercase tracking-wider rounded-2xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 text-[11px]"
                                >
                                    <Lock size={14} className="opacity-70" /> Sign In Securely
                                </motion.button>
                                
                                <motion.button 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.5 }}
                                    onClick={() => navigate('/creator/join')} 
                                    className="w-full h-14 bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-zinc-300 font-bold uppercase tracking-wider rounded-2xl hover:bg-gray-50 dark:hover:bg-white/5 transition-all active:scale-95 text-[10px]"
                                >
                                    Apply as Creator
                                </motion.button>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        );
    }


    // ─── Tab Definitions ───────────────────────────────────────────────────────

    const tabs = [
        { id: 'opportunities', label: 'Openings', mobileLabel: 'Openings', icon: Compass, count: availableCampaigns.length },
        { id: 'active', label: 'Deliverables', mobileLabel: 'Deliverables', icon: Layers, count: joinedCampaignsList.length },
        { id: 'referrals', label: 'Referrals', mobileLabel: 'Referrals', icon: UsersRound, count: referralCount > 0 ? referralCount : null },
        { id: 'rewards', label: 'Vault', mobileLabel: 'Vault', icon: Sparkles, count: 'Soon' },
    ];

    const creatorHandle = profile.instagram ? `@${profile.instagram.replace(/^@/, '')}` : profile.linkedin ? profile.linkedin.replace(/^@/, '') : 'creator';
    const creatorId = profile?.creatorId || String(profile?.uid || '').slice(0, 8).toUpperCase();

    // ─── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="min-h-screen min-h-[100dvh] bg-[#fafafa] dark:bg-[#08090d] text-gray-950 dark:text-white transition-colors duration-300 selection:bg-neon-green selection:text-black font-heading">

            {/* Ambient background */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-24 left-1/3 w-[600px] h-[350px] bg-neon-green/[0.03] dark:bg-neon-green/[0.02] rounded-full blur-[140px]" />
                <div className="absolute top-1/2 -right-24 w-[400px] h-[400px] bg-blue-500/[0.02] dark:bg-blue-500/[0.015] rounded-full blur-[120px]" />
            </div>

            {/* ─── Scrollable Content ─────────────────────────────────────────── */}
            <div className="relative z-10 w-full max-w-7xl xl:max-w-[1536px] 2xl:max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 pt-24 pb-28 sm:pt-28 md:pt-32 sm:pb-20">

                {/* ── Profile & Hero Card ───────────────────────────────────────────── */}
                <div className="relative bg-white/70 dark:bg-[#0c0e14]/80 backdrop-blur-2xl border border-black/[0.06] dark:border-white/[0.08] rounded-3xl p-5 sm:p-7 mb-6 shadow-[0_8px_32px_rgba(0,0,0,0.02)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)] overflow-hidden group">
                    {/* Glowing corner accent */}
                    <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-neon-green/[0.08] to-transparent rounded-full blur-3xl pointer-events-none -mr-20 -mt-20 group-hover:scale-105 transition-transform duration-700" />
                    
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
                        {/* Left: Avatar + Details */}
                        <div className="flex items-center gap-4 sm:gap-5 min-w-0">
                            {/* Avatar */}
                            <div className="relative shrink-0">
                                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gray-100 dark:bg-zinc-800 border-2 border-black/[0.06] dark:border-white/[0.1] overflow-hidden shadow-md">
                                    {profile.profilePicture ? (
                                        <img src={profile.profilePicture} alt={profile.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center font-black text-2xl sm:text-3xl text-neon-green bg-black/[0.02] dark:bg-white/[0.02]">
                                            {profile.name?.charAt(0) || 'C'}
                                        </div>
                                    )}
                                </div>
                                {profile.profileStatus === 'approved' && (
                                    <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-neon-green border-2 border-white dark:border-[#0c0e14] flex items-center justify-center shadow-sm" title="Verified Creator">
                                        <Check size={12} className="text-black" strokeWidth={3} />
                                    </div>
                                )}
                            </div>

                            {/* Name, Handle, City, ID */}
                            <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                    <h1 className="text-xl sm:text-2xl lg:text-3xl font-black font-heading tracking-tight text-gray-950 dark:text-white leading-tight">
                                        {profile.name}
                                    </h1>
                                    {profile.profileStatus === 'approved' ? (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-neon-green text-[10px] font-black uppercase tracking-wider font-mono border border-emerald-500/20">
                                            <ShieldCheck size={11} /> Verified
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 text-[10px] font-black uppercase tracking-wider font-mono border border-amber-500/20">
                                            <Clock size={11} /> Under Review
                                        </span>
                                    )}
                                </div>

                                <div className="flex items-center gap-2 sm:gap-3 text-xs text-gray-500 dark:text-zinc-400 flex-wrap">
                                    <span className="font-semibold text-gray-700 dark:text-zinc-300">{creatorHandle}</span>
                                    <span className="opacity-30">·</span>
                                    <span className="flex items-center gap-1 font-medium">
                                        <MapPin size={12} className="text-neon-green shrink-0" />
                                        <span>{profile.city || 'Pan-India'}</span>
                                    </span>
                                    <span className="opacity-30">·</span>
                                    <button
                                        type="button"
                                        onClick={handleCopyCreatorId}
                                        className="inline-flex items-center gap-1.5 font-mono text-[11px] bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.08] dark:hover:bg-white/[0.1] px-2 py-0.5 rounded-lg transition-colors font-semibold"
                                        title="Copy Creator ID"
                                    >
                                        <span>#{creatorId}</span>
                                        {copiedId ? <Check size={10} className="text-neon-green" /> : <Copy size={10} className="opacity-50" />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Right: Quick Actions */}
                        <div className="flex items-center gap-2.5 shrink-0 self-start md:self-center">
                            <button
                                type="button"
                                onClick={() => {
                                    const link = `${window.location.origin}/creator/join?ref=${creatorId}`;
                                    navigator.clipboard.writeText(link);
                                    useStore.getState().addToast('Referral invite link copied!', 'success');
                                }}
                                className="h-10 px-4 rounded-xl bg-black/[0.04] dark:bg-white/[0.05] border border-black/[0.06] dark:border-white/[0.08] hover:bg-black/[0.08] dark:hover:bg-white/[0.1] text-xs font-bold text-gray-700 dark:text-zinc-200 transition-colors flex items-center gap-1.5 active:scale-95"
                                title="Share Creator Invite Link"
                            >
                                <Share2 size={14} />
                                <span>Share</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => openProfilePanel('creator')}
                                className="h-10 px-4 sm:px-5 rounded-xl bg-gray-950 dark:bg-white text-white dark:text-black hover:bg-black dark:hover:bg-zinc-200 transition-all font-bold text-xs flex items-center gap-2 shadow-sm active:scale-95"
                            >
                                <Settings size={14} />
                                <span>Edit Profile</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* ── Key Performance Metrics Strip ───────────────────────────── */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
                    {/* Points Vault */}
                    <motion.button
                        type="button"
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                            setActiveTab('rewards');
                            const el = document.getElementById('dashboard-tab-content');
                            if (el) window.scrollTo({ top: el.offsetTop - 90, behavior: 'smooth' });
                        }}
                        className="relative overflow-hidden bg-white/70 dark:bg-[#0c0e14]/70 backdrop-blur-2xl border border-black/[0.06] dark:border-white/[0.08] hover:border-amber-500/40 dark:hover:border-amber-500/40 rounded-3xl p-4 sm:p-5 text-left shadow-[0_4px_20px_rgba(0,0,0,0.02)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all group"
                    >
                        <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/[0.06] dark:bg-amber-400/[0.05] rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform" />
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-zinc-500 font-mono">
                                Vault Points
                            </span>
                            <div className="w-7 h-7 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                                <Sparkles size={14} />
                            </div>
                        </div>
                        <div className="text-xl sm:text-2xl lg:text-3xl font-black font-heading leading-tight text-emerald-600 dark:text-neon-green mb-1 truncate">
                            {creatorPoints.toLocaleString()}
                        </div>
                        <div className="text-[10px] font-semibold text-gray-500 dark:text-zinc-400 flex items-center gap-0.5 truncate group-hover:text-amber-500 transition-colors">
                            <span>Redeem Perks</span>
                            <ChevronRight size={11} className="opacity-60 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                    </motion.button>

                    {/* Active Deliverables */}
                    <motion.button
                        type="button"
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                            setActiveTab(joinedCampaignsList.length > 0 ? 'active' : 'opportunities');
                            const el = document.getElementById('dashboard-tab-content');
                            if (el) window.scrollTo({ top: el.offsetTop - 90, behavior: 'smooth' });
                        }}
                        className="relative overflow-hidden bg-white/70 dark:bg-[#0c0e14]/70 backdrop-blur-2xl border border-black/[0.06] dark:border-white/[0.08] hover:border-blue-500/40 dark:hover:border-blue-500/40 rounded-3xl p-4 sm:p-5 text-left shadow-[0_4px_20px_rgba(0,0,0,0.02)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all group"
                    >
                        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/[0.06] dark:bg-blue-400/[0.05] rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform" />
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-zinc-500 font-mono">
                                Deliverables
                            </span>
                            <div className="w-7 h-7 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                                <Layers size={14} />
                            </div>
                        </div>
                        <div className="text-xl sm:text-2xl lg:text-3xl font-black font-heading leading-tight text-gray-950 dark:text-white mb-1">
                            {joinedCampaignsList.length}
                        </div>
                        <div className="text-[10px] font-semibold text-gray-500 dark:text-zinc-400 truncate group-hover:text-blue-500 transition-colors">
                            {availableCampaigns.length} live briefs
                        </div>
                    </motion.button>

                    {/* Efficiency / Approval Rate */}
                    <motion.button
                        type="button"
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                            setActiveTab('active');
                            const el = document.getElementById('dashboard-tab-content');
                            if (el) window.scrollTo({ top: el.offsetTop - 90, behavior: 'smooth' });
                        }}
                        className="relative overflow-hidden bg-white/70 dark:bg-[#0c0e14]/70 backdrop-blur-2xl border border-black/[0.06] dark:border-white/[0.08] hover:border-emerald-500/40 dark:hover:border-neon-green/40 rounded-3xl p-4 sm:p-5 text-left shadow-[0_4px_20px_rgba(0,0,0,0.02)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all group"
                    >
                        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/[0.06] dark:bg-neon-green/[0.05] rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform" />
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-zinc-500 font-mono">
                                Success Rate
                            </span>
                            <div className="w-7 h-7 rounded-xl bg-emerald-500/10 dark:bg-neon-green/10 text-emerald-600 dark:text-neon-green flex items-center justify-center">
                                <Zap size={14} />
                            </div>
                        </div>
                        <div className="text-xl sm:text-2xl lg:text-3xl font-black font-heading leading-tight text-gray-950 dark:text-white mb-1">
                            {efficiencyRate}%
                        </div>
                        <div className="text-[10px] font-semibold text-gray-500 dark:text-zinc-400 truncate group-hover:text-emerald-500 dark:group-hover:text-neon-green transition-colors">
                            {approvedTasks}/{totalTasks} verified
                        </div>
                    </motion.button>

                    {/* Referrals / Network */}
                    <motion.button
                        type="button"
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                            setActiveTab('referrals');
                            const el = document.getElementById('dashboard-tab-content');
                            if (el) window.scrollTo({ top: el.offsetTop - 90, behavior: 'smooth' });
                        }}
                        className="relative overflow-hidden bg-white/70 dark:bg-[#0c0e14]/70 backdrop-blur-2xl border border-black/[0.06] dark:border-white/[0.08] hover:border-purple-500/40 dark:hover:border-purple-500/40 rounded-3xl p-4 sm:p-5 text-left shadow-[0_4px_20px_rgba(0,0,0,0.02)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all group"
                    >
                        <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/[0.06] dark:bg-purple-400/[0.05] rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform" />
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-zinc-500 font-mono">
                                Creator Network
                            </span>
                            <div className="w-7 h-7 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
                                <UsersRound size={14} />
                            </div>
                        </div>
                        <div className="text-xl sm:text-2xl lg:text-3xl font-black font-heading leading-tight text-gray-950 dark:text-white mb-1">
                            {referralCount}
                        </div>
                        <div className="text-[10px] font-semibold text-gray-500 dark:text-zinc-400 flex items-center gap-0.5 truncate group-hover:text-purple-500 transition-colors">
                            <span>Invite & Earn PTS</span>
                            <ChevronRight size={11} className="opacity-60 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                    </motion.button>
                </div>

                {/* ── Banners & Notifications (Phone Verification & City Group) ──── */}
                <div className="space-y-4 mb-6">
                    {/* Phone Verification Banner */}
                    <AnimatePresence>
                        {!profile.isPhoneVerified && !phoneBannerDismissed && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-500/[0.08] border border-amber-200 dark:border-amber-500/20 rounded-2xl">
                                    <Phone size={14} className="text-amber-600 dark:text-amber-400 shrink-0" />
                                    <p className="flex-1 text-xs text-amber-800 dark:text-amber-300 min-w-0">
                                        <span className="font-bold">Phone number unverified</span> — complete verification to unlock exclusive brand invitations and payouts.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => openProfilePanel('creator')}
                                        className="text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-400 underline shrink-0 hover:opacity-80"
                                    >
                                        Verify Now
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPhoneBannerDismissed(true)}
                                        className="text-amber-500 opacity-60 hover:opacity-100 transition-opacity shrink-0 ml-1"
                                        aria-label="Dismiss banner"
                                    >
                                        <X size={13} />
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Single City Group Community Card */}
                    {!profile.hasJoinedCityGroup && (
                        <CreatorCityGroupCard
                            initialCity={profile?.city || ''}
                            creatorId={profile?.uid || profile?.id}
                            isJoined={Boolean(profile?.hasJoinedCityGroup)}
                            onJoinMarked={() => setProfile(prev => ({ ...prev, hasJoinedCityGroup: true, joinedCityGroupAt: new Date().toISOString() }))}
                        />
                    )}
                </div>

                {/* ── Desktop Tab Bar (Apple Segmented Capsule) ───────────── */}
                <div className="hidden sm:flex items-center justify-start mb-6">
                    <div className="inline-flex items-center gap-1 bg-black/[0.04] dark:bg-white/[0.04] border border-black/[0.05] dark:border-white/[0.07] rounded-2xl p-1.5 backdrop-blur-xl shadow-xs">
                        {tabs.map(tab => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setActiveTab(tab.id)}
                                    className={cn(
                                        'relative flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold tracking-tight transition-colors',
                                        isActive
                                            ? 'text-gray-950 dark:text-white font-bold'
                                            : 'text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-black/[0.02] dark:hover:bg-white/[0.02]'
                                    )}
                                >
                                    {isActive && (
                                        <motion.div
                                            layoutId="appleDesktopTabIndicator"
                                            className="absolute inset-0 rounded-xl bg-white dark:bg-[#1a1f2c] shadow-[0_2px_8px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_10px_rgba(0,0,0,0.4)] border border-black/[0.04] dark:border-white/[0.06]"
                                            transition={{ type: "spring", stiffness: 450, damping: 35 }}
                                        />
                                    )}
                                    <Icon size={15} className="relative z-10 shrink-0" strokeWidth={isActive ? 2.3 : 1.9} />
                                    <span className="relative z-10">{tab.label}</span>
                                    {tab.count !== null && tab.count !== undefined && (
                                        <span className={cn(
                                            'relative z-10 text-[10px] px-1.5 py-0.5 rounded-md font-mono font-bold leading-none transition-colors',
                                            tab.count === 'Soon'
                                                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                                                : isActive
                                                    ? 'bg-black/[0.06] dark:bg-white/10 text-gray-900 dark:text-white'
                                                    : 'bg-black/[0.04] dark:bg-white/[0.06] text-gray-500 dark:text-zinc-400'
                                        )}>
                                            {tab.count}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* ── Main Tab Content ───────────────────────────────────────────── */}
                <div id="dashboard-tab-content" className="scroll-mt-24">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
                        >
                            {/* ─ Opportunities Tab ─ */}
                            {activeTab === 'opportunities' && (
                                <div className="space-y-5">
                                    {/* Search + Filter Bar */}
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                                        {/* Search Input */}
                                        <div className="relative flex-1 max-w-md">
                                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500" size={15} />
                                            <input
                                                type="text"
                                                value={briefSearch}
                                                onChange={e => setBriefSearch(e.target.value)}
                                                placeholder="Search by title, brand, city or reward…"
                                                className="w-full h-11 pl-10 pr-9 rounded-2xl bg-white/70 dark:bg-[#0c0e14]/70 backdrop-blur-xl border border-black/[0.06] dark:border-white/[0.08] text-xs text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:border-neon-green/60 transition-all shadow-xs"
                                            />
                                            {briefSearch && (
                                                <button type="button" onClick={() => setBriefSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
                                                    <X size={14} />
                                                </button>
                                            )}
                                        </div>

                                        {/* Filter Chips */}
                                        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide py-0.5">
                                            {[
                                                { id: 'all', label: 'All', count: availableCampaigns.length },
                                                { id: 'unapplied', label: 'Open to Apply', count: unappliedCampaigns.length },
                                                { id: 'city', label: profile?.city ? `In ${profile.city}` : 'My City', count: localCampaigns.length },
                                                { id: 'paid', label: 'Paid' },
                                                { id: 'barter', label: 'Barter & Perks' },
                                            ].map(f => (
                                                <button
                                                    key={f.id}
                                                    type="button"
                                                    onClick={() => setBriefFilter(f.id)}
                                                    className={cn(
                                                        'px-3.5 py-2 rounded-xl text-xs font-semibold tracking-tight transition-all shrink-0 flex items-center gap-1.5',
                                                        briefFilter === f.id
                                                            ? 'bg-black dark:bg-white text-white dark:text-black shadow-sm font-bold'
                                                            : 'bg-white/70 dark:bg-[#0c0e14]/70 backdrop-blur-xl border border-black/[0.06] dark:border-white/[0.08] text-gray-600 dark:text-zinc-400 hover:text-gray-950 dark:hover:text-white hover:border-black/[0.12] dark:hover:border-white/[0.15]'
                                                    )}
                                                >
                                                    <span>{f.label}</span>
                                                    {f.count !== undefined && (
                                                        <span className={cn('text-[9px] font-mono font-black px-1.5 py-0.5 rounded leading-none',
                                                            briefFilter === f.id ? 'bg-white/20 dark:bg-black/20 text-white dark:text-black' : 'bg-black/[0.05] dark:bg-white/[0.08] text-gray-400 dark:text-zinc-500'
                                                        )}>{f.count}</span>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Campaign Cards (Horizontal scroll on mobile, responsive grid on desktop) */}
                                    {filteredAvailableCampaigns.length > 0 ? (
                                        <HorizontalCarousel
                                            autoScroll={false}
                                            className="pb-5 -mx-4 px-4 sm:mx-0 sm:px-0 gap-4 sm:gap-5 lg:gap-6 sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 sm:overflow-visible"
                                        >
                                            <AnimatePresence mode="popLayout">
                                                {filteredAvailableCampaigns.map(c => (
                                                    <motion.div
                                                        key={c.id}
                                                        layout
                                                        initial={{ opacity: 0, y: 15 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0, scale: 0.95 }}
                                                        transition={{ duration: 0.2 }}
                                                        className="shrink-0 w-[84vw] max-w-[340px] sm:w-auto snap-center flex flex-col"
                                                    >
                                                        <CampaignCard
                                                            campaign={c}
                                                            profile={profile}
                                                            type="available"
                                                            onOpenMission={camp => setSelectedCampaignForModal(camp)}
                                                        />
                                                    </motion.div>
                                                ))}
                                            </AnimatePresence>
                                        </HorizontalCarousel>
                                    ) : (
                                        <div className="bg-white dark:bg-[#0c0e14] border border-black/[0.06] dark:border-white/[0.06] rounded-3xl py-16 px-6 text-center shadow-sm">
                                            <Compass size={28} className="text-gray-300 dark:text-zinc-700 mx-auto mb-3" strokeWidth={1.5} />
                                            <h4 className="text-base font-bold text-gray-900 dark:text-white mb-1">
                                                {briefFilter === 'city' ? `No briefs in ${profile?.city || 'your city'}` : briefSearch ? 'No matching briefs' : 'No briefs available'}
                                            </h4>
                                            <p className="text-xs text-gray-500 dark:text-zinc-400 max-w-xs mx-auto leading-relaxed mb-4">
                                                {briefSearch ? `No results for "${briefSearch}". Try clearing your search.` : 'New brand briefs and festival activations are published frequently.'}
                                            </p>
                                            {(briefFilter !== 'all' || briefSearch) && (
                                                <button
                                                    type="button"
                                                    onClick={() => { setBriefSearch(''); setBriefFilter('all'); }}
                                                    className="h-9 px-4 rounded-xl bg-gray-950 dark:bg-white text-white dark:text-black text-xs font-semibold tracking-wide transition-all active:scale-95 inline-flex items-center gap-1.5"
                                                >
                                                    View All Briefs ({availableCampaigns.length})
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ─ Active Deliverables Tab ─ */}
                            {activeTab === 'active' && (
                                <div className="space-y-5">
                                    {/* Deliverable Filters */}
                                    {joinedCampaignsList.length > 0 && (
                                        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide py-0.5">
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
                                                        'px-3.5 py-2 rounded-xl text-xs font-semibold tracking-tight transition-all shrink-0',
                                                        deliverableFilter === f.id
                                                            ? 'bg-black dark:bg-white text-white dark:text-black shadow-sm font-bold'
                                                            : 'bg-white/70 dark:bg-[#0c0e14]/70 backdrop-blur-xl border border-black/[0.06] dark:border-white/[0.08] text-gray-600 dark:text-zinc-400 hover:text-gray-950 dark:hover:text-white hover:border-black/[0.12] dark:hover:border-white/[0.15]'
                                                    )}
                                                >
                                                    {f.label}
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {/* Deliverables Cards (Horizontal scroll on mobile, responsive grid on desktop) */}
                                    {filteredJoinedCampaigns.length > 0 ? (
                                        <HorizontalCarousel
                                            autoScroll={false}
                                            className="pb-5 -mx-4 px-4 sm:mx-0 sm:px-0 gap-4 sm:gap-5 lg:gap-6 sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 sm:overflow-visible"
                                        >
                                            <AnimatePresence mode="popLayout">
                                                {filteredJoinedCampaigns.map(c => (
                                                    <motion.div
                                                        key={c.id}
                                                        layout
                                                        initial={{ opacity: 0, y: 15 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0, scale: 0.95 }}
                                                        transition={{ duration: 0.2 }}
                                                        className="shrink-0 w-[84vw] max-w-[340px] sm:w-auto snap-center flex flex-col"
                                                    >
                                                        <CampaignCard
                                                            campaign={c}
                                                            profile={profile}
                                                            type="joined"
                                                            onOpenMission={camp => setSelectedCampaignForModal(camp)}
                                                        />
                                                    </motion.div>
                                                ))}
                                            </AnimatePresence>
                                        </HorizontalCarousel>
                                    ) : (
                                        <div className="bg-white dark:bg-[#0c0e14] border border-black/[0.06] dark:border-white/[0.06] rounded-3xl py-16 px-6 text-center shadow-sm">
                                            <Briefcase size={28} className="text-gray-300 dark:text-zinc-700 mx-auto mb-3" strokeWidth={1.5} />
                                            <h4 className="text-base font-bold text-gray-900 dark:text-white mb-1">
                                                {joinedCampaignsList.length === 0 ? 'No active deliverables' : 'No deliverables in this category'}
                                            </h4>
                                            <p className="text-xs text-gray-500 dark:text-zinc-400 max-w-xs mx-auto leading-relaxed mb-4">
                                                {joinedCampaignsList.length === 0 ? 'Apply to open briefs in Openings to start participating and earning points.' : 'Switch filters above to see other deliverables.'}
                                            </p>
                                            <button
                                                type="button"
                                                onClick={() => joinedCampaignsList.length === 0 ? setActiveTab('opportunities') : setDeliverableFilter('all')}
                                                className="h-9 px-4 rounded-xl bg-gray-950 dark:bg-white text-white dark:text-black text-xs font-semibold tracking-wide transition-all active:scale-95 inline-flex items-center gap-1.5"
                                            >
                                                {joinedCampaignsList.length === 0 ? (<><span>Explore Openings</span><ArrowRight size={13} /></>) : 'Show All Deliverables'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ─ Referrals Tab ─ */}
                            {activeTab === 'referrals' && <CreatorReferralsView profile={profile} />}

                            {/* ─ Vault Tab ─ */}
                            {activeTab === 'rewards' && <CreatorVaultView creatorPoints={creatorPoints} />}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>


            {/* ─── Mobile Bottom Tab Bar (Apple Floating Capsule) ─────────────────────────── */}
            <div className="sm:hidden fixed bottom-5 left-1/2 -translate-x-1/2 z-50 w-[94%] max-w-sm">
                <div
                    className="relative bg-white/85 dark:bg-[#141822]/85 border border-black/[0.08] dark:border-white/[0.12] rounded-full p-1.5 shadow-[0_10px_35px_rgba(0,0,0,0.15)] dark:shadow-[0_10px_35px_rgba(0,0,0,0.6)] backdrop-blur-2xl"
                    style={{ WebkitBackdropFilter: 'blur(20px)' }}
                >
                    <div className="flex items-center justify-between relative">
                        {tabs.map(tab => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => {
                                        setActiveTab(tab.id);
                                        setTimeout(() => {
                                            const el = document.getElementById('dashboard-tab-content');
                                            if (el) {
                                                const y = el.getBoundingClientRect().top + window.scrollY - 80;
                                                window.scrollTo({ top: y, behavior: 'smooth' });
                                            }
                                        }, 60);
                                    }}
                                    className={cn(
                                        "relative flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-full transition-all duration-200 active:scale-95",
                                        isActive ? "text-white dark:text-black" : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
                                    )}
                                    aria-label={tab.label}
                                >
                                    {isActive && (
                                        <motion.div
                                            layoutId="appleMobileTabIndicator"
                                            className="absolute inset-0 rounded-full bg-black dark:bg-white shadow-[0_2px_12px_rgba(0,0,0,0.2)]"
                                            transition={{ type: "spring", stiffness: 450, damping: 35 }}
                                        />
                                    )}

                                    {/* Badge */}
                                    {tab.count !== null && tab.count !== undefined && tab.count !== 0 && (
                                        <div className="absolute top-1 right-2 z-20">
                                            {tab.count === 'Soon' ? (
                                                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-sm" />
                                            ) : (
                                                <div className={cn(
                                                    "min-w-[14px] h-[14px] rounded-full text-[8px] font-black flex items-center justify-center px-1 leading-none shadow-sm",
                                                    isActive ? "bg-neon-green text-black border-[1.5px] border-black dark:border-white" : "bg-neon-green text-black border-[1.5px] border-white dark:border-[#12151c]"
                                                )}>
                                                    {tab.count}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <Icon
                                        size={17}
                                        strokeWidth={isActive ? 2.5 : 2}
                                        className="shrink-0 relative z-10"
                                    />
                                    <AnimatePresence>
                                        {isActive && (
                                            <motion.span 
                                                initial={{ width: 0, opacity: 0 }}
                                                animate={{ width: "auto", opacity: 1 }}
                                                exit={{ width: 0, opacity: 0 }}
                                                className="text-[11px] font-bold tracking-tight leading-none whitespace-nowrap overflow-hidden relative z-10"
                                            >
                                                {tab.mobileLabel}
                                            </motion.span>
                                        )}
                                    </AnimatePresence>
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

