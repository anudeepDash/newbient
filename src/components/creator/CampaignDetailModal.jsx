import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Instagram, MapPin, Users, Zap, ArrowRight, ShieldCheck, Trophy, 
    Target, Ban, Camera, Video, Eye, Star, Globe, Youtube, Twitter, 
    Calendar, CheckCircle2, Clock, MessageCircle, ChevronLeft, 
    ExternalLink, FileText, Check, X, AlertTriangle, Sparkles 
} from 'lucide-react';
import { useStore } from '../../lib/store';
import { cn, normalizePhoneNumber } from '../../lib/utils';
import { PREDEFINED_CITIES } from '../../lib/constants';
import StudioSelect from '../ui/StudioSelect';
import LoadingSpinner from '../ui/LoadingSpinner';
import { Input } from '../ui/Input';
import TaskSubmissionModal from '../ui/TaskSubmissionModal';

const TASK_TYPES = {
    content_post: { label: 'Content Post', icon: Camera, color: 'text-pink-400' },
    story: { label: 'Story', icon: Eye, color: 'text-purple-400' },
    reel: { label: 'Reel', icon: Video, color: 'text-orange-400' },
    visit_event: { label: 'Visit Event', icon: MapPin, color: 'text-emerald-400' },
    custom: { label: 'Custom', icon: Star, color: 'text-neon-green' },
};

const PLATFORMS = {
    instagram: { label: 'Instagram', icon: Instagram },
    youtube: { label: 'YouTube', icon: Youtube },
    twitter: { label: 'Twitter / X', icon: Twitter },
    other: { label: 'Other', icon: Globe },
};

