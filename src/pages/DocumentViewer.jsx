import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';
import FileText from 'lucide-react/dist/esm/icons/file-text';
import Sheet from 'lucide-react/dist/esm/icons/sheet';
import HardDrive from 'lucide-react/dist/esm/icons/hard-drive';
import File from 'lucide-react/dist/esm/icons/file';
import Download from 'lucide-react/dist/esm/icons/download';
import ArrowLeft from 'lucide-react/dist/esm/icons/arrow-left';
import Loader from 'lucide-react/dist/esm/icons/loader';
import ShieldAlert from 'lucide-react/dist/esm/icons/shield-alert';
import FileX from 'lucide-react/dist/esm/icons/file-x';
import Calendar from 'lucide-react/dist/esm/icons/calendar';
import Tag from 'lucide-react/dist/esm/icons/tag';

// ─── Type Config ────────────────────────────────────────────────────────────────

const TYPE_CONFIG = {
    google_doc: { label: 'GOOGLE DOC', color: 'text-emerald-400', pill: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20', icon: FileText },
    google_sheet: { label: 'GOOGLE SHEET', color: 'text-neon-blue', pill: 'bg-neon-blue/15 text-neon-blue border-neon-blue/20', icon: Sheet },
    google_drive: { label: 'GOOGLE DRIVE', color: 'text-neon-purple', pill: 'bg-neon-purple/15 text-neon-purple border-neon-purple/20', icon: HardDrive },
    pdf: { label: 'PDF', color: 'text-neon-pink', pill: 'bg-neon-pink/15 text-neon-pink border-neon-pink/20', icon: FileText },
    file: { label: 'FILE', color: 'text-gray-400', pill: 'bg-gray-500/15 text-gray-400 border-gray-500/20', icon: File },
};

const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// ─── Component ──────────────────────────────────────────────────────────────────

const DocumentViewer = () => {
    const { id } = useParams();
    const [document, setDocument] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null); // 'not_found' | 'private' | 'error'

    useEffect(() => {
        const fetchDocument = async () => {
            if (!id) {
                setError('not_found');
                setLoading(false);
                return;
            }

            try {
                const docRef = doc(db, 'documents', id);
                const docSnap = await getDoc(docRef);

                if (!docSnap.exists()) {
                    setError('not_found');
                    setLoading(false);
                    return;
                }

                const data = { ...docSnap.data(), id: docSnap.id };

                if (!data.isPublic) {
                    setError('private');
                    setLoading(false);
                    return;
                }

                setDocument(data);
                window.document.title = `${data.title} — Newbi Entertainment`;
            } catch (err) {
                console.error('Failed to fetch document:', err);
                setError('error');
            } finally {
                setLoading(false);
            }
        };

        fetchDocument();

        return () => {
            window.document.title = 'Newbi Entertainment';
        };
    }, [id]);

    const cfg = document ? (TYPE_CONFIG[document.type] || TYPE_CONFIG.file) : TYPE_CONFIG.file;
    const Icon = cfg.icon;

    // ─── Loading State ──────────────────────────────────────────────────────────

    if (loading) {
        return (
            <div className="min-h-screen bg-[#020202] flex items-center justify-center">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center gap-6"
                >
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                    >
                        <Loader size={32} className="text-neon-blue" />
                    </motion.div>
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">
                        Loading document...
                    </p>
                </motion.div>
            </div>
        );
    }

    // ─── Error State ────────────────────────────────────────────────────────────

    if (error) {
        return (
            <div className="min-h-screen bg-[#020202] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-md w-full text-center"
                >
                    <div className="w-24 h-24 mx-auto mb-8 rounded-[2rem] bg-white/[0.03] border border-white/5 flex items-center justify-center">
                        {error === 'private' ? (
                            <ShieldAlert size={40} className="text-amber-400" />
                        ) : (
                            <FileX size={40} className="text-gray-600" />
                        )}
                    </div>

                    <h1 className="text-3xl md:text-4xl font-black font-heading uppercase italic tracking-tighter text-white mb-4">
                        {error === 'private' ? (
                            <>ACCESS <span className="text-amber-400">RESTRICTED.</span></>
                        ) : error === 'not_found' ? (
                            <>NOT <span className="text-gray-500">FOUND.</span></>
                        ) : (
                            <>SOMETHING <span className="text-red-400">BROKE.</span></>
                        )}
                    </h1>

                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mb-10 leading-relaxed">
                        {error === 'private'
                            ? 'This document is private and not available for public viewing.'
                            : error === 'not_found'
                                ? 'The document you\'re looking for doesn\'t exist or has been removed.'
                                : 'We couldn\'t load this document. Please try again later.'}
                    </p>

                    <Link
                        to="/"
                        className="inline-flex items-center gap-3 px-8 py-4 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] hover:text-white hover:bg-white/10 hover:border-white/20 transition-all"
                    >
                        <ArrowLeft size={14} />
                        BACK TO HOME
                    </Link>
                </motion.div>
            </div>
        );
    }

    // ─── Embeddable Types (Google Docs/Sheets/Drive/PDF) ────────────────────────

    const isEmbeddable = ['google_doc', 'google_sheet', 'google_drive', 'pdf'].includes(document.type);

    if (isEmbeddable) {
        return (
            <div className="min-h-screen bg-[#020202] flex flex-col">
                {/* Header */}
                <motion.header
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-zinc-950/40 backdrop-blur-2xl border-b border-white/5 px-6 py-4 flex items-center justify-between z-10 shrink-0 relative shadow-2xl"
                >
                    {/* Themed glow underline */}
                    <div 
                        className={cn(
                            "absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r",
                            document.type === 'google_doc' && 'from-emerald-500 via-transparent to-transparent',
                            document.type === 'google_sheet' && 'from-neon-blue via-transparent to-transparent',
                            document.type === 'google_drive' && 'from-neon-purple via-transparent to-transparent',
                            document.type === 'pdf' && 'from-neon-pink via-transparent to-transparent',
                            document.type === 'file' && 'from-gray-500 via-transparent to-transparent'
                        )}
                    />

                    <div className="flex items-center gap-5 min-w-0">
                        {/* Circular back button with neon hover */}
                        <Link
                            to="/"
                            className={cn(
                                "w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 hover:scale-105 active:scale-95 transition-all shrink-0",
                                document.type === 'google_doc' && 'hover:border-emerald-500/30 hover:text-emerald-400 hover:shadow-[0_0_15px_rgba(57,255,20,0.2)]',
                                document.type === 'google_sheet' && 'hover:border-neon-blue/30 hover:text-neon-blue hover:shadow-[0_0_15px_rgba(46,191,255,0.2)]',
                                document.type === 'google_drive' && 'hover:border-neon-purple/30 hover:text-neon-purple hover:shadow-[0_0_15px_rgba(191,0,255,0.2)]',
                                document.type === 'pdf' && 'hover:border-neon-pink/30 hover:text-neon-pink hover:shadow-[0_0_15px_rgba(255,79,139,0.2)]',
                                document.type === 'file' && 'hover:border-white/20'
                            )}
                        >
                            <ArrowLeft size={16} />
                        </Link>

                        {/* Document type pill */}
                        <div className={cn("flex items-center gap-2 px-3.5 py-2 rounded-xl border text-[8px] font-black uppercase tracking-[0.2em] shrink-0 bg-black/40 shadow-inner", cfg.pill)}>
                            <Icon size={12} className="animate-pulse" />
                            {cfg.label}
                        </div>

                        {/* Title text */}
                        <h1 className="text-base md:text-xl font-black font-heading uppercase italic tracking-tight text-white truncate drop-shadow-lg pr-4">
                            {document.title}
                        </h1>
                    </div>

                    {/* Right elements: Tags, Date, and Brand */}
                    <div className="flex items-center gap-4 shrink-0 ml-4">
                        {document.tags?.length > 0 && (
                            <div className="hidden lg:flex items-center gap-2">
                                {document.tags.slice(0, 3).map((tag, i) => (
                                    <span key={i} className="flex items-center gap-1.5 px-3 py-1 bg-white/[0.03] border border-white/5 rounded-xl text-[8px] font-black text-gray-500 uppercase tracking-wider">
                                        <Tag size={9} />{tag}
                                    </span>
                                ))}
                            </div>
                        )}
                        {document.createdAt && (
                            <span className="hidden md:flex items-center gap-1.5 text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] px-3 py-1 bg-white/[0.03] border border-white/5 rounded-xl">
                                <Calendar size={10} className="text-gray-600" />
                                {formatDate(document.createdAt)}
                            </span>
                        )}
                        <div className="h-6 w-px bg-white/10 hidden md:block" />
                        <span className="text-[9px] font-black uppercase text-transparent bg-clip-text bg-gradient-to-r from-white/40 to-white/90 tracking-[0.3em] font-heading pl-2">
                            NEWBI ENTERTAINMENT
                        </span>
                    </div>
                </motion.header>

                {/* Iframe */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="flex-1 p-2 md:p-4"
                >
                    <iframe
                        src={document.sourceUrl}
                        className="w-full h-full rounded-xl md:rounded-2xl border border-white/10 bg-white"
                        title={document.title}
                        allow="autoplay"
                        sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                        style={{ minHeight: 'calc(100vh - 80px)' }}
                    />
                </motion.div>
            </div>
        );
    }

    // ─── Download Card (non-embeddable files) ───────────────────────────────────

    return (
        <div className="min-h-screen bg-[#020202] flex items-center justify-center p-4">
            {/* Background */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-neon-blue/5 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-0 left-0 w-[40%] h-[40%] bg-white/5 rounded-full blur-[120px] animate-pulse delay-700" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: "spring", damping: 20, stiffness: 200 }}
                className="relative z-10 max-w-lg w-full group"
            >
                {/* Back Link */}
                <Link
                    to="/"
                    className="inline-flex items-center gap-2 mb-8 text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] hover:text-white transition-colors"
                >
                    <ArrowLeft size={12} />
                    BACK TO HOME
                </Link>

                {/* Ambient Background Glow */}
                <div 
                    className={cn(
                        "absolute -right-10 -top-10 w-48 h-48 rounded-full blur-[80px] opacity-15 pointer-events-none transition-opacity duration-700 group-hover:opacity-25",
                        document.type === 'google_doc' && 'bg-[#39FF14]',
                        document.type === 'google_sheet' && 'bg-[#00F0FF]',
                        document.type === 'google_drive' && 'bg-[#BF00FF]',
                        document.type === 'pdf' && 'bg-[#FF4F8B]',
                        document.type === 'file' && 'bg-gray-500'
                    )}
                />
                <div 
                    className="absolute -left-10 -bottom-10 w-36 h-36 rounded-full blur-[60px] opacity-[0.05] pointer-events-none bg-white"
                />

                {/* Download Card */}
                <div className="bg-gradient-to-br from-white/[0.04] to-white/[0.01] backdrop-blur-xl border border-white/10 border-t-white/20 rounded-2xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),_0_8px_32px_rgba(0,0,0,0.4)] p-8 md:p-12 text-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-white/[0.01] pointer-events-none" />
                    {/* Type Badge */}
                    <div className="flex justify-center mb-8">
                        <div className={cn("flex items-center gap-2 px-4 py-2 rounded-xl border text-[9px] font-black uppercase tracking-[0.2em]", cfg.pill)}>
                            <Icon size={12} />
                            {cfg.label}
                        </div>
                    </div>

                    {/* File Icon */}
                    <div className="w-28 h-28 mx-auto mb-8 rounded-[2rem] bg-white/[0.03] border border-white/5 flex items-center justify-center">
                        <motion.div
                            animate={{ y: [0, -5, 0] }}
                            transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                        >
                            <File size={48} className="text-gray-500" />
                        </motion.div>
                    </div>

                    {/* Title */}
                    <h1 className="text-2xl md:text-3xl font-black font-heading uppercase italic tracking-tighter text-white mb-3">
                        {document.title}
                    </h1>

                    {document.description && (
                        <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto leading-relaxed">
                            {document.description}
                        </p>
                    )}

                    {/* File Info */}
                    <div className="flex items-center justify-center gap-4 mb-8">
                        {document.fileName && (
                            <span className="text-[9px] font-bold text-gray-500 truncate max-w-[200px]">
                                {document.fileName}
                            </span>
                        )}
                        {document.fileSize > 0 && (
                            <span className="text-[9px] font-black text-gray-600 uppercase tracking-wider">
                                {formatFileSize(document.fileSize)}
                            </span>
                        )}
                        {document.createdAt && (
                            <span className="flex items-center gap-1 text-[8px] font-black text-gray-600 uppercase tracking-wider">
                                <Calendar size={8} />
                                {formatDate(document.createdAt)}
                            </span>
                        )}
                    </div>

                    {/* Tags */}
                    {document.tags?.length > 0 && (
                        <div className="flex items-center justify-center gap-2 flex-wrap mb-8">
                            {document.tags.map((tag, i) => (
                                <span key={i} className="flex items-center gap-1 px-2.5 py-1 bg-white/5 border border-white/5 rounded-lg text-[8px] font-black text-gray-500 uppercase tracking-wider">
                                    <Tag size={8} />{tag}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Download Button */}
                    <a
                        href={document.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-3 px-10 py-5 bg-neon-blue text-black font-black text-[11px] uppercase tracking-[0.2em] rounded-2xl hover:bg-neon-blue/80 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-neon-blue/10"
                    >
                        <Download size={16} />
                        DOWNLOAD FILE
                    </a>
                </div>

                {/* Branding */}
                <div className="mt-8 text-center">
                    <p className="text-[8px] font-black text-gray-700 uppercase tracking-[0.3em]">
                        POWERED BY NEWBI ENTERTAINMENT
                    </p>
                </div>
            </motion.div>
        </div>
    );
};

export default DocumentViewer;
