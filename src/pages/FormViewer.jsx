import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import FileText from 'lucide-react/dist/esm/icons/file-text';
import ArrowLeft from 'lucide-react/dist/esm/icons/arrow-left';
import ExternalLink from 'lucide-react/dist/esm/icons/external-link';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import MapPin from 'lucide-react/dist/esm/icons/map-pin';
import ShieldCheck from 'lucide-react/dist/esm/icons/shield-check';
import LogIn from 'lucide-react/dist/esm/icons/log-in';
import { useStore } from '../lib/store';
import { useStoreSubscription } from '../hooks/useStoreSubscription';
import { Button } from '../components/ui/Button';
import useDynamicMeta from '../hooks/useDynamicMeta';

const FormViewer = ({ formIdOverride }) => {
    useStoreSubscription(['forms']);
    const { id } = useParams();
    const navigate = useNavigate();
    const { forms, user, setAuthModal } = useStore();
    const formId = formIdOverride || id;
    const [iframeLoaded, setIframeLoaded] = useState(false);
    const [isResolving, setIsResolving] = useState(true);

    const form = forms.find(f => f.id === formId);

    React.useEffect(() => {
        if (form) {
            setIsResolving(false);
        } else {
            const timer = setTimeout(() => {
                setIsResolving(false);
            }, 1500);
            return () => clearTimeout(timer);
        }
    }, [form]);

    useDynamicMeta({
        title: form ? form.title : "Form",
        description: form ? (form.description || "Fill out this form.") : "Form not found.",
        image: form && form.image ? form.image : "/favicon.svg",
        url: window.location.href
    });

    // Build the themed Google Form URL with user email pre-fill if available
    const themedFormUrl = useMemo(() => {
        if (!form?.formUrl) return '';
        try {
            const url = new URL(form.formUrl);
            // If user is signed in and has an email, pre-fill via emailAddress param
            if (user?.email) {
                url.searchParams.set('emailAddress', user.email);
            }
            return url.toString();
        } catch {
            return form.formUrl;
        }
    }, [form?.formUrl, user?.email]);

    if (isResolving && !form) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-dark">
                <Loader2 size={32} className="animate-spin text-neon-blue mb-4" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Resolving Form...</p>
            </div>
        );
    }

    if (!form) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-dark">
                <motion.div 
                    initial={{ opacity: 0, y: 20 }} 
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center px-6"
                >
                    <div className="w-20 h-20 rounded-3xl bg-gray-100 dark:bg-white/5 border border-black/10 dark:border-white/10 flex items-center justify-center mx-auto mb-6">
                        <FileText size={32} className="text-gray-400 dark:text-gray-500" />
                    </div>
                    <h2 className="text-2xl font-extrabold font-heading text-gray-900 dark:text-white mb-3 uppercase tracking-tight">Form Not Found</h2>
                    <p className="text-gray-500 text-sm font-medium mb-8 max-w-xs mx-auto">The form you are looking for does not exist or has been removed.</p>
                    <Button onClick={() => navigate('/community')} className="h-12 px-8 rounded-xl text-sm font-bold tracking-wider">
                        <ArrowLeft size={16} className="mr-2" /> Back to Community
                    </Button>
                </motion.div>
            </div>
        );
    }

    const highlightColor = form.highlightColor || '#FF4F8B';

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
                        {form.activeLabel && (
                            <span className="px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20">
                                {form.activeLabel}
                            </span>
                        )}
                    </div>

                    <h1 className="text-3xl md:text-5xl font-extrabold font-heading text-gray-900 dark:text-white tracking-tight leading-tight mb-3">
                        {form.title}
                    </h1>
                    {form.description && (
                        <p className="text-gray-600 dark:text-gray-400 text-sm md:text-base font-medium leading-relaxed max-w-2xl">
                            {form.description}
                        </p>
                    )}
                    {form.bottomText && (
                        <div className="flex items-center gap-2 mt-3 text-gray-500">
                            <MapPin size={12} />
                            <span className="text-[10px] font-bold uppercase tracking-widest">{form.bottomText}</span>
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
                        {!form.formUrl ? (
                            <div className="p-16 text-center">
                                <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
                                    <FileText size={24} className="text-red-400" />
                                </div>
                                <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Invalid or missing form URL</p>
                            </div>
                        ) : form.requiresExternal ? (
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
                                {/* Loading State */}
                                {!iframeLoaded && (
                                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white dark:bg-zinc-950 gap-4">
                                        <Loader2 size={28} className="animate-spin text-gray-400" />
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Loading Form</p>
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
                                        title={form.title}
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