const CampaignDetailModal = ({ 
    campaign, 
    onClose, 
    initialTaskId = null 
}) => {
    const { user, authInitialized, creators, addCreator, updateCreator, setAuthModal, resolveCreatorProfile } = useStore();

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

    // Sync current user's profile
    useEffect(() => {
        if (authInitialized && user) {
            resolveCreatorProfile(user).then((existing) => {
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
            }).catch(err => console.error("Error resolving profile in modal:", err));
        }
    }, [user, authInitialized, resolveCreatorProfile]);

    // Handle ESC key press
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                if (selectedTask) {
                    setSelectedTask(null);
                } else if (onClose) {
                    onClose();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedTask, onClose]);

    // Prevent body scroll when modal is active
    useEffect(() => {
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = prevOverflow;
        };
    }, []);

    // Check if user is already joined or shortlisted
    const isJoined = profile && (profile.joinedCampaigns || []).includes(campaign?.id);
    const isShortlisted = profile && (profile.shortlistedCampaigns || []).includes(campaign?.id);
    const campaignTasks = campaign?.tasks || [];
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

    // Handle initial taskId if provided
    useEffect(() => {
        if (initialTaskId && campaignTasks.length > 0) {
            const targetTask = campaignTasks.find(t => t.id === initialTaskId);
            if (targetTask && isJoined) {
                setSelectedTask(targetTask);
            }
        }
    }, [initialTaskId, campaignTasks, isJoined]);

    // Instagram verification eligibility check
    const handleInstagramVerify = async () => {
        const cleanHandle = String(form.instagram || '').trim().replace(/^@/, '');
        if (!cleanHandle) {
            return useStore.getState().addToast("Please enter your Instagram handle to continue.", 'error');
        }
        setIsVerifying(true);
        setVerificationStep('verifying');

        try {
            const res = await fetch(`/api/creator-join?action=verify-instagram&handle=${encodeURIComponent(cleanHandle)}`);
            const data = await res.json();

            if (!res.ok || !data.success) {
                setIsVerifying(false);
                setVerificationStep('failed');
                useStore.getState().addToast(data.error || `Could not auto-verify @${cleanHandle}. Make sure profile is public.`, 'error');
                return;
            }

            const count = Number(data.followers) || 0;
            const required = Number(campaign?.minInstagramFollowers || 0);

            setForm(prev => ({
                ...prev,
                instagram: data.handle,
                followers: count.toString()
            }));

            setIsVerifying(false);
            if (count < required) {
                setVerificationStep('failed');
            } else {
                setVerificationStep('success');
            }
        } catch (err) {
            setIsVerifying(false);
            setVerificationStep('failed');
            useStore.getState().addToast("Verification network error. Please try again.", 'error');
        }
    };

    // Join Campaign Submission
    const handleJoin = async (e) => {
        e.preventDefault();
        if (!user) {
            setAuthModal(true);
            return;
        }

        if (verificationStep !== 'success') {
            return useStore.getState().addToast("Please verify your Instagram eligibility before applying.", 'error');
        }

        const normPhone = normalizePhoneNumber(form.phone);
        if (normPhone && creators) {
            const existing = creators.find(c => c.uid !== user.uid && normalizePhoneNumber(c.phone) === normPhone);
            if (existing) {
                return useStore.getState().addToast(`The mobile number ${form.phone} is already linked to another creator profile (${existing.email || 'existing account'}).`, 'error');
            }
        }

        setIsJoining(true);
        try {
            const currentJoined = profile?.joinedCampaigns || [];
            if (currentJoined.includes(campaign.id)) {
                useStore.getState().addToast("You've already applied to this campaign!", 'error');
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
                specializations: form.categories ? form.categories.split(',').map(n => n.trim()) : [],
                bio: form.bio,
                profileStatus: 'pending',
                joinedCampaigns: [...currentJoined, campaign.id]
            };

            if (profile) {
                await updateCreator(user.uid, creatorData);
            } else {
                await addCreator(creatorData);
            }

            setJoinSuccess(true);
            useStore.getState().addToast("Creator application submitted successfully!", 'success');
        } catch (error) {
            useStore.getState().addToast(error.message || "Couldn't submit your application. Please try again.", 'error');
        } finally {
            setIsJoining(false);
        }
    };

    // Task submission handler
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

    if (!campaign) return null;

    const isEligible = verificationStep === 'success';

    return createPortal(
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 md:p-6 lg:p-8"
        >
            {/* Ambient Dark Backdrop with Blur */}
            <div 
                className="absolute inset-0 bg-black/85 backdrop-blur-2xl transition-opacity"
                onClick={onClose}
            />

            {/* Ambient Color Glow Behind Modal (Dynamic ambient backlight sampled from campaign thumbnail) */}
            {campaign.thumbnail ? (
                <div 
                    className="absolute w-[1000px] h-[700px] -top-20 left-1/2 -translate-x-1/2 bg-cover bg-center filter blur-[160px] opacity-75 dark:opacity-60 pointer-events-none rounded-full transform-gpu"
                    style={{ backgroundImage: `url(${campaign.thumbnail})` }}
                />
            ) : (
                <div className="absolute w-[600px] h-[600px] bg-neon-green/5 rounded-full blur-[160px] pointer-events-none" />
            )}

            {/* Ultra-Premium Modal Window */}
            <motion.div 
                initial={{ opacity: 0, scale: 0.96, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 20 }}
                transition={{ type: "spring", duration: 0.45, bounce: 0.08 }}
                className="relative w-full max-w-5xl max-h-[94vh] bg-white dark:bg-[#0c0e14] text-gray-950 dark:text-white border border-black/10 dark:border-white/[0.12] rounded-[2.5rem] shadow-[0_25px_80px_rgba(0,0,0,0.18)] dark:shadow-[0_30px_100px_rgba(0,0,0,0.95)] flex flex-col overflow-hidden z-10 transition-colors"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Floating Glassmorphic Close Button */}
                <button 
                    type="button"
                    onClick={onClose}
                    className="absolute top-5 right-5 sm:top-6 sm:right-6 w-11 h-11 rounded-full bg-white/85 dark:bg-black/60 hover:bg-white dark:hover:bg-black/90 backdrop-blur-xl border border-black/10 dark:border-white/20 text-gray-800 dark:text-white flex items-center justify-center transition-all duration-200 shadow-2xl active:scale-95 group z-30"
                    aria-label="Close modal"
                >
                    <X size={18} className="group-hover:rotate-90 transition-transform duration-200" />
                </button>

                {/* Scrollable Modal Container */}
                <div className="overflow-y-auto custom-scrollbar flex-1 flex flex-col relative">
                    {/* Ambient Image Color Spill into Modal Content (Image's authentic hues bleed down into the body) */}
                    {campaign.thumbnail && (
                        <div 
                            className="absolute top-0 inset-x-0 h-[650px] bg-cover bg-center filter blur-[70px] opacity-65 dark:opacity-55 pointer-events-none transform-gpu -z-0"
                            style={{ 
                                backgroundImage: `url(${campaign.thumbnail})`,
                                WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 35%, rgba(0,0,0,0.5) 75%, rgba(0,0,0,0) 100%)',
                                maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 35%, rgba(0,0,0,0.5) 75%, rgba(0,0,0,0) 100%)'
                            }}
                        />
                    )}

                    {/* Full-Bleed Hero Banner with Crisp Image and Natural Ambient Presence */}
                    <div className="relative w-full aspect-video sm:aspect-[2/1] sm:min-h-[440px] shrink-0 overflow-hidden z-10">
                        {campaign.thumbnail ? (
                            <>
                                {/* Ambient Image Aura inside Banner */}
                                <div 
                                    className="absolute -inset-10 bg-cover bg-center filter blur-2xl opacity-90 scale-110 pointer-events-none transform-gpu"
                                    style={{ backgroundImage: `url(${campaign.thumbnail})` }}
                                />

                                {/* Crisp Foreground Image - Full bleed edge-to-edge */}
                                <img 
                                    src={campaign.thumbnail} 
                                    alt={campaign.title} 
                                    className="relative z-10 w-full h-full object-cover object-center scale-100 transition-transform duration-700"
                                />

                                {/* Soft Ambient Depth Vignette */}
                                <div className="absolute inset-0 z-10 bg-[radial-gradient(ellipse_at_center,_transparent_60%,_rgba(0,0,0,0.3)_100%)] pointer-events-none" />
                            </>
                        ) : (
                            <div className="w-full h-full bg-gradient-to-tr from-gray-100 via-gray-200 to-gray-50 dark:from-zinc-950 dark:via-[#121620] dark:to-[#0c0e14]" />
                        )}
                        
                        {/* Subtle Top Vignette for Button Visibility */}
                        <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/25 to-transparent pointer-events-none z-10" />

                        {/* Subtle Bottom Shadow for Card & Title Contrast (Desktop only) */}
                        <div className="hidden sm:block absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/50 via-black/20 to-transparent pointer-events-none z-10" />

                        {/* Floating Hero Content Overlay - Positioned cleanly above the stat cards (Desktop only) */}
                        <div className="hidden sm:flex absolute bottom-20 md:bottom-22 left-8 right-8 z-20 flex-col justify-end">
                            <div className="flex items-center gap-2 mb-2.5">
                                <div className="p-2 rounded-xl bg-black/60 backdrop-blur-xl border border-white/15 text-neon-green shadow-lg">
                                    <Instagram size={15} />
                                </div>
                                <div className="px-3 py-1 rounded-xl bg-black/60 backdrop-blur-xl border border-white/15 text-[10px] font-black uppercase tracking-widest text-white shadow-lg flex items-center gap-1.5 font-mono">
                                    <MapPin size={11} className="text-neon-green" /> {campaign.targetCity || 'Universal'}
                                </div>
                            </div>
                            
                            <h1 className="text-3xl sm:text-5xl md:text-6xl font-black font-heading tracking-tight text-white uppercase italic drop-shadow-[0_4px_16px_rgba(0,0,0,0.95)] leading-none">
                                {campaign.title}
                            </h1>
                        </div>
                    </div>

                    {/* Modal Content Body - Seamlessly Connected with Hero Banner */}
                    <div className="px-5 sm:px-8 pb-8 space-y-6 sm:space-y-8 flex-1 relative z-20">
                        {/* Mobile Title & Badges Section */}
                        <div className="sm:hidden pt-3 space-y-2">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.08] dark:border-white/[0.1] text-emerald-600 dark:text-neon-green shadow-xs">
                                    <Instagram size={14} />
                                </div>
                                <div className="px-2.5 py-1 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.08] dark:border-white/[0.1] text-[10px] font-black uppercase tracking-widest text-gray-800 dark:text-white shadow-xs flex items-center gap-1.5 font-mono">
                                    <MapPin size={10} className="text-emerald-600 dark:text-neon-green" /> {campaign.targetCity || 'Universal'}
                                </div>
                            </div>
                            <h1 className="text-2xl font-black font-heading tracking-tight text-gray-950 dark:text-white uppercase italic leading-tight">
                                {campaign.title}
                            </h1>
                        </div>

                        {/* Quick Stats Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:-mt-10">
                            <div className="p-4 rounded-2xl bg-white/90 dark:bg-[#121620]/90 border border-black/10 dark:border-white/10 backdrop-blur-2xl space-y-1.5 hover:border-black/20 dark:hover:border-white/20 transition-all shadow-xl group">
                                <span className="text-[9px] font-black text-gray-500 dark:text-zinc-500 uppercase tracking-widest block font-mono">Target City</span>
                                <div className="flex items-center gap-1.5 text-gray-950 dark:text-white font-bold text-xs truncate">
                                    <MapPin size={13} className="text-gray-400 dark:text-zinc-400 shrink-0 group-hover:text-emerald-500 dark:group-hover:text-neon-green transition-colors" />
                                    <span>{campaign.targetCity || 'Universal'}</span>
                                </div>
                            </div>

                            <div className="p-4 rounded-2xl bg-white/90 dark:bg-[#121620]/90 border border-emerald-500/35 dark:border-neon-green/30 backdrop-blur-2xl space-y-1.5 hover:border-emerald-500/50 dark:hover:border-neon-green/50 transition-all shadow-xl group">
                                <span className="text-[9px] font-black text-emerald-700 dark:text-neon-green/80 uppercase tracking-widest block font-mono">Reward Payout</span>
                                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-neon-green font-black text-xs truncate">
                                    <Zap size={13} className="shrink-0" />
                                    <span>{campaign.reward || 'Barter Collab'}</span>
                                </div>
                            </div>

                            <div className="p-4 rounded-2xl bg-white/90 dark:bg-[#121620]/90 border border-black/10 dark:border-white/10 backdrop-blur-2xl space-y-1.5 hover:border-black/20 dark:hover:border-white/20 transition-all shadow-xl group">
                                <span className="text-[9px] font-black text-gray-500 dark:text-zinc-500 uppercase tracking-widest block font-mono">Min. Followers</span>
                                <div className="flex items-center gap-1.5 text-gray-950 dark:text-white font-bold text-xs truncate font-mono">
                                    <Users size={13} className="text-gray-400 dark:text-zinc-400 shrink-0 group-hover:text-emerald-500 dark:group-hover:text-neon-green transition-colors" />
                                    <span>{Number(campaign.minInstagramFollowers || 0).toLocaleString()}+</span>
                                </div>
                            </div>

                            <div className="p-4 rounded-2xl bg-white/90 dark:bg-[#121620]/90 border border-black/10 dark:border-white/10 backdrop-blur-2xl space-y-1.5 hover:border-black/20 dark:hover:border-white/20 transition-all shadow-xl group">
                                <span className="text-[9px] font-black text-gray-500 dark:text-zinc-500 uppercase tracking-widest block font-mono">Deliverables</span>
                                <div className="flex items-center gap-1.5 text-gray-950 dark:text-white font-bold text-xs truncate font-mono">
                                    <Target size={13} className="text-gray-400 dark:text-zinc-400 shrink-0 group-hover:text-emerald-500 dark:group-hover:text-neon-green transition-colors" />
                                    <span>{campaignTasks.length} Tasks</span>
                                </div>
                            </div>
                        </div>

                        {/* Main Two-Column Layout */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                            {/* Left Column: Briefing & Deliverables (7 Cols) */}
                            <div className="lg:col-span-7 space-y-8">
                                {/* Campaign Briefing Card - Ultra-Premium Styling */}
                                <div className="relative p-4 sm:p-7 rounded-3xl bg-gray-50/70 dark:bg-white/[0.025] border border-black/[0.08] dark:border-white/[0.08] backdrop-blur-xl space-y-4 sm:space-y-5 shadow-xs dark:shadow-2xl overflow-hidden transition-colors">
                                    {/* Ambient Corner Glow */}
                                    <div className="absolute -top-12 -right-12 w-44 h-44 bg-gradient-to-bl from-emerald-500/10 dark:from-neon-green/10 to-transparent rounded-full blur-2xl pointer-events-none" />

                                    <div className="flex items-center justify-between pb-3.5 sm:pb-4 border-b border-black/[0.06] dark:border-white/[0.08] relative z-10 gap-3">
                                        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                                            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.08] dark:border-white/[0.1] flex items-center justify-center text-gray-800 dark:text-zinc-200 shadow-2xs shrink-0">
                                                <FileText size={15} />
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className="text-xs sm:text-sm font-black font-heading uppercase tracking-wider text-gray-950 dark:text-white truncate">
                                                    Campaign Briefing
                                                </h4>
                                                <p className="text-[9px] sm:text-[10px] font-mono text-gray-500 dark:text-zinc-500 uppercase tracking-wider truncate">
                                                    Guidelines &amp; Requirements
                                                </p>
                                            </div>
                                        </div>
                                        <span className="hidden sm:inline-flex px-2.5 py-1 rounded-lg bg-black/[0.04] dark:bg-white/[0.05] border border-black/[0.06] dark:border-white/[0.08] text-[9px] font-mono font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider shrink-0 whitespace-nowrap">
                                            Official Brief
                                        </span>
                                    </div>
                                    <div 
                                        className="campaign-briefing-content text-sm sm:text-base font-normal leading-relaxed relative z-10" 
                                        dangerouslySetInnerHTML={{ __html: campaign.description || 'No detailed briefing provided for this campaign.' }} 
                                    />
                                </div>

                                {/* Campaign Deliverables Section */}
                                {campaignTasks.length > 0 && (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between pb-1">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 dark:bg-neon-green/10 border border-emerald-500/20 dark:border-neon-green/20 flex items-center justify-center text-emerald-600 dark:text-neon-green">
                                                    <Target size={15} />
                                                </div>
                                                <h4 className="text-xs font-black font-heading uppercase tracking-wider text-gray-950 dark:text-white">
                                                    Deliverables
                                                </h4>
                                            </div>
                                            <span className="text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-widest font-mono">
                                                {requiredTasks.length} Required · {campaignTasks.length - requiredTasks.length} Optional
                                            </span>
                                        </div>

                                        <div className="space-y-3">
                                            {campaignTasks.map((task, idx) => {
                                                const typeInfo = TASK_TYPES[task.taskType] || TASK_TYPES.custom;
                                                const TypeIcon = typeInfo.icon;
                                                const platInfo = PLATFORMS[task.platform] || PLATFORMS.other;
                                                const status = getSubmissionStatus(task, user?.uid);

                                                return (
                                                    <div
                                                        key={task.id || idx}
                                                        onClick={() => isJoined && setSelectedTask(task)}
                                                        className={cn(
                                                            "p-5 rounded-2xl bg-gray-50/70 dark:bg-white/[0.025] border border-black/[0.08] dark:border-white/[0.08] hover:border-black/20 dark:hover:border-white/20 transition-all duration-200 flex items-start gap-4 backdrop-blur-md shadow-2xs",
                                                            isJoined ? "cursor-pointer hover:bg-gray-100/80 dark:hover:bg-white/[0.04]" : ""
                                                        )}
                                                    >
                                                        <div className={cn(
                                                            "w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border",
                                                            status === 'approved' ? "bg-emerald-500/15 dark:bg-neon-green/20 text-emerald-600 dark:text-neon-green border-emerald-500/30 dark:border-neon-green/30" :
                                                            status === 'submitted' ? "bg-amber-500/15 text-amber-500 dark:text-amber-400 border-amber-500/30" :
                                                            "bg-black/[0.04] dark:bg-white/[0.04] text-gray-700 dark:text-zinc-300 border-black/10 dark:border-white/10"
                                                        )}>
                                                            {status === 'approved' ? <CheckCircle2 size={20} /> : <TypeIcon size={20} />}
                                                        </div>

                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center flex-wrap gap-2 mb-1.5">
                                                                <p className="font-bold text-sm sm:text-base text-gray-950 dark:text-white tracking-tight">
                                                                    {task.title}
                                                                </p>
                                                                {task.priority === 'required' && (
                                                                    <span className="px-2 py-0.5 bg-emerald-500/10 dark:bg-neon-green/10 border border-emerald-500/25 dark:border-neon-green/25 rounded-md text-[8px] font-black uppercase tracking-widest text-emerald-600 dark:text-neon-green font-mono">
                                                                        Required
                                                                    </span>
                                                                )}
                                                                {task.deadline && (
                                                                    <span className="px-2 py-0.5 bg-red-500/10 dark:bg-red-500/15 border border-red-500/25 rounded-md text-[8px] font-black uppercase tracking-widest text-red-500 dark:text-red-400 flex items-center gap-1 font-mono">
                                                                        <Clock size={9} /> {new Date(task.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                                                    </span>
                                                                )}
                                                                {isJoined && (
                                                                    <span className={cn(
                                                                        "px-2.5 py-0.5 border rounded-md text-[8px] font-black uppercase tracking-widest font-mono ml-auto",
                                                                        status === 'approved' ? "bg-emerald-500/10 dark:bg-neon-green/15 border-emerald-500/30 dark:border-neon-green/30 text-emerald-600 dark:text-neon-green" :
                                                                        status === 'submitted' ? "bg-amber-500/10 dark:bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400" :
                                                                        "bg-black/[0.04] dark:bg-white/[0.05] border-black/10 dark:border-white/10 text-gray-500 dark:text-zinc-400"
                                                                    )}>
                                                                        {status === 'not_started' ? 'Pending' : status.toUpperCase().replace('_', ' ')}
                                                                    </span>
                                                                )}
                                                            </div>

                                                            {task.description && (
                                                                <div 
                                                                    className="campaign-briefing-content text-xs mt-1 leading-relaxed font-normal" 
                                                                    dangerouslySetInnerHTML={{ __html: task.description }} 
                                                                />
                                                            )}

                                                            <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-black/[0.06] dark:border-white/[0.06]">
                                                                <span className="px-2.5 py-1 bg-black/[0.04] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.06] rounded-lg text-[9px] font-bold text-gray-600 dark:text-zinc-400 flex items-center gap-1.5 font-mono">
                                                                    {React.createElement(platInfo.icon, { size: 11 })} {platInfo.label}
                                                                </span>
                                                                <span className="px-2.5 py-1 bg-black/[0.04] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.06] rounded-lg text-[9px] font-bold text-gray-600 dark:text-zinc-400 flex items-center gap-1.5 font-mono">
                                                                    {React.createElement(typeInfo.icon, { size: 11 })} {typeInfo.label}
                                                                </span>
                                                                {isJoined && (
                                                                    <span className="px-3 py-1 bg-neon-green text-black font-black text-[9px] uppercase tracking-wider rounded-lg flex items-center gap-1 ml-auto hover:bg-emerald-400 transition-colors shadow-2xs">
                                                                        <span>Submit Proof</span>
                                                                        <ArrowRight size={10} />
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Right Column: Application / Progress Workbench (5 Cols) */}
                            <div className="lg:col-span-5">
                                <div className="relative bg-gray-50/70 dark:bg-white/[0.025] border border-black/[0.08] dark:border-white/[0.08] backdrop-blur-xl rounded-3xl p-6 sm:p-7 shadow-xs dark:shadow-2xl space-y-6 overflow-hidden transition-colors">
                                    {/* Ambient Corner Glow */}
                                    <div className="absolute -bottom-12 -right-12 w-44 h-44 bg-gradient-to-tl from-emerald-500/10 dark:from-neon-green/10 to-transparent rounded-full blur-2xl pointer-events-none" />

                                    {isJoined ? (
                                        /* Already Applied / Joined View */
                                        <div className="space-y-6 relative z-10">
                                            <div className="flex items-center gap-2.5 pb-4 border-b border-black/[0.06] dark:border-white/[0.08]">
                                                <div className="w-8 h-8 rounded-xl bg-emerald-500/15 dark:bg-neon-green/15 border border-emerald-500/30 dark:border-neon-green/30 flex items-center justify-center text-emerald-600 dark:text-neon-green shrink-0">
                                                    <CheckCircle2 size={16} />
                                                </div>
                                                <div>
                                                    <h4 className="text-xs font-bold font-heading text-gray-950 dark:text-white uppercase tracking-wider">
                                                        Active Campaign
                                                    </h4>
                                                    <p className="text-emerald-600 dark:text-neon-green text-[10px] font-bold uppercase tracking-wider font-mono">
                                                        Profile Synchronized
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Progress Bar */}
                                            <div className="space-y-2.5 p-4 rounded-2xl bg-white dark:bg-black/40 border border-black/[0.08] dark:border-white/[0.06] shadow-2xs">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-zinc-400 font-mono">Deliverables Progress</span>
                                                    <span className="text-xs font-black text-emerald-600 dark:text-neon-green font-mono">{Math.round(progress)}%</span>
                                                </div>
                                                <div className="h-2 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                                                    <motion.div 
                                                        initial={{ width: 0 }} 
                                                        animate={{ width: `${progress}%` }} 
                                                        className={cn("h-full transition-all duration-700 bg-neon-green")}
                                                    />
                                                </div>
                                            </div>

                                            {/* Deliverables Summary */}
                                            <div className="p-4 bg-white dark:bg-black/40 border border-black/[0.08] dark:border-white/[0.06] rounded-2xl space-y-3 font-mono text-xs shadow-2xs">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-gray-500 dark:text-zinc-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                                                        <Target size={12} className="text-emerald-600 dark:text-neon-green" /> Deliverables
                                                    </span>
                                                    <span className="font-bold text-gray-950 dark:text-white">
                                                        {approvedTotal} / {campaignTasks.length} Completed
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between pt-2.5 border-t border-black/[0.06] dark:border-white/[0.06]">
                                                    <span className="text-gray-500 dark:text-zinc-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                                                        <ShieldCheck size={12} className="text-emerald-600 dark:text-neon-green" /> Status
                                                    </span>
                                                    <span className={cn("font-bold uppercase text-[11px]", isFullyComplete ? "text-emerald-600 dark:text-neon-green" : "text-amber-500 dark:text-amber-400")}>
                                                        {isFullyComplete ? "Fully Verified" : isShortlisted ? "Shortlisted & Active" : "Under Review"}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* WhatsApp Hub */}
                                            {isShortlisted && campaign.whatsappLink && (
                                                <a href={campaign.whatsappLink} target="_blank" rel="noopener noreferrer" className="block">
                                                    <button
                                                        type="button"
                                                        className="w-full h-12 bg-[#25D366]/15 text-[#128C7E] dark:text-[#25D366] hover:bg-[#25D366] hover:text-white dark:hover:text-black border border-[#25D366]/30 font-black text-xs uppercase tracking-wider gap-2 rounded-2xl flex items-center justify-center transition-all active:scale-95 shadow-2xs"
                                                    >
                                                        <MessageCircle size={16} />
                                                        <span>Join WhatsApp Group</span>
                                                    </button>
                                                </a>
                                            )}
                                        </div>
                                    ) : (
                                        /* Application Form / Qualification Check */
                                        <div className="space-y-6 relative z-10">
                                            <div className="flex items-center gap-2.5 pb-4 border-b border-black/[0.06] dark:border-white/[0.08]">
                                                <div className="w-8 h-8 rounded-xl bg-emerald-500/15 dark:bg-neon-green/15 border border-emerald-500/30 dark:border-neon-green/30 flex items-center justify-center text-emerald-600 dark:text-neon-green shrink-0">
                                                    <Zap size={16} />
                                                </div>
                                                <div>
                                                    <h4 className="text-xs font-bold font-heading text-gray-950 dark:text-white uppercase tracking-wider">
                                                        Creator Application
                                                    </h4>
                                                    <p className="text-gray-500 dark:text-zinc-400 text-[10px] font-medium">
                                                        Submit profile for review
                                                    </p>
                                                </div>
                                            </div>

                                            <AnimatePresence mode="wait">
                                                {!joinSuccess ? (
                                                    <div className="space-y-5">
                                                        {/* Instagram Verification Row */}
                                                        <div className="space-y-3.5">
                                                            <div className="space-y-1.5">
                                                                <label className="text-[10px] font-black text-gray-500 dark:text-zinc-400 uppercase tracking-widest pl-1 font-mono">
                                                                    Instagram Handle
                                                                </label>
                                                                <Input 
                                                                    value={form.instagram} 
                                                                    onChange={e => setForm({...form, instagram: e.target.value})} 
                                                                    placeholder="@username" 
                                                                    className="h-12 bg-white dark:bg-black/50 border-black/15 dark:border-white/10 rounded-2xl text-xs font-semibold text-gray-950 dark:text-white focus:border-neon-green placeholder-gray-400 dark:placeholder-zinc-500 shadow-2xs" 
                                                                    disabled={isEligible} 
                                                                />
                                                            </div>

                                                            <div className="space-y-1.5">
                                                                <label className="text-[10px] font-black text-gray-500 dark:text-zinc-400 uppercase tracking-widest pl-1 font-mono">
                                                                    Auto-Verified Followers
                                                                </label>
                                                                <Input 
                                                                    type="text" 
                                                                    readOnly
                                                                    value={form.followers ? `${Number(form.followers).toLocaleString()} followers` : ''} 
                                                                    placeholder="Auto-verified via Instagram check" 
                                                                    className="h-12 bg-gray-50 dark:bg-black/30 border-black/15 dark:border-white/10 rounded-2xl text-xs font-bold text-gray-950 dark:text-white cursor-not-allowed font-mono placeholder-gray-400 dark:placeholder-zinc-500 shadow-2xs" 
                                                                    disabled={isEligible} 
                                                                />
                                                            </div>

                                                            {/* Follower Qualification Alert */}
                                                            {verificationStep === 'failed' && !isEligible && (
                                                                <motion.div 
                                                                    initial={{ opacity: 0, y: 5 }}
                                                                    animate={{ opacity: 1, y: 0 }}
                                                                    className="p-4 rounded-2xl bg-red-500/10 border border-red-500/25 flex items-start gap-3 text-red-600 dark:text-red-400"
                                                                >
                                                                    <Ban size={18} className="shrink-0 mt-0.5 text-red-500 dark:text-red-400" />
                                                                    <div className="space-y-1">
                                                                        <p className="text-xs font-bold uppercase tracking-wide">
                                                                            Profile qualifications not met
                                                                        </p>
                                                                        <p className="text-[11px] leading-relaxed text-red-600 dark:text-red-300 font-normal">
                                                                            This campaign requires at least <span className="font-bold text-gray-950 dark:text-white">{Number(campaign.minInstagramFollowers || 0).toLocaleString()} followers</span> to apply. Your entered count is {Number(form.followers || 0).toLocaleString()}.
                                                                        </p>
                                                                    </div>
                                                                </motion.div>
                                                            )}

                                                            {/* Action Buttons for Verification */}
                                                            {verificationStep === 'verifying' ? (
                                                                <div className="h-12 bg-black/[0.04] dark:bg-white/[0.05] border border-black/10 dark:border-white/10 rounded-2xl flex items-center justify-center gap-2.5 text-xs font-bold text-gray-600 dark:text-zinc-300">
                                                                    <LoadingSpinner size="xs" color="#39ff14" />
                                                                    <span>Verifying eligibility...</span>
                                                                </div>
                                                            ) : verificationStep === 'success' ? (
                                                                <div className="h-12 bg-emerald-500/15 dark:bg-neon-green/15 border border-emerald-500/30 dark:border-neon-green/30 rounded-2xl flex items-center justify-center gap-2 text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-neon-green">
                                                                    <ShieldCheck size={16} />
                                                                    <span>Eligibility Confirmed</span>
                                                                </div>
                                                            ) : (
                                                                <button
                                                                    type="button"
                                                                    onClick={handleInstagramVerify}
                                                                    disabled={isVerifying}
                                                                    className="w-full h-12 bg-gray-950 text-white hover:bg-neon-green hover:text-black dark:bg-white dark:text-black dark:hover:bg-neon-green dark:hover:text-black font-black uppercase tracking-wider text-xs rounded-2xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
                                                                >
                                                                    <span>{verificationStep === 'failed' ? 'Retry Verification' : 'Check Eligibility'}</span>
                                                                    <ArrowRight size={13} />
                                                                </button>
                                                            )}
                                                        </div>

                                                        {/* Expanded Form When Eligible */}
                                                        <AnimatePresence>
                                                            {isEligible && (
                                                                <motion.form 
                                                                    initial={{ height: 0, opacity: 0 }}
                                                                    animate={{ height: 'auto', opacity: 1 }}
                                                                    onSubmit={handleJoin}
                                                                    className="space-y-4 pt-4 border-t border-black/[0.06] dark:border-white/[0.08]"
                                                                >
                                                                    <div className="space-y-1.5">
                                                                        <label className="text-[10px] font-black text-gray-500 dark:text-zinc-400 uppercase tracking-widest pl-1 font-mono">
                                                                            Full Name
                                                                        </label>
                                                                        <Input 
                                                                            required 
                                                                            value={form.name} 
                                                                            onChange={e => setForm({...form, name: e.target.value})} 
                                                                            placeholder="Your full name" 
                                                                            className="h-12 bg-white dark:bg-black/50 border-black/15 dark:border-white/10 rounded-2xl text-xs font-semibold text-gray-950 dark:text-white focus:border-neon-green placeholder-gray-400 dark:placeholder-zinc-500 shadow-2xs" 
                                                                        />
                                                                    </div>

                                                                    <div className="space-y-1.5">
                                                                        <label className="text-[10px] font-black text-gray-500 dark:text-zinc-400 uppercase tracking-widest pl-1 font-mono">
                                                                            WhatsApp / Mobile
                                                                        </label>
                                                                        <Input 
                                                                            required 
                                                                            type="tel" 
                                                                            value={form.phone} 
                                                                            onChange={e => setForm({...form, phone: e.target.value})} 
                                                                            placeholder="+91..." 
                                                                            className="h-12 bg-white dark:bg-black/50 border-black/15 dark:border-white/10 rounded-2xl text-xs font-semibold text-gray-950 dark:text-white focus:border-neon-green font-mono placeholder-gray-400 dark:placeholder-zinc-500 shadow-2xs" 
                                                                        />
                                                                    </div>

                                                                    <div className="space-y-1.5">
                                                                        <label className="text-[10px] font-black text-gray-500 dark:text-zinc-400 uppercase tracking-widest pl-1 font-mono block">
                                                                            Target City
                                                                        </label>
                                                                        <StudioSelect 
                                                                            value={form.city} 
                                                                            options={PREDEFINED_CITIES.map(c => ({ value: c, label: c.toUpperCase() }))}
                                                                            onChange={val => setForm({...form, city: val})} 
                                                                            placeholder="SELECT CITY"
                                                                            className="h-12"
                                                                            accentColor="neon-green"
                                                                        />
                                                                    </div>

                                                                    <div className="space-y-1.5">
                                                                        <label className="text-[10px] font-black text-gray-500 dark:text-zinc-400 uppercase tracking-widest pl-1 font-mono">
                                                                            Specializations
                                                                        </label>
                                                                        <Input 
                                                                            required 
                                                                            value={form.categories} 
                                                                            onChange={e => setForm({...form, categories: e.target.value})} 
                                                                            placeholder="Fashion, Music, Lifestyle..." 
                                                                            className="h-12 bg-white dark:bg-black/50 border-black/15 dark:border-white/10 rounded-2xl text-xs font-semibold text-gray-950 dark:text-white focus:border-neon-green placeholder-gray-400 dark:placeholder-zinc-500 shadow-2xs" 
                                                                        />
                                                                    </div>

                                                                    <div className="space-y-1.5">
                                                                        <label className="text-[10px] font-black text-gray-500 dark:text-zinc-400 uppercase tracking-widest pl-1 font-mono">
                                                                            Creator Bio
                                                                        </label>
                                                                        <textarea 
                                                                            required 
                                                                            value={form.bio} 
                                                                            onChange={e => setForm({...form, bio: e.target.value})} 
                                                                            placeholder="Brief intro about your content style..." 
                                                                            className="w-full h-24 bg-white dark:bg-black/50 border border-black/15 dark:border-white/10 rounded-2xl p-3.5 text-gray-950 dark:text-white focus:outline-none focus:border-neon-green text-xs font-normal resize-none placeholder-gray-400 dark:placeholder-zinc-500 shadow-2xs" 
                                                                        />
                                                                    </div>

                                                                    <button 
                                                                        type="submit" 
                                                                        disabled={isJoining} 
                                                                        className="w-full h-12 bg-neon-green text-black font-black uppercase tracking-wider text-xs rounded-2xl hover:bg-emerald-400 transition-all shadow-[0_0_25px_rgba(57,255,20,0.3)] active:scale-95 flex items-center justify-center gap-2"
                                                                    >
                                                                        {isJoining ? (
                                                                            <LoadingSpinner size="xs" color="#000000" />
                                                                        ) : (
                                                                            <>
                                                                                <span>Submit Application</span>
                                                                                <ArrowRight size={13} />
                                                                            </>
                                                                        )}
                                                                    </button>
                                                                </motion.form>
                                                            )}
                                                        </AnimatePresence>
                                                    </div>
                                                ) : (
                                                    /* Success State */
                                                    <motion.div 
                                                        initial={{ opacity: 0, scale: 0.95 }} 
                                                        animate={{ opacity: 1, scale: 1 }} 
                                                        className="text-center py-6 space-y-4"
                                                    >
                                                        <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 dark:bg-neon-green/15 border border-emerald-500/30 dark:border-neon-green/30 flex items-center justify-center mx-auto text-emerald-600 dark:text-neon-green">
                                                            <CheckCircle2 size={32} />
                                                        </div>
                                                        <h3 className="text-xl font-black font-heading text-gray-950 dark:text-white uppercase tracking-tight">
                                                            Application Submitted
                                                        </h3>
                                                        <p className="text-xs text-gray-500 dark:text-zinc-400 leading-relaxed max-w-[280px] mx-auto">
                                                            Your profile has been submitted for this campaign. Our brand partnerships team will review your profile.
                                                        </p>
                                                        <button 
                                                            type="button"
                                                            onClick={onClose} 
                                                            className="w-full h-12 bg-gray-950 text-white dark:bg-white dark:text-black hover:bg-gray-800 dark:hover:bg-zinc-200 font-black uppercase tracking-wider text-xs rounded-2xl transition-all shadow-md active:scale-95"
                                                        >
                                                            Back to Workspace
                                                        </button>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Deliverable Proof Submission Sub-Modal */}
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
        </motion.div>,
        document.body
    );
};

export default CampaignDetailModal;
