import React, { useState } from 'react';
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
    AlertCircle 
} from 'lucide-react';
import { Button } from './Button';
import { LoadingSpinner } from './LoadingSpinner';
import { cn } from '../../lib/utils';

const getSubmissionStatus = (task, uid) => {
    const sub = task.submissions?.[uid];
    if (sub) return sub.status;
    if ((task.verifiedBy || []).includes(uid)) return 'approved';
    if ((task.completedBy || []).includes(uid)) return 'submitted';
    return 'not_started';
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
    const [contentLink, setContentLink] = useState('');
    const [proofFile, setProofFile] = useState(null);
    const [copiedCaption, setCopiedCaption] = useState(false);
    const [currentSlide, setCurrentSlide] = useState(0);

    const status = getSubmissionStatus(task, profileUid);
    const submission = task.submissions?.[profileUid];
    const isDeadlinePassed = task.deadline && new Date(task.deadline) < new Date();
    
    const TypeInfo = taskTypes[task.taskType] || taskTypes.custom;
    const PlatInfo = platforms[task.platform] || platforms.other;
    
    const creativeAssets = task.creativeAssets || [];
    const creativeLinks = task.creativeLinks || [];

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

    return (
        <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] flex items-center justify-center p-4 md:p-10"
        >
            <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={onClose} />
            
            <motion.div 
                initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                className="relative w-full max-w-4xl bg-[#0a0a0a] border border-white/10 rounded-[2rem] md:rounded-[3rem] shadow-[0_50px_100px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col md:flex-row max-h-[90vh]"
            >
                {/* Left Side: Creative & Guidelines */}
                <div className="flex-1 md:w-1/2 p-6 md:p-12 overflow-y-auto custom-scrollbar border-b md:border-b-0 md:border-r border-white/10">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-neon-blue shadow-[0_0_30px_rgba(46,191,255,0.1)]">
                            {TypeInfo && <TypeInfo.icon size={24} />}
                        </div>
                        <div>
                            <span className="text-[8px] md:text-[10px] font-black text-neon-blue uppercase tracking-[0.3em]">Deliverable Segment</span>
                            <h2 className="text-2xl md:text-3xl font-black font-heading uppercase text-white tracking-tighter leading-none mt-1">{task.title}</h2>
                        </div>
                    </div>

                    <div className="space-y-8">
                        <div className="flex flex-wrap gap-2">
                            <span className="px-3 py-1 bg-white/5 border border-white/5 rounded-lg text-[9px] font-black uppercase tracking-widest text-gray-500 flex items-center gap-2">
                                {PlatInfo && <PlatInfo.icon size={12} />} {PlatInfo?.label}
                            </span>
                            {task.priority === 'required' && (
                                <span className="px-3 py-1 bg-neon-blue/10 border border-neon-blue/20 rounded-lg text-[9px] font-black uppercase tracking-widest text-neon-blue flex items-center justify-center">★ Required</span>
                            )}
                            {task.deadline && (
                                <span className={cn(
                                    "px-3 py-1 border rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-2",
                                    isDeadlinePassed ? "bg-red-500/10 border-red-500/20 text-red-500" : "bg-white/5 border-white/5 text-gray-500"
                                )}>
                                    <Clock size={12} /> {isDeadlinePassed ? 'Overdue' : `Due ${new Date(task.deadline).toLocaleDateString()}`}
                                </span>
                            )}
                        </div>

                        <div className="space-y-3">
                            <h4 className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Campaign Brief</h4>
                            <div className="article-content text-[14px] text-gray-400 font-medium leading-relaxed" dangerouslySetInnerHTML={{ __html: task.description }} />
                        </div>

                        {creativeAssets.length > 0 && (
                            <div className="space-y-4">
                                <h4 className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Reference Kit</h4>
                                <div className="relative rounded-[2rem] overflow-hidden border border-white/10 group">
                                    <img src={creativeAssets[currentSlide]} alt="" className="w-full aspect-video object-cover" />
                                    {creativeAssets.length > 1 && (
                                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-10">
                                            {creativeAssets.map((_, i) => (
                                                <button key={i} onClick={() => setCurrentSlide(i)} className="w-11 h-11 flex items-center justify-center focus:outline-none">
                                                    <span className={cn("h-2 rounded-full transition-all", i === currentSlide ? "bg-white w-6" : "bg-white/30 w-2")} />
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {task.captionScript && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Universal Caption</h4>
                                    <button onClick={handleCopy} className={cn("min-h-[44px] min-w-[44px] px-4 py-2 rounded-xl bg-white/[0.03] hover:bg-white/10 border border-white/5 text-[9px] font-black uppercase tracking-widest flex items-center gap-2 transition-all", copiedCaption ? "text-neon-green" : "text-neon-blue hover:text-white")}>
                                        {copiedCaption ? <><CheckCircle2 size={12} /> Copied</> : <><Copy size={12} /> Copy Text</>}
                                    </button>
                                </div>
                                <div className="p-6 bg-white/[0.03] border border-white/5 rounded-2xl relative group">
                                    <div className="article-content text-[12px] text-gray-400 font-medium leading-relaxed whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: task.captionScript }} />
                                </div>
                            </div>
                        )}

                        {creativeLinks.length > 0 && (
                            <div className="space-y-4">
                                <h4 className="text-[10px] font-black text-gray-600 uppercase tracking-widest">External Assets</h4>
                                <div className="grid grid-cols-1 gap-2">
                                    {creativeLinks.map((link, i) => (
                                        <a key={i} href={link} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-4 min-h-[44px] bg-white/[0.03] border border-white/5 rounded-xl hover:bg-neon-blue hover:text-black transition-all group">
                                            <span className="text-[11px] font-bold truncate">{link}</span>
                                            <ExternalLink size={14} />
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Side: Execution & Progress */}
                <div className="flex-1 md:w-1/2 p-6 md:p-12 overflow-y-auto bg-gradient-to-br from-white/[0.02] to-transparent relative">
                    <button onClick={onClose} className="absolute top-6 md:top-8 right-6 md:right-8 w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center hover:bg-white hover:text-black transition-all border border-white/5 z-50 shadow-xl">
                        <X size={20} />
                    </button>

                    <div className="h-full flex flex-col">
                        <div className="mb-8 md:mb-12">
                            <h3 className="text-xl md:text-2xl font-black font-heading uppercase italic tracking-tighter mb-2">Task Verification</h3>
                            <p className="text-[10px] md:text-[12px] text-gray-500 font-medium tracking-tight uppercase">Status: 
                                <span className={cn(
                                     "ml-2",
                                     status === 'approved' ? 'text-neon-green' :
                                     status === 'submitted' ? 'text-yellow-500' :
                                     status === 'rejected' ? 'text-red-500' :
                                     'text-gray-400'
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
                                    <h4 className="text-xl font-black font-heading uppercase tracking-tighter italic">Task Completed</h4>
                                    <p className="text-[11px] text-gray-500 uppercase tracking-widest font-black">Points & Reward Unlocked</p>
                                </div>
                            ) : (
                                <>
                                    {status === 'rejected' && submission?.rejectionReason && (
                                        <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl space-y-2">
                                            <div className="flex items-center gap-2 text-red-500">
                                                <AlertCircle size={16} />
                                                <span className="text-[10px] font-black uppercase tracking-widest">Admin Feedback</span>
                                            </div>
                                            <p className="text-[12px] text-red-400 font-medium italic">"{submission.rejectionReason}"</p>
                                        </div>
                                    )}

                                    <div className="space-y-8">
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest flex items-center gap-2">
                                                <Link2 size={12} className="text-neon-blue" /> Social Link
                                            </label>
                                            <input 
                                                type="url"
                                                value={contentLink}
                                                onChange={e => setContentLink(e.target.value)}
                                                placeholder="Paste your post link here..."
                                                className="w-full h-14 bg-black/40 border border-white/10 rounded-2xl px-6 text-[12px] font-bold text-white focus:border-neon-blue transition-all"
                                            />
                                        </div>

                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest flex items-center gap-2">
                                                <Camera size={12} className="text-neon-blue" /> Proof Screenshot
                                            </label>
                                            <label className="w-full h-32 bg-black/40 border border-dashed border-white/10 rounded-[2rem] flex flex-col items-center justify-center cursor-pointer hover:border-neon-blue/30 transition-all group">
                                                <input type="file" className="hidden" accept="image/*" onChange={e => setProofFile(e.target.files[0])} />
                                                <Upload size={24} className="text-gray-500 group-hover:text-neon-blue transition-colors mb-2" />
                                                <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest group-hover:text-white transition-colors">{proofFile ? proofFile.name : 'Choose Performance Proof'}</span>
                                            </label>
                                        </div>

                                        <Button 
                                            onClick={() => onSubmit(task.id, contentLink, proofFile)}
                                            disabled={isSubmitting || (!contentLink && !proofFile)}
                                            className="w-full h-20 rounded-2xl bg-white text-black text-sm font-black font-heading uppercase tracking-[0.2em] shadow-2xl hover:bg-neon-blue transition-all disabled:opacity-50"
                                        >
                                            {isSubmitting ? <LoadingSpinner size="xs" color="#000000" /> : status === 'rejected' ? 'Re-verify Submission' : 'Submit Performance'}
                                        </Button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default TaskSubmissionModal;
