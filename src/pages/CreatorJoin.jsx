import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useStore } from '../lib/store';
import { useStoreSubscription } from '../hooks/useStoreSubscription';
import { auth } from '../lib/firebase';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import confetti from 'canvas-confetti';
import { PREDEFINED_CITIES } from '../lib/constants';
import { requestAutoLocation } from '../lib/location';
import { motion, AnimatePresence } from 'framer-motion';
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right';
import ArrowLeft from 'lucide-react/dist/esm/icons/arrow-left';
import Instagram from 'lucide-react/dist/esm/icons/instagram';
import Youtube from 'lucide-react/dist/esm/icons/youtube';
import Linkedin from 'lucide-react/dist/esm/icons/linkedin';
import Twitter from 'lucide-react/dist/esm/icons/twitter';
import Globe from 'lucide-react/dist/esm/icons/globe';
import Upload from 'lucide-react/dist/esm/icons/upload';
import CheckCircle2 from 'lucide-react/dist/esm/icons/check-circle-2';
import Check from 'lucide-react/dist/esm/icons/check';
import X from 'lucide-react/dist/esm/icons/x';
import Phone from 'lucide-react/dist/esm/icons/phone';
import Mail from 'lucide-react/dist/esm/icons/mail';
import MapPin from 'lucide-react/dist/esm/icons/map-pin';
import ShieldCheck from 'lucide-react/dist/esm/icons/shield-check';
import Clock from 'lucide-react/dist/esm/icons/clock';
import ExternalLink from 'lucide-react/dist/esm/icons/external-link';
import MessageCircle from 'lucide-react/dist/esm/icons/message-circle';
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down';
import User from 'lucide-react/dist/esm/icons/user';
import FileText from 'lucide-react/dist/esm/icons/file-text';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import AlertCircle from 'lucide-react/dist/esm/icons/alert-circle';
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw';
import Camera from 'lucide-react/dist/esm/icons/camera';
import TrendingUp from 'lucide-react/dist/esm/icons/trending-up';
import Award from 'lucide-react/dist/esm/icons/award';
import Building2 from 'lucide-react/dist/esm/icons/building-2';
import GraduationCap from 'lucide-react/dist/esm/icons/graduation-cap';
import BookOpen from 'lucide-react/dist/esm/icons/book-open';
import Shirt from 'lucide-react/dist/esm/icons/shirt';
import Gamepad2 from 'lucide-react/dist/esm/icons/gamepad-2';
import Compass from 'lucide-react/dist/esm/icons/compass';
import Heart from 'lucide-react/dist/esm/icons/heart';
import Dumbbell from 'lucide-react/dist/esm/icons/dumbbell';
import Utensils from 'lucide-react/dist/esm/icons/utensils';
import Smile from 'lucide-react/dist/esm/icons/smile';
import Home from 'lucide-react/dist/esm/icons/home';
import Video from 'lucide-react/dist/esm/icons/video';
import Car from 'lucide-react/dist/esm/icons/car';
import Palette from 'lucide-react/dist/esm/icons/palette';
import Music from 'lucide-react/dist/esm/icons/music';
import Users from 'lucide-react/dist/esm/icons/users';
import Mic from 'lucide-react/dist/esm/icons/mic';
import Flame from 'lucide-react/dist/esm/icons/flame';
import Rocket from 'lucide-react/dist/esm/icons/rocket';
import Layers from 'lucide-react/dist/esm/icons/layers';
import Banknote from 'lucide-react/dist/esm/icons/banknote';
import Handshake from 'lucide-react/dist/esm/icons/handshake';
import Lock from 'lucide-react/dist/esm/icons/lock';
import IndianRupee from 'lucide-react/dist/esm/icons/indian-rupee';
import Sliders from 'lucide-react/dist/esm/icons/sliders';
import { useNavigate, Link } from 'react-router-dom';
import CreatorPassCard from '../components/creator/CreatorPassCard';
import CreatorCityGroupCard from '../components/creator/CreatorCityGroupCard';
import { cn, normalizePhoneNumber } from '../lib/utils';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import GlobalLoader from '../components/ui/GlobalLoader';
import useDynamicMeta from '../hooks/useDynamicMeta';

