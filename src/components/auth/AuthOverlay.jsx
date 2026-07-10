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
            <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/60 md:bg-black/80 backdrop-blur-md sm:p-4">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="fixed inset-0 bg-transparent"
                />

                {/* Content Modal */}
                <motion.div
                    initial={{ y: '100%', opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: '100%', opacity: 0 }}
                    transition={{ type: "spring", damping: 25, stiffness: 200 }}
                    className="relative w-full max-w-4xl z-10 bg-zinc-950 md:bg-zinc-900 rounded-t-[2rem] md:rounded-3xl border-t md:border border-white/10 shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh] md:max-h-[85vh]"
                >
                    {/* Mobile Drag Handle */}
                    <div className="w-full flex justify-center pt-4 pb-2 md:hidden">
                        <div className="w-12 h-1.5 bg-white/20 rounded-full" />
                    </div>

                    <button
                        onClick={onClose}
                        className="absolute top-4 md:top-6 right-4 md:right-6 p-2 bg-black/50 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-all z-20"
                    >
                        <X size={20} />
                    </button>

                    {/* Left Branding Column (Desktop Only) */}
                    <div className="hidden md:flex flex-col justify-between w-1/2 p-12 relative overflow-hidden bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 border-r border-white/5">
                        {/* Abstract Background Elements */}
                        <div className="absolute -top-24 -left-24 w-64 h-64 bg-neon-blue/20 rounded-full blur-[80px]" />
                        <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-neon-pink/20 rounded-full blur-[80px]" />
                        
                        <div className="relative z-10">
                            <h2 className="text-3xl lg:text-4xl font-black font-heading italic tracking-tighter text-white mb-2">NEWBI ENT.</h2>
                            <p className="text-gray-400 font-medium tracking-widest text-xs uppercase">The Pulse of Youth</p>
                        </div>

                        <div className="relative z-10 mt-auto">
                            <motion.h3 
                                key={mode}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-4xl lg:text-5xl font-black text-white leading-tight mb-4"
                            >
                                {mode === 'signIn' ? 'Welcome\nBack.' : mode === 'signUp' ? 'Join the\nTribe.' : mode === 'forgot' ? 'Reset\nPassword.' : 'Secure\nAccess.'}
                            </motion.h3>
                            <p className="text-gray-400 text-sm leading-relaxed max-w-sm">
                                {mode === 'signIn' ? 'Experience premium events, creator campaigns, and community perks all in one place.' : mode === 'signUp' ? 'Create an account to discover exclusive opportunities and manage your collaborations.' : 'Enter your details to securely verify your identity and manage your account.'}
                            </p>
                        </div>
                    </div>

                    {/* Right Form Column */}
                    <div className="w-full md:w-1/2 bg-zinc-950 p-6 md:p-12 overflow-y-auto mobile-scrollbar-hide relative flex flex-col pb-[env(safe-area-inset-bottom)]">
                        <div className="md:hidden text-center mb-8">
                            <h2 className="text-3xl font-black font-heading text-transparent bg-clip-text bg-gradient-to-r from-neon-pink to-neon-blue">
                                {mode === 'signIn' ? 'Welcome Back' : mode === 'signUp' ? 'Join the Tribe' : mode === 'forgot' ? 'Reset Password' : 'Phone Sign In'}
                            </h2>
                            <p className="text-gray-400 mt-2 text-xs">
                                {mode === 'signIn' ? 'Sign in to access exclusive perks' : mode === 'signUp' ? 'Create an account to join the community' : mode === 'forgot' ? 'Enter your email to reset' : 'Sign in using your mobile number'}
                            </p>
                        </div>
                        
                        <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
                            {error && (
                                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mb-6 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs font-medium text-center">
                                    {error}
                                </motion.div>
                            )}

                            {resetSent ? (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-4 py-6 text-center">
                                    <CheckCircle2 size={48} className="text-neon-green" />
                                    <p className="text-base font-bold text-white">Reset link sent!</p>
                                    <p className="text-xs text-gray-400">Check your inbox at <span className="text-neon-blue">{formData.email}</span></p>
                                    <button onClick={() => { setMode('signIn'); setResetSent(false); }} className="text-xs text-neon-pink hover:underline mt-4 tracking-widest uppercase font-bold">Back to Sign In</button>
                                </motion.div>
                            ) : mode === 'phone' ? (
                                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                                    {step === 'input' ? (
                                        <form onSubmit={handleSendOTP} className="space-y-5">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Phone Number</label>
                                                <div className="flex gap-2">
                                                    <select 
                                                        value={countryCode} 
                                                        onChange={(e) => setCountryCode(e.target.value)}
                                                        className="w-24 h-14 bg-zinc-900 border border-white/5 rounded-xl text-white text-sm px-2 focus:border-neon-blue focus:ring-1 focus:ring-neon-blue transition-all outline-none"
                                                    >
                                                        <option value="+91" className="bg-zinc-900">🇮🇳 +91</option>
                                                        <option value="+1" className="bg-zinc-900">🇺🇸 +1</option>
                                                        <option value="+44" className="bg-zinc-900">🇬🇧 +44</option>
                                                        <option value="+971" className="bg-zinc-900">🇦🇪 +971</option>
                                                    </select>
                                                    <div className="relative flex-1 group">
                                                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-neon-blue transition-colors" size={18} />
                                                        <Input
                                                            type="tel"
                                                            placeholder="99999 99999"
                                                            className="pl-12 h-14 bg-zinc-900 border-white/5 focus:border-neon-blue transition-all"
                                                            value={phone}
                                                            onChange={(e) => setPhone(e.target.value)}
                                                            required
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                            <Button type="submit" className="w-full h-14 rounded-xl text-sm tracking-widest uppercase font-bold" disabled={loading || cooldown > 0}>
                                                {loading ? <LoadingSpinner size="xs" color="#FFFFFF" /> : cooldown > 0 ? `Resend OTP in ${cooldown}s` : 'Send OTP'}
                                            </Button>
                                        </form>
                                    ) : (
                                        <form onSubmit={handleVerifyOTP} className="space-y-6">
                                            <div className="space-y-3">
                                                <div className="flex justify-between items-center ml-1">
                                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">6-Digit Code</label>
                                                    <span className="text-[10px] font-medium text-gray-400">
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
                                                    className="flex justify-between gap-2 max-w-sm mx-auto"
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
                                                            className="w-12 h-16 sm:w-14 sm:h-20 bg-zinc-900/60 backdrop-blur-md border border-white/10 rounded-2xl text-center text-2xl font-black text-white focus:border-neon-pink focus:shadow-[0_0_20px_rgba(244,63,94,0.3)] transition-all outline-none"
                                                        />
                                                    ))}
                                                </motion.div>
                                            </div>

                                            <Button 
                                                type="submit" 
                                                className="w-full h-14 rounded-xl text-sm tracking-widest uppercase font-black bg-gradient-to-r from-neon-pink to-pink-600 hover:shadow-[0_0_30px_rgba(244,63,94,0.4)] hover:scale-[1.01] active:scale-95 transition-all" 
                                                disabled={loading || otpValues.join('').length !== 6}
                                            >
                                                {loading ? <LoadingSpinner size="xs" color="#FFFFFF" /> : 'Verify & Sign In'}
                                            </Button>

                                            <div className="flex flex-col gap-3 pt-2 text-center">
                                                {cooldown > 0 ? (
                                                    <span className="text-[10px] font-bold text-gray-500 tracking-wider uppercase">
                                                        Resend Code in <span className="text-neon-pink">{cooldown}s</span>
                                                    </span>
                                                ) : (
                                                    <button 
                                                        type="button"
                                                        onClick={handleSendOTP}
                                                        className="text-xs font-black text-neon-blue hover:text-white uppercase tracking-widest transition-colors"
                                                    >
                                                        Resend Verification Code
                                                    </button>
                                                )}
                                                
                                                <button 
                                                    type="button" 
                                                    onClick={() => { setStep('input'); setOtpValues(['', '', '', '', '', '']); }}
                                                    className="text-xs text-gray-500 hover:text-white transition-colors"
                                                >
                                                    Change Phone Number
                                                </button>
                                            </div>
                                        </form>
                                    )}
                                    <button 
                                        onClick={() => setMode('signIn')}
                                        className="w-full text-[10px] font-black text-neon-blue hover:text-white uppercase tracking-widest transition-colors py-2"
                                    >
                                        BACK TO EMAIL LOGIN
                                    </button>
                                </motion.div>
                            ) : mode === 'complete_profile' ? (
                                <motion.form initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} onSubmit={handleCompleteProfile} className="space-y-5">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Full Name</label>
                                        <div className="relative group">
                                            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-neon-blue transition-colors" size={18} />
                                            <Input
                                                placeholder="Enter your name"
                                                className="pl-12 h-14 bg-zinc-900 border-white/5 focus:border-neon-blue transition-all"
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Email Address</label>
                                        <div className="relative group">
                                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-neon-blue transition-colors" size={18} />
                                            <Input
                                                type="email"
                                                placeholder="email@example.com"
                                                className="pl-12 h-14 bg-zinc-900 border-white/5 focus:border-neon-blue transition-all"
                                                value={formData.email}
                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <Button type="submit" className="w-full h-14 rounded-xl text-sm tracking-widest uppercase font-bold" disabled={loading}>
                                        {loading ? <LoadingSpinner size="xs" color="#FFFFFF" /> : 'Complete Registration'}
                                    </Button>
                                </motion.form>
                            ) : (
                            <motion.form key={mode} initial={{ opacity: 0, x: mode === 'signIn' ? -20 : 20 }} animate={{ opacity: 1, x: 0 }} onSubmit={handleSubmit} className="space-y-5">
                                {mode === 'signUp' && (
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Full Name</label>
                                        <div className="relative group">
                                            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-neon-pink transition-colors" size={18} />
                                            <Input
                                                placeholder="John Doe"
                                                className="pl-12 h-14 bg-zinc-900 border-white/5 focus:border-neon-pink transition-all"
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                required
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Email Address</label>
                                    <div className="relative group">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-neon-blue transition-colors" size={18} />
                                        <Input
                                            type="email"
                                            placeholder="you@example.com"
                                            className="pl-12 h-14 bg-zinc-900 border-white/5 focus:border-neon-blue transition-all"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>

                                {mode !== 'forgot' && (
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Password</label>
                                        <div className="relative group">
                                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-neon-blue transition-colors" size={18} />
                                            <Input
                                                type="password"
                                                placeholder="••••••••"
                                                className="pl-12 h-14 bg-zinc-900 border-white/5 focus:border-neon-blue transition-all"
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
                                            className="text-[10px] font-bold tracking-wider text-neon-blue hover:text-white transition-colors py-1"
                                        >
                                            FORGOT PASSWORD?
                                        </button>
                                    </div>
                                )}

                                <Button
                                    type="submit"
                                    className={`w-full h-14 rounded-xl text-sm tracking-widest uppercase font-bold shadow-2xl ${mode === 'signUp' ? 'bg-neon-pink hover:bg-pink-600 text-white shadow-[0_0_20px_rgba(255,79,139,0.3)]' : 'bg-white text-black hover:bg-gray-200 shadow-[0_0_20px_rgba(255,255,255,0.1)]'}`}
                                    disabled={loading}
                                >
                                    {loading ? <LoadingSpinner size="xs" color={mode === 'signUp' ? '#FFFFFF' : '#000000'} /> : mode === 'signIn' ? 'Sign In' : mode === 'signUp' ? 'Create Account' : 'Send Reset Link'}
                                </Button>
                            </motion.form>
                            )}

                            <div className="relative my-8">
                                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
                                <div className="relative flex justify-center text-[10px] font-bold tracking-widest uppercase"><span className="bg-zinc-950 px-4 text-gray-500">Or continue with</span></div>
                            </div>

                            <div className="space-y-3">
                                <button
                                    type="button"
                                    onClick={handleGoogleLogin}
                                    className="w-full h-14 bg-zinc-900 hover:bg-zinc-800 text-white border border-white/5 hover:border-white/20 rounded-xl flex items-center justify-center gap-3 transition-all font-medium group"
                                    disabled={loading}
                                >
                                    <svg className="w-5 h-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
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
                                    <span className="text-sm tracking-wide">Google</span>
                                </button>

                                {mode !== 'phone' && (
                                    <button
                                        type="button"
                                        onClick={() => setMode('phone')}
                                        className="w-full h-14 bg-zinc-900 hover:bg-zinc-800 text-white border border-white/5 hover:border-white/20 rounded-xl flex items-center justify-center gap-3 transition-all font-medium group"
                                        disabled={loading}
                                    >
                                        <Phone size={18} className="text-gray-400 group-hover:text-neon-blue group-hover:scale-110 transition-all" />
                                        <span className="text-sm tracking-wide">Phone OTP</span>
                                    </button>
                                )}
                            </div>

                            <div className="mt-8 pt-4 text-center text-xs font-medium text-gray-500 border-t border-white/5">
                                {mode === 'signIn' ? (
                                    <>Don't have an account? <button onClick={() => setMode('signUp')} className="text-neon-pink hover:text-white transition-colors ml-1 font-bold tracking-widest uppercase">Sign Up</button></>
                                ) : mode === 'signUp' ? (
                                    <>Already have an account? <button onClick={() => setMode('signIn')} className="text-neon-blue hover:text-white transition-colors ml-1 font-bold tracking-widest uppercase">Sign In</button></>
                                ) : (
                                    <button onClick={() => setMode('signIn')} className="text-gray-400 hover:text-white transition-colors font-bold tracking-widest uppercase">Back to Sign In</button>
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


