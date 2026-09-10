import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { motion } from 'framer-motion';
import FileText from 'lucide-react/dist/esm/icons/file-text';
import ArrowLeft from 'lucide-react/dist/esm/icons/arrow-left';
import ExternalLink from 'lucide-react/dist/esm/icons/external-link';
import MapPin from 'lucide-react/dist/esm/icons/map-pin';
import ShieldCheck from 'lucide-react/dist/esm/icons/shield-check';
import LogIn from 'lucide-react/dist/esm/icons/log-in';
import Home from 'lucide-react/dist/esm/icons/home';
import { useStore } from '../lib/store';
import { db } from '../lib/firebase';
import { useStoreSubscription } from '../hooks/useStoreSubscription';
import { Button } from '../components/ui/Button';
import useDynamicMeta from '../hooks/useDynamicMeta';

// Custom Animated Form Loader with floating Icon & Shimmer Bar
const FormLoadingAnimation = ({ label = "Loading Form" }) => (
    <div className="flex flex-col items-center justify-center p-8 text-center select-none">
        {/* Animated Form Icon Container */}
        <div className="relative w-24 h-24 mb-6 flex items-center justify-center">
            {/* Glowing Aura Rings */}
            <motion.div
                animate={{ scale: [1, 1.35, 1], opacity: [0.25, 0.6, 0.25] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-neon-pink/25 via-neon-blue/20 to-neon-green/25 blur-xl pointer-events-none"
            />
            
            {/* Outer Rotating Dashed Ring */}
            <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                className="absolute -inset-1.5 rounded-3xl border border-dashed border-neon-pink/30 dark:border-white/20"
            />

            {/* Main Form Icon Box */}
            <motion.div
                animate={{ y: [-4, 4, -4] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                className="relative z-10 w-20 h-20 rounded-2xl bg-white dark:bg-zinc-900 border border-black/10 dark:border-white/10 shadow-2xl flex flex-col items-center justify-center overflow-hidden"
            >
                {/* Decorative Top Accent Line */}
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-neon-pink via-neon-blue to-neon-green" />

                {/* Animated Form Icon */}
                <div className="relative mb-1">
                    <FileText size={28} className="text-neon-pink" />
                    <motion.div
                        animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.6, 1, 0.6] }}
                        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-neon-green shadow-[0_0_8px_#39FF14]"
                    />
                </div>

                {/* Animated Form input skeleton lines inside the icon */}
                <div className="w-10 space-y-1">
                    <motion.div 
                        animate={{ width: ["40%", "100%", "40%"] }} 
                        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }} 
                        className="h-1 rounded-full bg-neon-blue/70" 
                    />
                    <motion.div 
                        animate={{ width: ["100%", "55%", "100%"] }} 
                        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut", delay: 0.3 }} 
                        className="h-1 rounded-full bg-neon-pink/70" 
                    />
                </div>
            </motion.div>
        </div>

        {/* Status Label & Shimmer Track */}
        <div className="space-y-3">
            <div className="flex items-center justify-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-neon-pink animate-pulse" />
                <p className="text-[11px] font-black uppercase tracking-[0.25em] text-gray-900 dark:text-white font-heading">
                    {label}
                </p>
            </div>
            
            <div className="w-40 h-1 bg-black/5 dark:bg-white/10 rounded-full overflow-hidden mx-auto">
                <motion.div
                    animate={{ x: [-160, 160] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                    className="w-20 h-full bg-gradient-to-r from-transparent via-neon-pink to-transparent"
                />
            </div>
        </div>
    </div>
);

const FormViewer = ({ formIdOverride }) => {
    useStoreSubscription(['forms']);
    const { id } = useParams();
    const navigate = useNavigate();
    const { forms = [], user, setAuthModal } = useStore();
    const formId = formIdOverride || id;

    const [directForm, setDirectForm] = useState(null);
    const [isFetchingDirect, setIsFetchingDirect] = useState(true);
    const [iframeLoaded, setIframeLoaded] = useState(false);

    // 1. Check Store first
    const storeForm = forms.find(f => f.id === formId);

    // 2. Direct Firestore fallback query if not immediately available in store
    useEffect(() => {
        let isMounted = true;

        const fetchDirect = async () => {
            if (!formId || !db) {
                if (isMounted) setIsFetchingDirect(false);
                return;
            }

            // If already in store, no need to query directly
            if (storeForm) {
                if (isMounted) setIsFetchingDirect(false);
                return;
            }

            try {
                // Try 'forms' collection first
                const formSnap = await getDoc(doc(db, 'forms', formId));
                if (formSnap.exists()) {
                    if (isMounted) {
                        setDirectForm({ id: formSnap.id, ...formSnap.data() });
                        setIsFetchingDirect(false);
                    }
                    return;
                }

                // Fallback: check 'upcoming_events' in case an event ID was passed
                const eventSnap = await getDoc(doc(db, 'upcoming_events', formId));
                if (eventSnap.exists()) {
                    const eventData = eventSnap.data();
                    const extractedUrl = eventData.formUrl || eventData.link;
                    if (extractedUrl) {
                        if (isMounted) {
                            setDirectForm({
                                id: eventSnap.id,
                                title: eventData.title,
                                description: eventData.description,
                                formUrl: extractedUrl,
                                activeLabel: eventData.status || 'Live',
                                image: eventData.image,
                                highlightColor: eventData.highlightColor || '#2ebfff',
                                bottomText: eventData.location || 'Event Form'
                            });
                            setIsFetchingDirect(false);
                        }
                        return;
                    }
                }

                // Fallback: check 'volunteer_gigs'
                const gigSnap = await getDoc(doc(db, 'volunteer_gigs', formId));
                if (gigSnap.exists()) {
                    const gigData = gigSnap.data();
                    const extractedUrl = gigData.formUrl || gigData.applyLink || gigData.link;
                    if (extractedUrl) {
                        if (isMounted) {
                            setDirectForm({
                                id: gigSnap.id,
                                title: gigData.title,
                                description: gigData.description,
                                formUrl: extractedUrl,
                                activeLabel: gigData.status || 'Live',
                                image: gigData.image,
                                highlightColor: gigData.highlightColor || '#39FF14',
                                bottomText: gigData.location || 'Gig Form'
                            });
                            setIsFetchingDirect(false);
                        }
                        return;
                    }
                }
            } catch (err) {
                console.warn("[FormViewer] Firestore lookup error:", err);
            }

            if (isMounted) {
                setIsFetchingDirect(false);
            }
        };

        fetchDirect();

        return () => {
            isMounted = false;
        };
    }, [formId, storeForm]);

    const activeForm = storeForm || directForm;

    useDynamicMeta({
        title: activeForm ? activeForm.title : "Form Access",
        description: activeForm ? (activeForm.description || "Take a moment to complete this form with Newbi Entertainment.") : "Form not found.",
        image: activeForm?.image || "/og-image.png",
        url: window.location.href
    });

    // Build the themed Google Form URL with user email pre-fill if available
    const themedFormUrl = useMemo(() => {
        if (!activeForm?.formUrl) return '';
        try {
            const url = new URL(activeForm.formUrl);
            // If user is signed in and has an email, pre-fill via emailAddress param
            if (user?.email) {
                url.searchParams.set('emailAddress', user.email);
            }
            return url.toString();
        } catch {
            return activeForm.formUrl;
        }
    }, [activeForm?.formUrl, user?.email]);

    // Show custom animated form loader while querying Firestore
    if (isFetchingDirect && !activeForm) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-dark text-gray-900 dark:text-white">
                <FormLoadingAnimation label="Opening Form" />
            </div>
        );
    }

    if (!activeForm) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-dark text-gray-900 dark:text-white px-4">
                <motion.div 
                    initial={{ opacity: 0, y: 20 }} 
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center max-w-md mx-auto p-8 rounded-[2.5rem] bg-white dark:bg-zinc-950/60 border border-black/5 dark:border-white/5 shadow-2xl backdrop-blur-3xl"
                >
                    <div className="w-20 h-20 rounded-3xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 flex items-center justify-center mx-auto mb-6">
                        <FileText size={32} className="text-gray-400 dark:text-gray-500" />
                    </div>
                    <h2 className="text-2xl font-extrabold font-heading text-gray-900 dark:text-white mb-2 uppercase tracking-tight">Form Not Found</h2>
                    <p className="text-gray-500 text-sm font-medium mb-8 leading-relaxed">
                        The form you are looking for does not exist, has expired, or is currently inactive.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Button onClick={() => navigate('/community')} className="h-12 px-6 rounded-xl text-xs font-bold tracking-wider">
                            <ArrowLeft size={16} className="mr-2" /> Community Hub
                        </Button>
                        <Button onClick={() => navigate('/')} variant="outline" className="h-12 px-6 rounded-xl text-xs font-bold tracking-wider border-black/10 dark:border-white/10">
                            <Home size={16} className="mr-2" /> Home
                        </Button>
                    </div>
                </motion.div>
            </div>
        );
    }

    const highlightColor = activeForm.highlightColor || '#FF4F8B';

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-dark pt-28 pb-20 relative overflow-hidden">
            {/* Background Atmosphere */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[10%] left-[-15%] w-[50%] h-[50%] rounded-full blur-[150px] opacity-15" style={{ backgroundColor: `${highlightColor}20` }} />
                <div className="absolute bottom-[5%] right-[-10%] w-[40%] h-[40%] bg-neon-blue/5 rounded-full blur-[150px] opacity-10" />
            </div>

            <div className="max-w-5xl mx-auto relative z-10 px-4 sm:px-6 md:px-8">
                {/* Back Navigation */}
                <motion.div 
                    initial={{ opacity: 0, x: -10 }} 
                    animate={{ opacity: 1, x: 0 }}
                    className="mb-8"
                >
                    <button 
                        onClick={() => navigate('/community')} 
                        className="flex items-center gap-2 text-gray-500 hover:text-gray-900 dark:hover:text-white text-xs font-bold uppercase tracking-widest transition-colors group"
                    >
                        <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
                        Community Hub
                    </button>
                </motion.div>

                {/* Form Header */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }} 
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="mb-8"
                >
                    <div className="flex items-center gap-3 mb-4">
                        <div 
                            className="w-12 h-12 rounded-2xl flex items-center justify-center border backdrop-blur-xl"
                            style={{ backgroundColor: `${highlightColor}15`, borderColor: `${highlightColor}30`, color: highlightColor }}
                        >
                            <FileText size={20} />
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: highlightColor }} />
                            <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">Form</span>
                        </div>
                        {activeForm.activeLabel && (
                            <span className="px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20">
                                {activeForm.activeLabel}
                            </span>
                        )}
                    </div>

                    <h1 className="text-3xl md:text-5xl font-extrabold font-heading text-gray-900 dark:text-white tracking-tight leading-tight mb-3">
                        {activeForm.title}
                    </h1>
                    {activeForm.description && (
                        <p className="text-gray-600 dark:text-gray-400 text-sm md:text-base font-medium leading-relaxed max-w-2xl">
                            {activeForm.description}
                        </p>
                    )}
                    {activeForm.bottomText && (
                        <div className="flex items-center gap-2 mt-3 text-gray-500">
                            <MapPin size={12} />
                            <span className="text-[10px] font-bold uppercase tracking-widest">{activeForm.bottomText}</span>
                        </div>
                    )}
                </motion.div>

                {/* Signed-in User Indicator */}
                {user && (
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 }}
                        className="mb-6 p-4 bg-gray-100 dark:bg-white/[0.03] border border-black/5 dark:border-white/5 rounded-2xl flex items-center gap-3"
                    >
                        <div className="w-8 h-8 rounded-lg bg-neon-green/10 border border-neon-green/20 flex items-center justify-center">
                            <ShieldCheck size={14} className="text-neon-green" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Signed in as</p>
                            <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{user.displayName || user.email}</p>
                        </div>
                    </motion.div>
                )}

                {/* Sign-in Prompt for guests */}
                {!user && (
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 }}
                        className="mb-6 p-4 bg-gray-100 dark:bg-white/[0.03] border border-black/5 dark:border-white/5 rounded-2xl flex items-center gap-3"
                    >
                        <div className="w-8 h-8 rounded-lg bg-neon-blue/10 border border-neon-blue/20 flex items-center justify-center">
                            <LogIn size={14} className="text-neon-blue" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                                <button onClick={() => setAuthModal(true)} className="text-neon-blue hover:text-gray-900 dark:hover:text-white font-bold transition-colors">Sign in</button> to auto-fill your details in the form.
                            </p>
                        </div>
                    </motion.div>
                )}

                {/* Form Container */}
                <motion.div 
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="relative group"
                >
                    {/* Glow Effect */}
                    <div 
                        className="absolute -inset-2 rounded-[2.5rem] md:rounded-[3rem] blur-2xl opacity-5 group-hover:opacity-15 transition duration-1000"
                        style={{ background: `linear-gradient(135deg, ${highlightColor}, #2ebfff, #39FF14)` }}
                    />

                    <div className="relative bg-white dark:bg-zinc-950 rounded-[2rem] md:rounded-[2.5rem] overflow-hidden border border-black/10 dark:border-white/5 shadow-2xl">
                        {!activeForm.formUrl ? (
                            <div className="p-16 text-center">
                                <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
                                    <FileText size={24} className="text-red-400" />
                                </div>
                                <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Invalid or missing form URL</p>
                            </div>
                        ) : activeForm.requiresExternal ? (
                            <div className="p-12 md:p-20 text-center">
                                <div className="w-20 h-20 rounded-3xl bg-gray-100 dark:bg-white/5 border border-black/10 dark:border-white/10 flex items-center justify-center mx-auto mb-8">
                                    <ExternalLink size={32} className="text-gray-400" />
                                </div>
                                <h3 className="text-xl md:text-2xl font-extrabold font-heading text-gray-900 dark:text-white mb-3">External Form</h3>
                                <p className="text-gray-500 text-sm font-medium mb-8 max-w-md mx-auto leading-relaxed">
                                    This form requires Google Sign-in or file uploads, so it needs to be opened in a new tab for the best experience.
                                </p>
                                <a
                                    href={themedFormUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center justify-center gap-3 h-14 px-10 bg-white dark:bg-white text-black rounded-xl font-bold tracking-wider text-sm hover:scale-[1.02] transition-all shadow-2xl"
                                >
                                    Open Form <ExternalLink size={16} />
                                </a>
                            </div>
                        ) : (
                            <div className="relative">
                                {/* Loading State with Custom Form Icon Animation */}
                                {!iframeLoaded && (
                                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-white dark:bg-zinc-950 min-h-[400px]">
                                        <FormLoadingAnimation label="Loading Form Content" />
                                    </div>
                                )}
                                
                                {/* Themed iframe wrapper */}
                                <div className="form-iframe-wrapper">
                                    <iframe
                                        src={themedFormUrl}
                                        className="w-full border-0 transition-opacity duration-500"
                                        style={{ 
                                            minHeight: '85vh',
                                            height: '900px',
                                            opacity: iframeLoaded ? 1 : 0
                                        }}
                                        title={activeForm.title}
                                        onLoad={() => setIframeLoaded(true)}
                                        allow="camera; microphone"
                                        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* Footer Info */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="mt-8 flex items-center justify-center gap-2"
                >
                    <div className="w-1.5 h-1.5 rounded-full bg-neon-green" />
                    <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-[0.2em]">Newbi Entertainment</span>
                </motion.div>
            </div>
        </div>
    );
};

export default FormViewer;
