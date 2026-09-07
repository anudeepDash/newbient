import React, { useState, useEffect } from 'react';
import { useStore } from '../lib/store';
import { useStoreSubscription } from '../hooks/useStoreSubscription';
import { Button } from '../components/ui/Button';
import { motion, AnimatePresence } from 'framer-motion';
import MapPin from 'lucide-react/dist/esm/icons/map-pin';
import ShieldCheck from 'lucide-react/dist/esm/icons/shield-check';
import Zap from 'lucide-react/dist/esm/icons/zap';
import Settings from 'lucide-react/dist/esm/icons/settings';
import Instagram from 'lucide-react/dist/esm/icons/instagram';
import Clock from 'lucide-react/dist/esm/icons/clock';
import Link2 from 'lucide-react/dist/esm/icons/link-2';
import Camera from 'lucide-react/dist/esm/icons/camera';
import Video from 'lucide-react/dist/esm/icons/video';
import Eye from 'lucide-react/dist/esm/icons/eye';
import Star from 'lucide-react/dist/esm/icons/star';
import Globe from 'lucide-react/dist/esm/icons/globe';
import Youtube from 'lucide-react/dist/esm/icons/youtube';
import Twitter from 'lucide-react/dist/esm/icons/twitter';
import Linkedin from 'lucide-react/dist/esm/icons/linkedin';
import Copy from 'lucide-react/dist/esm/icons/copy';
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right';
import Phone from 'lucide-react/dist/esm/icons/phone';
import Award from 'lucide-react/dist/esm/icons/award';
import TrendingUp from 'lucide-react/dist/esm/icons/trending-up';
import Users from 'lucide-react/dist/esm/icons/users';
import Briefcase from 'lucide-react/dist/esm/icons/briefcase';
import CheckCircle2 from 'lucide-react/dist/esm/icons/check-circle-2';
import Check from 'lucide-react/dist/esm/icons/check';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn, normalizePhoneNumber } from '../lib/utils';
import { getEarnedBadges } from '../lib/badges';
import GlobalLoader from '../components/ui/GlobalLoader';
import CampaignCard from '../components/ui/CampaignCard';
import useDynamicMeta from '../hooks/useDynamicMeta';

const TASK_TYPES = {
    content_post: { label: 'Content Post', icon: Camera },
    story: { label: 'Story', icon: Eye },
    reel: { label: 'Reel', icon: Video },
    visit_event: { label: 'Visit Event', icon: MapPin },
    custom: { label: 'Custom', icon: Star },
};

const PLATFORMS = {
    instagram: { label: 'Instagram', icon: Instagram },
    linkedin: { label: 'LinkedIn', icon: Linkedin },
    youtube: { label: 'YouTube', icon: Youtube },
    twitter: { label: 'Twitter / X', icon: Twitter },
    other: { label: 'Other', icon: Globe },
};

