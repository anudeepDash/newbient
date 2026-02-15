import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../../lib/store';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { X, Mail, Lock, User, Chrome, ArrowRight, Loader2 } from 'lucide-react';

const AuthOverlay = () => {
    const { loginWithGoogle, signUpWithEmail, signInWithEmail, isAuthOpen, setAuthModal } = useStore();
    const [mode, setMode] = useState('signIn'); // 'signIn', 'signUp', 'forgot'
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        email: '',
        password: '',
        name: ''
    });

    if (!isAuthOpen) return null;

    const onClose = () => setAuthModal(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            if (mode === 'signUp') {
                if (!formData.name) throw new Error('Please enter your name');
                await signUpWithEmail(formData.email, formData.password, formData.name);
            } else if (mode === 'signIn') {
                await signInWithEmail(formData.email, formData.password);
            }
            onClose();
        } catch (err) {
            setError(err.message || 'Authentication failed');
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
            setError(err.message || 'Google Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/80 backdrop-blur-md"
                />

                {/* Content */}
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    className="relative w-full max-w-md z-10"
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
                                {mode === 'signIn' ? 'Welcome Back' : mode === 'signUp' ? 'Join the Tribe' : 'Reset Password'}
                            </h2>
                            <p className="text-gray-400 mt-2 text-sm">
                                {mode === 'signIn' ? 'Sign in to access exclusive perks' : mode === 'signUp' ? 'Create an account to join the community' : 'Enter your email to reset'}
                            </p>
                        </div>

                        {error && (
                            <div className="mb-6 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-500 text-sm text-center">
                                {error}
                            </div>
                        )}

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

                        <div className="relative my-8">
                            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
                            <div className="relative flex justify-center text-xs uppercase"><span className="bg-[#0a0a0a] px-2 text-gray-500">Or continue with</span></div>
                        </div>

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

                        <div className="mt-8 text-center text-sm text-gray-500">
                            {mode === 'signIn' ? (
                                <>Don't have an account? <button onClick={() => setMode('signUp')} className="text-neon-pink hover:underline">Sign Up</button></>
                            ) : (
                                <>Already have an account? <button onClick={() => setMode('signIn')} className="text-neon-pink hover:underline">Sign In</button></>
                            )}
                        </div>
                    </Card>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default AuthOverlay;
