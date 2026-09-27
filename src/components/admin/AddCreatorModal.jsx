import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { 
    X, Phone, Mail, MapPin, Instagram, Youtube, Twitter, Linkedin,
    Camera, Check, Loader2, Building2, IndianRupee, Layers, 
    Banknote, Handshake, CheckCircle2, RefreshCw, 
    Pencil, AlertCircle, Sparkles, User, GraduationCap, BookOpen, 
    Shirt, Gamepad2, Compass, Heart, Dumbbell, Utensils, Smile, 
    Home, Video, Car, Palette, Music, Users, Mic, Flame, Rocket, 
    TrendingUp, ChevronRight, ChevronLeft
} from 'lucide-react';
import { useStore } from '../../lib/store';
import { cn, normalizePhoneNumber } from '../../lib/utils';
import { extractSocialUsername, hasDisallowedLink } from '../../lib/socialUtils';
import { PREDEFINED_CITIES } from '../../lib/constants';
import { requestAutoLocation } from '../../lib/location';

// 21 Rich Niche Definitions with matching icons from Creator Registration
const NICHE_OPTIONS = [
    { id: 'City Pages', label: 'City Pages / Local Hubs', icon: Building2 },
    { id: 'College Pages', label: 'College Pages / Hubs', icon: GraduationCap },
    { id: 'Student/Campus Creator', label: 'Campus & College', icon: BookOpen },
    { id: 'Fashion & Luxury', label: 'Fashion & Luxury', icon: Shirt },
    { id: 'Tech & Gaming', label: 'Tech & Gaming', icon: Gamepad2 },
    { id: 'Travel & Lifestyle', label: 'Travel & Lifestyle', icon: Compass },
    { id: 'Beauty & Fitness', label: 'Beauty & Cosmetics', icon: Heart },
    { id: 'Fitness & Sports', label: 'Fitness & Athletics', icon: Dumbbell },
    { id: 'Food & Beverage', label: 'Food & Dining', icon: Utensils },
    { id: 'Comedy & Entertainment', label: 'Comedy & Memes', icon: Smile },
    { id: 'Real Estate', label: 'Real Estate & Living', icon: Home },
    { id: 'Photography & Filmmaking', label: 'Photo & Filmmaking', icon: Video },
    { id: 'Automotive & Moto', label: 'Auto & Motovlogging', icon: Car },
    { id: 'Art & Design', label: 'Art, Design & DIY', icon: Palette },
    { id: 'Music & Dance', label: 'Music & Dance', icon: Music },
    { id: 'Parenting & Family', label: 'Parenting & Family', icon: Users },
    { id: 'Podcasts & Media', label: 'Podcasts & Media', icon: Mic },
    { id: 'Meme & Pop Culture', label: 'Meme & Pop Culture', icon: Flame },
    { id: 'Startup & Entrepreneurship', label: 'Startup & Founder', icon: Rocket },
    { id: 'Finance & Business', label: 'Finance & Career', icon: TrendingUp },
    { id: 'Others', label: 'Other Specialization', icon: Layers }
];

const POPULAR_CITIES = [
    'Bengaluru',
    'Mumbai',
    'Delhi NCR',
    'Hyderabad',
    'Pune',
    'Goa',
    'Chennai',
    'Kolkata'
];

const COUNTRY_OPTIONS = [
    { value: '+91', label: '+91 (India)' },
    { value: '+1', label: '+1 (US)' },
    { value: '+44', label: '+44 (UK)' },
    { value: '+971', label: '+971 (UAE)' },
    { value: '+61', label: '+61 (AU)' }
];

const TABS = [
    { id: 'identity', label: '1. Identity & City' },
    { id: 'niche', label: '2. Niche & Category' },
    { id: 'socials', label: '3. Instagram & Socials' },
    { id: 'rates', label: '4. Rates & Collab' },
];

const formatINR = (amt) => {
    if (!amt && amt !== 0) return '₹0';
    return `₹${Number(amt).toLocaleString('en-IN')}`;
};

