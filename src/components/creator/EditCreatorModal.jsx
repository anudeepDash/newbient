import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    X, Phone, Instagram, Youtube, Twitter, Linkedin, Users,
    Camera, Check, Loader2, Building, 
    Building2, IndianRupee, Layers, Banknote, Handshake, ShieldCheck, 
    Clock, CheckCircle2, Save, RefreshCw
} from 'lucide-react';
import { useStore } from '../../lib/store';
import { cn, normalizePhoneNumber } from '../../lib/utils';
import { extractSocialUsername, hasDisallowedLink } from '../../lib/socialUtils';
import { PREDEFINED_CITIES, CREATOR_NICHE_OPTIONS } from '../../lib/constants';
import StudioSelect from '../ui/StudioSelect';
import { auth } from '../../lib/firebase';
import { RecaptchaVerifier, PhoneAuthProvider, linkWithCredential } from 'firebase/auth';

const formatINR = (amt) => {
    if (!amt && amt !== 0) return '₹0';
    return `₹${amt.toLocaleString('en-IN')}`;
};

const parseRates = (str) => {
    if (!str || str.toLowerCase().includes('flexible') || str.toLowerCase().includes('barter')) {
        return { isFlexible: true, min: 5000, max: 25000 };
    }
    const numbers = str.match(/\d[\d,]*/g);
    if (numbers && numbers.length >= 2) {
        const min = parseInt(numbers[0].replace(/,/g, ''), 10) || 5000;
        const max = parseInt(numbers[1].replace(/,/g, ''), 10) || 25000;
        return { isFlexible: false, min, max };
    }
    return { isFlexible: false, min: 5000, max: 25000 };
};

// Clean, text-only tabs matching the Creator Portal design
const SECTIONS = [
    { id: 'identity', label: 'Identity & Contact' },
    { id: 'niche', label: 'Niche & Focus' },
    { id: 'socials', label: 'Social Channels' },
    { id: 'rates', label: 'Rates & Bio' },
];

