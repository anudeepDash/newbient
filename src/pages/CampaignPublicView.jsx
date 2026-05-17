import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { useStore } from '../lib/store';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { motion, AnimatePresence } from 'framer-motion';
import Instagram from 'lucide-react/dist/esm/icons/instagram';
import MapPin from 'lucide-react/dist/esm/icons/map-pin';
import Users from 'lucide-react/dist/esm/icons/users';
import Zap from 'lucide-react/dist/esm/icons/zap';
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import ShieldCheck from 'lucide-react/dist/esm/icons/shield-check';
import Trophy from 'lucide-react/dist/esm/icons/trophy';
import Target from 'lucide-react/dist/esm/icons/target';
import Ban from 'lucide-react/dist/esm/icons/ban';
import Camera from 'lucide-react/dist/esm/icons/camera';
import Video from 'lucide-react/dist/esm/icons/video';
import Eye from 'lucide-react/dist/esm/icons/eye';
import Star from 'lucide-react/dist/esm/icons/star';
import Globe from 'lucide-react/dist/esm/icons/globe';
import Youtube from 'lucide-react/dist/esm/icons/youtube';
import Twitter from 'lucide-react/dist/esm/icons/twitter';
import Calendar from 'lucide-react/dist/esm/icons/calendar';
import CheckCircle2 from 'lucide-react/dist/esm/icons/check-circle-2';
import Clock from 'lucide-react/dist/esm/icons/clock';
import MessageCircle from 'lucide-react/dist/esm/icons/message-circle';
import ChevronLeft from 'lucide-react/dist/esm/icons/chevron-left';
import ExternalLink from 'lucide-react/dist/esm/icons/external-link';
import FileText from 'lucide-react/dist/esm/icons/file-text';
import Check from 'lucide-react/dist/esm/icons/check';
import { cn } from '../lib/utils';
import { PREDEFINED_CITIES } from '../lib/constants';
import StudioSelect from '../components/ui/StudioSelect';
import useDynamicMeta from '../hooks/useDynamicMeta';
import GlobalLoader from '../components/ui/GlobalLoader';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import TaskSubmissionModal from '../components/ui/TaskSubmissionModal';

const TASK_TYPES = {
    content_post: { label: 'Content Post', icon: Camera, color: 'text-pink-400' },
    story: { label: 'Story', icon: Eye, color: 'text-purple-400' },
    reel: { label: 'Reel', icon: Video, color: 'text-orange-400' },
    visit_event: { label: 'Visit Event', icon: MapPin, color: 'text-green-400' },
    custom: { label: 'Custom', icon: Star, color: 'text-neon-blue' },
};

const PLATFORMS = {
    instagram: { label: 'Instagram', icon: Instagram },
    youtube: { label: 'YouTube', icon: Youtube },
    twitter: { label: 'Twitter / X', icon: Twitter },
    other: { label: 'Other', icon: Globe },
};