const formatFollowerDisplay = (num) => {
    const val = Number(num) || 0;
    if (val >= 1000000) return (val / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (val >= 1000) return (val / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    return val.toLocaleString('en-IN');
};

const AddCreatorModal = ({ onClose, onCreated }) => {
    const { addCreator, creators, uploadToCloudinary, addToast, siteSettings } = useStore();

    const [activeTab, setActiveTab] = useState('identity');
    const [isSaving, setIsSaving] = useState(false);
    const [sendWelcomeMail, setSendWelcomeMail] = useState(false);
    const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
    const [showAllCities, setShowAllCities] = useState(false);
    const [isLocatingCity, setIsLocatingCity] = useState(false);
    const [countryCode, setCountryCode] = useState('+91');

    // Instagram Verification State
    const [isInstagramVerifying, setIsInstagramVerifying] = useState(false);
    const [instagramVerifiedData, setInstagramVerifiedData] = useState(null);
    const [instagramVerificationError, setInstagramVerificationError] = useState('');
    const [isManualFollowerEntry, setIsManualFollowerEntry] = useState(false);

    // Deliverable rates state
    const [rateMin, setRateMin] = useState(5000);
    const [rateMax, setRateMax] = useState(25000);
    const [isRateFlexible, setIsRateFlexible] = useState(false);

    const minInstagramFollowers = siteSettings?.minInstagramFollowersToJoin !== undefined 
        ? Number(siteSettings.minInstagramFollowersToJoin) 
        : 1000;

    const [form, setForm] = useState({
        name: '',
        phone: '',
        email: '',
        city: 'Bengaluru',
        customCity: '',
        categories: 'Fashion & Luxury',
        customNiche: '',
        collegeName: '',
        cityPageFocus: '',
        bio: '',
        doBarter: 'both',
        commercials: '₹5,000 – ₹25,000 / Deliverable',
        primaryPlatform: 'instagram',
        instagram: '',
        instagramFollowers: '',
        youtube: '',
        twitter: '',
        linkedin: '',
        linkedinFollowers: '',
        profilePicture: '',
        referredBy: '',
        profileStatus: 'approved'
    });

    // Close on Escape key
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose?.();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    // Prevent body scrolling while modal is open
    useEffect(() => {
        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = originalOverflow;
        };
    }, []);

    // Real-time duplicate alerts matching CreatorJoin
    const duplicateWarnings = useMemo(() => {
        if (!creators || creators.length === 0) return {};
        const warnings = {};

        if (form.email?.trim()) {
            const normEmail = form.email.trim().toLowerCase();
            const match = creators.find(c => c.email && c.email.trim().toLowerCase() === normEmail);
            if (match) {
                warnings.email = `Already registered to ${match.displayName || match.name || 'an existing creator'}.`;
            }
        }

        if (form.phone) {
            const normPhone = normalizePhoneNumber(form.phone);
            if (normPhone && normPhone.length >= 10) {
                const match = creators.find(c => normalizePhoneNumber(c.phone) === normPhone);
                if (match) {
                    warnings.phone = `Already linked to ${match.displayName || match.name || 'an existing creator'}.`;
                }
            }
        }

        if (form.instagram?.trim()) {
            const cleanInsta = form.instagram.trim().replace(/^@/, '').toLowerCase();
            if (cleanInsta.length >= 2) {
                const match = creators.find(c => c.instagram && c.instagram.trim().replace(/^@/, '').toLowerCase() === cleanInsta);
                if (match) {
                    warnings.instagram = `@${cleanInsta} is registered to ${match.displayName || match.name || 'an existing creator'}.`;
                }
            }
        }

        return warnings;
    }, [form.email, form.phone, form.instagram, creators]);

    // Auto-detect city location
    const handleAutoDetectLocation = async () => {
        setIsLocatingCity(true);
        try {
            const result = await requestAutoLocation({ onlyPrimaryHubs: false });
            if (result?.city) {
                setForm(prev => ({ ...prev, city: result.city }));
                addToast(`📍 Location auto-selected: ${result.city}`, 'success');
            }
        } catch {
            addToast('Could not access location. Please select city manually.', 'info');
        } finally {
            setIsLocatingCity(false);
        }
    };

    // Handle Instagram verification matching CreatorJoin
    const handleVerifyInstagram = useCallback(async (manualHandle = null) => {
        const raw = manualHandle !== null ? manualHandle : form.instagram;
        const cleanHandle = extractSocialUsername(raw || '', 'instagram');

        if (!cleanHandle) {
            setInstagramVerificationError('Please enter an Instagram handle (links not allowed).');
            return;
        }

        setIsInstagramVerifying(true);
        setInstagramVerificationError('');

        try {
            const isLocal = typeof window !== 'undefined' && 
                (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

            const res = await fetch(`/api/creator-join?action=verify-instagram&handle=${encodeURIComponent(cleanHandle)}`);
            const data = await res.json();

            if (!res.ok || !data.success) {
                if (isLocal) {
                    // Graceful fallback for local development
                    const mockFollowers = Math.max(minInstagramFollowers || 1000, 4850);
                    setInstagramVerifiedData({
                        handle: cleanHandle,
                        name: cleanHandle,
                        followers: mockFollowers,
                        formattedFollowers: formatFollowerDisplay(mockFollowers),
                        profilePic: null,
                        isPrivate: false,
                        isVerified: false,
                        meetsMinimumFollowers: true,
                        alreadyRegistered: false
                    });
                    setForm(prev => ({
                        ...prev,
                        instagram: cleanHandle,
                        instagramFollowers: String(mockFollowers)
                    }));
                    addToast(`Local dev: Instagram verified with ${mockFollowers.toLocaleString()} followers!`, 'info');
                    return;
                }

                if (data.requiresManualEntry) {
                    setIsManualFollowerEntry(true);
                    setInstagramVerificationError('');
                    addToast('Instagram auto-sync blocked by Meta. Please enter follower count manually.', 'info');
                    return;
                }

                const errMsg = data.error || `Could not verify @${cleanHandle}. Make sure account is public.`;
                setInstagramVerificationError(errMsg);
                setInstagramVerifiedData(null);
                return;
            }

            const count = Number(data.followers) || 0;
            const meetsCriteria = minInstagramFollowers <= 0 || count >= minInstagramFollowers;

            const verifiedPayload = {
                handle: data.handle,
                name: data.name,
                followers: count,
                formattedFollowers: data.formattedFollowers || formatFollowerDisplay(count),
                profilePic: data.profilePic || null,
                isPrivate: data.isPrivate || false,
                isVerified: data.isVerified || false,
                meetsMinimumFollowers: meetsCriteria,
                alreadyRegistered: Boolean(data.alreadyRegistered),
                registeredTo: data.registeredTo || null
            };

            setInstagramVerifiedData(verifiedPayload);
            setIsManualFollowerEntry(false);
            setForm(prev => ({
                ...prev,
                instagram: data.handle,
                instagramFollowers: String(count),
                ...(data.profilePic && !prev.profilePicture ? { profilePicture: data.profilePic } : {})
            }));

            addToast(`Instagram verified: @${data.handle} (${count.toLocaleString()} followers)!`, 'success');
        } catch (err) {
            console.warn("Instagram verification error:", err);
            const isLocal = typeof window !== 'undefined' && 
                (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
            if (isLocal) {
                const mockFollowers = Math.max(minInstagramFollowers || 1000, 3200);
                setInstagramVerifiedData({
                    handle: cleanHandle,
                    name: cleanHandle,
                    followers: mockFollowers,
                    formattedFollowers: formatFollowerDisplay(mockFollowers),
                    profilePic: null,
                    isPrivate: false,
                    isVerified: false,
                    meetsMinimumFollowers: true,
                    alreadyRegistered: false
                });
                setForm(prev => ({
                    ...prev,
                    instagram: cleanHandle,
                    instagramFollowers: String(mockFollowers)
                }));
                addToast(`Local dev: Instagram verified with ${mockFollowers.toLocaleString()} followers!`, 'info');
                return;
            }
            setIsManualFollowerEntry(true);
            setInstagramVerificationError('Could not auto-verify handle. You can enter follower count manually.');
        } finally {
            setIsInstagramVerifying(false);
        }
    }, [form.instagram, minInstagramFollowers, addToast]);

    const handleInstagramChange = (e) => {
        const val = extractSocialUsername(e.target.value, 'instagram');
        setForm(prev => ({ ...prev, instagram: val }));
        if (instagramVerifiedData && instagramVerifiedData.handle !== val.trim().toLowerCase()) {
            setInstagramVerifiedData(null);
            setInstagramVerificationError('');
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (['linkedin', 'youtube', 'twitter'].includes(name)) {
            const cleanVal = extractSocialUsername(value, name);
            setForm(prev => ({ ...prev, [name]: cleanVal }));
            return;
        }
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 10 * 1024 * 1024) {
            addToast("Image size must be under 10MB", "error");
            return;
        }
        const localPreview = URL.createObjectURL(file);
        setForm(prev => ({ ...prev, profilePicture: localPreview }));
        setIsUploadingPhoto(true);
        try {
            if (uploadToCloudinary) {
                const url = await uploadToCloudinary(file);
                if (url) {
                    setForm(prev => ({ ...prev, profilePicture: url }));
                    addToast("Profile avatar uploaded!", "success");
                }
            }
        } catch (err) {
            console.error("Cloudinary upload failed, using local preview:", err);
            addToast("Could not upload to cloud, using preview.", "info");
        } finally {
            setIsUploadingPhoto(false);
        }
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();

        if (!form.name.trim()) {
            setActiveTab('identity');
            addToast("Please enter creator full name.", "error");
            return;
        }

        if (!form.city) {
            setActiveTab('identity');
            addToast("Please select operating city.", "error");
            return;
        }

        if (form.city === 'Others' && !form.customCity?.trim()) {
            setActiveTab('identity');
            addToast("Please specify the custom city name.", "error");
            return;
        }

        if (!form.categories) {
            setActiveTab('niche');
            addToast("Please select primary creator niche.", "error");
            return;
        }

        if (form.categories === 'Others' && !form.customNiche?.trim()) {
            setActiveTab('niche');
            addToast("Please specify the custom content niche.", "error");
            return;
        }

        const showCollege = form.categories === 'Student/Campus Creator' || 
                           form.categories === 'Student Creator/ Campus Creator' || 
                           form.categories === 'College Pages';
        if (showCollege && !form.collegeName?.trim()) {
            setActiveTab('niche');
            addToast("Please specify college or university name.", "error");
            return;
        }

        for (const field of ['instagram', 'linkedin', 'youtube', 'twitter']) {
            const val = form[field]?.trim();
            if (val && hasDisallowedLink(val)) {
                setActiveTab('socials');
                addToast(`Links are not allowed. Please enter only the ${field} username/handle.`, 'error');
                return;
            }
        }

        // Validate duplicates
        if (form.phone) {
            const normPhone = normalizePhoneNumber(form.phone);
            if (normPhone && creators?.length > 0) {
                const existing = creators.find(c => normalizePhoneNumber(c.phone) === normPhone);
                if (existing) {
                    setActiveTab('identity');
                    addToast(`Phone number is already registered to ${existing.name || existing.displayName} (${existing.email || 'Existing'}).`, 'error');
                    return;
                }
            }
        }

        if (form.email?.trim()) {
            const normEmail = form.email.trim().toLowerCase();
            const existing = creators.find(c => c.email && c.email.trim().toLowerCase() === normEmail);
            if (existing) {
                setActiveTab('identity');
                addToast(`Email is already registered to ${existing.name || existing.displayName}.`, 'error');
                return;
            }
        }

        if (form.instagram?.trim()) {
            const cleanInsta = form.instagram.trim().replace(/^@/, '').toLowerCase();
            const existing = creators.find(c => c.instagram && c.instagram.trim().replace(/^@/, '').toLowerCase() === cleanInsta);
            if (existing) {
                setActiveTab('socials');
                addToast(`Instagram @${cleanInsta} is already registered to ${existing.name || existing.displayName}.`, 'error');
                return;
            }

            const isVerified = Boolean(instagramVerifiedData && instagramVerifiedData.handle === cleanInsta);
            if (!isVerified && !form.instagramFollowers?.trim() && !isManualFollowerEntry) {
                setActiveTab('socials');
                addToast("Please verify the Instagram handle or enter the follower count manually.", 'warning');
                return;
            }
        }

        if (sendWelcomeMail && !form.email?.trim()) {
            setActiveTab('rates');
            addToast("Please provide an email address to send the welcome email.", 'error');
            return;
        }

        setIsSaving(true);
        try {
            let finalCity = form.city === 'Others' ? form.customCity.trim() : form.city;
            if (/^bang[al]*o?re$/i.test(finalCity)) {
                finalCity = 'Bengaluru';
            } else if (/^(visakhapatnam|vizag)$/i.test(finalCity)) {
                finalCity = 'Vizag';
            }

            const finalNiche = form.categories === 'Others' ? form.customNiche.trim() : form.categories;
            const generatedUid = `manual_${Math.random().toString(36).substring(2, 15)}`;
            const cleanInstagram = extractSocialUsername(form.instagram, 'instagram');
            const cleanLinkedin = extractSocialUsername(form.linkedin, 'linkedin');
            const cleanYoutube = extractSocialUsername(form.youtube, 'youtube');
            const cleanTwitter = extractSocialUsername(form.twitter, 'twitter');
            const cleanPhoneDigits = form.phone ? form.phone.replace(/\D/g, '').slice(-10) : '';
            const fullPhone = cleanPhoneDigits ? `${countryCode} ${cleanPhoneDigits}` : '';

            const isInstaVerified = Boolean(
                instagramVerifiedData && 
                instagramVerifiedData.handle === cleanInstagram.toLowerCase()
            );
            const finalFollowers = String(
                Number(form.instagramFollowers || instagramVerifiedData?.followers || 0)
            );
            const manualFollowers = Boolean(isManualFollowerEntry || !isInstaVerified);

            const payload = {
                uid: generatedUid,
                name: form.name.trim(),
                displayName: form.name.trim(),
                phone: fullPhone,
                email: form.email.trim(),
                city: finalCity,
                categories: finalNiche,
                specializations: [finalNiche],
                collegeName: form.collegeName?.trim() || '',
                cityPageFocus: form.cityPageFocus?.trim() || '',
                bio: form.bio?.trim() || '',
                instagram: cleanInstagram,
                instagramFollowers: finalFollowers,
                instagramVerified: isInstaVerified,
                instagramVerifiedAt: isInstaVerified ? new Date().toISOString() : null,
                instagramProfilePic: isInstaVerified ? (instagramVerifiedData?.profilePic || null) : null,
                profilePicture: form.profilePicture || instagramVerifiedData?.profilePic || '',
                manualFollowerEntry: manualFollowers,
                requiresManualVerification: manualFollowers && form.profileStatus === 'pending',
                linkedin: cleanLinkedin,
                linkedinFollowers: form.linkedinFollowers || '0',
                youtube: cleanYoutube,
                twitter: cleanTwitter,
                website: '',
                doBarter: form.doBarter || 'both',
                commercials: isRateFlexible ? 'Flexible / Barter' : form.commercials,
                referredBy: form.referredBy?.trim() || '',
                profileStatus: form.profileStatus || 'approved',
                isVerified: form.profileStatus === 'approved',
                verifiedAt: form.profileStatus === 'approved' ? new Date().toISOString() : null,
                verifiedBy: form.profileStatus === 'approved' ? 'admin_manual_onboard' : null,
                isPhoneVerified: Boolean(fullPhone),
                phoneVerifiedAt: fullPhone ? new Date().toISOString() : null,
                addedByAdmin: true
            };

            const result = await addCreator(payload, sendWelcomeMail);
            addToast(`Creator "${form.name.trim()}" onboarded successfully!`, 'success');
            onCreated?.(result);
            onClose?.();
        } catch (err) {
            console.error("Error adding creator profile:", err);
            addToast(err.message || "Failed to add creator profile.", 'error');
        } finally {
            setIsSaving(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 md:p-8 bg-black/75 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
            {/* Backdrop click */}
            <div className="fixed inset-0 bg-black/60 dark:bg-black/80" onClick={onClose} />

            {/* Modal Dialog */}
            <motion.div 
                initial={{ scale: 0.96, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.96, opacity: 0, y: 10 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="relative bg-white dark:bg-[#0c0e14] border border-black/[0.08] dark:border-white/[0.08] rounded-3xl w-full max-w-3xl max-h-[92dvh] flex flex-col shadow-2xl z-10 overflow-hidden"
            >
                {/* ── Top Header Bar ── */}
                <div className="flex items-center justify-between px-6 sm:px-8 py-5 border-b border-black/[0.06] dark:border-white/[0.08] bg-gray-50/50 dark:bg-white/[0.02]">
                    <div className="min-w-0 pr-4">
                        <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-md bg-neon-green/10 text-emerald-600 dark:text-neon-green text-[10px] font-black uppercase tracking-wider border border-neon-green/20">
                                Admin Onboarding
                            </span>
                            <span className="text-[10px] font-mono text-gray-400 dark:text-zinc-500 uppercase tracking-widest hidden sm:inline">
                                Network Verification
                            </span>
                        </div>
                        <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-gray-900 dark:text-white mt-1 truncate">
                            Add Creator Profile
                        </h2>
                    </div>

                    <button 
                        type="button"
                        onClick={onClose}
                        className="w-9 h-9 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 flex items-center justify-center text-gray-500 hover:text-black dark:hover:text-white hover:bg-black/10 dark:hover:bg-white/10 transition-all cursor-pointer shrink-0"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* ── Section Tabs ── */}
                <div className="flex border-b border-black/[0.06] dark:border-white/[0.08] px-6 sm:px-8 shrink-0 overflow-x-auto no-scrollbar gap-2 sm:gap-4 bg-gray-50/30 dark:bg-white/[0.01]">
                    {TABS.map((tab) => {
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    "relative py-3.5 px-2.5 sm:px-3 text-[10px] sm:text-[11px] font-black uppercase tracking-widest transition-all shrink-0 cursor-pointer select-none",
                                    isActive 
                                        ? "text-gray-950 dark:text-white" 
                                        : "text-gray-400 dark:text-zinc-500 hover:text-gray-800 dark:hover:text-zinc-300"
                                )}
                            >
                                <span>{tab.label}</span>
                                {isActive && (
                                    <motion.div
                                        layoutId="add-creator-active-tab-line"
                                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-neon-green"
                                        transition={{ type: "spring", bounce: 0.2, duration: 0.35 }}
                                    />
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* ── Scrollable Body ── */}
                <form id="add-creator-form" onSubmit={handleSubmit} className="overflow-y-auto p-6 sm:p-8 space-y-6 flex-1 custom-scrollbar">
                    
                    {/* ──────── TAB 1: IDENTITY & CITY ──────── */}
                    {activeTab === 'identity' && (
                        <motion.div 
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.15 }}
                            className="space-y-6"
                        >
                            {/* Profile Picture Avatar & Cloudinary Upload */}
                            <div className="flex items-center gap-4 sm:gap-5 p-4 sm:p-5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.08]">
                                <div className="relative w-20 h-20 sm:w-22 sm:h-22 rounded-2xl bg-gray-100 dark:bg-zinc-800 border-2 border-black/[0.08] dark:border-white/[0.1] overflow-hidden flex items-center justify-center shrink-0 shadow-sm">
                                    {form.profilePicture ? (
                                        <img src={form.profilePicture} alt={form.name || "Avatar"} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-3xl font-black text-neon-green uppercase">
                                            {form.name?.charAt(0) || <User size={28} className="text-gray-400" />}
                                        </span>
                                    )}
                                    {isUploadingPhoto && (
                                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                            <Loader2 size={18} className="text-neon-green animate-spin" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-zinc-400 block mb-1.5">
                                        Creator Profile Avatar
                                    </label>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs font-bold text-gray-900 dark:text-white cursor-pointer hover:border-neon-green hover:shadow-xs transition-all active:scale-95">
                                            <Camera size={14} className="text-neon-green" />
                                            <span>{isUploadingPhoto ? "Uploading..." : "Upload Photo"}</span>
                                            <input 
                                                type="file" 
                                                accept="image/*" 
                                                className="hidden" 
                                                disabled={isUploadingPhoto}
                                                onChange={handleImageUpload} 
                                            />
                                        </label>
                                        {form.profilePicture && (
                                            <button
                                                type="button"
                                                onClick={() => setForm(p => ({ ...p, profilePicture: '' }))}
                                                className="px-3 py-2 rounded-xl text-xs font-bold text-red-500 hover:bg-red-500/10 transition-colors"
                                            >
                                                Remove
                                            </button>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-gray-400 dark:text-zinc-500 mt-1.5 font-medium">
                                        Will also auto-import from verified Instagram profile photo.
                                    </p>
                                </div>
                            </div>

                            {/* Full Name */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-zinc-400">
                                    Full Name / Display Name *
                                </label>
                                <input 
                                    type="text"
                                    name="name"
                                    value={form.name}
                                    onChange={handleChange}
                                    required
                                    placeholder="e.g. Aisha Sharma"
                                    className="w-full h-12 px-4 rounded-xl bg-gray-50 dark:bg-black/40 border border-black/[0.08] dark:border-white/[0.08] text-xs sm:text-sm font-bold text-gray-900 dark:text-white focus:border-neon-green outline-none transition-all shadow-xs"
                                />
                            </div>

                            {/* Operating City Selector with Popular Chips & Auto-Detect */}
                            <div className="space-y-2.5 p-4 sm:p-5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.08]">
                                <div className="flex items-center justify-between">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-zinc-400 flex items-center gap-1.5">
                                        <MapPin size={12} className="text-neon-green" /> Operating Hub (City) *
                                    </label>
                                    <button
                                        type="button"
                                        onClick={handleAutoDetectLocation}
                                        disabled={isLocatingCity}
                                        className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-neon-green hover:underline cursor-pointer disabled:opacity-50"
                                    >
                                        <MapPin size={10} className={isLocatingCity ? "animate-pulse" : ""} />
                                        <span>{isLocatingCity ? 'Locating...' : 'Auto-detect Location'}</span>
                                    </button>
                                </div>

                                {/* Quick City Chips */}
                                <div className="flex flex-wrap gap-1.5">
                                    {(showAllCities 
                                        ? PREDEFINED_CITIES.filter(c => c !== 'Others') 
                                        : POPULAR_CITIES
                                    ).map(city => {
                                        const isSelected = form.city === city;
                                        return (
                                            <button
                                                key={city}
                                                type="button"
                                                onClick={() => setForm(p => ({ ...p, city }))}
                                                className={cn(
                                                    "px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all border cursor-pointer",
                                                    isSelected
                                                        ? "bg-neon-green text-black border-neon-green font-black shadow-xs"
                                                        : "bg-white dark:bg-white/[0.04] text-gray-800 dark:text-white/60 border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20"
                                                )}
                                            >
                                                {city}
                                            </button>
                                        );
                                    })}

                                    <button
                                        type="button"
                                        onClick={() => setForm(p => ({ ...p, city: 'Others' }))}
                                        className={cn(
                                            "px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all border cursor-pointer",
                                            form.city === 'Others'
                                                ? "bg-neon-green text-black border-neon-green font-black shadow-xs"
                                                : "bg-white dark:bg-white/[0.04] text-gray-800 dark:text-white/60 border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20"
                                        )}
                                    >
                                        Other City...
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setShowAllCities(!showAllCities)}
                                        className="px-2.5 py-1.5 rounded-xl text-[10px] font-bold text-pink-500 bg-pink-500/10 border border-pink-500/20 hover:bg-pink-500/20 transition-all cursor-pointer"
                                    >
                                        {showAllCities ? 'Show Less' : '+ More Cities'}
                                    </button>
                                </div>

                                {form.city === 'Others' && (
                                    <div className="pt-1">
                                        <input 
                                            type="text"
                                            name="customCity"
                                            value={form.customCity}
                                            onChange={handleChange}
                                            placeholder="Enter exact city name (e.g. Chandigarh, Bhopal, Surat)"
                                            className="w-full h-11 px-4 rounded-xl bg-white dark:bg-black/50 border border-black/[0.1] dark:border-white/[0.1] text-xs font-bold text-gray-900 dark:text-white focus:border-neon-green outline-none transition-all shadow-xs"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Contact Details: Email & Phone with Country Code */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-zinc-400 flex items-center gap-1.5">
                                        <Mail size={12} className="text-neon-green" /> Email Address
                                    </label>
                                    <input 
                                        type="email"
                                        name="email"
                                        value={form.email}
                                        onChange={handleChange}
                                        placeholder="creator@domain.com"
                                        className="w-full h-12 px-4 rounded-xl bg-gray-50 dark:bg-black/40 border border-black/[0.08] dark:border-white/[0.08] text-xs font-bold text-gray-900 dark:text-white focus:border-neon-green outline-none transition-all shadow-xs"
                                    />
                                    {duplicateWarnings.email && (
                                        <p className="text-[10px] font-bold text-amber-500 flex items-center gap-1 pt-0.5">
                                            <AlertCircle size={10} /> {duplicateWarnings.email}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-zinc-400 flex items-center gap-1.5">
                                        <Phone size={12} className="text-neon-green" /> WhatsApp / Phone Number
                                    </label>
                                    <div className="flex gap-2">
                                        <select
                                            value={countryCode}
                                            onChange={(e) => setCountryCode(e.target.value)}
                                            className="h-12 px-3 rounded-xl bg-gray-50 dark:bg-black/40 border border-black/[0.08] dark:border-white/[0.08] text-xs font-bold text-gray-900 dark:text-white focus:border-neon-green outline-none transition-all cursor-pointer shrink-0"
                                        >
                                            {COUNTRY_OPTIONS.map(opt => (
                                                <option key={opt.value} value={opt.value} className="bg-white dark:bg-zinc-900 text-gray-900 dark:text-white">
                                                    {opt.value}
                                                </option>
                                            ))}
                                        </select>
                                        <input 
                                            type="tel"
                                            name="phone"
                                            value={form.phone}
                                            onChange={handleChange}
                                            placeholder="98765 43210"
                                            className="flex-1 h-12 px-4 rounded-xl bg-gray-50 dark:bg-black/40 border border-black/[0.08] dark:border-white/[0.08] text-xs font-bold text-gray-900 dark:text-white focus:border-neon-green outline-none transition-all shadow-xs"
                                        />
                                    </div>
                                    {duplicateWarnings.phone && (
                                        <p className="text-[10px] font-bold text-amber-500 flex items-center gap-1 pt-0.5">
                                            <AlertCircle size={10} /> {duplicateWarnings.phone}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* ──────── TAB 2: NICHE & CATEGORY ──────── */}
                    {activeTab === 'niche' && (
                        <motion.div 
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.15 }}
                            className="space-y-6"
                        >
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-zinc-400">
                                        Primary Content Niche *
                                    </label>
                                    <span className="text-[10px] font-mono text-gray-400 dark:text-zinc-500">
                                        Matched for brand campaigns
                                    </span>
                                </div>

                                {/* Visual Niche Selector Cards */}
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-2.5 max-h-72 overflow-y-auto p-1 custom-scrollbar">
                                    {NICHE_OPTIONS.map(niche => {
                                        const isSelected = form.categories === niche.id;
                                        const IconComp = niche.icon;
                                        return (
                                            <button
                                                key={niche.id}
                                                type="button"
                                                onClick={() => setForm(p => ({ ...p, categories: niche.id }))}
                                                className={cn(
                                                    "p-3 rounded-2xl text-left border transition-all flex flex-col justify-between gap-2.5 cursor-pointer active:scale-95 group",
                                                    isSelected
                                                        ? "bg-neon-pink/15 dark:bg-neon-pink/20 border-neon-pink shadow-md ring-1 ring-neon-pink text-gray-900 dark:text-white"
                                                        : "bg-white dark:bg-white/[0.02] border-black/[0.08] dark:border-white/[0.08] hover:border-black/20 dark:hover:border-white/20 text-gray-700 dark:text-zinc-300"
                                                )}
                                            >
                                                <div className={cn(
                                                    "w-7 h-7 rounded-xl flex items-center justify-center transition-colors",
                                                    isSelected 
                                                        ? "bg-neon-pink text-black" 
                                                        : "bg-black/5 dark:bg-white/5 text-gray-600 dark:text-zinc-400 group-hover:text-black dark:group-hover:text-white"
                                                )}>
                                                    <IconComp size={15} />
                                                </div>
                                                <p className={cn(
                                                    "text-[11px] font-bold leading-tight",
                                                    isSelected ? "text-neon-pink font-black" : "text-gray-900 dark:text-white"
                                                )}>
                                                    {niche.label}
                                                </p>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Conditional Contextual Fields */}
                            {form.categories === 'Others' && (
                                <div className="space-y-1.5 p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.08]">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-zinc-400">
                                        Specify Custom Niche *
                                    </label>
                                    <input 
                                        type="text"
                                        name="customNiche"
                                        value={form.customNiche}
                                        onChange={handleChange}
                                        placeholder="e.g. Sustainable Fashion, Sneakerhead, AI Tools, DIY Crafts"
                                        className="w-full h-11 px-4 rounded-xl bg-white dark:bg-black/40 border border-black/[0.08] dark:border-white/[0.08] text-xs font-bold text-gray-900 dark:text-white focus:border-neon-green outline-none transition-all shadow-xs"
                                    />
                                </div>
                            )}

                            {form.categories === 'City Pages' && (
                                <div className="space-y-1.5 p-4 rounded-2xl bg-sky-500/[0.04] border border-sky-500/20">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-sky-600 dark:text-sky-400 flex items-center gap-1.5">
                                        <Building2 size={13} /> Locality / City Page Focus
                                    </label>
                                    <input 
                                        type="text"
                                        name="cityPageFocus"
                                        value={form.cityPageFocus}
                                        onChange={handleChange}
                                        placeholder="e.g. Bangalore Nightlife, South Delhi Food, Koramangala Buzz"
                                        className="w-full h-11 px-4 rounded-xl bg-white dark:bg-black/40 border border-black/[0.08] dark:border-white/[0.08] text-xs font-bold text-gray-900 dark:text-white focus:border-sky-500 outline-none transition-all shadow-xs"
                                    />
                                </div>
                            )}

                            {(form.categories === 'Student/Campus Creator' || form.categories === 'College Pages') && (
                                <div className="space-y-1.5 p-4 rounded-2xl bg-teal-500/[0.04] border border-teal-500/20">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-teal-600 dark:text-teal-400 flex items-center gap-1.5">
                                        <GraduationCap size={13} /> College / University Name *
                                    </label>
                                    <input 
                                        type="text"
                                        name="collegeName"
                                        value={form.collegeName}
                                        onChange={handleChange}
                                        placeholder="e.g. Christ University, IIT Bombay, St. Xavier's"
                                        className="w-full h-11 px-4 rounded-xl bg-white dark:bg-black/40 border border-black/[0.08] dark:border-white/[0.08] text-xs font-bold text-gray-900 dark:text-white focus:border-teal-500 outline-none transition-all shadow-xs"
                                    />
                                    <p className="text-[9px] font-medium text-teal-600/80 dark:text-teal-400/80">
                                        Enables participation in campus buzz programs, fest passes, and regional student briefs.
                                    </p>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* ──────── TAB 3: INSTAGRAM & SOCIAL CHANNELS ──────── */}
                    {activeTab === 'socials' && (
                        <motion.div 
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.15 }}
                            className="space-y-6"
                        >
                            {/* Instagram Profile & Auto-Verification Panel */}
                            <div className="p-4 sm:p-5 rounded-3xl bg-pink-500/[0.03] border border-pink-500/20 space-y-4 shadow-xs">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div>
                                        <label className="text-xs font-black uppercase tracking-widest text-gray-900 dark:text-white flex items-center gap-1.5">
                                            <Instagram size={14} className="text-pink-500" /> Instagram Handle & Auto-Sync
                                        </label>
                                        <p className="text-[10px] text-gray-500 dark:text-zinc-400 font-mono mt-0.5">
                                            Auto-fetches live follower count, verified badge & HD avatar.
                                        </p>
                                    </div>

                                    {/* Manual Follower Toggle */}
                                    <button
                                        type="button"
                                        onClick={() => setIsManualFollowerEntry(!isManualFollowerEntry)}
                                        className="inline-flex items-center gap-1 text-[10px] font-bold text-pink-600 dark:text-pink-400 hover:underline uppercase tracking-wider cursor-pointer"
                                    >
                                        <Pencil size={11} />
                                        <span>{isManualFollowerEntry ? "Switch to Auto-Verify" : "Manual Follower Count"}</span>
                                    </button>
                                </div>

                                {/* Handle Input & Integrated Action */}
                                <div className="relative flex items-center">
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
                                                handleVerifyInstagram();
                                            }
                                        }}
                                        placeholder="instagram_handle"
                                        autoCapitalize="none"
                                        autoCorrect="off"
                                        spellCheck="false"
                                        className={cn(
                                            "w-full h-12 pl-8 pr-28 rounded-xl bg-white dark:bg-black/50 border text-xs sm:text-sm font-bold text-gray-900 dark:text-white outline-none transition-all shadow-xs",
                                            instagramVerifiedData && instagramVerifiedData.handle === form.instagram?.trim().replace(/^@/, '').toLowerCase()
                                                ? "border-emerald-500/40 focus:border-emerald-500"
                                                : instagramVerificationError
                                                ? "border-red-500/40 focus:border-red-500"
                                                : "border-black/10 dark:border-white/10 focus:border-pink-500"
                                        )}
                                    />

                                    {/* Clear Button */}
                                    {form.instagram && !isInstagramVerifying && !instagramVerifiedData && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setForm(p => ({ ...p, instagram: '', instagramFollowers: '' }));
                                                setInstagramVerifiedData(null);
                                                setInstagramVerificationError('');
                                            }}
                                            className="absolute right-24 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-black/5 dark:bg-white/5 hover:bg-black/10 text-gray-500 flex items-center justify-center transition-colors"
                                        >
                                            <X size={11} />
                                        </button>
                                    )}

                                    {/* Auto-Verify CTA */}
                                    <button
                                        type="button"
                                        onClick={() => handleVerifyInstagram()}
                                        disabled={isInstagramVerifying || !form.instagram?.trim()}
                                        className={cn(
                                            "absolute right-1.5 top-1/2 -translate-y-1/2 h-9 px-3.5 rounded-lg font-black text-[10px] sm:text-[11px] uppercase tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer",
                                            instagramVerifiedData && instagramVerifiedData.handle === form.instagram?.trim().replace(/^@/, '').toLowerCase()
                                                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                                                : "bg-pink-600 hover:bg-pink-500 text-white shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
                                        )}
                                    >
                                        {isInstagramVerifying ? (
                                            <Loader2 size={13} className="animate-spin" />
                                        ) : instagramVerifiedData && instagramVerifiedData.handle === form.instagram?.trim().replace(/^@/, '').toLowerCase() ? (
                                            <>
                                                <Check size={12} className="stroke-[3]" />
                                                <span>Verified</span>
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles size={11} />
                                                <span>Verify</span>
                                            </>
                                        )}
                                    </button>
                                </div>

                                {duplicateWarnings.instagram && (
                                    <p className="text-[10px] font-bold text-amber-500 flex items-center gap-1">
                                        <AlertCircle size={11} /> {duplicateWarnings.instagram}
                                    </p>
                                )}

                                {/* Progress Indicator */}
                                {isInstagramVerifying && (
                                    <div className="p-3 bg-pink-500/10 border border-pink-500/20 rounded-xl flex items-center gap-2.5 text-xs text-pink-600 dark:text-pink-400">
                                        <Loader2 size={14} className="animate-spin text-pink-500" />
                                        <span className="font-bold">
                                            Connecting to Instagram & fetching follower count for @{form.instagram?.replace(/^@/, '')}...
                                        </span>
                                    </div>
                                )}

                                {/* Error Notice */}
                                {instagramVerificationError && !isInstagramVerifying && !isManualFollowerEntry && (
                                    <div className="p-3 bg-red-500/[0.08] border border-red-500/25 rounded-xl space-y-2">
                                        <div className="flex items-start gap-2">
                                            <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
                                            <div className="flex-1 text-xs text-red-600 dark:text-red-300 font-semibold">
                                                {instagramVerificationError}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 pt-1 border-t border-red-500/15">
                                            <button
                                                type="button"
                                                onClick={() => setIsManualFollowerEntry(true)}
                                                className="px-2.5 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 font-bold text-[10px] uppercase tracking-wider transition-all cursor-pointer"
                                            >
                                                Enter Manually
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleVerifyInstagram()}
                                                className="px-2.5 py-1 rounded-lg bg-red-500/15 hover:bg-red-500/25 text-red-600 dark:text-red-400 font-bold text-[10px] uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer"
                                            >
                                                <RefreshCw size={10} />
                                                <span>Retry</span>
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Verified Account Card Display */}
                                {instagramVerifiedData && instagramVerifiedData.handle === form.instagram?.trim().replace(/^@/, '').toLowerCase() && !isManualFollowerEntry && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.98 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="p-3.5 rounded-2xl bg-emerald-500/[0.05] dark:bg-emerald-500/[0.04] border border-emerald-500/30 flex items-center justify-between gap-3 shadow-xs"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-11 h-11 rounded-full bg-black/10 dark:bg-white/10 border border-emerald-500/30 overflow-hidden flex items-center justify-center shrink-0">
                                                {instagramVerifiedData.profilePic ? (
                                                    <img 
                                                        src={instagramVerifiedData.profilePic} 
                                                        alt={instagramVerifiedData.handle} 
                                                        className="w-full h-full object-cover" 
                                                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                                    />
                                                ) : (
                                                    <Instagram size={18} className="text-pink-500" />
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white truncate">
                                                        @{instagramVerifiedData.handle}
                                                    </span>
                                                    {instagramVerifiedData.isVerified && (
                                                        <span className="w-3.5 h-3.5 rounded-full bg-sky-500 text-white flex items-center justify-center text-[8px]" title="Meta Verified">
                                                            ✓
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-[11px] font-mono font-bold text-emerald-600 dark:text-neon-green mt-0.5">
                                                    {Number(instagramVerifiedData.followers).toLocaleString()} followers
                                                    <span className="text-gray-400 font-normal ml-1">({formatFollowerDisplay(instagramVerifiedData.followers)})</span>
                                                </p>
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => setIsManualFollowerEntry(true)}
                                            className="px-2.5 py-1 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-black/10 text-gray-600 dark:text-gray-300 font-bold text-[10px] uppercase tracking-wider shrink-0 transition-colors"
                                        >
                                            Edit Count
                                        </button>
                                    </motion.div>
                                )}

                                {/* Manual Follower Count Input */}
                                {isManualFollowerEntry && (
                                    <div className="space-y-1.5 pt-1">
                                        <div className="flex items-center justify-between">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-700 dark:text-gray-300 flex items-center gap-1">
                                                <Users size={12} className="text-pink-500" /> Exact Instagram Followers
                                            </label>
                                            <button
                                                type="button"
                                                onClick={() => handleVerifyInstagram()}
                                                className="text-[10px] font-bold text-pink-600 dark:text-pink-400 hover:underline uppercase tracking-wider"
                                            >
                                                Retry Auto-Verify
                                            </button>
                                        </div>
                                        <div className="relative">
                                            <Users size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input 
                                                type="number"
                                                name="instagramFollowers"
                                                value={form.instagramFollowers}
                                                onChange={handleChange}
                                                placeholder="e.g. 15000"
                                                className="w-full h-11 pl-9 pr-4 rounded-xl bg-white dark:bg-black/50 border border-black/10 dark:border-white/10 text-xs font-bold text-gray-900 dark:text-white focus:border-pink-500 outline-none transition-all shadow-xs font-mono"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Additional Social Channels */}
                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-zinc-400 block">
                                    Additional Channels (Optional)
                                </label>

                                {/* LinkedIn */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-blue-500/[0.02] border border-blue-500/15">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 flex items-center gap-1">
                                            <Linkedin size={11} /> LinkedIn Handle
                                        </label>
                                        <input 
                                            type="text"
                                            name="linkedin"
                                            value={form.linkedin}
                                            onChange={handleChange}
                                            placeholder="in/username"
                                            className="w-full h-11 px-3.5 rounded-xl bg-white dark:bg-black/40 border border-black/[0.08] dark:border-white/[0.08] text-xs font-bold text-gray-900 dark:text-white focus:border-blue-500 outline-none transition-all"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-zinc-400">
                                            Connections / Followers
                                        </label>
                                        <input 
                                            type="number"
                                            name="linkedinFollowers"
                                            value={form.linkedinFollowers}
                                            onChange={handleChange}
                                            placeholder="e.g. 500"
                                            className="w-full h-11 px-3.5 rounded-xl bg-white dark:bg-black/40 border border-black/[0.08] dark:border-white/[0.08] text-xs font-bold text-gray-900 dark:text-white focus:border-blue-500 outline-none transition-all font-mono"
                                        />
                                    </div>
                                </div>

                                {/* YouTube & Twitter / X */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="space-y-1 p-3.5 rounded-2xl bg-red-500/[0.02] border border-red-500/15">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-red-600 dark:text-red-400 flex items-center gap-1">
                                            <Youtube size={12} /> YouTube Channel Handle
                                        </label>
                                        <input 
                                            type="text"
                                            name="youtube"
                                            value={form.youtube}
                                            onChange={handleChange}
                                            placeholder="@channelhandle"
                                            className="w-full h-11 px-3.5 rounded-xl bg-white dark:bg-black/40 border border-black/[0.08] dark:border-white/[0.08] text-xs font-bold text-gray-900 dark:text-white focus:border-red-500 outline-none transition-all"
                                        />
                                    </div>

                                    <div className="space-y-1 p-3.5 rounded-2xl bg-sky-500/[0.02] border border-sky-500/15">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-sky-600 dark:text-sky-400 flex items-center gap-1">
                                            <Twitter size={12} /> X / Twitter Username
                                        </label>
                                        <input 
                                            type="text"
                                            name="twitter"
                                            value={form.twitter}
                                            onChange={handleChange}
                                            placeholder="@username"
                                            className="w-full h-11 px-3.5 rounded-xl bg-white dark:bg-black/40 border border-black/[0.08] dark:border-white/[0.08] text-xs font-bold text-gray-900 dark:text-white focus:border-sky-500 outline-none transition-all"
                                        />
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* ──────── TAB 4: RATES & COLLAB PREFERENCES ──────── */}
                    {activeTab === 'rates' && (
                        <motion.div 
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.15 }}
                            className="space-y-6"
                        >
                            {/* Collaboration Style Preferences */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-zinc-400">
                                    Collaboration Preferences
                                </label>
                                <div className="grid grid-cols-3 gap-2.5">
                                    {[
                                        { id: 'both', label: 'Open to Both', icon: Layers },
                                        { id: 'paid', label: 'Paid Only', icon: Banknote },
                                        { id: 'barter', label: 'Barter & Gigs', icon: Handshake }
                                    ].map(opt => {
                                        const isSelected = form.doBarter === opt.id;
                                        const IconComp = opt.icon;
                                        return (
                                            <button
                                                key={opt.id}
                                                type="button"
                                                onClick={() => setForm(p => ({ ...p, doBarter: opt.id }))}
                                                className={cn(
                                                    "p-3 rounded-2xl border transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer active:scale-95",
                                                    isSelected
                                                        ? "bg-neon-green text-black border-neon-green font-black shadow-sm"
                                                        : "bg-white dark:bg-white/[0.02] text-gray-800 dark:text-white/60 border-black/[0.06] dark:border-white/[0.08] hover:border-black/20"
                                                )}
                                            >
                                                <div className={cn(
                                                    "w-7 h-7 rounded-xl flex items-center justify-center transition-colors",
                                                    isSelected ? "bg-black text-neon-green" : "bg-black/5 dark:bg-white/5 text-gray-500 dark:text-zinc-400"
                                                )}>
                                                    <IconComp size={14} />
                                                </div>
                                                <span className="text-[11px] font-bold">{opt.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Typical Deliverable Rates with Presets & Range Sliders */}
                            <div className="space-y-3.5 p-4 sm:p-5 bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.08] rounded-2xl">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-zinc-400 block">
                                            Typical Rates per Deliverable
                                        </label>
                                        <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-0.5">
                                            Commercial quote bracket for briefs and deliverables
                                        </p>
                                    </div>
                                    <span className="text-xs sm:text-sm font-black font-mono text-neon-green bg-black px-3 py-1.5 rounded-xl border border-neon-green/30 shadow-[0_0_15px_rgba(57,255,20,0.15)] inline-flex items-center gap-1.5 shrink-0">
                                        <IndianRupee size={13} className="text-neon-green" />
                                        {isRateFlexible ? "Flexible / Barter" : `${formatINR(rateMin)} – ${formatINR(rateMax)}${rateMax >= 100000 ? '+' : ''}`}
                                    </span>
                                </div>

                                {/* Quick Presets */}
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                    {[
                                        { label: 'Flexible / Barter', min: 0, max: 0, flex: true },
                                        { label: '₹2K – ₹8K', min: 2000, max: 8000 },
                                        { label: '₹8K – ₹20K', min: 8000, max: 20000 },
                                        { label: '₹20K – ₹50K', min: 20000, max: 50000 },
                                        { label: '₹50K – ₹1L+', min: 50000, max: 100000 }
                                    ].map(preset => {
                                        const isSelected = preset.flex ? isRateFlexible : (!isRateFlexible && rateMin === preset.min && rateMax === preset.max);
                                        return (
                                            <button
                                                key={preset.label}
                                                type="button"
                                                onClick={() => {
                                                    if (preset.flex) {
                                                        setIsRateFlexible(true);
                                                        setForm(p => ({ ...p, commercials: 'Flexible / Barter' }));
                                                    } else {
                                                        setIsRateFlexible(false);
                                                        setRateMin(preset.min);
                                                        setRateMax(preset.max);
                                                        setForm(p => ({ ...p, commercials: `${formatINR(preset.min)} – ${formatINR(preset.max)}${preset.max >= 100000 ? '+' : ''} / Deliverable` }));
                                                    }
                                                }}
                                                className={cn(
                                                    "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border cursor-pointer",
                                                    isSelected
                                                        ? "bg-neon-green text-black border-neon-green shadow-xs"
                                                        : "bg-white dark:bg-zinc-900 text-gray-700 dark:text-zinc-300 border-black/10 dark:border-white/10 hover:border-black/20"
                                                )}
                                            >
                                                {preset.label}
                                            </button>
                                        );
                                    })}
                                </div>

                                {!isRateFlexible && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                                        <div className="space-y-1">
                                            <div className="flex justify-between text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                                                <span>Min Rate</span>
                                                <span className="font-mono text-gray-900 dark:text-white font-black">{formatINR(rateMin)}</span>
                                            </div>
                                            <input 
                                                type="range"
                                                min="1000"
                                                max="60000"
                                                step="1000"
                                                value={rateMin}
                                                onChange={(e) => {
                                                    const val = Number(e.target.value);
                                                    const newMin = Math.min(val, rateMax - 1000);
                                                    setRateMin(newMin);
                                                    setForm(p => ({ ...p, commercials: `${formatINR(newMin)} – ${formatINR(rateMax)}${rateMax >= 100000 ? '+' : ''} / Deliverable` }));
                                                }}
                                                className="w-full accent-neon-green cursor-pointer h-2 bg-black/10 dark:bg-white/10 rounded-lg appearance-none"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex justify-between text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                                                <span>Max Rate</span>
                                                <span className="font-mono text-gray-900 dark:text-white font-black">{formatINR(rateMax)}{rateMax >= 100000 ? '+' : ''}</span>
                                            </div>
                                            <input 
                                                type="range"
                                                min="2000"
                                                max="100000"
                                                step="2000"
                                                value={rateMax}
                                                onChange={(e) => {
                                                    const val = Number(e.target.value);
                                                    const newMax = Math.max(val, rateMin + 1000);
                                                    setRateMax(newMax);
                                                    setForm(p => ({ ...p, commercials: `${formatINR(rateMin)} – ${formatINR(newMax)}${rateMax >= 100000 ? '+' : ''} / Deliverable` }));
                                                }}
                                                className="w-full accent-neon-green cursor-pointer h-2 bg-black/10 dark:bg-white/10 rounded-lg appearance-none"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Strategic Bio */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-zinc-400">
                                    Creator Bio & Creative Pitch
                                </label>
                                <textarea 
                                    name="bio"
                                    value={form.bio}
                                    onChange={handleChange}
                                    rows={2}
                                    placeholder="e.g. Bangalore lifestyle creator focusing on nightlife, dining experiences and aesthetic reels."
                                    className="w-full p-3.5 rounded-xl bg-gray-50 dark:bg-black/40 border border-black/[0.08] dark:border-white/[0.08] text-xs font-bold text-gray-900 dark:text-white focus:border-neon-green outline-none transition-all resize-none shadow-xs"
                                />
                            </div>

                            {/* Referral & Profile Status Controls */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-zinc-400">
                                        Referred By (Optional)
                                    </label>
                                    <input 
                                        type="text"
                                        name="referredBy"
                                        value={form.referredBy}
                                        onChange={handleChange}
                                        placeholder="Creator ID, code, or @handle"
                                        className="w-full h-11 px-4 rounded-xl bg-gray-50 dark:bg-black/40 border border-black/[0.08] dark:border-white/[0.08] text-xs font-bold text-gray-900 dark:text-white focus:border-neon-green outline-none transition-all shadow-xs"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-zinc-400">
                                        Initial Profile Status
                                    </label>
                                    <select
                                        name="profileStatus"
                                        value={form.profileStatus}
                                        onChange={handleChange}
                                        className="w-full h-11 px-3.5 rounded-xl bg-gray-50 dark:bg-black/40 border border-black/[0.08] dark:border-white/[0.08] text-xs font-bold text-gray-900 dark:text-white focus:border-neon-green outline-none transition-all cursor-pointer"
                                    >
                                        <option value="approved" className="bg-white dark:bg-zinc-900 text-gray-900 dark:text-white">
                                            Verified & Approved
                                        </option>
                                        <option value="pending" className="bg-white dark:bg-zinc-900 text-gray-900 dark:text-white">
                                            Pending Review
                                        </option>
                                    </select>
                                </div>
                            </div>

                            {/* Send Welcome Email Checkbox */}
                            <div className="flex items-center gap-3 p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.08]">
                                <input 
                                    type="checkbox"
                                    id="add-creator-welcome-email"
                                    checked={sendWelcomeMail}
                                    onChange={(e) => setSendWelcomeMail(e.target.checked)}
                                    disabled={!form.email?.trim()}
                                    className="w-5 h-5 rounded border-black/15 text-neon-green focus:ring-0 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                                />
                                <label 
                                    htmlFor="add-creator-welcome-email" 
                                    className={cn(
                                        "text-xs font-bold uppercase tracking-wider cursor-pointer",
                                        !form.email?.trim() ? "text-gray-400" : "text-gray-800 dark:text-zinc-200"
                                    )}
                                >
                                    Send Onboarding Welcome Email {!form.email?.trim() && "(Requires Email Address)"}
                                </label>
                            </div>
                        </motion.div>
                    )}
                </form>

                {/* ── Modal Footer Controls ── */}
                <div className="flex items-center justify-between px-6 sm:px-8 py-4 border-t border-black/[0.06] dark:border-white/[0.08] bg-gray-50/50 dark:bg-white/[0.02] shrink-0">
                    <div className="flex items-center gap-2">
                        {activeTab !== 'identity' && (
                            <button
                                type="button"
                                onClick={() => {
                                    const currentIndex = TABS.findIndex(t => t.id === activeTab);
                                    if (currentIndex > 0) setActiveTab(TABS[currentIndex - 1].id);
                                }}
                                className="px-3.5 py-2.5 rounded-xl border border-black/10 dark:border-white/10 text-xs font-bold text-gray-700 dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/5 transition-all flex items-center gap-1 cursor-pointer"
                            >
                                <ChevronLeft size={14} />
                                <span className="hidden sm:inline">Previous</span>
                            </button>
                        )}
                        {activeTab !== 'rates' && (
                            <button
                                type="button"
                                onClick={() => {
                                    const currentIndex = TABS.findIndex(t => t.id === activeTab);
                                    if (currentIndex < TABS.length - 1) setActiveTab(TABS[currentIndex + 1].id);
                                }}
                                className="px-3.5 py-2.5 rounded-xl bg-black/5 dark:bg-white/10 text-xs font-bold text-gray-900 dark:text-white hover:bg-black/10 transition-all flex items-center gap-1 cursor-pointer"
                            >
                                <span>Next</span>
                                <ChevronRight size={14} />
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2.5 rounded-xl text-xs font-bold text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={isSaving}
                            className="px-5 sm:px-6 py-2.5 rounded-xl bg-neon-green text-black font-extrabold text-xs uppercase tracking-wider hover:bg-emerald-400 active:scale-95 transition-all shadow-[0_0_20px_rgba(57,255,20,0.25)] flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 size={14} className="animate-spin" />
                                    <span>Saving...</span>
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 size={14} />
                                    <span>Add Creator Profile</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>,
        document.body
    );
};

export default AddCreatorModal;
