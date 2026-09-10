import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, getDocs, setDoc } from 'firebase/firestore';
import { motion } from 'framer-motion';
import FileText from 'lucide-react/dist/esm/icons/file-text';
import ArrowLeft from 'lucide-react/dist/esm/icons/arrow-left';
import ExternalLink from 'lucide-react/dist/esm/icons/external-link';
import MapPin from 'lucide-react/dist/esm/icons/map-pin';
import Home from 'lucide-react/dist/esm/icons/home';
import ShieldCheck from 'lucide-react/dist/esm/icons/shield-check';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import LogIn from 'lucide-react/dist/esm/icons/log-in';
import Zap from 'lucide-react/dist/esm/icons/zap';
import { useStore } from '../lib/store';
import { db } from '../lib/firebase';
import { useStoreSubscription } from '../hooks/useStoreSubscription';
import { Button } from '../components/ui/Button';
import useDynamicMeta from '../hooks/useDynamicMeta';

// Minimalist Clean Floating Form Icon Loader
const FormLoadingAnimation = () => (
    <div className="flex flex-col items-center justify-center p-8 text-center select-none">
        <motion.div
            animate={{ 
                y: [-6, 6, -6],
                rotate: [-1.5, 1.5, -1.5]
            }}
            transition={{ 
                duration: 2.4, 
                repeat: Infinity, 
                ease: "easeInOut" 
            }}
            className="relative"
        >
            {/* Ambient Glow */}
            <div className="absolute inset-0 bg-neon-pink/20 rounded-2xl blur-xl" />
            
            {/* Floating Form Icon Surface */}
            <div className="relative w-16 h-16 rounded-2xl bg-gray-100 dark:bg-white/5 border border-black/10 dark:border-white/10 flex items-center justify-center shadow-xl backdrop-blur-md">
                <FileText size={28} className="text-neon-pink" />
            </div>
        </motion.div>
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
            if (storeForm || (isMatchingInitialData && directForm)) {
                if (isMounted) setIsFetchingDirect(false);
                return;
            }

            try {
                // Tier 1: Direct Firestore Document Query on 'forms'
                if (cleanTargetId && db) {
                    const formDocRef = doc(db, 'forms', cleanTargetId);
                    const formSnap = await getDoc(formDocRef);
                    if (formSnap.exists()) {
                        if (isMounted) {
                            setDirectForm({ id: formSnap.id, ...formSnap.data() });
                            setIsFetchingDirect(false);
                        }
                        return;
                    }
                }

                // Tier 2: Check 'upcoming_events' in Firestore
                if (cleanTargetId && db) {
                    const eventDocRef = doc(db, 'upcoming_events', cleanTargetId);
                    const eventSnap = await getDoc(eventDocRef);
                    if (eventSnap.exists()) {
                        const data = eventSnap.data();
                        const extractedUrl = data.formUrl || (data.link && data.link.startsWith('http') ? data.link : null);
                        if (extractedUrl) {
                            if (isMounted) {
                                setDirectForm({
                                    id: eventSnap.id,
                                    title: data.title,
                                    description: data.description,
                                    formUrl: extractedUrl,
                                    activeLabel: data.status || 'Live',
                                    image: data.image,
                                    highlightColor: data.highlightColor || '#2ebfff',
                                    bottomText: data.location || 'Event Form'
                                });
                                setIsFetchingDirect(false);
                            }
                            return;
                        }
                    }
                }

                // Tier 3: Check 'volunteer_gigs' in Firestore
                if (cleanTargetId && db) {
                    const gigDocRef = doc(db, 'volunteer_gigs', cleanTargetId);
                    const gigSnap = await getDoc(gigDocRef);
                    if (gigSnap.exists()) {
                        const data = gigSnap.data();
                        const extractedUrl = data.formUrl || data.applyLink || (data.link && data.link.startsWith('http') ? data.link : null);
                        if (extractedUrl) {
                            if (isMounted) {
                                setDirectForm({
                                    id: gigSnap.id,
                                    title: data.title,
                                    description: data.description,
                                    formUrl: extractedUrl,
                                    activeLabel: data.status || 'Live',
                                    image: data.image,
                                    highlightColor: data.highlightColor || '#39FF14',
                                    bottomText: data.location || 'Gig Form'
                                });
                                setIsFetchingDirect(false);
                            }
                            return;
                        }
                    }
                }

                // Tier 4: Fetch entire forms collection from Firestore
                if (db) {
                    const formsColRef = collection(db, 'forms');
                    const allFormsSnap = await getDocs(formsColRef);
                    const allForms = allFormsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

                    if (cleanTargetId) {
                        const clean = normalizeString(cleanTargetId);
                        const cleanSlug = createSlug(cleanTargetId);
                        const found = allForms.find(f => 
                            normalizeString(f.id) === clean ||
                            normalizeString(f.slug) === clean ||
                            normalizeString(f.formId) === clean ||
                            (f.title && createSlug(f.title) === cleanSlug) ||
                            (f.link && normalizeString(f.link).endsWith(`/${clean}`))
                        );
                        if (found && isMounted) {
                            setDirectForm(found);
                            setIsFetchingDirect(false);
                            return;
                        }
                    } else if (allForms.length > 0 && isMounted) {
                        setDirectForm(allForms[0]);
                        setIsFetchingDirect(false);
                        return;
                    }
                }
            } catch (err) {
                console.warn("[FormViewer] Firestore lookup warning:", err);
            }

            if (isMounted) {
                setIsFetchingDirect(false);
            }
        };

        fetchDirect();

        return () => {
            isMounted = false;
        };
    }, [cleanTargetId, storeForm, isMatchingInitialData, directForm]);

    // Sync active member activity timestamp
    useEffect(() => {
        if (user?.uid && db) {
            try {
                setDoc(doc(db, 'users', user.uid), { 
                    lastActive: new Date().toISOString()
                }, { merge: true }).catch(() => {});
            } catch {
                // Ignore silent sync errors
            }
        }
    }, [user?.uid]);

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
            // Pre-fill email silently if user is logged in
            if (user?.email) {
                url.searchParams.set('emailAddress', user.email);
            }
            return url.toString();
        } catch {
            return urlStr;
        }
    }, [rawFormUrl, user?.email]);

    // Clean Minimalist Loading State
    if (isFetchingDirect && !activeForm) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-dark text-gray-900 dark:text-white">
                <FormLoadingAnimation />
            </div>
        );
    }

    // Form Not Found State
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

                {/* Active Member Status & Optional Sign-in Banner */}
                {user ? (
                    <motion.div 
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 }}
                        className="mb-6 p-4 md:p-5 bg-white/80 dark:bg-zinc-900/80 border border-green-500/20 dark:border-green-500/30 rounded-2xl md:rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg backdrop-blur-xl"
                    >
                        <div className="flex items-center gap-3.5">
                            <div className="relative">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/10 border border-green-500/30 flex items-center justify-center text-green-500">
                                    <ShieldCheck size={20} />
                                </div>
                                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                                </span>
                            </div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-green-600 dark:text-green-400">
                                        Active Member Verified
                                    </span>
                                </div>
                                <p className="text-xs md:text-sm font-bold text-gray-900 dark:text-white truncate">
                                    {user.displayName || user.email}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 self-start sm:self-center bg-green-500/10 dark:bg-green-500/15 border border-green-500/20 px-3 py-1.5 rounded-xl text-[10px] font-bold text-green-600 dark:text-green-400">
                            <Zap size={12} className="fill-current" />
                            <span>Activity & details linked</span>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div 
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 }}
                        className="mb-6 p-4 md:p-5 bg-gradient-to-r from-neon-pink/5 via-neon-purple/5 to-neon-blue/5 border border-neon-pink/20 dark:border-white/10 rounded-2xl md:rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl backdrop-blur-xl"
                    >
                        <div className="flex items-start sm:items-center gap-3.5">
                            <div className="w-10 h-10 rounded-xl bg-neon-pink/10 border border-neon-pink/30 flex items-center justify-center text-neon-pink shrink-0">
                                <Sparkles size={20} />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h4 className="text-xs md:text-sm font-extrabold text-gray-900 dark:text-white tracking-tight">
                                        Sign in to mark your active membership
                                    </h4>
                                    <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-neon-pink/15 text-neon-pink border border-neon-pink/30">
                                        Member Perks
                                    </span>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-0.5">
                                    Logs your participation for active member status and auto-fills your details.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                            <Button
                                onClick={() => setAuthModal(true)}
                                className="h-10 px-5 rounded-xl text-xs font-bold tracking-wider bg-neon-pink hover:bg-neon-pink/90 text-white shadow-lg shadow-neon-pink/20 hover:scale-[1.02] transition-all"
                            >
                                <LogIn size={14} className="mr-2" />
                                Sign In
                            </Button>
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
                                {/* Loading State with Minimalist Floating Form Icon */}
                                {!iframeLoaded && (
                                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-white dark:bg-zinc-950 min-h-[400px]">
                                        <FormLoadingAnimation />
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
