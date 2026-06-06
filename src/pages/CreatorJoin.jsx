import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../lib/store';
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
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import GlobalLoader from '../components/ui/GlobalLoader';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import useDynamicMeta from '../hooks/useDynamicMeta';
import { RecaptchaVerifier, signInWithPhoneNumber, PhoneAuthProvider, linkWithCredential } from 'firebase/auth';
import { auth } from '../lib/firebase';

const NICHES = [
    'Student/ Campus Creator',
    'Fashion & Luxury',
    'Tech & Gaming',
    'Travel & Lifestyle',
    'Beauty & Fitness',
    'Food & Beverage',
    'College Pages',
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
                {/* Shockwave Rings */}
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

                {/* Rotating gear/shield behind check */}
                <motion.div 
                    initial={{ rotate: 0 }}
                    animate={{ rotate: 360 }}
                    transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                    className="absolute w-14 h-14 border border-dashed border-neon-green/40 rounded-full"
                />

                {/* Solid core with custom spring-loaded check icon */}
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

                {/* Floating particle embers */}
                {[...Array(4)].map((_, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 0, x: 0, scale: 0.8 }}
                        animate={{ 
                            opacity: [0, 1, 0], 
                            y: -35 - Math.random() * 25, 
                            x: (Math.random() - 0.5) * 50,
                            scale: [0.8, 1.2, 0.4] 
                        }}
                        transition={{ 
                            duration: 1.5, 
                            repeat: Infinity, 
                            delay: i * 0.35, 
                            ease: "easeOut" 
                        }}
                        className="absolute w-1 h-1 rounded-full bg-neon-green shadow-[0_0_6px_rgba(57,255,20,0.8)]"
                    />
                ))}
            </div>

            <div className="space-y-1 relative z-10">
                <motion.h4 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-xl font-black font-heading tracking-widest uppercase italic text-neon-green"
                >
                    Phone Verified
                </motion.h4>
                <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]"
                >
                    Verification successful. Proceeding to next step...
                </motion.p>
            </div>
        </div>
    );
};

