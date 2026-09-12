import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../lib/store';
import { useStoreSubscription } from '../hooks/useStoreSubscription';
import { auth } from '../lib/firebase';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import confetti from 'canvas-confetti';
import { PREDEFINED_CITIES } from '../lib/constants';
import { motion, AnimatePresence } from 'framer-motion';
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right';
import ArrowLeft from 'lucide-react/dist/esm/icons/arrow-left';
import Instagram from 'lucide-react/dist/esm/icons/instagram';
import Youtube from 'lucide-react/dist/esm/icons/youtube';
import Linkedin from 'lucide-react/dist/esm/icons/linkedin';
import Twitter from 'lucide-react/dist/esm/icons/twitter';
import Upload from 'lucide-react/dist/esm/icons/upload';
import CheckCircle2 from 'lucide-react/dist/esm/icons/check-circle-2';
import Check from 'lucide-react/dist/esm/icons/check';
import Phone from 'lucide-react/dist/esm/icons/phone';
import Mail from 'lucide-react/dist/esm/icons/mail';
import MapPin from 'lucide-react/dist/esm/icons/map-pin';
import ShieldCheck from 'lucide-react/dist/esm/icons/shield-check';
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down';
import User from 'lucide-react/dist/esm/icons/user';
import FileText from 'lucide-react/dist/esm/icons/file-text';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import Camera from 'lucide-react/dist/esm/icons/camera';
import TrendingUp from 'lucide-react/dist/esm/icons/trending-up';
import Award from 'lucide-react/dist/esm/icons/award';
import { useNavigate, Link } from 'react-router-dom';
import { cn, normalizePhoneNumber } from '../lib/utils';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import useDynamicMeta from '../hooks/useDynamicMeta';

// Rich niche definitions with icons and descriptions
const NICHE_OPTIONS = [
    { id: 'Fashion & Luxury', label: 'Fashion & Luxury', icon: '👗', color: 'from-pink-500/20 to-purple-500/10' },
    { id: 'Tech & Gaming', label: 'Tech & Gaming', icon: '🎮', color: 'from-blue-500/20 to-cyan-500/10' },
    { id: 'Travel & Lifestyle', label: 'Travel & Lifestyle', icon: '✈️', color: 'from-amber-500/20 to-orange-500/10' },
    { id: 'Beauty & Fitness', label: 'Beauty & Fitness', icon: '💄', color: 'from-rose-500/20 to-pink-500/10' },
    { id: 'Food & Beverage', label: 'Food & Dining', icon: '🍔', color: 'from-yellow-500/20 to-amber-500/10' },
    { id: 'Comedy & Entertainment', label: 'Comedy & Memes', icon: '🎭', color: 'from-purple-500/20 to-indigo-500/10' },
    { id: 'Student/Campus Creator', label: 'Campus & College', icon: '🎓', color: 'from-emerald-500/20 to-teal-500/10' },
    { id: 'College Pages', label: 'College Pages / Hubs', icon: '🏫', color: 'from-teal-500/20 to-blue-500/10' },
    { id: 'Startup & Entrepreneurship', label: 'Startup & Founder', icon: '🚀', color: 'from-violet-500/20 to-purple-500/10' },
    { id: 'Finance & Business', label: 'Finance & Career', icon: '📈', color: 'from-green-500/20 to-emerald-500/10' },
    { id: 'Music & Dance', label: 'Music & Dance', icon: '🎵', color: 'from-fuchsia-500/20 to-pink-500/10' },
    { id: 'Others', label: 'Other Specialization', icon: '✨', color: 'from-zinc-500/20 to-zinc-700/10' }
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
    { value: '+91', label: '🇮🇳 +91' },
    { value: '+1', label: '🇺🇸 +1' },
    { value: '+44', label: '🇬🇧 +44' },
    { value: '+971', label: '🇦🇪 +971' },
    { value: '+61', label: '🇦🇺 +61' }
];


