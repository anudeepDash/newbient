import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../lib/store';
import { useStoreSubscription } from '../hooks/useStoreSubscription';
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
import Activity from 'lucide-react/dist/esm/icons/activity';
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
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import GlobalLoader from '../components/ui/GlobalLoader';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import useDynamicMeta from '../hooks/useDynamicMeta';
import { RecaptchaVerifier, PhoneAuthProvider, linkWithCredential } from 'firebase/auth';
import { auth } from '../lib/firebase';

const NICHES = [
    'Student/ Campus Creator',
    'Fashion & Luxury',
    'Tech & Gaming',
    'Travel & Lifestyle',
    'Beauty & Fitness',
    'Food & Beverage',
    'College Pages',
    'Startup',
    'Finance',
    'Business',
    'Real Estate',
    'Career',
    'Entrepreneurship',
    'Others'
];

const COUNTRY_OPTIONS = [
    { value: '+91', label: '🇮🇳 +91' },
    { value: '+1', label: '🇺🇸 +1' },
    { value: '+44', label: '🇬🇧 +44' },
    { value: '+971', label: '🇦🇪 +971' },
    { value: '+61', label: '🇦🇺 +61' }
];

const OTPVerificationSuccess = () => {
    return (
        <div className="relative py-4 flex flex-row items-center justify-start text-left gap-6">
            <div className="absolute inset-y-0 left-0 w-64 h-full bg-neon-green/5 blur-[60px] pointer-events-none rounded-full" />
            
            <div className="relative flex items-center justify-center w-16 h-16 shrink-0">
                <motion.div 
                    initial={{ scale: 0.5, opacity: 1 }}
                    animate={{ scale: 2.2, opacity: 0 }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: "easeOut" }}
                    className="absolute w-16 h-16 rounded-full border border-neon-green/30"
                />
                <motion.div 
                    initial={{ scale: 0.5, opacity: 0.8 }}
                    animate={{ scale: 1.6, opacity: 0 }}
                    transition={{ duration: 1.2, delay: 0.4, repeat: Infinity, ease: "easeOut" }}
                    className="absolute w-16 h-16 rounded-full border-2 border-neon-green/20"
                />
                <motion.div 
                    initial={{ rotate: 0 }}
                    animate={{ rotate: 360 }}
                    transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                    className="absolute w-14 h-14 border border-dashed border-neon-green/40 rounded-full"
                />
                <motion.div
                    initial={{ scale: 0, rotate: -45 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 260, damping: 15 }}
                    className="relative w-12 h-12 rounded-full bg-[#020202] border border-neon-green flex items-center justify-center shadow-[0_0_30px_rgba(57,255,20,0.3)] z-10"
                >
                    <svg className="w-6 h-6 text-neon-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                        <motion.path
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                        />
                    </svg>
                </motion.div>
                {[...Array(4)].map((_, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 0, x: 0, scale: 0.8 }}
                        animate={{ opacity: [0, 1, 0], y: -35 - Math.random() * 25, x: (Math.random() - 0.5) * 50, scale: [0.8, 1.2, 0.4] }}
                        transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.35, ease: "easeOut" }}
                        className="absolute w-1 h-1 rounded-full bg-neon-green shadow-[0_0_6px_rgba(57,255,20,0.8)]"
                    />
                ))}
            </div>

            <div className="space-y-1 relative z-10">
                <motion.h4 
                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}
                    className="text-xl font-black font-heading tracking-widest uppercase italic text-neon-green"
                >
                    Phone Verified
                </motion.h4>
            </div>
        </div>
    );
};

