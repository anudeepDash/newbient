import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Instagram, MapPin, Users, Zap, ArrowRight, ShieldCheck, Trophy, 
    Target, Ban, Camera, Video, Eye, Layers, Globe, Youtube, Twitter, 
    Calendar, CheckCircle2, Clock, MessageCircle, ChevronLeft, ChevronDown, 
    ExternalLink, FileText, Check, X, AlertTriangle, Sparkles,
    RefreshCw, AlertCircle, Lock, Pencil, User, Phone
} from 'lucide-react';
import { useStore } from '../../lib/store';
import { cn, normalizePhoneNumber } from '../../lib/utils';
import { extractSocialUsername, hasDisallowedLink } from '../../lib/socialUtils';
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
    custom: { label: 'Custom', icon: Layers, color: 'text-neon-green' },
};

const resolveTaskType = (task) => {
    if (!task) return TASK_TYPES.custom;
    const type = (task.taskType || '').toLowerCase();
    if (TASK_TYPES[type] && type !== 'custom') return TASK_TYPES[type];

    const title = (task.title || '').toLowerCase();
    if (title.includes('reel') || title.includes('short') || title.includes('video')) return TASK_TYPES.reel;
    if (title.includes('story') || title.includes('stories')) return TASK_TYPES.story;
    if (title.includes('post') || title.includes('photo') || title.includes('feed')) return TASK_TYPES.content_post;
    if (title.includes('event') || title.includes('visit') || title.includes('attend')) return TASK_TYPES.visit_event;

    return TASK_TYPES.custom;
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
    const [showEditDetails, setShowEditDetails] = useState(false);

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
                    
                    // Registered creator who auto-verified during registration, has verified badge, or has approved status
                    const isAutoVerifiedCreator = Boolean(
                        existing.instagramVerified || 
                        existing.isVerified || 
                        (cleanExistingHandle && existing.profileStatus === 'approved')
                    );
                    
                    const meetsCriteria = (minFollowers <= 0) || (count >= minFollowers);
                    
                    if (cleanExistingHandle) {
                        setVerificationStep(meetsCriteria ? 'success' : 'ineligible');
                        setInstagramVerifiedData({
                            handle: cleanExistingHandle,
                            name: existing.name || cleanExistingHandle,
                            followers: count,
                            formattedFollowers: count.toLocaleString(),
                            profilePic: existing.profilePicture || existing.instagramProfilePic || user.photoURL || null,
                            isPrivate: false,
                            isVerified: Boolean(existing.isVerified || existing.instagramVerified),
                            meetsMinimumFollowers: meetsCriteria,
                            isRegisteredCreator: true,
                            isAutoVerifiedCreator
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
        const val = extractSocialUsername(e.target.value, 'instagram');
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
        const cleanHandle = extractSocialUsername(raw || '', 'instagram');
        if (!cleanHandle) {
            setInstagramVerificationError('Please enter your Instagram username (links are not allowed).');
            return useStore.getState().addToast("Please enter only your Instagram username without links.", 'error');
        }
        setIsVerifying(true);
        setVerificationStep('verifying');
        setInstagramVerificationError('');
        setIsManualFollowerEntry(false);

        // Check if handle matches currently logged-in registered creator who auto-verified
        const isRegisteredAutoVerified = Boolean(
            profile &&
            (profile.instagramVerified || profile.isVerified || profile.profileStatus === 'approved') &&
            cleanHandle.toLowerCase() === String(profile.instagram || '').trim().replace(/^@/, '').toLowerCase()
        );

        try {
            const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
            const res = await fetch(`/api/creator-join?action=verify-instagram&handle=${encodeURIComponent(cleanHandle)}`);
            const data = await res.json();

            if (!res.ok || !data.success) {
                if (isRegisteredAutoVerified) {
                    const fallbackCount = Number(profile.instagramFollowers || 0);
                    const meetsCriteria = (minFollowers <= 0) || (fallbackCount >= minFollowers);
                    const verifiedPayload = {
                        handle: cleanHandle,
                        name: profile.name || cleanHandle,
                        followers: fallbackCount,
                        formattedFollowers: fallbackCount.toLocaleString(),
                        profilePic: profile.profilePicture || profile.instagramProfilePic || user?.photoURL || null,
                        isPrivate: false,
                        isVerified: Boolean(profile.isVerified || profile.instagramVerified),
                        meetsMinimumFollowers: meetsCriteria,
                        isRegisteredCreator: true,
                        isAutoVerifiedCreator: true
                    };
                    setInstagramVerifiedData(verifiedPayload);
                    setForm(prev => ({
                        ...prev,
                        instagram: cleanHandle,
                        followers: String(fallbackCount)
                    }));
                    setIsVerifying(false);
                    setVerificationStep(meetsCriteria ? 'success' : 'ineligible');
                    return;
                }
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
                meetsMinimumFollowers: meetsCriteria,
                isRegisteredCreator: Boolean(profile),
                isAutoVerifiedCreator: isRegisteredAutoVerified
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
        if (e && e.preventDefault) e.preventDefault();
        if (!user) {
            setAuthModal(true);
            return;
        }

        if (!isEligible) {
            return useStore.getState().addToast("Please verify your Instagram eligibility before applying.", 'error');
        }

        const phoneToValidate = form.phone || profile?.phone;
        const normPhone = normalizePhoneNumber(phoneToValidate);
        if (normPhone && creators) {
            const existing = creators.find(c => c.uid !== user.uid && normalizePhoneNumber(c.phone) === normPhone);
            if (existing) {
                return useStore.getState().addToast(`The mobile number ${phoneToValidate} is already linked to another creator profile (${existing.email || 'existing account'}).`, 'error');
            }
        }

        setIsJoining(true);
        try {
            const currentJoined = profile?.joinedCampaigns || [];
            if (currentJoined.includes(campaign.id)) {
                useStore.getState().addToast("You've already applied to this campaign!", 'error');
                return;
            }

            const rawFollowers = form.followers || profile?.instagramFollowers || (instagramVerifiedData?.followers ?? 0);
            const parsedFollowers = parseInt(rawFollowers, 10) || 0;

            const isManualFollowers = Boolean(isManualFollowerEntry);
            const cleanInsta = extractSocialUsername(form.instagram || profile?.instagram || '', 'instagram');

            const creatorData = {
                uid: user.uid,
                email: user.email,
                name: form.name || profile?.name || user.displayName || '',
                phone: form.phone || profile?.phone || '',
                city: form.city || profile?.city || '',
                instagram: cleanInsta,
                website: '',
                instagramFollowers: parsedFollowers,
                specializations: form.categories 
                    ? form.categories.split(',').map(n => n.trim()).filter(Boolean)
                    : (profile?.specializations || profile?.niches || []),
                bio: form.bio || profile?.bio || '',
                profileStatus: profile?.profileStatus || (shouldAutoVerify ? 'approved' : 'pending'),
                instagramVerified: profile?.instagramVerified ?? (verificationStep === 'success' || Boolean(instagramVerifiedData?.meetsMinimumFollowers)),
                isVerified: profile?.isVerified ?? shouldAutoVerify,
                manualFollowerEntry: isManualFollowers,
                requiresManualVerification: isManualFollowers,
                profilePicture: profile?.profilePicture || instagramVerifiedData?.profilePic || user.photoURL || null,
                joinedCampaigns: [...currentJoined, campaign.id]
            };

            if (profile) {
                await updateCreator(user.uid, creatorData);
                setProfile(prev => ({ ...(prev || {}), ...creatorData }));
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
                useStore.getState().addToast("Uploading proof file...", 'info');
                proofUrl = await useStore.getState().uploadTaskProof(proofFile, user.uid, campaign.id, taskId);
            }
            await useStore.getState().submitTask(campaign.id, taskId, user.uid, contentLink, proofUrl);
            useStore.getState().addToast("Task submitted successfully! Brand will review.", 'success');
            setSelectedTask(null);
        } catch (error) {
            useStore.getState().addToast("Submission failed. Please try again.", 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!campaign) return null;

    const isRegisteredEligible = Boolean(profile) && (
        minFollowers <= 0 ||
        Number(profile.instagramFollowers || form.followers || 0) >= minFollowers
    );

    const isEligible = isRegisteredEligible || 
        (instagramVerifiedData && Boolean(instagramVerifiedData.meetsMinimumFollowers)) || 
        (isManualFollowerEntry && Boolean(form.followers) && (minFollowers <= 0 || Number(form.followers) >= minFollowers));

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
                    className="absolute w-[1000px] h-[700px] -top-20 left-1/2 -translate-x-1/2 bg-cover bg-center filter blur-[160px] opacity-30 dark:opacity-60 pointer-events-none rounded-full transform-gpu"
                    style={{ backgroundImage: `url(${campaign.thumbnail})` }}
                />
            ) : (
                <div className="absolute w-[600px] h-[600px] bg-emerald-500/10 dark:bg-neon-green/5 rounded-full blur-[160px] pointer-events-none" />
            )}

            {/* Ultra-Premium Modal Window */}
            <motion.div 
                initial={{ opacity: 0, scale: 0.96, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 20 }}
                transition={{ type: "spring", duration: 0.45, bounce: 0.08 }}
                className="relative w-full max-w-5xl max-h-[95vh] sm:max-h-[94vh] bg-white dark:bg-[#0c0e14] text-gray-950 dark:text-white border border-black/10 dark:border-white/[0.12] rounded-2xl sm:rounded-[2.5rem] shadow-[0_25px_80px_rgba(0,0,0,0.18)] dark:shadow-[0_30px_100px_rgba(0,0,0,0.95)] flex flex-col overflow-hidden z-10 transition-colors"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Floating Glassmorphic Close Button */}
                <button 
                    type="button"
                    onClick={onClose}
                    className="absolute top-3.5 right-3.5 sm:top-6 sm:right-6 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-white/90 dark:bg-black/70 hover:bg-white dark:hover:bg-black/90 backdrop-blur-xl border border-black/10 dark:border-white/20 text-gray-800 dark:text-white flex items-center justify-center transition-all duration-200 shadow-xl active:scale-95 group z-30"
                    aria-label="Close modal"
                >
                    <X size={16} className="sm:hidden group-hover:rotate-90 transition-transform duration-200" />
                    <X size={18} className="hidden sm:block group-hover:rotate-90 transition-transform duration-200" />
                </button>

                {/* Scrollable Modal Container */}
                <div className="overflow-y-auto custom-scrollbar flex-1 flex flex-col relative">
                    {/* Ambient Image Color Spill into Modal Content (Image's authentic hues bleed down into the body) */}
                    {campaign.thumbnail && (
                        <div 
                            className="absolute top-0 inset-x-0 h-[650px] bg-cover bg-center filter blur-[70px] opacity-25 dark:opacity-55 pointer-events-none transform-gpu -z-0"
                            style={{ 
                                backgroundImage: `url(${campaign.thumbnail})`,
                                WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 35%, rgba(0,0,0,0.5) 75%, rgba(0,0,0,0) 100%)',
                                maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 35%, rgba(0,0,0,0.5) 75%, rgba(0,0,0,0) 100%)'
                            }}
                        />
                    )}

                    {/* Full-Bleed Hero Banner with Crisp Image and Natural Ambient Presence */}
                    <div className="relative w-full aspect-[16/10] sm:aspect-[2/1] sm:min-h-[440px] shrink-0 overflow-hidden z-10">
                        <div 
                            className="absolute inset-0 pointer-events-none"
                            style={{
                                WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 50%, transparent 95%)',
                                maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 50%, transparent 95%)'
                            }}
                        >
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

                            {/* Subtle Bottom Shadow for Card & Title Contrast (Desktop only) */}
                            <div className="hidden sm:block absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none z-10" />
                        </div>
                        
                        {/* Subtle Top Vignette for Button Visibility */}
                        <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/25 to-transparent pointer-events-none z-10" />

                        {/* Floating Hero Content Overlay - Positioned cleanly above the stat cards (Desktop only) */}
                        <div className="hidden sm:flex absolute bottom-3 md:bottom-4 left-8 right-8 z-20 flex-col justify-end">
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
                    <div className="px-3.5 sm:px-8 pb-6 sm:pb-8 space-y-5 sm:space-y-8 flex-1 relative z-20">
                        {/* Mobile Title & Badges Section */}
                        <div className="sm:hidden pt-2 space-y-2">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.08] dark:border-white/[0.1] text-emerald-600 dark:text-neon-green shadow-xs">
                                    <Instagram size={13} />
                                </div>
                                <div className="px-2.5 py-1 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.08] dark:border-white/[0.1] text-[10px] font-black uppercase tracking-widest text-gray-800 dark:text-white shadow-xs flex items-center gap-1.5 font-mono">
                                    <MapPin size={10} className="text-emerald-600 dark:text-neon-green" /> {campaign.targetCity || 'Universal'}
                                </div>
                            </div>
                            <h1 className="text-xl sm:text-2xl font-black font-heading tracking-tight text-gray-950 dark:text-white uppercase italic leading-tight">
                                {campaign.title}
                            </h1>
                        </div>

                        {/* ── Stats pill row ── */}
                        <div className="flex flex-wrap gap-2 sm:gap-3 mt-1">
                            {[
                                { label: 'Reward', value: campaign.reward || 'Barter', icon: Zap, accent: true },
                                { label: 'Min. Followers', value: `${Number(campaign.minInstagramFollowers || 0).toLocaleString()}+`, icon: Users },
                                { label: 'Tasks', value: `${campaignTasks.length} Deliverables`, icon: Target },
                            ].map(({ label, value, icon: Icon, accent }) => (
                                <div
                                    key={label}
                                    className={cn(
                                        "flex items-center gap-2 px-3.5 py-2 rounded-full border text-xs font-semibold transition-all",
                                        accent
                                            ? "bg-emerald-50 dark:bg-neon-green/10 border-emerald-200 dark:border-neon-green/30 text-emerald-700 dark:text-neon-green"
                                            : "bg-black/[0.04] dark:bg-white/[0.04] border-black/10 dark:border-white/10 text-gray-700 dark:text-zinc-300"
                                    )}
                                >
                                    <Icon size={12} className={accent ? "text-emerald-600 dark:text-neon-green" : "text-gray-500 dark:text-zinc-500"} />
                                    <span className="text-gray-500 dark:text-zinc-500 text-[10px] uppercase tracking-widest font-mono mr-0.5">{label}</span>
                                    <span>{value}</span>
                                </div>
                            ))}
                        </div>

                        {/* ── Divider ── */}
                        <div className="border-t border-black/5 dark:border-white/[0.06]" />

                        {/* ── Campaign Briefing ── */}
                        <section className="space-y-5">
                            <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-500 dark:text-zinc-500 font-mono">
                                Campaign Brief
                            </h2>
                            <div
                                className="campaign-briefing-content text-[15px] sm:text-base leading-[1.75] text-gray-800 dark:text-zinc-200 font-normal"
                                dangerouslySetInnerHTML={{ __html: campaign.description || 'No briefing provided.' }}
                            />
                        </section>

                        {/* ── Divider ── */}
                        {campaignTasks.length > 0 && <div className="border-t border-black/5 dark:border-white/[0.06]" />}

                        {/* ── Deliverables ── */}
                        {campaignTasks.length > 0 && (
                            <section className="space-y-5">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-500 dark:text-zinc-500 font-mono">
                                        Deliverables
                                    </h2>
                                    <span className="text-[10px] text-gray-500 dark:text-zinc-600 font-mono">
                                        {requiredTasks.length} required · {campaignTasks.length - requiredTasks.length} optional
                                    </span>
                                </div>

                                <div className="space-y-2">
                                    {campaignTasks.map((task, idx) => {
                                        const typeInfo = resolveTaskType(task);
                                        const TypeIcon = typeInfo.icon;
                                        const platInfo = PLATFORMS[task.platform] || PLATFORMS.other;
                                        const status = getSubmissionStatus(task, user?.uid);

                                        return (
                                            <div
                                                key={task.id || idx}
                                                onClick={() => isJoined && setSelectedTask(task)}
                                                className={cn(
                                                    "group flex items-start gap-4 p-4 rounded-2xl border transition-all duration-200",
                                                    isJoined ? "cursor-pointer" : "",
                                                    status === 'approved'
                                                        ? "bg-emerald-50 dark:bg-neon-green/[0.05] border-emerald-200 dark:border-neon-green/20 hover:border-emerald-300 dark:hover:border-neon-green/40"
                                                        : status === 'submitted'
                                                        ? "bg-amber-50 dark:bg-amber-500/[0.05] border-amber-200 dark:border-amber-500/20 hover:border-amber-300 dark:hover:border-amber-500/40"
                                                        : "bg-black/[0.02] dark:bg-white/[0.02] border-black/[0.06] dark:border-white/[0.06] hover:border-black/[0.14] dark:hover:border-white/[0.14] hover:bg-black/[0.04] dark:hover:bg-white/[0.04]"
                                                )}
                                            >
                                                {/* Status circle */}
                                                <div className={cn(
                                                    "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5",
                                                    status === 'approved' ? "bg-emerald-100 dark:bg-neon-green/20 text-emerald-600 dark:text-neon-green" :
                                                    status === 'submitted' ? "bg-amber-100 dark:bg-amber-500/20 text-amber-500 dark:text-amber-400" :
                                                    "bg-black/[0.06] dark:bg-white/[0.06] text-gray-500 dark:text-zinc-400"
                                                )}>
                                                    {status === 'approved' ? <CheckCircle2 size={18} /> : <TypeIcon size={17} />}
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div>
                                                            <p className="text-sm font-semibold text-gray-900 dark:text-white leading-snug">
                                                                {task.title}
                                                            </p>
                                                            <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                                                <span className="text-[10px] text-zinc-500 font-mono">
                                                                    {platInfo.label} · {typeInfo.label}
                                                                </span>
                                                                {task.priority === 'required' && (
                                                                    <span className="text-[9px] font-bold text-neon-green/80 uppercase tracking-wider">
                                                                        Required
                                                                    </span>
                                                                )}
                                                                {task.deadline && (
                                                                    <span className="text-[9px] font-bold text-zinc-500 flex items-center gap-1">
                                                                        <Clock size={9} />
                                                                        {new Date(task.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="shrink-0 flex items-center gap-2">
                                                            {isJoined && (
                                                                <span className={cn(
                                                                    "text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border font-mono",
                                                                    status === 'approved' ? "text-emerald-700 dark:text-neon-green border-emerald-300 dark:border-neon-green/30 bg-emerald-100 dark:bg-neon-green/10" :
                                                                    status === 'submitted' ? "text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-500/30 bg-amber-100 dark:bg-amber-500/10" :
                                                                    "text-gray-500 dark:text-zinc-500 border-black/10 dark:border-white/10 bg-black/[0.04] dark:bg-white/[0.04]"
                                                                )}>
                                                                    {status === 'not_started' ? 'Pending' : status.replace('_', ' ')}
                                                                </span>
                                                            )}
                                                            {isJoined && (
                                                                <ArrowRight size={14} className="text-gray-400 dark:text-zinc-600 group-hover:text-gray-700 dark:group-hover:text-zinc-300 group-hover:translate-x-0.5 transition-all" />
                                                            )}
                                                        </div>
                                                    </div>
                                                    {task.description && (
                                                        <div
                                                            className="campaign-briefing-content text-xs mt-2 text-zinc-500 leading-relaxed"
                                                            dangerouslySetInnerHTML={{ __html: task.description }}
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>
                        )}

                        {/* ── Divider ── */}
                        <div className="border-t border-black/5 dark:border-white/[0.06]" />

                        {/* ── Application / Status Panel ── */}
                        <section className="space-y-5 pb-2">
                            {isJoined ? (
                                /* ── Already joined view ── */
                                <div className="space-y-5">
                                    <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-500 dark:text-zinc-500 font-mono">
                                        Campaign Status
                                    </h2>

                                    {/* Progress */}
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                                {approvedTotal} of {campaignTasks.length} tasks completed
                                            </span>
                                            <span className="text-sm font-bold text-emerald-600 dark:text-neon-green font-mono">
                                                {Math.round(progress)}%
                                            </span>
                                        </div>
                                        <div className="h-[3px] bg-black/10 dark:bg-white/[0.08] rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${progress}%` }}
                                                transition={{ duration: 1, ease: 'easeOut' }}
                                                className="h-full bg-neon-green rounded-full"
                                            />
                                        </div>
                                    </div>

                                    {/* Status row */}
                                    <div className="flex items-center justify-between py-3 border-y border-black/5 dark:border-white/[0.06]">
                                        <span className="text-sm text-gray-500 dark:text-zinc-400">Campaign status</span>
                                        <span className={cn("text-sm font-semibold", isFullyComplete ? "text-emerald-600 dark:text-neon-green" : isShortlisted ? "text-amber-500 dark:text-amber-400" : "text-gray-500 dark:text-zinc-400")}>
                                            {isFullyComplete ? "Completed" : isShortlisted ? "Active & Shortlisted" : "Under Review"}
                                        </span>
                                    </div>

                                    {/* WhatsApp */}
                                    {isShortlisted && campaign.whatsappLink && (
                                        <a href={campaign.whatsappLink} target="_blank" rel="noopener noreferrer">
                                            <button type="button" className="w-full h-12 rounded-2xl bg-[#25D366]/10 border border-[#25D366]/20 text-[#25D366] font-semibold text-sm flex items-center justify-center gap-2 hover:bg-[#25D366]/20 transition-all">
                                                <MessageCircle size={16} />
                                                Join WhatsApp Group
                                            </button>
                                        </a>
                                    )}
                                </div>
                            ) : (
                                /* ── Application flow ── */
                                <div className="space-y-6">
                                    <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-500 dark:text-zinc-500 font-mono">
                                        Apply to Campaign
                                    </h2>

                                    <AnimatePresence mode="wait">
                                        {!joinSuccess ? (
                                            profile ? (
                                                /* ── Registered creator fast-track ── */
                                                <motion.div
                                                    key="registered"
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    exit={{ opacity: 0 }}
                                                    className="space-y-4"
                                                >
                                                    {/* Creator identity row */}
                                                    <div className="flex items-center gap-3 py-4 border-y border-black/5 dark:border-white/[0.06]">
                                                        {(profile.profilePicture || instagramVerifiedData?.profilePic || user?.photoURL) ? (
                                                            <img
                                                                src={profile.profilePicture || instagramVerifiedData?.profilePic || user?.photoURL}
                                                                alt={profile.name || form.name}
                                                                className="w-11 h-11 rounded-full object-cover border border-white/10 shrink-0"
                                                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                                            />
                                                        ) : (
                                                            <div className="w-11 h-11 rounded-full bg-black/5 dark:bg-white/[0.06] flex items-center justify-center text-gray-500 dark:text-zinc-400 shrink-0">
                                                                <Instagram size={18} />
                                                            </div>
                                                        )}
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                                                    {profile.name || form.name || user?.displayName || 'Creator'}
                                                                </span>
                                                                {(profile.isVerified || profile.instagramVerified) && (
                                                                    <span className="w-3.5 h-3.5 rounded-full bg-sky-500 flex items-center justify-center shrink-0">
                                                                        <Check size={8} className="text-white stroke-[3]" />
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="text-xs text-zinc-500 mt-0.5">
                                                                @{String(profile.instagram || form.instagram || '').replace(/^@/, '')} · {Number(profile.instagramFollowers || form.followers || 0).toLocaleString()} followers
                                                                {(profile.city || form.city) && ` · ${(profile.city || form.city).toUpperCase()}`}
                                                            </p>
                                                        </div>
                                                        {!isEligible && (
                                                            <button
                                                                type="button"
                                                                onClick={() => { setIsManualFollowerEntry(true); setShowEditDetails(true); }}
                                                                className="text-[11px] text-rose-400 hover:text-rose-300 underline shrink-0 cursor-pointer"
                                                            >
                                                                Update
                                                            </button>
                                                        )}
                                                    </div>

                                                    {/* Ineligibility notice */}
                                                    {!isEligible && (
                                                        <div className="flex items-center gap-2 text-rose-400 text-sm">
                                                            <AlertCircle size={14} className="shrink-0" />
                                                            <span>Requires {minFollowers.toLocaleString()} followers to apply</span>
                                                        </div>
                                                    )}

                                                    {/* Apply CTA */}
                                                    <button
                                                        type="button"
                                                        onClick={handleJoin}
                                                        disabled={isJoining || !isEligible}
                                                        className={cn(
                                                            "w-full h-14 sm:h-[56px] rounded-2xl font-black text-[15px] sm:text-base tracking-wide transition-all flex items-center justify-center gap-2.5",
                                                            isEligible && !isJoining
                                                                ? "bg-neon-green text-black hover:bg-emerald-400 active:scale-[0.99] cursor-pointer shadow-[0_0_40px_rgba(57,255,20,0.25)]"
                                                                : "bg-black/[0.04] dark:bg-white/[0.04] text-gray-400 dark:text-zinc-600 cursor-not-allowed border border-black/[0.08] dark:border-white/[0.08]"
                                                        )}
                                                    >
                                                        {isJoining ? <LoadingSpinner size="xs" color="#000000" /> : (
                                                            <>
                                                                <Zap size={18} className="fill-current" />
                                                                Apply Now
                                                            </>
                                                        )}
                                                    </button>

                                                    {/* Customise toggle */}
                                                    <div className="text-center">
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowEditDetails(!showEditDetails)}
                                                            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                                                        >
                                                            <Pencil size={11} />
                                                            {showEditDetails ? "Hide details" : "Customise application"}
                                                            <ChevronDown size={12} className={cn("transition-transform", showEditDetails && "rotate-180")} />
                                                        </button>
                                                    </div>

                                                    {/* Collapsible form */}
                                                    <AnimatePresence>
                                                        {showEditDetails && (
                                                            <motion.form
                                                                initial={{ height: 0, opacity: 0 }}
                                                                animate={{ height: 'auto', opacity: 1 }}
                                                                exit={{ height: 0, opacity: 0 }}
                                                                onSubmit={handleJoin}
                                                                className="space-y-4 overflow-hidden pt-2"
                                                            >
                                                                <div className="h-px bg-black/5 dark:bg-white/[0.06]" />
                                                                <p className="text-xs text-gray-500 dark:text-zinc-500">Changes will update your creator profile.</p>

                                                                {[
                                                                    { label: 'Full Name', field: 'name', placeholder: 'Your full name' },
                                                                    { label: 'WhatsApp / Mobile', field: 'phone', placeholder: '+91...', type: 'tel' },
                                                                ].map(({ label, field, placeholder, type }) => (
                                                                    <div key={field} className="space-y-1.5">
                                                                        <label className="text-[10px] font-bold text-gray-500 dark:text-zinc-500 uppercase tracking-widest font-mono">{label}</label>
                                                                        <Input
                                                                            required type={type}
                                                                            value={form[field]}
                                                                            onChange={e => setForm({ ...form, [field]: e.target.value })}
                                                                            placeholder={placeholder}
                                                                            className="h-11 bg-black/[0.02] dark:bg-white/[0.04] border-black/10 dark:border-white/10 rounded-xl text-sm text-gray-900 dark:text-white focus:border-emerald-500 dark:focus:border-neon-green"
                                                                        />
                                                                    </div>
                                                                ))}

                                                                <div className="space-y-1.5">
                                                                    <label className="text-[10px] font-bold text-gray-500 dark:text-zinc-500 uppercase tracking-widest font-mono block">Target City</label>
                                                                    <StudioSelect
                                                                        value={form.city}
                                                                        options={PREDEFINED_CITIES.map(c => ({ value: c, label: c.toUpperCase() }))}
                                                                        onChange={val => setForm({ ...form, city: val })}
                                                                        placeholder="SELECT CITY"
                                                                        className="h-11"
                                                                        accentColor="neon-green"
                                                                    />
                                                                </div>

                                                                <div className="space-y-1.5">
                                                                    <label className="text-[10px] font-bold text-gray-500 dark:text-zinc-500 uppercase tracking-widest font-mono">Specializations</label>
                                                                    <Input
                                                                        required value={form.categories}
                                                                        onChange={e => setForm({ ...form, categories: e.target.value })}
                                                                        placeholder="Fashion, Music, Lifestyle..."
                                                                        className="h-11 bg-black/[0.02] dark:bg-white/[0.04] border-black/10 dark:border-white/10 rounded-xl text-sm text-gray-900 dark:text-white focus:border-emerald-500 dark:focus:border-neon-green"
                                                                    />
                                                                </div>

                                                                <div className="space-y-1.5">
                                                                    <label className="text-[10px] font-bold text-gray-500 dark:text-zinc-500 uppercase tracking-widest font-mono">Bio</label>
                                                                    <textarea
                                                                        value={form.bio}
                                                                        onChange={e => setForm({ ...form, bio: e.target.value })}
                                                                        placeholder="Brief intro about your content style..."
                                                                        className="w-full h-20 bg-black/[0.02] dark:bg-white/[0.04] border border-black/10 dark:border-white/10 rounded-xl p-3 text-gray-900 dark:text-white text-xs resize-none placeholder-gray-400 dark:placeholder-zinc-600 focus:outline-none focus:border-emerald-500 dark:focus:border-neon-green transition-colors"
                                                                    />
                                                                </div>

                                                                {isManualFollowerEntry && (
                                                                    <div className="space-y-1.5">
                                                                        <label className="text-[10px] font-bold text-gray-500 dark:text-zinc-500 uppercase tracking-widest font-mono">Follower Count</label>
                                                                        <Input
                                                                            type="text" inputMode="numeric" pattern="[0-9]*"
                                                                            value={form.followers}
                                                                            onChange={e => { const v = e.target.value.replace(/\D/g, ''); setForm(prev => ({ ...prev, followers: v })); }}
                                                                            placeholder="Your follower count"
                                                                            className="h-11 bg-black/[0.02] dark:bg-white/[0.04] border-black/10 dark:border-white/10 rounded-xl text-sm text-gray-900 dark:text-white focus:border-emerald-500 dark:focus:border-neon-green font-mono"
                                                                        />
                                                                    </div>
                                                                )}

                                                                <button
                                                                    type="submit"
                                                                    disabled={isJoining || !isEligible}
                                                                    className="w-full h-12 sm:h-[50px] bg-neon-green text-black font-extrabold text-sm sm:text-[15px] rounded-2xl hover:bg-emerald-400 transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_30px_rgba(57,255,20,0.2)]"
                                                                >
                                                                    {isJoining ? <LoadingSpinner size="xs" color="#000000" /> : <><span>Save & Apply</span><ArrowRight size={15} /></>}
                                                                </button>
                                                            </motion.form>
                                                        )}
                                                    </AnimatePresence>
                                                </motion.div>
                                            ) : (
                                                /* ── Guest / Instagram verification flow ── */
                                                <motion.div
                                                    key="guest"
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    exit={{ opacity: 0 }}
                                                    className="space-y-6"
                                                >
                                                    {/* IG Handle input */}
                                                    <div className="space-y-3">
                                                        <div className="space-y-1">
                                                            <label className="text-sm font-semibold text-white flex items-center gap-2">
                                                                <Instagram size={15} className="text-pink-400" />
                                                                Instagram Handle
                                                            </label>
                                                            {minFollowers > 0 && (
                                                                <p className="text-xs text-zinc-500">
                                                                    Minimum {minFollowers.toLocaleString()} followers required
                                                                </p>
                                                            )}
                                                        </div>

                                                        <div className="relative">
                                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 text-sm font-mono select-none">@</span>
                                                            <input
                                                                type="text"
                                                                value={form.instagram || ''}
                                                                onChange={handleInstagramChange}
                                                                placeholder="yourhandle"
                                                                spellCheck="false"
                                                                className={cn(
                                                                    "w-full h-12 pl-8 pr-28 bg-white/[0.04] border rounded-2xl text-sm font-medium text-white placeholder:text-zinc-600 outline-none transition-all focus:bg-white/[0.06]",
                                                                    instagramVerifiedData?.handle === form.instagram?.trim().replace(/^@/, '').toLowerCase() && isEligible
                                                                        ? "border-neon-green/40 focus:border-neon-green/60"
                                                                        : instagramVerificationError
                                                                        ? "border-rose-500/40 focus:border-rose-500/60"
                                                                        : "border-white/[0.08] focus:border-white/20"
                                                                )}
                                                            />
                                                            <button
                                                                type="button"
                                                                disabled={isVerifying || !form.instagram?.trim()}
                                                                onClick={handleInstagramVerify}
                                                                className={cn(
                                                                    "absolute right-2 top-1/2 -translate-y-1/2 h-8 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-all",
                                                                    instagramVerifiedData?.handle === form.instagram?.trim().replace(/^@/, '').toLowerCase()
                                                                        ? instagramVerifiedData.meetsMinimumFollowers
                                                                            ? "bg-neon-green/15 text-neon-green border border-neon-green/25"
                                                                            : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                                                        : "bg-white text-black hover:bg-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed"
                                                                )}
                                                            >
                                                                {isVerifying ? (
                                                                    <LoadingSpinner size="xs" color={instagramVerifiedData?.meetsMinimumFollowers ? "#39ff14" : "#ffffff"} />
                                                                ) : instagramVerifiedData?.handle === form.instagram?.trim().replace(/^@/, '').toLowerCase() ? (
                                                                    instagramVerifiedData.meetsMinimumFollowers ? "✓ OK" : "✗ Low"
                                                                ) : (
                                                                    "Verify"
                                                                )}
                                                            </button>
                                                        </div>

                                                        {/* Verification loading */}
                                                        {isVerifying && (
                                                            <motion.p
                                                                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                                                className="text-xs text-zinc-500 flex items-center gap-2"
                                                            >
                                                                <span className="animate-pulse">Connecting to Instagram…</span>
                                                            </motion.p>
                                                        )}

                                                        {/* Error */}
                                                        {instagramVerificationError && !isVerifying && (
                                                            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-rose-400 flex items-center gap-1.5">
                                                                <AlertCircle size={13} className="shrink-0" />
                                                                {instagramVerificationError}
                                                            </motion.p>
                                                        )}

                                                        {/* Verified result card */}
                                                        {instagramVerifiedData && !isVerifying && (() => {
                                                            const cleanHandle = instagramVerifiedData.handle;
                                                            const followerCount = instagramVerifiedData.followerCount || instagramVerifiedData.followers || 0;
                                                            return (
                                                                <motion.div
                                                                    initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                                                                    className={cn(
                                                                        "flex items-center gap-3 p-4 rounded-2xl border",
                                                                        instagramVerifiedData.meetsMinimumFollowers
                                                                            ? "bg-neon-green/[0.05] border-neon-green/20"
                                                                            : "bg-rose-500/[0.05] border-rose-500/20"
                                                                    )}
                                                                >
                                                                    {instagramVerifiedData.profilePic ? (
                                                                        <img src={instagramVerifiedData.profilePic} alt={cleanHandle} className="w-10 h-10 rounded-full object-cover shrink-0" />
                                                                    ) : (
                                                                        <div className="w-10 h-10 rounded-full bg-white/[0.06] flex items-center justify-center text-zinc-400 shrink-0">
                                                                            <Instagram size={16} />
                                                                        </div>
                                                                    )}
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="flex items-center gap-1.5">
                                                                            <span className="text-sm font-semibold text-white">@{cleanHandle}</span>
                                                                            {instagramVerifiedData.isVerified && (
                                                                                <span className="w-3.5 h-3.5 rounded-full bg-sky-500 flex items-center justify-center shrink-0">
                                                                                    <Check size={8} className="text-white stroke-[3]" />
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <p className="text-xs text-zinc-500 mt-0.5">
                                                                            {followerCount.toLocaleString()} followers · {' '}
                                                                            {instagramVerifiedData.meetsMinimumFollowers
                                                                                ? <span className="text-neon-green">Eligible</span>
                                                                                : <span className="text-rose-400">Needs {minFollowers.toLocaleString()}</span>
                                                                            }
                                                                        </p>
                                                                    </div>
                                                                    {!instagramVerifiedData.meetsMinimumFollowers && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => { setIsManualFollowerEntry(true); setInstagramVerificationError(''); }}
                                                                            className="text-[11px] text-zinc-400 hover:text-white underline shrink-0 cursor-pointer transition-colors"
                                                                        >
                                                                            Enter manually
                                                                        </button>
                                                                    )}
                                                                </motion.div>
                                                            );
                                                        })()}

                                                        {/* Manual follower entry */}
                                                        {isManualFollowerEntry && (
                                                            <motion.div
                                                                initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                                                                className="space-y-2"
                                                            >
                                                                <label className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5">
                                                                    <Pencil size={11} className="text-zinc-500" />
                                                                    Enter follower count manually
                                                                </label>
                                                                <Input
                                                                    type="text" inputMode="numeric" pattern="[0-9]*"
                                                                    value={form.followers || ''}
                                                                    onChange={e => { const v = e.target.value.replace(/\D/g, ''); setForm(prev => ({ ...prev, followers: v })); }}
                                                                    placeholder="e.g. 5000"
                                                                    className="h-11 bg-white/[0.04] border-white/10 rounded-xl text-sm text-white focus:border-neon-green font-mono"
                                                                />
                                                            </motion.div>
                                                        )}
                                                    </div>

                                                    {/* New creator form */}
                                                    <motion.form
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: 'auto', opacity: 1 }}
                                                        onSubmit={handleJoin}
                                                        className="space-y-4 pt-4 border-t border-white/[0.06]"
                                                    >
                                                        {[
                                                            { label: 'Full Name', field: 'name', placeholder: 'Your full name', required: true },
                                                            { label: 'WhatsApp / Mobile', field: 'phone', placeholder: '+91...', type: 'tel', required: true },
                                                            { label: 'Email', field: 'email', placeholder: 'you@email.com', type: 'email', required: true },
                                                        ].map(({ label, field, placeholder, type, required }) => (
                                                            <div key={field} className="space-y-1.5">
                                                                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-widest font-mono text-[10px]">{label}</label>
                                                                <Input
                                                                    required={required} type={type}
                                                                    value={form[field] || ''}
                                                                    onChange={e => setForm({ ...form, [field]: e.target.value })}
                                                                    placeholder={placeholder}
                                                                    className="h-11 bg-white/[0.04] border-white/10 rounded-xl text-sm text-white focus:border-neon-green"
                                                                />
                                                            </div>
                                                        ))}

                                                        <div className="space-y-1.5">
                                                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono block">City</label>
                                                            <StudioSelect
                                                                value={form.city}
                                                                options={PREDEFINED_CITIES.map(c => ({ value: c, label: c.toUpperCase() }))}
                                                                onChange={val => setForm({ ...form, city: val })}
                                                                placeholder="SELECT CITY"
                                                                className="h-11"
                                                                accentColor="neon-green"
                                                            />
                                                        </div>

                                                        <div className="space-y-1.5">
                                                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">Specializations</label>
                                                            <Input
                                                                required value={form.categories || ''}
                                                                onChange={e => setForm({ ...form, categories: e.target.value })}
                                                                placeholder="Fashion, Music, Lifestyle..."
                                                                className="h-11 bg-white/[0.04] border-white/10 rounded-xl text-sm text-white focus:border-neon-green"
                                                            />
                                                        </div>

                                                        <button
                                                            type="submit"
                                                            disabled={isJoining}
                                                            className="w-full h-14 sm:h-[56px] bg-neon-green text-black font-black text-[15px] sm:text-base rounded-2xl hover:bg-emerald-400 transition-all shadow-[0_0_40px_rgba(57,255,20,0.25)] active:scale-95 flex items-center justify-center gap-2.5 cursor-pointer"
                                                        >
                                                            {isJoining ? <LoadingSpinner size="xs" color="#000000" /> : <><span>Submit Application</span><ArrowRight size={16} /></>}
                                                        </button>
                                                    </motion.form>
                                                </motion.div>
                                            )
                                        ) : (
                                            /* ── Success state ── */
                                            <motion.div
                                                key="success"
                                                initial={{ opacity: 0, scale: 0.96 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                className="py-10 flex flex-col items-center text-center space-y-4"
                                            >
                                                <div className="w-16 h-16 rounded-full bg-neon-green/15 border border-neon-green/30 flex items-center justify-center text-neon-green">
                                                    <CheckCircle2 size={32} />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <h3 className="text-xl font-bold text-white">You're in!</h3>
                                                    <p className="text-sm text-zinc-500 max-w-xs leading-relaxed">
                                                        Your application has been submitted. Our team will review and get in touch.
                                                    </p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={onClose}
                                                    className="mt-2 px-8 h-11 rounded-full bg-white text-black font-semibold text-sm hover:bg-zinc-100 transition-all active:scale-95"
                                                >
                                                    Back to Dashboard
                                                </button>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            )}
                        </section>
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
