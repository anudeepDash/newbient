import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    X, 
    FileUp, 
    Link as LinkIcon, 
    FileText, 
    CheckCircle2, 
    XCircle, 
    Clock, 
    ExternalLink, 
    Download, 
    User, 
    Mail, 
    Phone, 
    Calendar, 
    Copy, 
    Eye,
    Music,
    Film,
    FileIcon,
    AlertTriangle,
    Sparkles
} from 'lucide-react';
import { Button } from '../ui/Button';
import LoadingSpinner from '../ui/LoadingSpinner';
import { cn } from '../../lib/utils';
import { useStore } from '../../lib/store';

export const GuestlistTaskReviewModal = ({
    isOpen,
    onClose,
    entry,
    event,
    onStatusChange
}) => {
    const [actionLoading, setActionLoading] = useState(false);
    const [copiedRef, setCopiedRef] = useState(false);

    if (!isOpen || !entry) return null;

    const taskSubmission = entry.taskSubmission || {};
    const taskConfig = event?.guestlistTask || {};
    const hasFile = !!taskSubmission.fileUrl;
    const hasLink = !!taskSubmission.link;
    const hasText = !!taskSubmission.text;
    const currentStatus = entry.status || (entry.hasTask ? 'pending' : 'approved');

    const handleCopyRef = () => {
        if (entry.bookingRef) {
            navigator.clipboard.writeText(entry.bookingRef);
            setCopiedRef(true);
            setTimeout(() => setCopiedRef(false), 2000);
            useStore.getState().addToast('Booking reference copied!', 'success');
        }
    };

    const handleApprove = async () => {
        setActionLoading(true);
        try {
            await onStatusChange(entry.id, 'approved');
            useStore.getState().addToast(`Approved guestlist application for ${entry.customerName || entry.name}!`, 'success');
            onClose();
        } catch (error) {
            console.error('Error approving entry:', error);
            useStore.getState().addToast('Failed to approve application.', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const handleReject = async () => {
        if (!window.confirm(`Reject guestlist application for ${entry.customerName || entry.name}?`)) {
            return;
        }
        setActionLoading(true);
        try {
            await onStatusChange(entry.id, 'rejected');
            useStore.getState().addToast(`Rejected application for ${entry.customerName || entry.name}.`, 'info');
            onClose();
        } catch (error) {
            console.error('Error rejecting entry:', error);
            useStore.getState().addToast('Failed to reject application.', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    // Detect file type for preview
    const fileUrl = taskSubmission.fileUrl || '';
    const fileName = taskSubmission.fileName || 'Submitted Attachment';
    const isImage = fileUrl.match(/\.(jpg|jpeg|png|gif|webp|svg)($|\?)/i) || taskSubmission.fileType?.startsWith('image/');
    const isAudio = fileUrl.match(/\.(mp3|wav|ogg|m4a|aac)($|\?)/i) || taskSubmission.fileType?.startsWith('audio/');
    const isVideo = fileUrl.match(/\.(mp4|webm|mov)($|\?)/i) || taskSubmission.fileType?.startsWith('video/');
    const isPdf = fileUrl.match(/\.pdf($|\?)/i) || taskSubmission.fileType?.includes('pdf');

    return createPortal(
        <AnimatePresence>
            <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/70 backdrop-blur-md"
                />

                {/* Modal Container */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="relative w-full max-w-2xl max-h-[90vh] bg-white dark:bg-[#0c0c0e] border border-black/10 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col z-10"
                >
                    {/* Header */}
                    <div className="p-6 md:p-8 border-b border-black/10 dark:border-white/10 bg-gray-50 dark:bg-white/[0.02] flex items-start justify-between gap-4 shrink-0">
                        <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                                <span className={cn(
                                    "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5",
                                    currentStatus === 'approved' || currentStatus === 'confirmed'
                                        ? "bg-neon-green/10 text-neon-green border border-neon-green/20"
                                        : currentStatus === 'rejected'
                                        ? "bg-red-500/10 text-red-500 border border-red-500/20"
                                        : "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                                )}>
                                    {currentStatus === 'approved' || currentStatus === 'confirmed' ? (
                                        <CheckCircle2 size={12} />
                                    ) : currentStatus === 'rejected' ? (
                                        <XCircle size={12} />
                                    ) : (
                                        <Clock size={12} />
                                    )}
                                    {currentStatus.toUpperCase()}
                                </span>
                                <span className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest">
                                    {entry.bookingRef}
                                </span>
                            </div>
                            <h3 className="text-xl md:text-2xl font-black font-heading tracking-tight text-gray-900 dark:text-white uppercase">
                                Guestlist Task Submission
                            </h3>
                            <p className="text-[11px] font-medium text-gray-500">
                                Review task materials submitted by <strong className="text-gray-900 dark:text-white">{entry.customerName || entry.name}</strong>
                            </p>
                        </div>

                        <button
                            onClick={onClose}
                            className="w-10 h-10 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 flex items-center justify-center text-gray-500 hover:text-gray-900 dark:hover:text-white transition-all hover:rotate-90 shrink-0"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Scrollable Content Body */}
                    <div className="p-6 md:p-8 space-y-6 overflow-y-auto min-h-0 flex-1">
                        
                        {/* Applicant Summary Ribbon */}
                        <div className="p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/5 grid grid-cols-2 sm:grid-cols-4 gap-4 text-left">
                            <div>
                                <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest block mb-0.5">Applicant</span>
                                <span className="text-[11px] font-black text-gray-900 dark:text-white truncate block">
                                    {entry.customerName || entry.name}
                                </span>
                            </div>
                            <div>
                                <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest block mb-0.5">Contact</span>
                                <span className="text-[11px] font-mono text-gray-600 dark:text-gray-300 truncate block">
                                    {entry.customerEmail || entry.email || 'N/A'}
                                </span>
                            </div>
                            <div>
                                <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest block mb-0.5">Spots</span>
                                <span className="text-[11px] font-black text-neon-blue">
                                    {entry.guestsCount || 1} Person(s)
                                </span>
                            </div>
                            <div>
                                <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest block mb-0.5">Submitted</span>
                                <span className="text-[10px] font-mono text-gray-500">
                                    {entry.createdAt ? new Date(entry.createdAt).toLocaleDateString() : 'Recent'}
                                </span>
                            </div>
                        </div>

                        {/* Event Task Prompt Info */}
                        {(taskConfig.title || taskConfig.description) && (
                            <div className="p-4 rounded-2xl bg-neon-pink/5 border border-neon-pink/20 space-y-1">
                                <span className="text-[8px] font-black text-neon-pink uppercase tracking-widest flex items-center gap-1.5">
                                    <Sparkles size={10} /> Task Prompt: {taskConfig.title || 'Application Task'}
                                </span>
                                {taskConfig.description && (
                                    <p className="text-[11px] text-gray-700 dark:text-gray-300 font-medium leading-relaxed italic">
                                        "{taskConfig.description}"
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Submission Item 1: Uploaded File */}
                        {hasFile ? (
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                    <FileUp size={14} className="text-neon-green" /> Submitted Attachment
                                </label>
                                
                                {isImage && (
                                    <div className="rounded-2xl overflow-hidden border border-black/10 dark:border-white/10 bg-black/40 relative group max-h-72 flex items-center justify-center">
                                        <img 
                                            src={fileUrl} 
                                            alt={fileName} 
                                            className="max-h-72 w-auto object-contain"
                                        />
                                        <a 
                                            href={fileUrl} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="absolute bottom-3 right-3 px-3 py-1.5 rounded-xl bg-black/80 hover:bg-black text-white text-[9px] font-black uppercase tracking-wider backdrop-blur-md flex items-center gap-1.5 transition-all shadow-lg"
                                        >
                                            <ExternalLink size={12} /> View Full Image
                                        </a>
                                    </div>
                                )}

                                {isAudio && (
                                    <div className="p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 space-y-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-neon-blue/10 text-neon-blue flex items-center justify-center shrink-0">
                                                <Music size={20} />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-xs font-black uppercase tracking-wider text-gray-900 dark:text-white truncate">
                                                    {fileName}
                                                </p>
                                                <p className="text-[9px] text-gray-500 font-mono">Audio Submission</p>
                                            </div>
                                            <a 
                                                href={fileUrl} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                download
                                                className="px-3 py-1.5 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 text-gray-900 dark:text-white text-[9px] font-bold uppercase tracking-wider flex items-center gap-1"
                                            >
                                                <Download size={12} /> Save
                                            </a>
                                        </div>
                                        <audio controls src={fileUrl} className="w-full h-10 rounded-lg outline-none" />
                                    </div>
                                )}

                                {!isImage && !isAudio && (
                                    <div className="p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-10 h-10 rounded-xl bg-neon-green/10 text-neon-green flex items-center justify-center shrink-0">
                                                {isPdf ? <FileText size={20} /> : isVideo ? <Film size={20} /> : <FileIcon size={20} />}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs font-black text-gray-900 dark:text-white truncate">
                                                    {fileName}
                                                </p>
                                                <p className="text-[9px] text-gray-500 font-mono">
                                                    {isPdf ? 'PDF Document' : isVideo ? 'Video File' : 'Attachment'}
                                                </p>
                                            </div>
                                        </div>
                                        <a
                                            href={fileUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="px-4 py-2 rounded-xl bg-black dark:bg-white text-white dark:text-black hover:bg-neon-green hover:text-black dark:hover:bg-neon-green dark:hover:text-black text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shrink-0"
                                        >
                                            <Download size={12} /> Open File
                                        </a>
                                    </div>
                                )}
                            </div>
                        ) : null}

                        {/* Submission Item 2: Link */}
                        {hasLink ? (
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                    <LinkIcon size={14} className="text-neon-blue" /> Submitted Link / Portfolio
                                </label>
                                <div className="p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 flex items-center justify-between gap-4">
                                    <div className="min-w-0 flex-1">
                                        <a 
                                            href={taskSubmission.link.startsWith('http') ? taskSubmission.link : `https://${taskSubmission.link}`}
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="text-xs font-mono font-bold text-neon-blue hover:underline truncate block"
                                        >
                                            {taskSubmission.link}
                                        </a>
                                    </div>
                                    <a
                                        href={taskSubmission.link.startsWith('http') ? taskSubmission.link : `https://${taskSubmission.link}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-3 py-1.5 rounded-xl bg-neon-blue/10 hover:bg-neon-blue hover:text-black text-neon-blue text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shrink-0"
                                    >
                                        <ExternalLink size={12} /> Open URL
                                    </a>
                                </div>
                            </div>
                        ) : null}

                        {/* Submission Item 3: Written Response */}
                        {hasText ? (
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                    <FileText size={14} className="text-neon-pink" /> Written Statement / Answer
                                </label>
                                <div className="p-5 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-left">
                                    <p className="text-xs text-gray-800 dark:text-gray-200 font-medium leading-relaxed whitespace-pre-wrap">
                                        {taskSubmission.text}
                                    </p>
                                </div>
                            </div>
                        ) : null}

                        {!hasFile && !hasLink && !hasText && (
                            <div className="p-8 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center space-y-2">
                                <AlertTriangle size={24} className="text-amber-500 mx-auto" />
                                <p className="text-xs font-black uppercase tracking-wider text-amber-500">No Task Data Attached</p>
                                <p className="text-[10px] text-gray-500">This applicant registered without submitting task files or links.</p>
                            </div>
                        )}

                    </div>

                    {/* Footer Actions */}
                    <div className="p-6 md:p-8 border-t border-black/10 dark:border-white/10 bg-gray-50 dark:bg-white/[0.02] flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
                        <button
                            type="button"
                            onClick={handleCopyRef}
                            className="text-[9px] font-black uppercase tracking-widest text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors flex items-center gap-1.5"
                        >
                            <Copy size={12} /> {copiedRef ? 'COPIED!' : 'COPY REF'}
                        </button>

                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            {currentStatus !== 'rejected' && (
                                <button
                                    disabled={actionLoading}
                                    onClick={handleReject}
                                    className="flex-1 sm:flex-none h-12 px-6 rounded-2xl bg-red-500/10 hover:bg-red-500 hover:text-white text-red-500 border border-red-500/20 text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-50"
                                >
                                    REJECT
                                </button>
                            )}

                            {currentStatus !== 'approved' && currentStatus !== 'confirmed' && (
                                <Button
                                    disabled={actionLoading}
                                    onClick={handleApprove}
                                    className="flex-1 sm:flex-none h-12 px-8 rounded-2xl bg-neon-green text-black hover:scale-105 active:scale-95 text-[10px] font-black uppercase tracking-wider shadow-[0_0_25px_rgba(57,255,20,0.3)] transition-all flex items-center justify-center gap-2"
                                >
                                    {actionLoading ? <LoadingSpinner size="xs" color="black" /> : (
                                        <>
                                            <CheckCircle2 size={14} /> APPROVE PASS
                                        </>
                                    )}
                                </Button>
                            )}

                            {(currentStatus === 'approved' || currentStatus === 'confirmed') && (
                                <div className="flex items-center gap-2 text-neon-green text-[10px] font-black uppercase tracking-wider px-4 py-2 rounded-xl bg-neon-green/10 border border-neon-green/20">
                                    <CheckCircle2 size={14} /> APPROVED
                                </div>
                            )}
                        </div>
                    </div>

                </motion.div>
            </div>
        </AnimatePresence>,
        document.body
    );
};

export default GuestlistTaskReviewModal;
