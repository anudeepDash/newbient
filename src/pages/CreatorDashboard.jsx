import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../lib/store';
import { PREDEFINED_CITIES } from '../lib/constants';
import { Button } from '../components/ui/Button';
import { motion, AnimatePresence } from 'framer-motion';
import MapPin from 'lucide-react/dist/esm/icons/map-pin';
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right';
import ExternalLink from 'lucide-react/dist/esm/icons/external-link';
import MessageCircle from 'lucide-react/dist/esm/icons/message-circle';
import FileText from 'lucide-react/dist/esm/icons/file-text';
import Target from 'lucide-react/dist/esm/icons/target';
import ShieldCheck from 'lucide-react/dist/esm/icons/shield-check';
import Zap from 'lucide-react/dist/esm/icons/zap';
import Settings from 'lucide-react/dist/esm/icons/settings';
import Instagram from 'lucide-react/dist/esm/icons/instagram';
import LayoutDashboard from 'lucide-react/dist/esm/icons/layout-dashboard';
import Clock from 'lucide-react/dist/esm/icons/clock';
import History from 'lucide-react/dist/esm/icons/history';
import X from 'lucide-react/dist/esm/icons/x';
import Upload from 'lucide-react/dist/esm/icons/upload';
import Link2 from 'lucide-react/dist/esm/icons/link-2';
import Camera from 'lucide-react/dist/esm/icons/camera';
import Video from 'lucide-react/dist/esm/icons/video';
import Eye from 'lucide-react/dist/esm/icons/eye';
import Star from 'lucide-react/dist/esm/icons/star';
import Globe from 'lucide-react/dist/esm/icons/globe';
import Youtube from 'lucide-react/dist/esm/icons/youtube';
import Twitter from 'lucide-react/dist/esm/icons/twitter';
import Calendar from 'lucide-react/dist/esm/icons/calendar';
import Copy from 'lucide-react/dist/esm/icons/copy';
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right';
import AlertCircle from 'lucide-react/dist/esm/icons/alert-circle';
import XCircle from 'lucide-react/dist/esm/icons/x-circle';
import ImageIcon from 'lucide-react/dist/esm/icons/image';
import Clipboard from 'lucide-react/dist/esm/icons/clipboard';
import Award from 'lucide-react/dist/esm/icons/award';
import TrendingUp from 'lucide-react/dist/esm/icons/trending-up';
import Briefcase from 'lucide-react/dist/esm/icons/briefcase';
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw';
import Users from 'lucide-react/dist/esm/icons/users';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import CheckCircle2 from 'lucide-react/dist/esm/icons/check-circle-2';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '../lib/utils';
import GlobalLoader from '../components/ui/GlobalLoader';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import CampaignCard from '../components/ui/CampaignCard';
import TaskSubmissionModal from '../components/ui/TaskSubmissionModal';
import useDynamicMeta from '../hooks/useDynamicMeta';
import { RecaptchaVerifier, PhoneAuthProvider, linkWithCredential } from 'firebase/auth';
import { auth } from '../lib/firebase';

const TASK_TYPES = {
    content_post: { label: 'Content Post', icon: Camera },
    story: { label: 'Story', icon: Eye },
    reel: { label: 'Reel', icon: Video },
    visit_event: { label: 'Visit Event', icon: MapPin },
    custom: { label: 'Custom', icon: Star },
};

const PLATFORMS = {
    instagram: { label: 'Instagram', icon: Instagram },
    youtube: { label: 'YouTube', icon: Youtube },
    twitter: { label: 'Twitter / X', icon: Twitter },
    other: { label: 'Other', icon: Globe },
};

