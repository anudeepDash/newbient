import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Instagram, MapPin, Users, Zap, ArrowRight, ShieldCheck, Trophy, 
    Target, Ban, Camera, Video, Eye, Star, Globe, Youtube, Twitter, 
    Calendar, CheckCircle2, Clock, MessageCircle, ChevronLeft, 
    ExternalLink, FileText, Check, X, AlertTriangle, Sparkles,
    RefreshCw, AlertCircle, Lock
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
    const [verificationStep, setVerificationStep] = useState('idle'); // idle | verifying | success | scraper_error | ineligible
    const [instagramVerifiedData, setInstagramVerifiedData] = useState(null);
    const [instagramVerificationError, setInstagramVerificationError] = useState('');
    const [isManualFollowerEntry, setIsManualFollowerEntry] = useState(false);
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
                    const cleanExistingHandle = String(existing.instagram || '').replace(/^@/, '');
                    setForm(prev => ({
                        ...prev,
                        instagram: cleanExistingHandle,
                        followers: existing.instagramFollowers ? String(existing.instagramFollowers) : '',
                        name: existing.name || '',
                        phone: existing.phone || '',
                        city: existing.city || '',
                        categories: (existing.specializations || existing.niches || []).join(', '),
                        bio: existing.bio || ''
                    }));
                    
                    const minFollowers = Number(campaign?.minInstagramFollowers || 0);
                    const count = Number(existing.instagramFollowers || 0);
                    // Auto-approve if they already meet the campaign requirement
                    if (count && (minFollowers <= 0 || count >= minFollowers)) {
                        setVerificationStep('success');
                        setInstagramVerifiedData({
                            handle: cleanExistingHandle,
                            name: existing.name || cleanExistingHandle,
                            followers: count,
                            formattedFollowers: count.toLocaleString(),
                            profilePic: existing.profilePicture || existing.instagramProfilePic || user.photoURL || null,
                            isPrivate: false,
                            isVerified: Boolean(existing.isVerified),
                            meetsMinimumFollowers: true
                        });
                    }
                }
            }).catch(err => console.error("Error resolving profile in modal:", err));
        }
    }, [user, authInitialized, resolveCreatorProfile, campaign]);

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

    const minFollowers = Number(campaign?.minInstagramFollowers || 0);

    const handleInstagramChange = (e) => {
        const val = e.target.value.replace(/^@/, '');
        setForm(prev => ({ ...prev, instagram: val }));
        if (instagramVerifiedData && instagramVerifiedData.handle !== val.trim().toLowerCase()) {
            setInstagramVerifiedData(null);
            setInstagramVerificationError('');
            setVerificationStep('idle');
        }
    };

    // Instagram verification eligibility check
    const handleInstagramVerify = async (manualHandle = null) => {
        const raw = manualHandle !== null ? manualHandle : form.instagram;
        const cleanHandle = String(raw || '').trim().replace(/^@/, '');
        if (!cleanHandle) {
            setInstagramVerificationError('Please enter your Instagram username.');
            return useStore.getState().addToast("Please enter your Instagram handle to continue.", 'error');
        }
        setIsVerifying(true);
        setVerificationStep('verifying');
        setInstagramVerificationError('');
        setIsManualFollowerEntry(false);

        try {
            const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
            const res = await fetch(`/api/creator-join?action=verify-instagram&handle=${encodeURIComponent(cleanHandle)}`);
            const data = await res.json();

            if (!res.ok || !data.success) {
                if (isLocal) {
                    const mockFollowers = Math.max(minFollowers || 1000, 2500);
                    const verifiedPayload = {
                        handle: cleanHandle,
                        name: cleanHandle,
                        followers: mockFollowers,
                        formattedFollowers: mockFollowers.toLocaleString(),
                        profilePic: null,
                        isPrivate: false,
                        isVerified: false,
                        meetsMinimumFollowers: true
                    };
                    setInstagramVerifiedData(verifiedPayload);
                    setForm(prev => ({
                        ...prev,
                        instagram: cleanHandle,
                        followers: String(mockFollowers)
                    }));
                    setIsVerifying(false);
                    setVerificationStep('success');
                    useStore.getState().addToast(`Local dev mode: Instagram verification passed (${mockFollowers.toLocaleString()} followers).`, 'info');
                    return;
                }
                if (data.requiresManualEntry) {
                    setIsVerifying(false);
                    setVerificationStep('idle');
                    setIsManualFollowerEntry(true);
                    setInstagramVerificationError('');
                    useStore.getState().addToast(`Instagram verification blocked by Meta. Please enter followers manually.`, 'info');
                    return;
                }
                const errMsg = data.error || `Could not auto-verify @${cleanHandle}. Make sure profile is public.`;
                setIsVerifying(false);
                setVerificationStep('scraper_error');
                setInstagramVerificationError(errMsg);
                setInstagramVerifiedData(null);
                useStore.getState().addToast(errMsg, 'error');
                return;
            }

            const count = Number(data.followers) || 0;
            const meetsCriteria = minFollowers <= 0 || count >= minFollowers;

            const verifiedPayload = {
                handle: data.handle,
                name: data.name,
                followers: count,
                formattedFollowers: data.formattedFollowers || count.toLocaleString(),
                profilePic: data.profilePic || null,
                isPrivate: data.isPrivate || false,
                isVerified: data.isVerified || false,
                meetsMinimumFollowers: meetsCriteria
            };

            setInstagramVerifiedData(verifiedPayload);
            setForm(prev => ({
                ...prev,
                instagram: data.handle,
                followers: count.toString()
            }));

            setIsVerifying(false);
            if (!meetsCriteria) {
                setVerificationStep('ineligible');
            } else {
                setVerificationStep('success');
            }
        } catch (err) {
            setIsVerifying(false);
            setVerificationStep('idle');
            setIsManualFollowerEntry(true);
            setInstagramVerificationError('');
            useStore.getState().addToast(`Instagram verification blocked by Meta. Please enter followers manually.`, 'info');
        }
    };

    // Join Campaign Submission
    const handleJoin = async (e) => {
        e.preventDefault();
        if (!user) {
            setAuthModal(true);
            return;
        }

        if (!isEligible) {
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

    const isEligible = verificationStep === 'success' || (isManualFollowerEntry && Boolean(form.followers) && (minFollowers <= 0 || Number(form.followers) >= minFollowers));

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
                                                        {/* Instagram Profile & Auto-Verification Card */}
                                                        <div className="relative overflow-hidden p-4 sm:p-5 bg-white dark:bg-white/[0.02] border border-black/[0.08] dark:border-white/[0.06] rounded-2xl sm:rounded-3xl space-y-3.5 sm:space-y-4 shadow-xs backdrop-blur-xl">
                                                            {/* Top Instagram Accent Line */}
                                                            {/* Header: Minimalist Label + Badge */}
                                                            <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                                                                <div className="space-y-0.5">
                                                                    <label className="text-[11px] sm:text-xs font-black uppercase tracking-widest text-gray-900 dark:text-white flex items-center gap-1.5 font-mono">
                                                                        <Instagram size={13} className="text-pink-500 shrink-0" />
                                                                        Instagram Handle
                                                                        <span className="text-pink-500">*</span>
                                                                    </label>
                                                                    {minFollowers > 0 && (
                                                                        <p className="text-[10px] text-gray-500 dark:text-zinc-400 font-medium font-mono">
                                                                            Requires minimum {minFollowers.toLocaleString()} followers
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* Handle Input with Integrated Minimal Action */}
                                                            <div className="relative flex items-center group">
                                                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500 font-black text-sm select-none font-mono">
                                                                    @
                                                                </span>
                                                                <input
                                                                    type="text"
                                                                    name="instagram"
                                                                    value={form.instagram}
                                                                    onChange={handleInstagramChange}
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === 'Enter') {
                                                                            e.preventDefault();
                                                                            handleInstagramVerify();
                                                                        }
                                                                    }}
                                                                    placeholder="yourhandle"
                                                                    autoCapitalize="none"
                                                                    autoCorrect="off"
                                                                    spellCheck="false"
                                                                    className={cn(
                                                                        "w-full h-11 sm:h-12 pl-8 sm:pl-9 pr-24 sm:pr-28 bg-gray-50/50 dark:bg-black/30 border rounded-xl text-xs sm:text-sm font-semibold text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-zinc-600 outline-none transition-all shadow-xs",
                                                                        instagramVerifiedData && instagramVerifiedData.handle === form.instagram?.trim().replace(/^@/, '').toLowerCase() && isEligible
                                                                            ? "border-emerald-500/30 focus:border-emerald-500/50 focus:bg-white dark:focus:bg-black/50"
                                                                            : instagramVerificationError
                                                                            ? "border-red-500/30 focus:border-red-500/50 focus:bg-white dark:focus:bg-black/50"
                                                                            : "border-black/10 dark:border-white/10 focus:border-pink-500/50 focus:bg-white dark:focus:bg-black/50"
                                                                    )}
                                                                />
                                                                {/* Clear button */}
                                                                {form.instagram && !isVerifying && !(instagramVerifiedData && instagramVerifiedData.handle === form.instagram?.trim().replace(/^@/, '').toLowerCase() && isEligible) && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setForm(prev => ({ ...prev, instagram: '', followers: '' }));
                                                                            setInstagramVerificationError('');
                                                                            setInstagramVerifiedData(null);
                                                                            setVerificationStep('idle');
                                                                        }}
                                                                        className="absolute right-20 sm:right-24 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center text-gray-500 transition-colors"
                                                                    >
                                                                        <X size={11} className="stroke-[2.5]" />
                                                                    </button>
                                                                )}
                                                                {/* Verify Button Minimal */}
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleInstagramVerify()}
                                                                    disabled={isVerifying || !form.instagram?.trim()}
                                                                    className={cn(
                                                                        "absolute right-1 sm:right-1.5 top-1/2 -translate-y-1/2 h-8 sm:h-9 px-3 sm:px-4 rounded-lg font-black text-[10px] sm:text-[11px] uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                                                                        instagramVerifiedData && instagramVerifiedData.handle === form.instagram?.trim().replace(/^@/, '').toLowerCase()
                                                                            ? instagramVerifiedData.meetsMinimumFollowers
                                                                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                                                                : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                                                                            : "bg-gray-900 text-white dark:bg-white dark:text-gray-900 hover:opacity-80 disabled:opacity-30 disabled:cursor-not-allowed shadow-xs"
                                                                    )}
                                                                >
                                                                    {isVerifying ? (
                                                                        <LoadingSpinner size="xs" color="currentColor" />
                                                                    ) : instagramVerifiedData && instagramVerifiedData.handle === form.instagram?.trim().replace(/^@/, '').toLowerCase() ? (
                                                                        instagramVerifiedData.meetsMinimumFollowers ? (
                                                                            <>
                                                                                <Check size={12} className="stroke-[3]" />
                                                                                <span>Verified</span>
                                                                            </>
                                                                        ) : (
                                                                            <span>Checked</span>
                                                                        )
                                                                    ) : (
                                                                        <span>Verify</span>
                                                                    )}
                                                                </button>
                                                            </div>

                                                            {/* Verification Progress Indicator */}
                                                            {isVerifying && (
                                                                <motion.div
                                                                    initial={{ opacity: 0, y: -4 }}
                                                                    animate={{ opacity: 1, y: 0 }}
                                                                    className="p-3 bg-pink-500/10 border border-pink-500/20 rounded-xl flex items-center gap-3 text-xs text-pink-600 dark:text-pink-400 font-medium"
                                                                >
                                                                    <LoadingSpinner size="xs" color="#ec4899" />
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="font-bold text-pink-600 dark:text-pink-300 text-xs truncate">
                                                                            Connecting to Instagram...
                                                                        </p>
                                                                        <p className="text-[10px] text-pink-500/80 truncate">
                                                                            Fetching follower count for @{form.instagram?.trim().replace(/^@/, '')}
                                                                        </p>
                                                                    </div>
                                                                </motion.div>
                                                            )}

                                                            {/* Verification Error Notice (Scraper / Network / Private Profile) */}
                                                            {instagramVerificationError && !isVerifying && !isManualFollowerEntry && (
                                                                <motion.div
                                                                    initial={{ opacity: 0, y: -4 }}
                                                                    animate={{ opacity: 1, y: 0 }}
                                                                    className="p-3.5 bg-red-500/[0.08] dark:bg-red-500/[0.12] border border-red-500/25 dark:border-red-500/35 rounded-xl space-y-2.5"
                                                                >
                                                                    <div className="flex items-start gap-2.5">
                                                                        <div className="w-5 h-5 rounded-full bg-red-500/20 text-red-500 dark:text-red-400 flex items-center justify-center shrink-0 mt-0.5">
                                                                            <AlertCircle size={13} className="stroke-[2.5]" />
                                                                        </div>
                                                                        <div className="flex-1 min-w-0">
                                                                            <p className="text-xs font-semibold text-red-600 dark:text-red-300 leading-snug">
                                                                                {instagramVerificationError}
                                                                            </p>
                                                                            {!instagramVerificationError.toLowerCase().includes('public') && (
                                                                                <p className="text-[10px] text-red-500/80 mt-0.5">
                                                                                    Make sure your profile is public or check handle spelling.
                                                                                </p>
                                                                            )}
                                                                        </div>
                                                                    </div>

                                                                    {/* Action bar on Mobile & Desktop */}
                                                                    <div className="pt-2 border-t border-red-500/15 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                                                                        <div className="flex items-center gap-1.5 text-[10px] text-red-600/80 dark:text-red-400/80 font-medium shrink-0">
                                                                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                                                                            <span>Profile must be set to <strong>Public</strong></span>
                                                                        </div>
                                                                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto w-full sm:w-auto justify-end">
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    setIsManualFollowerEntry(true);
                                                                                    setInstagramVerificationError('');
                                                                                }}
                                                                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 active:scale-95 text-red-600/90 dark:text-red-400/90 font-bold text-[10px] uppercase tracking-wider transition-all border border-red-500/20 cursor-pointer shrink-0"
                                                                            >
                                                                                Manual Entry
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleInstagramVerify()}
                                                                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-500/15 hover:bg-red-500/25 active:scale-95 text-red-600 dark:text-red-400 font-black text-[10px] uppercase tracking-wider transition-all border border-red-500/30 cursor-pointer shrink-0"
                                                                            >
                                                                                <RefreshCw size={10} className="stroke-[2.5]" />
                                                                                <span>Retry</span>
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                </motion.div>
                                                            )}

                                                            {/* Manual Follower Entry Mode */}
                                                            {isManualFollowerEntry && (
                                                                <motion.div
                                                                    initial={{ opacity: 0, y: -4 }}
                                                                    animate={{ opacity: 1, y: 0 }}
                                                                    className="p-4 rounded-2xl bg-gray-50/70 dark:bg-black/30 border border-black/[0.08] dark:border-white/[0.08] space-y-3"
                                                                >
                                                                    <div className="flex items-center justify-between">
                                                                        <label className="text-[11px] sm:text-xs font-black text-gray-800 dark:text-gray-200 uppercase tracking-widest font-mono">
                                                                            Manual Follower Count
                                                                        </label>
                                                                        <button 
                                                                            type="button" 
                                                                            onClick={() => {
                                                                                setIsManualFollowerEntry(false);
                                                                                if (instagramVerifiedData) {
                                                                                    if (Number(instagramVerifiedData.followers) >= minFollowers) {
                                                                                        setVerificationStep('success');
                                                                                    } else {
                                                                                        setVerificationStep('ineligible');
                                                                                    }
                                                                                } else {
                                                                                    handleInstagramVerify();
                                                                                }
                                                                            }}
                                                                            className="text-[10px] font-bold text-pink-500 hover:text-pink-600 uppercase tracking-wider transition-colors cursor-pointer"
                                                                        >
                                                                            Back to Auto-Verify
                                                                        </button>
                                                                    </div>
                                                                    <div className="relative group">
                                                                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                                                            <Users size={16} className="text-gray-400 dark:text-zinc-500 group-focus-within:text-pink-500 transition-colors" />
                                                                        </div>
                                                                        <input
                                                                            type="text"
                                                                            inputMode="numeric"
                                                                            pattern="[0-9]*"
                                                                            placeholder={`e.g. ${(minFollowers || 1000).toLocaleString()}`}
                                                                            value={form.followers || ''}
                                                                            onChange={e => {
                                                                                const val = e.target.value.replace(/\D/g, '');
                                                                                setForm(prev => ({ ...prev, followers: val }));
                                                                                if (Number(val) >= minFollowers) {
                                                                                    setVerificationStep('success');
                                                                                } else {
                                                                                    setVerificationStep('ineligible');
                                                                                }
                                                                            }}
                                                                            className="w-full pl-10 pr-4 py-2.5 sm:py-3 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 focus:bg-white dark:focus:bg-zinc-900 focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 text-xs sm:text-sm text-gray-900 dark:text-white transition-all shadow-xs font-mono"
                                                                        />
                                                                    </div>
                                                                    {form.followers ? (
                                                                        Number(form.followers) >= minFollowers ? (
                                                                            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 font-mono">
                                                                                <Check size={12} className="stroke-[3]" /> Follower requirement met ({Number(form.followers).toLocaleString()} followers).
                                                                            </p>
                                                                        ) : (
                                                                            <p className="text-[11px] text-rose-500 font-medium">
                                                                                Minimum {minFollowers.toLocaleString()} followers required. (You entered {Number(form.followers).toLocaleString()})
                                                                            </p>
                                                                        )
                                                                    ) : (
                                                                        <p className="text-[10px] text-gray-500 dark:text-zinc-400">
                                                                            Enter your exact follower count. {minFollowers > 0 ? `Minimum ${minFollowers.toLocaleString()} required.` : ''}
                                                                        </p>
                                                                    )}
                                                                </motion.div>
                                                            )}

                                                            {/* Unified Verified Account Card (Single Source of Truth) */}
                                                            {instagramVerifiedData && instagramVerifiedData.handle === form.instagram?.trim().replace(/^@/, '').toLowerCase() && !isVerifying && !isManualFollowerEntry && (
                                                                <motion.div
                                                                    initial={{ opacity: 0, scale: 0.98 }}
                                                                    animate={{ opacity: 1, scale: 1 }}
                                                                    className={cn(
                                                                        "p-4 rounded-2xl border space-y-3.5 transition-all shadow-xs",
                                                                        instagramVerifiedData.meetsMinimumFollowers
                                                                            ? "bg-emerald-500/[0.05] dark:bg-emerald-500/[0.04] border-emerald-500/30"
                                                                            : "bg-rose-500/[0.04] dark:bg-rose-500/[0.03] border-rose-500/25"
                                                                    )}
                                                                >
                                                                    {(() => {
                                                                        const rawHandle = instagramVerifiedData.handle || form.instagram || '';
                                                                        const cleanHandle = String(rawHandle).trim().replace(/^[@()]+|[()]+$/g, '');
                                                                        let rawName = String(instagramVerifiedData.name || '').trim();
                                                                        rawName = rawName.replace(/^["'‘“”’`()@\s]+|["'‘“”’`()@\s]+$/g, '').trim();
                                                                        const isNameInvalid = !rawName || 
                                                                            rawName.length <= 1 || 
                                                                            ['‘', '’', "'", '"', '.', ' ', 'undefined', 'null'].includes(rawName) ||
                                                                            rawName.toLowerCase() === cleanHandle.toLowerCase() ||
                                                                            rawName.toLowerCase() === `@${cleanHandle.toLowerCase()}` ||
                                                                            rawName.startsWith('(@');
                                                                        const finalDisplayName = isNameInvalid ? null : rawName;

                                                                        return (
                                                                            <div className="flex items-center justify-between gap-3">
                                                                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                                                                    <div className="relative shrink-0">
                                                                                        <div className="p-[2px] rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600">
                                                                                            {instagramVerifiedData.profilePic ? (
                                                                                                <img
                                                                                                    src={instagramVerifiedData.profilePic}
                                                                                                    alt={cleanHandle}
                                                                                                    className="w-12 h-12 rounded-full object-cover bg-black/40 block"
                                                                                                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                                                                                />
                                                                                            ) : (
                                                                                                <div className="w-12 h-12 rounded-full bg-black/60 flex items-center justify-center text-white">
                                                                                                    <Instagram size={20} />
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                        {/* Contextual Avatar Badge */}
                                                                                        {instagramVerifiedData.meetsMinimumFollowers ? (
                                                                                            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-500 text-black flex items-center justify-center shadow-xs">
                                                                                                <Check size={10} className="stroke-[3]" />
                                                                                            </div>
                                                                                        ) : (
                                                                                            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-xs">
                                                                                                <AlertCircle size={10} className="stroke-[2.5]" />
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                    <div className="min-w-0 flex-1">
                                                                                        <div className="flex items-center gap-1.5 min-w-0">
                                                                                            <span className="text-sm font-bold text-gray-900 dark:text-white truncate font-mono tracking-tight">
                                                                                                @{cleanHandle}
                                                                                            </span>
                                                                                            {instagramVerifiedData.isVerified && (
                                                                                                <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-sky-500 text-white shrink-0" title="Verified on Instagram">
                                                                                                    <Check size={8} className="stroke-[3]" />
                                                                                                </span>
                                                                                            )}
                                                                                        </div>
                                                                                        {finalDisplayName ? (
                                                                                            <p className="text-[11px] text-gray-500 dark:text-zinc-400 truncate">
                                                                                                {finalDisplayName}
                                                                                            </p>
                                                                                        ) : (
                                                                                            <p className="text-[10px] text-gray-400 dark:text-zinc-500 font-mono truncate">
                                                                                                Instagram Account
                                                                                            </p>
                                                                                        )}
                                                                                    </div>
                                                                                </div>

                                                                                {/* Status Pill */}
                                                                                <div className="shrink-0">
                                                                                    {instagramVerifiedData.meetsMinimumFollowers ? (
                                                                                        <div className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-2.5 sm:px-3 py-1.5 rounded-xl bg-emerald-500 text-black shadow-xs font-mono">
                                                                                            <CheckCircle2 size={13} className="stroke-[2.5]" />
                                                                                            <span className="hidden sm:inline">Eligible to Apply</span>
                                                                                            <span className="sm:hidden">Eligible</span>
                                                                                        </div>
                                                                                    ) : (
                                                                                        <div className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg sm:rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/25 font-mono">
                                                                                            <AlertCircle size={11} className="shrink-0" />
                                                                                            <span>Below {minFollowers >= 1000 ? `${(minFollowers / 1000).toFixed(minFollowers % 1000 === 0 ? 0 : 1)}K` : minFollowers} Min</span>
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })()}

                                                                    {/* Detailed Status Breakdown for Ineligible Users */}
                                                                    {!instagramVerifiedData.meetsMinimumFollowers && minFollowers > 0 && (
                                                                        <div className="space-y-2 pt-2.5 border-t border-rose-500/15">
                                                                            <div className="flex items-center justify-between text-[11px] font-mono">
                                                                                <span className="text-gray-600 dark:text-zinc-400 font-medium">
                                                                                    Follower Requirement:
                                                                                </span>
                                                                                <span className="font-bold text-gray-900 dark:text-white">
                                                                                    <span className="text-rose-500">{Number(instagramVerifiedData.followers || 0).toLocaleString()}</span> / {minFollowers.toLocaleString()}
                                                                                </span>
                                                                            </div>

                                                                            {/* Visual Progress Bar */}
                                                                            <div className="h-1.5 w-full bg-black/5 dark:bg-white/10 rounded-full overflow-hidden">
                                                                                <div 
                                                                                    className="h-full bg-gradient-to-r from-amber-500 to-rose-500 rounded-full transition-all duration-500" 
                                                                                    style={{ width: `${Math.min(100, Math.max(4, Math.round(((Number(instagramVerifiedData.followers || 0)) / minFollowers) * 100)))}%` }} 
                                                                                />
                                                                            </div>

                                                                            <p className="text-[11px] text-rose-600 dark:text-rose-300 leading-snug">
                                                                                This campaign requires at least <strong>{minFollowers.toLocaleString()} followers</strong> to apply ({Math.max(0, minFollowers - Number(instagramVerifiedData.followers || 0)).toLocaleString()} more needed).
                                                                            </p>
                                                                        </div>
                                                                    )}

                                                                    {/* Action Bar & Metadata */}
                                                                    <div className="pt-2.5 border-t border-black/[0.06] dark:border-white/[0.06] flex items-center justify-between gap-2 flex-wrap">
                                                                        <div className="flex items-center gap-2">
                                                                            {instagramVerifiedData.meetsMinimumFollowers ? (
                                                                                <>
                                                                                    <div className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-baseline gap-1.5">
                                                                                        <span className="text-sm font-black font-mono text-emerald-600 dark:text-neon-green">
                                                                                            {Number(instagramVerifiedData.followers || 0).toLocaleString()}
                                                                                        </span>
                                                                                        <span className="text-[10px] font-bold text-emerald-700 dark:text-neon-green/80 uppercase tracking-wider font-mono">
                                                                                            Followers
                                                                                        </span>
                                                                                    </div>
                                                                                    <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-mono">
                                                                                        <Check size={9} className="stroke-[3]" /> Auto-Verified
                                                                                    </span>
                                                                                </>
                                                                            ) : (
                                                                                <span className="text-[10px] text-gray-500 dark:text-zinc-500 flex items-center gap-1 font-mono">
                                                                                    <Instagram size={11} className="text-pink-500 shrink-0" /> Synced
                                                                                </span>
                                                                            )}
                                                                        </div>

                                                                        <div className="flex items-center gap-3">
                                                                            {!instagramVerifiedData.meetsMinimumFollowers && (
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => {
                                                                                        setIsManualFollowerEntry(true);
                                                                                        setInstagramVerificationError('');
                                                                                    }}
                                                                                    className="text-[10px] font-bold text-pink-500 hover:text-pink-400 uppercase tracking-wider transition-colors cursor-pointer"
                                                                                >
                                                                                    Manual Entry
                                                                                </button>
                                                                            )}
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    setInstagramVerifiedData(null);
                                                                                    setVerificationStep('idle');
                                                                                }}
                                                                                className="text-[10px] font-bold text-gray-400 hover:text-gray-200 uppercase tracking-wider transition-colors cursor-pointer"
                                                                            >
                                                                                Change
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                </motion.div>
                                                            )}

                                                            {/* Removed Informational Guidance block as it is repetitive */}
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
