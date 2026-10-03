import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    X, 
    CheckCircle2, 
    Clock, 
    Copy, 
    Link2, 
    Camera, 
    Upload, 
    ExternalLink, 
    AlertCircle,
    Share2,
    Check,
    ChevronDown,
    FileText
} from 'lucide-react';
import { Button } from './Button';
import { LoadingSpinner } from './LoadingSpinner';
import { cn } from '../../lib/utils';
import { useStore } from '../../lib/store';
import TaskActionLinks from '../creator/TaskActionLinks';
import { linkifyContent, extractTaskActionLinks, cleanTaskDescription, getTaskGoogleFormUrl } from '../../lib/taskLinks';

const getSubmissionStatus = (task, uid) => {
    const sub = task.submissions?.[uid];
    if (sub) return sub.status;
    if ((task.verifiedBy || []).includes(uid)) return 'approved';
    if ((task.completedBy || []).includes(uid)) return 'submitted';
    return 'not_started';
};

const FormattedTaskDescription = ({ description, actionLinks = [] }) => {
    if (!description) return null;
    const cleaned = cleanTaskDescription(description, actionLinks);
    if (!cleaned) return null;
    const linkified = linkifyContent(cleaned);

    return (
        <div
            className="article-content text-xs sm:text-[13px] text-gray-700 dark:text-zinc-300 leading-relaxed break-words font-normal"
            dangerouslySetInnerHTML={{ __html: linkified }}
        />
    );
};

