import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Instagram, MapPin, Users, Zap, ArrowRight, ShieldCheck, Trophy, 
    Target, Ban, Camera, Video, Eye, Layers, Globe, Youtube, Twitter, 
    Calendar, CheckCircle2, Clock, MessageCircle, ChevronLeft, ChevronDown, 
    ExternalLink, FileText, Check, X, AlertTriangle, Sparkles,
    RefreshCw, AlertCircle, Lock, Pencil, User, Phone, Flame, Share2,
    Mail, Plus, Upload, Link2
} from 'lucide-react';
import { useStore } from '../../lib/store';
import { cn, normalizePhoneNumber, getCampaignSpotsInfo } from '../../lib/utils';
import { extractSocialUsername, hasDisallowedLink } from '../../lib/socialUtils';
import { PREDEFINED_CITIES, isCampaignCityMatch } from '../../lib/constants';
import StudioSelect from '../ui/StudioSelect';
import LoadingSpinner from '../ui/LoadingSpinner';
import { Input } from '../ui/Input';
import EditCreatorModal from './EditCreatorModal';
import TaskActionLinks from './TaskActionLinks';
import { linkifyContent, extractTaskActionLinks, cleanTaskDescription, getTaskGoogleFormUrl } from '../../lib/taskLinks';

const POPULAR_NICHES = [
    'Fashion & Style',
    'Lifestyle',
    'Music & Concerts',
    'Tech & Gaming',
    'Beauty & Skincare',
    'Fitness & Health',
    'Food & Cafes',
    'Travel & Adventure'
];

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

const FormattedTaskDescription = ({ description, actionLinks = [] }) => {
    if (!description) return null;
    const cleaned = cleanTaskDescription(description, actionLinks);
    if (!cleaned || !cleaned.trim()) return null;
    const linkified = linkifyContent(cleaned);

    return (
        <div
            className="campaign-briefing-content text-xs sm:text-[13px] text-gray-700 dark:text-zinc-300 leading-relaxed break-words font-normal mb-1.5"
            dangerouslySetInnerHTML={{ __html: linkified }}
        />
    );
};

