import React, { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { motion } from 'framer-motion';
import CheckCircle2 from 'lucide-react/dist/esm/icons/check-circle-2';
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle';
import ShieldCheck from 'lucide-react/dist/esm/icons/shield-check';
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import confetti from 'canvas-confetti';
import useDynamicMeta from '../hooks/useDynamicMeta';

const VerifyCreator = () => {
    useDynamicMeta({
        title: "Verify Creator Profile",
        description: "Automated 1-click verification for Newbi Creator Network.",
        url: window.location.href
    });

    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const id = searchParams.get('id') || searchParams.get('creatorId') || '';
    const token = searchParams.get('token') || '';

    const [status, setStatus] = useState('verifying'); // 'verifying', 'success', 'already_verified', 'error'
    const [creatorData, setCreatorData] = useState(null);
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        const verifyProfile = async () => {
            if (!id || !token) {
                setStatus('error');
                setErrorMessage('Invalid or incomplete verification link. Please check the link in your email.');
                return;
            }

            try {
                const creatorRef = doc(db, 'creators', id);
                const snap = await getDoc(creatorRef);

                if (!snap.exists()) {
                    setStatus('error');
                    setErrorMessage('Creator profile not found. It may have been updated or removed.');
                    return;
                }

                const data = snap.data();
                setCreatorData(data);

                // Check if already verified
                if (data.isPhoneVerified && !data.verificationToken) {
                    setStatus('already_verified');
                    return;
                }

                // Verify token match
                if (data.verificationToken && data.verificationToken !== token) {
                    setStatus('error');
                    setErrorMessage('This verification link is expired or invalid. Please request a new verification link.');
                    return;
                }

                // Perform automated verification update
                await updateDoc(creatorRef, {
                    isPhoneVerified: true,
                    phoneVerifiedAt: new Date().toISOString(),
                    isEmailVerified: true,
                    emailVerifiedAt: new Date().toISOString(),
                    verificationToken: null, // Clear used token
                    profileStatus: data.profileStatus === 'pending' ? 'approved' : (data.profileStatus || 'approved')
                });

                setStatus('success');
                try {
                    confetti({ particleCount: 120, spread: 80, origin: { y: 0.5 } });
                } catch (e) {}
            } catch (err) {
                console.error("Verification error:", err);
                setStatus('error');
                setErrorMessage(err.message || 'Verification could not be completed. Please try again or reach out to our team.');
            }
        };

        verifyProfile();
    }, [id, token]);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#09090b] text-gray-900 dark:text-white pt-36 pb-24 px-4 flex items-center justify-center relative overflow-hidden selection:bg-emerald-500 selection:text-black transition-colors duration-300">
            {/* Ambient Lighting */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
            </div>

            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="max-w-lg w-full p-8 sm:p-12 bg-white dark:bg-zinc-900/90 border border-gray-200 dark:border-zinc-800 rounded-3xl text-center shadow-xl dark:shadow-2xl relative z-10"
            >
                {status === 'verifying' && (
                    <div className="space-y-6 py-8">
                        <div className="w-16 h-16 rounded-2xl bg-zinc-800 flex items-center justify-center mx-auto text-emerald-400">
                            <LoadingSpinner size="md" color="emerald" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Verifying Contact & Profile...</h2>
                            <p className="text-zinc-400 text-sm">Please wait while we automatically confirm your creator account.</p>
                        </div>
                    </div>
                )}

                {status === 'success' && (
                    <div className="space-y-6">
                        <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-center mx-auto text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                            <CheckCircle2 size={42} />
                        </div>
                        <div>
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-3">
                                <Sparkles size={12} />
                                <span>Verified Creator</span>
                            </div>
                            <h2 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white mb-2">
                                Phone & Profile Verified!
                            </h2>
                            <p className="text-zinc-400 text-sm leading-relaxed">
                                Welcome aboard, <span className="text-gray-900 dark:text-white font-semibold">{creatorData?.displayName || creatorData?.name || 'Creator'}</span>! Your contact number has been automatically verified. You are now prioritized for live brand briefs and campaigns.
                            </p>
                        </div>

                        {creatorData && (
                            <div className="p-4 bg-gray-100 dark:bg-zinc-950/60 border border-zinc-800/80 rounded-2xl text-left text-xs text-zinc-300 space-y-2">
                                <div className="flex justify-between py-1 border-b border-zinc-800/60">
                                    <span className="text-zinc-500">Instagram Handle</span>
                                    <span className="font-semibold text-gray-900 dark:text-white">@{creatorData.instagram}</span>
                                </div>
                                <div className="flex justify-between py-1 border-b border-zinc-800/60">
                                    <span className="text-zinc-500">Operating City</span>
                                    <span className="font-semibold text-gray-900 dark:text-white">{creatorData.city}</span>
                                </div>
                                <div className="flex justify-between py-1">
                                    <span className="text-zinc-500">Status</span>
                                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                                        <ShieldCheck size={14} /> Active & Verified
                                    </span>
                                </div>
                            </div>
                        )}

                        <div className="flex flex-col sm:flex-row gap-3 pt-2">
                            <Link
                                to="/campaigns"
                                className="flex-1 h-12 bg-white hover:bg-zinc-200 text-zinc-950 font-bold rounded-xl flex items-center justify-center gap-2 text-sm transition-all"
                            >
                                <span>Explore Live Briefs</span>
                                <ArrowRight size={16} />
                            </Link>
                            <Link
                                to="/creator-dashboard"
                                className="flex-1 h-12 bg-zinc-800 hover:bg-zinc-700 text-gray-900 dark:text-white font-semibold rounded-xl flex items-center justify-center text-sm transition-all"
                            >
                                Open Workspace
                            </Link>
                        </div>
                    </div>
                )}

                {status === 'already_verified' && (
                    <div className="space-y-6">
                        <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-center mx-auto text-emerald-400">
                            <ShieldCheck size={42} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Already Verified!</h2>
                            <p className="text-zinc-400 text-sm leading-relaxed">
                                Your Newbi Creator Profile is already active and verified. You're all set to apply for brand campaigns.
                            </p>
                        </div>
                        <Link
                            to="/campaigns"
                            className="w-full h-12 bg-white hover:bg-zinc-200 text-zinc-950 font-bold rounded-xl flex items-center justify-center gap-2 text-sm transition-all"
                        >
                            <span>Browse Campaigns</span>
                            <ArrowRight size={16} />
                        </Link>
                    </div>
                )}

                {status === 'error' && (
                    <div className="space-y-6">
                        <div className="w-20 h-20 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center justify-center mx-auto text-red-400">
                            <AlertTriangle size={36} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Verification Failed</h2>
                            <p className="text-zinc-400 text-sm leading-relaxed mb-4">
                                {errorMessage}
                            </p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <Link
                                to="/creator/join"
                                className="flex-1 h-12 bg-white hover:bg-zinc-200 text-zinc-950 font-bold rounded-xl flex items-center justify-center text-sm transition-all"
                            >
                                Register Again
                            </Link>
                            <Link
                                to="/contact"
                                className="flex-1 h-12 bg-zinc-800 hover:bg-zinc-700 text-gray-900 dark:text-white font-semibold rounded-xl flex items-center justify-center text-sm transition-all"
                            >
                                Contact Support
                            </Link>
                        </div>
                    </div>
                )}
            </motion.div>
        </div>
    );
};

export default VerifyCreator;
