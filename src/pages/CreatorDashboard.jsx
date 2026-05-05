import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../lib/store';
import { Button } from '../components/ui/Button';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, ArrowRight, CheckCircle2, ExternalLink, Sparkles, MessageCircle, FileText, Target, ShieldCheck, Zap, Settings, Instagram, LayoutDashboard, Clock, History, X, Upload, Link2, Camera, Video, Eye, Star, Globe, Youtube, Twitter, Calendar, Copy, ChevronRight, AlertCircle, XCircle, Image as ImageIcon, Clipboard, Loader2, Award, TrendingUp, Briefcase } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import CampaignCard from '../components/ui/CampaignCard';

const TASK_TYPES = {
    content_post: { label: 'Content Post', icon: Camera },
    story: { label: 'Story', icon: Eye },
    reel: { label: 'Reel', icon: Video },
    visit_event: { label: 'Visit Event', icon: MapPin },
    custom: { label: 'Custom', icon: Star },
};

const PLATFORMS = {
    instagram: { label: 'Instagram', icon: Instagram },
    youtube: { label: 'YouTube', icon: Youtube },
    twitter: { label: 'Twitter / X', icon: Twitter },
    other: { label: 'Other', icon: Globe },
};

// --- Helper: get submission status ---
const getSubmissionStatus = (task, uid) => {
    const sub = task.submissions?.[uid];
    if (sub) return sub.status;
    if ((task.verifiedBy || []).includes(uid)) return 'approved';
    if ((task.completedBy || []).includes(uid)) return 'submitted';
    return 'not_started';
};

// Tick animation component
const CompletionTick = ({ visible }) => (
    <AnimatePresence>
        {visible && (
            <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className="w-8 h-8 rounded-full bg-neon-green flex items-center justify-center shadow-[0_0_20px_rgba(0,255,100,0.3)]"
            >
                <CheckCircle2 size={16} className="text-black" />
            </motion.div>
        )}
    </AnimatePresence>
);

// Removed inline CreatorCampaignCard - Using shared CampaignCard component