const scrollContainer = (id, direction) => {
    const container = document.getElementById(id);
    if (container) {
        const scrollAmount = direction === 'left' ? -300 : 300;
        container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
};

// Helper: get submission status
const getSubmissionStatus = (task, uid) => {
    const sub = task.submissions?.[uid];
    if (sub) return sub.status;
    if ((task.verifiedBy || []).includes(uid)) return 'approved';
    if ((task.completedBy || []).includes(uid)) return 'submitted';
    return 'not_started';
};

// Tick animation component
const CompletionTick = ({ visible }) => (
    <AnimatePresence>
        {visible && (
            <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className="w-8 h-8 rounded-full bg-neon-green flex items-center justify-center shadow-[0_0_20px_rgba(0,255,100,0.3)]"
            >
                <CheckCircle2 size={16} className="text-black" />
            </motion.div>
        )}
    </AnimatePresence>
);

// Removed inline CreatorCampaignCard - Using shared CampaignCard component

// Removed TaskDetailModal - Using shared TaskSubmissionModal component

// --- Creator Settings Panel (Embedded) ---
const NICHES = [
    'Student Creator/ Campus Creator',
    'Fashion & Luxury',
    'Tech & Gaming',
    'Travel & Lifestyle',
    'Beauty & Fitness',
    'Food & Beverage',
    'College Pages',
    'Others'
];

// --- Creator Settings Panel (Embedded) ---
const CreatorSettingsView = ({ profile }) => {
    const { updateCreator, deleteCreator, logout } = useStore();
    const navigate = useNavigate();
    const [isSaving, setIsSaving] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const initialSpecialization = (profile.specializations || profile.niches || [])[0] || '';
    const isPredefinedNiche = NICHES.includes(initialSpecialization);
    const isPredefinedCity = PREDEFINED_CITIES.includes(profile.city || '');

    const [form, setForm] = useState({
        name: profile.name || '',
        phone: profile.phone || '',
        email: profile.email || '',
        city: isPredefinedCity ? (profile.city || '') : (profile.city ? 'Others' : ''),
        customCity: isPredefinedCity ? '' : (profile.city || ''),
        specializations: isPredefinedNiche ? initialSpecialization : (initialSpecialization ? 'Others' : ''),
        customNiche: isPredefinedNiche ? '' : initialSpecialization,
        collegeName: profile.collegeName || '',
        bio: profile.bio || '',
        profilePicture: profile.profilePicture || ''
    });

    const [otpValues, setOtpValues] = useState(['', '', '', '', '', '']);
    const [isSendingOtp, setIsSendingOtp] = useState(false);
    const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
    const [otpSent, setOtpSent] = useState(false);
    const [isPhoneVerified, setIsPhoneVerified] = useState(profile.isPhoneVerified || false);
    const [confirmationResult, setConfirmationResult] = useState(null);
    const [countryCode, setCountryCode] = useState('+91');
    const recaptchaVerifier = useRef(null);
    const otpRefs = useRef([]);

    useEffect(() => {
        if (!isPhoneVerified && !recaptchaVerifier.current) {
            const timer = setTimeout(() => {
                const container = document.getElementById('recaptcha-settings-container');
                if (container && !recaptchaVerifier.current) {
                    try {
                        recaptchaVerifier.current = new RecaptchaVerifier(auth, 'recaptcha-settings-container', {
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
                        recaptchaVerifier.current.render().catch(err => {
                            console.error("Error pre-rendering recaptcha:", err);
                        });
                    } catch (e) {
                        console.error("Error creating RecaptchaVerifier:", e);
                    }
                }
            }, 200);
            return () => clearTimeout(timer);
        }
    }, [isPhoneVerified]);

    // Send OTP
    const handleSendOTP = async () => {
        if (!form.phone) {
            useStore.getState().addToast("Please enter a contact number", 'error');
            return;
        }
        setIsSendingOtp(true);
        try {
            const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            if (isLocal) {
                setOtpSent(true);
                useStore.getState().addToast("Local mode: use any 6-digit code to verify.", 'success');
                setIsSendingOtp(false);
                return;
            }

            if (!recaptchaVerifier.current) {
                recaptchaVerifier.current = new RecaptchaVerifier(auth, 'recaptcha-settings-container', {
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
                await recaptchaVerifier.current.render();
            }
            
            const cleanPhone = form.phone.replace(/\D/g, '');
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
            useStore.getState().addToast(err.message || "Could not send SMS verification code. Try again.", 'error');
            if (recaptchaVerifier.current) {
                try { recaptchaVerifier.current.clear(); } catch(e){}
                recaptchaVerifier.current = null;
            }
        } finally {
            setIsSendingOtp(false);
        }
    };

    // Verify OTP
    const handleVerifyOTP = async (codeToVerify) => {
        const fullCode = typeof codeToVerify === 'string' ? codeToVerify : otpValues.join('');
        if (fullCode.length !== 6) {
            useStore.getState().addToast("Please enter the 6-digit verification code.", 'error');
            return;
        }
        setIsVerifyingOtp(true);
        try {
            const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            if (isLocal) {
                setIsPhoneVerified(true);
                await updateCreator(profile.uid, { isPhoneVerified: true, phone: form.phone });
                useStore.getState().addToast("Phone verified (Local Bypass)!", 'success');
                setIsVerifyingOtp(false);
                return;
            }

            const credential = PhoneAuthProvider.credential(confirmationResult, fullCode);
            await linkWithCredential(auth.currentUser, credential);

            setIsPhoneVerified(true);
            await updateCreator(profile.uid, { isPhoneVerified: true, phone: form.phone });
            useStore.getState().addToast("Phone verified successfully!", 'success');
        } catch (err) {
            console.error("OTP Verification Error:", err);
            if (err.code === 'auth/credential-already-in-use') {
                useStore.getState().addToast("This phone number is already linked to another account.", 'error');
            } else {
                useStore.getState().addToast("Invalid code or verification expired. Please try again.", 'error');
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
        if (val !== '' && idx < 5) {
            otpRefs.current[idx + 1]?.focus();
        }
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

    const handleChange = (e) => setForm({...form, [e.target.name]: e.target.value});

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        setIsSaving(true);
        try {
            const url = await useStore.getState().uploadToCloudinary(file);
            setForm(prev => ({ ...prev, profilePicture: url }));
            useStore.getState().addToast("Profile picture updated!", 'success');
        } catch (error) {
            useStore.getState().addToast("Couldn't upload your photo. Please try again.", 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        
        if (form.city === 'Others' && !form.customCity?.trim()) {
            useStore.getState().addToast("Please specify your custom city.", 'error');
            return;
        }
        if (form.specializations === 'Others' && !form.customNiche?.trim()) {
            useStore.getState().addToast("Please specify your custom content niche.", 'error');
            return;
        }

        const showCollege = form.specializations === 'Student Creator/ Campus Creator' || form.specializations === 'College Pages';
        if (showCollege && !form.collegeName?.trim()) {
            useStore.getState().addToast("Please enter your college name.", 'error');
            return;
        }

        setIsSaving(true);
        try {
            const finalCity = form.city === 'Others' ? form.customCity : form.city;
            const finalNiche = form.specializations === 'Others' ? form.customNiche : form.specializations;

            await updateCreator(profile.uid, {
                name: form.name,
                phone: form.phone,
                email: form.email,
                city: finalCity,
                specializations: [finalNiche],
                categories: finalNiche,
                collegeName: showCollege ? form.collegeName : '',
                bio: form.bio,
                profilePicture: form.profilePicture,
                isPhoneVerified: isPhoneVerified
            });
            useStore.getState().addToast("Profile saved successfully!", 'success');
        } catch (err) {
            useStore.getState().addToast("Couldn't save your profile. Please try again.", 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteProfile = async () => {
        setIsSaving(true);
        try {
            await deleteCreator(profile.uid);
            await logout();
            navigate('/');
        } catch (err) {
            useStore.getState().addToast("Failed to delete profile.", 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const showCollegeField = form.specializations === 'Student Creator/ Campus Creator' || form.specializations === 'College Pages';

    return (
        <div className="max-w-4xl mx-auto">
            {showDeleteConfirm ? (
                <div className="py-20 flex flex-col items-center justify-center space-y-8 bg-red-500/5 border border-red-500/10 rounded-[3rem] p-12">
                    <div className="text-center space-y-4">
                        <AlertCircle size={64} className="text-red-500 mx-auto" />
                        <h4 className="text-4xl font-black font-heading uppercase italic tracking-tighter text-white">Delete Profile</h4>
                        <p className="text-[12px] font-bold text-gray-500 uppercase tracking-widest leading-relaxed max-w-md mx-auto">
                            Warning: This will permanently remove your creator profile and all associated data. This action is irreversible.
                        </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
                        <button 
                            onClick={handleDeleteProfile}
                            disabled={isSaving}
                            className="h-16 flex-1 bg-red-500 text-white font-black uppercase tracking-widest text-[11px] rounded-2xl hover:bg-red-600 transition-all flex items-center justify-center gap-3"
                        >
                            {isSaving ? <LoadingSpinner size="xs" color="#FFFFFF" /> : 'Confirm Deletion'}
                        </button>
                        <button 
                            onClick={() => setShowDeleteConfirm(false)}
                            className="h-16 flex-1 bg-white/5 text-gray-500 font-black uppercase tracking-widest text-[11px] rounded-2xl hover:bg-white/10 transition-all"
                        >
                            Abort
                        </button>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                    {/* Left Column: Identity & Bio */}
                    <div className="lg:col-span-7 space-y-8">
                        <form onSubmit={handleSave} className="space-y-8">
                            <div className="bg-zinc-950/45 border border-white/[0.08] backdrop-blur-3xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] rounded-[3rem] p-10 space-y-8 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-neon-blue/5 blur-[100px] -mr-32 -mt-32 pointer-events-none" />
                                
                                <div className="flex items-center gap-6 mb-4">
                                    <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 text-neon-blue">
                                        <Users size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black font-heading uppercase italic tracking-tighter">Profile Details</h3>
                                        <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Your public profile information</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Full Name</label>
                                        <input required name="name" value={form.name} onChange={handleChange} className="w-full h-14 bg-black/60 border border-white/10 rounded-xl px-4 text-sm font-bold focus:border-neon-blue transition-all" />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Contact Number</label>
                                        <div className="flex gap-4">
                                            {!isPhoneVerified && (
                                                <select
                                                    value={countryCode}
                                                    onChange={(e) => setCountryCode(e.target.value)}
                                                    className="h-14 bg-black/40 border border-white/10 rounded-xl px-3 text-sm font-bold focus:border-neon-blue transition-all appearance-none cursor-pointer text-white w-24"
                                                >
                                                    <option value="+91" className="bg-zinc-900">🇮🇳 +91</option>
                                                    <option value="+1" className="bg-zinc-900">🇺🇸 +1</option>
                                                    <option value="+44" className="bg-zinc-900">🇬🇧 +44</option>
                                                    <option value="+971" className="bg-zinc-900">🇦🇪 +971</option>
                                                    <option value="+61" className="bg-zinc-900">🇦🇺 +61</option>
                                                </select>
                                            )}
                                            <div className="relative flex-1">
                                                <input 
                                                    required 
                                                    name="phone" 
                                                    type="tel" 
                                                    value={form.phone} 
                                                    onChange={handleChange} 
                                                    disabled={isPhoneVerified || otpSent}
                                                    className="w-full h-14 bg-black/40 border border-white/10 rounded-xl px-4 text-sm font-bold focus:border-neon-blue transition-all disabled:opacity-75" 
                                                />
                                                {isPhoneVerified && (
                                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 text-neon-green text-[9px] font-black tracking-widest bg-neon-green/10 border border-neon-green/20 px-2.5 py-1 rounded-md">
                                                        <ShieldCheck size={10} /> VERIFIED
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {!isPhoneVerified && (
                                            <div className="mt-4 p-4 bg-zinc-950/60 border border-white/[0.08] rounded-2xl space-y-4">
                                                <div id="recaptcha-settings-container" className="z-50"></div>
                                                
                                                {!otpSent ? (
                                                    <button
                                                        type="button"
                                                        onClick={handleSendOTP}
                                                        disabled={isSendingOtp || !form.phone}
                                                        className="h-12 px-6 bg-neon-blue text-black font-black uppercase tracking-widest text-[9px] rounded-xl flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                                                    >
                                                        {isSendingOtp ? <LoadingSpinner size="xs" color="black" /> : 'Send Verification OTP'}
                                                    </button>
                                                ) : (
                                                    <div className="space-y-4">
                                                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">
                                                            Enter the 6-digit verification code sent to {countryCode} {form.phone}
                                                        </p>
                                                        <div className="flex gap-2">
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
                                                                    className="w-10 h-12 bg-black/60 border border-white/10 rounded-xl text-center text-lg font-black text-white focus:border-neon-blue focus:outline-none transition-all"
                                                                />
                                                            ))}
                                                        </div>
                                                        <div className="flex gap-3">
                                                            <button
                                                                type="button"
                                                                onClick={handleVerifyOTP}
                                                                disabled={isVerifyingOtp || otpValues.join('').length !== 6}
                                                                className="h-10 px-5 bg-neon-pink text-black font-black uppercase tracking-widest text-[9px] rounded-xl flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-30"
                                                            >
                                                                {isVerifyingOtp ? <LoadingSpinner size="xs" color="black" /> : 'Confirm Code'}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => { setOtpSent(false); setOtpValues(['','','','','','']); }}
                                                                className="text-[9px] text-gray-500 hover:text-white font-black uppercase tracking-widest self-center"
                                                            >
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Email Address</label>
                                        <input required name="email" type="email" value={form.email} onChange={handleChange} className="w-full h-14 bg-black/40 border border-white/10 rounded-xl px-4 text-sm font-bold focus:border-neon-blue transition-all" />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Operational Hub (City)</label>
                                        <select
                                            required name="city" value={form.city} onChange={handleChange}
                                            className="w-full h-14 bg-black/40 border border-white/10 rounded-xl px-4 text-sm font-bold focus:border-neon-blue transition-all appearance-none cursor-pointer text-white"
                                        >
                                            <option value="" disabled>Select Universal Hub</option>
                                            {PREDEFINED_CITIES.map(c => <option key={c} value={c} className="bg-zinc-900">{c.toUpperCase()}</option>)}
                                        </select>
                                    </div>
                                </div>

                                {form.city === 'Others' && (
                                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-3">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Specify City Name</label>
                                        <input required name="customCity" value={form.customCity} onChange={handleChange} className="w-full h-14 bg-black/40 border border-white/10 rounded-xl px-4 text-sm font-bold focus:border-neon-blue transition-all" />
                                    </motion.div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Niche / Specialization</label>
                                        <select
                                            required name="specializations" value={form.specializations} onChange={handleChange}
                                            className="w-full h-14 bg-black/40 border border-white/10 rounded-xl px-4 text-sm font-bold focus:border-neon-blue transition-all appearance-none cursor-pointer text-white"
                                        >
                                            <option value="" disabled>Select Niche</option>
                                            {NICHES.map(n => <option key={n} value={n} className="bg-zinc-900">{n.toUpperCase()}</option>)}
                                        </select>
                                    </div>
                                    {showCollegeField && (
                                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-3">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">College / University Name</label>
                                            <input required name="collegeName" value={form.collegeName} onChange={handleChange} className="w-full h-14 bg-black/40 border border-white/10 rounded-xl px-4 text-sm font-bold focus:border-neon-blue transition-all" />
                                        </motion.div>
                                    )}
                                </div>

                                {form.specializations === 'Others' && (
                                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-3">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Specify Content Niche</label>
                                        <input required name="customNiche" value={form.customNiche} onChange={handleChange} className="w-full h-14 bg-black/40 border border-white/10 rounded-xl px-4 text-sm font-bold focus:border-neon-blue transition-all" />
                                    </motion.div>
                                )}

                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Strategic Bio</label>
                                    <textarea required name="bio" value={form.bio} onChange={handleChange} className="w-full h-40 bg-black/40 border border-white/10 rounded-xl p-4 text-sm font-bold focus:border-neon-blue transition-all resize-none shadow-inner leading-relaxed" />
                                </div>

                                <button type="submit" disabled={isSaving} className="w-full h-16 bg-white text-black font-black uppercase tracking-widest rounded-2xl hover:bg-neon-blue transition-all shadow-xl flex items-center justify-center gap-3">
                                    {isSaving ? <LoadingSpinner size="xs" color="#000000" /> : <><RefreshCw size={18} /> Save Changes</>}
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Right Column: Identity Assets & Danger Zone */}
                    <div className="lg:col-span-5 space-y-8">
                        <div className="bg-zinc-950/45 border border-white/[0.08] backdrop-blur-3xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] rounded-[3rem] p-10 space-y-8 relative overflow-hidden">
                             <div className="flex items-center gap-6">
                                <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 text-white">
                                    <ImageIcon size={24} />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black font-heading uppercase italic tracking-tighter">Profile Photo</h3>
                                    <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Your display picture</p>
                                </div>
                            </div>

                            <div className="flex flex-col items-center gap-8 py-4">
                                <div className="relative group">
                                    <div className="w-48 h-48 rounded-[3.5rem] bg-black border-2 border-white/10 flex items-center justify-center overflow-hidden transition-all group-hover:border-neon-blue/40 shadow-2xl">
                                        {form.profilePicture ? (
                                            <img src={form.profilePicture} alt="Preview" className="w-full h-full object-cover" />
                                        ) : (
                                            <Camera size={48} className="text-gray-700" />
                                        )}
                                    </div>
                                    <label className="absolute -bottom-2 -right-2 w-14 h-14 bg-neon-blue text-black rounded-2xl flex items-center justify-center cursor-pointer hover:scale-110 active:scale-95 transition-all shadow-xl">
                                        <Upload size={24} />
                                        <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                                    </label>
                                </div>
                                <div className="text-center">
                                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Verification Status</p>
                                    <div className="mt-3 px-6 py-2 bg-neon-green/10 text-neon-green border border-neon-green/20 rounded-full text-[10px] font-black tracking-widest inline-block">
                                        {profile.profileStatus?.toUpperCase() || 'ACTIVE'}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-red-950/20 border border-red-500/20 backdrop-blur-3xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] rounded-[3rem] p-10 space-y-6">
                            <h4 className="text-[10px] font-black text-red-500 uppercase tracking-[0.5em] mb-4 text-center">DANGER ZONE</h4>
                            <button onClick={() => setShowDeleteConfirm(true)} type="button" className="w-full h-16 rounded-2xl border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-3">
                                <AlertCircle size={16} /> Deactivate Creator Profile
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};



const CreatorDashboard = () => {
    const { user, authInitialized, creators, campaigns, uploadToCloudinary, loading } = useStore();
    const navigate = useNavigate();
    const location = useLocation();
    const [profile, setProfile] = useState(null);
    const activeDashboardTab = location.pathname.includes('/settings') ? 'settings' : 'workspace';
    const [activeTab, setActiveTab] = useState('opportunities');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isWorkspacePanelOpen, setIsWorkspacePanelOpen] = useState(false);

    useDynamicMeta({
        title: location.pathname.includes('/settings') ? "Creator Settings" : "Creator Dashboard",
        description: "Manage your creator profile and track campaigns.",
        url: window.location.href
    });

    useEffect(() => {
        if (authInitialized && !loading && user) {
            const existingProfile = creators.find(c => c.uid === user.uid);
            if (existingProfile) {
                setProfile(existingProfile);
            } else {
                navigate('/creator/join');
            }
        } else if (authInitialized && !loading && !user) {
            navigate('/creator/join');
        }
    }, [user, authInitialized, loading, creators, navigate]);


    if (!profile) return <GlobalLoader color="#38b6ff" />;

    const availableCampaigns = campaigns.filter(c => {
        const isOpen = c.status === 'Open';
        const isNotJoined = !(profile.joinedCampaigns || []).includes(c.id);
        const matchesCity = c.targetCity === 'Any' || c.targetCity.toLowerCase() === profile.city.toLowerCase();
        const matchesCollege = !c.targetCollege || c.targetCollege === 'Any' || 
            (profile.collegeName && profile.collegeName.toLowerCase().includes(c.targetCollege.toLowerCase()));
        return isOpen && isNotJoined && matchesCity && matchesCollege;
    });

    const joinedCampaignsList = campaigns.filter(c =>
        (profile.joinedCampaigns || []).includes(c.id)
    );

    // Stats
    const totalTasks = joinedCampaignsList.reduce((sum, c) => sum + (c.tasks?.length || 0), 0);
    const approvedTasks = joinedCampaignsList.reduce((sum, c) => {
        return sum + (c.tasks || []).filter(t => getSubmissionStatus(t, profile.uid) === 'approved').length;
    }, 0);

    const shortlistedCampaignsList = joinedCampaignsList.filter(c => (profile.shortlistedCampaigns || []).includes(c.id));

    return (
        <div className="min-h-screen bg-[#020202] text-white pt-24 pb-20 relative overflow-hidden">
            {/* Cinematic Background Atmosphere */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-neon-blue/10 rounded-full blur-[150px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-5%] w-[50%] h-[50%] bg-neon-pink/5 rounded-full blur-[150px] animate-pulse delay-700" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-gradient-radial from-transparent via-black/40 to-black z-10" />
                <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)', backgroundSize: '80px 80px' }}></div>
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">
                {/* STUDIO NAVIGATION TABS */}
                {/* STUDIO NAVIGATION TABS */}
                <div className="flex justify-center mb-16 overflow-x-auto scrollbar-hide py-4 px-2">
                    <div className="flex items-center gap-1.5 md:gap-3 bg-white/[0.02] p-1.5 rounded-[2.5rem] border border-white/5 backdrop-blur-3xl shadow-2xl min-w-max">
                        <div className="flex items-center p-1 bg-black/20 rounded-full border border-white/5">
                            <button 
                                onClick={() => navigate('/creator-dashboard')}
                                className={cn(
                                    "px-5 md:px-8 py-3 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] transition-all relative z-10",
                                    activeDashboardTab === 'workspace' ? "text-black" : "text-gray-500 hover:text-white"
                                )}
                            >
                                {activeDashboardTab === 'workspace' && (
                                    <motion.div 
                                        layoutId="dashboard-tab-pill"
                                        className="absolute inset-0 bg-white rounded-full -z-10 shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                                        transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                                    />
                                )}
                                Workspace
                            </button>
                            <button 
                                onClick={() => navigate('/creator-dashboard/settings')}
                                className={cn(
                                    "px-5 md:px-8 py-3 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] transition-all relative z-10",
                                    activeDashboardTab === 'settings' ? "text-black" : "text-gray-500 hover:text-white"
                                )}
                            >
                                {activeDashboardTab === 'settings' && (
                                    <motion.div 
                                        layoutId="dashboard-tab-pill"
                                        className="absolute inset-0 bg-white rounded-full -z-10 shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                                        transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                                    />
                                )}
                                Settings
                            </button>
                        </div>

                        <div className="w-px h-6 bg-white/10 mx-1" />

                        <button 
                            onClick={() => setIsWorkspacePanelOpen(true)}
                            className="h-11 px-5 md:px-8 rounded-full bg-white/[0.03] border border-white/10 flex items-center gap-3 md:gap-4 text-gray-500 hover:text-neon-blue hover:bg-white/5 hover:border-neon-blue/30 transition-all group shadow-xl"
                        >
                            <LayoutDashboard size={14} className="group-hover:rotate-12 transition-transform" />
                            <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest">Hub</span>
                            <div className="relative">
                                <div className="w-1.5 h-1.5 bg-neon-blue rounded-full shadow-[0_0_8px_rgba(46,191,255,0.6)]" />
                                <div className="absolute inset-0 w-1.5 h-1.5 bg-neon-blue rounded-full animate-ping opacity-75" />
                            </div>
                        </button>
                    </div>
                </div>

                <AnimatePresence mode="wait">
                    {activeDashboardTab === 'workspace' ? (
                        <motion.div
                            key="workspace"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="space-y-12"
                        >
                               {/* Command Bar Header */}
                {/* Redesigned Command Header */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-end mb-24 relative">
                    <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="lg:col-span-7 space-y-8"
                    >
                        <div className="flex items-center gap-6">
                            <div className="relative">
                                <div className="absolute -inset-1 bg-gradient-to-r from-neon-blue to-neon-purple rounded-[2rem] blur opacity-20" />
                                <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-[2rem] bg-zinc-900 border border-white/10 overflow-hidden shadow-2xl">
                                    {profile?.profilePicture ? (
                                        <img src={profile.profilePicture} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-3xl font-black text-white italic">
                                            {profile?.name?.charAt(0) || 'C'}
                                        </div>
                                    )}
                                </div>
                                <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-[#020202] rounded-full flex items-center justify-center border border-white/5">
                                    <div className="w-5 h-5 bg-neon-green rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(57,255,20,0.4)]">
                                        <CheckCircle2 size={12} className="text-black" />
                                    </div>
                                </div>
                            </div>
                            <div>
                                <div className="flex items-center gap-3 text-neon-blue font-black tracking-[0.4em] text-[10px] uppercase mb-2">
                                    <Zap size={14} className="animate-pulse" />
                                    Creator Dashboard
                                </div>
                                <h2 className="text-4xl md:text-6xl font-black font-heading tracking-tight uppercase italic leading-tight text-white pr-4 overflow-visible">
                                    Hello, <span className="inline-block pr-12 -mr-12 italic text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-gray-500">{profile?.name?.split(' ')[0] || 'Creator'}</span>
                                </h2>
                                <p className="text-gray-500 text-[11px] font-bold uppercase tracking-widest mt-4 flex items-center gap-3">
                                    <span className="w-8 h-px bg-white/10" />
                                    Manage your campaigns and submissions
                                </p>
                            </div>
                        </div>
                    </motion.div>
                    
                    <motion.div 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        className="lg:col-span-5"
                    >
                        <div className="bg-zinc-950/45 border border-white/[0.08] backdrop-blur-3xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] rounded-[2.5rem] p-2 flex items-center overflow-hidden group">
                            <div className="flex-1 grid grid-cols-3 divide-x divide-white/5 py-4">
                                <div className="flex flex-col items-center justify-center px-4">
                                    <span className="text-2xl font-black text-white italic leading-none">{joinedCampaignsList.length}</span>
                                    <span className="text-[7px] font-black text-gray-500 uppercase tracking-widest mt-2">Campaigns</span>
                                </div>
                                <div className="flex flex-col items-center justify-center px-4">
                                    <span className="text-2xl font-black text-white italic leading-none">{approvedTasks}</span>
                                    <span className="text-[7px] font-black text-gray-500 uppercase tracking-widest mt-2">Deliverables</span>
                                </div>
                                <div className="flex flex-col items-center justify-center px-4">
                                    <span className="text-2xl font-black text-neon-blue italic leading-none">{totalTasks > 0 ? Math.round((approvedTasks / totalTasks) * 100) : 0}%</span>
                                    <span className="text-[7px] font-black text-gray-500 uppercase tracking-widest mt-2">Efficiency</span>
                                </div>
                            </div>
                            <button 
                                onClick={() => navigate('/creator-dashboard/settings')}
                                className="w-16 h-16 bg-white/5 hover:bg-white hover:text-black rounded-2xl flex items-center justify-center transition-all m-1 group/btn border border-white/5 shadow-inner"
                            >
                                <Settings size={20} className="group-hover/btn:rotate-90 transition-transform duration-500" />
                            </button>
                        </div>
                    </motion.div>
                </div>

                {/* Main Content Area */}
                <div className="space-y-16 md:space-y-24">
                    {/* Priority Section */}
                    {shortlistedCampaignsList.length > 0 && (
                        <motion.section 
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="space-y-12"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 rounded-[2rem] bg-neon-blue/10 border border-neon-blue/20 flex items-center justify-center shadow-[0_0_40px_rgba(46,191,255,0.1)]">
                                        <Briefcase className="text-neon-blue" size={28} />
                                    </div>
                                    <div>
                                        <h3 className="text-3xl font-black font-heading uppercase italic text-white tracking-tighter pr-4">Active Campaigns</h3>
                                        <p className="text-[11px] text-gray-500 font-bold uppercase tracking-[0.3em] mt-1">Campaigns you've been shortlisted for</p>
                                    </div>
                                </div>

                                {/* Navigation Arrows */}
                                <div className="flex items-center gap-2 md:hidden">
                                    <button onClick={() => scrollContainer('priority-campaigns-scroll', 'left')} className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:bg-white/10 hover:text-white transition-all">
                                        <ChevronRight className="rotate-180" size={16} />
                                    </button>
                                    <button onClick={() => scrollContainer('priority-campaigns-scroll', 'right')} className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:bg-white/10 hover:text-white transition-all">
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            </div>
                            
                            <div id="priority-campaigns-scroll" className="flex overflow-x-auto md:grid md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-8 pb-4 scrollbar-hide snap-x">
                                {shortlistedCampaignsList.map(c => (
                                    <div key={c.id} className="min-w-[280px] w-[280px] md:min-w-0 md:w-auto snap-start">
                                        <CampaignCard campaign={c} profile={profile} type="joined" onOpenMission={(camp) => navigate(`/campaign/${camp.id}`)} />
                                    </div>
                                ))}
                            </div>
                        </motion.section>
                    )}

                    {/* Opportunity Navigation */}
                    <motion.div 
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="space-y-12"
                    >
                        <div className="flex flex-col md:flex-row items-center justify-between gap-8 border-b border-white/5 pb-10">
                            <div className="flex items-center gap-4 w-full md:w-auto relative group/nav">
                                {/* Navigation Arrows */}
                                <div className="absolute -left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 opacity-0 group-hover/nav:opacity-100 transition-opacity z-20 pointer-events-none md:hidden">
                                    <button onClick={(e) => { e.stopPropagation(); scrollContainer('nav-tabs', 'left'); }} className="w-8 h-8 rounded-full bg-black/80 border border-white/10 flex items-center justify-center text-white pointer-events-auto shadow-2xl">
                                        <ChevronRight className="rotate-180" size={16} />
                                    </button>
                                </div>
                                <div className="absolute -right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 opacity-0 group-hover/nav:opacity-100 transition-opacity z-20 pointer-events-none md:hidden">
                                    <button onClick={(e) => { e.stopPropagation(); scrollContainer('nav-tabs', 'right'); }} className="w-8 h-8 rounded-full bg-black/80 border border-white/10 flex items-center justify-center text-white pointer-events-auto shadow-2xl">
                                        <ChevronRight size={16} />
                                    </button>
                                </div>

                                <div id="nav-tabs" className="flex items-center gap-6 md:gap-12 w-full overflow-x-auto scrollbar-hide snap-x">
                                    {['opportunities', 'active'].map((tab) => (
                                        <button 
                                            key={tab}
                                            onClick={() => setActiveTab(tab)}
                                            className={cn(
                                                "text-lg md:text-xl font-black font-heading uppercase tracking-tighter transition-all relative pb-3 shrink-0 snap-start",
                                                activeTab === tab ? "text-white" : "text-gray-700 hover:text-gray-500"
                                            )}
                                        >
                                            {tab === 'opportunities' ? 'New Openings' : 'Performance History'}
                                            {activeTab === tab && (
                                                <motion.div 
                                                    layoutId="tab-underline" 
                                                    className="absolute bottom-0 left-0 w-full h-1 bg-neon-blue shadow-[0_4px_20px_rgba(46,191,255,0.4)]" 
                                                />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex items-center gap-4 w-full md:w-auto justify-end">
                                <div className="px-5 py-2 rounded-full bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-widest text-gray-400 mr-auto md:mr-0">
                                    <span className="text-white mr-2">{activeTab === 'opportunities' ? availableCampaigns.length : joinedCampaignsList.length}</span>
                                    {activeTab === 'opportunities' ? 'GIGS DISCOVERED' : 'CAMPAIGNS TRACKED'}
                                </div>

                                {/* Navigation Arrows */}
                                <div className="flex items-center gap-2 md:hidden">
                                    <button onClick={() => scrollContainer('opportunities-scroll', 'left')} className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:bg-white/10 hover:text-white transition-all">
                                        <ChevronRight className="rotate-180" size={16} />
                                    </button>
                                    <button onClick={() => scrollContainer('opportunities-scroll', 'right')} className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:bg-white/10 hover:text-white transition-all">
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div id="opportunities-scroll" className="flex overflow-x-auto md:grid md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-8 pb-4 scrollbar-hide snap-x">
                            <AnimatePresence mode="popLayout">
                                {(activeTab === 'opportunities' ? availableCampaigns : joinedCampaignsList).map(c => (
                                    <motion.div
                                        key={c.id}
                                        layout
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        className="min-w-[280px] w-[280px] md:min-w-0 md:w-auto snap-start"
                                    >
                                        <CampaignCard 
                                            campaign={c} 
                                            profile={profile} 
                                            type={activeTab === 'opportunities' ? 'available' : 'joined'} 
                                            onOpenMission={(camp) => navigate(`/campaign/${camp.id}`)} 
                                        />
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>

                        {(activeTab === 'opportunities' ? availableCampaigns : joinedCampaignsList).length === 0 && (
                            <div className="py-32 text-center">
                                <div className="w-24 h-24 rounded-[2.5rem] bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-8 text-gray-700">
                                    <Zap size={40} />
                                </div>
                                <h4 className="text-2xl font-black font-heading uppercase italic tracking-tighter text-gray-600 pr-4">No campaigns yet.</h4>
                                <p className="text-[11px] font-black text-gray-700 uppercase tracking-widest mt-2 px-10">New campaigns matching your city and niche will appear here when available.</p>
                            </div>
                        )}
                    </motion.div>
                </div>
            </motion.div>
        ) : (
                    <motion.div
                        key="settings"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="space-y-16"
                    >
                        <div className="flex items-center gap-4 text-neon-pink font-black tracking-[0.5em] text-[10px] uppercase mb-12">
                            <Settings size={14} className="animate-spin-slow" />
                            Profile Settings
                        </div>
                        
                        <CreatorSettingsView profile={profile} />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>

            {/* Overlays */}
            <AnimatePresence mode="wait">

                {isWorkspacePanelOpen && (
                    <WorkspaceOverviewPanel 
                        profile={profile}
                        stats={{
                            approvedTasks,
                            totalTasks,
                            activeCampaigns: joinedCampaignsList.length,
                            efficiency: totalTasks > 0 ? Math.round((approvedTasks / totalTasks) * 100) : 0
                        }}
                        onClose={() => setIsWorkspacePanelOpen(false)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

/* --- Redesigned Components --- */

const WorkspaceOverviewPanel = ({ profile, stats, onClose }) => {
    const status = profile?.profileStatus || 'pending';
    
    const getStatusConfig = () => {
        switch(status) {
            case 'approved': return { label: 'VERIFIED', color: 'text-neon-green', icon: ShieldCheck, bg: 'bg-neon-green/10' };
            case 'blocked': return { label: 'BLOCKED', color: 'text-red-500', icon: XCircle, bg: 'bg-red-500/10' };
            case 'rejected': return { label: 'REJECTED', color: 'text-red-400', icon: AlertCircle, bg: 'bg-red-400/5' };
            case 'removed': return { label: 'DEACTIVATED', color: 'text-gray-500', icon: Trash2, bg: 'bg-white/5' };
            default: return { label: 'UNDER REVIEW', color: 'text-yellow-500', icon: Clock, bg: 'bg-yellow-500/10' };
        }
    };

    const statusConfig = getStatusConfig();

    return (
        <div className="fixed inset-0 z-[200] flex justify-end">
            <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }} 
                className="fixed inset-0 bg-black/80 backdrop-blur-md" 
                onClick={onClose} 
            />
            <motion.div 
                initial={{ x: '100%' }} 
                animate={{ x: 0 }} 
                exit={{ x: '100%' }}
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
                className="relative w-full max-w-md h-full bg-zinc-950/80 border-l border-white/[0.08] backdrop-blur-3xl flex flex-col shadow-[-20px_0_100px_rgba(0,0,0,0.8)]"
            >
                <div className="p-8 border-b border-white/5 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-neon-blue/10 border border-neon-blue/20 flex items-center justify-center text-neon-blue">
                            <LayoutDashboard size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg font-black uppercase tracking-tighter italic pr-2">Overview</h3>
                            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Stats & Activity</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-12 h-12 rounded-full bg-white/5 border border-white/5 flex items-center justify-center hover:bg-white hover:text-black transition-all">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
                    {/* Workspace Banner - Redesigned for Side Panel */}
                    <div className="relative group overflow-hidden p-8 bg-zinc-950/45 border border-white/[0.08] backdrop-blur-3xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] rounded-[3rem]">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-neon-blue/5 blur-3xl pointer-events-none" />
                        
                        <div className="relative z-10 flex flex-col gap-8">
                            <div className="space-y-2">
                                <div className="flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full bg-neon-blue animate-pulse shadow-[0_0_10px_#38b6ff]" />
                                    <p className="text-[10px] font-black text-neon-blue uppercase tracking-[0.4em]">Your Stats</p>
                                </div>
                                <h4 className="text-3xl font-black font-heading uppercase italic tracking-tighter text-white pr-4">Dashboard Overview</h4>
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                {/* Identity Status Card */}
                                <div className={cn("p-6 rounded-[2rem] border flex items-center justify-between group/status transition-all backdrop-blur-3xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]", statusConfig.bg, "border-white/[0.08]")}>
                                    <div className="flex items-center gap-4">
                                        <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center border border-white/5", statusConfig.color, "bg-black/40")}>
                                            <statusConfig.icon size={24} />
                                        </div>
                                        <div>
                                            <p className="text-[8px] font-black text-gray-500 uppercase tracking-[0.2em] mb-1">Account Status</p>
                                            <p className={cn("text-sm font-black uppercase tracking-wider", statusConfig.color)}>{statusConfig.label}</p>
                                        </div>
                                    </div>
                                    <div className="w-1.5 h-1.5 rounded-full bg-white/20 group-hover/status:bg-white/40 transition-colors" />
                                </div>

                                {/* Efficiency & Metrics */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-6 bg-zinc-950/45 border border-white/[0.08] backdrop-blur-3xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] rounded-[2rem] flex flex-col gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-neon-blue">
                                            <Zap size={18} />
                                        </div>
                                        <div>
                                            <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest mb-1">Efficiency</p>
                                            <p className="text-xl font-black text-white italic">{stats.efficiency}%</p>
                                        </div>
                                    </div>
                                    <div className="p-6 bg-zinc-950/45 border border-white/[0.08] backdrop-blur-3xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] rounded-[2rem] flex flex-col gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-neon-green">
                                            <Briefcase size={18} />
                                        </div>
                                        <div>
                                            <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest mb-1">Missions</p>
                                            <p className="text-xl font-black text-white italic">{stats.activeCampaigns}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Deliverables Progress */}
                                <div className="p-6 bg-zinc-950/45 border border-white/[0.08] backdrop-blur-3xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] rounded-[2rem] space-y-4">
                                    <div className="flex items-center justify-between">
                                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Submission Progress</p>
                                        <p className="text-[9px] font-black text-white uppercase tracking-widest">{stats.approvedTasks}/{stats.totalTasks}</p>
                                    </div>
                                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                        <motion.div 
                                            initial={{ width: 0 }}
                                            animate={{ width: `${stats.efficiency}%` }}
                                            className="h-full bg-gradient-to-r from-neon-blue to-neon-purple shadow-[0_0_10px_rgba(56,182,255,0.3)]"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RECENT ACTIVITY LIST */}
                    <div className="space-y-6">
                        <div className="flex items-center justify-between px-2">
                            <div className="flex items-center gap-3">
                                <History size={16} className="text-gray-600" />
                                <h3 className="text-[9px] font-black text-gray-400 uppercase tracking-[0.4em]">ACTIVITY LOGS</h3>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {[
                                { title: 'ACCOUNT VERIFIED', date: '5/6/2026', tag: 'SYSTEM', icon: <ShieldCheck size={16} />, color: 'text-neon-green' },
                                { title: 'SECURITY ALERT', date: '4/30/2026', tag: 'AUTH', icon: <AlertCircle size={16} />, color: 'text-neon-blue' },
                                { title: 'TASK UPDATED', date: '4/17/2026', tag: 'DATA', icon: <CheckCircle2 size={16} />, color: 'text-neon-green' }
                            ].map((act, i) => (
                                <div key={i} className="group p-5 bg-zinc-950/45 border border-white/[0.08] backdrop-blur-3xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] rounded-2xl flex items-center gap-4 hover:bg-white/[0.08] transition-all">
                                    <div className={cn("w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center group-hover:bg-white/5 transition-all shrink-0", act.color)}>
                                        {act.icon}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-[11px] font-black text-white tracking-tight uppercase truncate">{act.title}</h4>
                                        <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mt-1">
                                            {act.date} • {act.tag}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="p-8 border-t border-white/5 bg-black/40">
                    <button onClick={() => window.location.reload()} className="w-full h-14 rounded-2xl bg-white text-black font-black uppercase tracking-[0.2em] text-[10px] hover:bg-neon-blue transition-all flex items-center justify-center gap-3 shadow-xl">
                        <RefreshCw size={14} /> Refresh Workspace
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default CreatorDashboard;