const scrollContainer = (id, direction) => {
    const container = document.getElementById(id);
    if (container) {
        const scrollAmount = direction === 'left' ? -300 : 300;
        container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
};

// Helper: get submission status
const getSubmissionStatus = (task, uid) => {
    const sub = task.submissions?.[uid];
    if (sub) return sub.status;
    if ((task.verifiedBy || []).includes(uid)) return 'approved';
    if ((task.completedBy || []).includes(uid)) return 'submitted';
    return 'not_started';
};

// Tick animation component
const CompletionTick = ({ visible }) => (
    <AnimatePresence>
        {visible && (
            <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className="w-8 h-8 rounded-full bg-neon-green flex items-center justify-center shadow-[0_0_20px_rgba(0,255,100,0.3)]"
            >
                <CheckCircle2 size={16} className="text-black" />
            </motion.div>
        )}
    </AnimatePresence>
);

// Removed inline CreatorCampaignCard - Using shared CampaignCard component

// Removed TaskDetailModal - Using shared TaskSubmissionModal component

// Note: Creator profile editing and settings have been unified into ProfilePanel.jsx





const CreatorReferralsView = ({ profile }) => {
    const { creators } = useStore();
    const [copied, setCopied] = useState(false);

    // Compute referral link
    const referralLink = `${window.location.origin}/creator/join?ref=${profile.creatorId || profile.uid.slice(0, 8).toUpperCase()}`;

    const handleCopy = () => {
        navigator.clipboard.writeText(referralLink);
        setCopied(true);
        useStore.getState().addToast("Referral link copied to clipboard!", "success");
        setTimeout(() => setCopied(false), 2000);
    };

    // My referrals
    const myReferrals = creators.filter(c => 
        c.referredBy === profile.uid || 
        (profile.creatorId && c.referredBy && c.referredBy.toUpperCase() === profile.creatorId.toUpperCase()) ||
        (profile.instagram && c.referredBy && c.referredBy.toLowerCase() === profile.instagram.toLowerCase()) ||
        (profile.linkedin && c.referredBy && c.referredBy.toLowerCase() === profile.linkedin.toLowerCase())
    );

    const approvedCount = myReferrals.filter(c => c.profileStatus === 'approved').length;

    // Leaderboard
    const getLeaderboard = () => {
        const counts = {};
        creators.forEach(c => {
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

        return creators
            .map(c => ({
                ...c,
                referralCount: counts[c.uid] || 0
            }))
            .filter(c => c.referralCount > 0)
            .sort((a, b) => b.referralCount - a.referralCount);
    };

    const leaderboard = getLeaderboard();
    const myRank = leaderboard.findIndex(c => c.uid === profile.uid) + 1;

    return (
        <div className="space-y-12">
            {/* Top Cards: Link + Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Link Card */}
                <div className="lg:col-span-7 bg-gray-100 dark:bg-zinc-950/45 border border-white/[0.08] backdrop-blur-3xl p-8 rounded-[2.5rem] relative overflow-hidden flex flex-col justify-between shadow-2xl">
                    
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 text-neon-green font-black tracking-widest text-[10px] uppercase">
                            <Link2 size={14} className="" />
                            YOUR PERSONAL REFERRAL LINK
                        </div>
                        <h3 className="text-2xl sm:text-3xl font-extrabold font-heading tracking-tight text-gray-900 dark:text-white">Invite Other Creators</h3>
                        <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm font-medium leading-relaxed max-w-xl">
                            Share this link with fellow creators. When they register on Newbi using your link, they will be registered as your referral and you will rise on the dashboard leaderboard!
                        </p>
                    </div>

                    <div className="mt-8 flex flex-col sm:flex-row gap-4">
                        <div className="flex-1 h-14 bg-white dark:bg-black/60 border border-black/10 dark:border-white/10 rounded-xl px-4 flex items-center justify-between text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-300 truncate select-all">
                            {referralLink}
                        </div>
                        <Button 
                            onClick={handleCopy}
                            className="h-14 px-8 rounded-xl bg-white text-black font-black uppercase tracking-widest text-[10px] hover:bg-neon-green transition-all flex items-center justify-center gap-2 shadow-lg shrink-0"
                        >
                            {copied ? <CheckCircle2 size={14} className="text-neon-green" /> : <Copy size={14} />}
                            <span>{copied ? 'Copied' : 'Copy Link'}</span>
                        </Button>
                    </div>
                </div>

                {/* Stats Card */}
                <div className="lg:col-span-5 bg-gray-100 dark:bg-zinc-950/45 border border-white/[0.08] backdrop-blur-3xl p-8 rounded-[2.5rem] flex flex-col justify-between relative overflow-hidden shadow-2xl">
                    
                    <div className="flex items-center gap-3 text-neon-green font-black tracking-widest text-[10px] uppercase">
                        <TrendingUp size={14} />
                        REFERRAL ANALYTICS
                    </div>

                    <div className="grid grid-cols-3 divide-x divide-white/5 py-4 my-2">
                        <div className="flex flex-col items-center justify-center px-2">
                            <span className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white italic leading-none">{myReferrals.length}</span>
                            <span className="text-[7px] font-black text-gray-500 uppercase tracking-widest mt-2">Invited</span>
                        </div>
                        <div className="flex flex-col items-center justify-center px-2">
                            <span className="text-2xl sm:text-3xl font-black text-neon-green italic leading-none">{approvedCount}</span>
                            <span className="text-[7px] font-black text-gray-500 uppercase tracking-widest mt-2">Verified</span>
                        </div>
                        <div className="flex flex-col items-center justify-center px-2">
                            <span className="text-2xl sm:text-3xl font-black text-neon-green italic leading-none">
                                {myRank > 0 ? `#${myRank}` : 'Unranked'}
                            </span>
                            <span className="text-[7px] font-black text-gray-500 uppercase tracking-widest mt-2">Rank</span>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-black/10 dark:border-white/5 text-[9px] font-black uppercase tracking-widest text-gray-500 flex items-center justify-between">
                        <span>INVITATION SUCCESS RATE</span>
                        <span className="text-gray-900 dark:text-white">
                            {myReferrals.length > 0 ? Math.round((approvedCount / myReferrals.length) * 100) : 0}%
                        </span>
                    </div>
                </div>
            </div>

            {/* Bottom Content: Leaderboard + My Invites */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Leaderboard Table */}
                <div className="lg:col-span-8 bg-gray-100 dark:bg-zinc-950/45 border border-white/[0.08] backdrop-blur-3xl p-6 sm:p-8 rounded-[2.5rem] space-y-6 shadow-2xl">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-neon-green/10 border border-neon-green/20 flex items-center justify-center text-neon-green shadow-inner">
                            <Award size={18} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black uppercase tracking-tight italic">REFERRAL LEADERBOARD</h3>
                            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mt-0.5">Top referrers in the network</p>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-black/10 dark:border-white/5 text-[9px] font-black text-gray-500 uppercase tracking-wider">
                                    <th className="pb-4 pl-4 w-16">Rank</th>
                                    <th className="pb-4">Creator</th>
                                    <th className="pb-4 hidden sm:table-cell">City & Niche</th>
                                    <th className="pb-4 text-right pr-4">Invited Creators</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {leaderboard.slice(0, 10).map((creator, index) => {
                                    const rank = index + 1;
                                    const isMe = creator.uid === profile.uid;
                                    
                                    // Custom colors/styles for top 3
                                    let rankBadge = `${rank}`;
                                    let rankColor = "text-gray-600 dark:text-gray-400";
                                    let rowBg = isMe ? "bg-white/[0.02] border-l-2 border-l-neon-green" : "hover:bg-white/[0.01]";

                                    if (rank === 1) {
                                        rankBadge = "🥇";
                                        rankColor = "text-yellow-400 font-extrabold shadow-[0_0_15px_rgba(234,179,8,0.2)]";
                                    } else if (rank === 2) {
                                        rankBadge = "🥈";
                                        rankColor = "text-gray-700 dark:text-gray-300 font-bold";
                                    } else if (rank === 3) {
                                        rankBadge = "🥉";
                                        rankColor = "text-amber-600 font-bold";
                                    }

                                    return (
                                        <tr key={creator.uid} className={cn("transition-colors", rowBg)}>
                                            <td className="py-4 pl-4 font-black text-sm">
                                                <span className={rankColor}>{rankBadge}</span>
                                            </td>
                                            <td className="py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-zinc-900 border border-black/10 dark:border-white/5 overflow-hidden flex items-center justify-center shrink-0">
                                                        {creator.profilePicture ? (
                                                            <img src={creator.profilePicture} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <span className="text-xs font-black text-gray-900 dark:text-white italic">{creator.name?.charAt(0) || 'C'}</span>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <span className={cn("text-xs font-bold uppercase tracking-wide block truncate max-w-[120px] sm:max-w-none", isMe ? "text-neon-green font-black" : "text-gray-900 dark:text-white")}>
                                                            {creator.name} {isMe && "(You)"}
                                                        </span>
                                                        <span className="text-[9px] text-gray-500 uppercase tracking-widest mt-0.5 block flex items-center gap-1">
                                                            <Instagram size={8} className="text-neon-green" /> @{creator.instagram}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 hidden sm:table-cell">
                                                <div className="space-y-0.5">
                                                    <span className="text-[10px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider block">{creator.city}</span>
                                                    <span className="text-[8px] text-gray-500 uppercase tracking-widest block">{(creator.specializations || [])[0] || 'Niche'}</span>
                                                </div>
                                            </td>
                                            <td className="py-4 text-right pr-4 font-black italic text-neon-green text-sm">
                                                {creator.referralCount}
                                            </td>
                                        </tr>
                                    );
                                })}

                                {leaderboard.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="py-12 text-center">
                                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">No referral activity in the network yet.</p>
                                            <p className="text-[10px] text-gray-700 uppercase tracking-widest mt-1">Be the first to invite creators and dominate the leaderboard!</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* My Referrals List */}
                <div className="lg:col-span-4 bg-gray-100 dark:bg-zinc-950/45 border border-white/[0.08] backdrop-blur-3xl p-6 sm:p-8 rounded-[2.5rem] space-y-6 shadow-2xl flex flex-col justify-between">
                    <div className="space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-neon-green/10 border border-neon-green/20 flex items-center justify-center text-neon-green shadow-inner">
                                <Users size={18} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black uppercase tracking-tight italic">YOUR INVITES</h3>
                                <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mt-0.5">Creators you referred</p>
                            </div>
                        </div>

                        <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1 scrollbar-thin">
                            {myReferrals.map((referred, index) => {
                                const isApproved = referred.profileStatus === 'approved';
                                return (
                                    <div key={referred.uid} className="p-4 bg-white dark:bg-black/45 border border-black/10 dark:border-white/5 rounded-2xl flex items-center justify-between group hover:border-black/10 dark:hover:border-white/10 transition-colors">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-zinc-900 border border-black/10 dark:border-white/5 overflow-hidden flex items-center justify-center shrink-0">
                                                {referred.profilePicture ? (
                                                    <img src={referred.profilePicture} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="text-[10px] font-black text-gray-900 dark:text-white italic">{referred.name?.charAt(0) || 'C'}</span>
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-tight truncate max-w-[100px] sm:max-w-none">{referred.name}</h4>
                                                <p className="text-[8px] text-gray-500 uppercase tracking-widest mt-0.5 truncate">@{referred.instagram}</p>
                                            </div>
                                        </div>

                                        <div className={cn("px-2.5 py-1 rounded-md text-[8px] font-black uppercase tracking-widest border",
                                            isApproved ? 'bg-neon-green/10 text-neon-green border-neon-green/20' : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20')}>
                                            {isApproved ? 'Verified' : 'Pending'}
                                        </div>
                                    </div>
                                );
                            })}

                            {myReferrals.length === 0 && (
                                <div className="py-16 text-center">
                                    <Users size={32} className="text-gray-700 mx-auto mb-4" />
                                    <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">You haven't referred any creators yet.</p>
                                    <p className="text-[8px] text-gray-700 uppercase tracking-widest mt-1">Share your link to recruit creators!</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="pt-6 border-t border-black/10 dark:border-white/5 mt-4">
                        <Button 
                            onClick={handleCopy}
                            className="w-full h-14 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-gray-900 dark:text-white font-black uppercase tracking-widest text-[9px] hover:bg-white hover:text-black transition-all flex items-center justify-center gap-2 shadow-inner"
                        >
                            <Link2 size={12} /> Share Invite Link
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};


const CreatorDashboard = () => {
    useStoreSubscription(['creators', 'campaigns']);
    const { user, authInitialized, creators, campaigns, loading, openProfilePanel } = useStore();
    const navigate = useNavigate();
    const location = useLocation();
    const [profile, setProfile] = useState(null);
    const [activeTab, setActiveTab] = useState('opportunities');
    const [copiedId, setCopiedId] = useState(false);

    const handleCopyCreatorId = () => {
        const id = profile?.creatorId || profile?.uid?.slice(0, 8).toUpperCase();
        if (!id) return;
        navigator.clipboard.writeText(id);
        setCopiedId(true);
        useStore.getState().addToast("Creator ID copied to clipboard!", "success");
        setTimeout(() => setCopiedId(false), 2000);
    };

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 17) return 'Good afternoon';
        return 'Good evening';
    };

    useDynamicMeta({
        title: "Creator Dashboard",
        description: "Manage your creator profile and track campaigns.",
        url: window.location.href
    });

    useEffect(() => {
        if (location.pathname.includes('/settings')) {
            openProfilePanel('creator');
            navigate('/creator-dashboard', { replace: true });
        }
    }, [location.pathname, openProfilePanel, navigate]);

    useEffect(() => {
        if (authInitialized && !loading && user) {
            const userPhoneNorm = user.phoneNumber ? normalizePhoneNumber(user.phoneNumber) : null;
            const userEmailNorm = user.email ? user.email.toLowerCase() : null;

            const existingProfile = creators.find(c => 
                c.uid === user.uid || 
                (userEmailNorm && c.email && c.email.toLowerCase() === userEmailNorm) ||
                (userPhoneNorm && normalizePhoneNumber(c.phone) === userPhoneNorm)
            );

            if (existingProfile) {
                // If profile was linked to a generated ID, update doc uid to match user.uid
                if (existingProfile.uid !== user.uid) {
                    useStore.getState().updateCreator(existingProfile.uid, { uid: user.uid })
                        .catch(err => console.error("Error linking creator uid:", err));
                }
                setProfile(existingProfile);
                if (!existingProfile.creatorId) {
                    const generatedId = existingProfile.uid.slice(0, 8).toUpperCase();
                    useStore.getState().updateCreator(existingProfile.uid, { creatorId: generatedId })
                        .then(() => console.log(`Auto-migrated creatorId for ${existingProfile.uid}: ${generatedId}`))
                        .catch(err => console.error("Failed to auto-migrate creatorId:", err));
                }
            } else {
                navigate('/creator/join');
            }
        } else if (authInitialized && !loading && !user) {
            navigate('/creator/join');
        }
    }, [user, authInitialized, loading, creators, navigate]);


    if (!profile) return <GlobalLoader color="#39ff14" />;

    const availableCampaigns = campaigns.filter(c => {
        const isOpen = c.status === 'Open';
        const isNotJoined = !(profile.joinedCampaigns || []).includes(c.id);
        const matchesCity = c.targetCity === 'Any' || (profile.city && c.targetCity?.toLowerCase() === profile.city.toLowerCase());
        const matchesCollege = !c.targetCollege || c.targetCollege === 'Any' || 
            (profile.collegeName && profile.collegeName.toLowerCase().includes(c.targetCollege.toLowerCase()));
        return isOpen && isNotJoined && matchesCity && matchesCollege;
    });

    const joinedCampaignsList = campaigns.filter(c =>
        (profile.joinedCampaigns || []).includes(c.id)
    );

    const shortlistedCampaignsList = campaigns.filter(c =>
        (profile.shortlistedCampaigns || []).includes(c.id)
    );

    // Stats
    const totalTasks = joinedCampaignsList.reduce((sum, c) => sum + (c.tasks?.length || 0), 0);
    const approvedTasks = joinedCampaignsList.reduce((sum, c) => {
        return sum + (c.tasks || []).filter(t => getSubmissionStatus(t, profile.uid) === 'approved').length;
    }, 0);

    const efficiencyRate = totalTasks > 0 ? Math.round((approvedTasks / totalTasks) * 100) : 0;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#020202] text-gray-900 dark:text-white pt-24 pb-20 relative overflow-hidden transition-colors duration-300">
            {/* Cinematic Background Atmosphere */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-neon-green/10 rounded-full blur-[150px] " />
                <div className="absolute bottom-[-10%] right-[-5%] w-[50%] h-[50%] bg-neon-green/5 rounded-full blur-[150px]  delay-700" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-gradient-radial from-transparent via-black/5 dark:via-black/40 to-transparent dark:to-black z-10" />
                <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.02]" style={{ backgroundImage: 'linear-gradient(to right, #888888 1px, transparent 1px), linear-gradient(to bottom, #888888 1px, transparent 1px)', backgroundSize: '80px 80px' }}></div>
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">
                {/* Unverified Phone Warning Banner for Existing Creators */}
                {!profile.isPhoneVerified && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-8 p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                                <Phone size={20} />
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <span>Verify Your WhatsApp / Contact Number</span>
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-extrabold uppercase tracking-wider">Action Needed</span>
                                </h4>
                                <p className="text-[11px] text-zinc-400">
                                    Your phone number ({profile.phone || 'Not set'}) is not verified yet. Verify it to unlock direct campaign briefs and fast payouts.
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => openProfilePanel('creator')}
                            className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold text-xs rounded-xl transition-all shrink-0"
                        >
                            Verify Phone in Profile Panel →
                        </button>
                    </motion.div>
                )}

                <div className="space-y-12">
                    {/* Modern Creator Command Hero */}
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="relative overflow-hidden rounded-3xl sm:rounded-[2.5rem] bg-white/90 dark:bg-zinc-950/70 border border-black/[0.08] dark:border-white/[0.08] shadow-2xl backdrop-blur-2xl p-6 sm:p-8 lg:p-10 mb-8"
                    >
                        {/* Ambient Glow & Radial Lighting */}
                        <div className="absolute -top-28 -right-28 w-80 h-80 bg-neon-green/10 dark:bg-neon-green/15 rounded-full blur-3xl pointer-events-none" />
                        <div className="absolute -bottom-28 -left-28 w-72 h-72 bg-neon-green/5 dark:bg-neon-green/10 rounded-full blur-3xl pointer-events-none" />
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/[0.01] to-black/[0.03] dark:from-transparent dark:via-white/[0.01] dark:to-white/[0.02] pointer-events-none" />

                        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
                            {/* Left Column: Creator Identity & Meta */}
                            <div className="lg:col-span-7 flex flex-col sm:flex-row items-start sm:items-center gap-6 sm:gap-8">
                                {/* Avatar with Glow Ring & Status Pin */}
                                <div className="relative shrink-0 group">
                                    <div className="relative w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-3xl p-1 bg-gradient-to-b from-neon-green/40 via-neon-green/10 to-transparent shadow-xl">
                                        <div className="w-full h-full rounded-[1.35rem] overflow-hidden bg-gray-100 dark:bg-zinc-900 border border-black/10 dark:border-white/10 flex items-center justify-center relative">
                                            {profile?.profilePicture ? (
                                                <img
                                                    src={profile.profilePicture}
                                                    alt={profile.name || "Creator"}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-950 text-white text-3xl sm:text-4xl font-black font-heading tracking-tight shadow-inner">
                                                    {profile?.name?.charAt(0)?.toUpperCase() || 'C'}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Verification Status Pin */}
                                    <div 
                                        className="absolute -bottom-1 -right-1 p-0.5 bg-white dark:bg-zinc-950 rounded-2xl shadow-lg border border-black/5 dark:border-white/10"
                                        title={profile?.profileStatus === 'approved' ? 'Verified Creator' : 'Pending Verification'}
                                    >
                                        {profile?.profileStatus === 'approved' ? (
                                            <div className="flex items-center justify-center w-7 h-7 rounded-xl bg-neon-green text-black font-bold shadow-[0_0_12px_rgba(57,255,20,0.5)]">
                                                <CheckCircle2 size={16} strokeWidth={2.5} />
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-center w-7 h-7 rounded-xl bg-amber-400 text-black font-bold shadow-[0_0_12px_rgba(251,191,36,0.4)]">
                                                <Clock size={16} strokeWidth={2.5} />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Identity Details */}
                                <div className="space-y-3.5 flex-1 min-w-0">
                                    {/* Eyebrow Chips */}
                                    <div className="flex flex-wrap items-center gap-2">
                                        {profile?.profileStatus === 'approved' ? (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-bold">
                                                <ShieldCheck size={13} /> Verified Creator
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-bold">
                                                <Clock size={13} /> Pending Review
                                            </span>
                                        )}
                                        {profile?.city && (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 text-gray-700 dark:text-zinc-300 text-xs font-semibold">
                                                <MapPin size={12} className="text-emerald-600 dark:text-neon-green" /> {profile.city}
                                            </span>
                                        )}
                                    </div>

                                    {/* Greeting & Name */}
                                    <div>
                                        <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold font-heading text-gray-900 dark:text-white tracking-tight leading-tight">
                                            {getGreeting()},{' '}
                                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-gray-900 via-gray-700 to-gray-500 dark:from-white dark:via-zinc-200 dark:to-zinc-400">
                                                {profile?.name?.split(' ')[0] || 'Creator'}
                                            </span>
                                        </h1>
                                    </div>

                                    {/* Creator ID + Social Badges */}
                                    <div className="flex flex-wrap items-center gap-2 pt-0.5">
                                        {/* Copy Creator ID Pill */}
                                        <button
                                            onClick={handleCopyCreatorId}
                                            className="group/id inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 border border-black/10 dark:border-white/10 text-gray-800 dark:text-zinc-200 font-mono text-xs font-semibold tracking-wider transition-all active:scale-95"
                                            title="Click to copy Creator ID"
                                        >
                                            <span className="text-[9px] font-black text-emerald-600 dark:text-neon-green uppercase tracking-widest">ID:</span>
                                            <span>{profile?.creatorId || profile?.uid?.slice(0, 8).toUpperCase()}</span>
                                            {copiedId ? (
                                                <Check size={12} className="text-emerald-500 dark:text-neon-green" />
                                            ) : (
                                                <Copy size={12} className="text-gray-400 group-hover/id:text-gray-600 dark:group-hover/id:text-white transition-colors" />
                                            )}
                                        </button>

                                        {/* Social Links */}
                                        {profile?.instagram && (
                                            <a
                                                href={profile.instagram.includes('instagram.com') ? profile.instagram : `https://instagram.com/${profile.instagram.replace(/^@/, '').trim()}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-pink-500/10 hover:bg-pink-500/20 border border-pink-500/20 text-pink-700 dark:text-pink-400 text-xs font-semibold transition-all hover:scale-105"
                                                title="Instagram Profile"
                                            >
                                                <Instagram size={13} />
                                                <span>Instagram</span>
                                            </a>
                                        )}
                                        {profile?.linkedin && (
                                            <a
                                                href={profile.linkedin.includes('http') ? profile.linkedin : `https://${profile.linkedin}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-700 dark:text-blue-400 text-xs font-semibold transition-all hover:scale-105"
                                                title="LinkedIn Profile"
                                            >
                                                <Linkedin size={13} />
                                                <span>LinkedIn</span>
                                            </a>
                                        )}
                                        {profile?.youtube && (
                                            <a
                                                href={profile.youtube.includes('http') ? profile.youtube : `https://${profile.youtube}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-700 dark:text-red-400 text-xs font-semibold transition-all hover:scale-105"
                                                title="YouTube Channel"
                                            >
                                                <Youtube size={13} />
                                                <span>YouTube</span>
                                            </a>
                                        )}
                                        {profile?.twitter && (
                                            <a
                                                href={profile.twitter.includes('http') ? profile.twitter : `https://${profile.twitter}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/20 text-sky-700 dark:text-sky-400 text-xs font-semibold transition-all hover:scale-105"
                                                title="Twitter / X Profile"
                                            >
                                                <Twitter size={13} />
                                                <span>Twitter</span>
                                            </a>
                                        )}
                                    </div>

                                    {/* Earned Milestones & Badges */}
                                    <div className="flex flex-wrap items-center gap-2 pt-0.5">
                                        {getEarnedBadges(profile, creators, campaigns).map(badge => (
                                            <span
                                                key={badge.id}
                                                title={badge.desc}
                                                className={cn(
                                                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border backdrop-blur-md transition-all hover:scale-105",
                                                    badge.bg
                                                )}
                                            >
                                                <span>{badge.icon}</span>
                                                <span>{badge.label}</span>
                                            </span>
                                        ))}
                                        {(profile?.adminBadges || []).map((badge, idx) => (
                                            <span
                                                key={`custom-${idx}`}
                                                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-neon-green/10 border border-neon-green/30 text-emerald-700 dark:text-neon-green rounded-lg text-[10px] font-bold uppercase tracking-wider shadow-sm hover:scale-105 transition-all"
                                                title={`Admin assigned: ${badge}`}
                                            >
                                                <span>🏅</span>
                                                <span>{badge}</span>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Right Column: 3 KPI Metric Cards & Action Toolbar */}
                            <div className="lg:col-span-5 flex flex-col gap-4">
                                {/* 3 KPI Metric Cards */}
                                <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
                                    {/* Metric 1: Campaigns */}
                                    <div className="bg-black/[0.03] dark:bg-white/[0.03] hover:bg-black/[0.05] dark:hover:bg-white/[0.06] border border-black/10 dark:border-white/10 rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between transition-all">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
                                                Campaigns
                                            </span>
                                            <div className="w-6 h-6 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
                                                <Briefcase size={13} />
                                            </div>
                                        </div>
                                        <div className="text-2xl sm:text-3xl font-black font-heading text-gray-900 dark:text-white">
                                            {joinedCampaignsList.length}
                                        </div>
                                        <span className="text-[9px] font-semibold text-gray-500 dark:text-zinc-500 mt-1">
                                            Joined
                                        </span>
                                    </div>

                                    {/* Metric 2: Deliverables */}
                                    <div className="bg-black/[0.03] dark:bg-white/[0.03] hover:bg-black/[0.05] dark:hover:bg-white/[0.06] border border-black/10 dark:border-white/10 rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between transition-all">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
                                                Tasks
                                            </span>
                                            <div className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                                                <CheckCircle2 size={13} />
                                            </div>
                                        </div>
                                        <div className="text-2xl sm:text-3xl font-black font-heading text-gray-900 dark:text-white">
                                            {approvedTasks}
                                        </div>
                                        <span className="text-[9px] font-semibold text-gray-500 dark:text-zinc-500 mt-1">
                                            Approved
                                        </span>
                                    </div>

                                    {/* Metric 3: Efficiency */}
                                    <div className="bg-black/[0.03] dark:bg-white/[0.03] hover:bg-black/[0.05] dark:hover:bg-white/[0.06] border border-black/10 dark:border-white/10 rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between transition-all">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
                                                Efficiency
                                            </span>
                                            <div className="w-6 h-6 rounded-lg bg-neon-green/15 text-emerald-700 dark:text-neon-green flex items-center justify-center">
                                                <TrendingUp size={13} />
                                            </div>
                                        </div>
                                        <div className="text-2xl sm:text-3xl font-black font-heading text-emerald-600 dark:text-neon-green">
                                            {efficiencyRate}%
                                        </div>
                                        {/* Mini Progress Bar */}
                                        <div className="w-full bg-black/10 dark:bg-white/10 h-1.5 rounded-full mt-2 overflow-hidden">
                                            <div
                                                className="bg-emerald-500 dark:bg-neon-green h-full rounded-full transition-all duration-500"
                                                style={{ width: `${Math.min(100, Math.max(totalTasks > 0 ? 5 : 0, efficiencyRate))}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Action Toolbar */}
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => openProfilePanel('creator')}
                                        className="flex-1 h-12 rounded-2xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 border border-black/10 dark:border-white/10 text-gray-900 dark:text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-95 group/btn shadow-sm"
                                    >
                                        <Settings size={15} className="text-gray-500 dark:text-zinc-400 group-hover/btn:rotate-90 transition-transform duration-500" />
                                        <span>Profile & Settings</span>
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('referrals')}
                                        className="h-12 px-5 rounded-2xl bg-neon-green text-black hover:bg-emerald-400 text-xs font-extrabold uppercase tracking-wider flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-95 shadow-md shadow-neon-green/20"
                                        title="View referral link & leaderboard"
                                    >
                                        <Award size={15} />
                                        <span>Referrals</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                {/* Main Content Area */}
                <div className="space-y-16 md:space-y-24">
                    {/* Quick Referral Banner */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-gray-100 dark:bg-zinc-950/40 border border-white/[0.06] backdrop-blur-3xl p-8 rounded-3xl relative overflow-hidden shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8 group"
                    >
                        <div className="absolute top-0 left-0 w-80 h-80 bg-neon-green/5 blur-[120px] pointer-events-none" />
                        <div className="absolute bottom-0 right-0 w-64 h-64 bg-neon-green/5 blur-[100px] pointer-events-none" />

                        <div className="flex items-center gap-6 relative z-10 w-full md:w-auto">
                            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-neon-green/15 to-neon-green/5 border border-white/[0.08] flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform shrink-0">
                                <Award className="text-neon-green " size={28} />
                            </div>
                            <div className="space-y-2">
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-transparent bg-clip-text bg-gradient-to-r from-neon-green to-neon-green">
                                    Creator Referral Program
                                </span>
                                <h3 className="text-xl md:text-2xl font-extrabold font-heading tracking-tight text-gray-900 dark:text-white">
                                    Invite Creators, Climb the Leaderboard
                                </h3>
                                <p className="text-gray-600 dark:text-gray-400 text-xs font-medium max-w-md">
                                    Grow the Newbi community. Share your unique link, refer top talent, and track your achievements.
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full md:w-auto relative z-10 shrink-0">
                            {/* Copy Link Field */}
                            <div className="flex items-center bg-white dark:bg-black/45 border border-black/10 dark:border-white/10 rounded-2xl p-1.5 pl-4 grow md:grow-0 md:w-[26rem]">
                                <span className="text-[10px] font-mono font-medium text-gray-600 dark:text-gray-400 select-none truncate">
                                    {window.location.host}/creator/join?ref={profile.creatorId || profile.uid.slice(0, 8).toUpperCase()}
                                </span>
                                <div className="w-px h-4 bg-white/15 mx-3 animate-pulse" />
                                <button
                                    onClick={() => {
                                        const referralLink = `${window.location.origin}/creator/join?ref=${profile.creatorId || profile.uid.slice(0, 8).toUpperCase()}`;
                                        navigator.clipboard.writeText(referralLink);
                                        useStore.getState().addToast("Referral link copied!", "success");
                                    }}
                                    className="ml-auto px-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-white hover:text-black border border-black/10 dark:border-white/5 text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shrink-0"
                                >
                                    <Copy size={12} />
                                    Copy Link
                                </button>
                            </div>

                            {/* View Leaderboard Button */}
                            <button
                                onClick={() => setActiveTab('referrals')}
                                className="px-6 py-4 rounded-2xl bg-white text-black hover:bg-neon-green hover:text-gray-900 dark:hover:text-white font-black uppercase tracking-widest text-[9px] transition-all flex items-center justify-center gap-2 shadow-xl shrink-0"
                            >
                                <Users size={12} />
                                Leaderboard
                            </button>
                        </div>
                    </motion.div>

                    {/* Priority Section */}
                    {shortlistedCampaignsList.length > 0 && (
                        <motion.section 
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="space-y-12"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 rounded-xl bg-neon-green/10 border border-neon-green/20 flex items-center justify-center ">
                                        <Briefcase className="text-neon-green" size={28} />
                                    </div>
                                    <div>
                                        <h3 className="text-3xl font-extrabold font-heading text-gray-900 dark:text-white tracking-tight pr-4">Active Campaigns</h3>
                                        <p className="text-[11px] text-gray-500 font-bold uppercase tracking-[0.3em] mt-1">Campaigns you've been shortlisted for</p>
                                    </div>
                                </div>

                                {/* Navigation Arrows */}
                                <div className="flex items-center gap-2 md:hidden">
                                    <button onClick={() => scrollContainer('priority-campaigns-scroll', 'left')} className="w-8 h-8 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 flex items-center justify-center text-gray-600 dark:text-gray-400 hover:bg-black/10 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white transition-all">
                                        <ChevronRight className="rotate-180" size={16} />
                                    </button>
                                    <button onClick={() => scrollContainer('priority-campaigns-scroll', 'right')} className="w-8 h-8 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 flex items-center justify-center text-gray-600 dark:text-gray-400 hover:bg-black/10 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white transition-all">
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            </div>
                            
                            <div id="priority-campaigns-scroll" className="flex overflow-x-auto md:grid md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-8 pb-4 scrollbar-hide snap-x">
                                {shortlistedCampaignsList.map(c => (
                                    <div key={c.id} className="min-w-[280px] w-[280px] md:min-w-0 md:w-auto snap-start">
                                        <CampaignCard campaign={c} profile={profile} type="joined" onOpenMission={(camp) => navigate(`/campaign/${camp.id}`)} />
                                    </div>
                                ))}
                            </div>
                        </motion.section>
                    )}

                    {/* Opportunity Navigation */}
                    <motion.div 
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="space-y-12"
                    >
                        <div className="flex flex-col md:flex-row items-center justify-between gap-8 border-b border-black/10 dark:border-white/5 pb-10">
                            <div className="flex items-center gap-4 w-full md:w-auto relative group/nav">
                                {/* Navigation Arrows */}
                                <div className="absolute -left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 opacity-0 group-hover/nav:opacity-100 transition-opacity z-20 pointer-events-none md:hidden">
                                    <button onClick={(e) => { e.stopPropagation(); scrollContainer('nav-tabs', 'left'); }} className="w-8 h-8 rounded-xl bg-white dark:bg-black/80 border border-black/10 dark:border-white/10 flex items-center justify-center text-gray-900 dark:text-white pointer-events-auto shadow-2xl">
                                        <ChevronRight className="rotate-180" size={16} />
                                    </button>
                                </div>
                                <div className="absolute -right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 opacity-0 group-hover/nav:opacity-100 transition-opacity z-20 pointer-events-none md:hidden">
                                    <button onClick={(e) => { e.stopPropagation(); scrollContainer('nav-tabs', 'right'); }} className="w-8 h-8 rounded-xl bg-white dark:bg-black/80 border border-black/10 dark:border-white/10 flex items-center justify-center text-gray-900 dark:text-white pointer-events-auto shadow-2xl">
                                        <ChevronRight size={16} />
                                    </button>
                                </div>

                                <div id="nav-tabs" className="flex items-center gap-6 md:gap-12 w-full overflow-x-auto scrollbar-hide snap-x">
                                    {['opportunities', 'active', 'referrals'].map((tab) => (
                                        <button 
                                            key={tab}
                                            onClick={() => setActiveTab(tab)}
                                            className={cn(
                                                "text-lg md:text-xl font-extrabold font-heading tracking-tight transition-all relative pb-3 shrink-0 snap-start",
                                                activeTab === tab ? "text-gray-900 dark:text-white" : "text-gray-700 hover:text-gray-500"
                                            )}
                                        >
                                            {tab === 'opportunities' ? 'New Openings' : tab === 'active' ? 'Performance History' : 'Referrals & Leaderboard'}
                                            {activeTab === tab && (
                                                <motion.div 
                                                    layoutId="tab-underline" 
                                                    className="absolute bottom-0 left-0 w-full h-1 bg-neon-green " 
                                                />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {activeTab !== 'referrals' && (
                                <div className="flex items-center gap-4 w-full md:w-auto justify-end">
                                    <div className="px-5 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-[9px] font-black uppercase tracking-widest text-gray-600 dark:text-gray-400 mr-auto md:mr-0">
                                        <span className="text-gray-900 dark:text-white mr-2">{activeTab === 'opportunities' ? availableCampaigns.length : joinedCampaignsList.length}</span>
                                        {activeTab === 'opportunities' ? 'Gigs Discovered' : 'Campaigns Tracked'}
                                    </div>

                                    {/* Navigation Arrows */}
                                    <div className="flex items-center gap-2 md:hidden">
                                        <button onClick={() => scrollContainer('opportunities-scroll', 'left')} className="w-8 h-8 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 flex items-center justify-center text-gray-600 dark:text-gray-400 hover:bg-black/10 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white transition-all">
                                            <ChevronRight className="rotate-180" size={16} />
                                        </button>
                                        <button onClick={() => scrollContainer('opportunities-scroll', 'right')} className="w-8 h-8 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 flex items-center justify-center text-gray-600 dark:text-gray-400 hover:bg-black/10 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white transition-all">
                                            <ChevronRight size={16} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {activeTab === 'referrals' ? (
                            <CreatorReferralsView profile={profile} />
                        ) : (
                            <>
                                <div id="opportunities-scroll" className="flex overflow-x-auto md:grid md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-8 pb-4 scrollbar-hide snap-x">
                                    <AnimatePresence mode="popLayout">
                                        {(activeTab === 'opportunities' ? availableCampaigns : joinedCampaignsList).map(c => (
                                            <motion.div
                                                key={c.id}
                                                layout
                                                initial={{ opacity: 0, scale: 0.9 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.9 }}
                                                className="min-w-[280px] w-[280px] md:min-w-0 md:w-auto snap-start"
                                            >
                                                <CampaignCard 
                                                    campaign={c} 
                                                    profile={profile} 
                                                    type={activeTab === 'opportunities' ? 'available' : 'joined'} 
                                                    onOpenMission={(camp) => navigate(`/campaign/${camp.id}`)} 
                                                />
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                </div>

                                {(activeTab === 'opportunities' ? availableCampaigns : joinedCampaignsList).length === 0 && (
                                    <div className="py-32 text-center">
                                        <div className="w-24 h-24 rounded-[2.5rem] bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 flex items-center justify-center mx-auto mb-8 text-gray-700">
                                            <Zap size={40} />
                                        </div>
                                        <h4 className="text-xl font-extrabold font-heading tracking-tight text-gray-600 pr-4">No campaigns yet.</h4>
                                        <p className="text-[11px] font-black text-gray-700 uppercase tracking-widest mt-2 px-10">New campaigns matching your city and niche will appear here when available.</p>
                                    </div>
                                )}
                            </>
                        )}
                    </motion.div>
                </div>
            </div>
        </div>
    </div>
    );
};

export default CreatorDashboard;