const CustomSelect = ({ value, onChange, options, name, placeholder, icon: Icon, className, isCountryCode }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
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
    const displayLabel = currentOption ? (typeof currentOption === 'object' ? currentOption.label : currentOption.toUpperCase()) : placeholder;

    return (
        <div ref={containerRef} className={cn("relative", isCountryCode ? "w-24 sm:w-36 shrink-0" : "w-full")}>
            <button
                type="button" onClick={handleToggle}
                className={cn(
                    "w-full h-16 bg-white/[0.02] border border-white/10 rounded-2xl text-base font-bold text-left focus:border-neon-blue focus:outline-none transition-all flex items-center justify-between group",
                    isCountryCode ? "px-3" : "pl-12 pr-10",
                    isOpen && "border-neon-blue/50 ring-1 ring-neon-blue/50",
                    className
                )}
            >
                {!isCountryCode && Icon && <Icon className={cn("absolute left-4 top-1/2 -translate-y-1/2 transition-colors", isOpen ? "text-neon-blue" : "text-gray-500")} size={20} />}
                <span className={value ? "text-white" : "text-white/20"}>{displayLabel}</span>
                <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }} className="text-gray-500 group-hover:text-white">
                    <ChevronDown size={isCountryCode ? 14 : 18} />
                </motion.div>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.ul
                        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.15 }}
                        className="absolute z-[100] w-full mt-1.5 max-h-48 overflow-y-auto bg-zinc-950/95 border border-white/10 backdrop-blur-2xl rounded-2xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)] py-1 text-white scrollbar-thin scrollbar-thumb-white/10"
                    >
                        {options.map((opt, idx) => {
                            const optVal = typeof opt === 'object' ? opt.value : opt;
                            const optLabel = typeof opt === 'object' ? opt.label : opt.toUpperCase();
                            const isSelected = optVal === value;
                            return (
                                <li key={optVal}>
                                    <button
                                        type="button" onClick={() => handleSelect(opt)}
                                        className={cn(
                                            "w-full px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider transition-all hover:bg-white/5 hover:text-neon-blue flex items-center justify-between",
                                            isSelected && "bg-neon-blue/10 text-neon-blue font-black",
                                            idx === highlightedIndex && "bg-white/5"
                                        )}
                                    >
                                        {optLabel}
                                        {isSelected && <Check size={12} className="text-neon-blue" />}
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
    useDynamicMeta({ title: "Join Creator Network", description: "Register to join Newbi's Elite Creator Network.", url: window.location.href });

    const { user, authInitialized, setAuthModal, addCreator, creators, uploadToCloudinary, loading } = useStore();
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        name: '', phone: '', email: '', city: '', customCity: '', categories: '', customNiche: '',
        collegeName: '', bio: '', doBarter: '', commercials: '', primaryPlatform: 'instagram',
        instagram: '', instagramFollowers: '', youtube: '', twitter: '', linkedin: '', linkedinFollowers: '',
        profilePicture: '', referredBy: ''
    });

    const [countryCode, setCountryCode] = useState('+91');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [hasJoined, setHasJoined] = useState(false);
    const [isReferralCodeLocked, setIsReferralCodeLocked] = useState(false);

    const [otpValues, setOtpValues] = useState(['', '', '', '', '', '']);
    const [isSendingOtp, setIsSendingOtp] = useState(false);
    const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
    const [otpSent, setOtpSent] = useState(false);
    const [isPhoneVerified, setIsPhoneVerified] = useState(false);
    const isPhoneVerifiedRef = useRef(false);
    const setPhoneVerified = (val) => {
        setIsPhoneVerified(val);
        isPhoneVerifiedRef.current = val;
    };
    const [confirmationResult, setConfirmationResult] = useState(null);
    const recaptchaVerifier = useRef(null);
    const recaptchaId = useRef(`recaptcha-creator-${Math.random().toString(36).slice(2, 11)}`).current;
    const otpRefs = useRef([]);

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
        if (container) {
            container.remove();
        }
    };

    useEffect(() => {
        return () => {
            cleanupRecaptcha();
        };
    }, []);

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
                    } else {
                        updates.phone = cleanPhone;
                    }
                    setPhoneVerified(true);
                }
                return Object.keys(updates).length > 0 ? { ...prev, ...updates } : prev;
            });
        }
    }, [user]);

    useEffect(() => {
        if (user && creators && !loading) {
            if (creators.find(c => c.uid === user.uid)) navigate('/creator-dashboard');
        }
    }, [user, creators, loading, navigate]);

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
        setFormData(prev => ({ ...prev, [name]: value }));
        if (name === 'phone') {
            const cleanInput = value.replace(/\D/g, '');
            const cleanUserPhone = user?.phoneNumber?.replace(/\D/g, '') || '';
            setPhoneVerified(cleanInput && cleanUserPhone && cleanUserPhone.endsWith(cleanInput));
        }
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setIsSubmitting(true);
        try {
            const url = await uploadToCloudinary(file);
            setFormData(prev => ({ ...prev, profilePicture: url }));
            useStore.getState().addToast("Profile picture uploaded!", 'success');
        } catch (error) {
            useStore.getState().addToast("Couldn't upload your photo.", 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSendOTP = async () => {
        if (!formData.phone) return useStore.getState().addToast("Please enter a contact number", 'error');
        setIsSendingOtp(true);
        try {
            const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            if (isLocal) {
                setOtpSent(true);
                useStore.getState().addToast("Local mode: use any 6-digit code.", 'success');
                return;
            }
            if (!recaptchaVerifier.current) {
                // Ensure any existing container is removed
                const existing = document.getElementById(recaptchaId);
                if (existing) existing.remove();

                // Create a new container element dynamically
                const container = document.createElement('div');
                container.id = recaptchaId;
                container.className = "fixed bottom-0 right-0 z-[200]";
                document.body.appendChild(container);

                try {
                    recaptchaVerifier.current = new RecaptchaVerifier(auth, container, {
                        size: 'invisible',
                        callback: () => {},
                        'expired-callback': () => {
                            useStore.getState().addToast("reCAPTCHA expired. Please try again.", 'error');
                            cleanupRecaptcha();
                        }
                    });
                    await recaptchaVerifier.current.render();
                } catch (error) {
                    console.error("Recaptcha init error:", error);
                }
            }
            const cleanPhone = formData.phone.replace(/\D/g, '');
            const formattedPhone = `${countryCode}${cleanPhone}`;
            const phoneProvider = new PhoneAuthProvider(auth);
            const verificationId = await phoneProvider.verifyPhoneNumber(
                formattedPhone,
                recaptchaVerifier.current
            );
            setConfirmationResult(verificationId);
            setOtpSent(true);
            useStore.getState().addToast("Verification code sent to your phone!", 'success');
        } catch (err) {
            console.error("Phone verification error:", err);
            useStore.getState().addToast(err.message || "Could not send SMS verification code.", 'error');
            cleanupRecaptcha();
        } finally {
            setIsSendingOtp(false);
        }
    };

    const handleVerifyOTP = async (codeToVerify) => {
        const fullCode = typeof codeToVerify === 'string' ? codeToVerify : otpValues.join('');
        if (fullCode.length !== 6) return useStore.getState().addToast("Please enter the 6-digit code.", 'error');
        setIsVerifyingOtp(true);
        try {
            const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            if (isLocal) {
                setPhoneVerified(true);
                useStore.getState().addToast("Phone verified (Local Bypass)!", 'success');
                return;
            }
            const credential = PhoneAuthProvider.credential(confirmationResult, fullCode);
            await linkWithCredential(auth.currentUser, credential);
            setPhoneVerified(true);
            useStore.getState().addToast("Phone verified successfully!", 'success');
        } catch (err) {
            if (err.code === 'auth/credential-already-in-use') {
                setPhoneVerified(true);
                useStore.getState().addToast("Phone verified! (Number linked to another account)", 'success');
            } else {
                useStore.getState().addToast("Invalid code. Please try again.", 'error');
            }
        } finally {
            setIsVerifyingOtp(false);
        }
    };

    const handleOtpChange = (val, idx) => {
        if (isNaN(val)) return;
        const newOtp = [...otpValues];
        newOtp[idx] = val;
        setOtpValues(newOtp);
        if (val !== '' && idx < 5) otpRefs.current[idx + 1]?.focus();
        if (val !== '' && newOtp.every(digit => digit !== '')) handleVerifyOTP(newOtp.join(''));
    };

    const handleOtpKeyDown = (e, idx) => {
        if (e.key === 'Backspace') {
            if (otpValues[idx] === '' && idx > 0) {
                otpRefs.current[idx - 1]?.focus();
                const newOtp = [...otpValues];
                newOtp[idx - 1] = '';
                setOtpValues(newOtp);
            } else {
                const newOtp = [...otpValues];
                newOtp[idx] = '';
                setOtpValues(newOtp);
            }
        }
    };

    const handleOtpPaste = (e) => {
        e.preventDefault();
        const pasteData = e.clipboardData.getData('text').trim();
        if (pasteData.length === 6 && !isNaN(pasteData)) {
            setOtpValues(pasteData.split(''));
            otpRefs.current[5]?.focus();
            handleVerifyOTP(pasteData);
        }
    };

    const validateForm = () => {
        if (!formData.name?.trim()) return "Full Name is required.";
        if (!isPhoneVerifiedRef.current) return "Please verify your contact number via OTP.";
        if (!formData.email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) return "Please enter a valid email address.";
        if (!formData.city) return "Please select a Hub City.";
        if (formData.city === 'Others' && !formData.customCity?.trim()) return "Please specify your custom city.";
        
        if (!formData.categories) return "Please select a Content Niche.";
        if (formData.categories === 'Others' && !formData.customNiche?.trim()) return "Please specify your custom niche.";
        if ((formData.categories === 'Student/ Campus Creator' || formData.categories === 'Student Creator/ Campus Creator' || formData.categories === 'College Pages') && !formData.collegeName?.trim()) {
            return "College Name is required for Student/Campus Creators.";
        }

        if (!formData.primaryPlatform) return "Please select a Primary Platform.";
        if (formData.primaryPlatform === 'instagram' || formData.primaryPlatform === 'both') {
            if (!formData.instagram?.trim()) return "Instagram Handle is required.";
            if (formData.instagram.includes('/') || formData.instagram.includes('.com')) return "Enter only the Instagram username, not a link.";
            if (!formData.instagramFollowers || Number(formData.instagramFollowers) < 0) return "Valid Instagram Followers count is required.";
        }
        if (formData.primaryPlatform === 'linkedin' || formData.primaryPlatform === 'both') {
            if (!formData.linkedin?.trim()) return "LinkedIn Profile URL is required.";
            if (!formData.linkedin.includes('linkedin.com/')) return "Enter a valid LinkedIn Profile URL.";
            if (!formData.linkedinFollowers || Number(formData.linkedinFollowers) < 0) return "Valid LinkedIn Connections count is required.";
        }

        if (!formData.bio?.trim() || formData.bio.trim().length < 10) return "Professional Bio is required (min 10 chars).";
        if (!formData.doBarter) return "Please select Barter Preference.";
        if (!formData.commercials?.trim()) return "Commercial Rates are required.";
        
        return null;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!user) { setAuthModal(true); return; }
        const errorMsg = validateForm();
        if (errorMsg) { useStore.getState().addToast(errorMsg, 'error'); return; }

        setIsSubmitting(true);
        try {
            const finalCity = formData.city === 'Others' ? formData.customCity : formData.city;
            const finalNiche = formData.categories === 'Others' ? formData.customNiche : formData.categories;
            const cleanInstagram = formData.instagram ? formData.instagram.trim().replace(/^@/, '') : '';
            const cleanLinkedin = formData.linkedin ? formData.linkedin.trim() : '';

            await addCreator({
                uid: user.uid,
                email: formData.email || user.email,
                displayName: formData.name || user.displayName,
                profileStatus: 'pending',
                ...formData,
                instagram: cleanInstagram,
                linkedin: cleanLinkedin,
                city: finalCity,
                categories: finalNiche,
                specializations: [finalNiche],
                isVerified: false,
                isPhoneVerified: true
            });
            setHasJoined(true);
            try { confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } }); } catch(err) {}
        } catch (error) {
            console.error("Error joining:", error);
            useStore.getState().addToast("Couldn't submit application.", 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!authInitialized || loading) return <GlobalLoader color="#00F0FF" />;

    if (hasJoined) {
        return (
            <div className="min-h-screen bg-[#020202] text-white pt-40 pb-20 px-4 text-center relative overflow-hidden">
                <div className="absolute top-[30%] left-1/2 -translate-x-1/2 w-[60%] h-[60%] bg-neon-blue/10 rounded-full blur-[150px] pointer-events-none" />
                <motion.div initial={{ opacity: 0, scale: 0.9, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                    className="max-w-xl mx-auto p-12 md:p-16 bg-zinc-950/45 backdrop-blur-3xl border border-white/[0.08] rounded-[4rem] shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_40px_80px_rgba(0,0,0,0.7)] relative z-10"
                >
                    <div className="w-24 h-24 bg-neon-blue rounded-[2rem] flex items-center justify-center mx-auto mb-10 shadow-[0_0_50px_rgba(46,191,255,0.3)]">
                        <CheckCircle2 size={48} className="text-black" />
                    </div>
                    <h2 className="text-5xl font-black font-heading tracking-tighter uppercase mb-6 italic pr-4">APPLICATION SENT.</h2>
                    <p className="text-gray-400 mb-12 font-medium text-lg leading-relaxed uppercase tracking-tight">Your creator profile is being analyzed by our team. You can now access your studio workspace.</p>
                    <button onClick={() => navigate('/creator-dashboard')} className="w-full h-20 rounded-2xl font-black font-heading uppercase tracking-[0.2em] bg-white text-black hover:bg-neon-blue transition-all flex items-center justify-center gap-4 shadow-[0_20px_50px_rgba(255,255,255,0.1)] group">
                        Enter Creator Studio <ArrowRight size={20} className="group-hover:translate-x-2 transition-transform" />
                    </button>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#020202] text-white pt-32 pb-40 px-4 relative overflow-hidden">
            {/* Atmosphere */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[10%] right-[-10%] w-[60%] h-[60%] bg-neon-blue/15 rounded-full blur-[180px]" />
                <div className="absolute bottom-[10%] left-[-10%] w-[50%] h-[50%] bg-neon-pink/10 rounded-full blur-[180px]" />
            </div>

            <div className="relative z-10 w-full max-w-4xl mx-auto">
                {!user ? (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-2xl mx-auto text-center mt-20">
                        <div className="p-16 bg-zinc-950/45 backdrop-blur-3xl border border-white/[0.08] rounded-[4rem] shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_30px_60px_rgba(0,0,0,0.6)]">
                            <Activity className="w-20 h-20 text-neon-blue mx-auto mb-10" />
                            <h3 className="text-4xl font-black font-heading mb-6 italic uppercase">SIGN IN REQUIRED</h3>
                            <p className="text-gray-500 mb-12 font-medium text-lg leading-relaxed uppercase tracking-tight">You need to sign in to submit your creator registration.</p>
                            <button onClick={() => setAuthModal(true)} className="h-20 px-16 rounded-2xl text-base font-black font-heading uppercase tracking-[0.2em] bg-white text-black hover:bg-neon-blue transition-all shadow-[0_20px_40px_rgba(255,255,255,0.1)] flex items-center gap-4 mx-auto">
                                Sign In <ArrowRight size={20} />
                            </button>
                        </div>
                    </motion.div>
                ) : (
                    <div className="space-y-12">
                        {/* Header */}
                        <div className="text-center space-y-6">
                            <div className="relative w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                                <div className="absolute inset-0 bg-neon-blue/20 blur-xl rounded-full animate-pulse" />
                                <motion.div animate={{ rotate: 360 }} transition={{ duration: 10, repeat: Infinity, ease: "linear" }} className="absolute inset-0 rounded-[2rem] border border-dashed border-neon-blue/40" />
                                <div className="relative w-20 h-20 rounded-[1.8rem] bg-zinc-950 border border-white/[0.08] flex items-center justify-center text-neon-blue shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]">
                                    <Zap size={36} className="text-neon-blue filter drop-shadow-[0_0_8px_rgba(0,240,255,0.5)]" />
                                </div>
                            </div>
                            <h2 className="text-4xl md:text-6xl font-black font-heading tracking-tighter uppercase italic text-white leading-none">
                                JOIN THE <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-blue via-white to-neon-pink">CREATOR NETWORK.</span>
                            </h2>
                            <p className="text-gray-400 font-medium text-lg uppercase tracking-tight max-w-xl mx-auto">
                                Complete your profile to unlock exclusive brand collaborations, digital products, and analytics.
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-8">
                            {/* Card 1: Identity & Contact */}
                            <div className="bg-zinc-950/60 backdrop-blur-3xl border border-white/[0.08] rounded-3xl md:rounded-[3rem] p-6 md:p-10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_30px_60px_rgba(0,0,0,0.4)] relative z-40">
                                <div className="absolute inset-0 overflow-hidden rounded-3xl md:rounded-[3rem] pointer-events-none">
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-neon-blue/5 blur-[100px]" />
                                </div>
                                
                                <div className="relative z-10 flex items-center gap-4 mb-8 border-b border-white/10 pb-6">
                                    <div className="w-12 h-12 bg-neon-blue/10 rounded-xl flex items-center justify-center border border-neon-blue/20">
                                        <User className="text-neon-blue" size={24} />
                                    </div>
                                    <h3 className="text-2xl font-black font-heading uppercase italic tracking-tight">Identity & Contact</h3>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Profile Pic Upload */}
                                    <div className="md:col-span-2 flex items-center gap-6 mb-4">
                                        <div className="relative group">
                                            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-[2rem] bg-black border-2 border-white/10 flex items-center justify-center overflow-hidden transition-all group-hover:border-neon-blue/40">
                                                {formData.profilePicture ? (
                                                    <img src={formData.profilePicture} alt="Preview" className="w-full h-full object-cover" />
                                                ) : (
                                                    <Camera size={32} className="text-gray-700 group-hover:text-neon-blue transition-colors" />
                                                )}
                                            </div>
                                            <label className="absolute -bottom-2 -right-2 w-10 h-10 bg-neon-blue text-black rounded-xl flex items-center justify-center cursor-pointer hover:scale-110 active:scale-95 transition-all shadow-xl">
                                                <Upload size={18} />
                                                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                                            </label>
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-black uppercase tracking-[0.2em] text-white">Profile Photo</h4>
                                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-1">Make a good first impression</p>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Full Name</label>
                                        <Input name="name" value={formData.name} onChange={handleChange} placeholder="Stage or Legal Name" className="h-16 bg-white/[0.02] border-white/10 rounded-2xl text-base font-bold px-6 focus:border-neon-blue" />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Email Address</label>
                                        <div className="relative">
                                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                                            <Input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="email@example.com" className="h-16 pl-12 pr-6 bg-white/[0.02] border-white/10 rounded-2xl text-base font-bold focus:border-neon-blue" />
                                        </div>
                                    </div>

                                    <div className="md:col-span-2 space-y-2">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Contact Number</label>
                                        {!otpSent ? (
                                            <div className="flex gap-3">
                                                <CustomSelect value={countryCode} onChange={(e) => setCountryCode(e.target.value)} options={COUNTRY_OPTIONS} name="countryCode" placeholder="+91" isCountryCode />
                                                <div className="relative flex-1">
                                                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                                                    <Input type="tel" name="phone" value={formData.phone} onChange={handleChange} disabled={isPhoneVerified} placeholder="99999 99999" className="h-16 pl-12 pr-6 bg-white/[0.02] border-white/10 rounded-2xl text-base font-bold focus:border-neon-blue" />
                                                </div>
                                                {isPhoneVerified ? (
                                                    <div className="h-16 px-4 bg-neon-green/10 border border-neon-green/20 rounded-2xl flex items-center justify-center text-neon-green">
                                                        <ShieldCheck size={20} />
                                                    </div>
                                                ) : (
                                                    <button type="button" onClick={handleSendOTP} disabled={isSendingOtp || !formData.phone} className="h-16 px-6 sm:px-8 rounded-2xl bg-neon-blue text-black font-black uppercase tracking-widest text-xs hover:scale-105 active:scale-95 transition-all disabled:opacity-50 whitespace-nowrap">
                                                        {isSendingOtp ? <LoadingSpinner size="xs" color="black" /> : 'Send OTP'}
                                                    </button>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="bg-white/[0.02] border border-white/10 p-6 rounded-2xl">
                                                {isPhoneVerified ? (
                                                    <OTPVerificationSuccess />
                                                ) : (
                                                    <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
                                                        <div className="flex gap-2">
                                                            {otpValues.map((digit, idx) => (
                                                                <input
                                                                    key={idx} ref={el => otpRefs.current[idx] = el} type="text" maxLength={1} value={digit}
                                                                    disabled={isVerifyingOtp} onChange={e => handleOtpChange(e.target.value, idx)}
                                                                    onKeyDown={e => handleOtpKeyDown(e, idx)} onPaste={handleOtpPaste}
                                                                    className={cn("w-10 h-14 sm:w-12 sm:h-16 bg-white/[0.04] border-2 rounded-xl text-center text-xl font-black text-white focus:border-neon-blue focus:outline-none transition-all", isVerifyingOtp ? "border-neon-pink/40 animate-pulse" : "border-white/10")}
                                                                />
                                                            ))}
                                                        </div>
                                                        <div className="flex gap-3">
                                                            <button type="button" onClick={handleVerifyOTP} disabled={isVerifyingOtp || otpValues.join('').length !== 6} className="h-14 px-6 rounded-xl bg-neon-pink text-black font-black uppercase tracking-widest text-xs hover:scale-105 active:scale-95 transition-all disabled:opacity-30">
                                                                Confirm
                                                            </button>
                                                            <button type="button" onClick={() => { setOtpSent(false); setOtpValues(['','','','','','']); }} className="text-xs text-gray-500 hover:text-white font-bold uppercase tracking-widest">
                                                                Back
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Operating Hub City</label>
                                        <CustomSelect value={formData.city} onChange={handleChange} options={PREDEFINED_CITIES} name="city" placeholder="Select City" icon={MapPin} />
                                    </div>

                                    {formData.city === 'Others' && (
                                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Specify City</label>
                                            <Input name="customCity" value={formData.customCity} onChange={handleChange} placeholder="e.g. Pune, Indore" className="h-16 bg-white/[0.02] border-white/10 rounded-2xl text-base font-bold px-6 focus:border-neon-blue" />
                                        </motion.div>
                                    )}
                                </div>
                            </div>

                            {/* Card 2: Content Niche */}
                            <div className="bg-zinc-950/60 backdrop-blur-3xl border border-white/[0.08] rounded-3xl md:rounded-[3rem] p-6 md:p-10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_30px_60px_rgba(0,0,0,0.4)] relative z-30">
                                <div className="absolute inset-0 overflow-hidden rounded-3xl md:rounded-[3rem] pointer-events-none">
                                    <div className="absolute top-0 left-0 w-64 h-64 bg-neon-pink/5 blur-[100px]" />
                                </div>
                                <div className="relative z-10 flex items-center gap-4 mb-8 border-b border-white/10 pb-6">
                                    <div className="w-12 h-12 bg-neon-pink/10 rounded-xl flex items-center justify-center border border-neon-pink/20">
                                        <Tag className="text-neon-pink" size={24} />
                                    </div>
                                    <h3 className="text-2xl font-black font-heading uppercase italic tracking-tight">Content Profile</h3>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Primary Content Niche</label>
                                        <CustomSelect value={formData.categories} onChange={handleChange} options={NICHES} name="categories" placeholder="Select Niche" icon={Activity} />
                                    </div>

                                    {formData.categories === 'Others' && (
                                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Specify Niche</label>
                                            <Input name="customNiche" value={formData.customNiche} onChange={handleChange} placeholder="e.g. Comedy, Art" className="h-16 bg-white/[0.02] border-white/10 rounded-2xl text-base font-bold px-6 focus:border-neon-blue" />
                                        </motion.div>
                                    )}

                                    <AnimatePresence>
                                        {(formData.categories === 'Student/ Campus Creator' || formData.categories === 'Student Creator/ Campus Creator' || formData.categories === 'College Pages') && (
                                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="md:col-span-2 space-y-2 overflow-hidden">
                                                <label className="text-[10px] font-black text-neon-blue uppercase tracking-widest pl-1">College / University Name (Required)</label>
                                                <Input name="collegeName" value={formData.collegeName} onChange={handleChange} placeholder="e.g. Delhi University, IIT" className="h-16 bg-white/[0.02] border-white/10 rounded-2xl text-base font-bold px-6 focus:border-neon-blue border-neon-blue/30" />
                                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest pl-1 mt-1">Helps us connect you with regional campus campaigns.</p>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>

                            {/* Card 3: Social Links */}
                            <div className="bg-zinc-950/60 backdrop-blur-3xl border border-white/[0.08] rounded-3xl md:rounded-[3rem] p-6 md:p-10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_30px_60px_rgba(0,0,0,0.4)] relative z-20">
                                <div className="absolute inset-0 overflow-hidden rounded-3xl md:rounded-[3rem] pointer-events-none">
                                    <div className="absolute bottom-0 right-0 w-64 h-64 bg-neon-blue/5 blur-[100px]" />
                                </div>
                                <div className="relative z-10 flex items-center gap-4 mb-8 border-b border-white/10 pb-6">
                                    <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center border border-white/10">
                                        <Globe className="text-white" size={24} />
                                    </div>
                                    <h3 className="text-2xl font-black font-heading uppercase italic tracking-tight">Social Platforms</h3>
                                </div>

                                <div className="space-y-8">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Primary Platform</label>
                                        <CustomSelect
                                            value={formData.primaryPlatform} onChange={handleChange}
                                            options={[{ value: 'instagram', label: 'Instagram' }, { value: 'linkedin', label: 'LinkedIn' }, { value: 'both', label: 'Both Instagram & LinkedIn' }]}
                                            name="primaryPlatform" placeholder="Select Primary Platform" icon={Users}
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <AnimatePresence>
                                            {(formData.primaryPlatform === 'instagram' || formData.primaryPlatform === 'both') && (
                                                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4 md:col-span-2 p-6 bg-gradient-to-br from-pink-500/5 to-purple-500/5 border border-pink-500/10 rounded-3xl">
                                                    <div className="flex items-center gap-2 text-pink-500 mb-2"><Instagram size={20} /> <span className="font-black uppercase tracking-wider text-xs">Instagram Info</span></div>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                        <div className="space-y-2">
                                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Handle</label>
                                                            <Input name="instagram" value={formData.instagram} onChange={handleChange} placeholder="@yourhandle" className="h-16 bg-black/40 border-white/10 rounded-2xl text-base font-bold px-6 focus:border-pink-500" />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Followers Count</label>
                                                            <Input type="number" name="instagramFollowers" value={formData.instagramFollowers} onChange={handleChange} placeholder="e.g. 5000" className="h-16 bg-black/40 border-white/10 rounded-2xl text-base font-bold px-6 focus:border-pink-500" />
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}
                                            {(formData.primaryPlatform === 'linkedin' || formData.primaryPlatform === 'both') && (
                                                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4 md:col-span-2 p-6 bg-gradient-to-br from-blue-500/5 to-cyan-500/5 border border-blue-500/10 rounded-3xl">
                                                    <div className="flex items-center gap-2 text-blue-500 mb-2"><Linkedin size={20} /> <span className="font-black uppercase tracking-wider text-xs">LinkedIn Info</span></div>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                        <div className="space-y-2">
                                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Profile URL</label>
                                                            <Input name="linkedin" value={formData.linkedin} onChange={handleChange} placeholder="https://linkedin.com/in/username" className="h-16 bg-black/40 border-white/10 rounded-2xl text-base font-bold px-6 focus:border-blue-500" />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Connections/Followers</label>
                                                            <Input type="number" name="linkedinFollowers" value={formData.linkedinFollowers} onChange={handleChange} placeholder="e.g. 500" className="h-16 bg-black/40 border-white/10 rounded-2xl text-base font-bold px-6 focus:border-blue-500" />
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                        
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1 flex items-center gap-1.5"><Youtube size={12}/> YouTube URL (Optional)</label>
                                            <Input name="youtube" value={formData.youtube} onChange={handleChange} placeholder="Channel URL" className="h-16 bg-white/[0.02] border-white/10 rounded-2xl text-base font-bold px-6 focus:border-red-500" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1 flex items-center gap-1.5"><Twitter size={12}/> X / Website (Optional)</label>
                                            <Input name="twitter" value={formData.twitter} onChange={handleChange} placeholder="X handle or link" className="h-16 bg-white/[0.02] border-white/10 rounded-2xl text-base font-bold px-6 focus:border-white" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Card 4: Collaboration Details */}
                            <div className="bg-zinc-950/60 backdrop-blur-3xl border border-white/[0.08] rounded-3xl md:rounded-[3rem] p-6 md:p-10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_30px_60px_rgba(0,0,0,0.4)] relative z-10">
                                <div className="relative z-10 flex items-center gap-4 mb-8 border-b border-white/10 pb-6">
                                    <div className="w-12 h-12 bg-neon-green/10 rounded-xl flex items-center justify-center border border-neon-green/20">
                                        <FileText className="text-neon-green" size={24} />
                                    </div>
                                    <h3 className="text-2xl font-black font-heading uppercase italic tracking-tight">Collaboration Details</h3>
                                </div>

                                <div className="space-y-8">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Professional Bio</label>
                                        <textarea name="bio" value={formData.bio} onChange={handleChange} placeholder="Describe your content niche and why brands should collaborate with you..." className="w-full bg-white/[0.02] border border-white/10 rounded-[2rem] p-6 text-white text-base font-medium leading-relaxed focus:border-neon-blue focus:outline-none h-40 resize-none shadow-inner scrollbar-thin scrollbar-thumb-white/10" />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Barter Collaborations</label>
                                            <CustomSelect
                                                value={formData.doBarter} onChange={handleChange}
                                                options={[{ value: 'yes', label: 'Yes, I do barter' }, { value: 'no', label: 'No, only paid' }, { value: 'selective', label: 'Selective (Depends on brand)' }]}
                                                name="doBarter" placeholder="Select Preference" icon={Zap}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Commercial Rates</label>
                                            <Input name="commercials" value={formData.commercials} onChange={handleChange} placeholder="e.g. 5k/Reel, 2k/Story or Open" className="h-16 bg-white/[0.02] border-white/10 rounded-2xl text-base font-bold px-6 focus:border-neon-blue" />
                                        </div>
                                    </div>

                                    <div className="space-y-2 pt-4 border-t border-white/5">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1 flex justify-between">
                                            <span>Referral Code (Optional)</span>
                                            {isReferralCodeLocked && <span className="text-neon-blue">LOCKED 🔒</span>}
                                        </label>
                                        <Input name="referredBy" value={formData.referredBy} onChange={handleChange} disabled={isReferralCodeLocked} placeholder="UID or Username of referrer" className="h-16 bg-white/[0.02] border-white/10 rounded-2xl text-base font-bold px-6 focus:border-neon-blue disabled:opacity-60 disabled:cursor-not-allowed" />
                                        {isReferralCodeLocked && <p className="text-[9px] font-bold text-neon-blue uppercase tracking-widest pl-1 mt-1">Applied from invite link.</p>}
                                    </div>
                                </div>
                            </div>

                            {/* Submit Button */}
                            <div className="sticky bottom-8 z-50 pt-4">
                                <button type="submit" disabled={isSubmitting} className="w-full h-20 rounded-[2rem] font-black font-heading uppercase tracking-[0.2em] bg-neon-blue text-black hover:shadow-[0_0_50px_rgba(0,240,255,0.4)] transition-all flex items-center justify-center gap-4 disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98]">
                                    {isSubmitting ? <LoadingSpinner size="sm" color="black" /> : 'Finalize & Submit Registration'}
                                    {!isSubmitting && <ArrowRight size={24} />}
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CreatorJoin;
