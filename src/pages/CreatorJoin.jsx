import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../lib/store';
import { useStoreSubscription } from '../hooks/useStoreSubscription';
import { auth } from '../lib/firebase';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import confetti from 'canvas-confetti';
import { PREDEFINED_CITIES } from '../lib/constants';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { motion, AnimatePresence } from 'framer-motion';
import Zap from 'lucide-react/dist/esm/icons/zap';
import Users from 'lucide-react/dist/esm/icons/users';
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right';
import Instagram from 'lucide-react/dist/esm/icons/instagram';
import Youtube from 'lucide-react/dist/esm/icons/youtube';
import Globe from 'lucide-react/dist/esm/icons/globe';
import Camera from 'lucide-react/dist/esm/icons/camera';
import Linkedin from 'lucide-react/dist/esm/icons/linkedin';
import Twitter from 'lucide-react/dist/esm/icons/twitter';
import Upload from 'lucide-react/dist/esm/icons/upload';
import CheckCircle2 from 'lucide-react/dist/esm/icons/check-circle-2';
import Check from 'lucide-react/dist/esm/icons/check';
import Phone from 'lucide-react/dist/esm/icons/phone';
import Mail from 'lucide-react/dist/esm/icons/mail';
import MapPin from 'lucide-react/dist/esm/icons/map-pin';
import Tag from 'lucide-react/dist/esm/icons/tag';
import ShieldCheck from 'lucide-react/dist/esm/icons/shield-check';
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down';
import User from 'lucide-react/dist/esm/icons/user';
import FileText from 'lucide-react/dist/esm/icons/file-text';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import Lock from 'lucide-react/dist/esm/icons/lock';
import ArrowLeft from 'lucide-react/dist/esm/icons/arrow-left';
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw';
import { useNavigate, Link } from 'react-router-dom';
import { cn, normalizePhoneNumber } from '../lib/utils';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import useDynamicMeta from '../hooks/useDynamicMeta';

const NICHES = [
    'Student/Campus Creator',
    'Fashion & Luxury',
    'Tech & Gaming',
    'Travel & Lifestyle',
    'Beauty & Fitness',
    'Food & Beverage',
    'Comedy & Entertainment',
    'College Pages',
    'Startup & Entrepreneurship',
    'Finance & Business',
    'Art & Photography',
    'Music & Dance',
    'Others'
];

const COUNTRY_OPTIONS = [
    { value: '+91', label: '🇮🇳 +91' },
    { value: '+1', label: '🇺🇸 +1' },
    { value: '+44', label: '🇬🇧 +44' },
    { value: '+971', label: '🇦🇪 +971' },
    { value: '+61', label: '🇦🇺 +61' }
];

const RECAPTCHA_CONTAINER_ID = 'creator-phone-recaptcha';

const CustomSelect = ({ value, onChange, options, name, placeholder, icon: Icon, className, isCountryCode }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    const handleToggle = () => setIsOpen(!isOpen);

    const handleSelect = (option) => {
        const val = typeof option === 'object' ? option.value : option;
        onChange({ target: { name, value: val } });
        setIsOpen(false);
    };

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const currentOption = options.find(opt => (typeof opt === 'object' ? opt.value : opt) === value);
    const displayLabel = currentOption ? (typeof currentOption === 'object' ? currentOption.label : currentOption) : placeholder;

    return (
        <div ref={containerRef} className={cn("relative", isCountryCode ? "w-24 sm:w-28 shrink-0" : "w-full")}>
            <button
                type="button"
                onClick={handleToggle}
                className={cn(
                    "w-full h-14 bg-zinc-900/90 border border-zinc-800 rounded-xl text-sm font-semibold text-left focus:border-white focus:outline-none transition-all flex items-center justify-between group",
                    isCountryCode ? "px-3" : "pl-11 pr-4",
                    isOpen && "border-zinc-500 ring-1 ring-zinc-500/40",
                    className
                )}
            >
                {!isCountryCode && Icon && <Icon className={cn("absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors", isOpen ? "text-white" : "text-zinc-400")} size={18} />}
                <span className={value ? "text-white truncate" : "text-zinc-400 truncate"}>{displayLabel}</span>
                <ChevronDown size={14} className={cn("text-zinc-400 transition-transform duration-200 shrink-0", isOpen && "rotate-180 text-white")} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.ul
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.15 }}
                        className="absolute z-[100] w-full mt-1.5 max-h-56 overflow-y-auto bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl py-1 text-white scrollbar-thin scrollbar-thumb-zinc-700"
                    >
                        {options.map((opt) => {
                            const optVal = typeof opt === 'object' ? opt.value : opt;
                            const optLabel = typeof opt === 'object' ? opt.label : opt;
                            const isSelected = optVal === value;
                            return (
                                <li key={optVal}>
                                    <button
                                        type="button"
                                        onClick={() => handleSelect(opt)}
                                        className={cn(
                                            "w-full px-3.5 py-2.5 text-left text-xs font-medium transition-all hover:bg-zinc-800 flex items-center justify-between",
                                            isSelected && "bg-zinc-800/80 text-emerald-400 font-semibold"
                                        )}
                                    >
                                        <span className="truncate">{optLabel}</span>
                                        {isSelected && <Check size={14} className="text-emerald-400 shrink-0 ml-2" />}
                                    </button>
                                </li>
                            );
                        })}
                    </motion.ul>
                )}
            </AnimatePresence>
        </div>
    );
};