const TaskSubmissionModal = ({ 
    task, 
    campaignId, 
    profileUid, 
    onClose, 
    isSubmitting, 
    onSubmit,
    taskTypes,
    platforms
}) => {
    const status = getSubmissionStatus(task, profileUid);
    const submission = task?.submissions?.[profileUid] || 
        (typeof profileUid === 'string' && Object.entries(task?.submissions || {}).find(([k]) => k === profileUid)?.[1]);

    const [contentLink, setContentLink] = useState(submission?.contentLink || '');
    const [proofFile, setProofFile] = useState(null);
    const [confirmComplete, setConfirmComplete] = useState(false);
    const [copiedCaption, setCopiedCaption] = useState(false);
    const [copiedShare, setCopiedShare] = useState(false);
    const [showManualForm, setShowManualForm] = useState(false);
    const [currentSlide, setCurrentSlide] = useState(0);

    React.useEffect(() => {
        if (submission?.contentLink && !contentLink) {
            setContentLink(submission.contentLink);
        }
    }, [submission]);

    const isDeadlinePassed = task.deadline && new Date(task.deadline) < new Date();
    const googleFormUrl = getTaskGoogleFormUrl(task);
    
    const TypeInfo = taskTypes[task.taskType] || taskTypes.custom;
    const PlatInfo = platforms[task.platform] || platforms.other;
    
    const creativeAssets = task.creativeAssets || [];
    const creativeLinks = task.creativeLinks || [];

    const handleShareTask = async (e) => {
        if (e) {
            e.stopPropagation();
            e.preventDefault();
        }
        const directUrl = `${window.location.origin}/campaign/${campaignId}?taskId=${task.id}`;
        if (navigator.share) {
            try {
                await navigator.share({
                    title: `${task.title}`,
                    text: `Deliverable task: ${task.title} on Newbi`,
                    url: directUrl
                });
                return;
            } catch (err) {
                if (err.name === 'AbortError') return;
            }
        }
        if (navigator.clipboard) {
            await navigator.clipboard.writeText(directUrl);
            setCopiedShare(true);
            useStore.getState().addToast("Task link copied to clipboard!", 'success');
            setTimeout(() => setCopiedShare(false), 2200);
        }
    };

    const handleCopy = () => {
        if (!task.captionScript) return;
        // Strip HTML if it's a rich text
        const temp = document.createElement('div');
        temp.innerHTML = task.captionScript;
        const text = temp.textContent || temp.innerText || "";
        navigator.clipboard.writeText(text);
        setCopiedCaption(true);
        setTimeout(() => setCopiedCaption(false), 2000);
    };

    return createPortal(
        <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[99999] flex items-center justify-center p-2 sm:p-4 md:p-10"
        >
            <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />
            
            <motion.div 
                initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
                className="relative w-full max-w-4xl bg-white dark:bg-[#0a0a0a] border border-black/10 dark:border-white/10 rounded-2xl sm:rounded-[2rem] md:rounded-[3rem] shadow-[0_50px_100px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col md:flex-row max-h-[92vh] sm:max-h-[90vh]"
            >
                {/* Floating Top Controls: Share Task + Close Button */}
                <div className="absolute top-3.5 right-3.5 md:top-8 md:right-8 flex items-center gap-2 z-50">
                    <button 
                        type="button"
                        onClick={handleShareTask}
                        className="h-9 sm:h-11 px-3 sm:px-4 rounded-full bg-white/90 dark:bg-black/70 hover:bg-white dark:hover:bg-black/90 backdrop-blur-xl border border-black/10 dark:border-white/20 flex items-center gap-1.5 text-xs font-bold font-mono text-gray-800 dark:text-white transition-all shadow-xl active:scale-95"
                        title="Share direct task link"
                    >
                        {copiedShare ? (
                            <>
                                <Check size={14} className="text-emerald-500 stroke-[3]" />
                                <span className="text-emerald-500 font-black">Copied!</span>
                            </>
                        ) : (
                            <>
                                <Share2 size={14} />
                                <span className="hidden sm:inline">Share Task</span>
                            </>
                        )}
                    </button>
                    <button 
                        onClick={onClose} 
                        className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-white/90 dark:bg-black/70 hover:bg-white dark:hover:bg-black/90 backdrop-blur-xl border border-black/10 dark:border-white/20 flex items-center justify-center text-gray-800 dark:text-white transition-all shadow-xl active:scale-95 group"
                        aria-label="Close"
                    >
                        <X size={16} className="md:hidden group-hover:rotate-90 transition-transform duration-200" />
                        <X size={18} className="hidden md:block group-hover:rotate-90 transition-transform duration-200" />
                    </button>
                </div>

                {/* Left Side: Creative & Guidelines */}
                <div className="flex-1 md:w-1/2 p-4 sm:p-6 md:p-12 overflow-y-auto custom-scrollbar border-b md:border-b-0 md:border-r border-black/10 dark:border-white/10">
                    <div className="mb-6 sm:mb-8 pr-10 md:pr-0">
                        <span className="text-[8px] md:text-[10px] font-black text-emerald-600 dark:text-neon-green uppercase tracking-[0.3em] font-mono block">Deliverable Segment</span>
                        <h2 className="text-xl sm:text-2xl md:text-3xl font-black font-heading uppercase text-gray-900 dark:text-white tracking-tighter leading-tight mt-0.5 truncate">{task.title}</h2>
                    </div>

                    <div className="space-y-6 sm:space-y-8">
                        <div className="flex flex-wrap gap-1.5 sm:gap-2">
                            <span className="px-2.5 sm:px-3 py-1 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/5 rounded-lg text-[9px] font-black uppercase tracking-widest text-gray-500 flex items-center gap-1.5 font-mono">
                                {PlatInfo && <PlatInfo.icon size={11} />} {PlatInfo?.label}
                            </span>
                            {task.priority === 'required' && (
                                <span className="px-2.5 sm:px-3 py-1 bg-neon-green/10 border border-neon-green/20 rounded-lg text-[9px] font-black uppercase tracking-widest text-emerald-600 dark:text-neon-green flex items-center justify-center font-mono">Required</span>
                            )}
                            {task.deadline && (
                                <span className={cn(
                                    "px-2.5 sm:px-3 py-1 border rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 font-mono",
                                    isDeadlinePassed ? "bg-red-500/10 border-red-500/20 text-red-500" : "bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/5 text-gray-500"
                                )}>
                                    <Clock size={11} /> {isDeadlinePassed ? 'Overdue' : `Due ${new Date(task.deadline).toLocaleDateString()}`}
                                </span>
                            )}
                        </div>

                        {(() => {
                            const actionLinks = extractTaskActionLinks(task).filter(l => l.type !== 'google_form');
                            return (
                                <div className="space-y-2">
                                    <h4 className="text-[10px] font-black text-gray-600 dark:text-zinc-400 uppercase tracking-widest font-mono">Campaign Brief</h4>
                                    <FormattedTaskDescription description={task.description} actionLinks={actionLinks} />
                                    <TaskActionLinks task={task} links={actionLinks} isJoined={true} />
                                </div>
                            );
                        })()}

                        {creativeAssets.length > 0 && (
                            <div className="space-y-3 sm:space-y-4">
                                <h4 className="text-[10px] font-black text-gray-600 dark:text-zinc-400 uppercase tracking-widest font-mono">Reference Kit</h4>
                                <div className="relative rounded-xl sm:rounded-[2rem] overflow-hidden border border-black/10 dark:border-white/10 group">
                                    <img src={creativeAssets[currentSlide]} alt="" className="w-full aspect-video object-cover" />
                                    {creativeAssets.length > 1 && (
                                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-10">
                                            {creativeAssets.map((_, i) => (
                                                <button key={i} onClick={() => setCurrentSlide(i)} className="w-8 h-8 flex items-center justify-center focus:outline-none">
                                                    <span className={cn("h-1.5 rounded-full transition-all", i === currentSlide ? "bg-white w-5" : "bg-white/30 w-1.5")} />
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {task.captionScript && (
                            <div className="space-y-3 sm:space-y-4">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-[10px] font-black text-gray-600 dark:text-zinc-400 uppercase tracking-widest font-mono">Universal Caption</h4>
                                    <button onClick={handleCopy} className={cn("min-h-[36px] sm:min-h-[44px] px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-white/[0.03] hover:bg-black/10 dark:hover:bg-white/10 border border-black/10 dark:border-white/5 text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 sm:gap-2 transition-all font-mono", copiedCaption ? "text-neon-green" : "text-gray-700 dark:text-zinc-300 hover:text-gray-900 dark:hover:text-white")}>
                                        {copiedCaption ? <><CheckCircle2 size={11} /> Copied</> : <><Copy size={11} /> Copy Text</>}
                                    </button>
                                </div>
                                <div className="p-4 sm:p-6 bg-white/[0.03] border border-black/10 dark:border-white/5 rounded-xl sm:rounded-2xl relative group">
                                    <div className="article-content text-xs text-gray-600 dark:text-gray-300 font-normal leading-relaxed whitespace-pre-wrap font-mono" dangerouslySetInnerHTML={{ __html: task.captionScript }} />
                                </div>
                            </div>
                        )}

                        {creativeLinks.length > 0 && (
                            <div className="space-y-3 sm:space-y-4">
                                <h4 className="text-[10px] font-black text-gray-600 dark:text-zinc-400 uppercase tracking-widest font-mono">External Assets</h4>
                                <div className="grid grid-cols-1 gap-2">
                                    {creativeLinks.map((link, i) => (
                                        <a key={i} href={link} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-3 sm:p-4 min-h-[40px] sm:min-h-[44px] bg-white/[0.03] border border-black/10 dark:border-white/5 rounded-xl hover:bg-neon-green hover:text-black transition-all group">
                                            <span className="text-[11px] font-bold truncate">{link}</span>
                                            <ExternalLink size={13} className="shrink-0 ml-2" />
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Side: Execution & Progress */}
                <div className="flex-1 md:w-1/2 p-4 sm:p-6 md:p-12 overflow-y-auto bg-gradient-to-br from-black/[0.02] dark:from-white/[0.02] to-transparent relative">
                    <div className="h-full flex flex-col">
                        <div className="mb-6 sm:mb-8 md:mb-12">
                            <h3 className="text-xl md:text-2xl font-black font-heading uppercase italic tracking-tighter mb-1 sm:mb-2 text-gray-900 dark:text-white">Task Verification</h3>
                            <p className="text-[10px] md:text-[12px] text-gray-500 font-medium tracking-tight uppercase font-mono">Status: 
                                <span className={cn(
                                     "ml-2 font-bold",
                                     status === 'approved' ? 'text-neon-green' :
                                     status === 'submitted' ? 'text-yellow-500' :
                                     status === 'rejected' ? 'text-red-500' :
                                     'text-gray-600 dark:text-gray-400'
                                 )}>
                                     {status === 'not_started' ? 'Pending Action' : 
                                      status === 'submitted' ? 'Verification In-Progress' :
                                      status === 'approved' ? 'Verified' : 'Action Required'}
                                </span>
                            </p>
                        </div>

                        <div className="flex-1 space-y-10">
                            {status === 'approved' ? (
                                <div className="flex flex-col items-center justify-center h-40 space-y-4 text-center">
                                    <div className="w-20 h-20 bg-neon-green/20 rounded-full flex items-center justify-center text-neon-green shadow-[0_0_50px_rgba(57,255,20,0.2)]">
                                        <CheckCircle2 size={40} />
                                    </div>
                                    <h4 className="text-xl font-black font-heading uppercase tracking-tighter italic text-gray-900 dark:text-white">Task Completed</h4>
                                    <p className="text-[11px] text-gray-500 uppercase tracking-widest font-black">Points & Reward Unlocked</p>
                                </div>
                            ) : (
                                <>
                                    {status === 'submitted' && (
                                        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[11px] font-bold text-amber-500 uppercase tracking-wider font-mono flex items-center gap-1.5">
                                                    <Clock size={12} /> Submission Under Verification
                                                </span>
                                                <span className="text-[10px] text-gray-400 font-mono">
                                                    {submission?.submittedAt ? new Date(submission.submittedAt).toLocaleDateString() : 'Received'}
                                                </span>
                                            </div>
                                            {submission?.contentLink && (
                                                <p className="text-xs text-gray-700 dark:text-zinc-300 truncate">
                                                    <span className="text-gray-400 font-mono text-[10px]">Submitted: </span>
                                                    <span className="font-semibold">{submission.contentLink}</span>
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    {status === 'rejected' && submission?.rejectionReason && (
                                        <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl space-y-2">
                                            <div className="flex items-center gap-2 text-red-500">
                                                <AlertCircle size={16} />
                                                <span className="text-[10px] font-black uppercase tracking-widest">Admin Feedback</span>
                                            </div>
                                            <p className="text-[12px] text-red-400 font-medium italic">"{submission.rejectionReason}"</p>
                                        </div>
                                    )}

                                    {googleFormUrl ? (
                                        <div className="space-y-6">
                                            {/* Highlighted Google Form Primary Submission Card */}
                                            <div className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-purple-500/[0.12] via-indigo-500/[0.08] to-purple-500/[0.04] dark:from-purple-500/[0.22] dark:via-indigo-500/[0.15] dark:to-purple-500/[0.08] border-2 border-purple-500/40 dark:border-purple-400/50 shadow-xl relative overflow-hidden">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <span className="px-2.5 py-1 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-700 dark:text-purple-300 text-[10px] font-black uppercase tracking-wider font-mono">
                                                        ⚡ Official Submission Form
                                                    </span>
                                                    <span className="px-2 py-0.5 rounded-full bg-black/10 dark:bg-white/10 text-gray-600 dark:text-zinc-400 text-[9px] font-mono">
                                                        New Tab (File Upload)
                                                    </span>
                                                </div>

                                                <h4 className="text-base sm:text-lg font-black font-heading uppercase tracking-tight text-gray-900 dark:text-white mb-2">
                                                    Submit Deliverables via Google Form
                                                </h4>

                                                <p className="text-xs text-gray-600 dark:text-zinc-300 leading-relaxed mb-6 font-normal">
                                                    Please upload your screenshots, proof files, and deliverable links using the official Google Form below. Because the form contains file upload questions, it opens in a new tab where you are signed into your Google account.
                                                </p>

                                                <a
                                                    href={googleFormUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="w-full h-12 sm:h-14 md:h-16 rounded-xl sm:rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black font-heading text-xs sm:text-sm uppercase tracking-wider shadow-xl flex items-center justify-center gap-2 transition-all active:scale-95"
                                                >
                                                    <span>Open Google Form in New Tab</span>
                                                    <ExternalLink size={16} />
                                                </a>

                                                <div className="mt-5 pt-5 border-t border-purple-500/20 flex flex-col sm:flex-row items-center justify-between gap-3">
                                                    <div className="text-[11px] text-gray-500 dark:text-zinc-400 font-mono text-center sm:text-left">
                                                        <span>Already submitted in Google Form?</span>
                                                        <p className="text-[10px] text-gray-400 dark:text-zinc-500">Notify the brand to begin verification</p>
                                                    </div>
                                                    <Button
                                                        type="button"
                                                        onClick={() => onSubmit(task.id, googleFormUrl || 'google_form_submitted', null)}
                                                        disabled={isSubmitting}
                                                        className="w-full sm:w-auto h-11 px-5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-700 dark:text-purple-300 border border-purple-500/40 text-[11px] font-black uppercase font-mono tracking-wider transition-all disabled:opacity-50"
                                                    >
                                                        {isSubmitting ? <LoadingSpinner size="xs" /> : status === 'submitted' ? 'Update / Mark as Submitted' : 'Mark Task as Submitted'}
                                                    </Button>
                                                </div>
                                            </div>

                                            {/* Collapsible Alternative Manual Submission */}
                                            <div className="border border-black/10 dark:border-white/10 rounded-2xl p-4 bg-black/[0.02] dark:bg-white/[0.02]">
                                                <button
                                                    type="button"
                                                    onClick={() => setShowManualForm(!showManualForm)}
                                                    className="w-full flex items-center justify-between text-left text-xs font-bold text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
                                                >
                                                    <span>Or submit proof manually via Newbient</span>
                                                    <ChevronDown size={14} className={cn("transition-transform duration-200", showManualForm && "rotate-180")} />
                                                </button>

                                                {showManualForm && (
                                                    <div className="space-y-6 mt-4 pt-4 border-t border-black/5 dark:border-white/5">
                                                        <div className="space-y-3">
                                                            <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest flex items-center gap-2">
                                                                <Link2 size={12} className="text-emerald-600 dark:text-neon-green" /> Social Link
                                                            </label>
                                                            <input 
                                                                type="url"
                                                                value={contentLink}
                                                                onChange={e => setContentLink(e.target.value)}
                                                                placeholder="Paste your post link here..."
                                                                className="w-full h-11 sm:h-14 bg-white dark:bg-black/40 border border-black/10 dark:border-white/10 rounded-xl sm:rounded-2xl px-4 sm:px-6 text-xs sm:text-sm font-bold text-gray-900 dark:text-white focus:border-neon-green transition-all"
                                                            />
                                                        </div>

                                                        <div className="space-y-2 sm:space-y-3">
                                                            <label className="text-[10px] font-black text-gray-600 dark:text-zinc-400 uppercase tracking-widest flex items-center gap-1.5 font-mono">
                                                                <Camera size={12} className="text-emerald-600 dark:text-neon-green" /> Proof Screenshot
                                                            </label>
                                                            <label className="w-full h-24 sm:h-32 bg-white dark:bg-black/40 border border-dashed border-black/10 dark:border-white/10 rounded-xl sm:rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-neon-green/30 transition-all group p-3 text-center">
                                                                <input type="file" className="hidden" accept="image/*" onChange={e => setProofFile(e.target.files[0])} />
                                                                <Upload size={20} className="sm:hidden text-gray-500 group-hover:text-neon-green transition-colors mb-1.5" />
                                                                <Upload size={24} className="hidden sm:block text-gray-500 group-hover:text-neon-green transition-colors mb-2" />
                                                                <span className="text-[10px] font-bold text-gray-600 dark:text-zinc-400 uppercase tracking-wider group-hover:text-gray-900 dark:group-hover:text-white transition-colors truncate max-w-full px-2 font-mono">
                                                                    {proofFile ? proofFile.name : 'Choose Performance Proof'}
                                                                </span>
                                                            </label>
                                                        </div>

                                                        <div className="space-y-3">
                                                            <label className="flex items-center gap-2 cursor-pointer select-none text-[11px] font-mono text-gray-600 dark:text-zinc-400">
                                                                <input 
                                                                    type="checkbox" 
                                                                    checked={confirmComplete} 
                                                                    onChange={e => setConfirmComplete(e.target.checked)}
                                                                    className="w-4 h-4 rounded border-gray-300 text-neon-green focus:ring-neon-green"
                                                                />
                                                                <span>I confirm that I have fulfilled this deliverable</span>
                                                            </label>

                                                            <Button 
                                                                onClick={() => {
                                                                    const linkToSubmit = contentLink.trim() || (confirmComplete ? 'Task completed by creator' : (submission?.contentLink || ''));
                                                                    onSubmit(task.id, linkToSubmit, proofFile || submission?.proofUrl || null);
                                                                }}
                                                                disabled={isSubmitting || (!contentLink.trim() && !proofFile && !confirmComplete && !submission?.contentLink && !submission?.proofUrl)}
                                                                className="w-full h-12 sm:h-14 rounded-xl sm:rounded-2xl bg-black text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neon-green dark:hover:text-black text-xs sm:text-sm font-black font-heading uppercase tracking-wider shadow-xl transition-all disabled:opacity-50"
                                                            >
                                                                {isSubmitting ? <LoadingSpinner size="xs" color="#000000" /> : status === 'rejected' ? 'Re-verify Submission' : status === 'submitted' ? 'Update Submission' : 'Submit Performance'}
                                                            </Button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-8">
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest flex items-center gap-2">
                                                    <Link2 size={12} className="text-emerald-600 dark:text-neon-green" /> Social Link
                                                </label>
                                                <input 
                                                    type="url"
                                                    value={contentLink}
                                                    onChange={e => setContentLink(e.target.value)}
                                                    placeholder="Paste your post link here..."
                                                    className="w-full h-11 sm:h-14 bg-white dark:bg-black/40 border border-black/10 dark:border-white/10 rounded-xl sm:rounded-2xl px-4 sm:px-6 text-xs sm:text-sm font-bold text-gray-900 dark:text-white focus:border-neon-green transition-all"
                                                />
                                            </div>

                                            <div className="space-y-2 sm:space-y-3">
                                                <label className="text-[10px] font-black text-gray-600 dark:text-zinc-400 uppercase tracking-widest flex items-center gap-1.5 font-mono">
                                                    <Camera size={12} className="text-emerald-600 dark:text-neon-green" /> Proof Screenshot
                                                </label>
                                                <label className="w-full h-24 sm:h-32 bg-white dark:bg-black/40 border border-dashed border-black/10 dark:border-white/10 rounded-xl sm:rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-neon-green/30 transition-all group p-3 text-center">
                                                    <input type="file" className="hidden" accept="image/*" onChange={e => setProofFile(e.target.files[0])} />
                                                    <Upload size={20} className="sm:hidden text-gray-500 group-hover:text-neon-green transition-colors mb-1.5" />
                                                    <Upload size={24} className="hidden sm:block text-gray-500 group-hover:text-neon-green transition-colors mb-2" />
                                                    <span className="text-[10px] font-bold text-gray-600 dark:text-zinc-400 uppercase tracking-wider group-hover:text-gray-900 dark:group-hover:text-white transition-colors truncate max-w-full px-2 font-mono">
                                                        {proofFile ? proofFile.name : 'Choose Performance Proof'}
                                                    </span>
                                                </label>
                                            </div>

                                            <div className="space-y-3">
                                                <label className="flex items-center gap-2 cursor-pointer select-none text-[11px] font-mono text-gray-600 dark:text-zinc-400">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={confirmComplete} 
                                                        onChange={e => setConfirmComplete(e.target.checked)}
                                                        className="w-4 h-4 rounded border-gray-300 text-neon-green focus:ring-neon-green"
                                                    />
                                                    <span>I confirm that I have fulfilled this deliverable</span>
                                                </label>

                                                <Button 
                                                    onClick={() => {
                                                        const linkToSubmit = contentLink.trim() || (confirmComplete ? 'Task completed by creator' : (submission?.contentLink || ''));
                                                        onSubmit(task.id, linkToSubmit, proofFile || submission?.proofUrl || null);
                                                    }}
                                                    disabled={isSubmitting || (!contentLink.trim() && !proofFile && !confirmComplete && !submission?.contentLink && !submission?.proofUrl)}
                                                    className="w-full h-12 sm:h-14 md:h-16 rounded-xl sm:rounded-2xl bg-black text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neon-green dark:hover:text-black text-xs sm:text-sm font-black font-heading uppercase tracking-wider shadow-xl transition-all disabled:opacity-50"
                                                >
                                                    {isSubmitting ? <LoadingSpinner size="xs" color="#000000" /> : status === 'rejected' ? 'Re-verify Submission' : status === 'submitted' ? 'Update Submission' : 'Submit Performance'}
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </motion.div>
        </motion.div>,
        document.body
    );
};

export default TaskSubmissionModal;
