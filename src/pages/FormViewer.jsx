import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { motion } from 'framer-motion';
import FileText from 'lucide-react/dist/esm/icons/file-text';
import ArrowLeft from 'lucide-react/dist/esm/icons/arrow-left';
import ExternalLink from 'lucide-react/dist/esm/icons/external-link';
import MapPin from 'lucide-react/dist/esm/icons/map-pin';
import ShieldCheck from 'lucide-react/dist/esm/icons/shield-check';
import LogIn from 'lucide-react/dist/esm/icons/log-in';
import Home from 'lucide-react/dist/esm/icons/home';
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw';
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

const normalizeString = (str) => String(str || '').trim().toLowerCase();
const createSlug = (str) => String(str || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const FormViewer = ({ formIdOverride }) => {
    useStoreSubscription(['forms', 'upcomingEvents', 'volunteerGigs', 'guestlists', 'campaigns']);
    const { id } = useParams();
    const navigate = useNavigate();
    const { 
        forms = [], 
        upcomingEvents = [], 
        volunteerGigs = [], 
        guestlists = [], 
        campaigns = [], 
        user, 
        setAuthModal 
    } = useStore();

    // Extract form identifier from params, search queries, or path
    const searchParams = new URLSearchParams(window.location.search);
    const rawTargetId = formIdOverride || id || searchParams.get('form') || searchParams.get('id') || searchParams.get('formId') || '';
    const pathSegments = (window.location.pathname || '').split('/');
    const formsIndex = pathSegments.indexOf('forms') !== -1 ? pathSegments.indexOf('forms') : pathSegments.indexOf('form');
    const pathFormId = formsIndex !== -1 ? pathSegments[formsIndex + 1] : '';
    const cleanTargetId = decodeURIComponent((rawTargetId || pathFormId || '').trim()).replace(/\/+$/, '');

    // Initial SSR cache check
    const initialWindowData = typeof window !== 'undefined' && window.__INITIAL_FORM_DATA__ ? window.__INITIAL_FORM_DATA__ : null;
    const isMatchingInitialData = initialWindowData && (
        !cleanTargetId || 
        normalizeString(initialWindowData.id) === normalizeString(cleanTargetId) ||
        normalizeString(initialWindowData.slug) === normalizeString(cleanTargetId) ||
        (initialWindowData.title && createSlug(initialWindowData.title) === createSlug(cleanTargetId))
    );

    const [directForm, setDirectForm] = useState(isMatchingInitialData ? initialWindowData : null);
    const [isFetchingDirect, setIsFetchingDirect] = useState(!isMatchingInitialData);
    const [iframeLoaded, setIframeLoaded] = useState(false);

    // 1. Comprehensive Store Matching Across Collections
    const storeForm = useMemo(() => {
        if (!cleanTargetId) {
            if (forms.length > 0) return forms[0];
            return null;
        }
        const clean = normalizeString(cleanTargetId);
        const cleanSlug = createSlug(cleanTargetId);

        // A. Match forms collection
        let match = forms.find(f => 
            normalizeString(f.id) === clean ||
            normalizeString(f.slug) === clean ||
            normalizeString(f.formId) === clean ||
            (f.title && createSlug(f.title) === cleanSlug) ||
            (f.link && normalizeString(f.link).endsWith(`/${clean}`))
        );
        if (match) return match;

        // B. Match upcomingEvents collection
        const eventMatch = upcomingEvents.find(e => 
            normalizeString(e.id) === clean ||
            normalizeString(e.formId) === clean ||
            normalizeString(e.relatedArtistFormId) === clean ||
            (e.title && createSlug(e.title) === cleanSlug) ||
            (e.link && normalizeString(e.link).endsWith(`/${clean}`))
        );
        if (eventMatch) {
            const refId = eventMatch.formId || eventMatch.relatedArtistFormId;
            if (refId) {
                const formInStore = forms.find(f => normalizeString(f.id) === normalizeString(refId));
                if (formInStore) return formInStore;
            }
            if (eventMatch.formUrl || (eventMatch.link && eventMatch.link.startsWith('http'))) {
                return {
                    id: eventMatch.id,
                    title: eventMatch.title,
                    description: eventMatch.description,
                    formUrl: eventMatch.formUrl || eventMatch.link,
                    activeLabel: eventMatch.status || 'Live',
                    image: eventMatch.image,
                    highlightColor: eventMatch.highlightColor || '#2ebfff',
                    bottomText: eventMatch.location || 'Event Form'
                };
            }
        }

        // C. Match volunteerGigs collection
        const gigMatch = volunteerGigs.find(g => 
            normalizeString(g.id) === clean ||
            normalizeString(g.formId) === clean ||
            (g.title && createSlug(g.title) === cleanSlug)
        );
        if (gigMatch) {
            if (gigMatch.formId) {
                const formInStore = forms.find(f => normalizeString(f.id) === normalizeString(gigMatch.formId));
                if (formInStore) return formInStore;
            }
            if (gigMatch.formUrl || gigMatch.applyLink || (gigMatch.link && gigMatch.link.startsWith('http'))) {
                return {
                    id: gigMatch.id,
                    title: gigMatch.title,
                    description: gigMatch.description,
                    formUrl: gigMatch.formUrl || gigMatch.applyLink || gigMatch.link,
                    activeLabel: gigMatch.status || 'Live',
                    image: gigMatch.image,
                    highlightColor: gigMatch.highlightColor || '#39FF14',
                    bottomText: gigMatch.location || 'Gig Form'
                };
            }
        }

        // D. Match guestlists collection
        const glMatch = guestlists.find(gl => 
            normalizeString(gl.id) === clean ||
            normalizeString(gl.formId) === clean ||
            (gl.title && createSlug(gl.title) === cleanSlug)
        );
        if (glMatch) {
            if (glMatch.formUrl || (glMatch.link && glMatch.link.startsWith('http'))) {
                return {
                    id: glMatch.id,
                    title: glMatch.title,
                    description: glMatch.description,
                    formUrl: glMatch.formUrl || glMatch.link,
                    activeLabel: glMatch.status || 'Live',
                    image: glMatch.image,
                    highlightColor: glMatch.highlightColor || '#39FF14',
                    bottomText: glMatch.location || 'Guestlist Form'
                };
            }
        }

        // E. Match campaigns collection
        const campMatch = campaigns.find(c => 
            normalizeString(c.id) === clean ||
            normalizeString(c.slug) === clean ||
            normalizeString(c.formId) === clean ||
            (c.title && createSlug(c.title) === cleanSlug)
        );
        if (campMatch) {
            if (campMatch.formUrl || campMatch.applyLink || (campMatch.link && campMatch.link.startsWith('http'))) {
                return {
                    id: campMatch.id,
                    title: campMatch.title,
                    description: campMatch.description,
                    formUrl: campMatch.formUrl || campMatch.applyLink || campMatch.link,
                    activeLabel: campMatch.status || 'Live',
                    image: campMatch.image,
                    highlightColor: campMatch.highlightColor || '#BF00FF',
                    bottomText: campMatch.brandName || 'Campaign Form'
                };
            }
        }

        return null;
    }, [cleanTargetId, forms, upcomingEvents, volunteerGigs, guestlists, campaigns]);

    // 2. Direct Multi-Tier Firestore & Backend API Query Fallback
    useEffect(() => {
        let isMounted = true;

        const fetchDirect = async () => {
            // If already resolved from store or initial SSR window cache, stop direct query
            if (storeForm || (isMatchingInitialData && directForm)) {
                if (isMounted) setIsFetchingDirect(false);
                return;
            }

            try {
                // Tier 1: Direct 'forms' document ID lookup via client Firestore
                if (cleanTargetId && db) {
                    try {
                        const formSnap = await getDoc(doc(db, 'forms', cleanTargetId));
                        if (formSnap.exists()) {
                            if (isMounted) {
                                setDirectForm({ id: formSnap.id, ...formSnap.data() });
                                setIsFetchingDirect(false);
                            }
                            return;
                        }
                    } catch (clientErr) {
                        console.warn("[FormViewer] Client Firestore lookup restricted, trying API fallback:", clientErr.message);
                    }
                }

                // Tier 2: Scan 'forms' collection for slug, formId, link, or title match
                if (cleanTargetId && db) {
                    try {
                        const allFormsSnap = await getDocs(collection(db, 'forms'));
                        if (!allFormsSnap.empty) {
                            const clean = normalizeString(cleanTargetId);
                            const cleanSlug = createSlug(cleanTargetId);
                            const foundDoc = allFormsSnap.docs.find(d => {
                                const data = d.data();
                                return normalizeString(d.id) === clean ||
                                       normalizeString(data.slug) === clean ||
                                       normalizeString(data.formId) === clean ||
                                       (data.title && createSlug(data.title) === cleanSlug) ||
                                       (data.link && normalizeString(data.link).endsWith(`/${clean}`));
                            });
                            if (foundDoc) {
                                if (isMounted) {
                                    setDirectForm({ id: foundDoc.id, ...foundDoc.data() });
                                    setIsFetchingDirect(false);
                                }
                                return;
                            }
                        }
                    } catch (clientErr) {
                        console.warn("[FormViewer] Client Firestore scan notice:", clientErr.message);
                    }
                }

                // Tier 3: Lookup 'upcoming_events'
                if (cleanTargetId && db) {
                    try {
                        const eventSnap = await getDoc(doc(db, 'upcoming_events', cleanTargetId));
                        if (eventSnap.exists()) {
                            const eventData = eventSnap.data();
                            const refFormId = eventData.formId || eventData.relatedArtistFormId;
                            if (refFormId) {
                                const refSnap = await getDoc(doc(db, 'forms', refFormId));
                                if (refSnap.exists()) {
                                    if (isMounted) {
                                        setDirectForm({ id: refSnap.id, ...refSnap.data() });
                                        setIsFetchingDirect(false);
                                    }
                                    return;
                                }
                            }
                            const extractedUrl = eventData.formUrl || (eventData.link?.startsWith('http') ? eventData.link : null);
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
                    } catch (clientErr) {
                        console.warn("[FormViewer] Event lookup notice:", clientErr.message);
                    }
                }

                // Tier 4: Serverless API fallback via Firebase Admin (Always works for unauthenticated guests)
                const apiTarget = cleanTargetId || 'latest';
                const res = await fetch(`/api/forms?id=${encodeURIComponent(apiTarget)}`);
                if (res.ok) {
                    const json = await res.json();
                    if (json.success && json.form) {
                        if (isMounted) {
                            setDirectForm(json.form);
                            setIsFetchingDirect(false);
                        }
                        return;
                    }
                }
            } catch (err) {
                console.warn("[FormViewer] All lookup tiers completed with notice:", err);
            }

            if (isMounted) {
                setIsFetchingDirect(false);
            }
        };

        fetchDirect();

        return () => {
            isMounted = false;
        };
    }, [cleanTargetId, storeForm, isMatchingInitialData]);

    const activeForm = storeForm || directForm;

    useDynamicMeta({
        title: activeForm ? activeForm.title : "Form Access",
        description: activeForm ? (activeForm.description || "Take a moment to complete this form with Newbi Entertainment.") : "Form not found.",
        image: activeForm?.image || "/og-image.png",
        url: window.location.href
    });

    // Extract cleanest embeddable / actionable URL
    const rawFormUrl = activeForm?.formUrl || activeForm?.link || activeForm?.applyLink || '';

    // Build the themed Google Form URL with user email pre-fill if available
    const themedFormUrl = useMemo(() => {
        if (!rawFormUrl) return '';
        let urlStr = rawFormUrl;
        if (urlStr.includes('<iframe')) {
            const match = urlStr.match(/src="([^"]+)"/);
            if (match && match[1]) urlStr = match[1];
        }
        try {
            const url = new URL(urlStr);
            if (user?.email) {
                url.searchParams.set('emailAddress', user.email);
            }
            return url.toString();
        } catch {
            return urlStr;
        }
    }, [rawFormUrl, user?.email]);

    // Show custom animated form loader while querying Firestore & API
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
                {/* Back Navigation & Direct Actions */}
                <motion.div 
                    initial={{ opacity: 0, x: -10 }} 
                    animate={{ opacity: 1, x: 0 }}
                    className="mb-8 flex items-center justify-between"
                >
                    <button 
                        onClick={() => navigate('/community')} 
                        className="flex items-center gap-2 text-gray-500 hover:text-gray-900 dark:hover:text-white text-xs font-bold uppercase tracking-widest transition-colors group"
                    >
                        <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
                        Community Hub
                    </button>

                    {themedFormUrl && (
                        <a 
                            href={themedFormUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-[11px] font-bold text-gray-500 hover:text-neon-pink uppercase tracking-widest transition-colors"
                        >
                            Open in New Tab <ExternalLink size={12} />
                        </a>
                    )}
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
                        {!themedFormUrl ? (
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