// Premium, glassmorphic dropdown selector
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
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setHighlightedIndex(prev => (prev + 1) % options.length);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setHighlightedIndex(prev => (prev - 1 + options.length) % options.length);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (highlightedIndex >= 0 && highlightedIndex < options.length) {
                    handleSelect(options[highlightedIndex]);
                }
            } else if (e.key === 'Escape') {
                setIsOpen(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, highlightedIndex, options]);

    useEffect(() => {
        if (isOpen) {
            const index = options.findIndex(opt => {
                const optVal = typeof opt === 'object' ? opt.value : opt;
                return optVal === value;
            });
            setHighlightedIndex(index >= 0 ? index : 0);
        }
    }, [isOpen, value, options]);

    const currentOption = options.find(opt => {
        const optVal = typeof opt === 'object' ? opt.value : opt;
        return optVal === value;
    });

    const displayLabel = currentOption 
        ? (typeof currentOption === 'object' ? currentOption.label : currentOption.toUpperCase())
        : placeholder;

    return (
        <div ref={containerRef} className={cn("relative", isCountryCode ? "w-36" : "w-full")}>
            <button
                type="button"
                onClick={handleToggle}
                className={cn(
                    "w-full h-20 bg-white/[0.02] border border-white/10 rounded-2xl text-lg font-bold text-left focus:border-neon-blue focus:outline-none transition-all flex items-center justify-between group",
                    isCountryCode ? "px-4" : "pl-16 pr-12",
                    isOpen && "border-neon-blue/50 ring-1 ring-neon-blue/50",
                    className
                )}
            >
                {!isCountryCode && Icon && (
                    <Icon className={cn("absolute left-6 top-1/2 -translate-y-1/2 transition-colors", isOpen ? "text-neon-blue" : "text-gray-500")} size={24} />
                )}
                
                <span className={value ? "text-white" : "text-white/20"}>
                    {displayLabel}
                </span>

                <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="text-gray-500 group-hover:text-white"
                >
                    <ChevronDown size={isCountryCode ? 16 : 20} />
                </motion.div>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.ul
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.15 }}
                        className="absolute z-[100] w-full mt-1.5 max-h-48 overflow-y-auto bg-zinc-950/95 border border-white/10 backdrop-blur-2xl rounded-2xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)] py-1 text-white scrollbar-thin scrollbar-thumb-white/10"
                    >
                        {options.map((opt, idx) => {
                            const optVal = typeof opt === 'object' ? opt.value : opt;
                            const optLabel = typeof opt === 'object' ? opt.label : opt.toUpperCase();
                            const isSelected = optVal === value;
                            return (
                                <li key={optVal}>
                                    <button
                                        type="button"
                                        onClick={() => handleSelect(opt)}
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
    useDynamicMeta({
        title: "Join Creator Network",
        description: "Register to join Newbi's Elite Creator Network.",
        url: window.location.href
    });

    const { user, authInitialized, setAuthModal, addCreator, creators, uploadToCloudinary, loading } = useStore();
    const navigate = useNavigate();

    // Form State
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
        instagram: '',
        instagramFollowers: '',
        youtube: '',
        twitter: '',
        portfolioInfo: '',
        profilePicture: ''
    });

    const [countryCode, setCountryCode] = useState('+91');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [hasJoined, setHasJoined] = useState(false);

    // OTP verification states
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
    const otpRefs = useRef([]);

    // Typeform index state
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

    // Pre-fill email and name from auth user
    useEffect(() => {
        if (user) {
            setFormData(prev => ({
                ...prev,
                email: prev.email || user.email || '',
                name: prev.name || user.displayName || ''
            }));
        }
    }, [user]);

    // Check if creator already has a profile
    useEffect(() => {
        if (user && creators && !loading) {
            const existingProfile = creators.find(c => c.uid === user.uid);
            if (existingProfile) {
                navigate('/creator-dashboard');
            }
        }
    }, [user, creators, loading, navigate]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
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
            useStore.getState().addToast("Couldn't upload your photo. Please try again.", 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Firebase phone number authentication
    const handleSendOTP = async () => {
        if (!formData.phone) {
            useStore.getState().addToast("Please enter a contact number", 'error');
            return;
        }
        setIsSendingOtp(true);
        
        try {
            // Bypass OTP for localhost/local testing
            const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            if (isLocal) {
                setOtpSent(true);
                useStore.getState().addToast("Local mode: use any 6-digit code (e.g. 123456) to verify.", 'success');
                setIsSendingOtp(false);
                return;
            }

            if (!recaptchaVerifier.current) {
                recaptchaVerifier.current = new RecaptchaVerifier(auth, 'recaptcha-creator-container', {
                    size: 'invisible',
                    callback: () => {},
                    'expired-callback': () => {
                        useStore.getState().addToast("reCAPTCHA expired. Please try again.", 'error');
                        if (recaptchaVerifier.current) {
                            recaptchaVerifier.current.clear();
                            recaptchaVerifier.current = null;
                        }
                    }
                });
            }
            
            const cleanPhone = formData.phone.replace(/\D/g, '');
            const formattedPhone = `${countryCode}${cleanPhone}`;
            
            const result = await signInWithPhoneNumber(auth, formattedPhone, recaptchaVerifier.current);
            setConfirmationResult(result);
            setOtpSent(true);
            useStore.getState().addToast("Verification code sent to your phone!", 'success');
        } catch (err) {
            console.error("Phone verification error:", err);
            useStore.getState().addToast(err.message || "Could not send SMS verification code. Try again.", 'error');
            if (recaptchaVerifier.current) {
                try { recaptchaVerifier.current.clear(); } catch(e){}
                recaptchaVerifier.current = null;
            }
        } finally {
            setIsSendingOtp(false);
        }
    };

    const handleVerifyOTP = async (codeToVerify) => {
        const fullCode = typeof codeToVerify === 'string' ? codeToVerify : otpValues.join('');
        if (fullCode.length !== 6) {
            useStore.getState().addToast("Please enter the 6-digit verification code.", 'error');
            return;
        }
        setIsVerifyingOtp(true);
        
        try {
            // Bypass OTP for localhost/local testing
            const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            if (isLocal) {
                setPhoneVerified(true);
                useStore.getState().addToast("Phone verified (Local Bypass)!", 'success');
                setTimeout(() => {
                    handleNext();
                }, 1200);
                setIsVerifyingOtp(false);
                return;
            }

            const credential = PhoneAuthProvider.credential(confirmationResult.verificationId, fullCode);
            await linkWithCredential(auth.currentUser, credential);
            setPhoneVerified(true);
            useStore.getState().addToast("Phone verified successfully!", 'success');
            // Auto advance
            setTimeout(() => {
                handleNext();
            }, 1200);
        } catch (err) {
            console.error("OTP Verification Error:", err);
            if (err.code === 'auth/credential-already-in-use') {
                useStore.getState().addToast("This phone number is already linked to another account.", 'error');
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
        
        // Autotab forward
        if (val !== '' && idx < 5) {
            otpRefs.current[idx + 1]?.focus();
        }

        // Auto verify when 6 digits are filled
        if (val !== '' && newOtp.every(digit => digit !== '')) {
            handleVerifyOTP(newOtp.join(''));
        }
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
            const digits = pasteData.split('');
            setOtpValues(digits);
            otpRefs.current[5]?.focus();
            handleVerifyOTP(pasteData);
        }
    };

    // Form steps/questions list (Typeform questions)
    const QUESTIONS = [
        { id: 'welcome', label: 'Welcome', type: 'welcome' },
        { id: 'name', label: 'Full Name', type: 'text', field: 'name', placeholder: 'Stage or Legal Name', description: 'What is your name?', required: true },
        { id: 'phone', label: 'Contact Number', type: 'phone', field: 'phone', description: 'What is your phone number?', required: true },
        { id: 'email', label: 'Email Address', type: 'email', field: 'email', placeholder: 'email@example.com', description: 'What is your email address?', required: true },
        { id: 'city', label: 'Operating City', type: 'city', field: 'city', description: 'Which city are you from?', required: true },
        { id: 'categories', label: 'Content Niche', type: 'niche', field: 'categories', description: 'What is your content niche?', required: true },
        { id: 'collegeName', label: 'College / University Name', type: 'college', field: 'collegeName', placeholder: 'e.g. Delhi University, IIT', description: 'Which college do you study in?', required: (data) => data.categories === 'Student/ Campus Creator' || data.categories === 'Student Creator/ Campus Creator' || data.categories === 'College Pages' },
        { id: 'instagram', label: 'Instagram Handle', type: 'text', field: 'instagram', placeholder: '@yourhandle', description: 'What is your Instagram handle?', required: true },
        { id: 'instagramFollowers', label: 'Instagram Followers', type: 'number', field: 'instagramFollowers', placeholder: 'e.g. 5000', description: 'How many Instagram followers do you have?', required: true },
        { id: 'youtube', label: 'YouTube URL', type: 'text', field: 'youtube', placeholder: 'Channel URL (Optional)', description: 'What is your YouTube channel link? (Optional)', required: false },
        { id: 'twitter', label: 'X / Website URL', type: 'text', field: 'twitter', placeholder: 'X handle or link (Optional)', description: 'What is your Twitter/X or website link? (Optional)', required: false },
        { id: 'bio', label: 'Professional Bio', type: 'textarea', field: 'bio', placeholder: 'Describe your content niche and why brands should collaborate with you...', description: 'Tell us about yourself (Bio)', required: true },
        { id: 'profilePicture', label: 'Profile Picture', type: 'image', field: 'profilePicture', description: 'Upload your profile picture', required: false },
        { id: 'submit', label: 'Review & Submit', type: 'submit' }
    ];

    // Get currently active questions (filtering based on conditional)
    const activeQuestions = QUESTIONS.filter(q => !q.conditional || q.conditional(formData));

    const validateCurrentQuestion = () => {
        const q = activeQuestions[currentQuestionIndex];
        if (!q) return true;
        if (q.type === 'welcome' || q.type === 'submit') return null;

        const val = formData[q.field];

        const isRequired = typeof q.required === 'function' ? q.required(formData) : q.required;

        if (isRequired) {
            if (q.type === 'phone' && !isPhoneVerifiedRef.current) {
                return "Please verify your contact number via OTP first.";
            }
            if (q.type === 'city') {
                if (!val) return "Please select a hub city.";
                if (val === 'Others' && !formData.customCity?.trim()) return "Please specify your custom city.";
            }
            if (q.type === 'niche') {
                if (!val) return "Please select a niche.";
                if (val === 'Others' && !formData.customNiche?.trim()) return "Please specify your custom niche.";
            }
            if (q.field === 'instagram') {
                if (val && (val.includes('/') || val.includes('http') || val.includes('.com'))) {
                    return "Please enter only the Instagram username/handle, not a full link.";
                }
            }
            if (!val || (typeof val === 'string' && val.trim() === '')) {
                return `${q.label} is required.`;
            }
            if (q.field === 'bio' && val.trim().length < 10) {
                return "Your bio is too short (minimum 10 characters).";
            }
            if (q.field === 'email') {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(val)) return "Please enter a valid email address.";
            }
            if (q.field === 'instagramFollowers' && Number(val) < 0) {
                return "Followers count cannot be negative.";
            }
        }
        return null;
    };

    const handleNext = () => {
        const errorMsg = validateCurrentQuestion();
        if (errorMsg) {
            useStore.getState().addToast(errorMsg, 'error');
            return;
        }
        if (currentQuestionIndex < activeQuestions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        }
    };

    const handlePrev = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(prev => prev - 1);
        }
    };

    // Keyboard controls for Typeform experience
    useEffect(() => {
        const handleKeyDown = (e) => {
            const activeType = activeQuestions[currentQuestionIndex]?.type;
            if (activeType === 'textarea' || activeType === 'image') return; // Don't trigger on textareas/file uploads
            if (e.key === 'Enter') {
                e.preventDefault();
                if (activeType === 'phone' && !isPhoneVerifiedRef.current) {
                    if (otpSent) {
                        handleVerifyOTP();
                    } else {
                        handleSendOTP();
                    }
                } else if (currentQuestionIndex === activeQuestions.length - 1) {
                    handleSubmit(e);
                } else {
                    handleNext();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentQuestionIndex, formData, isPhoneVerified, otpSent, otpValues]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!user) {
            setAuthModal(true);
            return;
        }

        setIsSubmitting(true);
        try {
            const finalCity = formData.city === 'Others' ? formData.customCity : formData.city;
            const finalNiche = formData.categories === 'Others' ? formData.customNiche : formData.categories;
            const cleanInstagram = formData.instagram.trim().replace(/^@/, '');

            await addCreator({
                uid: user.uid,
                email: formData.email || user.email,
                displayName: formData.name || user.displayName,
                profileStatus: 'pending',
                ...formData,
                instagram: cleanInstagram,
                city: finalCity,
                categories: finalNiche,
                specializations: [finalNiche],
                isVerified: false,
                isPhoneVerified: true
            });
            setHasJoined(true);
        } catch (error) {
            console.error("Error joining creator hub:", error);
            useStore.getState().addToast("Couldn't submit your application. Please try again.", 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!authInitialized || loading) {
        return <GlobalLoader color="#00F0FF" />;
    }

    if (hasJoined) {
        return (
            <div className="min-h-screen bg-[#020202] text-white pt-40 pb-20 px-4 text-center relative overflow-hidden">
                <div className="absolute top-[30%] left-1/2 -translate-x-1/2 w-[60%] h-[60%] bg-neon-blue/10 rounded-full blur-[150px] pointer-events-none" />
                
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }}
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

    const currentQuestion = activeQuestions[currentQuestionIndex];
    const progressPercent = Math.round((currentQuestionIndex / (activeQuestions.length - 1)) * 100);

    return (
        <div className="min-h-screen bg-[#020202] text-white pt-32 pb-40 px-4 relative overflow-hidden flex items-center justify-center">
            {/* Atmosphere */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[10%] right-[-10%] w-[60%] h-[60%] bg-neon-blue/15 rounded-full blur-[180px]" />
                <div className="absolute bottom-[10%] left-[-10%] w-[50%] h-[50%] bg-neon-pink/10 rounded-full blur-[180px]" />
            </div>

            {/* Recaptcha container */}
            <div id="recaptcha-creator-container" className="fixed bottom-0 right-0 z-[200]"></div>

            <div className="relative z-10 w-full max-w-4xl">
                {!user ? (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-2xl mx-auto text-center">
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
                    <div className="w-full">
                        {/* Typeform Frame */}
                        <div className="bg-zinc-950/45 backdrop-blur-3xl border border-white/[0.08] rounded-[3.5rem] p-8 md:p-16 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_50px_100px_rgba(0,0,0,0.8)] relative min-h-[500px] flex flex-col justify-between">
                            {/* Top decorative elements */}
                            <div className="absolute top-0 right-0 w-80 h-80 bg-neon-blue/10 blur-[130px] -mr-40 -mt-40 pointer-events-none" />
                            
                            {/* Progress bar */}
                            <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden mb-12 shrink-0">
                                <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progressPercent}%` }}
                                    transition={{ duration: 0.3 }}
                                    className="h-full bg-gradient-to-r from-neon-blue to-neon-pink"
                                />
                            </div>

                            {/* Active Question Render */}
                            <div className="flex-1 flex flex-col justify-center my-6">
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={currentQuestion.id}
                                        initial={{ opacity: 0, y: 30 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -30 }}
                                        transition={{ duration: 0.4, ease: "easeOut" }}
                                        className="space-y-8"
                                    >
                                        {currentQuestion.type === 'welcome' && (
                                            <div className="text-center py-8 space-y-6">
                                                <div className="relative w-24 h-24 mx-auto mb-8 flex items-center justify-center">
                                                    {/* Glow backdrops */}
                                                    <div className="absolute inset-0 bg-neon-blue/20 blur-xl rounded-full animate-pulse" />
                                                    <motion.div 
                                                        animate={{ rotate: 360 }}
                                                        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                                                        className="absolute inset-0 rounded-[2rem] border border-dashed border-neon-blue/40"
                                                    />
                                                    <div className="relative w-20 h-20 rounded-[1.8rem] bg-zinc-950 border border-white/[0.08] flex items-center justify-center text-neon-blue shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]">
                                                        <Zap size={36} className="text-neon-blue filter drop-shadow-[0_0_8px_rgba(0,240,255,0.5)]" />
                                                    </div>
                                                </div>
                                                <h2 className="text-4xl md:text-5xl font-black font-heading tracking-tighter uppercase italic text-white leading-none">
                                                    WELCOME TO THE <br/>
                                                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-blue via-white to-neon-pink">CREATOR NETWORK.</span>
                                                </h2>

                                                <button 
                                                    onClick={() => setCurrentQuestionIndex(1)}
                                                    className="h-16 px-12 rounded-2xl bg-white text-black font-black font-heading uppercase tracking-[0.2em] text-xs hover:bg-neon-blue hover:scale-105 active:scale-95 transition-all flex items-center gap-3 mx-auto shadow-2xl"
                                                >
                                                    Get Started <ArrowRight size={16} />
                                                </button>
                                            </div>
                                        )}

                                        {currentQuestion.type === 'text' && (
                                            <div className="space-y-6 w-full">
                                                <div className="space-y-1">
                                                    <span className="text-[10px] font-black text-neon-pink uppercase tracking-[0.3em]">QUESTION {currentQuestionIndex} OF {activeQuestions.length - 2}</span>
                                                    <h3 className="text-3xl md:text-4xl font-black font-heading uppercase italic tracking-tight text-white leading-tight pr-4">
                                                        {currentQuestion.description}
                                                    </h3>
                                                </div>
                                                <div className="relative">
                                                    <Input 
                                                        name={currentQuestion.field} 
                                                        value={formData[currentQuestion.field]} 
                                                        onChange={handleChange} 
                                                        placeholder={currentQuestion.placeholder} 
                                                        className="h-20 bg-white/[0.02] border-white/10 rounded-2xl text-xl font-bold px-8 focus:border-neon-blue" 
                                                        autoFocus
                                                    />
                                                    <span className="absolute right-6 top-1/2 -translate-y-1/2 text-[9px] font-bold text-gray-500 uppercase tracking-widest hidden sm:inline">press Enter ↵</span>
                                                </div>
                                            </div>
                                        )}

                                        {currentQuestion.type === 'number' && (
                                            <div className="space-y-6 w-full">
                                                <div className="space-y-1">
                                                    <span className="text-[10px] font-black text-neon-pink uppercase tracking-[0.3em]">QUESTION {currentQuestionIndex} OF {activeQuestions.length - 2}</span>
                                                    <h3 className="text-3xl md:text-4xl font-black font-heading uppercase italic tracking-tight text-white leading-tight pr-4">
                                                        {currentQuestion.description}
                                                    </h3>
                                                </div>
                                                <div className="relative">
                                                    <Input 
                                                        type="number"
                                                        name={currentQuestion.field} 
                                                        value={formData[currentQuestion.field]} 
                                                        onChange={handleChange} 
                                                        placeholder={currentQuestion.placeholder} 
                                                        className="h-20 bg-white/[0.02] border-white/10 rounded-2xl text-xl font-bold px-8 focus:border-neon-blue" 
                                                        autoFocus
                                                    />
                                                    <span className="absolute right-6 top-1/2 -translate-y-1/2 text-[9px] font-bold text-gray-500 uppercase tracking-widest hidden sm:inline">press Enter ↵</span>
                                                </div>
                                            </div>
                                        )}

                                        {currentQuestion.type === 'email' && (
                                            <div className="space-y-6 w-full">
                                                <div className="space-y-1">
                                                    <span className="text-[10px] font-black text-neon-pink uppercase tracking-[0.3em]">QUESTION {currentQuestionIndex} OF {activeQuestions.length - 2}</span>
                                                    <h3 className="text-3xl md:text-4xl font-black font-heading uppercase italic tracking-tight text-white leading-tight pr-4">
                                                        {currentQuestion.description}
                                                    </h3>
                                                </div>
                                                <div className="relative">
                                                    <Mail className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-500" size={24} />
                                                    <Input 
                                                        type="email"
                                                        name={currentQuestion.field} 
                                                        value={formData[currentQuestion.field]} 
                                                        onChange={handleChange} 
                                                        placeholder={currentQuestion.placeholder} 
                                                        className="h-20 pl-16 pr-8 bg-white/[0.02] border-white/10 rounded-2xl text-xl font-bold focus:border-neon-blue" 
                                                        autoFocus
                                                    />
                                                    <span className="absolute right-6 top-1/2 -translate-y-1/2 text-[9px] font-bold text-gray-500 uppercase tracking-widest hidden sm:inline">press Enter ↵</span>
                                                </div>
                                            </div>
                                        )}

                                        {currentQuestion.type === 'phone' && (
                                            <div className="space-y-6 w-full">
                                                <div className="space-y-1">
                                                    <span className="text-[10px] font-black text-neon-pink uppercase tracking-[0.3em]">QUESTION {currentQuestionIndex} OF {activeQuestions.length - 2}</span>
                                                    <h3 className="text-3xl md:text-4xl font-black font-heading uppercase italic tracking-tight text-white leading-tight pr-4">
                                                        {currentQuestion.description}
                                                    </h3>
                                                </div>

                                                {!otpSent ? (
                                                    <div className="space-y-4">
                                                        <div className="flex gap-4">
                                                            <CustomSelect
                                                                value={countryCode}
                                                                onChange={(e) => setCountryCode(e.target.value)}
                                                                options={COUNTRY_OPTIONS}
                                                                name="countryCode"
                                                                placeholder="+91"
                                                                isCountryCode
                                                            />
                                                            <div className="relative flex-1">
                                                                <Phone className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-500" size={24} />
                                                                <Input 
                                                                    type="tel"
                                                                    name={currentQuestion.field} 
                                                                    value={formData[currentQuestion.field]} 
                                                                    onChange={handleChange} 
                                                                    disabled={isPhoneVerified}
                                                                    placeholder="99999 99999" 
                                                                    className="h-20 pl-16 pr-8 bg-white/[0.02] border-white/10 rounded-2xl text-xl font-bold focus:border-neon-blue" 
                                                                    autoFocus
                                                                />
                                                            </div>
                                                        </div>
                                                        
                                                        {isPhoneVerified ? (
                                                            <div className="flex items-center gap-3 bg-neon-green/10 border border-neon-green/20 p-4 rounded-2xl text-neon-green text-sm font-bold w-fit">
                                                                <ShieldCheck size={18} /> Phone Verified Successfully!
                                                            </div>
                                                        ) : (
                                                            <button 
                                                                type="button"
                                                                onClick={handleSendOTP}
                                                                disabled={isSendingOtp || !formData.phone}
                                                                className="h-16 px-10 rounded-xl bg-neon-blue text-black font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                                                            >
                                                                {isSendingOtp ? <LoadingSpinner size="xs" color="black" /> : 'Send OTP Code'}
                                                            </button>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="space-y-6">
                                                        <div className="space-y-2">
                                                            <p className="text-gray-400 text-sm font-bold uppercase tracking-wider">
                                                                Enter the 6-digit OTP code sent to <span className="text-neon-blue font-black">{countryCode} {formData.phone}</span>
                                                            </p>
                                                        </div>

                                                        {/* Cool Autotabbing OTP Boxes */}
                                                        {isPhoneVerified ? (
                                                            <OTPVerificationSuccess />
                                                        ) : (
                                                            <div className="flex flex-col gap-6">
                                                                <div className="relative flex gap-3 p-1">
                                                                    {/* Scanning laser beam */}
                                                                    {isVerifyingOtp && (
                                                                        <motion.div 
                                                                            initial={{ top: '0%' }}
                                                                            animate={{ top: ['0%', '100%', '0%'] }}
                                                                            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                                                                            className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-neon-pink to-transparent shadow-[0_0_12px_rgba(255,0,127,0.8)] z-20 pointer-events-none"
                                                                        />
                                                                    )}
                                                                    {otpValues.map((digit, idx) => (
                                                                        <input
                                                                            key={idx}
                                                                            ref={el => otpRefs.current[idx] = el}
                                                                            type="text"
                                                                            maxLength={1}
                                                                            value={digit}
                                                                            disabled={isVerifyingOtp}
                                                                            onChange={e => handleOtpChange(e.target.value, idx)}
                                                                            onKeyDown={e => handleOtpKeyDown(e, idx)}
                                                                            onPaste={handleOtpPaste}
                                                                            className={cn(
                                                                                "w-14 h-16 md:w-16 md:h-20 bg-white/[0.02] border-2 rounded-2xl text-center text-2xl font-black text-white focus:border-neon-blue focus:shadow-[0_0_25px_rgba(0,240,255,0.2)] focus:outline-none transition-all",
                                                                                isVerifyingOtp ? "border-neon-pink/40 animate-pulse" : "border-white/10"
                                                                            )}
                                                                            autoFocus={idx === 0}
                                                                        />
                                                                    ))}
                                                                </div>

                                                                <div className="flex gap-4">
                                                                    <button
                                                                        type="button"
                                                                        onClick={handleVerifyOTP}
                                                                        disabled={isVerifyingOtp || otpValues.join('').length !== 6}
                                                                        className="h-16 px-10 rounded-xl bg-neon-pink text-black font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:scale-105 active:scale-95 transition-all disabled:opacity-30"
                                                                    >
                                                                        {isVerifyingOtp ? <LoadingSpinner size="xs" color="black" /> : 'Confirm Code'}
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => { setOtpSent(false); setOtpValues(['','','','','','']); }}
                                                                        className="text-xs text-gray-500 hover:text-white font-bold uppercase tracking-widest"
                                                                    >
                                                                        Back / Resend
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {currentQuestion.type === 'city' && (
                                            <div className="space-y-6 w-full">
                                                <div className="space-y-1">
                                                    <span className="text-[10px] font-black text-neon-pink uppercase tracking-[0.3em]">QUESTION {currentQuestionIndex} OF {activeQuestions.length - 2}</span>
                                                    <h3 className="text-3xl md:text-4xl font-black font-heading uppercase italic tracking-tight text-white leading-tight pr-4">
                                                        {currentQuestion.description}
                                                    </h3>
                                                </div>
                                                <div className="space-y-4">
                                                    <CustomSelect
                                                        value={formData[currentQuestion.field]}
                                                        onChange={handleChange}
                                                        options={PREDEFINED_CITIES}
                                                        name={currentQuestion.field}
                                                        placeholder="Select Universal Hub"
                                                        icon={MapPin}
                                                    />

                                                    {formData.city === 'Others' && (
                                                        <motion.div
                                                            initial={{ opacity: 0, height: 0 }}
                                                            animate={{ opacity: 1, height: 'auto' }}
                                                            className="space-y-2"
                                                        >
                                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Specify City Name</label>
                                                            <Input 
                                                                name="customCity" 
                                                                value={formData.customCity} 
                                                                onChange={handleChange} 
                                                                placeholder="e.g. Pune, Indore, Lucknow" 
                                                                className="h-16 bg-white/[0.02] border-white/10 rounded-2xl text-base font-bold px-6 focus:border-neon-blue"
                                                                required
                                                            />
                                                        </motion.div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {currentQuestion.type === 'niche' && (
                                            <div className="space-y-6 w-full">
                                                <div className="space-y-1">
                                                    <span className="text-[10px] font-black text-neon-pink uppercase tracking-[0.3em]">QUESTION {currentQuestionIndex} OF {activeQuestions.length - 2}</span>
                                                    <h3 className="text-3xl md:text-4xl font-black font-heading uppercase italic tracking-tight text-white leading-tight pr-4">
                                                        {currentQuestion.description}
                                                    </h3>
                                                </div>
                                                <div className="space-y-4">
                                                    <CustomSelect
                                                        value={formData[currentQuestion.field]}
                                                        onChange={handleChange}
                                                        options={NICHES}
                                                        name={currentQuestion.field}
                                                        placeholder="Select Content Niche"
                                                        icon={Tag}
                                                    />

                                                    {formData.categories === 'Others' && (
                                                        <motion.div
                                                            initial={{ opacity: 0, height: 0 }}
                                                            animate={{ opacity: 1, height: 'auto' }}
                                                            className="space-y-2"
                                                        >
                                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Specify Content Niche</label>
                                                            <Input 
                                                                name="customNiche" 
                                                                value={formData.customNiche} 
                                                                onChange={handleChange} 
                                                                placeholder="e.g. Comedy, Art, Finance" 
                                                                className="h-16 bg-white/[0.02] border-white/10 rounded-2xl text-base font-bold px-6 focus:border-neon-blue"
                                                                required
                                                            />
                                                        </motion.div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {currentQuestion.type === 'college' && (
                                            <div className="space-y-6 w-full">
                                                <div className="space-y-1">
                                                    <span className="text-[10px] font-black text-neon-pink uppercase tracking-[0.3em]">QUESTION {currentQuestionIndex} OF {activeQuestions.length - 2}</span>
                                                    <h3 className="text-3xl md:text-4xl font-black font-heading uppercase italic tracking-tight text-white leading-tight pr-4">
                                                        {currentQuestion.description}
                                                    </h3>
                                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mt-2">
                                                        {!(formData.categories === 'Student/ Campus Creator' || formData.categories === 'Student Creator/ Campus Creator' || formData.categories === 'College Pages') ? (
                                                            <span className="text-neon-blue">[OPTIONAL]</span>
                                                        ) : (
                                                            <span className="text-red-500">[REQUIRED]</span>
                                                        )}{" "}
                                                        Why fill this? Matching your college helps us connect you with exclusive regional/campus campaigns and college events.
                                                    </p>
                                                </div>
                                                <div className="relative">
                                                    <Input 
                                                        name={currentQuestion.field} 
                                                        value={formData[currentQuestion.field]} 
                                                        onChange={handleChange} 
                                                        placeholder={
                                                            !(formData.categories === 'Student/ Campus Creator' || formData.categories === 'Student Creator/ Campus Creator' || formData.categories === 'College Pages')
                                                                ? 'e.g. Delhi University, IIT (Optional)'
                                                                : 'e.g. Delhi University, IIT'
                                                        } 
                                                        className="h-20 bg-white/[0.02] border-white/10 rounded-2xl text-xl font-bold px-8 focus:border-neon-blue" 
                                                        autoFocus
                                                    />
                                                    <span className="absolute right-6 top-1/2 -translate-y-1/2 text-[9px] font-bold text-gray-500 uppercase tracking-widest hidden sm:inline">press Enter ↵</span>
                                                </div>
                                            </div>
                                        )}

                                        {currentQuestion.type === 'textarea' && (
                                            <div className="space-y-6 w-full">
                                                <div className="space-y-1">
                                                    <span className="text-[10px] font-black text-neon-pink uppercase tracking-[0.3em]">QUESTION {currentQuestionIndex} OF {activeQuestions.length - 2}</span>
                                                    <h3 className="text-3xl md:text-4xl font-black font-heading uppercase italic tracking-tight text-white leading-tight pr-4">
                                                        {currentQuestion.description}
                                                    </h3>
                                                </div>
                                                <div>
                                                    <textarea 
                                                        required 
                                                        name={currentQuestion.field} 
                                                        value={formData[currentQuestion.field]} 
                                                        onChange={handleChange}
                                                        placeholder={currentQuestion.placeholder}
                                                        className="w-full bg-white/[0.02] border border-white/10 rounded-[2rem] p-8 text-white text-lg font-medium leading-relaxed focus:border-neon-blue focus:outline-none h-48 resize-none shadow-inner"
                                                        autoFocus
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {currentQuestion.type === 'image' && (
                                            <div className="space-y-6 w-full">
                                                <div className="space-y-1">
                                                    <span className="text-[10px] font-black text-neon-pink uppercase tracking-[0.3em]">QUESTION {currentQuestionIndex} OF {activeQuestions.length - 2}</span>
                                                    <h3 className="text-3xl md:text-4xl font-black font-heading uppercase italic tracking-tight text-white leading-tight pr-4">
                                                        {currentQuestion.description}
                                                    </h3>
                                                </div>

                                                <div className="flex flex-col items-center gap-6 bg-white/[0.01] border border-white/5 rounded-[2.5rem] p-10 relative overflow-hidden group">
                                                    <div className="absolute inset-0 bg-neon-blue/5 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                                                    <div className="relative">
                                                        <div className="w-40 h-40 rounded-[3rem] bg-black border-2 border-white/10 flex items-center justify-center overflow-hidden transition-all group-hover:border-neon-blue/40 shadow-2xl">
                                                            {formData.profilePicture ? (
                                                                <img src={formData.profilePicture} alt="Preview" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <Camera size={44} className="text-gray-700 group-hover:text-neon-blue transition-colors" />
                                                            )}
                                                        </div>
                                                        <label className="absolute -bottom-2 -right-2 w-14 h-14 bg-neon-blue text-black rounded-2xl flex items-center justify-center cursor-pointer hover:scale-110 active:scale-95 transition-all shadow-xl">
                                                            <Upload size={22} />
                                                            <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                                                        </label>
                                                    </div>
                                                    <div className="text-center space-y-1 relative z-10">
                                                        <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-white">Profile Photo</h4>
                                                        <p className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">Supports JPG, PNG formats</p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {currentQuestion.type === 'submit' && (
                                            <div className="space-y-8 max-w-2xl py-6">
                                                <div className="space-y-2">
                                                    <div className="w-16 h-16 rounded-[1.5rem] bg-neon-green/10 border border-neon-green/20 flex items-center justify-center text-neon-green shadow-[0_0_20px_rgba(57,255,20,0.1)] mb-4">
                                                        <ShieldCheck size={28} />
                                                    </div>
                                                    <h3 className="text-3xl md:text-4xl font-black font-heading uppercase italic tracking-tight text-white leading-tight pr-4">
                                                        Review credentials
                                                    </h3>
                                                    <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Please double check your details before finalizing.</p>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white/[0.01] border border-white/5 p-6 rounded-[2.5rem] text-sm">
                                                    <div className="space-y-1.5 p-3 rounded-xl hover:bg-white/[0.02] transition-all">
                                                        <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Full Name</p>
                                                        <p className="font-bold text-white text-base truncate">{formData.name}</p>
                                                    </div>
                                                    <div className="space-y-1.5 p-3 rounded-xl hover:bg-white/[0.02] transition-all">
                                                        <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Mobile Number</p>
                                                        <p className="font-bold text-white text-base truncate">{countryCode} {formData.phone}</p>
                                                    </div>
                                                    <div className="space-y-1.5 p-3 rounded-xl hover:bg-white/[0.02] transition-all">
                                                        <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Email Address</p>
                                                        <p className="font-bold text-white text-base truncate">{formData.email}</p>
                                                    </div>
                                                    <div className="space-y-1.5 p-3 rounded-xl hover:bg-white/[0.02] transition-all">
                                                        <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Operational City</p>
                                                        <p className="font-bold text-white text-base truncate">
                                                            {formData.city === 'Others' ? formData.customCity : formData.city}
                                                        </p>
                                                    </div>
                                                    <div className="space-y-1.5 p-3 rounded-xl hover:bg-white/[0.02] transition-all">
                                                        <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Content Niche</p>
                                                        <p className="font-bold text-white text-base truncate">
                                                            {formData.categories === 'Others' ? formData.customNiche : formData.categories}
                                                        </p>
                                                    </div>
                                                    {formData.collegeName && (
                                                        <div className="space-y-1.5 p-3 rounded-xl hover:bg-white/[0.02] transition-all">
                                                            <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest">College Name</p>
                                                            <p className="font-bold text-white text-base truncate">{formData.collegeName}</p>
                                                        </div>
                                                    )}
                                                    <div className="space-y-1.5 p-3 rounded-xl hover:bg-white/[0.02] transition-all">
                                                        <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Instagram</p>
                                                        <p className="font-bold text-neon-pink text-base truncate">{formData.instagram} ({Number(formData.instagramFollowers).toLocaleString()} followers)</p>
                                                    </div>
                                                </div>

                                                <button 
                                                    onClick={handleSubmit} 
                                                    disabled={isSubmitting}
                                                    className="w-full h-20 rounded-2xl font-black font-heading uppercase tracking-[0.2em] bg-neon-blue text-black hover:shadow-[0_0_50px_rgba(0,240,255,0.4)] transition-all flex items-center justify-center gap-4 disabled:opacity-50"
                                                >
                                                    {isSubmitting ? <LoadingSpinner size="xs" color="black" /> : 'Finalize Registration'}
                                                    {!isSubmitting && <ArrowRight size={20} />}
                                                </button>
                                            </div>
                                        )}
                                    </motion.div>
                                </AnimatePresence>
                            </div>

                            {/* Control row */}
                            {currentQuestionIndex > 0 && (
                                <div className="flex justify-between items-center pt-8 border-t border-white/5 shrink-0 select-none">
                                    <button 
                                        type="button" 
                                        onClick={handlePrev} 
                                        className="text-[10px] font-black text-gray-500 hover:text-white uppercase tracking-[0.3em] transition-colors flex items-center gap-2"
                                    >
                                        <ArrowRight size={14} className="rotate-180" /> Back
                                    </button>

                                    {currentQuestion.type !== 'submit' && (
                                        <button
                                            type="button"
                                            onClick={handleNext}
                                            disabled={currentQuestion.type === 'phone' && !isPhoneVerified}
                                            className="h-16 px-10 rounded-2xl text-[10px] font-black font-heading uppercase tracking-[0.2em] bg-white text-black hover:bg-neon-blue hover:scale-105 active:scale-95 transition-all flex items-center gap-3 disabled:opacity-30 disabled:pointer-events-none"
                                        >
                                            Continue <ArrowRight size={14} />
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CreatorJoin;