const CreatorJoin = () => {
    useStoreSubscription(['creators']);
    useDynamicMeta({
        title: "Join Newbi Creator Network",
        description: "Apply to the Newbi Creator Network. Get connected with verified brand campaigns, campus gigs, and events across India.",
        url: window.location.href
    });

    const { user, addCreator, creators, uploadToCloudinary, setAuthModal } = useStore();
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
        city: '',
        customCity: '',
        categories: '',
        customNiche: '',
        collegeName: '',
        bio: '',
        doBarter: 'both',
        commercials: '',
        primaryPlatform: 'instagram',
        instagram: '',
        instagramFollowers: '',
        youtube: '',
        twitter: '',
        linkedin: '',
        linkedinFollowers: '',
        profilePicture: '',
        referredBy: ''
    });

    const [countryCode, setCountryCode] = useState('+91');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
    const [hasJoined, setHasJoined] = useState(false);
    const [isReferralCodeLocked, setIsReferralCodeLocked] = useState(false);

    // Phone OTP Verification States
    const [isPhoneVerified, setIsPhoneVerified] = useState(false);
    const [otpSent, setOtpSent] = useState(false);
    const [isSendingOtp, setIsSendingOtp] = useState(false);
    const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
    const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
    const [otpCooldown, setOtpCooldown] = useState(0);
    const [confirmationResult, setConfirmationResult] = useState(null);
    const [phoneError, setPhoneError] = useState('');
    const [verifiedPhoneNumber, setVerifiedPhoneNumber] = useState('');

    const otpInputRefs = useRef([]);
    const recaptchaVerifierRef = useRef(null);

    // Auto-fill from logged in user if available
    useEffect(() => {
        if (user) {
            setFormData(prev => {
                const updates = {};
                if (!prev.email && user.email) updates.email = user.email;
                if (!prev.name && user.displayName) updates.name = user.displayName;
                if (!prev.phone && user.phoneNumber) {
                    const cleanPhone = user.phoneNumber.replace(/\D/g, '');
                    if (cleanPhone.length >= 10) {
                        updates.phone = cleanPhone.slice(-10);
                        const cc = user.phoneNumber.replace(updates.phone, '');
                        if (cc && cc.startsWith('+')) setCountryCode(cc);
                        setIsPhoneVerified(true);
                        setVerifiedPhoneNumber(user.phoneNumber);
                    } else {
                        updates.phone = cleanPhone;
                    }
                }
                return Object.keys(updates).length > 0 ? { ...prev, ...updates } : prev;
            });
        }
    }, [user]);

    // Resend countdown timer
    useEffect(() => {
        let timer;
        if (otpCooldown > 0) {
            timer = setTimeout(() => setOtpCooldown(prev => prev - 1), 1000);
        }
        return () => clearTimeout(timer);
    }, [otpCooldown]);

    // Cleanup Recaptcha
    const cleanupRecaptcha = () => {
        if (recaptchaVerifierRef.current) {
            try {
                recaptchaVerifierRef.current.clear();
            } catch (e) {}
            recaptchaVerifierRef.current = null;
        }
    };

    useEffect(() => {
        return () => cleanupRecaptcha();
    }, []);

    // If already registered creator, redirect to dashboard
    useEffect(() => {
        if (user && creators && creators.length > 0) {
            const userPhoneNorm = user.phoneNumber ? normalizePhoneNumber(user.phoneNumber) : null;
            const userEmailNorm = user.email ? user.email.toLowerCase() : null;
            const existing = creators.find(c => 
                c.uid === user.uid || 
                (userEmailNorm && c.email && c.email.toLowerCase() === userEmailNorm) ||
                (userPhoneNorm && normalizePhoneNumber(c.phone) === userPhoneNorm)
            );
            if (existing) {
                navigate('/creator-dashboard');
            }
        }
    }, [user, creators, navigate]);

    // Real-time duplicate account checks across Email, Phone, and Instagram
    const duplicateWarnings = React.useMemo(() => {
        if (!creators || creators.length === 0) return {};
        const warnings = {};

        // Check Email
        if (formData.email?.trim()) {
            const normEmail = formData.email.trim().toLowerCase();
            const match = creators.find(c => c.uid !== user?.uid && c.email && c.email.trim().toLowerCase() === normEmail);
            if (match) {
                warnings.email = `This email is already registered to ${match.displayName || match.name || 'an existing creator profile'}.`;
            }
        }

        // Check Phone
        if (formData.phone) {
            const normPhone = normalizePhoneNumber(formData.phone);
            if (normPhone && normPhone.length >= 10) {
                const match = creators.find(c => c.uid !== user?.uid && normalizePhoneNumber(c.phone) === normPhone);
                if (match) {
                    warnings.phone = `This mobile number is already linked to ${match.displayName || match.name || 'an existing creator profile'}.`;
                }
            }
        }

        // Check Instagram
        if (formData.instagram?.trim()) {
            const cleanInsta = formData.instagram.trim().replace(/^@/, '').toLowerCase();
            const match = creators.find(c => c.uid !== user?.uid && c.instagram && c.instagram.trim().replace(/^@/, '').toLowerCase() === cleanInsta);
            if (match) {
                warnings.instagram = `The handle @${cleanInsta} is already registered to ${match.displayName || match.name || 'an existing creator profile'}.`;
            }
        }

        return warnings;
    }, [formData.email, formData.phone, formData.instagram, creators, user]);

    // Check referral query params
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const refParam = params.get('ref') || params.get('referral');
        if (refParam) {
            setFormData(prev => ({ ...prev, referredBy: refParam }));
            setIsReferralCodeLocked(true);
        }
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === 'phone') {
            // If phone number changes after verification, reset verified state
            if (isPhoneVerified) {
                setIsPhoneVerified(false);
                setVerifiedPhoneNumber('');
                setOtpSent(false);
            }
        }
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setIsUploadingPhoto(true);
        try {
            const url = await uploadToCloudinary(file);
            setFormData(prev => ({ ...prev, profilePicture: url }));
            useStore.getState().addToast("Profile photo uploaded!", 'success');
        } catch (error) {
            useStore.getState().addToast("Couldn't upload photo. You can submit without it.", 'error');
        } finally {
            setIsUploadingPhoto(false);
        }
    };

    // ── SEND PHONE OTP ────────────────────────────────────────────────────────
    const handleSendOTP = async () => {
        const cleanDigits = formData.phone.replace(/\D/g, '').slice(-10);
        if (!cleanDigits || cleanDigits.length < 10) {
            setPhoneError("Please enter a valid 10-digit mobile number.");
            return;
        }

        const normPhone = normalizePhoneNumber(formData.phone);
        if (normPhone && creators) {
            const existing = creators.find(c => c.uid !== user?.uid && normalizePhoneNumber(c.phone) === normPhone);
            if (existing) {
                setPhoneError(`This number is already registered under ${existing.displayName || existing.name || 'an existing creator profile'}.`);
                return;
            }
        }

        setIsSendingOtp(true);
        setPhoneError('');

        try {
            cleanupRecaptcha();

            recaptchaVerifierRef.current = new RecaptchaVerifier(auth, RECAPTCHA_CONTAINER_ID, {
                size: 'invisible',
                callback: () => {},
                'expired-callback': () => {
                    setPhoneError("Security check expired. Please tap 'Send OTP' again.");
                    cleanupRecaptcha();
                }
            });

            await recaptchaVerifierRef.current.render();

            const formattedPhone = `${countryCode}${cleanDigits}`;
            const confirmation = await signInWithPhoneNumber(auth, formattedPhone, recaptchaVerifierRef.current);
            setConfirmationResult(confirmation);
            setOtpSent(true);
            setOtpCooldown(30);
            setOtpDigits(['', '', '', '', '', '']);
            useStore.getState().addToast(`6-digit code sent to ${countryCode} ${cleanDigits}`, 'success');
            setTimeout(() => {
                otpInputRefs.current[0]?.focus();
            }, 150);
        } catch (err) {
            console.error("Phone verification error:", err);
            cleanupRecaptcha();
            let msg = "Could not send SMS code. Please verify your phone number format.";
            if (err.code === 'auth/invalid-phone-number') msg = "Invalid phone number format.";
            if (err.code === 'auth/too-many-requests') msg = "Too many attempts. Please wait a few minutes or try again later.";
            if (err.code === 'auth/quota-exceeded') msg = "SMS service temporarily busy. Please try again in a moment.";
            setPhoneError(msg);
            useStore.getState().addToast(msg, 'error');
        } finally {
            setIsSendingOtp(false);
        }
    };

    // ── OTP INPUT HANDLERS ───────────────────────────────────────────────────
    const handleOtpDigitChange = (val, idx) => {
        const digit = val.replace(/\D/g, '').slice(-1);
        const updated = [...otpDigits];
        updated[idx] = digit;
        setOtpDigits(updated);

        if (digit && idx < 5) {
            otpInputRefs.current[idx + 1]?.focus();
        }

        const fullCode = updated.join('');
        if (fullCode.length === 6) {
            handleVerifyOTP(fullCode);
        }
    };

    const handleOtpKeyDown = (e, idx) => {
        if (e.key === 'Backspace' && !otpDigits[idx] && idx > 0) {
            otpInputRefs.current[idx - 1]?.focus();
        }
    };

    const handleOtpPaste = (e) => {
        e.preventDefault();
        const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        if (paste) {
            const updated = paste.split('').concat(Array(6).fill('')).slice(0, 6);
            setOtpDigits(updated);
            if (paste.length === 6) {
                otpInputRefs.current[5]?.focus();
                handleVerifyOTP(paste);
            } else {
                otpInputRefs.current[paste.length]?.focus();
            }
        }
    };

    const handleVerifyOTP = async (codeToVerify) => {
        const code = codeToVerify || otpDigits.join('');
        if (code.length < 6 || !confirmationResult) return;

        setIsVerifyingOtp(true);
        setPhoneError('');

        try {
            await confirmationResult.confirm(code);
            const cleanDigits = formData.phone.replace(/\D/g, '').slice(-10);
            const fullFormattedPhone = `${countryCode} ${cleanDigits}`;
            setIsPhoneVerified(true);
            setVerifiedPhoneNumber(fullFormattedPhone);
            setOtpSent(false);
            useStore.getState().addToast("Phone number verified successfully! 🎉", 'success');
            try { confetti({ particleCount: 60, spread: 60, origin: { y: 0.5 } }); } catch (e) {}
        } catch (err) {
            console.error("OTP confirmation error:", err);
            let msg = "Incorrect 6-digit code. Please check and try again.";
            if (err.code === 'auth/code-expired') msg = "Verification code expired. Please request a new one.";
            setPhoneError(msg);
            useStore.getState().addToast(msg, 'error');
        } finally {
            setIsVerifyingOtp(false);
        }
    };

    // ── FORM VALIDATION ───────────────────────────────────────────────────────
    const validateForm = () => {
        if (!formData.name?.trim()) return "Please enter your full name.";
        if (!formData.email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) return "Please enter a valid email address.";
        
        const cleanPhone = formData.phone?.replace(/\D/g, '') || '';
        if (!cleanPhone || cleanPhone.length < 10) return "Please enter a valid 10-digit WhatsApp/contact number.";

        if (!isPhoneVerified) {
            return "Please verify your mobile number via the 6-digit OTP code before submitting.";
        }

        if (!formData.city) return "Please select your operating city.";
        if (formData.city === 'Others' && !formData.customCity?.trim()) return "Please specify your city.";
        
        if (!formData.categories) return "Please select your primary content niche.";
        if (formData.categories === 'Others' && !formData.customNiche?.trim()) return "Please specify your content niche.";

        if (!formData.instagram?.trim() && !formData.linkedin?.trim()) {
            return "Please provide at least your Instagram handle or LinkedIn profile.";
        }

        if (formData.instagram?.trim()) {
            if (formData.instagram.includes('/') || formData.instagram.includes('.com')) {
                return "Enter just your Instagram username (e.g. username, not a link).";
            }
        }

        if (duplicateWarnings.email) return duplicateWarnings.email + " Please sign in to access your dashboard.";
        if (duplicateWarnings.phone) return duplicateWarnings.phone + " Multiple accounts with the same phone number are not allowed.";
        if (duplicateWarnings.instagram) return duplicateWarnings.instagram + " Please use your own unique Instagram handle.";

        return null;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const errorMsg = validateForm();
        if (errorMsg) {
            useStore.getState().addToast(errorMsg, 'error');
            return;
        }

        setIsSubmitting(true);
        try {
            const finalCity = formData.city === 'Others' ? formData.customCity.trim() : formData.city;
            const finalNiche = formData.categories === 'Others' ? formData.customNiche.trim() : formData.categories;
            const cleanInstagram = formData.instagram ? formData.instagram.trim().replace(/^@/, '') : '';
            const cleanLinkedin = formData.linkedin ? formData.linkedin.trim() : '';
            const cleanDigits = formData.phone.replace(/\D/g, '').slice(-10);

            await addCreator({
                uid: user?.uid || null,
                email: formData.email.trim(),
                displayName: formData.name.trim(),
                name: formData.name.trim(),
                profileStatus: 'approved',
                ...formData,
                phone: `${countryCode} ${cleanDigits}`,
                instagram: cleanInstagram,
                linkedin: cleanLinkedin,
                city: finalCity,
                categories: finalNiche,
                specializations: [finalNiche],
                isVerified: false,
                isPhoneVerified: true,
                phoneVerifiedAt: new Date().toISOString()
            });

            setHasJoined(true);
            try { confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } }); } catch (err) {}
        } catch (error) {
            console.error("Error submitting application:", error);
            useStore.getState().addToast(error.message || "Couldn't submit your application. Please try again.", 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (hasJoined) {
        return (
            <div className="min-h-screen bg-[#09090b] text-white pt-36 pb-24 px-4 flex items-center justify-center">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    className="max-w-xl w-full p-8 sm:p-12 bg-zinc-900/90 border border-zinc-800 rounded-3xl text-center shadow-2xl relative overflow-hidden"
                >
                    <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-center mx-auto mb-6 text-emerald-400">
                        <CheckCircle2 size={40} />
                    </div>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-3">
                        <ShieldCheck size={14} />
                        <span>Phone & Profile Verified</span>
                    </div>
                    <h2 className="text-3xl font-extrabold tracking-tight text-white mb-3">Welcome to Newbi, {formData.name}!</h2>
                    <p className="text-zinc-400 text-sm leading-relaxed mb-6">
                        Your creator profile is active and your contact number (<strong className="text-white">{countryCode} {formData.phone.slice(-10)}</strong>) is verified. You will receive direct campaign invitations and live gig opportunities in <span className="text-emerald-400 font-semibold">{formData.city}</span>.
                    </p>

                    <div className="p-4 bg-zinc-950/60 border border-zinc-800/80 rounded-2xl text-left text-xs text-zinc-400 space-y-2 mb-8">
                        <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                            <Sparkles size={14} /> What's next?
                        </div>
                        <p>1. Our creator talent managers match your niche with active brands.</p>
                        <p>2. You receive WhatsApp briefs directly for Indiranagar, Koramangala & pan-India campaigns.</p>
                        <p>3. Zero agency commission on your creator payouts.</p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                        <Link
                            to="/campaigns"
                            className="flex-1 h-12 bg-white hover:bg-zinc-200 text-zinc-950 font-bold rounded-xl flex items-center justify-center gap-2 text-sm transition-all"
                        >
                            <span>Browse Live Campaigns</span>
                            <ArrowRight size={16} />
                        </Link>
                        <Link
                            to="/creator"
                            className="flex-1 h-12 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold rounded-xl flex items-center justify-center text-sm transition-all"
                        >
                            Return to Creator Hub
                        </Link>
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#09090b] text-white pt-28 pb-32 px-4 relative selection:bg-emerald-500 selection:text-black">
            {/* Hidden Recaptcha Anchor */}
            <div id={RECAPTCHA_CONTAINER_ID} className="invisible pointer-events-none fixed bottom-0 right-0 z-0"></div>

            {/* Subtle Ambient Background */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
                <div className="absolute bottom-10 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
            </div>

            <div className="relative z-10 w-full max-w-3xl mx-auto space-y-8">
                {/* Back Link */}
                <div className="flex items-center justify-between">
                    <Link
                        to="/creator"
                        className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
                    >
                        <ArrowLeft size={14} />
                        <span>Back to Creator Hub</span>
                    </Link>

                    {user ? (
                        <div className="flex items-center gap-2 text-xs text-zinc-400">
                            <span className="w-2 h-2 rounded-full bg-emerald-400" />
                            <span>Signed in as <strong className="text-zinc-200">{user.displayName || user.email}</strong></span>
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={() => setAuthModal(true)}
                            className="text-xs font-semibold text-zinc-400 hover:text-white transition-colors underline"
                        >
                            Already registered? Sign in
                        </button>
                    )}
                </div>

                {/* Header */}
                <div className="text-center space-y-3">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">
                        <Sparkles size={12} />
                        <span>Quick 45-Second Onboarding</span>
                    </div>
                    <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
                        Join Newbi Creator Network
                    </h1>
                    <p className="text-zinc-400 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
                        Get matched with verified brand campaigns, live concert passes, and experiential gigs in your city. Free forever.
                    </p>
                </div>

                {/* Trust & Privacy Guarantee Card */}
                <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 sm:p-5 flex items-start sm:items-center gap-3.5 text-zinc-300 shadow-sm">
                    <ShieldCheck className="text-emerald-400 shrink-0 mt-0.5 sm:mt-0" size={22} />
                    <div className="text-xs sm:text-sm leading-relaxed">
                        <span className="font-semibold text-white">Creator Protection Promise:</span> We never ask for your account passwords or permissions to post on your channels. Your contact info is strictly used for official campaign matching.
                    </div>
                </div>

                {/* Registration Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Card 1: Creator Basics */}
                    <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-lg backdrop-blur-xl">
                        <div className="flex items-center gap-3 pb-4 border-b border-zinc-800/80">
                            <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-200">
                                <User size={20} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white">1. Basic Details</h3>
                                <p className="text-xs text-zinc-400">Tell us who you are and where you create.</p>
                            </div>
                        </div>

                        {/* Profile Photo (Optional) */}
                        <div className="flex items-center gap-4">
                            <div className="relative group shrink-0">
                                <div className="w-20 h-20 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-center overflow-hidden">
                                    {formData.profilePicture ? (
                                        <img src={formData.profilePicture} alt="Preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <Camera size={24} className="text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                                    )}
                                </div>
                                <label className="absolute -bottom-1.5 -right-1.5 w-8 h-8 bg-white text-zinc-950 rounded-lg flex items-center justify-center cursor-pointer hover:bg-zinc-200 transition-colors shadow-md">
                                    {isUploadingPhoto ? <LoadingSpinner size="xs" color="black" /> : <Upload size={14} />}
                                    <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={isUploadingPhoto} />
                                </label>
                            </div>
                            <div>
                                <h4 className="text-xs font-semibold text-zinc-200">Profile Photo <span className="text-zinc-500 font-normal">(Optional)</span></h4>
                                <p className="text-[11px] text-zinc-400 mt-0.5">Helps brand managers recognize your profile faster.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-zinc-300">Full Name / Stage Name *</label>
                                <Input
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    placeholder="e.g. Aisha Sharma"
                                    className="h-12 bg-zinc-950/80 border-zinc-800 rounded-xl text-sm px-4 focus:border-white"
                                    required
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-zinc-300">Email Address *</label>
                                <div className="relative">
                                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                                    <Input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        placeholder="aisha@gmail.com"
                                        className="h-12 pl-10 pr-4 bg-zinc-950/80 border-zinc-800 rounded-xl text-sm focus:border-white"
                                        required
                                    />
                                </div>
                                {duplicateWarnings.email && (
                                    <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300 flex items-center justify-between">
                                        <span>{duplicateWarnings.email}</span>
                                        <button
                                            type="button"
                                            onClick={() => setAuthModal(true)}
                                            className="underline font-bold text-white shrink-0 ml-2"
                                        >
                                            Sign In
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Mobile Number & OTP Verification Section */}
                            <div className="space-y-2 sm:col-span-2">
                                <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
                                    <span>WhatsApp / Contact Number *</span>
                                    {isPhoneVerified && (
                                        <span className="text-emerald-400 font-bold text-[11px] flex items-center gap-1">
                                            <ShieldCheck size={14} /> Verified Number
                                        </span>
                                    )}
                                </label>

                                {isPhoneVerified ? (
                                    /* Verified State */
                                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                                                <CheckCircle2 size={18} />
                                            </div>
                                            <div>
                                                <div className="text-xs font-bold text-white flex items-center gap-2">
                                                    <span>{verifiedPhoneNumber || `${countryCode} ${formData.phone.slice(-10)}`}</span>
                                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 uppercase font-extrabold tracking-wider">Verified</span>
                                                </div>
                                                <div className="text-[11px] text-zinc-400">Verified for direct WhatsApp campaign briefs & payouts.</div>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsPhoneVerified(false);
                                                setVerifiedPhoneNumber('');
                                                setOtpSent(false);
                                            }}
                                            className="text-xs text-zinc-400 hover:text-white underline font-semibold px-2 py-1 transition-colors"
                                        >
                                            Change Number
                                        </button>
                                    </div>
                                ) : (
                                    /* Unverified Phone Input & OTP Actions */
                                    <div className="space-y-3">
                                        <div className="flex gap-2">
                                            <CustomSelect
                                                value={countryCode}
                                                onChange={(e) => setCountryCode(e.target.value)}
                                                options={COUNTRY_OPTIONS}
                                                name="countryCode"
                                                placeholder="+91"
                                                isCountryCode
                                            />
                                            <div className="relative flex-1">
                                                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                                                <Input
                                                    type="tel"
                                                    name="phone"
                                                    value={formData.phone}
                                                    onChange={handleChange}
                                                    disabled={otpSent || isSendingOtp}
                                                    placeholder="98765 43210"
                                                    maxLength={15}
                                                    className="h-12 pl-10 pr-4 bg-zinc-950/80 border-zinc-800 rounded-xl text-sm focus:border-white disabled:opacity-60"
                                                    required
                                                />
                                            </div>
                                            {!otpSent && (
                                                <Button
                                                    type="button"
                                                    onClick={handleSendOTP}
                                                    disabled={isSendingOtp || formData.phone.replace(/\D/g, '').length < 10}
                                                    className="h-12 px-4 sm:px-6 bg-white hover:bg-zinc-200 text-zinc-950 font-bold rounded-xl text-xs sm:text-sm shrink-0 transition-all disabled:opacity-40"
                                                >
                                                    {isSendingOtp ? <LoadingSpinner size="xs" color="black" /> : 'Send OTP'}
                                                </Button>
                                            )}
                                        </div>

                                        {/* OTP Input Block */}
                                        <AnimatePresence>
                                            {otpSent && (
                                                <motion.div
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: 'auto' }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                    className="p-4 bg-zinc-950/90 border border-zinc-800 rounded-xl space-y-3"
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xs font-semibold text-zinc-300">
                                                            Enter 6-digit code sent to <strong className="text-white">{countryCode} {formData.phone.slice(-10)}</strong>
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() => { setOtpSent(false); setOtpDigits(['','','','','','']); }}
                                                            className="text-[11px] text-zinc-400 hover:text-white underline"
                                                        >
                                                            Edit Number
                                                        </button>
                                                    </div>

                                                    {/* 6 Digit Inputs */}
                                                    <div className="flex gap-2 justify-between max-w-sm" onPaste={handleOtpPaste}>
                                                        {otpDigits.map((digit, index) => (
                                                            <input
                                                                key={index}
                                                                ref={el => otpInputRefs.current[index] = el}
                                                                type="text"
                                                                inputMode="numeric"
                                                                maxLength={1}
                                                                value={digit}
                                                                onChange={(e) => handleOtpDigitChange(e.target.value, index)}
                                                                onKeyDown={(e) => handleOtpKeyDown(e, index)}
                                                                className="w-11 h-12 text-center bg-zinc-900 border border-zinc-700 rounded-xl text-lg font-bold text-white focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 focus:outline-none transition-all"
                                                            />
                                                        ))}
                                                    </div>

                                                    <div className="flex items-center justify-between text-xs pt-1">
                                                        {isVerifyingOtp ? (
                                                            <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                                                                <LoadingSpinner size="xs" color="emerald" />
                                                                <span>Verifying code...</span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-[11px] text-zinc-400">Auto-submits on 6th digit</span>
                                                        )}

                                                        <div>
                                                            {otpCooldown > 0 ? (
                                                                <span className="text-[11px] text-zinc-400">Resend in {otpCooldown}s</span>
                                                            ) : (
                                                                <button
                                                                    type="button"
                                                                    onClick={handleSendOTP}
                                                                    disabled={isSendingOtp}
                                                                    className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 underline"
                                                                >
                                                                    Resend Code
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        {phoneError && (
                                            <p className="text-xs text-red-400 font-medium">{phoneError}</p>
                                        )}

                                        <p className="text-[11px] text-zinc-400">
                                            🔒 We send campaign briefs & payment confirmations to this number. Verification is required.
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-1.5 sm:col-span-2">
                                <label className="text-xs font-semibold text-zinc-300">Operating City *</label>
                                <CustomSelect
                                    value={formData.city}
                                    onChange={handleChange}
                                    options={PREDEFINED_CITIES}
                                    name="city"
                                    placeholder="Select your city"
                                    icon={MapPin}
                                />
                            </div>

                            {formData.city === 'Others' && (
                                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="space-y-1.5 sm:col-span-2">
                                    <label className="text-xs font-semibold text-zinc-300">Specify City Name</label>
                                    <Input
                                        name="customCity"
                                        value={formData.customCity}
                                        onChange={handleChange}
                                        placeholder="e.g. Pune, Mysore, Chandigarh"
                                        className="h-12 bg-zinc-950/80 border-zinc-800 rounded-xl text-sm px-4 focus:border-white"
                                    />
                                </motion.div>
                            )}
                        </div>
                    </div>

                    {/* Card 2: Content Profile & Socials */}
                    <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-lg backdrop-blur-xl">
                        <div className="flex items-center gap-3 pb-4 border-b border-zinc-800/80">
                            <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-200">
                                <Instagram size={20} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white">2. Content & Social Handles</h3>
                                <p className="text-xs text-zinc-400">Connect your channels to match with relevant brand niches.</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-zinc-300">Primary Content Niche *</label>
                                <CustomSelect
                                    value={formData.categories}
                                    onChange={handleChange}
                                    options={NICHES}
                                    name="categories"
                                    placeholder="Select your niche"
                                    icon={Tag}
                                />
                            </div>

                            {formData.categories === 'Others' && (
                                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="space-y-1.5">
                                    <label className="text-xs font-semibold text-zinc-300">Specify Niche</label>
                                    <Input
                                        name="customNiche"
                                        value={formData.customNiche}
                                        onChange={handleChange}
                                        placeholder="e.g. Automotive, Parenting, Podcasting"
                                        className="h-12 bg-zinc-950/80 border-zinc-800 rounded-xl text-sm px-4 focus:border-white"
                                    />
                                </motion.div>
                            )}

                            {(formData.categories === 'Student/Campus Creator' || formData.categories === 'College Pages') && (
                                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="space-y-1.5">
                                    <label className="text-xs font-semibold text-emerald-400">College / University Name</label>
                                    <Input
                                        name="collegeName"
                                        value={formData.collegeName}
                                        onChange={handleChange}
                                        placeholder="e.g. Christ University, IIT Bangalore, Delhi University"
                                        className="h-12 bg-zinc-950/80 border-zinc-800 rounded-xl text-sm px-4 focus:border-white"
                                    />
                                </motion.div>
                            )}

                            {/* Instagram */}
                            <div className="p-4 bg-zinc-950/60 border border-zinc-800/80 rounded-xl space-y-3">
                                <div className="flex items-center gap-2 text-xs font-bold text-pink-400">
                                    <Instagram size={16} />
                                    <span>Instagram Profile</span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-[11px] font-medium text-zinc-400">Handle (without @)</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 font-bold text-sm">@</span>
                                            <Input
                                                name="instagram"
                                                value={formData.instagram}
                                                onChange={handleChange}
                                                placeholder="yourhandle"
                                                className="h-11 pl-7 pr-3 bg-zinc-900 border-zinc-800 rounded-lg text-sm focus:border-pink-500"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[11px] font-medium text-zinc-400">Approx. Followers</label>
                                        <Input
                                            type="number"
                                            name="instagramFollowers"
                                            value={formData.instagramFollowers}
                                            onChange={handleChange}
                                            placeholder="e.g. 5000"
                                            className="h-11 bg-zinc-900 border-zinc-800 rounded-lg text-sm px-3 focus:border-pink-500"
                                        />
                                    </div>
                                </div>
                                {duplicateWarnings.instagram && (
                                    <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300 flex items-center justify-between">
                                        <span>{duplicateWarnings.instagram}</span>
                                        <button
                                            type="button"
                                            onClick={() => setAuthModal(true)}
                                            className="underline font-bold text-white shrink-0 ml-2"
                                        >
                                            Sign In
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Optional Channels */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                                <div className="space-y-1">
                                    <label className="text-[11px] font-medium text-zinc-400 flex items-center gap-1.5">
                                        <Linkedin size={12} className="text-blue-400" /> LinkedIn Profile (Optional)
                                    </label>
                                    <Input
                                        name="linkedin"
                                        value={formData.linkedin}
                                        onChange={handleChange}
                                        placeholder="https://linkedin.com/in/username"
                                        className="h-11 bg-zinc-950/80 border-zinc-800 rounded-lg text-sm px-3 focus:border-blue-500"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[11px] font-medium text-zinc-400 flex items-center gap-1.5">
                                        <Youtube size={12} className="text-red-400" /> YouTube Channel (Optional)
                                    </label>
                                    <Input
                                        name="youtube"
                                        value={formData.youtube}
                                        onChange={handleChange}
                                        placeholder="Channel link or handle"
                                        className="h-11 bg-zinc-950/80 border-zinc-800 rounded-lg text-sm px-3 focus:border-red-500"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Card 3: Collaboration Preferences */}
                    <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-lg backdrop-blur-xl">
                        <div className="flex items-center gap-3 pb-4 border-b border-zinc-800/80">
                            <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-200">
                                <FileText size={20} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white">3. Collaboration Preferences</h3>
                                <p className="text-xs text-zinc-400">Help brands understand how you like to collaborate.</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-zinc-300">Short Bio / What makes your content unique?</label>
                                <textarea
                                    name="bio"
                                    value={formData.bio}
                                    onChange={handleChange}
                                    placeholder="e.g. Bangalore-based lifestyle creator focused on affordable fashion, cafes, and city aesthetics. High engagement reels & stories."
                                    rows={3}
                                    className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl p-3.5 text-sm text-zinc-200 placeholder-zinc-500 focus:border-white focus:outline-none resize-none"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-zinc-300">Collaboration Type</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {[
                                            { id: 'both', label: 'Both' },
                                            { id: 'paid', label: 'Paid Only' },
                                            { id: 'barter', label: 'Barter' }
                                        ].map((opt) => (
                                            <button
                                                key={opt.id}
                                                type="button"
                                                onClick={() => setFormData(p => ({ ...p, doBarter: opt.id }))}
                                                className={cn(
                                                    "h-11 rounded-xl text-xs font-semibold border transition-all",
                                                    formData.doBarter === opt.id
                                                        ? "bg-white text-zinc-950 border-white font-bold"
                                                        : "bg-zinc-950/80 text-zinc-400 border-zinc-800 hover:text-white"
                                                )}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-zinc-300">Typical Rates <span className="text-zinc-500 font-normal">(Optional)</span></label>
                                    <Input
                                        name="commercials"
                                        value={formData.commercials}
                                        onChange={handleChange}
                                        placeholder="e.g. ₹5,000/Reel or Open"
                                        className="h-11 bg-zinc-950/80 border-zinc-800 rounded-xl text-sm px-4 focus:border-white"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5 pt-2 border-t border-zinc-800/80">
                                <label className="text-[11px] font-medium text-zinc-400 flex justify-between">
                                    <span>Referral Code (Optional)</span>
                                    {isReferralCodeLocked && <span className="text-emerald-400">Referral Applied 🔒</span>}
                                </label>
                                <Input
                                    name="referredBy"
                                    value={formData.referredBy}
                                    onChange={handleChange}
                                    disabled={isReferralCodeLocked}
                                    placeholder="Enter creator or friend's invite code"
                                    className="h-11 bg-zinc-950/80 border-zinc-800 rounded-xl text-sm px-4 focus:border-white disabled:opacity-60"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <div className="pt-2">
                        <Button
                            type="submit"
                            disabled={isSubmitting || isUploadingPhoto || !isPhoneVerified}
                            className="w-full h-14 bg-white hover:bg-zinc-200 text-zinc-950 font-bold rounded-2xl flex items-center justify-center gap-3 text-base shadow-xl transition-all active:scale-[0.99] disabled:opacity-40"
                        >
                            {isSubmitting ? (
                                <>
                                    <LoadingSpinner size="sm" color="black" />
                                    <span>Submitting Application...</span>
                                </>
                            ) : (
                                <>
                                    <span>Submit Verified Creator Application</span>
                                    <ArrowRight size={18} />
                                </>
                            )}
                        </Button>
                        {!isPhoneVerified && (
                            <p className="text-center text-[11px] text-amber-400/90 mt-2 font-medium">
                                ⚠️ Please verify your phone number above via 6-digit OTP before submitting.
                            </p>
                        )}
                        <p className="text-center text-[11px] text-zinc-500 mt-2">
                            By applying, you agree to receive official campaign briefs. No exclusivity required.
                        </p>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreatorJoin;