const EditCreatorModal = ({ isOpen, onClose, profile: profileProp, creator, onUpdated, initialSection = 'identity' }) => {
    const profile = profileProp || creator;
    const { updateCreator, creators, user, addToast, addNotification } = useStore();

    const [activeSection, setActiveSection] = useState(initialSection);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

    // Initial values resolution
    const rawSpecialization = (profile?.specializations || [profile?.categories] || [])[0] || '';
    const initialSpecialization = (rawSpecialization === 'Student Creator/ Campus Creator' || rawSpecialization === 'Student/ Campus Creator') 
        ? 'Student/Campus Creator' 
        : rawSpecialization;
    const isPredefinedNiche = CREATOR_NICHE_OPTIONS.some(n => n.id === initialSpecialization);
    const normalizedProfileCity = (/^bang[al]*o?re$/i.test((profile?.city || '').trim())) ? 'Bengaluru' : (profile?.city || '');
    const isPredefinedCity = PREDEFINED_CITIES.includes(normalizedProfileCity);

    const initialBarter = (profile?.doBarter === 'paid' || profile?.doBarter === 'No')
        ? 'paid'
        : (profile?.doBarter === 'barter' || profile?.doBarter === 'Yes')
            ? 'barter'
            : 'both';

    const initialRates = parseRates(profile?.commercials);
    const [rateMin, setRateMin] = useState(initialRates.min);
    const [rateMax, setRateMax] = useState(initialRates.max);
    const [isRateFlexible, setIsRateFlexible] = useState(initialRates.isFlexible);

    const [form, setForm] = useState({
        name: profile?.name || profile?.displayName || user?.displayName || '',
        phone: profile?.phone || user?.phoneNumber || '',
        email: profile?.email || user?.email || '',
        city: isPredefinedCity ? normalizedProfileCity : (normalizedProfileCity ? 'Others' : ''),
        customCity: isPredefinedCity ? '' : normalizedProfileCity,
        categories: isPredefinedNiche ? initialSpecialization : (initialSpecialization ? 'Others' : ''),
        customNiche: isPredefinedNiche ? '' : initialSpecialization,
        cityPageFocus: profile?.cityPageFocus || '',
        collegeName: profile?.collegeName || '',
        instagram: profile?.instagram || '',
        instagramFollowers: profile?.instagramFollowers || '',
        youtube: profile?.youtube || '',
        twitter: profile?.twitter || '',
        linkedin: profile?.linkedin || '',
        bio: profile?.bio || '',
        doBarter: initialBarter,
        commercials: profile?.commercials || '₹5,000 – ₹25,000 / Deliverable',
        profilePicture: profile?.profilePicture || profile?.instagramProfilePic || profile?.profilePic || profile?.photoURL || ''
    });

    // OTP & Verification State
    const [otpValues, setOtpValues] = useState(['', '', '', '', '', '']);
    const [isSendingOtp, setIsSendingOtp] = useState(false);
    const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
    const [otpSent, setOtpSent] = useState(false);
    const [isPhoneVerified, setIsPhoneVerified] = useState(profile?.isPhoneVerified || false);
    const [confirmationResult, setConfirmationResult] = useState(null);
    const recaptchaVerifier = useRef(null);
    const recaptchaId = useRef(`recaptcha-edit-creator-${Math.random().toString(36).slice(2, 9)}`).current;
    const otpRefs = useRef([]);

    // Keep form in sync when profile changes or modal opens
    useEffect(() => {
        if (!isOpen || !profile) return;
        
        setActiveSection(initialSection || 'identity');

        const rawSpec = (profile?.specializations || [profile?.categories] || [])[0] || '';
        const initSpec = (rawSpec === 'Student Creator/ Campus Creator' || rawSpec === 'Student/ Campus Creator') 
            ? 'Student/Campus Creator' 
            : rawSpec;
        const isPreNiche = CREATOR_NICHE_OPTIONS.some(n => n.id === initSpec);
        const normCity = (/^bang[al]*o?re$/i.test((profile?.city || '').trim())) ? 'Bengaluru' : (profile?.city || '');
        const isPreCity = PREDEFINED_CITIES.includes(normCity);
        const initRatesVal = parseRates(profile?.commercials);

        setRateMin(initRatesVal.min);
        setRateMax(initRatesVal.max);
        setIsRateFlexible(initRatesVal.isFlexible);

        setForm({
            name: profile?.name || profile?.displayName || user?.displayName || '',
            phone: profile?.phone || user?.phoneNumber || '',
            email: profile?.email || user?.email || '',
            city: isPreCity ? normCity : (normCity ? 'Others' : ''),
            customCity: isPreCity ? '' : normCity,
            categories: isPreNiche ? initSpec : (initSpec ? 'Others' : ''),
            customNiche: isPreNiche ? '' : initSpec,
            cityPageFocus: profile?.cityPageFocus || '',
            collegeName: profile?.collegeName || '',
            instagram: profile?.instagram || '',
            instagramFollowers: profile?.instagramFollowers || '',
            youtube: profile?.youtube || '',
            twitter: profile?.twitter || '',
            linkedin: profile?.linkedin || '',
            bio: profile?.bio || '',
            doBarter: (profile?.doBarter === 'paid' || profile?.doBarter === 'No') ? 'paid' : (profile?.doBarter === 'barter' || profile?.doBarter === 'Yes') ? 'barter' : 'both',
            commercials: profile?.commercials || '₹5,000 – ₹25,000 / Deliverable',
            profilePicture: profile?.profilePicture || profile?.instagramProfilePic || profile?.profilePic || profile?.photoURL || ''
        });

        setIsPhoneVerified(profile?.isPhoneVerified || false);
        setOtpSent(false);
        setOtpValues(['', '', '', '', '', '']);
    }, [isOpen, profile, user, initialSection]);

    // Cleanup Recaptcha
    const cleanupRecaptcha = () => {
        if (recaptchaVerifier.current) {
            try {
                recaptchaVerifier.current.clear();
            } catch (e) {
                console.error("Error clearing recaptcha:", e);
            }
            recaptchaVerifier.current = null;
        }
        const container = document.getElementById(recaptchaId);
        if (container) container.remove();
    };

    useEffect(() => {
        return () => cleanupRecaptcha();
    }, []);

    // Prevent background scroll when modal open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === 'instagram' || name === 'linkedin' || name === 'youtube' || name === 'twitter') {
            const cleanVal = extractSocialUsername(value, name);
            setForm(prev => ({ ...prev, [name]: cleanVal }));
            return;
        }
        if (name === 'phone') {
            setForm(prev => ({ ...prev, [name]: value }));
            if (value !== profile?.phone) {
                setIsPhoneVerified(false);
            } else {
                setIsPhoneVerified(profile?.isPhoneVerified || false);
            }
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
            const uploadFn = useStore.getState().uploadToCloudinary;
            if (uploadFn) {
                const url = await uploadFn(file);
                setForm(prev => ({ ...prev, profilePicture: url }));
                addToast("Profile photo uploaded successfully!", "success");
            }
        } catch (err) {
            console.error("Cloudinary upload failed, using local preview fallback:", err);
            const reader = new FileReader();
            reader.onloadend = () => {
                setForm(prev => ({ ...prev, profilePicture: reader.result }));
            };
            reader.readAsDataURL(file);
        } finally {
            setIsUploadingPhoto(false);
        }
    };

    const handleSendOTP = async () => {
        if (!form.phone) {
            addToast("Please enter a mobile number", "error");
            return;
        }
        const normPhone = normalizePhoneNumber(form.phone);
        if (normPhone && creators?.length > 0) {
            const conflict = creators.find(c => 
                (c.uid !== profile?.uid && c.id !== profile?.id) && 
                normalizePhoneNumber(c.phone) === normPhone
            );
            if (conflict) {
                addToast(`This phone number is already registered to another creator account.`, "error");
                return;
            }
        }
        setIsSendingOtp(true);
        try {
            const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            if (isLocal) {
                setOtpSent(true);
                addToast("Dev mode: Enter any 6-digit code to verify instantly.", "success");
                setIsSendingOtp(false);
                return;
            }
            cleanupRecaptcha();
            const container = document.createElement('div');
            container.id = recaptchaId;
            container.className = "z-50";
            document.body.appendChild(container);

            recaptchaVerifier.current = new RecaptchaVerifier(auth, container, {
                size: 'invisible',
                callback: () => {},
                'expired-callback': () => {
                    addToast("reCAPTCHA expired. Please try again.", 'error');
                    cleanupRecaptcha();
                }
            });
            await recaptchaVerifier.current.render();

            const cleanPhone = form.phone.replace(/\D/g, '');
            const formattedPhone = `+91${cleanPhone.length > 10 ? cleanPhone.slice(-10) : cleanPhone}`;

            const phoneProvider = new PhoneAuthProvider(auth);
            const verificationId = await phoneProvider.verifyPhoneNumber(
                formattedPhone,
                recaptchaVerifier.current
            );
            setConfirmationResult(verificationId);
            setOtpSent(true);
            addToast("Verification code dispatched via SMS!", "success");
        } catch (err) {
            console.error("OTP send error:", err);
            addToast(err.message || "Could not dispatch SMS verification code.", "error");
            cleanupRecaptcha();
        } finally {
            setIsSendingOtp(false);
        }
    };

    const handleVerifyOTP = async (codeToVerify) => {
        const fullCode = typeof codeToVerify === 'string' ? codeToVerify : otpValues.join('');
        if (fullCode.length !== 6) {
            addToast("Please enter the complete 6-digit code.", "error");
            return;
        }
        setIsVerifyingOtp(true);
        try {
            const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            if (!isLocal && confirmationResult) {
                const credential = PhoneAuthProvider.credential(confirmationResult, fullCode);
                if (auth?.currentUser && !auth.currentUser.phoneNumber) {
                    try {
                        await linkWithCredential(auth.currentUser, credential);
                    } catch (linkErr) {
                        console.log("Phone link note:", linkErr.message);
                    }
                }
            }
            setIsPhoneVerified(true);
            setOtpSent(false);
            addToast("Phone number verified successfully!", "success");

            const creatorId = profile?.uid || profile?.id;
            if (creatorId) {
                await updateCreator(creatorId, { 
                    isPhoneVerified: true, 
                    phone: form.phone,
                    phoneVerifiedAt: new Date().toISOString()
                });
            }
        } catch (err) {
            console.error("OTP verification error:", err);
            addToast(err.message || "Invalid verification code. Please check and try again.", "error");
        } finally {
            setIsVerifyingOtp(false);
        }
    };

    const handleOtpChange = (index, value) => {
        const clean = value.replace(/\D/g, '');
        const newOtp = [...otpValues];
        newOtp[index] = clean ? clean.slice(-1) : '';
        setOtpValues(newOtp);

        if (clean && index < 5) {
            otpRefs.current[index + 1]?.focus();
        }

        if (newOtp.every(d => d !== '')) {
            handleVerifyOTP(newOtp.join(''));
        }
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();

        if (!form.name?.trim()) {
            setActiveSection('identity');
            addToast("Please enter your creator name", "error");
            return;
        }
        if (!form.city) {
            setActiveSection('identity');
            addToast("Please select your operating city", "error");
            return;
        }
        if (form.city === 'Others' && !form.customCity?.trim()) {
            setActiveSection('identity');
            addToast("Please specify your custom city name", "error");
            return;
        }
        if (!form.categories) {
            setActiveSection('niche');
            addToast("Please select your primary niche", "error");
            return;
        }
        if (form.categories === 'Others' && !form.customNiche?.trim()) {
            setActiveSection('niche');
            addToast("Please specify your custom niche", "error");
            return;
        }

        for (const field of ['instagram', 'linkedin', 'youtube', 'twitter']) {
            if (form[field] && hasDisallowedLink(form[field])) {
                setActiveSection('socials');
                addToast(`Links are not allowed. Please enter only your ${field} username or handle.`, "error");
                return;
            }
        }

        setIsSaving(true);
        try {
            let finalCity = form.city === 'Others' ? (form.customCity?.trim() || 'Others') : form.city;
            if (/^bang[al]*o?re$/i.test(finalCity.trim())) {
                finalCity = 'Bengaluru';
            }
            const finalNiche = form.categories === 'Others' ? (form.customNiche?.trim() || 'Others') : form.categories;
            const finalCommercials = isRateFlexible 
                ? 'Flexible / Barter' 
                : `${formatINR(rateMin)} – ${formatINR(rateMax)}${rateMax >= 100000 ? '+' : ''} / Deliverable`;

            const payload = {
                name: form.name.trim(),
                displayName: form.name.trim(),
                email: form.email?.trim() || '',
                phone: form.phone?.trim() || '',
                city: finalCity,
                categories: finalNiche,
                specializations: [finalNiche],
                cityPageFocus: form.categories === 'City Pages' ? (form.cityPageFocus?.trim() || '') : '',
                collegeName: (form.categories === 'Student/Campus Creator' || form.categories === 'College Pages') ? (form.collegeName?.trim() || '') : '',
                instagram: extractSocialUsername(form.instagram, 'instagram'),
                instagramFollowers: form.instagramFollowers || '',
                linkedin: extractSocialUsername(form.linkedin, 'linkedin'),
                youtube: extractSocialUsername(form.youtube, 'youtube'),
                twitter: extractSocialUsername(form.twitter, 'twitter'),
                website: '',
                bio: form.bio?.trim() || '',
                doBarter: form.doBarter || 'both',
                commercials: finalCommercials,
                profilePicture: form.profilePicture || '',
                isPhoneVerified: isPhoneVerified
            };

            const creatorId = profile?.uid || profile?.id;
            if (!creatorId) {
                throw new Error("Unable to identify creator profile identifier.");
            }

            await updateCreator(creatorId, payload);
            addToast("Creator details updated successfully!", "success");
            
            if (addNotification) {
                addNotification({
                    title: "Creator Profile Updated",
                    content: "Your creator details and campaign commercials have been saved.",
                    type: 'message'
                });
            }

            if (onUpdated) {
                onUpdated(payload);
            }
            onClose();
        } catch (err) {
            console.error("Failed to update creator profile:", err);
            addToast(err.message || "Failed to update creator details.", "error");
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    const creatorIdTag = profile?.creatorId || String(profile?.uid || profile?.id || '').slice(0, 8).toUpperCase();
    const isApproved = profile?.profileStatus === 'approved';

    return createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-5 md:p-6 overflow-hidden">
            {/* Backdrop */}
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                onClick={onClose}
                className="fixed inset-0 bg-black/75 dark:bg-black/90 backdrop-blur-xl"
            />

            {/* Modal Dialog Window */}
            <motion.div 
                initial={{ opacity: 0, scale: 0.96, y: 14 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 14 }}
                transition={{ type: "spring", duration: 0.35, bounce: 0.05 }}
                className="relative w-full max-w-3xl max-h-[92vh] sm:max-h-[90vh] bg-white dark:bg-[#0c0e14] text-gray-950 dark:text-white border border-black/[0.08] dark:border-white/[0.08] rounded-3xl shadow-[0_25px_80px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden z-10 font-heading"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Subtle Ambient Background Gradients */}
                <div className="absolute top-0 right-0 w-80 h-80 bg-neon-green/[0.04] dark:bg-neon-green/[0.025] rounded-full blur-[100px] pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-80 h-80 bg-neon-pink/[0.03] dark:bg-neon-pink/[0.015] rounded-full blur-[100px] pointer-events-none" />

                {/* ── Header ── */}
                <div className="relative px-6 sm:px-8 py-5 sm:py-6 border-b border-black/[0.06] dark:border-white/[0.08] bg-gray-50/50 dark:bg-white/[0.02] flex items-center justify-between gap-4 shrink-0">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
                            <h2 className="text-xl sm:text-2xl font-black font-heading tracking-tight text-gray-950 dark:text-white uppercase italic">
                                Edit Creator Details
                            </h2>
                            <span className="font-mono text-[10px] px-2.5 py-1 rounded-lg bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.08] text-gray-600 dark:text-zinc-300 font-bold tracking-wider">
                                #{creatorIdTag}
                            </span>
                            {isApproved ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-neon-green text-[9px] sm:text-[10px] font-black uppercase font-mono border border-emerald-500/25">
                                    <ShieldCheck size={12} /> Verified
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 text-[9px] sm:text-[10px] font-black uppercase font-mono border border-amber-500/30">
                                    <Clock size={12} /> Under Review
                                </span>
                            )}
                        </div>
                        <p className="text-[11px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider mt-1">
                            Update your creator handle, operating city, primary niche, and rate commercials
                        </p>
                    </div>

                    <button 
                        type="button"
                        onClick={onClose}
                        className="w-10 h-10 rounded-2xl bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.08] hover:bg-black/[0.08] dark:hover:bg-white/[0.1] text-gray-600 dark:text-zinc-400 hover:text-black dark:hover:text-white flex items-center justify-center transition-all shrink-0 active:scale-90 cursor-pointer"
                        aria-label="Close modal"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* ── Section Navigation Bar (No icons, matching Creator Portal tab style) ── */}
                <div className="flex border-b border-black/[0.06] dark:border-white/[0.08] px-6 sm:px-8 shrink-0 overflow-x-auto no-scrollbar gap-2 sm:gap-4 bg-gray-50/30 dark:bg-white/[0.01]">
                    {SECTIONS.map((sec) => {
                        const isCurrent = activeSection === sec.id;
                        return (
                            <button
                                key={sec.id}
                                type="button"
                                onClick={() => setActiveSection(sec.id)}
                                className={cn(
                                    "relative py-3.5 px-3 text-[10px] sm:text-[11px] font-black uppercase tracking-widest transition-all shrink-0 cursor-pointer",
                                    isCurrent 
                                        ? "text-gray-950 dark:text-white" 
                                        : "text-gray-400 dark:text-zinc-500 hover:text-gray-800 dark:hover:text-zinc-300"
                                )}
                            >
                                <span>{sec.label}</span>
                                {isCurrent && (
                                    <motion.div
                                        layoutId="edit-creator-active-tab-line"
                                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-neon-green"
                                        transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                                    />
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* ── Scrollable Form Body with Smooth Cross-fade ── */}
                <form id="edit-creator-form" onSubmit={handleSubmit} className="overflow-y-auto p-6 sm:p-8 space-y-6 flex-1 custom-scrollbar">
                    
                    {/* SECTION 1: IDENTITY & CONTACT */}
                    {activeSection === 'identity' && (
                        <motion.div 
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.18 }}
                            className="space-y-6"
                        >
                            {/* Profile Photo Picker */}
                            <div className="flex items-center gap-4 sm:gap-5 p-4 sm:p-5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.08]">
                                <div className="relative w-20 h-20 sm:w-22 sm:h-22 rounded-2xl bg-gray-100 dark:bg-zinc-800 border-2 border-black/[0.08] dark:border-white/[0.1] overflow-hidden flex items-center justify-center shrink-0 shadow-sm">
                                    {form.profilePicture ? (
                                        <img src={form.profilePicture} alt={form.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-3xl font-black text-neon-green">{form.name?.charAt(0) || 'C'}</span>
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
                                    <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs font-bold text-gray-900 dark:text-white cursor-pointer hover:border-neon-green hover:shadow-xs transition-all active:scale-95">
                                        <Camera size={14} className="text-neon-green" />
                                        <span>{isUploadingPhoto ? "Uploading Photo..." : "Upload New Photo"}</span>
                                        <input 
                                            type="file" 
                                            accept="image/*" 
                                            className="hidden" 
                                            disabled={isUploadingPhoto}
                                            onChange={handleImageUpload} 
                                        />
                                    </label>
                                    <p className="text-[10px] text-gray-400 dark:text-zinc-500 mt-1.5 font-bold uppercase tracking-wider">
                                        JPEG, PNG or WebP under 10MB.
                                    </p>
                                </div>
                            </div>

                            {/* Full Name & Email */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 items-start">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-zinc-400 flex items-center h-5 leading-none">
                                        Creator / Display Name *
                                    </label>
                                    <input 
                                        type="text"
                                        name="name"
                                        value={form.name}
                                        onChange={handleChange}
                                        required
                                        placeholder="Your creator or brand name"
                                        className="w-full h-12 px-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.08] dark:border-white/[0.08] text-xs font-bold text-gray-900 dark:text-white focus:border-neon-green/70 focus:bg-white dark:focus:bg-black/40 outline-none transition-all shadow-inner"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-zinc-400 flex items-center h-5 leading-none">
                                        Email Address *
                                    </label>
                                    <input 
                                        type="email"
                                        name="email"
                                        value={form.email}
                                        onChange={handleChange}
                                        required
                                        placeholder="creator@domain.com"
                                        className="w-full h-12 px-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.08] dark:border-white/[0.08] text-xs font-bold text-gray-900 dark:text-white focus:border-neon-green/70 focus:bg-white dark:focus:bg-black/40 outline-none transition-all shadow-inner"
                                    />
                                </div>
                            </div>

                            {/* Operating City */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-zinc-400">
                                    Operating City *
                                </label>
                                <StudioSelect
                                    name="city"
                                    value={form.city}
                                    onChange={handleChange}
                                    placeholder="Select Operating City"
                                    options={PREDEFINED_CITIES.map(c => ({ value: c, label: c }))}
                                    accentColor="neon-green"
                                    size="md"
                                />
                                {form.city === 'Others' && (
                                    <input 
                                        type="text"
                                        name="customCity"
                                        value={form.customCity}
                                        onChange={handleChange}
                                        placeholder="Specify your city name"
                                        className="w-full h-11 px-4 mt-2 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.08] dark:border-white/[0.08] text-xs font-bold text-gray-900 dark:text-white focus:border-neon-green/70 outline-none transition-all"
                                    />
                                )}
                            </div>

                            {/* Phone Number & OTP Verification */}
                            <div className="p-4 sm:p-5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.08] space-y-3.5">
                                <div className="flex items-center justify-between">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-zinc-400 flex items-center gap-1.5">
                                        <Phone size={12} className="text-neon-green" /> Mobile / WhatsApp Number *
                                    </label>
                                    {isPhoneVerified ? (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-neon-green text-[10px] font-mono font-bold border border-emerald-500/25">
                                            <CheckCircle2 size={12} /> Verified Contact
                                        </span>
                                    ) : (
                                        <span className="text-[10px] font-bold text-amber-500 font-mono">
                                            Not Verified
                                        </span>
                                    )}
                                </div>

                                <div className="flex gap-2">
                                    <input 
                                        type="tel"
                                        name="phone"
                                        value={form.phone}
                                        onChange={handleChange}
                                        placeholder="+91 9876543210"
                                        className="flex-1 h-12 px-4 rounded-2xl bg-white dark:bg-black/40 border border-black/[0.08] dark:border-white/[0.08] text-xs font-bold text-gray-900 dark:text-white focus:border-neon-green/70 outline-none transition-all"
                                    />
                                    {!isPhoneVerified && (
                                        <button
                                            type="button"
                                            onClick={handleSendOTP}
                                            disabled={isSendingOtp || !form.phone}
                                            className="px-4 h-12 rounded-2xl bg-amber-400 hover:bg-amber-300 text-zinc-950 text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-50 shrink-0 shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-95"
                                        >
                                            {isSendingOtp ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                                            <span>{otpSent ? "Resend Code" : "Send SMS Code"}</span>
                                        </button>
                                    )}
                                </div>

                                {otpSent && !isPhoneVerified && (
                                    <div className="pt-3.5 space-y-3 border-t border-black/[0.06] dark:border-white/[0.06]">
                                        <p className="text-[10px] font-black uppercase tracking-wider text-gray-600 dark:text-zinc-400">
                                            Enter the 6-digit Code sent via SMS:
                                        </p>
                                        <div className="flex gap-2 justify-center sm:justify-start">
                                            {otpValues.map((val, idx) => (
                                                <input
                                                    key={idx}
                                                    ref={el => otpRefs.current[idx] = el}
                                                    type="text"
                                                    maxLength={1}
                                                    value={val}
                                                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Backspace' && !val && idx > 0) {
                                                            otpRefs.current[idx - 1]?.focus();
                                                        }
                                                    }}
                                                    className="w-11 h-12 text-center rounded-xl bg-white dark:bg-black/60 border border-black/[0.1] dark:border-white/[0.15] text-sm font-black text-gray-900 dark:text-white focus:border-neon-green outline-none"
                                                />
                                            ))}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleVerifyOTP(otpValues.join(''))}
                                            disabled={isVerifyingOtp || otpValues.some(v => !v)}
                                            className="w-full h-11 rounded-2xl bg-neon-green text-black font-black uppercase tracking-widest text-xs hover:bg-emerald-400 transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-2 shadow-sm cursor-pointer active:scale-95"
                                        >
                                            {isVerifyingOtp ? <Loader2 size={14} className="animate-spin" /> : "Verify Code"}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {/* SECTION 2: NICHE & FOCUS */}
                    {activeSection === 'niche' && (
                        <motion.div 
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.18 }}
                            className="space-y-6"
                        >
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-zinc-400">
                                    Primary Creator Niche *
                                </label>
                                <StudioSelect
                                    name="categories"
                                    value={form.categories}
                                    onChange={handleChange}
                                    placeholder="Select Niche Category"
                                    options={CREATOR_NICHE_OPTIONS.map(n => ({ value: n.id, label: n.label }))}
                                    accentColor="neon-green"
                                    size="md"
                                />
                                {form.categories === 'Others' && (
                                    <input 
                                        type="text"
                                        name="customNiche"
                                        value={form.customNiche}
                                        onChange={handleChange}
                                        placeholder="Specify your custom niche (e.g. Automotive, Podcasting, DIY)"
                                        className="w-full h-11 px-4 mt-2 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.08] dark:border-white/[0.08] text-xs font-bold text-gray-900 dark:text-white focus:border-neon-green/70 outline-none transition-all"
                                    />
                                )}
                            </div>

                            {/* Contextual Niche Fields */}
                            {form.categories === 'City Pages' && (
                                <div className="space-y-1.5 p-4 sm:p-5 rounded-2xl bg-pink-500/[0.04] border border-pink-500/20">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-pink-600 dark:text-pink-400 flex items-center gap-1.5">
                                        <Building2 size={13} /> City / Locality Page Focus
                                    </label>
                                    <input 
                                        type="text"
                                        name="cityPageFocus"
                                        value={form.cityPageFocus}
                                        onChange={handleChange}
                                        placeholder="e.g. Bangalore Nightlife, South Delhi Food, Koramangala Buzz"
                                        className="w-full h-12 px-4 rounded-2xl bg-white dark:bg-zinc-900/60 border border-black/[0.08] dark:border-white/[0.1] text-xs font-bold text-gray-900 dark:text-white focus:border-pink-500 outline-none transition-all"
                                    />
                                </div>
                            )}

                            {(form.categories === 'Student/Campus Creator' || form.categories === 'College Pages') && (
                                <div className="space-y-1.5 p-4 sm:p-5 rounded-2xl bg-blue-500/[0.04] border border-blue-500/20">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                                        <Building size={13} /> College / University Name
                                    </label>
                                    <input 
                                        type="text"
                                        name="collegeName"
                                        value={form.collegeName}
                                        onChange={handleChange}
                                        placeholder="e.g. Christ University, IIT Bombay, St. Xavier's"
                                        className="w-full h-12 px-4 rounded-2xl bg-white dark:bg-zinc-900/60 border border-black/[0.08] dark:border-white/[0.1] text-xs font-bold text-gray-900 dark:text-white focus:border-blue-500 outline-none transition-all"
                                    />
                                </div>
                            )}

                            <div className="p-4 sm:p-5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.08]">
                                <p className="text-[11px] font-black uppercase tracking-widest text-gray-800 dark:text-zinc-200">
                                    Why your niche matters
                                </p>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400 mt-1 leading-relaxed">
                                    Campaign briefs and brand invites are matched based on your operating city and niche category.
                                </p>
                            </div>
                        </motion.div>
                    )}

                    {/* SECTION 3: SOCIAL CHANNELS */}
                    {activeSection === 'socials' && (
                        <motion.div 
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.18 }}
                            className="space-y-5"
                        >
                            {/* Instagram */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 sm:p-5 rounded-2xl bg-pink-500/[0.03] border border-pink-500/20 items-start">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-pink-600 dark:text-pink-400 flex items-center gap-1.5 h-5 leading-none">
                                        <Instagram size={13} className="shrink-0" />
                                        <span>Instagram Username *</span>
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">@</span>
                                        <input 
                                            type="text"
                                            name="instagram"
                                            value={form.instagram}
                                            onChange={handleChange}
                                            placeholder="yourhandle"
                                            className="w-full h-12 pl-8 pr-4 rounded-2xl bg-white dark:bg-zinc-900/60 border border-black/[0.08] dark:border-white/[0.1] text-xs font-bold text-gray-900 dark:text-white focus:border-pink-500 outline-none transition-all shadow-inner"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-pink-600/80 dark:text-pink-400/80 flex items-center gap-1.5 h-5 leading-none">
                                        <Users size={13} className="shrink-0 text-pink-500/70" />
                                        <span>Follower Count (Approx.)</span>
                                    </label>
                                    <div className="relative">
                                        <input 
                                            type="number"
                                            name="instagramFollowers"
                                            value={form.instagramFollowers}
                                            onChange={handleChange}
                                            placeholder="e.g. 15000"
                                            className="w-full h-12 px-4 rounded-2xl bg-white dark:bg-zinc-900/60 border border-black/[0.08] dark:border-white/[0.1] text-xs font-bold text-gray-900 dark:text-white focus:border-pink-500 outline-none transition-all shadow-inner [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* YouTube */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-red-600 dark:text-red-400 flex items-center gap-1.5 h-5 leading-none">
                                    <Youtube size={13} className="shrink-0" />
                                    <span>YouTube Channel Handle</span>
                                </label>
                                <input 
                                    type="text"
                                    name="youtube"
                                    value={form.youtube}
                                    onChange={handleChange}
                                    placeholder="channelhandle or @handle"
                                    className="w-full h-12 px-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.08] dark:border-white/[0.08] text-xs font-bold text-gray-900 dark:text-white focus:border-neon-green/70 outline-none transition-all shadow-inner"
                                />
                            </div>

                            {/* LinkedIn */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 flex items-center gap-1.5 h-5 leading-none">
                                    <Linkedin size={13} className="shrink-0" />
                                    <span>LinkedIn Profile Handle</span>
                                </label>
                                <input 
                                    type="text"
                                    name="linkedin"
                                    value={form.linkedin}
                                    onChange={handleChange}
                                    placeholder="in/username"
                                    className="w-full h-12 px-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.08] dark:border-white/[0.08] text-xs font-bold text-gray-900 dark:text-white focus:border-neon-green/70 outline-none transition-all shadow-inner"
                                />
                            </div>

                            {/* Twitter / X */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-sky-600 dark:text-sky-400 flex items-center gap-1.5 h-5 leading-none">
                                    <Twitter size={13} className="shrink-0" />
                                    <span>X / Twitter Handle</span>
                                </label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">@</span>
                                    <input 
                                        type="text"
                                        name="twitter"
                                        value={form.twitter}
                                        onChange={handleChange}
                                        placeholder="handle"
                                        className="w-full h-12 pl-8 pr-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.08] dark:border-white/[0.08] text-xs font-bold text-gray-900 dark:text-white focus:border-neon-green/70 outline-none transition-all shadow-inner"
                                    />
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* SECTION 4: RATES & BIO */}
                    {activeSection === 'rates' && (
                        <motion.div 
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.18 }}
                            className="space-y-6"
                        >
                            {/* Collaboration Preference */}
                            <div className="space-y-2.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-zinc-400">
                                    Collaboration Preferences
                                </label>
                                <div className="grid grid-cols-3 gap-3">
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
                                                    "p-3.5 sm:p-4 rounded-2xl border transition-all flex flex-col items-center justify-center gap-2 cursor-pointer active:scale-95",
                                                    isSelected
                                                        ? "bg-neon-green text-black border-neon-green font-black shadow-md shadow-neon-green/20"
                                                        : "bg-black/[0.02] dark:bg-white/[0.02] text-gray-800 dark:text-white/60 border-black/[0.06] dark:border-white/[0.08] hover:text-black dark:hover:text-white"
                                                )}
                                            >
                                                <div className={cn(
                                                    "w-8 h-8 rounded-xl flex items-center justify-center transition-colors",
                                                    isSelected ? "bg-black text-neon-green" : "bg-black/5 dark:bg-white/5 text-gray-500 dark:text-zinc-400"
                                                )}>
                                                    <IconComp size={15} />
                                                </div>
                                                <span className="text-[11px] font-bold leading-tight uppercase tracking-wider">{opt.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Typical Deliverable Rates */}
                            <div className="space-y-3.5 p-4 sm:p-5 bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.08] rounded-2xl">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-zinc-400 block">
                                            Typical Rates per Deliverable
                                        </label>
                                        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400 mt-0.5">
                                            Expected quote for reels & campaign briefs
                                        </p>
                                    </div>
                                    <div className="sm:text-right">
                                        <span className="text-xs sm:text-sm font-black font-mono text-neon-green bg-black px-3.5 py-1.5 rounded-xl border border-neon-green/30 shadow-[0_0_15px_rgba(57,255,20,0.15)] inline-flex items-center gap-1.5">
                                            <IndianRupee size={13} className="text-neon-green shrink-0" />
                                            {isRateFlexible ? "Flexible / Barter" : `${formatINR(rateMin)} – ${formatINR(rateMax)}${rateMax >= 100000 ? '+' : ''}`}
                                        </span>
                                    </div>
                                </div>

                                {/* Presets */}
                                <div className="flex flex-wrap gap-2 pt-1">
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
                                                    "px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border cursor-pointer active:scale-95",
                                                    isSelected
                                                        ? "bg-neon-green text-black border-neon-green shadow-xs font-black"
                                                        : "bg-white dark:bg-zinc-900 text-gray-700 dark:text-zinc-300 border-black/10 dark:border-white/10 hover:border-neon-green/40"
                                                )}
                                            >
                                                {preset.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Bio / About pitch */}
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-zinc-400">
                                        Short Bio & Creative Pitch
                                    </label>
                                    <span className="text-[10px] font-mono text-gray-400">
                                        {(form.bio || '').length}/300
                                    </span>
                                </div>
                                <textarea 
                                    name="bio"
                                    rows={3}
                                    maxLength={300}
                                    value={form.bio}
                                    onChange={handleChange}
                                    placeholder="Tell brand managers and event producers about your style, audience vibe, and creative strengths..."
                                    className="w-full p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.08] dark:border-white/[0.08] text-xs font-medium text-gray-900 dark:text-white focus:border-neon-green/70 focus:bg-white dark:focus:bg-black/40 outline-none transition-all resize-none shadow-inner"
                                />
                            </div>
                        </motion.div>
                    )}

                </form>

                {/* ── Footer Action Bar ── */}
                <div className="px-6 sm:px-8 py-4 sm:py-5 border-t border-black/[0.06] dark:border-white/[0.08] bg-gray-50/50 dark:bg-white/[0.02] flex items-center justify-between gap-3 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 h-12 rounded-2xl bg-black/[0.04] dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] text-gray-700 dark:text-zinc-300 font-bold text-xs uppercase tracking-wider hover:bg-black/[0.08] dark:hover:bg-white/[0.08] transition-all cursor-pointer active:scale-95"
                    >
                        Cancel
                    </button>

                    <div className="flex items-center gap-2.5">
                        {activeSection !== 'rates' && (
                            <button
                                type="button"
                                onClick={() => {
                                    const currIndex = SECTIONS.findIndex(s => s.id === activeSection);
                                    if (currIndex < SECTIONS.length - 1) {
                                        setActiveSection(SECTIONS[currIndex + 1].id);
                                    }
                                }}
                                className="px-5 h-12 rounded-2xl bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.08] text-gray-800 dark:text-zinc-200 text-xs font-black uppercase tracking-wider transition-all hover:bg-black/[0.08] dark:hover:bg-white/[0.1] cursor-pointer active:scale-95"
                            >
                                Next Step →
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={isSaving}
                            className="px-7 h-12 rounded-2xl bg-neon-green hover:bg-emerald-400 text-black font-black uppercase tracking-widest text-xs transition-all shadow-[0_0_20px_rgba(57,255,20,0.3)] flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 cursor-pointer"
                        >
                            {isSaving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                            <span>{isSaving ? "Saving..." : "Save Changes"}</span>
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>,
        document.body
    );
};

export default EditCreatorModal;