const slideVariants = {
    enter: (direction) => ({
        x: direction > 0 ? 30 : -30,
        opacity: 0
    }),
    center: {
        x: 0,
        opacity: 1
    },
    exit: (direction) => ({
        x: direction < 0 ? 30 : -30,
        opacity: 0
    })
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

    // Step state: 1: Identity, 2: Contact/OTP, 3: Niches & Socials, 4: Collab & Submit
    const [step, setStep] = useState(1);
    const [direction, setDirection] = useState(1);

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
    const [isCountryCodeOpen, setIsCountryCodeOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
    const [hasJoined, setHasJoined] = useState(false);
    const [isReferralCodeLocked, setIsReferralCodeLocked] = useState(false);

    // Phone OTP Verification States
    const [isPhoneVerified, setIsPhoneVerified] = useState(false);
    const [smsFailed, setSmsFailed] = useState(false);
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
    const recaptchaContainerId = useRef(`recaptcha-creator-${Math.random().toString(36).slice(2, 9)}`).current;
    const countryCodeRef = useRef(null);

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
        const container = document.getElementById(recaptchaContainerId);
        if (container) {
            container.remove();
        }
    };

    useEffect(() => {
        return () => cleanupRecaptcha();
    }, []);

    // Close popovers on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (countryCodeRef.current && !countryCodeRef.current.contains(e.target)) {
                setIsCountryCodeOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // If already registered creator and logged in, automatic redirect after small grace period
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

    // Smart detection of existing creator accounts across logged-in user, email, phone, and social handle
    const matchedExistingCreator = React.useMemo(() => {
        if (!creators || creators.length === 0) return null;

        // 1. Check current logged in user
        if (user) {
            const userPhoneNorm = user.phoneNumber ? normalizePhoneNumber(user.phoneNumber) : null;
            const userEmailNorm = user.email ? user.email.toLowerCase() : null;
            const match = creators.find(c => 
                c.uid === user.uid || 
                (userEmailNorm && c.email && c.email.toLowerCase() === userEmailNorm) ||
                (userPhoneNorm && normalizePhoneNumber(c.phone) === userPhoneNorm)
            );
            if (match) return match;
        }

        // 2. Check entered email
        if (formData.email?.trim()) {
            const normEmail = formData.email.trim().toLowerCase();
            const match = creators.find(c => c.email && c.email.trim().toLowerCase() === normEmail);
            if (match) return match;
        }

        // 3. Check entered phone number
        if (formData.phone) {
            const normPhone = normalizePhoneNumber(formData.phone);
            if (normPhone && normPhone.length >= 10) {
                const match = creators.find(c => normalizePhoneNumber(c.phone) === normPhone);
                if (match) return match;
            }
        }

        // 4. Check entered Instagram
        if (formData.instagram?.trim()) {
            const cleanInsta = formData.instagram.trim().replace(/^@/, '').toLowerCase();
            if (cleanInsta.length >= 3) {
                const match = creators.find(c => c.instagram && c.instagram.trim().replace(/^@/, '').toLowerCase() === cleanInsta);
                if (match) return match;
            }
        }

        return null;
    }, [formData.email, formData.phone, formData.instagram, creators, user]);

    // Real-time duplicate warnings for field labels
    const duplicateWarnings = React.useMemo(() => {
        if (!creators || creators.length === 0) return {};
        const warnings = {};

        // Check Email
        if (formData.email?.trim()) {
            const normEmail = formData.email.trim().toLowerCase();
            const match = creators.find(c => c.uid !== user?.uid && c.email && c.email.trim().toLowerCase() === normEmail);
            if (match) {
                warnings.email = `Registered to ${match.displayName || match.name || 'an existing creator'}.`;
            }
        }

        // Check Phone
        if (formData.phone) {
            const normPhone = normalizePhoneNumber(formData.phone);
            if (normPhone && normPhone.length >= 10) {
                const match = creators.find(c => c.uid !== user?.uid && normalizePhoneNumber(c.phone) === normPhone);
                if (match) {
                    warnings.phone = `Linked to ${match.displayName || match.name || 'an existing creator'}.`;
                }
            }
        }

        // Check Instagram
        if (formData.instagram?.trim()) {
            const cleanInsta = formData.instagram.trim().replace(/^@/, '').toLowerCase();
            const match = creators.find(c => c.uid !== user?.uid && c.instagram && c.instagram.trim().replace(/^@/, '').toLowerCase() === cleanInsta);
            if (match) {
                warnings.instagram = `@${cleanInsta} is registered to ${match.displayName || match.name || 'an existing creator'}.`;
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
            if (isPhoneVerified) {
                setIsPhoneVerified(false);
                setVerifiedPhoneNumber('');
                setOtpSent(false);
            }
            setSmsFailed(false);
            setPhoneError('');
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
            useStore.getState().addToast("Couldn't upload photo. You can continue without it.", 'error');
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
                setPhoneError(`This number is linked to ${existing.displayName || existing.name || 'an existing creator'}.`);
                return;
            }
        }

        setIsSendingOtp(true);
        setPhoneError('');

        try {
            cleanupRecaptcha();

            // Create a clean, dynamic container element for RecaptchaVerifier
            const container = document.createElement('div');
            container.id = recaptchaContainerId;
            container.className = "fixed bottom-4 right-4 z-[9999]";
            document.body.appendChild(container);

            recaptchaVerifierRef.current = new RecaptchaVerifier(auth, container, {
                size: 'invisible',
                callback: () => {},
                'expired-callback': () => {
                    setPhoneError("Security check expired. Please tap 'Send Code' again.");
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
            setSmsFailed(false);
            useStore.getState().addToast(`6-digit code sent to ${countryCode} ${cleanDigits}`, 'success');
            setTimeout(() => {
                otpInputRefs.current[0]?.focus();
            }, 150);
        } catch (err) {
            console.error("Phone verification error:", err);
            cleanupRecaptcha();
            setSmsFailed(true);

            let msg = "Could not send SMS code right now. You can continue and verify via email.";
            const code = err?.code || err?.message || '';

            if (code.includes('auth/invalid-phone-number')) {
                msg = "Invalid phone number format. Please check your entered digits.";
            } else if (code.includes('auth/captcha-check-failed') || code.includes('captcha') || code.includes('already rendered')) {
                msg = "Security check could not be completed. You can tap 'Send Code' again or simply continue with email verification.";
            } else if (code.includes('auth/too-many-requests')) {
                msg = "Too many SMS requests sent. Please wait a few moments or continue with email verification.";
            } else if (code.includes('auth/quota-exceeded')) {
                msg = "SMS daily limit reached. You can continue and verify via email link upon submitting.";
            } else if (code.includes('auth/network-request-failed')) {
                msg = "Network connection error. Please check your internet connection.";
            } else if (code.includes('auth/unauthorized-domain')) {
                msg = "SMS domain issue. You can proceed and verify via email link.";
            } else if (err.message && !err.message.includes('auth/')) {
                msg = err.message;
            }

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
            useStore.getState().addToast("Phone verified successfully! 🎉", 'success');
            try { confetti({ particleCount: 50, spread: 60, origin: { y: 0.5 } }); } catch (e) {}
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

    // ── STEP VALIDATION & NAVIGATION ─────────────────────────────────────────
    const nextStep = () => {
        if (step === 1) {
            if (!formData.name.trim()) {
                useStore.getState().addToast("Please enter your name.", 'warning');
                return;
            }
            if (!formData.city) {
                useStore.getState().addToast("Please select your city.", 'warning');
                return;
            }
            if (formData.city === 'Others' && !formData.customCity.trim()) {
                useStore.getState().addToast("Please enter your city name.", 'warning');
                return;
            }
        }

        if (step === 2) {
            if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
                useStore.getState().addToast("Please enter a valid email address.", 'warning');
                return;
            }
            const cleanDigits = formData.phone.replace(/\D/g, '').slice(-10);
            if (!cleanDigits || cleanDigits.length < 10) {
                useStore.getState().addToast("Please enter a valid 10-digit mobile number.", 'warning');
                return;
            }
        }

        if (step === 3) {
            if (!formData.categories) {
                useStore.getState().addToast("Please select your primary niche.", 'warning');
                return;
            }
            if (formData.categories === 'Others' && !formData.customNiche.trim()) {
                useStore.getState().addToast("Please specify your content niche.", 'warning');
                return;
            }
            if (!formData.instagram.trim() && !formData.linkedin.trim()) {
                useStore.getState().addToast("Please provide at least your Instagram or LinkedIn.", 'warning');
                return;
            }
        }

        setDirection(1);
        setStep(prev => Math.min(prev + 1, 4));
    };

    const prevStep = () => {
        setDirection(-1);
        setStep(prev => Math.max(prev - 1, 1));
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        
        if (!formData.name.trim() || !formData.email.trim() || !formData.phone.trim() || !formData.city || !formData.categories) {
            useStore.getState().addToast("Please complete all required fields.", 'error');
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
                isPhoneVerified: isPhoneVerified,
                phoneVerifiedAt: isPhoneVerified ? new Date().toISOString() : null
            });

            setHasJoined(true);
            try { confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } }); } catch (err) {}
        } catch (error) {
            console.error("Error submitting application:", error);
            useStore.getState().addToast(error.message || "Couldn't submit application. Please try again.", 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    // ── SUCCESS STATE ────────────────────────────────────────────────────────
    if (hasJoined) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-[#050505] text-gray-900 dark:text-white pt-24 pb-20 px-4 flex items-center justify-center transition-colors duration-300">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    className="max-w-lg w-full p-6 sm:p-10 bg-white dark:bg-white/[0.02] border border-gray-200 dark:border-white/[0.08] rounded-3xl text-center shadow-xl dark:shadow-2xl relative overflow-hidden backdrop-blur-2xl"
                >
                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-neon-green/10 border border-neon-green/30 rounded-2xl flex items-center justify-center mx-auto mb-5 text-neon-green">
                        <CheckCircle2 size={36} />
                    </div>

                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neon-green/10 border border-neon-green/20 text-neon-green text-[10px] font-bold uppercase tracking-wider mb-3">
                        <ShieldCheck size={12} />
                        <span>{isPhoneVerified ? "Profile & Contact Verified" : "Application Submitted"}</span>
                    </div>

                    <h2 className="text-2xl sm:text-3xl font-black font-heading tracking-tight text-gray-900 dark:text-white mb-2">
                        Welcome to Newbi, {formData.name}!
                    </h2>

                    <p className="text-gray-600 dark:text-white/60 text-xs sm:text-sm leading-relaxed mb-6">
                        {isPhoneVerified ? (
                            <>Your creator profile is active for campaigns in <strong className="text-gray-900 dark:text-white">{formData.city}</strong>. Direct briefs will be sent to <span className="text-neon-green font-mono">{countryCode} {formData.phone.slice(-10)}</span>.</>
                        ) : (
                            <>Your application has been received! We sent a confirmation &amp; verification link to your email (<strong className="text-gray-900 dark:text-white">{formData.email}</strong>). Tap it to activate priority campaign matching. Direct briefs will be sent to <span className="text-neon-green font-mono">{countryCode} {formData.phone.slice(-10)}</span>.</>
                        )}
                    </p>

                    <div className="p-4 bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/[0.05] rounded-2xl text-left text-xs text-gray-600 dark:text-white/50 space-y-2 mb-6">
                        <div className="flex items-center gap-2 text-neon-green font-bold text-[11px] uppercase tracking-wider">
                            <Sparkles size={13} /> Next Steps
                        </div>
                        <p>1. Talent managers match your niche ({formData.categories}) with active briefs.</p>
                        <p>2. Direct invitations sent via WhatsApp for pan-India gigs & event passes.</p>
                        <p>3. 100% payout directly to you with 0% commission.</p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2.5">
                        <Link
                            to="/campaigns"
                            className="flex-1 h-11 bg-black text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200 font-bold rounded-xl flex items-center justify-center gap-2 text-xs uppercase tracking-wider transition-all shadow-lg"
                        >
                            <span>Browse Campaigns</span>
                            <ArrowRight size={14} />
                        </Link>
                        <Link
                            to="/creator"
                            className="flex-1 h-11 bg-white dark:bg-white/[0.05] hover:bg-gray-100 dark:hover:bg-white/10 text-gray-900 dark:text-white font-bold rounded-xl flex items-center justify-center text-xs uppercase tracking-wider transition-all border border-gray-200 dark:border-white/[0.08]"
                        >
                            Return to Hub
                        </Link>
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#050505] text-gray-900 dark:text-white pt-24 pb-28 px-4 relative selection:bg-neon-pink selection:text-black transition-colors duration-300">


            {/* Ambient Background Glows */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-gradient-to-b from-neon-pink/[0.04] to-transparent rounded-full blur-3xl" />
                <div className="absolute bottom-10 right-1/4 w-[400px] h-[300px] bg-neon-green/[0.03] rounded-full blur-3xl" />
            </div>

            <div className="relative z-10 w-full max-w-2xl mx-auto space-y-6">
                
                {/* Top Nav Header */}
                <div className="flex items-center justify-between">
                    <Link
                        to="/creator"
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-900 dark:text-white/50 hover:text-gray-900 dark:hover:text-white transition-colors uppercase tracking-wider"
                    >
                        <ArrowLeft size={13} />
                        <span>Creator Hub</span>
                    </Link>

                    {user ? (
                        <div className="flex items-center gap-2 text-xs text-gray-900 dark:text-white/70 bg-black/5 dark:bg-white/5 px-3.5 py-1.5 rounded-full border border-black/10 dark:border-white/10">
                            <span className="w-2 h-2 rounded-full bg-neon-green" />
                            <span className="truncate max-w-[160px] font-medium">{user.displayName || user.email}</span>
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={() => setAuthModal(true)}
                            className="px-4 py-2 rounded-xl bg-black/10 dark:bg-white/10 hover:bg-white text-gray-900 dark:text-white hover:text-black transition-all border border-white/15 text-[11px] font-black uppercase tracking-wider shadow-sm flex items-center gap-2 active:scale-95"
                        >
                            <span>Already a Creator? Sign In</span>
                        </button>
                    )}
                </div>

                {/* Real-time Existing Creator Banner */}
                {matchedExistingCreator && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 sm:p-5 rounded-3xl bg-neon-green/10 border border-neon-green/30 backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[0_0_30px_rgba(57,255,20,0.15)]"
                    >
                        <div className="flex items-center gap-3.5">
                            <div className="w-10 h-10 rounded-2xl bg-neon-green/20 text-neon-green flex items-center justify-center shrink-0">
                                <Sparkles size={20} />
                            </div>
                            <div>
                                <p className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                                    <span>Existing Creator Profile Found!</span>
                                </p>
                                <p className="text-[11px] text-gray-600 dark:text-zinc-300 mt-0.5">
                                    Registered to <strong className="text-neon-green">{matchedExistingCreator.displayName || matchedExistingCreator.name}</strong> {matchedExistingCreator.instagram ? `(@${matchedExistingCreator.instagram.replace(/^@/, '')})` : ''}.
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                if (user && (user.uid === matchedExistingCreator.uid || user.email === matchedExistingCreator.email)) {
                                    navigate('/creator-dashboard');
                                } else {
                                    setAuthModal(true);
                                }
                            }}
                            className="px-5 py-2.5 rounded-xl bg-neon-green text-black font-black uppercase tracking-wider text-[11px] hover:bg-white transition-all shrink-0 flex items-center justify-center gap-2 shadow-lg active:scale-95"
                        >
                            <span>{user ? 'Open Dashboard' : 'Sign In to Dashboard'}</span>
                            <ArrowRight size={14} />
                        </button>
                    </motion.div>
                )}

                {/* Stepper Card */}
                <div className="bg-gray-50/80 dark:bg-white/[0.02] border border-black/[0.08] dark:border-white/[0.06] rounded-3xl p-5 sm:p-8 backdrop-blur-2xl shadow-2xl space-y-6">
                    
                    {/* Progress Bar & Header */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-[9px] font-bold text-neon-pink uppercase tracking-[0.2em] bg-neon-pink/10 border border-neon-pink/20 px-2.5 py-1 rounded-full">
                                Step {step} of 4 • {step === 1 ? 'Identity' : step === 2 ? 'Verification' : step === 3 ? 'Creative Footprint' : 'Terms & Review'}
                            </span>
                            <span className="text-[10px] font-bold text-gray-900 dark:text-white/30 tracking-wider">
                                {Math.round((step / 4) * 100)}% Complete
                            </span>
                        </div>

                        {/* Animated Progress Line */}
                        <div className="w-full h-1 bg-black/[0.08] dark:bg-white/[0.06] rounded-full overflow-hidden">
                            <motion.div
                                className="h-full bg-gradient-to-r from-neon-pink to-neon-green rounded-full"
                                initial={{ width: '25%' }}
                                animate={{ width: `${(step / 4) * 100}%` }}
                                transition={{ duration: 0.3 }}
                            />
                        </div>
                    </div>

                    {/* Step Form Switcher */}
                    <AnimatePresence mode="wait" custom={direction}>
                        
                        {/* ──────── STEP 1: IDENTITY & CITY ──────── */}
                        {step === 1 && (
                            <motion.div
                                key="step1"
                                custom={direction}
                                variants={slideVariants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                transition={{ duration: 0.25, ease: 'easeOut' }}
                                className="space-y-6"
                            >
                                <div>
                                    <h2 className="text-xl sm:text-2xl font-black font-heading uppercase tracking-tight text-gray-900 dark:text-white">
                                        Let's start with the basics
                                    </h2>
                                    <p className="text-xs sm:text-sm text-gray-900 dark:text-white/50 mt-1">
                                        Tell us your name, photo, and where you create content.
                                    </p>
                                </div>

                                {/* Profile Photo Upload */}
                                <div className="flex items-center gap-4 p-4 bg-gray-50/80 dark:bg-white/[0.02] border border-black/[0.08] dark:border-white/[0.06] rounded-2xl">
                                    <div className="relative shrink-0">
                                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white dark:bg-black border border-white/[0.1] flex items-center justify-center overflow-hidden">
                                            {formData.profilePicture ? (
                                                <img src={formData.profilePicture} alt="Preview" className="w-full h-full object-cover" />
                                            ) : (
                                                <Camera size={22} className="text-gray-900 dark:text-white/20" />
                                            )}
                                        </div>
                                        <label className="absolute -bottom-1 -right-1 w-7 h-7 bg-white text-black rounded-lg flex items-center justify-center cursor-pointer hover:bg-neon-pink transition-colors shadow-lg">
                                            {isUploadingPhoto ? <LoadingSpinner size="xs" color="black" /> : <Upload size={13} />}
                                            <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={isUploadingPhoto} />
                                        </label>
                                    </div>
                                    <div className="min-w-0">
                                        <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">Creator Avatar</h4>
                                        <p className="text-[11px] text-gray-900 dark:text-white/40 mt-0.5">Upload a clean headshot for your creator profile.</p>
                                    </div>
                                </div>

                                {/* Full Name */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-gray-900 dark:text-white/40 uppercase tracking-wider">Full Name or Handle *</label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        placeholder="e.g. Aisha Sharma"
                                        className="w-full h-12 bg-white dark:bg-black/40 border border-black/[0.1] dark:border-white/[0.08] focus:border-black/30 dark:focus:border-white/30 rounded-xl px-4 text-sm font-medium text-gray-900 dark:text-white outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-white/20"
                                        autoFocus
                                    />
                                </div>

                                {/* Operating City */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-gray-900 dark:text-white/40 uppercase tracking-wider">Operating City *</label>
                                    
                                    {/* Quick City Chips */}
                                    <div className="flex flex-wrap gap-1.5">
                                        {POPULAR_CITIES.map(c => {
                                            const isSelected = formData.city === c;
                                            return (
                                                <button
                                                    key={c}
                                                    type="button"
                                                    onClick={() => setFormData(p => ({ ...p, city: c }))}
                                                    className={cn(
                                                        "px-3.5 py-2 rounded-xl text-xs font-bold transition-all border",
                                                        isSelected
                                                            ? "bg-neon-green text-black border-neon-green font-black shadow-md shadow-neon-green/20 scale-[1.02]"
                                                            : "bg-white dark:bg-white/[0.04] text-gray-800 dark:text-white/60 border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 hover:text-black dark:hover:text-white"
                                                    )}
                                                >
                                                    {c}
                                                </button>
                                            );
                                        })}
                                        <button
                                            type="button"
                                            onClick={() => setFormData(p => ({ ...p, city: 'Others' }))}
                                            className={cn(
                                                "px-3.5 py-2 rounded-xl text-xs font-bold transition-all border",
                                                formData.city === 'Others' || (!POPULAR_CITIES.includes(formData.city) && formData.city)
                                                    ? "bg-neon-green text-black border-neon-green font-black shadow-md shadow-neon-green/20 scale-[1.02]"
                                                    : "bg-white dark:bg-white/[0.04] text-gray-800 dark:text-white/60 border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 hover:text-black dark:hover:text-white"
                                            )}
                                        >
                                            Other City...
                                        </button>
                                    </div>

                                    {/* Custom City Input */}
                                    {(formData.city === 'Others' || (!POPULAR_CITIES.includes(formData.city) && formData.city)) && (
                                        <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="pt-2">
                                            <input
                                                type="text"
                                                name="customCity"
                                                value={formData.customCity}
                                                onChange={handleChange}
                                                placeholder="Type your city (e.g. Chandigarh, Jaipur, Kochi)"
                                                className="w-full h-11 bg-white dark:bg-black/40 border border-black/[0.1] dark:border-white/[0.08] focus:border-black/30 dark:focus:border-white/30 rounded-xl px-4 text-xs font-medium text-gray-900 dark:text-white outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-white/20"
                                            />
                                        </motion.div>
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {/* ──────── STEP 2: CONTACT & OTP ──────── */}
                        {step === 2 && (
                            <motion.div
                                key="step2"
                                custom={direction}
                                variants={slideVariants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                transition={{ duration: 0.25, ease: 'easeOut' }}
                                className="space-y-6"
                            >
                                <div>
                                    <h2 className="text-xl sm:text-2xl font-black font-heading uppercase tracking-tight text-gray-900 dark:text-white">
                                        Where should we send briefs?
                                    </h2>
                                    <p className="text-xs sm:text-sm text-gray-900 dark:text-white/50 mt-1">
                                        Verify your phone to receive direct campaign invitations and payouts.
                                    </p>
                                </div>

                                {/* Email Address */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-gray-900 dark:text-white/40 uppercase tracking-wider">Email Address *</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-900 dark:text-white/20" size={15} />
                                        <input
                                            type="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            placeholder="you@email.com"
                                            className="w-full h-12 pl-10 pr-4 bg-white dark:bg-black/40 border border-black/[0.1] dark:border-white/[0.08] focus:border-black/30 dark:focus:border-white/30 rounded-xl text-sm font-medium text-gray-900 dark:text-white outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-white/20"
                                            autoFocus
                                        />
                                    </div>
                                    {duplicateWarnings.email && (
                                        <p className="text-[11px] text-amber-400 font-medium">{duplicateWarnings.email}</p>
                                    )}
                                </div>

                                {/* WhatsApp Phone & OTP Section */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[10px] font-bold text-gray-900 dark:text-white/40 uppercase tracking-wider">WhatsApp Contact Number *</label>
                                        {isPhoneVerified && (
                                            <span className="text-neon-green font-bold text-[10px] flex items-center gap-1 uppercase tracking-wider">
                                                <ShieldCheck size={13} /> Verified
                                            </span>
                                        )}
                                    </div>

                                    {isPhoneVerified ? (
                                        /* Verified Banner */
                                        <div className="p-4 bg-neon-green/10 border border-neon-green/20 rounded-2xl flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-xl bg-neon-green text-black flex items-center justify-center font-bold">
                                                    <Check size={16} strokeWidth={3} />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-gray-900 dark:text-white font-mono">{verifiedPhoneNumber || `${countryCode} ${formData.phone.slice(-10)}`}</p>
                                                    <p className="text-[10px] text-gray-900 dark:text-white/40">Verified for direct brand deals & payment receipts.</p>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setIsPhoneVerified(false);
                                                    setVerifiedPhoneNumber('');
                                                    setOtpSent(false);
                                                }}
                                                className="text-[10px] text-gray-900 dark:text-white/40 hover:text-gray-900 dark:hover:text-white underline font-bold uppercase tracking-wider"
                                            >
                                                Change
                                            </button>
                                        </div>
                                    ) : (
                                        /* Unverified Phone Input with Safe Boundaries */
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2">
                                                {/* Country Code Dropdown */}
                                                <div className="relative shrink-0" ref={countryCodeRef}>
                                                    <button
                                                        type="button"
                                                        onClick={() => setIsCountryCodeOpen(!isCountryCodeOpen)}
                                                        className="h-12 px-3 bg-white dark:bg-black/40 border border-black/[0.1] dark:border-white/[0.08] rounded-xl text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5 hover:border-black/20 dark:hover:border-white/20 transition-all"
                                                    >
                                                        <span>{countryCode}</span>
                                                        <ChevronDown size={12} className="text-gray-900 dark:text-white/30" />
                                                    </button>
                                                    {isCountryCodeOpen && (
                                                        <div className="absolute z-50 top-full left-0 mt-1 bg-gray-100 dark:bg-zinc-950 border border-black/10 dark:border-white/10 rounded-xl p-1 shadow-2xl w-28 space-y-0.5">
                                                            {COUNTRY_OPTIONS.map(opt => (
                                                                <button
                                                                    key={opt.value}
                                                                    type="button"
                                                                    onClick={() => { setCountryCode(opt.value); setIsCountryCodeOpen(false); }}
                                                                    className={cn(
                                                                        "w-full px-2.5 py-1.5 text-left text-xs font-bold rounded-lg transition-colors",
                                                                        countryCode === opt.value ? "bg-black/10 dark:bg-white/10 text-gray-900 dark:text-white" : "text-gray-900 dark:text-white/40 hover:text-gray-900 dark:hover:text-white"
                                                                    )}
                                                                >
                                                                    {opt.label}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Phone Number Input */}
                                                <div className="relative flex-1 min-w-0">
                                                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-900 dark:text-white/20" size={14} />
                                                    <input
                                                        type="tel"
                                                        name="phone"
                                                        value={formData.phone}
                                                        onChange={handleChange}
                                                        disabled={otpSent || isSendingOtp}
                                                        placeholder="98765 43210"
                                                        maxLength={15}
                                                        className="w-full h-12 pl-9 pr-3 bg-white dark:bg-black/40 border border-black/[0.1] dark:border-white/[0.08] focus:border-black/30 dark:focus:border-white/30 rounded-xl text-sm font-medium text-gray-900 dark:text-white outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-white/20 disabled:opacity-50"
                                                    />
                                                </div>

                                                {/* Send OTP Button */}
                                                {!otpSent && (
                                                    <button
                                                        type="button"
                                                        onClick={handleSendOTP}
                                                        disabled={isSendingOtp || formData.phone.replace(/\D/g, '').length < 10}
                                                        className="h-12 px-4 bg-white text-black hover:bg-neon-pink font-bold rounded-xl text-xs uppercase tracking-wider shrink-0 transition-all disabled:opacity-30"
                                                    >
                                                        {isSendingOtp ? <LoadingSpinner size="xs" color="black" /> : 'Send Code'}
                                                    </button>
                                                )}
                                            </div>

                                            {/* 6-Digit OTP Box (Safe responsive grid) */}
                                            <AnimatePresence>
                                                {otpSent && (
                                                    <motion.div
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: 'auto' }}
                                                        exit={{ opacity: 0, height: 0 }}
                                                        className="p-4 bg-white dark:bg-black/60 border border-black/[0.1] dark:border-white/[0.08] rounded-2xl space-y-3"
                                                    >
                                                        <div className="flex items-center justify-between text-xs">
                                                            <span className="text-gray-900 dark:text-white/60 text-[11px]">
                                                                Enter 6-digit code sent to <strong className="text-gray-900 dark:text-white font-mono">{countryCode} {formData.phone.slice(-10)}</strong>
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={() => { setOtpSent(false); setOtpDigits(['','','','','','']); }}
                                                                className="text-[10px] text-gray-900 dark:text-white/40 hover:text-gray-900 dark:hover:text-white underline uppercase font-bold"
                                                            >
                                                                Edit
                                                            </button>
                                                        </div>

                                                        {/* Mobile Safe Grid of 6 PIN Boxes */}
                                                        <div className="grid grid-cols-6 gap-1.5 sm:gap-2.5 max-w-[320px] sm:max-w-[360px] w-full mx-auto" onPaste={handleOtpPaste}>
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
                                                                  className="w-full aspect-square text-center bg-gray-50 dark:bg-white/[0.04] border border-black/[0.1] dark:border-white/[0.1] rounded-xl text-lg sm:text-xl font-bold text-gray-900 dark:text-white focus:border-neon-green focus:ring-1 focus:ring-neon-green outline-none transition-all"
                                                                />
                                                            ))}
                                                        </div>

                                                        <div className="flex items-center justify-between text-[11px] pt-1">
                                                            {isVerifyingOtp ? (
                                                                <div className="flex items-center gap-1.5 text-neon-green font-bold">
                                                                    <LoadingSpinner size="xs" color="neon-green" />
                                                                    <span>Verifying...</span>
                                                                </div>
                                                            ) : (
                                                                <span className="text-gray-900 dark:text-white/30 text-[10px]">Auto-verifies on 6th digit</span>
                                                            )}

                                                            <div>
                                                                {otpCooldown > 0 ? (
                                                                    <span className="text-gray-900 dark:text-white/30 text-[10px]">Resend in {otpCooldown}s</span>
                                                                ) : (
                                                                    <button
                                                                        type="button"
                                                                        onClick={handleSendOTP}
                                                                        disabled={isSendingOtp}
                                                                        className="text-[10px] font-bold text-neon-green hover:underline uppercase"
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
                                                <div className="space-y-2.5 pt-1">
                                                    <p className="text-xs text-red-400 font-medium">{phoneError}</p>
                                                    <div className="p-3.5 bg-black/5 dark:bg-white/[0.04] border border-black/10 dark:border-white/10 rounded-2xl flex items-center justify-between gap-3">
                                                        <div className="text-[11px] text-gray-600 dark:text-white/60 min-w-0">
                                                            <span className="font-bold text-gray-900 dark:text-white block">SMS code not arriving?</span>
                                                            <span className="text-[10px] text-gray-500 dark:text-white/40 block">No problem—you can tap Continue and verify your profile via the email confirmation link.</span>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={nextStep}
                                                            className="px-3.5 py-2 bg-white text-black hover:bg-neon-pink font-bold text-[10px] rounded-xl uppercase tracking-wider shrink-0 transition-all shadow-sm active:scale-95 flex items-center gap-1.5"
                                                        >
                                                            <span>Continue</span>
                                                            <ArrowRight size={12} />
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {/* ──────── STEP 3: NICHES & SOCIALS ──────── */}
                        {step === 3 && (
                            <motion.div
                                key="step3"
                                custom={direction}
                                variants={slideVariants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                transition={{ duration: 0.25, ease: 'easeOut' }}
                                className="space-y-6"
                            >
                                <div>
                                    <h2 className="text-xl sm:text-2xl font-black font-heading uppercase tracking-tight text-gray-900 dark:text-white">
                                        Showcase your creative footprint
                                    </h2>
                                    <p className="text-xs sm:text-sm text-gray-900 dark:text-white/50 mt-1">
                                        Select your niche and connect your main creator channels.
                                    </p>
                                </div>

                                {/* Visual Niche Selector */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-gray-900 dark:text-white/40 uppercase tracking-wider">Primary Content Niche *</label>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                        {NICHE_OPTIONS.map(niche => {
                                            const isSelected = formData.categories === niche.id;
                                            return (
                                                <button
                                                    key={niche.id}
                                                    type="button"
                                                    onClick={() => setFormData(p => ({ ...p, categories: niche.id }))}
                                                    className={cn(
                                                        "p-3.5 rounded-2xl text-left border transition-all flex flex-col justify-between gap-2 group",
                                                        isSelected
                                                            ? "bg-neon-pink/15 dark:bg-neon-pink/20 border-neon-pink shadow-md scale-[1.02] ring-1 ring-neon-pink text-gray-900 dark:text-white"
                                                            : "bg-white dark:bg-white/[0.02] border-gray-200 dark:border-white/[0.06] hover:bg-gray-50 dark:hover:bg-white/[0.04] hover:border-gray-300 dark:hover:border-white/20 text-gray-700 dark:text-white/70"
                                                    )}
                                                >
                                                    <span className="text-xl">{niche.icon}</span>
                                                    <div>
                                                        <p className={cn("text-xs font-bold", isSelected ? "text-neon-pink dark:text-neon-pink font-black" : "text-gray-900 dark:text-white")}>{niche.label}</p>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {formData.categories === 'Others' && (
                                        <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="pt-2">
                                            <input
                                                type="text"
                                                name="customNiche"
                                                value={formData.customNiche}
                                                onChange={handleChange}
                                                placeholder="Specify niche (e.g. Automotive, Podcasting, DIY)"
                                                className="w-full h-11 bg-white dark:bg-black/40 border border-black/[0.1] dark:border-white/[0.08] focus:border-black/30 dark:focus:border-white/30 rounded-xl px-4 text-xs font-medium text-gray-900 dark:text-white outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-white/20"
                                            />
                                        </motion.div>
                                    )}

                                    {(formData.categories === 'Student/Campus Creator' || formData.categories === 'College Pages') && (
                                        <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="pt-2">
                                            <input
                                                type="text"
                                                name="collegeName"
                                                value={formData.collegeName}
                                                onChange={handleChange}
                                                placeholder="College / University Name (e.g. Christ University, IIT Bombay)"
                                                className="w-full h-11 bg-white dark:bg-black/40 border border-black/[0.1] dark:border-white/[0.08] focus:border-black/30 dark:focus:border-white/30 rounded-xl px-4 text-xs font-medium text-gray-900 dark:text-white outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-white/20"
                                            />
                                        </motion.div>
                                    )}
                                </div>

                                {/* Instagram Profile Handle */}
                                <div className="p-4 bg-gray-50/80 dark:bg-white/[0.02] border border-black/[0.08] dark:border-white/[0.06] rounded-2xl space-y-3">
                                    <div className="flex items-center gap-2 text-xs font-bold text-pink-400 uppercase tracking-wider">
                                        <Instagram size={15} />
                                        <span>Instagram Profile *</span>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-gray-900 dark:text-white/30 uppercase tracking-wider">Handle (without @)</label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-900 dark:text-white/30 font-bold text-xs">@</span>
                                                <input
                                                    type="text"
                                                    name="instagram"
                                                    value={formData.instagram}
                                                    onChange={handleChange}
                                                    placeholder="yourhandle"
                                                    className="w-full h-11 pl-7 pr-3 bg-white dark:bg-black/40 border border-black/[0.1] dark:border-white/[0.08] focus:border-pink-500 rounded-xl text-xs font-medium text-gray-900 dark:text-white outline-none transition-all"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-gray-900 dark:text-white/30 uppercase tracking-wider">Approx Followers</label>
                                            <input
                                                type="number"
                                                name="instagramFollowers"
                                                value={formData.instagramFollowers}
                                                onChange={handleChange}
                                                placeholder="e.g. 5000"
                                                className="w-full h-11 px-3 bg-white dark:bg-black/40 border border-black/[0.1] dark:border-white/[0.08] focus:border-pink-500 rounded-xl text-xs font-medium text-gray-900 dark:text-white outline-none transition-all"
                                            />
                                        </div>
                                    </div>
                                    {duplicateWarnings.instagram && (
                                        <p className="text-[11px] text-amber-400 font-medium">{duplicateWarnings.instagram}</p>
                                    )}
                                </div>

                                {/* Optional Additional Channels */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-gray-900 dark:text-white/40 uppercase tracking-wider">Additional Channels (Optional)</label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        <div className="relative">
                                            <Linkedin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-400" size={14} />
                                            <input
                                                type="text"
                                                name="linkedin"
                                                value={formData.linkedin}
                                                onChange={handleChange}
                                                placeholder="LinkedIn profile link"
                                                className="w-full h-11 pl-9 pr-3 bg-white dark:bg-black/40 border border-black/[0.1] dark:border-white/[0.08] focus:border-blue-400 rounded-xl text-xs font-medium text-gray-900 dark:text-white outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-white/20"
                                            />
                                        </div>
                                        <div className="relative">
                                            <Youtube className="absolute left-3.5 top-1/2 -translate-y-1/2 text-red-400" size={14} />
                                            <input
                                                type="text"
                                                name="youtube"
                                                value={formData.youtube}
                                                onChange={handleChange}
                                                placeholder="YouTube channel link"
                                                className="w-full h-11 pl-9 pr-3 bg-white dark:bg-black/40 border border-black/[0.1] dark:border-white/[0.08] focus:border-red-400 rounded-xl text-xs font-medium text-gray-900 dark:text-white outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-white/20"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* ──────── STEP 4: TERMS & CREATOR PASS REVIEW ──────── */}
                        {step === 4 && (
                            <motion.div
                                key="step4"
                                custom={direction}
                                variants={slideVariants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                transition={{ duration: 0.25, ease: 'easeOut' }}
                                className="space-y-6"
                            >
                                <div>
                                    <h2 className="text-xl sm:text-2xl font-black font-heading uppercase tracking-tight text-gray-900 dark:text-white">
                                        Review & Final Terms
                                    </h2>
                                    <p className="text-xs sm:text-sm text-gray-900 dark:text-white/50 mt-1">
                                        Set your collaboration preferences and review your Creator Pass.
                                    </p>
                                </div>

                                {/* Collaboration Style Cards */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-gray-900 dark:text-white/40 uppercase tracking-wider">Collaboration Preferences</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {[
                                            { id: 'both', label: 'Open to Both', icon: '✨' },
                                            { id: 'paid', label: 'Paid Only', icon: '💰' },
                                            { id: 'barter', label: 'Barter & Gigs', icon: '🎁' }
                                        ].map(opt => {
                                            const isSelected = formData.doBarter === opt.id;
                                            return (
                                                <button
                                                    key={opt.id}
                                                    type="button"
                                                    onClick={() => setFormData(p => ({ ...p, doBarter: opt.id }))}
                                                    className={cn(
                                                        "p-3.5 rounded-2xl text-center border transition-all flex flex-col items-center gap-1.5",
                                                        isSelected
                                                            ? "bg-neon-green text-black border-neon-green font-black shadow-md shadow-neon-green/20 scale-[1.02]"
                                                            : "bg-white dark:bg-white/[0.02] text-gray-800 dark:text-white/60 border-gray-200 dark:border-white/[0.06] hover:text-black dark:hover:text-white hover:border-gray-300 dark:hover:border-white/20"
                                                    )}
                                                >
                                                    <span className="text-base">{opt.icon}</span>
                                                    <span className="text-xs">{opt.label}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Short Bio & Commercials */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="space-y-1.5 sm:col-span-2">
                                        <label className="text-[10px] font-bold text-gray-900 dark:text-white/40 uppercase tracking-wider">Short Creator Statement</label>
                                        <textarea
                                            name="bio"
                                            value={formData.bio}
                                            onChange={handleChange}
                                            placeholder="e.g. Bangalore lifestyle creator focusing on aesthetics, cafes, and campus culture. High engagement reels."
                                            rows={2}
                                            className="w-full bg-white dark:bg-black/40 border border-black/[0.1] dark:border-white/[0.08] focus:border-black/30 dark:focus:border-white/30 rounded-xl p-3 text-xs font-medium text-gray-900 dark:text-white outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-white/20 resize-none"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-gray-900 dark:text-white/40 uppercase tracking-wider">Typical Rates (Optional)</label>
                                        <input
                                            type="text"
                                            name="commercials"
                                            value={formData.commercials}
                                            onChange={handleChange}
                                            placeholder="e.g. ₹5,000/Reel"
                                            className="w-full h-11 bg-white dark:bg-black/40 border border-black/[0.1] dark:border-white/[0.08] focus:border-black/30 dark:focus:border-white/30 rounded-xl px-4 text-xs font-medium text-gray-900 dark:text-white outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-white/20"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-gray-900 dark:text-white/40 uppercase tracking-wider flex justify-between">
                                            <span>Invite Code (Optional)</span>
                                            {isReferralCodeLocked && <span className="text-neon-green">Applied 🔒</span>}
                                        </label>
                                        <input
                                            type="text"
                                            name="referredBy"
                                            value={formData.referredBy}
                                            onChange={handleChange}
                                            disabled={isReferralCodeLocked}
                                            placeholder="Friend or creator invite code"
                                            className="w-full h-11 bg-white dark:bg-black/40 border border-black/[0.1] dark:border-white/[0.08] focus:border-black/30 dark:focus:border-white/30 rounded-xl px-4 text-xs font-medium text-gray-900 dark:text-white outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-white/20 disabled:opacity-50"
                                        />
                                    </div>
                                </div>

                                {/* Live Creator Pass Preview Card */}
                                <div className="space-y-2 pt-2">
                                    <label className="text-[10px] font-bold text-gray-900 dark:text-white/40 uppercase tracking-wider flex items-center gap-1.5">
                                        <Award size={13} className="text-neon-pink" />
                                        <span>Your Newbi Creator Pass Preview</span>
                                    </label>
                                    <div className="p-4 sm:p-5 bg-gradient-to-br from-gray-100 dark:from-white/[0.05] to-gray-50 dark:to-white/[0.01] border border-black/[0.1] dark:border-white/[0.1] rounded-2xl relative overflow-hidden flex items-center gap-4">
                                        <div className="w-14 h-14 rounded-2xl bg-white dark:bg-black border border-white/[0.1] overflow-hidden shrink-0 flex items-center justify-center">
                                            {formData.profilePicture ? (
                                                <img src={formData.profilePicture} alt="Avatar" className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-lg font-black text-gray-900 dark:text-white/30">{formData.name ? formData.name.charAt(0).toUpperCase() : 'C'}</span>
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-[8px] font-bold uppercase tracking-wider bg-neon-green/10 text-neon-green border border-neon-green/20 px-2 py-0.5 rounded-md">Verified</span>
                                                <span className="text-[8px] font-bold text-gray-900 dark:text-white/30 uppercase tracking-wider">{formData.city || 'City'}</span>
                                            </div>
                                            <h4 className="text-sm sm:text-base font-black text-gray-900 dark:text-white uppercase tracking-tight truncate">{formData.name || 'Your Name'}</h4>
                                            <p className="text-[10px] font-bold text-neon-pink/80 uppercase tracking-wider truncate">{formData.categories || 'Niche'}</p>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Step Navigation Actions */}
                    <div className="pt-4 border-t border-black/[0.08] dark:border-white/[0.06] flex items-center justify-between gap-3">
                        {step > 1 ? (
                            <button
                                type="button"
                                onClick={prevStep}
                                className="h-12 px-5 bg-gray-100 dark:bg-white/[0.04] hover:bg-gray-200 dark:hover:bg-white/[0.08] text-gray-900 dark:text-white/60 hover:text-gray-900 dark:hover:text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all flex items-center gap-2 border border-black/[0.08] dark:border-white/[0.08]"
                            >
                                <ArrowLeft size={14} />
                                <span>Back</span>
                            </button>
                        ) : (
                            <div />
                        )}

                        {step < 4 ? (
                            <button
                                type="button"
                                onClick={nextStep}
                                className="h-12 px-6 bg-white hover:bg-neon-pink text-black font-bold rounded-xl text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg ml-auto"
                            >
                                <span>Continue</span>
                                <ArrowRight size={14} />
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="h-12 px-8 bg-neon-green hover:brightness-110 text-black font-black rounded-xl text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-[0_0_25px_rgba(57,255,20,0.3)] ml-auto disabled:opacity-40"
                            >
                                {isSubmitting ? (
                                    <>
                                        <LoadingSpinner size="xs" color="black" />
                                        <span>Submitting...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Submit Creator Application</span>
                                        <Check size={14} strokeWidth={3} />
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>

                {/* Trust Footer Notice */}
                <div className="flex items-center justify-center gap-2 text-center text-[10px] font-bold text-gray-900 dark:text-white/30 uppercase tracking-wider">
                    <ShieldCheck size={13} className="text-neon-green" />
                    <span>Official Newbi Influencer Roster • 0% Commission • Free Forever</span>
                </div>
            </div>
        </div>
    );
};

export default CreatorJoin;