// --- TaskDetailModal (Centered Popup) ---
const TaskDetailModal = ({ task, campaignId, profileUid, onClose, isSubmitting, onSubmit }) => {
    const [contentLink, setContentLink] = useState('');
    const [proofFile, setProofFile] = useState(null);
    const [copiedCaption, setCopiedCaption] = useState(false);
    const [currentSlide, setCurrentSlide] = useState(0);

    const status = getSubmissionStatus(task, profileUid);
    const submission = task.submissions?.[profileUid];
    const isDeadlinePassed = task.deadline && new Date(task.deadline) < new Date();
    const TypeInfo = TASK_TYPES[task.taskType] || TASK_TYPES.custom;
    const PlatInfo = PLATFORMS[task.platform] || PLATFORMS.other;
    const creativeAssets = task.creativeAssets || [];
    const creativeLinks = task.creativeLinks || [];

    const handleCopy = () => {
        navigator.clipboard.writeText(task.captionScript);
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
                className="relative w-full max-w-4xl bg-[#0a0a0a] border border-white/10 rounded-[3rem] shadow-[0_50px_100px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col md:flex-row max-h-[90vh]"
            >
                {/* Left Side: Creative & Guidelines */}
                <div className="flex-1 md:w-1/2 p-8 md:p-12 overflow-y-auto custom-scrollbar border-b md:border-b-0 md:border-r border-white/10">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-neon-blue shadow-[0_0_30px_rgba(46,191,255,0.1)]">
                            <TypeInfo.icon size={28} />
                        </div>
                        <div>
                            <span className="text-[10px] font-black text-neon-blue uppercase tracking-[0.3em]">Deliverable Segment</span>
                            <h2 className="text-3xl font-black font-heading uppercase text-white tracking-tighter leading-none mt-1">{task.title}</h2>
                        </div>
                    </div>

                    <div className="space-y-8">
                        {/* Status Badges */}
                        <div className="flex flex-wrap gap-2">
                            <span className="px-3 py-1 bg-white/5 border border-white/5 rounded-lg text-[9px] font-black uppercase tracking-widest text-gray-500 flex items-center gap-2">
                                <PlatInfo.icon size={12} /> {PlatInfo.label}
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

                        {/* Brief */}
                        <div className="space-y-3">
                            <h4 className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Mission Brief</h4>
                            <div className="article-content text-[14px] text-gray-400 font-medium leading-relaxed" dangerouslySetInnerHTML={{ __html: task.description }} />
                        </div>

                        {/* Creative Assets */}
                        {creativeAssets.length > 0 && (
                            <div className="space-y-4">
                                <h4 className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Reference Kit</h4>
                                <div className="relative rounded-[2rem] overflow-hidden border border-white/10 group">
                                    <img src={creativeAssets[currentSlide]} alt="" className="w-full aspect-video object-cover" />
                                    {creativeAssets.length > 1 && (
                                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                                            {creativeAssets.map((_, i) => (
                                                <button key={i} onClick={() => setCurrentSlide(i)} className={cn("w-2 h-2 rounded-full transition-all", i === currentSlide ? "bg-white w-6" : "bg-white/30")} />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Caption Script */}
                        {task.captionScript && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Universal Caption</h4>
                                    <button onClick={handleCopy} className={cn("text-[9px] font-black uppercase tracking-widest flex items-center gap-2 transition-all", copiedCaption ? "text-neon-green" : "text-neon-blue hover:text-white")}>
                                        {copiedCaption ? <><CheckCircle2 size={12} /> Copied</> : <><Copy size={12} /> Copy Text</>}
                                    </button>
                                </div>
                                <div className="p-6 bg-white/[0.03] border border-white/5 rounded-2xl relative group">
                                    <div className="article-content text-[12px] text-gray-400 font-medium leading-relaxed whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: task.captionScript }} />
                                </div>
                            </div>
                        )}

                        {/* Reference Links */}
                        {creativeLinks.length > 0 && (
                            <div className="space-y-4">
                                <h4 className="text-[10px] font-black text-gray-600 uppercase tracking-widest">External Assets</h4>
                                <div className="grid grid-cols-1 gap-2">
                                    {creativeLinks.map((link, i) => (
                                        <a key={i} href={link} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-4 bg-white/[0.03] border border-white/5 rounded-xl hover:bg-neon-blue hover:text-black transition-all group">
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
                <div className="flex-1 md:w-1/2 p-8 md:p-12 overflow-y-auto bg-gradient-to-br from-white/[0.02] to-transparent relative">
                    <button onClick={onClose} className="absolute top-8 right-8 w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white hover:text-black transition-all">
                        <X size={18} />
                    </button>

                    <div className="h-full flex flex-col">
                        <div className="mb-12">
                            <h3 className="text-2xl font-black font-heading uppercase italic tracking-tighter mb-2">Task Verification</h3>
                            <p className="text-[12px] text-gray-500 font-medium tracking-tight uppercase">Status: 
                                <span className={cn(
                                    "ml-2",
                                    status === 'approved' ? 'text-neon-green' :
                                    status === 'submitted' ? 'text-yellow-500' :
                                    status === 'rejected' ? 'text-red-500' :
                                    'text-gray-400'
                                )}>
                                    {status === 'not_started' ? 'Pending Action' : 
                                     status === 'submitted' ? 'Verification In-Progress' :
                                     status === 'approved' ? 'Mission Verified' : 'Action Required'}
                                </span>
                            </p>
                        </div>

                        <div className="flex-1 space-y-10">
                            {status === 'approved' ? (
                                <div className="flex flex-col items-center justify-center h-40 space-y-4 text-center">
                                    <div className="w-20 h-20 bg-neon-green/20 rounded-full flex items-center justify-center text-neon-green shadow-[0_0_50px_rgba(57,255,20,0.2)]">
                                        <CheckCircle2 size={40} />
                                    </div>
                                    <h4 className="text-xl font-black font-heading uppercase tracking-tighter italic">Mission Accomplished</h4>
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
                                            {isSubmitting ? <Loader2 className="animate-spin" /> : status === 'rejected' ? 'Re-verify Submission' : 'Submit Performance'}
                                        </Button>
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="mt-auto pt-10 text-center opacity-30">
                            <p className="text-[8px] font-black uppercase tracking-[0.4em]">Newbi Professional Workspace v2.4</p>
                        </div>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
};

// --- Creator Settings Modal ---
const CreatorSettingsModal = ({ profile, onClose }) => {
    const { updateCreator, deleteCreator, logout } = useStore();
    const navigate = useNavigate();
    const [isSaving, setIsSaving] = useState(false);
    const [form, setForm] = useState({
        name: profile.name || '',
        phone: profile.phone || '',
        city: profile.city || '',
        specializations: (profile.specializations || profile.niches || []).join(', '),
        bio: profile.bio || ''
    });

    const handleChange = (e) => setForm({...form, [e.target.name]: e.target.value});

    const handleSave = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await updateCreator(profile.uid, {
                ...form,
                specializations: form.specializations.split(',').map(s => s.trim())
            });
            onClose();
        } catch (err) {
            alert("Failed to update profile.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (window.confirm("Are you sure you want to permanently delete your creator profile? This action is irreversible.")) {
            try {
                await deleteCreator(profile.uid);
                await logout();
                navigate('/');
            } catch (err) {
                alert("Failed to delete profile.");
            }
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex justify-end">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/90 backdrop-blur-sm" onClick={onClose} />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 300 }} className="relative w-full max-w-md bg-[#0a0a0a] border-l border-white/10 h-full overflow-y-auto custom-scrollbar flex flex-col p-8">
                <div className="flex items-center justify-between mb-10">
                    <h3 className="text-2xl font-black font-heading uppercase tracking-tighter text-white">Studio Settings</h3>
                    <button onClick={onClose} className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white hover:text-black transition-all">
                        <X size={18} />
                    </button>
                </div>
                
                <form onSubmit={handleSave} className="space-y-6 flex-1">
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Full Name</label>
                        <input required name="name" value={form.name} onChange={handleChange} className="w-full h-14 bg-black/40 border border-white/10 rounded-xl px-4 text-sm font-bold focus:border-neon-blue transition-all" />
                    </div>
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Phone</label>
                        <input required name="phone" type="tel" value={form.phone} onChange={handleChange} className="w-full h-14 bg-black/40 border border-white/10 rounded-xl px-4 text-sm font-bold focus:border-neon-blue transition-all" />
                    </div>
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">City</label>
                        <input required name="city" value={form.city} onChange={handleChange} className="w-full h-14 bg-black/40 border border-white/10 rounded-xl px-4 text-sm font-bold focus:border-neon-blue transition-all" />
                    </div>
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Specializations</label>
                        <input required name="specializations" value={form.specializations} onChange={handleChange} className="w-full h-14 bg-black/40 border border-white/10 rounded-xl px-4 text-sm font-bold focus:border-neon-blue transition-all" />
                    </div>
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Bio</label>
                        <textarea required name="bio" value={form.bio} onChange={handleChange} className="w-full h-32 bg-black/40 border border-white/10 rounded-xl p-4 text-sm font-bold focus:border-neon-blue transition-all resize-none" />
                    </div>
                    <Button type="submit" disabled={isSaving} className="w-full h-14 bg-neon-blue text-black font-black uppercase tracking-widest rounded-xl hover:bg-white transition-all">
                        {isSaving ? <Loader2 className="animate-spin" /> : 'Save Profile'}
                    </Button>
                </form>

                <div className="pt-8 mt-8 border-t border-red-500/20 mb-8">
                    <h4 className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-4">Danger Zone</h4>
                    <button onClick={handleDelete} type="button" className="w-full p-4 rounded-xl border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest hover:bg-red-500/10 transition-all flex items-center justify-center gap-2">
                        <AlertCircle size={14} /> Deactivate Creator Profile
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

// --- Mission Panel (Slide-over) ---
const MissionPanel = ({ campaign, profile, onClose, onOpenTask, onApply, isApplying }) => {
    const isJoined = (profile.joinedCampaigns || []).includes(campaign.id);
    const isShortlisted = (profile.shortlistedCampaigns || []).includes(campaign.id);
    const campaignTasks = campaign.tasks || [];
    const [isExpanded, setIsExpanded] = useState(false);
    
    // Progress calculations
    const requiredTasks = campaignTasks.filter(t => t.priority !== 'optional');
    const approvedRequired = requiredTasks.filter(t => getSubmissionStatus(t, profile.uid) === 'approved').length;
    const approvedTotal = campaignTasks.filter(t => getSubmissionStatus(t, profile.uid) === 'approved').length;
    const progress = campaignTasks.length > 0 ? (approvedTotal / campaignTasks.length) * 100 : 0;
    const isFullyComplete = requiredTasks.length > 0 && approvedRequired === requiredTasks.length;

    return (
        <div className="fixed inset-0 z-[100] flex justify-end">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/90 backdrop-blur-sm"
                onClick={onClose}
            />
            <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="relative w-full max-w-xl bg-[#0a0a0a] border-l border-white/10 h-full overflow-hidden flex flex-col"
            >
                {/* Panel Header */}
                <div className="px-8 pt-8 pb-8 border-b border-white/10 bg-[#0a0a0a] shrink-0">
                    <div className="flex items-start justify-between gap-6 mb-6">
                        <div className="flex-1 min-w-0">
                            <span className="text-[10px] font-black text-neon-blue uppercase tracking-[0.4em]">Creator Workspace</span>
                            <h2 className="text-2xl font-black font-heading uppercase tracking-tight text-white mt-1 italic leading-tight">
                                {campaign.title}
                            </h2>
                            <div className="mt-3">
                                <div className={cn(
                                    "text-[11px] font-medium uppercase tracking-wider leading-relaxed transition-all duration-300 overflow-hidden relative",
                                    !isExpanded && "max-h-[60px]"
                                )}>
                                    {campaign.description ? (
                                        <div className="article-content" dangerouslySetInnerHTML={{ __html: campaign.description }} />
                                    ) : (
                                        <span className="text-gray-600">No tactical briefing provided for this operation.</span>
                                    )}
                                    
                                    {!isExpanded && campaign.description && campaign.description.length > 100 && (
                                        <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-[#0a0a0a] to-transparent pointer-events-none" />
                                    )}
                                </div>
                                
                                {campaign.description && (campaign.description.split('\n').length > 3 || campaign.description.length > 100) && (
                                    <button 
                                        onClick={() => setIsExpanded(!isExpanded)}
                                        className="text-[9px] font-black text-neon-blue/60 hover:text-white uppercase tracking-[0.3em] mt-2 transition-colors flex items-center gap-2 group"
                                    >
                                        {isExpanded ? 'MINIMIZE BRIEF' : 'VIEW FULL SPECS'}
                                        <div className="w-4 h-px bg-neon-blue/20 group-hover:w-8 transition-all" />
                                    </button>
                                )}
                            </div>
                        </div>
                        <button onClick={onClose} className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white hover:text-black transition-all shrink-0">
                            <X size={18} />
                        </button>
                    </div>

                    {/* Quick Specs Row */}
                    <div className="flex items-center gap-6 mb-6">
                        <div className="flex flex-col">
                            <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest mb-1">Min. Followers</span>
                            <span className="text-white font-bold uppercase text-[10px] tracking-tight">{Number(campaign.minInstagramFollowers || 0).toLocaleString()}+</span>
                        </div>
                        <div className="h-6 w-px bg-white/10" />
                        <div className="flex flex-col">
                            <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest mb-1">Bounty Scale</span>
                            <span className="text-neon-green font-bold uppercase text-[10px] tracking-tight">{campaign.reward}</span>
                        </div>
                    </div>

                    {/* Progress Segment */}
                    {isShortlisted && campaignTasks.length > 0 && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                                    {approvedTotal}/{campaignTasks.length} DELIVERABLES SECURED
                                </span>
                                <span className={cn("text-[12px] font-black", isFullyComplete ? 'text-neon-green' : 'text-neon-blue')}>
                                    {Math.round(progress)}%
                                </span>
                            </div>
                            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progress}%` }}
                                    transition={{ duration: 1.5, ease: 'circOut' }}
                                    className={cn("h-full rounded-full", isFullyComplete ? 'bg-neon-green' : 'bg-gradient-to-r from-neon-blue to-white/20')}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Task List */}
                <div className="flex-1 overflow-y-auto p-8 space-y-4 custom-scrollbar">
                    <style dangerouslySetInnerHTML={{ __html: `
                        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
                        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); }
                    `}} />

                    {profile.profileStatus !== 'approved' ? (
                        <div className="p-10 bg-white/[0.02] border border-dashed border-white/10 rounded-[3rem] text-center space-y-6">
                            <ShieldCheck size={40} className="text-neon-blue mx-auto animate-pulse" />
                            <div>
                                <h4 className="text-xl font-black font-heading uppercase italic tracking-tighter text-white">Identity Review</h4>
                                <p className="text-[10px] text-gray-500 font-bold leading-relaxed max-w-[240px] mx-auto uppercase tracking-widest mt-3">
                                    OUR TALENT SCOUTS ARE VERIFYING YOUR PROFESSIONAL SPECS. ACCESS TO MISSIONS WILL BE UNLOCKED UPON APPROVAL.
                                </p>
                            </div>
                        </div>
                    ) : !isJoined ? (
                        <div className="space-y-10">
                            {/* Detailed Brief Section */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-3">
                                    <div className="h-[1px] w-6 bg-neon-blue/40" />
                                    <h3 className="text-[10px] font-black text-neon-blue uppercase tracking-[0.5em]">Tactical Specs // Full Brief</h3>
                                </div>
                                
                                <div className="p-8 rounded-[2rem] bg-white/[0.02] border border-white/5 relative overflow-hidden backdrop-blur-2xl">
                                    <div className="absolute top-0 left-0 w-1.5 h-full bg-neon-blue/20" />
                                    <div className="article-content text-sm md:text-base font-medium text-gray-400 leading-relaxed italic">
                                        {campaign.description ? (
                                            <div dangerouslySetInnerHTML={{ __html: campaign.description }} />
                                        ) : "No briefing provided for this workspace."}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : !isShortlisted ? (
                        <div className="p-10 bg-white/[0.02] border border-dashed border-white/10 rounded-[3rem] text-center space-y-6">
                            <Clock size={40} className="text-yellow-500 mx-auto animate-pulse" />
                            <div>
                                <h4 className="text-xl font-black font-heading uppercase italic tracking-tighter text-white">Selection Phase</h4>
                                <p className="text-[10px] text-gray-500 font-bold leading-relaxed max-w-[240px] mx-auto uppercase tracking-widest mt-3">
                                    APPLICATION RECEIVED. YOU ARE CURRENTLY IN THE POOL FOR FINAL MISSION SHORTLISTING.
                                </p>
                            </div>
                        </div>
                    ) : campaignTasks.length === 0 ? (
                        <div className="p-10 bg-white/[0.02] border border-dashed border-white/10 rounded-[3rem] text-center space-y-6">
                            <Zap size={40} className="text-neon-blue mx-auto animate-pulse" />
                            <div>
                                <h4 className="text-xl font-black font-heading uppercase italic tracking-tighter text-white">Deployment Pending</h4>
                                <p className="text-[10px] text-gray-500 font-bold leading-relaxed max-w-[240px] mx-auto uppercase tracking-widest mt-3">
                                    YOU ARE SELECTED! TASKS FOR THIS MISSION WILL BE UPDATED SOON. ENABLE NOTIFICATIONS TO STAY UPDATED.
                                </p>
                            </div>
                        </div>
                    ) : (
                        campaignTasks.map((task, idx) => {
                            const status = getSubmissionStatus(task, profile.uid);
                            const TypeInfo = TASK_TYPES[task.taskType] || TASK_TYPES.custom;
                            return (
                                <motion.button
                                    key={task.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    onClick={() => onOpenTask(task)}
                                    className={cn(
                                        "w-full p-6 rounded-[2rem] border flex items-center gap-5 transition-all group relative overflow-hidden",
                                        status === 'approved' ? 'bg-neon-green/[0.03] border-neon-green/10' :
                                        status === 'submitted' ? 'bg-yellow-500/[0.03] border-yellow-500/10' :
                                        status === 'rejected' ? 'bg-red-500/[0.03] border-red-500/10' :
                                        'bg-white/[0.02] border-white/5 hover:border-neon-blue/20 hover:bg-white/[0.04]'
                                    )}
                                >
                                    <div className={cn(
                                        "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110",
                                        status === 'approved' ? 'bg-neon-green/20 text-neon-green' :
                                        status === 'submitted' ? 'bg-yellow-500/10 text-yellow-500' :
                                        status === 'rejected' ? 'bg-red-500/10 text-red-500' :
                                        'bg-white/5 text-gray-500'
                                    )}>
                                        {status === 'approved' ? <CheckCircle2 size={18} /> : <TypeInfo.icon size={18} />}
                                    </div>
                                    
                                    <div className="flex-1 text-left min-w-0">
                                        <h4 className={cn(
                                            "text-[13px] font-black uppercase tracking-tight truncate",
                                            status === 'approved' ? 'text-gray-600' : 'text-white'
                                        )}>{task.title}</h4>
                                        <div className="flex items-center gap-3 mt-1">
                                            <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest">{TypeInfo.label}</span>
                                            <div className="w-1 h-1 rounded-full bg-white/10" />
                                            <span className={cn(
                                                "text-[8px] font-black uppercase tracking-widest",
                                                status === 'approved' ? 'text-neon-green' :
                                                status === 'submitted' ? 'text-yellow-500' :
                                                status === 'rejected' ? 'text-red-500' :
                                                'text-gray-700'
                                            )}>
                                                {status === 'not_started' ? 'Pending' : status.toUpperCase()}
                                            </span>
                                        </div>
                                    </div>

                                    <ChevronRight size={16} className="text-gray-800 group-hover:text-neon-blue group-hover:translate-x-1 transition-all" />
                                </motion.button>
                            );
                        })
                    )}
                </div>

                <div className="p-8 border-t border-white/10 shrink-0 bg-black">
                    {!isJoined && profile.profileStatus === 'approved' && (
                        <Button 
                            onClick={() => onApply(campaign.id)}
                            disabled={isApplying}
                            className="w-full h-20 bg-white text-black font-black uppercase tracking-[0.3em] rounded-[2rem] shadow-[0_0_40px_rgba(255,20,147,0.3)] hover:shadow-[0_0_60px_rgba(255,20,147,0.5)] transition-all text-xs mb-4"
                        >
                            {isApplying ? <Loader2 className="animate-spin" /> : 'Apply to Campaign'}
                        </Button>
                    )}
                    {isShortlisted && campaign.whatsappLink && (
                        <a href={campaign.whatsappLink} target="_blank" rel="noopener noreferrer">
                            <Button className="w-full h-16 bg-[#25D366]/5 text-[#25D366] border border-[#25D366]/10 hover:bg-[#25D366]/10 font-black text-[10px] uppercase tracking-[0.2em] gap-3 rounded-[1.5rem] shadow-lg">
                                <MessageCircle size={18} /> Join Hub Communications
                            </Button>
                        </a>
                    )}
                </div>
            </motion.div>
        </div>
    );
};


const CreatorDashboard = () => {
    const { user, authInitialized, creators, campaigns, uploadToCloudinary } = useStore();
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [activeTab, setActiveTab] = useState('opportunities');
    const [missionCampaign, setMissionCampaign] = useState(null);
    const [selectedTask, setSelectedTask] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isApplying, setIsApplying] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    useEffect(() => {
        if (authInitialized && user) {
            const existingProfile = creators.find(c => c.uid === user.uid);
            if (existingProfile) {
                setProfile(existingProfile);
            } else {
                navigate('/creator');
            }
        } else if (authInitialized && !user) {
            navigate('/creator');
        }
    }, [user, authInitialized, creators, navigate]);

    // Keep mission and task synced with latest data
    useEffect(() => {
        if (missionCampaign) {
            const updated = campaigns.find(c => c.id === missionCampaign.id);
            if (updated) {
                setMissionCampaign(updated);
                if (selectedTask) {
                    const updatedTask = (updated.tasks || []).find(t => t.id === selectedTask.id);
                    if (updatedTask) setSelectedTask(updatedTask);
                }
            }
        }
    }, [campaigns]);

    const handleTaskSubmit = async (taskId, contentLink, proofFile) => {
        if (!contentLink && !proofFile) {
            alert("Please provide a content link or upload proof.");
            return;
        }
        setIsSubmitting(true);
        try {
            let proofUrl = '';
            if (proofFile) {
                proofUrl = await uploadToCloudinary(proofFile);
            }
            await useStore.getState().submitTaskProof(missionCampaign.id, taskId, profile.uid, {
                contentLink,
                proofUrl
            });
            setSelectedTask(null);
        } catch (error) {
            alert("Submission failed. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };


    const handleApply = async (campaignId) => {
        setIsApplying(true);
        try {
            await useStore.getState().applyToCampaign(profile.uid, campaignId);
            // We can keep the panel open, it will auto-update state due to Firebase subscription
        } catch (error) {
            alert("Application failed.");
        } finally {
            setIsApplying(false);
        }
    };


    if (!profile) return null;

    const availableCampaigns = campaigns.filter(c =>
        c.status === 'Open' &&
        (c.targetCity === 'Any' || c.targetCity.toLowerCase() === profile.city.toLowerCase()) &&
        !(profile.joinedCampaigns || []).includes(c.id)
    );

    const joinedCampaignsList = campaigns.filter(c =>
        (profile.joinedCampaigns || []).includes(c.id)
    );

    // Stats
    const totalTasks = joinedCampaignsList.reduce((sum, c) => sum + (c.tasks?.length || 0), 0);
    const approvedTasks = joinedCampaignsList.reduce((sum, c) => {
        return sum + (c.tasks || []).filter(t => getSubmissionStatus(t, profile.uid) === 'approved').length;
    }, 0);

    const shortlistedCampaignsList = joinedCampaignsList.filter(c => (profile.shortlistedCampaigns || []).includes(c.id));

    return (
        <div className="min-h-screen bg-[#020202] text-white pt-32 pb-20 relative overflow-hidden">
            {/* Cinematic Background Atmosphere */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-neon-blue/10 rounded-full blur-[150px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-5%] w-[50%] h-[50%] bg-neon-pink/5 rounded-full blur-[150px] animate-pulse delay-700" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-gradient-radial from-transparent via-black/40 to-black z-10" />
                <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)', backgroundSize: '80px 80px' }}></div>
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-12">
                               {/* Command Bar Header */}
                <div className="flex flex-col lg:flex-row justify-between items-end mb-12 gap-8 relative border-b border-white/5 pb-8">
                    <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="space-y-4"
                    >
                        <div className="flex items-center gap-3">
                            <h1 className="text-4xl md:text-5xl font-black font-heading tracking-tighter leading-none text-white italic uppercase">
                                HELLO, <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-blue via-white to-neon-blue not-italic">{profile.name.split(' ')[0]}.</span>
                            </h1>
                        </div>
                        
                        <div className="flex flex-wrap gap-3">
                            <span className={cn(
                                "px-3 py-1 text-[8px] font-black uppercase tracking-widest rounded-lg border transition-all flex items-center justify-center",
                                profile.profileStatus === 'approved' ? "bg-neon-green/10 text-neon-green border-neon-green/20" : "bg-yellow-500/10 text-yellow-500 border-yellow-500/10"
                            )}>
                                {profile.profileStatus === 'approved' ? 'Verified Partner' : 'Pending'}
                            </span>
                            <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-lg border border-white/5">
                                <MapPin size={10} className="text-neon-blue" />
                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{profile.city}</span>
                            </div>
                        </div>
                    </motion.div>
                    
                    {/* Compact Command Stats */}
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="flex items-stretch gap-2"
                    >
                        <div className="bg-zinc-950/60 backdrop-blur-3xl px-6 py-4 rounded-2xl border border-white/10 flex flex-col items-center justify-center min-w-[140px]">
                            <span className="text-3xl font-black text-white italic tracking-tighter leading-none">
                                {joinedCampaignsList.length}
                            </span>
                            <span className="text-[8px] font-black text-neon-blue uppercase tracking-[0.3em] mt-1">Active Missions</span>
                        </div>
                        
                        <div className="bg-zinc-950/40 backdrop-blur-2xl px-4 py-4 rounded-2xl border border-white/10 flex flex-col items-center justify-center min-w-[100px]">
                            <span className="text-xl font-black text-white">{approvedTasks}</span>
                            <span className="text-[7px] font-black text-gray-500 uppercase tracking-widest mt-1">Deliverables</span>
                        </div>
                        
                        <div className="bg-zinc-950/40 backdrop-blur-2xl px-4 py-4 rounded-2xl border border-white/10 flex flex-col items-center justify-center min-w-[100px]">
                            <span className="text-xl font-black text-white">{totalTasks > 0 ? Math.round((approvedTasks / totalTasks) * 100) : 0}%</span>
                            <span className="text-[7px] font-black text-gray-500 uppercase tracking-widest mt-1">Efficiency</span>
                        </div>
                    </motion.div>
                </div>

                {/* Main Content Area */}
                <div className="space-y-32">
                    {/* Priority Section */}
                    {shortlistedCampaignsList.length > 0 && (
                        <motion.section 
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="space-y-12"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 rounded-[2rem] bg-neon-blue/10 border border-neon-blue/20 flex items-center justify-center shadow-[0_0_40px_rgba(46,191,255,0.1)]">
                                        <Briefcase className="text-neon-blue" size={28} />
                                    </div>
                                    <div>
                                        <h3 className="text-3xl font-black font-heading uppercase italic text-white tracking-tighter">Priority Missions</h3>
                                        <p className="text-[11px] text-gray-500 font-bold uppercase tracking-[0.3em] mt-1">Executive fulfillment required</p>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                                {shortlistedCampaignsList.map(c => 
                                    <CampaignCard key={c.id} campaign={c} profile={profile} type="joined" onOpenMission={setMissionCampaign} />
                                )}
                            </div>
                        </motion.section>
                    )}

                    {/* Opportunity Navigation */}
                    <motion.div 
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="space-y-12"
                    >
                        <div className="flex flex-col md:flex-row items-center justify-between gap-8 border-b border-white/5 pb-10">
                            <div className="flex items-center gap-12">
                                {['opportunities', 'active'].map((tab) => (
                                    <button 
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={cn(
                                            "text-3xl font-black font-heading uppercase tracking-tighter transition-all relative pb-4",
                                            activeTab === tab ? "text-white" : "text-gray-700 hover:text-gray-500"
                                        )}
                                    >
                                        {tab === 'opportunities' ? 'New Openings' : 'Performance History'}
                                        {activeTab === tab && (
                                            <motion.div 
                                                layoutId="tab-underline" 
                                                className="absolute bottom-0 left-0 w-full h-1 bg-neon-blue shadow-[0_4px_20px_rgba(46,191,255,0.4)]" 
                                            />
                                        )}
                                    </button>
                                ))}
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="px-5 py-2 rounded-full bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-widest text-gray-400">
                                    <span className="text-white mr-2">{activeTab === 'opportunities' ? availableCampaigns.length : joinedCampaignsList.length}</span>
                                    {activeTab === 'opportunities' ? 'GIGS DISCOVERED' : 'MISSIONS TRACKED'}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                            <AnimatePresence mode="popLayout">
                                {(activeTab === 'opportunities' ? availableCampaigns : joinedCampaignsList).map(c => (
                                    <motion.div
                                        key={c.id}
                                        layout
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                    >
                                        <CampaignCard 
                                            campaign={c} 
                                            profile={profile} 
                                            type={activeTab === 'opportunities' ? 'available' : 'joined'} 
                                            onOpenMission={setMissionCampaign} 
                                        />
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>

                        {(activeTab === 'opportunities' ? availableCampaigns : joinedCampaignsList).length === 0 && (
                            <div className="py-32 text-center">
                                <div className="w-24 h-24 rounded-[2.5rem] bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-8 text-gray-700">
                                    <Sparkles size={40} />
                                </div>
                                <h4 className="text-2xl font-black font-heading uppercase italic tracking-tighter text-gray-600">Nothing discovered yet.</h4>
                                <p className="text-[11px] font-black text-gray-700 uppercase tracking-widest mt-2 px-10">Keep your impact high. New opportunities are unlocked based on your specialized ranking.</p>
                            </div>
                        )}
                    </motion.div>
                </div>
            </div>

            {/* Overlays */}
            <AnimatePresence mode="wait">
                {missionCampaign && (
                    <MissionPanel
                        campaign={missionCampaign}
                        profile={profile}
                        onClose={() => setMissionCampaign(null)}
                        onOpenTask={(task) => setSelectedTask(task)}
                        onApply={handleApply}
                        isApplying={isApplying}
                    />
                )}
                {selectedTask && (
                    <TaskDetailModal
                        task={selectedTask}
                        campaignId={missionCampaign.id}
                        profileUid={profile.uid}
                        onClose={() => setSelectedTask(null)}
                        isSubmitting={isSubmitting}
                        onSubmit={handleTaskSubmit}
                    />
                )}
                {isSettingsOpen && (
                    <CreatorSettingsModal 
                        profile={profile}
                        onClose={() => setIsSettingsOpen(false)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default CreatorDashboard;
