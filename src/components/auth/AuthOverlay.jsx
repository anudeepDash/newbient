import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../../lib/store';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { 
    X, 
    Mail, 
    Lock, 
    User, 
    Phone, 
    Hash, 
    ArrowRight, 
    CheckCircle2 
} from 'lucide-react';
import LoadingSpinner from '../ui/LoadingSpinner';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { cn } from '../../lib/utils';

const AuthOverlay = () => {
    const { loginWithGoogle, signUpWithEmail, signInWithEmail, resetPassword, isAuthOpen, setAuthModal } = useStore();
    const [mode, setMode] = useState('signIn'); // 'signIn', 'signUp', 'forgot', 'phone', 'complete_profile'
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [resetSent, setResetSent] = useState(false);
    const [phone, setPhone] = useState('');
    const [countryCode, setCountryCode] = useState('+91');
    const [otpValues, setOtpValues] = useState(['', '', '', '', '', '']);
    const otpRefs = useRef([]);
    const [confirmationResult, setConfirmationResult] = useState(null);
    const [step, setStep] = useState('input'); // 'input', 'verify' for phone mode
    const [cooldown, setCooldown] = useState(0);
    const recaptchaVerifier = useRef(null);
    const recaptchaId = useRef(`recaptcha-auth-${Math.random().toString(36).slice(2, 11)}`).current;

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
        if (cooldown <= 0) return;
        const timer = setTimeout(() => {
            setCooldown(c => c - 1);
        }, 1000);
        return () => clearTimeout(timer);
    }, [cooldown]);

    const [formData, setFormData] = useState({
        email: '',
        password: '',
        name: ''
    });

    useEffect(() => {
        if (!isAuthOpen) {
            setMode('signIn');
            setConfirmationResult(null);
            setStep('input');
            setPhone('');
            setOtpValues(['', '', '', '', '', '']);
            setError('');
            cleanupRecaptcha();
        }
    }, [isAuthOpen]);

    useEffect(() => {
        if (mode === 'phone' && isAuthOpen && !recaptchaVerifier.current) {
            const timer = setTimeout(() => {
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
                            setError("reCAPTCHA expired. Please try again.");
                            cleanupRecaptcha();
                        }
                    });
                    recaptchaVerifier.current.render().catch(err => {
                        console.error("Error pre-rendering auth recaptcha:", err);
                    });
                } catch (e) {
                    console.error("Error creating auth RecaptchaVerifier:", e);
                }
            }, 200);
            return () => clearTimeout(timer);
        }
    }, [mode, isAuthOpen]);

    if (!isAuthOpen) return null;

    const onClose = () => setAuthModal(false);

    const getFriendlyErrorMessage = (error) => {
        const code = error?.code || error?.message || '';
        
        if (code.includes('auth/invalid-credential')) {
            return 'Invalid email or password. Please check your credentials and try again.';
        }
        if (code.includes('auth/user-not-found')) {
            return 'No account found with this email.';
        }
        if (code.includes('auth/wrong-password')) {
            return 'Incorrect password. Please try again.';
        }
        if (code.includes('auth/email-already-in-use')) {
            return 'An account already exists with this email.';
        }
        if (code.includes('auth/weak-password')) {
            return 'Password should be at least 6 characters.';
        }
        if (code.includes('auth/network-request-failed')) {
            return 'Network error. Please check your connection.';
        }
        if (code.includes('auth/popup-closed-by-user')) {
            return 'Sign-in cancelled.';
        }
        if (code.includes('auth/invalid-phone-number')) {
            return 'The phone number provided is invalid.';
        }
        if (code.includes('auth/too-many-requests')) {
            return 'Too many requests. Please try again later.';
        }
        if (code.includes('auth/code-expired')) {
            return 'The verification code has expired. Please request a new one.';
        }
        if (code.includes('auth/invalid-verification-code')) {
            return 'Invalid verification code. Please try again.';
        }
        if (code.includes('auth/captcha-check-failed')) {
            return 'Captcha verification failed. Please try again.';
        }
        return `Authentication failed: ${code.replace('auth/', '').replace(/-/g, ' ')}`;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            if (mode === 'signUp') {
                if (!formData.name) throw new Error('Please enter your name');
                await signUpWithEmail(formData.email, formData.password, formData.name);
                onClose();
            } else if (mode === 'signIn') {
                await signInWithEmail(formData.email, formData.password);
                onClose();
            } else if (mode === 'forgot') {
                await resetPassword(formData.email);
                setResetSent(true);
            }
        } catch (err) {
            console.error("Auth Error:", err);
            setError(getFriendlyErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setLoading(true);
        setError('');
        try {
            await loginWithGoogle();
            onClose();
        } catch (err) {
            console.error("Google Auth Error:", err);
            setError(getFriendlyErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    const handleSendOTP = async (e) => {
        e.preventDefault();
        if (!phone) return setError("Enter a valid phone number.");
        
        setLoading(true);
        setError('');
        
        try {
            // Initialize verifier only if it doesn't exist
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
                        callback: () => {
                            // reCAPTCHA solved
                        },
                        'expired-callback': () => {
                            setError("reCAPTCHA expired. Please try again.");
                            cleanupRecaptcha();
                        }
                    });
                    await recaptchaVerifier.current.render();
                } catch (e) {
                    console.error("Recaptcha init error:", e);
                }
            }

            const cleanPhone = phone.replace(/\D/g, '');
            const formattedPhone = `${countryCode}${cleanPhone}`;
            const result = await signInWithPhoneNumber(auth, formattedPhone, recaptchaVerifier.current);
            setConfirmationResult(result);
            setStep('verify');
            setCooldown(60);
        } catch (err) {
            console.error("Phone Auth Error:", err);
            const friendlyError = getFriendlyErrorMessage(err);
            setError(friendlyError);
            
            // If it's a "already rendered" or "reset" error, we must clear it
            if (err.code === 'auth/captcha-check-failed' || err.message?.includes('already rendered')) {
                cleanupRecaptcha();
            }
        } finally {
            setLoading(false);
        }
    };

    const handleOtpChange = (value, idx) => {
        const val = value.replace(/\D/g, ''); // only allow digits
        if (!val) {
            const newOtp = [...otpValues];
            newOtp[idx] = '';
            setOtpValues(newOtp);
            return;
        }

        const newOtp = [...otpValues];
        newOtp[idx] = val.slice(-1);
        setOtpValues(newOtp);

        // Move focus to next input
        if (idx < 5) {
            otpRefs.current[idx + 1]?.focus();
        } else if (idx === 5) {
            // Auto submit
            const fullCode = newOtp.join('');
            if (fullCode.length === 6) {
                setTimeout(() => {
                    handleAutoVerify(fullCode);
                }, 100);
            }
        }
    };

    const handleOtpKeyDown = (e, idx) => {
        if (e.key === 'Backspace') {
            if (otpValues[idx] === '' && idx > 0) {
                const newOtp = [...otpValues];
                newOtp[idx - 1] = '';
                setOtpValues(newOtp);
                otpRefs.current[idx - 1]?.focus();
            } else {
                const newOtp = [...otpValues];
                newOtp[idx] = '';
                setOtpValues(newOtp);
            }
        }
    };

    const handleOtpPaste = (e) => {
        e.preventDefault();
        const pasteData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        if (pasteData.length === 6) {
            const digits = pasteData.split('');
            setOtpValues(digits);
            otpRefs.current[5]?.focus();
            setTimeout(() => {
                handleAutoVerify(pasteData);
            }, 100);
        }
    };

    const handleAutoVerify = async (code) => {
        setLoading(true);
        setError('');
        try {
            const result = await confirmationResult.confirm(code);
            const user = result.user;
            if (!user.displayName || !user.email) {
                setMode('complete_profile');
            } else {
                onClose();
            }
        } catch (err) {
            console.error("OTP Auto Verification Error:", err);
            setError(getFriendlyErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOTP = async (e) => {
        if (e) e.preventDefault();
        const code = otpValues.join('');
        if (code.length !== 6) return setError("Enter 6-digit code.");
        
        setLoading(true);
        setError('');
        
        try {
            const result = await confirmationResult.confirm(code);
            const user = result.user;
            
            // Check if profile is incomplete (common for first-time phone signups)
            if (!user.displayName || !user.email) {
                setMode('complete_profile');
            } else {
                onClose();
            }
        } catch (err) {
            console.error("OTP Verification Error:", err);
            setError(getFriendlyErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    const handleCompleteProfile = async (e) => {
        e.preventDefault();
        if (!formData.name || !formData.email) return setError("Please fill all details.");
        
        setLoading(true);
        try {
            const { updateUserProfile } = useStore.getState();
            await updateUserProfile(auth.currentUser.uid, {
                displayName: formData.name,
                email: formData.email,
                phoneNumber: auth.currentUser.phoneNumber
            });
            onClose();
        } catch (err) {
            setError(getFriendlyErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center bg-black/60 dark:bg-black/80 backdrop-blur-md sm:p-4">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="fixed inset-0 bg-transparent"
                />

                {/* Compact Modal / Drawer Card */}
                <motion.div
                    initial={{ y: 30, opacity: 0, scale: 0.95 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    exit={{ y: 30, opacity: 0, scale: 0.95 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    className="relative w-full max-w-md z-10 bg-white dark:bg-zinc-950 rounded-t-[2rem] sm:rounded-3xl border border-black/10 dark:border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[90vh]"
                >
                    {/* Mobile Drag Handle */}
                    <div className="w-full flex justify-center pt-3 pb-1 sm:hidden">
                        <div className="w-10 h-1 bg-black/20 dark:bg-white/20 rounded-full" />
                    </div>

                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 bg-gray-100 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 rounded-full text-gray-500 hover:text-gray-900 dark:hover:text-white transition-all z-20"
                    >
                        <X size={18} />
                    </button>

                    <div className="p-6 sm:p-7 overflow-y-auto no-scrollbar">
                        {/* Header Title */}
                        <div className="text-center mb-6">
                            <h2 className="text-2xl font-black font-heading tracking-tight text-gray-900 dark:text-white uppercase">
                                {mode === 'signIn' ? 'Welcome Back' : mode === 'signUp' ? 'Create Account' : mode === 'forgot' ? 'Reset Password' : mode === 'phone' ? 'Phone Sign In' : 'Complete Profile'}
                            </h2>
                            <p className="text-gray-500 dark:text-gray-400 mt-1 text-xs font-medium">
                                {mode === 'signIn' ? 'Sign in to access your perks & activity' : mode === 'signUp' ? 'Join Newbi to explore campaigns & events' : mode === 'forgot' ? 'Enter your email to receive reset instructions' : mode === 'phone' ? 'Verify your mobile number' : 'Enter your name to complete registration'}
                            </p>
                        </div>
                        
                        <div className="w-full">
                            {error && (
                                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs font-medium text-center">
                                    {error}
                                </motion.div>
                            )}

                            {resetSent ? (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-4 py-4 text-center">
                                    <CheckCircle2 size={40} className="text-neon-green" />
                                    <p className="text-sm font-bold text-gray-900 dark:text-white">Reset link sent!</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Check your inbox at <span className="text-neon-blue font-semibold">{formData.email}</span></p>
                                    <button onClick={() => { setMode('signIn'); setResetSent(false); }} className="text-xs text-neon-pink hover:underline mt-2 tracking-widest uppercase font-bold">Back to Sign In</button>
                                </motion.div>
                            ) : mode === 'phone' ? (
                                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                                    {step === 'input' ? (
                                        <form onSubmit={handleSendOTP} className="space-y-4">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Phone Number</label>
                                                <div className="flex gap-2">
                                                    <select 
                                                        value={countryCode} 
                                                        onChange={(e) => setCountryCode(e.target.value)}
                                                        className="w-20 h-12 bg-gray-50 dark:bg-zinc-900 border border-black/10 dark:border-white/5 rounded-xl text-gray-900 dark:text-white text-xs px-2 focus:border-neon-blue focus:ring-1 focus:ring-neon-blue transition-all outline-none font-bold"
                                                    >
                                                        <option value="+91" className="bg-white dark:bg-zinc-900">🇮🇳 +91</option>
                                                        <option value="+1" className="bg-white dark:bg-zinc-900">🇺🇸 +1</option>
                                                        <option value="+44" className="bg-white dark:bg-zinc-900">🇬🇧 +44</option>
                                                        <option value="+971" className="bg-white dark:bg-zinc-900">🇦🇪 +971</option>
                                                    </select>
                                                    <div className="relative flex-1 group">
                                                        <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 dark:group-focus-within:text-neon-blue transition-colors" size={16} />
                                                        <Input
                                                            type="tel"
                                                            placeholder="99999 99999"
                                                            className="pl-10 h-12 bg-gray-50 dark:bg-zinc-900 border-black/10 dark:border-white/5 focus:border-neon-blue transition-all placeholder:text-gray-400 dark:placeholder:text-gray-600 text-sm"
                                                            value={phone}
                                                            onChange={(e) => setPhone(e.target.value)}
                                                            required
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                            <Button type="submit" className="w-full h-12 rounded-xl text-xs tracking-widest uppercase font-bold bg-black text-white dark:bg-white dark:text-black hover:bg-neon-blue hover:text-black dark:hover:bg-neon-blue dark:hover:text-black shadow-md transition-all" disabled={loading || cooldown > 0}>
                                                {loading ? <LoadingSpinner size="xs" color="#FFFFFF" /> : cooldown > 0 ? `Resend OTP in ${cooldown}s` : 'Send OTP'}
                                            </Button>
                                        </form>
                                    ) : (
                                        <form onSubmit={handleVerifyOTP} className="space-y-4">
                                            <div className="space-y-2">
                                                <div className="flex justify-between items-center ml-1">
                                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">6-Digit Code</label>
                                                    <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400">
                                                        Sent to {countryCode} {phone ? `******${phone.slice(-4)}` : ''}
                                                    </span>
                                                </div>
                                                
                                                <motion.div 
                                                    initial="hidden"
                                                    animate="visible"
                                                    variants={{
                                                        hidden: { opacity: 0 },
                                                        visible: {
                                                            opacity: 1,
                                                            transition: {
                                                                staggerChildren: 0.05
                                                            }
                                                        }
                                                    }}
                                                    className="flex justify-between gap-1.5 max-w-sm mx-auto"
                                                >
                                                    {otpValues.map((digit, idx) => (
                                                        <motion.input
                                                            key={idx}
                                                            ref={el => otpRefs.current[idx] = el}
                                                            type="text"
                                                            maxLength={1}
                                                            value={digit}
                                                            disabled={loading}
                                                            onChange={e => handleOtpChange(e.target.value, idx)}
                                                            onKeyDown={e => handleOtpKeyDown(e, idx)}
                                                            onPaste={handleOtpPaste}
                                                            variants={{
                                                                hidden: { opacity: 0, scale: 0.8, y: 10 },
                                                                visible: { opacity: 1, scale: 1, y: 0 }
                                                            }}
                                                            whileFocus={{ scale: 1.05 }}
                                                            className="w-10 h-14 sm:w-12 sm:h-16 bg-gray-50 dark:bg-zinc-900/60 backdrop-blur-md border border-black/10 dark:border-white/10 rounded-xl text-center text-xl font-black text-gray-900 dark:text-white focus:border-neon-pink focus:shadow-[0_0_20px_rgba(244,63,94,0.3)] transition-all outline-none"
                                                        />
                                                    ))}
                                                </motion.div>
                                            </div>

                                            <Button 
                                                type="submit" 
                                                className="w-full h-12 rounded-xl text-xs tracking-widest uppercase font-black bg-gradient-to-r from-neon-pink to-pink-600 text-white hover:shadow-[0_0_30px_rgba(244,63,94,0.4)] hover:scale-[1.01] active:scale-95 transition-all shadow-lg" 
                                                disabled={loading || otpValues.join('').length !== 6}
                                            >
                                                {loading ? <LoadingSpinner size="xs" color="#FFFFFF" /> : 'Verify & Sign In'}
                                            </Button>

                                            <div className="flex flex-col gap-2 pt-1 text-center">
                                                {cooldown > 0 ? (
                                                    <span className="text-[10px] font-bold text-gray-500 tracking-wider uppercase">
                                                        Resend Code in <span className="text-neon-pink">{cooldown}s</span>
                                                    </span>
                                                ) : (
                                                    <button 
                                                        type="button" 
                                                        onClick={handleSendOTP}
                                                        className="text-xs font-bold text-neon-blue hover:text-gray-900 dark:hover:text-white uppercase tracking-widest transition-colors"
                                                    >
                                                        Resend Code
                                                    </button>
                                                )}
                                                
                                                <button 
                                                    type="button" 
                                                    onClick={() => { setStep('input'); setOtpValues(['', '', '', '', '', '']); }}
                                                    className="text-xs text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
                                                >
                                                    Change Phone Number
                                                </button>
                                            </div>
                                        </form>
                                    )}
                                    <button 
                                        onClick={() => setMode('signIn')}
                                        className="w-full text-[10px] font-bold text-neon-blue hover:text-gray-900 dark:hover:text-white uppercase tracking-widest transition-colors py-1"
                                    >
                                        Back to Email Login
                                    </button>
                                </motion.div>
                            ) : mode === 'complete_profile' ? (
                                <motion.form initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} onSubmit={handleCompleteProfile} className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Full Name</label>
                                        <div className="relative group">
                                            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 dark:group-focus-within:text-neon-blue transition-colors" size={16} />
                                            <Input
                                                placeholder="Enter your name"
                                                className="pl-10 h-12 bg-gray-50 dark:bg-zinc-900 border-black/10 dark:border-white/5 focus:border-neon-blue transition-all placeholder:text-gray-400 dark:placeholder:text-gray-600 text-sm"
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Email Address</label>
                                        <div className="relative group">
                                            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 dark:group-focus-within:text-neon-blue transition-colors" size={16} />
                                            <Input
                                                type="email"
                                                placeholder="email@example.com"
                                                className="pl-10 h-12 bg-gray-50 dark:bg-zinc-900 border-black/10 dark:border-white/5 focus:border-neon-blue transition-all placeholder:text-gray-400 dark:placeholder:text-gray-600 text-sm"
                                                value={formData.email}
                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <Button type="submit" className="w-full h-12 rounded-xl text-xs tracking-widest uppercase font-bold bg-black text-white dark:bg-white dark:text-black hover:bg-neon-green hover:text-black dark:hover:bg-neon-green dark:hover:text-black shadow-md transition-all" disabled={loading}>
                                        {loading ? <LoadingSpinner size="xs" color="#FFFFFF" /> : 'Complete Registration'}
                                    </Button>
                                </motion.form>
                            ) : (
                                <motion.form key={mode} initial={{ opacity: 0, x: mode === 'signIn' ? -15 : 15 }} animate={{ opacity: 1, x: 0 }} onSubmit={handleSubmit} className="space-y-3.5">
                                    {mode === 'signUp' && (
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Full Name</label>
                                            <div className="relative group">
                                                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-pink-600 dark:group-focus-within:text-neon-pink transition-colors" size={16} />
                                                <Input
                                                    placeholder="Your name"
                                                    className="pl-10 h-12 bg-gray-50 dark:bg-zinc-900 border-black/10 dark:border-white/5 focus:border-neon-pink transition-all placeholder:text-gray-400 dark:placeholder:text-gray-600 text-sm"
                                                    value={formData.name}
                                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                    required
                                                />
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Email Address</label>
                                        <div className="relative group">
                                            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 dark:group-focus-within:text-neon-blue transition-colors" size={16} />
                                            <Input
                                                type="email"
                                                placeholder="you@example.com"
                                                className="pl-10 h-12 bg-gray-50 dark:bg-zinc-900 border-black/10 dark:border-white/5 focus:border-neon-blue transition-all placeholder:text-gray-400 dark:placeholder:text-gray-600 text-sm"
                                                value={formData.email}
                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                required
                                            />
                                        </div>
                                    </div>

                                    {mode !== 'forgot' && (
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Password</label>
                                            <div className="relative group">
                                                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 dark:group-focus-within:text-neon-blue transition-colors" size={16} />
                                                <Input
                                                    type="password"
                                                    placeholder="••••••••"
                                                    className="pl-10 h-12 bg-gray-50 dark:bg-zinc-900 border-black/10 dark:border-white/5 focus:border-neon-blue transition-all placeholder:text-gray-400 dark:placeholder:text-gray-600 text-sm"
                                                    value={formData.password}
                                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                                    required
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {mode === 'signIn' && (
                                        <div className="text-right">
                                            <button
                                                type="button"
                                                onClick={() => setMode('forgot')}
                                                className="text-[10px] font-bold tracking-wider text-neon-blue hover:text-gray-900 dark:hover:text-white transition-colors"
                                            >
                                                FORGOT PASSWORD?
                                            </button>
                                        </div>
                                    )}

                                    <Button
                                        type="submit"
                                        className={cn(
                                            "w-full h-12 rounded-xl text-xs tracking-widest uppercase font-bold shadow-md transition-all mt-2",
                                            mode === 'signUp' 
                                                ? 'bg-neon-pink hover:bg-pink-600 text-white shadow-[0_0_20px_rgba(255,79,139,0.3)]' 
                                                : 'bg-black text-white dark:bg-white dark:text-black hover:bg-neon-blue hover:text-black dark:hover:bg-neon-blue dark:hover:text-black'
                                        )}
                                        disabled={loading}
                                    >
                                        {loading ? <LoadingSpinner size="xs" color={mode === 'signUp' ? '#FFFFFF' : '#000000'} /> : mode === 'signIn' ? 'Sign In' : mode === 'signUp' ? 'Create Account' : 'Send Reset Link'}
                                    </Button>
                                </motion.form>
                            )}

                            <div className="relative my-5">
                                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-black/10 dark:border-white/5"></div></div>
                                <div className="relative flex justify-center text-[10px] font-bold tracking-widest uppercase"><span className="bg-white dark:bg-zinc-950 px-3 text-gray-400">Or continue with</span></div>
                            </div>

                            <div className="grid grid-cols-2 gap-2.5">
                                <button
                                    type="button"
                                    onClick={handleGoogleLogin}
                                    className="h-11 bg-gray-50 dark:bg-zinc-900 hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-900 dark:text-white border border-black/10 dark:border-white/5 hover:border-black/20 dark:hover:border-white/20 rounded-xl flex items-center justify-center gap-2 transition-all font-medium text-xs shadow-sm"
                                    disabled={loading}
                                >
                                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                                        <path
                                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                            fill="#4285F4"
                                        />
                                        <path
                                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                            fill="#34A853"
                                        />
                                        <path
                                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                            fill="#FBBC05"
                                        />
                                        <path
                                            d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                            fill="#EA4335"
                                        />
                                    </svg>
                                    <span>Google</span>
                                </button>

                                {mode !== 'phone' && (
                                    <button
                                        type="button"
                                        onClick={() => setMode('phone')}
                                        className="h-11 bg-gray-50 dark:bg-zinc-900 hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-900 dark:text-white border border-black/10 dark:border-white/5 hover:border-black/20 dark:hover:border-white/20 rounded-xl flex items-center justify-center gap-2 transition-all font-medium text-xs shadow-sm"
                                        disabled={loading}
                                    >
                                        <Phone size={14} className="text-gray-500 group-hover:text-neon-blue" />
                                        <span>Phone OTP</span>
                                    </button>
                                )}
                            </div>

                            <div className="mt-6 pt-3.5 text-center text-xs font-medium text-gray-500 border-t border-black/10 dark:border-white/5">
                                {mode === 'signIn' ? (
                                    <>Don't have an account? <button onClick={() => setMode('signUp')} className="text-neon-pink hover:text-gray-900 dark:hover:text-white transition-colors ml-1 font-bold tracking-widest uppercase">Sign Up</button></>
                                ) : mode === 'signUp' ? (
                                    <>Already have an account? <button onClick={() => setMode('signIn')} className="text-neon-blue hover:text-gray-900 dark:hover:text-white transition-colors ml-1 font-bold tracking-widest uppercase">Sign In</button></>
                                ) : (
                                    <button onClick={() => setMode('signIn')} className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors font-bold tracking-widest uppercase">Back to Sign In</button>
                                )}
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default AuthOverlay;