const CampaignPublicView = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { campaigns, user, authInitialized, creators, addCreator, updateCreator, setAuthModal } = useStore();
    
    const [campaign, setCampaign] = useState(null);
    const [profile, setProfile] = useState(null);
    const [isVerifying, setIsVerifying] = useState(false);
    const [verificationStep, setVerificationStep] = useState('idle'); // idle | verifying | success | failed
    const [isJoining, setIsJoining] = useState(false);
    const [joinSuccess, setJoinSuccess] = useState(false);

    const [form, setForm] = useState({
        instagram: '',
        followers: '',
        name: '',
        phone: '',
        city: '',
        categories: '',
        bio: ''
    });

    const [selectedTask, setSelectedTask] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const found = campaigns.find(c => c.id === id);
        if (found) setCampaign(found);
    }, [id, campaigns]);

    useEffect(() => {
        if (authInitialized && user) {
            const existing = creators.find(c => c.uid === user.uid);
            if (existing) {
                setProfile(existing);
                setForm(prev => ({
                    ...prev,
                    instagram: existing.instagram || '',
                    followers: existing.instagramFollowers || '',
                    name: existing.name || '',
                    phone: existing.phone || '',
                    city: existing.city || '',
                    categories: (existing.specializations || existing.niches || []).join(', '),
                    bio: existing.bio || ''
                }));
            }
        }
    }, [user, authInitialized, creators]);

    useDynamicMeta({
        title: campaign ? campaign.title : "Creator Campaign",
        description: campaign ? campaign.description : "Join this exclusive creator campaign.",
        image: campaign && campaign.image ? campaign.image : "/favicon.svg",
        url: window.location.href
    });

    const handleInstagramVerify = async () => {
        if (!form.instagram) return useStore.getState().addToast("Please enter your Instagram handle to continue.", 'error');
        setIsVerifying(true);
        setVerificationStep('verifying');

        setTimeout(() => {
            const count = parseInt(form.followers);
            if (isNaN(count)) {
                setIsVerifying(false);
                setVerificationStep('failed');
                useStore.getState().addToast("Please enter your follower count so we can check eligibility.", 'error');
            } else if (count < (campaign?.minInstagramFollowers || 0)) {
                setIsVerifying(false);
                setVerificationStep('failed');
            } else {
                setIsVerifying(false);
                setVerificationStep('success');
            }
        }, 3000);
    };

    const handleJoin = async (e) => {
        e.preventDefault();
        if (!user) {
            setAuthModal(true);
            return;
        }

        if (verificationStep !== 'success') {
            return useStore.getState().addToast("Please verify your Instagram eligibility before applying.", 'error');
        }

        setIsJoining(true);
        try {
            const currentJoined = profile?.joinedCampaigns || [];
            if (currentJoined.includes(id)) {
                useStore.getState().addToast("You've already applied to this campaign!", 'error');
                navigate('/creator-dashboard');
                return;
            }

            const creatorData = {
                uid: user.uid,
                email: user.email,
                name: form.name,
                phone: form.phone,
                city: form.city,
                instagram: form.instagram,
                instagramFollowers: parseInt(form.followers),
                specializations: form.categories.split(',').map(n => n.trim()),
                bio: form.bio,
                profileStatus: 'pending',
                joinedCampaigns: [...currentJoined, id]
            };

            if (profile) {
                await updateCreator(user.uid, creatorData);
            } else {
                await addCreator(creatorData);
            }

            setJoinSuccess(true);
        } catch (error) {
            useStore.getState().addToast("Couldn't submit your application. Please try again.", 'error');
        } finally {
            setIsJoining(false);
        }
    };

    const handleTaskSubmit = async (taskId, contentLink, proofFile) => {
        if (!contentLink && !proofFile) {
            useStore.getState().addToast("Please provide a content link or upload proof.", 'error');
            return;
        }
        setIsSubmitting(true);
        try {
            let proofUrl = '';
            if (proofFile) {
                proofUrl = await useStore.getState().uploadToCloudinary(proofFile);
            }
            await useStore.getState().submitTaskProof(campaign.id, taskId, user.uid, {
                contentLink,
                proofUrl
            });
            useStore.getState().addToast("Deliverable submitted successfully!", 'success');
            setSelectedTask(null);
        } catch (error) {
            useStore.getState().addToast("Submission failed. Please try again.", 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    useEffect(() => {
        const searchParams = new URLSearchParams(location.search);
        const taskId = searchParams.get('taskId');
        if (taskId && campaign) {
            setTimeout(() => {
                const element = document.getElementById(`task-${taskId}`);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    element.classList.add('ring-2', 'ring-neon-blue', 'ring-offset-4', 'ring-offset-black');
                    
                    const isJoined = profile && (profile.joinedCampaigns || []).includes(id);
                    if (isJoined) {
                        const targetTask = campaign.tasks?.find(t => t.id === taskId);
                        if (targetTask) setSelectedTask(targetTask);
                    }

                    setTimeout(() => {
                        element.classList.remove('ring-2', 'ring-neon-blue', 'ring-offset-4', 'ring-offset-black');
                    }, 3000);
                }
            }, 500);
        }
    }, [location.search, campaign, profile]);

    if (!campaign) {
        return <GlobalLoader color="#00F0FF" />;
    }

    const isEligible = verificationStep === 'success';
    const isJoined = profile && (profile.joinedCampaigns || []).includes(id);
    const isShortlisted = profile && (profile.shortlistedCampaigns || []).includes(id);
    const campaignTasks = campaign.tasks || [];
    const requiredTasks = campaignTasks.filter(t => t.priority !== 'optional');

    const getSubmissionStatus = (task, uid) => {
        const sub = task.submissions?.[uid];
        if (sub) return sub.status;
        if ((task.verifiedBy || []).includes(uid)) return 'approved';
        if ((task.completedBy || []).includes(uid)) return 'submitted';
        return 'not_started';
    };

    const approvedTotal = campaignTasks.filter(t => getSubmissionStatus(t, user?.uid) === 'approved').length;
    const progress = campaignTasks.length > 0 ? (approvedTotal / campaignTasks.length) * 100 : 0;
    const isFullyComplete = requiredTasks.length > 0 && requiredTasks.every(t => getSubmissionStatus(t, user?.uid) === 'approved');

    return (
        <div className="min-h-screen bg-[#050505] text-white pb-40 overflow-y-auto relative selection:bg-neon-blue selection:text-black">
            {/* Ambient Background */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-neon-blue/10 rounded-full blur-[150px]" />
                <div className="absolute bottom-0 left-0 w-[40%] h-[40%] bg-neon-purple/10 rounded-full blur-[150px]" />
            </div>

            {/* Top Navigation Bar */}
            <div className="sticky top-0 z-50 bg-[#050505]/80 backdrop-blur-2xl border-b border-white/10 px-4 md:px-8 py-4 flex items-center justify-between shadow-2xl">
                <button 
                    onClick={() => navigate('/creator-dashboard')}
                    className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-gray-400 hover:text-white transition-colors group"
                >
                    <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-neon-blue group-hover:text-black group-hover:border-neon-blue transition-all">
                        <ChevronLeft size={16} />
                    </div>
                    Back to Creator Hub
                </button>

                <div className="flex items-center gap-4">
                    {profile && (
                        <div className="flex items-center gap-3 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-gray-300 backdrop-blur-md">
                            <span className="w-2 h-2 rounded-full bg-neon-green animate-pulse shadow-[0_0_8px_#39ff14]" />
                            {profile.name || user?.email}
                        </div>
                    )}
                </div>
            </div>

            {/* Hero Image Section */}
            {campaign.thumbnail ? (
                <div className="relative w-full h-[40vh] md:h-[55vh] overflow-hidden">
                    <img 
                        src={campaign.thumbnail} 
                        alt={campaign.title} 
                        className="w-full h-full object-cover opacity-70 scale-105 animate-pulse-slow"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/40 to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-b from-[#050505]/60 via-transparent to-transparent" />
                    <div className="absolute bottom-8 left-4 md:left-8 flex items-center gap-3 z-10">
                        <div className="p-3.5 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/10 text-neon-blue shadow-2xl">
                            <Instagram size={24} />
                        </div>
                        <div className="px-4 py-2 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/10 text-xs font-black uppercase tracking-widest text-white shadow-2xl flex items-center gap-2">
                            <MapPin size={14} className="text-neon-pink" /> {campaign.targetCity || 'Universal'}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="relative w-full h-[35vh] bg-gradient-to-r from-neon-blue/20 via-neon-purple/20 to-[#050505] overflow-hidden flex items-end p-8 border-b border-white/5">
                    <div className="absolute -right-20 -top-20 w-80 h-80 bg-neon-blue/10 rounded-full blur-3xl pointer-events-none" />
                    <div className="flex items-center gap-4 z-10">
                        <div className="p-4 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/10 text-neon-blue shadow-2xl">
                            <Instagram size={28} />
                        </div>
                        <div>
                            <span className="text-[10px] font-black text-neon-blue uppercase tracking-[0.4em] block mb-1">Creator Opportunity</span>
                            <div className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-white">
                                <MapPin size={14} className="text-neon-pink" /> {campaign.targetCity || 'Universal'}
                            </div>
                        </div>
                    </div>
                    <div className="absolute bottom-0 left-0 w-full h-16 bg-gradient-to-t from-[#050505] to-transparent pointer-events-none" />
                </div>
            )}

            <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-8 py-12">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
                    {/* Left Column: Campaign Content & Tasks (7 Cols) */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-7 space-y-12">
                        {/* Title & Core Metadata */}
                        <div className="space-y-6">
                            <div className="inline-flex items-center gap-3 px-4 py-2 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md">
                                <Sparkles size={16} className="text-neon-blue" />
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/70">Verified Opportunity</span>
                            </div>
                            <h1 className="text-3xl md:text-5xl font-black font-heading leading-tight uppercase tracking-tighter italic">{campaign.title}</h1>
                            
                            {/* Badges Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 py-6 border-y border-white/5">
                                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1 backdrop-blur-sm">
                                    <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest block">Location</span>
                                    <div className="flex items-center gap-2 text-white font-bold uppercase text-xs truncate">
                                        <MapPin size={14} className="text-neon-blue shrink-0" /> {campaign.targetCity}
                                    </div>
                                </div>
                                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1 backdrop-blur-sm">
                                    <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest block">Rewards</span>
                                    <div className="flex items-center gap-2 text-neon-green font-bold uppercase text-xs truncate">
                                        <Zap size={14} className="shrink-0" /> {campaign.reward}
                                    </div>
                                </div>
                                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1 backdrop-blur-sm col-span-2 md:col-span-1">
                                    <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest block">Min. Followers</span>
                                    <div className="flex items-center gap-2 text-white font-bold uppercase text-xs truncate">
                                        <Users size={14} className="text-neon-blue shrink-0" /> {Number(campaign.minInstagramFollowers || 0).toLocaleString()}+
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Campaign Description */}
                        <div className="space-y-4 p-8 rounded-[2.5rem] bg-white/[0.02] border border-white/5 backdrop-blur-xl relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1.5 h-full bg-neon-blue" />
                            <h3 className="text-[10px] font-black text-neon-blue uppercase tracking-[0.4em] flex items-center gap-2">
                                <FileText size={14} /> Campaign Briefing
                            </h3>
                            <div className="article-content text-gray-300 text-base md:text-lg font-medium leading-relaxed" dangerouslySetInnerHTML={{ __html: campaign.description }} />
                        </div>

                        {/* Campaign Tasks Section */}
                        {campaignTasks.length > 0 && (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                                    <h3 className="text-[10px] font-black text-neon-blue uppercase tracking-[0.4em] flex items-center gap-2">
                                        <Target size={14} /> Campaign Deliverables
                                    </h3>
                                    <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">
                                        {requiredTasks.length} Required · {campaignTasks.length - requiredTasks.length} Optional
                                    </span>
                                </div>
                                <div className="space-y-4">
                                    {campaignTasks.map((task, idx) => {
                                        const typeInfo = TASK_TYPES[task.taskType] || TASK_TYPES.custom;
                                        const TypeIcon = typeInfo.icon;
                                        const platInfo = PLATFORMS[task.platform] || PLATFORMS.other;
                                        const status = getSubmissionStatus(task, user?.uid);

                                        return (
                                            <motion.div
                                                key={task.id || idx}
                                                id={`task-${task.id}`}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: idx * 0.08 }}
                                                onClick={() => isJoined && setSelectedTask(task)}
                                                className={cn(
                                                    "p-6 bg-white/[0.03] border border-white/5 rounded-[2rem] flex items-start gap-5 group transition-all duration-300 backdrop-blur-xl relative overflow-hidden",
                                                    isJoined ? "cursor-pointer hover:border-neon-blue/40 hover:bg-white/[0.05] hover:shadow-[0_0_30px_rgba(46,191,255,0.15)]" : "hover:border-white/10"
                                                )}
                                            >
                                                <div className={cn(
                                                    "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border border-white/5 transition-transform group-hover:scale-110 shadow-lg",
                                                    status === 'approved' ? "bg-neon-green/20 text-neon-green border-neon-green/30" :
                                                    status === 'submitted' ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/30" :
                                                    "bg-black/40 group-hover:border-neon-blue/30",
                                                    typeInfo.color
                                                )}>
                                                    {status === 'approved' ? <CheckCircle2 size={22} /> : <TypeIcon size={22} />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center flex-wrap gap-2.5 mb-2">
                                                         <p className="font-black text-base text-white uppercase tracking-tight italic">{task.title}</p>
                                                        {task.priority === 'required' && (
                                                            <span className="px-2.5 py-1 bg-neon-blue/10 border border-neon-blue/20 rounded-lg text-[8px] font-black uppercase tracking-widest text-neon-blue shadow-sm">★ Required</span>
                                                        )}
                                                        {task.deadline && (
                                                            <span className="px-2.5 py-1 bg-red-500/10 border border-red-500/20 rounded-lg text-[8px] font-black uppercase tracking-widest text-red-400 shadow-sm flex items-center gap-1">
                                                                <Clock size={10} /> {new Date(task.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                                            </span>
                                                        )}
                                                        {isJoined && (
                                                            <span className={cn(
                                                                "px-3 py-1 border rounded-lg text-[8px] font-black uppercase tracking-widest shadow-sm ml-auto",
                                                                status === 'approved' ? "bg-neon-green/10 border-neon-green/20 text-neon-green" :
                                                                status === 'submitted' ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-500" :
                                                                "bg-white/5 border-white/10 text-gray-400"
                                                            )}>
                                                                {status === 'not_started' ? 'Pending Submission' : status.toUpperCase().replace('_', ' ')}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {task.description && <div className="article-content text-xs text-gray-400 mt-1.5 leading-relaxed font-medium" dangerouslySetInnerHTML={{ __html: task.description }} />}
                                                    <div className="flex flex-wrap items-center gap-3 mt-4 pt-3 border-t border-white/5">
                                                        <span className="px-2.5 py-1 bg-white/5 rounded-lg text-[8px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-1.5">
                                                            {React.createElement(platInfo.icon, { size: 10 })} {platInfo.label}
                                                        </span>
                                                        <span className="px-2.5 py-1 bg-white/5 rounded-lg text-[8px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-1.5">
                                                            {React.createElement(typeInfo.icon, { size: 10 })} {typeInfo.label}
                                                        </span>
                                                        {isJoined && (
                                                            <span className="px-3 py-1 bg-neon-blue/10 text-neon-blue border border-neon-blue/20 rounded-lg text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5 ml-auto group-hover:bg-neon-blue group-hover:text-black transition-all">
                                                                View & Submit <ArrowRight size={10} />
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </motion.div>

                    {/* Right Column: Interactive Form & Progress Workbench (5 Cols) */}
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }} className="lg:col-span-5 lg:sticky lg:top-28">
                        <div className="bg-zinc-900/60 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-8 md:p-10 shadow-[0_0_50px_rgba(0,0,0,0.8)] relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-40 h-40 bg-neon-blue/5 rounded-full blur-3xl pointer-events-none" />
                            
                            {isJoined ? (
                                <div className="relative z-10 space-y-8">
                                    <div className="flex items-center gap-4 pb-6 border-b border-white/5">
                                        <div className="w-14 h-14 rounded-2xl bg-neon-green/10 border border-neon-green/20 flex items-center justify-center shadow-[0_0_20px_rgba(57,255,20,0.2)] shrink-0">
                                            <CheckCircle2 className="text-neon-green" size={28} />
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-black font-heading text-white uppercase tracking-tighter italic">Active Campaign</h2>
                                            <p className="text-neon-green text-[10px] font-black uppercase tracking-widest mt-1">Profile Synchronized</p>
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        {/* Progress Bar */}
                                        <div className="space-y-3 p-6 rounded-2xl bg-white/[0.02] border border-white/5 backdrop-blur-md">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Campaign Progress</span>
                                                <span className="text-sm font-black text-neon-blue italic">{Math.round(progress)}%</span>
                                            </div>
                                            <div className="h-2 bg-white/5 rounded-full overflow-hidden shadow-inner">
                                                <motion.div 
                                                    initial={{ width: 0 }} 
                                                    animate={{ width: `${progress}%` }} 
                                                    className={cn("h-full transition-all duration-1000 shadow-[0_0_12px_rgba(46,191,255,0.5)]", isFullyComplete ? "bg-neon-green shadow-[0_0_12px_rgba(57,255,20,0.5)]" : "bg-neon-blue")}
                                                />
                                            </div>
                                        </div>

                                        {/* Deliverables Summary */}
                                        <div className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl space-y-4 backdrop-blur-md">
                                            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                                                <span className="text-gray-400 flex items-center gap-2"><Target size={14} className="text-neon-blue" /> Deliverables</span>
                                                <span className="text-white text-xs">{approvedTotal} / {campaignTasks.length} Completed</span>
                                            </div>
                                            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest pt-3 border-t border-white/5">
                                                <span className="text-gray-400 flex items-center gap-2"><ShieldCheck size={14} className="text-neon-green" /> Status</span>
                                                <span className={cn("text-xs font-black uppercase", isFullyComplete ? "text-neon-green" : "text-neon-blue")}>
                                                    {isFullyComplete ? "Fully Verified" : isShortlisted ? "Shortlisted & Active" : "Awaiting Review"}
                                                </span>
                                            </div>
                                        </div>

                                        {/* WhatsApp Hub Button */}
                                        {isShortlisted && campaign.whatsappLink && (
                                            <a href={campaign.whatsappLink} target="_blank" rel="noopener noreferrer" className="block">
                                                <Button className="w-full h-16 bg-[#25D366]/10 text-[#25D366] border border-[#25D366]/20 hover:bg-[#25D366] hover:text-black font-black text-xs uppercase tracking-[0.2em] gap-3 rounded-2xl shadow-[0_0_30px_rgba(37,211,102,0.15)] transition-all">
                                                    <MessageCircle size={20} /> Join WhatsApp Hub
                                                </Button>
                                            </a>
                                        )}

                                        <Button 
                                            onClick={() => navigate('/creator-dashboard')}
                                            className="w-full h-16 bg-white/5 border border-white/10 text-white font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-white hover:text-black transition-all text-xs shadow-xl"
                                        >
                                            Open Creator Hub
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="relative z-10 space-y-8">
                                    <div className="flex items-center gap-4 pb-6 border-b border-white/5">
                                        <div className="w-14 h-14 rounded-2xl bg-neon-blue/10 border border-neon-blue/20 flex items-center justify-center shadow-[0_0_20px_rgba(46,191,255,0.2)] shrink-0">
                                            <Sparkles className="text-neon-blue" size={28} />
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-black font-heading text-white uppercase tracking-tighter italic">Creator Application</h2>
                                            <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mt-1">Submit your profile for review</p>
                                        </div>
                                    </div>

                                    <AnimatePresence mode="wait">
                                        {!joinSuccess ? (
                                            <motion.div key="application-flow" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-8">
                                                <div className="space-y-4">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div className="space-y-2">
                                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Instagram Handle</label>
                                                            <Input value={form.instagram} onChange={e => setForm({...form, instagram: e.target.value})} placeholder="@username" className="h-14 bg-black/60 border-white/10 rounded-2xl text-xs font-bold focus:border-neon-blue" disabled={isEligible} />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Current Followers</label>
                                                            <Input type="number" value={form.followers} onChange={e => setForm({...form, followers: e.target.value})} placeholder="Enter count" className="h-14 bg-black/60 border-white/10 rounded-2xl text-xs font-bold focus:border-neon-blue" disabled={isEligible} />
                                                        </div>
                                                    </div>

                                                    <AnimatePresence mode="wait">
                                                        {verificationStep === 'verifying' ? (
                                                            <motion.div key="verifying" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-14 bg-white/5 border border-neon-blue/20 rounded-2xl flex items-center px-6 gap-4 backdrop-blur-md">
                                                                <LoadingSpinner size="xs" color="#00F0FF" />
                                                                <span className="text-[10px] font-black uppercase tracking-widest text-white/70">Verifying qualifications...</span>
                                                            </motion.div>
                                                        ) : verificationStep === 'success' ? (
                                                            <motion.div key="verified" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="h-14 bg-neon-green/10 border border-neon-green/30 rounded-2xl flex items-center px-6 gap-4 backdrop-blur-md shadow-[0_0_20px_rgba(57,255,20,0.15)]">
                                                                <ShieldCheck size={20} className="text-neon-green" />
                                                                <span className="text-xs font-black uppercase tracking-widest text-neon-green">Eligibility Confirmed</span>
                                                            </motion.div>
                                                        ) : (
                                                            <Button key="verify-btn" onClick={handleInstagramVerify} disabled={isVerifying} className="w-full h-14 bg-white text-black font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-neon-blue hover:text-black transition-all text-xs shadow-xl">
                                                                {verificationStep === 'failed' ? 'Retry Verification' : 'Check Eligibility'}
                                                            </Button>
                                                        )}
                                                    </AnimatePresence>
                                                </div>

                                                <AnimatePresence>
                                                    {isEligible && (
                                                        <motion.form key="submission-form" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} onSubmit={handleJoin} className="space-y-6 pt-6 border-t border-white/5">
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                <div className="space-y-2">
                                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Full Name</label>
                                                                    <Input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Full name" className="h-14 bg-black/60 border-white/10 rounded-2xl text-xs font-bold focus:border-neon-blue" />
                                                                </div>
                                                                <div className="space-y-2">
                                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">WhatsApp / Phone</label>
                                                                    <Input required type="tel" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="+91..." className="h-14 bg-black/60 border-white/10 rounded-2xl text-xs font-bold focus:border-neon-blue" />
                                                                </div>
                                                            </div>
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                <div className="space-y-2">
                                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1 block mb-2">Target City</label>
                                                                    <StudioSelect 
                                                                        value={form.city} 
                                                                        options={PREDEFINED_CITIES.map(c => ({ value: c, label: c.toUpperCase() }))}
                                                                        onChange={val => setForm({...form, city: val})} 
                                                                        placeholder="SELECT CITY"
                                                                        className="h-14"
                                                                        accentColor="neon-blue"
                                                                    />
                                                                </div>
                                                                <div className="space-y-2">
                                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Specializations</label>
                                                                    <Input required value={form.categories} onChange={e => setForm({...form, categories: e.target.value})} placeholder="Fashion, Travel, Tech..." className="h-14 bg-black/60 border-white/10 rounded-2xl text-xs font-bold focus:border-neon-blue" />
                                                                </div>
                                                            </div>
                                                            <div className="space-y-2">
                                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Creator Bio</label>
                                                                <textarea required value={form.bio} onChange={e => setForm({...form, bio: e.target.value})} placeholder="Tell us about yourself..." className="w-full h-28 bg-black/60 border border-white/10 rounded-2xl p-5 text-white focus:outline-none focus:border-neon-blue text-xs font-medium resize-none shadow-inner" />
                                                            </div>
                                                            <Button type="submit" disabled={isJoining} className="w-full h-16 bg-neon-blue text-black font-black uppercase tracking-[0.3em] rounded-2xl shadow-[0_0_40px_rgba(46,191,255,0.4)] hover:shadow-[0_0_60px_rgba(46,191,255,0.6)] hover:scale-[1.02] transition-all border-none text-xs">
                                                                {isJoining ? <LoadingSpinner size="xs" color="#000000" /> : 'Submit Creator Application'}
                                                            </Button>
                                                        </motion.form>
                                                    )}
                                                </AnimatePresence>

                                                {!isEligible && verificationStep === 'failed' && (
                                                    <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-4 backdrop-blur-md shadow-[0_0_20px_rgba(239,68,68,0.15)]">
                                                        <Ban className="text-red-500 shrink-0" size={24} />
                                                        <p className="text-xs font-bold text-red-400 uppercase tracking-wider leading-relaxed">Profile qualifications not met. You must have at least {Number(campaign.minInstagramFollowers || 0).toLocaleString()} followers to apply.</p>
                                                    </div>
                                                )}
                                            </motion.div>
                                        ) : (
                                            <motion.div key="success-state" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-12 space-y-6">
                                                <div className="w-24 h-24 rounded-full bg-neon-blue/10 border border-neon-blue/20 flex items-center justify-center mx-auto mb-8 shadow-[0_0_30px_rgba(46,191,255,0.2)]">
                                                    <CheckCircle2 className="text-neon-blue" size={48} />
                                                </div>
                                                <h2 className="text-3xl font-black font-heading text-white uppercase tracking-tighter italic">Application Sent</h2>
                                                <p className="text-gray-400 text-sm font-medium leading-relaxed max-w-[280px] mx-auto">Your creator profile has been submitted for this campaign. We will review your analytics and notify you via email.</p>
                                                <Button onClick={() => navigate('/creator-dashboard')} className="w-full h-16 bg-white/5 border border-white/10 text-white font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-white hover:text-black transition-all text-xs mt-8 shadow-xl">
                                                    Go to Creator Hub
                                                </Button>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            </div>
            <AnimatePresence>
                {selectedTask && (
                    <TaskSubmissionModal 
                        task={selectedTask}
                        campaignId={campaign.id}
                        profileUid={user?.uid}
                        onClose={() => setSelectedTask(null)}
                        isSubmitting={isSubmitting}
                        onSubmit={handleTaskSubmit}
                        taskTypes={TASK_TYPES}
                        platforms={PLATFORMS}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default CampaignPublicView;