// Rich niche definitions with icons and descriptions
const NICHE_OPTIONS = [
    { id: 'City Pages', label: 'City Pages / Local Hubs', icon: Building2, color: 'from-sky-500/20 to-blue-500/10' },
    { id: 'College Pages', label: 'College Pages / Hubs', icon: GraduationCap, color: 'from-teal-500/20 to-blue-500/10' },
    { id: 'Student/Campus Creator', label: 'Campus & College', icon: BookOpen, color: 'from-emerald-500/20 to-teal-500/10' },
    { id: 'Fashion & Luxury', label: 'Fashion & Luxury', icon: Shirt, color: 'from-pink-500/20 to-purple-500/10' },
    { id: 'Tech & Gaming', label: 'Tech & Gaming', icon: Gamepad2, color: 'from-blue-500/20 to-cyan-500/10' },
    { id: 'Travel & Lifestyle', label: 'Travel & Lifestyle', icon: Compass, color: 'from-amber-500/20 to-orange-500/10' },
    { id: 'Beauty & Fitness', label: 'Beauty & Cosmetics', icon: Heart, color: 'from-rose-500/20 to-pink-500/10' },
    { id: 'Fitness & Sports', label: 'Fitness & Athletics', icon: Dumbbell, color: 'from-emerald-500/20 to-lime-500/10' },
    { id: 'Food & Beverage', label: 'Food & Dining', icon: Utensils, color: 'from-yellow-500/20 to-amber-500/10' },
    { id: 'Comedy & Entertainment', label: 'Comedy & Memes', icon: Smile, color: 'from-purple-500/20 to-indigo-500/10' },
    { id: 'Real Estate', label: 'Real Estate & Living', icon: Home, color: 'from-amber-500/20 to-emerald-500/10' },
    { id: 'Photography & Filmmaking', label: 'Photo & Filmmaking', icon: Video, color: 'from-indigo-500/20 to-purple-500/10' },
    { id: 'Automotive & Moto', label: 'Auto & Motovlogging', icon: Car, color: 'from-red-500/20 to-orange-500/10' },
    { id: 'Art & Design', label: 'Art, Design & DIY', icon: Palette, color: 'from-pink-500/20 to-violet-500/10' },
    { id: 'Music & Dance', label: 'Music & Dance', icon: Music, color: 'from-fuchsia-500/20 to-pink-500/10' },
    { id: 'Parenting & Family', label: 'Parenting & Family', icon: Users, color: 'from-amber-500/20 to-rose-500/10' },
    { id: 'Podcasts & Media', label: 'Podcasts & Media', icon: Mic, color: 'from-purple-500/20 to-pink-500/10' },
    { id: 'Meme & Pop Culture', label: 'Meme & Pop Culture', icon: Flame, color: 'from-orange-500/20 to-red-500/10' },
    { id: 'Startup & Entrepreneurship', label: 'Startup & Founder', icon: Rocket, color: 'from-violet-500/20 to-purple-500/10' },
    { id: 'Finance & Business', label: 'Finance & Career', icon: TrendingUp, color: 'from-green-500/20 to-emerald-500/10' },
    { id: 'Others', label: 'Other Specialization', icon: Layers, color: 'from-zinc-500/20 to-zinc-700/10' }
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
    useStoreSubscription(['creators', 'creatorGroups', 'siteSettings']);
    useDynamicMeta({
        title: "Apply to Newbi Creator Network • 45-Second Onboarding",
        description: "Connect with top brands and live events in your city. Fast creator onboarding with zero agency fees.",
        url: window.location.href
    });

    const { user, addCreator, creators, creatorGroups, siteSettings, markCreatorCityGroupJoined, uploadToCloudinary, setAuthModal, loginWithGoogle, subscriptionsLoaded, resolveCreatorProfile } = useStore();
    const navigate = useNavigate();

    const [hasMarkedGroupJoined, setHasMarkedGroupJoined] = useState(false);
    const [registeredCreatorDocId, setRegisteredCreatorDocId] = useState(null);

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
        website: '',
        profilePicture: '',
        referredBy: ''
    });

    const [rateMin, setRateMin] = useState(5000);
    const [rateMax, setRateMax] = useState(25000);
    const [isRateFlexible, setIsRateFlexible] = useState(false);

    const formatINRFull = (amt) => {
        if (!amt && amt !== 0) return '₹0';
        return `₹${amt.toLocaleString('en-IN')}`;
    };

    const [showAllCities, setShowAllCities] = useState(false);
    const [isLocatingCity, setIsLocatingCity] = useState(false);

    const handleAutoDetectLocation = useCallback(async (isSilent = false) => {
        setIsLocatingCity(true);
        try {
            const result = await requestAutoLocation({ onlyPrimaryHubs: false });
            if (result?.city) {
                setFormData(prev => ({ ...prev, city: result.city }));
                if (!isSilent) {
                    useStore.getState().addToast(`📍 Location auto-selected: ${result.city}`, 'success');
                }
            }
        } catch {
            if (!isSilent) {
                useStore.getState().addToast('Could not access location. Please select your city manually.', 'info');
            }
        } finally {
            setIsLocatingCity(false);
        }
    }, []);

    // Automatically request location access on mount if city is not selected yet
    useEffect(() => {
        if (!formData.city) {
            handleAutoDetectLocation(true);
        }
    }, [handleAutoDetectLocation]);

    const [countryCode, setCountryCode] = useState('+91');
    const [isCountryCodeOpen, setIsCountryCodeOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
    const [isLoggingInWithGoogle, setIsLoggingInWithGoogle] = useState(false);
    const [hasJoined, setHasJoined] = useState(false);
    const [isReferralCodeLocked, setIsReferralCodeLocked] = useState(false);

    // Instagram Auto-Verification State & Gates
    const [isInstagramVerifying, setIsInstagramVerifying] = useState(false);
    const [instagramVerifiedData, setInstagramVerifiedData] = useState(null);
    const [instagramVerificationError, setInstagramVerificationError] = useState('');
    const [isManualFollowerEntry, setIsManualFollowerEntry] = useState(false);

    const minInstagramFollowers = siteSettings?.minInstagramFollowersToJoin !== undefined 
        ? Number(siteSettings.minInstagramFollowersToJoin) 
        : 1000;
    const requireInstagramVerification = siteSettings?.requireInstagramVerification !== false;

    const handleVerifyInstagram = useCallback(async (manualHandle = null) => {
        const raw = manualHandle !== null ? manualHandle : formData.instagram;
        const cleanHandle = String(raw || '').trim().replace(/^@/, '');

        if (!cleanHandle) {
            setInstagramVerificationError('Please enter your Instagram username.');
            return;
        }

        setIsInstagramVerifying(true);
        setInstagramVerificationError('');
        setIsManualFollowerEntry(false);

        try {
            const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
            const res = await fetch(`/api/creator-join?action=verify-instagram&handle=${encodeURIComponent(cleanHandle)}`);
            const data = await res.json();

            if (!res.ok || !data.success) {
                if (isLocal) {
                    const mockFollowers = Math.max(minInstagramFollowers || 1000, 2500);
                    setInstagramVerifiedData({
                        handle: cleanHandle,
                        name: cleanHandle,
                        followers: mockFollowers,
                        formattedFollowers: mockFollowers.toLocaleString(),
                        profilePic: null,
                        isPrivate: false,
                        isVerified: false,
                        meetsMinimumFollowers: true,
                        alreadyRegistered: false,
                        registeredTo: null
                    });
                    setFormData(prev => ({
                        ...prev,
                        instagram: cleanHandle,
                        instagramFollowers: String(mockFollowers)
                    }));
                    useStore.getState().addToast(`Local dev mode: Instagram verification passed (${mockFollowers.toLocaleString()} followers).`, 'info');
                    return;
                }
                if (data.requiresManualEntry) {
                    setIsManualFollowerEntry(true);
                    setInstagramVerificationError('');
                    useStore.getState().addToast(`Instagram verification blocked by Meta. Please enter followers manually.`, 'info');
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
                formattedFollowers: data.formattedFollowers || count.toLocaleString(),
                profilePic: data.profilePic || null,
                isPrivate: data.isPrivate || false,
                isVerified: data.isVerified || false,
                meetsMinimumFollowers: meetsCriteria,
                alreadyRegistered: Boolean(data.alreadyRegistered),
                registeredTo: data.registeredTo || null
            };

            setInstagramVerifiedData(verifiedPayload);
            setFormData(prev => ({
                ...prev,
                instagram: data.handle,
                instagramFollowers: String(count),
                ...(data.profilePic ? { profilePicture: data.profilePic, instagramProfilePic: data.profilePic } : {})
            }));

            if (!meetsCriteria) {
                useStore.getState().addToast(`Requirement not met: ${minInstagramFollowers.toLocaleString()}+ followers needed to register.`, 'warning');
            } else {
                useStore.getState().addToast(`Instagram verified: ${count.toLocaleString()} followers!`, 'success');
            }
        } catch (err) {
            const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
            if (isLocal) {
                const mockFollowers = Math.max(minInstagramFollowers || 1000, 2500);
                setInstagramVerifiedData({
                    handle: cleanHandle,
                    name: cleanHandle,
                    followers: mockFollowers,
                    formattedFollowers: mockFollowers.toLocaleString(),
                    profilePic: null,
                    isPrivate: false,
                    isVerified: false,
                    meetsMinimumFollowers: true,
                    alreadyRegistered: false,
                    registeredTo: null
                });
                setFormData(prev => ({
                    ...prev,
                    instagram: cleanHandle,
                    instagramFollowers: String(mockFollowers)
                }));
                useStore.getState().addToast(`Local dev mode: Instagram verification passed (${mockFollowers.toLocaleString()} followers).`, 'info');
                return;
            }
            setIsManualFollowerEntry(true);
            setInstagramVerificationError('');
            useStore.getState().addToast(`Instagram verification blocked by Meta. Please enter followers manually.`, 'info');
        } finally {
            setIsInstagramVerifying(false);
        }
    }, [formData.instagram, minInstagramFollowers]);

    const handleInstagramChange = (e) => {
        const val = e.target.value.replace(/^@/, '');
        setFormData(prev => ({ ...prev, instagram: val }));
        if (instagramVerifiedData && instagramVerifiedData.handle !== val.trim().toLowerCase()) {
            setInstagramVerifiedData(null);
            setInstagramVerificationError('');
        }
    };

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
    const formContainerRef = useRef(null);

    // Scroll smoothly to top of form when navigating steps or mounting
    const scrollToFormTop = useCallback((smooth = true) => {
        if (formContainerRef.current) {
            const yOffset = -90; // offset for sticky navbar
            const y = formContainerRef.current.getBoundingClientRect().top + window.pageYOffset + yOffset;
            window.scrollTo({
                top: Math.max(0, y),
                behavior: smooth ? 'smooth' : 'auto'
            });
        } else {
            window.scrollTo({
                top: 0,
                behavior: smooth ? 'smooth' : 'auto'
            });
        }
    }, []);

    // Ensure user always starts from the top of the form on step change or submission
    useEffect(() => {
        const timer = setTimeout(() => {
            scrollToFormTop(true);
        }, 50);
        return () => clearTimeout(timer);
    }, [step, scrollToFormTop]);

    useEffect(() => {
        if (hasJoined) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, [hasJoined]);

    // Auto-fill from logged in user if available
    useEffect(() => {
        if (user) {
            setFormData(prev => {
                const updates = {};
                if (!prev.email && user.email) updates.email = user.email;
                if (!prev.name && user.displayName) updates.name = user.displayName;
                if (!prev.profilePicture && user.photoURL) updates.profilePicture = user.photoURL;
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

    const handleGoogleFastTrack = async () => {
        setIsLoggingInWithGoogle(true);
        try {
            const loggedInUser = await loginWithGoogle();
            if (loggedInUser) {
                setFormData(prev => ({
                    ...prev,
                    name: loggedInUser.displayName || prev.name,
                    email: loggedInUser.email || prev.email,
                    profilePicture: loggedInUser.photoURL || prev.profilePicture
                }));
                useStore.getState().addToast(`Connected as ${loggedInUser.displayName || loggedInUser.email}! Basic details pre-filled.`, 'success');
            }
        } catch (err) {
            console.error("Google login error in CreatorJoin:", err);
            if (err.code !== 'auth/popup-closed-by-user') {
                useStore.getState().addToast("Could not complete Google sign-in. You can enter details manually.", 'error');
            }
        } finally {
            setIsLoggingInWithGoogle(false);
        }
    };

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
        if (user) {
            resolveCreatorProfile(user).then((resolved) => {
                if (resolved) {
                    navigate('/creator-dashboard', { replace: true });
                }
            }).catch(err => console.error("Error checking creator profile on join page:", err));
        }
    }, [user, navigate, resolveCreatorProfile]);

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
        const file = e.target.files?.[0];
        if (!file) return;
        const localPreview = URL.createObjectURL(file);
        setFormData(prev => ({ ...prev, profilePicture: localPreview }));
        setIsUploadingPhoto(true);
        try {
            const url = await uploadToCloudinary(file);
            setFormData(prev => ({ ...prev, profilePicture: url }));
            useStore.getState().addToast("Profile photo uploaded!", 'success');
        } catch (error) {
            useStore.getState().addToast("Couldn't upload photo to cloud, but local preview is saved.", 'error');
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

        const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
        if (isLocal) {
            const fullFormattedPhone = `${countryCode} ${cleanDigits}`;
            setIsPhoneVerified(true);
            setVerifiedPhoneNumber(fullFormattedPhone);
            setOtpSent(false);
            useStore.getState().addToast("Local mode: Phone verified automatically!", 'success');
            try { confetti({ particleCount: 50, spread: 60, origin: { y: 0.5 } }); } catch (e) {}
            return;
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

            let msg = "Could not send SMS code right now. Please check your connection and try again.";
            const code = err?.code || err?.message || '';

            if (code.includes('auth/invalid-phone-number')) {
                msg = "Invalid phone number format. Please check your entered digits.";
            } else if (code.includes('auth/captcha-check-failed') || code.includes('captcha') || code.includes('already rendered')) {
                msg = "Security check could not be completed. Please tap 'Send Code' again.";
            } else if (code.includes('auth/too-many-requests')) {
                msg = "Too many SMS requests sent. Please wait a few moments before trying again.";
            } else if (code.includes('auth/quota-exceeded')) {
                msg = "SMS daily limit reached. Please try again later or contact support.";
            } else if (code.includes('auth/network-request-failed')) {
                msg = "Network connection error. Please check your internet connection.";
            } else if (code.includes('auth/unauthorized-domain')) {
                msg = "SMS domain configuration issue. Please contact support.";
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
        if (code.length < 6) return;

        const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
        if (!isLocal && !confirmationResult) return;

        setIsVerifyingOtp(true);
        setPhoneError('');

        try {
            if (!isLocal && confirmationResult) {
                await confirmationResult.confirm(code);
            }
            const cleanDigits = formData.phone.replace(/\D/g, '').slice(-10);
            const fullFormattedPhone = `${countryCode} ${cleanDigits}`;
            setIsPhoneVerified(true);
            setVerifiedPhoneNumber(fullFormattedPhone);
            setOtpSent(false);
            useStore.getState().addToast("Phone verified successfully!", 'success');
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
            const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
            if (isLocal && !isPhoneVerified) {
                const fullFormattedPhone = `${countryCode} ${cleanDigits}`;
                setIsPhoneVerified(true);
                setVerifiedPhoneNumber(fullFormattedPhone);
                useStore.getState().addToast("Local mode: Phone verified automatically!", 'info');
            } else if (!isPhoneVerified) {
                if (!otpSent) {
                    useStore.getState().addToast("Please tap 'Send Code' and verify your phone number with the 6-digit SMS OTP.", 'warning');
                } else {
                    useStore.getState().addToast("Please verify your phone number with the 6-digit code.", 'warning');
                }
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

            if (formData.instagram.trim()) {
                const cleanInsta = formData.instagram.trim().replace(/^@/, '').toLowerCase();
                const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

                if (isLocal && !instagramVerifiedData) {
                    const mockFollowers = Math.max(minInstagramFollowers || 1000, 2500);
                    setInstagramVerifiedData({
                        handle: cleanInsta,
                        name: cleanInsta,
                        followers: mockFollowers,
                        formattedFollowers: mockFollowers.toLocaleString(),
                        profilePic: null,
                        isPrivate: false,
                        isVerified: false,
                        meetsMinimumFollowers: true,
                        alreadyRegistered: false,
                        registeredTo: null
                    });
                    setFormData(prev => ({
                        ...prev,
                        instagram: cleanInsta,
                        instagramFollowers: String(mockFollowers)
                    }));
                } else {
                    const isVerified = Boolean(instagramVerifiedData && instagramVerifiedData.handle === cleanInsta);

                    if (requireInstagramVerification && !isVerified && !isManualFollowerEntry) {
                        useStore.getState().addToast("Please auto-verify your Instagram profile before proceeding.", 'warning');
                        return;
                    }

                    if (isManualFollowerEntry && !formData.instagramFollowers) {
                        useStore.getState().addToast("Please enter your follower count manually.", 'warning');
                        return;
                    }

                    const followerCount = Number(formData.instagramFollowers || instagramVerifiedData?.followers || 0);
                    if (minInstagramFollowers > 0 && followerCount < minInstagramFollowers) {
                        useStore.getState().addToast(`Application requirement: Minimum ${minInstagramFollowers.toLocaleString()} followers required to join. Your account has ${followerCount.toLocaleString()}.`, 'error');
                        return;
                    }
                }
            }
        }

        setDirection(1);
        setStep(prev => Math.min(prev + 1, 4));
        setTimeout(() => scrollToFormTop(true), 50);
    };

    const prevStep = () => {
        setDirection(-1);
        setStep(prev => Math.max(prev - 1, 1));
        setTimeout(() => scrollToFormTop(true), 50);
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        
        if (!formData.name.trim() || !formData.email.trim() || !formData.phone.trim() || !formData.city || !formData.categories) {
            useStore.getState().addToast("Please complete all required fields.", 'error');
            return;
        }

        const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
        if (isLocal && !isPhoneVerified) {
            setIsPhoneVerified(true);
        } else if (!isPhoneVerified) {
            useStore.getState().addToast("Please verify your phone number with the 6-digit OTP before submitting.", 'warning');
            return;
        }

        setIsSubmitting(true);
        try {
            let finalCity = formData.city === 'Others' ? formData.customCity.trim() : formData.city;
            if (/^bang[al]*o?re$/i.test(finalCity.trim())) {
                finalCity = 'Bengaluru';
            } else if (/^(visakhapatnam|vizag)$/i.test(finalCity.trim())) {
                finalCity = 'Vizag';
            }
            const finalNiche = formData.categories === 'Others' ? formData.customNiche.trim() : formData.categories;
            const cleanInstagram = formData.instagram ? formData.instagram.trim().replace(/^@/, '') : '';
            const cleanLinkedin = formData.linkedin ? formData.linkedin.trim() : '';
            const cleanTwitter = formData.twitter ? formData.twitter.trim() : '';
            const cleanWebsite = formData.website ? formData.website.trim() : '';
            const cleanDigits = formData.phone.replace(/\D/g, '').slice(-10);

            const isInstaVerified = Boolean(instagramVerifiedData && instagramVerifiedData.handle === cleanInstagram.toLowerCase());
            const finalFollowers = String(Number(formData.instagramFollowers || instagramVerifiedData?.followers || 0));

            const result = await addCreator({
                uid: user?.uid || auth?.currentUser?.uid || null,
                email: formData.email.trim(),
                displayName: formData.name.trim(),
                name: formData.name.trim(),
                profileStatus: 'pending',
                ...formData,
                phone: `${countryCode} ${cleanDigits}`,
                instagram: cleanInstagram,
                instagramFollowers: finalFollowers,
                instagramVerified: isInstaVerified,
                instagramVerifiedAt: isInstaVerified ? new Date().toISOString() : null,
                instagramProfilePic: isInstaVerified ? (instagramVerifiedData?.profilePic || null) : null,
                linkedin: cleanLinkedin,
                twitter: cleanTwitter,
                website: cleanWebsite,
                cityPageFocus: formData.cityPageFocus ? formData.cityPageFocus.trim() : '',
                city: finalCity,
                categories: finalNiche,
                specializations: [finalNiche],
                isVerified: false,
                isPhoneVerified: true,
                phoneVerifiedAt: new Date().toISOString()
            });

            if (result?.id) {
                setRegisteredCreatorDocId(result.id);
            }

            setHasJoined(true);
            try { confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } }); } catch (err) {}
        } catch (error) {
            console.error("Error submitting application:", error);
            const msg = error.message?.includes('permission')
                ? "Unable to complete submission due to security permissions. Please ensure your contact details are valid or try again shortly."
                : (error.message || "Couldn't submit application. Please try again.");
            useStore.getState().addToast(msg, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    // ── SUCCESS STATE ────────────────────────────────────────────────────────
    if (hasJoined) {
        // Trigger celebration confetti
        try {
            confetti({ particleCount: 90, spread: 75, origin: { y: 0.55 } });
        } catch (e) {
            // ignore if blocked
        }

        const effectiveCity = (formData.city === 'Others' ? formData.customCity : formData.city) || '';
        const normCity = effectiveCity.toLowerCase().trim();
        const matchedCityGroup = (creatorGroups || []).find(g => 
            g.isActive !== false && (
                g.city?.toLowerCase() === normCity ||
                (normCity.includes('bengaluru') && g.city?.toLowerCase().includes('bengaluru')) ||
                (normCity.includes('bangalore') && g.city?.toLowerCase().includes('bengaluru')) ||
                (normCity.includes('mumbai') && g.city?.toLowerCase().includes('mumbai')) ||
                (normCity.includes('delhi') && g.city?.toLowerCase().includes('delhi'))
            )
        ) || (creatorGroups || []).find(g => g.isActive !== false && (
            g.city?.toLowerCase().includes('pan-india') || 
            g.city?.toLowerCase().includes('india') || 
            g.city?.toLowerCase().includes('all')
        ));

        const handleJoinedGroupClick = async () => {
            setHasMarkedGroupJoined(true);
            const targetId = registeredCreatorDocId || user?.uid || matchedExistingCreator?.id;
            if (targetId) {
                try {
                    await markCreatorCityGroupJoined(targetId);
                    useStore.getState().addToast(`Joined ${matchedCityGroup?.city || 'city'} creator group!`, 'success');
                } catch (e) {
                    console.error('Error marking city group joined:', e);
                }
            } else {
                useStore.getState().addToast('Welcome to your city community group!', 'success');
            }
        };

        const displayCity = (formData.city === 'Others' ? formData.customCity?.trim() : formData.city) || 'Your City';
        const displayNiche = (formData.categories === 'Others' ? formData.customNiche?.trim() : formData.categories) || 'Content Creator';

        const newCreatorProfile = {
            name: formData.name,
            city: displayCity,
            categories: [displayNiche],
            instagramHandle: formData.instagramHandle || formData.instagram,
            profilePicture: formData.profilePicture,
            profileStatus: "pending",
            points: Number(siteSettings?.creatorWelcomePoints) || 100, // Welcome bonus points from settings
            joinedCampaigns: [],
            creatorId: `NB-${(formData.name || 'CRE').slice(0, 3).toUpperCase()}${Math.floor(1000 + Math.random() * 9000)}`
        };

        return (
            <div className="w-full min-h-[calc(100vh-140px)] bg-gray-50 dark:bg-[#07090E] text-gray-900 dark:text-white pt-10 pb-16 px-4 flex flex-col items-center justify-start relative transition-colors duration-300">
                {/* Ambient Background Glows */}
                <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                    <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-gradient-to-b from-neon-pink/[0.04] to-transparent rounded-full blur-3xl" />
                    <div className="absolute bottom-10 right-1/4 w-[400px] h-[300px] bg-neon-green/[0.03] rounded-full blur-3xl" />
                </div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    className="relative z-10 max-w-xl sm:max-w-2xl w-full text-center space-y-6"
                >
                    <div className="space-y-2">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-[10px] font-black uppercase tracking-widest font-mono">
                            <Clock size={12} />
                            <span>Application Submitted &bull; Pending Verification</span>
                        </div>
                        <h2 className="text-3xl sm:text-4xl font-black font-heading tracking-tight text-gray-900 dark:text-white">
                            Welcome to the Collective, {formData.name?.split(' ')[0]}!
                        </h2>
                        <p className="text-gray-600 dark:text-zinc-400 text-xs sm:text-sm max-w-md mx-auto leading-relaxed">
                            Your application has been received and is under review with our talent team. Your temporary pass is reserved below.
                        </p>
                    </div>

                    {/* The Creator Pass Card */}
                    <div className="py-2">
                        <CreatorPassCard profile={newCreatorProfile} />
                    </div>

                    {/* VIP City Creator WhatsApp Community Card */}
                    <div className="py-2">
                        <CreatorCityGroupCard
                            initialCity={displayCity}
                            creatorId={registeredCreatorDocId || user?.uid || matchedExistingCreator?.id}
                            isJoined={hasMarkedGroupJoined}
                            onJoinMarked={() => setHasMarkedGroupJoined(true)}
                        />
                    </div>

                    {/* Next Steps Info Box */}
                    <div className="p-4 sm:p-5 bg-white dark:bg-white/[0.02] border border-gray-200 dark:border-white/[0.08] rounded-2xl sm:rounded-3xl text-left text-xs text-gray-600 dark:text-zinc-400 space-y-2 shadow-xs">
                        <div className="flex items-center gap-2 text-neon-green font-bold text-[11px] uppercase tracking-wider">
                            <Sparkles size={13} /> Your Creator Privileges
                        </div>
                        <p>&bull; <strong>Brand Collaborations:</strong> Verified briefs matching <span className="text-gray-900 dark:text-white font-bold">{displayCity}</span> and <span className="text-gray-900 dark:text-white font-bold">{displayNiche}</span>.</p>
                        <p>&bull; <strong>Festival &amp; Event Passes:</strong> Exclusive experiential access and festival drops.</p>
                        <p>&bull; <strong>Newbi Points:</strong> {Number(siteSettings?.creatorWelcomePoints) || 100} welcome bonus points credited to your ID pass.</p>
                    </div>

                    {/* Direct Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                        <Link
                            to="/creator-dashboard"
                            className="flex-1 h-12 bg-neon-green hover:brightness-105 text-black font-black rounded-xl flex items-center justify-center gap-2 text-xs uppercase tracking-wider transition-all shadow-[0_0_25px_rgba(57,255,20,0.3)]"
                        >
                            <span>Open Creator Dashboard</span>
                            <ArrowRight size={14} />
                        </Link>
                        <Link
                            to="/creator"
                            className="flex-1 h-12 bg-white dark:bg-white/[0.05] hover:bg-gray-100 dark:hover:bg-white/10 text-gray-900 dark:text-white font-bold rounded-xl flex items-center justify-center text-xs uppercase tracking-wider transition-all border border-gray-200 dark:border-white/[0.08]"
                        >
                            Return to Creator Hub
                        </Link>
                    </div>
                </motion.div>
            </div>
        );
    }

    const livePreviewProfile = {
        displayName: formData.name?.trim() || user?.displayName || "Reserve Your Pass",
        name: formData.name?.trim() || user?.displayName || "Reserve Your Pass",
        city: (formData.city === 'Others' ? formData.customCity?.trim() : formData.city) || "Your City",
        categories: [ (formData.categories === 'Others' ? formData.customNiche?.trim() : formData.categories) || "Content Creator" ],
        instagramHandle: (formData.instagram || formData.instagramHandle || "").replace(/^@/, '') || "your.handle",
        profilePicture: formData.profilePicture || user?.photoURL || null,
        profileStatus: 'unclaimed',
        points: 500,
        joinedCampaigns: [],
        creatorId: user?.uid ? `NB-${user.uid.slice(0, 5).toUpperCase()}` : "NB-88219"
    };

    // Suppress registration form flash if an authenticated user is currently verifying creator status or already registered
    const isMatchingLoggedInCreator = Boolean(
        user && matchedExistingCreator && (
            user.uid === matchedExistingCreator.uid || 
            (user.email && matchedExistingCreator.email && user.email.toLowerCase() === matchedExistingCreator.email.toLowerCase())
        )
    );

    if (user && (!subscriptionsLoaded?.creators || isMatchingLoggedInCreator)) {
        return <GlobalLoader color="#39ff14" />;
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#050505] text-gray-900 dark:text-white pt-20 sm:pt-24 pb-24 sm:pb-28 px-3.5 sm:px-4 relative selection:bg-neon-pink selection:text-black transition-colors duration-300">


            {/* Ambient Background Glows */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-gradient-to-b from-neon-pink/[0.04] to-transparent rounded-full blur-3xl" />
                <div className="absolute bottom-10 right-1/4 w-[400px] h-[300px] bg-neon-green/[0.03] rounded-full blur-3xl" />
            </div>

            <div className="relative z-10 w-full max-w-xl sm:max-w-2xl mx-auto space-y-4 sm:space-y-6">
                
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
                        <div className="flex items-center gap-2 text-xs text-gray-900 dark:text-white/70 bg-black/5 dark:bg-white/5 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full border border-black/10 dark:border-white/10">
                            <span className="w-2 h-2 rounded-full bg-neon-green" />
                            <span className="truncate max-w-[130px] sm:max-w-[170px] font-medium">{user.displayName || user.email}</span>
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={() => setAuthModal(true)}
                            className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-black/10 dark:bg-white/10 hover:bg-white text-gray-900 dark:text-white hover:text-black transition-all border border-white/15 text-[10px] sm:text-[11px] font-black uppercase tracking-wider shadow-sm flex items-center gap-1.5 sm:gap-2 active:scale-95"
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

                {/* Announcement Notice from Creator Settings */}
                {siteSettings?.creatorAnnouncement && (
                    <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs font-bold flex items-center gap-3">
                        <Sparkles size={16} className="text-amber-500 shrink-0" />
                        <span>{siteSettings.creatorAnnouncement}</span>
                    </div>
                )}

                {/* Stepper Card or Intake Paused State */}
                {siteSettings?.allowCreatorSignups === false ? (
                    <div className="bg-gray-50/80 dark:bg-white/[0.02] border border-black/[0.08] dark:border-white/[0.06] rounded-3xl p-8 backdrop-blur-2xl text-center space-y-4">
                        <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mx-auto font-black text-lg">
                            !
                        </div>
                        <h3 className="text-base font-black font-heading uppercase tracking-wider text-gray-900 dark:text-white">
                            Applications Temporarily Paused
                        </h3>
                        <p className="text-xs text-gray-600 dark:text-zinc-400 max-w-sm mx-auto leading-relaxed">
                            We are currently reviewing existing creator profiles. New admissions will reopen shortly. If you already have an account, sign in above.
                        </p>
                    </div>
                ) : (
                <div 
                    ref={formContainerRef}
                    className="bg-gray-50/80 dark:bg-white/[0.02] border border-black/[0.08] dark:border-white/[0.06] rounded-2xl sm:rounded-3xl p-4 sm:p-8 backdrop-blur-2xl shadow-2xl space-y-5 sm:space-y-6"
                >
                    
                    {/* Progress Bar & Header */}
                    <div className="space-y-3 sm:space-y-3.5">
                        <div className="flex items-center justify-between gap-2.5 min-w-0">
                            {/* Resilient, non-wrapping, non-overlapping pill badge */}
                            <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-neon-pink/10 border border-neon-pink/25 text-neon-pink shrink-0 shadow-sm max-w-[78%] sm:max-w-none">
                                <span className="w-1.5 h-1.5 rounded-full bg-neon-pink shrink-0 animate-pulse" />
                                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider whitespace-nowrap truncate">
                                    Step {step} of 4 • {step === 1 ? 'Identity' : step === 2 ? 'Verification' : step === 3 ? 'Creative Footprint' : 'Terms & Review'}
                                </span>
                            </div>

                            {/* Percentage progress indicator */}
                            <div className="flex items-center gap-1.5 shrink-0 text-right">
                                <span className="text-xs sm:text-sm font-black font-mono tracking-tight text-gray-900 dark:text-white">
                                    {Math.round((step / 4) * 100)}%
                                </span>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-white/40 hidden xs:inline">
                                    Done
                                </span>
                            </div>
                        </div>

                        {/* Animated Progress Line */}
                        <div className="w-full h-1.5 bg-black/[0.08] dark:bg-white/[0.06] rounded-full overflow-hidden p-0.5">
                            <motion.div
                                className="h-full bg-gradient-to-r from-neon-pink via-purple-500 to-neon-green rounded-full"
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
                                className="space-y-5 sm:space-y-6"
                            >
                                <div>
                                    <h2 className="text-lg sm:text-2xl font-black font-heading uppercase tracking-tight text-gray-900 dark:text-white">
                                        Let's start with the basics
                                    </h2>
                                    <p className="text-[11px] sm:text-sm text-gray-900 dark:text-white/50 mt-0.5 sm:mt-1">
                                        Tell us your name, photo, and where you create content.
                                    </p>
                                </div>

                                {!user ? (
                                    /* Google Fast-Track Option */
                                    <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-white/[0.03] border border-black/10 dark:border-white/10 shadow-sm space-y-3.5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-white/5 border border-black/5 dark:border-white/10 flex items-center justify-center shrink-0">
                                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <h3 className="text-xs sm:text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider">
                                                    Fast-Track with Google
                                                </h3>
                                                <p className="text-[11px] sm:text-xs text-gray-500 dark:text-zinc-400">
                                                    1-tap sign in to auto-fill your name, email & profile avatar
                                                </p>
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={handleGoogleFastTrack}
                                            disabled={isLoggingInWithGoogle}
                                            className="w-full h-12 rounded-xl bg-black hover:bg-neutral-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-black font-black uppercase tracking-wider text-xs transition-all flex items-center justify-center gap-2.5 shadow-md active:scale-[0.99] disabled:opacity-50"
                                        >
                                            {isLoggingInWithGoogle ? (
                                                <LoadingSpinner size="xs" color="currentColor" />
                                            ) : (
                                                <>
                                                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                                                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                                                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                                                    </svg>
                                                    <span>Continue with Google</span>
                                                </>
                                            )}
                                        </button>

                                        <div className="relative flex py-1 items-center">
                                            <div className="flex-grow border-t border-black/10 dark:border-white/10" />
                                            <span className="flex-shrink mx-3 text-[10px] uppercase font-bold tracking-widest text-gray-400 dark:text-zinc-500">
                                                or fill details manually below
                                            </span>
                                            <div className="flex-grow border-t border-black/10 dark:border-white/10" />
                                        </div>
                                    </div>
                                ) : (
                                    /* Connected User Status Card */
                                    <div className="p-4 rounded-2xl bg-neon-green/10 border border-neon-green/30 flex items-center justify-between gap-3 shadow-sm">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-11 h-11 rounded-xl bg-zinc-950 border border-neon-green/40 overflow-hidden shrink-0 flex items-center justify-center">
                                                {formData.profilePicture ? (
                                                    <img src={formData.profilePicture} alt={formData.name || 'User'} className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="text-neon-green font-black font-heading text-sm">
                                                        {(formData.name || user.displayName || 'U').charAt(0)}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-xs font-black text-gray-900 dark:text-white truncate">
                                                        {formData.name || user.displayName || 'Connected Account'}
                                                    </p>
                                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-neon-green/20 text-black dark:text-neon-green text-[9px] font-bold">
                                                        <CheckCircle2 size={10} /> Pre-filled
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-gray-500 dark:text-zinc-400 truncate mt-0.5">
                                                    {formData.email || user.email}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setAuthModal(true)}
                                            className="text-[10px] font-bold uppercase tracking-wider text-gray-500 hover:text-black dark:hover:text-neon-green transition-colors shrink-0"
                                        >
                                            Switch
                                        </button>
                                    </div>
                                )}

                                {/* Profile Photo Upload */}
                                <div className="flex items-center gap-3.5 sm:gap-4 p-3.5 sm:p-4 bg-gray-50/80 dark:bg-white/[0.02] border border-black/[0.08] dark:border-white/[0.06] rounded-xl sm:rounded-2xl">
                                    <div className="relative shrink-0">
                                        <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl bg-white dark:bg-black border border-white/[0.1] flex items-center justify-center overflow-hidden">
                                            {formData.profilePicture ? (
                                                <img src={formData.profilePicture} alt="Preview" className="w-full h-full object-cover" />
                                            ) : (
                                                <Camera size={20} className="text-gray-900 dark:text-white/20" />
                                            )}
                                        </div>
                                        <label className="absolute -bottom-1 -right-1 w-6 h-6 sm:w-7 sm:h-7 bg-white text-black rounded-lg flex items-center justify-center cursor-pointer hover:bg-neon-pink transition-colors shadow-lg">
                                            {isUploadingPhoto ? <LoadingSpinner size="xs" color="black" /> : <Upload size={12} />}
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
                                        className="w-full h-11 sm:h-12 bg-white dark:bg-black/40 border border-black/[0.1] dark:border-white/[0.08] focus:border-black/30 dark:focus:border-white/30 rounded-xl px-3.5 sm:px-4 text-xs sm:text-sm font-medium text-gray-900 dark:text-white outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-white/20"
                                        autoFocus
                                    />
                                </div>

                                {/* Operating City */}
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2.5">
                                        <label className="text-[10px] font-bold text-gray-900 dark:text-white/40 uppercase tracking-wider">Operating City *</label>
                                        <button
                                            type="button"
                                            onClick={() => handleAutoDetectLocation(false)}
                                            disabled={isLocatingCity}
                                            className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-neon-green hover:underline cursor-pointer disabled:opacity-50"
                                        >
                                            <MapPin size={10} className={isLocatingCity ? "animate-pulse" : ""} />
                                            <span>{isLocatingCity ? 'Locating...' : 'Auto-detect'}</span>
                                        </button>
                                    </div>
                                    
                                    {/* Quick City Chips */}
                                    <div className="flex flex-wrap gap-1.5">
                                        {(showAllCities 
                                            ? PREDEFINED_CITIES.filter(c => c !== 'Others') 
                                             : POPULAR_CITIES
                                        ).map(c => {
                                            const isSelected = formData.city === c;
                                            return (
                                                <button
                                                    key={c}
                                                    type="button"
                                                    onClick={() => setFormData(p => ({ ...p, city: c }))}
                                                    className={cn(
                                                        "px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all border",
                                                        isSelected
                                                            ? "bg-neon-green text-black border-neon-green font-black shadow-md shadow-neon-green/20 scale-[1.02]"
                                                            : "bg-white dark:bg-white/[0.04] text-gray-800 dark:text-white/60 border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 hover:text-black dark:hover:text-white"
                                                    )}
                                                >
                                                    {c}
                                                </button>
                                            );
                                        })}
                                        
                                        {!showAllCities && formData.city && !POPULAR_CITIES.includes(formData.city) && formData.city !== 'Others' && (
                                            <button
                                                type="button"
                                                className="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all border bg-neon-green text-black border-neon-green font-black shadow-md shadow-neon-green/20 scale-[1.02]"
                                            >
                                                {formData.city}
                                            </button>
                                        )}

                                        <button
                                            type="button"
                                            onClick={() => setFormData(p => ({ ...p, city: 'Others' }))}
                                            className={cn(
                                                "px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all border",
                                                formData.city === 'Others' || (!PREDEFINED_CITIES.includes(formData.city) && formData.city)
                                                    ? "bg-neon-green text-black border-neon-green font-black shadow-md shadow-neon-green/20 scale-[1.02]"
                                                    : "bg-white dark:bg-white/[0.04] text-gray-800 dark:text-white/60 border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 hover:text-black dark:hover:text-white"
                                            )}
                                        >
                                            Other City...
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setShowAllCities(!showAllCities)}
                                            className="px-3.5 py-2 rounded-xl text-xs font-bold transition-all border bg-neon-pink/10 text-neon-pink border-neon-pink/20 hover:bg-neon-pink hover:text-white"
                                        >
                                            {showAllCities ? '- Show Less' : '+ View More Cities'}
                                        </button>
                                    </div>

                                    {/* Custom City Input */}
                                    {(formData.city === 'Others' || (!PREDEFINED_CITIES.includes(formData.city) && formData.city)) && (
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
                                        <div className="p-3.5 sm:p-4 bg-neon-green/10 border border-neon-green/20 rounded-xl sm:rounded-2xl flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                                                <div className="w-8 h-8 rounded-xl bg-neon-green text-black flex items-center justify-center font-bold shrink-0">
                                                    <Check size={16} strokeWidth={3} />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-xs font-bold text-gray-900 dark:text-white font-mono truncate">{verifiedPhoneNumber || `${countryCode} ${formData.phone.slice(-10)}`}</p>
                                                    <p className="text-[10px] text-gray-900 dark:text-white/40 truncate sm:whitespace-normal">Verified for direct brand deals & payment receipts.</p>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setIsPhoneVerified(false);
                                                    setVerifiedPhoneNumber('');
                                                    setOtpSent(false);
                                                }}
                                                className="text-[10px] text-gray-900 dark:text-white/40 hover:text-gray-900 dark:hover:text-white underline font-bold uppercase tracking-wider shrink-0"
                                            >
                                                Change
                                            </button>
                                        </div>
                                    ) : (
                                        /* Unverified Phone Input with Safe Boundaries */
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-1.5 sm:gap-2">
                                                {/* Country Code Dropdown */}
                                                <div className="relative shrink-0" ref={countryCodeRef}>
                                                    <button
                                                        type="button"
                                                        onClick={() => setIsCountryCodeOpen(!isCountryCodeOpen)}
                                                        className="h-11 sm:h-12 px-2.5 sm:px-3 bg-white dark:bg-black/40 border border-black/[0.1] dark:border-white/[0.08] rounded-xl text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1 hover:border-black/20 dark:hover:border-white/20 transition-all"
                                                    >
                                                        <span>{countryCode}</span>
                                                        <ChevronDown size={11} className="text-gray-900 dark:text-white/30" />
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
                                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-900 dark:text-white/20" size={13} />
                                                    <input
                                                        type="tel"
                                                        name="phone"
                                                        value={formData.phone}
                                                        onChange={handleChange}
                                                        disabled={otpSent || isSendingOtp}
                                                        placeholder="98765 43210"
                                                        maxLength={15}
                                                        className="w-full h-11 sm:h-12 pl-8 sm:pl-9 pr-2 sm:pr-3 bg-white dark:bg-black/40 border border-black/[0.1] dark:border-white/[0.08] focus:border-black/30 dark:focus:border-white/30 rounded-xl text-xs sm:text-sm font-medium text-gray-900 dark:text-white outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-white/20 disabled:opacity-50"
                                                    />
                                                </div>

                                                {/* Send OTP Button */}
                                                {!otpSent && (
                                                    <button
                                                        type="button"
                                                        onClick={handleSendOTP}
                                                        disabled={isSendingOtp || formData.phone.replace(/\D/g, '').length < 10}
                                                        className="h-11 sm:h-12 px-3 sm:px-4 bg-white text-black hover:bg-neon-pink font-bold rounded-xl text-[11px] sm:text-xs uppercase tracking-wider shrink-0 transition-all disabled:opacity-30 whitespace-nowrap active:scale-95"
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
                                                        className="p-3.5 sm:p-4 bg-white dark:bg-black/60 border border-black/[0.1] dark:border-white/[0.08] rounded-xl sm:rounded-2xl space-y-3"
                                                    >
                                                        <div className="flex items-center justify-between text-xs gap-2">
                                                            <span className="text-gray-900 dark:text-white/60 text-[11px] truncate">
                                                                Enter 6-digit code sent to <strong className="text-gray-900 dark:text-white font-mono">{countryCode} {formData.phone.slice(-10)}</strong>
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={() => { setOtpSent(false); setOtpDigits(['','','','','','']); }}
                                                                className="text-[10px] text-gray-900 dark:text-white/40 hover:text-gray-900 dark:hover:text-white underline uppercase font-bold shrink-0"
                                                            >
                                                                Edit
                                                            </button>
                                                        </div>

                                                        {/* Mobile Safe Grid of 6 PIN Boxes */}
                                                        <div className="grid grid-cols-6 gap-1.5 sm:gap-2.5 max-w-[290px] sm:max-w-[360px] w-full mx-auto" onPaste={handleOtpPaste}>
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
                                                                  className="w-full aspect-square text-center bg-gray-50 dark:bg-white/[0.04] border border-black/[0.1] dark:border-white/[0.1] rounded-xl text-base sm:text-xl font-bold text-gray-900 dark:text-white focus:border-neon-green focus:ring-1 focus:ring-neon-green outline-none transition-all"
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
                                                <div className="pt-1">
                                                    <p className="text-xs text-red-400 font-medium">{phoneError}</p>
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
                                    <h2 className="text-lg sm:text-2xl font-black font-heading uppercase tracking-tight text-gray-900 dark:text-white">
                                        Showcase your creative footprint
                                    </h2>
                                    <p className="text-[11px] sm:text-sm text-gray-900 dark:text-white/50 mt-0.5 sm:mt-1">
                                        Select your niche and connect your main creator channels.
                                    </p>
                                </div>

                                {/* Visual Niche Selector */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-gray-900 dark:text-white/40 uppercase tracking-wider block">Primary Content Niche *</label>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-2.5">
                                        {NICHE_OPTIONS.map(niche => {
                                            const isSelected = formData.categories === niche.id;
                                            const IconComponent = niche.icon;
                                            return (
                                                <button
                                                    key={niche.id}
                                                    type="button"
                                                    onClick={() => setFormData(p => ({ ...p, categories: niche.id }))}
                                                    className={cn(
                                                        "p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl text-left border transition-all flex flex-col justify-between gap-2.5 sm:gap-3 group",
                                                        isSelected
                                                            ? "bg-neon-pink/15 dark:bg-neon-pink/20 border-neon-pink shadow-md scale-[1.02] ring-1 ring-neon-pink text-gray-900 dark:text-white"
                                                            : "bg-white dark:bg-white/[0.02] border-gray-200 dark:border-white/[0.06] hover:bg-gray-50 dark:hover:bg-white/[0.04] hover:border-gray-300 dark:hover:border-white/20 text-gray-700 dark:text-white/70"
                                                    )}
                                                >
                                                    <div className={cn(
                                                        "w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl flex items-center justify-center transition-colors",
                                                        isSelected
                                                            ? "bg-neon-pink text-black"
                                                            : "bg-black/5 dark:bg-white/5 text-gray-600 dark:text-zinc-400 group-hover:text-black dark:group-hover:text-white"
                                                    )}>
                                                        <IconComponent size={15} />
                                                    </div>
                                                    <div>
                                                        <p className={cn("text-[11px] sm:text-xs font-bold leading-tight", isSelected ? "text-neon-pink dark:text-neon-pink font-black" : "text-gray-900 dark:text-white")}>{niche.label}</p>
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
                                                className="w-full h-11 sm:h-12 bg-white dark:bg-black/40 border border-black/[0.1] dark:border-white/[0.08] focus:border-black/30 dark:focus:border-white/30 rounded-xl px-3.5 sm:px-4 text-xs font-medium text-gray-900 dark:text-white outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-white/20"
                                            />
                                        </motion.div>
                                    )}

                                    {formData.categories === 'City Pages' && (
                                        <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="pt-2">
                                            <input
                                                type="text"
                                                name="cityPageFocus"
                                                value={formData.cityPageFocus}
                                                onChange={handleChange}
                                                placeholder="City / Locality or Page Focus (e.g. Bangalore Food & Nightlife, Delhi Events, So South Mumbai)"
                                                className="w-full h-11 sm:h-12 bg-white dark:bg-black/40 border border-black/[0.1] dark:border-white/[0.08] focus:border-black/30 dark:focus:border-white/30 rounded-xl px-3.5 sm:px-4 text-xs font-medium text-gray-900 dark:text-white outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-white/20"
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
                                                className="w-full h-11 sm:h-12 bg-white dark:bg-black/40 border border-black/[0.1] dark:border-white/[0.08] focus:border-black/30 dark:focus:border-white/30 rounded-xl px-3.5 sm:px-4 text-xs font-medium text-gray-900 dark:text-white outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-white/20"
                                            />
                                        </motion.div>
                                    )}
                                </div>

                                {/* Instagram Profile & Auto-Verification */}
                                <div className="relative overflow-hidden p-3.5 sm:p-5 bg-white dark:bg-white/[0.02] border border-black/[0.08] dark:border-white/[0.06] rounded-2xl sm:rounded-3xl space-y-3.5 sm:space-y-4 shadow-xs backdrop-blur-xl">
                                    {/* Header: Minimalist Label + Badge */}
                                    <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                                        <div className="space-y-0.5">
                                            <label className="text-[11px] sm:text-xs font-black uppercase tracking-widest text-gray-900 dark:text-white flex items-center gap-1.5 font-mono">
                                                <Instagram size={13} className="text-pink-500 shrink-0" />
                                                Instagram Handle
                                                <span className="text-pink-500">*</span>
                                            </label>
                                            <p className="text-[10px] text-gray-500 dark:text-zinc-400 font-medium font-mono">
                                                Requires minimum {minInstagramFollowers.toLocaleString()} followers
                                            </p>
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
                                            value={formData.instagram}
                                            onChange={handleInstagramChange}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    handleVerifyInstagram();
                                                }
                                            }}
                                            placeholder="yourhandle"
                                            autoCapitalize="none"
                                            autoCorrect="off"
                                            spellCheck="false"
                                            className={cn(
                                                "w-full h-11 sm:h-12 pl-8 sm:pl-9 pr-24 sm:pr-28 bg-gray-50/50 dark:bg-black/30 border rounded-xl text-xs sm:text-sm font-semibold text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-zinc-600 outline-none transition-all shadow-xs",
                                                instagramVerifiedData && instagramVerifiedData.handle === formData.instagram?.trim().replace(/^@/, '').toLowerCase()
                                                    ? "border-emerald-500/30 focus:border-emerald-500/50 focus:bg-white dark:focus:bg-black/50"
                                                    : instagramVerificationError
                                                    ? "border-red-500/30 focus:border-red-500/50 focus:bg-white dark:focus:bg-black/50"
                                                    : "border-black/10 dark:border-white/10 focus:border-pink-500/50 focus:bg-white dark:focus:bg-black/50"
                                            )}
                                        />
                                        
                                        {/* Clear button */}
                                        {formData.instagram && !isInstagramVerifying && !(instagramVerifiedData && instagramVerifiedData.handle === formData.instagram?.trim().replace(/^@/, '').toLowerCase()) && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setFormData(prev => ({ ...prev, instagram: '' }));
                                                    setInstagramVerificationError('');
                                                    setInstagramVerifiedData(null);
                                                }}
                                                className="absolute right-20 sm:right-24 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center text-gray-500 transition-colors"
                                            >
                                                <X size={11} className="stroke-[2.5]" />
                                            </button>
                                        )}

                                        {/* Verify Button Minimal */}
                                        <button
                                            type="button"
                                            onClick={() => handleVerifyInstagram()}
                                            disabled={isInstagramVerifying || !formData.instagram?.trim()}
                                            className={cn(
                                                "absolute right-1 sm:right-1.5 top-1/2 -translate-y-1/2 h-8 sm:h-9 px-3 sm:px-4 rounded-lg font-black text-[10px] sm:text-[11px] uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                                                instagramVerifiedData && instagramVerifiedData.handle === formData.instagram?.trim().replace(/^@/, '').toLowerCase()
                                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                                    : "bg-gray-900 text-white dark:bg-white dark:text-gray-900 hover:opacity-80 disabled:opacity-30 disabled:cursor-not-allowed shadow-xs"
                                            )}
                                        >
                                            {isInstagramVerifying ? (
                                                <LoadingSpinner size="xs" color="currentColor" />
                                            ) : instagramVerifiedData && instagramVerifiedData.handle === formData.instagram?.trim().replace(/^@/, '').toLowerCase() ? (
                                                <>
                                                    <Check size={12} className="stroke-[3]" />
                                                    <span>Verified</span>
                                                </>
                                            ) : (
                                                <span>Verify</span>
                                            )}
                                        </button>
                                    </div>

                                    {/* Verification Progress Indicator */}
                                    {isInstagramVerifying && (
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
                                                    Fetching follower count for @{formData.instagram?.trim().replace(/^@/, '')}
                                                </p>
                                            </div>
                                        </motion.div>
                                    )}

                                    {/* Verification Error Notice */}
                                    {instagramVerificationError && !isInstagramVerifying && !isManualFollowerEntry && (
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
                                            <div className="pt-3 border-t border-red-500/15 flex flex-wrap items-center justify-between gap-y-3 gap-x-2">
                                                <div className="flex items-center gap-1.5 text-[10px] text-red-600/80 dark:text-red-400/80 font-medium shrink-0">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                                                    <span>Profile must be set to <strong>Public</strong></span>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0 ml-auto">
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
                                                        onClick={() => handleVerifyInstagram()}
                                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-500/15 hover:bg-red-500/25 active:scale-95 text-red-600 dark:text-red-400 font-black text-[10px] uppercase tracking-wider transition-all border border-red-500/30 cursor-pointer shrink-0"
                                                    >
                                                        <RefreshCw size={10} className="stroke-[2.5]" />
                                                        <span>Retry</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}

                                    {/* Manual Follower Entry */}
                                    {isManualFollowerEntry && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -4 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="space-y-1.5 pt-2"
                                        >
                                            <div className="flex items-center justify-between pl-1">
                                                <label className="text-[11px] sm:text-xs font-black text-gray-700 dark:text-gray-300 uppercase tracking-widest">
                                                    Manual Follower Count
                                                </label>
                                                <button 
                                                    type="button" 
                                                    onClick={() => handleVerifyInstagram()}
                                                    className="text-[10px] font-bold text-brand-purple hover:text-brand-purple/80 uppercase tracking-wider transition-colors"
                                                >
                                                    Retry Auto-Verify
                                                </button>
                                            </div>
                                            <div className="relative group">
                                                <div className="absolute inset-y-0 left-0 pl-3 sm:pl-3.5 flex items-center pointer-events-none">
                                                    <Users size={16} className="text-gray-400 dark:text-zinc-500 group-focus-within:text-brand-purple transition-colors" />
                                                </div>
                                                <input
                                                    type="number"
                                                    placeholder={`e.g. ${minInstagramFollowers.toLocaleString()}`}
                                                    value={formData.instagramFollowers || ''}
                                                    onChange={e => setFormData({ ...formData, instagramFollowers: e.target.value })}
                                                    className="w-full pl-9 sm:pl-10 pr-4 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 hover:bg-white dark:hover:bg-zinc-900 focus:bg-white dark:focus:bg-zinc-900 focus:ring-2 focus:ring-brand-purple/20 focus:border-brand-purple text-xs sm:text-sm text-gray-900 dark:text-white transition-all shadow-sm font-mono placeholder:font-sans"
                                                />
                                            </div>
                                            <p className="text-[10px] text-gray-500 pl-1">
                                                Enter your exact follower count. Minimum {minInstagramFollowers.toLocaleString()} required.
                                            </p>
                                        </motion.div>
                                    )}

                                    {/* Verified Account Card */}
                                    {instagramVerifiedData && instagramVerifiedData.handle === formData.instagram?.trim().replace(/^@/, '').toLowerCase() && !isInstagramVerifying && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.98 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className={cn(
                                                "p-3.5 sm:p-4 rounded-xl border space-y-3 transition-all",
                                                instagramVerifiedData.meetsMinimumFollowers
                                                    ? "bg-emerald-500/[0.05] dark:bg-emerald-500/[0.04] border-emerald-500/30"
                                                    : "bg-amber-500/[0.05] dark:bg-amber-500/[0.04] border-amber-500/30"
                                            )}
                                        >
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="relative shrink-0">
                                                        <div className="p-[2px] rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600">
                                                            {instagramVerifiedData.profilePic ? (
                                                                <img
                                                                    src={instagramVerifiedData.profilePic}
                                                                    alt={instagramVerifiedData.name}
                                                                    className="w-11 h-11 rounded-full object-cover bg-black/40 block"
                                                                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                                                />
                                                            ) : (
                                                                <div className="w-11 h-11 rounded-full bg-black/60 flex items-center justify-center text-white">
                                                                    <Instagram size={18} />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-500 text-black flex items-center justify-center shadow-xs">
                                                            <Check size={10} className="stroke-[3]" />
                                                        </div>
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                            <span className="text-xs sm:text-sm font-black text-gray-900 dark:text-white truncate">
                                                                {instagramVerifiedData.name || `@${instagramVerifiedData.handle}`}
                                                            </span>
                                                            {instagramVerifiedData.isVerified && (
                                                                <CheckCircle2 size={13} className="text-sky-400 fill-sky-400 shrink-0" />
                                                            )}
                                                        </div>
                                                        <p className="text-[11px] text-gray-500 dark:text-zinc-400 font-mono truncate">
                                                            @{instagramVerifiedData.handle}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Desktop Status Pill */}
                                                <div className="hidden sm:block shrink-0">
                                                    {instagramVerifiedData.meetsMinimumFollowers ? (
                                                        <div className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-xl bg-emerald-500 text-black shadow-xs">
                                                            <CheckCircle2 size={13} className="stroke-[2.5]" />
                                                            <span>Eligible to Join</span>
                                                        </div>
                                                    ) : (
                                                        <div className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/30">
                                                            <AlertCircle size={13} />
                                                            <span>Below {minInstagramFollowers.toLocaleString()} Minimum</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Follower Stats Bar & Mobile Status Pill */}
                                            <div className="pt-2.5 border-t border-black/[0.06] dark:border-white/[0.06] flex items-center justify-between gap-2 flex-wrap">
                                                <div className="flex items-center gap-2">
                                                    <div className="px-2.5 py-1 rounded-lg bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 flex items-baseline gap-1.5">
                                                        <span className="text-sm font-black font-mono text-gray-900 dark:text-white">
                                                            {instagramVerifiedData.followers.toLocaleString()}
                                                        </span>
                                                        <span className="text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">
                                                            Followers
                                                        </span>
                                                    </div>
                                                    <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                                        <Check size={9} className="stroke-[3]" /> Auto-Verified
                                                    </span>
                                                </div>

                                                {/* Mobile Status Pill */}
                                                <div className="sm:hidden w-full pt-1">
                                                    {instagramVerifiedData.meetsMinimumFollowers ? (
                                                        <div className="flex items-center justify-center gap-1.5 text-[10px] font-black uppercase tracking-wider py-2 px-3 rounded-lg bg-emerald-500 text-black shadow-xs w-full">
                                                            <CheckCircle2 size={12} className="stroke-[2.5]" />
                                                            <span>Eligible to Join</span>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center justify-center gap-1.5 text-[10px] font-black uppercase tracking-wider py-2 px-3 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/30 w-full">
                                                            <AlertCircle size={12} />
                                                            <span>Below {minInstagramFollowers.toLocaleString()} Minimum</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}

                                    {/* Duplicate Warning */}
                                    {duplicateWarnings.instagram && (
                                        <p className="text-[11px] text-amber-400 font-medium">{duplicateWarnings.instagram}</p>
                                    )}

                                    {/* Removed Informational Guidance block as it is repetitive */}
                                </div>

                                {/* Optional Additional Channels */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-gray-900 dark:text-white/40 uppercase tracking-wider block">Additional Channels (Optional)</label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 items-start">
                                        <div className="relative">
                                            <Linkedin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-400" size={14} />
                                            <input
                                                type="text"
                                                name="linkedin"
                                                value={formData.linkedin}
                                                onChange={handleChange}
                                                placeholder="LinkedIn profile link"
                                                className="w-full h-11 sm:h-12 pl-9 sm:pl-10 pr-3 bg-white dark:bg-black/40 border border-black/[0.1] dark:border-white/[0.08] focus:border-blue-400 rounded-xl text-xs font-medium text-gray-900 dark:text-white outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-white/20"
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
                                                className="w-full h-11 sm:h-12 pl-9 sm:pl-10 pr-3 bg-white dark:bg-black/40 border border-black/[0.1] dark:border-white/[0.08] focus:border-red-400 rounded-xl text-xs font-medium text-gray-900 dark:text-white outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-white/20"
                                            />
                                        </div>
                                        <div className="relative">
                                            <Twitter className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sky-400" size={14} />
                                            <input
                                                type="text"
                                                name="twitter"
                                                value={formData.twitter}
                                                onChange={handleChange}
                                                placeholder="X / Twitter handle or link"
                                                className="w-full h-11 sm:h-12 pl-9 sm:pl-10 pr-3 bg-white dark:bg-black/40 border border-black/[0.1] dark:border-white/[0.08] focus:border-sky-400 rounded-xl text-xs font-medium text-gray-900 dark:text-white outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-white/20"
                                            />
                                        </div>
                                        <div className="relative">
                                            <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neon-green" size={14} />
                                            <input
                                                type="text"
                                                name="website"
                                                value={formData.website}
                                                onChange={handleChange}
                                                placeholder="Portfolio or Website link"
                                                className="w-full h-11 sm:h-12 pl-9 sm:pl-10 pr-3 bg-white dark:bg-black/40 border border-black/[0.1] dark:border-white/[0.08] focus:border-neon-green rounded-xl text-xs font-medium text-gray-900 dark:text-white outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-white/20"
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
                                className="space-y-5 sm:space-y-6"
                            >
                                <div>
                                    <h2 className="text-lg sm:text-2xl font-black font-heading uppercase tracking-tight text-gray-900 dark:text-white">
                                        Review & Final Terms
                                    </h2>
                                    <p className="text-[11px] sm:text-sm text-gray-900 dark:text-white/50 mt-0.5 sm:mt-1">
                                        Set your collaboration preferences and review your Creator Pass.
                                    </p>
                                </div>

                                {/* Collaboration Style Cards */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-gray-900 dark:text-white/40 uppercase tracking-wider block">
                                        Collaboration Preferences
                                    </label>
                                    <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
                                        {[
                                            { id: 'both', label: 'Open to Both', icon: Layers },
                                            { id: 'paid', label: 'Paid Only', icon: Banknote },
                                            { id: 'barter', label: 'Barter & Gigs', icon: Handshake }
                                        ].map(opt => {
                                            const isSelected = formData.doBarter === opt.id;
                                            const IconComp = opt.icon;
                                            return (
                                                <button
                                                    key={opt.id}
                                                    type="button"
                                                    onClick={() => setFormData(p => ({ ...p, doBarter: opt.id }))}
                                                    className={cn(
                                                        "p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border transition-all flex flex-col items-center justify-center gap-1.5 sm:gap-2",
                                                        isSelected
                                                            ? "bg-neon-green text-black border-neon-green font-black shadow-md shadow-neon-green/20 scale-[1.02]"
                                                            : "bg-white dark:bg-white/[0.02] text-gray-800 dark:text-white/60 border-gray-200 dark:border-white/[0.06] hover:text-black dark:hover:text-white hover:border-gray-300 dark:hover:border-white/20"
                                                    )}
                                                >
                                                    <div className={cn(
                                                        "w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl flex items-center justify-center transition-colors",
                                                        isSelected ? "bg-black text-neon-green" : "bg-black/5 dark:bg-white/5 text-gray-500 dark:text-zinc-400"
                                                    )}>
                                                        <IconComp size={15} />
                                                    </div>
                                                    <span className="text-[11px] sm:text-xs font-bold leading-tight text-center">{opt.label}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Typical Rates Range Slider */}
                                <div className="space-y-3 p-3.5 sm:p-4 bg-gray-50/80 dark:bg-white/[0.02] border border-black/[0.08] dark:border-white/[0.06] rounded-xl sm:rounded-2xl">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-900 dark:text-white/40 uppercase tracking-wider block">
                                                Typical Rates per Deliverable (Optional)
                                            </label>
                                            <p className="text-[11px] text-gray-500 dark:text-zinc-400">
                                                Select your expected price range for reels & campaign posts
                                            </p>
                                        </div>
                                        <div className="sm:text-right">
                                            <span className="text-xs sm:text-sm font-black font-mono text-neon-green bg-black px-3 py-1.5 rounded-xl border border-neon-green/30 shadow-[0_0_15px_rgba(57,255,20,0.15)] inline-flex items-center gap-1.5">
                                                <IndianRupee size={13} className="text-neon-green shrink-0" />
                                                {isRateFlexible ? "Flexible / Barter" : `${formatINRFull(rateMin)} – ${formatINRFull(rateMax)}${rateMax >= 100000 ? '+' : ''}`}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Presets */}
                                    <div className="flex flex-wrap gap-1 sm:gap-1.5 pt-1">
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
                                                            setFormData(p => ({ ...p, commercials: 'Flexible / Barter' }));
                                                        } else {
                                                            setIsRateFlexible(false);
                                                            setRateMin(preset.min);
                                                            setRateMax(preset.max);
                                                            setFormData(p => ({ ...p, commercials: `${formatINRFull(preset.min)} – ${formatINRFull(preset.max)}${preset.max >= 100000 ? '+' : ''} / Deliverable` }));
                                                        }
                                                    }}
                                                    className={cn(
                                                        "px-2 sm:px-2.5 py-1 rounded-lg text-[9px] sm:text-[10px] font-bold uppercase tracking-wider transition-all border",
                                                        isSelected
                                                            ? "bg-neon-green text-black border-neon-green font-black shadow-sm"
                                                            : "bg-white dark:bg-white/[0.04] text-gray-600 dark:text-zinc-400 border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20 hover:text-black dark:hover:text-white"
                                                    )}
                                                >
                                                    {preset.label}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* Synchronized Range Sliders */}
                                    {!isRateFlexible && (
                                        <div className="space-y-3 pt-2">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 items-center">
                                                <div className="space-y-1.5">
                                                    <div className="flex justify-between text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">
                                                        <span>From</span>
                                                        <span className="font-mono text-gray-900 dark:text-white font-black">{formatINRFull(rateMin)}</span>
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
                                                            setFormData(p => ({ ...p, commercials: `${formatINRFull(newMin)} – ${formatINRFull(rateMax)}${rateMax >= 100000 ? '+' : ''} / Deliverable` }));
                                                        }}
                                                        className="w-full accent-neon-green cursor-pointer h-2 bg-black/10 dark:bg-white/10 rounded-lg appearance-none"
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <div className="flex justify-between text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">
                                                        <span>Up To</span>
                                                        <span className="font-mono text-gray-900 dark:text-white font-black">{formatINRFull(rateMax)}{rateMax >= 100000 ? '+' : ''}</span>
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
                                                            setFormData(p => ({ ...p, commercials: `${formatINRFull(rateMin)} – ${formatINRFull(newMax)}${rateMax >= 100000 ? '+' : ''} / Deliverable` }));
                                                        }}
                                                        className="w-full accent-neon-green cursor-pointer h-2 bg-black/10 dark:bg-white/10 rounded-lg appearance-none"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Short Creator Statement & Invite Code */}
                                <div className="space-y-3">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-gray-900 dark:text-white/40 uppercase tracking-wider block">Short Creator Statement</label>
                                        <textarea
                                            name="bio"
                                            value={formData.bio}
                                            onChange={handleChange}
                                            placeholder="e.g. Bangalore lifestyle creator focusing on aesthetics, cafes, and campus culture. High engagement reels."
                                            rows={2}
                                            className="w-full bg-white dark:bg-black/40 border border-black/[0.1] dark:border-white/[0.08] focus:border-black/30 dark:focus:border-white/30 rounded-xl p-3 sm:p-3.5 text-xs font-medium text-gray-900 dark:text-white outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-white/20 resize-none"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <label className="text-[10px] font-bold text-gray-900 dark:text-white/40 uppercase tracking-wider">Invite Code (Optional)</label>
                                            {isReferralCodeLocked && (
                                                <span className="text-neon-green text-[10px] font-bold flex items-center gap-1 uppercase tracking-wider">
                                                    <Lock size={11} /> Applied
                                                </span>
                                            )}
                                        </div>
                                        <input
                                            type="text"
                                            name="referredBy"
                                            value={formData.referredBy}
                                            onChange={handleChange}
                                            disabled={isReferralCodeLocked}
                                            placeholder="Friend or creator invite code"
                                            className="w-full h-11 sm:h-12 bg-white dark:bg-black/40 border border-black/[0.1] dark:border-white/[0.08] focus:border-black/30 dark:focus:border-white/30 rounded-xl px-3.5 sm:px-4 text-xs font-medium text-gray-900 dark:text-white outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-white/20 disabled:opacity-50"
                                        />
                                    </div>
                                </div>

                                {/* Official Creator Pass Preview in Step 4 */}
                                <div className="space-y-3 pt-2">
                                    <div className="flex items-center justify-between px-0.5">
                                        <label className="text-[10px] font-bold text-gray-900 dark:text-white/40 uppercase tracking-wider flex items-center gap-1.5">
                                            <ShieldCheck size={13} className="text-neon-green" />
                                            <span>Your Official Newbi Creator Pass</span>
                                        </label>
                                    </div>
                                    <div className="flex justify-center w-full">
                                        <CreatorPassCard 
                                            profile={livePreviewProfile}
                                            isPreview={true}
                                        />
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Step Navigation Actions */}
                    <div className="pt-3.5 sm:pt-4 border-t border-black/[0.08] dark:border-white/[0.06] flex items-center justify-between gap-2.5 sm:gap-3">
                        {step > 1 ? (
                            <button
                                type="button"
                                onClick={prevStep}
                                className="h-11 sm:h-12 px-4 sm:px-5 bg-gray-100 dark:bg-white/[0.04] hover:bg-gray-200 dark:hover:bg-white/[0.08] text-gray-900 dark:text-white/60 hover:text-gray-900 dark:hover:text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 sm:gap-2 border border-black/[0.08] dark:border-white/[0.08] active:scale-95"
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
                                className="h-11 sm:h-12 px-5 sm:px-6 bg-white hover:bg-neon-pink text-black font-bold rounded-xl text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 sm:gap-2 shadow-lg ml-auto active:scale-95"
                            >
                                <span>Continue</span>
                                <ArrowRight size={14} />
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="h-11 sm:h-12 px-4 sm:px-8 bg-neon-green hover:brightness-110 text-black font-black rounded-xl text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 sm:gap-2 shadow-[0_0_25px_rgba(57,255,20,0.3)] ml-auto disabled:opacity-40 active:scale-95"
                            >
                                {isSubmitting ? (
                                    <>
                                        <LoadingSpinner size="xs" color="black" />
                                        <span>Submitting...</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="hidden sm:inline">Submit Creator Application</span>
                                        <span className="sm:hidden">Submit Application</span>
                                        <Check size={14} strokeWidth={3} />
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>
                )}

                {/* Trust Footer Notice */}
                <div className="flex items-center justify-center gap-2 text-center text-[10px] font-bold text-gray-900 dark:text-white/30 uppercase tracking-wider">
                    <ShieldCheck size={13} className="text-neon-green" />
                    <span>Official Newbi Creator Collective • 100% Creator Perks • Free Forever</span>
                </div>
            </div>
        </div>
    );
};

export default CreatorJoin;

