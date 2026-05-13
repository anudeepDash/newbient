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
    Loader2, 
    CheckCircle2 
} from 'lucide-react';
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
    const [otpCode, setOtpCode] = useState('');
    const [confirmationResult, setConfirmationResult] = useState(null);
    const [step, setStep] = useState('input'); // 'input', 'verify' for phone mode
    const recaptchaVerifier = useRef(null);

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
            setOtpCode('');
            setError('');
            if (recaptchaVerifier.current) {
                try {
                    recaptchaVerifier.current.clear();
                    recaptchaVerifier.current = null;
                } catch (e) {}
            }
        }
    }, [isAuthOpen]);

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
                recaptchaVerifier.current = new RecaptchaVerifier(auth, 'recaptcha-auth-container', {
                    size: 'invisible',
                    callback: () => {
                        // reCAPTCHA solved
                    },
                    'expired-callback': () => {
                        setError("reCAPTCHA expired. Please try again.");
                        if (recaptchaVerifier.current) {
                            recaptchaVerifier.current.clear();
                            recaptchaVerifier.current = null;
                        }
                    }
                });
            }

            const cleanPhone = phone.replace(/\D/g, '');
            const formattedPhone = `${countryCode}${cleanPhone}`;
            const result = await signInWithPhoneNumber(auth, formattedPhone, recaptchaVerifier.current);
            setConfirmationResult(result);
            setStep('verify');
        } catch (err) {
            console.error("Phone Auth Error:", err);
            const friendlyError = getFriendlyErrorMessage(err);
            setError(friendlyError);
            
            // If it's a "already rendered" or "reset" error, we must clear it
            if (err.code === 'auth/captcha-check-failed' || err.message?.includes('already rendered')) {
                if (recaptchaVerifier.current) {
                    try { recaptchaVerifier.current.clear(); } catch (e) {}
                    recaptchaVerifier.current = null;
                }
            }
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOTP = async (e) => {
        e.preventDefault();
        if (otpCode.length !== 6) return setError("Enter 6-digit code.");
        
        setLoading(true);
        setError('');
        
        try {
            const result = await confirmationResult.confirm(otpCode);
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
            <div className="fixed inset-0 z-[100] flex items-start md:items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto pt-24 md:pt-4 pb-20">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="fixed inset-0 bg-transparent"
                />

                {/* Content */}
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    className="relative w-full max-w-md z-10 shrink-0"
                >
                    <Card className="p-8 border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white transition-colors"
                        >
                            <X size={20} />
                        </button>

                        <div className="text-center mb-8">
                            <h2 className="text-2xl font-bold font-heading text-transparent bg-clip-text bg-gradient-to-r from-neon-pink to-neon-blue">
                                {mode === 'signIn' ? 'Welcome Back' : mode === 'signUp' ? 'Join the Tribe' : mode === 'forgot' ? 'Reset Password' : 'Phone Sign In'}
                            </h2>
                            <p className="text-gray-400 mt-2 text-sm">
                                {mode === 'signIn' ? 'Sign in to access exclusive perks' : mode === 'signUp' ? 'Create an account to join the community' : mode === 'forgot' ? 'Enter your email to reset' : 'Sign in using your mobile number'}
                            </p>
                        </div>

                        {error && (
                            <div className="mb-6 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-500 text-sm text-center">
                                {error}
                            </div>
                        )}

                        {resetSent ? (
                            <div className="flex flex-col items-center gap-4 py-6 text-center">
                                <CheckCircle2 size={40} className="text-neon-green" />
                                <p className="text-sm font-bold text-white">Reset link sent!</p>
                                <p className="text-xs text-gray-500">Check your inbox at <span className="text-neon-blue">{formData.email}</span></p>
                                <button onClick={() => { setMode('signIn'); setResetSent(false); }} className="text-xs text-neon-pink hover:underline mt-2">Back to Sign In</button>
                            </div>
                        ) : mode === 'phone' ? (
                            <div className="space-y-6">
                                <div id="recaptcha-auth-container" className="fixed bottom-0 right-0 z-[200]"></div>
                                {step === 'input' ? (
                                    <form onSubmit={handleSendOTP} className="space-y-4">
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Phone Number</label>
                                            <div className="flex gap-2">
                                                <select 
                                                    value={countryCode} 
                                                    onChange={(e) => setCountryCode(e.target.value)}
                                                    className="w-24 h-12 bg-white/5 border border-white/10 rounded-lg text-white text-sm px-2 focus:border-neon-blue focus:outline-none"
                                                >
                                                    <option value="+91" className="bg-gray-900">🇮🇳 +91</option>
                                                    <option value="+1" className="bg-gray-900">🇺🇸 +1</option>
                                                    <option value="+44" className="bg-gray-900">🇬🇧 +44</option>
                                                    <option value="+971" className="bg-gray-900">🇦🇪 +971</option>
                                                    <option value="+61" className="bg-gray-900">🇦🇺 +61</option>
                                                    <option value="+65" className="bg-gray-900">🇸🇬 +65</option>
                                                    <option value="+1" className="bg-gray-900">🇨🇦 +1</option>
                                                </select>
                                                <div className="relative flex-1">
                                                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                                    <Input
                                                        type="tel"
                                                        placeholder="99999 99999"
                                                        className="pl-12"
                                                        value={phone}
                                                        onChange={(e) => setPhone(e.target.value)}
                                                        required
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <Button type="submit" className="w-full h-12" disabled={loading}>
                                            {loading ? <Loader2 className="animate-spin" /> : 'Send OTP'}
                                        </Button>
                                    </form>
                                ) : (
                                    <form onSubmit={handleVerifyOTP} className="space-y-4">
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">6-Digit Code</label>
                                            <div className="relative">
                                                <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                                <Input
                                                    type="text"
                                                    maxLength={6}
                                                    placeholder="000000"
                                                    className="pl-12 tracking-[1em] text-center"
                                                    value={otpCode}
                                                    onChange={(e) => setOtpCode(e.target.value)}
                                                    required
                                                />
                                            </div>
                                        </div>
                                        <Button type="submit" className="w-full h-12" disabled={loading}>
                                            {loading ? <Loader2 className="animate-spin" /> : 'Verify & Sign In'}
                                        </Button>
                                        <button 
                                            type="button" 
                                            onClick={() => setStep('input')}
                                            className="w-full text-xs text-gray-500 hover:text-white"
                                        >
                                            Change Phone Number
                                        </button>
                                    </form>
                                )}
                                <button 
                                    onClick={() => setMode('signIn')}
                                    className="w-full text-xs text-neon-blue hover:underline"
                                >
                                </button>
                            </div>
                        ) : mode === 'complete_profile' ? (
                            <form onSubmit={handleCompleteProfile} className="space-y-6">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Full Name</label>
                                    <div className="relative">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                        <Input
                                            placeholder="Enter your name"
                                            className="pl-12"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Email Address</label>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                        <Input
                                            type="email"
                                            placeholder="email@example.com"
                                            className="pl-12"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>
                                <Button type="submit" className="w-full h-12" disabled={loading}>
                                    {loading ? <Loader2 className="animate-spin" /> : 'Complete Registration'}
                                </Button>
                            </form>
                        ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {mode === 'signUp' && (
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Full Name</label>
                                    <div className="relative">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                        <Input
                                            placeholder="John Doe"
                                            className="pl-12"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                    <Input
                                        type="email"
                                        placeholder="you@example.com"
                                        className="pl-12"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>

                            {mode !== 'forgot' && (
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Password</label>
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                        <Input
                                            type="password"
                                            placeholder="••••••••"
                                            className="pl-12"
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
                                        className="text-xs text-neon-blue hover:text-white transition-colors"
                                    >
                                        Forgot Password?
                                    </button>
                                </div>
                            )}

                            <Button
                                type="submit"
                                className="w-full h-12 shadow-[0_0_20px_rgba(255,0,128,0.3)]"
                                disabled={loading}
                            >
                                {loading ? <Loader2 className="animate-spin" /> : mode === 'signIn' ? 'Sign In' : mode === 'signUp' ? 'Create Account' : 'Send Reset Link'}
                            </Button>
                        </form>
                        )}

                        <div className="relative my-8">
                            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
                            <div className="relative flex justify-center text-xs uppercase"><span className="bg-[#0a0a0a] px-2 text-gray-500">Or continue with</span></div>
                        </div>

                        <div className="space-y-3">
                            <button
                                type="button"
                                onClick={handleGoogleLogin}
                                className="w-full h-12 bg-white hover:bg-gray-50 text-gray-900 border border-white rounded-lg flex items-center justify-center gap-3 transition-all font-medium"
                                disabled={loading}
                            >
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
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
                                <span className="text-sm">Sign in with Google</span>
                            </button>

                            {mode !== 'phone' && (
                                <button
                                    type="button"
                                    onClick={() => setMode('phone')}
                                    className="w-full h-12 bg-neon-blue/10 hover:bg-neon-blue/20 text-neon-blue border border-neon-blue/30 rounded-lg flex items-center justify-center gap-3 transition-all font-medium"
                                    disabled={loading}
                                >
                                    <Phone size={18} />
                                    <span className="text-sm">Sign in with Phone OTP</span>
                                </button>
                            )}
                        </div>

                        <div className="mt-8 text-center text-sm text-gray-500">
                            {mode === 'signIn' ? (
                                <>Don't have an account? <button onClick={() => setMode('signUp')} className="text-neon-pink hover:underline">Sign Up</button></>
                            ) : mode === 'signUp' ? (
                                <>Already have an account? <button onClick={() => setMode('signIn')} className="text-neon-pink hover:underline">Sign In</button></>
                            ) : null}
                        </div>
                    </Card>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default AuthOverlay;