const CampaignDetailModal = ({ 
    campaign: initialCampaign, 
    onClose, 
    initialTaskId = null 
}) => {
    const { user, authInitialized, campaigns, creators, addCreator, updateCreator, setAuthModal, resolveCreatorProfile, loginWithGoogle } = useStore();
    const campaign = (campaigns || []).find(c => c.id === initialCampaign?.id) || initialCampaign;

    const [profile, setProfile] = useState(null);
    const [isVerifying, setIsVerifying] = useState(false);
    const [verificationStep, setVerificationStep] = useState('idle'); // idle | verifying | success | scraper_error | ineligible
    const [instagramVerifiedData, setInstagramVerifiedData] = useState(null);
    const [instagramVerificationError, setInstagramVerificationError] = useState('');
    const [isManualFollowerEntry, setIsManualFollowerEntry] = useState(false);
    const [isJoining, setIsJoining] = useState(false);
    const [isLoggingInWithGoogle, setIsLoggingInWithGoogle] = useState(false);
    const [joinSuccess, setJoinSuccess] = useState(false);
    const [showEditDetails, setShowEditDetails] = useState(false);
    const [isEditCreatorModalOpen, setIsEditCreatorModalOpen] = useState(false);
    const [editInitialSection, setEditInitialSection] = useState('identity');
    const [isApplyInView, setIsApplyInView] = useState(false);

    const [form, setForm] = useState({
        instagram: '',
        followers: '',
        name: user?.displayName || '',
        email: user?.email || '',
        phone: '',
        city: '',
        categories: '',
        bio: ''
    });

    const [submittingTaskId, setSubmittingTaskId] = useState(null);
    const [expandedTaskId, setExpandedTaskId] = useState(null);
    const [inlineTaskInputs, setInlineTaskInputs] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Track when application section is in viewport to auto-hide duplicate header button
    useEffect(() => {
        const el = document.getElementById('campaign-apply-section');
        if (!el) return;
        const observer = new IntersectionObserver(
            ([entry]) => {
                setIsApplyInView(entry.isIntersecting);
            },
            { threshold: 0.1 }
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, [campaign?.id]);

    // Fast-Track with Google
    const handleGoogleFastTrack = async () => {
        if (!loginWithGoogle) return;
        setIsLoggingInWithGoogle(true);
        try {
            const loggedInUser = await loginWithGoogle();
            if (loggedInUser) {
                useStore.getState().addToast(`Fast-track signed in as ${loggedInUser.displayName || loggedInUser.email}!`, 'success');
                setForm(prev => ({
                    ...prev,
                    name: prev.name || loggedInUser.displayName || '',
                    email: loggedInUser.email || prev.email || ''
                }));
                const found = await resolveCreatorProfile(loggedInUser);
                if (found) {
                    setProfile(found);
                }
            }
        } catch (err) {
            console.error("Fast track login error:", err);
            useStore.getState().addToast("Could not sign in with Google. You can complete the fields below.", 'info');
        } finally {
            setIsLoggingInWithGoogle(false);
        }
    };

    // Selected content niche chips helper
    const selectedNiches = useMemo(() => {
        return (form.categories || '')
            .split(',')
            .map(s => s.trim())
            .filter(Boolean);
    }, [form.categories]);

    const toggleNiche = (niche) => {
        const set = new Set(selectedNiches);
        if (set.has(niche)) {
            set.delete(niche);
        } else {
            set.add(niche);
        }
        setForm(prev => ({ ...prev, categories: Array.from(set).join(', ') }));
    };

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
                        name: existing.name || user.displayName || '',
                        email: existing.email || user.email || '',
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
                } else {
                    setForm(prev => ({
                        ...prev,
                        name: prev.name || user.displayName || '',
                        email: prev.email || user.email || ''
                    }));
                }
            }).catch(err => console.error("Error resolving profile in modal:", err));
        }
    }, [user, authInitialized, resolveCreatorProfile, campaign]);

    // Handle ESC key press
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                if (expandedTaskId) {
                    setExpandedTaskId(null);
                } else if (onClose) {
                    onClose();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [expandedTaskId, onClose]);

    // Prevent body scroll when modal is active
    useEffect(() => {
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = prevOverflow;
        };
    }, []);

    const currentUid = user?.uid || profile?.uid || profile?.id || profile?.creatorId;
    // Check if user is already joined or shortlisted
    const isJoined = profile && (profile.joinedCampaigns || []).includes(campaign?.id);
    const isShortlisted = profile && (profile.shortlistedCampaigns || []).includes(campaign?.id);
    const spotsInfo = getCampaignSpotsInfo(campaign, creators);
    const campaignTasks = campaign?.tasks || [];
    const requiredTasks = campaignTasks.filter(t => t.priority !== 'optional');

    const getSubmissionStatus = (task, uid) => {
        if (!task) return 'not_started';
        const candidates = [
            uid,
            currentUid,
            user?.uid,
            profile?.uid,
            profile?.id,
            profile?.creatorId
        ].filter(Boolean);

        for (const targetUid of candidates) {
            const sub = task.submissions?.[targetUid];
            if (sub && sub.status) return sub.status;
            if ((task.verifiedBy || []).includes(targetUid)) return 'approved';
            if ((task.completedBy || []).includes(targetUid)) return 'submitted';
        }
        return 'not_started';
    };

    const approvedTotal = campaignTasks.filter(t => getSubmissionStatus(t, currentUid) === 'approved').length;
    const progress = campaignTasks.length > 0 ? (approvedTotal / campaignTasks.length) * 100 : 0;
    const isFullyComplete = requiredTasks.length > 0 && requiredTasks.every(t => getSubmissionStatus(t, currentUid) === 'approved');

    const [copiedTaskId, setCopiedTaskId] = useState(null);

    const handleShareTask = async (e, task) => {
        if (e) {
            e.stopPropagation();
            e.preventDefault();
        }
        const directUrl = `${window.location.origin}/campaign/${campaign.id}?taskId=${task.id}`;
        if (navigator.share) {
            try {
                await navigator.share({
                    title: `${task.title} - ${campaign.title}`,
                    text: `Deliverable task: ${task.title} for ${campaign.title} on Newbi`,
                    url: directUrl
                });
                return;
            } catch (err) {
                if (err.name === 'AbortError') return;
            }
        }
        if (navigator.clipboard) {
            await navigator.clipboard.writeText(directUrl);
            setCopiedTaskId(task.id);
            useStore.getState().addToast("Task link copied to clipboard!", 'success');
            setTimeout(() => setCopiedTaskId(null), 2200);
        }
    };

    const scrollToApply = (e) => {
        if (e) {
            e.stopPropagation();
            e.preventDefault();
        }
        const el = document.getElementById('campaign-apply-section');
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            el.classList.add('ring-2', 'ring-emerald-500', 'dark:ring-neon-green', 'ring-offset-2', 'rounded-2xl', 'transition-all');
            setTimeout(() => {
                el.classList.remove('ring-2', 'ring-emerald-500', 'dark:ring-neon-green', 'ring-offset-2');
            }, 2000);
        }
    };

    // Handle initial taskId if provided
    useEffect(() => {
        if (initialTaskId && campaignTasks.length > 0) {
            const targetTask = campaignTasks.find(t => t.id === initialTaskId);
            if (targetTask) {
                setExpandedTaskId(targetTask.id);
                setTimeout(() => {
                    const el = document.getElementById(`task-${targetTask.id}`);
                    if (el) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }, 350);
            }
        }
    }, [initialTaskId, campaignTasks]);

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
                // Seamlessly allow follower count input without dead-ending
                setIsVerifying(false);
                setVerificationStep('idle');
                setIsManualFollowerEntry(true);
                setInstagramVerificationError('');
                useStore.getState().addToast(`Please enter your follower count below to proceed.`, 'info');
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
            useStore.getState().addToast(`Please enter your follower count below.`, 'info');
        }
    };

    // Join Campaign Submission
    const handleJoin = async (e) => {
        if (e && e.preventDefault) e.preventDefault();

        if (spotsInfo.hasSpots && spotsInfo.isFull) {
            return useStore.getState().addToast("This campaign has reached full capacity. No spots left.", 'error');
        }

        const cleanInsta = extractSocialUsername(form.instagram || profile?.instagram || '', 'instagram');
        if (!cleanInsta) {
            return useStore.getState().addToast("Please provide your Instagram handle.", 'error');
        }

        const rawFollowers = form.followers || profile?.instagramFollowers || (instagramVerifiedData?.followers ?? 0);
        let parsedFollowers = parseInt(rawFollowers, 10) || 0;

        // If minFollowers is required and no follower count was entered or verified, prompt user
        if (minFollowers > 0 && !parsedFollowers && !profile) {
            setIsManualFollowerEntry(true);
            return useStore.getState().addToast(`Please enter your follower count (Min. ${minFollowers.toLocaleString()} required).`, 'warning');
        }

        if (minFollowers > 0 && parsedFollowers < minFollowers && !profile) {
            return useStore.getState().addToast(`Requirement not met: Min. ${minFollowers.toLocaleString()} followers needed to apply.`, 'error');
        }

        // Validate contact details for guests or non-profile users
        if (!profile) {
            if (!form.name?.trim()) {
                return useStore.getState().addToast("Please enter your full name.", 'error');
            }
            if (!form.phone?.trim()) {
                return useStore.getState().addToast("Please enter your WhatsApp / mobile number.", 'error');
            }
            if (!form.email?.trim()) {
                return useStore.getState().addToast("Please enter your email address.", 'error');
            }
        }

        const phoneToValidate = form.phone || profile?.phone;
        const normPhone = normalizePhoneNumber(phoneToValidate);
        if (normPhone && creators) {
            const existing = creators.find(c => c.uid !== (user?.uid || null) && normalizePhoneNumber(c.phone) === normPhone);
            if (existing) {
                return useStore.getState().addToast(`The mobile number ${phoneToValidate} is already linked to another creator profile (${existing.email || 'existing account'}).`, 'error');
            }
        }

        const creatorCity = form.city || profile?.city;
        const campCity = campaign?.targetCity;
        const isSpecificCity = campCity && !['any', 'all', 'universal', 'pan-india', 'global', 'remote', '', 'national', 'any hub', 'others', 'pan-india / remote'].includes(campCity.trim().toLowerCase());

        if (isSpecificCity) {
            if (!creatorCity) {
                return useStore.getState().addToast(`Please select your city to apply. This campaign is restricted to creators in ${campCity}.`, 'warning');
            }
            if (!isCampaignCityMatch(campCity, creatorCity)) {
                return useStore.getState().addToast(`Location requirement: This campaign is exclusively open to creators located in ${campCity}.`, 'error');
            }
        }

        setIsJoining(true);
        try {
            const currentJoined = profile?.joinedCampaigns || [];
            if (currentJoined.includes(campaign.id)) {
                useStore.getState().addToast("You've already applied to this campaign!", 'error');
                setIsJoining(false);
                return;
            }

            const isManualFollowers = Boolean(isManualFollowerEntry || !instagramVerifiedData);
            const shouldAutoVerify = !isManualFollowers;

            const meetsFollowers = parsedFollowers >= (Number(campaign?.minInstagramFollowers) || 0);
            const meetsCity = isCampaignCityMatch(campaign?.targetCity, creatorCity);
            const shouldAutoShortlist = Boolean(campaign?.autoShortlistEligible) && meetsFollowers && meetsCity;
            const currentShortlisted = profile?.shortlistedCampaigns || [];
            const nextShortlisted = shouldAutoShortlist && !currentShortlisted.includes(campaign.id)
                ? [...currentShortlisted, campaign.id]
                : currentShortlisted;

            const creatorData = {
                uid: user?.uid || null,
                email: form.email || profile?.email || user?.email || '',
                name: form.name || profile?.name || user?.displayName || cleanInsta,
                phone: form.phone || profile?.phone || '',
                city: form.city || profile?.city || 'Pan-India',
                instagram: cleanInsta,
                website: '',
                instagramFollowers: parsedFollowers,
                specializations: form.categories 
                    ? form.categories.split(',').map(n => n.trim()).filter(Boolean)
                    : (profile?.specializations || profile?.niches || ['Lifestyle']),
                bio: form.bio || profile?.bio || '',
                profileStatus: profile?.profileStatus || (shouldAutoVerify ? 'approved' : 'pending'),
                instagramVerified: profile?.instagramVerified ?? (verificationStep === 'success' || Boolean(instagramVerifiedData?.meetsMinimumFollowers)),
                isVerified: profile?.isVerified ?? shouldAutoVerify,
                manualFollowerEntry: isManualFollowers,
                requiresManualVerification: isManualFollowers,
                profilePicture: profile?.profilePicture || instagramVerifiedData?.profilePic || user?.photoURL || null,
                shortlistedCampaigns: nextShortlisted,
                joinedCampaigns: [...currentJoined, campaign.id]
            };

            if (profile && user?.uid) {
                await updateCreator(user.uid, creatorData);
                setProfile(prev => ({ ...(prev || {}), ...creatorData }));
            } else {
                const res = await addCreator(creatorData);
                if (res && res.creator) {
                    setProfile(res.creator);
                } else {
                    setProfile(creatorData);
                }
            }

            setJoinSuccess(true);
            useStore.getState().addToast("Application submitted successfully! Welcome to the campaign.", 'success');
        } catch (error) {
            console.error("Apply error:", error);
            useStore.getState().addToast(error.message || "Couldn't submit your application. Please try again.", 'error');
        } finally {
            setIsJoining(false);
        }
    };

    // Task submission handler
    const handleTaskSubmit = async (taskId, contentLink, proofFile) => {
        const creatorUid = user?.uid || profile?.uid || profile?.id || profile?.creatorId;
        if (!creatorUid) {
            useStore.getState().addToast("Please apply to the campaign below first to submit deliverables.", 'info');
            const applyEl = document.getElementById('campaign-apply-section');
            if (applyEl) {
                applyEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
            return;
        }
        if (!contentLink && !proofFile) {
            useStore.getState().addToast("Please provide a content link, confirmation, or upload proof.", 'error');
            return;
        }
        setIsSubmitting(true);
        setSubmittingTaskId(taskId);
        try {
            let proofUrl = '';
            if (proofFile) {
                if (typeof proofFile === 'string') {
                    proofUrl = proofFile;
                } else {
                    useStore.getState().addToast("Uploading proof file...", 'info');
                    if (typeof useStore.getState().uploadTaskProof === 'function') {
                        proofUrl = await useStore.getState().uploadTaskProof(proofFile, creatorUid, campaign.id, taskId);
                    } else if (typeof useStore.getState().uploadToCloudinary === 'function') {
                        proofUrl = await useStore.getState().uploadToCloudinary(proofFile);
                    }
                }
            }
            const submitFn = useStore.getState().submitTask || useStore.getState().submitTaskProof;
            if (!submitFn) {
                throw new Error("Task submission service not available");
            }
            await submitFn(campaign.id, taskId, creatorUid, { 
                contentLink: contentLink || '', 
                proofUrl: proofUrl || '' 
            });

            // Auto-join campaign if profile exists and hasn't joined yet
            if (profile && !(profile.joinedCampaigns || []).includes(campaign.id)) {
                const updatedJoined = [...(profile.joinedCampaigns || []), campaign.id];
                try {
                    await updateCreator(creatorUid, { joinedCampaigns: updatedJoined });
                    setProfile(prev => ({ ...(prev || {}), joinedCampaigns: updatedJoined }));
                } catch (e) {
                    console.warn("Could not auto-join campaign upon task submission:", e);
                }
            }

            useStore.getState().addToast("Task submitted successfully! Brand will review.", 'success');
            setExpandedTaskId(null);
        } catch (error) {
            console.error("Task submission error:", error);
            useStore.getState().addToast(error?.message || "Submission failed. Please try again.", 'error');
        } finally {
            setIsSubmitting(false);
            setSubmittingTaskId(null);
        }
    };

    const handleMarkTaskSubmitted = async (task, customLink = null, customProofFile = null) => {
        const creatorUid = user?.uid || profile?.uid || profile?.id || profile?.creatorId;
        if (!creatorUid) {
            useStore.getState().addToast("Please apply to the campaign below first to submit deliverables.", 'info');
            const applyEl = document.getElementById('campaign-apply-section');
            if (applyEl) {
                applyEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
            return;
        }

        const googleFormUrl = getTaskGoogleFormUrl(task);
        const linkToSubmit = customLink?.trim() || (googleFormUrl ? googleFormUrl : 'Deliverable completed by creator');

        await handleTaskSubmit(task.id, linkToSubmit, customProofFile || null);
    };

    if (!campaign) return null;

    const isRegisteredEligible = Boolean(profile) && (
        minFollowers <= 0 ||
        Number(profile.instagramFollowers || form.followers || 0) >= minFollowers
    );

    const parsedFollowersNum = Number(form.followers || instagramVerifiedData?.followers || 0);

    const isEligible = isRegisteredEligible || 
        (instagramVerifiedData && Boolean(instagramVerifiedData.meetsMinimumFollowers)) || 
        (parsedFollowersNum > 0 && (minFollowers <= 0 || parsedFollowersNum >= minFollowers)) ||
        (minFollowers <= 0 && Boolean(form.instagram?.trim()));

    return createPortal(
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9990] flex items-center justify-center p-2 sm:p-4 md:p-6 lg:p-8"
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
                className="relative w-full max-w-5xl max-h-[95vh] sm:max-h-[94vh] bg-white dark:bg-[#0c0e14] text-gray-950 dark:text-white border border-gray-200 dark:border-white/[0.12] rounded-2xl sm:rounded-[2.5rem] shadow-[0_25px_80px_rgba(0,0,0,0.18)] dark:shadow-[0_30px_100px_rgba(0,0,0,0.95)] flex flex-col overflow-hidden z-10 transition-colors"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Floating Glassmorphic Action & Close Buttons */}
                <div className="absolute top-3.5 right-3.5 sm:top-6 sm:right-6 flex items-center gap-2 z-30">
                    {!isJoined && !isApplyInView && (
                        <button 
                            type="button"
                            onClick={scrollToApply}
                            className="h-9 sm:h-11 px-3.5 sm:px-4 rounded-full bg-emerald-600/10 hover:bg-emerald-600/20 dark:bg-neon-green/15 dark:hover:bg-neon-green/25 backdrop-blur-xl border border-emerald-600/30 dark:border-neon-green/30 text-emerald-800 dark:text-neon-green flex items-center gap-1.5 font-bold text-xs transition-all duration-200 shadow-sm sm:shadow-md active:scale-95 cursor-pointer font-mono uppercase tracking-wider"
                            title="Apply to Campaign"
                        >
                            <Zap size={13} className="fill-current text-emerald-600 dark:text-neon-green" />
                            <span className="text-[11px] sm:text-xs font-black">Apply Now</span>
                        </button>
                    )}
                    {profile && (
                        <button 
                            type="button"
                            onClick={() => {
                                setEditInitialSection('identity');
                                setIsEditCreatorModalOpen(true);
                            }}
                            className="h-9 sm:h-11 px-3 sm:px-4 rounded-full bg-white/90 dark:bg-black/70 hover:bg-white dark:hover:bg-black/90 backdrop-blur-xl border border-gray-200 dark:border-white/20 text-gray-800 dark:text-white flex items-center gap-1.5 font-bold text-xs transition-all duration-200 shadow-sm sm:shadow-md active:scale-95 cursor-pointer"
                            title="Edit Creator Details"
                        >
                            <Pencil size={13} className="text-emerald-500 dark:text-neon-green" />
                            <span className="text-[11px] sm:text-xs font-bold">Edit Details</span>
                        </button>
                    )}
                    <button 
                        type="button"
                        onClick={onClose}
                        className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-white/90 dark:bg-black/70 hover:bg-gray-100 dark:hover:bg-black/90 backdrop-blur-xl border border-gray-200 dark:border-white/20 text-gray-800 dark:text-white flex items-center justify-center transition-all duration-200 shadow-sm sm:shadow-md active:scale-95 group cursor-pointer"
                        aria-label="Close modal"
                    >
                        <X size={16} className="sm:hidden group-hover:rotate-90 transition-transform duration-200" />
                        <X size={18} className="hidden sm:block group-hover:rotate-90 transition-transform duration-200" />
                    </button>
                </div>

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
                            <div className="flex items-center gap-2 mb-2.5 flex-wrap">
                                {(campaign.brand || campaign.brandLogo) && (
                                    <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-black/60 backdrop-blur-xl border border-white/15 text-white shadow-lg">
                                        {campaign.brandLogo && (
                                            <img src={campaign.brandLogo} alt="" className="w-4 h-4 rounded object-contain shrink-0" />
                                        )}
                                        {campaign.brand && (
                                            <span className="text-[10px] font-black uppercase tracking-widest text-neon-green font-mono">
                                                {campaign.brand}
                                            </span>
                                        )}
                                    </div>
                                )}
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
                            <div className="flex items-center gap-2 flex-wrap">
                                {(campaign.brand || campaign.brandLogo) && (
                                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.08] dark:border-white/[0.1]">
                                        {campaign.brandLogo && (
                                            <img src={campaign.brandLogo} alt="" className="w-3.5 h-3.5 rounded object-contain shrink-0" />
                                        )}
                                        {campaign.brand && (
                                            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-neon-green">
                                                {campaign.brand}
                                            </span>
                                        )}
                                    </div>
                                )}
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

                            {spotsInfo.hasSpots && (
                                <div
                                    className={cn(
                                        "flex items-center gap-2 px-3.5 py-2 rounded-full border text-xs font-semibold transition-all",
                                        spotsInfo.isFull
                                            ? "bg-red-500/10 border-red-500/30 text-red-500"
                                            : spotsInfo.spotsLeft <= 5
                                                ? "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400"
                                                : "bg-black/[0.04] dark:bg-white/[0.04] border-black/10 dark:border-white/10 text-gray-700 dark:text-zinc-300"
                                    )}
                                >
                                    <Flame size={12} className={spotsInfo.isFull ? "text-red-500" : spotsInfo.spotsLeft <= 5 ? "text-amber-500 fill-amber-500" : "text-gray-500"} />
                                    <span className="text-gray-500 dark:text-zinc-500 text-[10px] uppercase tracking-widest font-mono mr-0.5">Spots</span>
                                    <span>
                                        {spotsInfo.isFull ? '0 Left (Campaign Full)' : `${spotsInfo.spotsLeft} Left${spotsInfo.totalSpots ? ` (${spotsInfo.totalSpots} Total)` : ''}`}
                                    </span>
                                </div>
                            )}

                            {/* Subtle Apply Now Action Pill */}
                            {!isJoined ? (
                                <button
                                    type="button"
                                    onClick={scrollToApply}
                                    className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 dark:bg-neon-green/10 dark:hover:bg-neon-green/20 border border-emerald-500/30 dark:border-neon-green/30 text-emerald-700 dark:text-neon-green text-xs font-bold font-mono uppercase tracking-wider transition-all active:scale-95 cursor-pointer sm:ml-auto shadow-2xs"
                                >
                                    <Zap size={12} className="fill-current text-emerald-600 dark:text-neon-green" />
                                    <span>Apply Now</span>
                                </button>
                            ) : (
                                <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-neon-green text-xs font-bold font-mono sm:ml-auto">
                                    <CheckCircle2 size={13} />
                                    <span>Applied</span>
                                </div>
                            )}
                        </div>

                        {/* ── Divider ── */}
                        <div className="border-t border-black/5 dark:border-white/[0.06]" />

                        {/* ── Campaign Briefing ── */}
                        <section className="relative rounded-xl sm:rounded-2xl bg-white dark:bg-[#0c0e14] border border-black/10 dark:border-white/10 shadow-xs overflow-hidden">
                            <div className="p-4 sm:p-5 space-y-3">
                                <div className="flex items-center gap-2 pb-2 border-b border-black/5 dark:border-white/5">
                                    <FileText size={16} className="text-emerald-600 dark:text-neon-green" />
                                    <h2 className="text-[11px] font-black uppercase tracking-widest text-gray-900 dark:text-white font-mono">
                                        Campaign Brief & Guidelines
                                    </h2>
                                </div>
                                <div
                                    className="campaign-briefing-content text-[13px] sm:text-[14px] leading-relaxed text-gray-700 dark:text-zinc-300 font-normal"
                                    dangerouslySetInnerHTML={{ __html: linkifyContent(campaign.description || 'No briefing provided.') }}
                                />
                            </div>
                        </section>

                        {/* ── Divider ── */}
                        {campaignTasks.length > 0 && <div className="border-t border-black/5 dark:border-white/[0.06]" />}

                        {/* ── Deliverables ── */}
                        {campaignTasks.length > 0 && (
                            <section className="space-y-4">
                                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2.5">
                                    <div>
                                        <h2 className="text-xs font-black uppercase tracking-wider text-gray-900 dark:text-white font-mono">
                                            Deliverables & Tasks
                                        </h2>
                                        <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                                            {requiredTasks.length} required · {campaignTasks.length - requiredTasks.length} optional
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2.5">
                                        <div className="h-1.5 w-20 bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-neon-green rounded-full transition-all" 
                                                style={{ width: `${progress}%` }}
                                            />
                                        </div>
                                        <span className="text-[10px] font-mono font-bold text-gray-500 dark:text-zinc-400">
                                            {approvedTotal}/{campaignTasks.length} Done
                                        </span>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    {campaignTasks.map((task, idx) => {
                                        const typeInfo = resolveTaskType(task);
                                        const TypeIcon = typeInfo.icon;
                                        const platInfo = PLATFORMS[task.platform] || PLATFORMS.other;
                                        const status = getSubmissionStatus(task, currentUid);
                                        const actionLinks = extractTaskActionLinks(task);
                                        const hasGoogleForm = Boolean(getTaskGoogleFormUrl(task));
                                        const isSubmittingThisTask = submittingTaskId === task.id;
                                        const isExpanded = expandedTaskId === task.id;
                                        const taskInput = inlineTaskInputs[task.id] || {};

                                        return (
                                            <div
                                                key={task.id || idx}
                                                id={`task-${task.id}`}
                                                className={cn(
                                                    "group relative flex flex-col p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white dark:bg-[#0c0e14] border transition-all duration-200",
                                                    task.priority === 'required'
                                                        ? "border-black/10 dark:border-white/10 hover:border-emerald-500/40 dark:hover:border-neon-green/40 shadow-xs"
                                                        : "border-black/5 dark:border-white/5 opacity-95"
                                                )}
                                            >
                                                {/* Top row: Task Number + Title + Share Task + Requirement badge */}
                                                <div className="flex items-center justify-between gap-3 mb-2">
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <span className="w-5 h-5 rounded-md bg-black/5 dark:bg-white/10 font-mono text-[10px] font-bold text-gray-500 dark:text-zinc-400 flex items-center justify-center shrink-0">
                                                            {idx + 1}
                                                        </span>
                                                        <h3 className="text-sm sm:text-[15px] font-bold text-gray-900 dark:text-white leading-tight truncate">
                                                            {task.title}
                                                        </h3>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                        {/* Direct Share Task Button */}
                                                        <button
                                                            type="button"
                                                            onClick={(e) => handleShareTask(e, task)}
                                                            className="px-2 py-1 rounded-md bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-gray-600 dark:text-zinc-300 hover:text-gray-900 dark:hover:text-white text-[10px] font-black uppercase font-mono tracking-wider flex items-center gap-1 transition-all active:scale-95 shadow-2xs cursor-pointer"
                                                            title="Share direct task link"
                                                        >
                                                            {copiedTaskId === task.id ? (
                                                                <>
                                                                    <Check size={11} className="text-emerald-500 stroke-[3]" />
                                                                    <span className="text-emerald-500 font-bold">Copied!</span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Share2 size={11} />
                                                                    <span className="hidden sm:inline">Share</span>
                                                                </>
                                                            )}
                                                        </button>

                                                        <span className={cn(
                                                            "text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded font-mono",
                                                            task.priority === 'required' 
                                                                ? "bg-emerald-500/10 text-emerald-700 dark:text-neon-green border border-emerald-500/20 dark:border-neon-green/30" 
                                                                : "bg-black/5 dark:bg-white/5 text-gray-500"
                                                        )}>
                                                            {task.priority === 'required' ? 'Required' : 'Optional'}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Meta tags: Platform, Type, Deadline */}
                                                <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-black/[0.03] dark:bg-white/[0.04] border border-black/5 dark:border-white/5 text-[10px] font-mono text-gray-600 dark:text-zinc-400">
                                                        <TypeIcon size={11} /> {platInfo.label} · {typeInfo.label}
                                                    </span>
                                                    {task.deadline && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-[10px] font-mono font-bold">
                                                            <Clock size={10} /> Due {new Date(task.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Description (cleaned of duplicate URL lines) + Mobile Action Links */}
                                                <div>
                                                    <FormattedTaskDescription description={task.description} actionLinks={actionLinks} />
                                                    <TaskActionLinks 
                                                        task={task} 
                                                        links={actionLinks} 
                                                    />
                                                </div>

                                                {/* Bottom: Status bar + In-Place Submission */}
                                                <div className="mt-3 pt-2.5 border-t border-black/5 dark:border-white/5 flex flex-wrap items-center justify-between gap-2">
                                                    <div className="flex items-center gap-2">
                                                        <div className={cn(
                                                            "w-2 h-2 rounded-full",
                                                            status === 'approved' ? "bg-emerald-500 dark:bg-neon-green" :
                                                            status === 'submitted' ? "bg-amber-400 animate-pulse" :
                                                            status === 'rejected' ? "bg-red-500" :
                                                            "bg-gray-300 dark:bg-zinc-600"
                                                        )} />
                                                        <span className={cn(
                                                            "text-[10px] font-bold uppercase tracking-wider font-mono",
                                                            status === 'approved' ? "text-emerald-600 dark:text-neon-green" :
                                                            status === 'submitted' ? "text-amber-500" :
                                                            status === 'rejected' ? "text-red-500" :
                                                            "text-gray-500 dark:text-zinc-400"
                                                        )}>
                                                            {status === 'approved' ? 'Approved' :
                                                             status === 'submitted' ? 'Submitted · In Review' :
                                                             status === 'rejected' ? 'Revision Needed' :
                                                             'Pending Action'}
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        {status === 'not_started' && (
                                                            <>
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setExpandedTaskId(isExpanded ? null : task.id);
                                                                    }}
                                                                    className="text-[10px] font-mono text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer flex items-center gap-1"
                                                                >
                                                                    <Link2 size={11} />
                                                                    <span>{isExpanded ? 'Hide Link' : 'Add Post Link'}</span>
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    disabled={isSubmittingThisTask}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleMarkTaskSubmitted(task, taskInput.link, taskInput.file);
                                                                    }}
                                                                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider font-mono transition-all active:scale-95 cursor-pointer shadow-xs bg-emerald-500 hover:bg-emerald-400 dark:bg-neon-green dark:hover:bg-emerald-300 text-black disabled:opacity-50"
                                                                >
                                                                    {isSubmittingThisTask ? (
                                                                        <>
                                                                            <LoadingSpinner size="xs" color="#000000" />
                                                                            <span>Submitting...</span>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <CheckCircle2 size={12} className="stroke-[2.5]" />
                                                                            <span>Mark as Submitted</span>
                                                                        </>
                                                                    )}
                                                                </button>
                                                            </>
                                                        )}

                                                        {status === 'submitted' && (
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider font-mono bg-amber-400/15 text-amber-600 dark:text-amber-400 border border-amber-400/30">
                                                                    <Check size={12} className="stroke-[3]" />
                                                                    <span>Submitted</span>
                                                                </span>
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setExpandedTaskId(isExpanded ? null : task.id);
                                                                    }}
                                                                    className="px-2 py-1.5 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white text-[10px] font-mono transition-colors cursor-pointer flex items-center gap-1"
                                                                    title="Update link or file"
                                                                >
                                                                    <Pencil size={11} />
                                                                    <span>{isExpanded ? 'Close' : 'Update'}</span>
                                                                </button>
                                                            </div>
                                                        )}

                                                        {status === 'approved' && (
                                                            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider font-mono bg-emerald-500/15 text-emerald-700 dark:text-neon-green border border-emerald-500/30 dark:border-neon-green/30">
                                                                <CheckCircle2 size={12} className="stroke-[3]" />
                                                                <span>Approved</span>
                                                            </span>
                                                        )}

                                                        {status === 'rejected' && (
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setExpandedTaskId(isExpanded ? null : task.id);
                                                                }}
                                                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider font-mono bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30 hover:bg-red-500/25 transition-colors cursor-pointer"
                                                            >
                                                                <RefreshCw size={11} />
                                                                <span>Resubmit</span>
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* In-Place Submission Drawer */}
                                                <AnimatePresence>
                                                    {isExpanded && (
                                                        <motion.div
                                                            initial={{ opacity: 0, height: 0 }}
                                                            animate={{ opacity: 1, height: 'auto' }}
                                                            exit={{ opacity: 0, height: 0 }}
                                                            className="overflow-hidden mt-3 pt-3 border-t border-black/10 dark:border-white/10 space-y-2.5"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-gray-600 dark:text-zinc-400 flex items-center gap-1.5">
                                                                    <Link2 size={11} /> Deliverable Submission Details
                                                                </span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setExpandedTaskId(null)}
                                                                    className="text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 text-xs cursor-pointer"
                                                                >
                                                                    <X size={13} />
                                                                </button>
                                                            </div>

                                                            <div className="space-y-2">
                                                                <input
                                                                    type="url"
                                                                    value={taskInput.link || ''}
                                                                    onChange={(e) => {
                                                                        const val = e.target.value;
                                                                        setInlineTaskInputs(prev => ({
                                                                            ...prev,
                                                                            [task.id]: { ...(prev[task.id] || {}), link: val }
                                                                        }));
                                                                    }}
                                                                    placeholder="Social Post / Reel URL (e.g. https://instagram.com/p/...)"
                                                                    className="w-full h-9 px-3 rounded-lg bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/10 text-xs text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500 dark:focus:border-neon-green"
                                                                />

                                                                <div className="flex flex-wrap items-center gap-2">
                                                                    <label className="flex-1 min-w-[180px] flex items-center justify-center gap-1.5 h-9 px-3 rounded-lg border border-dashed border-gray-300 dark:border-white/15 bg-gray-50/50 dark:bg-white/[0.02] hover:bg-gray-100 dark:hover:bg-white/[0.05] cursor-pointer text-xs text-gray-600 dark:text-zinc-400 transition-colors">
                                                                                <Upload size={12} />
                                                                        <span className="truncate max-w-[200px]">
                                                                            {taskInput.file ? taskInput.file.name : 'Attach screenshot (optional)'}
                                                                        </span>
                                                                        <input
                                                                            type="file"
                                                                            accept="image/*"
                                                                            className="hidden"
                                                                            onChange={(e) => {
                                                                                const file = e.target.files?.[0] || null;
                                                                                setInlineTaskInputs(prev => ({
                                                                                    ...prev,
                                                                                    [task.id]: { ...(prev[task.id] || {}), file }
                                                                                }));
                                                                            }}
                                                                        />
                                                                    </label>

                                                                    <button
                                                                        type="button"
                                                                        disabled={isSubmittingThisTask}
                                                                        onClick={() => handleMarkTaskSubmitted(task, taskInput.link, taskInput.file)}
                                                                        className="h-9 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-400 dark:bg-neon-green dark:hover:bg-emerald-300 text-black font-black text-xs uppercase tracking-wider font-mono flex items-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-50"
                                                                    >
                                                                        {isSubmittingThisTask ? (
                                                                            <>
                                                                                <LoadingSpinner size="xs" color="#000000" />
                                                                                <span>Saving...</span>
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <Check size={12} className="stroke-[3]" />
                                                                                <span>{status === 'submitted' ? 'Update Submission' : 'Submit Deliverable'}</span>
                                                                            </>
                                                                        )}
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>
                        )}

                        {/* ── Divider ── */}
                        <div className="border-t border-black/5 dark:border-white/[0.06]" />

                        {/* ── Application / Status Panel ── */}
                        <section id="campaign-apply-section" className="space-y-5 pb-2">
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

                                    {/* Creator Profile Preview row in Joined View */}
                                    {profile && (
                                        <div className="flex items-center justify-between p-3 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/5 dark:border-white/[0.06]">
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <div className="w-8 h-8 rounded-full overflow-hidden bg-black/5 dark:bg-white/10 shrink-0">
                                                    {(profile.profilePicture || user?.photoURL) ? (
                                                        <img src={profile.profilePicture || user?.photoURL} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-500">
                                                            {profile.name?.charAt(0) || 'C'}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                                                        {profile.name || user?.displayName}
                                                    </p>
                                                    <p className="text-[10px] text-zinc-500 truncate">
                                                        @{String(profile.instagram || '').replace(/^@/, '')} · {profile.city || 'India'}
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setEditInitialSection('identity');
                                                    setIsEditCreatorModalOpen(true);
                                                }}
                                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-black/5 dark:bg-white/[0.08] hover:bg-neon-green/20 hover:text-emerald-600 dark:hover:text-neon-green text-[11px] font-bold text-gray-700 dark:text-zinc-300 border border-black/10 dark:border-white/10 transition-colors shrink-0 cursor-pointer"
                                            >
                                                <Pencil size={11} />
                                                <span>Edit Details</span>
                                            </button>
                                        </div>
                                    )}

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
                                    {/* Application Section Header */}
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-200/80 dark:border-white/10">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 dark:bg-neon-green/10 border border-emerald-500/20 dark:border-neon-green/30 text-emerald-700 dark:text-neon-green text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1">
                                                    <Sparkles size={11} /> Campaign Application
                                                </span>
                                                {minFollowers > 0 && (
                                                    <span className="text-[10px] text-gray-500 dark:text-zinc-400 font-mono font-semibold">
                                                        Min. {minFollowers.toLocaleString()} followers
                                                    </span>
                                                )}
                                            </div>
                                            <h2 className="text-lg sm:text-xl font-black font-heading text-gray-900 dark:text-white uppercase tracking-tight">
                                                Apply to {campaign.title}
                                            </h2>
                                        </div>
                                        {spotsInfo.hasSpots && (
                                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-xs font-semibold text-gray-700 dark:text-zinc-300 w-fit">
                                                <Flame size={12} className={spotsInfo.isFull ? "text-red-500" : "text-amber-500 fill-amber-500"} />
                                                <span className="font-mono text-[10px] text-gray-500 dark:text-zinc-400 uppercase">Spots:</span>
                                                <span>{spotsInfo.isFull ? 'Campaign Full' : `${spotsInfo.spotsLeft} Left`}</span>
                                            </div>
                                        )}
                                    </div>

                                    <AnimatePresence mode="wait">
                                        {!joinSuccess ? (
                                            profile ? (
                                                /* ── Registered creator fast-track ── */
                                                <motion.div
                                                    key="registered"
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0 }}
                                                    className="space-y-4"
                                                >
                                                    {/* Creator Pass Preview Card */}
                                                    <div className="p-4 sm:p-5 rounded-2xl bg-gray-50/80 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.08] space-y-4">
                                                        <div className="flex items-center gap-3.5">
                                                            <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200 dark:bg-white/10 border-2 border-emerald-500/40 dark:border-neon-green/40 shrink-0">
                                                                {(profile.profilePicture || instagramVerifiedData?.profilePic || user?.photoURL) ? (
                                                                    <img
                                                                        src={profile.profilePicture || instagramVerifiedData?.profilePic || user?.photoURL}
                                                                        alt={profile.name || form.name}
                                                                        className="w-full h-full object-cover"
                                                                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                                                    />
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center text-gray-600 dark:text-zinc-400 font-bold">
                                                                        <Instagram size={20} />
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className="text-base font-bold text-gray-900 dark:text-white truncate">
                                                                        {profile.name || form.name || user?.displayName || 'Creator'}
                                                                    </span>
                                                                    {(profile.isVerified || profile.instagramVerified) && (
                                                                        <span className="w-4 h-4 rounded-full bg-sky-500 flex items-center justify-center shrink-0">
                                                                            <Check size={9} className="text-white stroke-[3]" />
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <p className="text-xs text-gray-600 dark:text-zinc-400 mt-0.5">
                                                                    @{String(profile.instagram || form.instagram || '').replace(/^@/, '')} ·{' '}
                                                                    <span className="font-semibold text-emerald-600 dark:text-neon-green font-mono">
                                                                        {Number(profile.instagramFollowers || form.followers || 0).toLocaleString()} followers
                                                                    </span>
                                                                    {(profile.city || form.city) && ` · ${(profile.city || form.city).toUpperCase()}`}
                                                                </p>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setEditInitialSection('identity');
                                                                    setIsEditCreatorModalOpen(true);
                                                                }}
                                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-white/10 hover:bg-gray-100 dark:hover:bg-white/15 text-xs font-bold text-gray-700 dark:text-zinc-200 border border-gray-200 dark:border-white/10 transition-colors shrink-0 shadow-xs cursor-pointer active:scale-95"
                                                                title="Edit Creator Details"
                                                            >
                                                                <Pencil size={12} />
                                                                <span className="hidden sm:inline">Edit Details</span>
                                                            </button>
                                                        </div>

                                                        {/* Eligibility indicator */}
                                                        <div className="pt-3 border-t border-gray-200/80 dark:border-white/5 flex items-center justify-between flex-wrap gap-2">
                                                            <span className="text-xs text-gray-500 dark:text-zinc-400">Brief Eligibility:</span>
                                                            {isEligible ? (
                                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 dark:bg-neon-green/10 text-emerald-700 dark:text-neon-green text-xs font-bold font-mono">
                                                                    <CheckCircle2 size={13} /> Eligible {minFollowers > 0 ? `(Min. ${minFollowers.toLocaleString()} req.)` : ''}
                                                                </span>
                                                            ) : (
                                                                <div className="flex items-center gap-2">
                                                                    <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-500 font-mono">
                                                                        <AlertCircle size={13} /> Requires {minFollowers.toLocaleString()} followers
                                                                    </span>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => { setIsManualFollowerEntry(true); setShowEditDetails(true); }}
                                                                        className="text-xs text-rose-600 underline font-medium cursor-pointer"
                                                                    >
                                                                        Update Count
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* 1-Click CTA */}
                                                        <button
                                                            type="button"
                                                            onClick={handleJoin}
                                                            disabled={isJoining || !isEligible || (spotsInfo.hasSpots && spotsInfo.isFull)}
                                                            className={cn(
                                                                "w-full h-13 sm:h-14 rounded-2xl font-black text-sm sm:text-base tracking-wide transition-all flex items-center justify-center gap-2.5",
                                                                isEligible && !isJoining && !(spotsInfo.hasSpots && spotsInfo.isFull)
                                                                    ? "bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-500 dark:from-neon-green dark:to-emerald-400 text-black hover:brightness-105 active:scale-[0.99] cursor-pointer shadow-[0_4px_24px_rgba(16,185,129,0.3)] dark:shadow-[0_4px_30px_rgba(57,255,20,0.3)]"
                                                                    : "bg-gray-100 dark:bg-white/[0.04] text-gray-400 dark:text-zinc-600 cursor-not-allowed border border-gray-200 dark:border-white/[0.08]"
                                                            )}
                                                        >
                                                            {isJoining ? (
                                                                <LoadingSpinner size="xs" color="#000000" />
                                                            ) : (spotsInfo.hasSpots && spotsInfo.isFull) ? (
                                                                <>
                                                                    <Lock size={18} />
                                                                    All Spots Claimed (Full)
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Zap size={18} className="fill-current" />
                                                                    <span>1-Click Apply as @{String(profile.instagram || '').replace(/^@/, '')}</span>
                                                                </>
                                                            )}
                                                        </button>
                                                    </div>

                                                    {/* Customise toggle */}
                                                    <div className="text-center pt-1">
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowEditDetails(!showEditDetails)}
                                                            className="text-xs font-medium text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                                                        >
                                                            <Pencil size={11} />
                                                            {showEditDetails ? "Hide customized fields" : "Customize details for this campaign"}
                                                            <ChevronDown size={12} className={cn("transition-transform", showEditDetails && "rotate-180")} />
                                                        </button>
                                                    </div>

                                                    {/* Collapsible form for registered creators */}
                                                    <AnimatePresence>
                                                        {showEditDetails && (
                                                            <motion.form
                                                                initial={{ height: 0, opacity: 0 }}
                                                                animate={{ height: 'auto', opacity: 1 }}
                                                                exit={{ height: 0, opacity: 0 }}
                                                                onSubmit={handleJoin}
                                                                className="space-y-4 overflow-hidden pt-2"
                                                            >
                                                                <div className="h-px bg-gray-200 dark:bg-white/[0.06]" />
                                                                <p className="text-xs text-gray-500 dark:text-zinc-400">Updates here will be saved to your creator pass.</p>

                                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                                                    <div className="space-y-1.5">
                                                                        <label className="text-[11px] font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider font-mono">Full Name</label>
                                                                        <input
                                                                            required
                                                                            type="text"
                                                                            value={form.name}
                                                                            onChange={e => setForm({ ...form, name: e.target.value })}
                                                                            placeholder="Your full name"
                                                                            className="h-11 w-full bg-gray-50/90 dark:bg-white/[0.04] border border-gray-200 dark:border-white/10 rounded-xl px-3.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus:bg-white dark:focus:bg-white/[0.08] focus:border-emerald-500 dark:focus:border-neon-green focus:ring-2 focus:ring-emerald-500/20 dark:ring-neon-green/20 outline-none transition-all"
                                                                        />
                                                                    </div>
                                                                    <div className="space-y-1.5">
                                                                        <label className="text-[11px] font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider font-mono">WhatsApp / Mobile</label>
                                                                        <input
                                                                            required
                                                                            type="tel"
                                                                            value={form.phone}
                                                                            onChange={e => setForm({ ...form, phone: e.target.value })}
                                                                            placeholder="+91..."
                                                                            className="h-11 w-full bg-gray-50/90 dark:bg-white/[0.04] border border-gray-200 dark:border-white/10 rounded-xl px-3.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus:bg-white dark:focus:bg-white/[0.08] focus:border-emerald-500 dark:focus:border-neon-green focus:ring-2 focus:ring-emerald-500/20 dark:ring-neon-green/20 outline-none transition-all"
                                                                        />
                                                                    </div>
                                                                </div>

                                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                                                    <div className="space-y-1.5">
                                                                        <label className="text-[11px] font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider font-mono block">City</label>
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
                                                                        <label className="text-[11px] font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider font-mono">Followers</label>
                                                                        <input
                                                                            type="text"
                                                                            inputMode="numeric"
                                                                            pattern="[0-9]*"
                                                                            value={form.followers}
                                                                            onChange={e => { const v = e.target.value.replace(/\D/g, ''); setForm(prev => ({ ...prev, followers: v })); }}
                                                                            placeholder="Your follower count"
                                                                            className="h-11 w-full bg-gray-50/90 dark:bg-white/[0.04] border border-gray-200 dark:border-white/10 rounded-xl px-3.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus:bg-white dark:focus:bg-white/[0.08] focus:border-emerald-500 dark:focus:border-neon-green focus:ring-2 focus:ring-emerald-500/20 dark:ring-neon-green/20 outline-none transition-all font-mono"
                                                                        />
                                                                    </div>
                                                                </div>

                                                                {/* Interactive Niche Chips */}
                                                                <div className="space-y-2">
                                                                    <label className="text-[11px] font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider font-mono">Specializations / Niches</label>
                                                                    <div className="flex flex-wrap gap-2">
                                                                        {POPULAR_NICHES.map(niche => {
                                                                            const isSelected = selectedNiches.includes(niche);
                                                                            return (
                                                                                <button
                                                                                    key={niche}
                                                                                    type="button"
                                                                                    onClick={() => toggleNiche(niche)}
                                                                                    className={cn(
                                                                                        "px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer",
                                                                                        isSelected
                                                                                            ? "bg-emerald-500/15 border border-emerald-500/40 text-emerald-700 dark:text-neon-green dark:bg-neon-green/15 dark:border-neon-green/30 font-bold shadow-2xs"
                                                                                            : "bg-gray-100 dark:bg-white/[0.04] border border-gray-200 dark:border-white/10 text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/70 dark:hover:bg-white/10"
                                                                                    )}
                                                                                >
                                                                                    {isSelected && <Check size={11} className="stroke-[3]" />}
                                                                                    <span>{niche}</span>
                                                                                </button>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </div>

                                                                <button
                                                                    type="submit"
                                                                    disabled={isJoining || !isEligible}
                                                                    className="w-full h-12 bg-gradient-to-r from-emerald-400 to-teal-500 dark:from-neon-green dark:to-emerald-400 text-black font-extrabold text-sm rounded-2xl hover:brightness-105 transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer shadow-md"
                                                                >
                                                                    {isJoining ? <LoadingSpinner size="xs" color="#000000" /> : <><span>Save & Apply</span><ArrowRight size={15} /></>}
                                                                </button>
                                                            </motion.form>
                                                        )}
                                                    </AnimatePresence>
                                                </motion.div>
                                            ) : (
                                                /* ── Guest / Easy Application Flow ── */
                                                <motion.div
                                                    key="guest"
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0 }}
                                                    className="space-y-5"
                                                >
                                                    {/* Google Fast-Track Button */}
                                                    {!user ? (
                                                        <div className="space-y-3">
                                                            <button
                                                                type="button"
                                                                onClick={handleGoogleFastTrack}
                                                                disabled={isLoggingInWithGoogle}
                                                                className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.04] hover:bg-gray-50 dark:hover:bg-white/[0.08] text-gray-800 dark:text-white text-xs font-bold transition-all shadow-xs active:scale-[0.99] cursor-pointer"
                                                            >
                                                                {isLoggingInWithGoogle ? (
                                                                    <LoadingSpinner size="xs" color="#10b981" />
                                                                ) : (
                                                                    <>
                                                                        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                                                                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                                                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                                                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                                                                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                                                                        </svg>
                                                                        <span>Fast-Track with Google — auto-fill name & email</span>
                                                                    </>
                                                                )}
                                                            </button>

                                                            <div className="relative flex items-center justify-center">
                                                                <div className="absolute inset-0 flex items-center">
                                                                    <div className="w-full border-t border-gray-200 dark:border-white/10" />
                                                                </div>
                                                                <span className="relative px-3 bg-white dark:bg-[#0c0e14] text-[10px] uppercase font-mono font-bold text-gray-400 dark:text-zinc-500">
                                                                    or fill details below
                                                                </span>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-neon-green text-xs font-semibold">
                                                            <CheckCircle2 size={14} className="shrink-0" />
                                                            <span>Signed in as <strong className="font-mono">{user.email || user.displayName}</strong></span>
                                                        </div>
                                                    )}

                                                    {/* Step 1: Instagram Verification */}
                                                    <div className="p-4 rounded-2xl bg-gray-50/80 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.08] space-y-3">
                                                        <div className="flex items-center justify-between">
                                                            <label className="text-[11px] font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider font-mono flex items-center gap-1.5">
                                                                <Instagram size={14} className="text-pink-500" />
                                                                <span>Instagram Profile</span>
                                                            </label>
                                                            {minFollowers > 0 && (
                                                                <span className="text-[10px] font-mono text-gray-500 dark:text-zinc-400 font-semibold">
                                                                    Requirement: {minFollowers.toLocaleString()}+
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Handle input */}
                                                        <div className="relative">
                                                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500 text-sm font-mono select-none">@</span>
                                                            <input
                                                                type="text"
                                                                value={form.instagram || ''}
                                                                onChange={handleInstagramChange}
                                                                placeholder="yourhandle"
                                                                spellCheck="false"
                                                                className={cn(
                                                                    "w-full h-11 pl-8 pr-24 bg-white dark:bg-white/[0.04] border rounded-xl text-sm font-medium text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-zinc-500 outline-none transition-all focus:bg-white dark:focus:bg-white/[0.08]",
                                                                    instagramVerifiedData?.handle === form.instagram?.trim().replace(/^@/, '').toLowerCase() && isEligible
                                                                        ? "border-emerald-500/60 dark:border-neon-green/60 ring-2 ring-emerald-500/20 dark:ring-neon-green/20"
                                                                        : instagramVerificationError
                                                                        ? "border-rose-500/50 focus:border-rose-500/60"
                                                                        : "border-gray-200 dark:border-white/10 focus:border-emerald-500 dark:focus:border-neon-green"
                                                                )}
                                                            />
                                                            <button
                                                                type="button"
                                                                disabled={isVerifying || !form.instagram?.trim()}
                                                                onClick={() => handleInstagramVerify()}
                                                                className={cn(
                                                                    "absolute right-1.5 top-1/2 -translate-y-1/2 h-8 px-3 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer",
                                                                    instagramVerifiedData?.handle === form.instagram?.trim().replace(/^@/, '').toLowerCase()
                                                                        ? instagramVerifiedData.meetsMinimumFollowers
                                                                            ? "bg-emerald-500/15 text-emerald-700 dark:text-neon-green border border-emerald-500/30 dark:border-neon-green/30"
                                                                            : "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                                                                        : "bg-gray-900 text-white dark:bg-white dark:text-black hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                                                                )}
                                                            >
                                                                {isVerifying ? (
                                                                    <LoadingSpinner size="xs" color="#10b981" />
                                                                ) : instagramVerifiedData?.handle === form.instagram?.trim().replace(/^@/, '').toLowerCase() ? (
                                                                    instagramVerifiedData.meetsMinimumFollowers ? "✓ Verified" : "✗ Low"
                                                                ) : (
                                                                    "Verify"
                                                                )}
                                                            </button>
                                                        </div>

                                                        {/* Verification loading */}
                                                        {isVerifying && (
                                                            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-gray-500 dark:text-zinc-400 flex items-center gap-2">
                                                                <span className="animate-pulse">Checking Instagram profile…</span>
                                                            </motion.p>
                                                        )}

                                                        {/* Verified Result Preview */}
                                                        {instagramVerifiedData && !isVerifying && (
                                                            <motion.div
                                                                initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                                                                className={cn(
                                                                    "flex items-center gap-3 p-3 rounded-xl border",
                                                                    instagramVerifiedData.meetsMinimumFollowers
                                                                        ? "bg-emerald-50 dark:bg-neon-green/[0.06] border-emerald-200 dark:border-neon-green/30"
                                                                        : "bg-rose-50 dark:bg-rose-500/[0.06] border-rose-200 dark:border-rose-500/30"
                                                                )}
                                                            >
                                                                {instagramVerifiedData.profilePic ? (
                                                                    <img src={instagramVerifiedData.profilePic} alt="" className="w-9 h-9 rounded-full object-cover shrink-0 border" />
                                                                ) : (
                                                                    <div className="w-9 h-9 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center text-gray-500 shrink-0">
                                                                        <Instagram size={15} />
                                                                    </div>
                                                                )}
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center gap-1.5">
                                                                        <span className="text-xs font-bold text-gray-900 dark:text-white">@{instagramVerifiedData.handle}</span>
                                                                        {instagramVerifiedData.isVerified && (
                                                                            <span className="w-3.5 h-3.5 rounded-full bg-sky-500 flex items-center justify-center">
                                                                                <Check size={8} className="text-white stroke-[3]" />
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <p className="text-[11px] text-gray-600 dark:text-zinc-400 font-mono">
                                                                        {Number(instagramVerifiedData.followers || 0).toLocaleString()} followers · {' '}
                                                                        {instagramVerifiedData.meetsMinimumFollowers ? (
                                                                            <span className="text-emerald-700 dark:text-neon-green font-bold">Eligible</span>
                                                                        ) : (
                                                                            <span className="text-rose-600 dark:text-rose-400 font-bold">Needs {minFollowers.toLocaleString()}</span>
                                                                        )}
                                                                    </p>
                                                                </div>
                                                                {!instagramVerifiedData.meetsMinimumFollowers && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => { setIsManualFollowerEntry(true); setInstagramVerificationError(''); }}
                                                                        className="text-xs text-rose-600 dark:text-rose-300 underline font-medium cursor-pointer shrink-0"
                                                                    >
                                                                        Edit manually
                                                                    </button>
                                                                )}
                                                            </motion.div>
                                                        )}

                                                        {/* Follower Count input (when manual or not verified yet) */}
                                                        {(isManualFollowerEntry || (!instagramVerifiedData && minFollowers > 0)) && (
                                                            <div className="space-y-1.5 pt-1">
                                                                <div className="flex items-center justify-between">
                                                                    <label className="text-[11px] font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider font-mono flex items-center gap-1.5">
                                                                        <Users size={12} className="text-emerald-600 dark:text-neon-green" />
                                                                        <span>Follower Count</span>
                                                                    </label>
                                                                    <span className="text-[10px] text-gray-500 dark:text-zinc-400 font-mono">
                                                                        Self-reported · Verified on shortlist
                                                                    </span>
                                                                </div>
                                                                <div className="relative">
                                                                    <input
                                                                        type="text"
                                                                        inputMode="numeric"
                                                                        pattern="[0-9]*"
                                                                        value={form.followers || ''}
                                                                        onChange={e => {
                                                                            const v = e.target.value.replace(/\D/g, '');
                                                                            setForm(prev => ({ ...prev, followers: v }));
                                                                        }}
                                                                        placeholder={`e.g. ${minFollowers > 0 ? (minFollowers * 1.5).toLocaleString() : '5,000'}`}
                                                                        className="h-11 w-full bg-white dark:bg-white/[0.04] border border-gray-200 dark:border-white/10 rounded-xl px-3.5 text-sm font-mono text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus:border-emerald-500 dark:focus:border-neon-green outline-none"
                                                                    />
                                                                    {form.followers && minFollowers > 0 && (
                                                                        <span className={cn(
                                                                            "absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold font-mono px-2 py-0.5 rounded",
                                                                            Number(form.followers) >= minFollowers
                                                                                ? "text-emerald-700 bg-emerald-100 dark:text-neon-green dark:bg-neon-green/15"
                                                                                : "text-rose-600 bg-rose-100 dark:text-rose-400 dark:bg-rose-500/10"
                                                                        )}>
                                                                            {Number(form.followers) >= minFollowers ? "✓ Meets Min." : `Needs ${minFollowers.toLocaleString()}`}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Step 2: Contact & Demographics (Responsive 2-Column Grid) */}
                                                    <form onSubmit={handleJoin} className="space-y-4">
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                                            {/* Full Name */}
                                                            <div className="space-y-1.5">
                                                                <label className="text-[11px] font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider font-mono flex items-center gap-1.5">
                                                                    <User size={12} className="text-gray-500" />
                                                                    <span>Full Name</span>
                                                                </label>
                                                                <input
                                                                    required
                                                                    type="text"
                                                                    value={form.name}
                                                                    onChange={e => setForm({ ...form, name: e.target.value })}
                                                                    placeholder="Your full name"
                                                                    className="h-11 w-full bg-gray-50/90 dark:bg-white/[0.04] border border-gray-200 dark:border-white/10 rounded-xl px-3.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus:bg-white dark:focus:bg-white/[0.08] focus:border-emerald-500 dark:focus:border-neon-green focus:ring-2 focus:ring-emerald-500/20 dark:ring-neon-green/20 outline-none transition-all"
                                                                />
                                                            </div>

                                                            {/* WhatsApp / Mobile */}
                                                            <div className="space-y-1.5">
                                                                <label className="text-[11px] font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider font-mono flex items-center gap-1.5">
                                                                    <Phone size={12} className="text-emerald-500" />
                                                                    <span>WhatsApp / Mobile</span>
                                                                </label>
                                                                <input
                                                                    required
                                                                    type="tel"
                                                                    value={form.phone}
                                                                    onChange={e => setForm({ ...form, phone: e.target.value })}
                                                                    placeholder="+91..."
                                                                    className="h-11 w-full bg-gray-50/90 dark:bg-white/[0.04] border border-gray-200 dark:border-white/10 rounded-xl px-3.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus:bg-white dark:focus:bg-white/[0.08] focus:border-emerald-500 dark:focus:border-neon-green focus:ring-2 focus:ring-emerald-500/20 dark:ring-neon-green/20 outline-none transition-all"
                                                                />
                                                            </div>
                                                        </div>

                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                                            {/* Email */}
                                                            <div className="space-y-1.5">
                                                                <label className="text-[11px] font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider font-mono flex items-center gap-1.5">
                                                                    <Mail size={12} className="text-gray-500" />
                                                                    <span>Email Address</span>
                                                                </label>
                                                                <input
                                                                    required
                                                                    type="email"
                                                                    value={form.email}
                                                                    onChange={e => setForm({ ...form, email: e.target.value })}
                                                                    placeholder="you@email.com"
                                                                    className="h-11 w-full bg-gray-50/90 dark:bg-white/[0.04] border border-gray-200 dark:border-white/10 rounded-xl px-3.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus:bg-white dark:focus:bg-white/[0.08] focus:border-emerald-500 dark:focus:border-neon-green focus:ring-2 focus:ring-emerald-500/20 dark:ring-neon-green/20 outline-none transition-all"
                                                                />
                                                            </div>

                                                            {/* City */}
                                                            <div className="space-y-1.5">
                                                                <label className="text-[11px] font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider font-mono flex items-center gap-1.5">
                                                                    <MapPin size={12} className="text-emerald-500" />
                                                                    <span>Target City</span>
                                                                </label>
                                                                <StudioSelect
                                                                    value={form.city}
                                                                    options={PREDEFINED_CITIES.map(c => ({ value: c, label: c.toUpperCase() }))}
                                                                    onChange={val => setForm({ ...form, city: val })}
                                                                    placeholder="SELECT CITY"
                                                                    className="h-11"
                                                                    accentColor="neon-green"
                                                                />
                                                            </div>
                                                        </div>

                                                        {/* Step 3: Interactive Content Niches */}
                                                        <div className="space-y-2 pt-1">
                                                            <div className="flex items-center justify-between">
                                                                <label className="text-[11px] font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider font-mono flex items-center gap-1.5">
                                                                    <Sparkles size={12} className="text-amber-500" />
                                                                    <span>Content Niches & Specializations</span>
                                                                </label>
                                                                <span className="text-[10px] text-gray-400 dark:text-zinc-500 font-mono">Tap to select</span>
                                                            </div>
                                                            <div className="flex flex-wrap gap-2">
                                                                {POPULAR_NICHES.map(niche => {
                                                                    const isSelected = selectedNiches.includes(niche);
                                                                    return (
                                                                        <button
                                                                            key={niche}
                                                                            type="button"
                                                                            onClick={() => toggleNiche(niche)}
                                                                            className={cn(
                                                                                "px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer",
                                                                                isSelected
                                                                                    ? "bg-emerald-500/15 border border-emerald-500/40 text-emerald-700 dark:text-neon-green dark:bg-neon-green/15 dark:border-neon-green/30 font-bold shadow-2xs"
                                                                                    : "bg-gray-100 dark:bg-white/[0.04] border border-gray-200 dark:border-white/10 text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/70 dark:hover:bg-white/10"
                                                                            )}
                                                                        >
                                                                            {isSelected && <Check size={11} className="stroke-[3]" />}
                                                                            <span>{niche}</span>
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>

                                                        {/* Submit Application Button */}
                                                        <button
                                                            type="submit"
                                                            disabled={isJoining}
                                                            className="w-full h-13 sm:h-14 rounded-2xl bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-500 dark:from-neon-green dark:to-emerald-400 text-black font-black text-sm sm:text-base tracking-wide flex items-center justify-center gap-2.5 shadow-[0_4px_24px_rgba(16,185,129,0.3)] dark:shadow-[0_4px_30px_rgba(57,255,20,0.3)] hover:brightness-105 active:scale-[0.99] transition-all cursor-pointer mt-2"
                                                        >
                                                            {isJoining ? (
                                                                <LoadingSpinner size="xs" color="#000000" />
                                                            ) : (
                                                                <>
                                                                    <Zap size={16} className="fill-current" />
                                                                    <span>Submit Application</span>
                                                                    <ArrowRight size={16} />
                                                                </>
                                                            )}
                                                        </button>
                                                    </form>
                                                </motion.div>
                                            )
                                        ) : (
                                            /* ── Redesigned Success State ── */
                                            <motion.div
                                                key="success"
                                                initial={{ opacity: 0, scale: 0.96 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                className="py-8 sm:py-10 flex flex-col items-center text-center space-y-4 px-2"
                                            >
                                                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-emerald-100 dark:bg-neon-green/15 border-2 border-emerald-500 dark:border-neon-green/40 flex items-center justify-center text-emerald-600 dark:text-neon-green shadow-lg">
                                                    <CheckCircle2 size={36} />
                                                </div>
                                                <div className="space-y-2 max-w-md">
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-neon-green/10 text-emerald-800 dark:text-neon-green text-[10px] font-mono font-bold uppercase tracking-wider">
                                                        <Sparkles size={11} /> Application Received
                                                    </span>
                                                    <h3 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                                                        You're in the Selection Pool!
                                                    </h3>
                                                    <p className="text-sm text-gray-600 dark:text-zinc-400 leading-relaxed">
                                                        Your application for <span className="font-bold text-gray-900 dark:text-white">{campaign.title}</span> has been saved. Our talent team reviews profiles actively and dispatches briefs via WhatsApp & email.
                                                    </p>
                                                </div>

                                                {/* Summary Card */}
                                                <div className="w-full max-w-md p-4 rounded-2xl bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 text-left space-y-2 text-xs">
                                                    <div className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-white/5">
                                                        <span className="text-gray-500 dark:text-zinc-400">Instagram Handle</span>
                                                        <span className="font-bold text-gray-900 dark:text-white font-mono">@{form.instagram?.replace(/^@/, '') || profile?.instagram}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-white/5">
                                                        <span className="text-gray-500 dark:text-zinc-400">Audience</span>
                                                        <span className="font-bold text-emerald-600 dark:text-neon-green font-mono">
                                                            {Number(form.followers || profile?.instagramFollowers || 0).toLocaleString()} followers
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-gray-500 dark:text-zinc-400">Next Step</span>
                                                        <span className="font-medium text-gray-700 dark:text-zinc-300">Wait for shortlist notification & deliverables</span>
                                                    </div>
                                                </div>

                                                <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 w-full max-w-md">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const briefEl = document.querySelector('.campaign-briefing-content');
                                                            if (briefEl) briefEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                                        }}
                                                        className="w-full sm:flex-1 h-11 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/15 text-gray-900 dark:text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                                                    >
                                                        <FileText size={13} />
                                                        <span>Review Brief</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={onClose}
                                                        className="w-full sm:flex-1 h-11 rounded-xl bg-emerald-500 dark:bg-neon-green text-black font-black text-xs hover:brightness-105 transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                                                    >
                                                        <span>Done</span>
                                                        <Check size={13} />
                                                    </button>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            )}
                        </section>
                    </div>
                </div>
            </motion.div>


            {/* Edit Creator Details Modal */}
            {isEditCreatorModalOpen && profile && (
                <EditCreatorModal
                    isOpen={isEditCreatorModalOpen}
                    onClose={() => setIsEditCreatorModalOpen(false)}
                    creator={profile}
                    initialSection={editInitialSection}
                    onUpdated={(updated) => {
                        setProfile(prev => ({ ...(prev || {}), ...updated }));
                        const cleanHandle = updated.instagram ? String(updated.instagram).replace(/^@/, '') : (form.instagram || '');
                        const newFollowers = updated.instagramFollowers !== undefined ? String(updated.instagramFollowers) : (form.followers || '');
                        setForm(prev => ({
                            ...prev,
                            instagram: cleanHandle,
                            followers: newFollowers,
                            name: updated.name || prev.name,
                            phone: updated.phone || prev.phone,
                            city: updated.city || prev.city,
                            categories: updated.niches?.join(', ') || updated.specializations?.join(', ') || prev.categories,
                            bio: updated.bio || prev.bio
                        }));
                        const minFollowers = Number(campaign?.minInstagramFollowers || 0);
                        const count = Number(newFollowers || 0);
                        const meetsCriteria = (minFollowers <= 0) || (count >= minFollowers);
                        setVerificationStep(meetsCriteria ? 'success' : 'ineligible');
                        setInstagramVerifiedData(prev => ({
                            ...(prev || {}),
                            handle: cleanHandle,
                            name: updated.name || prev?.name || cleanHandle,
                            followers: count,
                            formattedFollowers: count.toLocaleString(),
                            profilePic: updated.profilePicture || prev?.profilePic || null,
                            meetsMinimumFollowers: meetsCriteria,
                            isRegisteredCreator: true
                        }));
                    }}
                />
            )}
        </motion.div>,
        document.body
    );
};

export default CampaignDetailModal;
